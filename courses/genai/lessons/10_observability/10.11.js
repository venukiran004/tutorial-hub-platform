EC.receiveLesson({
  id: "10.11",

  lede: "Offline evaluation runs a fixed dataset before deploy. **Online evaluation scores real traffic after deploy** \u2014 and it catches everything the dataset did not anticipate. Three rules make it affordable and honest, and one measured number explains why all three exist: **a judge call costs 107% of the generation it scores**, because the judge prompt carries the context *and* the answer. Judging everything costs more than inference. Stratified at under 5%, it costs 5.2% \u2014 and catches 100% of thumbs-down answers rather than 5%.",

  objectives: [
    "Separate deterministic checks from judged metrics by cost and coverage",
    "Price a judge call against the generation it scores",
    "Design a stratified sample that scales with problems rather than traffic",
    "Explain why a judge must never sit in the request path",
    "State what precision an online judged metric achieves that an offline suite cannot"
  ],

  prerequisites: ["10.10", "9.11"],

  blocks: [

    { t: "h2", n: "01", id: "tiers", text: "The three tiers",
      sub: "Free, sampled, human" },

    { t: "code", lang: "text", title: "What runs on what", code: `  every request  -> trace stored
        |
        +-- cheap, deterministic checks on 100%      free, instant
        |     empty retrieval, top_score, schema valid, refusal regex,
        |     citation present, answer length, latency, cost
        |
        +-- LLM judge on a 1-5% sample               costs money, runs async
        |     faithfulness, answer relevancy, context precision
        |
        +-- human review on the worst 20/day         the ground truth
              anything the judge scored low, all thumbs-down, all escalations`,
      hl: [3, 7, 10],
      caption: "Three tiers, three cost structures. The top one is free and catches most real incidents." },

    { t: "dl", items: [
      { k: "Never block the response on a judge", v: "Score asynchronously from the stored trace. A judge in the request path adds a second of latency and a second failure mode \u2014 and raises the question of what the user gets when the judge times out." },
      { k: "Deterministic checks are free, so run them on everything", v: "Empty retrieval, missing citation, malformed JSON and refusal patterns need no model. In practice these catch most real incidents; the judge explains the rest." },
      { k: "Sample for the judge, and stratify", v: "Random 2% plus 100% of thumbs-down plus 100% of low-similarity retrievals. Judge cost then scales with your traffic\u2019s *problems*, not your traffic." }
    ] },

    { t: "h2", n: "02", id: "cost", text: "Why a judge is dearer than the call it scores",
      sub: "Measured" },

    { t: "code", lang: "text", title: "Priced at $3.00 / $15.00 per million", code: `one generation :  1842 in / 214 out = $0.00874
one judge call :  2356 in / 150 out = $0.00932
  -> the judge is 107% of the call it scores, because it reads the context too

judge sample rate       judge $/day    gen $/day   overhead
100%                         931.80       873.60     106.7%
10%                           93.18       873.60      10.7%
5%                            46.59       873.60       5.3%
2%                            18.64       873.60       2.1%`,
      hl: [3, 5],
      caption: "The judge must read the retrieved context, the answer and a rubric \u2014 so its input is larger than the generation's." },

    { t: "callout", kind: "insight", title: "This is the number that makes the 1\u20135% rule a calculation rather than a convention",
      body: [
        { t: "p", text: "A faithfulness judge has to see the context to decide whether a claim is supported, and the answer to find the claims. So its input is the generation\u2019s input *plus* the generation\u2019s output plus a rubric \u2014 2,356 tokens against 1,842 \u2014 and its output is short but at the expensive per-token rate." },
        { t: "p", text: "That puts a judge call at 107% of the generation it scores. Judging every request therefore more than doubles your model spend, which is why \u2018score everything\u2019 is not a conservative choice but an expensive one. At 2% the overhead is 2.1%." },
        { t: "p", text: "And it is a reason to prefer the cheap tier wherever it can answer the question. A citation-present check and a refusal regex cost nothing and catch failures that a judge would also catch \u2014 so spending a judge call on a response that failed schema validation is pure waste, which is the gate 9.17 measured at 34% of calls avoidable." }
      ] },

    { t: "h2", n: "03", id: "stratify", text: "Stratify, and the cost scales with problems",
      sub: "Not with traffic" },

    { t: "table",
      head: ["Stratum", "Share", "Why this one"],
      rows: [
        ["random baseline", "2.00%", "an unbiased view of normal traffic \u2014 without it you only ever see failures"],
        ["all thumbs-down", "0.40%", "the user already told you; this is free signal"],
        ["all empty retrievals", "0.90%", "tier 1 flagged it for nothing"],
        ["all low `top_score`", "1.50%", "tier 1 flagged it for nothing"],
        ["all escalations", "0.08%", "the expensive failures, and the rarest"],
        ["**total**", "**4.88%**", "**5.2% overhead against the inference bill**"]
      ] },

    { t: "callout", kind: "good", title: "A flat 4.9% sample catches 4.9% of thumbs-down answers; this one catches 100%",
      body: [
        { t: "p", text: "That is the entire argument, and it is the same argument as tail sampling in 10.10 \u2014 same budget, spent on the traces that carry information rather than spread evenly over traffic that mostly worked." },
        { t: "p", text: "The random baseline stratum is the one people drop and should not. Without it every judged score you have comes from a population selected for being bad, so your faithfulness average is meaningless as a level \u2014 it only works as a trend within the same selection. The 2% random slice is what lets you say \u2018faithfulness on normal traffic is 0.91\u2019." },
        { t: "p", text: "And the reason this scales well is that the flagged strata are defined by the free checks. As traffic grows, the random baseline grows with it, and the flagged strata grow only if your problem rate does \u2014 which is the right incentive." }
      ] },

    { t: "callout", kind: "insight", title: "Online judged metrics have the precision that offline suites lack",
      body: [
        { t: "p", text: "A 2% daily sample at 100,000 requests is 2,000 judged answers. At a faithfulness of 0.91 that is a standard error of 0.0064, so **2 sigma is 1.28 points** \u2014 against the \u00b15.3-point margin that 9.16 computed for a 200-example offline suite." },
        { t: "p", text: "Which inverts the usual complaint. The offline suite is the one that cannot resolve small changes; online evaluation resolves them to a fraction of a point, because production has the volume. What the offline suite has instead is control \u2014 a fixed dataset, known labels, and a comparison that is not confounded by traffic mix." },
        { t: "p", text: "It also means online evals can afford slicing that an offline suite cannot. Sliced into twelve tenants, 2,000 judged answers still give 4.43 points of resolution; the offline suite at 200 examples cannot be sliced at all. So per-cohort quality monitoring \u2014 which is what 10.13 shows you need \u2014 is an online capability." }
      ] },

    { t: "callout", kind: "warn", title: "And wire feedback back onto the trace ID",
      body: [
        { t: "p", text: "A thumbs-down that cannot be resolved to the exact retrieved chunks and the assembled prompt is an anecdote. One that can is a test case \u2014 it goes straight into the regression set that 12.1 runs on every change." },
        { t: "p", text: "This is a small piece of plumbing with a large payoff, and it is usually missed because the feedback event happens in the product and the trace lives in the observability stack. Passing the trace ID to the client and back is the whole fix." }
      ] },

    { t: "viz", title: "Three tiers, and where the money goes", caption: "Measured at 100,000 requests/day on $3.00/$15.00 per million.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Three tiers of online evaluation with measured costs">
  <text x="16" y="20" class="s-label">TIER 1 &#183; DETERMINISTIC CHECKS &#183; 100% OF TRAFFIC</text>
  <rect x="16" y="30" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="48" class="s-mono" style="font-size:8px">empty retrieval &#183; top_score floor &#183; schema valid &#183; refusal regex &#183; citation present &#183; length &#183; latency &#183; cost</text>
  <text x="28" y="63" class="s-mono" style="font-size:9px;fill:var(--good)">$0.00/day &#183; instant &#183; catches most real incidents</text>

  <text x="16" y="94" class="s-label">TIER 3 &#183; THE JUDGE &#183; STRATIFIED 4.88%</text>
  <rect x="16" y="104" width="356" height="40" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="122" class="s-mono" style="font-size:9px">4,880 judged/day &#183; $45.47/day</text>
  <text x="28" y="137" class="s-mono" style="font-size:9px;fill:var(--warn)">5.2% of the inference bill</text>
  <rect x="388" y="104" width="356" height="40" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="400" y="122" class="s-mono" style="font-size:9px">judge 100% &#183; $931.80/day</text>
  <text x="400" y="137" class="s-mono" style="font-size:9px;fill:var(--crit)">107% of the inference bill</text>

  <text x="16" y="168" class="s-label">TIER 4 &#183; HUMANS &#183; THE WORST 20/DAY</text>
  <rect x="16" y="178" width="728" height="30" rx="4" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="28" y="197" class="s-mono" style="font-size:9px">the ground truth everything else is calibrated against &#8212; the tier teams drop first</text>

  <line x1="16" y1="222" x2="744" y2="222" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="244" class="s-label">AND WHY STRATIFY RATHER THAN SAMPLE FLAT</text>

  <rect x="16" y="254" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="28" y="272" class="s-mono" style="font-size:9px;fill:var(--crit)">FLAT 4.9%</text>
  <text x="28" y="288" class="s-mono" style="font-size:9px">catches 4.9% of thumbs-down</text>
  <text x="28" y="303" class="s-sub">same cost, spread evenly over traffic that worked</text>

  <rect x="388" y="254" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="400" y="272" class="s-mono" style="font-size:9px;fill:var(--good)">STRATIFIED 4.88%</text>
  <text x="400" y="288" class="s-mono" style="font-size:9px">catches 100% of thumbs-down</text>
  <text x="400" y="303" class="s-sub">2% random + every flagged trace &#8212; scales with problems</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Price an online-eval pipeline and check what it can resolve", difficulty: "advanced", minutes: 35,
      body: "Price a judge call against the generation it scores, compare flat sampling rates, then design the stratified sample and compute its overhead. Finish by computing what precision the judged metric achieves, headline and sliced \u2014 and compare it against the offline suite's margin.",
      requirements: [
        "The judge call priced against the generation, as a ratio",
        "Overhead at flat rates from 1% to 100%",
        "A stratified design with per-stratum shares and total overhead",
        "The coverage a flat sample of the same size would give, for comparison",
        "The 2-sigma resolution of the judged metric, headline and sliced several ways"
      ],
      hint: "The judge's input is the generation's input plus the generation's output plus the rubric \u2014 that is why it ends up larger than the call it scores, and why 'score everything' is the expensive option.",
      solution: { lang: "python", title: "pricing and resolving an online eval", code: `import math

REQ_DAY = 100_000
PRICE_IN, PRICE_OUT = 3.0, 15.0

# a generation, and a judge call that must carry the context AND the answer
GEN_IN, GEN_OUT = 1842, 214
JUDGE_IN, JUDGE_OUT = 1842 + 214 + 300, 150

gen = GEN_IN / 1e6 * PRICE_IN + GEN_OUT / 1e6 * PRICE_OUT
judge = JUDGE_IN / 1e6 * PRICE_IN + JUDGE_OUT / 1e6 * PRICE_OUT
print("one generation : %5d in / %3d out = $%.5f" % (GEN_IN, GEN_OUT, gen))
print("one judge call : %5d in / %3d out = $%.5f" % (JUDGE_IN, JUDGE_OUT, judge))
print("  -> the judge is %.0f%% of the call it scores, because it reads the context too"
      % (100.0 * judge / gen))
print()
print("inference bill: $%.2f/day" % (REQ_DAY * gen))

print()
print("=" * 72)
print("TIER 1 -- DETERMINISTIC CHECKS ON 100%")
print("=" * 72)
CHECKS = ["empty retrieval", "top_score below floor", "schema valid",
          "refusal regex", "citation present", "answer length", "latency", "cost"]
for c in CHECKS:
    print("  %-26s $0.00000   runs on every request" % c)
print("  %-26s $0.00     per day" % "TOTAL")

print()
print("=" * 72)
print("TIER 3 -- THE JUDGE, AT FLAT SAMPLING RATES")
print("=" * 72)
print("%-14s %12s %12s %10s" % ("rate", "judge $/day", "gen $/day", "overhead"))
for rate in (1.00, 0.10, 0.05, 0.02, 0.01):
    j = REQ_DAY * rate * judge
    print("%-14s %12.2f %12.2f %9.1f%%"
          % ("%.0f%%" % (rate * 100), j, REQ_DAY * gen, 100.0 * j / (REQ_DAY * gen)))

print()
print("=" * 72)
print("AND STRATIFIED, WHICH IS THE POINT")
print("=" * 72)
STRATA = [
    ("random baseline",          0.0200, 1.00, "unbiased view of normal traffic"),
    ("all thumbs-down",          0.0040, 1.00, "the user already told you"),
    ("all empty retrievals",     0.0090, 1.00, "tier 1 flagged it for free"),
    ("all low top_score",        0.0150, 1.00, "tier 1 flagged it for free"),
    ("all escalations",          0.0008, 1.00, "the expensive failures"),
]
total_rate = 0.0
print("%-24s %10s %12s %12s" % ("stratum", "share", "judged/day", "$/day"))
for name, share, frac, why in STRATA:
    n = REQ_DAY * share * frac
    total_rate += share * frac
    print("%-24s %9.2f%% %12s %12.2f"
          % (name, 100 * share, format(int(n), ","), n * judge))
j_strat = REQ_DAY * total_rate * judge
print("%-24s %9.2f%% %12s %12.2f"
      % ("TOTAL", 100 * total_rate, format(int(REQ_DAY * total_rate), ","), j_strat))
print()
print("overhead vs inference: %.1f%%" % (100.0 * j_strat / (REQ_DAY * gen)))

print()
print("what the stratified sample BUYS over a flat 4.9%:")
print("  a flat %.1f%% sample would catch %.1f%% of thumbs-down answers"
      % (100 * total_rate, 100 * total_rate))
print("  the stratified one catches 100% of them, at the same cost")
print("  -> judge cost scales with your traffic's PROBLEMS, not your traffic")

print()
print("=" * 72)
print("WHY A JUDGE MUST NOT SIT IN THE REQUEST PATH")
print("=" * 72)
TTFT_MS, TOTAL_MS, JUDGE_MS = 880, 3134, 1100
print("current request      : TTFT %d ms, total %d ms" % (TTFT_MS, TOTAL_MS))
print("judge in the path    : total %d ms (+%.0f%%)"
      % (TOTAL_MS + JUDGE_MS, 100.0 * JUDGE_MS / TOTAL_MS))
print("and a second failure mode: if the judge times out, does the user get no answer?")
print()
print("async from the stored trace: total %d ms, judge runs later, 0 added latency"
      % TOTAL_MS)

print()
print("=" * 72)
print("SAMPLE SIZE: WHAT A 2% DAILY JUDGE SAMPLE CAN ACTUALLY RESOLVE")
print("=" * 72)
n_judged = int(REQ_DAY * 0.02)
print("judged/day at 2%%: %s" % format(n_judged, ","))
for p in (0.91, 0.95):
    se = math.sqrt(p * (1 - p) / n_judged)
    print("  faithfulness p=%.2f  SE %.5f  2-sigma %.2f pts" % (p, se, 200 * se))
print("  -> at this volume a judged metric is precise to a fraction of a point,")
print("     which is the opposite problem from the 200-example offline suite.")
print()
for k, label in ((1, "headline"), (5, "5 doc types"), (12, "12 tenants"), (50, "50 tenants")):
    n = n_judged / k
    print("  sliced into %-14s N=%6d  2-sigma %.2f pts"
          % (label, n, 200 * math.sqrt(0.91 * 0.09 / n)))
print("  -> online evals can afford slicing that an offline suite cannot.")`,
        out: `one generation :  1842 in / 214 out = $0.00874
one judge call :  2356 in / 150 out = $0.00932
  -> the judge is 107% of the call it scores, because it reads the context too

inference bill: $873.60/day

========================================================================
TIER 1 -- DETERMINISTIC CHECKS ON 100%
========================================================================
  empty retrieval            $0.00000   runs on every request
  top_score below floor      $0.00000   runs on every request
  schema valid               $0.00000   runs on every request
  refusal regex              $0.00000   runs on every request
  citation present           $0.00000   runs on every request
  answer length              $0.00000   runs on every request
  latency                    $0.00000   runs on every request
  cost                       $0.00000   runs on every request
  TOTAL                      $0.00     per day

========================================================================
TIER 3 -- THE JUDGE, AT FLAT SAMPLING RATES
========================================================================
rate            judge $/day    gen $/day   overhead
100%                 931.80       873.60     106.7%
10%                   93.18       873.60      10.7%
5%                    46.59       873.60       5.3%
2%                    18.64       873.60       2.1%
1%                     9.32       873.60       1.1%

========================================================================
AND STRATIFIED, WHICH IS THE POINT
========================================================================
stratum                       share   judged/day        $/day
random baseline               2.00%        2,000        18.64
all thumbs-down               0.40%          400         3.73
all empty retrievals          0.90%          899         8.39
all low top_score             1.50%        1,500        13.98
all escalations               0.08%           80         0.75
TOTAL                         4.88%        4,880        45.47

overhead vs inference: 5.2%

what the stratified sample BUYS over a flat 4.9%:
  a flat 4.9% sample would catch 4.9% of thumbs-down answers
  the stratified one catches 100% of them, at the same cost
  -> judge cost scales with your traffic's PROBLEMS, not your traffic

========================================================================
WHY A JUDGE MUST NOT SIT IN THE REQUEST PATH
========================================================================
current request      : TTFT 880 ms, total 3134 ms
judge in the path    : total 4234 ms (+35%)
and a second failure mode: if the judge times out, does the user get no answer?

async from the stored trace: total 3134 ms, judge runs later, 0 added latency

========================================================================
SAMPLE SIZE: WHAT A 2% DAILY JUDGE SAMPLE CAN ACTUALLY RESOLVE
========================================================================
judged/day at 2%: 2,000
  faithfulness p=0.91  SE 0.00640  2-sigma 1.28 pts
  faithfulness p=0.95  SE 0.00487  2-sigma 0.97 pts
  -> at this volume a judged metric is precise to a fraction of a point,
     which is the opposite problem from the 200-example offline suite.

  sliced into headline       N=  2000  2-sigma 1.28 pts
  sliced into 5 doc types    N=   400  2-sigma 2.86 pts
  sliced into 12 tenants     N=   166  2-sigma 4.43 pts
  sliced into 50 tenants     N=    40  2-sigma 9.05 pts
  -> online evals can afford slicing that an offline suite cannot.`,
        notes: [
          { t: "p", text: "**The judge costs 107% of the call it scores**, and that single ratio explains the whole design. Its input is the generation\u2019s input plus the generation\u2019s output plus a rubric \u2014 2,356 tokens against 1,842 \u2014 because deciding whether a claim is supported requires seeing both the context and the claim. So \u2018just score everything\u2019 more than doubles model spend." },
          { t: "p", text: "**Stratified at 4.88% costs 5.2% overhead and catches 100% of thumbs-down answers**, where a flat sample of the same size catches 4.88% of them. Same budget, spent on traces that carry information. This is the identical argument to tail sampling in 10.10, which is not a coincidence \u2014 both are choosing *which* rather than *how many*." },
          { t: "p", text: "**The random 2% baseline is the stratum people drop and should not.** Without it every judged score comes from a population selected for being bad, so the faithfulness average is uninterpretable as a level and only works as a trend within the same selection. The random slice is what licenses \u2018faithfulness on normal traffic is 0.91\u2019." },
          { t: "p", text: "**The precision result inverts the usual complaint about evaluation.** 2,000 judged answers give 2 sigma of 1.28 points, against the \u00b15.3 that 9.16 computed for a 200-example offline suite. Production has the volume; the offline suite has the control. The suite is the imprecise one." },
          { t: "p", text: "**And online evals can afford slicing that an offline suite cannot.** Twelve tenants still resolve to 4.43 points on 2,000 judged answers, where 200 offline examples cannot be sliced at all. Since 10.13\u2019s whole lesson is that an average hides a cohort, per-cohort quality monitoring is an online capability by necessity." },
          { t: "p", text: "A judge in the request path would add 1,100 ms to a 3,134 ms request \u2014 35% \u2014 and introduce the question of what the user receives when the judge times out. Scoring asynchronously from the stored trace adds nothing to either number, which is why the rule is absolute rather than a trade-off." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Three tiers: free deterministic checks on 100%, a judge on a small stratified sample, humans on the worst twenty a day. A judge call costs 107% of the generation it scores, because it reads the context and the answer \u2014 so judging everything more than doubles model spend, and the 1\u20135% rule is a calculation rather than a convention." },
        { t: "p", text: "Stratify rather than sample flat: 2% random plus every flagged trace costs 5.2% overhead and catches all the thumbs-down instead of 5% of them. Never put a judge in the request path. And note the inversion \u2014 2,000 judged answers resolve to 1.28 points where a 200-example offline suite carries \u00b15.3." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you run evaluation on production traffic without the bill getting out of hand?\u201d**" },
        { t: "p", text: "Three tiers with three different cost structures. Deterministic checks on a hundred per cent of requests, a judge on a small stratified sample, and human review on the worst twenty a day." },
        { t: "p", text: "The tier-one checks are free and that is the part people underuse. Empty retrieval, top score below a floor, schema valid, a refusal regex, citation present, answer length, latency, cost \u2014 none of those needs a model, they all read attributes that already exist, and in practice they catch most real incidents. The judge explains the rest." },
        { t: "p", text: "The judge is where the money is, and the number that surprised me is that a judge call costs 107% of the generation it scores. Its input is the generation\u2019s input plus the generation\u2019s output plus a rubric \u2014 about 2,356 tokens against 1,842 \u2014 because deciding whether a claim is supported means reading both the context and the claim. So judging everything more than doubles model spend. That is what makes the one-to-five-per-cent rule arithmetic rather than folklore." },
        { t: "p", text: "Then I would stratify rather than sample flat: two per cent random, plus a hundred per cent of thumbs-down, empty retrievals, low top scores and escalations. That came out at 4.88% of traffic and 5.2% overhead \u2014 and it catches every thumbs-down answer where a flat sample of the same size catches 4.88% of them. Same budget, spent on the traces that carry information." },
        { t: "p", text: "I would keep the random baseline stratum even under pressure, because without it every judged score comes from a population selected for being bad. The average then has no meaning as a level, only as a trend within the same selection \u2014 and it is the random slice that lets you say faithfulness on normal traffic is 0.91." },
        { t: "p", text: "The judge never goes in the request path. Score asynchronously from the stored trace: in the path it would add about 1,100 milliseconds to a 3,100 millisecond request, and it introduces a second failure mode where you have to decide what the user gets when the judge times out. Async costs nothing on either count." },
        { t: "p", text: "And I would point out something that inverts the usual complaint about evaluation. Two thousand judged answers a day gives two-sigma resolution of 1.28 points, where a 200-example offline suite carries a margin of about five points. Production has the volume and the offline suite has the control \u2014 so the suite is the imprecise one, and per-cohort quality monitoring is something only the online path can afford: twelve tenants still resolve to 4.4 points." }
      ] }
  ],

  takeaways: [
    "**Online evaluation scores real traffic after deploy**, and catches what a fixed dataset did not anticipate.",
    "**Three tiers**: free deterministic checks on 100%, a judge on a stratified sample, humans on the worst twenty a day.",
    "**Measured: a judge call costs 107% of the generation it scores** \u2014 $0.00932 against $0.00874.",
    "**Because the judge reads the context and the answer**, its input is larger than the generation's: 2,356 tokens against 1,842.",
    "**So judging everything more than doubles model spend**, which makes the 1\u20135% rule a calculation rather than a convention.",
    "**Measured: stratified at 4.88% costs 5.2% overhead** and catches 100% of thumbs-down answers.",
    "**A flat sample of the same size catches 4.88% of them** \u2014 same budget, spent on traces that carry information.",
    "**Keep the random 2% baseline stratum**, or every judged score comes from a population selected for being bad.",
    "**Never put a judge in the request path**: +1,100 ms on a 3,134 ms request, plus a second failure mode.",
    "**Measured: 2,000 judged answers resolve to 1.28 points** against \u00b15.3 for a 200-example offline suite.",
    "**So production has the volume and the offline suite has the control** \u2014 the suite is the imprecise one.",
    "**Online evals can be sliced and offline suites cannot**: twelve tenants still resolve to 4.43 points."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does a judge call cost more than the generation it scores?",
        options: [
          "Because judges are run on larger models than the generator",
          "Because the judge's input is the generation's input plus the generation's output plus a rubric \u2014 2,356 tokens against 1,842",
          "Because judge calls cannot use prompt caching",
          "Because judges require multiple samples for self-consistency"
        ],
        answer: 1,
        why: "Deciding whether a claim is supported requires reading both the retrieved context and the answer containing the claim, so the judge necessarily sees everything the generator saw plus everything it produced. At the same prices that works out to $0.00932 against $0.00874, or 107% \u2014 which turns \"score everything\" from a conservative default into a decision that more than doubles model spend, and is why sampling rates of one to five per cent are arithmetic rather than convention." },

      { stem: "A stratified sample and a flat sample both cover 4.88% of traffic. What differs?",
        options: [
          "Nothing material \u2014 the cost and the information are equivalent",
          "The flat sample catches 4.88% of thumbs-down answers; the stratified one catches 100% of them",
          "The stratified sample is biased and therefore unusable for reporting levels",
          "The flat sample resolves slices better because it is evenly distributed"
        ],
        answer: 1,
        why: "Stratifying means taking every trace the free checks already flagged \u2014 thumbs-down, empty retrievals, low top scores, escalations \u2014 plus a random slice, so the budget lands on traces that carry information rather than being spread over traffic that mostly worked. Bias is a real concern and is precisely why the random 2% baseline stratum is kept: it is what allows a level such as \"faithfulness on normal traffic is 0.91\" to be stated at all." },

      { stem: "What is surprising about the precision of a 2% daily online judge sample?",
        options: [
          "It is less precise than an offline suite because production traffic is noisier",
          "At 2,000 judged answers it resolves to 1.28 points at 2 sigma, against roughly \u00b15.3 for a 200-example offline suite",
          "It cannot be sliced, because each stratum is too small",
          "Its precision is limited by judge disagreement rather than sample size"
        ],
        answer: 1,
        why: "Production supplies volume that a hand-curated dataset cannot match, so the online metric is the precise one and the offline suite is the blunt instrument \u2014 which inverts the usual complaint. What the offline suite provides instead is control: fixed examples, known labels, and no confounding from traffic mix. Judge reliability is a separate and real limitation, which is why an agreement figure belongs alongside any judged score." },

      { stem: "Why must a judge never sit in the request path?",
        options: [
          "Because judge models have lower availability than generation models",
          "Because it adds around a second of latency and a second failure mode \u2014 including deciding what the user gets if the judge times out",
          "Because scoring requires the full trace, which is only written after the response",
          "Because provider rate limits apply per request chain"
        ],
        answer: 1,
        why: "On a 3,134 ms request a judge adds roughly 1,100 ms, a 35% increase, for a score that can be computed afterwards from the stored trace at no latency cost at all. The second failure mode is the sharper objection: a judge timeout forces a choice between delaying the user further and serving an unscored response, neither of which is a problem that needed to exist. Traces are written as spans close, so the data is available either way." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Online evals on live traffic",
    questions: [
      { level: "core",
        q: "How do you evaluate production traffic affordably?",
        strong: "A strong answer tiers by cost and leads with the free tier.",
        answer: [
          { t: "p", text: "Three tiers. Free deterministic checks on a hundred per cent of requests, a judge on a small stratified sample, and human review on the worst twenty a day." },
          { t: "p", text: "Tier one is the underused part. Empty retrieval, top score below a floor, schema valid, refusal regex, citation present, length, latency, cost \u2014 none needs a model, all read attributes that already exist, and they catch most real incidents. The judge explains the remainder." },
          { t: "p", text: "The judge is the expensive tier for a specific reason: a judge call costs 107% of the generation it scores, because it reads the context and the answer plus a rubric. So judging everything more than doubles model spend." },
          { t: "p", text: "Stratified at under five per cent that becomes about five per cent overhead \u2014 and it catches every thumbs-down answer rather than five per cent of them." }
        ] },

      { level: "advanced",
        q: "How would you design the judge sample?",
        strong: "A strong answer stratifies and keeps the random baseline.",
        answer: [
          { t: "p", text: "Two per cent random, plus a hundred per cent of thumbs-down, empty retrievals, low top scores and escalations. That came to 4.88% of traffic and 5.2% overhead when I priced it." },
          { t: "p", text: "The flagged strata are defined by the free tier-one checks, which is what makes this scale properly: the random baseline grows with traffic, and the flagged strata grow only if the problem rate does." },
          { t: "p", text: "I would defend the random baseline hardest, because it is the stratum that gets cut. Without it every judged score comes from a population selected for being bad, so the faithfulness average has no meaning as a level \u2014 only as a trend within that same selection." },
          { t: "p", text: "And feedback has to be joined back onto the trace ID. A thumbs-down you cannot resolve to the exact chunks and prompt is an anecdote; one you can is a regression test case." }
        ] },

      { level: "core",
        q: "Offline or online evaluation?",
        strong: "A strong answer says what each one uniquely provides.",
        answer: [
          { t: "p", text: "Both, and they do genuinely different jobs. Offline has control: a fixed dataset, known labels, and a comparison that is not confounded by traffic mix, which is what you need to gate a deploy." },
          { t: "p", text: "Online has volume, and that turns out to matter more than people expect. Two thousand judged answers a day resolves to 1.28 points at two sigma, where a 200-example offline suite carries a margin of about five points. So the offline suite is the imprecise one, which inverts the usual complaint." },
          { t: "p", text: "Online also catches the things the dataset never anticipated \u2014 a new product, a new document type, a question shape the pipeline was not built for. A fixed suite cannot contain a population nobody knew about." },
          { t: "p", text: "And online can be sliced where offline cannot: twelve tenants still resolve to about four points on 2,000 judged answers. Since an average reliably hides a collapsing cohort, per-cohort quality monitoring is only affordable on the online path." }
        ] }
    ]
  }
});
