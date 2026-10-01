/* ============================================================================
   LESSON 7.5 — Failover and Redundancy
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "Redundancy (2.5) means a spare exists; **failover** is the act of using it, and that act has a duration and a cost that redundancy diagrams hide. Two numbers define what a failover must achieve: **RTO**, how long recovery may take, and **RPO**, how much recent data may be lost. Most of the minutes in a real failover are not in promoting the spare — they are in **noticing**, **deciding**, and **getting clients to the new place**. And a spare that cannot carry the full load, or a failover that has never been rehearsed, is redundancy on paper only.",

  objectives: [
    "Define RTO and RPO and derive each from a failover design",
    "Break a failover into detection, decision, promotion and redirection, and find where the minutes go",
    "Compare active-passive and active-active, including the capacity active-active needs",
    "Size an N+1 deployment so the survivors can carry the peak",
    "Explain why untested failover fails, and how to test it"
  ],

  prerequisites: ["2.5", "4.1", "7.1"],

  blocks: [

    { t: "h2", n: "01", id: "rto-rpo", text: "RTO and RPO",
      sub: "How long you may be down; how much you may lose" },

    { t: "diagram", kind: "timeline", title: "A failure, and the two objectives measured from it",
      caption: "RPO looks backwards from the failure: the window of writes that existed only on the failed node — for asynchronous replication, the replication lag (4.1). RTO looks forwards: the time until service is restored. They are set by the business and achieved by design; neither is free.",
      span: 20, tick: 2, unit: "minutes",
      lanes: [
        { label: "writes", bars: [[0, 7.5, "replicated", "good"], [7.5, 8, "lost", "crit"]] },
        { label: "service", bars: [[0, 8, "up", "good"], [8, 13, "down: RTO", "crit"], [13, 20, "restored", "good"]] },
        { label: "objective", bars: [[7.5, 8, "RPO", "warn"], [8, 13, "RTO", "warn"]] }
      ] },

    { t: "table",
      head: ["Tier", "RTO", "RPO", "Typical design", "Relative cost"],
      rows: [
        ["Backup and restore", "hours to a day", "since last backup (hours)", "Nightly backups, restore to new hardware", "$"],
        ["Pilot light", "tens of minutes", "minutes", "Replicated data, minimal compute standing by", "$$"],
        ["Warm standby", "minutes", "seconds", "Scaled-down full copy, scaled up on failover", "$$$"],
        ["Active-active", "seconds", "~0 (synchronous) or seconds", "Full capacity serving in every site", "$$$$"]
      ],
      caption: "The tiers are the standard disaster-recovery ladder. Each step down the table costs more because more capacity sits running and more replication is synchronous. Different data in one system usually deserves different tiers." },

    { t: "h2", n: "02", id: "minutes", text: "Where the minutes of a failover go",
      sub: "Notice, decide, promote, redirect, warm up" },

    { t: "code", lang: "python", title: "failover.py — the same database failure, three failover designs", code: `# Where the minutes of a database failover go, for three set-ups.
SETUPS = {
    "manual: page a human": {
        "detect (alert fires)": 120, "human acknowledges and diagnoses": 900,
        "promote replica by hand": 300, "repoint apps (config + restart)": 600, "caches and pools warm": 120},
    "automatic, DNS repoint": {
        "detect (3 missed 5 s heartbeats)": 15, "consensus on new primary": 5,
        "promote replica": 10, "DNS TTL 60 s + client reconnect": 75, "caches and pools warm": 60},
    "automatic, proxy/VIP repoint": {
        "detect (3 missed 2 s heartbeats)": 6, "consensus on new primary": 3,
        "promote replica": 8, "proxy switches target": 2, "caches and pools warm": 30},
}
for name, steps in SETUPS.items():
    total = sum(steps.values())
    print("%-30s RTO %5.1f min" % (name, total / 60))
    for step, s in steps.items():
        print("    %-36s %5d s  %s" % (step, s, "#" * max(1, s // 30)))`,
      out: `manual: page a human           RTO  34.0 min
    detect (alert fires)                   120 s  ####
    human acknowledges and diagnoses       900 s  ##############################
    promote replica by hand                300 s  ##########
    repoint apps (config + restart)        600 s  ####################
    caches and pools warm                  120 s  ####
automatic, DNS repoint         RTO   2.8 min
    detect (3 missed 5 s heartbeats)        15 s  #
    consensus on new primary                 5 s  #
    promote replica                         10 s  #
    DNS TTL 60 s + client reconnect         75 s  ##
    caches and pools warm                   60 s  ##
automatic, proxy/VIP repoint   RTO   0.8 min
    detect (3 missed 2 s heartbeats)         6 s  #
    consensus on new primary                 3 s  #
    promote replica                          8 s  #
    proxy switches target                    2 s  #
    caches and pools warm                   30 s  #`,
      caption: "Promotion itself takes seconds in every design. The **manual** failover's half-hour is a person being paged, waking up, diagnosing and editing configuration. **Automatic** failover removes the human, and then the largest remaining item is **redirecting clients**: a DNS change waits out its TTL (1.1), while a proxy or virtual IP that clients already connect to switches in seconds. Detection is a deliberate trade: shorter heartbeat intervals detect faster and declare healthy nodes dead more often (8.5)." },

    { t: "callout", kind: "insight", title: "Four nines needs automatic failover",
      body: [
        { t: "p", text: "Four nines allows about 4.4 minutes of downtime a month (2.5). A single manual failover of the kind above spends that budget seven times over. Every target above three nines therefore implies detection, decision and redirection without a human in the loop — and the human's job moves to reviewing what the automation did." }
      ] },

    { t: "h2", n: "03", id: "modes", text: "Active-passive and active-active",
      sub: "A spare that waits, or everyone working" },

    { t: "diagram", kind: "compare", title: "Two redundancy modes",
      caption: "Active-passive is simpler and the standard for databases with a single writer. Active-active is the standard for stateless tiers and is what multi-region designs aim for — with the consistency questions of 5.1 attached to any data written in more than one place.",
      columns: [
        { title: "Active-passive", tone: "accent", items: [
          "one site serves; a standby replicates and waits",
          "failover = detect, promote, redirect",
          "standby capacity idles (or serves reads)",
          "one writer: no write conflicts",
          "risk: the standby has never served real load"
        ] },
        { title: "Active-active", tone: "good", items: [
          "every site serves a share of traffic",
          "failure = the survivors absorb its share",
          "every site must keep headroom for that",
          "writes in several sites: conflicts or partitioning (5.1, 4.1)",
          "constantly exercised: failover is normal operation"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Active-active at 70% everywhere",
      body: [
        { t: "p", text: "Three sites each running at 70% of their capacity look comfortably redundant. When one fails, its traffic moves to the other two, which now need 105% of their capacity — so they overload, shed or fail too, and a single-site outage becomes a full outage, now with a thundering herd of reconnecting clients (7.1). The redundancy was real; the **headroom** was not." },
        { t: "p", text: "In an active-active deployment of N sites, each must run at no more than **(N − 1) / N** of capacity at peak: 50% for two sites, 67% for three, 75% for four. Autoscaling helps only if it can add capacity faster than the overload develops — usually it cannot in the first minutes. The exercise turns this into instance counts." }
      ] },

    { t: "h2", n: "04", id: "testing", text: "Untested failover is not failover",
      sub: "Rehearse it, on purpose, regularly" },

    { t: "diagram", kind: "steps", title: "Why failovers that have never run fail when needed",
      caption: "Each of these is discovered either during a planned exercise or during a real outage. The first is much cheaper. Chaos engineering (11.6) and game days make the exercise routine.",
      items: [
        { label: "The standby is stale or broken", desc: "replication stopped weeks ago; nobody alerted on lag", code: "alert on lag", tone: "crit" },
        { label: "The standby is undersized", desc: "provisioned smaller to save money; cannot carry peak", code: "same size", tone: "warn" },
        { label: "Clients cannot find it", desc: "hard-coded addresses, cached DNS, connection pools that never reconnect", code: "test redirect", tone: "warn" },
        { label: "A hidden dependency is single-homed", desc: "a config service, a licence server, a secret store in one zone", code: "map dependencies", tone: "violet" },
        { label: "The runbook is wrong", desc: "written once, never executed, commands changed since", code: "rehearse quarterly", tone: "accent" }
      ] },

    { t: "exercise", kind: "Challenge", title: "Size an active-active deployment",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A service peaks at 90,000 requests a second globally; one instance serves 1,500 a second at its target utilisation. It must survive the loss of any one site without degrading. Compare deploying across 2, 3, 4 and 6 sites." }
      ],
      requirements: [
        "For each site count, compute the instances per site so the survivors can carry the full peak",
        "Report total instances, the overhead above the minimum, and normal peak utilisation",
        "Explain why more sites cost less redundancy",
        "Name what limits how many sites are worth having"
      ],
      hint: "With N sites, the peak must fit in N − 1 of them.",
      solution: { lang: "python", title: "n_plus_one_ex.py",
        code: `import math

PEAK_RPS = 90_000            # global peak
PER_INSTANCE = 1_500         # rps one instance serves at its target utilisation
for sites in (2, 3, 4, 6):
    # active-active: when one site fails, the survivors must carry the whole peak
    need_total = math.ceil(PEAK_RPS / PER_INSTANCE)
    per_site_survive = math.ceil(need_total / (sites - 1))
    total = per_site_survive * sites
    util_normal = PEAK_RPS / (total * PER_INSTANCE)
    print("%d sites: %3d instances per site, %3d in all (%.0f%% overhead), normal peak utilisation %3.0f%%"
          % (sites, per_site_survive, total, 100 * (total / need_total - 1), 100 * util_normal))`,
        out: `2 sites:  60 instances per site, 120 in all (100% overhead), normal peak utilisation  50%
3 sites:  30 instances per site,  90 in all (50% overhead), normal peak utilisation  67%
4 sites:  20 instances per site,  80 in all (33% overhead), normal peak utilisation  75%
6 sites:  12 instances per site,  72 in all (20% overhead), normal peak utilisation  83%`,
        notes: [
          { t: "p", text: "Two sites need **100% overhead** — each must carry the whole peak alone, so normal utilisation is 50%. Three sites need 50%, four 33%, six 20%. The spare capacity needed is one site's worth, and a site is a smaller fraction of the whole as the count rises: the arithmetic of N+1." },
          { t: "p", text: "The (N − 1)/N utilisation column is the number to put on dashboards and capacity plans: above it, the deployment no longer survives the failure it was designed for — and nothing visibly breaks until the day a site goes." },
          { t: "p", text: "More sites are not free beyond that: each adds operational surface, cross-site data replication and its consistency questions, and a minimum footprint — a site with two instances cannot lose one. Cells (10.6) push this idea furthest, with many small, independent units and the blast radius of any failure limited to one." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the standby that had not replicated for 23 days",
      body: [
        { t: "p", text: "**Symptom.** A primary database's storage failed. The on-call engineer promoted the standby in another zone as the runbook described, and the application came back — showing data from three weeks earlier. Orders, sign-ups and payments from 23 days were missing." },
        { t: "p", text: "**Mechanism.** A configuration change to the primary had broken replication 23 days before; the standby had been quietly sitting at that point ever since. Replication lag was graphed on a dashboard nobody watched and had no alert. The architecture diagram showed a replicated, redundant database throughout. The real RPO had been growing by a day every day." },
        { t: "p", text: "**Fix.** The old primary's storage was eventually recovered and the gap merged back by hand over a weekend. Then: alerts on replication lag and on a standby that stops reporting; a monthly automated failover drill in staging and a quarterly one in production with the standby taking real traffic; and the RTO and RPO for each data store written down and tested against, not assumed from the diagram." }
      ] }
  ],

  takeaways: [
    "**RTO** is how long recovery may take; **RPO** is how much recent data may be lost. The business sets them; the design achieves them.",
    "The DR ladder — **backup/restore → pilot light → warm standby → active-active** — trades cost for RTO and RPO.",
    "Measured breakdown: promotion takes seconds; a **manual** failover took about half an hour, mostly a human; automatic failover's largest remaining cost is **redirecting clients**.",
    "Redirect through a **proxy or virtual IP** in seconds rather than **DNS**, which waits out its TTL.",
    "**Four nines requires automatic failover** — one manual failover exceeds months of the budget.",
    "**Active-passive** is simple with one writer; **active-active** is constantly exercised and needs headroom in every site.",
    "With N active sites, each must run at no more than **(N − 1)/N** at peak — 50% for two, 67% for three.",
    "Measured: surviving one site's loss costs **100% overhead with two sites, 50% with three, 20% with six**.",
    "**Untested failover fails**: stale standbys, undersized spares, unreachable redirects and wrong runbooks. Alert on replication lag and rehearse regularly."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A database replicates asynchronously with up to 5 seconds of lag and fails over automatically in 40 seconds. What are its RPO and RTO?",
        options: ["RPO 40 s, RTO 5 s", "RPO up to 5 s, RTO about 40 s", "Both zero", "RPO 0, RTO 45 s"],
        answer: 1,
        why: "RPO is the data that may be lost — writes in the replication lag window, up to 5 seconds — and RTO is the time to restore service, about 40 seconds. Swapping them confuses the backward-looking and forward-looking measures; zero RPO would need synchronous replication." },

      { stem: "In an automatic database failover, which step usually takes the longest once humans are removed?",
        options: ["Promoting the replica", "Getting clients to connect to the new primary — DNS TTLs, reconnects, warm-up", "Writing the WAL", "Compiling the application"],
        answer: 1,
        why: "Promotion takes seconds; clients learning the new address and re-establishing pools and caches is the long tail — 75 seconds of the DNS-based design's three minutes. A proxy or virtual IP shortens it. WAL writing and compilation are not part of failover." },

      { stem: "Three active-active regions each run at 70% at peak. One fails. What happens?",
        options: ["The other two absorb its traffic comfortably", "The survivors need about 105% of their capacity, so they overload", "Traffic is dropped from the failed region only", "Nothing changes; regions are independent"],
        answer: 1,
        why: "The failed region's 70% splits across two survivors, adding 35% each, which takes them to 105% — overload, shedding or cascading failure. Each of three sites should run at no more than two-thirds at peak. Traffic is redirected, not simply dropped, and that redirection is exactly what loads the survivors." },

      { stem: "What is the most reliable way to know a failover will work?",
        options: ["Review the architecture diagram", "Run it regularly, including in production with real traffic", "Buy a bigger standby", "Document the runbook carefully"],
        answer: 1,
        why: "Only exercising the failover reveals stale replicas, undersized standbys, unreachable redirects, single-homed dependencies and outdated runbooks — the standby that had not replicated for 23 days looked fine on every diagram. Documentation and capacity help, but are themselves only verified by running the procedure." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Give the RTO and RPO a design achieves, not just the boxes.",
    questions: [
      { level: "core",
        q: "What are RTO and RPO, and how do they drive the design?",
        strong: "A strong answer defines both and maps targets to concrete replication and failover choices.",
        answer: [
          { t: "p", text: "RTO is the maximum acceptable time to restore service; RPO is the maximum acceptable data loss, measured backwards from the failure. An RPO of hours allows nightly backups; seconds means continuous asynchronous replication; zero means synchronous replication to another failure domain. An RTO of hours allows restoring from backup; minutes needs a warm standby and automation; seconds needs active-active or automatic failover with fast redirection." },
          { t: "p", text: "They are business decisions per data store — an orders database and an analytics store rarely need the same — and each step tighter costs more, because more capacity runs idle and more replication is synchronous." }
        ] },

      { level: "advanced",
        q: "Walk me through a database failover and how to make it fast.",
        strong: "A strong answer decomposes the timeline and attacks each part.",
        answer: [
          { t: "p", text: "Detection, decision, promotion, redirection, warm-up. Detection by health checks or heartbeats — a few missed beats a few seconds apart, trading speed against false positives. Decision by a consensus-based manager like Patroni on etcd, so two nodes cannot both become primary (8.4). Promotion is seconds." },
          { t: "p", text: "Redirection is usually the long pole: if clients find the primary through DNS, they wait out the TTL and reconnect, so I would put a proxy or virtual IP in front so the target switches in seconds, and make connection pools validate and reconnect. Then warm-up: pools refill and caches rewarm, which matters if the cache was on the failed node. And I would rehearse it regularly, because an unexercised failover path is where the surprises are." }
        ] },

      { level: "core",
        q: "Active-passive or active-active?",
        strong: "A strong answer chooses by statefulness and write pattern and addresses headroom.",
        answer: [
          { t: "p", text: "For stateless tiers, active-active — every zone serves, failure just shifts load, and failover is exercised every day. For a single-writer database, active-passive with a synchronous or semi-synchronous standby in another zone, because active-active writes bring conflicts or require partitioning by home region." },
          { t: "p", text: "Either way the survivors must be able to carry the peak: with N active sites each runs at most at (N − 1)/N, and a passive standby must be the same size as the primary. A redundant design without that headroom turns one failure into two." }
        ] }
    ]
  }
});
