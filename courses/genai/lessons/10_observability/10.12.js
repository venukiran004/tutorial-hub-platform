EC.receiveLesson({
  id: "10.12",

  lede: "A quality alert is a **statistical statement**, and the sample size decides what you can even see. With a daily eval set of 200 at a baseline of 0.95, two sigma is **3.08 points** \u2014 so that alert cannot distinguish 95% from 93%, and one set at \u201cany drop\u201d will page on noise every other day. Set the threshold from the arithmetic, not from a round number. And then notice that this fights directly with the runbook\u2019s instruction to slice: **every slice costs \u221ak of your power.**",

  objectives: [
    "Compute the smallest drop a daily eval set can detect",
    "Set an alert threshold from the standard error rather than from a round number",
    "Name the seven alerts worth having and the condition for each",
    "Recognise the tension between slicing and statistical power, and resolve it",
    "Choose the two alerts to add first if you can only have two"
  ],

  prerequisites: ["10.3", "9.16"],

  blocks: [

    { t: "h2", n: "01", id: "arithmetic", text: "The threshold comes from the arithmetic",
      sub: "SE = \u221a(p(1\u2212p)/N)" },

    { t: "math", tex: "\\text{SE} = \\sqrt{\\frac{p(1-p)}{N}}, \\qquad \\text{2}\\sigma\\text{ band} = 2 \\times \\text{SE}" },

    { t: "code", lang: "text", title: "Verified \u2014 smallest drop a 2-sigma alert can see, at p = 0.95", code: `  N=50   /day  smallest drop a 2-sigma alert can see: 6.2 pts
  N=200  /day  smallest drop a 2-sigma alert can see: 3.1 pts
  N=1000 /day  smallest drop a 2-sigma alert can see: 1.4 pts`,
      hl: [2],
      caption: "So a 200-sample daily eval cannot distinguish 95% from 93%." },

    { t: "callout", kind: "trap", title: "An alert set at \u201cany drop\u201d is an alert people turn off",
      body: [
        { t: "p", text: "At N = 200 the band is \u00b13.08 points, so a 2-point move is well inside the noise and will occur regularly with nothing wrong. An alert that fires on it pages somebody every other day for nothing, and within a fortnight nobody reads it \u2014 which is strictly worse than having no alert, because now there is a dashboard implying coverage that does not exist." },
        { t: "p", text: "The fix is one line of arithmetic per threshold: take the baseline rate, take the daily sample size, compute two sigma, and set the threshold there. At N = 200 and p = 0.95 that means alerting below 91.9%, not below 94%." },
        { t: "p", text: "Then add the second condition: **two days running**. A single day at two sigma happens about one day in twenty by chance; two consecutive days is far rarer, and the cost is a day of delay on a real regression \u2014 which for a quality drift is an acceptable trade and for an outage is not, which is why the latency and error alerts stay on minutes." }
      ] },

    { t: "callout", kind: "warn", title: "And the threshold depends on the baseline, which people copy across metrics",
      body: [
        { t: "p", text: "Because `p(1\u2212p)` peaks at p = 0.5, a mid-range metric is noisier than a high one at the same sample size. Measured: at N = 200, two sigma is **3.08 points at p = 0.95 and 6.93 points at p = 0.60** \u2014 more than twice as wide." },
        { t: "p", text: "So a threshold tuned on an accuracy dashboard, where the baseline is 0.95, will page constantly when copied onto a context-precision metric sitting at 0.60. That is a common and invisible mistake because the threshold looks reasonable in both places." },
        { t: "p", text: "The rule that avoids it: thresholds are computed per metric from that metric\u2019s own baseline and sample size, never copied. 10.3\u2019s alert conditions are mostly relative (2 sigma below a rolling mean, doubling week on week) for exactly this reason \u2014 a relative condition carries its own baseline." }
      ] },

    { t: "h2", n: "02", id: "table", text: "Seven alerts worth having",
      sub: "And the reason for each" },

    { t: "table",
      head: ["Alert", "Condition", "Why this one"],
      rows: [
        ["**Quality regression**", "daily accuracy below the 7-day mean by 2 sigma, two days running", "catches drift without paging on noise"],
        ["**Empty retrieval**", "rate above 2% over 30 min", "the earliest RAG signal there is, and it needs no judge"],
        ["**Top-1 score collapse**", "mean top-1 similarity falls more than 0.10 day over day", "catches an index or embedding change within an hour"],
        ["**Response model mismatch**", "`gen_ai.response.model` is not the pinned version", "catches a provider alias roll immediately"],
        ["**Refusal spike**", "refusal rate doubles day over day", "catches guardrail and prompt regressions"],
        ["**p95 latency**", "above the SLO for 10 min", "classical, still necessary"],
        ["**Cost per request**", "1.5x the 7-day mean", "catches prompt bloat and retry storms"]
      ] },

    { t: "callout", kind: "good", title: "The two that pay for themselves",
      body: [
        { t: "p", text: "**Empty-retrieval rate and mean top-1 score.** Both come off the retriever span, cost nothing to compute, need no judge and no labels, and move hours before answer quality does. If you add exactly two alerts to a RAG system, add those." },
        { t: "p", text: "In the incident in 10.13 they went from 0.4% to 11.2% and from 0.78 to 0.41 \u2014 three weeks before anybody noticed the accuracy drop. Both numbers existed on every request for those three weeks and neither was recorded." },
        { t: "p", text: "Notice also that neither is a statistical alert in the sense of \u00a701. A jump from 0.4% to 11.2% needs no confidence interval; it is a twenty-eightfold change on a high-volume rate. That is the other reason to prefer them: the arithmetic of \u00a701 is a constraint on *judged* metrics, and these two escape it entirely." }
      ] },

    { t: "h2", n: "03", id: "slicing", text: "Slicing and power fight each other",
      sub: "Which the runbook does not say" },

    { t: "callout", kind: "insight", title: "Every slice multiplies the detectable effect by \u221ak",
      body: [
        { t: "p", text: "10.14\u2019s runbook says *slice it \u2014 an average is a mix of populations*, and it is right. \u00a701 of this lesson says *alert on two sigma or you page on noise*, and it is also right. **Those two instructions are in direct tension and neither source mentions it.**" },
        { t: "p", text: "Measured on a 200-sample daily eval at p = 0.95: the headline resolves to 3.08 points, two cohorts to 4.36, five document types to 6.89, and twelve tenants to **10.68**. At twelve tenants a per-tenant alert cannot see anything short of a ten-point collapse." },
        { t: "p", text: "So slicing is how you diagnose and it is what destroys your power to alert. The two activities are different: slice freely when **investigating** a known problem, because you are looking for a large effect you already know exists; slice sparingly when **alerting**, because there you need to detect a small effect you do not know about." }
      ] },

    { t: "callout", kind: "good", title: "And the resolution is a longer window, not fewer slices",
      body: [
        { t: "p", text: "A tenant getting 17 samples a day resolves to 10.68 points on a one-day window, 6.16 on three days, 4.04 on seven and 2.85 on fourteen. So per-tenant quality alerting is perfectly possible \u2014 on a weekly window rather than a daily one." },
        { t: "p", text: "That is the right shape anyway. A per-tenant quality drift is not an outage and does not need a page within the hour; what it needs is to be noticed at all, which a weekly 2-sigma check does. Meanwhile the fast alerts \u2014 empty retrieval, p95, the model mismatch \u2014 stay on minutes because they are not sample-size-limited." },
        { t: "p", text: "The other resolution is to alert on the headline and *slice in the notification*. One alert on the aggregate, which has the power, and a payload that names which cohort moved most \u2014 so the page carries the diagnosis rather than requiring it." }
      ] },

    { t: "viz", title: "What you can see, and what slicing costs", caption: "Verified at p = 0.95. Slicing into k slices multiplies the detectable effect by \u221ak.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Detectable effect size by sample size and by number of slices">
  <text x="16" y="20" class="s-label">SMALLEST DROP A 2-SIGMA ALERT CAN SEE &#183; p = 0.95</text>
  <text x="20" y="46" class="s-mono" style="font-size:9px">N = 50</text>
  <rect x="110" y="34" width="308" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="426" y="47" class="s-mono" style="font-size:9px;fill:var(--crit)">6.2 pts</text>
  <text x="20" y="70" class="s-mono" style="font-size:9px">N = 200</text>
  <rect x="110" y="58" width="154" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="272" y="71" class="s-mono" style="font-size:9px;fill:var(--warn)">3.1 pts &#8212; cannot tell 95% from 93%</text>
  <text x="20" y="94" class="s-mono" style="font-size:9px">N = 1,000</text>
  <rect x="110" y="82" width="69" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="187" y="95" class="s-mono" style="font-size:9px;fill:var(--good)">1.4 pts</text>

  <text x="16" y="124" class="s-label">AND THE SAME N AT A LOWER BASELINE &#8212; p(1-p) PEAKS AT 0.5</text>
  <text x="20" y="148" class="s-mono" style="font-size:9px">N=200 p=0.95</text>
  <rect x="140" y="136" width="154" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="302" y="149" class="s-mono" style="font-size:9px">3.08 pts</text>
  <text x="20" y="172" class="s-mono" style="font-size:9px">N=200 p=0.60</text>
  <rect x="140" y="160" width="347" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="495" y="173" class="s-mono" style="font-size:9px;fill:var(--crit)">6.93 pts &#8212; a copied threshold pages constantly</text>

  <line x1="16" y1="192" x2="744" y2="192" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="214" class="s-label">THE PRICE OF SLICING, ON A 200/DAY EVAL SET</text>
  <text x="20" y="236" class="s-mono" style="font-size:9px">headline</text>
  <rect x="160" y="224" width="62" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="230" y="236" class="s-mono" style="font-size:8px">N=200 &#183; 3.08 pts</text>
  <text x="20" y="256" class="s-mono" style="font-size:9px">2 cohorts</text>
  <rect x="160" y="244" width="87" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="255" y="256" class="s-mono" style="font-size:8px">N=100 &#183; 4.36 pts</text>
  <text x="20" y="276" class="s-mono" style="font-size:9px">5 doc types</text>
  <rect x="160" y="264" width="138" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="306" y="276" class="s-mono" style="font-size:8px">N=40 &#183; 6.89 pts</text>
  <text x="20" y="296" class="s-mono" style="font-size:9px">12 tenants</text>
  <rect x="160" y="284" width="214" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="382" y="296" class="s-mono" style="font-size:8px;fill:var(--crit)">N=17 &#183; 10.68 pts &#8212; blind to anything smaller</text>
  <text x="16" y="314" class="s-sub">the runbook says SLICE IT and &#167;01 says ALERT ON 2 SIGMA &#8212; the fix is a 7-day window on small slices</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Set every threshold from the arithmetic", difficulty: "core", minutes: 35,
      body: "Compute the detectable effect for your daily eval volume, set each quality threshold from it, then measure what slicing costs you and decide which alerts run daily and which weekly. Finish by naming the two alerts you would keep if you could keep only two.",
      requirements: [
        "The detectable effect at your actual daily sample size",
        "The same computed at two different baselines, to show the threshold is not transferable",
        "The cost of slicing, as N per slice and detectable effect per slice",
        "The window length needed to make a per-tenant alert viable",
        "Each alert classified as sample-size-limited or not"
      ],
      hint: "The alerts that are not sample-size-limited \u2014 empty retrieval, model mismatch, p95 \u2014 can stay on minutes. Only the judged and labelled metrics have to obey the \u221aN arithmetic.",
      solution: { lang: "python", title: "thresholds, and the price of slicing", code: `import math

def two_sigma(p, n):
    return 200 * math.sqrt(p * (1 - p) / n)

print("WHAT A DAILY EVAL SET CAN SEE, AT BASELINE p=0.95")
print("=" * 70)
for n in (50, 200, 1000, 5000):
    print("  N=%-6d 2-sigma = %5.2f pts   -> threshold: alert below %.1f%%"
          % (n, two_sigma(0.95, n), 95 - two_sigma(0.95, n)))
print()
print("so a 200-sample daily eval CANNOT distinguish 95% from 93%:")
print("  the 2-sigma band is +/-%.2f pts, and 95->93 is a 2.0 pt move" % two_sigma(0.95, 200))
print("  an alert set at 'any drop' pages on noise every other day.")

print()
print("THE SAME ARITHMETIC AT A DIFFERENT BASELINE")
print("=" * 70)
print("%-8s %10s %10s %10s" % ("N", "p=0.95", "p=0.80", "p=0.60"))
for n in (50, 200, 1000):
    print("%-8d %9.2f %10.2f %10.2f"
          % (n, two_sigma(0.95, n), two_sigma(0.80, n), two_sigma(0.60, n)))
print("  -> p(1-p) peaks at 0.5, so a mid-range metric needs MORE samples")
print("     for the same resolution. a threshold copied from an accuracy")
print("     dashboard onto a 0.60 metric will page constantly.")

print()
print("THE PRICE OF SLICING -- WHICH THE RUNBOOK DOES NOT MENTION")
print("=" * 70)
N_DAY = 200
print("daily eval set N=%d, baseline p=0.95" % N_DAY)
print("%-30s %8s %10s" % ("granularity", "N/slice", "2-sigma"))
for label, k in (("headline, no slicing", 1), ("2 cohorts", 2), ("5 doc types", 5),
                 ("12 tenants", 12), ("2 cohorts x 5 doc types", 10),
                 ("3 languages x 5 doc types", 15)):
    n = N_DAY / float(k)
    print("%-30s %8.0f %8.2f pts" % (label, n, two_sigma(0.95, n)))
print()
print("slicing into k slices multiplies the detectable effect by sqrt(k):")
for k in (1, 4, 9, 16, 25):
    print("  k=%-3d sqrt(k) = %.1fx" % (k, math.sqrt(k)))

print()
print("THE TENSION, STATED PLAINLY")
print("=" * 70)
print("  runbook step 4 says: SLICE IT -- an average is a mix of populations")
print("  section 12 says:     alert on 2 SIGMA, or you page on noise")
print("  and those two instructions fight: every slice costs sqrt(k) of power.")
print()
print("the resolution is a longer window on the small slices, not fewer slices:")
per_day = N_DAY / 12.0
for days in (1, 3, 7, 14, 28):
    n = per_day * days
    print("  one tenant of 12   %2d-day window  N=%5.0f  2-sigma %5.2f pts"
          % (days, n, two_sigma(0.95, n)))

print()
print("ALERT TABLE, WITH THE ARITHMETIC ATTACHED")
print("=" * 70)
ALERTS = [
    ("quality regression", "below 7-day mean by 2 sigma, 2 days running",
     "catches drift without paging on noise"),
    ("empty retrieval",    "rate above 2% over 30 min",
     "earliest RAG signal, needs no judge"),
    ("top-1 score collapse", "mean falls more than 0.10 day over day",
     "catches an index or embedding change within an hour"),
    ("response model mismatch", "gen_ai.response.model != pinned version",
     "catches a provider alias roll immediately"),
    ("refusal spike",      "rate doubles day over day",
     "catches guardrail and prompt regressions"),
    ("p95 latency",        "above SLO for 10 min", "classical, still necessary"),
    ("cost per request",   "1.5x the 7-day mean", "catches prompt bloat and retry storms"),
]
for name, cond, why in ALERTS:
    print("  %-24s %s" % (name, cond))
    print("  %-24s   (%s)" % ("", why))

print()
print("IF YOU COULD ONLY HAVE TWO")
print("=" * 70)
print("  empty-retrieval rate and mean top-1 score.")
print("  both come off the retriever span, need no judge and no labels,")
print("  cost nothing to compute, and move hours before answer quality does.")
print("  in the 10.13 incident: 0.4% -> 11.2% and 0.78 -> 0.41,")
print("  three weeks before the accuracy drop was noticed.")`,
        out: `WHAT A DAILY EVAL SET CAN SEE, AT BASELINE p=0.95
======================================================================
  N=50     2-sigma =  6.16 pts   -> threshold: alert below 88.8%
  N=200    2-sigma =  3.08 pts   -> threshold: alert below 91.9%
  N=1000   2-sigma =  1.38 pts   -> threshold: alert below 93.6%
  N=5000   2-sigma =  0.62 pts   -> threshold: alert below 94.4%

so a 200-sample daily eval CANNOT distinguish 95% from 93%:
  the 2-sigma band is +/-3.08 pts, and 95->93 is a 2.0 pt move
  an alert set at 'any drop' pages on noise every other day.

THE SAME ARITHMETIC AT A DIFFERENT BASELINE
======================================================================
N            p=0.95     p=0.80     p=0.60
50            6.16      11.31      13.86
200           3.08       5.66       6.93
1000          1.38       2.53       3.10
  -> p(1-p) peaks at 0.5, so a mid-range metric needs MORE samples
     for the same resolution. a threshold copied from an accuracy
     dashboard onto a 0.60 metric will page constantly.

THE PRICE OF SLICING -- WHICH THE RUNBOOK DOES NOT MENTION
======================================================================
daily eval set N=200, baseline p=0.95
granularity                     N/slice    2-sigma
headline, no slicing                200     3.08 pts
2 cohorts                           100     4.36 pts
5 doc types                          40     6.89 pts
12 tenants                           17    10.68 pts
2 cohorts x 5 doc types              20     9.75 pts
3 languages x 5 doc types            13    11.94 pts

slicing into k slices multiplies the detectable effect by sqrt(k):
  k=1   sqrt(k) = 1.0x
  k=4   sqrt(k) = 2.0x
  k=9   sqrt(k) = 3.0x
  k=16  sqrt(k) = 4.0x
  k=25  sqrt(k) = 5.0x

THE TENSION, STATED PLAINLY
======================================================================
  runbook step 4 says: SLICE IT -- an average is a mix of populations
  section 12 says:     alert on 2 SIGMA, or you page on noise
  and those two instructions fight: every slice costs sqrt(k) of power.

the resolution is a longer window on the small slices, not fewer slices:
  one tenant of 12    1-day window  N=   17  2-sigma 10.68 pts
  one tenant of 12    3-day window  N=   50  2-sigma  6.16 pts
  one tenant of 12    7-day window  N=  117  2-sigma  4.04 pts
  one tenant of 12   14-day window  N=  233  2-sigma  2.85 pts
  one tenant of 12   28-day window  N=  467  2-sigma  2.02 pts

ALERT TABLE, WITH THE ARITHMETIC ATTACHED
======================================================================
  quality regression       below 7-day mean by 2 sigma, 2 days running
                             (catches drift without paging on noise)
  empty retrieval          rate above 2% over 30 min
                             (earliest RAG signal, needs no judge)
  top-1 score collapse     mean falls more than 0.10 day over day
                             (catches an index or embedding change within an hour)
  response model mismatch  gen_ai.response.model != pinned version
                             (catches a provider alias roll immediately)
  refusal spike            rate doubles day over day
                             (catches guardrail and prompt regressions)
  p95 latency              above SLO for 10 min
                             (classical, still necessary)
  cost per request         1.5x the 7-day mean
                             (catches prompt bloat and retry storms)

IF YOU COULD ONLY HAVE TWO
======================================================================
  empty-retrieval rate and mean top-1 score.
  both come off the retriever span, need no judge and no labels,
  cost nothing to compute, and move hours before answer quality does.
  in the 10.13 incident: 0.4% -> 11.2% and 0.78 -> 0.41,
  three weeks before the accuracy drop was noticed.`,
        notes: [
          { t: "p", text: "**The threshold at N=200 is 91.9%, not 94%.** That is the number the arithmetic gives and it feels too low, which is exactly why people set a round number instead and then disable the alert a fortnight later. A 3.08-point band means a 2-point move is ordinary." },
          { t: "p", text: "**The baseline comparison is the mistake worth guarding against.** At N=200 the band is 3.08 points at p=0.95 and 6.93 at p=0.60 \u2014 more than double \u2014 because p(1\u2212p) peaks at 0.5. A threshold tuned on an accuracy dashboard and copied onto a context-precision metric will page constantly, and it will look perfectly sensible in both places." },
          { t: "p", text: "**The slicing table is the finding neither source states.** The runbook says slice because an average hides a cohort; the alerting section says use two sigma or you page on noise. At twelve tenants the per-slice band is 10.68 points, so those two instructions cannot both be followed on a daily window \u2014 and nothing in either place says so." },
          { t: "p", text: "**The resolution is a window, not a retreat from slicing.** A tenant with 17 samples a day resolves to 10.68 points daily, 4.04 on seven days and 2.85 on fourteen. Per-tenant quality alerting is viable weekly, which is also the right cadence \u2014 a per-tenant drift is not an outage." },
          { t: "p", text: "**And three of the seven alerts escape the arithmetic entirely.** Empty retrieval going from 0.4% to 11.2% is a twenty-eightfold change on a high-volume rate and needs no interval; a response-model mismatch is a string comparison; p95 latency is not a proportion. Those stay on minutes, which is why they carry the fast-detection load." },
          { t: "p", text: "Separating the alerts that are sample-size-limited from the ones that are not is the practical takeaway. The \u221aN arithmetic constrains judged and labelled metrics, and it is precisely the cheap span-attribute metrics that are unconstrained \u2014 so they are both the cheapest and the fastest signals available." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A quality alert is a statistical statement. At N = 200 and p = 0.95, two sigma is 3.08 points, so the threshold is 91.9% and the alert cannot distinguish 95% from 93%. Compute it per metric from that metric\u2019s own baseline \u2014 the same N at p = 0.60 gives 6.93 points, so a copied threshold pages constantly." },
        { t: "p", text: "Slicing and alerting fight: twelve tenants on a 200/day set resolve to 10.68 points. Slice freely when investigating a known effect, sparingly when alerting for an unknown one, and use a weekly window for small slices. And note that the cheap span-attribute alerts \u2014 empty retrieval, model mismatch, p95 \u2014 are not sample-size-limited at all, which is why they stay on minutes." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cSet up alerting for our LLM feature. What do you alert on, and at what thresholds?\u201d**" },
        { t: "p", text: "The thresholds come from arithmetic rather than from round numbers, because a quality alert is a statistical statement. For a proportion the standard error is the square root of p times one minus p over N, so with a 200-sample daily eval at a 0.95 baseline two sigma is 3.08 points \u2014 which means the threshold is 91.9%, and that alert genuinely cannot distinguish 95% from 93%." },
        { t: "p", text: "That matters because an alert set at \u2018any drop\u2019 fires on a 2-point move that happens regularly with nothing wrong. Within a fortnight nobody reads it, and then you have a dashboard implying coverage you do not have, which is worse than having no alert. I would add a second condition of two days running: one day at two sigma happens about one day in twenty by chance, two consecutive days is far rarer, and the cost is a day of delay \u2014 acceptable for drift, not for an outage, which is why latency and error alerts stay on minutes." },
        { t: "p", text: "One thing I would be careful about is copying a threshold between metrics. Because p times one minus p peaks at a half, the same 200 samples give 3.08 points at a 0.95 baseline and 6.93 points at 0.60. So a threshold tuned on an accuracy dashboard will page constantly on a context-precision metric sitting at 0.60, and it looks perfectly reasonable in both places." },
        { t: "p", text: "For the alerts themselves: quality regression on the 2-sigma rule, empty retrieval above two per cent over thirty minutes, mean top-1 similarity falling more than 0.10 day over day, the responding model not matching the pinned version, refusal rate doubling, p95 above the SLO for ten minutes, and cost per request at 1.5 times the weekly mean." },
        { t: "p", text: "If I could only have two, empty-retrieval rate and mean top-1 score. They come off the retriever span, need no judge and no labels, cost nothing, and move hours before answer quality does \u2014 in the incident I keep citing, 0.4% to 11.2% and 0.78 to 0.41, three weeks early. And they escape the sample-size arithmetic entirely, because a twenty-eightfold jump on a high-volume rate needs no confidence interval." },
        { t: "p", text: "The tension I would raise explicitly is that slicing and alerting work against each other. Every incident runbook says slice, because an average hides a collapsing cohort, and that is right. But every slice divides your sample, so the detectable effect grows as the square root of the number of slices \u2014 at twelve tenants on a 200-a-day set the per-slice band is 10.68 points, which is blind to anything short of a collapse. I would resolve it by slicing freely when investigating a known problem and sparingly when alerting, putting small slices on a weekly window where 17 samples a day becomes 4 points of resolution, and alerting on the headline with the worst cohort named in the notification payload." }
      ] }
  ],

  takeaways: [
    "**A quality alert is a statistical statement**, and the sample size decides what you can see.",
    "**Verified: at N = 200 and p = 0.95, two sigma is 3.08 points** \u2014 so the threshold is 91.9%, not a round 94%.",
    "**That alert cannot distinguish 95% from 93%**, so one set at \u201cany drop\u201d pages on noise.",
    "**An alert nobody reads is worse than no alert**, because the dashboard implies coverage that does not exist.",
    "**Add \u201ctwo days running\u201d**: one day at two sigma happens one day in twenty by chance.",
    "**Thresholds are not transferable between metrics**: the same N gives 3.08 points at p = 0.95 and 6.93 at p = 0.60.",
    "**Because `p(1\u2212p)` peaks at 0.5**, a mid-range metric is noisier than a high one at the same sample size.",
    "**Slicing and alerting fight each other**, and neither the runbook nor the alerting guidance says so.",
    "**Measured: twelve tenants on a 200/day set resolve to 10.68 points** \u2014 blind to anything short of a collapse.",
    "**Slice freely when investigating, sparingly when alerting** \u2014 investigation looks for a known large effect.",
    "**Fix small slices with a longer window**: 17/day resolves to 10.68 points daily and 4.04 over seven days.",
    "**Empty retrieval, model mismatch and p95 are not sample-size-limited at all**, which is why they stay on minutes."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Your daily eval set is 200 examples at a 0.95 baseline. Where do you set the quality alert?",
        options: [
          "At any drop below 95%, so no regression is missed",
          "Below 91.9% \u2014 two sigma is 3.08 points, so anything smaller is indistinguishable from noise",
          "At 90%, a round number safely below the baseline",
          "At one sigma, to catch regressions earlier"
        ],
        answer: 1,
        why: "The standard error is \u221a(0.95 \u00d7 0.05 / 200), which gives a two-sigma band of 3.08 points \u2014 so a 2-point move happens routinely with nothing wrong and an \"any drop\" alert fires every other day until somebody disables it. Setting a round number instead is the common shortcut and it is arbitrary in both directions. One sigma would roughly triple the false-positive rate, which is the opposite of what a page needs." },

      { stem: "Why can a threshold tuned on an accuracy metric not be copied onto a context-precision metric?",
        options: [
          "Because the two metrics use different judges",
          "Because `p(1\u2212p)` peaks at 0.5 \u2014 at N = 200 the band is 3.08 points at p = 0.95 and 6.93 at p = 0.60",
          "Because context precision is computed weekly rather than daily",
          "Because precision metrics are bounded differently"
        ],
        answer: 1,
        why: "The variance of a proportion depends on the proportion itself and is largest in the middle of the range, so a mid-range metric is more than twice as noisy as a high one at the same sample size. A threshold that works at a 0.95 baseline will therefore page constantly at 0.60 while looking perfectly sensible in both places \u2014 which is why thresholds are computed per metric, and why relative conditions such as \"2 sigma below the rolling mean\" are safer since they carry their own baseline." },

      { stem: "A runbook says \u201cslice every metric\u201d and the alerting guide says \u201calert on 2 sigma.\u201d What is the problem?",
        options: [
          "Nothing \u2014 they address different stages of an investigation",
          "They are in tension: every slice divides the sample, so the detectable effect grows as \u221ak \u2014 twelve tenants on 200/day resolve to only 10.68 points",
          "Slicing invalidates the 2-sigma calculation because slices are correlated",
          "Slicing requires labelled data that alerting does not have"
        ],
        answer: 1,
        why: "Both instructions are individually correct and they cannot both be followed on a daily window, because a 200-example set split twelve ways leaves 17 per slice and a band wide enough to miss anything short of a collapse. The resolution is to separate the activities: slice freely when investigating a known effect, sparingly when alerting on an unknown one, and put small slices on a weekly window where 17 a day becomes about 4 points of resolution." },

      { stem: "Why do empty-retrieval rate and mean top-1 score escape the \u221aN arithmetic?",
        options: [
          "Because they are computed hourly rather than daily",
          "Because they are high-volume rates whose movements are large \u2014 0.4% to 11.2% is a twenty-eightfold change needing no confidence interval",
          "Because they are deterministic and therefore have no variance",
          "Because they are measured on the full corpus rather than a sample"
        ],
        answer: 1,
        why: "They are computed on every request rather than on a sampled eval set, and the changes they exhibit during a real incident are enormous rather than marginal, so detecting them requires no statistical subtlety at all. That is the second reason to prefer them beyond their zero cost: the sample-size constraint applies to judged and labelled metrics, and these are exactly the metrics it does not bind \u2014 making them both the cheapest and the fastest signals available." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Alerts that actually fire",
    questions: [
      { level: "core",
        q: "How do you set a quality alert threshold?",
        strong: "A strong answer computes it rather than choosing it.",
        answer: [
          { t: "p", text: "From the standard error. For a proportion that is the square root of p times one minus p over N, and I set the threshold at two sigma below the rolling mean." },
          { t: "p", text: "Concretely, a 200-example daily eval at a 0.95 baseline gives a two-sigma band of 3.08 points, so the threshold is 91.9% \u2014 and that alert cannot distinguish 95% from 93%, which is worth stating out loud so nobody expects it to." },
          { t: "p", text: "Plus a second condition of two days running, because a single day at two sigma occurs about one day in twenty by chance. The cost is a day of delay, which is fine for quality drift and not for an outage \u2014 so latency and error alerts stay on minutes." },
          { t: "p", text: "And I compute it per metric rather than copying. The same 200 samples give 3.08 points at a 0.95 baseline and 6.93 at 0.60, because p times one minus p peaks at a half." }
        ] },

      { level: "core",
        q: "Which two alerts would you add first to a RAG system?",
        strong: "A strong answer picks the free ones and says why.",
        answer: [
          { t: "p", text: "Empty-retrieval rate and mean top-1 similarity score. Both come straight off the retriever span, need no judge and no labels, and cost nothing to compute." },
          { t: "p", text: "They are upstream of answer quality, so they move first. In the incident I keep returning to, empty retrieval went from 0.4% to 11.2% and top-1 similarity from 0.78 to 0.41 \u2014 three weeks before anybody noticed the accuracy drop." },
          { t: "p", text: "There is a second reason that is less obvious: they escape the sample-size arithmetic entirely. A twenty-eightfold jump on a high-volume rate needs no confidence interval, whereas a judged metric on a 200-example daily set is stuck with a 3-point band." },
          { t: "p", text: "So they are simultaneously the cheapest signals and the fastest ones, which is an unusual combination and the reason they go first." }
        ] },

      { level: "advanced",
        q: "Every incident guide says to slice your metrics. What does that cost you?",
        strong: "A strong answer quantifies the power loss.",
        answer: [
          { t: "p", text: "Statistical power, as the square root of the number of slices. Every slice divides the sample, so the detectable effect grows \u2014 on a 200-example daily set the headline resolves to 3.08 points, two cohorts to 4.36, five document types to 6.89, and twelve tenants to 10.68." },
          { t: "p", text: "Which means the usual advice to slice everything and the usual advice to alert at two sigma are in direct tension, and I have not seen either source acknowledge it. At twelve tenants a per-tenant alert is blind to anything short of a collapse." },
          { t: "p", text: "I would resolve it by separating the activities. Slicing is for investigating a problem you already know exists, where the effect is large; alerting is for detecting one you do not know about, where it is small. So slice freely in an investigation and sparingly in an alert rule." },
          { t: "p", text: "And for small slices, lengthen the window rather than abandoning them. A tenant getting 17 samples a day resolves to 10.68 points daily and 4.04 over a week \u2014 and a per-tenant quality drift is not an outage, so weekly is the right cadence anyway." }
        ] }
    ]
  }
});
