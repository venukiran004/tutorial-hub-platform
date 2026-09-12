/* ============================================================================
   LESSON 2.6 — Ranking, Clustering and Fairness Metrics
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**Three problems where the confusion matrix does not apply: a search engine returns a list, a clustering returns groups with no labels to check against, and a fairness audit asks whether the same model treats two groups the same.** Each has its own metrics, and each is worked here on small numbers — NDCG on a five-item list, the silhouette of one point, four fairness rates across four regions — before being run on the course data. The lesson closes with the two charts the business reads instead of AUC, gain and lift by decile, and the C-index that connects classification to survival.",

  objectives: [
    "Compute MRR, precision@k, recall@k, hit rate, average precision and NDCG@k by hand for a ranked list",
    "Compute silhouette, Davies–Bouldin and Calinski–Harabasz without labels and ARI and NMI with them, and read them across k",
    "Compute demographic parity, equal opportunity, equalised odds and predictive parity per group, and explain why they cannot all hold when base rates differ",
    "Build a gain and lift table by decile and explain the C-index"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Ranking: the list is the prediction", id: "ranking" },

    { t: "p", text: "A recommender or search engine is judged on the order it returns. Three queries, each with five results graded 0 (irrelevant) to 3 (perfect): **q1 = [3, 2, 0, 1, 0], q2 = [0, 0, 3, 0, 1], q3 = [1, 0, 0, 0, 0]**. Every metric below rewards putting relevant items early; they differ in whether they use grades or just relevant/not, and in how steeply they discount position." },

    { t: "code", lang: "text", title: "Every ranking metric on the three lists (executed)",
      code: `DCG@k = Σ_i (2^rel_i - 1) / log2(i + 1)         gain from grades, discounted by position;   NDCG = DCG / DCG of the ideal order

q1  [3, 2, 0, 1, 0]   DCG (7/1 + 3/1.585 + 0 + 1/2.32 + 0) = 9.323    ideal [3,2,1,0,0] IDCG 9.393    NDCG@5 0.993      <- nearly ideal: the 1 is one slot late
q2  [0, 0, 3, 0, 1]   DCG (7/2 + 1/2.585) = 3.887                    ideal [3,1,0,0,0] IDCG 7.631    NDCG@5 0.509      <- the perfect item in slot 3 costs half
q3  [1, 0, 0, 0, 0]   DCG 1.000                                        IDCG 1.000                      NDCG@5 1.000      <- one weak result, in the right place: perfect

binary metrics (relevant = grade > 0):
           first relevant    reciprocal rank    precision@3    recall@3    average precision    hit@3
q1              1                1.000             0.667         0.667          0.917             1
q2              3                0.333             0.333         0.500          0.367             1
q3              1                1.000             0.333         1.000          1.000             1

MRR  = mean reciprocal rank = (1 + 0.333 + 1) / 3 = 0.778          MAP = mean of the three APs = 0.761       hit rate@3 = 3/3
(scikit-learn's ndcg_score uses linear gains rel_i by default rather than 2^rel - 1; on q1 that gives 0.985)`,
      caption: "q3 is the instructive one: NDCG and AP give it a perfect score for one weak item in first place, and precision@3 gives it 0.333. NDCG asks 'how close to the best possible order for *this* query'; precision@k asks 'how many of the top k were relevant'. MRR only cares where the first relevant item is — the metric for 'did the user find the thing'. Choose by what the interface shows: a single answer box wants MRR, a page of ten wants precision@10 or NDCG@10, a 'you might also like' strip wants hit rate@k."
    },

    { t: "dl", items: [
      ["Precision@k / recall@k", "Of the top k, how many are relevant / of all relevant items, how many are in the top k. Binary relevance."],
      ["Hit rate@k", "1 if any relevant item is in the top k. Averaged over users, the share who were shown something they wanted."],
      ["MRR", "Mean over queries of 1 / (rank of the first relevant item). For one-answer tasks."],
      ["Average precision, MAP", "Precision at each relevant position, averaged; MAP averages over queries. Position-sensitive, binary."],
      ["NDCG@k", "Graded relevance, discounted by log₂(position + 1), normalised by the ideal ordering. The standard for search and recommendation."],
      ["Silhouette", "For a point: (b − a) / max(a, b), where a is the mean distance to its own cluster and b to the nearest other. −1 to 1; averaged over points."],
      ["Davies–Bouldin", "Mean over clusters of the worst ratio (spread of this + spread of that) / (distance between centroids). Lower is better."],
      ["Calinski–Harabasz", "Between-cluster dispersion over within-cluster dispersion, scaled by degrees of freedom. Higher is better; favours convex, similar-sized clusters."],
      ["ARI, NMI", "Agreement between a clustering and known labels, corrected for chance (ARI) or as normalised mutual information (NMI). 0 for random labels, 1 for a perfect match up to relabelling."]
    ]},

    { t: "h2", n: "02", text: "Clustering: scoring without labels, and with them", id: "clustering" },

    { t: "code", lang: "text", title: "Three blobs (one wide), k-means at four values of k (executed)",
      code: `k     silhouette   Davies-Bouldin   Calinski-Harabasz     ARI      NMI          (ARI and NMI use the true blob labels)
2       0.554          0.645              805              0.538    0.648
3       0.650          0.529             1697              0.923    0.905        <- all five agree: three clusters
4       0.581          0.803             1469              0.820    0.837
6       0.464          0.890             1216              0.657    0.741

one point's silhouette by hand:   a = 2.786 (mean distance to its own cluster)   b = 3.886 (to the nearest other)
                                  s = (3.886 - 2.786) / 3.886 = 0.283           <- near a boundary; a point deep inside a cluster scores near 1

random labels against the truth:  ARI -0.003   NMI 0.004                         <- both are chance-corrected: noise scores zero
the plan recovery from 1.1 (k-means on fee and logins):   ARI 0.847   NMI 0.793   silhouette 0.528`,
      caption: "The three internal metrics — silhouette, DB, CH — need no labels and are what you have in practice; they agreed here because the blobs are round and separated, which is the case they are built for. Elongated or nested clusters break all three (7.2 shows DBSCAN finding what they cannot score). ARI and NMI need labels, so they are for validating a method on data where the truth is known, or for measuring how well an unsupervised grouping matches a business category — the plan-recovery number is that use."
    },

    { t: "h2", n: "03", text: "Fairness: the same model, four regions", id: "fairness" },

    { t: "p", text: "A fairness audit takes the deployed operating point and computes the confusion-matrix rates **within each group**. The churn model at threshold 0.2, by region, on the held-out set:" },

    { t: "table",
      head: ["region", "n", "base rate", "flag rate", "TPR (recall)", "FPR", "precision"],
      rows: [
        ["east", "56", "0.196", "0.321", "0.727", "0.222", "0.444"],
        ["north", "90", "0.189", "0.389", "0.706", "0.315", "0.343"],
        ["south", "93", "0.140", "0.301", "0.615", "0.250", "0.286"],
        ["west", "58", "0.121", "0.379", "0.714", "0.333", "0.227"]
      ]
    },

    { t: "table",
      head: ["Criterion", "Requires equal…", "Here", "What it protects"],
      rows: [
        ["Demographic parity", "Flag rate across groups", "0.30 – 0.39: west is flagged more than south despite a lower base rate", "Equal share of the intervention, whatever the outcome"],
        ["Equal opportunity", "TPR across groups", "0.62 – 0.73: south's churners are found less often", "Equal chance of the benefit for those who need it"],
        ["Equalised odds", "TPR and FPR across groups", "FPR 0.22 – 0.33", "Equal error rates of both kinds"],
        ["Predictive parity (calibration by group)", "Precision across groups", "0.23 – 0.44: a flag means more in east than in west", "A flag means the same thing whoever receives it"]
      ]
    },

    { t: "code", lang: "text", title: "Why they cannot all hold: the impossibility result on two numbers",
      code: `precision = TPR · prevalence / (TPR · prevalence + FPR · (1 - prevalence))

east:  TPR 0.727, FPR 0.222, prevalence 0.196  ->  precision = 0.1425 / (0.1425 + 0.1785) = 0.444
west:  TPR 0.714, FPR 0.333, prevalence 0.121  ->  precision = 0.0864 / (0.0864 + 0.2927) = 0.228

hold TPR and FPR equal across the two groups (equalised odds) and precision STILL differs, because prevalence differs.
hold precision equal (predictive parity) and TPR or FPR must differ. When base rates differ between groups, no threshold
satisfies equalised odds and predictive parity at once, except a perfect classifier. That is the theorem; the audit is
choosing which one to satisfy, and saying so.`,
      caption: "The audit's output is not a pass/fail; it is the table plus a decision about which criterion the intervention should satisfy. Retention offers might reasonably aim at equal opportunity (find churners equally well in every region); a loan decision is usually held to predictive parity (a score of 0.3 means 0.3 for everyone); a hiring screen to demographic parity. Whichever is chosen, the others will not hold, and the table shows by how much (11.7 has the mitigation side)."
    },

    { t: "h2", n: "04", text: "Gain, lift and the C-index", id: "gain" },

    { t: "code", lang: "text", title: "The churn model's held-out set, sorted by score and cut into deciles (executed)",
      code: `decile    n    churners    cumulative churners    cumulative gain    share of population    lift
  1      30      16              16                   0.333               0.101              3.30       <- the top 10 % holds a third of the churners
  2      30      10              26                   0.542               0.202              2.68
  3      29       4              30                   0.625               0.300              2.09
  4      30       5              35                   0.729               0.401              1.82
  5      30       6              41                   0.854               0.502              1.70       <- calling half the base reaches 85 % of churners
  6      29       1              42                   0.875               0.599              1.46
  7      30       3              45                   0.938               0.700              1.34
  8      29       0              45                   0.938               0.798              1.18
  9      30       3              48                   1.000               0.899              1.11
 10      30       0              48                   1.000               1.000              1.00

C-index = 0.789 = the ROC-AUC: for a binary outcome the concordance index is exactly AUC`,
      caption: "The gain chart answers the question the retention team actually has — *if we call the top x %, what share of churners do we reach?* — and lift is the same thing relative to random calling: 3.3× in the first decile. Both read straight off the sorted scores with no threshold and no metric vocabulary. The C-index is AUC generalised: the probability that of two rows, the one with the higher score has the earlier event; for survival data with censoring it counts only comparable pairs, which is why it is the standard for time-to-event models (11.2 mentions Cox regression)."
    },

    { t: "viz",
      title: "Cumulative gain against the random line",
      caption: "Every point is a decile of the score-sorted population. The distance above the diagonal is the model's value: at 50 % of the population it reaches 85 % of churners. The area between the curve and the diagonal is proportional to Gini = 2·AUC − 1.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Cumulative gain chart: share of churners reached against share of population contacted, a concave curve above the diagonal, with the fifth decile marked at 50 percent population and 85 percent churners.">
  <defs>
    <marker id="ac-ah-26" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="100" y1="260" x2="620" y2="260" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-26)"/>
  <line x1="100" y1="260" x2="100" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-26)"/>
  <line x1="100" y1="260" x2="600" y2="40" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
  <!-- x = 100 + 500*pop ; y = 260 - 220*gain -->
  <polyline points="100,260 150,187 201,141 250,123 300,100 351,72 400,68 450,54 499,54 550,40 600,40" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <g style="fill:var(--accent)"><circle cx="150" cy="187" r="3"/><circle cx="201" cy="141" r="3"/><circle cx="250" cy="123" r="3"/><circle cx="300" cy="100" r="3"/><circle cx="351" cy="72" r="4.5"/><circle cx="400" cy="68" r="3"/><circle cx="450" cy="54" r="3"/><circle cx="499" cy="54" r="3"/><circle cx="550" cy="40" r="3"/></g>
  <line x1="351" y1="72" x2="351" y2="260" style="stroke:var(--accent)" stroke-width="1" stroke-dasharray="2 3"/>
  <g class="s-sub" text-anchor="middle">
    <text x="100" y="278">0</text><text x="351" y="278">50 %</text><text x="600" y="278">100 %</text>
    <text x="350" y="294">share of customers contacted, best-scored first</text>
    <text x="70" y="264">0</text><text x="70" y="150">50 %</text><text x="70" y="45">100 %</text>
    <text x="45" y="150" transform="rotate(-90 45 150)">share of churners reached</text>
  </g>
  <g class="s-sub">
    <text x="365" y="66" style="fill:var(--accent)">decile 5: 50 % contacted, 85 % reached</text>
    <text x="640" y="120">lift in decile 1: 3.3×</text>
    <text x="640" y="140">Gini = 2 × 0.789 − 1 = 0.58</text>
    <text x="640" y="180" style="fill:var(--ink-3)">random contact: the diagonal</text>
  </g>
</svg>`
    },

    { t: "callout", kind: "production", title: "The business reads the gain chart; the model card reads the fairness table", body: [
      { t: "p", text: "Gain and lift are the two numbers a marketing or retention team will adopt without training — 'top 20 % gives 54 % of churners' is a sentence anyone can act on. The fairness table is what a reviewer, a regulator or a model card needs, and it must be computed at the deployed threshold, per group, on held-out data, with the criterion the team chose stated next to it. **Both are cheap; neither is optional for a model that acts on people.**" }
    ]},

    { t: "ladder",
      title: "Evaluating a 'you might also like' recommender",
      rungs: [
        { level: "bad", label: "Accuracy of predicted ratings", code: `rmse(rating_true, rating_pred)                         # on the ratings users happened to give`,
          note: "**Measures the wrong thing on the wrong rows**: users rate what they chose to watch, and the interface shows a strip, not a number." },
        { level: "ok", label: "Precision@10 on held-out interactions", code: `precision_at_k(recommended[:10], held_out_clicks)`,
          note: "**Right unit — the strip — and binary relevance.** Blind to whether the good items were first or tenth, and to how many good items existed." },
        { level: "best", label: "NDCG@10 and hit rate@10 offline, then the online metric", code: `ndcg_at_k(recommended, graded_relevance, 10); hit_rate_at_k(recommended, held_out, 10)
# then an A/B test on click-through or watch time: offline ranking metrics are proxies (11.1)`,
          note: "**Position-aware, graded, and honest about being a proxy.** The offline metric chooses candidates; the online experiment chooses the winner." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Three metric families, one afternoon",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For the ranked list [0, 3, 1, 0, 2, 0] compute DCG@6, IDCG@6, NDCG@6, reciprocal rank, precision@3, recall@3 and average precision by hand, then confirm with code. **(b)** Generate two half-moons (`make_moons`, noise 0.1) and compare k-means with k = 2 against DBSCAN by silhouette, Davies–Bouldin and ARI against the true moon labels; explain the disagreement between the internal metrics and ARI. **(c)** On the churn model, compute the fairness table by `plan` instead of region, at the 2.3 cost-optimal threshold of 0.15, and state which criterion a retention programme should adopt and which groups fail it." }
      ],
      requirements: [
        "Seven hand-computed numbers for (a), matching code.",
        "The (b) table with a two-sentence explanation of why silhouette prefers the wrong answer.",
        "The (c) table and a stated criterion with the groups that violate it."
      ],
      hint: "(b): DBSCAN finds the two crescents (ARI near 1) but each crescent is long and thin, so its silhouette is poor; k-means cuts the moons in half with a straight line, which scores well on silhouette and badly on ARI. Internal metrics assume convex clusters.",
      solution: {
        lang: "python",
        title: "three_families.py",
        code: `# (a) [0, 3, 1, 0, 2, 0]
# DCG@6  = 0 + 7/log2(3) + 1/log2(4) + 0 + 3/log2(6) + 0 = 7/1.585 + 1/2 + 3/2.585 = 4.416 + 0.500 + 1.161 = 6.077
# ideal  = [3, 2, 1, 0, 0, 0]: IDCG = 7/1 + 3/1.585 + 1/2 = 7 + 1.893 + 0.5 = 9.393          NDCG@6 = 6.077 / 9.393 = 0.647
# first relevant at position 2 -> RR 0.500 ;  precision@3 = 2/3 = 0.667 ;  recall@3 = 2/3 relevant items = 0.667
# AP = mean of precision at relevant positions: at 2 -> 1/2, at 3 -> 2/3, at 5 -> 3/5  ->  (0.5 + 0.667 + 0.6) / 3 = 0.589

# (b)
from sklearn.datasets import make_moons
from sklearn.cluster import KMeans, DBSCAN
X, y = make_moons(600, noise=0.1, random_state=0)
for name, lab in [("k-means k=2", KMeans(2, n_init=10, random_state=0).fit_predict(X)), ("DBSCAN eps=0.15", DBSCAN(eps=0.15, min_samples=5).fit_predict(X))]:
    m = lab != -1                                                   # DBSCAN's noise points (label -1) are excluded from the internal metrics
    print(name, round(silhouette_score(X[m], lab[m]), 3), round(davies_bouldin_score(X[m], lab[m]), 3), round(adjusted_rand_score(y, lab), 3))
# executed:
# k-means k=2:     silhouette 0.477   DB 0.798   ARI 0.245    -- a straight cut through both moons: compact halves, wrong clusters
# DBSCAN eps=0.15: silhouette 0.325   DB 1.173   ARI 0.997    -- the true crescents (one noise point): correct, but each is long and thin
#                                                                (eps = 0.2 already merges the two moons into one cluster: eps is sensitive, 7.2)
# silhouette and DB reward compact, round, well-separated groups; the moons are neither compact nor round, so the metrics prefer
# the geometrically tidy wrong answer. Without labels, the only defence is to look at the clusters and to know what the metric assumes.

# (c) fairness by plan at threshold 0.15
t = pd.DataFrame({"plan": X_test.plan.values, "y": y_test.values, "pred": (p >= 0.15).astype(int)})
t.groupby("plan").apply(lambda s: pd.Series({"n": len(s), "base": s.y.mean(), "flag rate": s.pred.mean(),
                                             "TPR": s[s.y == 1].pred.mean(), "FPR": s[s.y == 0].pred.mean(), "precision": s[s.pred == 1].y.mean()}))
# executed at threshold 0.15:
#   plan     n    base rate   flag rate   TPR     FPR     precision
#   basic   152    0.224       0.645     0.853   0.585    0.296
#   plus    101    0.129       0.406     0.846   0.341    0.268
#   pro      44    0.023       0.000     0.000   0.000      --        <- one churner in 44; nobody on pro is ever flagged
# A retention programme is a benefit, so the natural criterion is equal opportunity: churners in every plan found at the same rate.
# basic and plus satisfy it (0.853 vs 0.846); pro fails it completely -- its single churner is missed, because pro's base rate is so low
# that no pro customer's score reaches 0.15. Demographic parity fails widely (0.645 vs 0.406 vs 0.000). Predictive parity is close for
# basic and plus (0.296 vs 0.268) and undefined for pro. Mitigation would be a plan-specific threshold for pro -- and honesty that
# with one churner in 44 rows, pro's numbers are not measurable at this sample size.`,
        notes: [
          { t: "p", text: "**(a)'s AP of 0.589 against NDCG of 0.647** shows the two position-sensitive metrics disagreeing mildly: NDCG credits the grade-3 item heavily wherever it sits; AP only sees relevant/not." },
          { t: "p", text: "**(b) is the most important thing to know about internal clustering metrics**: they encode an assumption about cluster shape, and a high silhouette for the wrong answer is common on real data. 7.3 returns to this." },
          { t: "p", text: "**(c) requires a choice before a number**: which criterion suits an intervention that is a benefit. The table cannot make that choice; it can only show the consequences of each." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Equalised odds holds exactly between two regions with base rates 0.196 and 0.121. Can precision be equal too?",
          options: [
            "Yes, if the threshold is tuned",
            "No: precision = TPR·prev / (TPR·prev + FPR·(1 − prev)), so with TPR and FPR fixed and prevalence different, precision differs — the impossibility result; only a perfect classifier or equal base rates escape it",
            "Yes, with calibration",
            "Only if the groups are the same size"
          ],
          answer: 1,
          why: "The executed east/west rows gave 0.444 against 0.228 from nearly equal TPR and FPR. The audit must choose which criterion to satisfy."
        }
      ]
    }
  ],

  takeaways: [
    "**Ranking metrics reward relevant items early**: MRR for one-answer tasks, precision/recall/hit rate@k for a page, NDCG@k when relevance is graded.",
    "**NDCG normalises by the ideal order for that query**; a single weak item in first place scores 1.0.",
    "**Silhouette, Davies–Bouldin and Calinski–Harabasz need no labels and assume convex, separated clusters**; they can prefer the wrong answer on moons.",
    "**ARI and NMI need labels and are chance-corrected** — random labels score zero.",
    "**A fairness audit is the confusion-matrix rates per group at the deployed threshold**: flag rate (demographic parity), TPR (equal opportunity), TPR and FPR (equalised odds), precision (predictive parity).",
    "**When base rates differ, equalised odds and predictive parity cannot both hold** — choose the criterion that fits the intervention and state it.",
    "**Gain and lift by decile are what the business reads**: the top 10 % held a third of the churners; lift 3.3×.",
    "**C-index = AUC for binary outcomes**, and the survival generalisation that handles censoring; Gini = 2·AUC − 1.",
    "**Offline ranking metrics are proxies**; the online experiment decides."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A list [1, 0, 0, 0, 0] scores NDCG@5 = 1.0 and precision@3 = 0.33. Which is right?",
        options: [
          "NDCG is wrong; the list is poor",
          "Both answer different questions: NDCG asks how close the order is to the best possible order for this query (perfect — there was only one relevant item and it is first); precision@3 asks how many of the top three were relevant (one). For a query with one answer, MRR or NDCG is the honest metric",
          "Precision is wrong",
          "They should always agree"
        ],
        answer: 1,
        why: "Metric choice for ranking depends on what the interface shows and how many relevant items exist; normalised metrics handle the second, k-metrics the first."
      },
      {
        stem: "Why can silhouette prefer k-means' straight cut through two moons over DBSCAN's correct crescents?",
        options: [
          "DBSCAN is worse",
          "Silhouette rewards points being close to their own cluster and far from the nearest other; a crescent is long, so its points are far from each other, while a straight cut makes compact halves — the metric assumes convex clusters and scores the tidy wrong answer higher",
          "Because of noise",
          "Silhouette needs labels"
        ],
        answer: 1,
        why: "Internal metrics encode a geometric assumption. ARI against known labels showed the truth (~1.0 for DBSCAN, ~0.24 for k-means)."
      },
      {
        stem: "Which fairness criterion should a retention-offer programme most naturally satisfy, and why?",
        options: [
          "Demographic parity, so every region gets equal offers",
          "Equal opportunity — churners in every group should be found at the same rate — because the intervention is a benefit and the harm is a missed churner; the audit showed south's churners found at 0.615 against 0.727 for east",
          "Predictive parity",
          "None; fairness is for lending"
        ],
        answer: 1,
        why: "The criterion follows from what the model does to people. A loan denial suggests predictive parity; a screening benefit suggests equal opportunity; the table shows the violations of each."
      },
      {
        stem: "What does 'lift 3.3 in the first decile' mean?",
        options: [
          "The model is 3.3 times more accurate",
          "The top 10 % of customers by score contain 3.3 times as many churners as a random 10 % would — 16 of 48 churners in 30 of 297 customers",
          "Recall is 0.33",
          "The threshold is 0.33"
        ],
        answer: 1,
        why: "Lift is cumulative gain divided by population share; it is the ranking's value in the language of a targeting budget."
      },
      {
        stem: "How does the C-index relate to AUC?",
        options: [
          "They are unrelated",
          "For a binary outcome they are identical — the probability that the higher-scored of a pair has the event; for survival data the C-index counts only pairs whose order is known despite censoring, which is why it is the standard time-to-event metric",
          "C-index is AUC squared",
          "C-index is for regression"
        ],
        answer: 1,
        why: "The executed C-index was 0.789, the model's AUC. Concordance is the pair-counting definition of AUC from 2.2, extended to censored pairs."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you evaluate a recommendation system?",
        strong: "Offline first, on held-out interactions per user, with ranking metrics that match the interface: hit rate and precision at k for a strip of k items, NDCG at k when relevance is graded and position matters, MRR when the user wants one thing. I would report them against a popularity baseline, because a recommender that cannot beat 'most popular' is not recommending. I would also look at coverage and diversity, since a system that recommends the same twenty items to everyone can score well on precision. Then, because offline metrics are proxies computed on what users happened to see, the decision is made by an online A/B test on the business metric — click-through, watch time, retention — with the offline metric used to choose which candidates are worth testing.",
        answer: [
          { t: "p", text: "Metric matched to interface, the popularity baseline, coverage, and offline-as-proxy — the four things that show you have built one." }
        ]
      },
      {
        level: "core",
        q: "How do you evaluate clustering when there are no labels?",
        strong: "With internal metrics — silhouette, Davies–Bouldin, Calinski–Harabasz — which score how compact and separated the clusters are, computed across candidate values of k; on well-separated round clusters they agree and point at the right k. But each assumes convex clusters, so on elongated or nested shapes they can prefer a geometrically tidy wrong answer — k-means cutting two moons in half scores better on silhouette than DBSCAN finding the actual crescents. So I pair them with a stability check — does the clustering survive resampling — with a look at the clusters in a projection, and with any external signal available: if there is a business category the clusters should relate to, ARI or NMI against it, which are chance-corrected and score zero for noise. The clusters also have to mean something to whoever uses them; a segment nobody can describe is not a result.",
        answer: [
          { t: "p", text: "Internal metrics with their assumption stated, the moons counter-example, stability, and external validation." }
        ]
      },
      {
        level: "advanced",
        q: "How do you audit a model for fairness, and what do you do when the criteria conflict?",
        strong: "At the deployed threshold, on held-out data, compute the confusion-matrix rates within each protected group: the flag rate for demographic parity, the true-positive rate for equal opportunity, both TPR and FPR for equalised odds, and precision — or calibration by group — for predictive parity. They will conflict whenever the groups' base rates differ: precision is a function of TPR, FPR and prevalence, so equalising the first two forces precision apart, and vice versa; that is a theorem, not a modelling failure. So the audit is a decision: which criterion fits what the model does to people. A benefit like a retention offer or a screening programme usually calls for equal opportunity; a decision that must mean the same thing for everyone, like a risk score shown to a lender, calls for predictive parity; a resource allocation may call for parity of flag rates. I would state the chosen criterion, show the table for all of them, quantify the gaps, and then consider mitigation — group-specific thresholds, reweighting, or removing proxy features — while re-running the table after each change, because fixing one criterion moves the others.",
        answer: [
          { t: "p", text: "The per-group rates, the impossibility explained through the precision formula, the criterion-by-intervention mapping, and mitigation with re-audit." }
        ]
      }
    ]
  }
});
