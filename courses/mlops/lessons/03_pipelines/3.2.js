EC.receiveLesson({
  id: "3.2",

  lede: "A CI pipeline for a model has to answer a question a test suite cannot: *is this candidate better than the thing already serving?* The honest version of that question needs a number, and the number comes from the noise floor. Retraining the **identical model with a different `random_state`** moved AUC by **−0.0011**, with a bootstrap 95% interval of **[−0.0029, +0.0006]** — so on a 6,000-row holdout, anything under about **0.17 AUC points is not evidence of anything**. Four challengers then went through a real gate: doubling the training data scored **+0.0004 and was rejected**, a corrupt-data model was caught by validation at **100% of income out of range**, and only one of the four promoted.",

  objectives: [
    "List the stages an ML pipeline adds to an ordinary CI pipeline, and the order that fails fastest",
    "Derive a promotion threshold from the holdout size rather than choosing one",
    "Use a paired bootstrap to decide whether a measured improvement is real",
    "Explain why a gate must check the training data as well as the resulting metric"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", id: "extra", text: "What CI has to add",
      sub: "Four stages that have no equivalent in software" },

    { t: "p", text: "An ordinary CI pipeline asks whether the code is correct: it lints, it type-checks, it runs unit and integration tests, and a green run means the artifact is shippable. All of that applies to an ML repository unchanged, and it is necessary. It is also insufficient, because every test can pass on a pipeline that produces a useless model." },

    { t: "p", text: "Four stages have to be added, and the order is chosen to fail as cheaply as possible." },

    { t: "dl", items: [
      { k: "Data validation", v: "Lesson 1.5's checks, run on the training batch before anything is fitted. Cheapest stage and the one that catches the worst failures — the unit change there cost 19 accuracy points while passing every type and null check." },
      { k: "Training reproducibility", v: "Does the run record carry the three fingerprints from lesson 1.2, and is the working tree clean? A dirty tree should fail the gate rather than be noted." },
      { k: "The model quality gate", v: "Is the candidate better than the incumbent by more than the noise? This is the stage that needs arithmetic, and it is the subject of this lesson." },
      { k: "Skew tests", v: "Does the serving path produce the same features as the training path for the same row? Lesson 13.4's golden-row test, and the only stage that catches the 2.5-point loss measured in 1.4." }
    ] },

    { t: "callout", kind: "mental", title: "The gate compares to the incumbent, not to a constant",
      body: [
        { t: "p", text: "A threshold like *AUC must exceed 0.80* decays into meaninglessness: the data gets easier or harder over time and the bar stops describing anything. The useful comparison is always **against the model currently serving**, on a holdout neither of them was trained on." },
        { t: "p", text: "That makes the gate a champion/challenger comparison, which is what the rest of this lesson measures. It also means the gate needs the incumbent's *artifact*, not just its recorded score — the score was computed on a different holdout and is not comparable." }
      ] },

    { t: "h2", n: "02", id: "floor", text: "The noise floor",
      sub: "Retrain the same model and see how much it moves" },

    { t: "p", text: "Before you can say a challenger is better, you have to know how much two identical models disagree. So: the same architecture, the same data, the same hyperparameters — and `random_state=1` instead of `random_state=0`." },

    { t: "code", lang: "python", title: "m32.py — the paired bootstrap",
      code: `def paired_boot(p_a, p_b, y, n_boot=2000, seed=7):
    """Resample the holdout ROWS and recompute both AUCs on the same resample.
    Paired, because the two models see the same rows and the row-to-row
    variation is shared -- an unpaired interval would be far too wide."""
    r = np.random.default_rng(seed)
    out = np.empty(n_boot)
    for i in range(n_boot):
        idx = r.integers(0, len(y), len(y))
        yy = y[idx]
        if yy.min() == yy.max():
            out[i] = 0.0
            continue
        out[i] = roc_auc_score(yy, p_b[idx]) - roc_auc_score(yy, p_a[idx])
    return out`,
      out: `== the noise floor: the same model, a different random_state ==
  AUC            0.8462  vs champion 0.8473  (delta -0.0011)
  bootstrap 95% CI of the difference: [-0.0029, +0.0006]
  half-width                        : 0.0017 (0.17 AUC points)
  -> a difference inside this band is not evidence of anything.` },

    { t: "p", text: "The same model, retrained with a different seed, is **0.0011 worse** — and the interval straddles zero, which is the correct reading: the two are indistinguishable. The half-width, **0.0017 or 0.17 AUC points**, is the quantity a promotion threshold has to beat." },

    { t: "p", text: "Note what this means for lesson 1.2's sweep. Six hyperparameter configurations spanned **0.3 AUC points** there, and the noise floor on this holdout is **0.17**. Most of that sweep was measuring its own seed." },

    { t: "callout", kind: "insight", title: "Pair the bootstrap, or the interval is useless",
      body: [
        { t: "p", text: "Resampling each model's predictions independently would produce an interval wide enough to swallow every realistic improvement, because it includes the variance of *the holdout itself* twice. The two models see the same rows, so that variance is common and should cancel." },
        { t: "p", text: "Pairing is why a 0.0017 half-width is achievable on 6,000 rows at all. It is the same reasoning as a paired t-test, and getting it wrong is the commonest way a gate ends up unable to detect any improvement." }
      ] },

    { t: "h2", n: "03", id: "size", text: "The threshold is a function of the holdout",
      sub: "Not a matter of taste" },

    { t: "p", text: "The floor is not a constant — it shrinks as the holdout grows, at the rate you would expect. Measured on real holdouts of each size rather than by resampling a small one, because resampling 60,000 rows out of 6,000 cannot add information." },

    { t: "code", lang: "python", title: "m32.py — the floor against holdout size",
      out: `== how the noise floor shrinks with holdout size ==
   holdout n  95% CI half-width        AUC points
         500  +0.0067                 0.67
        1000  +0.0051                 0.51
        3000  +0.0026                 0.26
        6000  +0.0018                 0.18
       20000  +0.0010                 0.10
       60000  +0.0005                 0.05
  -> the gate's threshold is a function of the holdout, not a taste.` },

    { t: "p", text: "A 1/√n curve: **a 500-row holdout cannot detect anything smaller than two-thirds of an AUC point**, and a 60,000-row holdout resolves five hundredths. This settles a question teams usually argue about from intuition — *is a 0.3-point improvement real?* — because the answer depends entirely on how many rows you measured it on." },

    { t: "diagram", kind: "steps", id: "dg-3_2-03-0",
      title: "Setting the gate's threshold, in four steps",
      caption: "The whole procedure is mechanical, which is the point: **the threshold stops being a negotiation and becomes a measurement.** Re-derive it when the holdout changes size.",
      items: [
        { label: "Retrain the incumbent with a different seed", desc: "Same data, same config, different random_state. This is the null: two models that should be identical." },
        { label: "Paired-bootstrap the AUC difference", desc: "Resample holdout rows, recompute both AUCs on the same resample. Pairing is what makes the interval usable." },
        { label: "Take the upper end of the interval as the floor", desc: "Measured at +0.0006 here, with a half-width of 0.0017 on 6,000 rows. Anything smaller is seed noise." },
        { label: "Require the challenger's interval to clear zero", desc: "Not just the point estimate. A positive delta whose interval includes zero is not evidence, as challenger A shows." }
      ] },

    { t: "h2", n: "04", id: "gate", text: "Four challengers",
      sub: "And the three reasons to reject one" },

    { t: "p", text: "Now the gate runs against four candidates: a model trained on twice the data, a deliberately worse configuration, a hyperparameter sweep winner of the kind lesson 1.2 produced, and one trained on the corrupted batch from lesson 1.5." },

    { t: "code", lang: "python", title: "m32.py — the gate",
      out: `== four challengers through the gate ==
  challenger                        AUC     delta 95% CI of delta        verdict
  A: 2x training data            0.8477   +0.0004 [-0.0017, +0.0026]  REJECT
                                       - CI does not lie entirely above zero
                                       - delta +0.0004 below the 0.0006 noise floor
  B: depth 2, 30 iters           0.8371   -0.0102 [-0.0139, -0.0061]  REJECT
                                       - CI lies entirely BELOW zero: a regression
                                       - delta -0.0102 below the 0.0006 noise floor
  C: a sweep 'winner'            0.8491   +0.0019 [+0.0002, +0.0035]  PROMOTE
  D: trained on corrupt data     0.7474   -0.0999 [-0.1098, -0.0899]  REJECT
                                       - data validation: 100% of income out of range
                                       - CI lies entirely BELOW zero: a regression` },

    { t: "p", text: "**Challenger A is the interesting rejection.** Doubling the training data — from 14,000 rows to 28,000 — produced **+0.0004 AUC**, an interval of [−0.0017, +0.0026] that comfortably contains zero, and a point estimate below the noise floor. The honest verdict is that twice the data bought nothing measurable on this problem, which is consistent with everything module 1 and 2 found: the sweep moved 0.3 points, a logistic regression matched the ensemble, and the binding constraint is not capacity or sample size." },

    { t: "p", text: "**Challenger C promotes, and only just.** +0.0019 with an interval of [+0.0002, +0.0035] — the lower bound clears zero by two ten-thousandths. That is a real but marginal improvement, and a reasonable team might require a wider margin before accepting the operational risk of a deployment. The gate's job is to supply the interval; the risk appetite is a policy decision." },

    { t: "p", text: "**Challenger D is rejected twice over**, and the order matters. Data validation caught it first — *100% of income out of range*, the exact signature from lesson 1.5 — which is why validation runs before training in the stage order. The metric then confirms it at −0.0999. Had validation been missing, the metric would still have caught this one, but lesson 1.5's whole point was that the harmful corruptions are the ones a metric cannot see." },

    { t: "callout", kind: "trap", title: "A gate that only checks the metric passes the dangerous cases",
      body: [
        { t: "p", text: "Challenger D fails on its metric because the corruption was catastrophic. The corruptions that matter are subtler: lesson 1.4's leaky features scored **2.6 points better** offline, so a metric-only gate would have promoted them enthusiastically and the loss would have shown up only in production." },
        { t: "p", text: "That is why the stage list has four entries rather than one. The metric gate detects a model that is worse at the thing you measured; it is structurally unable to detect a model that is better at a wrongly-posed question." }
      ] },

    { t: "h2", n: "05", id: "order", text: "Stage order, and what does not belong",
      sub: "Fail fastest, and keep training out of the PR" },

    { t: "p", text: "The ordering principle is ordinary CI practice: run the cheap checks that fail most often first. For an ML repository that yields a specific sequence." },

    { t: "diagram", kind: "layers", id: "dg-3_2-05-0",
      title: "The pipeline, cheapest and most frequently failing first",
      caption: "Read bottom-up. **The expensive stages sit above the cheap ones that would have invalidated them anyway** — there is no point spending twenty minutes training on a batch that a thirty-second range check rejects.",
      items: [
        { label: "5. Promote: register, tag, update the serving pointer", desc: "Only reached if everything below passed. Lesson 15.1's registry transition, and the only step that changes production." },
        { label: "4. Skew test: one golden row through both paths", desc: "Does serving compute the same features as training? Lesson 13.4. Seconds to run, and the only check that catches 1.4's leak class." },
        { label: "3. Quality gate: paired bootstrap against the incumbent", desc: "Needs the incumbent artifact and a shared holdout. Minutes. Produces an interval, not a verdict." },
        { label: "2. Train, with the run record and the three fingerprints", desc: "The expensive stage. Fails the gate outright if the working tree was dirty (lesson 1.2)." },
        { label: "1. Lint, types, unit tests, data validation", desc: "Seconds. Data validation belongs here: it is cheap and it caught the 19-point failure in 1.5." }
      ] },

    { t: "p", text: "And one thing that does **not** belong in the pull-request pipeline: the training run. A full retrain is minutes to hours, it needs the production data, and it is not a function of the diff — the same code trains a different model next week because the data moved. Putting it on every PR makes the pipeline slow enough that people route around it." },

    { t: "p", text: "The split that works is two pipelines. The **PR pipeline** runs lint, types, unit tests, data validation against a small fixture, and a training smoke test on a few thousand rows that asserts the code completes and produces a model-shaped object. The **retraining pipeline** — lesson 3.1's DAG, on a schedule — does the real train, the gate, the skew test and the promotion." },

    { t: "table",
      head: ["Stage", "PR pipeline", "Retraining pipeline"],
      rows: [
        ["Lint, types, unit tests", "yes, seconds", "yes"],
        ["Data validation", "against a fixture", "against the real batch — the stage that caught 1.5's 19 points"],
        ["Training", "a smoke test on a few thousand rows", "the real run, with the three fingerprints"],
        ["Quality gate vs incumbent", "no — no incumbent comparison is meaningful on a smoke model", "yes, with the paired bootstrap interval"],
        ["Skew test", "yes, on a golden row — it is a code property", "yes, against the built artifact"],
        ["Promotion", "never", "yes, and only here"]
      ] },

    { t: "callout", kind: "good", title: "Make the gate's output an artifact, not a log line",
      body: [
        { t: "p", text: "The gate produced a point estimate, an interval, a verdict and a list of reasons. All four should be written next to the model in the registry, because in three months somebody will ask why this model was promoted and *CI was green* is not an answer." },
        { t: "p", text: "It also makes the threshold auditable. When the holdout grows and the floor drops from 0.18 to 0.10 points, the stored intervals explain why a candidate that would have failed last quarter passes this one." }
      ] },

    { t: "exercise", kind: "practice", title: "Find your own noise floor", difficulty: "core", minutes: 30,
      prompt: "Retrain your production model with nothing changed but the random seed, and paired-bootstrap the metric difference against the incumbent on your real holdout. Record the interval's half-width in your metric's units. Then look up the last three models your team promoted and the improvement each one claimed. How many of those improvements were larger than the floor you just measured? Finally, compute the floor at half and twice your current holdout size, and decide whether holding back more data for evaluation would be worth what it costs in training rows.",
      hints: [
        "Pair the bootstrap — resample rows once and score both models on the same resample, or the interval will be far too wide to be useful.",
        "If your holdout is a few hundred rows, expect a floor near a full point and read your recent promotions accordingly.",
        "The last step is a genuine trade: rows moved to the holdout are rows not trained on, and module 1 found more data was worth +0.0004 here."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual outcome is uncomfortable: at least one recently promoted improvement sits inside the floor, which means it was a coin flip reported as progress. That is worth knowing without being a scandal — the fix is to publish the interval alongside the point estimate from now on." },
          { t: "p", text: "The holdout-size trade is often easier than expected. Here, doubling the training data bought +0.0004 AUC while doubling the holdout halved the detectable difference, so moving rows from training to evaluation was clearly the better use of them." }
        ]
      } }

  ],

  takeaways: [
    "**CI for a model adds four stages**: data validation, training reproducibility, a quality gate against the incumbent, and a skew test. Every ordinary test can pass on a useless model.",
    "**Compare to the incumbent artifact, not to a constant threshold.** A fixed bar like 'AUC > 0.80' stops describing anything as the data changes.",
    "**The noise floor is measurable**: the identical model with a different `random_state` moved −0.0011, CI [−0.0029, +0.0006], half-width 0.0017 — about 0.17 AUC points on 6,000 rows.",
    "**Lesson 1.2's whole sweep spanned 0.3 points against a 0.17-point floor**, so most of it was measuring its own seed.",
    "**Pair the bootstrap.** Resample rows once and score both models on that resample; an unpaired interval includes the holdout's variance twice and swallows every realistic improvement.",
    "**The threshold is a function of holdout size**, following 1/√n: 0.67 points at n=500, 0.18 at 6,000, 0.05 at 60,000.",
    "**Doubling the training data scored +0.0004 and was rejected** — interval [−0.0017, +0.0026], containing zero. More data bought nothing measurable on this problem.",
    "**Require the interval to clear zero, not just a positive point estimate.** Challenger C promoted at +0.0019 with a lower bound of +0.0002 — real, but marginal.",
    "**The corrupt-data challenger was caught by validation first** (100% of income out of range) and by the metric second, which is why validation precedes training in the stage order.",
    "**A metric-only gate passes the dangerous cases**: lesson 1.4's leaky model scored 2.6 points *better* offline, so only a skew test catches that class.",
    "**Keep the real training run out of the PR pipeline.** PRs get lint, types, unit tests, fixture validation and a smoke train; the scheduled pipeline does the real train, the gate and the promotion.",
    "**Write the gate's interval, verdict and reasons next to the model in the registry** — in three months, 'CI was green' will not answer why it was promoted."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A challenger scores +0.0019 AUC over the incumbent with a paired bootstrap 95% interval of [+0.0002, +0.0035]. The noise floor is 0.0017. What should the gate do?",
        options: [
          "Reject: the improvement is smaller than the noise floor",
          "Promote, marginally: the interval's lower bound clears zero, so the improvement is real although small — and the risk appetite for a marginal gain is a policy decision",
          "Rerun the comparison until the interval is wider"
        ],
        answer: 1,
        why: "The floor describes what two identical models do; this candidate's interval excludes zero, so the difference is not seed noise. The point estimate 0.0019 exceeding the 0.0017 half-width is consistent with that. Whether a 0.19-point gain justifies a deployment is a separate, legitimate judgement."
      },
      {
        stem: "Why must the bootstrap be paired when comparing two models?",
        options: [
          "To halve the computation, since one resample serves both models",
          "Because both models see the same holdout rows, so the holdout's own variance is common to them and should cancel — an unpaired interval counts it twice and becomes too wide to detect any realistic improvement",
          "Because AUC is not defined on an unpaired resample"
        ],
        answer: 1,
        why: "Pairing is what makes a 0.0017 half-width achievable on 6,000 rows. It is the same reasoning as a paired t-test, and getting it wrong is the usual reason a gate cannot detect improvements it should."
      },
      {
        stem: "Which stage would catch a model trained on features that leaked future information?",
        options: [
          "The quality gate, since a leaky model performs worse",
          "The skew test — the leaky model scored 2.6 points better offline in lesson 1.4, so the metric gate would have promoted it enthusiastically",
          "Data validation, since the leaked column is out of range"
        ],
        answer: 1,
        why: "A leak inflates the offline metric, so the gate's comparison actively prefers it. Only a check that recomputes features as of the row's timestamp, or compares the training and serving paths on the same row, can see the defect — which is why the stage list has four entries rather than one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What does a CI pipeline for an ML project do that a normal one does not?",
        strong: "Four extra stages, ordered to fail cheaply. Data validation on the real training batch, first, because it is seconds and it catches the worst failures — I measured a unit change costing nineteen accuracy points while passing every type and null check. Then training with the run record and the three fingerprints, failing outright if the working tree was dirty. Then a quality gate comparing the candidate against the incumbent artifact on a shared holdout, producing a confidence interval rather than a verdict. Then a skew test on a golden row, which is the only stage that catches a leaky feature set, because a leak makes the offline metric better rather than worse. And I would keep the real training run out of the PR pipeline — PRs get a smoke train on a few thousand rows.",
        answer: [
          { t: "p", text: "The four stages plus the ordering rationale is the answer. Noting that each ordinary test can pass on a useless model is the framing that makes the extra stages obviously necessary rather than bureaucratic." },
          { t: "p", text: "Keeping training out of the PR pipeline is the practical detail that signals you have maintained one of these rather than designed one." }
        ]
      },
      {
        level: "senior",
        q: "How do you decide whether a new model is good enough to ship?",
        strong: "I measure the noise floor first, then require the candidate to beat it with a confidence interval that excludes zero. The floor comes from retraining the incumbent with nothing changed but the random seed and paired-bootstrapping the metric difference: on a 6,000-row holdout that gave me a 0.17-AUC-point half-width, which means a 0.3-point sweep I had run earlier was mostly measuring its own seed. The floor is a function of holdout size — 0.67 points at 500 rows, 0.05 at 60,000 — so the threshold is a measurement rather than a negotiation. And I would not let the metric be the only gate: a leaky feature set scored 2.6 points better offline in one case I measured, so a skew test and data validation have to pass as well.",
        answer: [
          { t: "p", text: "Deriving the threshold rather than asserting one is the senior behaviour here, and the 1/sqrt(n) curve makes it concrete that the number belongs to the holdout rather than to taste." },
          { t: "p", text: "The seed-noise point is a strong thing to volunteer: it reframes a chunk of ordinary hyperparameter work as unmeasurable, which is useful and slightly uncomfortable." }
        ]
      },
      {
        level: "senior",
        q: "Your gate rejected a model trained on twice as much data. Is the gate wrong?",
        strong: "Probably not — it is reporting that more data bought nothing measurable, which is information. In my measurement, doubling from 14,000 to 28,000 rows gave +0.0004 AUC with an interval of [-0.0017, +0.0026], straddling zero. That is consistent with everything else I had measured on that problem: a six-point hyperparameter sweep moved 0.3 points and a logistic regression matched a gradient-boosted ensemble, so neither capacity nor sample size was the binding constraint. The right response is not to lower the gate; it is to stop buying data and go and look at the features, and to consider moving some of those rows into the holdout, which would halve the detectable difference.",
        answer: [
          { t: "p", text: "Treating the rejection as a finding rather than an obstacle is the right instinct, and connecting it to the other two measurements shows a coherent diagnosis instead of a one-off result." },
          { t: "p", text: "The suggestion to move rows from training into the holdout is the move that most interviewers will not have heard, and it follows directly from the two numbers." }
        ]
      }
    ]
  }
});
