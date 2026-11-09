/* ============================================================================
   LESSON 13.5 — Case Studies: Recommendations, Fraud, Ranking, Ads
   ========================================================================= */
EC.receiveLesson({
  id: "13.5",

  lede: "Four systems come up again and again in ML design interviews and in practice: recommendations, fraud detection, search ranking and ads. They share a toolbox (features, a model, a serving path, a feedback loop) but each one turns on a different constraint. Recommendations are a problem of scale, solved by a funnel. Fraud is a problem of latency and of labels that arrive weeks late. Ranking learns from clicks that the previous ranker caused. Ads need probabilities that are right in absolute terms, because money is computed from them. This lesson measures the one mechanism each design depends on.",

  objectives: [
    "Design a retrieval-then-ranking funnel and size each stage",
    "Lay out a latency budget for a synchronous fraud decision and plan around label delay",
    "Correct click logs for position bias, and know why the correction needs clipping",
    "Calibrate a CTR model trained on downsampled data, and explain why ads need it",
    "Recognise which of the four constraints dominates a new problem"
  ],

  prerequisites: ["13.1", "13.2", "13.3", "13.4"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "recsys",
      text: "Recommendations: the funnel",
      sub: "Cheap and broad, then expensive and narrow" },
    { t: "p",
      text: "A catalogue of a million items cannot be scored by a heavy model for every request. The standard design is a funnel. **Retrieval** uses a two-tower model: users and items are embedded separately, item vectors are indexed offline, and an approximate nearest-neighbour search returns a few hundred candidates in about a millisecond. **Ranking** scores those candidates with a much richer model that sees cross features (this user with this item), fetched from the feature store. **Re-ranking** applies diversity, freshness, business rules and policy filters to the top few dozen." },
    { t: "viz",
      title: "A recommendation funnel",
      caption: "Each stage cuts the candidate set by about ten times and can afford a model about ten times more expensive per item.",
      svg: `<svg viewBox="0 0 760 215" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="140.0" y1="56.0" x2="190.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="340.0" y1="56.0" x2="390.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="365.0" y="50.0" text-anchor="middle" class="s-sub">500</text>
<line x1="540.0" y1="56.0" x2="590.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="565.0" y="50.0" text-anchor="middle" class="s-sub">50</text>
<line x1="465.0" y1="150.0" x2="465.0" y2="82.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="75.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Catalogue</text>
<text x="75.0" y="70" text-anchor="middle" class="s-sub">1,000,000 items</text>
<rect x="190" y="30" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="265.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Retrieval</text>
<text x="265.0" y="70" text-anchor="middle" class="s-sub">ANN, two-tower</text>
<rect x="390" y="30" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="465.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--violet)">Ranking</text>
<text x="465.0" y="70" text-anchor="middle" class="s-sub">heavy model</text>
<rect x="590" y="30" width="160" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="670.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">Re-ranking</text>
<text x="670.0" y="70" text-anchor="middle" class="s-sub">diversity, policy</text>
<rect x="390" y="150" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="465.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--good)">Feature store</text>
<text x="465.0" y="190" text-anchor="middle" class="s-sub">user + item features</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "funnel.py — exact against approximate retrieval over 1M items",
      code: `import time
import numpy as np, faiss
rng = np.random.default_rng(0)

# Two-tower embeddings: 1,000,000 items in a 64-dimensional space. Real embeddings cluster (genres, topics),
# so items are drawn around 2,000 topic centres; a user vector sits near the topics they like.
N, D, T = 1_000_000, 64, 2_000
centres = rng.normal(size=(T, D)).astype("float32")
items = (centres[rng.integers(0, T, N)] + 0.6 * rng.normal(size=(N, D))).astype("float32"); faiss.normalize_L2(items)
users = (centres[rng.integers(0, T, 200)] + 0.6 * rng.normal(size=(200, D))).astype("float32"); faiss.normalize_L2(users)

exact = faiss.IndexFlatIP(D); exact.add(items)
t = time.perf_counter(); _, truth = exact.search(users, 500); t_exact = (time.perf_counter() - t) / len(users)

quant = faiss.IndexFlatIP(D)
ann = faiss.IndexIVFFlat(quant, D, 1024, faiss.METRIC_INNER_PRODUCT)
ann.train(items[:100_000]); ann.add(items)
print(f"exact search over 1M items: {1000 * t_exact:.1f} ms per user")
for nprobe in (4, 16, 64):
    ann.nprobe = nprobe
    t = time.perf_counter(); _, got = ann.search(users, 500); t_ann = (time.perf_counter() - t) / len(users)
    recall = np.mean([len(set(g) & set(tr)) / 500 for g, tr in zip(got, truth)])
    print(f"IVF nprobe={nprobe:<3} {1000 * t_ann:5.2f} ms per user, recall of the exact top-500 {recall:.1%}")

# Stage 2: a heavier ranking model on 500 candidates, versus ranking every item.
rank_us_per_item = 20                     # a feature lookup + small model per candidate, batched
print(f"\\nranking 500 candidates: {500 * rank_us_per_item / 1000:.0f} ms; ranking all 1M items: {N * rank_us_per_item / 1e6:.0f} s")`,
      out: `exact search over 1M items: 5.3 ms per user
IVF nprobe=4    0.05 ms per user, recall of the exact top-500 98.9%
IVF nprobe=16   0.13 ms per user, recall of the exact top-500 99.4%
IVF nprobe=64   0.36 ms per user, recall of the exact top-500 99.8%

ranking 500 candidates: 10 ms; ranking all 1M items: 20 s` },
    { t: "dl",
      items: [
        { term: "Retrieval is about recall",
          def: "An IVF index found 99% of the exact top 500 at about a hundredth of the cost of exact search (0.05 ms against 5.3 ms per user). A miss here cannot be fixed later: ranking only sees what retrieval returns." },
        { term: "Ranking is about precision",
          def: "At 20 µs per item, ranking the 500 candidates takes 10 ms; ranking the whole catalogue would take 20 seconds. The funnel is what makes the heavy model affordable." },
        { term: "Several retrievers",
          def: "Production systems merge candidates from several sources (embeddings, co-watch graphs, trending, the user's follows) so that one retriever's blind spot does not empty the slate." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "The ANN recall depends on the data",
      body: [
        { t: "p",
          text: "A first version of this simulation used random vectors with no cluster structure, and the same index found only 7 to 42% of the true top 500. Real embeddings cluster, which is what IVF exploits, but it is a reason to measure recall on your own embeddings rather than trust a benchmark." }
      ] },
    { t: "h2",
      n: "02",
      id: "fraud",
      text: "Fraud: latency and late labels",
      sub: "The decision is synchronous; the truth arrives in weeks" },
    { t: "p",
      text: "A card payment waits for the fraud decision, so the whole path from request to answer fits inside a budget of the order of 100 ms, shared between feature lookup, rules, the model and logging. Features that need a heavy aggregation (spend in the last hour, distinct merchants today) are maintained by a streaming job and read from the online store; nothing is computed from raw history at decision time." },
    { t: "viz",
      title: "A latency budget for a fraud decision",
      caption: "An illustrative split: the model gets about a quarter of the budget, and headroom is kept for tail latency.",
      svg: `<svg viewBox="0 0 760 118" width="100%" role="img">
<rect x="30.0" y="14" width="171.0" height="44" rx="6" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="115.5" y="34" text-anchor="middle" class="s-label" style="fill:var(--good)">Features</text>
<text x="115.5" y="50" text-anchor="middle" class="s-sub">online store</text>
<rect x="205.0" y="14" width="66.0" height="44" rx="6" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="238.0" y="34" text-anchor="middle" class="s-label" style="fill:var(--warn)">Rules</text>
<text x="238.0" y="50" text-anchor="middle" class="s-sub">blocklists</text>
<rect x="275.0" y="14" width="171.0" height="44" rx="6" class="s-fill" style="stroke:var(--violet);stroke-width:2"/>
<text x="360.5" y="34" text-anchor="middle" class="s-label" style="fill:var(--violet)">Model</text>
<text x="360.5" y="50" text-anchor="middle" class="s-sub">GBDT score</text>
<rect x="450.0" y="14" width="101.0" height="44" rx="6" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="500.5" y="34" text-anchor="middle" class="s-label" style="fill:var(--accent)">Decide+log</text>
<text x="500.5" y="50" text-anchor="middle" class="s-sub">audit trail</text>
<rect x="555.0" y="14" width="171.0" height="44" rx="6" class="s-fill" style="stroke:var(--ink-2);stroke-width:2"/>
<text x="640.5" y="34" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Headroom</text>
<text x="640.5" y="50" text-anchor="middle" class="s-sub">p99 spikes</text>
<text x="30.0" y="80" text-anchor="middle" class="s-sub">0</text>
<text x="205.0" y="80" text-anchor="middle" class="s-sub">25</text>
<text x="275.0" y="80" text-anchor="middle" class="s-sub">35</text>
<text x="450.0" y="80" text-anchor="middle" class="s-sub">60</text>
<text x="555.0" y="80" text-anchor="middle" class="s-sub">75</text>
<text x="730.0" y="80" text-anchor="middle" class="s-sub">100</text>
<text x="380.0" y="102" text-anchor="middle" class="s-sub">ms of a 100 ms card-authorisation budget (illustrative)</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Labels arrive late and biased",
          def: "A chargeback arrives weeks after a transaction, and only for transactions that were approved. Blocked transactions never get a label, so the training data under-represents exactly what the model stopped." },
        { term: "Exploration",
          def: "Approving a small random share of transactions that would have been blocked, with limits on amount, gives unbiased labels for the region the model rejects. It costs money, so it is budgeted." },
        { term: "Adversaries adapt",
          def: "Fraud patterns change in response to the model, which is concept drift by design. Short retraining cycles, fast proxies for labels and rules that can be deployed in minutes all matter more here than in most problems." }
      ] },
    { t: "h2",
      n: "03",
      id: "ranking",
      text: "Search ranking: position bias",
      sub: "Clicks are partly caused by the last ranker" },
    { t: "p",
      text: "Click logs are the cheapest training data for ranking, and they are biased: people click the top result partly because it is at the top. A model trained on raw click-through rates learns the previous ranker's opinions as well as users' preferences. The standard correction weights each click by the inverse of the probability that its position was examined, estimated from randomised experiments such as swapping adjacent results for a small share of traffic. The exercise measures how well this works, and where it fails." },
    { t: "table",
      head: ["Feedback", "Bias", "Correction"],
      rows: [
        ["Clicks", "Position: higher results are seen more", "Inverse propensity weighting, clipped"],
        ["Clicks", "Presentation: thumbnails and snippets", "Model the presentation as a feature"],
        ["Dwell time / skips", "Slow pages and long items", "Normalise by item length"],
        ["Human ratings", "Rater disagreement, cost", "Several raters per pair; use for evaluation"]
      ] },
    { t: "h2", n: "04", id: "ads", text: "Ads: calibration", sub: "Money is computed from the probability" },
    { t: "p",
      text: "An ad auction ranks ads by bid × predicted click probability, and the price paid depends on the runner-up. Ranking quality is not enough: if predictions are twice too high, budgets are paced wrongly, reserve prices are wrong and advertisers are charged on wrong numbers. Click-through rates are around 1%, so training sets are usually made by keeping every click and a sample of non-clicks, which shifts every prediction upwards." },
    { t: "code",
      lang: "python",
      title: "calibration.py — negative downsampling and its correction",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(1)

# Ad clicks: true CTR about 1%. Training keeps every click but only 1 in 20 non-clicks (negative downsampling).
n = 400_000
X = rng.normal(size=(n, 5))
true_p = 1 / (1 + np.exp(-(X @ np.array([0.6, -0.4, 0.3, 0.2, 0.0]) - 4.8)))
clicked = rng.random(n) < true_p
keep = clicked | (rng.random(n) < 0.05)
W = 0.05                                                     # sampling rate of negatives
m = LogisticRegression(max_iter=2000).fit(X[keep], clicked[keep])
p_raw = m.predict_proba(X)[:, 1]
p_cal = p_raw / (p_raw + (1 - p_raw) / W)                    # undo the downsampling

print(f"true mean CTR {true_p.mean():.4f}")
print(f"model trained on downsampled data, raw mean prediction {p_raw.mean():.4f}  ({p_raw.mean() / true_p.mean():.1f}x too high)")
print(f"after correction p / (p + (1-p)/w): mean {p_cal.mean():.4f}")

# Why it matters: a second-price auction ranks by bid x pCTR and an advertiser pays per click.
bid = 2.0                                                    # $ per click
for name, p in (("uncalibrated", p_raw), ("calibrated", p_cal)):
    expected_value = (bid * p).mean() * 1000                 # what the system thinks 1,000 impressions are worth
    print(f"{name:<13} predicted value of 1,000 impressions \${expected_value:6.2f}  (true \${(bid * true_p).mean() * 1000:5.2f})")`,
      out: `true mean CTR 0.0112
model trained on downsampled data, raw mean prediction 0.1673  (15.0x too high)
after correction p / (p + (1-p)/w): mean 0.0111
uncalibrated  predicted value of 1,000 impressions $334.56  (true $22.30)
calibrated    predicted value of 1,000 impressions $ 22.27  (true $22.30)` },
    { t: "callout",
      kind: "insight",
      title: "Ranking metrics do not see calibration",
      body: [
        { t: "p",
          text: "The downsampled model's predictions were 15 times too high, yet its ranking of impressions was identical to the corrected one, because the correction p / (p + (1 − p)/w) is monotonic. AUC would rate both models the same. Ads, bidding and any system that adds or multiplies probabilities need log loss and calibration plots in the evaluation, not only AUC." }
      ] },
    { t: "table",
      head: ["System", "Dominant constraint", "Signature design move"],
      rows: [
        ["Recommendations", "Catalogue size", "Retrieval → ranking → re-ranking funnel"],
        ["Fraud", "Latency and label delay", "Streaming features, exploration, fast retraining"],
        ["Search ranking", "Biased feedback", "Position-debiased training, human-rated evaluation"],
        ["Ads", "Absolute probabilities", "Calibration, log loss, downsampling correction"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Correct click logs for position bias",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Simulate search logs: 2,000 queries, each with 30 candidate results of known true relevance, each issued 200 times. An old ranker shows the top 10 by a noisy score. Position k is examined with probability 1/k^0.8, and an examined result is clicked with its true relevance. Estimate each result's relevance three ways and compare them." }
      ],
      requirements: [
        "Naive click-through rate per result",
        "The inverse-propensity estimate: each click weighted by 1 / P(examined at its position)",
        "A clipped version where no weight exceeds 3",
        "For each: mean absolute error against true relevance, and the true relevance of the result it would rank first"
      ],
      hint: "Vectorise over queries: draw all 2,000 orderings per session with argsort, and accumulate impressions and weighted clicks with np.add.at.",
      solution: { lang: "python",
        title: "position_bias.py",
        code: `import numpy as np
rng = np.random.default_rng(3)

# Search logs. 2,000 queries, each with 30 candidate results, each query issued 200 times.
# The old ranker shows 10 results per session in a noisy order. Position k is examined with
# probability 1/k^0.8, and an examined result is clicked with its true relevance.
Q, C, S, K = 2_000, 30, 200, 10
true_rel = rng.beta(1, 3, size=(Q, C))
old_score = true_rel + rng.normal(0, 0.15, size=(Q, C))        # the old model's fixed opinion of each result
examine = 1 / np.arange(1, K + 1) ** 0.8

shows = np.zeros((Q, C)); clicks = np.zeros((Q, C)); ipw = np.zeros((Q, C)); clip = np.zeros((Q, C))
for s in range(S):
    noisy = old_score + rng.normal(0, 0.10, size=(Q, C))         # small session-to-session jitter
    order = np.argsort(-noisy, axis=1)[:, :K]                    # (Q, K) item index at each position
    c = rng.random((Q, K)) < examine * np.take_along_axis(true_rel, order, 1)
    rows = np.arange(Q)[:, None]
    np.add.at(shows, (rows, order), 1)
    np.add.at(clicks, (rows, order), c)
    np.add.at(ipw, (rows, order), c / examine)                   # weight each click by 1 / P(examined)
    np.add.at(clip, (rows, order), c / np.maximum(examine, 1 / 3))  # same, but no weight above 3

seen = shows >= 20                                               # enough impressions to estimate anything
naive = np.where(seen, clicks / np.maximum(shows, 1), -1)
corrected = np.where(seen, ipw / np.maximum(shows, 1), -1)
clipped = np.where(seen, clip / np.maximum(shows, 1), -1)

def top1(est):  # true relevance of the result each estimate would put first
    return true_rel[np.arange(Q), est.argmax(1)].mean()
best = np.where(seen, true_rel, -1).max(1).mean()
m = seen
print(f"results with 20+ impressions: {m.mean():.0%} of candidates")
print(f"mean |estimate - true relevance|: naive CTR {np.abs(naive[m] - true_rel[m]).mean():.3f}, "
      f"position-corrected {np.abs(corrected[m] - true_rel[m]).mean():.3f}, clipped {np.abs(clipped[m] - true_rel[m]).mean():.3f}")
print(f"true relevance of the result ranked first: naive {top1(naive):.3f}, corrected {top1(corrected):.3f}, clipped {top1(clipped):.3f}, best possible {best:.3f}")`,
        out: `results with 20+ impressions: 52% of candidates
mean |estimate - true relevance|: naive CTR 0.233, position-corrected 0.090, clipped 0.102
true relevance of the result ranked first: naive 0.674, corrected 0.649, clipped 0.699, best possible 0.717`,
        notes: [
          { t: "p",
            text: "The naive estimate was badly biased: its mean error was 0.233, because results shown low were seen rarely and so looked bad. Full inverse-propensity weighting removed most of the bias (error 0.090), but ranking by it was worse than naive (0.649 against 0.674). Results shown at position 9 or 10 carry weights near 6, so a few lucky clicks make a mediocre result look like the best one, and argmax picks exactly those outliers." },
          { t: "p",
            text: "Clipping the weights at 3 accepted a little bias (error 0.102) and removed most of the variance, and its first-ranked result was the best of the three, 0.699 against a best possible 0.717. This is the general shape of off-policy correction: unbiased estimators can be unusable, and a small, controlled bias is often the better trade." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the ads model that passed every offline check",
      body: [
        { t: "p",
          text: "**Symptom.** A new click model with better AUC shipped, and within a day several advertisers' daily budgets were exhausted by mid-morning while revenue per click fell." },
        { t: "p",
          text: "**Mechanism.** The new training pipeline sampled non-clicks at 1 in 10 instead of the old 1 in 20, and the calibration step still used the old rate. Predictions were about twice too high. The ranking was as good as before, which is what AUC measured, but pacing spent budgets on the assumption that each impression was worth twice its real value." },
        { t: "p",
          text: "**Fix.** The sampling rate became metadata written with the training set and read by the calibration step, never a constant in two places. The release gate added log loss and a check that the mean prediction matches the observed CTR on held-out unsampled traffic within a few percent." }
      ] }
  ],

  takeaways: [
    "Each classic ML system turns on one constraint: **scale** (recsys), **latency and label delay** (fraud), **biased feedback** (ranking), **calibration** (ads).",
    "A **funnel** of retrieval, ranking and re-ranking makes heavy models affordable: 500 candidates in **10 ms** against **20 s** for the catalogue.",
    "Measured: IVF retrieval kept **99%** recall of the exact top 500 at about **1%** of the cost, on clustered embeddings.",
    "Retrieval misses are permanent; merge several candidate sources.",
    "Fraud decisions fit a budget of the order of **100 ms**; heavy aggregates come from streaming features.",
    "Fraud labels arrive late and only for approved transactions; a small **exploration** budget restores them.",
    "Raw click-through rates had error **0.233**; inverse-propensity weighting cut it to **0.090** but ranked worse until the weights were **clipped**.",
    "Downsampling non-clicks made predictions **15×** too high with identical ranking; AUC cannot see it, log loss can.",
    "Store the sampling rate with the data, and gate releases on mean prediction against observed CTR."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "In a recommendation funnel, why is retrieval judged mainly on recall?",
        options: [
          "Retrieval is the very stage that users see first",
          "Ranking cannot recover items never retrieved",
          "Recall is cheaper to compute than precision",
          "Precision is the job of the feature store"
        ],
        answer: 1,
        why: "Ranking only reorders what retrieval returns, so an item missing from the candidate set is lost for good. Retrieval aims to include the good items; ranking aims to order them." },
      { stem: "A fraud model blocks suspicious payments. Why does its training data become biased over time?",
        options: [
          "Blocked payments never receive a label",
          "Fraud labels are leaked into the features",
          "Approved payments are all labelled as fraud",
          "Streaming features drift away from batch ones"
        ],
        answer: 0,
        why: "Only approved transactions can later produce a chargeback, so the model never learns how many blocked transactions were fine. A small, capped exploration budget restores labels in that region." },
      { stem: "Why did full inverse-propensity weighting rank results worse than naive CTR in the exercise?",
        options: [
          "Its estimate was more biased than naive CTR",
          "Large weights made low-position estimates noisy",
          "It ignored every single click below position five",
          "The propensities were estimated far too high"
        ],
        answer: 1,
        why: "Weights near 6 at the bottom positions turn a few lucky clicks into a high estimate, and argmax picks those outliers. Clipping at 3 kept most of the bias reduction and ranked best (0.699)." },
      { stem: "An ads model is trained with 1 in 20 non-clicks kept. What does the correction change?",
        options: [
          "The ranking of ads, but not the prices",
          "The absolute probabilities, not the ranking",
          "Both ranking and probabilities, roughly equally",
          "Neither, if the model is logistic regression"
        ],
        answer: 1,
        why: "The correction p / (p + (1 − p)/w) is monotonic, so ordering is unchanged and AUC is identical; it moved the mean prediction from 0.167 back to the true 0.011, which is what prices and pacing need." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the constraint that dominates, then design around it.",
    questions: [
      { level: "core",
        q: "Design a video recommendation system for 100 million users.",
        strong: "A strong answer builds the funnel, sizes each stage, names the training signal and its bias, and closes the feedback loop.",
        answer: [
          { t: "p",
            text: "Candidate generation from several retrievers: a two-tower model over item embeddings served from an ANN index, plus co-watch, subscriptions and trending, a few hundred candidates in total. A ranking model with cross features from the feature store predicts several outcomes (click, watch time, like, 'not interested') combined into one score. Re-ranking adds diversity, freshness and policy filters." },
          { t: "p",
            text: "Training uses watch logs, which are biased by what was shown and where, so I would log positions and propensities and keep a small randomised slice. Item embeddings are refreshed daily and new items get content-based embeddings until they have interactions. Success is measured online by long-term engagement and satisfaction surveys, not only clicks." }
        ] },
      { level: "core",
        q: "Design real-time fraud detection for card payments.",
        strong: "A strong answer covers the latency budget, streaming features, rules alongside the model, label delay and exploration.",
        answer: [
          { t: "p",
            text: "A synchronous scoring service inside a budget of about 100 ms: velocity features (counts and amounts per card, merchant and device over minutes and hours) maintained by a streaming job in the online store, a rules layer for known patterns and blocklists that can change in minutes, and a gradient-boosted model. Decisions are approve, decline or step-up authentication, with thresholds set from the cost of each error." },
          { t: "p",
            text: "Labels come from chargebacks weeks later, so monitoring uses faster proxies such as customer reports. A small capped exploration budget approves some would-be declines to keep labels unbiased, and retraining is weekly because attackers adapt." }
        ] },
      { level: "advanced",
        q: "Your new ads model has better AUC but revenue dropped. What happened?",
        strong: "A strong answer separates ranking quality from calibration and checks the sampling and correction path.",
        answer: [
          { t: "p",
            text: "AUC measures ordering, and auction prices and pacing use the probability itself. I would first compare the mean prediction with observed CTR on unsampled traffic, by segment; a systematic offset points at calibration, often a changed negative-sampling rate or a missing correction. I would also check log loss, which does see calibration, and the per-advertiser spend curves. The fix is in the pipeline: sampling rate stored with the data, a calibration layer fitted on recent unsampled data, and a release gate on calibration error." }
        ] }
    ] }
});
