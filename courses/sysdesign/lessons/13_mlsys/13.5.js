/* ============================================================================
   LESSON 13.5 — Case Studies: Recommendations, Fraud, Ranking, Ads
   ========================================================================= */
EC.receiveLesson({
  id: "13.5",

  lede: "Four ML systems come up again and again — in interviews and in production — and they share a skeleton: candidates, features, a model, a decision, and a feedback loop. What distinguishes them is the one problem each design turns on. Recommendations turn on narrowing a catalogue of millions to a page of twenty within a latency budget; fraud on deciding in the middle of a checkout with labels that arrive weeks later; search on learning from clicks that are biased by where results were shown; ads on predicted probabilities that must be right in absolute terms, because they set prices. Each section measures its crux: an approximate index that found 95% of the true neighbours while scoring an eighth of the items, Redis velocity counters that caught a card-testing attack on its fifth payment, position-debiased clicks that recovered the true top ten, and a calibration error that cost 3% of auction revenue.",

  objectives: [
    "Design a multi-stage recommendation funnel with approximate nearest-neighbour retrieval",
    "Design a real-time fraud system with rules, velocity features, a model and decision bands",
    "Explain position bias in click logs and correct it with inverse propensity weighting",
    "Explain why ad click predictions must be calibrated, and how miscalibration distorts an auction",
    "Re-rank for diversity, and break feedback loops with exploration"
  ],

  prerequisites: ["13.1", "13.2", "13.3"],

  blocks: [

    { t: "h2", n: "01", id: "overview", text: "Four designs, one skeleton",
      sub: "The same stages, each with a different crux" },

    { t: "diagram", kind: "matrix", title: "What each design turns on",
      cols: ["Latency budget", "Label and its delay", "Turns on"],
      rows: ["Recommendations", "Fraud", "Search", "Ads"],
      cells: [
        [{ text: "~200 ms per page" }, { text: "watch, click: seconds", tone: "good" }, { text: "the funnel, ANN retrieval", tone: "accent" }],
        [{ text: "~100 ms in checkout" }, { text: "chargeback: weeks", tone: "crit" }, { text: "velocity, rules, imbalance", tone: "accent" }],
        [{ text: "~200 ms per query" }, { text: "click: position-biased", tone: "warn" }, { text: "relevance, debiased clicks", tone: "accent" }],
        [{ text: "~100 ms per auction" }, { text: "click: seconds", tone: "good" }, { text: "calibrated pCTR x bid", tone: "accent" }]
      ] },

    { t: "h2", n: "02", id: "recs", text: "Recommendations: the funnel",
      sub: "No model can score a hundred million items per request, so the first stage is retrieval" },

    { t: "viz", title: "From a catalogue to a page",
      caption: "Each stage is more expensive per item and sees far fewer items. Retrieval merges several cheap sources — embedding similarity, items co-watched with the user's history, trending, subscriptions — to recall about a thousand plausible items. Ranking scores them with a heavy multi-task model predicting several actions, combined into one value score (13.1's lesson on proxies). Re-ranking applies what a per-item score cannot see: diversity across the page, freshness, and policy.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="The recommendation funnel from catalogue to page">
<defs><marker id="fn-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="20.0" y="14" width="400" height="44" rx="8" style="fill:var(--line);fill-opacity:.12;stroke:var(--line)"/>
<text x="220" y="33" text-anchor="middle" class="s-label">catalogue</text>
<text x="220" y="49" text-anchor="middle" class="s-sub">100 million items</text>
<rect x="70.0" y="86" width="300" height="44" rx="8" style="fill:var(--accent);fill-opacity:.3;stroke:var(--accent)"/>
<text x="220" y="105" text-anchor="middle" class="s-label">retrieval</text>
<text x="220" y="121" text-anchor="middle" class="s-sub">~1,000 candidates</text>
<line x1="220" y1="59" x2="220" y2="84" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#fn-a)"/>
<text x="384.0" y="105" class="s-sub" style="fill:var(--ink-2)">two-tower ANN, co-watched, trending, follows</text>
<text x="384.0" y="121" class="s-sub" style="fill:var(--accent)">~10 ms</text>
<rect x="120.0" y="158" width="200" height="44" rx="8" style="fill:var(--violet);fill-opacity:.3;stroke:var(--violet)"/>
<text x="220" y="177" text-anchor="middle" class="s-label">ranking</text>
<text x="220" y="193" text-anchor="middle" class="s-sub">~100 scored</text>
<line x1="220" y1="131" x2="220" y2="156" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#fn-a)"/>
<text x="334.0" y="177" class="s-sub" style="fill:var(--ink-2)">multi-task network: P(click), P(watch), P(like)</text>
<text x="334.0" y="193" class="s-sub" style="fill:var(--violet)">~50 ms</text>
<rect x="160.0" y="230" width="120" height="44" rx="8" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
<text x="220" y="249" text-anchor="middle" class="s-label">re-ranking</text>
<text x="220" y="265" text-anchor="middle" class="s-sub">20 shown</text>
<line x1="220" y1="203" x2="220" y2="228" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#fn-a)"/>
<text x="294.0" y="249" class="s-sub" style="fill:var(--ink-2)">diversity, freshness, policy and business rules</text>
<text x="294.0" y="265" class="s-sub" style="fill:var(--good)">~10 ms</text>
</svg>` },

    { t: "p", text: "The standard retrieval model is the **two-tower** network: one tower embeds the user and context, the other embeds items, trained so that a user's embedding is close to the items they engage with. Item embeddings are computed offline; at request time the user embedding is computed once and the nearest items are found with an **approximate nearest-neighbour** (ANN) index. An inverted-file (IVF) index clusters the items with k-means offline, then searches only the clusters nearest the query:" },

    { t: "code", lang: "python", title: "ann.py — exact search against an IVF index, on 10,000 item embeddings",
      code: `import random, time
random.seed(4)
DIM, ITEMS, CLUSTERS = 16, 10_000, 32

# item embeddings from a two-tower model cluster by taste; queries are user embeddings
topics = [[random.gauss(0, 1) for _ in range(DIM)] for _ in range(40)]
vec = lambda: [c + random.gauss(0, 0.5) for c in random.choice(topics)]
items, queries = [vec() for _ in range(ITEMS)], [vec() for _ in range(100)]
dot = lambda a, b: sum(x * y for x, y in zip(a, b))
dist = lambda a, b: sum((x - y) ** 2 for x, y in zip(a, b))

# build an IVF index: k-means into CLUSTERS lists, offline, once
centroids = random.sample(items, CLUSTERS)
for _ in range(5):
    lists = [[] for _ in range(CLUSTERS)]
    for i, v in enumerate(items): lists[min(range(CLUSTERS), key=lambda c: dist(v, centroids[c]))].append(i)
    centroids = [[sum(items[i][d] for i in l) / len(l) for d in range(DIM)] if l else centroids[c]
                 for c, l in enumerate(lists)]

def exact(q):                      # brute force: score every item
    return sorted(range(ITEMS), key=lambda i: -dot(q, items[i]))[:10]

def ivf(q, nprobe):                # score only the items in the nprobe lists whose centroids best match the query
    nearest = sorted(range(CLUSTERS), key=lambda c: -dot(q, centroids[c]))[:nprobe]
    candidates = [i for c in nearest for i in lists[c]]
    return sorted(candidates, key=lambda i: -dot(q, items[i]))[:10], len(candidates)

start = time.perf_counter(); truth = [exact(q) for q in queries]; base = time.perf_counter() - start
print(f"{'search':<22}{'items scored':>13}{'recall@10':>11}{'time per query':>16}")
print(f"{'exact':<22}{ITEMS:>13,}{1:>11.0%}{base / len(queries) * 1000:>13.1f} ms")
for nprobe in (1, 2, 4, 8):
    start = time.perf_counter(); found = [ivf(q, nprobe) for q in queries]; t = time.perf_counter() - start
    recall = sum(len(set(f) & set(e)) for (f, _), e in zip(found, truth)) / (10 * len(queries))
    scanned = sum(n for _, n in found) / len(found)
    print(f"{'IVF, ' + str(nprobe) + ' of 32 lists':<22}{scanned:>13,.0f}{recall:>11.0%}{t / len(queries) * 1000:>13.1f} ms")`,
      hl: [14, 23, 24, 25],
      out: `search                 items scored  recall@10  time per query
exact                        10,000       100%         12.5 ms
IVF, 1 of 32 lists              311        79%          0.5 ms
IVF, 2 of 32 lists              576        83%          0.9 ms
IVF, 4 of 32 lists            1,202        95%          1.8 ms
IVF, 8 of 32 lists            2,390        97%          3.6 ms` },

    { t: "p", text: "Probing 4 of 32 lists scored 12% of the items, found 95% of the true top ten, and was about seven times faster; the dial between recall and cost is the number of lists probed. Production indexes — HNSW graphs, IVF with product quantisation (13.3), ScaNN — reach high recall over billions of vectors in milliseconds. Retrieval does not need to be perfect, only to get the good items into the thousand that ranking will look at carefully." },

    { t: "callout", kind: "trap", title: "A recommender trains on its own output",
      body: [
        { t: "p", text: "Users can only click what they were shown, so the training data is shaped by the previous model: popular items get more exposure, more clicks and more exposure again, while new and niche items are never shown and never learned. Counter it deliberately — a small share of exploration slots for uncertain items, boosts for new items until they have data, popularity-penalised retrieval sources — and debias the training data (section 04). The **cold start** for new users is handled the same way: popular and contextual items first, personalisation as history accumulates." }
      ] },

    { t: "h2", n: "03", id: "fraud", text: "Fraud: deciding inside the checkout",
      sub: "Rules for the obvious, a model for the rest, and four possible answers" },

    { t: "diagram", kind: "steps", title: "A payment through the fraud system",
      items: [
        { label: "Rules", desc: "Instant hard checks: blocklists, impossible travel, velocity limits; explainable and quick to change.", tone: "crit" },
        { label: "Features", desc: "Request fields plus streaming velocity counters and the customer's batch profile (13.2).", tone: "teal" },
        { label: "Model", desc: "Usually gradient-boosted trees: strong on tabular data and explainable to analysts.", tone: "violet" },
        { label: "Decision band", desc: "Allow, step-up authentication, send to review, or block — by score and amount.", tone: "warn" },
        { label: "Feedback", desc: "Chargebacks weeks later; disputes and analyst decisions sooner (13.4).", tone: "accent" }
      ] },

    { t: "p", text: "The most predictive fraud features are **velocity** features — how many payments this card, device or address has made in the last minute, hour and day, at how many merchants — and they must be current to the second, because a stolen card is used fast. A sorted set per card in Redis holds the last hour of payments; each check records the payment and reads the counts in one round trip. Fifteen thousand ordinary payments, and a stolen card being tested with forty small payments in two minutes:" },

    { t: "code", lang: "python", title: "velocity.py — sliding-window velocity features in Redis, with a rule on top",
      code: `import random, statistics, time, redis
random.seed(13)
r = redis.Redis(port=6380); r.flushdb()

def check(card, merchant, ts, tx):   # one round trip: record the payment, read the card's velocity features
    key = f"card:{card}"
    p = r.pipeline()
    p.zadd(key, {f"{tx}:{merchant}": ts})
    p.zremrangebyscore(key, 0, ts - 3600)            # keep one hour of history
    p.zcount(key, ts - 60, ts)                       # payments in the last minute
    p.zrangebyscore(key, ts - 600, ts)               # last ten minutes, to count distinct merchants
    p.expire(key, 3600)
    _, _, last_min, last_10m, _ = p.execute()
    return last_min, len({m.split(b":")[1] for m in last_10m})

# an hour of ordinary payments by 5,000 cards, plus a stolen card being tested at 40 merchants in two minutes
events = [(random.uniform(0, 3600), f"c{random.randrange(5000)}", f"m{random.randrange(800)}") for _ in range(15_000)]
events += [(1800 + i * 3, "stolen", f"m{random.randrange(800)}") for i in range(40)]
events.sort()

flagged, lat, caught_at = set(), [], None
for tx, (ts, card, merchant) in enumerate(events):
    start = time.perf_counter()
    per_minute, merchants = check(card, merchant, ts, tx)
    lat.append((time.perf_counter() - start) * 1000)
    if per_minute > 5 or merchants > 4:                # the rule layer: instant, before the model
        flagged.add(card)
        if card == "stolen" and caught_at is None: caught_at = sum(1 for e in events[:tx + 1] if e[1] == "stolen")
q = statistics.quantiles(lat, n=100)
print(f"{len(events):,} payments checked; Redis round trip p50 {q[49]:.2f} ms, p99 {q[98]:.2f} ms")
print(f"stolen card flagged on its payment number {caught_at} of 40")
print(f"ordinary cards also flagged: {len(flagged - {'stolen'})} of 5,000 ({len(flagged - {'stolen'}) / 5000:.1%})")`,
      hl: [8, 9, 10, 26],
      out: `15,040 payments checked; Redis round trip p50 0.16 ms, p99 0.33 ms
stolen card flagged on its payment number 5 of 40
ordinary cards also flagged: 24 of 5,000 (0.5%)` },

    { t: "p", text: "The velocity rule stopped the card-testing run on its fifth payment, in a fraction of a millisecond per check. It also caught half a percent of ordinary customers who happened to pay several merchants in ten minutes — which is why rules should usually trigger step-up authentication rather than a block, and why the model, scoring every payment on many features, does the fine discrimination. Fraud is about one payment in a thousand or rarer: train with class weights or downsampling of the majority, evaluate with PR-AUC and cost (13.1), and remember that fraudsters adapt to whatever you deploy (13.4)." },

    { t: "callout", kind: "insight", title: "Fraud is a graph problem too",
      body: [
        { t: "p", text: "Fraud rings share devices, addresses, cards and payout accounts. Graph features — how many accounts share this device, how close this account is to known fraud — catch rings that look normal one payment at a time, and graph neural networks or simple connected-component analysis run in batch to refresh them." }
      ] },

    { t: "h2", n: "04", id: "search", text: "Search: learning from biased clicks",
      sub: "A click on result one and a click on result ten do not mean the same thing" },

    { t: "p", text: "Search runs query understanding (spelling correction, intent, entities), then hybrid retrieval — lexical BM25 for exact terms plus embedding similarity for meaning — then a learning-to-rank model (gradient-boosted trees with a pairwise or listwise loss, or a cross-encoder over the top few dozen), judged offline by nDCG and MRR and online by click-through and successful sessions. The labels come mostly from click logs, and they are biased: users click the top results far more often whatever their quality, because many never look further. A simulation where an old ranker was systematically wrong about some items, and the click logs it produced:" },

    { t: "code", lang: "python", title: "posbias.py — raw click-through against inverse-propensity-weighted clicks",
      code: `import math, random
random.seed(19)
ITEMS = 40
relevance = [random.random() for _ in range(ITEMS)]                     # true chance a result satisfies, if seen
EXAMINE = [1 / (1 + pos) for pos in range(10)]                    # chance a user even looks at position k

# the old ranker's logs: its guesses were systematically off for some items, and it showed its top 10 of 40
old_guess = [r + random.gauss(0, 0.3) for r in relevance]
impressions, clicks = [0] * ITEMS, [0] * ITEMS
ipw_clicks = [0.0] * ITEMS
for _ in range(50_000):
    order = sorted(range(ITEMS), key=lambda i: -(old_guess[i] + random.gauss(0, 0.15)))[:10]
    for pos, item in enumerate(order):
        impressions[item] += 1
        if random.random() < EXAMINE[pos] * relevance[item]:
            clicks[item] += 1
            ipw_clicks[item] += 1 / EXAMINE[pos]                        # weight each click by 1 / P(examined)

def ndcg_at_10(ranking):           # graded by true relevance; 1.0 = the ideal order
    dcg = lambda r: sum(relevance[i] / math.log2(k + 2) for k, i in enumerate(r[:10]))
    return dcg(ranking) / dcg(sorted(range(ITEMS), key=lambda i: -relevance[i]))

shown = [i for i in range(ITEMS) if impressions[i]]
naive = sorted(shown, key=lambda i: -clicks[i] / impressions[i])          # click-through rate as the label
corrected = sorted(shown, key=lambda i: -ipw_clicks[i] / impressions[i])  # inverse propensity weighting
old = sorted(range(ITEMS), key=lambda i: -old_guess[i])
top10 = set(sorted(range(ITEMS), key=lambda i: -relevance[i])[:10])
print(f"items ever shown: {len(shown)} of {ITEMS}; the old ranker's own nDCG@10 {ndcg_at_10(old):.3f}")
for name, ranking in [("raw click-through rate", naive), ("position-debiased click rate", corrected)]:
    print(f"rank by {name:<30} nDCG@10 {ndcg_at_10(ranking):.3f}, true top 10 found: {len(top10 & set(ranking[:10]))}")
print(f"click-through at position 1 vs 10 for the same relevance: {EXAMINE[0] / EXAMINE[9]:.1f}x")`,
      hl: [5, 8, 17],
      out: `items ever shown: 34 of 40; the old ranker's own nDCG@10 0.911
rank by raw click-through rate         nDCG@10 0.976, true top 10 found: 9
rank by position-debiased click rate   nDCG@10 1.000, true top 10 found: 10
click-through at position 1 vs 10 for the same relevance: 10.0x` },

    { t: "p", text: "Ranking by raw click-through improved on the old ranker but still missed one of the ten best results, because items the old ranker placed low collected few clicks however good they were. Weighting each click by the inverse of the chance its position was examined — **inverse propensity weighting** — recovered the true top ten exactly. The propensities themselves are estimated with small randomised experiments, such as swapping adjacent results for a fraction of traffic. Six of forty items were never shown at all; no reweighting can learn about them, which is the exploration argument again." },

    { t: "h2", n: "05", id: "ads", text: "Ads: calibration sets prices",
      sub: "In an auction, the predicted probability is a number of dollars" },

    { t: "p", text: "Ads are ranked by expected value — the bid multiplied by the predicted click-through rate — and pricing in most auctions derives from the same quantity, so a prediction must be right in absolute terms, not just in order. Ranking quality per advertiser can be perfect while one advertiser's predictions are systematically high, from a feature bug or a new campaign type the model has not learned. Three advertisers and 200,000 auctions, with a correct model and one that overestimates a single advertiser by a factor of two:" },

    { t: "code", lang: "python", title: "auction.py — the same ranking noise, with and without a calibration error",
      code: `import random
random.seed(23)
BIDS = {"shoes": 1.20, "travel": 2.50, "games": 0.80}         # dollars each advertiser pays per click

def impression():                                               # true click chance of each ad for this user
    return {ad: random.betavariate(1.2, 60) * (3 if random.random() < 0.2 else 1) for ad in BIDS}

def run(predict, n=200_000):
    revenue, predicted, actual, wins = 0.0, dict.fromkeys(BIDS, 0.0), dict.fromkeys(BIDS, 0), dict.fromkeys(BIDS, 0)
    for _ in range(n):
        true = impression()
        p = {ad: predict(ad, ctr) for ad, ctr in true.items()}
        winner = max(BIDS, key=lambda ad: BIDS[ad] * p[ad])     # rank by expected value: bid x pCTR
        predicted[winner] += p[winner]; wins[winner] += 1
        if random.random() < true[winner]:
            actual[winner] += 1; revenue += BIDS[winner]
    return revenue, {ad: predicted[ad] / max(1, actual[ad]) for ad in BIDS}, wins["games"] / n

noise = lambda ctr: ctr * random.lognormvariate(0, 0.3)          # the same ranking noise in both models
models = {"calibrated": lambda ad, ctr: noise(ctr),
          "games overpredicted 2x": lambda ad, ctr: noise(ctr) * (2 if ad == "games" else 1)}
print(f"{'model':<24}{'revenue $':>10}{'games wins':>12}   predicted / actual clicks, by advertiser")
for name, model in models.items():
    revenue, ratio, games_share = run(model)
    print(f"{name:<24}{revenue:>10,.0f}{games_share:>12.0%}   " + "  ".join(f"{ad} {r:.2f}" for ad, r in ratio.items()))`,
      hl: [13, 21],
      out: `model                    revenue $  games wins   predicted / actual clicks, by advertiser
calibrated                  16,919         15%   shoes 1.09  travel 1.03  games 1.16
games overpredicted 2x      16,415         30%   shoes 1.12  travel 1.05  games 2.17` },

    { t: "p", text: "Overestimating one advertiser doubled its share of auctions, at the expense of ads that users were likelier to click, and revenue fell 3% — while the ordering of that advertiser's own impressions, and so any per-advertiser AUC, was untouched. Notice too that even the calibrated model looks about 10% high on the impressions it wins: winning selects the impressions whose predictions erred upwards, the **winner's curse**. Monitor calibration per advertiser and per segment, on all impressions as well as on wins, and recalibrate (Platt or isotonic scaling) after every retrain." },

    { t: "callout", kind: "note", title: "The rest of an ads system",
      body: [
        { t: "p", text: "Around the click model sit budget pacing (spreading each advertiser's daily budget across the day), conversion prediction for advertisers who bid on purchases, frequency caps, brand-safety filters, and an auction mechanism that keeps advertisers bidding truthfully. Models for click prediction combine memorisation of sparse crosses with generalisation from embeddings — the Wide & Deep and DLRM families — over billions of sparse features." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Re-rank a page for diversity",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A ranking model returns 200 scored titles for a user whose history is mostly comedy and drama, so the top ten by score are all comedy and drama. Implement **maximal marginal relevance** (MMR): build the page one item at a time, choosing the item that maximises λ·relevance − (1 − λ)·redundancy, where redundancy is the share of already-chosen items in the same genre. Report, for several values of λ, how many genres the page covers and how much of the top-ten relevance it keeps." }
      ],
      requirements: [
        "Greedy selection of ten items by λ·score − (1 − λ)·redundancy",
        "λ = 1 must reproduce the plain top ten",
        "For each λ, print genres covered, relevance kept as a share of the top ten's, and the genre counts",
        "Choose a λ and justify it"
      ],
      hint: "Redundancy can use embedding similarity instead of genre; the greedy structure stays the same.",
      solution: { lang: "python", title: "mmr_ex.py",
        code: `import random
random.seed(29)
GENRES = ["comedy", "drama", "thriller", "documentary", "animation", "horror", "romance", "sci-fi"]

# 200 ranked candidates; the user's history makes two genres dominate the top scores
candidates = []
for i in range(200):
    g = random.choices(GENRES, [8, 6, 1, 1, 1, 1, 1, 1])[0]
    score = random.betavariate(5, 2) * (1.0 if g in ("comedy", "drama") else 0.85)
    candidates.append((f"title{i}", g, score))

def mmr(cands, k=10, lam=0.7):     # maximal marginal relevance: relevance minus redundancy with what is chosen
    chosen, pool = [], list(cands)
    while len(chosen) < k:
        def value(c):
            redundancy = sum(c[1] == s[1] for s in chosen) / max(1, len(chosen))   # share already in its genre
            return lam * c[2] - (1 - lam) * redundancy
        best = max(pool, key=value); chosen.append(best); pool.remove(best)
    return chosen

best10 = sum(c[2] for c in sorted(candidates, key=lambda c: -c[2])[:10])
print(f"{'lambda':>6}{'genres in top 10':>18}{'relevance kept':>16}   genres (count)")
for lam in (1.0, 0.8, 0.7, 0.6, 0.5):
    page = mmr(candidates, lam=lam)
    counts = {}
    for c in page: counts[c[1]] = counts.get(c[1], 0) + 1
    print(f"{lam:>6.2f}{len(counts):>18}{sum(c[2] for c in page) / best10:>16.1%}   "
          + ", ".join(f"{g} {n}" for g, n in sorted(counts.items(), key=lambda kv: -kv[1])))`,
        out: `lambda  genres in top 10  relevance kept   genres (count)
  1.00                 2          100.0%   drama 6, comedy 4
  0.80                 3           98.8%   drama 5, comedy 4, sci-fi 1
  0.70                 5           96.0%   drama 4, comedy 3, sci-fi 1, thriller 1, animation 1
  0.60                 6           94.3%   comedy 3, drama 3, sci-fi 1, thriller 1, animation 1, documentary 1
  0.50                 8           90.3%   comedy 2, drama 2, sci-fi 1, thriller 1, animation 1, documentary 1, horror 1, romance 1`,
        notes: [
          { t: "p", text: "Diversity is cheap at first: λ = 0.7 covered five genres while keeping 96% of the relevance, and λ = 0.5 covered all eight for under 10%. The offline relevance score does not measure what diversity buys — users who discover a new genre, less fatigue, more sessions — so the right λ is found by A/B testing on long-term engagement, not from this table." },
          { t: "p", text: "The same greedy re-ranker carries other page-level constraints: no more than two items from one creator, a minimum share of fresh items, separation of similar thumbnails. Keeping them in one re-ranking stage, after the model, keeps the model's objective clean." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the catalogue that shrank",
      body: [
        { t: "p", text: "**Symptom.** Over six months, a streaming service's recommendations drew from fewer and fewer titles: 80% of plays came from 3% of the catalogue, new releases outside the top franchises got almost no views, and licensing costs for the long tail stopped paying off." },
        { t: "p", text: "**Mechanism.** The ranking model was retrained weekly on its own impressions and clicks. Items it ranked highly were shown and clicked; items it ranked low were rarely shown, produced few clicks, and were ranked lower still. Engagement metrics stayed flat, because users clicked what they were shown — the loss was in what they never saw." },
        { t: "p", text: "**Fix.** Two of twenty slots on each page became exploration slots for items with few impressions; clicks were reweighted by position and exposure propensity in training; new titles got a decaying boost; and catalogue coverage and new-title play share became guardrail metrics on every ranking experiment." }
      ] }
  ],

  takeaways: [
    "All four designs share a skeleton — candidates, features, model, decision, feedback — and differ in their **crux**.",
    "Recommendations: a **funnel** of retrieval (~1,000), ranking (~100), re-ranking (~20), each stage costlier per item.",
    "**Two-tower** embeddings plus **ANN**: probing 4 of 32 IVF lists found **95%** of the true top ten while scoring **12%** of items.",
    "Recommenders train on their own output: add **exploration**, boost new items, debias training data.",
    "Fraud: **rules, velocity features, a model, decision bands**; Redis counters caught a card-testing run on its **5th payment** at under 0.3 ms p99.",
    "Rules are blunt — they also caught 0.5% of ordinary customers — so prefer **step-up** to block; labels arrive in weeks.",
    "Search: clicks are **position-biased**; **inverse propensity weighting** recovered the true top ten where raw CTR missed one.",
    "Ads rank by **bid x pCTR**, so predictions must be **calibrated**: one advertiser overpredicted 2x doubled its wins and cost **3%** of revenue.",
    "Beware the **winner's curse** when measuring calibration on won auctions only.",
    "Diversity via **MMR** was cheap: five genres for 4% of relevance."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why do recommendation systems use a retrieval stage before the main ranking model?",
        options: ["Retrieval models are more accurate", "Scoring every one of millions of items with the heavy model per request is impossible within the latency budget; cheap retrieval narrows them to about a thousand first", "To comply with privacy rules", "Ranking models cannot use embeddings"],
        answer: 1,
        why: "Cost per item rises and item count falls at each stage. An ANN index over item embeddings finds good candidates in milliseconds — ann.py scored 12% of items for 95% recall — so the expensive model only sees a thousand." },

      { stem: "Which features matter most for catching a stolen card being tested, and where are they computed?",
        options: ["The cardholder's age, from a nightly batch", "Velocity counts — payments and distinct merchants per card in the last minutes — kept current to the second in a streaming or in-memory store", "The merchant's logo", "Last year's spending total"],
        answer: 1,
        why: "Card testing is fast: dozens of small payments in minutes. Batch features are hours old; sliding-window counters in Redis caught the attack in velocity.py on its fifth payment." },

      { stem: "Item A has a lower click-through rate than item B in the logs. Is A less relevant?",
        options: ["Yes, always", "Not necessarily: if A was usually shown lower on the page, fewer users ever saw it; correct for position, for example by weighting clicks by the inverse of the examination probability", "Only if A is newer", "Click-through rate is unrelated to relevance"],
        answer: 1,
        why: "Click probability is examination probability times relevance. In posbias.py, raw CTR missed one of the true top ten; position-debiased clicks found all ten." },

      { stem: "An ads model ranks each advertiser's impressions perfectly, but predicts one advertiser's clicks twice as high as reality. What goes wrong?",
        options: ["Nothing; ranking is what matters", "That advertiser wins auctions it should lose, because bid x pCTR is compared across advertisers — revenue falls and prices are wrong", "Only that advertiser's AUC falls", "The auction stops"],
        answer: 1,
        why: "Auctions compare expected values across different ads, so absolute probabilities matter. auction.py doubled the overpredicted advertiser's share of wins and lost 3% of revenue with every per-advertiser ordering unchanged." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Case-study questions reward the funnel, the numbers at each stage, and the feedback loop.",
    questions: [
      { level: "advanced",
        q: "Design a recommendation system for a video platform with a billion users and a hundred million videos.",
        strong: "A strong answer formulates the objective, draws the funnel with sizes and latencies, and closes the loop.",
        answer: [
          { t: "p", text: "Objective: long-term satisfaction, approximated by a weighted combination of predicted watch time, likes, shares and negative signals such as skips and hides, with retention as a guardrail. Retrieval of about a thousand candidates from several sources in parallel: a two-tower model with an ANN index over item embeddings, items co-watched with recent history, subscriptions, trending in the user's region. Ranking with a multi-task deep model over user, item, context and cross features from the feature store, within roughly 50 ms using batching on GPUs." },
          { t: "p", text: "Re-ranking for diversity, freshness and policy. Item embeddings refreshed daily, user embeddings at request time. Training on logged impressions with position debiasing, exploration slots for new and uncertain videos, and cold-start fallbacks for new users. Monitoring: catalogue coverage, new-item exposure, per-segment engagement, and A/B tests with long-running holdouts." }
        ] },

      { level: "advanced",
        q: "Design a real-time fraud detection system for card payments.",
        strong: "A strong answer covers latency, layering, features, imbalance, decisions and delayed labels.",
        answer: [
          { t: "p", text: "A budget of about 100 ms inside the payment flow. Layers: rules for known patterns and hard limits; a gradient-boosted model over request features, streaming velocity features per card, device and address from an in-memory store, batch customer profiles, and graph features about shared devices and accounts. Output is a score mapped to decision bands — allow, step-up authentication, review, block — with thresholds chosen from the cost of fraud and of friction, and analyst capacity." },
          { t: "p", text: "Training with class weights and PR-AUC on time-split data with mature labels; chargebacks arrive in weeks, so disputes and analyst decisions are early labels. Weekly retraining with champion–challenger in shadow, drift and alert-volume monitoring, and a fallback to rules if the model is unavailable." }
        ] },

      { level: "core",
        q: "Why must click predictions for ads be calibrated?",
        strong: "A strong answer connects calibration to the auction and to pricing.",
        answer: [
          { t: "p", text: "Because ads from different advertisers are ranked by bid times predicted click-through rate, and prices are derived from it. If one advertiser's predictions are inflated, it wins impressions it should lose, users see less relevant ads, revenue falls, and advertisers pay prices that do not reflect value — even if the ordering of each advertiser's own impressions is perfect." },
          { t: "p", text: "So calibration is monitored per advertiser, campaign type and segment, comparing predicted with actual clicks on all impressions rather than only wins (to avoid the winner's curse), and models are recalibrated after each retrain with Platt or isotonic scaling." }
        ] }
    ]
  }
});
