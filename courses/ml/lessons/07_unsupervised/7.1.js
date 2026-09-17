/* ============================================================================
   LESSON 7.1 — K-Means and Choosing k
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**K-means asks one question of unlabelled data: if these rows had to be summarised by k points, where would the points go?** Lloyd's algorithm answers it by alternating two steps — assign each row to its nearest centre, move each centre to the mean of its rows — and each step can only lower the within-cluster sum of squares, so it always converges; but it converges to whichever local optimum the starting points led to, which is why the same four blobs gave 21 different answers from 200 random starts and one answer from 200 k-means++ starts. This lesson runs the iteration by hand, measures the initialisation problem, then puts every k-selection rule on the same data: on four clean blobs the elbow, silhouette, Davies–Bouldin, Calinski–Harabasz and the gap statistic all say four; on the churn customers they disagree, the silhouette never exceeds 0.29, and the honest conclusion is that customers do not fall into clusters — which is a finding, not a failure. It closes with the shapes k-means cannot see and the scale it needs.",

  objectives: [
    "Run Lloyd's algorithm by hand, state its objective, and explain why it converges and why only to a local optimum",
    "Explain k-means++ and n_init, and measure what they buy",
    "Choose k with the elbow, silhouette, Davies–Bouldin, Calinski–Harabasz and the gap statistic, and know when they disagree",
    "Recognise the assumptions — spherical, similar-sized, scaled, continuous — and the shapes that break them"
  ],

  prerequisites: ["5.1", "3.1", "1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Lloyd's algorithm and its objective", id: "lloyd" },

    { t: "code", lang: "text", title: "The objective, the two steps, and four points worked by hand (executed)",
      code: `objective   WCSS (inertia)  =  Σₖ Σ_{i ∈ Cₖ} ‖xᵢ - μₖ‖²        the total squared distance of every row to its cluster's centre

ASSIGN     each row joins its nearest centre                     (for fixed centres, this minimises WCSS over the assignments)
UPDATE     each centre moves to the mean of its rows             (for fixed assignments, the mean minimises Σ‖x - μ‖² -- that is why 'centroid = mean')
repeat until no assignment changes.  Each step lowers WCSS or leaves it unchanged, so the sequence converges; it is coordinate descent.

x = {1, 2, 10, 11},  k = 2,  start μ = (1, 2)
   iteration 1:  assign  1 -> μ₁;  2, 10, 11 -> μ₂           update  μ₁ = 1,  μ₂ = mean(2, 10, 11) = 7.667         WCSS 48.667
   iteration 2:  assign  1, 2 -> μ₁;  10, 11 -> μ₂            update  μ₁ = 1.5,  μ₂ = 10.5                            WCSS 1.000
   iteration 3:  assignments unchanged -> converged.          clusters {1, 2} and {10, 11};  WCSS = 4 × 0.5² = 1.0
   scikit-learn KMeans(2): centres 1.5 and 10.5, inertia 1.0

the same four points from the start μ = (10, 11):
   iteration 1:  1, 2, 10 -> μ₁;  11 -> μ₂                     μ₁ = 4.333,  μ₂ = 11                                   WCSS 48.667
   iteration 2:  1, 2 -> μ₁;  10, 11 -> μ₂                     μ₁ = 1.5,  μ₂ = 10.5                                   WCSS 1.000   -> converged`,
      caption: "Nothing is fitted in the statistical sense: k-means is an optimisation of a geometric criterion, and the criterion is squared Euclidean distance to a mean. Everything the method assumes follows from that — clusters are round, similar in spread, defined in the units of the features — and everything it needs (scaling, continuous inputs, a chosen k) follows from it too."
    },

    { t: "code", lang: "text", title: "The EM reading, and a run that converges to the wrong place (executed; four blobs, random start)",
      code: `k-means is expectation-maximisation for a Gaussian mixture with equal spherical covariances and hard assignments (7.2):
   E-step = assign (which component generated each row);   M-step = update (the maximum-likelihood mean of each component)

iteration   WCSS after ASSIGN   WCSS after UPDATE    cluster sizes
    1            5,913.2            5,728.9           [298, 151, 96, 55]
    2            5,727.2            5,726.9           [299, 151, 91, 59]
    3            5,726.9            5,726.9           converged
final centres: (3.9, 0.0), (-0.1, 7.8), (8.5, 7.6), (7.7, 8.8)      two centres share the top-right blob; one centre sits between the two bottom blobs
the global optimum on these data has WCSS 1,132.7 -- this run stopped at 5,726.9, five times worse, and nothing in the algorithm can tell`,
      caption: "Monotone descent is a guarantee about the *sequence*, not about where it ends. The objective is non-convex, finding its global minimum is NP-hard, and Lloyd's iterations stop at the first basin they fall into. The remedy has two parts — start well, and start several times — and the next block measures both."
    },

    { t: "code", lang: "python", title: "Initialisation: 200 seeds on four well-separated blobs (executed)",
      hl: [2, 3, 4],
      code: `#   init          best inertia    seeds within 1 % of best    worst inertia    distinct local optima found
#   random          1,132.7              82 %                    6,155.8                 21
#   k-means++       1,132.7             100 %                    1,132.7                  1
#   KMeans(4) defaults -- k-means++ with n_init=10, keep the best -- inertia 1,132.7`,
      caption: "k-means++ chooses each new starting centre with probability proportional to its squared distance from the nearest centre already chosen, so the seeds spread across the data instead of landing in one blob. On these blobs it removes the problem entirely; on messier data it reduces it, and `n_init` (several starts, keep the lowest inertia) finishes the job. Both are the scikit-learn defaults; the numbers say why."
    },

    { t: "dl", items: [
      ["Inertia / WCSS", "Σ‖x − μ‖² over all rows. The objective; always falls as k rises, so it cannot choose k alone."],
      ["k-means++", "Seed selection with probability ∝ D(x)², the squared distance to the nearest existing seed. The default initialisation."],
      ["n_init", "Number of independent starts; the run with the lowest inertia is kept. 10 by default with k-means++, more for hard data."],
      ["Elbow", "Inertia against k; look for the bend where further clusters stop paying. A visual heuristic, often ambiguous."],
      ["Silhouette s(i)", "(b − a)/max(a, b): a = mean distance to own cluster, b = mean distance to the nearest other cluster. +1 tight and far, 0 on a boundary, −1 wrong cluster. Averaged over rows; maximise over k."],
      ["Davies–Bouldin", "Average over clusters of the worst (within-scatter + within-scatter)/(between-distance) ratio. Lower is better; 0 is perfect separation."],
      ["Calinski–Harabasz", "Between-cluster dispersion over within-cluster dispersion, scaled by degrees of freedom. Higher is better; the F-statistic of clustering."],
      ["Gap statistic", "log(inertia expected under a uniform, cluster-free reference) − log(inertia observed). Pick the smallest k whose gap is within one standard error of the next. The only rule that can answer 'is there any structure at all?'."],
      ["Mini-batch k-means", "Updates centres from random batches instead of full passes. Same objective, approximate solution, fraction of the time on millions of rows."]
    ]},

    { t: "h2", n: "02", text: "Choosing k: five rules on data where the answer is known", id: "choosing-k" },

    { t: "code", lang: "python", title: "Four blobs of 150 points, k from 2 to 8 (executed)",
      hl: [4, 10],
      code: `#   k    inertia     silhouette    Davies–Bouldin    Calinski–Harabasz    ARI vs the true labels
#   2    10,712.2      0.495           1.019               546.3                0.499
#   3     5,682.7      0.593           0.586               778.2                0.709
#   4     1,132.7      0.767           0.311             3,396.4                1.000      <- every criterion agrees
#   5     1,029.6      0.653           0.658             2,812.8                0.916
#   6       930.8      0.537           0.890             2,497.5                0.818
#   7       837.5      0.427           1.093             2,320.0                0.714
#   8       739.0      0.326           1.182             2,261.3                0.605
# gap statistic:  k=2 0.084   k=3 0.242   k=4 1.424   k=5 1.331   k=6 1.271   k=7 1.193   k=8 1.150        (standard errors 0.02-0.03)
# gap rule -- smallest k with gap(k) ≥ gap(k+1) − s(k+1):  k = 4`,
      caption: "When clusters are real and round, every rule finds them: the elbow is sharp (10,712 → 5,683 → 1,133, then a trickle), the silhouette peaks, Davies–Bouldin bottoms, Calinski–Harabasz peaks, and the gap jumps by 1.2 at k = 4 and then declines. The value of this table is as a reference for what agreement looks like — because on real data the rules will not agree, and knowing what they do on clean structure is how you read the disagreement."
    },

    { t: "viz",
      title: "Elbow and silhouette on the four blobs (executed values)",
      caption: "Left: inertia falls steeply to k = 4 and barely after — the elbow. Right: the mean silhouette peaks at k = 4 (0.767). On these data the two agree; on the churn customers below, the elbow is a smooth curve with no bend and the silhouette never exceeds 0.29.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two panels. Left: inertia against k from 2 to 8, falling steeply from k=2 to k=4 then flattening. Right: mean silhouette against k, rising to a peak of 0.767 at k=4 then falling.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="450" y2="250"/><line x1="80" y1="40" x2="80" y2="250"/><line x1="500" y1="250" x2="820" y2="250"/><line x1="500" y1="40" x2="500" y2="250"/></g>
  <g class="s-sub">
    <text x="100" y="270" text-anchor="middle">2</text><text x="155" y="270" text-anchor="middle">3</text><text x="210" y="270" text-anchor="middle">4</text><text x="265" y="270" text-anchor="middle">5</text><text x="320" y="270" text-anchor="middle">6</text><text x="375" y="270" text-anchor="middle">7</text><text x="430" y="270" text-anchor="middle">8</text>
    <text x="520" y="270" text-anchor="middle">2</text><text x="565" y="270" text-anchor="middle">3</text><text x="610" y="270" text-anchor="middle">4</text><text x="655" y="270" text-anchor="middle">5</text><text x="700" y="270" text-anchor="middle">6</text><text x="745" y="270" text-anchor="middle">7</text><text x="790" y="270" text-anchor="middle">8</text>
    <text x="72" y="54" text-anchor="end">10,712</text><text x="72" y="254" text-anchor="end">0</text><text x="492" y="54" text-anchor="end">0.8</text><text x="492" y="254" text-anchor="end">0</text>
    <text x="250" y="290" text-anchor="middle">k — inertia (elbow)</text><text x="660" y="290" text-anchor="middle">k — mean silhouette</text>
  </g>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.2" points="100,50 155,144 210,229 265,231 320,233 375,234 430,236"/>
  <polyline fill="none" style="stroke:var(--good)" stroke-width="2.2" points="520,126 565,102 610,58 655,87 700,116 745,143 790,168"/>
  <circle cx="210" cy="229" r="5" style="fill:var(--accent)"/><circle cx="610" cy="58" r="5" style="fill:var(--good)"/>
  <text x="222" y="222" class="s-label" style="fill:var(--accent);font-weight:600">k = 4: 1,133</text>
  <text x="622" y="56" class="s-label" style="fill:var(--good);font-weight:600">k = 4: 0.767</text>
</svg>`
    },

    { t: "code", lang: "python", title: "The churn customers: five standardised numerics, 863 rows (executed)",
      hl: [3, 4, 9, 10, 15, 16, 17],
      code: `#   k    inertia    silhouette    Davies–Bouldin    Calinski–Harabasz    sizes
#   2    3,302.6      0.263           1.575               263.9            [242, 621]
#   3    2,687.7      0.287           1.402               260.3            [152, 539, 172]     <- silhouette's choice, and it is 0.29
#   4    2,287.0      0.226           1.380               253.9            [260, 304, 150, 149]
#   5    1,977.8      0.241           1.222               253.5
#   6    1,826.7      0.220           1.220               233.5
#   7    1,708.8      0.222           1.300               217.6
#   8    1,594.2      0.215           1.350               208.5
# gap statistic: 0.341  0.395  0.433  0.492  0.527  0.538  0.554 for k = 2..8   <- rising throughout: never within one SE of the next; no k is preferred
# no elbow (each step removes ~15 %), silhouette below 0.3 everywhere, DB and CH point at different k: these customers are a continuum

# the k = 3 profile anyway (means per segment)
#         tenure    fee     logins   tickets   discount   churn    n     plan mix
#   0      31.3    10.66     9.9      0.91      13.2      0.18    152    basic 49 %, plus 49 %          <- 'the discounted': paid-channel customers with a discount
#   1      29.9     9.98     9.3      0.71       0.0      0.18    539    basic 60 %, plus 40 %          <- 'the ordinary': no discount, basic or plus
#   2      33.4    18.29    18.3      0.94       1.7      0.04    172    pro 74 %                       <- 'the power users': pro plan, 18 logins, 4 % churn`,
      caption: "This is what most segmentation projects look like: the diagnostics say there is no strong cluster structure, and the segments that k-means draws anyway are cuts through a continuum along the most variable directions — here, discount and plan. That is still useful (the 'power user' segment churns at 4 % against 18 %), but it must be reported as a partition chosen for convenience, not as groups the data revealed. A silhouette of 0.29 and a gap that never plateaus are the evidence; the profile table is the deliverable; the honest sentence is 'we segmented by discount status and plan tier, which the clustering confirmed are the dominant axes'."
    },

    { t: "callout", kind: "trap", title: "Unscaled k-means is a one-feature histogram", body: [
      { t: "p", text: "The same 863 customers clustered on raw units (tenure in months with sd 17.5, fee in pounds with sd 4.2, tickets with sd 0.9) give three centres whose spread is **16.3 in tenure and 0.06 in fee, 0.12 in logins, 0.02 in tickets**: the clusters are tenure bins — under 20 months, 20–40, over 40 — and nothing else, because squared Euclidean distance is dominated by the widest column exactly as it was for KNN (5.1). Standardise, or choose weights deliberately; a feature's weight in k-means is its variance." }
    ]},

    { t: "h2", n: "03", text: "What k-means cannot find, and what it does at scale", id: "limits" },

    { t: "code", lang: "python", title: "Shapes, spreads, sizes and outliers (executed; ARI against the true grouping)",
      hl: [2, 3, 4, 5, 6],
      code: `#   two moons (crescents)                        k=2 ARI 0.253   silhouette 0.489     <- a decent silhouette for a wrong answer: the cut is compact, just not the moons
#   concentric circles                           k=2 ARI -0.002  silhouette 0.330     <- no better than random: the true clusters share a centre
#   two blobs, spreads sd 0.4 vs 2.0             k=2 ARI 0.485                        <- the boundary sits at the midpoint, inside the wide cluster
#   two blobs, sizes 500 vs 50                   k=2 ARI 0.731   sizes found [475, 75] <- the small cluster is padded with the big one's edge
#   four blobs + one point at (40, 40), k=4      sizes [150, 151, 150, 150]; the outlier's centre pulled 0.30 units; inertia 1,133 -> 3,152
#                                       k=5      sizes [150, 150, 150, 150, 1]        <- given a spare centre, the outlier takes it`,
      caption: "K-means draws Voronoi cells around its centres: convex, roughly equal in extent, separated by straight boundaries at the midpoints. Anything that is not a set of round, similar blobs is mis-cut — crescents, rings, a wide cluster beside a tight one, a big cluster beside a small one. An outlier is either absorbed (and drags a centre) or, with a spare k, becomes a cluster of one; either way it distorts, and the mean has no robustness. 7.2 is the set of methods for each of these shapes."
    },

    { t: "code", lang: "python", title: "Mini-batch at scale (executed; 8 blobs in 20 dimensions)",
      code: `#   200,000 rows:    KMeans 0.3 s, ARI 1.000     MiniBatchKMeans 0.1 s, ARI 1.000              <- both instant; no reason to approximate
#   2,000,000 rows, n_init=1:
#       KMeans           1.5 s   inertia 2.65 × 10⁸   ARI 0.836     <- a single start landed in a local optimum
#       MiniBatchKMeans  0.3 s   inertia 1.60 × 10⁸   ARI 1.000     <- the approximate method found the better basin, 5× faster
#   the lesson is about n_init, not about mini-batch: one start is one draw`,
      caption: "K-means is O(n·k·d) per iteration and scales to millions of rows without approximation; mini-batch trades a slightly noisier solution for a fraction of the time and is the tool for streaming or for data that will not fit in memory. The second row is a reminder that on any size of data, one start is a gamble."
    },

    { t: "table",
      head: ["Rule for k", "Computes", "Picks", "Strength", "Weakness"],
      rows: [
        ["Elbow", "Inertia vs k", "The bend", "Fast, intuitive", "Ambiguous or absent on real data (churn: no bend)"],
        ["Silhouette", "(b − a)/max(a, b), averaged", "The maximum", "Per-row and per-cluster diagnostics; the usual default", "O(n²); favours round, well-separated clusters; low values (0.29) mean weak structure"],
        ["Davies–Bouldin", "Worst scatter/separation ratio per cluster", "The minimum", "Cheap; penalises overlapping clusters", "Also assumes round clusters"],
        ["Calinski–Harabasz", "Between/within dispersion ratio", "The maximum", "Cheap; a variance-ratio F-statistic", "Tends to prefer small k on continua"],
        ["Gap statistic", "log inertia vs a uniform reference", "Smallest k within 1 SE of the next", "Can say 'no structure' (churn: gap keeps rising)", "Monte-Carlo cost; reference choice matters"],
        ["Stability", "Agreement of clusterings across resamples", "The most reproducible k", "Tests what you will actually rely on", "Costly; stable ≠ meaningful (7.3)"],
        ["Business validity", "Segment size, distinctness, actionability", "Whatever can be used", "The one that matters", "Not a statistic"]
      ]
    },

    { t: "ladder",
      title: "Segmenting 1 million customers for a marketing team",
      rungs: [
        { level: "bad", label: "Raw features, k = 5 because five personas were requested", code: `KMeans(5).fit(df[numeric_cols])`,
          note: "**Tenure bins with a persona name on each.** Unscaled distance, an unexamined k, a random-ish start, and no evidence of structure." },
        { level: "ok", label: "Scaled, k chosen by silhouette and gap, profiled", code: `Z = StandardScaler().fit_transform(df[numeric_cols]); [silhouette_score(Z, KMeans(k, n_init=10).fit_predict(Z)) for k in range(2, 10)]; gap over the same range; profile the segments`,
          note: "**Defensible.** With 1 M rows the silhouette needs a sample, and the profile is still cuts through a continuum if the diagnostics say so." },
        { level: "best", label: "Reduce, cluster, test stability, report structure strength honestly, and encode the segments for the models that use them", code: `Z = make_pipeline(StandardScaler(), PCA(0.9)).fit_transform(X)          # 7.4: correlated features counted once
km = MiniBatchKMeans(k, n_init=10); stability = mean ARI between clusterings of bootstrap halves (7.3)
# report: silhouette on a 20k sample, gap, stability; the profile table; and the sentence 'segments are convenience cuts' if silhouette < 0.3
# downstream: segment id as a categorical feature; refit on a schedule; watch segment sizes drift (11.1)`,
          note: "**A partition whose strength is measured and stated**, built on a representation where correlated features do not double-count, and wired into the models that will consume it." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Lloyd on six points, a silhouette by hand, and a k you must defend",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Run k-means with k = 2 on x = {1, 2, 3, 8, 9, 10} from the start μ = (1, 2), showing assignments, centres and WCSS at each iteration; then from μ = (3, 8); then say what the best possible WCSS is and whether any start can do worse than it at convergence. **(b)** For the converged clustering, compute the silhouette of the point x = 3 and of x = 8 by hand, and the mean silhouette. **(c)** On the churn customers, the silhouette picks k = 3 at 0.287 and the gap never settles. Write the three-sentence paragraph you would put in the report, and compute one number that supports it: the silhouette of the k = 3 solution restricted to the 'power user' segment versus the other two." }
      ],
      requirements: [
        "(a) both traces, the optimum, and the argument about starts.",
        "(b) the two silhouettes with a and b shown, and the mean.",
        "(c) the paragraph and the per-segment silhouette."
      ],
      hint: "(a) The mean of {1, 2, 3} is 2 and of {8, 9, 10} is 9. (b) a(3) = mean distance to {1, 2}; b(3) = mean distance to {8, 9, 10}. (c) `silhouette_samples` gives per-row values; average within each label.",
      solution: {
        lang: "python",
        title: "kmeans_practice.py",
        code: `# (a) start μ = (1, 2):
#   iter 1: 1 -> μ₁; 2, 3, 8, 9, 10 -> μ₂        μ = (1, 6.4)          WCSS = 0 + [(2-6.4)² + (3-6.4)² + (8-6.4)² + (9-6.4)² + (10-6.4)²] = 0 + 53.2
#   iter 2: 1, 2, 3 -> μ₁; 8, 9, 10 -> μ₂         μ = (2, 9)            WCSS = (1+0+1) + (1+0+1) = 4.0
#   iter 3: unchanged -> converged
#   start μ = (3, 8):  iter 1: 1, 2, 3 -> μ₁; 8, 9, 10 -> μ₂   μ = (2, 9)   WCSS 4.0 -> converged in one step
#   best possible WCSS is 4.0 (any split other than {1,2,3}|{8,9,10} puts a point ≥ 5 units from its mean). A start can converge WORSE than 4.0
#   only if it lands in a different basin -- e.g. μ = (9, 10): iter 1: 1,2,3,8,9 -> μ₁ (mean 4.6), 10 -> μ₂; iter 2: 1,2,3 -> μ₁, 8,9,10 -> μ₂ -> 4.0.
#   on six points in a line with a wide gap every start finds the optimum (executed: all three starts reach WCSS 4.0 within two iterations);
#   on the four blobs a random start found 21 different ones.

# (b) clusters {1, 2, 3} and {8, 9, 10}
#   x = 3:  a = mean(|3-1|, |3-2|) = 1.5;   b = mean(|3-8|, |3-9|, |3-10|) = 6;   s = (6 - 1.5)/6 = 0.750
#   x = 8:  a = mean(|8-9|, |8-10|) = 1.5;  b = mean(|8-1|, |8-2|, |8-3|) = 6;    s = 0.750
#   x = 1:  a = 1.5 (to 2 and 3), b = 8 (to 8, 9, 10)  -> s = 0.8125;   x = 2: a = 1, b = 7 -> 0.857;  by symmetry x = 9: 0.857, x = 10: 0.8125
#   mean silhouette = (0.8125 + 0.857 + 0.75 + 0.75 + 0.857 + 0.8125)/6 = 0.807

# (c) paragraph: "The clustering diagnostics do not support distinct customer groups: the mean silhouette is below 0.3 for every k and the
#   gap statistic rises without settling, which is the signature of a continuum. We therefore report the k = 3 partition as convenience
#   segments along the two dominant axes the clustering identified, discount status and plan tier. The segments are nonetheless
#   operationally distinct: pro-plan power users churn at 4 % against 18 % for the rest."
#   supporting number (executed):
from sklearn.metrics import silhouette_samples
s = silhouette_samples(Z, labels); pd.Series(s).groupby(labels).mean()
#   segment 0 'discounted' 0.174 (n 152)    segment 1 'ordinary' 0.341 (n 539)    segment 2 'power users' 0.217 (n 172)
#   no segment is a tight group -- not even the power users, whose pro-plan identity is clear in the profile but who spread across tenure
#   and tickets like everyone else. The largest segment scores highest simply because it is the dense middle of the continuum. That is the
#   number that turns 'segments' into 'cuts': every per-segment silhouette is below 0.35.`,
        notes: [
          { t: "p", text: "**(a)** shows convergence in one or two steps and a unique basin — the easy case. The four-blob run in the lesson is the same algorithm on data with many basins." },
          { t: "p", text: "**(b)** is the silhouette computed once by hand so its numbers mean something: 0.75 for a point at the inner edge of its cluster, 0.86 for one in the middle." },
          { t: "p", text: "**(c)** is the report most segmentation projects should write and few do. The per-segment silhouette (0.17, 0.34, 0.22) turns 'weak structure' into a checked statement: not one of the three segments is a group the data insist on." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A random start on four clean blobs converged with WCSS 5,727 against the optimum of 1,133, and the objective never increased along the way. How can both be true?",
          options: [
            "The algorithm has a bug",
            "Lloyd's steps each minimise WCSS for the other step's variables, so WCSS is monotone non-increasing — but the objective is non-convex and the iteration stops at the first local minimum it reaches; from that start, two centres shared one blob and one straddled two, and no step could move a centre across the gap. k-means++ seeding and multiple starts (n_init) are the remedy: 200 k-means++ starts found one optimum, 200 random starts found 21",
            "The blobs were not scaled",
            "k was wrong"
          ],
          answer: 1,
          why: "Monotone descent guarantees convergence, not the destination."
        }
      ]
    }
  ],

  takeaways: [
    "**Objective: WCSS = Σ‖x − μ‖²; algorithm: assign to the nearest centre, move centres to means, repeat.** Each step lowers WCSS; it is coordinate descent and EM with hard assignments.",
    "**By hand**: {1, 2, 10, 11} from (1, 2) → (1, 7.667) → (1.5, 10.5), WCSS 48.7 → 1.0, converged in two iterations.",
    "**Local optima are real**: 21 distinct solutions from 200 random starts (worst 5.4× the best); k-means++ found the optimum 200 times out of 200. Use n_init.",
    "**On clean structure every rule agrees** (four blobs: elbow, silhouette 0.767, DB 0.311, CH 3,396, gap 1.42 all at k = 4).",
    "**On real data they disagree, and that is the finding**: churn silhouette ≤ 0.29 at every k, no elbow, gap never settles — a continuum, cut for convenience along discount and plan.",
    "**Scale first or you cluster one feature**: unscaled centres varied 16.3 in tenure and 0.06 in fee.",
    "**Voronoi cells only**: moons ARI 0.25, rings −0.002, unequal spreads 0.49, unequal sizes 0.73; an outlier drags a centre or takes a spare one.",
    "**Silhouette can be respectable for a wrong answer** (0.489 on the moons): it scores compactness, not truth.",
    "**Mini-batch** trades a little precision for a fraction of the time at millions of rows; the local-optimum risk is about starts, not batches.",
    "**Report structure strength with the segments** — silhouette, gap, stability — and say when segments are administrative cuts."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is the centroid the mean, and what does that imply about the clusters k-means finds?",
        options: [
          "Because the mean is easy to compute",
          "For a fixed set of rows, the point minimising Σ‖x − μ‖² is their mean — so the update step is exact coordinate descent on WCSS. Because the criterion is squared Euclidean distance to a single point, the clusters are convex Voronoi cells of roughly equal extent: round, similar-sized blobs in the features' units. Crescents (ARI 0.25), rings (−0.002), a wide cluster next to a tight one (0.49) and unscaled features all violate that",
          "Because k-means assumes Gaussian data",
          "It is a convention; the median would work equally well"
        ],
        answer: 1,
        why: "k-medoids swaps the mean for an actual data point and any distance, at a cost in speed — the fix for outliers and non-Euclidean data."
      },
      {
        stem: "How would you choose k, and what would you conclude if the silhouette peaked at 0.29?",
        options: [
          "Use the elbow and report its k",
          "Compute several rules over a range — silhouette, Davies–Bouldin, Calinski–Harabasz, the gap statistic — and look for agreement, as they all agreed on four clean blobs. A peak silhouette of 0.29 with a gap that never settles means weak or absent cluster structure: the data are a continuum, and any k is a convenience partition. Report that, choose k by usefulness, and describe the segments as cuts along the dominant axes",
          "Pick the k with the lowest inertia",
          "Pick k = √(n/2)"
        ],
        answer: 1,
        why: "Inertia always falls with k; the rules that can choose are the ones that penalise it."
      },
      {
        stem: "What does k-means++ do, and why is it the default?",
        options: [
          "It runs k-means k times",
          "It picks the first seed at random and each subsequent seed with probability proportional to its squared distance from the nearest seed already chosen, so the starting centres are spread across the data rather than clumped in one region. On four blobs, 200 random starts found 21 distinct local optima (worst inertia 6,156 against 1,133); 200 k-means++ starts found the optimum every time. Combined with n_init it makes the result reproducible",
          "It chooses k automatically",
          "It standardises the features"
        ],
        answer: 1,
        why: "Seeding controls which basin the descent falls into; several seeds and keeping the best inertia is the second safeguard."
      },
      {
        stem: "Why did unscaled k-means on the churn customers produce tenure bins?",
        options: [
          "Because tenure is the most important feature",
          "Squared Euclidean distance weights each feature by its variance: tenure (sd 17.5) contributes hundreds of times more to the distance than tickets (sd 0.9), so the centres separated only along tenure — centre spread 16.3 in tenure, 0.06 in fee. Standardising gives every feature equal say; deliberate weights give the say you intend. A feature's weight in k-means is its variance",
          "Because k was too small",
          "Because the data were not centred"
        ],
        answer: 1,
        why: "The same lesson as KNN (5.1): distance-based methods are scale-based methods."
      },
      {
        stem: "Is k-means the right tool for a customer segmentation on 1 million rows with 200 features?",
        options: [
          "No; it does not scale",
          "It scales fine — O(n·k·d) per iteration, mini-batch if memory is tight — but not on 200 raw features: reduce first (PCA, so correlated features are not double-counted), scale, use k-means++ with several starts, choose k with silhouette on a sample and the gap statistic, check stability across resamples, and report the strength of the structure alongside the segments. With mixed categorical features use k-prototypes or encode carefully; with irregular shapes or outliers use 7.2's methods",
          "Yes, on all 200 features with k = 5",
          "No; use hierarchical clustering instead"
        ],
        answer: 1,
        why: "The workhorse for segmentation, with the preparation and the honesty the lesson describes."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain k-means, walk through an iteration, and say what can go wrong.",
        strong: "K-means partitions rows into k clusters to minimise the within-cluster sum of squared distances to the cluster centres. Lloyd's algorithm alternates two steps: assign each row to its nearest centre, then move each centre to the mean of its assigned rows — the mean is the point minimising squared distance, so each step is exact coordinate descent and the objective never increases. On the points 1, 2, 10, 11 with k = 2 starting from centres at 1 and 2: the first assignment puts 1 alone and the rest with the second centre, which moves to 7.67; the second assignment puts 1 and 2 together, 10 and 11 together, centres 1.5 and 10.5, WCSS 1.0, and the third pass changes nothing. What goes wrong is where it stops: the objective is non-convex, so the descent ends at a local minimum determined by the start — on four clean blobs, 200 random starts found 21 different optima, the worst five times the best. k-means++ seeding, which spreads the initial centres with probability proportional to squared distance, found the optimum every time, and several starts with the best kept is the second safeguard. Beyond that, the method assumes round, similar-sized clusters in scaled continuous features, needs k chosen by a diagnostic, and treats an outlier as either a drag on a centre or a cluster of its own.",
        answer: [
          { t: "p", text: "Objective, the two steps with the worked iteration, monotone descent versus local optima with numbers, the seeding fix, and the assumptions." }
        ]
      },
      {
        level: "core",
        q: "How do you choose k without the elbow?",
        strong: "With criteria that penalise adding clusters, computed over a range of k and compared for agreement. The silhouette averages, per row, the separation from the nearest other cluster minus the cohesion within its own, scaled to [−1, 1]; pick the k that maximises it, and read its level — above 0.5 is clear structure, below 0.3 is weak. Davies–Bouldin is the average worst-case ratio of within-cluster scatter to between-cluster distance, minimised; Calinski–Harabasz is a between-over-within variance ratio, maximised. The gap statistic compares the log inertia to what a uniform, cluster-free reference would give, and picks the smallest k whose gap is within one standard error of the next — it is the only rule that can answer whether there is structure at all. On four clean blobs all of them chose four. On the churn customers the silhouette peaked at 0.29 for k = 3, Davies–Bouldin and Calinski–Harabasz pointed elsewhere, and the gap rose without settling: the customers are a continuum, and the honest report says the segments are convenience cuts along discount and plan tier. I would add a stability check — cluster bootstrap halves and measure their agreement — and, above all, whether the segments are large enough and distinct enough to act on, which no statistic settles.",
        answer: [
          { t: "p", text: "Four rules with their definitions and directions, agreement on clean data, disagreement on real data read correctly, stability and business validity." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague clusters customers with k-means, gets silhouette 0.49, and presents the two segments as 'two natural customer types'. Push back.",
        strong: "A silhouette of 0.49 measures compactness and separation of the partition k-means drew, not whether the partition matches any real structure: on the two-moons data k-means scored 0.489 for a cut that put half of each moon in each cluster, with an adjusted Rand index of 0.25 against the truth. So I would ask three things. First, what the alternatives say — the gap statistic against a uniform reference, and the silhouette across k rather than at k = 2, because k = 2 is where the silhouette of a single elongated cloud cut in half is often highest. Second, whether the features were scaled and de-correlated, because unscaled k-means on the churn data produced tenure bins, and a segmentation that is really one feature binned looks perfectly compact. Third, stability: recluster bootstrap halves and measure the agreement of the assignments, because a cut through a continuum moves with the sample while a real group does not. If the structure survives — high stability, a gap that plateaus, segments that are distinct on features they were not clustered on — then 'two types' is earned. If not, the same two segments can still be useful as a policy split, and the presentation should say 'we split customers along their dominant axis of variation', which is a smaller claim and a true one.",
        answer: [
          { t: "p", text: "The silhouette's limit with the moons number, three concrete checks, and the smaller true claim." }
        ]
      }
    ]
  }
});
