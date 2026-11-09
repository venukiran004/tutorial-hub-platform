/* ============================================================================
   LESSON 15.1 — The Four-Step Method and the NFR Checklist
   ========================================================================= */
EC.receiveLesson({
  id: "15.1",

  lede: "A system design interview is not a quiz with a right answer. It is forty-five minutes of watching how you turn an ambiguous prompt into a design you can defend. Most failed interviews fail the same way: the candidate starts drawing boxes before knowing what the system must do, how big it is, or what it must never do, and then spends twenty minutes perfecting a part nobody asked about. This lesson gives the four steps, the minutes each one deserves, and the non-functional checklist that turns 'design X' into numbers. Those numbers decide the design, so they come before any boxes.",

  objectives: [
    "Run the four steps of a design interview and keep each inside its time budget",
    "Turn a vague prompt into a short list of functional requirements and an explicit out-of-scope list",
    "Ask the non-functional questions in a fixed order and convert each answer into a number",
    "Compute what an availability target allows, and what serial dependencies do to it",
    "Split a latency target across the hops of a request path"
  ],

  prerequisites: ["1.2", "2.5", "11.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "steps",
      text: "Four steps and the clock",
      sub: "Requirements, high-level design, deep dive, wrap-up" },
    { t: "p",
      text: "Every design interview, whatever the prompt, has the same shape. The interviewer wants evidence of four things in roughly this order: that you find out what to build before building it, that you can sketch a whole system that would work, that you can go deep on the hardest part, and that you know what you left out. Spending the minutes in proportion is itself part of the evidence." },
    { t: "viz",
      title: "Where forty-five minutes go",
      caption: "A workable budget. Requirements take up to eight minutes and end with numbers written down. The high-level design takes about twelve and must be complete end to end, even if crude. The deep dive is the largest block, because it is where seniority shows. The last minutes go to bottlenecks, failure modes and what you would do next. Interviewers often steer the deep dive, so treat the budget as a guide.",
      svg: `<svg viewBox="0 0 760 118" width="100%" role="img">
<rect x="30.0" y="14" width="120.4" height="44" rx="6" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="90.2" y="34" text-anchor="middle" class="s-label" style="fill:var(--accent)">Requirements</text>
<text x="90.2" y="50" text-anchor="middle" class="s-sub">scope, NFR numbers</text>
<rect x="154.4" y="14" width="182.7" height="44" rx="6" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="245.8" y="34" text-anchor="middle" class="s-label" style="fill:var(--good)">High-level design</text>
<text x="245.8" y="50" text-anchor="middle" class="s-sub">boxes, APIs, data</text>
<rect x="341.1" y="14" width="276.0" height="44" rx="6" class="s-fill" style="stroke:var(--warn);stroke-width:2"/>
<text x="479.1" y="34" text-anchor="middle" class="s-label" style="fill:var(--warn)">Deep dive</text>
<text x="479.1" y="50" text-anchor="middle" class="s-sub">2-3 hard parts</text>
<rect x="621.1" y="14" width="104.9" height="44" rx="6" class="s-fill" style="stroke:var(--violet);stroke-width:2"/>
<text x="673.6" y="34" text-anchor="middle" class="s-label" style="fill:var(--violet)">Wrap-up</text>
<text x="673.6" y="50" text-anchor="middle" class="s-sub">risks, evolution</text>
<text x="30.0" y="80" text-anchor="middle" class="s-sub">0</text>
<text x="154.4" y="80" text-anchor="middle" class="s-sub">8</text>
<text x="341.1" y="80" text-anchor="middle" class="s-sub">20</text>
<text x="621.1" y="80" text-anchor="middle" class="s-sub">38</text>
<text x="730.0" y="80" text-anchor="middle" class="s-sub">45</text>
<text x="380.0" y="102" text-anchor="middle" class="s-sub">minutes of a 45-minute interview</text>
</svg>` },
    { t: "table",
      head: ["Step", "Minutes", "You produce", "The interviewer checks"],
      rows: [
        [
          "1 · Requirements",
          "5–8",
          "3–5 functional requirements, out-of-scope list, NFR numbers",
          "Do you clarify before designing? Do you quantify?"
        ],
        [
          "2 · High-level design",
          "10–12",
          "Boxes, the main APIs, the data model, one request traced end to end",
          "Is the whole thing coherent? Would it work?"
        ],
        [
          "3 · Deep dive",
          "15–20",
          "Two or three hard components in detail, with trade-offs",
          "Depth, judgement, knowing where the difficulty is"
        ],
        [
          "4 · Wrap-up",
          "3–5",
          "Bottlenecks, failure modes, monitoring, next steps",
          "Self-awareness; operating the system, not just drawing it"
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Designing the part you know best",
      body: [
        { t: "p",
          text: "The commonest failure is spending the deep dive on whatever is most familiar, often the database schema, while the actual difficulty sits elsewhere: the fan-out of a feed, the hot key in a cache, the ordering in chat. Before the deep dive, say which two or three components are hard *for this problem* and why, and ask which the interviewer wants first. That one sentence shows judgement." }
      ] },
    { t: "h2",
      n: "02",
      id: "requirements",
      text: "Functional requirements",
      sub: "Small, explicit, and with a list of what you will not build" },
    { t: "p",
      text: "Functional requirements are the verbs the system supports. Keep them to three to five, stated as user actions: 'a user shortens a URL', 'a visitor is redirected', 'an owner sees click counts'. Then say what you are leaving out (custom aliases, expiry, user accounts) and check it with the interviewer. An explicit out-of-scope list is worth as much as the in-scope one, because it shows you know the feature exists and chose not to spend time on it." },
    { t: "dl",
      items: [
        { term: "Who uses it, and how",
          def: "Users, clients and other services. A mobile app on bad networks and a batch partner calling an API produce different designs." },
        { term: "The core actions",
          def: "Three to five verbs. If there are ten, ask which three matter, and design for those." },
        { term: "Reads against writes",
          def: "Which action is frequent and which is rare. The ratio, often 100:1 or more, picks the storage and the caching strategy." },
        { term: "Out of scope",
          def: "Said aloud and agreed. It protects your time and shows you saw the whole product." }
      ] },
    { t: "h2",
      n: "03",
      id: "nfr",
      text: "The non-functional checklist",
      sub: "Every answer becomes a number, and every number changes the design" },
    { t: "p",
      text: "Non-functional requirements decide the architecture far more than the functional ones do. Ask them in a fixed order so none is forgotten under pressure, and turn each answer into a number: scale, latency, availability, consistency, durability, then security, privacy and cost. An answer that stays a word ('highly available', 'fast') cannot be designed against. The script below converts the two most commonly misjudged ones." },
    { t: "code",
      lang: "python",
      title: "nfr.py — what the numbers mean",
      code: `import math

# 1. What each "nine" allows: the number to say out loud when someone asks for 99.99%.
print("availability   downtime/year   downtime/month   downtime/day")
for a in (0.99, 0.999, 0.9995, 0.9999, 0.99999):
    down = 1 - a
    print(f"{a:>12.3%}   {down * 365 * 24:9.1f} h     {down * 30 * 24 * 60:9.1f} min   {down * 24 * 3600:9.1f} s")

# 2. Serial dependencies multiply: five 99.9% services in one request path.
deps = [0.999] * 5
serial = math.prod(deps)
print(f"\\nfive 99.9% dependencies in series: {serial:.4%}  ({(1 - serial) * 365 * 24:.1f} h/year down)")
redundant = 1 - (1 - 0.999) ** 2
print(f"one of them made redundant (two independent replicas): {redundant:.6%}")

# 3. A latency budget: the p99 target is spent across hops, and tails add up.
budget_ms = 300
path = [("edge + TLS", 20), ("API gateway", 10), ("service logic", 40), ("cache miss -> database", 80),
        ("downstream call", 90), ("serialisation + network back", 20)]
spent = 0
print(f"\\np99 budget {budget_ms} ms")
for hop, p99 in path:
    spent += p99; print(f"  {hop:<30} {p99:4} ms   cumulative {spent:4} ms")
print(f"headroom {budget_ms - spent} ms  (summing p99s is pessimistic; it is the right first estimate in an interview)")`,
      out: `availability   downtime/year   downtime/month   downtime/day
     99.000%        87.6 h         432.0 min       864.0 s
     99.900%         8.8 h          43.2 min        86.4 s
     99.950%         4.4 h          21.6 min        43.2 s
     99.990%         0.9 h           4.3 min         8.6 s
     99.999%         0.1 h           0.4 min         0.9 s

five 99.9% dependencies in series: 99.5010%  (43.7 h/year down)
one of them made redundant (two independent replicas): 99.999900%

p99 budget 300 ms
  edge + TLS                       20 ms   cumulative   20 ms
  API gateway                      10 ms   cumulative   30 ms
  service logic                    40 ms   cumulative   70 ms
  cache miss -> database           80 ms   cumulative  150 ms
  downstream call                  90 ms   cumulative  240 ms
  serialisation + network back     20 ms   cumulative  260 ms
headroom 40 ms  (summing p99s is pessimistic; it is the right first estimate in an interview)` },
    { t: "dl",
      items: [
        { term: "Scale",
          def: "Daily active users, requests per user, peak-to-average ratio, data size and growth. Lesson 15.2 turns these into QPS, storage and bandwidth." },
        { term: "Latency",
          def: "A percentile and a number: 'p99 under 300 ms for the redirect'. The budget is then split across hops, as above, and a hop that cannot fit is designed out of the synchronous path." },
        { term: "Availability",
          def: "A number of nines and the downtime it allows: 99.95% is 22 minutes a month. Five 99.9% dependencies in series give only 99.5%, so serial dependencies must be fewer, better, or redundant." },
        { term: "Consistency",
          def: "Which reads must see the latest write (balances, inventory) and which may lag (counts, feeds). This decides replication and caching, as in module 5." },
        { term: "Durability",
          def: "What may never be lost, and the recovery point and time objectives (RPO and RTO) for what can." },
        { term: "Security, privacy, cost",
          def: "Who may see what, data residency, retention, and a budget. Cost often rules out the 'obvious' design at scale." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Say the number, then what it changes",
      body: [
        { t: "p",
          text: "'99.99% means about four minutes of downtime a month, which rules out manual failover, so the database needs automatic promotion.' That sentence is worth more than any diagram, because it shows the requirement driving the design. Practise pairing every number with its consequence." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Requirements for ride-hailing dispatch",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "The prompt is 'design the dispatch service for a ride-hailing app'. Before drawing anything, write the functional requirements, the out-of-scope list and the non-functional numbers. Then compute the loads and availability budget they imply, and name two design decisions the numbers force." }
      ],
      requirements: [
        "Three to five functional requirements and an out-of-scope list",
        "Peak ride requests per second from daily riders, rides per rider and a peak factor",
        "Peak driver location writes per second, and how it compares with ride requests",
        "The monthly downtime the availability target allows, and what each of four serial dependencies must reach",
        "Two design decisions the numbers force"
      ],
      hint: "Drivers send a location every few seconds whether or not anyone is riding, so location updates usually dwarf ride requests. Compute both before choosing storage.",
      solution: { lang: "python",
        title: "dispatch_requirements.py",
        code: `import math

# "Design the dispatch service for a ride-hailing app": requirements turned into numbers before any boxes.
req = {
    "daily active riders": 5_000_000, "rides per rider per day": 0.4, "peak to average": 3.0,
    "driver location update every (s)": 4, "drivers online at peak": 300_000,
    "match latency p99 target (ms)": 2_000, "availability target": 0.9995,
}
rides = req["daily active riders"] * req["rides per rider per day"]
avg_rps = rides / 86_400
peak_rps = avg_rps * req["peak to average"]
loc_writes = req["drivers online at peak"] / req["driver location update every (s)"]
print(f"ride requests: {rides:,.0f}/day, {avg_rps:,.0f}/s average, {peak_rps:,.0f}/s at peak")
print(f"driver location writes at peak: {loc_writes:,.0f}/s  <- the dominant load, {loc_writes / peak_rps:.0f}x the ride requests")

down_min_month = (1 - req["availability target"]) * 30 * 24 * 60
print(f"availability {req['availability target']:.2%}: {down_min_month:.0f} minutes of downtime a month across the whole path")
per_dep = req["availability target"] ** (1 / 4)
print(f"with 4 serial dependencies each must reach {per_dep:.4%}")

# What the numbers decide.
print("\\ndecisions the numbers force:")
print(" - location updates go to an in-memory geo index (sharded by cell), not the primary database")
print(" - matching reads the geo index; the ride record is written once per ride to a durable store")
print(" - 2 s p99 for matching leaves room for a few hundred ms of retries, not for synchronous calls to slow services")`,
        out: `ride requests: 2,000,000/day, 23/s average, 69/s at peak
driver location writes at peak: 75,000/s  <- the dominant load, 1080x the ride requests
availability 99.95%: 22 minutes of downtime a month across the whole path
with 4 serial dependencies each must reach 99.9875%

decisions the numbers force:
 - location updates go to an in-memory geo index (sharded by cell), not the primary database
 - matching reads the geo index; the ride record is written once per ride to a durable store
 - 2 s p99 for matching leaves room for a few hundred ms of retries, not for synchronous calls to slow services`,
        notes: [
          { t: "p",
            text: "Functional requirements: a rider requests a ride; nearby drivers are offered it; a driver accepts; both see each other's location until pickup. Out of scope: payments, pricing, ratings, scheduled rides. The numbers then do the work. Ride requests peak at only about 70 per second, while driver location updates run at 75,000 per second, over a thousand times more. Without the estimate, a candidate would design around rides and put locations in the same database, and the design would fail on the load nobody computed." },
          { t: "p",
            text: "A 99.95% target allows 22 minutes of downtime a month for the whole path. Split across four serial dependencies, each must reach 99.9875%, so every synchronous dependency in the matching path is a liability. The design follows: locations in a sharded in-memory geo index, rides in a durable store written once per ride, and nothing slow or optional in the synchronous path." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the requirement nobody asked about",
      body: [
        { t: "p",
          text: "**Symptom.** A ticketing service launched a booking flow that passed every functional test. When a popular concert went on sale, traffic reached forty times the daily average within a minute. The service stayed up, but bookings took ninety seconds and a third of payments timed out after the seats had been held." },
        { t: "p",
          text: "**Mechanism.** The design review had covered the features thoroughly and never asked about the peak-to-average ratio or the latency the payment provider needed. Capacity was sized for three times average. Seat holds were synchronous calls to a database already at saturation, and the payment window was shorter than the queueing delay." },
        { t: "p",
          text: "**Fix.** On-sale events now go through a virtual waiting room that admits buyers at the rate the booking path was load-tested for. Seat holds moved to an in-memory reservation store with expiry. The design template opens with the non-functional checklist, and 'peak to average' and 'p99 for the critical path' must have numbers before a review starts." }
      ] }
  ],

  takeaways: [
    "Four steps: **requirements**, **high-level design**, **deep dive**, **wrap-up**, at roughly 8, 12, 18 and 5 minutes.",
    "End the requirements step with **numbers written down**; they decide the design.",
    "Keep functional requirements to **three to five verbs**, and say aloud what is **out of scope**.",
    "Ask the NFRs in a fixed order: **scale, latency, availability, consistency, durability, security, cost**.",
    "**99.95%** allows about **22 minutes** a month; **99.99%** about **4**, which rules out manual failover.",
    "Serial dependencies multiply: five **99.9%** services give **99.5%**, over 40 hours a year.",
    "Split a **p99 budget** across the hops; a hop that does not fit leaves the synchronous path.",
    "Before the deep dive, **name the hard parts** for this problem and ask which to take first.",
    "In the ride-hailing estimate, driver locations were **over 1,000×** the ride requests: compute every load before choosing storage."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Ten minutes into a 45-minute interview you have written requirements but no numbers. What should you do?",
        options: [
          "Start the high-level design now and estimate the numbers later",
          "Write down scale, latency and availability numbers",
          "Skip ahead to the deep dive, the part that carries the score",
          "Ask the interviewer which database they would like you to use"
        ],
        answer: 1,
        why: "The numbers decide the design, so they belong before the boxes. Estimating later usually means the design is never revisited. The deep dive needs a design to dive into, and choosing the database is your job, guided by the numbers." },
      { stem: "A request path calls five services, each 99.9% available, in series. Roughly what availability does the path have?",
        options: ["99.9%, the same as each service", "About 99.5%", "About 99.99%, by averaging", "Exactly 95%"],
        answer: 1,
        why: "Availabilities in series multiply: 0.999⁵ ≈ 0.995, about 44 hours of downtime a year. Averaging is not how failures combine, and 95% would need much less reliable services." },
      { stem: "Which statement turns a non-functional requirement into something you can design against?",
        options: [
          "The system should feel fast to every user",
          "The redirect needs a p99 under 100 ms",
          "It must be highly available at all times",
          "Reads should usually return fresh data"
        ],
        answer: 1,
        why: "A percentile, an operation and a number can be budgeted across hops and tested. 'Fast', 'highly available' and 'usually fresh' cannot be checked, so they cannot drive any decision." },
      { stem: "Your deep dive is about to start. What is the best opening move?",
        options: [
          "Detail the database schema for every table you drew",
          "Name the hard parts and ask which to take first",
          "Redraw the high-level design more neatly and fully",
          "List every technology you might use, with versions"
        ],
        answer: 1,
        why: "Naming where the difficulty is, and letting the interviewer choose, shows judgement and spends the largest block of time where it earns credit. A full schema is rarely the hard part." }
    ] },

  interview: { title: "In an interview",
    sub: "This lesson is about the interview itself, so these are the meta-questions interviewers ask, or that you should be able to answer for yourself.",
    questions: [
      { level: "core",
        q: "Walk me through how you approach a system design question.",
        strong: "A strong answer names the four steps with time budgets, and shows that requirements end in numbers.",
        answer: [
          { t: "p",
            text: "I spend the first five to eight minutes on requirements: three to five functional requirements, an explicit out-of-scope list, then the non-functional questions in a fixed order (scale, latency, availability, consistency, durability, security, cost), each turned into a number. Then about twelve minutes on a complete high-level design, tracing one request end to end." },
          { t: "p",
            text: "Then the deep dive, where I name the two or three hard parts for this problem and ask which to take first, and I finish with bottlenecks, failure modes, monitoring and what I would build next. I keep an eye on the clock so the deep dive gets its time." }
        ] },
      { level: "core",
        q: "The interviewer says 'make it highly available'. What do you do?",
        strong: "A strong answer converts the phrase into nines and downtime, and shows the consequences.",
        answer: [
          { t: "p",
            text: "I ask for a number, or propose one: 'Shall we say 99.95%? That is about 22 minutes a month.' Then I say what it implies. If the path has four serial dependencies, each needs about 99.99%, so I reduce synchronous dependencies, add redundancy where one is unavoidable, and make failover automatic, because a human cannot respond within the budget." }
        ] },
      { level: "advanced",
        q: "How do you decide what goes into the deep dive?",
        strong: "A strong answer ties the choice to where the problem's difficulty lies, and to the numbers.",
        answer: [
          { t: "p",
            text: "I look for where the numbers put stress on the design: the highest write rate, the hottest key, the strictest latency, the place where consistency is non-negotiable. For a feed that is fan-out and the celebrity problem; for a URL shortener, key generation and the read path; for chat, ordering and presence. I state my choice and why, and offer the interviewer an alternative, because they may be probing a specific area." }
        ] }
    ] }
});
