/* ============================================================================
   LESSON 13.2 — Data Pipelines, Feature Stores and Skew
   ========================================================================= */
EC.receiveLesson({
  id: "13.2",

  lede: "A model is only as good as the numbers it is given, and the classic ML failures are data failures that no amount of modelling can fix. A training set that quietly includes the future — measured here on PostgreSQL, a feature joined from today's table scored an AUC of 0.85 offline and 0.75 on what serving could actually know, and made the weaker of two features look like the best. A feature computed one way for training and another way in production. A pipeline that silently stops. This lesson builds the data side of an ML system: how events become training sets and served features, the **feature store** with its offline and online halves, **point-in-time correctness**, and **training–serving skew**, caught with a drift statistic before it costs accuracy.",

  objectives: [
    "Lay out an ML data pipeline from events and tables to training sets and served features",
    "Explain and prevent leakage with point-in-time joins, including when a snapshot became available",
    "Describe a feature store's offline and online halves and why one definition feeds both",
    "Detect training–serving skew with a population stability index, and prevent it by logging served features",
    "Choose between batch, streaming and request-time features by the freshness they need"
  ],

  prerequisites: ["13.1", "6.2", "6.4"],

  blocks: [

    { t: "h2", n: "01", id: "pipeline", text: "From events to features",
      sub: "Two consumers of the same data, with very different needs" },

    { t: "viz", title: "A feature store: one definition, two stores",
      caption: "Sources arrive as streams and as warehouse tables. Feature logic is written once and run by streaming jobs (seconds-fresh values) and batch jobs (daily aggregates). Every value lands twice: in the offline store, which keeps the full history so training can ask \"what was this on 3 March at 14:00?\", and in the online store, which keeps only the latest value per key so serving can read it in a fraction of a millisecond. Features that only exist at request time — the cart, the device — are computed by the same code in the serving path. Logging what was actually served closes the loop.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="A feature store: one definition feeding an offline and an online store">
<defs><marker id="fs-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="95" y="16" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">sources</text>
<text x="290" y="16" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">compute</text>
<text x="500" y="16" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">store</text>
<text x="680" y="16" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">use</text>
<rect x="20" y="36" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="95.0" y="59.0" text-anchor="middle" class="s-label">event stream</text><text x="95.0" y="76.0" text-anchor="middle" class="s-sub">clicks, payments (Kafka)</text>
<rect x="20" y="126" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="95.0" y="149.0" text-anchor="middle" class="s-label">warehouse</text><text x="95.0" y="166.0" text-anchor="middle" class="s-sub">orders, profiles</text>
<rect x="20" y="250" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="95.0" y="273.0" text-anchor="middle" class="s-label">the request</text><text x="95.0" y="290.0" text-anchor="middle" class="s-sub">cart, device, time</text>
<rect x="204" y="26" width="172" height="162" rx="12" style="fill:var(--violet);fill-opacity:.05;stroke:var(--violet);stroke-dasharray:5 4"/>
<text x="290" y="204" text-anchor="middle" class="s-sub" style="fill:var(--violet)">one feature definition</text>
<rect x="214" y="36" width="152" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.5"/><text x="290.0" y="59.0" text-anchor="middle" class="s-label">streaming job</text><text x="290.0" y="76.0" text-anchor="middle" class="s-sub">Flink: seconds old</text>
<rect x="214" y="126" width="152" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.5"/><text x="290.0" y="149.0" text-anchor="middle" class="s-label">batch job</text><text x="290.0" y="166.0" text-anchor="middle" class="s-sub">Spark, SQL: daily</text>
<rect x="420" y="36" width="160" height="60" rx="8" class="s-fill" style="stroke:var(--teal);stroke-width:1.5"/><text x="500.0" y="63.0" text-anchor="middle" class="s-label">offline store</text><text x="500.0" y="80.0" text-anchor="middle" class="s-sub">full history, by time</text>
<rect x="420" y="156" width="160" height="60" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.5"/><text x="500.0" y="183.0" text-anchor="middle" class="s-label">online store</text><text x="500.0" y="200.0" text-anchor="middle" class="s-sub">latest value per key</text>
<rect x="616" y="36" width="128" height="60" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.5"/><text x="680.0" y="63.0" text-anchor="middle" class="s-label">training</text><text x="680.0" y="80.0" text-anchor="middle" class="s-sub">point-in-time joins</text>
<rect x="616" y="156" width="128" height="60" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.5"/><text x="680.0" y="183.0" text-anchor="middle" class="s-label">serving</text><text x="680.0" y="200.0" text-anchor="middle" class="s-sub">lookup ~0.1 ms</text>
<line x1="170" y1="62" x2="212" y2="62" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="170" y1="152" x2="212" y2="152" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="366" y1="56" x2="418" y2="60" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="366" y1="72" x2="418" y2="172" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="366" y1="140" x2="418" y2="80" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="366" y1="160" x2="418" y2="186" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="580" y1="66" x2="614" y2="66" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<line x1="580" y1="186" x2="614" y2="186" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<path d="M170 276 H680 V218" style="fill:none;stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#fs-a)"/>
<text x="420" y="270" text-anchor="middle" class="s-sub">request-time features, computed by the same code</text>
<path d="M744 186 H752 V66 H746" style="fill:none;stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.5" marker-end="url(#fs-a)"/>
<text x="700" y="128" text-anchor="middle" class="s-sub" style="fill:var(--warn)">log what was</text>
<text x="700" y="142" text-anchor="middle" class="s-sub" style="fill:var(--warn)">served, train on it</text>
</svg>` },

    { t: "p", text: "Training wants **history**: millions of labelled examples, each with the feature values as they were at the moment of the example, read in bulk once a day. Serving wants **now**: one entity's current values, in a millisecond, thousands of times a second. Those are different storage problems — a columnar table partitioned by time against a key-value store — and the danger is that they get different code. Labels arrive through the same pipeline, and how they arrive shapes the design:" },

    { t: "dl", items: [
      { term: "Implicit labels", def: "Clicks, purchases, watch time, skips: plentiful and immediate, but noisy and biased by what the system chose to show (position bias, 13.5)." },
      { term: "Explicit labels", def: "Ratings, reports, thumbs up: cleaner but sparse, and given by an unrepresentative minority." },
      { term: "Delayed labels", def: "A chargeback arrives weeks after the payment; a loan defaults after months. Training data is always that far behind, and monitoring must cope (13.4)." },
      { term: "Human labels", def: "Reviewers and annotators: expensive and slow, so spent where the model is uncertain — the review band of 13.1's exercise." }
    ] },

    { t: "callout", kind: "warn", title: "Split by time, never at random",
      body: [
        { t: "p", text: "Rows from the same user, session or week are correlated. A random split puts some of them in training and some in test, and the model is graded partly on what it has already seen. Train on the past and test on a later period — exactly how it will be used — and keep a gap between them if labels take time to mature." }
      ] },

    { t: "h2", n: "02", id: "leakage", text: "Point-in-time correctness",
      sub: "Every training row may only see what was knowable at its moment" },

    { t: "p", text: "**Leakage** is a feature that contains information from after the moment of prediction. It is easy to create: the convenient table to join is the one that is current today, and today's table knows the future of every historical row. A year of orders for 20,000 customers in PostgreSQL; the task is to predict, on 1 June, who will order in the next 30 days; and three ways of building the \"how much has this customer ordered\" feature:" },

    { t: "code", lang: "python", title: "pit.py — the same feature joined three ways, scored offline and as serving would see it",
      code: `import datetime as dt, random, psycopg
random.seed(2)
db = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)

# a year of orders: 20,000 customers, each with their own rate and a day on which they quietly leave
START = dt.date(2025, 1, 1)
db.execute("DROP TABLE IF EXISTS orders, user_stats")
db.execute("CREATE TABLE orders (user_id int, ordered_on date)")
with db.cursor().copy("COPY orders FROM STDIN") as copy:
    for user in range(20_000):
        rate, leaves = random.lognormvariate(-3.2, 0.8), random.randint(30, 900)
        day = random.expovariate(rate)
        while day < min(leaves, 365):
            copy.write_row((user, START + dt.timedelta(days=int(day)))); day += random.expovariate(rate)
# the table everyone joins to: lifetime stats, refreshed nightly, so it always reflects *today*
db.execute("CREATE TABLE user_stats AS SELECT user_id, count(*) AS lifetime_orders FROM orders GROUP BY user_id")

FEATURES = {                       # three ways to get "how much has this customer ordered" for a training row
    "joined":  "SELECT user_id, lifetime_orders AS f FROM user_stats",           # today's table, joined to old rows
    "as of":   "SELECT user_id, count(*) AS f FROM orders WHERE ordered_on < %(d)s GROUP BY user_id",
    "90 days": "SELECT user_id, count(*) AS f FROM orders WHERE ordered_on < %(d)s "
               "AND ordered_on >= %(d)s::date - 90 GROUP BY user_id",
}
def training_set(cutoff, feature):  # a row per customer: the feature at the cutoff, label = ordered in the next 30 days
    return db.execute(f"""
        WITH feature AS ({FEATURES[feature]}),
             label AS (SELECT DISTINCT user_id FROM orders
                       WHERE ordered_on >= %(d)s AND ordered_on < %(d)s::date + 30)
        SELECT coalesce(feature.f, 0), label.user_id IS NOT NULL
        FROM generate_series(0, 19999) AS c(user_id) LEFT JOIN feature USING (user_id) LEFT JOIN label USING (user_id)""",
        {"d": cutoff}).fetchall()

def auc(rows):                     # chance that a customer who ordered outranks one who did not (ties count half)
    pos = sorted(f for f, y in rows if y); neg = sorted(f for f, y in rows if not y)
    wins, j, k = 0.0, 0, 0
    for p in pos:
        while j < len(neg) and neg[j] < p: j += 1
        k = j
        while k < len(neg) and neg[k] == p: k += 1
        wins += j + (k - j) / 2
    return wins / (len(pos) * len(neg))

print(f"{db.execute('SELECT count(*) FROM orders').fetchone()[0]:,} orders by 20,000 customers in 2025\\n")
print(f"{'feature, for training rows cut off on 1 June':<46}{'AUC offline':>12}{'at serving':>12}")
for name, offline, served in [("lifetime orders, joined from user_stats", "joined", "as of"),
                              ("lifetime orders, as of the cutoff", "as of", "as of"),
                              ("orders in the 90 days before the cutoff", "90 days", "90 days")]:
    # offline: the training set as built; at serving: what the feature could actually have been on 1 June
    print(f"{name:<46}{auc(training_set('2025-06-01', offline)):>12.3f}{auc(training_set('2025-06-01', served)):>12.3f}")`,
      hl: [18, 19, 20, 21, 28],
      out: `337,735 orders by 20,000 customers in 2025

feature, for training rows cut off on 1 June   AUC offline  at serving
lifetime orders, joined from user_stats              0.852       0.754
lifetime orders, as of the cutoff                    0.754       0.754
orders in the 90 days before the cutoff              0.771       0.771` },

    { t: "viz", title: "What each training row is allowed to see",
      caption: "For a row cut off on 1 June, features may use anything before the dashed line and the label uses the 30 days after it. A lifetime count taken from today's stats table spans the whole year, including the label window: customers who were going to order in June have, by construction, more lifetime orders. That is why it scored 0.85 offline and only 0.75 once its values were restricted to what existed on 1 June.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Which time ranges a training row may look at">
<line x1="200.0" y1="30" x2="200.0" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="222.0" y="194" text-anchor="middle" class="s-sub">Jan</text>
<line x1="245.9" y1="30" x2="245.9" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="267.9" y="194" text-anchor="middle" class="s-sub">Feb</text>
<line x1="287.3" y1="30" x2="287.3" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="309.3" y="194" text-anchor="middle" class="s-sub">Mar</text>
<line x1="333.2" y1="30" x2="333.2" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="355.2" y="194" text-anchor="middle" class="s-sub">Apr</text>
<line x1="377.5" y1="30" x2="377.5" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="399.5" y="194" text-anchor="middle" class="s-sub">May</text>
<line x1="423.4" y1="30" x2="423.4" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="445.4" y="194" text-anchor="middle" class="s-sub">Jun</text>
<line x1="467.8" y1="30" x2="467.8" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="489.8" y="194" text-anchor="middle" class="s-sub">Jul</text>
<line x1="513.6" y1="30" x2="513.6" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="535.6" y="194" text-anchor="middle" class="s-sub">Aug</text>
<line x1="559.5" y1="30" x2="559.5" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="581.5" y="194" text-anchor="middle" class="s-sub">Sep</text>
<line x1="603.9" y1="30" x2="603.9" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="625.9" y="194" text-anchor="middle" class="s-sub">Oct</text>
<line x1="649.8" y1="30" x2="649.8" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="671.8" y="194" text-anchor="middle" class="s-sub">Nov</text>
<line x1="694.1" y1="30" x2="694.1" y2="176" style="stroke:var(--line);stroke-opacity:.35"/>
<text x="716.1" y="194" text-anchor="middle" class="s-sub">Dec</text>
<line x1="423.4" y1="22" x2="423.4" y2="178" style="stroke:var(--ink-2);stroke-dasharray:4 3" stroke-width="1.5"/>
<text x="423.4" y="16" text-anchor="middle" class="s-sub" style="fill:var(--ink)">cutoff: 1 June</text>
<text x="190" y="51" text-anchor="end" class="s-label">orders, last 90 days</text>
<rect x="290.2" y="34" width="133.2" height="24" rx="4" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
<text x="356.8" y="50" text-anchor="middle" class="s-sub" style="fill:var(--ink)">allowed</text>
<text x="190" y="87" text-anchor="end" class="s-label">label: next 30 days</text>
<rect x="423.4" y="70" width="44.4" height="24" rx="4" style="fill:var(--accent);fill-opacity:.3;stroke:var(--accent)"/>
<text x="190" y="123" text-anchor="end" class="s-label">lifetime, as of cutoff</text>
<rect x="200.0" y="106" width="223.4" height="24" rx="4" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)"/>
<text x="311.7" y="122" text-anchor="middle" class="s-sub" style="fill:var(--ink)">allowed</text>
<text x="190" y="159" text-anchor="end" class="s-label">lifetime, today's table</text>
<rect x="200.0" y="142" width="538.5" height="24" rx="4" style="fill:var(--crit);fill-opacity:.3;stroke:var(--crit)"/>
<text x="580.2" y="158" text-anchor="middle" class="s-sub" style="fill:var(--ink)">sees the label window and beyond</text>
</svg>` },

    { t: "p", text: "The leaky feature did not just overstate accuracy; it reversed the decision. Offline, lifetime orders (0.852) beat the 90-day count (0.771) by a wide margin, so a team would ship it — and in production it is the weaker of the two. Real leaks are subtler than this one: an account status that changes to \"closed\" after fraud is confirmed, a support-ticket count that rises because of the problem being predicted, an aggregate whose window accidentally includes the current day. The defence is mechanical: every feature row carries the time from which it was valid, and training joins **as of** each label's timestamp." },

    { t: "h2", n: "03", id: "feature-store", text: "The feature store",
      sub: "Compute once, write twice, read two ways" },

    { t: "p", text: "A feature store (Feast, Tecton, Vertex AI and SageMaker Feature Store, or an in-house one) makes point-in-time correctness and consistency the default instead of a discipline. Feature definitions are registered once; scheduled and streaming jobs **materialise** them into both stores; training retrieves history with as-of joins; serving reads the latest values by key. A working miniature on PostgreSQL (offline) and Redis (online), reusing pit.py's orders:" },

    { t: "code", lang: "python", title: "fstore.py — one definition materialised to PostgreSQL and Redis, read both ways",
      code: `import datetime as dt, random, statistics, time, psycopg, redis
random.seed(9)
db = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)
online = redis.Redis(port=6380)

# ONE definition of the feature, used for both halves of the store (orders table from pit.py)
FEATURE_SQL = """SELECT user_id, count(*) FILTER (WHERE ordered_on >= %(d)s::date - 90) AS orders_90d,
                        count(*) AS orders_lifetime
                 FROM orders WHERE ordered_on < %(d)s GROUP BY user_id"""

def materialise(day):              # a scheduled job: compute once, write the offline row and the online key
    rows = db.execute(FEATURE_SQL, {"d": day}).fetchall()
    with db.cursor().copy("COPY feature_history (user_id, valid_from, orders_90d, orders_lifetime) FROM STDIN") as c:
        for user, f90, life in rows: c.write_row((user, day, f90, life))
    pipe = online.pipeline()
    for user, f90, life in rows: pipe.hset(f"user:{user}", mapping={"orders_90d": f90, "orders_lifetime": life})
    pipe.execute()
    return len(rows)

db.execute("DROP TABLE IF EXISTS feature_history, label_events")
db.execute("CREATE TABLE feature_history (user_id int, valid_from date, orders_90d int, orders_lifetime int)")
online.flushdb()
days = [dt.date(2025, 11, 24) + dt.timedelta(d) for d in range(7)]
start = time.perf_counter(); written = sum(materialise(d) for d in days)
db.execute("CREATE INDEX ON feature_history (user_id, valid_from)")
print(f"materialised 7 daily runs in {time.perf_counter() - start:.1f} s: {written:,} rows offline, "
      f"{online.dbsize():,} keys online (latest values only)")

# serving: one key lookup per request
users = random.sample([int(k.split(b":")[1]) for k in online.keys("user:*")], 2000)
lat = []
for u in users:
    t = time.perf_counter(); online.hgetall(f"user:{u}"); lat.append((time.perf_counter() - t) * 1000)
q = statistics.quantiles(lat, n=100)
print(f"online read, one user per request:  p50 {q[49]:.2f} ms, p99 {q[98]:.2f} ms")

# training: labelled events at arbitrary moments, each joined to the snapshot in force at that moment
db.execute("SELECT setseed(0.42)")
db.execute("CREATE TABLE label_events AS SELECT (random() * 19999)::int AS user_id, "
           "date '2025-11-24' + (random() * 7)::int AS happened_on, random() < 0.3 AS label FROM generate_series(1, 5000)")
start = time.perf_counter()
rows = db.execute("""SELECT e.user_id, e.happened_on, f.valid_from, f.orders_90d, e.label FROM label_events e
                     LEFT JOIN LATERAL (SELECT valid_from, orders_90d FROM feature_history h
                                        WHERE h.user_id = e.user_id AND h.valid_from <= e.happened_on
                                        ORDER BY valid_from DESC LIMIT 1) f ON true""").fetchall()
ms = (time.perf_counter() - start) * 1000
late = sum(1 for _, happened, valid_from, *_ in rows if valid_from and valid_from > happened)
missing = sum(1 for row in rows if row[2] is None)
print(f"point-in-time training set: {len(rows):,} rows in {ms:.0f} ms; {late} use a value from after their event, "
      f"{missing} have no history (default 0)")
naive = db.execute("""SELECT count(*) FROM label_events e JOIN feature_history h
                      ON h.user_id = e.user_id AND h.valid_from = %s WHERE h.valid_from > e.happened_on""", (days[-1],)).fetchone()[0]
print(f"the same events joined to the latest run instead: {naive:,} rows use a value from after their event")

latest = dict(db.execute("SELECT user_id, orders_90d FROM feature_history WHERE valid_from = %s", (days[-1],)).fetchall())
mismatch = sum(1 for u, v in latest.items() if int(online.hget(f"user:{u}", "orders_90d")) != v)
print(f"online against offline for the latest run: {mismatch} mismatches in {len(latest):,} users")`,
      hl: [7, 11, 16, 43, 44],
      out: `materialised 7 daily runs in 1.8 s: 136,803 rows offline, 19,546 keys online (latest values only)
online read, one user per request:  p50 0.09 ms, p99 0.17 ms
point-in-time training set: 5,000 rows in 17 ms; 0 use a value from after their event, 132 have no history (default 0)
the same events joined to the latest run instead: 3,821 rows use a value from after their event
online against offline for the latest run: 0 mismatches in 19,546 users` },

    { t: "p", text: "Seven nightly runs wrote the full history offline and only the latest values online. Serving read a user's features in about a tenth of a millisecond. The training set for 5,000 labelled events took milliseconds with a lateral as-of join, and no row used a value from after its event; joining the same events to the latest run, the shortcut everyone reaches for, gave most rows a value from the future. And because both stores were written by the same job from the same query, they agreed on every one of nearly 20,000 users." },

    { t: "diagram", kind: "matrix", title: "How fresh does a feature need to be?",
      cols: ["Example", "Computed by", "Typical freshness"],
      rows: ["Batch", "Streaming", "Request-time"],
      cells: [
        [{ text: "orders in 90 days" }, { text: "Spark or SQL, nightly", tone: "violet" }, { text: "hours to a day", tone: "warn" }],
        [{ text: "payments in 10 minutes" }, { text: "Flink on the event log", tone: "violet" }, { text: "seconds", tone: "good" }],
        [{ text: "cart total, device" }, { text: "the serving code", tone: "violet" }, { text: "exact", tone: "good" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Freshness costs",
      body: [
        { t: "p", text: "A fraud model needs to know about the ten payments made in the last minute, which means a streaming pipeline, an online store under heavy write load, and the operational burden of both. A recommendation model rarely gains from minute-fresh lifetime statistics. Decide per feature: measure the offline gain from fresher values (recompute with an artificial delay and compare), and pay for streaming only where it shows." }
      ] },

    { t: "h2", n: "04", id: "skew", text: "Training–serving skew",
      sub: "The same feature, computed twice, is two features" },

    { t: "p", text: "**Skew** is any difference between the features a model was trained on and those it receives in production. The classic cause is two implementations: data scientists build training data in SQL or Spark, and an engineering team rewrites the logic in the serving language. A model trained on net basket value (refunds subtracted), then served by three implementations — and the **population stability index** (PSI) comparing each served distribution with training's:" },

    { t: "code", lang: "python", title: "skew.py — one model, three serving implementations, and the drift statistic that tells them apart",
      code: `import math, random
random.seed(4)

def customer():                    # last month's orders (in pounds), some refunded; label: buys again next month
    orders = [round(random.lognormvariate(3.4, 0.6), 2) for _ in range(random.randint(1, 10))]
    refunded = [o for o in orders if random.random() < random.choice([0.02, 0.05, 0.4])]
    logit = -2.2 + 0.3 * len(orders) + 0.02 * (sum(orders) - sum(refunded)) / len(orders) - 3 * len(refunded) / len(orders)
    return orders, refunded, random.random() < 1 / (1 + math.exp(-logit))

def features_training(orders, refunded):      # the pipeline that built the training set
    return [(sum(orders) - sum(refunded)) / len(orders), len(orders)]
def features_forgot_refunds(orders, refunded):  # the serving team's re-implementation
    return [sum(orders) / len(orders), len(orders)]
def features_in_pence(orders, refunded):       # another re-implementation: same logic, different units
    return [100 * (sum(orders) - sum(refunded)) / len(orders), len(orders)]

train, test = [customer() for _ in range(20_000)], [customer() for _ in range(10_000)]
X = [features_training(o, r) for o, r, _ in train]; Y = [y for *_, y in train]
mean = [sum(c) / len(c) for c in zip(*X)]; sd = [math.sqrt(sum((v - m) ** 2 for v in c) / len(c)) for c, m in zip(zip(*X), mean)]
scale = lambda x: [(v - m) / s for v, m, s in zip(x, mean, sd)]
w, b = [0.0, 0.0], 0.0
for epoch in range(15):                                # logistic regression by stochastic gradient descent
    for x, y in zip(map(scale, X), Y):
        p = 1 / (1 + math.exp(-(sum(wi * xi for wi, xi in zip(w, x)) + b)))
        w = [wi - 0.01 * (p - y) * xi for wi, xi in zip(w, x)]; b -= 0.01 * (p - y)
predict = lambda x: 1 / (1 + math.exp(-max(-30, min(30, sum(wi * xi for wi, xi in zip(w, scale(x))) + b))))

def auc(scores, labels):                         # rank-based, with tied scores sharing their average rank
    ranked, rank_sum, i = sorted(zip(scores, labels)), 0.0, 0
    while i < len(ranked):
        j = i
        while j < len(ranked) and ranked[j][0] == ranked[i][0]: j += 1
        rank_sum += sum(1 for _, y in ranked[i:j] if y) * (i + j + 1) / 2; i = j
    pos = sum(labels)
    return (rank_sum - pos * (pos + 1) / 2) / (pos * (len(labels) - pos))

def psi(expected, actual, bins=10):              # population stability index over the training deciles
    edges = sorted(expected)[len(expected) // bins::len(expected) // bins][:bins - 1]
    share = lambda xs: [max(1e-4, sum(1 for x in xs if lo <= x < hi) / len(xs))
                        for lo, hi in zip([-math.inf] + edges, edges + [math.inf])]
    return sum((a - e) * math.log(a / e) for e, a in zip(share(expected), share(actual)))

labels = [y for *_, y in test]
print(f"{'serving computes the features with':<34}{'PSI':>6}{'AUC':>7}{'mean prediction':>17}{'actual':>8}")
for name, fn in [("the training pipeline's code", features_training), ("a rewrite that forgets refunds", features_forgot_refunds),
                 ("a rewrite that works in pence", features_in_pence)]:
    served = [fn(o, r) for o, r, _ in test]
    scores = [predict(x) for x in served]
    drift = psi([x[0] for x in X], [x[0] for x in served])
    print(f"{name:<34}{drift:>6.2f}{auc(scores, labels):>7.3f}{sum(scores) / len(scores):>17.0%}{sum(labels) / len(labels):>8.0%}")`,
      hl: [10, 12, 14, 37],
      out: `serving computes the features with   PSI    AUC  mean prediction  actual
the training pipeline's code        0.00  0.729              41%     43%
a rewrite that forgets refunds      0.31  0.701              46%     43%
a rewrite that works in pence       7.66  0.524              98%     43%` },

    { t: "p", text: "The rewrite that forgot refunds raised every refunding customer's basket value. Nothing errored and the predictions looked plausible, but accuracy fell and the average prediction rose five points above what the same model predicted with correct features — a silent loss that offline evaluation can never show, because offline uses the training code. The pence bug is the loud version: predictions pinned near 100% and an AUC barely better than a coin. PSI flagged both. A common rule of thumb: below 0.1 stable, 0.1 to 0.25 worth investigating, above 0.25 a significant shift — 0.31 and 7.66 here." },

    { t: "callout", kind: "good", title: "Make skew structurally impossible",
      body: [
        { t: "p", text: "Use one implementation for both paths — a feature store's definitions, or a shared library — rather than a specification and two codebases. Better still, **log the features at serving time** with each prediction and build training sets from those logs (\"log and wait\"): the model then trains on exactly what it will see, bugs included. Monitor PSI on every feature in production, and run a consistency test that recomputes a sample of served features through the training pipeline and compares." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A point-in-time join with availability and a TTL",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "A nightly batch job snapshots each user's feature as of midnight, but it takes until 02:30 to finish — so at 01:00 the serving system still has yesterday's value. On 12 November the job failed and wrote nothing. Write the point-in-time lookup a training-set builder needs: for each labelled event, the latest snapshot that serving could actually have used, with a time-to-live after which a value counts as missing. Show how many rows a join on the snapshot's as-of time gets wrong." }
      ],
      requirements: [
        "Keep, for each snapshot, both the time its data describes and the time it became available",
        "Look up by binary search, joining on availability time, never on the as-of time",
        "Return nothing when the newest usable snapshot is older than the TTL",
        "Count the rows that a join on as-of time would have filled with a not-yet-available value"
      ],
      hint: "bisect_right over the sorted availability times, minus one, is the latest snapshot available at or before the event.",
      solution: { lang: "python", title: "pit_ex.py",
        code: `import bisect, datetime as dt, random
random.seed(8)
H = dt.timedelta(hours=1)

# A nightly job snapshots each user's feature as of midnight; it finishes at 02:30, and on 12 Nov it failed.
DAYS = [dt.datetime(2025, 11, 1) + d * 24 * H for d in range(30)]
RUNS = [(day, day + 2.5 * H) for day in DAYS if day.day != 12]          # (data as of, available from)
HISTORY = {u: [(as_of, ready, random.randint(0, 20)) for as_of, ready in RUNS] for u in range(200)}
EVENTS = [(random.randrange(200), DAYS[1] + random.random() * 28 * 24 * H) for _ in range(5000)]

def point_in_time(user, at, key, ttl=None):
    """The latest snapshot whose \`key\` time is at or before \`at\`; None if there is none or it is older than ttl."""
    rows = HISTORY[user]
    i = bisect.bisect_right([r[key] for r in rows], at) - 1
    if i < 0 or (ttl and at - rows[i][0] > ttl): return None
    return rows[i]

by_event_time = [point_in_time(u, t, key=0) for u, t in EVENTS]
by_available = [point_in_time(u, t, key=1) for u, t in EVENTS]
with_ttl = [point_in_time(u, t, key=1, ttl=36 * H) for u, t in EVENTS]

not_ready = lambda rows: sum(1 for (u, t), r in zip(EVENTS, rows) if r[1] > t)
older = sum(1 for a, b in zip(by_event_time, by_available) if a != b)
stale = sum(1 for r in with_ttl if r is None)
print(f"{len(EVENTS):,} labelled events")
print(f"joined on the snapshot's as-of time:      {not_ready(by_event_time)} rows use a snapshot that was not yet ready")
print(f"joined on when the snapshot was ready:    {not_ready(by_available)} such rows; {older} rows use the previous one")
print(f"plus a 36-hour TTL:                       {stale} rows marked missing after the failed run of 12 Nov")`,
        out: `5,000 labelled events
joined on the snapshot's as-of time:      504 rows use a snapshot that was not yet ready
joined on when the snapshot was ready:    0 such rows; 504 rows use the previous one
plus a 36-hour TTL:                       119 rows marked missing after the failed run of 12 Nov`,
        notes: [
          { t: "p", text: "About one event in ten falls between midnight and 02:30, and every one of those got the new snapshot when joined on as-of time — a value the production system could not have had. That is a small, systematic leak of the kind that inflates offline metrics by a little and is almost never found. Joining on availability gives those rows the previous day's value, which is what the model will really see." },
          { t: "p", text: "The TTL turned the failed run into missing values rather than silently stale ones. Whether missing is better than stale depends on the feature, but either way the model should be trained with the same rule serving applies — a serving path that falls back to a default when the online value has expired must have training rows that do the same." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the fraud model that was perfect until launch",
      body: [
        { t: "p", text: "**Symptom.** A new fraud model reached a PR-AUC of 0.91 offline, against 0.62 for the model in production. In a shadow launch it scored 0.58 — worse than the model it was meant to replace." },
        { t: "p", text: "**Mechanism.** One of its strongest features was the number of support contacts in the customer's account. The training set joined the current contact count to each historical payment. Customers who had been defrauded contacted support afterwards to report it, so the feature encoded the label. At serving time, when the payment was being made, those contacts had not happened yet." },
        { t: "p", text: "**Fix.** All features moved to the feature store with validity timestamps, and training sets are now built only with as-of joins on availability time. A launch check trains with each feature removed in turn; a single feature responsible for most of the gain is reviewed for leakage before anything ships." }
      ] }
  ],

  takeaways: [
    "Training wants **history** in bulk; serving wants **the latest value** in a millisecond — two stores, one definition.",
    "Know your labels: implicit, explicit, **delayed** or human; and **split by time**, never at random.",
    "**Leakage**: today's table joined to old rows scored **0.85 offline against 0.75** on what was knowable, and made the weaker feature look best.",
    "Every feature value carries a **valid-from** time; training joins **as of** each label's moment.",
    "Join on when a snapshot became **available**, not the time it describes; and apply a **TTL** the same way in training and serving.",
    "A feature store **materialises** each definition to an offline history and an online key-value store; measured, online reads took about **0.1 ms** and both halves agreed on every user.",
    "Pay for **streaming** features only where freshness measurably helps.",
    "**Skew**: a rewrite that forgot refunds cost accuracy silently; one in pence made predictions useless. **PSI** caught both (0.31 and 7.66).",
    "Prevent skew with **one implementation** and by **logging served features** to train on."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A feature joined from a table that is refreshed nightly with current values gives a much better offline AUC than anything else. What should you suspect?",
        options: ["A great feature", "Leakage: joined to historical rows, today's values include information from after each row's prediction moment", "Overfitting from too many features", "A bug in the AUC calculation"],
        answer: 1,
        why: "Today's table knows the future of every historical row. In pit.py the joined lifetime count scored 0.852 offline and 0.754 when restricted to what existed at the cutoff — and the honest 90-day feature was actually better." },

      { stem: "A nightly feature snapshot describes data up to midnight but is ready at 02:30. A label event happens at 01:00. Which snapshot belongs in its training row?",
        options: ["Tonight's, since it describes data before the event", "Yesterday's: at 01:00 serving could only have used the snapshot that was already available", "None", "Whichever is closer in time"],
        answer: 1,
        why: "Training must reproduce what serving saw. Joining on the as-of time hands about one row in ten a value that was not yet available, a small systematic leak." },

      { stem: "Why does a feature store keep two stores rather than one?",
        options: ["For backup", "Training needs the full history queried in bulk by time; serving needs only the latest value per key at very low latency — different storage problems", "Regulations require it", "One is for staging"],
        answer: 1,
        why: "The offline store answers \"what was this value at time t\" over millions of rows; the online store answers \"what is it now\" for one key in about a tenth of a millisecond. Writing both from one definition is what keeps them consistent." },

      { stem: "Production predictions drift upward after a serving rewrite, with no errors. What check would have caught it?",
        options: ["Unit tests of the model", "Comparing the distribution of each served feature with training's — for example the population stability index — and recomputing a sample of served features through the training pipeline", "A larger training set", "Raising the decision threshold"],
        answer: 1,
        why: "The skew was in the features, not the model. PSI over the served basket value was 0.31 for the rewrite that forgot refunds — well above the usual 0.25 alarm level — while nothing failed loudly." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Data questions are where ML system designs are won; name the mechanism, not just the risk.",
    questions: [
      { level: "core",
        q: "What is training–serving skew and how do you prevent it?",
        strong: "A strong answer names the causes and gives structural prevention plus detection.",
        answer: [
          { t: "p", text: "Any difference between the feature values a model was trained on and those it receives when serving. Causes: two implementations of the same logic, different data sources or freshness, time-zone and unit differences, defaults applied in one path and not the other, and leakage that makes training data look unlike anything serving can produce." },
          { t: "p", text: "Prevention: a single feature definition used by both paths through a feature store; log the features at serving time and train on the logs; point-in-time joins for historical data. Detection: monitor each served feature's distribution against training's with PSI or similar, and periodically recompute a sample of served features offline and diff them." }
        ] },

      { level: "advanced",
        q: "Design the feature pipeline for a real-time fraud model.",
        strong: "A strong answer separates freshness tiers, keeps one definition, and handles delayed labels and point-in-time training.",
        answer: [
          { t: "p", text: "Three tiers. Request-time features from the payment itself — amount, merchant, device, IP — computed in the serving path. Streaming velocity features — payments per card and per device in the last minute and hour, distinct countries today — computed by a stream processor from the payment event log and written to an online store such as Redis or DynamoDB. Batch features — the customer's 90-day spending profile, merchant risk — computed nightly and materialised to both stores." },
          { t: "p", text: "Every value carries a valid-from time in the offline store; training sets are built with as-of joins on availability time, and the served features are logged with each decision so the model can be trained on exactly what it saw. Labels — chargebacks — arrive weeks later, so training uses a cutoff where labels have matured, and monitoring uses proxy signals until then. PSI on every feature, freshness alarms on the streaming jobs, and fallbacks with TTLs when the online store is stale." }
        ] },

      { level: "core",
        q: "How do you detect data leakage?",
        strong: "A strong answer gives concrete tests, not just a definition.",
        answer: [
          { t: "p", text: "Be suspicious of any feature that is too good, and check how its value at each training row was obtained: was it computed as of the row's timestamp, or joined from a current table? Ablate features one at a time and review any single feature responsible for most of the gain." },
          { t: "p", text: "Compare offline performance with a shadow deployment on live traffic; a large gap is the classic signature. Split by time rather than at random, keep a gap for label maturity, and make the feature store's as-of join the only way to build a training set." }
        ] }
    ]
  }
});
