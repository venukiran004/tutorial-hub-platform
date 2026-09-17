/* ============================================================================
   LESSON 5.1 — K-Nearest Neighbours and Distance
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**K-nearest neighbours has no training step and no parameters: to predict for a query, find the k stored rows closest to it and vote (or average).** Every property of the method follows from the word *closest* — which is why this lesson is mostly about distance. It works the vote by hand for k = 1, 3 and 5, shows the metric flipping a decision at the same query, and then runs the three experiments that decide whether KNN is usable on a problem: scaling (an unscaled tenure column with sd 17.5 silently became the whole model), the k sweep as a bias–variance dial (training AUC 1.000 and cross-validated 0.575 at k = 1; 0.757 and 0.754 at k = 401), and the curse of dimensionality (AUC 0.950 with 5 features, 0.596 with 195 noise columns added — and PCA does not rescue it, selection does). It closes with the cost that decides deployment: 1,000 queries against 50,000 rows take 9 ms with a KD-tree in three dimensions and 11 seconds in fifty.",

  objectives: [
    "Compute Euclidean, Manhattan, Chebyshev, cosine and Mahalanobis distances by hand and say which to use when",
    "Work the k-NN vote (uniform and distance-weighted) and read k as a bias–variance dial",
    "Show why scaling is mandatory and how irrelevant features and high dimension destroy the neighbourhood",
    "Choose between brute force, KD-trees, ball trees and approximate search, and know when KNN is the right tool"
  ],

  prerequisites: ["1.7", "3.1", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Distance, then a vote", id: "vote" },

    { t: "code", lang: "text", title: "The Minkowski family and two that are not in it",
      code: `Minkowski   d_q(x, x') = ( Σⱼ |xⱼ - x'ⱼ|^q )^{1/q}
   q = 1   Manhattan   Σ|Δ|            grid distance; robust to one large coordinate difference
   q = 2   Euclidean   √Σ Δ²           straight line; the default for comparable continuous features
   q → ∞   Chebyshev   max |Δ|         the single worst coordinate

cosine      1 - (x · x') / (‖x‖ ‖x'‖)        angle only, magnitude ignored: text counts, embeddings, anything where 'twice as much of everything' is the same thing
Mahalanobis √( (x - x')ᵀ Σ⁻¹ (x - x') )        Euclidean after whitening by the covariance: correlated features count once, each feature in units of its own sd

prediction   classification:  ŷ = mode{ yᵢ : i ∈ N_k(x) }         regression:  ŷ = mean{ yᵢ : i ∈ N_k(x) }
             distance-weighted: each neighbour votes with weight 1/dᵢ (or a kernel of dᵢ)`,
      caption: "Every metric is a statement about which differences matter. Euclidean says all coordinates matter equally and in their own units — which is why it demands scaling. Cosine says only proportions matter. Mahalanobis says a difference along a direction the data varies in is small and a difference against the correlation is large. KNN has no other model; the metric *is* the model."
    },

    { t: "viz",
      title: "Six labelled points, one query, three values of k",
      caption: "Query Q = (4, 4). The inner ring encloses the three nearest (two red, one blue → red); the outer ring the five nearest (three red, two blue → red). Distance-weighting the k = 3 vote gives red 1/1.00 + 1/2.24 = 1.45 against blue 1/2.83 = 0.35.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Scatter of six labelled points in the plane with a query point at (4,4). Two concentric circles around the query enclose the three and five nearest neighbours. A table on the right lists each point's Euclidean distance.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="120" y1="280" x2="440" y2="280"/><line x1="120" y1="20" x2="120" y2="280"/></g>
  <circle cx="256" cy="144" r="96" fill="none" style="stroke:var(--accent)" stroke-width="1.3" stroke-dasharray="5 4"/>
  <circle cx="256" cy="144" r="144" fill="none" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="3 5"/>
  <g style="fill:var(--crit)"><circle cx="154" cy="246" r="6"/><circle cx="222" cy="144" r="6"/><circle cx="290" cy="212" r="6"/></g>
  <g style="fill:var(--accent)"><circle cx="324" cy="76" r="6"/><circle cx="392" cy="42" r="6"/><circle cx="358" cy="178" r="6"/></g>
  <rect x="249" y="137" width="14" height="14" style="fill:var(--warn);stroke:var(--ink)" stroke-width="1.2"/>
  <g class="s-sub">
    <text x="140" y="262">P1 (1,1)</text><text x="196" y="132">P2 (3,4)</text><text x="298" y="228">P3 (5,2)</text>
    <text x="332" y="72">P4 (6,6)</text><text x="400" y="46">P5 (8,7)</text><text x="366" y="194">P6 (7,3)</text>
    <text x="266" y="134" style="fill:var(--warn);font-weight:600">Q (4,4)</text>
    <text x="330" y="118" style="fill:var(--accent)">k = 3</text><text x="386" y="238" style="fill:var(--ink-3)">k = 5</text>
  </g>
  <g class="s-mono" style="fill:var(--ink-2)">
    <text x="520" y="60">rank   point   label   distance</text>
    <text x="520" y="86">  1     P2     red      1.000</text>
    <text x="520" y="108">  2     P3     red      2.236</text>
    <text x="520" y="130">  3     P4     blue     2.828</text>
    <text x="520" y="152">  4     P6     blue     3.162</text>
    <text x="520" y="174">  5     P1     red      4.243</text>
    <text x="520" y="196">  6     P5     blue     5.000</text>
  </g>
  <g class="s-label" style="font-weight:600">
    <text x="520" y="232" style="fill:var(--crit)">k = 1: red     k = 3: red 2–1     k = 5: red 3–2</text>
  </g>
</svg>`
    },

    { t: "code", lang: "text", title: "The same six points under four metrics (executed); and a query where the metric flips the answer",
      code: `query (4, 4)      euclidean   manhattan   chebyshev   cosine
   P2 (3,4) red      1.000        1           1        0.010
   P3 (5,2) red      2.236        3           2        0.081
   P4 (6,6) blue     2.828        4           2        0.000      <- cosine: (6,6) points in exactly the same direction as (4,4): distance 0
   P6 (7,3) blue     3.162        4           3        0.072
   P1 (1,1) red      4.243        6           3        0.000      <- and so does (1,1)
   P5 (8,7) blue     5.000        7           4        0.002
neighbour order:   euclidean = manhattan = P2 P3 P4 P6 P1 P5        cosine: P4 P1 P5 P2 P6 P3   (a different model entirely)

query (5, 5):      euclidean k = 3 -> P4 blue, P2 red, P6 blue  -> BLUE
                   manhattan k = 3 -> P4 blue (2), P2 red (3), P3 red (3)  -> RED
query (2, 9):      1-NN under euclidean is P4 (blue); under manhattan it is P2 (red)`,
      caption: "Cosine puts (6, 6) and (1, 1) at distance zero from (4, 4) because it sees only direction; on raw coordinates that is nonsense, on word counts it is the point. Manhattan and Euclidean agree on the ranking at (4, 4) and disagree one unit away, and the vote flips with them. The metric is not a detail to leave at the default — it is a claim about the geometry of the problem, and the claim should be argued before k is tuned."
    },

    { t: "dl", items: [
      ["Lazy / instance-based", "Training stores the rows (O(1)); every cost is paid at query time, and grows with n. The opposite of a parametric model, which pays at training and is O(p) to score (1.7)."],
      ["k", "The number of neighbours. Small k: a jagged boundary that follows individual points (low bias, high variance); large k: a smooth boundary that approaches the majority class (high bias, low variance). Odd for binary voting to avoid ties."],
      ["weights='distance'", "Neighbours vote with weight 1/d. Sharpens the vote, breaks ties, lets a large k stay local when close neighbours exist, and gives a continuous probability instead of j/k."],
      ["Curse of dimensionality", "As d grows, nearest and farthest distances converge ((dmax − dmin)/dmin: 13.9 at d = 5, 0.32 at d = 200) and nearly all volume sits at the boundary (1 − 0.9ᵈ: 65 % at d = 10, 99.997 % at d = 100). 'Nearest' stops meaning anything."],
      ["KD-tree / ball tree", "Spatial indexes that prune the search: O(log n) per query in low dimension, degrading to worse than brute force above ~15–20 dimensions."],
      ["Approximate nearest neighbours", "HNSW, FAISS, Annoy: sublinear queries in high dimension at the cost of occasionally missing the true neighbour. The tool for embeddings at scale (11.4)."],
      ["Mahalanobis", "Distance in the metric of the data's own covariance. A point two sd along the correlated direction is close; two sd against it is far (2.08 vs 9.24 below)."]
    ]},

    { t: "h2", n: "02", text: "Scaling, k and the neighbourhood on the churn data", id: "churn" },

    { t: "code", lang: "python", title: "Unscaled versus standardised, k = 15 (executed, 863 rows, 5-fold)",
      hl: [2, 3, 6],
      code: `# feature sds: tenure 17.5, fee 4.2, logins 5.0, tickets 0.9, discount 5.7
# unscaled          AUC 0.6632   log-loss 0.4751
# standardised      AUC 0.6914   log-loss 0.4562
# min-max           AUC 0.6871   log-loss 0.4485
# what the unscaled model was actually doing -- mean |difference| to each row's nearest neighbour, per feature:
#   tenure 0.83   fee 0.50   logins 0.80   tickets 0.53   discount 0.00      <- the neighbour is chosen to match tenure and logins; discount never matters`,
      caption: "Unscaled Euclidean distance is dominated by whichever column has the largest spread — here tenure, with a standard deviation twenty times that of tickets — so the model becomes 'customers with similar tenure', and the strongest churn signal (tickets, 4.5) is a rounding error in the distance. Scaling is not a refinement for KNN; without it the model is not the model you think you fitted. Put the scaler in the pipeline so the folds do not leak (3.5)."
    },

    { t: "code", lang: "python", title: "k as the bias–variance dial (executed, standardised, 5-fold; logistic regression on the same features: AUC 0.7566)",
      hl: [2, 3, 8, 9, 11],
      code: `#   k      CV AUC    CV log-loss    train AUC
#     1     0.5747      1.4496        1.0000      <- the query is its own neighbour: perfect memory, coin-flip generalisation
#     3     0.6135      0.7799        0.9257
#     5     0.6411      0.6277        0.8783
#     9     0.6842      0.5011        0.8417
#    15     0.6914      0.4562        0.8173
#    25     0.7133      0.4171        0.7870
#    51     0.7268      0.3837        0.7731
#   101     0.7427      0.3826        0.7606      <- log-loss minimum
#   201     0.7452      0.3883        0.7567
#   401     0.7543      0.4020        0.7566      <- AUC still rising: the truth is nearly linear (4.5) and a very smooth KNN approximates a linear boundary
# weights="distance":  k=25 AUC 0.7046, k=51 0.7151   <- worse here: it re-sharpens the neighbourhood that large k was smoothing
# metric at k=51:  euclidean 0.7268   manhattan 0.7222   chebyshev 0.7254   cosine 0.7379`,
      caption: "The training column is the tell: at k = 1 the model has memorised the data (AUC 1.000) and learned nothing (0.575). Raising k trades memory for smoothness, and on this target — whose truth is a linear logit — the smoother the better, right up to k = 401 where KNN is doing a clumsy imitation of logistic regression and still 0.003 short of it. KNN wins when the boundary is local and curved; on a linear problem it is the wrong tool, and the sweep tells you so."
    },

    { t: "code", lang: "python", title: "Where KNN wins: spend regression, whose truth is fee × min(tenure, 12) × (1 − discount) (executed, 3 features, 5-fold MAE)",
      hl: [1, 3, 4, 10],
      code: `# linear regression                     MAE 20.94        <- additive model of a multiplicative kinked truth (4.4)
#   k      uniform    distance-weighted
#    1       9.98        9.98
#    3       9.15        8.81      <- half the linear model's error with no formula at all
#    5       9.54        8.85
#   10      10.23        9.14
#   20      11.74        9.84
#   50      15.04       11.43      <- averaging over too wide a neighbourhood blurs the kink
# noise floor 6.38; the one engineered column in 4.4 reached 6.34
# training MAE with weights="distance" is 0.18 at EVERY k: the query is its own nearest neighbour at distance 0 and gets infinite weight`,
      caption: "A local average needs no functional form: where the surface bends, the neighbours bend with it, and KNN halves the linear model's error at k = 3. It still loses to knowing the formula (6.34), and its training error is meaningless with distance weighting — the row predicts itself — so only cross-validated numbers count. The smoothness assumption is doing the work: nearby customers spend similar amounts. Where it fails (a step, a discontinuity, a categorical cliff) KNN blurs it."
    },

    { t: "code", lang: "python", title: "Mahalanobis on correlated features (executed; 500 points with correlation 0.9)",
      code: `# two queries at the SAME Euclidean distance 2.83 from the centre:
#   a = (2, 2)   along the correlation:    Mahalanobis 2.08    11.6 % of the data lie farther out       <- an ordinary point
#   b = (2, -2)  against the correlation:  Mahalanobis 9.24     0.0 % of the data lie farther out       <- an extreme outlier
KNeighborsClassifier(metric="mahalanobis", metric_params={"VI": np.linalg.inv(np.cov(X_train.T))})`,
      caption: "Standardising equalises the features' scales; it does not remove their correlation. Two highly correlated features are one feature counted twice in a Euclidean distance, and a point that breaks the correlation is far from everything in a way Euclidean cannot see. Mahalanobis fixes both at the cost of estimating and inverting a covariance — the same idea returns as the elliptical envelope in 9.4."
    },

    { t: "h2", n: "03", text: "The curse, and what does and does not cure it", id: "curse" },

    { t: "code", lang: "python", title: "Five informative features padded with noise columns, n = 1,000, k = 15 (executed, 5-fold AUC)",
      hl: [2, 7, 8, 12, 13],
      code: `#   d      KNN      logistic    KNN after PCA(5)    KNN after SelectKBest(5)    (dmax − dmin)/dmin for one row
#     5    0.950     0.858          0.950                    --                          13.90
#    10    0.872     0.854          0.669                    --                           3.93
#    20    0.779     0.848          0.670                    --                           1.47
#    50    0.681     0.835          0.673                  0.888                          0.74
#   100    0.670     0.822          0.639                    --                           0.50
#   200    0.596     0.786          0.579                  0.860                          0.32
# selection picked columns [0, 1, 2, 21, 27] at d = 50 -- three of the five informative ones, and it was enough

# the geometry behind the column on the right: share of a unit cube's volume within 0.1 of its surface, 1 - 0.9^d
#   d = 1: 10 %     d = 2: 19 %     d = 10: 65 %     d = 50: 99.5 %     d = 100: 99.997 %`,
      caption: "Two separate lessons. First, the curse is real and steep: 195 noise columns turn a 0.95 model into a 0.60 one, because the distance is now 97 % noise and the nearest neighbour is nearly random; the logistic model, which can set 195 coefficients to almost zero, barely notices. Second, **PCA is not a cure**, and this is the trap: after standardisation the noise columns have exactly the variance of the informative ones, so the top five principal components are five random directions — 0.669 at d = 10 is *worse* than doing nothing. PCA finds variance, not relevance (7.4). Supervised selection finds relevance: 0.888 at d = 50. KNN has no feature weighting of its own, so the weighting must happen before it."
    },

    { t: "code", lang: "python", title: "Query cost: 1,000 queries against 50,000 stored rows, k = 5 (executed)",
      hl: [2, 4, 7],
      code: `#   d      brute        kd_tree       ball_tree
#    3     115.6 ms        8.8 ms       166.1 ms     <- the tree prunes 90 % of the search
#   10     227.2 ms      922.7 ms     2,398.7 ms     <- already slower than brute force
#   50     152.8 ms   11,154.9 ms     9,304.3 ms     <- 70× slower: in high dimension every branch must be visited
# brute force is a matrix multiplication and barely cares about d; the trees care about nothing else.
# scikit-learn's algorithm="auto" picks by d and n; above ~20 dimensions with millions of rows the answer is an approximate index (FAISS, HNSW).`,
      caption: "The lazy learner's bill comes due at prediction: every query touches the whole training set unless an index prunes it, and indexes only prune in low dimension. For a batch scoring job, brute force on a GPU is fine; for a request path with a latency budget and a growing table, KNN in raw form is rarely deployed — an approximate index, a reduced representation, or a different model takes its place."
    },

    { t: "code", lang: "python", title: "Imbalance and the shape of a KNN probability (executed, churn, 15.4 % positive)",
      code: `#                        recall at 0.5    recall at 0.2    precision at 0.2    distinct probability values
#   k = 51, uniform          0.023            0.519             0.321                  29         <- votes are j/51: coarse steps
#   k = 51, distance         0.060            0.504             0.307                 841
#   k =  5, uniform          0.143            0.647             0.222                   6         <- 0, 0.2, 0.4, ..., 1
# with 15 % positives, a 51-neighbourhood almost never has a majority of them: the 0.5 threshold is the wrong one (2.3), not the model`,
      caption: "A KNN probability is a vote share, so it comes in steps of 1/k and a minority class rarely wins a majority. Move the threshold (recall 0.023 → 0.519 at 0.2), weight by distance for a finer scale, or re-weight the classes — the same repertoire as 8.2 — but do not read a KNN vote as a calibrated probability without checking (2.5)."
    },

    { t: "table",
      head: ["Use KNN when", "Avoid KNN when"],
      rows: [
        ["Few, meaningful, comparable features after scaling (≲ 15–20)", "Dozens of features, many irrelevant, or sparse high-dimensional data (text, one-hots) — unless reduced or selected first"],
        ["The boundary is local and curved, or the surface bends (spend: 8.81 vs linear 20.94)", "The truth is near-linear (churn: 0.754 vs logistic 0.757 at k = 401, with 400× the query cost)"],
        ["A quick, assumption-free baseline; a similarity lookup; imputation (3.3); anomaly scores (9.4)", "A latency budget and a large or growing table — every query scans the store"],
        ["Multi-class with no extra work; regression by averaging", "Interpretability is required: there are no coefficients, only neighbours"],
        ["New rows must count immediately (no retraining)", "Class imbalance without threshold tuning or weighting"]
      ]
    },

    { t: "ladder",
      title: "A 'similar products' feature from 40 numeric attributes for a 2-million-item catalogue",
      rungs: [
        { level: "bad", label: "Raw KNN on the attributes", code: `KNeighborsClassifier(5).fit(attrs, category)          # unscaled, 40 dims, brute force at query time`,
          note: "**Price dominates the distance, 40 dimensions blur the neighbourhood, and every lookup scans two million rows.** Three of this lesson's failures in one line." },
        { level: "ok", label: "Scaled, selected, indexed", code: `make_pipeline(StandardScaler(), SelectKBest(k=12), KNeighborsClassifier(15, weights="distance", algorithm="kd_tree"))`,
          note: "**Scale, keep the twelve attributes that predict category, index them.** Sound in a batch; a KD-tree in 12 dimensions on 2 M rows is still slow per query." },
        { level: "best", label: "A learned low-dimensional representation and an approximate index", code: `# embed each item (PCA to 8 dims, or a learned embedding), then an HNSW/FAISS index; refresh the index on a schedule
index = faiss.IndexHNSWFlat(8, 32); index.add(Z); index.search(z_query, k=15)`,
          note: "**Sub-millisecond approximate neighbours in a space where distance means similarity**, and a scaled feature that adds items without retraining — the modern form of KNN (11.4)." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "Votes by hand, then a curse you must cure correctly",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** For the six points, take the query (5, 5). Compute the Euclidean and Manhattan distances to all six, give the k = 3 decision under each metric, and the distance-weighted k = 3 decision under Euclidean. Then find, by search or argument, an integer query where the 1-NN label differs between the two metrics. **(b)** On the spend target with tenure, fee and discount, fit distance-weighted KNN at k = 1, 3, 10, 50 and report training MAE alongside 5-fold MAE; explain the training column. **(c)** Rebuild the curse table for d = 50 and 200 with three remedies in the pipeline — PCA(5), SelectKBest(5), SelectKBest(10) — and explain from the mechanism why one of them fails." }
      ],
      requirements: [
        "(a) both distance tables, three decisions, and the disagreement query.",
        "(b) train and CV MAE at four values of k, with the explanation.",
        "(c) the remedy table and the mechanism."
      ],
      hint: "(a) Ties in Manhattan distance are common on integer grids — say how you break them. (b) With weights='distance' the query's own row is at distance 0. (c) After StandardScaler every column has variance 1: what does PCA maximise?",
      solution: {
        lang: "python",
        title: "knn_practice.py (executed)",
        code: `# (a) query (5, 5)
#   point   label   euclidean   manhattan
#   P4      blue      1.414        2
#   P2      red       2.236        3
#   P6      blue      2.828        4
#   P3      red       3.000        3          <- ties P2 under Manhattan
#   P5      blue      3.606        5
#   P1      red       5.657        8
#   euclidean k=3: P4 B, P2 R, P6 B -> BLUE            manhattan k=3: P4 B, P2 R, P3 R -> RED       (the metric flips the vote)
#   distance-weighted euclidean k=3: blue 1/1.414 + 1/2.828 = 1.061, red 1/2.236 = 0.447 -> BLUE
#   disagreement on 1-NN: query (2, 9): euclidean nearest is P4 (blue), manhattan nearest is P2 (red)

# (b) spend, weights="distance", 5-fold
#   k      train MAE    CV MAE
#    1        0.18        9.98
#    3        0.18        8.68
#   10        0.18        8.74
#   50        0.18       11.01
#   training MAE is 0.18 at every k because the query is its own nearest neighbour at distance 0, whose weight 1/0 is infinite:
#   the row predicts itself. The 0.18 that remains comes from duplicated feature rows with different targets. Only the CV column exists.

# (c) d = 50 and 200, k = 15, 5-fold AUC
#   remedy                 d = 50     d = 200
#   none                   0.681      0.596
#   PCA(5)                 0.673      0.549       <- fails: after standardising, every column has variance 1, so the top components are
#                                                    random directions; PCA maximises variance and the label never enters (7.4)
#   SelectKBest(5)         0.888      0.860       <- works: the F-test uses the label and finds 3 of the 5 informative columns
#   SelectKBest(10)        0.840      0.828       <- a few noise columns let back in, and the distance degrades in proportion`,
        notes: [
          { t: "p", text: "**(a)**: the same query, two defensible metrics, two answers. When the metric is a free choice the decision near the boundary is not a finding." },
          { t: "p", text: "**(b)** generalises: any model that can reproduce its training set exactly (k = 1, distance weighting, an unpruned tree, an interpolating polynomial) has a training error of zero that says nothing. Validate out of sample or not at all." },
          { t: "p", text: "**(c)** is the difference between *unsupervised* and *supervised* dimensionality reduction. PCA preserves what varies; selection preserves what predicts. For KNN, which cannot weight features itself, the second is the one that matters." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Unscaled KNN on the churn features scored AUC 0.663; standardised, 0.691. What was the unscaled model doing?",
          options: [
            "Overfitting",
            "Choosing neighbours almost entirely by tenure (sd 17.5) and logins (sd 5.0), because Euclidean distance is dominated by the columns with the largest spread; tickets (sd 0.9), the strongest churn signal, contributed almost nothing to the distance — the model was 'customers with similar tenure', not 'similar customers'",
            "Using the wrong k",
            "Failing to converge"
          ],
          answer: 1,
          why: "The nearest-neighbour differences per feature (tenure 0.83, discount 0.00) show which columns the distance was actually matching on."
        }
      ]
    }
  ],

  takeaways: [
    "**KNN has no training and no parameters: the metric is the model.** Euclidean for comparable continuous features, Manhattan for robustness, cosine for direction, Mahalanobis for correlated features.",
    "**The vote by hand**: k = 3 at (4, 4) → red 2–1; distance-weighted 1.45 vs 0.35. At (5, 5) Euclidean says blue and Manhattan says red.",
    "**Scale, always, inside the pipeline**: unscaled distance was 'similar tenure' (AUC 0.663 vs 0.691).",
    "**k is the bias–variance dial**: train AUC 1.000 / CV 0.575 at k = 1; on a near-linear truth AUC rose to k = 401 (0.754) and still trailed logistic regression (0.757).",
    "**KNN wins where the surface bends**: spend MAE 8.81 at k = 3 against linear 20.94 — and loses to knowing the formula (6.34).",
    "**Distance-weighted training error is meaningless** (0.18 at every k: the row predicts itself).",
    "**The curse in numbers**: AUC 0.950 → 0.596 as 195 noise columns are added; (dmax − dmin)/dmin 13.9 → 0.32; 99.997 % of a 100-cube is within 0.1 of its surface.",
    "**PCA does not cure the curse for KNN; supervised selection does** (0.673 vs 0.888 at d = 50). PCA finds variance, not relevance.",
    "**Trees prune only in low dimension**: 8.8 ms at d = 3, 11 s at d = 50 for 1,000 queries on 50,000 rows; use approximate indexes at scale.",
    "**A KNN probability is a vote share in steps of 1/k**; tune the threshold for imbalance and check calibration before trusting it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "How does k control bias and variance in KNN, and how do you choose it?",
        options: [
          "Larger k always improves accuracy",
          "Small k follows individual points — low bias, high variance (train AUC 1.000, CV 0.575 at k = 1); large k averages over a wide neighbourhood — smooth, high bias, low variance. Choose it by cross-validation on the metric you care about; odd for binary voting; the sweep's shape also tells you whether the truth is local or smooth",
          "k = √n is always optimal",
          "k should equal the number of classes"
        ],
        answer: 1,
        why: "On the churn target the CV log-loss bottomed at k = 101 and AUC was still rising at 401 — the sweep said 'this is a smooth problem, use a smooth model'."
      },
      {
        stem: "Why does KNN degrade so much faster than logistic regression when noise features are added?",
        options: [
          "Logistic regression ignores noise by design",
          "KNN has no feature weighting: every column enters the distance with equal weight after scaling, so 195 noise columns make the distance 97 % noise and the neighbours nearly random (AUC 0.95 → 0.60). Logistic regression can estimate a coefficient near zero for each noise column and lose only a little variance (0.86 → 0.79)",
          "KNN is not scaled",
          "The trees stop working"
        ],
        answer: 1,
        why: "The nearest-to-farthest ratio fell from 13.9 to 0.32: 'nearest' had stopped meaning anything."
      },
      {
        stem: "Would you put PCA before KNN to fight the curse of dimensionality?",
        options: [
          "Yes; it reduces the dimension",
          "Not as a cure for irrelevant features: PCA keeps the directions of largest variance, and after standardisation noise columns have the same variance as informative ones, so it keeps random directions (0.673 at d = 50, worse than nothing at d = 10). Use supervised selection (0.888), or PCA only when the informative signal genuinely lives in the high-variance directions (correlated measurements, images)",
          "Yes; PCA is always safe",
          "No; PCA only works for regression"
        ],
        answer: 1,
        why: "Unsupervised reduction preserves what varies; supervised selection preserves what predicts. KNN needs the second."
      },
      {
        stem: "When does a KD-tree help and when does it hurt?",
        options: [
          "It always helps",
          "It prunes the search in low dimension — 8.8 ms against 115.6 ms brute force at d = 3 — but above roughly 15–20 dimensions it must visit almost every branch and is slower than the matrix multiplication it replaces: 11.2 s against 0.15 s at d = 50. At scale in high dimension use an approximate index",
          "It helps only for regression",
          "It hurts whenever n is large"
        ],
        answer: 1,
        why: "Brute force is a BLAS call that barely cares about d; trees care about nothing else."
      },
      {
        stem: "When is KNN the right choice?",
        options: [
          "Whenever the data are numeric",
          "Few, scaled, meaningful features; a local or curved boundary or a bending surface (spend 8.81 vs linear 20.94); a fast assumption-free baseline, a similarity lookup, or imputation; and a query load or table size the index can handle. Not for near-linear problems, high-dimensional or sparse data, tight latency, or when coefficients are required",
          "Only for classification",
          "Only when n is small"
        ],
        answer: 1,
        why: "The churn sweep ended within 0.003 of logistic regression at 400× the query cost — the honest answer there was 'use the linear model'."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain KNN and how you would choose k and the distance metric.",
        strong: "KNN stores the training rows and, for a query, finds the k closest under some metric and takes the majority label or the average target, optionally weighting each neighbour by 1/distance. There is no training and no parameters; the metric is the entire model, so I choose it from the geometry of the problem: Euclidean for comparable continuous features, Manhattan for robustness to a single large difference, cosine when only direction matters as with text or embeddings, Mahalanobis when features are correlated. Whatever the metric, I standardise inside a pipeline, because unscaled distance is dominated by the widest column — on the churn data an unscaled model was effectively 'customers with similar tenure'. k is the bias–variance dial: at k = 1 the training AUC was 1.000 and the cross-validated 0.575, and raising k smoothed the boundary until at k = 401 it approximated logistic regression. I choose it by cross-validation on the metric I care about, odd for binary voting, and I read the shape of the sweep — if the score keeps rising with k the problem is smooth and a parametric model will do it better and cheaper.",
        answer: [
          { t: "p", text: "Mechanism, metric as model, scaling, the k sweep with its numbers, and the diagnostic reading of the sweep." }
        ]
      },
      {
        level: "core",
        q: "What is the curse of dimensionality and how does it affect KNN?",
        strong: "In high dimension distances stop discriminating. For 500 random points the ratio of the nearest-to-farthest gap over the nearest distance was 13.9 in five dimensions and 0.32 in two hundred — every point is about equally far from every other — and almost all of a cube's volume is within a thin shell of its surface, 99.997 % at d = 100. KNN relies on the nearest points being meaningfully near, so it breaks first: with five informative features it scored AUC 0.950, and adding 195 pure-noise columns took it to 0.596 while logistic regression only fell from 0.86 to 0.79, because it can weight the noise columns to zero and KNN cannot weight anything. The cures are to reduce the dimension to the relevant features before KNN — supervised selection took d = 50 back to 0.888 — or to use a model with its own feature weighting. And PCA is not a cure for this: it keeps high-variance directions, which after standardisation are random, and scored worse than nothing.",
        answer: [
          { t: "p", text: "The two geometric facts with numbers, the KNN-specific mechanism, the executed comparison, and the PCA trap." }
        ]
      },
      {
        level: "advanced",
        q: "You need nearest-neighbour lookups on 10 million 128-dimensional embeddings at 5 ms per query. What do you do?",
        strong: "Not exact KNN. Brute force is 10 million dot products per query and a KD-tree is worse than brute force at 128 dimensions — on 50,000 rows a KD-tree took 8.8 ms in three dimensions and eleven seconds in fifty. So I use an approximate index: HNSW or an IVF/product-quantisation index in FAISS, which give sublinear queries by searching a graph or a set of coarse cells and accept a small recall loss, typically a few per cent at the target latency, which I measure against exact results on a sample. Before indexing I make sure the metric matches the embedding — cosine, so I normalise the vectors and use inner product — and I consider reducing to 32–64 dimensions with PCA, which is appropriate here because embedding variance is informative, unlike the noise-column case. Operationally the index is rebuilt or incrementally updated on a schedule, the recall-versus-latency trade is a tuned parameter (ef_search, nprobe), and the whole thing is a similarity service, not a classifier: what it returns is neighbours, and the ranking on top of them is a separate model.",
        answer: [
          { t: "p", text: "Why exact fails with numbers, the ANN choice and its trade-off, the metric and reduction decisions, and the operational shape." }
        ]
      }
    ]
  }
});
