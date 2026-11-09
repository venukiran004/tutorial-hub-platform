/* ============================================================================
   LESSON 15.6 — Trade-Offs, Red Flags and the Staff-Level Answer
   ========================================================================= */
EC.receiveLesson({
  id: "15.6",

  lede: "Two candidates can draw the same boxes and get different levels. What separates them is how they talk about the choices: whether every component comes with the alternative it beat and the requirement that decided it, whether they can see which part of the design breaks first as the load grows, and whether they know what to leave out. This lesson turns trade-offs from adjectives into a comparison you can compute, lists the red and green flags interviewers write down, and shows what staff-level answers add: evolution over time, operability, and decisions recorded so someone else can revisit them.",

  objectives: [
    "Compare design options on shared axes and discard the dominated ones",
    "Let a stated requirement choose among the remaining options, and say which requirement it was",
    "Project when each component reaches its ceiling and order the work by lead time",
    "Recognise the red flags interviewers record, and the green flags that offset them",
    "Write a short decision record: context, options, decision, consequences"
  ],

  prerequisites: ["15.1", "15.2", "10.6", "11.6"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "tradeoffs",
      text: "Trade-offs you can compute",
      sub: "Same axes for every option, then remove the dominated" },
    { t: "p",
      text: "'It depends' is the right first answer to most design questions and a useless last one. The way to finish it is to put the options on the same axes (cost, latency, freshness, new failure modes, effort), discard any option that another beats on every axis, and let a stated requirement choose among what is left. The script does this for five ways to serve 50,000 reads a second from a database that handles 8,000. The figures are illustrative round numbers; the method is what transfers." },
    { t: "code",
      lang: "python",
      title: "tradeoffs.py — the frontier, then the requirement",
      code: `# Five ways to serve 50,000 reads/s from a database that handles 8,000. Costs and latencies are illustrative
# round numbers; the method is the point: put every option on the same axes, then remove the dominated ones.
options = {
    #  name                        $/month  p99 ms  staleness s  new failure modes  team weeks
    "bigger primary (scale up)":   (42_000,   12,      0,              0,               1),
    "7 read replicas":             (30_000,   14,      1,              1,               2),
    "cache-aside, 95% hits":       ( 9_000,    3,     60,              2,               3),
    "cache + 2 read replicas":     (17_000,    3,     60,              3,               4),
    "shard the database 8 ways":   (64_000,   11,      0,              2,              12),
}
axes = ["cost", "p99", "staleness", "failure modes", "effort"]

def dominated(a, b):
    """b dominates a if b is no worse on every axis and better on at least one (lower is better everywhere)."""
    return all(y <= x for x, y in zip(a, b)) and any(y < x for x, y in zip(a, b))

print(f"{'option':<29}" + "".join(f"{a:>14}" for a in axes) + "   verdict")
for name, v in options.items():
    beaten = [o for o, w in options.items() if o != name and dominated(v, w)]
    print(f"{name:<29}" + "".join(f"{x:>14,}" for x in v) + ("   dominated by " + beaten[0] if beaten else "   on the frontier"))

# The requirement picks among the frontier: here, how stale a read may be.
for max_stale in (0, 60):
    ok = {n: v for n, v in options.items() if v[2] <= max_stale}
    best = min(ok, key=lambda n: ok[n][0])
    print(f"\\nreads may be at most {max_stale:>2} s stale -> cheapest acceptable: {best} (\${ok[best][0]:,}/month)")`,
      out: `option                                 cost           p99     staleness failure modes        effort   verdict
bigger primary (scale up)            42,000            12             0             0             1   on the frontier
7 read replicas                      30,000            14             1             1             2   on the frontier
cache-aside, 95% hits                 9,000             3            60             2             3   on the frontier
cache + 2 read replicas              17,000             3            60             3             4   dominated by cache-aside, 95% hits
shard the database 8 ways            64,000            11             0             2            12   on the frontier

reads may be at most  0 s stale -> cheapest acceptable: bigger primary (scale up) ($42,000/month)

reads may be at most 60 s stale -> cheapest acceptable: cache-aside, 95% hits ($9,000/month)` },
    { t: "dl",
      items: [
        { term: "Dominated options leave the conversation",
          def: "Cache plus two replicas was beaten on every axis by the cache alone. Saying so takes one sentence and shows you compared, not guessed." },
        { term: "The requirement picks the winner",
          def: "If reads may be a minute stale, the cache wins at a fifth of the cost. If they must be fresh, scaling up the primary wins, and sharding, the 'scalable' answer, costs more and takes three months longer for this load." },
        { term: "Name the axis you are giving up",
          def: "'I accept up to a minute of staleness on the catalogue for a fifth of the cost' is a trade-off. 'Caching is better' is not." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "The most scalable answer is not the best answer",
      body: [
        { t: "p",
          text: "Candidates reach for sharding, microservices and multi-region because they sound senior. When a single larger machine meets the requirement for years, the senior answer is to say so, state when it stops being enough, and keep the migration path open. Complexity you add today is paid for every day after, in failure modes and in the effort column." }
      ] },
    { t: "h2",
      n: "02",
      id: "evolution",
      text: "What breaks first as you grow",
      sub: "The staff-level part of the answer" },
    { t: "p",
      text: "Staff-level answers describe the design over time, not as a snapshot. Every component has a ceiling it can reach without a redesign, and a lead time to change it. Projected forward, they give the order of work, and that order is often different from the order in which they break, because the slowest changes must start first." },
    { t: "code",
      lang: "python",
      title: "breakpoints.py — when each component breaks, and when to start",
      code: `import math

# Today's peak load on each component, the capacity it can reach without redesign, and the lead time to change it.
components = {
    # name                          load today   ceiling without redesign   weeks to change it
    "primary DB writes":            (  1_200,       6_000,                   26),   # sharding is a project
    "DB storage (TB)":              (      4,          30,                   12),
    "cache memory (GB)":            (    300,       2_000,                    4),
    "fan-out workers (msgs/s)":     ( 40_000,     400_000,                    6),
    "single-region egress (Gbps)":  (     12,         100,                   20),
}
GROWTH = 2.0      # load doubles every year

print(f"{'component':<30}{'headroom':>10}{'breaks in':>12}{'start change by':>18}")
plan = []
for name, (load, ceiling, lead_weeks) in components.items():
    years = math.log(ceiling / load, GROWTH)
    start = years * 52 - lead_weeks
    plan.append((start, name))
    print(f"{name:<30}{ceiling / load:>9.1f}x{years * 12:>9.0f} mo{('now (overdue)' if start <= 0 else f'week {start:.0f}'):>18}")
print("\\norder of work:", " -> ".join(n for _, n in sorted(plan)))`,
      out: `component                       headroom   breaks in   start change by
primary DB writes                   5.0x       28 mo           week 95
DB storage (TB)                     7.5x       35 mo          week 139
cache memory (GB)                   6.7x       33 mo          week 138
fan-out workers (msgs/s)           10.0x       40 mo          week 167
single-region egress (Gbps)         8.3x       37 mo          week 139

order of work: primary DB writes -> cache memory (GB) -> single-region egress (Gbps) -> DB storage (TB) -> fan-out workers (msgs/s)` },
    { t: "viz",
      title: "Utilisation of three components as load doubles each year",
      caption: "Each line is load divided by the ceiling the component can reach without redesign. The primary's write path crosses 100% in about 28 months, first, and because sharding takes about six months to deliver it must start around week 95. The cache crosses five months later but takes weeks to grow. Lead time, not breaking order, sets the plan.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="166.8" x2="610" y2="166.8" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="170.8" text-anchor="end" class="s-sub">50</text>
<line x1="64" y1="109.6" x2="610" y2="109.6" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="113.6" text-anchor="end" class="s-sub">100</text>
<line x1="64" y1="52.3" x2="610" y2="52.3" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="56.3" text-anchor="end" class="s-sub">150</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">0</text>
<text x="132.2" y="242" text-anchor="middle" class="s-sub">6</text>
<text x="200.5" y="242" text-anchor="middle" class="s-sub">12</text>
<text x="268.8" y="242" text-anchor="middle" class="s-sub">18</text>
<text x="337.0" y="242" text-anchor="middle" class="s-sub">24</text>
<text x="405.2" y="242" text-anchor="middle" class="s-sub">30</text>
<text x="473.5" y="242" text-anchor="middle" class="s-sub">36</text>
<text x="541.8" y="242" text-anchor="middle" class="s-sub">42</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">48</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">months from today (load doubles yearly)</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">share of ceiling (%)</text>
<polyline points="64.0,201.1 132.2,191.6 200.5,178.2 268.8,159.2 337.0,132.4 405.2,94.6 473.5,40.9 541.8,-35.0 610.0,-142.2" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="201.1" r="2" style="fill:var(--crit)"/>
<circle cx="132.2" cy="191.6" r="2" style="fill:var(--crit)"/>
<circle cx="200.5" cy="178.2" r="2" style="fill:var(--crit)"/>
<circle cx="268.8" cy="159.2" r="2" style="fill:var(--crit)"/>
<circle cx="337.0" cy="132.4" r="2" style="fill:var(--crit)"/>
<circle cx="405.2" cy="94.6" r="2" style="fill:var(--crit)"/>
<circle cx="473.5" cy="40.9" r="2" style="fill:var(--crit)"/>
<circle cx="541.8" cy="-35.0" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="-142.2" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">primary DB writes</text>
<polyline points="64.0,206.8 132.2,199.7 200.5,189.7 268.8,175.5 337.0,155.3 405.2,126.8 473.5,86.7 541.8,29.8 610.0,-50.7" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="206.8" r="2" style="fill:var(--warn)"/>
<circle cx="132.2" cy="199.7" r="2" style="fill:var(--warn)"/>
<circle cx="200.5" cy="189.7" r="2" style="fill:var(--warn)"/>
<circle cx="268.8" cy="175.5" r="2" style="fill:var(--warn)"/>
<circle cx="337.0" cy="155.3" r="2" style="fill:var(--warn)"/>
<circle cx="405.2" cy="126.8" r="2" style="fill:var(--warn)"/>
<circle cx="473.5" cy="86.7" r="2" style="fill:var(--warn)"/>
<circle cx="541.8" cy="29.8" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="-50.7" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">cache memory</text>
<polyline points="64.0,212.6 132.2,207.9 200.5,201.1 268.8,191.6 337.0,178.2 405.2,159.2 473.5,132.4 541.8,94.6 610.0,40.9" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="212.6" r="2" style="fill:var(--good)"/>
<circle cx="132.2" cy="207.9" r="2" style="fill:var(--good)"/>
<circle cx="200.5" cy="201.1" r="2" style="fill:var(--good)"/>
<circle cx="268.8" cy="191.6" r="2" style="fill:var(--good)"/>
<circle cx="337.0" cy="178.2" r="2" style="fill:var(--good)"/>
<circle cx="405.2" cy="159.2" r="2" style="fill:var(--good)"/>
<circle cx="473.5" cy="132.4" r="2" style="fill:var(--good)"/>
<circle cx="541.8" cy="94.6" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="40.9" r="2" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">fan-out workers</text>
</svg>` },
    { t: "h2",
      n: "03",
      id: "flags",
      text: "Red flags and green flags",
      sub: "What interviewers actually write down" },
    { t: "table",
      head: ["Red flag", "Green flag that offsets it"],
      rows: [
        ["Draws boxes before asking any question", "Opens with requirements and ends that step with numbers"],
        [
          "Names technologies without reasons ('use Kafka')",
          "Names the property needed, then a technology that has it"
        ],
        ["One design, defended against every challenge", "Two options compared, with the requirement that decided"],
        [
          "Ignores failure: no timeouts, retries or overload plan",
          "Walks through what happens when each dependency fails"
        ],
        ["Single numbers with false precision", "Rounded estimates with the dominant assumption named"],
        ["Spends the deep dive on the easy part", "Names the hard parts and asks which to take first"],
        ["Silence when stuck", "Thinks aloud, states assumptions, and asks for a hint early"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Changing your mind is a green flag",
      body: [
        { t: "p",
          text: "When the interviewer adds a constraint that breaks your design, the strong move is to say which assumption it breaks and redesign that part, not to defend the original. Interviewers often add the constraint deliberately to see exactly this. 'That changes the consistency requirement, so the cache no longer works for balances; I'd read balances from the primary and keep the cache for the catalogue.'" }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Decision records under three requirements",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Use the five read-scaling options from section 1. Write a short decision record for three products with different constraints: account balances (fresh, p99 20 ms, $50,000 a month), a product catalogue (a minute stale, p99 10 ms, $20,000), and a feature that must be both fresh and under 5 ms. Each record states the constraints, the decision, what was rejected and why, and the consequences." }
      ],
      requirements: [
        "Filter the options by each scenario's staleness, latency and budget",
        "Pick the cheapest remaining option, breaking ties on fewer new failure modes",
        "List the rejected options",
        "Handle the case where no option meets every constraint"
      ],
      hint: "A scenario with no feasible option is a result, not a failure: the decision record then says which constraint to relax and what each relaxation costs.",
      solution: { lang: "python",
        title: "decision_records.py",
        code: `options = {
    "bigger primary (scale up)":   dict(cost=42_000, p99=12, stale=0,  failure_modes=0, weeks=1),
    "7 read replicas":             dict(cost=30_000, p99=14, stale=1,  failure_modes=1, weeks=2),
    "cache-aside, 95% hits":       dict(cost=9_000,  p99=3,  stale=60, failure_modes=2, weeks=3),
    "cache + 2 read replicas":     dict(cost=17_000, p99=3,  stale=60, failure_modes=3, weeks=4),
    "shard the database 8 ways":   dict(cost=64_000, p99=11, stale=0,  failure_modes=2, weeks=12),
}
scenarios = {
    "account balances": dict(stale=0,  p99=20, budget=50_000),
    "product catalogue": dict(stale=60, p99=10, budget=20_000),
    "fresh and fast":    dict(stale=0,  p99=5,  budget=100_000),
}
for name, req in scenarios.items():
    ok = {o: v for o, v in options.items() if v["stale"] <= req["stale"] and v["p99"] <= req["p99"] and v["cost"] <= req["budget"]}
    print(f"ADR · {name}")
    print(f"  constraints: staleness <= {req['stale']} s, p99 <= {req['p99']} ms, budget <= \${req['budget']:,}/month")
    if not ok:
        closest = min(options, key=lambda o: options[o]["p99"] + 1000 * (options[o]["stale"] > req["stale"]))
        print(f"  decision: no option meets all constraints; relax one. Nearest: {closest}")
        print("  consequence: take the conflict back to the product owner with the numbers, not a guess\\n")
        continue
    pick = min(ok, key=lambda o: (ok[o]["cost"], ok[o]["failure_modes"]))
    rejected = [o for o in options if o not in ok]
    print(f"  decision: {pick} (\${ok[pick]['cost']:,}/month, p99 {ok[pick]['p99']} ms)")
    print(f"  rejected for a constraint: {', '.join(rejected)}")
    print(f"  consequence: {ok[pick]['failure_modes']} new failure mode(s) to monitor; revisit if load grows 5x\\n")`,
        out: `ADR · account balances
  constraints: staleness <= 0 s, p99 <= 20 ms, budget <= $50,000/month
  decision: bigger primary (scale up) ($42,000/month, p99 12 ms)
  rejected for a constraint: 7 read replicas, cache-aside, 95% hits, cache + 2 read replicas, shard the database 8 ways
  consequence: 0 new failure mode(s) to monitor; revisit if load grows 5x

ADR · product catalogue
  constraints: staleness <= 60 s, p99 <= 10 ms, budget <= $20,000/month
  decision: cache-aside, 95% hits ($9,000/month, p99 3 ms)
  rejected for a constraint: bigger primary (scale up), 7 read replicas, shard the database 8 ways
  consequence: 2 new failure mode(s) to monitor; revisit if load grows 5x

ADR · fresh and fast
  constraints: staleness <= 0 s, p99 <= 5 ms, budget <= $100,000/month
  decision: no option meets all constraints; relax one. Nearest: shard the database 8 ways
  consequence: take the conflict back to the product owner with the numbers, not a guess`,
        notes: [
          { t: "p",
            text: "The same five options give three different decisions. Balances must be fresh, which rules out every cache and replica, and the larger primary is cheapest at $42,000. The catalogue tolerates a minute of staleness and a tight budget, so the cache wins at $9,000. The point of writing these as records is that the next engineer sees the constraint that decided it, and can tell when the decision should change." },
          { t: "p",
            text: "'Fresh and under 5 ms' has no feasible option: every fresh option is above 10 ms, and every fast one is stale. The right output is not a forced pick but a return to the product owner: either accept a few seconds of staleness (cache with invalidation on write), or accept 11–12 ms. Surfacing an infeasible requirement with numbers is one of the most valuable things a design review does." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the migration that started too late",
      body: [
        { t: "p",
          text: "**Symptom.** A marketplace's checkout began failing at peak every Friday evening. Within a month the failures spread to weekday peaks, and the team began a database sharding project that would take five months." },
        { t: "p",
          text: "**Mechanism.** The primary's write throughput had been growing at about 6% a month for two years. Dashboards showed CPU at 55% a year earlier, which looked comfortable, but nobody projected it or compared it with the time a sharding migration would take. Write contention was nonlinear near saturation, so latency degraded months before the CPU graph looked alarming." },
        { t: "p",
          text: "**Fix.** Load was cut with write batching and moving analytics writes to a queue, buying four months. Every stateful component now has a recorded ceiling and a lead time, a quarterly projection like breakpoints.py runs against real metrics, and a migration starts when projected breach minus lead time falls below two quarters." }
      ] }
  ],

  takeaways: [
    "Put every option on the **same axes** and remove the **dominated** ones before arguing.",
    "Let a **stated requirement** pick among the rest, and name the axis you are giving up.",
    "Measured on the example: with a minute of staleness allowed, a cache served the load at **a fifth** of the cost; fresh reads made **scaling up** cheapest.",
    "The most scalable option is not the best one: sharding cost more and took **12 weeks** against **1** for this load.",
    "Project each component's **ceiling** and **lead time**; start the slowest change first.",
    "In the projection the primary's writes broke in **28 months**, so a 26-week sharding project had to start around **week 95**.",
    "Red flags: boxes before questions, technologies without reasons, one design defended, no failure handling.",
    "Changing your mind when a new constraint breaks an assumption is a **green flag**.",
    "Write decisions as **records**: context, options, decision, consequences, and when to revisit."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Option A is cheaper, faster and fresher than option B, and no worse on anything else. What should you do with B?",
        options: [
          "Keep it as a fallback for later",
          "Drop it: B is dominated by A",
          "Combine it with A for resilience",
          "Ask the interviewer to choose one"
        ],
        answer: 1,
        why: "An option that another beats on every axis cannot be the right choice under any requirement, so it leaves the comparison. Keeping or combining it adds cost for nothing, and choosing among options is your job." },
      { stem: "Reads must never be stale and one larger database meets the load for two years. What is the strongest answer?",
        options: [
          "Shard now, because sharding scales much further",
          "Scale up; say when that stops working",
          "Add a cache in front to cut the database cost",
          "Move to multi-region for higher availability"
        ],
        answer: 1,
        why: "Scaling up meets the requirement with the least complexity, and naming its limit and the migration path shows you thought about growth. A cache breaks the freshness requirement, and sharding and multi-region add cost and failure modes the requirement does not need yet." },
      { stem: "Component A breaks in 28 months and takes 6 months to change. Component B breaks in 24 months and takes 1 month. Which work starts first?",
        options: [
          "B, because it breaks sooner",
          "A, because its lead time is longer",
          "Both together, so they finish at once",
          "Neither until one of them breaks"
        ],
        answer: 1,
        why: "Start dates are breach time minus lead time: A must start by month 22, B by month 23. Breaking order alone would start A too late, and waiting for a breach guarantees an outage." },
      { stem: "The interviewer adds a requirement that breaks your caching layer. What is the best response?",
        options: [
          "Defend the cache, since it is still a sound choice",
          "Name the broken assumption; redesign it",
          "Start the whole design again from a blank page",
          "Note the issue down and continue as planned"
        ],
        answer: 1,
        why: "Saying which assumption no longer holds and changing only the affected part shows judgement and adaptability. Defending the old design or ignoring the new constraint are red flags, and starting over wastes the time." }
    ] },

  interview: { title: "In an interview",
    sub: "These questions often come at the end, or in place of a design, at staff level.",
    questions: [
      { level: "core",
        q: "Why did you choose this database and not another?",
        strong: "A strong answer names the access pattern and requirement that decided, the alternative considered, and what would change the choice.",
        answer: [
          { t: "p",
            text: "I start from the access pattern and the requirement, not the product: 'reads are key lookups at 50,000 a second, writes are rare, and reads may be a minute stale, so a key-value store with a cache in front fits; I considered a relational store with replicas and rejected it on cost at this read rate.' Then I say what would change the decision, such as needing ad hoc queries or transactions across entities, which would move me back to relational." }
        ] },
      { level: "advanced",
        q: "How would this design evolve over the next three years?",
        strong: "A strong answer projects load, names what breaks first, and orders the work by lead time.",
        answer: [
          { t: "p",
            text: "I would project the peak load on each stateful component against the ceiling it can reach without redesign. If load doubles yearly, the write path of the primary database is usually first, and because sharding is a multi-month project, it starts well before the cache or the workers, which can grow in weeks. I would describe the design at each stage: one primary with a cache now, partitioned writes in year two, and a second region when latency or data residency requires it." },
          { t: "p",
            text: "I would also say what I would watch to know the projection is wrong: the growth rate, and per-component utilisation near the knee, where latency rises before CPU looks alarming." }
        ] },
      { level: "advanced",
        q: "What distinguishes a staff-level design answer from a senior one?",
        strong: "A strong answer covers scope across teams and time, operability, and decisions others can revisit.",
        answer: [
          { t: "p",
            text: "A senior answer designs a correct system for the stated requirements. A staff answer also designs how it changes over time and who owns which part. It treats operability as a requirement: how it is deployed, observed, and recovered, and what the on-call engineer sees. It questions requirements that are expensive and asks what they are for, and it records decisions with their constraints so the next team can tell when to revisit them. It also names what it deliberately left out." }
        ] }
    ] }
});
