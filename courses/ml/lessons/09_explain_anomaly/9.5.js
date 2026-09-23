/* ============================================================================
   LESSON 9.5 — Isolation Forest, One-Class SVM, Autoencoders and Fraud
   ========================================================================= */
EC.receiveLesson({
  id: "9.5",

  lede: "**The detectors in 9.4 ask how far a row is from the others; the detectors here ask how easy it is to separate, how well a boundary or a compression fitted to normal rows accommodates it, or how far into each feature's tail it sits.** The Isolation Forest's score is worked from its trees: normal rows in the correlated data average a path length of 11.7, the planted rows 4.7 to 5.7, and 2^(−E[h]/c(256)) reproduces scikit-learn to 0.004 — but the forest ranks the correlation-breaking rows 3rd, 8th, 12th and 15th where Mahalanobis ranked them 1st to 3rd, because its splits are axis-parallel, and an extended forest with random hyperplanes removes the artefact on a two-cluster probe. The default `contamination='auto'` flags 17.5 % of that dataset. A One-Class SVM's ν sets the flagged fraction to within a third of a percentage point and its γ decides whether the fourth planted row ranks 45th or 856th. An autoencoder on handwritten digits detects an unseen class with AUC 0.843 — behind LOF's 0.918, ahead of the Isolation Forest's 0.704 — and with no bottleneck it detects nothing (0.700), while the width that works best is 16, not 8 or 32. ECOD is derived from per-feature tails, which is why it finds the row extreme on both axes and not the ones that break the correlation. The lesson ends with a fraud system built on 30,000 synthetic card transactions: unsupervised triage at 97 % precision in the top 200, an analyst's 490 labels turning into a supervised model at 97.5 %, and a third fraud pattern that no model sees until the feature it needs is written — after which the unsupervised detector finds 193 of its 240 rows with no label for it at all.",

  objectives: [
    "Derive the Isolation Forest anomaly score from path length and the normaliser c(n), and explain the axis-parallel artefact that the extended forest removes",
    "Explain the roles of ν and γ in a One-Class SVM and set them from the data",
    "Use reconstruction error from an autoencoder or PCA as a novelty score and choose the bottleneck by validation",
    "Explain COPOD and ECOD as tail-probability detectors and state what they cannot see",
    "Set a threshold from review capacity, evaluate without labels, handle streaming drift, and design a fraud system that combines unsupervised triage with supervised learning on reviewed labels"
  ],

  prerequisites: ["9.4", "6.2", "11.6"],

  blocks: [

    { t: "h2", n: "01", text: "Isolation Forest: anomalies are few and different, so they are easy to isolate", id: "iforest" },

    { t: "p", text: "Liu, Ting and Zhou (2008) turned the definition around. Instead of modelling what normal looks like and measuring departure from it, grow a random tree: pick a feature at random, pick a split value uniformly between that feature's minimum and maximum in the current node, recurse. A row far from the others is separated from them in a few splits; a row in a dense region needs many. The **path length** h(x) is the number of splits from the root to the leaf that holds x; averaged over many trees, each grown on a random subsample of 256 rows, it is the score's raw material. Two details make it work. Trees are cut at depth ⌈log₂ 256⌉ = 8 — beyond that the remaining rows are normal by construction and further splits are wasted — and a leaf reached at the depth limit with n rows still inside is credited an extra c(n), the average path length of an unsuccessful search in a binary search tree of n items, as an estimate of how much deeper those rows would have gone." },

    { t: "code", lang: "python", title: "The score computed from the trees, checked against score_samples (executed on the 9.4 correlated data)",
      code: `def c(n):                                   # expected path length of an unsuccessful BST search of n items
    return 0.0 if n <= 1 else 2 * (np.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n
# c(2) 0.154   c(16) 4.696   c(256) 10.245   c(4096) 15.790

iso = IsolationForest(n_estimators=200, max_samples=256, random_state=0).fit(X)
# for each tree: depth of the leaf holding x, plus c(n_rows_in_leaf) for leaves cut at the depth limit; average over trees
# E[h]: normal rows 11.69 on average; planted rows 4.71, 5.70, 5.29, 5.07     (E[h] can exceed the depth limit of 8 because of the c(n) credit)
s = 2 ** (-E_h / c(256))                    # normal mean 0.457; planted 0.727, 0.680, 0.699, 0.709
# max |ours − (−iso.score_samples(X))| = 0.004    (sklearn's c(n) differs at n = 2)
# planted rows rank 3, 8, 12, 15 of 1,004 -- AUC 0.993, but Mahalanobis had them 1, 2, 3
# fit on 100,000 × 20 with 100 trees: 0.21 s -- every tree sees 256 rows, so the cost does not grow with n`,
      caption: "s = 2^(−E[h]/c(n)) maps path length onto (0, 1): a row isolated at depth c(n) — the average for a random point — scores exactly 0.5; a row isolated almost immediately approaches 1; a row buried deeper than average falls toward 0. scikit-learn's score_samples returns −s and its decision_function returns 0.5 − s (shifted by offset_)." },

    { t: "callout", kind: "trap", title: "contamination='auto' is not 'a sensible default'", body: [{ t: "p", text: "With `contamination='auto'` scikit-learn sets `offset_ = −0.5`, so every row with s > 0.5 — path length shorter than a random point's expectation — is a predicted anomaly. On the correlated data that is 176 of 1,004 rows, 17.5 %, for four planted anomalies. The score distribution's centre depends on the data's shape and dimension, not on how many anomalies it contains. Set `contamination` to the rate you expect, or better, ignore `predict` and threshold `score_samples` at the depth your reviewers can handle (§05); the ranking is identical for every value of contamination (Spearman 1.000 between 0.01 and 0.1 — same trees, different offset)." }] },

    { t: "p", text: "The forest's weakness is the shape of its cuts. Every split is on one feature, so the regions it carves are axis-aligned rectangles, and a point that is unusual only as a *combination* — the correlation-breaking rows — can hide inside a rectangle that ordinary rows also occupy on each axis. That is why the forest ranked them 3rd to 15th where Mahalanobis had them 1st to 3rd. The same geometry produces 'ghost' regions: with two clusters at (0, 0) and (5, 5), the corners (0, 5) and (5, 0) are as empty as the midpoint (2.5, 2.5), yet the axis-parallel splits that isolate each cluster leave the corners inside horizontal and vertical bands that the clusters occupy. The **extended isolation forest** (Hariri, Carrasco Kind and Brunner, 2019) replaces the axis-parallel split by a random hyperplane — a random normal vector and a random intercept in the node's bounding box — and the bands disappear." },

    { t: "code", lang: "python", title: "The ghost-region probe: axis-parallel versus random-hyperplane splits (executed)",
      code: `clusters at (0, 0) and (5, 5), sd 0.5, 500 rows each
probes:            (0, 5)   (5, 0)   (2.5, 2.5)   (0, 0)   (5, 5)
IsolationForest     0.614    0.614     0.671       0.430    0.434     <- the empty corners score LOWER than the equally empty midpoint
extended IF         0.610    0.606     0.591       0.453    0.467     <- three empty points, three similar scores

class EIF:  # 300 trees, subsample 256, split: (x − p) · n <= 0 with n ~ N(0, I) and p uniform in the node's bounding box
    ...     # path length and c(n) as before`,
      caption: "The extended forest is a fifty-line change to the split rule and removes the artefact. It is not in scikit-learn; the `eif` package and PyOD's implementations exist, and the model above is the course's own." },

    { t: "h2", n: "02", text: "One-Class SVM: a boundary around the normal rows", id: "ocsvm" },

    { t: "p", text: "Schölkopf's One-Class SVM (2001) fits a boundary in the kernel feature space that separates the training rows from the origin with the largest margin, allowing a fraction of them to fall outside. With the RBF kernel the boundary in the original space is a union of smooth blobs around the data. Two hyperparameters govern it, and the executed runs show what each does." },

    { t: "code", lang: "python", title: "ν and γ on the correlated data with four planted rows (executed)",
      code: `OneClassSVM(nu=ν, gamma="scale").fit(X)
#  ν      training rows flagged   support vectors   planted ranks
#  0.01         0.013                 0.023           1, 12, 20, 778
#  0.05         0.052                 0.058           1,  2,  3,  45
#  0.20         0.200                 0.204           1,  2,  3,  13

OneClassSVM(nu=0.05, gamma=γ)
#  γ       planted ranks      AUC
#  0.01    6, 11, 21, 25     0.987     <- nearly linear: one big blob, the boundary is an ellipse-like hull
#  0.5     1,  2,  3, 45     0.990     <- 'scale' ≈ 1/(p · var) lands here
#  5       1,  2,  3, 856    0.787     <- a blob around every training row; the along-axis planted row is inside one`,
      caption: "ν is a bound: at most ν of the training rows are outside the boundary and at least ν are support vectors, and the executed fractions track it within a third of a percentage point. γ sets the kernel width: small is smooth and close to a single ellipse, large wraps each training point and calls everything between them anomalous." },

    { t: "p", text: "The One-Class SVM is a novelty detector by temperament: it assumes the training rows are normal and draws the boundary around all but a fraction ν of them, so contamination in training is drawn inside the boundary unless ν is set high enough to leave it out. It scales as O(n²) to O(n³) in training and stores support vectors for prediction, which limits it to tens of thousands of rows; on the digits task below, with γ at its default, it reached only AUC 0.539 — the RBF width that suits a 64-pixel image is not the default, and the method needs tuning that unlabelled data cannot supply. It remains the right tool when the normal region is compact, the data is modest, and a smooth boundary with a probabilistic bound on the false-alarm rate is wanted." },

    { t: "h2", n: "03", text: "Reconstruction error: autoencoders and PCA", id: "reconstruction" },

    { t: "p", text: "A model trained to reconstruct normal rows through a narrow bottleneck learns the structure of normal and nothing else; a row that does not share that structure is reconstructed badly, and the reconstruction error is its anomaly score. PCA is the linear case (7.4): project onto k components and back, and the residual is the error. An autoencoder replaces the projection by a neural encoder and decoder and can learn curved structure. The experiment is a novelty task: train on handwritten digits 0–8, and ask whether the error identifies the never-seen 9s." },

    { t: "code", lang: "python", title: "Digits 0–8 are normal; 9 is the novelty (executed; 1,131 training images, 486 held-out normals + 180 nines)",
      code: `ae = Sequential(Linear(64, 32), ReLU(), Linear(32, 8), ReLU(), Linear(8, 32), ReLU(), Linear(32, 64), Sigmoid())   # bottleneck 8
# 300 epochs of MSE on the normal training images; score = per-image MSE on the test set
#                                    normals   nines    AUC     AP
# AE (64-32-8-32-64)                  0.0266   0.0429   0.843   0.572
# PCA(8) reconstruction error                            0.831   0.607   <- the linear autoencoder is nearly as good here
# IsolationForest (300 trees)                            0.704   0.413
# LOF, novelty=True, k=20                                0.918   0.766   <- the winner on this task
# OneClassSVM ν 0.05, γ 'scale'                          0.539   0.320

# threshold at the 95th percentile of TRAINING error (0.0456): flags 8.0 % of held-out normals and 33.9 % of nines
# the trap:  AE (64-64-64), no bottleneck: normals 0.0015, nines 0.0018, AUC 0.700  -- it reconstructs everything, nines included`,
      caption: "Reconstruction error is a score, not a verdict, and on an 8×8 digit the local-density method beat it. The exercise sweeps the bottleneck: AUC rises from 0.673 at width 2 to 0.914 at 16 and falls to 0.799 at 32, so the width is a validated choice, not a guess." },

    { t: "callout", kind: "tradeoff", title: "When reconstruction is the right score", body: [{ t: "p", text: "It wins when normal data has rich structure that a distance cannot capture — images, spectra, sequences, sensor arrays with hundreds of channels — and when the anomalies violate that structure rather than sitting at its edge: a 9 is not a far-away 3, it is a different shape. It loses when the network is wide enough to learn the identity (the no-bottleneck run), when anomalies are simple enough to reconstruct (a blank image reconstructs perfectly), and when the training data contains the anomalies, which the model then learns to reconstruct. A variational autoencoder replaces the point bottleneck with a distribution and scores by the evidence lower bound; the practical gain over a plain autoencoder is a smoother latent space, and the practical cost is a harder training loop, so start with PCA, then a plain autoencoder, and move on only if validation says so." }] },

    { t: "h2", n: "04", text: "COPOD and ECOD: tail probabilities, no parameters", id: "ecod" },

    { t: "p", text: "ECOD (Li et al., 2022) asks, feature by feature, how far into the tail a value sits. For each feature it computes the empirical CDF on the training data, and for each row the left-tail probability F(x_j) and the right-tail probability 1 − F(x_j); −log of a tail probability is large when the value is extreme. The per-feature terms are combined into an outlier score with no distance, no neighbours, no kernel and no parameters, in O(n·p) time, which makes it a good first pass on wide tables. COPOD is its predecessor and uses an empirical copula for the same purpose. Both are in PyOD, which wraps some fifty detectors behind one `fit / decision_scores_ / predict` interface." },

    { t: "code", lang: "python", title: "ECOD by hand and in PyOD (executed on the correlated data)",
      code: `n = len(X_train)
F_left  = searchsorted(sorted(X_train[:, j]), X[:, j], side="right") / n         # P(X_j <= x_j)
F_right = (n − searchsorted(sorted(X_train[:, j]), X[:, j], side="left")) / n    # P(X_j >= x_j)
U_l, U_r = −log(F_left), −log(F_right)                                            # per feature, per row
U_skew   = U_l where the feature's skewness < 0 else U_r

# the paper's combination:  O = max( Σ_j U_l, Σ_j U_r, Σ_j U_skew )              planted ranks 8, 92, 122, 261   AUC 0.882
# PyOD's combination:       O = Σ_j max( U_l, U_r, U_skew )                      planted ranks 8, 16, 40, 44     AUC 0.976   (matches PyOD to 1.8e-15)
# COPOD (PyOD):                                                                  planted ranks 5, 25, 28, 59     AUC 0.973

# why: the (2.8, 2.8) row has right-tail −log F of 5.12 and 5.53 on the two features -- extreme on both, the 8th row overall
#      the (2.5, −2.5) row has 4.2 on one feature's right tail and 5.3 on the other's LEFT tail:
#      the paper's form sums one tail at a time and never adds them; PyOD's per-feature max does`,
      caption: "Two lessons. ECOD is blind by design to correlation-breaking rows — each feature's tail is computed on its own, and (2.5, −2.5) is only mildly extreme on each — which is the price of its speed. And the implementation you call may not be the paper you read: PyOD's ECOD takes the per-feature maximum before summing, which is materially better on this data and is not what the paper describes." },

    { t: "h2", n: "05", text: "Thresholds, and evaluation when there are no labels", id: "evaluation" },

    { t: "p", text: "Every detector produces a score; the threshold is a separate decision, and the executed runs make the point that it is a *capacity* decision. `contamination` in scikit-learn and PyOD sets the threshold at that quantile of the training scores (0.01 flagged 1.1 % of the rows, 0.05 flagged 5.1 %, 0.1 flagged 10.1 %) and does not touch the ranking. The right value is the one that produces a queue the reviewers can clear: a team that can examine 300 cases a month wants the top 300, whatever that is as a contamination rate (0.0131 on the fraud data), and the score's job is to make those 300 the best 300." },

    { t: "p", text: "Without labels there is no AUC, but there are three things you can measure. **Agreement**: how much the top-k sets of different detectors overlap — on the correlated data the top-20 overlaps ranged from 4 (LOF and ECOD, which define normal very differently) to 16 (Isolation Forest and ECOD, both axis-oriented); a row that several detectors agree on is a stronger candidate, and a detector that agrees with nothing is either finding something the others cannot or is broken. **Stability**: how much a detector's top-k changes with its seed or a resample — the Isolation Forest's top 20 overlapped 18.0 of 20 on average across five seeds; a detector whose queue reshuffles between runs cannot be reviewed consistently. **Precision at depth from review**: reviewers label the top k, and the share confirmed is the metric that matters — with the planted labels as the check we usually cannot do, the forest had all four planted rows in its top 20, LOF, Mahalanobis and the One-Class SVM three, ECOD one. A small labelled set from review, plus a random sample for the base rate, is also what turns the problem supervised (§07)." },

    { t: "ladder",
      title: "Setting the threshold on an anomaly score",
      rungs: [
        { level: "bad", label: "The library default", code: `IsolationForest().fit(X).predict(X)          # contamination='auto' -> offset −0.5`,
          note: "**Flagged 17.5 % of a dataset with 0.4 % anomalies.** The default is the score's mathematical midpoint, not an estimate of anything about your data." },
        { level: "ok", label: "contamination at the expected rate", code: `IsolationForest(contamination=0.01).fit(X)   # flagged 1.1 %`,
          note: "Right if you know the rate. Usually you do not — the rate is what you are trying to discover — and the queue length still bears no relation to who will read it." },
        { level: "best", label: "The top k by review capacity, with the precision-at-depth curve from the reviewers' labels", code: `queue = X.iloc[np.argsort(-score)[:k]]        # k = what the team can clear
# fraud data with the full feature set: precision@100 1.000, @200 0.990, @300 0.947, @500 0.818; marginal precision in rows 400-800: 0.247`,
          note: "The curve says where the queue stops paying: rows 250–500 are 66 % fraud, rows 400–800 are 25 %. Capacity plus this curve is the threshold; it is re-estimated as the labels accumulate." }
      ] },

    { t: "h2", n: "06", text: "Streaming and drift", id: "streaming" },

    { t: "code", lang: "python", title: "A detector fitted on an old window, scoring a stream that has moved (executed, 5 features)",
      code: `iso = IsolationForest(contamination=0.02).fit(old_window)           # 5,000 rows
iso.predict(same_distribution_batch)      # flag rate 0.018   -- as configured
iso.predict(shifted_batch)                # flag rate 0.048   -- feature 0 moved by 1.5 sd: the flag rate is the drift alarm
IsolationForest(contamination=0.02).fit(shifted_batch).predict(shifted_batch)   # 0.020 -- refitted, the shift is now 'normal'`,
      caption: "The flag rate over time is the cheapest drift monitor there is, and it is ambiguous by nature: a rise means the world changed or the pipeline broke, and only a person can say which. Refitting on the new window is right for the first and wrong for the second." },

    { t: "p", text: "A streaming detector has three design choices. **Window**: refit on a sliding window (the last N rows or days), so that slow change is absorbed and the reference stays current; the window must be long enough to contain the normal cycle (a week, if weekends differ) and short enough to forget. **Cadence**: refit on a schedule, or when the flag rate leaves its expected band, and always keep the previous model so that a batch can be scored by both when the two disagree. **Latency**: the Isolation Forest scores in microseconds per row and is the streaming default; LOF needs a neighbour search against the window; an autoencoder is a forward pass. Half-Space Trees and streaming variants of the forest update the model per row without refitting, for cases where a batch refit is too slow — and the features must be computed from the *past only*, which is the discipline the fraud system below enforces." },

    { t: "h2", n: "07", text: "A fraud system, end to end", id: "fraud" },

    { t: "p", text: "The data is synthetic and built so that the mechanisms are visible: 30,000 card transactions over 30 days on 400 cards, each card with its own typical amount. Three fraud patterns are planted. **A**, card testing: a burst of eight tiny purchases at new merchants inside an hour (200 rows). **B**: one large purchase at five to ten times the card's typical amount, at night, at a new merchant (120 rows). **C**, which appears only after week 1: a stolen card used *normally* — twelve typical-amount purchases at new merchants spread over one day (240 rows). Features are computed per card from the past only: the amount's z-score against the card's own running history, the count of that card's transactions in the previous hour, a night flag, a new-merchant flag and the log amount. Week 1 (7,013 rows, 69 fraud) is the reference; the remaining 22,987 rows with 491 fraud are the stream." },

    { t: "code", lang: "python", title: "Stage 1 — unsupervised triage on week 1, scored on the later weeks (executed)",
      code: `#                        week-1 precision@200   later precision@200   AUC     AP     later recall@200 by pattern A / B / C
# IsolationForest              0.345                 0.970             0.964   0.661     141/160   50/91    3/240
# ECOD                         0.330                 0.945             0.927   0.593     147/160   40/91    2/240
# LOF (novelty, k=50)          0.160                 0.325             0.785   0.192      55/160    0/91   10/240
# two hand rules, written after looking at the top of the queue
#   (n_last_hour >= 4 & new merchant) | (amount z > 3 & night):   precision 0.903, recall 0.303, A 83/160, B 66/91, C 0/240

# week-1 precision@200 is low because week 1 has only 69 fraud rows -- and all 69 are in the forest's top 200`,
      caption: "The forest and ECOD find the two patterns they can see; LOF does not, because a burst of eight identical rows is a dense little cluster by local standards — the pattern defeats the definition. The hand rules are precise and narrow. Pattern C is invisible to all of them." },

    { t: "code", lang: "python", title: "Stage 2 — the analyst's labels become a supervised model (executed)",
      code: `reviewed = top-200 of week 1 by the forest (69 confirmed) ∪ 300 random rows (3 confirmed)   -> 490 labelled rows, 69 positive
hgb = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200).fit(X_week1[reviewed], y_reviewed)

#                                       later precision@200    AP      A / B / C at 200
# supervised on the 490 labels                 0.975           0.639   136/160   58/91   1/240
# rank-average(supervised, forest)             0.985           0.669   142/160   54/91   1/240
# forest alone (from stage 1)                  0.970           0.661   141/160   50/91   3/240`,
      caption: "The random 300 are not wasted: they are the base rate the supervised model needs, and they are the audit of the queue (3 fraud in 300 random rows, against 69 in the top 200). The supervised model is a little more precise on the patterns the labels contain and blind to the one they do not." },

    { t: "code", lang: "python", title: "Stage 3 — the pattern nobody has labelled (executed)",
      code: `# pattern C: typical amounts, one or two transactions per hour, daytime -- ordinary on every existing feature.
# The feature it needs: new merchants in the previous 24 hours, per card (week-1 p99 = 2, max 7; pattern-C rows: median 6).

feats2 = feats + ["new_merch_last_day"]
IsolationForest(300).fit(X_week1[feats2])                  # refitted on week 1 -- NO pattern-C rows exist there and no labels for it
#                                   precision@200   AP      A / B / C at 200        A / B / C at 500
# forest + new feature                   0.990      0.894   132/160   3/91  63/240   153/160  63/91  193/240
# supervised + new feature, same labels                              140/160  52/91   2/240     <- cannot use a feature for a pattern it has no examples of`,
      caption: "The unsupervised detector finds 193 of the 240 pattern-C rows once the feature exists, with no label for the pattern, because the feature makes those rows *rare*: in week 1 almost no card visited six new merchants in a day. The supervised model, given the same feature and the same labels, still finds two. The queue at 200 is now dominated by C and B slips to 3 of 91 — the depth has to grow with the number of patterns, which is what the precision-at-depth curve is for." },

    { t: "viz",
      title: "The fraud system as a loop",
      caption: "Unsupervised scoring makes the queue; the queue makes labels; labels make a supervised model that joins the score; the flag rate and the labels feed the monitor; new patterns enter through new features, not new models.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Flow diagram: events feed past-only features, which feed an unsupervised score and a supervised model; both feed a rank-averaged queue sized to capacity; analysts review the queue and produce labels that train the supervised model; a monitor watches flag rate and precision; new patterns are addressed by new features.">
  <g font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="var(--ink)">
    <rect x="20" y="120" width="110" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="75" y="141" text-anchor="middle">events</text><text x="75" y="157" text-anchor="middle" fill="var(--ink-3)" font-size="11">transactions</text>
    <rect x="170" y="120" width="130" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="235" y="141" text-anchor="middle">features</text><text x="235" y="157" text-anchor="middle" fill="var(--ink-3)" font-size="11">past-only, per card</text>
    <rect x="340" y="50" width="140" height="50" rx="6" fill="var(--surface-2)" stroke="var(--accent)"/><text x="410" y="71" text-anchor="middle">unsupervised score</text><text x="410" y="87" text-anchor="middle" fill="var(--ink-3)" font-size="11">forest, refit weekly</text>
    <rect x="340" y="190" width="140" height="50" rx="6" fill="var(--surface-2)" stroke="var(--good)"/><text x="410" y="211" text-anchor="middle">supervised model</text><text x="410" y="227" text-anchor="middle" fill="var(--ink-3)" font-size="11">on reviewed labels</text>
    <rect x="530" y="120" width="120" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="590" y="141" text-anchor="middle">queue</text><text x="590" y="157" text-anchor="middle" fill="var(--ink-3)" font-size="11">rank-average, top k</text>
    <rect x="700" y="120" width="120" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="760" y="141" text-anchor="middle">analysts</text><text x="760" y="157" text-anchor="middle" fill="var(--ink-3)" font-size="11">labels + random audit</text>
    <rect x="530" y="230" width="290" height="44" rx="6" fill="var(--surface-2)" stroke="var(--warn)"/><text x="675" y="249" text-anchor="middle">monitor</text><text x="675" y="264" text-anchor="middle" fill="var(--ink-3)" font-size="11">flag rate, precision at depth, feature drift</text>
  </g>
  <g stroke="var(--ink-3)" stroke-width="1.5" fill="none">
    <path d="M130 145 L170 145"/><path d="M300 138 L340 80"/><path d="M300 152 L340 210"/><path d="M480 75 L530 138"/><path d="M480 215 L530 152"/><path d="M650 145 L700 145"/>
    <path d="M760 170 L760 200 L410 200 L410 240" stroke-dasharray="5 3"/>
    <path d="M760 170 L760 230" stroke-dasharray="5 3"/>
  </g>
  <g fill="var(--ink-3)">
    <polygon points="170,145 162,140 162,150"/><polygon points="340,80 331,79 336,87"/><polygon points="340,210 336,203 331,211"/><polygon points="530,138 522,133 521,141"/><polygon points="530,152 521,149 522,157"/><polygon points="700,145 692,140 692,150"/>
  </g>
  <text x="590" y="192" font-size="11" fill="var(--ink-3)" font-family="ui-sans-serif, system-ui, sans-serif" text-anchor="middle">labels flow back</text>
  <text x="235" y="205" font-size="11" fill="var(--crit)" font-family="ui-sans-serif, system-ui, sans-serif" text-anchor="middle">a new pattern → a new feature</text>
</svg>` },

    { t: "callout", kind: "production", title: "What the fraud system has to get right that no notebook shows", body: [{ t: "p", text: "Features from the past only, computed the same way in training and at scoring time (the running per-card mean must not include the current transaction). A reference window that is refitted on a schedule and versioned, with the previous model kept. A queue whose depth is set by capacity and whose precision at depth is measured from the analysts' verdicts every week. A random audit sample alongside the queue, without which the base rate is unknown and the supervised model learns only the queue's biases. Labels that carry the date they were made, because a confirmed fraud last month is a training row and a pending case is not. And a review of the misses: chargebacks that arrive weeks later are the recall estimate, and a cluster of chargebacks the queue never showed is a new pattern, which means a new feature." }] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Normal rows in the correlated data have an average Isolation Forest path length of 11.69, above the depth limit of 8. How?",
          options: [
            "The forest ignores the depth limit for dense regions",
            "A leaf cut at the depth limit with n rows still inside is credited c(n), the expected extra depth those rows would have needed, and for dense leaves that adds several units",
            "Path length is measured in splits plus features",
            "It is a rounding artefact of averaging over trees"
          ],
          answer: 1,
          why: "The depth cap saves compute in regions that are normal by construction; the c(n) credit restores the estimate of how deep isolation would have gone. A normal row typically lands at depth 8 in a leaf with several rows, so its E[h] is 8 plus c(n) for that leaf, which is why 11.69 is possible and why the score formula divides by c(256) rather than by 8."
        },
        {
          stem: "The forest ranked the correlation-breaking rows 3rd, 8th, 12th and 15th; Mahalanobis had them 1st to 3rd. What causes the gap?",
          options: [
            "The forest used too few trees",
            "Its splits are axis-parallel, so a row ordinary on each axis but anomalous as a combination can share a rectangle with ordinary rows; Mahalanobis measures the combination directly",
            "Mahalanobis had access to the labels",
            "The subsample of 256 was too small"
          ],
          answer: 1,
          why: "Every split is on one feature, and (2.5, −2.5) is only 2.5 sd out on each; the rectangles the forest carves contain ordinary rows with either coordinate. The extended forest's random hyperplanes can cut diagonally and remove the artefact, which the two-cluster probe shows."
        },
        {
          stem: "An autoencoder with no bottleneck (64-64-64) reconstructed the novel 9s almost as well as the normal digits (0.0018 versus 0.0015) and reached AUC 0.700. Why?",
          options: [
            "It was trained for too few epochs",
            "A network wide enough to learn the identity map reconstructs any input, so the error no longer measures resemblance to the training data",
            "The Sigmoid output saturated",
            "Nines are easier to reconstruct than other digits"
          ],
          answer: 1,
          why: "The bottleneck is what forces the model to learn the structure of normal data rather than a copy operation; without it, reconstruction error is near zero everywhere. The exercise's sweep shows the width matters in both directions: 2 was too narrow to reconstruct normals (AUC 0.673), 16 was best (0.914), 32 was already too wide (0.799)."
        },
        {
          stem: "ECOD ranked (2.8, 2.8) 8th and (2.5, −2.5) 92nd under the paper's combination rule. Why does it prefer the row that lies along the correlation?",
          options: [
            "ECOD models the correlation and finds (2.8, 2.8) surprising",
            "ECOD scores each feature's tail independently; (2.8, 2.8) is extreme on both features' right tails, while (2.5, −2.5) is extreme on one feature's right tail and the other's left tail, which the paper's rule never adds together",
            "The skewness correction penalised negative values",
            "It is a random-seed effect"
          ],
          answer: 1,
          why: "A per-feature tail detector cannot see dependence; it sees marginal extremeness. The paper's rule takes the maximum of the all-left, all-right and skew-chosen sums, so mixed-tail rows are undercounted; PyOD's implementation takes the per-feature maximum first and ranks the same row 16th, but neither sees the correlation."
        }
      ] },

    { t: "exercise",
      kind: "Investigate",
      title: "The score by hand, the bottleneck by validation, and the threshold by capacity",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "**(a)** With subsamples of 8 rows, compute c(8) from the formula and the anomaly score for average path lengths of 1, 2, 3 and c(8) itself. Which path length gives exactly 0.5, and why?" },
        { t: "p", text: "**(b)** On the digits novelty task (train on 0–8, test held-out normals plus all 9s), train the 64-32-w-32-64 autoencoder for bottleneck widths w = 2, 4, 8, 16, 32 (300 epochs, seed 0) and report training MSE, mean error on normals and on nines, their ratio, and AUC. Explain the shape of the curve." },
        { t: "p", text: "**(c)** For the fraud detector with the six features, compute precision@k, recall@k and the marginal precision in the second half of the queue for k = 50, 100, 200, 300, 500, 800, 1200, 2000 on the later weeks, and convert each k to rows per day. Recommend a queue depth for a team that can review 15 cases a day and for one that can review 50, with reasons." }
      ],
      requirements: [
        "(a) c(8) to four decimals and four scores.",
        "(b) a five-row table and an explanation of both ends.",
        "(c) an eight-row table and two recommendations."
      ],
      hint: "(a) c(n) is the expected path length of a random point; the score is 2 to the power of minus the ratio. (b) Watch the ratio of nine-error to normal-error, not either alone. (c) Marginal precision is what the next reviewer-hour buys.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) H(7) = ln 7 + 0.5772 = 2.5231;  c(8) = 2·2.5231 − 2·7/8 = 3.2963
#     E[h] 1 -> 2^(−1/3.296) = 0.810     E[h] 2 -> 0.657     E[h] 3 -> 0.532     E[h] = c(8) -> 0.500
#     A row whose path length equals the expected path length of a random point is, by definition, neither easy nor hard to isolate: 0.5.

# (b) width   train MSE   normals   nines    ratio   AUC     AP
#       2      0.0414     0.0431   0.0523    1.21   0.673   0.344     <- too narrow: it cannot reconstruct the normals either
#       4      0.0308     0.0339   0.0523    1.54   0.821   0.532
#       8      0.0243     0.0266   0.0429    1.62   0.843   0.572
#      16      0.0121     0.0135   0.0274    2.03   0.914   0.767     <- best: normals reconstruct well, nines still do not
#      32      0.0083     0.0089   0.0146    1.63   0.799   0.566     <- wide enough to reconstruct nines too
#     The score is the RATIO of novel error to normal error. A narrow bottleneck raises both; a wide one lowers both;
#     the width that separates them is a validated choice, and it needs a few known novelties to validate on.

# (c) later weeks: 22,987 rows over 23 days, 491 fraud
#     k      rows/day   precision@k   recall@k   marginal precision (rows k/2..k)
#     50       2.2        1.000        0.102          1.000
#     100      4.3        1.000        0.204          1.000
#     200      8.7        0.990        0.403          0.980
#     300     13.0        0.947        0.578          0.893
#     500     21.7        0.818        0.833          0.656
#     800     34.8        0.573        0.933          0.247
#     1200    52.2        0.392        0.957          0.058
#     2000    87.0        0.237        0.967          0.007
#     15 cases/day -> about 345 rows, between the executed k = 300 (precision 0.947, recall 0.578, marginal 0.893) and
#        k = 500 (0.818, 0.833, 0.656): every case reviewed is still worth reviewing; take the full capacity.
#     50 cases/day -> about 1,150 rows, near k = 1,200: precision 0.392, and rows 600-1,200 are 5.8 % fraud -- the capacity
#        is better spent reviewing ~500 (recall 0.833) and putting the rest into the random audit and into chasing the misses.
#     contamination equivalent to a 300-row queue over this period: 0.0131`,
        notes: [
          { t: "p", text: "(a) is the whole content of the score: a normalised path length with 0.5 as the point of indifference." },
          { t: "p", text: "(b) is the argument against 'autoencoders detect anomalies' as a slogan: the width is a hyperparameter that only validation on known novelties can set." },
          { t: "p", text: "(c) is the threshold as a capacity decision, made from the curve reviewers' verdicts produce." }
        ]
      }
    }
  ],

  takeaways: [
    "Isolation Forest scores a row by how few random axis-parallel splits isolate it: s = 2^(−E[h]/c(n)), 0.5 for an average row, with a c(n) credit for leaves cut at the depth limit; it costs the same on 100,000 rows as on 1,000 because every tree sees 256, and it reproduces from its trees to 0.004.",
    "Axis-parallel splits produce ghost regions and under-rank rows anomalous only as combinations (3rd–15th where Mahalanobis had 1st–3rd); the extended forest's random hyperplanes remove the artefact.",
    "contamination='auto' flagged 17.5 % of a dataset with 0.4 % anomalies; contamination is a threshold on a fixed ranking, and the right threshold is the review capacity read off the precision-at-depth curve.",
    "The One-Class SVM's ν bounds the flagged fraction (executed to within 0.3 percentage points) and γ sets how tightly the boundary wraps the data — γ = 5 ranked one planted row 856th; it is a novelty detector, quadratic in n, and needs tuning that unlabelled data cannot provide.",
    "Reconstruction error (PCA or autoencoder) scores departure from learned structure: AUC 0.843 on unseen digits, 0.700 without a bottleneck, and 0.673 → 0.914 → 0.799 as the width goes 2 → 16 → 32; on that task LOF's 0.918 beat all of them.",
    "ECOD and COPOD score per-feature tails in O(n·p) with no parameters and cannot see dependence; PyOD's ECOD combines tails differently from the paper and is materially better for it.",
    "Without labels, measure agreement between detectors, stability across seeds, and precision at depth from reviewers; the flag rate over time is the drift alarm, and refitting on a shifted window is right for a real change and wrong for a fault.",
    "A fraud system is a loop: past-only features, an unsupervised queue (97 % precision at 200), a random audit, analyst labels that train a supervised model (97.5 %), a rank-average of both — and new patterns enter through new features: with `new_merch_last_day` the unsupervised forest found 193 of 240 rows of a pattern it had no label for, and the supervised model found 2."
  ],

  quiz: {
    title: "Isolation Forest, One-Class SVM, Autoencoders and Fraud — Knowledge Check",
    questions: [
      {
        stem: "Why does the Isolation Forest's training cost not grow with the number of rows?",
        options: [
          "It uses a single pass over the data",
          "Each tree is grown on a random subsample of 256 rows to a depth of at most 8, so the work per tree is fixed; only scoring is linear in n",
          "It caches the split values",
          "It only splits on a random subset of features"
        ],
        answer: 1,
        why: "The 2008 paper's insight is that a small subsample isolates anomalies better than the full data (swamping and masking are reduced) and costs a constant amount; the executed fit on 100,000 × 20 with 100 trees took 0.21 s. Scoring visits each tree once per row and is linear."
      },
      {
        stem: "A One-Class SVM is trained on last quarter's transactions, which contain about 2 % fraud, with ν = 0.01. What happens?",
        options: [
          "It flags about 2 % of new transactions",
          "The boundary is drawn around all but 1 % of the training rows, so most of the 2 % fraud ends up inside it and is learned as normal",
          "ν is automatically raised to match the contamination",
          "It fails to converge"
        ],
        answer: 1,
        why: "ν is an upper bound on the training rows left outside the boundary; with ν below the true contamination, more than half of the anomalies must fall inside. The One-Class SVM is a novelty detector that assumes clean training data; with contaminated data, use a robust method or set ν well above the contamination rate."
      },
      {
        stem: "In the fraud system, the supervised model given the new `new_merch_last_day` feature still found 2 of 240 pattern-C rows while the unsupervised forest found 193. Why the difference?",
        options: [
          "The forest used more trees",
          "Supervised learning can only use a feature to separate the classes it has examples of; with no pattern-C labels the feature carries no signal for it. The forest scores rarity, and the feature made pattern-C rows rare",
          "The supervised model was overfitted",
          "The forest was refitted on the later weeks"
        ],
        answer: 1,
        why: "A classifier fits P(fraud | x) from its labels, and pattern C is absent from them, so the model has no reason to score high where that feature is large. Rarity does not need labels: in week 1, p99 of the feature was 2 and pattern-C rows have a median of 6. This is the case for keeping an unsupervised scorer in the loop even after labels exist."
      },
      {
        stem: "The flag rate of a fitted Isolation Forest rises from 1.8 % to 4.8 % on this week's batch. What should the on-call engineer do?",
        options: [
          "Refit the detector on this week's data so the rate returns to 2 %",
          "Treat the rise as an alarm: check which features moved and whether the pipeline changed; refit on the new window only once it is established that the change is real and not a fault",
          "Lower the contamination parameter",
          "Ignore it — anomaly rates fluctuate"
        ],
        answer: 1,
        why: "The rise is exactly what a drift alarm is for, and it is ambiguous: a real shift in behaviour and a broken upstream feature look identical to the detector (the executed shift was one feature moved 1.5 sd). Refitting immediately makes a fault invisible; the executed refit brought the rate to 2.0 % on the shifted data. Diagnose first, refit second."
      },
      {
        stem: "Which is the honest way to compare three anomaly detectors on a table with no labels?",
        options: [
          "Pick the one with the highest mean score",
          "Compare top-k overlap between them, top-k stability across seeds for each, and — the decisive measure — have reviewers label the top k of each and compare precision at depth",
          "Use silhouette score on the flagged rows",
          "Use the one with the fewest flagged rows"
        ],
        answer: 1,
        why: "Scores are not comparable across detectors, and no unsupervised metric certifies that a flagged row is anomalous in the sense that matters. Agreement and stability are cheap sanity checks (top-20 overlaps of 4 to 16, forest stability 18 of 20 across seeds); reviewed precision at depth is the only measure tied to the purpose, and it also starts the labelled set."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Isolation Forest, One-Class SVM, Autoencoders and Fraud",
    sub: "The mechanics of each detector, its failure mode, and the design of a system that uses them.",
    questions: [
      {
        level: "Core",
        q: "Explain how an Isolation Forest scores a point.",
        strong: "Grow many random trees, each on a subsample of about 256 rows: at each node choose a random feature and a random split value between its minimum and maximum, recurse, and stop at depth ⌈log₂ 256⌉ = 8 or when a row is alone. A row's path length is the number of splits to its leaf, plus, if the leaf was cut at the limit with n rows still inside, c(n) — the expected extra depth, from the average path length of a failed binary search. Average over trees to get E[h], and the score is 2^(−E[h]/c(256)): a row isolated in the expected number of splits scores 0.5, a row isolated almost immediately approaches 1, a row deeper than average falls below 0.5. Anomalies are few and different, so they are separated in a few splits. I reproduced scikit-learn's score from its trees to 0.004. Two cautions: the splits are axis-parallel, so rows anomalous only as a combination of features are under-ranked — the extended forest fixes that with random hyperplanes — and the 'auto' contamination flags everything above 0.5, which was 17.5 % of one dataset.",
        answer: [
          { t: "p", text: "Random trees on subsamples, the depth cap and c(n) credit, the score formula with 0.5 as indifference, and the two cautions." }
        ]
      },
      {
        level: "Core",
        q: "What do ν and γ do in a One-Class SVM?",
        strong: "ν is a bound on the fraction of training rows allowed outside the boundary and, equivalently, a lower bound on the fraction that are support vectors; in the executed runs ν = 0.01, 0.05 and 0.20 gave flagged fractions of 0.013, 0.052 and 0.200. It is the false-alarm budget on the training data, and it must exceed the contamination if the training data is not clean, or the anomalies are enclosed. γ is the RBF kernel width: small gives a smooth boundary close to a single ellipse, which was nearly as good as Mahalanobis; large wraps every training row in its own blob, so anything between rows is called anomalous and a planted row along the correlation ranked 856th with AUC 0.79. The default 'scale' worked on two features and gave AUC 0.54 on 64-pixel digits, so γ needs validation, which unlabelled data cannot provide.",
        answer: [
          { t: "p", text: "ν as a bound with the executed fractions, its interaction with contamination, γ as kernel width with the executed extremes, and the tuning problem." }
        ]
      },
      {
        level: "Senior",
        q: "When is an autoencoder the right anomaly detector, and how would you set its bottleneck?",
        strong: "When normal data has structure that distances cannot capture — images, spectra, long sensor vectors — and the anomalies violate that structure rather than being far away. The score is reconstruction error, and it only works because the bottleneck forces the model to learn normal structure rather than the identity: with no bottleneck my network reconstructed unseen 9s as well as training digits and scored AUC 0.70. The width is a hyperparameter with a peak: on the digits task AUC went 0.67, 0.82, 0.84, 0.91, 0.80 for widths 2, 4, 8, 16, 32 — too narrow and the normals reconstruct badly too, too wide and the novelties reconstruct well. Setting it needs a validation set with some known anomalies, even a handful; without any, PCA's reconstruction error is a linear baseline that needs only a variance-explained choice and was within 0.01 AUC of the width-8 autoencoder. And I would compare with a local-density method before committing: LOF beat every reconstruction model on that task.",
        answer: [
          { t: "p", text: "Structured data and structure-violating anomalies, the bottleneck as the mechanism, the executed width curve, the need for known novelties, and the PCA and LOF baselines." }
        ]
      },
      {
        level: "Senior",
        q: "How do you set the threshold on an anomaly score when you have no labels?",
        strong: "By capacity, not by a contamination guess. The score fixes a ranking; the threshold only decides how far down the queue a person reads. I ask how many cases the team can review per day, take that many from the top, and have the verdicts recorded — that produces the precision-at-depth curve, and after a few weeks the curve says where the queue stops paying: on the fraud data the top 100 were all fraud, rows 250 to 500 were 66 % fraud, rows 400 to 800 were 25 %. I also review a random sample alongside, which gives the base rate and an unbiased estimate of what the queue misses. Before any labels exist I use two sanity checks — overlap between detectors' top-k, and the stability of one detector's top-k across seeds — to choose which score goes to review. What I never do is trust `contamination='auto'` or a quantile picked from the score's shape.",
        answer: [
          { t: "p", text: "Capacity sets k, reviewers produce the curve, the curve sets the depth; random audit; agreement and stability before labels; the defaults to avoid." }
        ]
      },
      {
        level: "Staff",
        q: "Design a fraud detection system for card transactions from a cold start, and explain how it handles a fraud pattern it has never seen.",
        strong: "Cold start means no labels, so the first component is unsupervised: per-card features computed from the past only — amount z-score against the card's own history, transaction count in the last hour, new-merchant and night flags — scored by an Isolation Forest refitted weekly on a reference window, with ECOD as a cheap cross-check, and a queue sized to the analysts' capacity. In my executed build this gave 97 % precision at 200 on two planted patterns. The queue produces labels; a random audit sample alongside gives the base rate. After the first review cycle those labels train a gradient-boosting classifier, which is rank-averaged with the forest score — the supervised model was a little more precise on the known patterns and the average was best. Monitoring watches the flag rate, precision at depth from the analysts' verdicts, and the feature distributions, and keeps the previous model for comparison. The hard case is a new pattern. Mine was a stolen card used normally: typical amounts, daytime, one or two purchases an hour, at new merchants. Every scorer missed it, supervised and unsupervised, because no feature made it unusual. The fix was not a model; it was a feature — new merchants in the previous 24 hours — after which the unsupervised forest, refitted on the reference week with no example of the pattern and no label, found 193 of 240 rows, while the supervised model with the same feature found 2, because it had no labels to attach the feature to. So the system keeps an unsupervised scorer in the loop permanently, routes chargebacks and analyst escalations into a 'what did we miss' review, and treats each cluster of misses as a feature request. Depth grows with the number of patterns, which the precision curve shows.",
        answer: [
          { t: "p", text: "Past-only features, unsupervised queue and audit, labels to a supervised model rank-averaged with the forest, monitoring, and the new pattern handled by a new feature with the executed 193 versus 2." }
        ]
      }
    ]
  }
});
