/* ============================================================================
   LESSON 14.1 — Netflix, YouTube and Amazon
   ========================================================================= */
EC.receiveLesson({
  id: "14.1",

  lede: "Published engineering accounts are the best evidence available for a design decision, as long as they are read for the situation that made the decision right rather than for the logo. Netflix, YouTube and Amazon each faced a problem that forced an unusual answer: moving most of the internet's video bytes, accepting hundreds of hours of uploads every minute, and letting thousands of teams change one shopping site independently. This lesson reads each design for its decision and measures two of the mechanisms behind them: a pre-filled edge cache and shuffle sharding.",

  objectives: [
    "Explain Netflix's split between a cloud control plane and an ISP-embedded data plane",
    "Measure why a content owner's edge cache can beat a generic LRU cache",
    "Describe YouTube's upload pipeline, MySQL sharding with Vitess, and two-stage recommendations",
    "Explain Amazon's service ownership model and the design of Dynamo",
    "Quantify cell-based isolation and shuffle sharding"
  ],

  prerequisites: ["3.5", "5.3", "7.2", "10.6"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "netflix",
      text: "Netflix: two planes",
      sub: "Decide in the cloud, stream from the ISP" },
    { t: "p",
      text: "Netflix runs its **control plane** on AWS: sign-in, browsing, recommendations, billing and the decision about which file a device should play and from where. Netflix moved there after a database corruption in 2008 stopped DVD shipments for three days, and completed the migration in early 2016. The **data plane** is its own CDN, Open Connect, announced in 2012: storage appliances placed inside internet providers' networks, free of charge to the provider, that serve the video bytes. In 2015 Sandvine measured Netflix at about 37% of North American downstream traffic at peak hours, which is the scale this split answers." },
    { t: "viz",
      title: "Netflix's control plane and data plane",
      caption: "Steering decisions are small requests to the cloud; the video bytes come from an appliance inside the viewer's ISP, which is filled overnight.",
      svg: `<svg viewBox="0 0 760 265" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="130.0" y1="114.8" x2="251.3" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="190.7" y="87.4" text-anchor="middle" class="s-sub">steer</text>
<line x1="130.0" y1="154.8" x2="242.1" y2="190.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="186.1" y="166.4" text-anchor="middle" class="s-sub">stream</text>
<line x1="560.0" y1="216.0" x2="420.0" y2="216.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="490.0" y="210.0" text-anchor="middle" class="s-sub">nightly fill</text>
<line x1="420.0" y1="46.0" x2="560.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="110" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="70.0" y="132" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Device</text>
<text x="70.0" y="150" text-anchor="middle" class="s-sub">app</text>
<rect x="230" y="20" width="190" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="325.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Control plane (AWS)</text>
<text x="325.0" y="60" text-anchor="middle" class="s-sub">login, browse, steer</text>
<rect x="230" y="190" width="190" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="325.0" y="212" text-anchor="middle" class="s-label" style="fill:var(--good)">Appliance in the ISP</text>
<text x="325.0" y="230" text-anchor="middle" class="s-sub">video bytes</text>
<rect x="560" y="190" width="180" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="650.0" y="212" text-anchor="middle" class="s-label" style="fill:var(--violet)">Origin storage</text>
<text x="650.0" y="230" text-anchor="middle" class="s-sub">every encoding</text>
<rect x="560" y="20" width="180" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="650.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Microservices</text>
<text x="650.0" y="60" text-anchor="middle" class="s-sub">recs, billing, ...</text>
</svg>` },
    { t: "p",
      text: "The appliances are filled during off-peak hours with the titles expected to be watched, rather than filling on demand when a viewer misses. A generic CDN cannot do this because it does not know what will be popular. The simulation compares the two fill strategies for a catalogue whose popularity changes every day." },
    { t: "code",
      lang: "python",
      title: "edgecache.py — on-demand LRU against a nightly fill",
      code: `import numpy as np
from collections import OrderedDict
rng = np.random.default_rng(11)

# An appliance inside an ISP serves a catalogue of 20,000 titles. Popularity is Zipf-like and shifts every
# day: new releases enter near the top, older titles slide down, and every title drifts unpredictably.
# Compare filling the disk with LRU (on miss, during peak hours) against a nightly proactive fill with the
# titles predicted to be popular, predicted from yesterday alone or with the known release schedule.
TITLES, DAYS, PER_DAY = 20_000, 14, 200_000
base = 1 / np.arange(1, TITLES + 1) ** 0.9
rank = rng.permutation(TITLES)                                  # rank[t] = popularity rank of title t today

def day_requests(rank):
    w = base[rank]; return rng.choice(TITLES, PER_DAY, p=w / w.sum())

def lru_run(cap, days):
    cache, hits, total = OrderedDict(), 0, 0
    for reqs in days:
        for t in reqs:
            total += 1
            if t in cache: hits += 1; cache.move_to_end(t)
            else:
                cache[t] = None
                if len(cache) > cap: cache.popitem(last=False)
    return hits / total

def proactive_run(cap, days, ranks_yesterday):
    hits = total = 0
    for reqs, r in zip(days, ranks_yesterday):
        stored = np.zeros(TITLES, bool); stored[np.argsort(r)[:cap]] = True    # fill overnight from yesterday's ranking
        hits += stored[reqs].sum(); total += len(reqs)
    return hits / total

ranks, days, sched = [], [], []
for d in range(DAYS):
    ranks.append(rank.copy()); days.append(day_requests(rank))
    new = rng.choice(TITLES, 20, replace=False)                 # 20 releases a day jump into the top 100
    sched.append(new)                                           # the owner knows tomorrow's release schedule
    score = (rank + 20) * rng.lognormal(0, 0.4, TITLES)          # unpredictable drift: word of mouth, trends
    score[new] = rng.permutation(100)[:20]
    rank = np.argsort(np.argsort(score))                        # re-rank to 0..TITLES-1
def with_schedule(r, new):                                      # yesterday's ranking, with scheduled releases put first
    r = r.copy() + 20; r[new] = np.arange(20); return r
planned = [with_schedule(r, n) for r, n in zip(ranks[:-1], sched[:-1])]
print(f"{'disk holds':>10}  {'LRU on demand':>14}  {'fill from yesterday':>20}  {'+ release schedule':>19}  {'oracle':>7}")
for frac in (0.02, 0.05, 0.10, 0.20):
    cap = int(TITLES * frac)
    lru = lru_run(cap, days[1:]); pro = proactive_run(cap, days[1:], ranks[:-1])
    pla = proactive_run(cap, days[1:], planned); orc = proactive_run(cap, days[1:], ranks[1:])
    print(f"{frac:>10.0%}  {lru:>14.1%}  {pro:>20.1%}  {pla:>19.1%}  {orc:>7.1%}")`,
      out: `disk holds   LRU on demand   fill from yesterday   + release schedule   oracle
        2%           36.4%                 37.5%                49.4%    50.2%
        5%           47.7%                 47.2%                59.4%    60.2%
       10%           57.4%                 55.6%                67.5%    68.4%
       20%           68.3%                 65.6%                76.2%    77.1%` },
    { t: "dl",
      items: [
        { term: "Knowing the schedule is the advantage",
          def: "Predicting from yesterday's popularity alone was no better than LRU (55.6% against 57.4% at 10% of the catalogue). Adding the release schedule raised it to 67.5%, within one point of an oracle that knew today's demand." },
        { term: "Fill off-peak",
          def: "A miss under LRU pulls the file across the ISP's upstream link at peak hour, the most expensive time. A nightly fill moves the same bytes when the link is idle." },
        { term: "Resilience as practice",
          def: "Netflix published Chaos Monkey in 2011, which terminates production instances at random during working hours so that every service is built to survive it. Hystrix, its circuit-breaker library, popularised the pattern before going into maintenance in 2018." }
      ] },
    { t: "h2",
      n: "02",
      id: "youtube",
      text: "YouTube: uploads, sharding and recommendations",
      sub: "Write-heavy video, a sharded database, a two-stage funnel" },
    { t: "p",
      text: "YouTube reported more than 500 hours of video uploaded every minute in 2019. Each upload is stored, then transcoded into many resolutions and codecs by a queue of independent jobs, so a slow job delays one video and not the site. Popular videos get more encodings, because the cost of encoding is paid once and the bandwidth saving is paid on every view; rarely watched ones get fewer." },
    { t: "dl",
      items: [
        { term: "Vitess",
          def: "Built at YouTube from 2010 to shard MySQL behind a proxy layer that routes queries by shard key, pools connections and rewrites dangerous queries. It is now a CNCF project, used by Slack among others." },
        { term: "Two-stage recommendations",
          def: "The 2016 paper 'Deep Neural Networks for YouTube Recommendations' described candidate generation from millions of videos followed by a ranking model trained to predict expected watch time rather than clicks, the funnel of lesson 13.5." },
        { term: "Specialised hardware",
          def: "In 2021 Google described Argos, a custom video-transcoding chip, because transcoding at that upload rate was a large and predictable compute cost." }
      ] },
    { t: "h2",
      n: "03",
      id: "amazon",
      text: "Amazon: services, ownership and isolation",
      sub: "Organisation shapes architecture" },
    { t: "p",
      text: "Amazon's retail site moved from a monolith to services in the early 2000s. In the widely circulated account by Steve Yegge (2011), teams were required to expose their data and functions only through service interfaces designed as if for outside developers. Small 'two-pizza' teams own a service end to end, including operating it. The pattern that later became AWS is visible here: internal interfaces built to external standards." },
    { t: "dl",
      items: [
        { term: "Dynamo (2007)",
          def: "The shopping cart had to accept writes even during failures. Dynamo used consistent hashing with virtual nodes, sloppy quorums with hinted handoff, and vector clocks; conflicting versions were merged by the application, so a deleted item could reappear in a cart. The trade-off was chosen deliberately: a lost 'add to cart' costs more than a reappearing item." },
        { term: "Cells",
          def: "A service is deployed as several independent copies, each serving a subset of customers, so a bad deploy or a poison request takes out one cell rather than the region." },
        { term: "Shuffle sharding",
          def: "Each customer is assigned a random small set of workers. Two customers rarely share the same set, so one customer's poison request takes down very few others completely. The exercise measures it." }
      ] },
    { t: "table",
      head: ["Company", "Forcing problem", "Decision", "Lesson to borrow"],
      rows: [
        [
          "Netflix",
          "Video bytes at a large share of peak traffic",
          "Own CDN inside ISPs, filled off-peak",
          "Split control and data planes"
        ],
        [
          "YouTube",
          "Massive upload rate, one MySQL",
          "Job queue for transcoding; Vitess",
          "Shard behind a routing layer"
        ],
        ["Amazon", "Hundreds of teams on one site", "Services owned by small teams", "Interfaces as the contract"],
        [
          "Amazon (Dynamo)",
          "Cart must always accept writes",
          "Availability over consistency",
          "Choose by the cost of each failure"
        ]
      ] },
    { t: "callout", kind: "trap", title: "Copying a design without the situation that justified it",
      body: [
        { t: "p", text: "Netflix's architecture made sense for Netflix's traffic, team count and failure costs. Adopting its microservices or its chaos engineering at a fraction of the scale brings the operational cost without the problem it solved." },
        { t: "p", text: "Read each published design for the forcing problem, and adopt a pattern only when you have that problem at a comparable scale." }
      ] },

    { t: "exercise",
      kind: "Challenge",
      title: "Measure the blast radius of shuffle sharding",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Eight workers serve 10,000 customers. One customer sends a request that crashes every worker it reaches. For four assignments (everyone on all eight workers, one worker each, four cells of two, and two random workers each), measure the share of other customers who lose all of their workers. Then compute how the number of possible shards grows with 100 workers and five per customer." }
      ],
      requirements: [
        "The four assignment schemes for 10,000 customers",
        "A function that kills the poison customer's workers and counts customers left with none",
        "The combinatorics: C(8, 2) and C(100, 5)"
      ],
      hint: "A customer is fully down when its set of workers is a subset of the dead set. itertools.combinations lists every possible shuffle shard.",
      solution: { lang: "python",
        title: "shuffle_shard.py",
        code: `import itertools, math
import numpy as np
rng = np.random.default_rng(5)

# 8 workers serve 10,000 customers. One customer sends a request that crashes every worker it reaches.
# How many other customers lose all their workers?
W, CUSTOMERS = 8, 10_000

def blast(assign, poison):
    dead = set(assign[poison])
    return np.mean([set(assign[c]) <= dead for c in range(CUSTOMERS) if c != poison])

shared = [tuple(range(W))] * CUSTOMERS                                     # every customer on every worker
sharded = [(c % W,) for c in range(CUSTOMERS)]                             # one shard each
cells = [tuple(range(2 * (c % 4), 2 * (c % 4) + 2)) for c in range(CUSTOMERS)]  # 4 cells of 2 workers
combos = list(itertools.combinations(range(W), 2))
shuffle = [combos[i] for i in rng.integers(0, len(combos), CUSTOMERS)]    # 2 random workers each

print(f"{'design':<34}{'customers fully down':>22}")
for name, a in (("shared pool of 8", shared), ("8 shards of 1", sharded), ("4 cells of 2", cells), ("shuffle shards of 2 from 8", shuffle)):
    print(f"{name:<34}{blast(a, 0):>22.2%}")
print(f"\\nshuffle-shard combinations: C(8,2) = {math.comb(8, 2)}; C(100,5) = {math.comb(100, 5):,}")
print(f"with 100 workers and 5 per customer, the chance another customer has the same 5 workers is 1 in {math.comb(100, 5):,}")`,
        out: `design                              customers fully down
shared pool of 8                                 100.00%
8 shards of 1                                     12.49%
4 cells of 2                                      24.99%
shuffle shards of 2 from 8                         3.66%

shuffle-shard combinations: C(8,2) = 28; C(100,5) = 75,287,520
with 100 workers and 5 per customer, the chance another customer has the same 5 workers is 1 in 75,287,520`,
        notes: [
          { t: "p",
            text: "A shared pool lost everyone. One shard per customer lost one in eight (12.5%), and four cells of two lost a quarter, because cells are bigger. Shuffle sharding with the same eight workers lost 3.7%, close to 1/28: only customers with exactly the same pair are fully down." },
          { t: "p",
            text: "Customers sharing one of the two workers lost half their capacity, so they need retries that go to their other worker. The isolation grows quickly with scale: with 100 workers and five each, the chance that another customer has the same five is 1 in 75,287,520. AWS has described using this for Route 53's DNS servers." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: one customer's request took down the region",
      body: [
        { t: "p",
          text: "**Symptom.** A multi-tenant API's error rate jumped to 100% for every customer within minutes; restarts brought servers back briefly before they crashed again." },
        { t: "p",
          text: "**Mechanism.** One customer's malformed payload triggered a crash in the parser. The load balancer retried the failing request on the next server, which crashed in turn, and every server was shared by every customer, so the retries worked through the whole fleet." },
        { t: "p",
          text: "**Fix.** The fleet was split into shuffle shards so each customer reached at most a few servers; retries stayed inside the customer's shard; and a request that crashed a server was recorded and rejected on sight. The next poison payload took down two servers and one customer's traffic." }
      ] }
  ],

  takeaways: [
    "Read real architectures for the **forcing problem**, not the logo.",
    "Netflix separates a **cloud control plane** (steering, accounts, recommendations) from an **ISP-embedded data plane** (video bytes).",
    "Measured: a fill from yesterday's popularity was no better than LRU (**55.6% vs 57.4%**); with the release schedule it reached **67.5%**, near the oracle's 68.4%.",
    "Fill caches **off-peak**: on-demand misses pull bytes over upstream links at the worst time.",
    "Chaos engineering makes failure routine so that services are built to survive it.",
    "YouTube: transcoding as an independent **job queue**; MySQL sharded behind **Vitess**; recommendations as a **two-stage funnel**.",
    "Amazon: **service interfaces** as contracts, small owning teams, and **Dynamo**'s deliberate choice of availability for the cart.",
    "Shuffle sharding cut full outages from **12.5%** (one shard each) to **3.7%** with the same eight workers.",
    "With 100 workers and 5 per customer there are **75 million** possible shards."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why can Netflix's appliances fill overnight rather than caching on demand?",
        options: [
          "Their disks are too small to cache on demand",
          "Netflix knows its catalogue and release schedule",
          "ISPs forbid any traffic to them during the day",
          "Video files change every night and need refreshing"
        ],
        answer: 1,
        why: "A content owner can predict demand from its own schedule and viewing data; in the simulation, the schedule raised the hit rate from 55.6% to 67.5%. A generic CDN only learns popularity from misses." },
      { stem: "In Dynamo's shopping cart, why might a deleted item reappear?",
        options: [
          "Deletes were not replicated to any other node",
          "Conflicting versions were merged by the application",
          "Vector clocks are only accurate to the second",
          "The cart was cached in the user's browser for a whole week"
        ],
        answer: 1,
        why: "Dynamo accepted writes during partitions and reconciled divergent versions by merging them; a merge that unions the items can resurrect a deleted one. Amazon judged that cheaper than rejecting an 'add to cart'." },
      { stem: "Eight workers, two random workers per customer. One customer crashes its two. Roughly what share of others is fully down?",
        options: [
          "About 1/8, the share of a single worker",
          "About 1/28, the share with the same pair",
          "About 1/4, the share of a two-worker cell",
          "About 1/2, since each loses half of its pair"
        ],
        answer: 1,
        why: "Only customers with exactly the same pair lose everything; there are C(8,2) = 28 pairs, and the simulation measured 3.7%. Customers sharing one worker lose half their capacity, not all." },
      { stem: "What did YouTube build Vitess to do?",
        options: [
          "Transcode uploads into many resolutions",
          "Shard MySQL behind a routing proxy layer",
          "Serve video from inside ISP networks",
          "Train its watch-time ranking models faster"
        ],
        answer: 1,
        why: "Vitess routes queries to MySQL shards by key, pools connections and protects the databases; it let YouTube keep MySQL as it grew and is now a CNCF project." }
    ] },

  interview: { title: "In an interview",
    sub: "Cite a real system as evidence, and say what made its choice right.",
    questions: [
      { level: "core",
        q: "Design a video streaming service. What would you borrow from Netflix?",
        strong: "A strong answer separates control and data planes, explains the edge fill, and says when a third-party CDN is enough.",
        answer: [
          { t: "p",
            text: "The split: small, latency-sensitive control requests (accounts, catalogue, recommendations, choosing a file and a server) in a cloud region, and video bytes from caches as close to viewers as possible. Each title is encoded once into a ladder of bitrates and the client switches between them as bandwidth changes." },
          { t: "p",
            text: "Netflix's own appliances inside ISPs make sense at its scale because it knows what will be watched and moves bytes off-peak. A new service would start with a commercial CDN and only build its own when traffic and the ability to predict demand justify it." }
        ] },
      { level: "advanced",
        q: "How would you stop one tenant from taking down a multi-tenant service?",
        strong: "A strong answer combines rate limits, cells, shuffle sharding and poison-request handling, with numbers.",
        answer: [
          { t: "p",
            text: "Per-tenant rate limits and quotas first. Then isolation: cells so a bad deploy or overload is contained to a fraction of tenants, and within a cell shuffle sharding so a poison request reaches only a few workers. With eight workers and pairs, a crash fully affects about 1 in 28 other tenants; with 100 workers and five each it is negligible." },
          { t: "p",
            text: "Retries must stay inside the tenant's shard, or they spread the damage, and a request that crashes a worker is recorded and rejected afterwards. I would deploy cell by cell, so a bad release is caught in one cell." }
        ] },
      { level: "core",
        q: "What does Amazon's Dynamo teach about choosing consistency?",
        strong: "A strong answer ties the choice to the business cost of each failure, not to a preference.",
        answer: [
          { t: "p",
            text: "Dynamo chose to accept every write and merge conflicts later, because a refused 'add to cart' loses a sale while a resurrected item costs a click to remove. The lesson is to price the two failure modes. A bank balance makes the opposite choice for the same reason, and many systems mix the two: the cart is always writable, the order and payment are not." }
        ] }
    ] }
});
