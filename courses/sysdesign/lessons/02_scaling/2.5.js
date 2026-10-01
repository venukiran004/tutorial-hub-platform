/* ============================================================================
   LESSON 2.5 — Synthesis: The Resilient Core
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "Put the module together and you get the shape almost every web system starts from: redundant load balancers, a stateless tier of identical servers, and a database with a standby. Building it step by step teaches the arithmetic that justifies it — **components in series multiply their failure, copies in parallel divide it** — and two surprises: splitting one box into two *lowers* availability until something is duplicated, and redundancy is worth almost nothing if the copies **share a failure domain**.",

  objectives: [
    "Compute the availability of components in series and in parallel",
    "Trace a system from one box to the resilient core and say what each step bought",
    "Explain why adding a component in series lowers availability",
    "Identify correlated failures that break the independence redundancy relies on",
    "Raise the availability of a request path by removing synchronous dependencies"
  ],

  prerequisites: ["2.1", "2.2"],

  blocks: [

    { t: "h2", n: "01", id: "arithmetic", text: "The arithmetic of availability",
      sub: "Series multiplies; parallel divides the failure" },

    { t: "viz", title: "Two ways to combine components",
      caption: "In series, the request needs every component, so availabilities multiply and the chain is weaker than its weakest link. In parallel, the request needs only one copy, so the *unavailabilities* multiply — two 99.5% copies fail together only 0.0025% of the time, if their failures are independent.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Series and parallel availability">
  <defs><marker id="av-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="190" y="22" text-anchor="middle" class="s-label" style="fill:var(--crit)">SERIES — needs all of them</text>
  <line x1="20" y1="80" x2="58" y2="80" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <rect x="60" y="56" width="110" height="48" rx="8" class="s-fill s-stroke"/>
  <text x="115" y="78" text-anchor="middle" class="s-label">app</text><text x="115" y="95" text-anchor="middle" class="s-mono">99.5%</text>
  <line x1="170" y1="80" x2="208" y2="80" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <rect x="210" y="56" width="110" height="48" rx="8" class="s-fill s-stroke"/>
  <text x="265" y="78" text-anchor="middle" class="s-label">database</text><text x="265" y="95" text-anchor="middle" class="s-mono">99.5%</text>
  <line x1="320" y1="80" x2="358" y2="80" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <text x="190" y="140" text-anchor="middle" class="s-mono">0.995 × 0.995 = 99.0%</text>
  <text x="190" y="162" text-anchor="middle" class="s-sub" style="fill:var(--crit)">worse than either part alone</text>

  <line x1="390" y1="30" x2="390" y2="190" style="stroke:var(--line);stroke-dasharray:4 4"/>

  <text x="575" y="22" text-anchor="middle" class="s-label" style="fill:var(--good)">PARALLEL — needs any one</text>
  <line x1="420" y1="80" x2="470" y2="56" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <line x1="420" y1="80" x2="470" y2="108" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <rect x="472" y="34" width="110" height="40" rx="8" class="s-fill s-stroke"/>
  <text x="527" y="59" text-anchor="middle" class="s-mono">app 99.5%</text>
  <rect x="472" y="88" width="110" height="40" rx="8" class="s-fill s-stroke"/>
  <text x="527" y="113" text-anchor="middle" class="s-mono">app 99.5%</text>
  <line x1="582" y1="54" x2="640" y2="78" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <line x1="582" y1="108" x2="640" y2="84" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#av-a)"/>
  <text x="575" y="160" text-anchor="middle" class="s-mono">1 − 0.005 × 0.005 = 99.9975%</text>
  <text x="575" y="182" text-anchor="middle" class="s-sub" style="fill:var(--good)">only if they cannot fail together</text>
</svg>` },

    { t: "table",
      head: ["Availability", "Nines", "Downtime per year", "Per month"],
      rows: [
        ["99%", "two", "3.65 days", "7.3 hours"],
        ["99.9%", "three", "8.8 hours", "43.8 minutes"],
        ["99.95%", "three and a half", "4.4 hours", "21.9 minutes"],
        ["99.99%", "four", "52.6 minutes", "4.4 minutes"],
        ["99.999%", "five", "5.3 minutes", "26 seconds"]
      ],
      caption: "Each nine is ten times less downtime and, roughly, ten times more engineering. Four nines leaves no room for a human to be paged, wake up and act — it has to be automatic (7.5)." },

    { t: "h2", n: "02", id: "stages", text: "From one box to the resilient core",
      sub: "Each step, and what it actually bought" },

    { t: "p", text: "Assume each machine is up 99.5% of the time, a load balancer 99.9%, and a whole availability zone — a data centre's power, cooling and network — 99.9%. Then build:" },

    { t: "code", lang: "python", title: "availability.py — the resilient core, one step at a time", code: `def series(*a):                       # every part must be up
    p = 1.0
    for x in a: p *= x
    return p
def parallel(a, n):                   # at least one of n independent copies up
    return 1 - (1 - a) ** n

BOX, LB, DB = 0.995, 0.999, 0.995     # each machine or service on its own
ZONE = 0.999                          # a whole availability zone: power, network, cooling
HOURS = 24 * 365

stages = [
    ("0  one box: app + db together",         BOX),
    ("1  app box + separate db box",           series(BOX, DB)),
    ("2  one LB, 3 app servers, one db",       series(LB, parallel(BOX, 3), DB)),
    ("3  LB pair, 3 app servers, one db",      series(parallel(LB, 2), parallel(BOX, 3), DB)),
    ("4  LB pair, 3 apps, db + hot standby",   series(parallel(LB, 2), parallel(BOX, 3), parallel(DB, 2))),
    ("5  stage 4, all in ONE zone",            series(ZONE, parallel(LB, 2), parallel(BOX, 3), parallel(DB, 2))),
    ("6  stage 4, spread over 3 zones",        series(parallel(series(ZONE, LB), 2),
                                                      parallel(series(ZONE, BOX), 3),
                                                      parallel(series(ZONE, DB), 2))),
]
print("%-40s %12s %16s" % ("stage", "availability", "downtime / year"))
for name, a in stages:
    print("%-40s %11.4f%% %13.1f h" % (name, 100 * a, (1 - a) * HOURS))`,
      out: `stage                                    availability  downtime / year
0  one box: app + db together                99.5000%          43.8 h
1  app box + separate db box                 99.0025%          87.4 h
2  one LB, 3 app servers, one db             99.4005%          52.5 h
3  LB pair, 3 app servers, one db            99.4999%          43.8 h
4  LB pair, 3 apps, db + hot standby         99.9974%           0.2 h
5  stage 4, all in ONE zone                  99.8974%           9.0 h
6  stage 4, spread over 3 zones              99.9960%           0.4 h`,
      caption: "Step 1 **doubles** the downtime: separating the database added a second component the request depends on. Steps 2 and 3 duplicate the app tier and the balancer, but the database is still alone, so the gain stops at the database's 99.5%. Step 4 duplicates the last single point and the downtime collapses. Step 5 is the catch: with everything in one zone, the zone itself is a single point of failure the redundancy cannot touch. Step 6 spreads the copies across zones." },

    { t: "callout", kind: "trap", title: "Every component added in series lowers availability",
      body: [
        { t: "p", text: "The step-1 result is not a curiosity; it is the most common way systems get less reliable as they grow. Each new service a request calls synchronously — auth, profile, pricing, recommendations — multiplies in. Ten services at 99.9% each, all on the request path, give 99.0%: **87 hours of downtime a year from components that are each individually fine.**" },
        { t: "p", text: "There are only two defences: make each component in the chain redundant, or take it **out of the chain** — call it asynchronously through a queue (6.1), cache its answer (Module 3), or degrade gracefully when it is down (7.2). The exercise below does exactly that to a checkout." }
      ] },

    { t: "viz", title: "The resilient core, spread across three zones",
      caption: "Every box in the request path is at least two copies in different zones. The balancer is a managed multi-zone service or a pair with a floating address; the app tier is stateless and spread; the database has a synchronous standby in another zone and an asynchronous read replica in a third (4.1). Losing any one zone loses a third of capacity and nothing else.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Resilient core across three availability zones">
  <defs><marker id="rc-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <rect x="20" y="70" width="230" height="214" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:5 4"/>
  <rect x="265" y="70" width="230" height="214" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:5 4"/>
  <rect x="510" y="70" width="230" height="214" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:5 4"/>
  <text x="135" y="88" text-anchor="middle" class="s-sub">zone A</text>
  <text x="380" y="88" text-anchor="middle" class="s-sub">zone B</text>
  <text x="625" y="88" text-anchor="middle" class="s-sub">zone C</text>
  <rect x="200" y="14" width="360" height="36" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="37" text-anchor="middle" class="s-label">Load balancer — managed, multi-zone</text>
  <line x1="300" y1="50" x2="135" y2="104" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#rc-a)"/>
  <line x1="380" y1="50" x2="380" y2="104" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#rc-a)"/>
  <line x1="460" y1="50" x2="625" y2="104" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#rc-a)"/>
  <rect x="60" y="106" width="150" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="135" y="131" text-anchor="middle" class="s-label">app × 2</text>
  <rect x="305" y="106" width="150" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="380" y="131" text-anchor="middle" class="s-label">app × 2</text>
  <rect x="550" y="106" width="150" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="625" y="131" text-anchor="middle" class="s-label">app × 2</text>
  <rect x="60" y="176" width="150" height="48" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="135" y="197" text-anchor="middle" class="s-label">DB primary</text>
  <text x="135" y="214" text-anchor="middle" class="s-sub">all writes</text>
  <rect x="305" y="176" width="150" height="48" rx="8" class="s-fill" style="stroke:var(--warn);stroke-dasharray:5 3" stroke-width="1.4"/>
  <text x="380" y="197" text-anchor="middle" class="s-label">DB standby</text>
  <text x="380" y="214" text-anchor="middle" class="s-sub">sync, promotes on failure</text>
  <rect x="550" y="176" width="150" height="48" rx="8" class="s-fill s-stroke"/>
  <text x="625" y="197" text-anchor="middle" class="s-label">read replica</text>
  <text x="625" y="214" text-anchor="middle" class="s-sub">async, reads only</text>
  <line x1="210" y1="200" x2="303" y2="200" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#rc-a)"/>
  <text x="256" y="192" text-anchor="middle" class="s-sub">sync</text>
  <path d="M135 224 Q 380 280 625 226" style="fill:none;stroke:var(--line);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#rc-a)"/>
  <text x="380" y="272" text-anchor="middle" class="s-sub">async replication</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Redundancy assumes independence, and independence is designed",
      body: [
        { t: "p", text: "The parallel formula holds only if the copies fail independently. Two servers on one host, one power circuit, one rack switch, one zone, one deploy pipeline or one configuration file are **one failure domain**, and they fail together. Real outages are dominated by these correlated failures: a bad config pushed to every server at once, a certificate that expires everywhere at midnight (1.4), a zone losing power." },
        { t: "p", text: "So redundancy is placed deliberately across failure domains: copies in different zones, deploys rolled out gradually so a bad build reaches one zone first, and configuration changes staged like code. The stage-5 row is what happens when this is forgotten." }
      ] },

    { t: "h2", n: "03", id: "next", text: "What the core still lacks",
      sub: "The rest of the course, in one table" },

    { t: "diagram", kind: "matrix", title: "Where the resilient core will run out next",
      caption: "The core is correct and redundant, but every request still reaches the database, and the database has one primary. That is the next bottleneck — and the order in which the course removes it.",
      cols: ["Symptom", "Fixed by"],
      rows: ["Reads saturate primary", "Same data read repeatedly", "Users far away are slow", "Writes saturate primary", "Slow work inside requests", "A dependency is slow"],
      cells: [
        [{ text: "CPU high on SELECTs", tone: "warn" }, { text: "read replicas (4.1)", tone: "good" }],
        [{ text: "90% of reads hit 1% of rows", tone: "warn" }, { text: "caching (Module 3)", tone: "good" }],
        [{ text: "200 ms per round trip", tone: "warn" }, { text: "CDN and the edge (3.5)", tone: "good" }],
        [{ text: "one primary's write ceiling", tone: "crit" }, { text: "sharding (4.2)", tone: "good" }],
        [{ text: "requests wait on email, PDFs", tone: "warn" }, { text: "queues (Module 6)", tone: "good" }],
        [{ text: "threads pile up, cascade", tone: "crit" }, { text: "timeouts, breakers (Module 7)", tone: "good" }]
      ] },

    { t: "exercise", kind: "Challenge", title: "Raise a checkout's availability without touching the core",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The resilient core is 99.97% available. Checkout also calls, synchronously, a third-party payment API (99.9%), an internal fraud-scoring service (99.5%) and an email provider to send the receipt (99.0%). Product asks why checkout is down \"so often\"." }
      ],
      requirements: [
        "Compute the availability and yearly downtime of checkout as built",
        "Take the email out of the request path and recompute",
        "Let fraud scoring fail open to simple local rules when the service is down, and recompute",
        "Add a second payment provider with failover, and recompute",
        "State the business risk each change accepts"
      ],
      hint: "A component taken out of the synchronous path no longer multiplies into checkout's availability — but whatever replaces it (a queue) does.",
      solution: { lang: "python", title: "avail_ex.py",
        code: `def series(*a):
    p = 1.0
    for x in a: p *= x
    return p

CORE = 0.9997          # our own redundant core (stage 6 of the lesson, rounded)
PAYMENTS = 0.999       # third-party payment API
FRAUD = 0.995          # internal fraud-scoring service
EMAIL = 0.990          # email provider
QUEUE = 0.9999         # managed queue
HOURS = 24 * 365

designs = {
    "everything synchronous":                 series(CORE, PAYMENTS, FRAUD, EMAIL),
    "email via a queue":                      series(CORE, PAYMENTS, FRAUD, QUEUE),
    "+ fraud fails open to local rules":      series(CORE, PAYMENTS, QUEUE),
    "+ second payment provider (failover)":   series(CORE, 1 - (1 - PAYMENTS) ** 2, QUEUE),
}
print("%-40s %12s %14s" % ("checkout design", "availability", "down h/year"))
for name, a in designs.items():
    print("%-40s %11.3f%% %12.1f" % (name, 100 * a, (1 - a) * HOURS))`,
        out: `checkout design                          availability    down h/year
everything synchronous                        98.377%        142.2
email via a queue                             99.361%         56.0
+ fraud fails open to local rules             99.860%         12.3
+ second payment provider (failover)          99.960%          3.5`,
        notes: [
          { t: "p", text: "As built, checkout is down **142 hours a year** — almost entirely because of the dependencies, not the core. The email provider alone accounts for most of it, and a receipt email is the clearest example of work that has no reason to be inside the request: the customer needs the order confirmed, not the email sent. Moving it to a queue swaps a 99.0% dependency for a 99.99% one." },
          { t: "p", text: "Failing fraud open is a **business decision, not an engineering one**: during a fraud-service outage, orders are checked against simple local rules (amount limits, a blocklist) and flagged for review later. The engineering can quantify the trade — 44 fewer hours of downtime against some exposure during outages — but finance has to accept it." },
          { t: "p", text: "The last step shows the ceiling: once only the payment provider and the core are left, duplicating the provider brings the path to **3.5 hours a year**. The pattern is the lesson's whole argument — for each synchronous dependency, either make it redundant or take it out of the path." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the redundant pair in one zone",
      body: [
        { t: "p", text: "**Symptom.** A company's architecture review listed every component as redundant: two load balancers, six app servers, a primary and a standby database. During a cloud provider's zone outage the entire service was down for three hours, while competitors in the same region stayed up." },
        { t: "p", text: "**Mechanism.** Everything had been launched into the default subnet, and the default subnet lived in one zone. Every pair was a pair of copies inside one failure domain — stage 5 of the table, where redundancy's arithmetic stops applying because the copies cannot fail independently. The review had counted copies without asking where they were." },
        { t: "p", text: "**Fix.** Subnets in three zones, app servers spread by the autoscaling group across all three, the database standby in a second zone with automatic failover, and a quarterly game day that disables one zone's subnets and checks the service stays up (11.6). The review template gained a column: **for each redundant component, what failure domain do its copies share?**" }
      ] }
  ],

  takeaways: [
    "**Series: availabilities multiply.** Every component a request needs makes the whole less available than any part.",
    "**Parallel: unavailabilities multiply.** Two independent 99.5% copies fail together 0.0025% of the time.",
    "Each nine is **ten times less downtime**: three nines is 8.8 hours a year; four nines is 53 minutes and must be automatic.",
    "Measured step by step: separating the database **doubled downtime** (99.5% → 99.0%) until something was duplicated.",
    "Duplicating everything except one component leaves the system **exactly as available as that component**.",
    "The resilient core: **redundant balancer, stateless app tier, database with a standby — spread across zones**.",
    "Redundancy assumes **independent failure**. Copies sharing a zone, host, config or deploy are one failure domain; in one zone the core lost two nines.",
    "Ten synchronous dependencies at 99.9% each give **99.0%** — 87 hours a year from parts that are each fine.",
    "Raise a path's availability by making each dependency **redundant or asynchronous**: measured, a checkout went from 142 hours of downtime to 3.5.",
    "The core's next bottleneck is the **single database primary** — the subject of Modules 3 and 4."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A request passes through a load balancer (99.9%), an app server (99.5%) and a database (99.5%), one of each. What is the path's availability?",
        options: ["99.9%", "99.5%", "About 98.9%", "About 99.97%"],
        answer: 2,
        why: "Components in series multiply: 0.999 × 0.995 × 0.995 ≈ 0.989, about 98.9%. The path is less available than its weakest component, so 99.5% overstates it, and 99.9% is the best single component. 99.97% would require redundancy that this path does not have." },

      { stem: "You run two app servers, each 99.5% available, in parallel. When does the formula 1 − (0.005)² stop being a good estimate?",
        options: ["When there are more than two servers", "When the two servers share a failure domain such as a host, a zone or a configuration", "When the servers are stateless", "When the load balancer uses round robin"],
        answer: 1,
        why: "The parallel formula assumes the copies fail independently; if they share a host, zone, power, deploy or config, they fail together and the true availability falls back towards one copy's. More copies extend the formula rather than break it, statelessness is what makes parallel copies possible, and the balancing algorithm does not change whether failures are correlated." },

      { stem: "A team splits a monolith's single server into an app server and a separate database server, each 99.5%. What happens to availability?",
        options: ["It rises, because the load is shared", "It falls, to about 99.0%, because both must be up", "It is unchanged", "It rises to 99.9975%"],
        answer: 1,
        why: "The request now needs both machines, so availabilities multiply: 0.995 × 0.995 ≈ 99.0%, doubling yearly downtime. Splitting is often still right — it allows each tier to scale and be made redundant separately — but by itself it adds a component in series. 99.9975% is the parallel formula, which would apply to two copies of the same thing." },

      { stem: "Which change most improves the availability of a checkout that synchronously calls an email provider (99.0%)?",
        options: ["Retry the email call three times", "Send the email from a queue after checkout completes", "Use a faster email provider", "Add more app servers"],
        answer: 1,
        why: "Taking the email out of the synchronous path removes its 99.0% from the product of checkout's availability and replaces it with the queue's much higher availability; the measured downtime fell from 142 to 56 hours a year. Retries help with transient errors but not with a provider outage, and they lengthen the request. Speed and app-server count do not change a dependency's availability." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Availability claims are only credible with the arithmetic and the failure domains.",
    questions: [
      { level: "core",
        q: "How would you make this design highly available?",
        strong: "A strong answer walks the request path, removes each single point of failure, and spreads copies across failure domains.",
        answer: [
          { t: "p", text: "Walk the request path and find every component with one copy. The balancer becomes a managed multi-zone balancer or a failover pair. The app tier becomes stateless and runs several copies across zones. The database gets a synchronous standby in another zone with automatic failover, and read replicas for read load." },
          { t: "p", text: "Then two checks people skip. Do the copies share a failure domain — one zone, one config, one deploy? If so they are one copy. And which dependencies does the request call synchronously? Each multiplies into availability, so anything that does not need to be in the request — email, analytics, PDFs — goes on a queue, and anything that can degrade, like recommendations, gets a fallback." }
        ] },

      { level: "core",
        q: "What does 99.99% availability mean in practice?",
        strong: "A strong answer converts it to minutes and draws the operational consequence.",
        answer: [
          { t: "p", text: "About 52 minutes of downtime a year, or four and a half minutes a month. That rules out any recovery that needs a human: by the time someone is paged, has logged in and diagnosed the issue, the month's budget is gone. So four nines means automated detection and failover, redundancy across zones, gradual rollouts so a bad deploy reaches a fraction of traffic first, and fast rollback." },
          { t: "p", text: "It also means every synchronous dependency must itself be better than four nines, or be removed from the path, because series availability multiplies. I would also ask whether the business really needs it, because each extra nine costs roughly ten times as much." }
        ] },

      { level: "advanced",
        q: "Everything in your architecture diagram is redundant, but you still had a three-hour outage. What could explain it?",
        strong: "A strong answer names correlated failure modes and how to design them out.",
        answer: [
          { t: "p", text: "Correlated failure — the copies were not independent. All in one zone; all running the same bad build or config pushed at once; all depending on one shared thing like DNS, a certificate, an identity provider or a secrets service; or a failover that had never been tested and did not work when needed." },
          { t: "p", text: "The fixes follow: spread copies across zones and verify placement, roll out code and configuration gradually by zone or cell so a mistake hits a fraction first, list the shared dependencies and make each one redundant or degradable, and run game days that actually fail a zone or a primary to prove the failover works." }
        ] }
    ]
  }
});
