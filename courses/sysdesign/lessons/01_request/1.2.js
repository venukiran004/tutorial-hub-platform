/* ============================================================================
   LESSON 1.2 — Latency: The Numbers Every Design Rests On
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "Almost every system design decision is an argument about where data should be relative to the code that needs it, and the argument is settled by a handful of numbers. Memory is **a million times** closer than a round trip across a data centre, and that round trip is **hundreds of times** shorter than one across an ocean — and the ocean is a floor set by physics that no amount of engineering moves. **Latency adds up along a chain of calls, so the shape of the chain matters as much as the speed of any link.**",

  objectives: [
    "Recite the latency numbers to the right order of magnitude and say what each one justifies",
    "Compute the physical minimum round trip between two cities and compare it with reality",
    "Distinguish latency from throughput and say which one a complaint is about",
    "Turn an endpoint's calls into a latency budget, sequential and parallel",
    "Diagnose an N+1 or cross-region chain from the shape of its budget"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", id: "numbers", text: "The numbers, on one scale",
      sub: "Nine operations spanning nine orders of magnitude" },

    { t: "p", text: "These are order-of-magnitude values, not benchmarks: your hardware will differ by a factor of two, and that does not matter. What matters is the **gaps** between rows, because each gap is a factor of ten to a thousand, and a design that moves work across a gap changes its latency by that factor." },

    { t: "viz", title: "Latency on a logarithmic scale",
      caption: "Each tick is ten times the one before. Green is memory, blue is inside one data centre, amber is storage, red crosses a continent or an ocean. Caching (Module 3) is the act of moving a read from a right-hand bar to a left-hand one.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Latency numbers on a log scale">
  <text x="220" y="20" class="s-sub">1 ns</text>
  <text x="376" y="20" class="s-sub">1 µs</text>
  <text x="532" y="20" class="s-sub">1 ms</text>
  <text x="688" y="20" class="s-sub">1 s</text>
  <line x1="272" y1="26" x2="272" y2="250" style="stroke:var(--line);stroke-opacity:.5"/>
  <line x1="428" y1="26" x2="428" y2="250" style="stroke:var(--line);stroke-opacity:.5"/>
  <line x1="584" y1="26" x2="584" y2="250" style="stroke:var(--line);stroke-opacity:.5"/>
  <line x1="740" y1="26" x2="740" y2="250" style="stroke:var(--line);stroke-opacity:.5"/>
  <text x="210" y="46" text-anchor="end" class="s-label">L1 cache</text>
  <rect x="220" y="34" width="36" height="18" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
  <text x="264" y="47" class="s-mono">0.5 ns</text>
  <text x="210" y="72" text-anchor="end" class="s-label">RAM</text>
  <rect x="220" y="60" width="156" height="18" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
  <text x="384" y="73" class="s-mono">100 ns</text>
  <text x="210" y="98" text-anchor="end" class="s-label">SSD random read</text>
  <rect x="220" y="86" width="321" height="18" rx="4" style="fill:var(--warn);fill-opacity:.35;stroke:var(--warn)"/>
  <text x="549" y="99" class="s-mono">150 µs</text>
  <text x="210" y="124" text-anchor="end" class="s-label">Data-centre round trip</text>
  <rect x="220" y="112" width="348" height="18" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
  <text x="576" y="125" class="s-mono">0.5 ms</text>
  <text x="210" y="150" text-anchor="end" class="s-label">Indexed DB query</text>
  <rect x="220" y="138" width="400" height="18" rx="4" style="fill:var(--warn);fill-opacity:.35;stroke:var(--warn)"/>
  <text x="628" y="151" class="s-mono">5 ms</text>
  <text x="210" y="176" text-anchor="end" class="s-label">HDD seek</text>
  <rect x="220" y="164" width="416" height="18" rx="4" style="fill:var(--warn);fill-opacity:.35;stroke:var(--warn)"/>
  <text x="644" y="177" class="s-mono">10 ms</text>
  <text x="210" y="202" text-anchor="end" class="s-label">US east ↔ west</text>
  <rect x="220" y="190" width="460" height="18" rx="4" style="fill:var(--crit);fill-opacity:.35;stroke:var(--crit)"/>
  <text x="688" y="203" class="s-mono">70 ms</text>
  <text x="210" y="228" text-anchor="end" class="s-label">London ↔ Sydney</text>
  <rect x="220" y="216" width="489" height="18" rx="4" style="fill:var(--crit);fill-opacity:.35;stroke:var(--crit)"/>
  <text x="716" y="229" class="s-mono">250 ms</text>
  <text x="16" y="274" class="s-sub">RAM → data-centre round trip: ×5,000. Data-centre round trip → ocean: ×500. Those two gaps are caching and CDNs.</text>
</svg>` },

    { t: "p", text: "Nanoseconds are hard to feel, so stretch the scale until the fastest row takes one second:" },

    { t: "code", lang: "python", title: "latency.py — the table on a human clock", code: `NUMBERS = [  # (operation, seconds) — the canonical table, order-of-magnitude values
    ("L1 cache reference",               0.5e-9),
    ("Main memory reference",            100e-9),
    ("Redis GET, same data centre",      0.5e-3),
    ("SSD random read",                  150e-6),
    ("Round trip within a data centre",  0.5e-3),
    ("PostgreSQL indexed query",         5e-3),
    ("HDD seek",                         10e-3),
    ("Round trip US east <-> west",      70e-3),
    ("Round trip London <-> Sydney",     250e-3),
]
NUMBERS.sort(key=lambda r: r[1])
base = NUMBERS[0][1]
print("%-34s %12s %16s %20s" % ("operation", "time", "x L1", "if L1 took 1 second"))
for name, s in NUMBERS:
    human = s / base                            # seconds, on the scaled clock
    if human < 60:          scaled = "%.0f s" % human
    elif human < 3600:      scaled = "%.0f min" % (human / 60)
    elif human < 86400:     scaled = "%.1f hours" % (human / 3600)
    elif human < 86400*365: scaled = "%.0f days" % (human / 86400)
    else:                   scaled = "%.1f years" % (human / 86400 / 365)
    t = "%.1f ns" % (s*1e9) if s < 1e-6 else ("%.0f us" % (s*1e6) if s < 1e-3 else "%.1f ms" % (s*1e3))
    print("%-34s %12s %16s %20s" % (name, t, "{:,.0f}".format(human), scaled))`,
      out: `operation                                  time             x L1  if L1 took 1 second
L1 cache reference                       0.5 ns                1                  1 s
Main memory reference                  100.0 ns              200                3 min
SSD random read                          150 us          300,000               3 days
Redis GET, same data centre              500 us        1,000,000              12 days
Round trip within a data centre          500 us        1,000,000              12 days
PostgreSQL indexed query                 5.0 ms       10,000,000             116 days
HDD seek                                10.0 ms       20,000,000             231 days
Round trip US east <-> west             70.0 ms      140,000,000            4.4 years
Round trip London <-> Sydney           250.0 ms      500,000,000           15.9 years`,
      caption: "If reading RAM took three minutes, a Redis call would take twelve days and a trip to Sydney would take sixteen years. A Redis GET is dominated by the network round trip, not by Redis — which is why a cache **in the same process** (3.1) beats a cache across the network by three orders of magnitude." },

    { t: "dl", items: [
      ["RAM is ~5,000× faster than a data-centre round trip", "That gap is why an in-process cache exists, and why chatty services — many small calls — are slow even when every call is fast."],
      ["A data-centre round trip is ~10× faster than an indexed query", "So the query, not the network, dominates a single database call. Twenty queries in a loop is where the network starts to matter again (section 04)."],
      ["A cross-continent round trip is ~100–500× a local one", "This is the one you cannot engineer away, because it is set by the speed of light (section 02). You can only move the data closer."]
    ] },

    { t: "h2", n: "02", id: "light", text: "The floor you cannot engineer away",
      sub: "Light in fibre travels about 200,000 km a second" },

    { t: "p", text: "Light in glass moves at about two-thirds of its speed in a vacuum. A round trip covers the distance twice. That gives a hard minimum for every pair of cities, and real routes add 30–60% on top because cables do not follow great circles and every router queues a little:" },

    { t: "code", lang: "python", title: "light.py — physics against reality", code: `C_FIBRE_KM_S = 200_000        # light in glass: about two-thirds of c
ROUTES = [("New York - Chicago", 1_150), ("New York - London", 5_570),
          ("London - Mumbai", 7_200), ("London - Sydney", 17_000)]
MEASURED = {"New York - Chicago": 18, "New York - London": 72,
            "London - Mumbai": 111, "London - Sydney": 262}   # typical public ping tables
for name, km in ROUTES:
    rtt_ms = 2 * km / C_FIBRE_KM_S * 1000
    print("%-20s %8s %13.1f ms %13d ms   (%.2fx)" % (name, "{:,}".format(km), rtt_ms,
          MEASURED[name], MEASURED[name] / rtt_ms))`,
      out: `route                      km  physics min RTT     measured RTT
New York - Chicago      1,150          11.5 ms            18 ms   (1.57x)
New York - London       5,570          55.7 ms            72 ms   (1.29x)
London - Mumbai         7,200          72.0 ms           111 ms   (1.54x)
London - Sydney        17,000         170.0 ms           262 ms   (1.54x)`,
      caption: "The measured column is typical values from public ping tables, not measured here. The ratio is the point: real paths run at 1.3–1.6× the physical floor, and **no protocol, language or framework gets under the floor**. A user in Sydney talking to a server in London pays at least 170 ms per round trip, forever." },

    { t: "callout", kind: "insight", title: "Since you cannot speed up the light, you move the data",
      body: [
        { t: "p", text: "Every global architecture technique is a way of shortening the distance rather than the time per kilometre. A **CDN** (3.5) copies static content to within a few milliseconds of the user. **Read replicas in other regions** (4.1) put a copy of the data on each continent. **Edge computing** runs code at the CDN. **Multi-region active-active** (7.5) puts the whole stack near everyone — and pays for it in consistency (5.1)." },
        { t: "p", text: "The other lever is the **number** of round trips. A TLS 1.3 handshake costs one round trip instead of TLS 1.2's two (1.4); a GraphQL query replaces three REST calls with one (1.5); a batch query replaces twenty. From Sydney, each one saved is a quarter of a second." }
      ] },

    { t: "h2", n: "03", id: "throughput", text: "Latency is not throughput",
      sub: "How long one request takes, against how many finish per second" },

    { t: "diagram", kind: "compare", title: "Two different numbers that people call \"speed\"",
      caption: "A wider pipe raises throughput and leaves latency alone; a shorter pipe lowers latency and leaves throughput alone. Batching usually trades one for the other — more throughput, each item waits longer.",
      columns: [
        { title: "Latency — how long one request takes", tone: "accent", items: [
          "measured in milliseconds, per request",
          "what a user feels: the spinner",
          "set by distance, round trips and the slowest step",
          "reported as percentiles: p50, p99 (11.1)",
          "improved by caching, co-location, fewer hops"
        ] },
        { title: "Throughput — how many finish per second", tone: "good", items: [
          "measured in requests or bytes per second",
          "what capacity planning cares about",
          "set by parallelism and the narrowest resource",
          "reported as a rate at a latency target",
          "improved by more servers, batching, async work"
        ] }
      ] },

    { t: "p", text: "The two are linked by Little's Law (11.2) — concurrency equals throughput times latency — so they are not independent, but they are different questions. \"The API is slow\" is a latency complaint; adding servers will not fix it unless the servers were saturated. \"We cannot handle Black Friday\" is a throughput complaint; caching one slow query may not fix it if the bottleneck is elsewhere." },

    { t: "h2", n: "04", id: "chains", text: "Latency adds along a chain",
      sub: "Sequential calls sum; parallel calls take the slowest" },

    { t: "p", text: "An endpoint is a chain of calls, and its latency is the sum of the calls that must happen one after another plus the slowest of the ones that can run together. That is the whole of latency budgeting, and it is why the **shape** of an endpoint matters more than the speed of any one call." },

    { t: "p", text: "Take a realistic order-history endpoint: check the auth token in Redis, load the user, load their 20 most recent orders one query at a time — the ORM's default — call a recommendations service, and call a pricing service that happens to live in another region:" },

    { t: "code", lang: "python", title: "budget.py — the same endpoint, two shapes", code: `RTT_DC = 0.5        # ms, round trip inside the data centre
RTT_XREGION = 70.0  # ms, us-east <-> us-west

def call(rtt, work): return rtt + work

steps_naive = [
    ("auth token check (Redis)",         call(RTT_DC, 0.2)),
    ("load user (Postgres)",             call(RTT_DC, 4.5)),
    *[("order %d (Postgres, N+1)" % i,   call(RTT_DC, 4.5)) for i in range(1, 21)],
    ("recommendations service",          call(RTT_DC, 40.0)),
    ("pricing service (other region)",   call(RTT_XREGION, 10.0)),
]
naive = sum(ms for _, ms in steps_naive)

auth = call(RTT_DC, 0.2)
user_and_orders = call(RTT_DC, 4.5) + call(RTT_DC, 7.5)   # user, then ONE batched orders query
recs = call(RTT_DC, 40.0)
pricing_cached = call(RTT_DC, 0.2)                          # prices cached locally, 60 s TTL
# after auth, the three branches run in parallel: total = slowest branch
better = auth + max(user_and_orders, recs, pricing_cached)`,
      out: `NAIVE: everything sequential, one query per order
  20 order queries                      100.0 ms
  pricing, cross-region                  80.0 ms
  total                                 226.2 ms

BETTER: batch the orders, cache prices locally, run branches in parallel
  auth                                    0.7 ms
  branch: user + batched orders          13.0 ms
  branch: recommendations                40.5 ms
  branch: cached prices                   0.7 ms
  total                                  41.2 ms   (5.5x faster)`,
      hl: [9, 11, 16, 18, 20],
      caption: "No call got faster. Three changes to the **shape** — one query instead of twenty, a local cache instead of a cross-region hop, three branches in parallel instead of in sequence — took the endpoint from 226 ms to 41 ms. The floor is now the recommendations service, which is the next thing to look at." },

    { t: "diagram", kind: "timeline", title: "The two shapes drawn to scale",
      caption: "Top: every call waits for the one before it, and the N+1 loop and the cross-region hop dominate. Below: after auth, three independent branches run together and the endpoint takes as long as the slowest — recommendations.",
      span: 230, tick: 20, unit: "milliseconds",
      lanes: [
        { label: "Sequential", bars: [[0, 6, "", "accent"], [6, 106, "20 order queries (N+1)", "warn"], [106, 146, "recs", "accent"], [146, 226, "pricing ×-region", "crit"]] },
        { label: "Parallel: data", bars: [[1, 14, "", "good"]] },
        { label: "Parallel: recs", bars: [[1, 41, "recs", "accent"]] },
        { label: "Parallel: price", bars: [[1, 2, "", "good"]] }
      ] },

    { t: "callout", kind: "trap", title: "A fast query called twenty times is a slow endpoint",
      body: [
        { t: "p", text: "The N+1 pattern — one query for a list, then one more per item — hides inside ORM code that looks like a plain loop: `for order in user.orders: order.items`. Each query is 5 ms and passes every per-query alert you have, so nobody notices until the list grows from 20 items to 200 and the endpoint takes a second." },
        { t: "p", text: "The diagnosis is in the shape, not the speed: **count the calls per request**, not just their duration. Tracing (11.5) shows it as a staircase of identical spans. The fix is one query with `WHERE id IN (...)` or a join, or the ORM's eager-loading option — and a test that asserts the query count for the endpoint, so it cannot come back (11.3)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Budget a checkout endpoint against a 150 ms target",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A checkout endpoint must answer within 150 ms. It validates the session in Redis, loads the cart (one query) and then each of its 12 items' stock levels (one query each), calls a fraud-scoring service in the same data centre that takes 60 ms, calls a tax service in another region (70 ms round trip, 15 ms work), and finally writes the order (8 ms)." },
        { t: "p", text: "Find the current latency, then redesign the shape to meet the target without making any single call faster." }
      ],
      requirements: [
        "Compute the sequential latency using 0.5 ms for an in-data-centre round trip",
        "Identify which calls depend on which — what genuinely has to wait",
        "Redesign: batch, parallelise, and cache or co-locate where it is safe",
        "Compute the new latency and name the call that now sets the floor",
        "Say which change is not safe to make for a checkout, and why"
      ],
      hint: "Fraud scoring needs the cart; tax needs the cart; neither needs the other. Stock levels can be one query. The order write needs everything.",
      solution: { lang: "python", title: "checkout_budget.py",
        code: `RTT = 0.5; X = 70.0
def call(rtt, work): return rtt + work

session = call(RTT, 0.2)
cart    = call(RTT, 4.5)
stock   = [call(RTT, 4.5) for _ in range(12)]
fraud   = call(RTT, 60.0)
tax     = call(X, 15.0)
write   = call(RTT, 8.0)

before = session + cart + sum(stock) + fraud + tax + write
print("before: %.1f ms  (stock loop %.1f, tax %.1f)" % (before, sum(stock), tax))

stock_batched = call(RTT, 6.0)                 # WHERE sku IN (...12 skus...)
after = session + cart + max(stock_batched, fraud, tax) + write
print("after, tax still remote : %.1f ms" % after)

tax_local = call(RTT, 15.0)                    # tax tables replicated to this region
after_local = session + cart + max(stock_batched, fraud, tax_local) + write
print("after, tax co-located   : %.1f ms   floor = fraud scoring" % after_local)`,
        out: `before: 219.7 ms  (stock loop 60.0, tax 85.0)
after, tax still remote : 99.2 ms
after, tax co-located   : 74.7 ms   floor = fraud scoring`,
        notes: [
          { t: "p", text: "Batching the stock checks and running stock, fraud and tax in parallel meets the target on its own — 220 ms to 99 ms — because the three only depend on the cart, not on each other. That is the first question to ask of any slow endpoint: **what is actually waiting for what?** Usually far less than the code's order suggests." },
          { t: "p", text: "With the cross-region tax call still in place it **sets the floor at 85 ms**, more than the fraud service it runs beside. Replicating the tax tables into this region (4.1) removes the speed-of-light term and leaves fraud scoring as the floor at 75 ms. Anything further means making fraud scoring itself faster." },
          { t: "p", text: "The change that is **not** safe is caching the stock level the way the earlier example cached prices. A stale price shown on a product page is a minor annoyance; a stale stock level at checkout sells something you do not have. Caching is always a staleness trade (3.3), and checkout is the point in the flow where the answer must be current — so stock is batched, not cached." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the database moved 70 ms away and every page got 2 seconds slower",
      body: [
        { t: "p", text: "**Symptom.** As part of a cost exercise, a team moved its application servers from us-east to us-west, where compute was cheaper, and left the PostgreSQL primary in us-east \"for now\". Page loads went from 90 ms to between 1.5 and 3 seconds. CPU, memory and database load were all lower than before." },
        { t: "p", text: "**Mechanism.** Every query now paid a 70 ms round trip instead of 0.5 ms. The pages were chatty — 20 to 40 sequential queries each, several of them N+1 loops — so the added network time was 70 ms multiplied by the query count: 1.4 to 2.8 seconds, exactly the regression. Nothing was overloaded because nothing was working harder; everything was **waiting**. The resource graphs could not show a problem that was made of distance." },
        { t: "p", text: "**Fix.** Short term, move the application servers back next to the database — latency returned to 90 ms the same day. Longer term, the incident exposed the chattiness: batching the N+1 loops cut queries per page from 30 to 6, which also made a later multi-region design possible. The rule the team adopted: **an application and its primary database live in the same region, and any cross-region call in a request path is a design decision written down, not a deployment detail.**" }
      ] }
  ],

  takeaways: [
    "Memorise the **gaps**, not the digits: RAM → data-centre round trip ×5,000; data-centre → cross-ocean ×500. Each gap is a design pattern — caching and CDNs.",
    "A **Redis GET is dominated by the network round trip**, not by Redis; an in-process cache is three orders of magnitude faster than any networked one.",
    "**Light in fibre covers about 200 km per millisecond**, so London–Sydney is at least 170 ms round trip. Real routes run 1.3–1.6× the floor, and no software gets under it.",
    "You cannot speed up the light, so you **move the data** — CDN, regional replicas, edge — or **cut the number of round trips**.",
    "**Latency is how long one request takes; throughput is how many finish per second.** They are linked by Little's Law but answer different complaints.",
    "**Sequential calls add; parallel calls take the slowest.** Ask what genuinely waits for what — usually far less than the code's order implies.",
    "Measured on a realistic endpoint: batching, a local cache and parallel branches took **226 ms to 41 ms without making any call faster**.",
    "**The N+1 pattern** hides in ORM loops and passes every per-query alert. Count calls per request, and assert the count in a test.",
    "Every cross-region call in a request path costs **tens of milliseconds times the number of times it is made** — and resource graphs cannot show waiting.",
    "Caching to cut latency is always a staleness trade: fine for a price on a product page, wrong for stock at checkout."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "An endpoint makes 30 sequential database queries of about 4 ms each. The application is moved 70 ms away from the database. Roughly what happens to the endpoint's latency?",
        options: ["It rises by about 70 ms", "It rises by about 2.1 seconds", "It is unchanged, because the queries are fast", "It doubles"],
        answer: 1,
        why: "Each of the 30 sequential queries now pays a 70 ms round trip, so the added time is 30 × 70 ms = 2.1 s. The single-hop answer of 70 ms is what happens to an endpoint that makes one call. The queries being fast does not help, because the cost is distance, not work. \"Doubles\" has no basis — the increase is proportional to the number of round trips, not to the original latency." },

      { stem: "Three independent service calls take 12 ms, 40 ms and 25 ms. What is the latency of the three if run in parallel, ignoring overhead?",
        options: ["77 ms", "40 ms", "25.7 ms (the mean)", "12 ms"],
        answer: 1,
        why: "Parallel calls finish when the slowest one does, so the group takes 40 ms. 77 ms is the sequential sum, which is what you pay when independent calls are written one after another. The mean and the minimum describe nothing about when the last result arrives, and the response cannot be sent until it does." },

      { stem: "Users in Sydney complain about a service hosted in London. Which change can reduce their per-round-trip latency below 170 ms?",
        options: ["Upgrading the London servers to faster CPUs", "Switching from HTTP/1.1 to HTTP/2", "Serving them from a location closer to Sydney", "Rewriting the service in a compiled language"],
        answer: 2,
        why: "170 ms is the physical floor for a London–Sydney round trip in fibre, so only reducing the distance reduces it — a CDN, a regional replica or a regional deployment. Faster CPUs and a compiled language shorten server work, not the round trip. HTTP/2 can reduce the number of round trips by multiplexing, which helps overall, but each remaining round trip is still at least 170 ms." },

      { stem: "\"The API is slow\" and \"we cannot handle peak traffic\" — what is the difference?",
        options: ["None; both are throughput problems", "The first is latency per request, the second is throughput; they can have different fixes", "The first is about the database, the second about the network", "The first is solved by adding servers, the second by caching"],
        answer: 1,
        why: "Slowness per request is latency and is fixed by shortening the chain — caching, co-location, fewer round trips. Failing at peak is throughput and is fixed by adding capacity where the narrowest resource is. They are linked by Little's Law, but adding servers to an unsaturated system does nothing for latency. Neither complaint names a component, and the last option swaps the usual fixes around." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Numbers said out loud are what separate a design from a drawing.",
    questions: [
      { level: "core",
        q: "Which latency numbers do you keep in your head, and what do you use them for?",
        strong: "A strong answer gives a handful of numbers to the right order of magnitude and attaches a design decision to each gap.",
        answer: [
          { t: "p", text: "About six. RAM is around 100 nanoseconds; an SSD read around 150 microseconds; a round trip inside a data centre about half a millisecond; an indexed database query a few milliseconds; a round trip across the US about 70; across an ocean 150 to 250." },
          { t: "p", text: "What I use are the gaps. RAM to a network round trip is about five thousand times, which is why an in-process cache beats Redis and why chatty services are slow. A local round trip to a cross-continent one is a few hundred times, and that one is set by the speed of light — roughly 200 kilometres per millisecond in fibre — so the only fixes are moving the data closer or making fewer round trips. When I say a cache hit is 1 ms and a database read is 10, I am really saying why the cache is in the design." }
        ] },

      { level: "core",
        q: "An endpoint's p50 is 400 ms and every individual call it makes is under 10 ms. Where do you look?",
        strong: "A strong answer goes to the number and shape of calls, not their speed.",
        answer: [
          { t: "p", text: "At the shape of the request rather than the speed of any call. If every call is under 10 ms and the total is 400, there are dozens of them in sequence — almost always an N+1 loop in ORM code, or sequential calls to services that do not depend on each other." },
          { t: "p", text: "I would pull a trace for one request and look for a staircase of identical spans. The fixes are batching the loop into one query, parallelising independent calls, and checking for any cross-region hop, since a single 70 ms round trip repeated a few times would explain the whole number. Then a test that asserts the query count for that endpoint, so it does not regress when someone adds a field." }
        ] },

      { level: "advanced",
        q: "A product team wants the app to feel instant for users in Asia, Europe and the US. The backend is in us-east. What do you propose?",
        strong: "A strong answer quantifies the floor, separates static from dynamic, and is honest about what multi-region costs.",
        answer: [
          { t: "p", text: "First the floor: from Singapore to Virginia a round trip is well over 200 ms, and a page load with DNS, TCP, TLS and a request is several round trips, so under a second is not achievable from one region however fast the backend is." },
          { t: "p", text: "Then in order of cost. A CDN for everything static, terminating TLS at the edge so the handshake round trips are local. Cache API responses that can tolerate staleness at the edge. Cut round trips per page — batch endpoints, HTTP/2. Then read replicas in each region for read-heavy data, accepting replication lag and handling read-your-own-writes. Only if writes must be local too would I go multi-region active-active, because that turns every write into a consistency decision, and I would want the product team to tell me which data can be eventually consistent before committing to it." }
        ] }
    ]
  }
});
