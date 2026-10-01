/* ============================================================================
   LESSON 13.1 — The ML System Design Framework
   ========================================================================= */
EC.receiveLesson({
  id: "13.1",

  lede: "An ML system is a software system with one component whose behaviour is learned from data, and most ML designs fail in the plain parts: the wrong objective, a metric that cannot be measured, no baseline, a threshold nobody chose on purpose. This lesson sets out the framework the rest of the module fills in — from business goal to ML task, labels and metrics, then data, model, serving and monitoring — and measures the three decisions that matter most before any model exists. A fraud model with an AUC of 0.94 still produced nearly nine false alarms for every fraud it caught at the default threshold; a feed ranked for clicks lifted click-through by more than half while losing a quarter of the users it kept; and a two-line heuristic came within two points of collaborative filtering.",

  objectives: [
    "Turn a business goal into an ML task with a label, a loss, an offline metric and an online metric",
    "Walk an ML design through its seven stages, in an interview or a design review",
    "Read precision, recall and AUC under class imbalance, and pick a threshold from business costs",
    "Recognise a proxy metric that diverges from the goal, and guard against it",
    "Build the baseline a model must beat before it is worth its cost"
  ],

  prerequisites: ["11.1", "11.5"],

  blocks: [

    { t: "h2", n: "01", id: "framework", text: "From business goal to ML task",
      sub: "The first ten minutes decide whether the rest is useful" },

    { t: "diagram", kind: "steps", title: "The seven stages of an ML system design",
      items: [
        { label: "Clarify the goal", desc: "The business outcome, scale, latency budget and freshness needed; who acts on the output.", tone: "accent" },
        { label: "Formulate", desc: "Inputs, output, ML task and label; the offline metric and the online one it should move.", tone: "violet" },
        { label: "Data", desc: "Sources, how labels arrive (and how late), splits by time, and the pipeline (13.2).", tone: "teal" },
        { label: "Features", desc: "Batch and real-time features, computed identically for training and serving (13.2).", tone: "teal" },
        { label: "Model", desc: "A baseline first, then the simplest model that beats it; training at scale (13.3).", tone: "warn" },
        { label: "Serving", desc: "Online or batch, the latency budget, candidate stages, caching (13.3, 13.5).", tone: "good" },
        { label: "Monitor and iterate", desc: "Drift, retraining, shadow and A/B tests, fairness (13.4).", tone: "crit" }
      ] },

    { t: "p", text: "The first two stages are where designs go wrong, because they look like formalities. **Formulation** means stating the task precisely enough to train on: what is predicted, from what, with what label, judged by which metric. The label is usually the hard part — a click is available immediately, a chargeback arrives weeks later, and \"the user was satisfied\" is never logged at all. The same structure applies across very different products:" },

    { t: "diagram", kind: "matrix", title: "Four products, formulated",
      cols: ["Business goal", "Task and label", "Offline metric", "Online metric"],
      rows: ["Video feed", "Card fraud", "Product search", "Ads"],
      cells: [
        [{ text: "watch time, retention", tone: "accent" }, { text: "rank: watched > 30 s", tone: "violet" }, { text: "nDCG, recall@k" }, { text: "watch time, D7 return", tone: "good" }],
        [{ text: "losses, low friction", tone: "accent" }, { text: "classify: chargeback", tone: "violet" }, { text: "PR-AUC, cost" }, { text: "fraud $ caught, FPR", tone: "good" }],
        [{ text: "purchases", tone: "accent" }, { text: "rank: purchase, click", tone: "violet" }, { text: "nDCG" }, { text: "conversion, revenue", tone: "good" }],
        [{ text: "revenue and ROI", tone: "accent" }, { text: "predict: click", tone: "violet" }, { text: "log loss, calibration" }, { text: "revenue, CTR", tone: "good" }]
      ] },

    { t: "callout", kind: "insight", title: "Not every problem needs a model",
      body: [
        { t: "p", text: "Ask first whether rules or a lookup would do. ML earns its cost — data pipelines, retraining, monitoring, an on-call rotation for a component nobody can read — when the pattern is too complex to write down, changes over time, and is worth enough at scale. A rule that blocks cards used in three countries within an hour may catch most of what a first model would, and it ships today." }
      ] },

    { t: "h2", n: "02", id: "metrics", text: "Metrics, imbalance and the threshold",
      sub: "A good AUC tells you the model ranks well, not that it is useful" },

    { t: "p", text: "Most interesting ML problems are imbalanced: fraud is one payment in a hundred, a harmful post one in fifty, a click one impression in a thousand. **Accuracy** is useless there, **precision** (of the alerts, how many were real) and **recall** (of the real ones, how many were caught) trade against each other through the **threshold**, and **ROC-AUC** measures ranking quality independently of any threshold. A synthetic but realistic case — 100,000 payments, 1% fraud, a decent model:" },

    { t: "code", lang: "python", title: "metrics.py — accuracy, AUC, precision and recall, and a threshold chosen by cost",
      code: `import random
random.seed(7)

# 100,000 card transactions, 1% fraud, scored by a good but imperfect model
data = [(1, random.betavariate(4, 2.5)) if random.random() < 0.01 else (0, random.betavariate(1.5, 5))
        for _ in range(100_000)]
frauds = sum(y for y, _ in data)

def roc_auc(data):                 # chance that a random fraud scores above a random legitimate payment
    ranked = sorted(data, key=lambda d: d[1])
    rank_sum = sum(i + 1 for i, (y, _) in enumerate(ranked) if y)
    return (rank_sum - frauds * (frauds + 1) / 2) / (frauds * (len(data) - frauds))

def at(t):                         # caught, false alarms, missed
    tp = sum(1 for y, s in data if y and s >= t); fp = sum(1 for y, s in data if not y and s >= t)
    return tp, fp, frauds - tp

def cost(t, loss, review):         # dollars: each missed fraud is lost, each alert is reviewed
    tp, fp, fn = at(t)
    return fn * loss + (tp + fp) * review

print(f"always say 'legitimate': accuracy {1 - frauds / len(data):.1%}, frauds caught 0 of {frauds}")
print(f"model: ROC-AUC {roc_auc(data):.3f}\\n")
print(f"{'threshold':>9}{'alerts':>8}{'precision':>11}{'recall':>8}")
for t in (0.3, 0.5, 0.7, 0.9):
    tp, fp, fn = at(t)
    print(f"{t:>9.1f}{tp + fp:>8,}{tp / (tp + fp):>11.1%}{tp / frauds:>8.1%}")

print()
for loss, review in [(150, 2), (150, 10)]:      # automated check vs a phone call to the customer
    grid = [t / 100 for t in range(10, 96, 5)]
    best = min(grid, key=lambda t: cost(t, loss, review))
    print(f"miss costs \${loss}, alert costs \${review:<3} cheapest threshold {best:.2f}: "
          f"\${cost(best, loss, review):,} per 100k payments vs \${cost(0.5, loss, review):,} at 0.5")`,
      hl: [9, 12, 18, 20, 32],
      out: `always say 'legitimate': accuracy 99.0%, frauds caught 0 of 985
model: ROC-AUC 0.943

threshold  alerts  precision  recall
      0.3  29,699       3.2%   95.4%
      0.5   7,075      10.3%   74.2%
      0.7     923      40.3%   37.8%
      0.9      38      94.7%    3.7%

miss costs $150, alert costs $2   cheapest threshold 0.45: $47,994 per 100k payments vs $52,250 at 0.5
miss costs $150, alert costs $10  cheapest threshold 0.60: $89,790 per 100k payments vs $108,850 at 0.5` },

    { t: "p", text: "Saying \"legitimate\" to everything scores 99% accuracy and catches nothing. The model's AUC of 0.943 sounds excellent, yet at the default threshold of 0.5 only one alert in ten is real fraud — with a 1% base rate, even a small false-positive rate over 99,000 legitimate payments swamps the true positives. No threshold is right in general. Put prices on the two mistakes and the cheapest threshold falls out, and it moves when the prices do:" },

    { t: "viz", title: "Total cost against the alert threshold",
      caption: "Each curve is the cost of missed fraud plus the cost of reviewing alerts, per 100,000 payments. With a cheap automated check ($2 an alert) the minimum sits near 0.45; when every alert means a $10 phone call, it moves to 0.60 and the curve is much steeper on the left — setting the threshold too low there wastes far more. Choosing 0.5 because it is the default cost about 20% more than necessary in the second case.",
      svg: `<svg aria-label="Total cost against alert threshold for two review costs" viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">$0</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">$60k</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">$120k</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">$180k</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">$240k</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="109.5" y="252" text-anchor="middle" class="s-sub">0.4</text>
<text x="155.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub">0.5</text>
<text x="246.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="291.5" y="252" text-anchor="middle" class="s-sub">0.6</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="382.5" y="252" text-anchor="middle" class="s-sub">0.7</text>
<text x="428.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub">0.8</text>
<text x="519.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="564.5" y="252" text-anchor="middle" class="s-sub">0.9</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">alert threshold</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">cost per 100k payments</text>
<polyline points="64.0,184.9 109.5,190.7 155.0,190.8 200.5,187.0 246.0,180.6 291.5,172.8 337.0,162.6 382.5,149.6 428.0,137.1 473.5,125.0 519.0,114.0 564.5,105.8 610.0,101.7" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="184.9" r="3.6" style="fill:var(--accent)"/>
<circle cx="109.5" cy="190.7" r="3.6" style="fill:var(--accent)"/>
<circle cx="155.0" cy="190.8" r="3.6" style="fill:var(--accent)"/>
<circle cx="200.5" cy="187.0" r="3.6" style="fill:var(--accent)"/>
<circle cx="246.0" cy="180.6" r="3.6" style="fill:var(--accent)"/>
<circle cx="291.5" cy="172.8" r="3.6" style="fill:var(--accent)"/>
<circle cx="337.0" cy="162.6" r="3.6" style="fill:var(--accent)"/>
<circle cx="382.5" cy="149.6" r="3.6" style="fill:var(--accent)"/>
<circle cx="428.0" cy="137.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="473.5" cy="125.0" r="3.6" style="fill:var(--accent)"/>
<circle cx="519.0" cy="114.0" r="3.6" style="fill:var(--accent)"/>
<circle cx="564.5" cy="105.8" r="3.6" style="fill:var(--accent)"/>
<circle cx="610.0" cy="101.7" r="3.6" style="fill:var(--accent)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">alert costs $2</text>
<polyline points="64.0,28.2 109.5,79.6 155.0,114.7 200.5,136.0 246.0,148.6 291.5,153.2 337.0,151.0 382.5,142.9 428.0,133.4 473.5,123.1 519.0,113.2 564.5,105.5 610.0,101.7" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="28.2" r="3.6" style="fill:var(--warn)"/>
<circle cx="109.5" cy="79.6" r="3.6" style="fill:var(--warn)"/>
<circle cx="155.0" cy="114.7" r="3.6" style="fill:var(--warn)"/>
<circle cx="200.5" cy="136.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="246.0" cy="148.6" r="3.6" style="fill:var(--warn)"/>
<circle cx="291.5" cy="153.2" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="151.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="382.5" cy="142.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="428.0" cy="133.4" r="3.6" style="fill:var(--warn)"/>
<circle cx="473.5" cy="123.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="519.0" cy="113.2" r="3.6" style="fill:var(--warn)"/>
<circle cx="564.5" cy="105.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="101.7" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">alert costs $10</text>
</svg>` },

    { t: "dl", items: [
      { term: "ROC-AUC", def: "The chance a random positive scores above a random negative. Threshold-free and insensitive to the base rate, so it flatters models on rare events." },
      { term: "PR-AUC", def: "Area under the precision–recall curve. Sensitive to the base rate, so it shows how hard a rare class really is; prefer it for fraud, abuse and rare clicks." },
      { term: "Calibration", def: "Whether a score of 0.3 means a 30% chance. Needed whenever the score is used as a probability — expected revenue in ads, a cost calculation like the one above." },
      { term: "nDCG and recall@k", def: "Ranking metrics: whether the relevant items are near the top, and whether they are in the first k at all." }
    ] },

    { t: "h2", n: "03", id: "proxies", text: "Proxy metrics and how they drift from the goal",
      sub: "Optimise the thing you can measure and you get exactly that" },

    { t: "p", text: "The online metric you can measure today — a click, a like, a purchase — stands in for the goal you care about — satisfied users who return. A model optimises its objective relentlessly, and wherever the proxy and the goal disagree it finds the gap. A simulated feed of 5,000 items, a fifth of them clickbait (tempting headline, disappointing content), shown to 10,000 users for two weeks; each user is likelier to return after clicks worth having and less likely after clicks they regretted:" },

    { t: "code", lang: "python", title: "proxy.py — the same feed ranked for clicks, and ranked for clicks worth having",
      code: `import random
random.seed(11)

# 5,000 items: each has a chance of being clicked when shown, and a chance the click is worth it.
# A fifth are clickbait: tempting headlines, disappointing content.
def item():
    if random.random() < 0.2: return (random.uniform(0.25, 0.4), random.uniform(0.05, 0.3))
    return (random.uniform(0.05, 0.25), random.uniform(0.5, 0.95))
ITEMS = [item() for _ in range(5000)]
POLICIES = {"rank by p(click)": lambda i: i[0],
            "rank by p(click) x p(worth it)": lambda i: i[0] * i[1]}

def simulate(score, users=10_000, days=14):
    active, shown, clicks, good = users, 0, 0, 0
    for day in range(days):
        returning = 0
        for _ in range(active):
            slate = sorted(random.sample(ITEMS, 100), key=score, reverse=True)[:10]   # a fresh feed each visit
            satisfied = regretted = 0
            for p_click, p_good in slate:
                shown += 1
                if random.random() < p_click:
                    clicks += 1
                    if random.random() < p_good: satisfied += 1
                    else: regretted += 1
            good += satisfied
            if random.random() < 0.95 + 0.008 * satisfied - 0.0035 * regretted: returning += 1
        active = returning
    return clicks / shown, good / clicks, active / users

print(f"{'':32}{'CTR':>6}{'clicks worth it':>17}{'users left after 2 weeks':>26}")
for name, score in POLICIES.items():
    ctr, worth, kept = simulate(score)
    print(f"{name:<32}{ctr:>6.1%}{worth:>17.0%}{kept:>26.0%}")`,
      hl: [10, 11, 27],
      out: `                                   CTR  clicks worth it  users left after 2 weeks
rank by p(click)                 35.6%              18%                       45%
rank by p(click) x p(worth it)   22.4%              85%                       60%` },

    { t: "p", text: "Ranking for clicks raised click-through by about 60% — an A/B test reading only that metric would declare it a triumph — while four clicks in five were regretted and the feed kept 45% of its users against 60%. YouTube changed its ranking objective from clicks to watch time in 2012 for this reason; most feeds now optimise a blend of predicted actions weighted by their value, with long-term metrics as guardrails." },

    { t: "callout", kind: "trap", title: "The A/B test will reward the wrong model",
      body: [
        { t: "p", text: "Short experiments measure short-term proxies, and the damage here shows up as users leaving over weeks. Defend in three ways: optimise an objective that already includes the downside (satisfaction, skips, hides, reports); run **guardrail metrics** that block a launch when they fall — retention, complaints, unsubscribes; and keep a long-running **holdout** group that never receives the change, to measure what it does to the slow metrics (13.4)." }
      ] },

    { t: "h2", n: "04", id: "baselines", text: "The baseline comes first",
      sub: "A model is worth what it adds over the simplest thing that works" },

    { t: "p", text: "Before training anything, build the simplest systems that could plausibly work and measure them on the same held-out data. They set the bar, find bugs in the evaluation itself (a random baseline scoring well means the test leaks), and are often good enough to launch while the model is built. 3,000 users, each with twenty past items and the latest one held out, scored by **hit rate@10** — was the held-out item among ten recommendations?" },

    { t: "code", lang: "python", title: "baseline.py — four recommenders that need no training, on held-out data",
      code: `import random
from collections import Counter, defaultdict
random.seed(3)

# 1,000 items in 10 genres with skewed popularity; 3,000 users who each favour two genres
GENRE = [i % 10 for i in range(1000)]
POP = [1 / (i // 10 + 1) ** 0.8 for i in range(1000)]
BY_GENRE = defaultdict(list)
for i in range(1000): BY_GENRE[GENRE[i]].append(i)
def history():
    a, b = random.sample(range(10), 2)
    picks = []
    while len(picks) < 21:
        g = random.choices([a, b, random.randrange(10)], [0.6, 0.3, 0.1])[0]
        item = random.choices(BY_GENRE[g], [POP[i] for i in BY_GENRE[g]])[0]
        if item not in picks: picks.append(item)
    return picks[:-1], picks[-1]                       # train on the first 20, hold out the latest
USERS = [history() for _ in range(3000)]

popular = [i for i, _ in Counter(i for seen, _ in USERS for i in seen).most_common()]
co = defaultdict(Counter)                              # "people who had this also had..."
for seen, _ in USERS:
    for a in seen:
        for b in seen:
            if a != b: co[a][b] += 1

def cooccur(seen):
    total = Counter()
    for s in seen: total.update(co[s])
    return total

def top10(scores, seen): return [i for i in scores if i not in seen][:10]
RECOMMENDERS = {
    "random": lambda seen: random.sample([i for i in range(1000) if i not in seen], 10),
    "most popular overall": lambda seen: top10(popular, seen),
    "most popular in the user's top genre":
        lambda seen: top10([i for i in popular if GENRE[i] == Counter(GENRE[s] for s in seen).most_common(1)[0][0]], seen),
    "item co-occurrence": lambda seen: top10([i for i, _ in cooccur(seen).most_common()], seen),
}
for name, recommend in RECOMMENDERS.items():
    hits = sum(held_out in recommend(seen) for seen, held_out in USERS)
    print(f"{name:<38} hit rate @10: {hits / len(USERS):.1%}")`,
      hl: [17, 20, 36, 38],
      out: `random                                 hit rate @10: 1.4%
most popular overall                   hit rate @10: 6.2%
most popular in the user's top genre   hit rate @10: 19.4%
item co-occurrence                     hit rate @10: 21.4%` },

    { t: "p", text: "Global popularity is four times better than random, which is why it is the universal fallback for new users (the **cold-start** problem). Popularity within the user's favourite genre — two lines of code — reaches 19%, within two points of item co-occurrence, the classic \"people who had this also had\". A learned model has to beat 21% by enough to pay for its pipelines, retraining and monitoring. Sometimes it does, by a lot; the baseline is how you find out, and the fallback when the model's service is down." },

    { t: "exercise", kind: "Challenge", title: "Two thresholds and a review team",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A moderation model scores 50,000 posts a day, about 2% of them harmful. Removing a post automatically when the model is wrong is costly — legitimate users are silenced — so automatic removals must be at least 95% precise. A review team can judge up to 1,500 posts a day, correctly. Design the policy: above one threshold, remove automatically; between two thresholds, send to review; below, allow. Choose both thresholds to handle as many harmful posts as possible within the constraints, and compare with a single threshold." }
      ],
      requirements: [
        "Generate a day of scored posts with a fixed seed",
        "Evaluate any pair of thresholds: harmful posts handled, queue size, precision of automatic removal",
        "Search the pairs that satisfy both constraints and pick the one handling the most harmful posts",
        "Compare with removing everything above one threshold, at 0.5 and at the precision-safe value"
      ],
      hint: "Sort the scores of harmful and harmless posts separately once; bisect then counts how many lie above any threshold instantly.",
      solution: { lang: "python", title: "moderation_ex.py",
        code: `import bisect, random
random.seed(5)

POSTS = [(1, random.betavariate(5, 2)) if random.random() < 0.02 else (0, random.betavariate(1.3, 6))
         for _ in range(50_000)]                             # one day: 2% harmful
HARMFUL = sum(y for y, _ in POSTS)
REVIEW_CAPACITY, MIN_AUTO_PRECISION = 1_500, 0.95

bad = sorted(s for y, s in POSTS if y); good = sorted(s for y, s in POSTS if not y)
def above(scores, t): return len(scores) - bisect.bisect_left(scores, t)      # how many score >= t

def evaluate(low, high):                                     # >= high: remove; low..high: review; else allow
    removed_bad, removed_good = above(bad, high), above(good, high)
    queue = above(bad, low) + above(good, low) - removed_bad - removed_good
    caught = above(bad, low)                                 # reviewers judge the queue correctly
    precision = removed_bad / max(1, removed_bad + removed_good)
    return caught, queue, precision, removed_good

grid = [t / 100 for t in range(5, 100)]
feasible = [(evaluate(lo, hi), lo, hi) for hi in grid for lo in grid if lo <= hi
            and evaluate(lo, hi)[1] <= REVIEW_CAPACITY and evaluate(lo, hi)[2] >= MIN_AUTO_PRECISION]
(caught, queue, precision, wrong), lo, hi = max(feasible, key=lambda f: f[0][0])
print(f"two thresholds: review from {lo:.2f}, remove from {hi:.2f}")
print(f"  harmful posts handled {caught}/{HARMFUL} ({caught / HARMFUL:.0%}), review queue {queue:,}, "
      f"auto-removal precision {precision:.1%} ({wrong:,} wrongly removed)")
for t in (0.5, hi):
    c, _, p, w = evaluate(t, t)
    print(f"one threshold at {t:.2f}, remove everything above: handled {c / HARMFUL:.0%}, precision {p:.1%}, "
          f"{w:,} wrongly removed")`,
        out: `two thresholds: review from 0.52, remove from 0.75
  harmful posts handled 857/991 (86%), review queue 1,375, auto-removal precision 95.6% (22 wrongly removed)
one threshold at 0.50, remove everything above: handled 88%, precision 40.4%, 1,289 wrongly removed
one threshold at 0.75, remove everything above: handled 48%, precision 95.6%, 22 wrongly removed`,
        notes: [
          { t: "p", text: "The two-threshold policy handles 86% of harmful posts while wrongly removing 22 a day. A single threshold cannot do both: at 0.5 it handles slightly more but silences over a thousand legitimate posts a day; at the precision-safe 0.75 it handles under half. The review band is where the model is uncertain, and putting people exactly there is the design." },
          { t: "p", text: "The constraint is usually the reviewers, so the queue is a capacity metric to monitor (11.4): when volume or the score distribution shifts, the same thresholds can overflow the queue overnight. Production systems also prioritise the queue by score and severity, and feed reviewers' decisions back as fresh labels (13.4)." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the notification model that lost users",
      body: [
        { t: "p", text: "**Symptom.** A new push-notification model won its two-week A/B test with an 18% higher open rate and was rolled out to everyone. Three months later, daily active users were down 4%, and the share of users with notifications disabled had doubled." },
        { t: "p", text: "**Mechanism.** The model was trained to predict opens and the experiment was judged on opens. It learned to send more notifications, with more urgent wording, at the hours people habitually unlock their phones. Each notification was opened more often, but many were unwanted; users disabled notifications or uninstalled, and the effect built up over weeks, after the experiment had ended." },
        { t: "p", text: "**Fix.** The objective became expected value per notification — opens weighted positively, disables and uninstalls weighted heavily against — with a per-user frequency cap; launches now require guardrails on disable rate and seven-day retention; and 5% of users are held out of all notification changes for a quarter to measure long-term effects." }
      ] }
  ],

  takeaways: [
    "Walk every ML design through **seven stages**: goal, formulation, data, features, model, serving, monitoring.",
    "Formulation names the **task, label, loss, offline metric and online metric**; the label — and how late it arrives — is usually the hard part.",
    "Ask whether rules would do: ML earns its cost only for complex, changing, valuable patterns.",
    "On imbalanced data **accuracy is meaningless**: always-legitimate scored 99%.",
    "**AUC 0.94** still meant only **one real fraud in ten alerts** at the default threshold; prefer PR-AUC for rare events.",
    "Choose the **threshold from costs**: cheaper reviews moved it to 0.45, expensive ones to 0.60, and the default cost about 20% extra.",
    "**Proxy metrics drift** from the goal: ranking for clicks raised CTR about 60% and lost a quarter of retained users.",
    "Guard launches with **guardrail metrics** and long-running **holdouts**; build the downside into the objective.",
    "**Baselines first**: genre popularity reached 19% hit rate against 21% for co-occurrence; the model must beat that by enough to pay for itself."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A fraud model is 99% accurate on data where 1% of payments are fraudulent. What do you know about it?",
        options: ["It is excellent", "Almost nothing: predicting \"legitimate\" for everything also scores 99%; look at precision and recall, or PR-AUC", "It has 99% recall", "It has 1% false positives"],
        answer: 1,
        why: "With a 1% base rate, accuracy is dominated by the majority class. metrics.py's do-nothing model scored 99.0% and caught no fraud. Precision, recall and PR-AUC describe the rare class." },

      { stem: "Reviewing an alert becomes five times more expensive. What happens to the cost-optimal threshold?",
        options: ["It falls, to catch more fraud", "It rises: false alarms cost more, so fewer, more certain alerts are worth sending", "It stays at 0.5", "Thresholds do not depend on costs"],
        answer: 1,
        why: "The optimum balances the cost of misses against the cost of alerts. In metrics.py, raising the alert cost from $2 to $10 moved the cheapest threshold from 0.45 to 0.60." },

      { stem: "A new ranking model raises click-through rate by 50% in a two-week A/B test. What should you check before launching?",
        options: ["Nothing; CTR is the goal", "Guardrails on the actual goal — satisfaction signals, retention, complaints — and ideally a long-running holdout, because clicks are a proxy that can diverge", "Only the offline AUC", "Only latency"],
        answer: 1,
        why: "In proxy.py the click-ranked feed had 60% higher CTR and kept far fewer users. Short tests measure the proxy; the harm appears in slower metrics." },

      { stem: "Why build a baseline before a model?",
        options: ["Baselines are always better", "It sets the bar the model must beat, catches evaluation bugs, gives a fallback and often a first launch", "Interviewers expect it but it has no practical value", "It replaces A/B testing"],
        answer: 1,
        why: "A popularity-by-genre heuristic came within two points of co-occurrence in baseline.py. Without it you cannot tell whether a model's 21% is impressive or trivial, and you have nothing to fall back on." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "ML design questions reward a structured walk with numbers at each stage, not a model name.",
    questions: [
      { level: "advanced",
        q: "Walk me through how you would design an ML system.",
        strong: "A strong answer follows the stages, spends real time on formulation and metrics, and ends with monitoring.",
        answer: [
          { t: "p", text: "Clarify the business goal, the scale, the latency budget and how fresh predictions must be. Formulate: the ML task, the label and when it arrives, the offline metric, and the online metric it should move, plus guardrails. Then data — sources, label quality, time-based splits — and features, with one definition used for both training and serving." },
          { t: "p", text: "Model: a baseline first, then the simplest model that beats it, scaled up only where the metric justifies it. Serving: batch or online, a candidate-generation stage if the item space is large, the latency budget split across stages, caching and fallbacks. Finally monitoring: input and prediction drift, delayed-label performance, retraining triggers, shadow and canary deployment, A/B tests with holdouts, and fairness checks." }
        ] },

      { level: "core",
        q: "Your fraud model has an AUC of 0.94. Is it ready to launch?",
        strong: "A strong answer moves from ranking quality to the operating point, costs and the base rate.",
        answer: [
          { t: "p", text: "AUC says it ranks well; it does not say the alerts are useful. At a 1% base rate a 0.94-AUC model can still produce mostly false alarms. I would look at precision and recall at candidate thresholds, PR-AUC, and calibration if scores feed other decisions." },
          { t: "p", text: "Then pick the operating point from costs — loss per missed fraud against the cost and customer friction of an alert — and check capacity: how many alerts a day the review team can handle. Launch in shadow mode first to measure real alert volume and precision on live traffic, then ramp with a baseline rule set still running as a backstop." }
        ] },

      { level: "core",
        q: "How do you choose what to optimise?",
        strong: "A strong answer distinguishes the goal, the proxy and the guardrails, and validates the proxy.",
        answer: [
          { t: "p", text: "Start from the business goal and find a measurable signal that tracks it closely and arrives quickly enough to train on. Where a single proxy is gameable — clicks — use a weighted combination of actions, including negative ones such as hides, skips and reports, and check offline that it correlates with the long-term outcome." },
          { t: "p", text: "Then protect the goal directly: guardrail metrics that block a launch when they fall, and a long-running holdout to measure slow effects like retention, because the model will exploit any gap between proxy and goal." }
        ] }
    ]
  }
});
