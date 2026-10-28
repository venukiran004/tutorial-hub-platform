EC.receiveLesson({
  id: "7.2",

  lede: "Two measured facts about percentiles, both of which are on somebody's dashboard right now being read wrongly. **The average of three replicas' p99s was 32.205 ms when the true p99 of the pooled traffic was 60.098 ms — a 46.4% understatement**, because a quantile is not a mean and does not average. And a histogram's quantile is an *estimate* whose error depends entirely on bucket placement: a sensible layout reported p99 within 2.8% and **p95 25.7% too high**, a coarse one put p50 **31.6% too high**, and a layout whose last finite bucket sat below the tail could not report p95 or p99 at all — `histogram_quantile` returned **+Inf**.",

  objectives: [
    "Explain why percentiles cannot be averaged, and write the correct aggregation",
    "Quantify a histogram quantile's error and attribute it to bucket placement",
    "Choose bucket boundaries from a measured latency distribution",
    "Recognise when a reported quantile is structurally unable to be right"
  ],

  prerequisites: ["7.1"],

  blocks: [

    { t: "h2", n: "01", id: "why", text: "Why the mean is not the metric",
      sub: "A short detour that justifies the rest" },

    { t: "p", text: "Lesson 2.1 measured a warm p50 of **1.94 ms** and a p99 of **3.08 ms** on an idle machine. Under real load the gap widens, and the mean sits near the p50 — so a mean latency graph is a graph of the experience of the median user, which is the user who has no complaint." },

    { t: "p", text: "The arithmetic that makes this urgent: at a 1% failure-to-meet-latency rate, a page composed of **twenty** backend calls has a roughly **1 − 0.99²⁰ ≈ 18%** chance of containing at least one slow call. The tail is not a rare event at the page level; it is the common case. Which is why the rest of this lesson is about getting tail numbers right rather than about whether to look at them." },

    { t: "h2", n: "02", id: "average", text: "You cannot average percentiles",
      sub: "Measured at 46.4% wrong" },

    { t: "p", text: "Three replicas, nine thousand requests each. One light, one heavier, one with a slow dependency affecting a small fraction of its traffic — the realistic case, because a bad node or a cold cache does not affect every replica equally." },

    { t: "code", lang: "python", title: "m7.py — three replicas, two ways of combining them",
      code: `reps = {
    "replica-a (light)": rng.lognormal(np.log(0.0018), 0.30, 9000),
    "replica-b (heavy)": rng.lognormal(np.log(0.0026), 0.45, 9000),
    "replica-c (one slow dep)": np.concatenate([
        rng.lognormal(np.log(0.0019), 0.30, 8500),
        rng.lognormal(np.log(0.060), 0.40, 500)]),
}
per = {k: float(np.percentile(v, 99)) for k, v in reps.items()}
mean_of_p99     = float(np.mean(list(per.values())))
true_pooled_p99 = float(np.percentile(np.concatenate(list(reps.values())), 99))`,
      out: `== 3. mean(p99) is not p99 ==
  replica-a (light)          p99    3.604 ms   (n=9000)
  replica-b (heavy)          p99    7.348 ms   (n=9000)
  replica-c (one slow dep)   p99   85.664 ms   (n=9000)

  mean of the three p99s        32.205 ms   <- what a dashboard shows
  true p99 of pooled traffic    60.098 ms   <- what users experience
  error                         -46.4%` },

    { t: "p", text: "**32.205 ms against 60.098 ms.** The dashboard understates the tail by nearly half, and it does so in the direction that matters: it reports the service as roughly twice as healthy as it is." },

    { t: "p", text: "The reason is that a percentile is a **position in a sorted list**, and positions do not combine linearly. Averaging replica-c's 85.664 ms with two small numbers dilutes it — but replica-c's slow requests are *real requests from real users*, and in the pooled distribution they occupy their actual share of the tail. The averaging operation discards the fact that each replica's p99 describes a different number of underlying observations in a different part of the combined range." },

    { t: "callout", kind: "trap", title: "A weighted average does not fix it either",
      body: [
        { t: "p", text: "The natural next thought is to weight by request count. Here the counts are **identical at 9,000 each**, so a weighted average gives exactly the same 32.205 ms. The error is not about weighting; it is that the operation is undefined." },
        { t: "p", text: "There is no function of three p99 values that yields the pooled p99, because the p99s do not contain the information needed — you would have to know the shape of each distribution, which is precisely what a single quantile throws away." }
      ] },

    { t: "p", text: "And the correct aggregation, measured on the same data:" },

    { t: "code", lang: "python", title: "m7.py — sum the buckets, then take the quantile",
      code: `# histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))
agg_counts = cumulative(agg_bounds, pooled)
est_agg = hist_quantile(agg_bounds, agg_counts, 0.99)`,
      out: `  the fix: sum the BUCKETS across replicas, then take the quantile.
  histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))
  from summed buckets           61.706 ms   error +2.7%` },

    { t: "p", text: "**61.706 ms, within 2.7% of the truth.** Buckets are cumulative counts, so adding them across replicas reconstructs the pooled distribution — and the quantile is then computed once, from the combined thing. This is the entire reason lesson 7.1 insisted on a histogram rather than a summary." },

    { t: "diagram", kind: "compare", id: "dg-7_2-02-0",
      title: "The two orders of operation",
      caption: "The difference is whether the quantile is computed **before** or **after** the combination. **Quantile-then-average is 46.4% wrong; combine-then-quantile is 2.7% off** — and the residual 2.7% is bucket error, which is section 3.",
      columns: [
        { title: "avg(histogram_quantile(...)) — wrong", items: [
          "quantile per replica, then averaged",
          "3.604, 7.348, 85.664 ms",
          "reported: 32.205 ms",
          "truth: 60.098 ms",
          "error: -46.4%, understating the tail",
          "weighting does not help: counts were equal"
        ] },
        { title: "histogram_quantile(sum(...)) — right", items: [
          "buckets summed by le, then one quantile",
          "cumulative counts add exactly",
          "reported: 61.706 ms",
          "truth: 60.098 ms",
          "error: +2.7%, from bucket placement",
          "the reason to use a histogram, not a summary"
        ] }
      ] },

    { t: "h2", n: "03", id: "buckets", text: "A histogram quantile is an estimate",
      sub: "And the error is a design decision" },

    { t: "p", text: "That residual 2.7% is not noise — it is interpolation error. A histogram knows only how many observations fell into each bucket, so `histogram_quantile` locates the bucket containing the quantile and **interpolates linearly within it**, assuming the observations are spread evenly across the bucket. They are not." },

    { t: "p", text: "So the error is governed by how wide the relevant bucket is, which is a choice you make at instrumentation time. Three layouts over the same 20,000 samples:" },

    { t: "code", lang: "python", title: "m7.py — the same data, three bucket layouts",
      out: `  true quantiles from the raw samples:
    p50    1.965 ms   p95    3.888 ms   p99   25.947 ms

  bucket layout                          p50 err     p95 err     p99 err
  good (spans the tail)                      -0.2%      +25.7%       +2.8%
  default-ish (too coarse)                  +31.6%      +26.4%       +2.8%
  truncated (tail past the last bucket)      -0.2%   +Inf        +Inf` },

    { t: "p", text: "Three separate lessons in that table." },

    { t: "p", text: "**The good layout is 25.7% wrong at p95.** It reports p50 almost exactly and p99 within 2.8%, and still misses p95 by a quarter — because the true p95 of 3.888 ms falls in the wide `0.002 → 0.005` bucket, and linear interpolation across a 3 ms span cannot place it well. A layout that is right for two quantiles can be poor for a third." },

    { t: "p", text: "**The coarse layout puts p50 31.6% too high.** Its first bucket is `0.005`, above the true median of 1.965 ms, so every observation below 5 ms is in one undifferentiated bucket and the interpolation has nothing to work with. This is what happens when default buckets, designed for web requests measured in hundreds of milliseconds, are used for a service whose p50 is 2 ms." },

    { t: "p", text: "**The truncated layout cannot report p95 or p99 at all.** Its last finite bucket is 3 ms, so the quantile falls in the `+Inf` bucket and `histogram_quantile` returns **+Inf**. Not an error, not a warning — a graph showing infinity, or more often a gap where the panel renders nothing." },

    { t: "callout", kind: "insight", title: "+Inf on a latency panel means your buckets end before your tail",
      body: [
        { t: "p", text: "This is worth recognising on sight, because it is diagnosable in seconds and otherwise looks like a broken dashboard. If `histogram_quantile` returns `+Inf`, the quantile you asked for lies above the largest finite bucket boundary — the data is there, in `le=\"+Inf\"`, but with no upper bound to interpolate toward." },
        { t: "p", text: "The corollary is that **your largest finite bucket is the largest latency you can ever report**. A layout topping out at 100 ms tells you nothing about the difference between a 200 ms request and a 10-second one, which is precisely the distinction an incident turns on." }
      ] },

    { t: "h2", n: "04", id: "choosing", text: "Choosing buckets",
      sub: "From a measurement, and with the SLO threshold in the list" },

    { t: "p", text: "The procedure is mechanical once you accept that it needs a measurement first." },

    { t: "diagram", kind: "steps", id: "dg-7_2-04-0",
      title: "Four steps to a bucket layout",
      caption: "The third step is the one that is almost always skipped and is free. **A bucket boundary exactly at the SLO threshold makes the SLO ratio exact** rather than interpolated, which matters because that number gates alerts.",
      items: [
        { label: "Measure the real distribution first", desc: "Lesson 2.1's p50 was 1.94 ms and p99 3.08 ms. Default buckets starting at 5 ms would have reported p50 31.6% high." },
        { label: "Space them geometrically, roughly 2x", desc: "Latency is lognormal, so equal ratios give equal relative resolution: 1, 2, 5, 10, 25, 50, 100, 250 ms." },
        { label: "Put a boundary ON the SLO threshold", desc: "An SLO of 25 ms wants an le=0.025 bucket, so the good-request ratio is an exact count rather than an interpolation." },
        { label: "Extend past the worst tail you care about", desc: "The largest finite bucket is the largest value you can report, and beyond it histogram_quantile returns +Inf." }
      ] },

    { t: "p", text: "Step three deserves emphasis because it changes an SLO from an estimate into a count. With a boundary at exactly the threshold, *the fraction of requests faster than 25 ms* is `bucket{le=\"0.025\"} / count` — two numbers divided, no interpolation, no bucket-width error. Lesson 7.4's burn-rate alerting is computed from that ratio, so an interpolation error there propagates into when you get paged." },

    { t: "callout", kind: "good", title: "Native histograms remove most of this, where available",
      body: [
        { t: "p", text: "Prometheus's native (sparse) histograms replace fixed boundaries with exponential buckets generated automatically at a configured resolution, giving bounded relative error across the whole range without choosing boundaries at all. They also cost far fewer series, since buckets are only materialised where observations land — which eases lesson 7.1's cardinality arithmetic considerably." },
        { t: "p", text: "The caveat is adoption: it needs a recent Prometheus with the feature enabled, client library support, and query and dashboard tooling that understands the type. Worth planning toward; the four steps above are what you do until then, and they are what the installed `prometheus_client` exposes." }
      ] },

    { t: "h2", n: "05", id: "reading", text: "Reading a tail honestly",
      sub: "Three habits" },

    { t: "p", text: "**Quote the window with the quantile.** A p99 over five minutes and a p99 over a day are different numbers, and the longer window hides the spike. *p99 was 60 ms* is incomplete; *p99 over 5 minutes peaked at 60 ms* is a claim." },

    { t: "p", text: "**Watch for the Simpson's-paradox shape**, which is what replica-c was. Fleet p99 can look acceptable while one replica, one model version or one region is far worse — and the fleet number is correct, so nothing is wrong with the measurement. Breaking the panel down by the labels lesson 7.1 recommended is what surfaces it, and during a canary (lesson 3.3) it is the entire point of labelling by model version." },

    { t: "p", text: "**Do not alert on a quantile directly.** A p99 threshold fires when the tail moves for any reason, including a change in traffic mix, and it says nothing about how much harm has accrued. Lesson 7.4's burn rate, computed from the exact-boundary ratio above, is the thing to page on." },

    { t: "exercise", kind: "practice", title: "Audit your own latency panels", difficulty: "core", minutes: 30,
      prompt: "Find every dashboard panel showing a percentile and check three things. Is the expression `histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))`, or is it an average or a max of per-instance quantiles — the latter is the 46.4% error measured here. Does any panel show `+Inf` or render empty, which means your buckets end before your tail. And compare your bucket boundaries against your measured p50 and p99: if your first boundary is above your p50, your median is reported substantially high. Then check whether a boundary sits exactly on your SLO threshold, and if not, add one.",
      hints: [
        "`avg by (...) (histogram_quantile(...))` is the wrong-order signature; the sum must be inside.",
        "An empty latency panel is more often a bucket problem than a missing metric — check `le=\"+Inf\"` against your largest finite bucket.",
        "The SLO-boundary change is free at instrumentation time and makes the alerting ratio exact rather than interpolated."
      ],
      solution: {
        body: [
          { t: "p", text: "The wrong-order aggregation is common because it reads naturally and the numbers look plausible — understating the tail by 46% does not produce an obviously absurd graph, it produces a reassuring one. That is what makes it worth grepping for rather than eyeballing." },
          { t: "p", text: "The bucket-versus-measurement comparison usually finds default boundaries designed for hundred-millisecond web requests on a service whose p50 is a couple of milliseconds, which is the 31.6% p50 error measured here. Re-bucketing loses history, so it is worth doing once, deliberately, with the SLO boundary included." }
        ]
      } }

  ],

  takeaways: [
    "**A mean latency graph describes the median user, who has no complaint** — and at a 1% slow rate a twenty-call page is ~18% likely to contain a slow call.",
    "**You cannot average percentiles**: the mean of three replicas' p99s was 32.205 ms against a true pooled p99 of 60.098 ms — **46.4% understated**, in the reassuring direction.",
    "**A weighted average does not fix it.** The three replicas had identical counts, so weighting gives the same number; the operation is undefined, not mis-weighted.",
    "**The correct form is `histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))`** — sum the cumulative buckets, then take one quantile. Measured at 61.706 ms, +2.7%.",
    "**That 2.7% is interpolation error, not noise**: a histogram interpolates linearly inside the bucket containing the quantile, assuming an even spread that does not exist.",
    "**A layout that is right for two quantiles can be poor for a third** — the good layout was -0.2% at p50 and +2.8% at p99 while being **+25.7% at p95**.",
    "**Default buckets designed for web requests put p50 31.6% too high** on a service whose median is 2 ms, because the first boundary sat above it.",
    "**Your largest finite bucket is the largest latency you can report.** Past it, `histogram_quantile` returns **+Inf** — which is why a latency panel renders empty.",
    "**Measure the distribution before choosing boundaries**, space them geometrically at roughly 2x because latency is lognormal, and extend past the worst tail you care about.",
    "**Put a boundary exactly on the SLO threshold**, which makes the good-request ratio an exact count rather than an interpolation — and lesson 7.4's burn rate is computed from it.",
    "**Native histograms remove most of this** with automatic exponential buckets and far fewer series, where your Prometheus and tooling support them.",
    "**Quote the window with the quantile**, break panels down by label to catch one bad replica or version, and alert on burn rate rather than on a quantile threshold."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A dashboard shows `avg by (service) (histogram_quantile(0.99, rate(bucket[5m])))` across ten replicas. What is wrong?",
        options: [
          "The window is too short for ten replicas",
          "The quantile is computed per replica and then averaged — measured at 46.4% understated against the pooled truth, because a percentile is a position and positions do not average",
          "`avg` should be `max` to capture the worst replica"
        ],
        answer: 1,
        why: "The sum must be inside: `histogram_quantile(0.99, sum(rate(bucket[5m])) by (le))`, which reconstructs the pooled distribution from the cumulative buckets and was accurate to +2.7%. `max` is also wrong — it reports one replica's tail, not what users experienced."
      },
      {
        stem: "Your p99 latency panel displays `+Inf`. What does that tell you?",
        options: [
          "No requests were observed in the window",
          "The p99 lies above your largest finite bucket boundary, so there is no upper bound to interpolate toward — the observations are in `le=\"+Inf\"` with no resolution",
          "The metric was registered as a Summary rather than a Histogram"
        ],
        answer: 1,
        why: "Measured: a layout whose last finite bucket was 3 ms returned +Inf for both p95 and p99. The data exists but the bucket layout cannot resolve it, which is why the largest finite boundary is the largest latency you can ever report."
      },
      {
        stem: "Your service's measured p50 is 2 ms. Your histogram's first bucket boundary is 5 ms. What happens to the reported p50?",
        options: [
          "It is reported accurately, since the median falls within the first bucket",
          "It is substantially overstated — measured at +31.6% — because every observation under 5 ms is in one undifferentiated bucket and interpolation has nothing to work with",
          "It is reported as 0, since no bucket boundary is below it"
        ],
        answer: 1,
        why: "This is what happens when default buckets intended for hundred-millisecond web requests are applied to a millisecond-scale service. Boundaries have to come from a measurement of the actual distribution, spaced geometrically, with one on the SLO threshold."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Why can't you average percentiles across instances?",
        strong: "Because a percentile is a position in a sorted distribution, and positions do not combine linearly. I measured three replicas whose p99s were 3.6, 7.3 and 85.7 ms: the average is 32.2 ms and the true p99 of the pooled traffic is 60.1 — a 46% understatement, and in the reassuring direction, so the dashboard reports the service as about twice as healthy as it is. Weighting by request count does not help; in my case the counts were identical, so a weighted average gives exactly the same wrong number. The operation is undefined rather than mis-weighted — three p99 values simply do not contain the information needed to reconstruct the pooled one. The fix is to sum the histogram buckets across instances and then take the quantile once, which measured within 2.7%.",
        answer: [
          { t: "p", text: "The numbers make this undeniable, and noting the direction of the error — reassuring rather than alarming — explains why the mistake survives on dashboards for years." },
          { t: "p", text: "Pre-empting the weighted-average suggestion is worth doing, because it is the first thing most interviewers will propose." }
        ]
      },
      {
        level: "senior",
        q: "How do you choose histogram buckets?",
        strong: "From a measurement of the real distribution, which is the step people skip. I measured a service with a p50 near 2 ms and a long tail; the default buckets, designed for hundred-millisecond web requests, reported the p50 31.6% too high because the first boundary sat above it. So: measure p50 through p99 first, then space boundaries geometrically at roughly 2x, because latency is lognormal and equal ratios give equal relative resolution. Put a boundary exactly on the SLO threshold, which makes the good-request ratio an exact count rather than an interpolation — that matters because burn-rate alerting is computed from that ratio, so bucket error propagates into when you get paged. And extend past the worst tail you care about, because the largest finite bucket is the largest value you can ever report; beyond it histogram_quantile returns +Inf, which is usually diagnosed as a broken dashboard. I would also accept that one layout cannot be optimal everywhere: mine was accurate at p50 and p99 and 25.7% off at p95.",
        answer: [
          { t: "p", text: "The SLO-boundary point is the one most people have never considered and it is free, which makes it a strong thing to raise." },
          { t: "p", text: "Admitting that a single layout is 25.7% wrong somewhere is honest and shows the error is understood as structural rather than as a bug to eliminate." }
        ]
      }
    ]
  }
});
