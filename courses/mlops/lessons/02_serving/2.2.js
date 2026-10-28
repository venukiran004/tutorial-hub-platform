EC.receiveLesson({
  id: "2.2",

  lede: "The four monitoring layers are always drawn as a stack of equal boxes. They are not equal — they differ by **115,889 times** in how long they take to notice something. At twenty requests a second, a traffic collapse is detectable in **5 seconds**, an error-rate jump in **34 seconds**, a one-feature distribution shift in **16.7 minutes**, and a five-point accuracy drop in **45 days**, because the labels have to arrive first. The layer that proves harm is the slowest one you have, by five orders of magnitude, and that single fact determines how an ML monitoring stack has to be designed.",

  objectives: [
    "Name the four monitoring layers and the question each one answers",
    "Compute how long each layer takes to detect a real change, from a power calculation rather than intuition",
    "Explain why a detector firing once is not the same as a detector with power",
    "Design a stack that uses fast proxies for paging and slow truth for retraining decisions"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", id: "layers", text: "Four layers, four questions",
      sub: "And four different owners" },

    { t: "p", text: "Everything a deployed model emits falls into one of four layers. The reason to separate them is not taxonomy — it is that each answers a different question, is owned by different people, and as the rest of this lesson measures, operates on a wildly different clock." },

    { t: "dl", items: [
      { k: "Infrastructure", v: "Is the service up and responding? Error rate, latency percentiles, CPU, memory, restarts, saturation. Owned by whoever is on call; this is ordinary SRE and the tooling is mature." },
      { k: "Traffic", v: "Is it being used as expected? Request volume, caller mix, payload shapes, rate-limit rejections. Catches an upstream outage and a client that changed behaviour." },
      { k: "Data", v: "Do the inputs look like what the model was trained on? Null rates, ranges, cardinality, distribution. This is lesson 1.5's validator running continuously rather than at ingestion." },
      { k: "Model quality", v: "Are the predictions right? Accuracy, AUC, calibration — and the business metric that proves harm. Requires labels, which is the whole problem." }
    ] },

    { t: "p", text: "Teams buy the fourth layer and under-build the third, which is backwards for a reason worth stating plainly: the fourth is the only one that answers the question you actually care about, and it is the one you cannot have promptly. So the stack has to be designed around that constraint rather than in spite of it." },

    { t: "h2", n: "02", id: "clocks", text: "How long each layer takes to notice",
      sub: "A power calculation, not an opinion" },

    { t: "p", text: "*How fast does this layer detect a problem* is usually answered by intuition. It is a statistics question with an actual number. For each layer: how many observations are needed to detect a realistic change at 80% power, and how long does that take to accumulate at twenty requests a second — a service doing 1.73 million predictions a day." },

    { t: "code", lang: "python", title: "m22.py — sample size for a two-proportion test",
      code: `def n_for_proportion(p0, p1, alpha=0.01, power=0.80):
    """Two-proportion z-test sample size, per group."""
    za = stats.norm.ppf(1 - alpha / 2.0)
    zb = stats.norm.ppf(power)
    pbar = (p0 + p1) / 2.0
    num = (za * np.sqrt(2 * pbar * (1 - pbar)) + zb *
           np.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2
    return int(np.ceil(num / (p1 - p0) ** 2))

n_infra = n_for_proportion(0.001, 0.020)      # error rate 0.1% -> 2%
n_model = n_for_proportion(0.7167, 0.7667)    # accuracy -5 points`,
      out: `== how long each layer takes to notice, at 20 requests/second ==
  layer            the change it detects              obs needed  time to obs  + label delay
  Infrastructure   error rate 0.1% -> 2%                     671  34 s         -
  Traffic          request volume -30%                       100  5 s          -
  Data             KS on one feature, month-1 shift        20000  16.7 min     -
  Model quality    accuracy 0.7667 -> 0.7167                1789  89 s         45.0 days` },

    { t: "p", text: "Read the last two columns together, because the gap between them is the lesson. Model quality needs only **1,789 labelled rows** — ninety seconds of traffic. But a loan performs or defaults months after the decision, so those rows do not exist for **45 days**. The statistics are cheap; the labels are not." },

    { t: "code", lang: "python", title: "m22.py — the spread",
      out: `== the spread ==
  fastest layer to notice : 34 s  (Infrastructure)
  slowest layer to notice : 45.0 days  (Model quality)
  ratio                   : 115889x` },

    { t: "diagram", kind: "layers", id: "dg-2_2-02-0",
      title: "The four layers, on the clock each one actually runs at",
      caption: "Drawn to the measured detection times rather than as equal boxes. **The layers you can afford to watch continuously are the ones that cannot tell you whether the model is right**, and the one that can is five orders of magnitude slower.",
      items: [
        { label: "Model quality: 45 days (labels gate it)", desc: "1,789 labelled rows is 89 s of traffic. The delay is entirely the label, not the statistics. The only layer that proves harm." },
        { label: "Data: 16.7 minutes for 80% power", desc: "20,000 samples to detect month 1's shift reliably. No labels needed, and per lesson 1.1 it can be anti-correlated with harm." },
        { label: "Infrastructure: 34 seconds", desc: "671 requests to detect an error rate going 0.1% to 2%. Mature tooling, immediate, and blind to every ML failure in module 1." },
        { label: "Traffic: 5 seconds", desc: "100 requests to see a 30% volume drop. The fastest signal, and it says nothing about correctness." }
      ] },

    { t: "h2", n: "03", id: "power", text: "Firing once is not detecting",
      sub: "The twenty thousand samples nobody budgets for" },

    { t: "p", text: "The data layer's figure deserves a closer look, because it contradicts something lesson 1.1 appeared to show. There, a KS test on 4,000 samples fired at month 2 with p = 2.6e-04. Here, detecting the *month-1* shift at 80% power needs **20,000**. Both are true, and the difference between them is the most misunderstood thing about drift detection." },

    { t: "code", lang: "python", title: "m22.py — the power curve for a small shift",
      code: `def ks_power(n, trials=120, alpha=0.01):
    hits = 0
    for _ in range(trials):
        a = rng.choice(ref, size=n, replace=True)
        b = rng.choice(shifted, size=n, replace=True)
        if stats.ks_2samp(a, b).pvalue < alpha:
            hits += 1
    return hits / float(trials)`,
      out: `== the data layer's power curve, month-1 shift (KS D ~ 0.022) ==
     samples   power  time to collect at 20 rps
         500   0.00   25 s
        1000   0.05   50 s
        2000   0.05   1.7 min
        5000   0.16   4.2 min
       10000   0.41   8.3 min
       20000   0.88   16.7 min
       50000   1.00   41.7 min
      100000   1.00   83.3 min` },

    { t: "p", text: "At 10,000 samples the power is **0.41** — the test detects a shift that is genuinely there **less than half the time**. At 2,000 it is 0.05, which is indistinguishable from the false-positive rate: the test is not detecting anything, it is occasionally guessing." },

    { t: "callout", kind: "insight", title: "A detector with power 0.41 produces a random alert schedule",
      body: [
        { t: "p", text: "Run an hourly drift check on 2,000 samples against a persistent real shift and it fires on roughly one hour in twenty — not because the shift comes and goes, but because the test is underpowered. The on-call engineer sees an alert that appears and clears with no corresponding change in the world, which is precisely how a monitor loses credibility." },
        { t: "p", text: "The fix is not a better statistic. It is a bigger window, or a smaller alpha with an explicitly accepted minimum detectable shift. Lesson 11.2 takes the three drift statistics apart and shows where each threshold comes from; the point here is that **window size is a design parameter with a power consequence**, not an implementation detail." }
      ] },

    { t: "h2", n: "04", id: "proxy", text: "The proxy in between",
      sub: "Fast, free, and silent when it matters" },

    { t: "p", text: "Between the layers you can compute instantly and the layer that needs labels sits one signal that needs no labels and is nearly immediate: the model's own output distribution." },

    { t: "code", lang: "python", title: "m22.py — the prediction rate as a proxy",
      out: `== the proxy in between: prediction rate ==
  approval rate 0.45 -> 0.40 needs 2282 predictions = 1.9 min
  no labels required -- which is why it is the standard fallback.
  Lesson 1.1 measured it staying at 0.450 through a 20-point collapse,
  so it is fast, free, and silent exactly when you need it.` },

    { t: "p", text: "A five-point move in the approval rate is detectable in **1.9 minutes** with no labels whatsoever. That is why prediction-distribution monitoring is the standard recommendation, and it is good advice — it catches the unit-change disaster from lesson 1.5, where the approval rate collapsed from 0.447 to 0.036 and would have paged within minutes." },

    { t: "p", text: "And it is the signal that lesson 1.1 measured **staying at 0.450 while accuracy fell twenty points**, because a model that approves the same share of applicants and the wrong ones has an unchanged output distribution. So the proxy is fast, free, and specifically blind to the failure mode that most needs catching." },

    { t: "diagram", kind: "matrix", id: "dg-2_2-04-0",
      title: "Every signal in this course so far, against what it catches",
      caption: "Assembled from the measurements in 1.1, 1.5 and this lesson. **No single row is adequate, and the fast rows are fast precisely because they are not asking about correctness.** The stack has to be read as a set.",
      rows: ["Error rate / latency", "Request volume", "Input distribution", "Prediction distribution", "Accuracy / AUC"],
      cols: ["Detects in", "Blind to"],
      cells: [
        [{ text: "34 s", tone: "good" }, { text: "every failure in module 1", tone: "crit" }],
        [{ text: "5 s", tone: "good" }, { text: "correctness entirely", tone: "crit" }],
        [{ text: "16.7 min at 80% power", tone: "warn" }, { text: "concept drift: 1.1's World B", tone: "crit" }],
        [{ text: "1.9 min, no labels", tone: "good" }, { text: "approving the wrong 45%", tone: "crit" }],
        [{ text: "45 days (label delay)", tone: "crit" }, { text: "nothing — but arrives far too late", tone: "good" }]
      ] },

    { t: "h2", n: "05", id: "design", text: "What follows for the stack",
      sub: "Page on the fast, retrain on the slow" },

    { t: "p", text: "The measurements settle a design question that is otherwise argued about by preference. Because the fast signals cannot establish harm and the slow signal cannot be timely, you cannot use one mechanism for both paging and deciding — and most stacks fail by trying." },

    { t: "diagram", kind: "steps", id: "dg-2_2-05-0",
      title: "A stack built around the 115,889x spread",
      caption: "The division of labour the numbers force: **fast signals wake people, slow signals change models.** Conflating them gives you either a pager that fires on nothing or a retrain decision made on no evidence.",
      items: [
        { label: "Page on infrastructure and traffic", desc: "34 s and 5 s to detect, unambiguous, and actionable. Ordinary SRE, held to SRE standards." },
        { label: "Page on the prediction distribution", desc: "1.9 min for a 5-point move, no labels. Catches lesson 1.5's unit change, where approvals fell 0.447 to 0.036." },
        { label: "Alert, do not page, on input drift", desc: "16.7 min for 80% power, and 1.1 saw it fire for 11 months while accuracy held. A ticket, not a page." },
        { label: "Gate retraining on labels and the business metric", desc: "45 days, and worth the wait because it is the only thing that establishes harm. Never retrain on a drift alert alone." }
      ] },

    { t: "callout", kind: "good", title: "The thing to build first is the prediction log",
      body: [
        { t: "p", text: "Every number above is computable **after the fact** if, and only if, the inputs, the output, the model version and a timestamp were recorded at prediction time. The 45-day label delay is survivable: the labels arrive, join to the log, and accuracy becomes computable for a period that has already passed." },
        { t: "p", text: "Without the log, the delay is not a delay but a permanent absence — the labels arrive and there is nothing to join them to. That is why lesson 16.2 treats the prediction log as the artifact everything else is derived from, and why it is the right first investment rather than a monitoring product." }
      ] },

    { t: "p", text: "One last caveat on the arithmetic. Every figure here assumes twenty requests a second and independent observations. At two requests a second, multiply every detection time by ten — and the data layer's 16.7 minutes becomes nearly three hours, which changes what is worth alerting on. Correlated traffic makes it worse: a thousand predictions for one customer in one session are nowhere near a thousand independent observations." },

    { t: "exercise", kind: "practice", title: "Put your own four layers on the clock", difficulty: "core", minutes: 30,
      prompt: "For a model you operate, compute four detection times rather than estimating them. Take your actual request rate. For infrastructure, pick a realistic error-rate change and compute the sample size. For the data layer, take your main feature and run the power curve from this lesson over your own reference window — find the N at which power reaches 0.80, then convert to wall-clock. For prediction distribution, compute the sample size for a 5-point move in your positive rate. For model quality, write down your label delay honestly, in days. Then look at your current alert rules and ask which of them is paging on a signal whose power you have just computed to be under 0.5.",
      hints: [
        "If your drift window is a day of data, compute the power at that N before trusting any alert from it.",
        "Count independent observations, not requests — many predictions for one user in one session are close to one observation.",
        "A label delay you cannot state in days is the finding, not an obstacle to the exercise."
      ],
      solution: {
        body: [
          { t: "p", text: "The two usual discoveries: the label delay is far longer than anyone says out loud, and at least one existing alert is computed on a window with power well under 0.5 — which explains an alert that has a reputation for being flaky without anyone having diagnosed why." },
          { t: "p", text: "The useful output is a table of four times. It makes the design argument for you: the signals fast enough to page on are the ones that cannot establish harm, so paging and retraining need separate triggers, and the prediction log is what makes the slow one usable at all." }
        ]
      } }

  ],

  takeaways: [
    "**Four layers**: infrastructure, traffic, data, model quality — four questions, four owners, and four very different clocks.",
    "**The spread is 115,889x**: traffic 5 s, infrastructure 34 s, data 16.7 min, model quality 45 days at twenty requests a second.",
    "**Model quality needs only 1,789 labelled rows — 89 seconds of traffic.** The 45 days is entirely label delay; the statistics are cheap and the labels are not.",
    "**Firing once is not detecting.** The month-1 shift fired at n=4,000 in lesson 1.1, but reaching 80% power needs n=20,000.",
    "**At n=10,000 the power is 0.41** — a real, persistent shift is missed more often than caught, which produces an alert that appears and clears at random.",
    "**Window size is a design parameter with a power consequence**, not an implementation detail. Compute the power before trusting the alert.",
    "**The prediction distribution is the useful proxy**: a 5-point move detectable in 1.9 minutes with no labels, and it would have caught lesson 1.5's unit change within minutes.",
    "**And it is specifically blind to the worst case** — 1.1 measured it holding at 0.450 while accuracy fell twenty points, because approving the wrong 45% looks identical.",
    "**Page on the fast signals, gate retraining on the slow one.** The fast ones cannot establish harm; the slow one cannot be timely. One mechanism cannot do both.",
    "**Never retrain on a drift alert alone** — lesson 1.1's World A would have triggered eleven consecutive months of unnecessary retraining.",
    "**The prediction log is what makes the 45-day delay survivable**: labels arrive, join to the log, and accuracy becomes computable for a period already past. Without it the delay is a permanent absence.",
    "**All of these scale with your request rate and independence.** At 2 rps multiply by ten; correlated sessions are far fewer independent observations than they look."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does model-quality monitoring take 45 days here when the statistics need only 1,789 rows — 89 seconds of traffic?",
        options: [
          "Because accuracy is expensive to compute at scale",
          "Because the labels do not exist yet — a loan performs or defaults months after the decision, so the delay is the label, not the statistics",
          "Because 1,789 rows is not enough for a reliable accuracy estimate"
        ],
        answer: 1,
        why: "This separation matters: the sample size is trivially achievable and the wait is entirely about ground truth arriving. It is also why the prediction log is the key investment — the labels can be joined retrospectively, making accuracy computable for a past period rather than lost."
      },
      {
        stem: "Your drift check runs hourly on 2,000 samples and fires about once a day, inconsistently. The underlying shift is real and persistent. What is happening?",
        options: [
          "The shift is intermittent, appearing and disappearing",
          "The test is underpowered at that window size — power was 0.05 at n=2,000 and 0.41 at n=10,000, so it detects a persistent shift only occasionally",
          "The alpha threshold is set too low"
        ],
        answer: 1,
        why: "An underpowered test produces a random-looking alert schedule against a constant world, which is how monitors lose credibility. The fix is a larger window or an explicitly accepted minimum detectable shift, not a different statistic."
      },
      {
        stem: "Which signal should trigger an automatic retrain?",
        options: [
          "A statistically significant input drift alert",
          "None on its own — drift alerts fired for 11 months in lesson 1.1 while accuracy held, so retraining should be gated on labels or a business metric that establishes harm",
          "A 5-point move in the prediction distribution"
        ],
        answer: 1,
        why: "Retraining on input drift alone would have triggered eleven unnecessary cycles in World A, each one a cost and a risk. Fast signals are for paging a human; the decision to change the model needs evidence of harm, which means labels or a downstream business metric."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What would you monitor for a model in production?",
        strong: "Four layers, and I would be explicit that they run on different clocks. Infrastructure — errors, latency, saturation — detects in seconds and is blind to every ML failure. Traffic — volume and caller mix — is the fastest signal and says nothing about correctness. Data — nulls, ranges, distributions — needs no labels but, when I measured it, needed 20,000 samples for 80% power on a small shift, about seventeen minutes of traffic. Model quality is the only layer that establishes harm and it needed 45 days here, because that is when the loan labels arrive. So I would page on the first two plus the prediction distribution, alert on input drift, and gate retraining on labels.",
        answer: [
          { t: "p", text: "Giving the four layers with their detection times turns a standard list into evidence of having operated something. The 115,889x spread is the number to have ready." },
          { t: "p", text: "The design conclusion — page on fast, decide on slow — is what the interviewer is actually looking for, because it is the thing that most stacks get wrong." }
        ]
      },
      {
        level: "senior",
        q: "We have no labels for months. How do you know the model is still working?",
        strong: "I accept that I cannot know, and build so that I will know retrospectively and have a proxy meanwhile. Retrospectively means the prediction log: inputs, output, model version, timestamp and correlation id recorded at prediction time, so when labels arrive they join and accuracy becomes computable for a period already past. Without the log the delay is not a delay, it is permanent. For the meantime, the prediction distribution is the cheapest proxy — a five-point move in the positive rate is detectable in under two minutes with no labels, and it would have caught a unit-change incident I measured where the approval rate fell from 0.45 to 0.04. But I would be honest that it is blind to the worst case: I have measured a model holding its approval rate at 0.450 while accuracy fell twenty points. So I would also want a human-review sample and a downstream business metric, because those are the only fast signals correlated with harm.",
        answer: [
          { t: "p", text: "The structure — retrospective truth plus a fast proxy, with the proxy's blind spot named — is what makes this senior. Most answers offer drift detection and stop." },
          { t: "p", text: "A review sample is the detail worth volunteering: a hundred predictions a week adjudicated by a human is a real labelled stream with a one-week delay rather than a forty-five-day one." }
        ]
      },
      {
        level: "senior",
        q: "An on-call engineer says the drift alerts are noise and wants them turned off. How do you respond?",
        strong: "I would probably agree they should stop paging, and then fix the two reasons they are noisy. First, power: if the alert is computed on a window where the test's power is 0.4, it fires inconsistently against a constant world, which is indistinguishable from noise — I would compute the power curve and resize the window or state a minimum detectable shift explicitly. Second, relevance: input drift is often harmless. I measured a case where a KS test fired for eleven consecutive months, reaching p of 1e-87, while accuracy was flat and AUC improved. An alert that cannot establish harm should be a ticket, not a page. What should page is a prediction-distribution move, which is nearly as fast and much more closely tied to something being wrong.",
        answer: [
          { t: "p", text: "Conceding the operational point before fixing the engineering is the right instinct; defending a noisy page costs you the credibility of every other alert you own." },
          { t: "p", text: "Separating the two causes — underpowered versus irrelevant — is the diagnostic that matters, because they have completely different fixes and teams usually only consider the second." }
        ]
      }
    ]
  }
});
