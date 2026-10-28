EC.receiveLesson({
  id: "7.4",

  lede: "A static threshold gets severity wrong in both directions, and the measurement shows it cleanly. Against a 99.9% SLO, a *slight elevation* at **0.2% bad requests** consumes the entire month's error budget in **360 hours** and never trips a 1% alert; a real incident at 2% burns it in **36 hours** and an outage at 35% burns it in **2.1 hours** — and the static rule fires at the same severity for both. **Burn rate** — the bad rate divided by the budget — makes the number mean something operationally: 20× and 350× are obviously different emergencies, where *above 1%* is one undifferentiated alert.",

  objectives: [
    "Compute an error budget and a burn rate from an SLO",
    "Choose multi-window burn-rate thresholds and say what each one is for",
    "Design an alert that fires on user-visible harm rather than on a resource number",
    "Build a dashboard that shortens an incident instead of decorating it"
  ],

  prerequisites: ["7.3"],

  blocks: [

    { t: "h2", n: "01", id: "budget", text: "The budget is a quantity you can spend",
      sub: "Which is what makes it useful" },

    { t: "p", text: "An SLO states a target: *99.9% of predictions return in under 25 ms, measured over 30 days.* The complement is the **error budget** — the 0.1% you are permitted to fail — and expressing it as a count rather than a percentage is what turns it from a slogan into a number you can reason about." },

    { t: "code", lang: "python", title: "m7.py — the budget as a count",
      out: `== 5. burn-rate alerting against a static threshold ==
  SLO: 99.9% of requests under 25 ms over 30 days
  error budget: 0.10% of requests, = 51840 requests at 20 rps` },

    { t: "p", text: "**51,840 requests** may be slow this month. That reframes several arguments at once. A deploy that sheds four hundred requests costs 0.8% of the budget, which is affordable; one that sheds thirty thousand is most of the month. Lesson 3.3's canary arithmetic found that detecting a bad model requires serving **2,282 bad predictions** regardless of canary share — that is 4.4% of this budget, which is the honest price of a safe rollout." },

    { t: "p", text: "It also settles the perfectionism question: a service that has consumed none of its budget is **over-provisioned or under-shipping**. The budget exists to be spent on something — deploys, experiments, a canary — and spending none means the reliability target was set below what the system delivers, so it is not constraining anything." },

    { t: "callout", kind: "good", title: "The histogram boundary makes the budget exact",
      body: [
        { t: "p", text: "Lesson 7.2's third bucket rule pays off here. With a boundary at exactly the SLO threshold, the good-request ratio is `bucket{le=\"0.025\"} / count` — two counts divided, with no interpolation." },
        { t: "p", text: "Without it, the ratio is derived from an interpolated quantile, and lesson 7.2 measured interpolation errors of 25.7% at p95 on a sensible layout. An alert threshold computed from a number that is a quarter wrong is not an alert threshold." }
      ] },

    { t: "h2", n: "02", id: "burn", text: "Burn rate",
      sub: "One division that makes severity proportional" },

    { t: "p", text: "**Burn rate is the observed bad rate divided by the budgeted bad rate.** At 1× you will spend exactly your budget over the window and finish the month on target. At 10× you spend it in a tenth of the time." },

    { t: "code", lang: "python", title: "m7.py — four scenarios, two alerting rules",
      out: `  scenario                 bad rate    burn rate budget gone in static 1% alert?
  normal                     0.050%         0.5x         never no
  slight elevation           0.200%         2.0x       360.0 h no
  real incident              2.000%        20.0x        36.0 h YES
  outage                    35.000%       350.0x         2.1 h YES

  the static 1% threshold misses 'slight elevation', which burns the
  month's budget in 360 hours -- and it fires at the same severity
  for the outage, which burns it in 2.1 hours.
  burn rate makes severity proportional: page above ~14x, ticket at ~6x.` },

    { t: "p", text: "Read the last two columns together. The static rule makes two distinct mistakes:" },

    { t: "p", text: "**It misses the slow burn.** At 0.2% bad — a fifth of the alerting threshold — the month's entire budget is gone in 360 hours, fifteen days. Nothing fires, nobody looks, and the SLO is missed by the middle of the month with every dashboard green." },

    { t: "p", text: "**It flattens the emergency.** 2% and 35% both trip the same rule and arrive as the same page, but one gives you a day and a half to respond and the other gives you two hours. The alert carries no information about which, so the responder has to work it out, during the incident." },

    { t: "diagram", kind: "compare", id: "dg-7_4-02-0",
      title: "The same four scenarios, under each rule",
      caption: "**Burn rate is the same measurement divided by the budget**, and that division is what makes the number ordinal. 350× and 20× sort themselves; *above 1%* does not.",
      columns: [
        { title: "Static threshold: bad rate > 1%", items: [
          "0.05% — no alert. Correct.",
          "0.20% — no alert. Budget gone in 15 days.",
          "2.0% — page. No indication of urgency.",
          "35% — page. Identical to the previous one.",
          "Two false negatives in four scenarios",
          "Severity is binary and uninformative"
        ] },
        { title: "Burn rate against the budget", items: [
          "0.5x — under budget. Nothing.",
          "2.0x — ticket: slow burn, 15 days of margin.",
          "20x — page: 36 hours of budget left.",
          "350x — page, highest severity: 2.1 hours.",
          "Catches the slow burn the static rule missed",
          "Severity is proportional and sortable"
        ] }
      ] },

    { t: "h2", n: "03", id: "windows", text: "Multi-window, multi-burn-rate",
      sub: "Because one window cannot be both fast and quiet" },

    { t: "p", text: "A single burn-rate alert has the problem every alert has: a short window is fast and noisy, a long window is quiet and slow. The standard answer is two or three rules at different window-and-threshold pairs, each tuned for a different kind of failure." },

    { t: "table",
      head: ["Window", "Burn rate", "Budget consumed", "What it catches", "Action"],
      rows: [
        ["1 hour", "14x", "2% of the month", "a fast, severe failure — the 350x outage", "page"],
        ["6 hours", "6x", "5% of the month", "a significant ongoing problem", "page"],
        ["3 days", "1x", "10% of the month", "the slow burn the static rule missed", "ticket"]
      ] },

    { t: "p", text: "The thresholds are not arbitrary: each is chosen so that the alert fires when a specific **fraction of the budget** has been consumed. The 1-hour/14× rule fires after 2% of the month's budget is gone, which at 51,840 requests is about a thousand bad requests — fast enough to matter, large enough not to fire on noise." },

    { t: "callout", kind: "insight", title: "Pair each window with a shorter one to stop the alert ringing after recovery",
      body: [
        { t: "p", text: "A 6-hour window keeps firing for up to six hours after the problem is fixed, because the window still contains the incident. The standard refinement is to require **both** the long window and a short one (typically one twelfth of it) to be over the threshold — so when the short window recovers, the alert clears while the long window still remembers." },
        { t: "p", text: "Without that, responders learn that the alert stays red after they have fixed the problem, which is how an accurate alert becomes an ignored one." }
      ] },

    { t: "h2", n: "04", id: "ml", text: "What an ML service pages on",
      sub: "Assembled from the measurements in this course" },

    { t: "p", text: "Burn rate requires a fast, countable definition of a bad request. Latency and errors qualify. **Accuracy does not** — lesson 2.2 measured it at 45 days behind — so the alert set has to be built from what is available in seconds, which this course has already established." },

    { t: "diagram", kind: "steps", id: "dg-7_4-04-0",
      title: "The alert set for a model service, and why each one is here",
      caption: "Four alerts, each with a measurement behind it. **Only the first two are burn-rate alerts**, because only they have a fast countable definition of bad; the third is a distribution check and the fourth is a slow gate.",
      items: [
        { label: "Page: burn rate on latency and errors", desc: "14x over 1 hour, 6x over 6 hours, each paired with a short window. The budget was 51,840 requests at 20 rps." },
        { label: "Page: prediction distribution shifted", desc: "A 5-point move is detectable in 1.9 min with no labels, and it caught 1.5's unit change." },
        { label: "Ticket: input drift", desc: "It fired for 11 months in 1.1 while accuracy improved, and needs 20,000 samples. Never a page." },
        { label: "Ticket: model quality, when labels arrive", desc: "45 days behind, so it gates retraining rather than paging. Computed from the prediction log of lesson 16.2." }
      ] },

    { t: "p", text: "The second item is the one that distinguishes an ML alert set from a web service's, and it is worth stating why it pages. Lesson 1.5 measured a unit change taking the approval rate from **0.447 to 0.036** — no errors, no latency change, and a 19-point accuracy collapse. Latency and error burn rates would both have stayed green; the prediction-distribution alert fires in minutes." },

    { t: "callout", kind: "trap", title: "And it is the alert lesson 1.1 showed to be blind",
      body: [
        { t: "p", text: "The same signal held at **0.450 while accuracy fell 20.2 points**, because a model approving the same share of applicants and the wrong ones has an unchanged output distribution. So this alert catches the unit-change class and is structurally unable to catch the concept-drift class." },
        { t: "p", text: "That is not a reason to drop it — it is the fastest harm-correlated signal available without labels. It is a reason to be precise in the runbook about what a green prediction-distribution panel does and does not establish, and to keep the slow label-based gate as the thing that actually answers the question." }
      ] },

    { t: "h2", n: "05", id: "dashboard", text: "A dashboard that shortens an incident",
      sub: "Three questions, in order" },

    { t: "p", text: "Most dashboards are built by adding a panel whenever someone wants a number, which produces a wall nobody reads at 3 a.m. A dashboard for an incident should answer three questions in order, and nothing else." },

    { t: "dl", items: [
      { k: "Is it broken, and for whom?", v: "The SLO ratio and the current burn rate, plus traffic. One row, at the top. If this row is green the rest of the page is a curiosity." },
      { k: "Where is it broken?", v: "The same ratio broken down by the labels lesson 7.1 chose: model version, region, endpoint. This is where a canary's bad version or one slow replica shows, and it is lesson 7.2's Simpson's-paradox case." },
      { k: "Since when, and what changed then?", v: "Latency percentiles with deploy and model-promotion annotations overlaid. The question is almost always answered by the annotation." }
    ] },

    { t: "p", text: "Then the ML-specific fourth panel: **the prediction distribution by model version**, from lesson 7.1's score histogram. During a rollout it is the panel that distinguishes *the new model behaves differently* from *the new model is slower*, which are different incidents with different responses." },

    { t: "p", text: "And two rules about what to leave off. **Resource graphs are not on the incident dashboard** — CPU and memory are causes, not symptoms, and lesson 5.3 measured CPU being a weak proxy for occupancy when 70% of a request is framework. They belong one click away. **A panel with no action attached to it is decoration**; if nobody can say what they would do differently based on it, it is costing attention during the only time attention is scarce." },

    { t: "callout", kind: "good", title: "Every alert names its runbook, and the runbook names the measurement",
      body: [
        { t: "p", text: "An alert should carry a link to a runbook that says: the symptom, the measurement that confirms it, the first action, and the rollback. Lesson 3.6 put a runbook per incident class on the short list, and Phase 5 is where the seven classes get their diagnosis paths." },
        { t: "p", text: "The test for an alert is whether a responder knows what to do within thirty seconds of reading it. If not, the fix is the runbook, not a different threshold — and an alert whose runbook says *investigate* should be a ticket." }
      ] },

    { t: "exercise", kind: "practice", title: "Convert one alert to a burn rate", difficulty: "core", minutes: 30,
      prompt: "Take a static-threshold alert you own and redo it. Write down the SLO it implies, convert the budget to a request count at your traffic rate, and compute the burn rate at three observed bad rates — a mild elevation, a real incident and an outage — then say how long each takes to exhaust the budget. Replace the rule with a multi-window pair: 14x over an hour and 6x over six hours, each paired with a short window so it clears after recovery. Then check two things: does a histogram bucket boundary sit exactly on your latency threshold, and does your alert carry a runbook link that states the first action.",
      hints: [
        "If you cannot state the SLO, that is the first finding — a static threshold is an SLO nobody wrote down.",
        "The mild-elevation row is the one that justifies the change: it is usually well under the static threshold and exhausts the budget inside the window.",
        "Without a boundary on the threshold, the ratio comes from an interpolated quantile that lesson 7.2 measured 25.7% wrong at p95."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual outcome is discovering that the static threshold implies an SLO nobody chose, and that it is both too lax for a slow burn and too coarse for a severe one — which is the pair of failures measured in this lesson." },
          { t: "p", text: "The budget-as-a-count conversion is the part that changes conversations beyond alerting. Once a month's budget is 51,840 requests, a canary costing 2,282 of them is a priced decision rather than an argument, and so is a deploy that sheds a few hundred." }
        ]
      } }

  ],

  takeaways: [
    "**Express the error budget as a count**: 0.1% of 30 days at 20 rps is **51,840 requests**, which turns a slogan into a number you can spend.",
    "**A canary costs 4.4% of that budget** — lesson 3.3's invariant 2,282 bad predictions — which is the honest price of a safe rollout.",
    "**A service that spends none of its budget is over-provisioned or under-shipping**; the target is not constraining anything.",
    "**Burn rate = observed bad rate / budgeted bad rate.** At 1x you finish the month exactly on target.",
    "**A static 1% threshold misses the slow burn**: 0.2% bad is a fifth of the threshold and exhausts the month's budget in 360 hours with every dashboard green.",
    "**And it flattens the emergency**: 2% (36 hours of margin) and 35% (2.1 hours) trip the same rule and page identically.",
    "**Multi-window, multi-burn-rate**: 14x over 1 hour and 6x over 6 hours to page, 1x over 3 days to ticket — each threshold set so the alert fires at a chosen fraction of the budget.",
    "**Pair each window with a shorter one** or the alert stays red for hours after recovery, which is how an accurate alert becomes an ignored one.",
    "**A histogram boundary on the SLO threshold makes the ratio exact** — otherwise it comes from an interpolation lesson 7.2 measured 25.7% wrong at p95.",
    "**Accuracy cannot be a burn-rate alert**: lesson 2.2 measured it 45 days behind, so it gates retraining rather than paging.",
    "**Page on the prediction distribution**: lesson 1.5's unit change took the approval rate 0.447 to 0.036 with no errors and no latency change.",
    "**And know that it is blind to concept drift** — lesson 1.1 held it at 0.450 through a 20.2-point accuracy fall — so the runbook must say what a green panel does not establish.",
    "**A dashboard answers three questions in order**: is it broken and for whom, where, and since when — with deploy annotations overlaid.",
    "**Keep resource graphs off the incident dashboard**: they are causes, not symptoms, and CPU is a weak proxy when 70% of a request is framework.",
    "**A panel with no action attached is decoration**, and an alert whose runbook says 'investigate' should be a ticket."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your alert fires when the error rate exceeds 1%. Your SLO is 99.9% over 30 days. What does the alert miss?",
        options: [
          "Nothing — 1% is ten times the budgeted rate, so it is appropriately sensitive",
          "A sustained 0.2% error rate: it never fires, and it exhausts the entire month's budget in 360 hours with every dashboard green",
          "Short spikes, because the evaluation window is too long"
        ],
        answer: 1,
        why: "0.2% is a fifth of the threshold and twice the budgeted rate — a 2x burn. The static rule also makes the opposite mistake: 2% and 35% both trip it and page identically, though one leaves 36 hours of margin and the other 2.1."
      },
      {
        stem: "Why pair a 6-hour burn-rate alert with a shorter window?",
        options: [
          "To reduce the query cost of evaluating a long window",
          "So the alert clears after recovery — the 6-hour window still contains the incident for up to six hours, and requiring a short window to also be over threshold lets it resolve",
          "Because burn rate is undefined over windows longer than an hour"
        ],
        answer: 1,
        why: "An alert that stays red after the problem is fixed teaches responders to ignore it, which costs more than the alert was worth. The short window is typically a twelfth of the long one, so it recovers quickly while the long window still remembers."
      },
      {
        stem: "Which signal should page for a model service, besides latency and errors?",
        options: [
          "Input feature drift, since it is computable without labels",
          "The prediction distribution — a 5-point move is detectable in under 2 minutes with no labels, and it would have caught a unit change that took the approval rate from 0.447 to 0.036",
          "Model accuracy, evaluated continuously on recent traffic"
        ],
        answer: 1,
        why: "Input drift fired for eleven months in lesson 1.1 while accuracy improved, so it is a ticket. Accuracy is 45 days behind and gates retraining. The prediction distribution is the fastest harm-correlated signal available — while being blind to concept drift, which the runbook must say."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is an error budget and why would you alert on burn rate?",
        strong: "An SLO's complement: if the target is 99.9% over thirty days, 0.1% of requests may fail, which at twenty requests a second is about 51,840 requests a month — and expressing it as a count rather than a percentage is what makes it spendable. Burn rate is the observed bad rate divided by the budgeted rate, so 1x means finishing the month exactly on target. I alert on it because a static threshold gets severity wrong in both directions: I measured a 0.2% error rate — a fifth of a typical 1% threshold — exhausting the whole month's budget in 360 hours without ever firing, while 2% and 35% both trip the threshold and page identically, though one leaves 36 hours of margin and the other 2.1. Burn rate makes the severity proportional and sortable.",
        answer: [
          { t: "p", text: "The two directions of failure, each with a number, are what make the argument rather than citing the SRE book. The count-not-percentage framing is the practical half." },
          { t: "p", text: "A good follow-through is that a service spending none of its budget is over-provisioned, which reframes the budget as something to use rather than preserve." }
        ]
      },
      {
        level: "senior",
        q: "What would you page on for a model in production, and what would you not?",
        strong: "Page on burn rate for latency and errors — multi-window, 14x over an hour and 6x over six hours, each paired with a short window so it clears after recovery — and page on the prediction distribution, because that is the fastest harm-correlated signal available without labels: a five-point move in the positive rate is detectable in under two minutes, and it would have caught a unit-change incident I measured where the approval rate fell from 0.45 to 0.04 with no errors and no latency change. I would not page on input drift: I have measured it firing for eleven consecutive months while accuracy actually improved, and it needs about 20,000 samples for reasonable power, so it is a ticket. And I cannot page on accuracy at all, because in a lending case the labels were 45 days behind — that gates retraining rather than alerting. The honest caveat I would put in the runbook is that the prediction-distribution alert is blind to concept drift: I measured the same signal holding at 0.450 while accuracy fell twenty points, because approving the same share of the wrong applicants looks identical.",
        answer: [
          { t: "p", text: "The structure — two fast burn-rate alerts, one fast proxy, two slow tickets — is the answer, and every element has a measurement behind it." },
          { t: "p", text: "Volunteering the blind spot of your own recommended alert is the strongest move available here, because it shows the alert set is understood as a set of partial signals rather than a solution." }
        ]
      }
    ]
  }
});
