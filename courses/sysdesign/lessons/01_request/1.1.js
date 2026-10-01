/* ============================================================================
   LESSON 1.1 — Client, Server, IP and DNS
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "Every system design starts with the same picture: a client asks, a server answers, and something has to turn a name into an address first. The part people skip is that **every layer between the user and your server keeps its own copy of the answer** — which is why DNS is fast, and why changing a DNS record is a promise that lands over minutes or a day, not a switch you flip.",

  objectives: [
    "Draw the read path of a web system and name what every box on it is for",
    "Explain what the client-server split puts on each side, and why statelessness matters later",
    "Trace a DNS lookup through the browser, OS, resolver, root, TLD and authoritative server",
    "Predict how long a DNS change takes to reach users from its TTL",
    "Choose a TTL for a failover plan from a recovery-time target and a query budget"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", id: "read-path", text: "The picture every design starts from",
      sub: "Draw it first, then delete the boxes the requirements do not justify" },

    { t: "p", text: "Most of this course is about one picture. A user's device sends a request; it passes through a handful of boxes; your code runs; data comes back. Every later module either adds a box to this picture, makes one of its boxes bigger, or explains what happens when one breaks." },

    { t: "viz", title: "The read path, with what each hop costs",
      caption: "The top row is the path every request takes. The bottom row is what sits behind the app tier. Every later module adds, scales or protects one of these boxes — and the numbers under each are why it exists.",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="Client, DNS, CDN, load balancer, app tier, and cache, database and queue behind it">
  <defs><marker id="rp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="16" y="22" class="s-label" style="fill:var(--accent)">THE REQUEST PATH</text>
  <rect x="45" y="40" width="110" height="52" rx="9" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="100" y="62" text-anchor="middle" class="s-label">Client</text>
  <text x="100" y="79" text-anchor="middle" class="s-sub">browser / app</text>
  <rect x="185" y="40" width="110" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="240" y="62" text-anchor="middle" class="s-label">DNS</text>
  <text x="240" y="79" text-anchor="middle" class="s-sub">name → IP</text>
  <rect x="325" y="40" width="110" height="52" rx="9" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="380" y="62" text-anchor="middle" class="s-label">CDN</text>
  <text x="380" y="79" text-anchor="middle" class="s-sub">static + cached</text>
  <rect x="465" y="40" width="110" height="52" rx="9" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="520" y="62" text-anchor="middle" class="s-label">Load balancer</text>
  <text x="520" y="79" text-anchor="middle" class="s-sub">L4 / L7</text>
  <rect x="605" y="40" width="110" height="52" rx="9" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="660" y="62" text-anchor="middle" class="s-label">App tier</text>
  <text x="660" y="79" text-anchor="middle" class="s-sub">stateless × N</text>
  <line x1="155" y1="66" x2="183" y2="66" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <line x1="295" y1="66" x2="323" y2="66" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <line x1="435" y1="66" x2="463" y2="66" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <line x1="575" y1="66" x2="603" y2="66" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <text x="240" y="110" text-anchor="middle" class="s-mono" style="fill:var(--accent)">~20 ms cold, 0 cached</text>
  <text x="380" y="110" text-anchor="middle" class="s-mono">10–30 ms</text>
  <text x="520" y="110" text-anchor="middle" class="s-mono">&lt; 1 ms</text>
  <text x="660" y="110" text-anchor="middle" class="s-mono">your code</text>
  <text x="16" y="146" class="s-label" style="fill:var(--warn)">BEHIND THE APP TIER</text>
  <line x1="660" y1="92" x2="660" y2="160" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <line x1="640" y1="92" x2="520" y2="160" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <line x1="620" y1="92" x2="380" y2="160" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#rp-a)"/>
  <rect x="325" y="162" width="110" height="52" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="380" y="184" text-anchor="middle" class="s-label">Cache</text>
  <text x="380" y="201" text-anchor="middle" class="s-sub">80–95% hits</text>
  <rect x="465" y="162" width="110" height="52" rx="9" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="520" y="184" text-anchor="middle" class="s-label">Database</text>
  <text x="520" y="201" text-anchor="middle" class="s-sub">primary + replicas</text>
  <rect x="605" y="162" width="110" height="52" rx="9" class="s-fill s-stroke" stroke-width="1.3"/>
  <text x="660" y="184" text-anchor="middle" class="s-label">Queue</text>
  <text x="660" y="201" text-anchor="middle" class="s-sub">work done later</text>
  <text x="380" y="232" text-anchor="middle" class="s-mono" style="fill:var(--good)">~1 ms</text>
  <text x="520" y="232" text-anchor="middle" class="s-mono" style="fill:var(--warn)">5–20 ms</text>
  <text x="660" y="232" text-anchor="middle" class="s-mono">off the request</text>
  <text x="16" y="254" class="s-sub">Every design decision in this course is really about moving work from a slow box to a fast one, or off the request entirely.</text>
</svg>` },

    { t: "p", text: "This lesson is about the first two boxes — the client and the name lookup. 1.2 puts numbers on every arrow, 1.3 explains the boxes in the middle, and Module 2 makes the app tier plural." },

    { t: "h2", n: "02", id: "client-server", text: "Client and server: who owns what",
      sub: "The split that every later decision assumes" },

    { t: "diagram", kind: "compare", title: "The two sides of every request",
      caption: "The client is untrusted and replaceable; the server is the only place a rule can actually be enforced. Anything that matters — a price, a permission, a balance — is decided on the right.",
      columns: [
        { title: "Client — browser, mobile app, device", tone: "accent", items: [
          "starts every exchange: HTTP is request then response",
          "renders, collects input, holds UI state",
          "is untrusted: anyone can send any bytes",
          "cannot be pushed to without an open channel (1.6)"
        ] },
        { title: "Server — your code", tone: "good", items: [
          "owns business rules, data and security",
          "validates everything the client sends",
          "is stateless by default: each request stands alone",
          "can be copied N times behind a balancer — if stateless"
        ] }
      ] },

    { t: "p", text: "Two properties on the right decide much of what follows. **The client initiates.** A plain HTTP server cannot speak first, which is why WebSockets, server-sent events and webhooks exist (1.6). And **the server is stateless by default** — each request carries everything needed to answer it, in a cookie or a token. That second property is what lets Module 2 run ten identical servers behind a load balancer: if any server can answer any request, the balancer is free to choose." },

    { t: "callout", kind: "mental", title: "The thirty-second version of a page load",
      body: [
        { t: "ol", items: [
          "The browser needs an IP address for the name the user typed — **DNS**.",
          "It opens a **TCP** connection to that address, then a **TLS** session on top (1.4).",
          "It sends an **HTTP** request; the server runs code and perhaps queries a database.",
          "The server returns a response; the browser renders it and fetches what it references."
        ] },
        { t: "p", text: "Every interview question of the form \"what happens when you type a URL\" is this list, and every follow-up drills into one line of it." }
      ] },

    { t: "h2", n: "03", id: "ip", text: "Addresses: IP and port",
      sub: "The IP gets you to the machine; the port gets you to the process" },

    { t: "p", text: "An **IP address** identifies a network interface. IPv4 addresses are 32 bits — about 4.3 billion of them, long since exhausted — written as four numbers like `203.0.113.10`. IPv6 addresses are 128 bits, written in hex like `2001:db8::8a2e:370:7334`. A **port** completes the address: the IP reaches the machine, the port reaches one program on it." },

    { t: "table",
      head: ["Range", "Kind", "Where you meet it"],
      rows: [
        ["`10.0.0.0/8`", "Private", "Cloud VPCs, large corporate networks (12.4)"],
        ["`172.16.0.0/12`", "Private", "Docker's default bridge, some VPCs"],
        ["`192.168.0.0/16`", "Private", "Home and office networks"],
        ["Everything else (mostly)", "Public", "Routable on the open internet — what DNS hands to a user"],
        ["`:443` · `:80` · `:5432` · `:6379`", "Ports", "HTTPS · HTTP · PostgreSQL · Redis"]
      ],
      caption: "Private addresses are reused in millions of networks and are not reachable from the internet, which is exactly why a database belongs on one (12.4)." },

    { t: "p", text: "Nobody types IP addresses, and you would not want them to: servers move, scale and fail over, and every one of those changes the address. What you want is a stable name and a layer of indirection that maps it to whatever the address is today. That layer is DNS." },

    { t: "h2", n: "04", id: "dns", text: "DNS: a name becomes an address",
      sub: "A distributed, cached, hierarchical lookup" },

    { t: "diagram", kind: "steps", title: "Resolving shop.example.com, cold",
      caption: "Each step is only taken when the one above it has nothing cached. A warm lookup usually stops at step 1 or 3 and costs nothing or a few milliseconds; the full walk to the authoritative server is the 20–100 ms cold case.",
      items: [
        { label: "Browser cache", desc: "has this tab resolved the name recently?", code: "0 ms", tone: "good" },
        { label: "Operating system cache", desc: "the stub resolver, shared by every program on the machine", code: "< 1 ms", tone: "good" },
        { label: "Recursive resolver", desc: "your ISP's, or 8.8.8.8 / 1.1.1.1 — does the walk for you and caches the result", code: "1–10 ms", tone: "accent" },
        { label: "Root nameserver", desc: "\"I don't know shop.example.com, but .com is over there\"", code: "+ RTT", tone: "warn" },
        { label: "TLD nameserver (.com)", desc: "\"example.com's authoritative servers are these\"", code: "+ RTT", tone: "warn" },
        { label: "Authoritative nameserver", desc: "the one that actually holds the record — returns the IP and a TTL", code: "+ RTT", tone: "crit" }
      ] },

    { t: "p", text: "The answer comes back with a **TTL** — time to live, in seconds — and every layer that saw it caches it for that long. That caching is what makes DNS cheap enough to sit in front of every request on the internet, and it is the whole reason the rest of this lesson exists." },

    { t: "diagram", kind: "matrix", title: "The record types you will be asked about",
      caption: "A and AAAA hold addresses; CNAME points one name at another; the rest exist for mail, verification and delegation. A CNAME cannot sit at the zone apex (example.com itself), which is why providers invent ALIAS records.",
      cols: ["Holds", "Typical use"],
      rows: ["A", "AAAA", "CNAME", "MX", "TXT", "NS"],
      cells: [
        [{ text: "an IPv4 address", tone: "accent" }, { text: "shop.example.com → 203.0.113.10" }],
        [{ text: "an IPv6 address", tone: "accent" }, { text: "the same, for IPv6 clients" }],
        [{ text: "another name", tone: "violet" }, { text: "www → a CDN or load balancer name" }],
        [{ text: "a mail server", tone: "teal" }, { text: "where email for the domain goes" }],
        [{ text: "free text", tone: "teal" }, { text: "domain verification, SPF, DKIM" }],
        [{ text: "nameservers", tone: "warn" }, { text: "delegation to the authoritative servers" }]
      ] },

    { t: "callout", kind: "insight", title: "DNS is also a load-balancing and routing tool",
      body: [
        { t: "p", text: "A name can resolve to several addresses, and the authoritative server can choose which to return. **Round-robin DNS** rotates them; **GeoDNS** or **latency-based routing** returns the address closest to the resolver asking; **health-checked DNS** stops returning an address whose server failed its checks." },
        { t: "p", text: "That is the first layer of every multi-region design and of every CDN (3.5): the user is sent to a nearby point of presence before a single packet reaches your servers. Its weakness is the subject of the next section — the decision is cached, so it cannot be taken back quickly." }
      ] },

    { t: "h2", n: "05", id: "ttl", text: "TTL: why a DNS change is not a switch",
      sub: "Every cache keeps the old answer until its own copy expires" },

    { t: "p", text: "When you change a record, the authoritative server starts answering with the new value immediately. Nobody else does. Every recursive resolver that cached the old answer keeps serving it until its copy expires, and those copies were fetched at different moments — so the change arrives as a spread, not a step." },

    { t: "diagram", kind: "timeline", title: "Four resolvers after the record changes at minute 0 (TTL = 60 minutes)",
      caption: "Each resolver cached the old address at a different moment, so each one switches at a different moment. Until the last one expires, some users are still sent to the old server.",
      span: 60, tick: 10, unit: "minutes after the change",
      lanes: [
        { label: "Resolver A", bars: [[0, 7, "old", "crit"], [7, 60, "new address", "good"]] },
        { label: "Resolver B", bars: [[0, 26, "old address", "crit"], [26, 60, "new address", "good"]] },
        { label: "Resolver C", bars: [[0, 44, "old address", "crit"], [44, 60, "new", "good"]] },
        { label: "Resolver D", bars: [[0, 58, "old address — still", "crit"], [58, 60, "", "good"]] }
      ] },

    { t: "p", text: "If each resolver cached the record at a random moment within the last TTL, its copy expires at a uniformly random point within the next TTL. That gives the share of resolvers still serving the old address at any time after the change:" },

    { t: "code", lang: "python", title: "dns_ttl.py — share of resolvers still on the old address", code: `import random

def stale_share(ttl_s: int, minutes_after: list[int], resolvers: int = 10_000) -> list[float]:
    """Each resolver cached the old record at a uniformly random moment within
    the last TTL, so it expires at a uniform point in the next TTL seconds."""
    rng = random.Random(7)
    expiry = [rng.uniform(0, ttl_s) for _ in range(resolvers)]
    out = []
    for m in minutes_after:
        t = m * 60
        out.append(sum(e > t for e in expiry) / resolvers)
    return out

checkpoints = [0, 1, 5, 15, 30, 60]
print("%-10s" % "TTL" + "".join("%8s" % ("+%dm" % m) for m in checkpoints))
for ttl in (60, 300, 3600, 86400):
    row = stale_share(ttl, checkpoints)
    print("%-10s" % (f"{ttl}s") + "".join("%7.0f%%" % (100 * r) for r in row))`,
      out: `TTL            +0m     +1m     +5m    +15m    +30m    +60m
60s           100%      0%      0%      0%      0%      0%
300s          100%     80%      0%      0%      0%      0%
3600s         100%     98%     92%     75%     50%      0%
86400s        100%    100%    100%     99%     98%     96%`,
      caption: "With a one-hour TTL, **half your users are still on the old address thirty minutes after the change**. With a one-day TTL, 96% still are an hour later. This is the best case: some resolvers enforce a minimum TTL, and some clients cache longer than they are told." },

    { t: "table",
      head: ["TTL", "Change lands in", "Query load on your DNS", "Use it for"],
      rows: [
        ["30–60 s", "about a minute", "High — every resolver re-asks every minute", "Records you may need to fail over"],
        ["300 s", "about five minutes", "Moderate", "The usual default for application records"],
        ["3,600 s+", "an hour or more", "Low", "Records that never change: MX, NS, verification"]
      ],
      caption: "The trade is speed of change against query volume and lookup latency. A low TTL also means more users pay the cold-lookup cost." },

    { t: "callout", kind: "trap", title: "Lowering the TTL during the incident does nothing",
      body: [
        { t: "p", text: "The resolvers that matter already hold the record **with the old TTL**. They will not ask again until that expires, so they never see your new, lower TTL until it is too late to help. A one-day TTL lowered to sixty seconds in the middle of an outage still takes a day to drain." },
        { t: "p", text: "The rule follows directly: **lower the TTL at least one old-TTL ahead of any planned change** — two days before a migration on a one-day record — make the change, confirm traffic has moved, then raise it again." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Choose a TTL for DNS failover",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Your service fails over between two regions by changing an A record. Health checks take 30 seconds to declare the primary dead. The business wants recovery within five minutes. About 200,000 distinct recursive resolvers ask for your name." },
        { t: "p", text: "Pick the largest TTL that meets the target, and say what it costs." }
      ],
      requirements: [
        "Model the worst-case switch time as detection time plus one full TTL",
        "Model DNS query load as resolvers divided by TTL",
        "Tabulate both for TTLs of 30 s to one hour",
        "Report the largest TTL that meets the five-minute target",
        "Say what the model leaves out that would make the real number worse"
      ],
      hint: "A resolver that cached the record one second before the failover keeps the old answer for the whole TTL — that is the worst case.",
      solution: { lang: "python", title: "dns_ex.py",
        code: `RESOLVERS = 200_000          # distinct recursive resolvers that ask for your name
HEALTH_DETECT_S = 30         # time for health checks to declare the primary dead
RTO_S = 5 * 60               # the business says: back within five minutes

print("%8s %14s %16s %10s" % ("TTL", "worst switch", "DNS queries/s", "meets RTO"))
for ttl in (30, 60, 120, 300, 900, 3600):
    worst = HEALTH_DETECT_S + ttl          # detect, update the record, wait out every cache
    qps = RESOLVERS / ttl                  # each resolver re-asks once per TTL
    print("%7ds %13ds %16.0f %10s" % (ttl, worst, qps, "yes" if worst <= RTO_S else "NO"))

best = max(t for t in (30, 60, 120, 300, 900, 3600) if HEALTH_DETECT_S + t <= RTO_S)
print()
print("largest TTL that meets the RTO:", best, "s")`,
        out: `     TTL   worst switch    DNS queries/s  meets RTO
     30s            60s             6667        yes
     60s            90s             3333        yes
    120s           150s             1667        yes
    300s           330s              667         NO
    900s           930s              222         NO
   3600s          3630s               56         NO

largest TTL that meets the RTO: 120 s`,
        notes: [
          { t: "p", text: "The common default of 300 seconds **misses a five-minute target by thirty seconds** once detection time is counted. That is the kind of result that is invisible until you add the two numbers, and it is why the TTL belongs in the failover plan rather than in whatever the DNS console defaulted to." },
          { t: "p", text: "The cost is the other column: 120 s means about 1,700 queries a second against your DNS provider, against 56 at an hour. Managed DNS bills per query, so a low TTL on a high-traffic name is a line item — still usually cheap next to the outage it shortens." },
          { t: "p", text: "The model is optimistic in the direction that hurts. Some resolvers clamp TTLs to a minimum, browsers and JVMs cache on their own schedule, and long-lived connections never re-resolve at all — a client holding an open connection to the dead region stays there until the connection breaks. That last one is why DNS failover is paired with health-checked load balancers (2.2) rather than relied on alone." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the old servers were switched off a day too early",
      body: [
        { t: "p", text: "**Symptom.** A team migrated a web application to new infrastructure on a Friday evening. They changed the A record, saw traffic arrive at the new servers within minutes, and decommissioned the old fleet an hour later. Over the weekend, support received a steady stream of \"site is down\" reports — from some users, in some places, but not from the team's own laptops." },
        { t: "p", text: "**Mechanism.** The record had a TTL of 86,400 seconds. The team's own resolver had happened to refresh early, and the first traffic at the new servers looked like success. But resolvers that had cached the old address shortly before the change kept serving it for up to a day — the bottom row of the table in section 05, where 96% of a one-day TTL's caches are still stale an hour in. Those users were being sent to machines that no longer existed." },
        { t: "p", text: "**Fix.** Re-provision a single reverse proxy on one of the old addresses that forwarded everything to the new fleet, which ended the outage within the hour. The runbook changed to: lower the TTL to 60 seconds **two days ahead**, migrate, **watch request volume on the old address fall to zero** rather than watching it rise on the new one, and only then decommission — and raise the TTL afterwards." }
      ] }
  ],

  takeaways: [
    "**Draw the read path first** — client, DNS, CDN, load balancer, app tier, and cache, database and queue behind it. Every later decision adds, scales or protects one of those boxes.",
    "**The client initiates and is untrusted; the server owns the rules.** Anything that matters — a price, a permission — is decided server-side.",
    "**Servers are stateless by default**, and that property is what lets many identical servers sit behind a load balancer (Module 2).",
    "An **IP** reaches a machine and a **port** reaches a program on it. Private ranges (`10/8`, `172.16/12`, `192.168/16`) are not internet-routable — which is where databases belong.",
    "DNS resolution checks the **browser, OS and recursive resolver caches first**, and only walks root → TLD → authoritative on a cold miss.",
    "**A, AAAA, CNAME, MX, TXT, NS** — and a CNAME cannot sit at the zone apex.",
    "DNS doubles as **routing**: round-robin, geo and latency-based answers, and health-checked records are the first layer of multi-region design.",
    "**A DNS change lands as a spread over one TTL**, not a step: measured, half of one-hour-TTL caches are still stale thirty minutes later.",
    "**Lowering a TTL during an incident does nothing** — caches hold the old TTL. Lower it at least one old-TTL ahead of a planned change.",
    "A failover TTL comes from **detection time plus TTL ≤ RTO**, against a query load of **resolvers ÷ TTL**. The 300 s default missed a five-minute target.",
    "**Decommission an old address when its traffic reaches zero**, not when traffic appears at the new one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You change an A record whose TTL is 3,600 seconds. Roughly what share of resolvers still return the old address 30 minutes later?",
        options: ["None — the authoritative server answers with the new value immediately", "About half", "All of them, until the next day", "Only those that use IPv6"],
        answer: 1,
        why: "Each resolver cached the record at a different moment within the last hour, so expiries are spread uniformly across the next hour and about half have expired at the 30-minute mark — the simulation gives 50%. The authoritative server does answer correctly at once, but resolvers do not ask it until their copy expires. A full day is the behaviour of an 86,400-second TTL, and the IP version has nothing to do with caching." },

      { stem: "An outage starts and someone lowers the record's TTL from one day to 60 seconds. What effect does that have on the users currently being sent to the dead server?",
        options: ["They switch within 60 seconds", "Almost none — their resolvers hold the old record with the old TTL", "They switch at the next browser refresh", "The record is purged from all caches"],
        answer: 1,
        why: "A resolver only sees the new TTL when it next asks the authoritative server, and it will not ask until its current copy — fetched with the one-day TTL — expires. So the change helps only resolvers that were going to refresh anyway. Browser refreshes reuse the OS and resolver caches, and there is no global purge mechanism for DNS. That is why the TTL must be lowered one old-TTL ahead of a planned change." },

      { stem: "Why does the stateless-by-default property of HTTP servers matter for scaling?",
        options: ["It makes each request faster", "It lets any of many identical servers answer any request, so a load balancer can choose freely", "It removes the need for a database", "It makes the server unable to use cookies"],
        answer: 1,
        why: "If a request carries everything needed to answer it — in a cookie or token — then it does not matter which server receives it, and a load balancer can spread traffic and drop a failed server without losing anyone's session. Statelessness does not make an individual request faster, it does not remove the database (state moves there), and cookies are exactly how a stateless server receives the client's context." },

      { stem: "A failover plan needs recovery in five minutes and health checks take 30 seconds. Which TTL is the largest that meets the target?",
        options: ["3,600 s", "300 s", "120 s", "Any TTL works, because DNS updates instantly"],
        answer: 2,
        why: "The worst-case user is behind a resolver that cached the old record just before failover, so they wait detection time plus a full TTL: 30 + 120 = 150 s meets the target, while 30 + 300 = 330 s misses it. 300 s is the common default precisely because nobody adds the detection time. An hour misses by a factor of twelve, and DNS updates are only instant at the authoritative server." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The URL question is a test of whether you can go one level deeper on any line you mention.",
    questions: [
      { level: "core",
        q: "What happens when you type a URL into a browser and press enter?",
        strong: "A strong answer gives the four stages in order and is ready to go deeper on whichever one the interviewer picks.",
        answer: [
          { t: "p", text: "Four stages. DNS turns the name into an address — browser cache, OS cache, recursive resolver, and only on a cold miss the walk from root to TLD to the authoritative server, with the answer cached for its TTL at every layer. Then a TCP connection to that address, and a TLS handshake on top of it for HTTPS. Then the HTTP request: in a real system it hits a CDN or load balancer first, then an app server, which may read a cache or a database. Then the response, which the browser renders, fetching the assets it references — mostly from a CDN." },
          { t: "p", text: "I would offer to go deeper on any of those, because each has a design question in it: DNS TTLs and failover, the round trips TLS costs, what the load balancer does with a dead server, and why the CDN serves most of the bytes." }
        ] },

      { level: "core",
        q: "Why can a DNS change take a day to reach users, and what do you do about it?",
        strong: "A strong answer names per-layer caching with TTLs, explains why lowering the TTL late fails, and gives the migration procedure.",
        answer: [
          { t: "p", text: "Every layer between the user and the authoritative server caches the answer for the record's TTL, and each fetched it at a different time, so after a change the old answer drains out over one TTL. With a one-day TTL that is a day, and some resolvers and clients cache longer than they are told." },
          { t: "p", text: "Lowering the TTL once the change has been made does not help, because the caches hold the old TTL and will not ask again until it expires. So the procedure is: lower the TTL one old-TTL ahead, make the change, watch traffic to the old address fall to zero, keep the old target alive or proxying until it does, then decommission and raise the TTL again." }
        ] },

      { level: "advanced",
        q: "Would you use DNS for failover between regions?",
        strong: "A strong answer says yes as one layer, quantifies its weakness, and pairs it with something faster.",
        answer: [
          { t: "p", text: "As the outer layer, yes — health-checked or latency-based DNS is how most multi-region systems steer users. But its switch time is detection plus a full TTL, and the 300-second default misses a five-minute target once you add the detection time. So I would set the TTL from the recovery target — about 60 to 120 seconds — and accept the extra query volume." },
          { t: "p", text: "And I would not rely on it alone, because clients with long-lived connections never re-resolve and some resolvers ignore low TTLs. Inside a region, failover belongs to load balancers with health checks, which react in seconds. Across regions, anycast or a global load balancer avoids DNS caching entirely, which is why large providers use them." }
        ] }
    ]
  }
});
