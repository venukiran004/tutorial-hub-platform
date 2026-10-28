EC.receiveLesson({
  id: "1.1",

  lede: "A web service breaks when somebody changes the code. An ML service breaks when the world changes, and the world is not in your repository. This lesson runs one frozen model through two futures and measures both. In the first, the applicants change enormously — a drift test fires from **month 2** and reaches **p = 9.8e-87** — and accuracy does not fall. In the second, the applicants are statistically identical, the lending rule quietly changes, and accuracy falls from **0.7667 to 0.5643**. Across both futures the service logged **zero errors**, latency stayed near 2 ms, and the approval rate held at **0.450**. Every signal an ordinary deployment watches was green through a twenty-point collapse.",

  objectives: [
    "Separate the two things that can change under a deployed model: its inputs, and the rule that generates its labels",
    "State why covariate shift is not by itself a reason to retrain, from a measurement rather than a slogan",
    "Explain why error rate, latency and prediction distribution can all stay flat while a model becomes worthless",
    "Say which signal you would have to collect to catch the harmful case, and what it costs"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", id: "clocks", text: "Two clocks",
      sub: "One of them is not in your repository" },

    { t: "p", text: "Deploying ordinary software is a problem about **code**. The binary is a pure function of the source, the source is in version control, and if nobody commits anything the behaviour tomorrow is the behaviour today. That single property is what the whole discipline of software deployment is built on: you can diff a release, you can roll it back, and a frozen artifact is a frozen behaviour." },

    { t: "p", text: "A model breaks that property. A trained model is a function of **code and data**, and only one of those is in your repository. The artifact is still frozen — the same weights, the same bytes — but the thing it is being asked about is not. So an ML system has two clocks: the one that ticks when somebody merges a pull request, and the one that ticks when the world moves. Your tooling watches the first clock closely and, by default, does not know the second one exists." },

    { t: "diagram", kind: "compare", id: "dg-1_1-01-0",
      title: "The property that deployment tooling assumes, and the one ML has",
      caption: "Everything on the left follows from one fact: **behaviour is a function of code alone**. Rollback works because reverting the code reverts the behaviour. On the right that chain is broken at the first link — the artifact is frozen and the behaviour still moves, so **a rollback restores the code and not the correctness**.",
      columns: [
        { title: "Ordinary software", items: [
          "Behaviour = f(code)",
          "Code lives in version control",
          "Nobody commits, nothing changes",
          "A failure throws, logs, or 500s",
          "Rollback restores the behaviour",
          "The test suite is the gate"
        ] },
        { title: "An ML system", items: [
          "Behaviour = f(code, data, world)",
          "Only the code is in version control",
          "Nobody commits, and it degrades anyway",
          "A failure returns a confident wrong number",
          "Rollback restores the code, not the correctness",
          "The test suite passes throughout"
        ] }
      ] },

    { t: "callout", kind: "mental", title: "The sentence to keep",
      body: [
        { t: "p", text: "**An ML system's inputs are part of its source, and you do not control them.** Every practice in this course — tracking, versioning, feature stores, drift detection, prediction logs — exists because that sentence is true and conventional tooling assumes it is false." }
      ] },

    { t: "p", text: "So let us be precise about what can move. A model estimates a relationship between inputs and a label. Write the inputs as X and the label as Y. Two different things can change, and they are not the same problem:" },

    { t: "dl", items: [
      { k: "P(X) moves", v: "The population changes. The same kinds of applicants, in different proportions — incomes inflate, more young borrowers arrive. The relationship between an applicant and their creditworthiness is untouched. This is **covariate shift**." },
      { k: "P(Y|X) moves", v: "The rule changes. The same applicants, judged differently — a downturn arrives and leverage that was acceptable is no longer acceptable. The population is untouched. This is **concept drift**." }
    ] },

    { t: "p", text: "Almost everything written about drift treats these as two flavours of one problem, because both are called drift and both are detected by staring at distributions. They are not one problem. The rest of this lesson runs them separately against the same frozen model, and the results point in opposite directions." },

    { t: "h2", n: "02", id: "setup", text: "One model, two futures",
      sub: "A loan-approval model, and a world function we control" },

    { t: "p", text: "The setup is a loan-approval model, because it is the case where the consequences of being quietly wrong are easy to see. Four features — income, debt-to-income ratio, credit score and tenure — and a label that says whether the loan performed. The important part is that the **world is a function we write down**, so we can change exactly one thing at a time: the applicants, or the rule." },

    { t: "code", lang: "python", title: "m11.py — the population and the rule, as two separate functions",
      code: `def applicants(n, income_mu, dti_mu, rng):
    """The population. Changing these arguments is covariate shift."""
    income = rng.lognormal(mean=income_mu, sigma=0.45, size=n)
    dti    = np.clip(rng.normal(dti_mu, 0.12, n), 0.01, 0.95)
    score  = np.clip(rng.normal(690, 70, n), 300, 850)
    tenure = np.clip(rng.exponential(5.0, n), 0, 40)
    return np.column_stack([income, dti, score, tenure])

def logit_old(X):                       # the rule the model is trained on
    afford = (X[:, 0] * (1.0 - X[:, 1])) / 30000.0
    return (2.60 * np.log(afford + 1e-9)
            + 0.0190 * (X[:, 2] - 690)
            + 0.075 * X[:, 3] - 1.05)

def label(X, t, rng):                   # t=0 launch rule, t=1 downturn rule
    lg = (1.0 - t) * logit_old(X) + t * logit_new(X)
    return (rng.random(len(X)) < 1.0 / (1.0 + np.exp(-lg))).astype(int)`,
      out: `== the model, at launch ==
  train rows        14000
  holdout accuracy  0.7667
  holdout AUC       0.8434
  approval rate     0.4508` },

    { t: "p", text: "A `HistGradientBoostingClassifier` on 14,000 rows, holding out 6,000: **accuracy 0.7667, AUC 0.8434**, approving 45.1% of applicants. That is a perfectly ordinary model. It now goes into production and is never touched again — no retraining, no redeploy, not one commit — for twelve months. Twice." },

    { t: "p", text: "And alongside it, the only instrumentation most services actually have: a count of exceptions and a latency measurement." },

    { t: "code", lang: "python", title: "m11.py — what the service measures, which is not much",
      code: `def serve(X):
    """What the service measures: errors and latency. Nothing else."""
    errors, lat = 0, []
    for i in range(0, len(X), 200):
        t0 = time.perf_counter()
        try:
            model.predict_proba(X[i:i + 200])
        except Exception:
            errors += 1
        lat.append((time.perf_counter() - t0) * 1000.0)
    return errors, float(np.median(lat)), float(np.percentile(lat, 99))` },

    { t: "diagram", kind: "flow", id: "dg-1_1-02-0",
      title: "The experiment: change one thing, hold the other",
      caption: "The two worlds differ in exactly one respect. **World A moves the population and leaves the rule alone; World B moves the rule and leaves the population alone.** Same frozen model, same twelve months, same instrumentation — so any difference in the result is attributable to which clock moved.",
      cols: 3,
      nodes: [
        { id: "m", label: "One frozen model", sub: "acc 0.7667, AUC 0.8434", tone: "accent" },
        { id: "a", label: "World A", sub: "incomes inflate 1.6%/mo, leverage rises", tone: "violet" },
        { id: "b", label: "World B", sub: "same applicants, the rule changes", tone: "violet" },
        { id: "ra", label: "P(X) moves, P(Y|X) fixed", sub: "covariate shift", tone: "good" },
        { id: "rb", label: "P(X) fixed, P(Y|X) moves", sub: "concept drift", tone: "crit" },
        { id: "q", label: "Which signals notice?", sub: "accuracy, KS, errors, latency, approval rate", tone: "amber" }
      ],
      edges: [["m", "a"], ["m", "b"], ["a", "ra"], ["b", "rb"], ["ra", "q"], ["rb", "q"]] },

    { t: "h2", n: "03", id: "worlda", text: "World A: the applicants change",
      sub: "The detector fires for eleven months about nothing" },

    { t: "p", text: "In World A the economy does what economies do. Incomes inflate about 1.6% a month and borrowers carry more debt each month. The lending rule is untouched: an applicant who was a good risk in January is a good risk in December. Each month we score 4,000 new applicants and compare the income distribution against the training set with a two-sample Kolmogorov-Smirnov test — the standard cheap drift check, and the one you can compute without any labels at all." },

    { t: "code", lang: "python", title: "m11.py — World A, twelve months",
      code: `def world_a(m):
    X = applicants(4000,
                   INCOME_MU_0 + np.log(1.016) * m,   # compounding inflation
                   DTI_MU_0 + 0.0075 * m,            # borrowers lever up
                   rng)
    return X, 0.0                                     # the rule does not move`,
      out: `== WORLD A: the applicants change, the rule does not ==
  month  acc     AUC     appr    KS(income)  KS p-value   err  med_ms
      1  0.7608  0.8416  0.456   0.0223      8.874e-02  0    0.97
      2  0.7760  0.8580  0.467   0.0379      2.609e-04  0    1.03
      3  0.7520  0.8455  0.465   0.0454      5.118e-06  0    0.80
      4  0.7560  0.8336  0.449   0.0590      7.431e-10  0    2.26
      5  0.7628  0.8430  0.458   0.0806      5.148e-18  0    2.80
      6  0.7650  0.8429  0.462   0.0971      5.262e-26  0    2.21
      7  0.7568  0.8383  0.451   0.1031      2.869e-29  0    2.49
      8  0.7672  0.8508  0.455   0.1079      5.169e-32  0    2.10
      9  0.7580  0.8388  0.467   0.1443      5.209e-57  0    2.45
     10  0.7750  0.8605  0.471   0.1485      2.384e-60  0    1.95
     11  0.7652  0.8440  0.451   0.1529      6.191e-64  0    2.21
     12  0.7620  0.8519  0.466   0.1780      9.800e-87  0    2.36` },

    { t: "p", text: "Read the two right-hand columns against the two left-hand ones. The KS p-value crosses any threshold you like at **month 2** and then falls off a cliff: by month 12 it is **9.8e-87**, which is not a borderline result but a statistical certainty that the input distribution has moved. Meanwhile accuracy ends at **0.7620** against a launch figure of **0.7667** — four tenths of a point, inside the month-to-month noise, which spans 0.7520 to 0.7760. AUC ends **higher** than it started: 0.8519 against 0.8434." },

    { t: "callout", kind: "insight", title: "Covariate shift is not, by itself, a reason to retrain",
      body: [
        { t: "p", text: "The model learned the actual rule. Because the rule did not change, moving applicants into a region of the input space the model had seen less of **does not make its answers wrong** — it only makes them come from a different part of the same correct function." },
        { t: "p", text: "This is why drift dashboards get muted. A detector that fires for eleven consecutive months while the model is performing exactly as specified is not providing information; it is providing noise with a p-value attached. The p-value is real. Its operational meaning is nil." },
        { t: "p", text: "There is a genuine caveat: covariate shift becomes harmful when the new inputs go somewhere the model never learned, because then you are extrapolating. The honest statement is that **input drift is a reason to go and look, not a reason to act** — and that distinction is the whole difference between an alert and a page." }
      ] },

    { t: "h2", n: "04", id: "worldb", text: "World B: the rule changes",
      sub: "Twenty points, and not one signal moves" },

    { t: "p", text: "World B holds the population exactly where it was — the applicants each month are drawn from the same distribution as the training set — and changes the lending rule instead. A downturn arrives over twelve months. Two of the changes matter more than the others, because they **reorder** applicants rather than merely rescaling them:" },

    { t: "code", lang: "python", title: "m11.py — the downturn rule",
      code: `def logit_new(X):
    """The rule after the downturn.

    Two of these changes REORDER applicants rather than just rescaling them,
    which is what makes this concept drift the model cannot absorb:
      - a hard DTI knee: past 0.40 the penalty is severe, so a high-income
        high-leverage applicant flips from approve to reject;
      - tenure changes SIGN: long service in a shrinking sector stops being
        protective and starts being a warning.
    """
    income, dti, score, tenure = X[:, 0], X[:, 1], X[:, 2], X[:, 3]
    afford = (income * (1.0 - dti)) / 30000.0
    return (1.05 * np.log(afford + 1e-9)
            + 0.0040 * (score - 690)
            - 7.50 * np.maximum(0.0, dti - 0.40)      # a knee, not a slope
            - 0.060 * tenure                          # sign flip
            + 0.95)` },

    { t: "p", text: "The reordering is the point. A rule change that merely sharpens the old one leaves the ranking of applicants intact, and a model that ranks correctly survives it — the first version of this experiment did exactly that and accuracy went *up*. To actually damage a model you have to make applicants it ranked highly rank badly. The DTI knee does that to high-income, high-leverage borrowers; the sign flip on tenure does it to long-serving ones." },

    { t: "code", lang: "python", title: "m11.py — World B, twelve months",
      out: `== WORLD B: the applicants do not change, the rule does ==
  month  acc     AUC     appr    KS(income)  KS p-value   err  med_ms
      1  0.7610  0.8438  0.443   0.0155      4.362e-01  0    2.30
      2  0.7430  0.8238  0.436   0.0108      8.555e-01  0    2.36
      3  0.7400  0.8251  0.456   0.0160      4.019e-01  0    2.34
      4  0.7192  0.7961  0.446   0.0121      7.471e-01  0    1.77
      5  0.7095  0.7912  0.444   0.0170      3.236e-01  0    1.76
      6  0.6887  0.7649  0.450   0.0159      4.047e-01  0    1.86
      7  0.6650  0.7505  0.445   0.0151      4.720e-01  0    2.22
      8  0.6603  0.7311  0.451   0.0210      1.280e-01  0    2.16
      9  0.6282  0.7036  0.448   0.0084      9.795e-01  0    1.42
     10  0.6082  0.6801  0.444   0.0154      4.450e-01  0    2.04
     11  0.5933  0.6648  0.449   0.0239      5.582e-02  0    2.11
     12  0.5643  0.6326  0.450   0.0092      9.506e-01  0    1.94`,
      code: `def world_b(m):
    X = applicants(4000, INCOME_MU_0, DTI_MU_0, rng)   # same population
    return X, m / 12.0                                 # the rule ramps` },

    { t: "p", text: "Accuracy walks down every month without a single discontinuity: **0.7667 at launch, 0.5643 by month 12 — twenty-point-two points gone**, and AUC from 0.8434 to 0.6326. On a binary problem, 0.56 accuracy and 0.63 AUC is a model that has stopped being worth running. A loan book was approved on its advice the whole way down." },

    { t: "p", text: "Now read the same three columns that screamed in World A. The KS p-value finishes at **0.95** — the inputs are indistinguishable from the training distribution, because they *are* from the training distribution. It never crosses 0.01 in twelve months. There are zero errors. Median latency sits around 2 ms throughout." },

    { t: "callout", kind: "trap", title: "The approval rate is the one that should frighten you",
      body: [
        { t: "p", text: "Look at the `appr` column in World B: **0.443, 0.436, 0.456 … 0.449, 0.450**, against a launch rate of 0.451. Flat." },
        { t: "p", text: "Monitoring the output distribution is the standard fallback when you have no labels — and here it is **completely blind**, because the model keeps approving about 45% of applicants. It has not become more or less generous. It has started approving **the wrong 45%**, and a histogram of predictions cannot see the difference between those two situations." }
      ] },

    { t: "h2", n: "05", id: "silence", text: "The scoreboard",
      sub: "Which signal told you, and in which world" },

    { t: "p", text: "Put the two worlds side by side against every signal the experiment collected. This table is the argument for the rest of the course." },

    { t: "diagram", kind: "matrix", id: "dg-1_1-05-0",
      title: "Every signal, against the world it was supposed to catch",
      caption: "The diagonal is wrong in both directions. **The cheap label-free signal fires in the harmless world and is silent in the harmful one**, and the three signals an ordinary service already collects are useless in both. Only accuracy caught World B — and accuracy needs labels, which in lending arrive months after the decision.",
      rows: ["KS test on inputs", "Error rate", "Latency", "Approval rate", "Accuracy / AUC"],
      cols: ["World A (harmless)", "World B (20 points lost)"],
      cells: [
        [{ text: "FIRES from month 2, p=9.8e-87", tone: "crit" }, { text: "silent, p=0.95", tone: "crit" }],
        [{ text: "0 errors", tone: "warn" }, { text: "0 errors", tone: "crit" }],
        [{ text: "~2 ms, flat", tone: "warn" }, { text: "~2 ms, flat", tone: "crit" }],
        [{ text: "0.451 -> 0.466", tone: "warn" }, { text: "0.451 -> 0.450", tone: "crit" }],
        [{ text: "0.7667 -> 0.7620", tone: "good" }, { text: "0.7667 -> 0.5643", tone: "good" }]
      ] },

    { t: "p", text: "Two readings follow, and they are the reason this course exists." },

    { t: "p", text: "The first is that **the signal you can afford is not the signal you need**. A KS test on incoming features costs nothing: no labels, no waiting, computable every hour. It is also, on this evidence, anti-correlated with harm — it fired continuously in the world where nothing was wrong and stayed quiet through a twenty-point collapse. Accuracy was the only signal that worked, and accuracy requires knowing what actually happened, which for a loan is months of waiting." },

    { t: "p", text: "The second is that **nothing in a normal deployment pipeline would have stopped this**. There was no bad commit to revert, no failing test, no exception, no latency regression and no alert. A rollback would have restored a model that was already the problem. The code was perfect for twelve months while the system became worthless." },

    { t: "callout", kind: "note", title: "What this does not say",
      body: [
        { t: "p", text: "It does not say input drift monitoring is worthless. In World B the *pipeline* was healthy; a broken upstream job that starts sending nulls or a rescaled column is a real and common failure that a distribution check catches immediately, and that case is lesson 11.1's fourth category." },
        { t: "p", text: "It says the detector and the harm are **different things**, and that a programme which measures only inputs has not measured the thing it cares about. Module 11 takes all three statistics apart and shows where each one's threshold comes from; lesson 16.2 builds the prediction log that makes accuracy computable later, once the labels do arrive." }
      ] },

    { t: "h2", n: "06", id: "consequence", text: "What follows from this",
      sub: "Why the course is shaped the way it is" },

    { t: "p", text: "If a frozen artifact can decay silently, then four things have to be true of your system before you can operate it, and each is a phase of this course." },

    { t: "diagram", kind: "steps", id: "dg-1_1-06-0",
      title: "The four requirements, in dependency order",
      caption: "They are in this order because each depends on the one before it. **You cannot diagnose an incident you cannot see, and you cannot fix one you cannot reproduce** — which is why tracking and versioning come first even though monitoring is the part that feels urgent.",
      items: [
        { label: "Reproducible", desc: "Every model traces back to a data snapshot, a commit and an environment. Lessons 1.2, 1.3 and 15.x." },
        { label: "Shippable and reversible", desc: "A new model reaches traffic gradually and leaves quickly, so the blast radius is a choice. Lessons 3.1-3.3." },
        { label: "Observable", desc: "Inputs, output, model version and label all recorded, so drift and skew stay computable. Lessons 7.x, 16.2." },
        { label: "Diagnosable", desc: "A path from symptom to cause for each incident class: which distribution moved, and why. Phase 5." }
      ] },

    { t: "p", text: "Notice what is *not* on that list: a better model. Every failure in this lesson happened to a model that was fine. The accuracy that was lost was not lost to bad modelling, and no amount of extra AUC at training time would have prevented it." },

    { t: "exercise", kind: "practice", title: "Which clock moved?", difficulty: "intro", minutes: 20,
      prompt: "For a model you actually work on — or one you can imagine concretely — answer four questions in writing. First: how long after a prediction does the true label arrive? Be honest; for churn or lending it may be months. Second: if P(Y|X) changed next month, name the signal in your current monitoring that would move, and say how long it would take. Third: if your answer to the second question was 'none' or 'accuracy, eventually', say what you would have to log today to make that number computable later. Fourth: look at a drift alert your team has actually received and decide, with the reasoning written down, whether it was World A or World B.",
      hints: [
        "The label delay is the single number that decides which signals are even available to you.",
        "If the only answer is accuracy, the real question is what the prediction log has to contain — lesson 16.2.",
        "A drift alert nobody acted on was probably World A. That is worth saying out loud rather than treating it as a failure of discipline."
      ],
      solution: {
        body: [
          { t: "p", text: "The useful outcome is a label-delay figure and an honest list. Most teams discover two things: the delay is much longer than they assumed, and the only harm-correlated signal they have is one that needs labels they do not have yet." },
          { t: "p", text: "That gap is not solved by a better detector. It is solved by logging enough at prediction time that the measurement becomes possible once the labels land, plus a proxy that is genuinely correlated with harm in the meantime — a human review sample, a complaint rate, a downstream business metric. Picking that proxy is lesson 16.1's four pillars, and the business metric is the one that proves harm." }
        ]
      } }

  ],

  takeaways: [
    "**An ML system has two clocks**: one ticks on commits, the other when the world moves. Version control only sees the first.",
    "**Behaviour = f(code, data, world)**, so a frozen artifact is not a frozen behaviour — which breaks the assumption every deployment tool is built on.",
    "**Covariate shift (P(X) moves) and concept drift (P(Y|X) moves) are different problems.** Both are called drift; only one of them reliably hurts.",
    "**World A: KS fired from month 2 and reached p=9.8e-87, and accuracy did not fall** (0.7667 -> 0.7620, inside the 0.7520-0.7760 noise band). AUC went up.",
    "**World B: inputs were indistinguishable (KS p=0.95, never flagged) and accuracy fell 20.2 points**, 0.7667 -> 0.5643, AUC 0.8434 -> 0.6326.",
    "**The cheap signal is anti-correlated with harm here** — it alerted continuously in the harmless world and never once in the damaging one.",
    "**Approval rate stayed at 0.450 through the collapse**, so prediction-distribution monitoring was blind: the model approved the same share of applicants, just the wrong ones.",
    "**Zero errors and flat latency in both worlds.** Nothing in an ordinary pipeline — tests, exceptions, p99, rollback — engages with this failure at all.",
    "**Concept drift only hurts when it reorders.** A rule change that rescales but preserves ranking left accuracy intact; the DTI knee and the tenure sign flip are what did the damage.",
    "**Retraining is not always the answer, and is sometimes unavailable** — with a months-long label delay you cannot retrain on a world you cannot yet measure.",
    "**The fix is structural, not statistical**: be reproducible, be reversible, be observable, be diagnosable. That is the shape of this course."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A drift dashboard has flagged your main input feature every day for three weeks. Offline accuracy on a freshly labelled sample is unchanged. What is the most likely situation?",
        options: [
          "The model is degrading and the accuracy sample is too small to show it",
          "Covariate shift with the rule intact — the inputs genuinely moved, and because P(Y|X) did not change the model's answers are still correct",
          "The drift detector is misconfigured and should be removed"
        ],
        answer: 1,
        why: "This is World A. The p-value is real and its operational meaning is nil: the population moved into a different part of a function the model still gets right. The detector is not broken and should not be deleted — but it should be an alert you look at, not a page, and the thing that gates a retrain has to be correlated with harm."
      },
      {
        stem: "Your model's prediction distribution is being monitored and has been stable for months. What does that rule out?",
        options: [
          "Concept drift, since a changed rule would change the output mix",
          "Almost nothing — the approval rate held at 0.450 through a 20-point accuracy collapse, because the model approved the same share of applicants and the wrong ones",
          "Data quality problems upstream"
        ],
        answer: 1,
        why: "Output-distribution monitoring detects a change in how generous the model is, not a change in whether it is right. Measured here: 0.451 at launch, 0.450 at month 12, with accuracy down from 0.7667 to 0.5643 in between."
      },
      {
        stem: "A rule change arrives that makes every applicant's score uniformly stricter, preserving their order. What happens to a deployed model's AUC?",
        options: [
          "It falls sharply, because P(Y|X) changed",
          "It is largely unharmed, because AUC measures ranking and the ranking was preserved — the first version of this experiment did exactly this and accuracy rose",
          "It is unaffected, because AUC is threshold-independent and therefore drift-independent"
        ],
        answer: 1,
        why: "Concept drift damages a model in proportion to how much it reorders. A monotone sharpening leaves ranking intact, so a ranking metric barely moves; the calibration and the decision threshold are what need attention. The knee and the sign flip in World B reorder, which is why they cost 21 points of AUC."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Why is deploying a machine learning model harder than deploying a web service?",
        strong: "Because a web service's behaviour is a function of its code, and a model's is a function of its code and its data. The code is in version control and the data is not, so a frozen artifact is not a frozen behaviour. Concretely: I have run a frozen model through twelve months where the lending rule shifted and watched accuracy fall from 0.77 to 0.56 with zero exceptions, flat latency and an unchanged approval rate. Nothing in a normal pipeline engages with that — there is no bad commit to revert, and rolling back restores the model that is already the problem.",
        answer: [
          { t: "p", text: "The structural answer — behaviour = f(code, data) and only one is versioned — is what separates this from a list of MLOps tools. Having a measured example makes it concrete rather than theoretical." },
          { t: "p", text: "A strong answer adds the consequence: the failure mode is not a crash but a confident wrong answer, which is why the whole discipline is about observability and reversibility rather than about testing harder." }
        ]
      },
      {
        level: "senior",
        q: "We alert on feature drift. Is that enough?",
        strong: "No, and it can be actively misleading. Feature drift detects P(X) moving, which is often harmless — in a measurement I ran, a KS test fired from month 2 and reached p = 9.8e-87 while accuracy stayed flat and AUC improved. The damaging case was the opposite: the inputs were statistically identical, KS p = 0.95, and accuracy fell twenty points because P(Y|X) had changed. So feature drift is a reason to investigate, not a reason to retrain. What is needed is a signal correlated with harm: labels when they arrive, and before that a proxy — a human review sample, a complaint rate, a downstream business metric — plus a prediction log rich enough to compute accuracy retrospectively once the labels land.",
        answer: [
          { t: "p", text: "The point that lands in an interview is that the detector and the harm are different things, and that an input-only programme has not measured what it cares about. Naming the label delay as the thing that decides which signals are even available shows operational experience." },
          { t: "p", text: "Be careful not to overclaim: a distribution check is the right tool for a broken upstream pipeline — nulls, a rescaled column, a changed unit — and that is a genuinely common failure. The claim is about what should gate a retrain, not about deleting the check." }
        ]
      },
      {
        level: "senior",
        q: "A model's accuracy has dropped. How do you work out why?",
        strong: "First I separate which of four things moved, because the fix differs completely. Did the input distribution change, did the relationship between inputs and label change, did the label base rate change, or did the pipeline change and start producing different features from the same raw data? The fourth is the most common and the only one that is a bug: I would check it first by replaying a stored raw request through the current feature code and comparing the vector against what was logged at the time. If the features reproduce, it is not a pipeline problem and I compare input distributions against the training snapshot to separate covariate shift from concept drift. Retraining is the response to concept drift; it does nothing for a pipeline bug except launder it into the model.",
        answer: [
          { t: "p", text: "Leading with the taxonomy, and with the fact that only one branch is a bug, is the difference between a diagnosis and a guess. Checking the pipeline first is right on frequency grounds." },
          { t: "p", text: "The sentence worth keeping is that retraining on a pipeline bug encodes the bug into the model, so the symptom disappears and the cause does not. That is lesson 11.1's fourth category and lesson 13.4's detection test." }
        ]
      }
    ]
  }
});
