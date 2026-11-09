/* ============================================================================
   LESSON 10.5 — Where the Bill Comes From
   ========================================================================= */
EC.receiveLesson({
  id: "10.5",

  lede: "Training is the line item people expect to dominate an ML bill, and it often does not. Endpoints run 24 hours a day whether or not anyone calls them, and teams keep a development and a staging copy of each. Notebook instances with GPUs are left running over weekends. Checkpoints accumulate in the most expensive storage class. Data is read across regions every night. This lesson analyses a month of a billing export, finds the waste, prices the three changes that remove most of it, and builds the showback that gives every dollar an owner.",

  objectives: [
    "Read a billing export by service, resource and tag",
    "Find the usual waste: idle endpoints, always-on notebooks, storage in the wrong class, cross-region transfer",
    "Estimate the saving from scaling to zero, auto-stop and storage lifecycle rules",
    "Allocate untagged and shared costs, and reconcile the showback with the bill",
    "Prevent the waste with tagging policy, budgets and defaults rather than reminders"
  ],

  prerequisites: ["10.3", "10.4"],

  blocks: [
    { t: "h2", n: "01", id: "export", text: "Reading the bill", sub: "A month of one ML team's billing export" },
    { t: "p",
      text: "Every provider can export billing data at resource level with tags: AWS Cost and Usage Reports, Google Cloud's BigQuery billing export, Azure Cost Management exports. The script builds a month for a team with two groups, using illustrative prices, and asks three questions of it: where the money goes, who owns it, and what is buying nothing." },
    { t: "code",
      lang: "python",
      title: "bill.py — a month of billing, by service, team and waste",
      code: `import numpy as np, pandas as pd
rng = np.random.default_rng(12)

# A synthetic month of an ML team's cloud billing export, one row per resource per day.
# Prices are illustrative; the shape of the bill, not the exact rates, is the point.
rows = []
def add(resource, service, team, hours_per_day, rate, days=30, units="hours", **extra):
    for d in range(days):
        q = hours_per_day(d) if callable(hours_per_day) else hours_per_day
        if q: rows.append(dict(day=d + 1, resource=resource, service=service, team=team, usage=q, units=units, cost=q * rate, **extra))

weekday = lambda d: d % 7 < 5
add("train-gpu-ondemand", "training", "ranking", lambda d: 10 if weekday(d) else 0, 32.0)              # 8-GPU instance
add("train-gpu-spot", "training", "search", lambda d: 14 if weekday(d) else 0, 10.0)
for env, team in (("prod", "ranking"), ("staging", "ranking"), ("dev", "ranking"), ("prod", "search"), ("dev", "search")):
    add(f"endpoint-{team}-{env}", "endpoint", team, 24, 4.0, util=0.55 if env == "prod" else 0.01)          # GPU inference instance
for i, team in enumerate(["ranking", "search", None, None, "search"]):
    add(f"notebook-gpu-{i}", "notebook", team, 24 if i in (2, 3) else (lambda d: 9 if weekday(d) else 0), 1.2)   # two never stopped
add("s3-checkpoints", "storage", "ranking", 180_000, 0.023 / 30, units="GB-days")                     # 180 TB of checkpoints, standard class
add("s3-datasets", "storage", "search", 40_000, 0.023 / 30, units="GB-days")
add("egress-cross-region", "network", None, 2_000, 0.02, units="GB")                                   # 2 TB/day of training data read from another region
add("logs", "logging", None, 70, 0.50, units="GB")
bill = pd.DataFrame(rows); bill["team"] = bill["team"].fillna("untagged")

total = bill.cost.sum()
print(f"month total \${total:,.0f}\\n\\nby service:")
print(bill.groupby("service").cost.sum().sort_values(ascending=False).map(lambda c: f"\${c:>9,.0f}  {c / total:5.1%}").to_string())
print("\\nby team tag:")
print(bill.groupby("team").cost.sum().sort_values(ascending=False).map(lambda c: f"\${c:>9,.0f}  {c / total:5.1%}").to_string())

print("\\nwaste candidates:")
ep = bill[bill.service == "endpoint"].groupby("resource").agg(cost=("cost", "sum"), util=("util", "mean"))
idle_ep = ep[ep.util < 0.05]
print(f"  endpoints under 5% utilisation: {len(idle_ep)}, \${idle_ep.cost.sum():,.0f}/month ({', '.join(idle_ep.index)})")
nb = bill[bill.service == "notebook"].groupby("resource").agg(cost=("cost", "sum"), hours=("usage", "sum"))
always_on = nb[nb.hours >= 24 * 30]
print(f"  notebooks never stopped: {len(always_on)}, \${always_on.cost.sum():,.0f}/month")
ck = bill[bill.resource == "s3-checkpoints"].cost.sum()
print(f"  180 TB of checkpoints in standard storage: \${ck:,.0f}/month")

archived = 180_000 * 0.1 * 0.023 + 180_000 * 0.9 * 0.004          # keep 10% (latest per run) standard, 90% to an archive class
saving = idle_ep.cost.sum() + always_on.cost.sum() * (1 - 45 / 168) + (ck - archived)
print(f"\\nthree changes: idle endpoints to zero, notebook auto-stop (office hours only), latest 10% of checkpoints kept, 90% archived")
print(f"  estimated saving \${saving:,.0f}/month, {saving / total:.0%} of the bill")`,
      out: `month total $34,271

by service:
service
endpoint    $   14,400  42.0%
training    $   10,120  29.5%
storage     $    5,060  14.8%
notebook    $    2,441   7.1%
network     $    1,200   3.5%
logging     $    1,050   3.1%

by team tag:
team
ranking     $   20,058  58.5%
search      $   10,235  29.9%
untagged    $    3,978  11.6%

waste candidates:
  endpoints under 5% utilisation: 3, $8,640/month (endpoint-ranking-dev, endpoint-ranking-staging, endpoint-search-dev)
  notebooks never stopped: 2, $1,728/month
  180 TB of checkpoints in standard storage: $4,140/month

three changes: idle endpoints to zero, notebook auto-stop (office hours only), latest 10% of checkpoints kept, 90% archived
  estimated saving $12,983/month, 38% of the bill` },
    { t: "viz",
      title: "A $34,271 month, by service",
      caption: "Endpoints cost more than training. Three of the five were development and staging copies running at about 1% utilisation.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="160" y="31.0" text-anchor="end" class="s-label">endpoints</text>
<rect x="170" y="14" width="415.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">$14,400 (3 of 5 idle)</text>
<text x="160" y="69.0" text-anchor="end" class="s-label">training</text>
<rect x="170" y="52" width="291.7" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="469.7" y="69.0" class="s-sub">$10,120</text>
<text x="160" y="107.0" text-anchor="end" class="s-label">storage</text>
<rect x="170" y="90" width="145.8" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="323.8" y="107.0" class="s-sub">$5,060</text>
<text x="160" y="145.0" text-anchor="end" class="s-label">notebooks</text>
<rect x="170" y="128" width="70.3" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="248.3" y="145.0" class="s-sub">$2,441</text>
<text x="160" y="183.0" text-anchor="end" class="s-label">cross-region data</text>
<rect x="170" y="166" width="34.6" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="212.6" y="183.0" class="s-sub">$1,200</text>
<text x="160" y="221.0" text-anchor="end" class="s-label">logging</text>
<rect x="170" y="204" width="30.3" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="208.3" y="221.0" class="s-sub">$1,050</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Idle endpoints led",
          def: "Five GPU endpoints ran all month; the three non-production ones served almost nothing and cost $8,640, a quarter of the bill. An endpoint bills for being up, not for being used." },
        { term: "Two notebooks never stopped",
          def: "$1,728 a month for two GPU notebook instances left running nights and weekends, both without a team tag." },
        { term: "Checkpoints in the hot tier",
          def: "180 TB of old checkpoints in standard storage cost $4,140 a month. Most will never be read again; keeping the latest per run and archiving the rest cuts that by about three quarters." },
        { term: "Training was efficient",
          def: "The spot training group ran 14 hours a day for $10 an hour against $32 for the on-demand group: the part of the bill people optimise first was already the best-managed." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Optimising the line item you expected",
      body: [
        { t: "p",
          text: "Teams instinctively attack training costs: smaller models, fewer experiments. Here the three waste items together were $14,500, more than all training, and none of them changed any result. Sort the bill by resource before deciding what to optimise." }
      ] },
    { t: "h2",
      n: "02",
      id: "changes",
      text: "The three changes",
      sub: "Defaults that remove waste without anyone remembering" },
    { t: "table",
      head: ["Change", "Mechanism", "Saving here"],
      rows: [
        [
          "Non-production endpoints scale to zero",
          "Serverless or async endpoints, or delete outside working hours",
          "$8,640"
        ],
        ["Notebooks auto-stop when idle", "Idle-shutdown setting or a lifecycle script; office hours only", "$1,265"],
        ["Checkpoint lifecycle policy", "Keep the latest per run; transition the rest to an archive class", "$3,078"]
      ] },
    { t: "p",
      text: "Together these came to $12,983 a month, 38% of the bill, without touching a model. Each is a default set once (a lifecycle rule, an idle-shutdown setting, an endpoint type) rather than a request to engineers to remember. Cross-region transfer is the fourth candidate: copy the training data once to the region where training runs, instead of reading it across regions every night." },
    { t: "h2",
      n: "03",
      id: "ownership",
      text: "Giving the number an owner",
      sub: "Tags, allocation and showback" },
    { t: "p",
      text: "A cost nobody owns is a cost nobody reduces. Tag every resource with its team and environment at creation, enforced by policy (an organisation policy that denies launching untagged resources). Costs that genuinely serve everyone, such as shared logging or network transfer, are allocated by a stated rule, usually in proportion to each team's direct spend, and the result is shown to each team monthly: showback. Charging it to their budget is chargeback." },
    { t: "dl",
      items: [
        { term: "Budgets and alerts",
          def: "A budget per team and environment with alerts at 50%, 80% and 100% of the month catches a forgotten 8-GPU instance in days, not at the invoice." },
        { term: "Unit costs",
          def: "Cost per thousand predictions and per training run make the bill comparable across months and models, and show when growth is healthy." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Showback that reconciles",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Using the same month, assign owners to untagged resources from an inventory of who launched them, allocate the remaining shared costs (cross-region transfer and logging) in proportion to each team's direct spend, and produce a showback table per team with the idle-endpoint cost highlighted. Check that the showback adds up to the bill exactly." }
      ],
      requirements: [
        "Owners for untagged resources from an inventory",
        "Shared costs split by a stated proportional rule",
        "A per-team table: direct, shared, total and idle-endpoint spend",
        "A reconciliation check against the bill total"
      ],
      hint: "Allocate after assigning inventory owners, so the shared pool contains only costs that really have no single owner.",
      solution: { lang: "python",
        title: "showback.py",
        code: `import contextlib, io, runpy
import pandas as pd

with contextlib.redirect_stdout(io.StringIO()):
    bill = runpy.run_path("bill.py")["bill"]                      # the same month as the lesson's analysis

# 1. Resources that should have carried a tag: find an owner from the inventory (who launched it).
inventory = {"notebook-gpu-2": "ranking", "notebook-gpu-3": "search"}
untagged = bill[bill.team == "untagged"].groupby("resource").cost.sum()
print("untagged resources:")
for r, c in untagged.items(): print(f"  {r:<22} \${c:>7,.0f}  owner from inventory: {inventory.get(r, '— shared')}")
bill.loc[bill.resource.isin(inventory), "team"] = bill.resource.map(inventory)

# 2. Genuinely shared costs (cross-region egress, logging) are split in proportion to each team's direct spend.
shared = bill[bill.team == "untagged"].cost.sum()
direct = bill[bill.team != "untagged"].groupby("team").cost.sum()
show = pd.DataFrame({"direct": direct, "shared": shared * direct / direct.sum()})
show["total"] = show.direct + show.shared
show["idle endpoints"] = bill[(bill.service == "endpoint") & (bill.util < 0.05)].groupby("team").cost.sum()
show = show.fillna(0)
print("\\nshowback by team:")
print(show.map(lambda c: f"\${c:,.0f}").to_string())
print(f"\\nreconciles with the bill: {abs(show.total.sum() - bill.cost.sum()) < 0.01}  (\${bill.cost.sum():,.0f})")

# 3. The policy that stops untagged spend recurring.
print(f"shared costs allocated by rule: {sorted(bill[bill.team == 'untagged'].resource.unique())}")
print(f"owners found only through the inventory: {sorted(inventory)} -> require tags at launch, deny untagged resources")`,
        out: `untagged resources:
  egress-cross-region    $  1,200  owner from inventory: — shared
  logs                   $  1,050  owner from inventory: — shared
  notebook-gpu-2         $    864  owner from inventory: ranking
  notebook-gpu-3         $    864  owner from inventory: search

showback by team:
          direct  shared    total idle endpoints
team                                            
ranking  $20,922  $1,470  $22,392         $5,760
search   $11,099    $780  $11,879         $2,880

reconciles with the bill: True  ($34,271)
shared costs allocated by rule: ['egress-cross-region', 'logs']
owners found only through the inventory: ['notebook-gpu-2', 'notebook-gpu-3'] -> require tags at launch, deny untagged resources`,
        notes: [
          { t: "p",
            text: "The two always-on notebooks belonged to one person in each team; once assigned, only $2,250 of genuinely shared cost remained, split 65/35 by direct spend. The showback summed to the bill to the cent. A showback that does not reconcile is argued about instead of acted on." },
          { t: "p",
            text: "The idle-endpoint column is the part that changes behaviour: ranking's $5,760 of idle endpoints is a quarter of its total, and seeing it next to the team name is what gets it switched off. The inventory lookup is a symptom; the fix is a policy that refuses to launch untagged resources." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the $41,000 weekend",
      body: [
        { t: "p",
          text: "**Symptom.** The monthly bill arrived at nearly double the forecast. The largest new line was GPU compute in a region the team did not normally use." },
        { t: "p",
          text: "**Mechanism.** An engineer had launched a hyperparameter search on 8-GPU instances on a Friday, in a region with spare capacity, with a misconfigured early-stopping rule. Trials ran to their full length all weekend. No budget alert existed for that region, and the instances carried no tags, so nobody's dashboard showed them." },
        { t: "p",
          text: "**Fix.** Budgets with alerts per team and per region, a policy denying untagged GPU launches, a maximum runtime on every tuning job, and a default quota of zero GPUs in regions the team does not use." }
      ] }
  ],

  takeaways: [
    "Endpoints, not training, were the largest line: **$14,400** of a **$34,271** month.",
    "Three of five endpoints were non-production copies at **~1%** utilisation, costing **$8,640**.",
    "Always-on GPU notebooks cost **$1,728**; checkpoints in standard storage **$4,140**.",
    "Scale non-production endpoints to zero, auto-stop notebooks, and archive old checkpoints: **38%** saved without touching a model.",
    "Set waste-removing **defaults** (lifecycle rules, idle shutdown) rather than relying on reminders.",
    "Tag at creation, enforced by policy; allocate shared costs by a stated rule.",
    "A showback must **reconcile** with the bill to be acted on.",
    "Budgets per team and region catch runaway jobs in days, not at the invoice."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "In the month analysed, what was the largest single source of waste?",
        options: [
          "Training on on-demand instances rather than on cheaper spot ones",
          "Non-production endpoints running at about 1% utilisation",
          "Cross-region transfer of the nightly training data",
          "Logging volume from the training and serving jobs"
        ],
        answer: 1,
        why: "Three idle dev and staging endpoints cost $8,640, against $1,200 for transfer and $1,050 for logging. Training was a large line but not waste: the spot group was already cheap per hour." },
      { stem: "Why do idle endpoints cost so much?",
        options: [
          "They bill for every request, however small",
          "They bill for being up, not for being used",
          "They copy the model to every region daily",
          "They log every request at full payload size"
        ],
        answer: 1,
        why: "A real-time endpoint is instances running 24 hours a day; at 1% utilisation you pay for 99% idle time. Serverless and async endpoints bill closer to use, at the price of cold starts." },
      { stem: "How should shared logging costs be assigned in a showback?",
        options: [
          "Left as an untagged line that nobody owns",
          "By a stated rule, such as share of direct spend",
          "Entirely to the platform team that runs the logging service",
          "To whichever team caused this month's largest bill"
        ],
        answer: 1,
        why: "A stated, repeatable rule keeps the showback fair and reconcilable. Leaving it unowned means nobody reduces it; charging it all to one team or to the biggest spender is arbitrary." },
      { stem: "Which control would have stopped the $41,000 weekend soonest?",
        options: [
          "A monthly review meeting of the cloud invoice",
          "A budget alert per team and region, plus deny-untagged",
          "A rule that all training jobs must use spot instances only",
          "A smaller default instance type for notebooks"
        ],
        answer: 1,
        why: "Budget alerts fire within a day of spend rising, and denying untagged launches makes the cost visible to its owner. A monthly review is weeks late; spot and notebook defaults would not have stopped this job." }
    ] },

  interview: { title: "In an interview",
    sub: "Cost questions reward reading the bill before proposing changes.",
    questions: [
      { level: "core",
        q: "Your ML platform's cloud bill doubled in a quarter. What do you do first?",
        strong: "A strong answer starts from resource-level data and ownership, then fixes defaults.",
        answer: [
          { t: "p",
            text: "Pull the resource-level export and sort by resource and by tag, not by service. Separate growth that tracks usage (more predictions, more training runs) from waste: idle endpoints, always-on notebooks, storage in the wrong class, cross-region transfer, untagged resources. Compute unit costs (per thousand predictions, per run) to see whether efficiency changed." },
          { t: "p",
            text: "Then fix the defaults that create waste: scale-to-zero for non-production, idle shutdown, lifecycle rules, tag enforcement and budgets per team, and put a monthly showback in front of each team." }
        ] },
      { level: "core",
        q: "How do you decide between a real-time and a serverless endpoint on cost?",
        strong: "A strong answer compares utilisation against the serverless premium and the latency cost of cold starts.",
        answer: [
          { t: "p",
            text: "A real-time endpoint costs the same at 1% and 90% utilisation; serverless costs per unit of compute used, at a premium. Below some utilisation (often a few tens of percent, depending on prices) serverless is cheaper; above it, dedicated instances are. The other side is latency: serverless cold starts of seconds are fine for internal tools and batchy traffic and wrong for a user-facing path with a p99 target (lesson 10.4)." }
        ] },
      { level: "advanced",
        q: "How would you make an ML team cost-aware without slowing it down?",
        strong: "A strong answer prefers visibility and guardrails over approvals.",
        answer: [
          { t: "p",
            text: "Visibility: per-team showback, cost per experiment shown in the tracking UI, and budget alerts. Guardrails rather than approvals: quotas on GPU types, maximum runtimes on jobs, deny untagged launches, scale-to-zero and idle shutdown as defaults. Make the cheap path the easy one, with spot training and checkpointing in the standard templates. Review the top ten resources monthly with the owners, briefly." }
        ] }
    ] }
});
