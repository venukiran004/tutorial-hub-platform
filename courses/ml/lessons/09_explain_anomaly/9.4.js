/* ============================================================================
   LESSON 9.4 — Anomaly Detection: Statistical and Distance Methods
   ========================================================================= */
EC.receiveLesson({
  id: "9.4",

  lede: "**An anomaly is a row that the rest of the data makes improbable, and every detector is a particular way of saying what 'the rest of the data' looks like.** This lesson works the classical detectors by hand on the course's own data and on small sets you can check with a pencil. The z-score judges the planted £999 fee against a standard deviation that the fee itself has inflated from 4.2 to 31.7 — it still flags it, at z = 31, but a second outlier of the same kind would have hidden the first (the exercise builds that case: two outliers, Grubbs flags neither on the first pass). The modified z-score, on the median and MAD, puts the same row at 254 and is unmoved by it. Mahalanobis distance is worked on correlated data where three planted rows that break the correlation rank 8th, 13th and 30th by Euclidean distance and 1st, 2nd and 3rd by Mahalanobis. The Local Outlier Factor is computed on seven points — k-distances, reachability distances, local reachability densities, the ratio — and matches scikit-learn to three decimals; on a tight cluster beside a diffuse one it ranks a planted point 2nd where the KNN distance ranks it 116th. On the churn customers three detectors agree on the £999 row and on five of their top twenty — which is what a triage queue, not a delete statement, is for.",

  objectives: [
    "Distinguish outlier detection from novelty detection and point, contextual and collective anomalies",
    "Compute and interpret the z-score, modified z-score, IQR fences and Grubbs' test, and state when each fails",
    "Explain why Mahalanobis distance catches correlation-breaking rows that Euclidean distance misses, and why the covariance must be estimated robustly",
    "Compute the Local Outlier Factor by hand and explain what a ratio of 1, below 1 and well above 1 mean",
    "Choose between a global distance score and a local density score from the structure of the data"
  ],

  prerequisites: ["7.3", "3.4", "3.1"],

  blocks: [

    { t: "h2", n: "01", text: "What an anomaly is, and what you are allowed to assume", id: "definitions" },

    { t: "p", text: "Three kinds of anomaly need three different questions. A **point anomaly** is a row that is improbable on its own: a monthly fee of £999 when every other fee is under £22. A **contextual anomaly** is improbable only given its context — a fee of £20 is ordinary for a Pro customer and strange for a Basic one; 35 °C is ordinary in July and an anomaly in January. A **collective anomaly** is a set of rows each of which is ordinary and whose combination is not: one login from a new device is nothing; forty logins from forty new devices in an hour is an account takeover. The statistical and distance methods in this lesson find point anomalies. Contextual anomalies are found by conditioning first (score within the group, or include the context as a feature and let a multivariate method see the combination); collective anomalies need a representation of the set — the window, the sequence, the graph — before any detector applies." },

    { t: "p", text: "The second distinction is what the training data contains. In **outlier detection** the data you fit on already holds the anomalies, at some unknown rate, and the detector must find them in the same data it learned from — so it must be robust to them, which is the theme of this lesson. In **novelty detection** the training data is clean by assumption, and the question is whether new rows look like it — the detector may be sensitive, since nothing in training will mislead it. scikit-learn's `LocalOutlierFactor` embodies the split: by default it scores the training rows and has no `predict` for new ones; with `novelty=True` it refuses to score training rows and only scores new ones. The third distinction is whether you have labels. Usually you have none, or a handful found by a fraud team last quarter — which makes every threshold a decision about capacity (how many rows can a human review?) rather than a decision about accuracy, and the lesson returns to that at the end." },

    { t: "callout", kind: "mental", title: "Every detector is a density estimate in disguise", body: "The z-score assumes one Gaussian and scores distance from its centre in standard deviations. Mahalanobis assumes one Gaussian with a full covariance. The KNN distance assumes density is inversely related to the distance to neighbours. LOF assumes density should be compared with the neighbours' density, not the global one. Isolation Forest (9.5) assumes anomalies are easy to separate with random splits. Choosing a detector is choosing which of these assumptions describes 'normal' for your data — and the failure mode of each is a dataset where its assumption is false: a bimodal column defeats the z-score, a curved manifold defeats Mahalanobis, mixed densities defeat the KNN distance." },

    { t: "h2", n: "02", text: "Univariate tests, worked on the fee column", id: "univariate" },

    { t: "p", text: "The churn table's `monthly_fee` column, after dropping duplicate rows, has 990 values with a median of £10.45 and one planted value of £999. Four tests were run on it exactly as written below; the numbers are the executed outputs." },

    { t: "code", lang: "python", title: "Four univariate tests on the same column (executed)",
      code: `fee = df.monthly_fee.values                          # n = 990, mean 12.489, sd 31.667, median 10.45, max 999
z  = (fee - fee.mean()) / fee.std(ddof=1)            # z of 999: 31.15; rows with |z| > 3: 1
mad = np.median(np.abs(fee - np.median(fee)))        # MAD = 2.620
mz  = 0.6745 * (fee - np.median(fee)) / mad          # modified z of 999: 254; rows with |mz| > 3.5: 1 (the 999 only)
q1, q3 = np.percentile(fee, [25, 75])                # 7.99, 13.26; IQR 5.27; fences [0.09, 21.16]; outside: 2 (21.27 and 999)
fee_clean = fee[fee < 100]                           # sd falls from 31.667 to 4.216; max |z| 2.32; rows with |z| > 3: 0

def grubbs(x, alpha=0.05):                           # H0: no outlier; test the single most extreme value
    n = len(x); m, s = x.mean(), x.std(ddof=1); i = np.argmax(np.abs(x - m)); G = abs(x[i] - m) / s
    t = stats.t.ppf(1 - alpha / (2*n), n - 2)
    Gc = (n - 1) / np.sqrt(n) * np.sqrt(t**2 / (n - 2 + t**2))
    return G, Gc, i
# fee:       G = 31.15 vs critical 4.04  -> outlier (999); after removing it: G = 2.32 vs 4.04 -> no outlier
# tickets:   G = 3.65  vs critical 4.00  -> not flagged  (a Poisson count of 4 is not an anomaly, and Grubbs assumes a Gaussian)`,
      caption: "The z-score's own denominator is contaminated: the £999 row raises the standard deviation from 4.2 to 31.7, so its z is 31 rather than the 234 it would be against the clean spread. Here it is still caught; with a second outlier it would not be (§02, masking)." },

    { t: "dl", items: [
      ["z-score", "(x − mean) / sd, flag |z| > 3. Assumes a single roughly Gaussian population; both mean and sd are pulled by the outliers being tested. Executed: with the £999 present, the second-largest |z| in the column is 0.277 — every legitimate fee is compressed toward zero by the inflated denominator."],
      ["Modified z-score", "0.6745 (x − median) / MAD, flag |mz| > 3.5 (the 0.6745 makes MAD comparable to the sd of a Gaussian). Median and MAD have a 50 % breakdown point: up to half the data can be corrupted before they move. Executed: the £999 row scores 254 and no other row exceeds 3.5."],
      ["IQR fences", "Q1 − 1.5 IQR and Q3 + 1.5 IQR, the box-plot rule. Robust, distribution-free, and blunt: on the fee column it flags £21.27, a legitimate Pro-plan fee at the top of a right-skewed distribution, alongside the £999. Skewed columns produce a steady stream of upper-fence 'outliers' that are simply the tail."],
      ["Grubbs' test", "A formal test that the single most extreme value is from the same Gaussian as the rest. G = max|x − mean|/sd against a critical value from the t distribution with n and α. Detects one outlier per pass; repeat after removal. Assumes normality: on the Poisson `support_tickets` column the count 4 gives G = 3.65 against a critical 4.00 — it happens not to flag, but a test that assumes a Gaussian on a skewed count has no calibrated α either way."]
    ] },

    { t: "callout", kind: "trap", title: "Masking and swamping", body: "**Masking**: a second outlier inflates the sd (or the covariance) enough to hide the first. In the exercise, the series 10, 11, 12, 10, 11, 13, 12, 50, 52 has Grubbs' G = 1.82 for the 52 against a critical 2.22 — not flagged, because the 50 has pushed the sd to 17.5; remove the 52 by other means and the 50 is flagged at once (G = 2.47 vs 2.13). The modified z-score flags both at 25.6 and 27.0 because the median (12) and MAD (1) did not move. **Swamping**: outliers drag the mean toward them until legitimate rows on the far side exceed the threshold. Both are cured by robust location and scale — which is why 'compute the z-score' is the wrong first move on any column you suspect." },

    { t: "h2", n: "03", text: "Mahalanobis distance: the multivariate z-score", id: "mahalanobis" },

    { t: "p", text: "A row can be ordinary on every column and anomalous as a combination. Two features with a correlation of 0.85 form a thin ellipse; the point (2.5, −2.5) is 2.5 standard deviations out on each axis — unremarkable one column at a time — and far outside the ellipse. The Mahalanobis distance d² = (x − μ)ᵀ Σ⁻¹ (x − μ) measures distance in units of the covariance: along the ellipse's long axis a unit of d costs many standard deviations of Euclidean distance, across its short axis very few. Under a Gaussian, d² follows a χ² distribution with as many degrees of freedom as there are features, which gives a threshold with a probability attached — for two features the 97.5 % point is 7.38." },

    { t: "code", lang: "python", title: "Classic and robust covariance on 1,000 correlated rows plus four planted ones (executed)",
      code: `C  = [[1, 0.85], [0.85, 1]]; Xn = rng.multivariate_normal([0, 0], C, 1000)
out = [[2.5, -2.5], [-2.0, 2.0], [3.0, -1.0], [2.8, 2.8]]        # three break the correlation; the fourth is far along it
X = np.vstack([Xn, out])

EmpiricalCovariance().fit(X).mahalanobis(X)[-4:]   # d² [72.1, 47.0, 47.2, 7.9]; threshold χ²₂(0.975) = 7.38; flagged 20 rows, all 4 planted
MinCovDet(random_state=0).fit(X).mahalanobis(X)[-4:]   # d² [93.9, 61.2, 61.3, 7.4];                          flagged 28 rows, all 4 planted

# the same four rows by Euclidean distance from the centre (standardised): ranks 8, 13, 30, 42 of 1,004
# by Mahalanobis (either estimator): ranks 1, 2, 3 for the correlation-breakers`,
      caption: "The planted rows are the three largest Mahalanobis distances and nowhere near the top by Euclidean distance. The fourth planted row, (2.8, 2.8), lies along the correlation and is genuinely borderline: d² 7.9 classic and 7.4 robust against a threshold of 7.38." },

    { t: "p", text: "The two estimators differ in what they fit. `EmpiricalCovariance` is the sample covariance, and it includes the planted rows — with four in a thousand the ellipse barely widens, so the classic distances are only slightly deflated (72 versus 94 for the first row). With 5 or 10 % contamination the sample covariance stretches toward the outliers, their distances shrink, and the masking of §02 recurs in several dimensions. `MinCovDet` (the Minimum Covariance Determinant) searches for the subset of about half the rows whose covariance has the smallest determinant — the tightest ellipse that covers half the data — and estimates μ and Σ from that subset, so the outliers have no vote. It is the multivariate analogue of median-and-MAD, with the same breakdown property, and it is the estimator to use when the training data is not known to be clean. `EllipticEnvelope` wraps it with a `contamination` parameter that sets the threshold as a quantile of the training distances instead of the χ² value." },

    { t: "callout", kind: "tradeoff", title: "What Mahalanobis cannot see", body: "One ellipse. Two clusters of normal rows produce one wide ellipse that covers the gap between them, and a row in the gap — anomalous by any local standard — gets a small distance. A curved relationship (spend rising with tenure then saturating) is fitted by a straight ellipse that calls the ends of the curve anomalous and the empty middle of the arc normal. In p dimensions the covariance has p(p+1)/2 parameters; with p = 50 and a few hundred rows it is poorly estimated, and with p > n it is singular. For those cases the density must be local (§04) or non-parametric (9.5). What Mahalanobis does well it does cheaply and with a calibrated threshold, which is why it is the first multivariate detector to try on a modest number of continuous features." },

    { t: "h2", n: "04", text: "Distance and density: KNN, DBSCAN noise, and the Local Outlier Factor", id: "lof" },

    { t: "p", text: "The distance-based detectors drop the Gaussian and keep the geometry. The **KNN distance score** is the mean (or maximum) distance from a row to its k nearest neighbours: on the correlated data above, with k = 5, the three correlation-breaking rows rank 1st, 2nd and 3rd and the along-axis row 87th, and the score's AUC against the planted labels is 0.979. **DBSCAN noise** (7.3) is the same idea as a label: rows with fewer than `min_samples` neighbours within `eps` that are not reachable from a core point are noise; with eps 0.3 and min_samples 8, 46 rows are noise and the four planted ones are among them. Noise is a label, not a score — it cannot be ranked or thresholded at a review capacity — and the KNN score is preferable for that reason alone." },

    { t: "p", text: "Both fail in the same way: they measure distance on one scale for the whole dataset. A row 0.5 units from its neighbours is far out in a cluster of spread 0.2 and deep inside a cluster of spread 1.5. The **Local Outlier Factor** (Breunig et al., 2000) fixes this by comparing each row's density with the density of its own neighbours, so that 'far' means 'far by local standards'. It takes four steps, worked here on seven points with k = 2 — four in a unit square, two at (5, 5) and (5, 6), and one at (3, 3) between them." },

    { t: "code", lang: "text", title: "LOF in four steps (k = 2, seven points, executed and checked)",
      code: `k-distance(p)        distance from p to its k-th nearest neighbour
N_k(p)               the k nearest neighbours of p
reach-dist_k(p, o)   max( k-distance(o), d(p, o) )         -- distance to o, but never less than o's own k-distance;
                                                             this smooths the statistic for points deep inside a cluster
lrd_k(p)             1 / mean_{o ∈ N_k(p)} reach-dist_k(p, o)   local reachability density
LOF_k(p)             mean_{o ∈ N_k(p)} lrd_k(o) / lrd_k(p)      neighbours' density relative to p's own

point   coords    k-distance  neighbours  reach-dists       lrd     LOF
  0     (0, 0)      1.000     [1, 2]      [1.000, 1.000]   1.000   1.000
  1     (0, 1)      1.000     [0, 3]      [1.000, 1.000]   1.000   1.000
  2     (1, 0)      1.000     [0, 3]      [1.000, 1.000]   1.000   1.000
  3     (1, 1)      1.000     [1, 2]      [1.000, 1.000]   1.000   1.000
  4     (5, 5)      2.828     [5, 6]      [3.606, 2.828]   0.311   1.069
  5     (5, 6)      3.606     [4, 6]      [2.828, 3.606]   0.311   1.069
  6     (3, 3)      2.828     [3, 4]      [2.828, 2.828]   0.354   1.854

sklearn LocalOutlierFactor(n_neighbors=2): -negative_outlier_factor_ = [1.0, 1.0, 1.0, 1.0, 1.069, 1.069, 1.854]`,
      caption: "Point 6 is the anomaly: its neighbours are point 3 (density 1.0) and point 4 (0.311), mean 0.656, against its own 0.354 — a ratio of 1.85. Points 4 and 5 are sparse in absolute terms but their neighbours are as sparse as they are, so LOF ≈ 1. Note point 4's reachability to point 5 is 3.606, not the raw 1.0: point 5's k-distance sets a floor." },

    { t: "viz",
      title: "The seven points with their LOF values (k = 2)",
      caption: "LOF is a ratio, so 1.0 means 'as dense as my neighbours'. Points 4 and 5 are as far apart as point 6 is from anything, and score 1.07; point 6 sits between a dense group and a sparse one and scores 1.85.",
      svg: `<svg viewBox="0 0 720 330" role="img" aria-label="Seven points on a plane: four in a unit square at the origin with LOF 1.0, two at (5,5) and (5,6) with LOF 1.07, and one at (3,3) with LOF 1.85.">
  <line x1="60" y1="290" x2="680" y2="290" stroke="var(--line)" stroke-width="1"/>
  <line x1="60" y1="290" x2="60" y2="30" stroke="var(--line)" stroke-width="1"/>
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="56" y="306">0</text><text x="146" y="306">1</text><text x="236" y="306">2</text><text x="326" y="306">3</text><text x="416" y="306">4</text><text x="506" y="306">5</text><text x="596" y="306">6</text>
    <text x="40" y="294">0</text><text x="40" y="254">1</text><text x="40" y="214">2</text><text x="40" y="174">3</text><text x="40" y="134">4</text><text x="40" y="94">5</text><text x="40" y="54">6</text>
  </g>
  <rect x="60" y="250" width="90" height="40" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>
  <g fill="var(--good)">
    <circle cx="60" cy="290" r="6"/><circle cx="60" cy="250" r="6"/><circle cx="150" cy="290" r="6"/><circle cx="150" cy="250" r="6"/>
  </g>
  <text x="165" y="262" font-size="12" fill="var(--ink-2)">LOF 1.00 (all four)</text>
  <g fill="var(--warn)">
    <circle cx="510" cy="90" r="6"/><circle cx="510" cy="50" r="6"/>
  </g>
  <text x="525" y="95" font-size="12" fill="var(--ink-2)">(5, 5)  LOF 1.07</text>
  <text x="525" y="55" font-size="12" fill="var(--ink-2)">(5, 6)  LOF 1.07</text>
  <circle cx="330" cy="170" r="7" fill="var(--crit)"/>
  <text x="345" y="175" font-size="12" font-weight="600" fill="var(--ink)">(3, 3)  LOF 1.85</text>
  <line x1="330" y1="170" x2="150" y2="250" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="330" y1="170" x2="510" y2="90" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="200" y="228" font-size="11" fill="var(--ink-3)">d 2.83 → point 3 (lrd 1.00)</text>
  <text x="380" y="140" font-size="11" fill="var(--ink-3)">d 2.83 → point 4 (lrd 0.31)</text>
</svg>` },

    { t: "code", lang: "python", title: "Where LOF earns its keep: two clusters of different density (executed)",
      code: `tight   = rng.normal(0, 0.2, (300, 2))               # a dense cluster at the origin
diffuse = rng.normal([6, 0], 1.5, (300, 2))          # a sparse cluster
planted = [[1.0, 0.0], [6.0, 5.0]]                   # 5 sd from the tight cluster; 3.3 sd from the diffuse one

# rank of each planted point among 602, by two scores
#                      (1, 0)     (6, 5)     AUC vs the two planted labels
# KNN mean distance      116          1         0.905      -- (1,0) is 'close' by the diffuse cluster's yardstick
# LOF (k = 20)             2          4         0.998      -- (1,0) is sparse relative to ITS neighbours`,
      caption: "The KNN score uses one scale; the diffuse cluster's routine spread is larger than (1, 0)'s distance from the tight cluster, so 115 ordinary rows of the diffuse cluster outrank a point five standard deviations from its own population." },

    { t: "callout", kind: "tradeoff", title: "Choosing k, and LOF's known weaknesses", body: "k sets the neighbourhood that defines 'local'. Too small (k = 2–5) and LOF is noisy — a pair of anomalies next to each other become each other's dense neighbourhood and score 1.0; the original paper recommends k of 10–20 minimum and taking the maximum LOF over a range of k. Too large and the neighbourhood spans clusters and the score reverts toward a global one. LOF costs O(n²) distances naively and O(n log n) with a tree in low dimension; in high dimension distances concentrate (5.1) and every ratio drifts toward 1. It has no natural threshold — 1.5 is a common rule of thumb, but the right threshold is the review capacity — and its scores are not comparable across datasets or across k. Scale the features first: a distance-based detector on raw tenure (sd 17.5 months) and logins (sd 5.0) is a detector of tenure." },

    { t: "h2", n: "05", text: "On the churn customers: three detectors and what to do with the result", id: "churn" },

    { t: "code", lang: "python", title: "Robust Mahalanobis, KNN distance and LOF on five standardised numeric columns (executed, 864 rows, the £999 row kept)",
      code: `Z = StandardScaler().fit_transform(df[["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct"]])
mah = MinCovDet(random_state=0).fit(Z).mahalanobis(Z)
knn = NearestNeighbors(n_neighbors=11).fit(Z).kneighbors(Z)[0][:, 1:].mean(1)
lof = -LocalOutlierFactor(n_neighbors=20).fit(Z).negative_outlier_factor_

# top-5 customer ids     Mahalanobis [731, 72, 76, 16, 587]    KNN [731, 72, 76, 587, 20]    LOF [731, 72, 16, 117, 792]
# customer 731 (fee 999) rank 1 by all three
# overlap of the top-20 sets:  Mah ∩ KNN 11   Mah ∩ LOF 8   KNN ∩ LOF 5   all three 5
# customer 72: tenure 43, fee 20.15, logins 31, tickets 3, discount 0     -- logins of 31 against a mean of 11.2 and sd 5.0: four sd out
# customer 16: tenure 52, fee 19.80, logins 16, tickets 4, discount 0     -- four tickets (Poisson mean 0.8) on a long-tenure Pro plan`,
      caption: "The detectors agree on the obvious row and on a quarter of the next twenty. Customer 72 is a genuine point anomaly (31 logins in 30 days); customer 16 is a combination anomaly — each column plausible, the combination rare — which is what Mahalanobis and LOF see and the raw KNN distance sees less." },

    { t: "p", text: "The disagreement is not a defect; the three detectors define 'normal' differently and each is right by its own definition. The operational questions are what the scores are for and who reads them. If the purpose is **data cleaning before modelling** (3.4), the target is rows whose values are impossible or corrupt — the £999 fee, a negative tenure — and the right tool is a rule written after looking at the flagged rows, not a detector's threshold: customer 72's 31 logins are real and belong in the training data. If the purpose is **surfacing cases for review** — fraud, abuse, a failing sensor — the output is a ranked queue sized to the reviewers, and the right evaluation is precision at that depth: of the top twenty rows this week, how many did the reviewers confirm? If the purpose is **monitoring** (11.1), the detector is fitted on a reference window and the metric is the rate of flagged rows over time, with an alert on the rate rather than on any single row. In none of the three cases is `df = df[score < threshold]` the answer." },

    { t: "ladder",
      title: "Removing 'outliers' from a training set",
      rungs: [
        { level: "bad", label: "z-score filter on every column", code: `df = df[(np.abs(stats.zscore(df[num])) < 3).all(axis=1)]`,
          note: "**Drops the legitimate tail of every skewed column, misses masked outliers, and — applied before the split — is fitted on test rows.** On the fee column it would remove the £999 and nothing else this time, and next quarter's second corrupt fee would hide the first." },
        { level: "ok", label: "Robust univariate rules, fitted on the training split, applied as a transformer", code: `mz = 0.6745 * (x - median_train) / mad_train           # flag |mz| > 3.5
# or the Winsorizer of 8.5: clip to the training 0.5 and 99.5 percentiles`,
          note: "Robust to masking, reproducible at inference, and the same on every row. Still univariate: the four-ticket long-tenure customer is invisible." },
        { level: "best", label: "Look at the flagged rows, then write the rule the data justifies", code: `flag = (mahalanobis > chi2.ppf(0.975, p)) | (lof > 1.5)
review(df[flag])          # 88 rows: the 999 fee is corrupt; the 31-login customer is real; the 4-ticket customer is real
df["fee_corrupt"] = df.monthly_fee > 100                # the rule that survives review, versioned with the pipeline`,
          note: "Detectors find candidates; a person decides which are errors and which are the interesting part of the population. The rule that results is explicit, documented and testable — and the customers who churn *because* they are unusual stay in the training set." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "On the fee column the £999 row has z = 31.15 and modified z = 254. Why is the modified z-score eight times larger for the same row?",
          options: [
            "The modified z-score uses a smaller multiplier",
            "The £999 row inflated the standard deviation that its own z-score is divided by (4.2 → 31.7); the MAD (2.62) was not moved by it",
            "The modified z-score is computed on the log of the fee",
            "The z-score uses n − 1 in the denominator"
          ],
          answer: 1,
          why: "The z-score's denominator is the sample sd, which the outlier raised from 4.216 to 31.667; the MAD is a median of absolute deviations and one extreme row cannot move it. Both flag this row; only the modified z survives a second outlier."
        },
        {
          stem: "In the LOF computation, point 4 at (5, 5) is 1.0 away from point 5 at (5, 6), yet its reachability distance to point 5 is 3.606. Why?",
          options: [
            "Reachability distance is measured in standardised units",
            "reach-dist(p, o) = max(k-distance(o), d(p, o)), and point 5's k-distance (its distance to its second neighbour, point 6) is 3.606",
            "A rounding error in the distance matrix",
            "LOF uses Manhattan distance"
          ],
          answer: 1,
          why: "The reachability distance floors the raw distance at the neighbour's own k-distance, so that a point deep inside a neighbour's neighbourhood is treated as being at the edge of it; this stabilises the density estimate. Point 5's second-nearest neighbour is point 6 at 3.606, and that becomes the floor."
        },
        {
          stem: "On the tight-plus-diffuse dataset, the planted point (1, 0) ranked 116th by KNN distance and 2nd by LOF. What property of the data explains the gap?",
          options: [
            "LOF uses more neighbours",
            "The two clusters have different densities, so one distance scale calls (1, 0) 'close' by the diffuse cluster's standard while LOF compares it with its own neighbours in the tight cluster",
            "The KNN score used the maximum instead of the mean distance",
            "The planted point is a duplicate"
          ],
          answer: 1,
          why: "A global distance score has one yardstick; the diffuse cluster's ordinary spread (sd 1.5) exceeds the planted point's 1.0 distance from the tight cluster (sd 0.2), so 115 ordinary diffuse rows outrank it. LOF's ratio is local, and a density 25 times lower than the neighbours' produces a high factor."
        },
        {
          stem: "Three planted rows that break a 0.85 correlation rank 8th, 13th and 30th by Euclidean distance from the centre and 1st, 2nd and 3rd by Mahalanobis. What does Mahalanobis use that Euclidean does not?",
          options: [
            "A robust mean",
            "The inverse covariance matrix, which makes distance across the ellipse's short axis cost more than distance along its long axis",
            "A χ² threshold",
            "Standardised features"
          ],
          answer: 1,
          why: "Euclidean distance on standardised features treats every direction alike, so a point 2.5 sd out on each axis is unremarkable among 1,000 rows; Σ⁻¹ scales directions by how much the data varies along them, and a direction perpendicular to a strong correlation has very little variance, so a small step in it is a large Mahalanobis distance."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Masking by hand, LOF with k = 3, and the churn table with and without its corrupt row",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For the series 10, 11, 12, 10, 11, 13, 12, 50, 52: compute the mean, sd, the z-score of each value, Grubbs' G for the most extreme value and its critical value at α = 0.05, and the modified z-scores. Then remove the 52 and run Grubbs again. Explain what you see." },
        { t: "p", text: "**(b)** Recompute the LOF table of §04 for the seven points with k = 3 instead of 2. Which point has the highest LOF now, and why did points 4 and 5 move so much? Check against `LocalOutlierFactor(n_neighbors=3)`." },
        { t: "p", text: "**(c)** On the five standardised churn columns, compute Mahalanobis distances with `EmpiricalCovariance` and `MinCovDet`, with and without the £999 row, and count rows above the χ²₅(0.975) threshold of 12.83. Report the top-5 ids in each of the four cases and explain the pattern." }
      ],
      requirements: [
        "(a) the statistics for both passes and a one-paragraph explanation of the first pass.",
        "(b) the k = 3 table, the new top LOF, and the sklearn check.",
        "(c) four counts, four top-5 lists, and the explanation."
      ],
      hint: "(a) Look at the sd before and after. (b) With k = 3, point 4's third neighbour is in the far cluster. (c) The empirical covariance's ellipse is stretched by the £999 row along the fee axis — what does that do to every other row's fee contribution?",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) mean 20.111, sd 17.546 (the two outliers hold 78 % of the sum of squares)
#     z-scores: [-0.58, -0.52, -0.46, -0.58, -0.52, -0.41, -0.46, 1.70, 1.82]  -- nothing above 3
#     Grubbs pass 1: G = 1.817 for the 52 vs critical 2.215  -> NOT flagged    (masking: the 50 inflates the sd)
#     modified z: median 12, MAD 1 -> [-1.3, -0.7, 0, -1.3, -0.7, 0.7, 0, 25.6, 27.0]  -> both flagged
#     remove 52 -> pass 2: G = 2.468 for the 50 vs 2.127 -> outlier;  pass 3: G = 1.541 vs 2.020 -> clean
#     contrast: the series with only the 50 present gives G = 2.468 vs 2.127 -> flagged at once.
#     Two outliers of similar size each hide the other from a test that uses the sd; the median-based score sees both.

# (b) k = 3
# point  k-dist  nbrs        reach-dists              lrd     LOF
#   0    1.414   [1, 2, 3]   [1.414, 1.414, 1.414]   0.707   1.000     (all four square points identical)
#   4    5.657   [5, 6, 3]   [6.403, 3.606, 5.657]   0.192   1.996
#   5    6.403   [4, 6, 3]   [5.657, 3.606, 6.403]   0.192   1.996
#   6    3.606   [3, 4, 2]   [2.828, 5.657, 3.606]   0.248   2.157
# sklearn LocalOutlierFactor(n_neighbors=3): [1.0, 1.0, 1.0, 1.0, 1.996, 1.996, 2.157]
# Point 6 is still the top at 2.16, but points 4 and 5 rose from 1.07 to 2.00: with k = 3 each must reach
# into the square for a third neighbour, so their lrd collapses (0.311 -> 0.192) while the square's lrd
# (0.707) enters their neighbour average. A pair of anomalies masks itself at k = 2 and not at k = 3.

# (c) χ²₅(0.975) = 12.83
#                     flagged   top-5 ids                    max d²
# with 999, empirical    34     [731, 72, 76, 587, 655]         857
# with 999, MinCovDet    88     [731, 72, 76, 16, 587]      136,000
# without,  empirical    49     [72, 76, 704, 328, 587]          25
# without,  MinCovDet    83     [72, 76, 16, 587, 20]            37
# The £999 row stretches the empirical covariance along the fee axis, which shrinks every other row's fee
# contribution to d² -- 34 flagged with it present, 49 once it is gone (the row was masking fifteen others).
# MinCovDet is nearly unchanged (88 vs 83, the same leading ids) because the £999 row was never in its half-sample.
# The ranks agree on 72, 76 and 587 in every case: those are the customers the data itself makes improbable.`,
        notes: [
          { t: "p", text: "(a) is the univariate masking effect; Grubbs' repeat-after-removal procedure only works if the first pass can find something, and the modified z-score is the practical fix." },
          { t: "p", text: "(b) shows that k is a statement about how many anomalies can sit together before they count as a cluster." },
          { t: "p", text: "(c) is the multivariate version of the same effect, and the reason the robust estimator is the default for outlier (as opposed to novelty) detection." }
        ]
      }
    }
  ],

  takeaways: [
    "Point, contextual and collective anomalies need different representations; outlier detection (contaminated training data) needs robust estimators where novelty detection (clean training data) does not.",
    "The z-score and Grubbs' test are judged against a standard deviation the outliers themselves inflate: the £999 fee raised it from 4.2 to 31.7, and two outliers of similar size hide each other (G = 1.82 vs 2.22). Median and MAD have a 50 % breakdown point and the modified z-score scored the same row at 254.",
    "IQR fences are robust and blunt: on a right-skewed column they flag the legitimate tail (£21.27) along with the corruption.",
    "Mahalanobis distance scales directions by the covariance, so correlation-breaking rows that rank 8th–30th by Euclidean distance rank 1st–3rd; d² ~ χ²_p gives a calibrated threshold; MinCovDet estimates the covariance from the tightest half of the data so the outliers cannot vote.",
    "The KNN distance and DBSCAN noise use one distance scale for the whole dataset; LOF compares each row's local reachability density with its neighbours', and a ratio of 1 means 'as dense as my neighbours'. Worked on seven points it matches scikit-learn exactly; on mixed densities it ranked a planted point 2nd where KNN ranked it 116th.",
    "k is the number of anomalies that can sit together before they look like a cluster: a pair scored 1.07 at k = 2 and 2.00 at k = 3.",
    "Detectors produce candidates for a person to inspect; the deliverable is a rule (fee > 100 is corrupt) or a ranked queue sized to review capacity, never a silent filter on the training set."
  ],

  quiz: {
    title: "Statistical and Distance Methods — Knowledge Check",
    questions: [
      {
        stem: "A fraud team fits `LocalOutlierFactor()` on last month's transactions and calls `.predict()` on today's. What happens?",
        options: [
          "It scores today's rows against last month's densities",
          "It raises an error: without novelty=True, LOF only scores its training rows via fit_predict and has no predict for new data",
          "It refits on today's rows automatically",
          "It returns the training scores"
        ],
        answer: 1,
        why: "scikit-learn separates outlier detection (score the training rows; the default) from novelty detection (novelty=True; score only new rows). The default estimator exposes fit_predict and negative_outlier_factor_ for the training data and no predict; the two modes exist because a detector fitted on contaminated data and one fitted on clean data should be used differently."
      },
      {
        stem: "Grubbs' test on the `support_tickets` column (a Poisson count with mean 0.8) gives G = 3.65 against a critical 4.00 and does not flag the count of 4. Is the test valid here?",
        options: [
          "Yes — it did not flag, so the column is clean",
          "No — Grubbs assumes a Gaussian; on a skewed count its α is not calibrated, and the non-flag is a coincidence of the numbers rather than a conclusion",
          "Yes — Grubbs is distribution-free",
          "No — Grubbs cannot be applied to integers"
        ],
        answer: 1,
        why: "The critical value comes from the t distribution under a normality assumption; on a right-skewed count the largest value is routinely several sd above the mean without being anomalous, and the test's false-positive rate is not the nominal α in either direction. The result should be read as 'not applicable', not 'no outlier'."
      },
      {
        stem: "Why does the reachability distance replace the raw distance in LOF's density estimate?",
        options: [
          "To make LOF symmetric",
          "To floor the distance at the neighbour's k-distance, so that points deep inside a dense neighbourhood all get the same density and the estimate does not fluctuate with tiny distances",
          "To convert distances into probabilities",
          "To speed up the neighbour search"
        ],
        answer: 1,
        why: "Without the floor, a point 0.01 from a neighbour would have an lrd 100 times that of a point 1.0 away, and the ratio would be dominated by chance proximity. Flooring at the neighbour's k-distance makes every point within a neighbour's k-neighbourhood equivalent, which is what the worked example shows: the four square points all have lrd exactly 1.0."
      },
      {
        stem: "Removing the £999 row raised the number of rows flagged by the empirical-covariance Mahalanobis rule from 34 to 49 while MinCovDet moved from 88 to 83. What is the mechanism?",
        options: [
          "MinCovDet is more sensitive to small changes",
          "The £999 row stretched the empirical covariance along the fee axis, deflating every other row's fee contribution to d² and masking fifteen rows; MinCovDet never included it in its half-sample",
          "The χ² threshold changed with n",
          "The empirical estimator had a random seed"
        ],
        answer: 1,
        why: "A single extreme value in one column inflates that column's variance in the sample covariance, which multiplies by the inverse — so every row's distance in that direction shrinks. The robust estimator fits the tightest half of the rows, which excludes the £999 row by construction, so its ellipse and its counts are almost the same with and without it."
      },
      {
        stem: "Which detector should a team use first for a 40-column table of continuous sensor readings, 200,000 rows, where normal operation has two known regimes (idle and load)?",
        options: [
          "Mahalanobis with MinCovDet, on the whole table",
          "A z-score per column",
          "LOF or a KNN score on standardised features fitted per regime — or with the regime as a feature — because two regimes make one ellipse wrong and a global scale wrong",
          "IQR fences per column"
        ],
        answer: 2,
        why: "Two regimes are two clusters, and a single Gaussian ellipse covers the gap between them and calls the gap normal; a global distance scale is set by the more diffuse regime. Conditioning on regime (score within each) or a local-density method handles it; the univariate rules ignore the 40-column combinations that sensor faults usually are. In 40 dimensions distance concentration is a concern, and 9.5's Isolation Forest is the next candidate."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Statistical and Distance Anomaly Detection",
    sub: "Definitions, the worked mechanics, and the judgement of when each method is wrong.",
    questions: [
      {
        level: "Core",
        q: "What is the difference between outlier detection and novelty detection, and why does it change the method?",
        strong: "Outlier detection fits on data that already contains the anomalies at an unknown rate and must find them in that same data, so every statistic it uses has to be robust to contamination — median and MAD rather than mean and sd, MinCovDet rather than the sample covariance, LOF's local ratio rather than a global scale. Novelty detection fits on data assumed clean and asks whether new rows resemble it, so the estimator can be sensitive and the threshold can be set from the clean training distribution. scikit-learn makes the split explicit: LOF by default only scores training rows, and with novelty=True only scores new ones. In practice the fraud case is outlier detection (last month's transactions include last month's fraud) and the manufacturing case is often novelty detection (a golden batch is known good).",
        answer: [
          { t: "p", text: "Contaminated versus clean training data; robust estimators for the first; the API split; a concrete case of each." }
        ]
      },
      {
        level: "Core",
        q: "Explain masking with a concrete example.",
        strong: "Masking is when one outlier hides another from a test that uses the mean and standard deviation. Take 10, 11, 12, 10, 11, 13, 12, 50, 52: the sd is 17.5 because of the two large values, so the 52 has z = 1.82 and Grubbs' G = 1.82 against a critical 2.22 — not flagged. If the 52 alone were present, or if I remove it by hand, the 50 is flagged immediately (G = 2.47 vs 2.13). The modified z-score uses the median (12) and MAD (1), which the two outliers cannot move, and scores them 25.6 and 27.0. The multivariate version is the same: a single £999 fee in the churn data stretched the sample covariance so that fifteen other rows dropped below the Mahalanobis threshold, and a robust covariance was unaffected.",
        answer: [
          { t: "p", text: "The definition, the worked series with numbers, the robust alternative, and the multivariate analogue." }
        ]
      },
      {
        level: "Senior",
        q: "Walk me through how LOF is computed and what its score means.",
        strong: "Four steps. For each point, its k-distance is the distance to its k-th nearest neighbour. The reachability distance from p to a neighbour o is max(k-distance(o), d(p, o)) — the raw distance floored at o's k-distance, so points deep inside o's neighbourhood are all treated as being at its edge, which keeps the estimate stable. The local reachability density of p is the inverse of the mean reachability distance to its k neighbours. LOF is the mean of the neighbours' densities divided by p's own. A ratio near 1 means the point is as dense as its neighbours — an inlier, whatever its absolute distances; well above 1 means its neighbours are much denser than it, an outlier by local standards; below 1 is a point denser than its surroundings, the centre of a tight cluster. On seven points with k = 2, a point between a dense square and a sparse pair scored 1.85 while the sparse pair scored 1.07, because the pair's neighbours were as sparse as they were. The choice of k is how many anomalies may sit together before they count as a cluster: at k = 3 that pair scored 2.00.",
        answer: [
          { t: "p", text: "k-distance, reachability distance and why it is floored, lrd, the ratio, the meaning of 1 / above / below, the worked numbers, and k." }
        ]
      },
      {
        level: "Senior",
        q: "When would you prefer Mahalanobis to LOF, and when the reverse?",
        strong: "Mahalanobis when the normal population is roughly one elliptical blob in a modest number of continuous features: it is closed-form, cheap on millions of rows, has a calibrated χ² threshold, and with MinCovDet it is robust to contamination. It fails on multi-modal data (one ellipse covers the gap between clusters), curved structure, and high dimension where p(p+1)/2 covariance parameters are poorly estimated. LOF when the data has clusters of different density or non-linear structure, since it compares each point with its own neighbourhood; it costs a neighbour search, has no calibrated threshold, loses meaning as distances concentrate in high dimension, and needs features scaled and k chosen. In the executed comparison the two agreed on the top row and on 8 of their top 20 on the churn columns — the disagreement is the two definitions of normal, and I would show reviewers both queues before choosing.",
        answer: [
          { t: "p", text: "Conditions favouring each, the failure modes of each, and the fact that they define normal differently." }
        ]
      },
      {
        level: "Staff",
        q: "A colleague proposes dropping every training row with |z| > 3 on any column before fitting the churn model. What do you say?",
        strong: "Three objections and a replacement. First, the rule is fitted on the whole table including the test rows, which leaks the test distribution into a preprocessing decision — it must be fitted on the training split and applied as a transformer. Second, it is not robust: the sd it uses is inflated by the very rows it is meant to find, so a second corrupt fee would hide the first, and on skewed columns like tickets it removes the legitimate tail — the customers with four tickets are exactly the churners the model needs to see. Third, it conflates two goals: removing corrupt values (the £999 fee, which is a data-entry fault) and removing unusual customers (31 logins, which is real behaviour and predictive). The replacement is to run robust detectors — modified z per column, MinCovDet Mahalanobis or LOF across columns — as a *review* step, look at the 80-odd flagged rows, and write explicit rules for the corruptions found (fee > 100 is invalid), versioned with the pipeline and covered by a test; unusual-but-real rows stay. If a model needs protection from heavy tails, that is the Winsorizer's job, fitted on training quantiles, not a deletion.",
        answer: [
          { t: "p", text: "Leakage, non-robustness and skew, the corrupt-versus-unusual distinction, and the review-then-rule replacement." }
        ]
      }
    ]
  }
});
