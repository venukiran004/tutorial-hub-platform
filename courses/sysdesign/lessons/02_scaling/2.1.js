/* ============================================================================
   LESSON 2.1 — Vertical and Horizontal Scaling
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "When one server is not enough there are exactly two ways out: a bigger server, or more of them. A bigger server needs no code changes and is the right first move far more often than people admit. More servers buy a ceiling that keeps rising and survival when one dies — but only after **everything the server remembers between requests has been moved somewhere else**. That migration of state, not the load balancer, is the real work of scaling out.",

  objectives: [
    "Compare vertical and horizontal scaling on ceiling, cost, failure and effort",
    "Argue when scaling up is the correct answer, with the numbers that support it",
    "Identify every kind of state a server holds that blocks scaling out",
    "Choose where each kind of state should live once the server is stateless",
    "Explain why sticky sessions defer the problem rather than solve it"
  ],

  prerequisites: ["1.1", "1.3"],

  blocks: [

    { t: "h2", n: "01", id: "two-ways", text: "Up or out",
      sub: "A bigger box, or more boxes" },

    { t: "viz", title: "Scaling up and scaling out",
      caption: "Up: the same single machine, larger — no code changes, one failure domain, a ceiling set by the largest machine you can buy. Out: identical machines behind a balancer — a rising ceiling and survival when one dies, but only if any of them can answer any request.",
      svg: `<svg viewBox="0 0 760 240" width="100%" role="img" aria-label="Vertical and horizontal scaling">
  <defs><marker id="so-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="180" y="22" text-anchor="middle" class="s-label" style="fill:var(--accent)">SCALE UP (vertical)</text>
  <rect x="40" y="132" width="70" height="56" rx="7" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="75" y="156" text-anchor="middle" class="s-label">4 vCPU</text>
  <text x="75" y="173" text-anchor="middle" class="s-sub">16 GB</text>
  <line x1="120" y1="160" x2="182" y2="130" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#so-a)"/>
  <rect x="190" y="44" width="140" height="144" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="260" y="108" text-anchor="middle" class="s-label">64 vCPU</text>
  <text x="260" y="126" text-anchor="middle" class="s-sub">512 GB RAM</text>
  <text x="260" y="144" text-anchor="middle" class="s-sub">NVMe</text>
  <text x="180" y="214" text-anchor="middle" class="s-sub">no code change · one failure domain · a ceiling</text>

  <line x1="380" y1="30" x2="380" y2="200" style="stroke:var(--line);stroke-dasharray:4 4"/>

  <text x="575" y="22" text-anchor="middle" class="s-label" style="fill:var(--good)">SCALE OUT (horizontal)</text>
  <rect x="420" y="90" width="90" height="44" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="465" y="110" text-anchor="middle" class="s-label">Load</text>
  <text x="465" y="125" text-anchor="middle" class="s-label">balancer</text>
  <line x1="510" y1="104" x2="568" y2="58" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#so-a)"/>
  <line x1="510" y1="108" x2="568" y2="96" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#so-a)"/>
  <line x1="510" y1="116" x2="568" y2="134" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#so-a)"/>
  <line x1="510" y1="120" x2="568" y2="172" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#so-a)"/>
  <rect x="570" y="42" width="78" height="30" rx="6" class="s-fill s-stroke"/><text x="609" y="62" text-anchor="middle" class="s-sub">app · 4 vCPU</text>
  <rect x="570" y="80" width="78" height="30" rx="6" class="s-fill s-stroke"/><text x="609" y="100" text-anchor="middle" class="s-sub">app · 4 vCPU</text>
  <rect x="570" y="118" width="78" height="30" rx="6" class="s-fill s-stroke"/><text x="609" y="138" text-anchor="middle" class="s-sub">app · 4 vCPU</text>
  <rect x="570" y="156" width="78" height="30" rx="6" class="s-fill" style="stroke:var(--crit);stroke-dasharray:4 3"/><text x="609" y="176" text-anchor="middle" class="s-sub" style="fill:var(--crit)">dies: fine</text>
  <text x="680" y="118" class="s-sub">+ more</text>
  <text x="575" y="214" text-anchor="middle" class="s-sub">rising ceiling · survives a death · needs statelessness</text>
</svg>` },

    { t: "diagram", kind: "matrix", title: "The two strategies on the axes that decide",
      caption: "On the major clouds, price per core is roughly linear within an instance family, so the old argument that big machines cost disproportionately more mostly applies to buying your own hardware. The real arguments for scaling out are the ceiling and the failure domain.",
      cols: ["Scale up", "Scale out"],
      rows: ["Code changes", "Ceiling", "One machine dies", "Deploy without downtime", "Cost per core (cloud)", "Operational complexity"],
      cells: [
        [{ text: "none", tone: "good" }, { text: "state must leave the server", tone: "warn" }],
        [{ text: "the largest machine on sale", tone: "warn" }, { text: "keeps rising", tone: "good" }],
        [{ text: "total outage", tone: "crit" }, { text: "1/N of capacity", tone: "good" }],
        [{ text: "hard: there is one", tone: "crit" }, { text: "rolling: one at a time", tone: "good" }],
        [{ text: "≈ linear in a family", tone: "accent" }, { text: "≈ linear, plus a balancer", tone: "accent" }],
        [{ text: "low", tone: "good" }, { text: "balancer, discovery, state", tone: "warn" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Scaling up is underrated",
      body: [
        { t: "p", text: "A single modern database server with tens of cores, hundreds of gigabytes of RAM and NVMe storage handles tens of thousands of transactions a second and keeps a large working set in memory. Many very large sites ran for years on a handful of web servers and a pair of large database machines. The largest cloud instances today have hundreds of cores and terabytes of memory." },
        { t: "p", text: "So the correct early answer is often: **scale the database up, scale the stateless tier out.** The app tier is easy to multiply once it is stateless, and doing so buys redundancy cheaply. The database is hard to split (Module 4), and buying a bigger one postpones that work by years. The interview mistake is sharding a database that would fit on one machine." }
      ] },

    { t: "h2", n: "02", id: "state", text: "What stops you scaling out: state",
      sub: "Anything a server remembers between two requests" },

    { t: "p", text: "A load balancer is free to send each request to any server only if **no server knows anything the others do not**. The commonest violation is the login session. This puts 300 users behind three servers and compares three places to keep their sessions — then kills one server:" },

    { t: "code", lang: "python", title: "sessions.py — where sessions live decides who gets logged out", code: `import itertools, random, zlib

class Server:
    def __init__(self, name): self.name, self.local_sessions, self.alive = name, {}, True

shared_store: dict[str, str] = {}               # stands in for Redis

def handle(server, user, mode):
    """Log in on first sight, then report whether this server still knows the user."""
    store = shared_store if mode == "shared store" else server.local_sessions
    if user not in store:
        store[user] = "token-" + user
        return "login"
    return "ok"

def run(mode):
    servers = [Server(f"app-{i}") for i in range(1, 4)]
    rr = itertools.cycle(range(3))
    def pick(user):
        live = [s for s in servers if s.alive]
        if mode == "sticky (ip hash)":
            return live[zlib.crc32(user.encode()) % len(live)]
        return live[next(rr) % len(live)]
    users = [f"u{i}" for i in range(300)]
    rng = random.Random(1)
    def wave():                                                     # everyone makes one request,
        order = rng.sample(users, len(users))                       # in a random order
        return sum(handle(pick(u), u, mode) == "login" for u in order)
    wave()                                                          # everyone logs in once
    before = wave()
    servers[1].alive = False                                        # app-2 dies (or is scaled in)
    after = wave()
    return before, after

print("%-20s %26s %26s" % ("sessions kept in", "forced to log in again", "...after app-2 dies"))
for mode in ("round robin, local", "sticky (ip hash)", "shared store"):
    shared_store.clear()
    b, a = run(mode)
    print("%-20s %20d / 300 %20d / 300" % (mode, b, a))`,
      out: `sessions kept in         forced to log in again        ...after app-2 dies
round robin, local                    190 / 300                  132 / 300
sticky (ip hash)                        0 / 300                  211 / 300
shared store                            0 / 300                    0 / 300`,
      hl: [10, 22, 31],
      caption: "Round robin with local sessions logs out **two-thirds of users on an ordinary request** — whichever server they land on has never seen them. Sticky sessions fix that until a server dies, and then 211 of 300 are logged out, not 100: hashing by `% len(live)` remaps most users when the count changes (4.3 explains why and fixes it). Only the shared store loses nobody." },

    { t: "diagram", kind: "flow", title: "Where state goes when the server stops holding it",
      caption: "The app servers become interchangeable, and each kind of state moves to a service designed to hold it durably and share it. This is the twelve-factor rule — processes are stateless and share nothing — drawn out.",
      cols: 4,
      nodes: [
        { id: "s", label: "Sessions", sub: "→ Redis, or a signed token", tone: "accent" },
        { id: "f", label: "Uploaded files", sub: "→ object storage (4.4)", tone: "warn" },
        { id: "c", label: "Caches", sub: "→ shared cache (Module 3)", tone: "good" },
        { id: "j", label: "Background work", sub: "→ a queue (6.1)", tone: "violet" },
        { id: "k", label: "Counters, limits", sub: "→ Redis, atomically (7.3)", tone: "teal" },
        { id: "w", label: "WebSocket connections", sub: "→ a connection tier (1.6)", tone: "crit" },
        { id: "t", label: "Scheduled jobs", sub: "→ one runner, or a lock (8.4)", tone: "warn" },
        { id: "a", label: "Stateless app server", sub: "any request, any instance", tone: "good" }
      ],
      edges: [] },

    { t: "callout", kind: "trap", title: "Sticky sessions postpone statelessness; they do not provide it",
      body: [
        { t: "p", text: "Pinning each user to one server by cookie or IP hash makes local sessions work, and it is tempting because it requires no code change. But every property you scaled out to get is weakened: a dead server still logs out its users; the balancer cannot even out load because users are pinned (one heavy user overloads one server); autoscaling cannot remove a server without evicting its users; and a deploy restarts everyone's session." },
        { t: "p", text: "Use stickiness only as a performance hint — keeping a warm local cache hot — never as the thing correctness depends on. If losing the pin loses data, the server is still stateful." }
      ] },

    { t: "h2", n: "03", id: "tokens", text: "Two ways to keep a session without the server",
      sub: "A shared store, or a token the client carries" },

    { t: "table",
      head: ["", "Shared session store (Redis)", "Signed token (JWT, 12.2)"],
      rows: [
        ["What the client holds", "An opaque random id", "The session itself, signed by the server"],
        ["Per-request cost", "One cache read (~0.5 ms)", "One signature check (CPU only)"],
        ["Log out / revoke", "Delete the key: immediate", "Hard: valid until expiry, unless you keep a deny-list"],
        ["Size on every request", "~32 bytes", "Hundreds of bytes to kilobytes"],
        ["New dependency", "The store must be highly available", "Key management and rotation"]
      ],
      caption: "Both make the app server stateless. The store keeps control on the server; the token removes a network hop but makes revocation hard, which is why tokens are kept short-lived (12.2)." },

    { t: "exercise", kind: "Challenge", title: "Make a legacy service safe to run as ten copies",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A Flask service runs on one VM. You are asked to put ten copies behind a load balancer with autoscaling. Reading the code, you find:" },
        { t: "ol", items: [
          "`SESSIONS = {}` — a module-level dict of logged-in users",
          "Profile photos saved to `/var/app/uploads` and served from there",
          "An LRU cache of product data in memory",
          "A rate limiter: a dict of `{api_key: request_count}` reset every minute",
          "A `schedule` loop that emails the daily report at 08:00",
          "A thread that resizes uploaded photos after the request returns"
        ] }
      ],
      requirements: [
        "For each item, say what breaks with ten copies",
        "Say where the state should move, and why there",
        "Identify which item is harmless as-is and why",
        "Identify the item whose failure would be noticed by customers rather than engineers first"
      ],
      hint: "For each item ask: if the next request goes to a different copy, or this copy is deleted by autoscaling, what is lost or done twice?",
      solution: { lang: "text", title: "migration.txt",
        code: `1  SESSIONS dict       2/3 of requests land on a copy that never saw the login -> logged out.
                       MOVE: Redis with a TTL, or short-lived signed tokens.
2  local uploads       a photo saved on copy 3 is 404 on the other nine; scale-in deletes it.
                       MOVE: object storage (S3/GCS); serve via CDN; store only the key in the DB.
3  in-memory LRU       HARMLESS. Each copy warms its own; a miss just reads the source.
                       Optional: a shared cache if the hit ratio per copy gets too low.
4  rate-limit dict     each copy counts separately -> real limit is 10x the intended one.
                       MOVE: Redis INCR with expiry, or a token bucket in Redis (7.3).
5  08:00 schedule      ten copies -> the report is emailed ten times.
                       MOVE: one scheduler (a cron service / k8s CronJob) or a lock (8.4).
6  resize thread       work is lost if the copy is scaled in or redeployed mid-job.
                       MOVE: enqueue a job (6.1); a worker pool resizes and retries.`,
        notes: [
          { t: "p", text: "The useful test is the one in the hint: **what is lost or duplicated if the next request lands elsewhere, or this copy disappears?** It sorts every item. The LRU cache fails the test harmlessly — a miss is just slower — which is why per-instance caches are fine and per-instance *sources of truth* are not." },
          { t: "p", text: "Item 4 is the subtle one: nothing crashes and nothing errors. The rate limiter keeps \"working\" while letting through ten times what it should, so it fails silently until the abuse it was meant to stop arrives. Silent wrongness is worse than an error, and multiplying a per-instance counter by the instance count is a classic way to get it." },
          { t: "p", text: "Customers notice item 1 or item 5 first — logged out at random, or ten copies of the same email — so those are what get reported. Items 4 and 6 are found by engineers, much later. That difference in who notices is a reason to look for them deliberately before the migration, not after." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: autoscaling deleted the uploads",
      body: [
        { t: "p", text: "**Symptom.** After a team moved its app to an autoscaling group, users began reporting that profile photos and attached invoices vanished — some immediately, most a day or two later. The bug was intermittent, could not be reproduced on a laptop, and correlated with nothing in the application logs." },
        { t: "p", text: "**Mechanism.** Uploads were still written to each instance's local disk, as on the single VM. A photo uploaded through instance 3 existed only there: requests that landed elsewhere returned 404 (the \"immediately\" reports), and when traffic fell overnight the autoscaler terminated instance 3 along with every file on it (the \"a day later\" reports). The scaling policy was working exactly as designed; the application had state the policy did not know about." },
        { t: "p", text: "**Fix.** Uploads moved to object storage with the key recorded in the database; existing instances' disks were swept and copied before any further scale-in; and the instance image was made read-only except for a scratch directory, so a future local write fails in testing instead of in production. The checklist from the exercise became a gate for any service joining an autoscaling group." }
      ] }
  ],

  takeaways: [
    "**Scale up** = a bigger machine: no code change, one failure domain, a ceiling. **Scale out** = more machines: a rising ceiling and survival when one dies.",
    "On the cloud, **price per core is roughly linear** within a family, so the case for scaling out is the ceiling and the failure domain, not cost.",
    "**Scale the database up and the stateless tier out** is the right early answer surprisingly often; sharding a database that fits on one machine is the classic over-design.",
    "Scaling out requires that **no server remembers anything the others do not** — any request, any instance.",
    "Measured: local sessions behind round robin forced **two-thirds of users to log in again** on an ordinary request.",
    "**Sticky sessions postpone statelessness.** Measured, losing one of three servers logged out 211 of 300 users, because `hash % live_count` remaps most keys (4.3).",
    "State goes somewhere built for it: sessions → Redis or tokens; files → object storage; work → queues; counters → atomic Redis; schedules → one runner or a lock.",
    "A **per-instance cache is harmless**; a per-instance source of truth is not. Test: what is lost or doubled if the next request lands elsewhere?",
    "A per-instance rate limiter silently allows **N times** the intended limit — the most dangerous failures are the ones that do not error.",
    "Autoscaling **deletes instances on purpose**; anything stored on one is on a timer."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service keeps sessions in a local dict and runs on three servers behind a round-robin balancer. What happens?",
        options: ["Nothing; round robin keeps each user on one server", "Most requests land on a server that has never seen the user's login", "Sessions are replicated automatically", "Only the first request fails"],
        answer: 1,
        why: "Round robin sends each request to the next server regardless of user, so with three servers about two in three requests reach one without the session — the simulation logged out 190 of 300 on one wave. Round robin is not sticky; that would be IP hash or cookie affinity. Nothing replicates a Python dict between processes, and the failure recurs on every request, not just the first." },

      { stem: "Why is scaling the application tier out usually easier than scaling the database out?",
        options: ["Application servers are cheaper", "The application tier can be made stateless; the database is where the state is", "Databases cannot run on more than one machine", "Load balancers do not work with databases"],
        answer: 1,
        why: "Once sessions, files and work have moved out, any app server can answer any request, so adding one is trivial. The database holds the state everything else moved into, so splitting it means replication, partitioning and consistency decisions (Modules 4 and 5). Databases certainly can run on many machines — that is what those modules are about — and price per core is similar for both kinds of server." },

      { stem: "Ten copies of a service each enforce a limit of 100 requests per minute per API key using an in-memory counter. What is the effective limit?",
        options: ["100 per minute", "10 per minute", "Up to 1,000 per minute", "It varies randomly between 0 and 100"],
        answer: 2,
        why: "Each copy counts only the requests it sees, so a client spread across ten copies can make 100 on each — up to 1,000. That is the silent failure mode of per-instance state: nothing errors, and the limiter appears to work. The counter has to be shared and atomic, typically Redis INCR with an expiry or a token bucket in Redis (7.3)." },

      { stem: "When is vertical scaling the better choice?",
        options: ["Never — horizontal scaling is always preferred", "When the component is hard to distribute, such as a primary database, and a larger machine meets the need for the foreseeable future", "Only for stateless services", "When you need zero-downtime deploys"],
        answer: 1,
        why: "A bigger machine needs no code change and postpones the expensive work of partitioning state, so for a database that fits on one large machine it is often the right call for years. Stateless services are the ones that scale out most easily, so they rarely need it. Zero-downtime deploys are harder with one machine, not easier. \"Never\" ignores that sharding too early is a common, costly mistake." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The follow-up is always \"what has to change for that to work\".",
    questions: [
      { level: "core",
        q: "Your single server is at 90% CPU. What do you do?",
        strong: "A strong answer diagnoses first, considers scaling up honestly, and names the state that must move before scaling out.",
        answer: [
          { t: "p", text: "First, find out what is consuming it — a profile or the slow-query log — because an unindexed query or an N+1 loop is a cheaper fix than any architecture. If it is genuine load, the quickest relief is a bigger machine: no code changes, minutes to do." },
          { t: "p", text: "For lasting growth and redundancy I would split the tiers: put the database on its own, scale it up, and run the application as several stateless copies behind a load balancer. Before that works I would move every piece of server-local state out — sessions to Redis or tokens, uploads to object storage, background work to a queue, scheduled jobs to a single runner — and check the result by asking what breaks if a request lands on a different copy." }
        ] },

      { level: "core",
        q: "Are sticky sessions a good idea?",
        strong: "A strong answer separates stickiness as an optimisation from stickiness as a correctness requirement.",
        answer: [
          { t: "p", text: "As an optimisation, sometimes — keeping a user on a server with a warm local cache is fine if losing the pin only costs a cache miss. As the thing correctness depends on, no." },
          { t: "p", text: "If sessions live only on one server, that server's death logs those users out, load cannot be evened out because users are pinned, autoscaling cannot remove a server without evicting people, and deploys reset sessions. Naive IP-hash stickiness is worse still: hashing modulo the server count remaps most users when one server leaves, so a single failure logs out far more than its share. The fix is a shared session store or short-lived signed tokens, after which stickiness is optional." }
        ] },

      { level: "advanced",
        q: "When would you not scale out?",
        strong: "A strong answer defends scaling up with reasoning and names the components it applies to.",
        answer: [
          { t: "p", text: "When the component holds state that is expensive to partition and a larger machine covers the growth I can foresee. The primary database is the usual case: a large instance with lots of RAM keeps the working set in memory and handles very high transaction rates, and buying it postpones sharding — with all its cross-shard queries and rebalancing — possibly forever." },
          { t: "p", text: "I would still want redundancy, so a replica for failover rather than horizontal partitioning. And I would watch the trend: if growth would outrun the largest machine within a year or two, that is when to start the partitioning design, deliberately, rather than in an emergency." }
        ] }
    ]
  }
});
