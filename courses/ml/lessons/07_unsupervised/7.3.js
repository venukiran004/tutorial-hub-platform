/* ============================================================================
   LESSON 7.3 — Evaluating and Using Clusters
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "**A clustering has no test set, so evaluating one means asking three different questions and knowing which you are asking: is the partition compact and separated (internal indices), does it match labels you happen to have (external indices), and would it come out the same on a different sample (stability)?** This lesson computes each by hand and checks it against scikit-learn — silhouette 0.8065, Davies–Bouldin 0.1905, Calinski–Harabasz 73.5 on six points; ARI 0.125 and NMI 0.189 from a 2 × 2 contingency table — and then shows each one misleading: the internal indices prefer k-means's wrong cut of the moons (silhouette 0.487) to the true moons (0.328); NMI gives 0.50 to a 'clustering' with one row per cluster; stability rates k = 3 above the true k = 4 on four blobs. It closes with the two places clustering is done on a non-Euclidean distance — documents, where a cluster turned out to be an e-mail signature, and time series, where dynamic time warping took the ARI from 0.58 to 1.00 — and with the disappointing, instructive result of feeding cluster labels to a supervised model.",

  objectives: [
    "Compute silhouette, Davies–Bouldin and Calinski–Harabasz by hand and state what each rewards and what it cannot see",
    "Compute ARI and NMI from a contingency table, explain chance correction, and know the degenerate cases",
    "Run a stability check across resamples and interpret it as necessary, not sufficient",
    "Cluster documents with cosine distance and time series with DTW, use clusters as features, and know when that helps"
  ],

  prerequisites: ["7.1", "7.2", "2.6"],

  blocks: [

    { t: "h2", n: "01", text: "Internal indices: compactness and separation, from the data alone", id: "internal" },

    { t: "code", lang: "text", title: "Three indices computed by hand on {1, 2, 3} | {8, 9, 10} (executed; every value matches scikit-learn)",
      code: `SILHOUETTE   s(i) = (b(i) - a(i)) / max(a(i), b(i))       a = mean distance to own cluster,  b = mean distance to the nearest other cluster
   x = 1:  a = mean(1, 2) = 1.5      b = mean(7, 8, 9) = 8       s = 6.5/8 = 0.8125
   x = 2:  a = 1                     b = 7                       s = 0.8571
   x = 3:  a = 1.5                   b = 6                       s = 0.7500        (the inner edge of a cluster scores lowest)
   by symmetry 8, 9, 10 -> 0.75, 0.8571, 0.8125;   mean silhouette 0.8065
   reading: > 0.7 strong, 0.5-0.7 reasonable, 0.25-0.5 weak, < 0.25 none, < 0 for a point: probably the wrong cluster

DAVIES-BOULDIN   DB = (1/k) Σᵢ maxⱼ≠ᵢ (sᵢ + sⱼ) / d(cᵢ, cⱼ)      sᵢ = mean distance of cluster i's points to its centroid;  d = centroid distance
   centroids 2 and 9;  s₁ = mean(1, 0, 1) = 0.667 = s₂;  d = 7;   each cluster's worst ratio = (0.667 + 0.667)/7 = 0.1905;   DB = 0.1905    (lower is better; 0 is perfect)

CALINSKI-HARABASZ   CH = [B / (k - 1)] / [W / (n - k)]      B = Σ nᵢ ‖cᵢ - c̄‖² (between),  W = Σ Σ ‖x - cᵢ‖² (within)
   grand mean 5.5;  B = 3(2 - 5.5)² + 3(9 - 5.5)² = 73.5;   W = 2 + 2 = 4;   CH = (73.5/1) / (4/4) = 73.5    (higher is better; an F-statistic)`,
      caption: "All three are built from distances to centroids or to cluster-mates, so all three reward the same thing: round, tight, well-separated groups. That is also what k-means produces, which makes these indices partly a measure of how k-means-like the partition is. The silhouette is the one to keep close because it is per row — a histogram of s(i) by cluster shows which clusters are real and which rows are on a boundary."
    },

    { t: "code", lang: "python", title: "The bias, measured: the two moons under three labellings (executed)",
      hl: [2, 3],
      code: `#   labelling            silhouette    Davies–Bouldin    Calinski–Harabasz    ARI vs the true moons
#   the TRUE moon labels     0.328           1.159              392.2               1.000
#   k-means (k = 2)          0.487           0.781              883.0               0.245      <- every internal index prefers the wrong answer
#   DBSCAN (eps 0.18)        0.328           1.159              392.2               1.000`,
      caption: "A crescent has a large diameter and a near neighbour that wraps around it, so its own silhouette is mediocre; a straight cut through both crescents makes two compact half-discs that score well. Internal indices measure geometry, not truth, and they measure a particular geometry. Use them to compare partitions of the *same kind* — k against k for k-means — and never to argue that a convex partition beats a density one."
    },

    { t: "dl", items: [
      ["Silhouette", "Per-row (b − a)/max(a, b); averaged for a score. O(n²) — subsample above ~10⁴ rows. Works with any distance."],
      ["Davies–Bouldin", "Mean over clusters of the worst within-to-between ratio. Centroid-based, cheap, lower is better."],
      ["Calinski–Harabasz", "Between-over-within variance ratio with degrees of freedom. Cheap, higher is better, likes small k on continua."],
      ["Rand index", "Share of row pairs on which two labellings agree (same/same or different/different). 0.50 for random labels — hence the adjustment."],
      ["ARI", "Rand corrected for chance: (index − expected)/(max − expected). 0 for random, 1 for identical, negative for worse than random. Invariant to relabelling."],
      ["NMI / AMI", "Mutual information between labellings, normalised by their entropies; AMI additionally corrects for chance. NMI rewards over-splitting (0.50 for one row per cluster); AMI does not."],
      ["Homogeneity / completeness / V", "Each cluster contains one class / each class is in one cluster / their harmonic mean. One-row clusters: homogeneity 1.0, completeness 0.33."],
      ["Stability", "Agreement (ARI) between clusterings fitted on disjoint halves, one applied to the other's rows. Necessary for a real structure; not sufficient."]
    ]},

    { t: "h2", n: "02", text: "External indices: agreement with labels, corrected for chance", id: "external" },

    { t: "code", lang: "text", title: "ARI and NMI from a contingency table, by hand (executed)",
      code: `truth  A A A A B B B B        clustering  1 1 1 2 2 2 2 1          contingency:        cluster 1   cluster 2
                                                                        class A           3           1
                                                                        class B           1           3

ARI  counts PAIRS of rows.  index = Σᵢⱼ C(nᵢⱼ, 2) = C(3,2) + C(1,2) + C(1,2) + C(3,2) = 3 + 0 + 0 + 3 = 6         (pairs together in both)
     row sums: Σ C(aᵢ, 2) = 2 × C(4,2) = 12;   column sums: Σ C(bⱼ, 2) = 12;   total pairs C(8,2) = 28
     expected index under random labelling = 12 × 12 / 28 = 5.143;   max index = (12 + 12)/2 = 12
     ARI = (6 - 5.143) / (12 - 5.143) = 0.125                       unadjusted Rand = 0.571 (random labellings average 0.50)

NMI  H(truth) = -2 × 0.5 ln 0.5 = 0.693;  H(clusters) = 0.693
     MI = Σᵢⱼ pᵢⱼ ln( pᵢⱼ / (pᵢ pⱼ) ) = 2 × (3/8) ln((3/8)/(1/4)) + 2 × (1/8) ln((1/8)/(1/4)) = 0.304 - 0.173 = 0.131
     NMI = MI / mean(H) = 0.131 / 0.693 = 0.189            AMI (chance-corrected) = 0.084
     homogeneity 0.189, completeness 0.189, V 0.189, Fowlkes-Mallows 0.500

sanity checks (executed):  relabel the clusters 1<->2: ARI 0.125 (labels are nominal)     2,000 random labellings: mean ARI 0.004, mean Rand 0.502
                           one cluster per row (8 clusters): ARI 0.000   NMI 0.500   homogeneity 1.000   completeness 0.333`,
      caption: "Two rows swapped out of eight is a weak clustering, and ARI says so (0.125) where the raw Rand index (0.57) and NMI (0.19) look better than they are. The last line is the trap: NMI, homogeneity and V-measure all reward splitting into tiny clusters — a clustering that puts every row in its own cluster is perfectly homogeneous — so when you compare clusterings with *different numbers of clusters*, use ARI or AMI, which are corrected for chance."
    },

    { t: "code", lang: "python", title: "Stability: cluster two disjoint halves, apply one model to the other half, measure ARI (executed, 20 repeats)",
      hl: [2, 4, 9, 10],
      code: `# churn customers, five standardised numerics
#   k = 2   0.593 ± 0.124        k = 3   0.721 ± 0.211        k = 4   0.567 ± 0.192        k = 5   0.794 ± 0.085        k = 6   0.579 ± 0.094
#   nothing above 0.8; wide spreads; k = 5 the 'most stable' with a silhouette of 0.24 (7.1) -- a stable partition of a continuum is still a partition of a continuum

# four clean blobs (true k = 4)
#   k = 2   0.873 ± 0.113        k = 3   0.971 ± 0.031        k = 4   0.922 ± 0.028        k = 5   0.708 ± 0.063        k = 6   0.596 ± 0.058
#   k = 3 is MORE stable than the true k = 4: merging the two nearest blobs is a reproducible mistake
#   k = 5 and 6 fall off: splitting a blob is done differently on every half`,
      caption: "Stability answers 'would I get this again?', which is the question a stakeholder is really asking when they ask whether the segments are real. It catches over-splitting reliably (the drop from k = 4 to 5). It does not catch under-splitting — a coarse merge can be perfectly repeatable — and it does not distinguish real groups from reproducible cuts through a continuum. Read it with the silhouette: high stability *and* a silhouette above 0.5 is structure; high stability alone is a stable convention."
    },

    { t: "h2", n: "03", text: "Clustering on the right distance: documents and time series", id: "distances" },

    { t: "code", lang: "python", title: "Documents: four newsgroups, 2,351 posts, tf-idf with 11,339 terms (executed)",
      hl: [2, 3, 4, 5, 8, 9, 10, 11],
      code: `#   representation                                                            ARI      NMI
#   tf-idf rows L2-normalised, k-means (Euclidean on unit vectors = cosine)      0.286    0.495
#   LSA (truncated SVD) to 100 dims, rows renormalised, k-means                  0.358    0.541     <- denser, less noisy space
#   LSA 100 dims WITHOUT renormalising                                           0.258             <- Euclidean on lengths: long posts cluster with long posts
#   agglomerative, cosine, average linkage (67 empty posts dropped)             -0.000             <- one giant cluster and crumbs: average linkage on text chains

# what k-means actually found (top terms per cluster, majority true class, size):
#   cluster 3:  game, team, hockey, play, games, season               rec.sport.hockey        443 docs     <- a topic
#   cluster 1:  israel, israeli, jews, people, armenians, arab       talk.politics.mideast   346 docs     <- a topic
#   cluster 2:  space, just, like, know, don, think                  sci.space             1,491 docs     <- the junk drawer: everything not distinctive
#   cluster 0:  cadre, dsl, n3jxp, chastity, shameful, surrender     sci.med                  71 docs     <- one poster's e-mail SIGNATURE, repeated in 71 posts`,
      caption: "Text clustering lives or dies by the representation. Cosine similarity — or Euclidean distance between unit vectors, which is the same ordering — is mandatory because document length is not topic; LSA denoises; and the result must be *read*: two of the four clusters are topics, one is a catch-all, and one is a signature block that tf-idf treated as the most distinctive vocabulary in the corpus. A 0.36 ARI with those four clusters is a more honest report than the number alone."
    },

    { t: "code", lang: "python", title: "Time series: 60 noisy series of three shapes (bump, step, wave), each randomly shifted in time (executed)",
      hl: [2, 3, 5],
      code: `#   distance                       average-linkage, 3 clusters    ARI
#   Euclidean (point by point)                                     0.579     <- a shifted bump is far from an unshifted bump
#   DTW, Sakoe-Chiba window 10                                     1.000     <- the warping path aligns the bumps before comparing
#   two shifted bumps:  Euclidean 2.34,  DTW 0.49          bump vs step:  Euclidean 4.96,  DTW 4.45`,
      caption: "Dynamic time warping finds the cheapest monotone alignment between two series, so shape is compared with timing allowed to flex; the window bounds how far it may flex and keeps the cost O(n·w). It is the distance for series whose shapes matter more than their exact timing — sensor cycles, gestures, load curves — and it plugs into any distance-based clustering via a precomputed matrix. Its cost is quadratic in series length without the window, and it is not a metric (no triangle inequality), which rules out some index structures."
    },

    { t: "h2", n: "04", text: "Using clusters", id: "using" },

    { t: "code", lang: "python", title: "Cluster labels as features for the churn model (executed, 5-fold, clustering refitted inside each fold)",
      code: `# logistic regression on the 12 original columns                                   AUC 0.7616
# + three segment indicators + three distances to the k-means centroids            AUC 0.7596     <- nothing; the segments are a function of columns the model already has`,
      caption: "A cluster label derived from the same features carries no new information for a model that sees those features — it is at best a coarse non-linear transform, and a tree ensemble would find a better one itself. Cluster features earn their place when the clustering used data the model does not: behaviour sequences, text, images, or a different table joined by key. Fit the clustering inside the cross-validation folds anyway; it is unsupervised, but a clustering fitted on the test rows still leaks their distribution."
    },

    { t: "table",
      head: ["Question", "Tool", "Reads as", "Blind to"],
      rows: [
        ["Is the partition compact and separated?", "Silhouette (per row and mean), Davies–Bouldin, Calinski–Harabasz", "Geometry of the partition", "Non-convex truth (moons: k-means 0.487 > truth 0.328)"],
        ["Does it match known labels?", "ARI (pairs), AMI (information); homogeneity/completeness for the direction of error", "Agreement corrected for chance", "Whether the labels are the structure you wanted"],
        ["Would it come out again?", "Stability ARI across disjoint halves", "Reproducibility", "Reproducible mistakes (k = 3 on four blobs: 0.971)"],
        ["Is there structure at all?", "Gap statistic (7.1), silhouette level, stability together", "Continuum vs groups", "Structure at a scale the method cannot see"],
        ["Are the clusters meaningful?", "Profiles on held-out variables; top terms; a human reading", "Usefulness", "Everything the numbers cannot say (the signature cluster)"]
      ]
    },

    { t: "ladder",
      title: "Reporting a customer clustering to a leadership team",
      rungs: [
        { level: "bad", label: "'We found five segments (silhouette 0.24).'", code: `KMeans(5).fit(Z); silhouette_score(Z, labels)   # 0.24, reported as a success`,
          note: "**A weak-structure silhouette presented as validation**, no stability, no profile, and five names for five cuts through a continuum." },
        { level: "ok", label: "Silhouette by cluster, stability, profiles", code: `silhouette_samples(Z, labels) grouped by cluster; stability ARI over 20 half-splits; profile table on features NOT used for clustering (churn rate, revenue, tenure band)`,
          note: "**The evidence is there** — and it will say the segments are weak, which is the honest outcome most of the time." },
        { level: "best", label: "State the strength of the structure first, then the partition's use", code: `# 'The data form a continuum (silhouette 0.29, gap rising, stability 0.72 ± 0.21). We partition it along discount status and plan tier
#  because those axes separate churn (4 % vs 18 %) and are actionable. The partition is a policy, not a discovery; it will be refitted quarterly
#  and its drift tracked by the share of customers changing segment.'`,
          note: "**A true claim that a leadership team can act on**, with the numbers that justify it and the process that keeps it honest." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Indices by hand, a degenerate case, and a stability run",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For the points {1, 2, 3, 8, 9, 10} clustered as {1, 2} | {3, 8, 9, 10} (a deliberately bad partition), compute the silhouette of x = 3 and of x = 8, the Davies–Bouldin index and Calinski–Harabasz by hand, and compare each with the good partition's values (0.8065 mean silhouette, 0.1905, 73.5). **(b)** For truth [A, A, A, A, B, B, B, B] and the clustering [1, 1, 2, 2, 3, 3, 4, 4], build the contingency table and compute ARI and homogeneity by hand; explain why homogeneity is 1.0 and ARI is not. **(c)** Run the stability check on the two-moons data for k-means k = 2 and for DBSCAN (eps 0.18, applying a nearest-core-point rule to assign the second half), and explain why a method can be stable and wrong." }
      ],
      requirements: [
        "(a) two silhouettes, DB, CH, and the comparison.",
        "(b) the table, ARI, homogeneity and the explanation.",
        "(c) two stability numbers and the reasoning."
      ],
      hint: "(a) For x = 3, a is its mean distance to {8, 9, 10} (its own cluster now) and b to {1, 2}. (b) With four clusters of two rows each, every within-cluster pair is same-class; count Σ C(nᵢⱼ, 2). (c) k-means's cut of the moons is reproducible.",
      solution: {
        lang: "python",
        title: "cluster_evaluation_practice.py",
        code: `# (a) partition {1, 2} | {3, 8, 9, 10}
#   x = 3:  a = mean(5, 6, 7) = 6;      b = mean(2, 1) = 1.5;    s = (1.5 - 6)/6 = -0.75     <- negative: 3 is in the wrong cluster
#   x = 8:  a = mean(5, 1, 2) = 2.667;  b = mean(7, 6) = 6.5;    s = (6.5 - 2.667)/6.5 = 0.590
#   centroids 1.5 and 7.5;  s₁ = 0.5;  s₂ = mean(4.5, 0.5, 1.5, 2.5) = 2.25;  d = 6;  DB = (0.5 + 2.25)/6 = 0.458   (good partition: 0.1905)
#   grand mean 5.5;  B = 2(1.5 - 5.5)² + 4(7.5 - 5.5)² = 32 + 16 = 48;  W = 0.5 + (20.25 + 0.25 + 2.25 + 6.25) = 29.5;  CH = 48 / (29.5/4) = 6.51   (good: 73.5)
#   all three indices agree the partition is worse, and the silhouette of x = 3 (-0.75) says exactly which row is misplaced.

# (b) contingency: A -> clusters 1 (2 rows), 2 (2 rows);  B -> clusters 3 (2), 4 (2)
#   index = Σ C(nᵢⱼ, 2) = 4 × C(2,2) = 4;  Σ C(aᵢ, 2) = 2 × C(4,2) = 12;  Σ C(bⱼ, 2) = 4 × C(2,2) = 4;  expected = 12 × 4 / 28 = 1.714;  max = (12 + 4)/2 = 8
#   ARI = (4 - 1.714)/(8 - 1.714) = 0.364
#   homogeneity = 1 - H(class | cluster)/H(class) = 1 - 0/0.693 = 1.0: every cluster is pure. But completeness = 1 - H(cluster | class)/H(cluster) = 1 - 0.693/1.386 = 0.5:
#   each class is split across two clusters. ARI penalises the split because the A-A pairs that land in different clusters (4 of 6 per class) count as disagreements.
#   homogeneity alone rewards over-splitting all the way to one row per cluster (1.0 with ARI 0.0 in the lesson).

# (c) executed, 20 half-splits of the moons:
#   k-means k=2:  stability ARI 0.928 ± 0.040     while its agreement with the TRUE moons is 0.245   <- stable and wrong
#   DBSCAN eps 0.18 (second half assigned to the nearest core point): stability 0.972 ± 0.074, and right
#   stability measures the reproducibility of a method's answer, not the answer's correctness: a method with a strong bias (k-means: convex
#   cuts) reproduces its bias on every sample. Stability is necessary, not sufficient.`,
        notes: [
          { t: "p", text: "**(a)** shows the indices doing their job — and the per-row silhouette doing the better job, by naming the misplaced row." },
          { t: "p", text: "**(b)** is the case that separates pair-based from information-based indices: purity is cheap, agreement on pairs is not." },
          { t: "p", text: "**(c)** is the reason every check in this lesson is read alongside the others." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "K-means's cut of the moons scored silhouette 0.487 against 0.328 for the true moon labels. What does that tell you about the silhouette?",
          options: [
            "That k-means found a better clustering",
            "That the silhouette measures a specific geometry — tightness around a cluster's own members against distance to the nearest other cluster — which favours compact convex groups; a crescent is wide and wraps around its neighbour, so the true partition scores poorly and a straight cut scores well. Use internal indices to compare partitions of the same kind, and never to argue that a convex partition beats a density-based one",
            "That the moons need scaling",
            "That DBSCAN is unstable"
          ],
          answer: 1,
          why: "DBSCAN's correct answer scored exactly the truth's 0.328 — the index is consistent, and consistently blind to shape."
        }
      ]
    }
  ],

  takeaways: [
    "**Three questions, three tools**: compact and separated (internal indices), matches labels (external), comes out again (stability). None answers 'is it meaningful'.",
    "**By hand and matching scikit-learn**: silhouette 0.8065 (per row 0.75–0.86), Davies–Bouldin 0.1905, Calinski–Harabasz 73.5 on six points.",
    "**Internal indices reward convex geometry**: k-means's wrong cut of the moons beat the truth on all three (0.487 vs 0.328).",
    "**ARI counts pairs and corrects for chance** — 0.125 for a two-row swap where raw Rand said 0.57; random labellings average 0.004 (Rand 0.50).",
    "**NMI, homogeneity and V reward over-splitting** (one row per cluster: NMI 0.50, homogeneity 1.0); use ARI or AMI to compare different k.",
    "**Stability is necessary, not sufficient**: it catches over-splitting (four blobs: k = 5 → 0.71) and blesses reproducible mistakes (k = 3 → 0.971) and reproducible cuts of a continuum (churn k = 5: 0.79 at silhouette 0.24).",
    "**Documents need cosine and reading**: LSA + renormalised k-means ARI 0.358; two topics, a junk drawer, and an e-mail signature.",
    "**Time series need alignment**: DTW took the ARI from 0.579 to 1.000 by comparing shape with timing allowed to flex.",
    "**Cluster labels from the model's own features add nothing** (0.7616 → 0.7596); clusters help when they bring data the model does not have.",
    "**Report the strength of the structure before the partition** — silhouette level, gap, stability — then the partition's use."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is the Rand index adjusted, and what does ARI = 0 mean?",
        options: [
          "To make it range from 0 to 1",
          "The raw Rand index counts row pairs on which two labellings agree, and random labellings already agree on about half of all pairs (0.50 measured), so a mediocre clustering looks decent (0.57). ARI subtracts the expected agreement under random labelling and rescales so that 0 means 'no better than chance', 1 identical, negative worse than chance; it is also invariant to relabelling the clusters",
          "To penalise large k",
          "Because the Rand index is undefined for unequal cluster counts"
        ],
        answer: 1,
        why: "The two-row-swap example: Rand 0.571, ARI 0.125 — the adjustment is most of the story."
      },
      {
        stem: "A clustering with one row per cluster scores NMI 0.50 and homogeneity 1.0. What should you use to compare clusterings with different numbers of clusters?",
        options: [
          "NMI, since it is normalised",
          "ARI or AMI, which are corrected for chance and give ≈ 0 to the one-row-per-cluster case; NMI and homogeneity reward purity, which over-splitting buys for free, and V-measure inherits the bias. When comparing different k, read completeness alongside homogeneity, or just use ARI",
          "Homogeneity, since higher is better",
          "The silhouette"
        ],
        answer: 1,
        why: "Purity is the cheap half of agreement; pairs kept together are the expensive half."
      },
      {
        stem: "Stability rated k = 3 (0.971) above the true k = 4 (0.922) on four clean blobs. Is stability useless?",
        options: [
          "Yes; use the silhouette instead",
          "No — it is necessary, not sufficient. Merging the two nearest blobs is a mistake every half-sample makes the same way, so it is stable; splitting a blob (k = 5, 0.708) is done differently every time, so instability correctly flags over-splitting. Read stability with the silhouette and the gap: high stability plus strong separation is structure; high stability alone is a reproducible convention",
          "Yes; it depends on the random seed",
          "No; it should be computed on the full data"
        ],
        answer: 1,
        why: "On the churn continuum the 'most stable' k = 5 had a silhouette of 0.24 — stable cuts, not groups."
      },
      {
        stem: "Why must document clustering use cosine (or unit-normalised vectors), and what did the newsgroup clusters actually contain?",
        options: [
          "Because tf-idf values are negative",
          "Because Euclidean distance on raw counts or unnormalised LSA coordinates measures document length as much as topic — long posts cluster with long posts (ARI 0.258 unnormalised vs 0.358 renormalised). And the clusters must be read: two were topics (hockey, Middle East politics), one was a 1,491-document catch-all of generic words, and one was 71 posts sharing an e-mail signature that tf-idf ranked as the corpus's most distinctive vocabulary",
          "Because k-means cannot handle sparse matrices",
          "Because cosine is faster"
        ],
        answer: 1,
        why: "A cluster is whatever the representation makes similar; a signature block is very similar to itself."
      },
      {
        stem: "When do cluster labels help as features for a supervised model?",
        options: [
          "Always; they add non-linearity",
          "When the clustering used information the supervised model does not see — a different table, sequences, text, images. Derived from the model's own features they add nothing (churn AUC 0.7616 → 0.7596), because a tree or an interaction term recovers the same partition better. And fit the clustering inside the CV folds regardless: unsupervised fitting on test rows still leaks their distribution",
          "Only for tree models",
          "Never; clustering is unsupervised"
        ],
        answer: 1,
        why: "A segment id is a lossy transform of its inputs; new information is the only thing that helps."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you evaluate a clustering when there are no labels?",
        strong: "With internal indices, stability, and a reading of the clusters, in that order and never one alone. The internal indices — silhouette, Davies–Bouldin, Calinski–Harabasz — measure compactness against separation from the data itself; I compute the silhouette per row because its distribution by cluster shows which clusters are real and which rows are on a boundary, and I read its level: above 0.5 is structure, below 0.3 is a continuum. But these indices reward convex geometry: on the two moons, k-means's wrong straight cut scored 0.487 against 0.328 for the true crescents, so I use them to compare partitions of the same kind, not across methods. Stability asks whether I would get the same partition on another sample — cluster two disjoint halves, apply one model to the other half, measure ARI — and it catches over-splitting reliably while blessing reproducible mistakes, so I read it with the silhouette. If any labels or held-out variables exist, ARI and AMI give chance-corrected agreement. And I profile the clusters on variables that were not used to build them, because the numbers cannot tell me that one of my document clusters was an e-mail signature.",
        answer: [
          { t: "p", text: "Internal indices with their bias, stability with its limits, external indices when possible, and the human reading — with the executed examples." }
        ]
      },
      {
        level: "core",
        q: "Explain ARI and NMI and when each is appropriate.",
        strong: "Both compare a clustering to a reference labelling. The Rand index counts pairs of rows on which the two agree — together in both or apart in both — but random labellings already agree on half of all pairs, so the adjusted Rand index subtracts the expected agreement and rescales: 0 for chance, 1 for identical, negative for worse than chance. For eight rows with two swapped, the raw Rand was 0.57 and ARI 0.125, which is the honest number. NMI is the mutual information between the labellings divided by the mean of their entropies; it is 0 for independent labellings and 1 for identical ones, and it is not chance-corrected in the same way — a clustering with one row per cluster scores NMI 0.5 and homogeneity 1.0, because purity is free when clusters are tiny, while ARI gives it 0. So I use ARI or AMI, the chance-corrected mutual information, whenever I compare clusterings with different numbers of clusters, and I read homogeneity and completeness together to see which direction a clustering errs — over-splitting or over-merging. Both are invariant to relabelling, which matters because cluster ids are nominal.",
        answer: [
          { t: "p", text: "Pairs versus information, chance correction with numbers, the degenerate case, and the selection rule." }
        ]
      },
      {
        level: "advanced",
        q: "You cluster support tickets by text and one cluster looks perfect on every metric. What do you check before shipping it as a routing rule?",
        strong: "What is in it. On the newsgroups a cluster with sharp, distinctive top terms and high internal scores turned out to be 71 posts sharing one author's e-mail signature — tf-idf had made the signature the most distinctive vocabulary in the corpus, and cosine similarity had done exactly what it should with it. So first I read the top terms and a sample of documents, and I look for boilerplate: signatures, templates, auto-replies, quoted headers. Then I check the cluster on variables that were not in the text — queue, product, resolution time — because a routing rule is only useful if the cluster predicts something operational. I check the representation: cosine or unit-normalised vectors, so that ticket length is not what the cluster captured, and LSA or an embedding to denoise. I check stability across time slices, because ticket vocabulary drifts and a cluster that exists this month may be a campaign. And I would rather ship a supervised router trained on the historical queue labels, with the clustering used only to discover categories the labels are missing, than route on an unsupervised partition directly — the clustering proposes, the labels dispose.",
        answer: [
          { t: "p", text: "The signature example, boilerplate checks, held-out validation, representation, drift, and the supervised alternative." }
        ]
      }
    ]
  }
});
