EC.receiveLesson({
  id: "3.6",

  lede: "Phase 1 is finished, so this lesson is the short list worth arguing for — and every item on it is backed by something measured in the preceding fourteen lessons rather than by consensus. Six practices survive contact: **one code path from feature definition to both consumers** (the alternative cost 2.5 AUC points), **a promotion gate with a derived threshold** (0.17 points is the noise floor on 6,000 rows), **a rollback that is one command**, **alerting on inputs but never retraining on them** (a drift test fired for eleven months while accuracy held), **a prediction log written from day one** (without it a 45-day label delay is permanent), and **a runbook per incident class**.",

  objectives: [
    "State each practice with the measurement that justifies it rather than as received wisdom",
    "Identify which practices are cheap now and expensive to retrofit later",
    "Separate the practices that prevent incidents from those that shorten them",
    "Produce an honest readiness assessment for a model you operate"
  ],

  prerequisites: ["3.5"],

  blocks: [

    { t: "h2", n: "01", id: "ledger", text: "What fourteen lessons measured",
      sub: "The evidence, before the advice" },

    { t: "p", text: "Best-practice lists are easy to write and easy to ignore, because they read as taste. So before the list, the evidence — every number here was produced by a script in this course, and each one is the reason an item appears." },

    { t: "diagram", kind: "matrix", id: "dg-3_6-01-0",
      title: "The measurements that generate the practices",
      caption: "Read right to left: **each practice exists because something was measured to go wrong without it.** None of these is a preference, and none of them is free.",
      rows: ["Shared feature code", "A derived gate threshold", "One-command rollback", "Alert in, retrain on harm", "A prediction log", "A runbook per class"],
      cols: ["The measurement", "Without it"],
      cells: [
        [{ text: "1.4: leak scored +2.6 offline, -2.5 live", tone: "crit" }, { text: "the leakiest candidate wins the gate", tone: "crit" }],
        [{ text: "3.2: noise floor 0.17 AUC points", tone: "warn" }, { text: "you promote your own random seed", tone: "crit" }],
        [{ text: "3.3: exposure fixed at 2,282 predictions", tone: "warn" }, { text: "detection time becomes the harm", tone: "crit" }],
        [{ text: "1.1: KS fired 11 months, accuracy flat", tone: "warn" }, { text: "11 unnecessary retrains, or none when needed", tone: "crit" }],
        [{ text: "2.2: 45-day label delay, 115,889x spread", tone: "crit" }, { text: "the delay is permanent, not a delay", tone: "crit" }],
        [{ text: "1.1: 20 pts lost with every signal green", tone: "crit" }, { text: "diagnosis starts from zero each time", tone: "warn" }]
      ] },

    { t: "h2", n: "02", id: "one", text: "One code path to both consumers",
      sub: "The practice that prevents the most expensive bug" },

    { t: "p", text: "A feature is defined once, in one function, and both the training pipeline and the serving path call it. Not *the same logic in two places, reviewed carefully*. One callable." },

    { t: "p", text: "The measurement that justifies it is lesson 1.4's: a feature computed with a window relative to the build date rather than to each row's decision scored **2.6 AUC points better offline** and gave back **2.5 of them in production**, finishing slightly below the model it had beaten. And the reason it is a *structural* fix rather than a discipline fix is that the leak **wins the comparison you run** — so your model selection actively prefers it, and no amount of care in reviewing two implementations removes that pressure." },

    { t: "p", text: "The function's signature is the whole design: it takes an **entity and a timestamp**. That is what makes the harmful version unwriteable, and it is the only property of a feature store (lesson 1.4) you cannot get cheaply another way." },

    { t: "callout", kind: "good", title: "This is the cheapest thing to do now and the most expensive to retrofit",
      body: [
        { t: "p", text: "Writing one function on day one costs an hour. Unpicking two divergent implementations after a year — with a training set built from the wrong windows, models selected under that bias, and offline numbers nobody can reconcile with production — is a quarter of work and a renegotiation of everyone's expectations about model quality." },
        { t: "p", text: "Lesson 13.1 measures each of the four skews deliberately, and 13.4 gives the golden-row test that keeps the two paths honest once they exist." }
      ] },

    { t: "h2", n: "03", id: "gate", text: "A gate with a derived threshold",
      sub: "And the registry it writes to" },

    { t: "p", text: "Nothing reaches production without passing a gate that compares it to the incumbent, and the gate's threshold comes from the holdout rather than from a meeting. Lesson 3.2 measured that floor: retraining the identical model with a different seed moved AUC by **−0.0011** with a 95% interval of **[−0.0029, +0.0006]**, a half-width of **0.17 AUC points** on 6,000 rows — and **0.67 points at 500 rows, 0.05 at 60,000**." },

    { t: "p", text: "Two consequences follow that are worth stating as practice rather than as statistics. **Require the interval to exclude zero, not just a positive point estimate** — challenger A in 3.2 scored +0.0004 and was correctly rejected. And **publish the interval next to the model in the registry**, because in three months the question will be why this model was promoted, and *CI was green* does not answer it." },

    { t: "p", text: "The gate also has to check more than the metric. Lesson 3.2's four stages exist because a metric-only gate promoted lesson 1.4's leak enthusiastically: data validation first because it is cheapest and catches the worst (lesson 1.5's unit change cost **19 accuracy points** while passing every type and null check), then reproducibility, then the metric, then the skew test." },

    { t: "h2", n: "04", id: "rollback", text: "A rollback that is one command",
      sub: "Because detection time is the harm" },

    { t: "p", text: "The ability to revert to the previous model must be a single, tested, boring operation — not a redeploy, not a retrain, not a pipeline run. Lesson 3.3's arithmetic is why: the number of bad predictions served before you can even *detect* a problem is fixed at **2,282** regardless of canary share, so every additional minute spent working out how to undo the change is pure additional harm." },

    { t: "p", text: "Three properties make it real. The previous artifact is still **loadable** — which means the registry keeps it and the environment that ran it is pinned (lesson 1.3's pickle coupling is exactly why ONNX, measured in 2.3 at 0.59x size and 2.00x speed with zero decisions changed, is worth the export). The switch is **configuration rather than deployment**, so it does not wait for an image build. And it is **exercised**: an untested rollback is a hypothesis." },

    { t: "callout", kind: "trap", title: "A rollback nobody has run is not a rollback",
      body: [
        { t: "p", text: "The usual failure is discovering during an incident that the previous model's artifact was pruned, or that it cannot be deserialized under the current library versions, or that the serving config names a tag which has been overwritten rather than an immutable version id." },
        { t: "p", text: "All three are found in five minutes by rolling back on a Tuesday afternoon and rolling forward again. Lesson 14.3 covers the serving-side mechanics — fallbacks, circuit breakers and what the service does when the model is simply unavailable." }
      ] },

    { t: "h2", n: "05", id: "signals", text: "Alert on inputs, retrain on harm",
      sub: "The practice the measurements most clearly support" },

    { t: "p", text: "Instrument the inputs, and never let that instrument decide to retrain. This is the most strongly evidenced item on the list and the one most often implemented backwards." },

    { t: "p", text: "Lesson 1.1's two worlds: a KS test on an input feature **fired from month 2 and reached p = 9.8e-87** while accuracy went 0.7667 → 0.7620 and AUC *improved*; and in the world where accuracy fell **20.2 points**, the same test never fired at all (p = 0.95) and the approval rate held at **0.450**, so output monitoring was blind too. Lesson 2.2 then priced the clocks: input drift takes **16.7 minutes** to reach 80% power, model quality **45 days** because of the label delay — a spread of **115,889x**." },

    { t: "p", text: "So: page on infrastructure, traffic and the prediction distribution; **ticket** on input drift; gate retraining on labels, a business metric, or a human-adjudicated review sample. Lesson 11.4 works through the response ladder properly." },

    { t: "h2", n: "06", id: "log", text: "A prediction log, from day one",
      sub: "The only item that cannot be added later" },

    { t: "p", text: "Record, for every prediction: the inputs as the model received them, the output score, the model version, a timestamp and a correlation id. Lesson 2.1's endpoint emits the version and the score for exactly this reason." },

    { t: "p", text: "The argument is a sentence: **with the log, a 45-day label delay is a delay; without it, the delay is permanent.** Labels arrive, join to the log, and accuracy becomes computable for a period that has already passed — including for the model that was serving three weeks ago. Without the log the labels arrive and there is nothing to join them to, and the period is simply unmeasurable for ever." },

    { t: "p", text: "It is also the substrate for everything in Phase 5. Drift statistics (11.2), the skew comparison across the boundary (13.4), calibration, and any retrospective evaluation all read this one artifact. Lesson 16.2 specifies it in full, including sampling, PII and retention." },

    { t: "callout", kind: "insight", title: "This is the item to fight for first",
      body: [
        { t: "p", text: "Every other practice on this list can be retrofitted at a cost. A prediction log cannot: the data it would have contained does not exist, and no amount of later effort recovers it. A month of unlogged traffic is a month you will never be able to evaluate." },
        { t: "p", text: "It is also cheap — a few fields appended per request, sampled if volume demands — which makes the ratio of value to cost the best on the list." }
      ] },

    { t: "h2", n: "07", id: "runbook", text: "A runbook per incident class",
      sub: "What Phase 5 is for" },

    { t: "p", text: "The last item shortens incidents rather than preventing them. For each of the seven classes in Phase 5, write down the symptom, the measurement that confirms it, and the first action — so that diagnosis does not restart from first principles at 3 a.m." },

    { t: "diagram", kind: "steps", id: "dg-3_6-07-0",
      title: "The practices, in the order to acquire them",
      caption: "Ordered by value divided by cost-to-retrofit. **The first cannot be added later at all**, and the second and third are the ones that stop bad models reaching users.",
      items: [
        { label: "1. The prediction log", desc: "Cannot be retrofitted: unlogged traffic is permanently unevaluable. A few fields per request, and Phase 5 all reads it." },
        { label: "2. One feature code path, entity + timestamp", desc: "An hour now, a quarter later. The alternative measured -2.5 AUC points and biased model selection toward the leak." },
        { label: "3. A gate with a derived threshold and a rollback", desc: "Floor measured at 0.17 AUC points; publish the interval to the registry. Rollback is one tested command." },
        { label: "4. Signals wired to the right decisions", desc: "Page on fast signals, ticket on drift, retrain on harm. Drift fired for 11 months while the model was fine." }
      ] },

    { t: "p", text: "Two honest caveats about everything above. All of it was measured on **one synthetic lending problem on one machine** — the directions and the mechanisms generalise, the magnitudes do not, and a 0.17-point noise floor is a property of that holdout rather than a constant. And the list is deliberately short: there is no feature store on it, no managed pipeline service, no particular tool. Those are answers to questions of scale and organisation, and lesson 3.5 argued that for one team with a nightly retrain, lesson 3.1's sixty-line scheduler plus lesson 1.2's run record is genuinely enough." },

    { t: "exercise", kind: "practice", title: "Score yourself against the six", difficulty: "intro", minutes: 25,
      prompt: "For a model you operate, mark each of the six present, partial or absent, with evidence rather than intention. For the prediction log: pull one prediction from last month and show its inputs, score and model version. For shared feature code: name the function both paths call, or name the two implementations. For the gate: state the threshold and where the number came from. For rollback: say when it was last exercised. For signals: say what would page and what would trigger a retrain. For runbooks: open the one for drift. Then take the lowest-cost absent item and do it this week — it will almost always be the log or the threshold derivation.",
      hints: [
        "'We log requests' is not the prediction log unless the score and the model version are in it.",
        "If the gate's threshold has no derivation, run lesson 3.2's seed experiment — it is twenty minutes and gives you the number.",
        "If rollback has never been exercised, that is the cheapest high-value thing on the list to fix: do it on a quiet afternoon."
      ],
      solution: {
        body: [
          { t: "p", text: "The most common profile is a log that records requests but not the score or the model version, a gate with an undocumented threshold, and a rollback nobody has run. All three are cheap to fix and each converts a future incident from archaeology into a lookup." },
          { t: "p", text: "The honest version of this exercise usually finds that signals are wired backwards — drift pages and nothing gates a retrain — which is exactly the arrangement lesson 1.1's measurements argue against, and rewiring it costs a configuration change rather than a project." }
        ]
      } }

  ],

  takeaways: [
    "**Six practices, each justified by a measurement in this course** rather than by consensus — and none of them names a tool.",
    "**One code path from feature definition to both consumers**, taking an entity and a timestamp. The alternative scored +2.6 AUC points offline and gave back 2.5 in production.",
    "**A leak wins the comparison you run**, so model selection prefers it — which is why this is a structural fix, not a discipline fix.",
    "**A gate with a derived threshold**: the noise floor was 0.17 AUC points on 6,000 rows, 0.67 at 500, 0.05 at 60,000. Require the interval to exclude zero, not just a positive estimate.",
    "**Publish the gate's interval to the registry.** In three months 'CI was green' will not answer why a model was promoted.",
    "**Validate the data before training, not just the metric after** — the unit change in 1.5 cost 19 accuracy points while passing every type and null check.",
    "**A rollback that is one tested command**, because exposure before detection is fixed at 2,282 predictions and every minute of fumbling is additional harm.",
    "**An untested rollback is a hypothesis**: the artifact may be pruned, undeserializable under current versions, or named by an overwritten tag.",
    "**Alert on inputs, never retrain on them.** Drift fired from month 2 at p=9.8e-87 while AUC improved; in the harmful world it never fired and the approval rate held at 0.450.",
    "**Page on fast signals, ticket on drift, gate retraining on harm** — labels, a business metric, or an adjudicated review sample.",
    "**A prediction log from day one is the only item that cannot be retrofitted**: with it a 45-day label delay is a delay, without it the period is permanently unevaluable.",
    "**A runbook per incident class shortens incidents** rather than preventing them, and Phase 5 is where the seven classes get their diagnosis paths.",
    "**All of this was measured on one synthetic problem on one machine**: the mechanisms generalise, the magnitudes do not."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which of these practices cannot be meaningfully retrofitted later?",
        options: [
          "A promotion gate with a derived threshold",
          "A prediction log — unlogged traffic is permanently unevaluable, so a month without it is a month whose accuracy can never be computed even once labels arrive",
          "Shared feature code between training and serving"
        ],
        answer: 1,
        why: "The other two are expensive to retrofit but possible: a gate can be added to the next promotion, and divergent feature code can be unified painfully. A log is different in kind — the data it would have held does not exist, and no later effort recovers it."
      },
      {
        stem: "Why should input drift not trigger an automatic retrain?",
        options: [
          "Because retraining is computationally expensive",
          "Because it is not reliably correlated with harm — a KS test fired from month 2 and reached p=9.8e-87 while accuracy held and AUC improved, so the trigger would have fired eleven unnecessary retrains",
          "Because drift detection is too slow at 16.7 minutes to 80% power"
        ],
        answer: 1,
        why: "The same measurement shows the converse: in the world where accuracy fell 20.2 points, the drift test never fired. So the signal is both a false alarm and a false reassurance. Retraining should be gated on labels, a business metric, or an adjudicated review sample."
      },
      {
        stem: "Your gate requires a challenger to beat the incumbent by any positive margin. What is wrong?",
        options: [
          "Nothing, as long as the holdout is large enough",
          "A positive margin can be the model's own random seed — retraining the identical model with a different seed moved AUC by 0.0011, so the gate needs an interval that excludes zero and a threshold derived from the holdout size",
          "The gate should compare against a fixed metric target instead"
        ],
        answer: 1,
        why: "Measured: the noise floor is 0.17 AUC points on 6,000 rows and 0.67 on 500, so 'any positive margin' promotes noise at small holdout sizes. The third option is worse — a fixed target decays into meaninglessness as the data changes, which is why the comparison is always against the incumbent artifact."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "If you joined a team with a model in production and no MLOps practice, what would you do first?",
        strong: "The prediction log, because it is the only thing that cannot be added retroactively — inputs, score, model version, timestamp and correlation id, per request, sampled if volume demands. Everything else can be retrofitted at a cost; a month of unlogged traffic is a month whose accuracy can never be computed, even once labels arrive. In a lending case I measured, labels took forty-five days, which is survivable with a log and permanent without one. Second I would unify the feature code so training and serving call one function taking an entity and a timestamp, because the alternative measured 2.6 points better offline and 2.5 points worse live. Third, derive the promotion gate's threshold from the holdout rather than inheriting a number.",
        answer: [
          { t: "p", text: "Leading with the irreversible item, and saying explicitly why it is irreversible, is the strongest possible opening to this question." },
          { t: "p", text: "Ordering by value over cost-to-retrofit — rather than by what is most fun to build — is the judgement the interviewer is looking for." }
        ]
      },
      {
        level: "senior",
        q: "Give me your short list of MLOps practices, and defend one of them with evidence.",
        strong: "Six: one feature code path to both consumers; a promotion gate with a threshold derived from the holdout; a rollback that is one tested command; alert on inputs but gate retraining on harm; a prediction log from day one; a runbook per incident class. I will defend the fourth, because it is the one most often implemented backwards. I ran a frozen model through two futures. In one, the inputs drifted hard — a KS test fired from month two and reached p of 1e-87 — and accuracy did not fall; AUC actually improved. In the other, the inputs were statistically identical, the test never fired, and accuracy fell twenty points while the approval rate stayed at 0.450, so output monitoring was blind as well. So input drift is both a false alarm and a false reassurance: it should raise a ticket, and the decision to retrain needs labels or a business metric. Every other item on the list has a measurement behind it in the same way.",
        answer: [
          { t: "p", text: "Having six items and then defending one in depth is a better structure than describing all six shallowly, and it invites the follow-up you most want." },
          { t: "p", text: "The two-worlds measurement is the strongest single piece of evidence in the course because it cuts against the standard advice in both directions." }
        ]
      },
      {
        level: "senior",
        q: "What would you deliberately not adopt?",
        strong: "A feature store, a managed pipeline service and a monitoring product, until the questions they answer actually exist. The correctness property of a feature store is an as-of join behind one function, which is about eight lines; you buy the product for low-latency online reads and cross-team reuse, and it introduces a materialisation job that can lag, so you trade transformation skew for freshness skew. A managed pipeline service adds containers per step, typed artifacts, content-keyed caching and automatic lineage — all real — at a container start per step per cache miss, which is absurd on a pipeline whose steps run for seconds. For one team with a nightly retrain that fits on a machine, a sixty-line scheduler plus a run record carrying the data, code and environment fingerprints gives dependency order, failure propagation, idempotency, retries and backfill. I would rather spend the same effort on the prediction log and the shared feature path, because those are the two with measured consequences.",
        answer: [
          { t: "p", text: "Being specific about what each tool genuinely provides, rather than dismissing them, is what makes this credible. Naming the freshness-for-transformation skew trade shows the feature store has been operated rather than evaluated." },
          { t: "p", text: "Redirecting the effort to the two measured items keeps the answer constructive instead of merely sceptical." }
        ]
      }
    ]
  }
});
