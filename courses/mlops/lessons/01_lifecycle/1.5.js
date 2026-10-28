EC.receiveLesson({
  id: "1.5",

  lede: "Six realistic corruptions of one batch, four classes of check, and a table showing which sees what. The ordering is the lesson, and it repeats the shape of 1.1: **the corruption a type check catches turned out to be harmless** — coerced back to numbers, accuracy was identical to clean — while a unit change that is numeric, non-null and raises nothing took accuracy from **0.7760 to 0.5853** and the approval rate from **0.447 to 0.036**. One corruption was caught by **nothing at all**: twenty percent duplicate rows, every value valid, every distribution unmoved.",

  objectives: [
    "Separate the four classes of data check and name what each one alone can see",
    "Derive expectations from the training data rather than writing thresholds by hand",
    "Identify the corruptions that pass every row-level check and still change the predictions",
    "Decide which findings should block a pipeline and which should only warn, from the measured harm"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", id: "boundary", text: "The boundary, and why it is the cheapest place to stand",
      sub: "A bad row costs more the further it travels" },

    { t: "p", text: "Every lesson so far has been about something you discover late: a model that decayed for twelve months, a run you cannot reproduce, a leak that shipped because it won the offline comparison. Validation is the opposite shape. It is a check at the edge of the system, where a problem is still cheap, and its entire value is in how early it fires." },

    { t: "p", text: "The economics are stark. A corrupted batch rejected at ingestion costs a pipeline rerun. The same batch accepted costs, in order: a retraining run, a model that encodes the corruption, a promotion gate that compares two corrupted things and sees no regression, and finally an incident in which somebody has to work out why predictions changed three weeks ago. The same bytes, and four orders of magnitude of difference in what they cost to fix." },

    { t: "p", text: "The setup is the loan model again. A validator is written here rather than imported — Great Expectations and Pandera are not installed on this machine — and the point is to see which *class* of check catches which corruption, which is a property of the check and not of the library." },

    { t: "h2", n: "02", id: "spec", text: "Expectations derived, not written",
      sub: "The thresholds come from the data" },

    { t: "p", text: "The first design decision matters more than the checks themselves. A spec whose numbers are typed in by hand is a spec that is wrong within a quarter and then gets muted. So the expectations are **computed from the training set**, which means they describe the data the model actually learned from, and they can be regenerated whenever that changes." },

    { t: "code", lang: "python", title: "m15.py — the spec, derived from the training data",
      code: `# Derived FROM the training data, not written by hand -- which is the only way
# the numbers stay honest when the data is re-generated.
SPEC = {}
for c in COLS:
    v = train[c].values
    SPEC[c] = dict(dtype="float",
                   lo=float(np.quantile(v, 0.001)),
                   hi=float(np.quantile(v, 0.999)),
                   mean=float(v.mean()), std=float(v.std()),
                   nulls_allowed=0.0)`,
      out: `== the expectations, derived from the training set ==
  income        range [    12662.17 ,    208068.14]   mean   57234.18  sd  26824.65
  dti           range [        0.01 ,         0.68]   mean       0.31  sd      0.12
  credit_score  range [      468.83 ,       850.00]   mean     689.99  sd     69.10
  tenure        range [        0.00 ,        31.72]   mean       4.97  sd      4.87` },

    { t: "p", text: "The range uses the 0.1st and 99.9th percentiles rather than the minimum and maximum, because a bound set at the observed extreme will fire on the first legitimately unusual applicant. The tolerance for how often a value may fall outside is 1%, which is deliberately far above 0.2% — a bound derived from quantiles should expect to be exceeded occasionally." },

    { t: "callout", kind: "good", title: "Regenerate the spec with the model, and version it",
      body: [
        { t: "p", text: "The spec is derived from the training data, so it belongs to the model, not to the pipeline. It should be written alongside the artifact, carry the same `data_sha` from lesson 1.2, and be regenerated whenever the model is retrained." },
        { t: "p", text: "A spec that outlives the model it describes is the mechanism by which validation becomes noise: the data legitimately moves, the old bounds fire constantly, and somebody raises the tolerance until nothing fires at all." }
      ] },

    { t: "p", text: "The validator itself is four checks, kept deliberately separate so that the output says *which kind* of problem this is — because that determines what to do about it." },

    { t: "code", lang: "python", title: "m15.py — four classes of check",
      code: `def validate(df, spec=SPEC):
    """Four classes of check. Each returns the findings it alone can see."""
    out = {"schema": [], "nulls": [], "range": [], "distribution": []}
    for c, s in spec.items():
        if c not in df.columns:
            out["schema"].append("%s: column missing" % c); continue
        if not pd.api.types.is_numeric_dtype(df[c]):
            out["schema"].append("%s: dtype is %s, expected numeric"
                                 % (c, df[c].dtype)); continue
        v = df[c].values.astype(float)
        nulls = float(np.isnan(v).mean())
        if nulls > s["nulls_allowed"]:
            out["nulls"].append("%s: %.1f%% null, none allowed" % (c, 100 * nulls))
        ok = v[~np.isnan(v)]
        frac_out = float(((ok < s["lo"]) | (ok > s["hi"])).mean())
        if frac_out > 0.01:
            out["range"].append("%s: %.1f%% outside [%.2f, %.2f]"
                                % (c, 100 * frac_out, s["lo"], s["hi"]))
        shift = abs(ok.mean() - s["mean"]) / (s["std"] + 1e-12)
        if shift > 0.25:
            out["distribution"].append("%s: mean shifted %.2f sd (%.2f vs %.2f)"
                                       % (c, shift, ok.mean(), s["mean"]))
    return out` },

    { t: "p", text: "The distinction between the third and fourth checks is the one worth being precise about. **Range is a statement about individual values** — is this number one that could ever have occurred? **Distribution is a statement about the batch** — every value is plausible, but are there collectively too many large ones? They catch different things, and the duplicate-rows case below shows that neither catches everything." },

    { t: "h2", n: "03", id: "matrix", text: "Six corruptions",
      sub: "Each one something that has actually happened to somebody" },

    { t: "p", text: "The corruptions are not adversarial. Each is a thing an upstream team does on an ordinary Tuesday: a schema change, a join that starts missing, a unit change, a sentinel value, a real population shift, and a retry that duplicates." },

    { t: "code", lang: "python", title: "m15.py — the corruptions",
      code: `def corrupt_dtype(df):      # an upstream job emits income as a formatted string
    d = df.copy(); d["income"] = ["%.2f" % x for x in d["income"]]; return d

def corrupt_units(df):      # income switches from units to thousands. THE silent one.
    d = df.copy(); d["income"] = d["income"] / 1000.0; return d

def corrupt_sentinel(df):   # missing scores arrive as -1 instead of null
    d = df.copy()
    idx = rng.choice(len(d), size=int(0.08 * len(d)), replace=False)
    d.loc[idx, "credit_score"] = -1.0; return d

def corrupt_dupes(df):      # a retry duplicates 20% of rows. Every value is valid.
    d = df.copy()
    idx = rng.choice(len(d), size=int(0.20 * len(d)), replace=False)
    return pd.concat([d, d.iloc[idx]], ignore_index=True)`,
      out: `== what each class of check sees ==
  corruption              schema  nulls   range   dist
  clean                   -       -       -       -
  income as string        CAUGHT  -       -       -
  12% nulls in score      -       CAUGHT  -       -
  income in thousands     -       -       CAUGHT  CAUGHT
  -1 sentinel for score   -       -       CAUGHT  CAUGHT
  dti +0.06 shift         -       -       -       CAUGHT
  20% duplicate rows      -       -       -       -` },

    { t: "p", text: "Each row of that table is a different answer, and the last one is a blank. Now put it beside what each corruption actually did to the model, which is the comparison that tells you what the checks are worth." },

    { t: "code", lang: "python", title: "m15.py — and what each one does to the predictions",
      out: `== what each corruption does to the predictions ==
  corruption              accuracy  AUC       approval  model raised
  clean                   0.7760    0.8526    0.447     nothing
  income as string        0.7760    0.8526    0.447     nothing
  12% nulls in score      0.7648    0.8414    0.456     nothing
  income in thousands     0.5853    0.7441    0.036     nothing
  -1 sentinel for score   0.7530    0.8092    0.410     nothing
  dti +0.06 shift         0.7718    0.8496    0.393     nothing
  20% duplicate rows      n/a       n/a       0.448     nothing` },

    { t: "p", text: "The right-hand column is the first thing to notice. **The model raised nothing in any case.** Not for a string column, not for nulls, not for an income of 57 where it expects 57,000. A trained estimator is a numerical function; it has no opinion about whether its inputs are meaningful. Everything protective has to happen before this point." },

    { t: "diagram", kind: "matrix", id: "dg-1_5-03-0",
      title: "What each check sees, against what each corruption costs",
      caption: "Read the two halves against each other and the ordering is inverted. **The corruption a type check catches cost nothing; the one that cost 19 points of accuracy is invisible to both type and null checks**; and the one nothing catches changes no distribution at all.",
      rows: ["income as string", "12% nulls in score", "income in thousands", "-1 sentinel for score", "dti +0.06 shift", "20% duplicate rows"],
      cols: ["Caught by", "Cost to accuracy"],
      cells: [
        [{ text: "schema", tone: "good" }, { text: "0.7760, unchanged", tone: "good" }],
        [{ text: "nulls", tone: "good" }, { text: "0.7648, -1.1 pts", tone: "warn" }],
        [{ text: "range + distribution", tone: "warn" }, { text: "0.5853, -19.1 pts", tone: "crit" }],
        [{ text: "range + distribution", tone: "warn" }, { text: "0.7530, -2.3 pts", tone: "warn" }],
        [{ text: "distribution only", tone: "warn" }, { text: "0.7718, -0.4 pts", tone: "good" }],
        [{ text: "NOTHING", tone: "crit" }, { text: "metrics invalid, not wrong", tone: "crit" }]
      ] },

    { t: "h2", n: "04", id: "units", text: "The unit change",
      sub: "Numeric, complete, and catastrophic" },

    { t: "p", text: "`income / 1000` is the corruption worth dwelling on, because it is both the most damaging here and the most common in practice. An upstream team changes a column from pounds to thousands of pounds, or a currency conversion is applied twice, or a percentage becomes a fraction." },

    { t: "code", lang: "python", title: "m15.py — the detail on the unit change",
      out: `  income in thousands:
    income: 100.0% outside [12662.17, 208068.14]
    income: mean shifted 2.13 sd (57.37 vs 57234.18)

=============================== THE POINT ===============================
  'income in thousands' is numeric, has no nulls, and raised nothing.
    accuracy 0.7760 -> 0.5853   approval 0.447 -> 0.036
    caught by: range, distribution` },

    { t: "p", text: "Accuracy falls **19.1 points**, and the approval rate collapses from **0.447 to 0.036**. The model now believes almost every applicant earns about fifty pounds a year, and rejects them accordingly. In a real loan book that is a day of declining essentially everyone — a visible, expensive, reputationally awful outcome, caused by a division." },

    { t: "p", text: "And the checks that would have caught it are the ones teams implement last. A schema check passes: the column is a float, as specified. A null check passes: nothing is missing. Only the range check — *100% of values outside what was ever seen* — and the distribution check see it. That `100.0%` is as unambiguous a signal as data validation ever produces, and it requires having written down what the training distribution looked like." },

    { t: "callout", kind: "trap", title: "Coercion is what turns a loud failure into a quiet one",
      body: [
        { t: "p", text: "Notice that `income as string` cost nothing: the scoring path coerced it with `pd.to_numeric` and recovered the original numbers exactly, so accuracy was identical at 0.7760. The schema check fired on a corruption that was harmless." },
        { t: "p", text: "That is luck, and it is the dangerous kind. The same coercion applied to a column containing `\"1,234.00\"` or `\"N/A\"` yields NaN silently and fills it with a median downstream. **A coercion that usually works is worse than one that never does**, because it removes the failure in testing and leaves it in production." }
      ] },

    { t: "h2", n: "05", id: "dupes", text: "The one nothing catches",
      sub: "Valid rows, valid distributions, invalid conclusions" },

    { t: "p", text: "Twenty percent of rows duplicated. Every value is one that genuinely occurred. Every column's mean is unmoved — the duplicated rows are a random sample, so they do not shift the distribution. The approval rate is **0.448 against 0.447**. The validator reports nothing, and it is right to: there is no bad *value* anywhere in the batch." },

    { t: "p", text: "The damage is not to any row. It is to every aggregate computed from the batch, and therefore to every decision made from those aggregates:" },

    { t: "dl", items: [
      { k: "In training", v: "Duplicated rows are upweighted, and if duplication correlates with anything — a retry is more likely on a slow request, which may correlate with a region or a device — the model is silently reweighted toward that segment." },
      { k: "Across the split", v: "A duplicated row can land in both train and test, which makes the holdout optimistic. This is the mechanism behind an offline score nobody can reproduce." },
      { k: "In metrics", v: "Volumes, conversion rates and revenue are all inflated by exactly the duplication rate, so the business metric that should be your ground truth from lesson 16.1 is wrong too." },
      { k: "In drift detection", v: "A duplicated batch has a tighter distribution than the real one, so the statistics of lesson 11.2 become overconfident about a population that was never sampled that densely." }
    ] },

    { t: "p", text: "The check it needs is a different kind: a uniqueness constraint on a key, or a row count against an expected volume, or a duplicate-fraction threshold. None of those is a statement about a column's values, which is why a column-oriented validator — and that is most of them, including the one written above — cannot express it." },

    { t: "callout", kind: "insight", title: "Validate the batch, not only the columns",
      body: [
        { t: "p", text: "Column checks answer *are these values plausible*. A batch needs three more assertions that no column check can make: **is the row count what we expected**, **is the key unique**, and **does this batch overlap the previous one**." },
        { t: "p", text: "The third is the one that catches a re-delivered file, which is the commonest cause of duplication in practice and the one that quietly doubles a day's volume." }
      ] },

    { t: "h2", n: "06", id: "policy", text: "Block or warn",
      sub: "The decision the measurement makes for you" },

    { t: "p", text: "A validator that blocks on everything stops the pipeline weekly and gets disabled. One that warns on everything is a log nobody reads. The measured harm column is what makes this decision defensible rather than a matter of taste." },

    { t: "diagram", kind: "steps", id: "dg-1_5-06-0",
      title: "A policy derived from the measured cost",
      caption: "The principle: **block when the batch cannot be correct, warn when it is merely different.** A range violation at 100% is impossible data; a 0.5-sd mean shift is a Tuesday, and lesson 1.1 showed that acting on it is usually wrong.",
      items: [
        { label: "Block: schema, and range violations above a few percent", desc: "A missing column, or 100% of values out of range, cannot be valid data. The unit change cost 19.1 points." },
        { label: "Block: row count or uniqueness violations", desc: "The checks nothing above caught. A re-delivered file or a broken key invalidates every aggregate, silently." },
        { label: "Warn, with a threshold: nulls and sentinels", desc: "12% nulls cost 1.1 points, the -1 sentinel 2.3. Recoverable only if the imputation is the trained one." },
        { label: "Log, do not page: a distribution shift", desc: "dti +0.06 moved the mean half an sd and cost 0.4 points: lesson 1.1's World A, and how alerts get muted." }
      ] },

    { t: "p", text: "The last row is the connection back to the start of the module. A distribution check is the only thing that catches a unit change *and* the thing that fires on harmless population movement. Same statistic, two meanings — which is why it should report, and why the thing that blocks a pipeline should be the range violation that proves the data is impossible rather than merely new." },

    { t: "table",
      head: ["The check", "The question it answers", "Verdict from the measurement"],
      rows: [
        ["Column present, dtype correct", "Did the schema change?", "Block. Cheap, unambiguous — though here the harm was nil."],
        ["Null fraction", "Is a join failing?", "Warn at a threshold. Cost 1.1 points at 12%."],
        ["Value range, from quantiles", "Could this number have occurred?", "Block above a few percent. Caught the 19-point failure."],
        ["Sentinel values", "Is -1 or 999 standing in for null?", "Block. Caught by range here, but name it explicitly."],
        ["Batch mean shift", "Has the population moved?", "Log. Fires on harmless change — see 1.1 and 11.2."],
        ["Row count against expectation", "Did we get a partial or doubled file?", "Block. Nothing else catches it."],
        ["Key uniqueness and batch overlap", "Is this file a re-delivery?", "Block. The duplicate case, invisible to every column check."]
      ] },

    { t: "exercise", kind: "practice", title: "Find the check you do not have", difficulty: "core", minutes: 30,
      prompt: "Take the input to a model you run and write down the four classes of check it currently has, honestly — most pipelines have schema and nothing else. Then take the six corruptions from this lesson and, for each, work out whether your pipeline would notice: a column arriving as a string, a join losing 12% of rows, a unit change, a -1 sentinel, a half-sd population shift, and a re-delivered file. For each one you would miss, write the check and decide block or warn. Then do the measurement that justifies the decision: apply the corruption to a real batch, score it, and record what it does to your predictions and your approval or conversion rate.",
      hints: [
        "The re-delivered file is the one almost nobody checks, and the easiest to test: concatenate yesterday's batch onto today's and see whether anything complains.",
        "Derive range bounds from quantiles of the training data rather than typing them, or they will be stale within a quarter.",
        "Decide block-or-warn from the measured harm, not from how serious the corruption sounds."
      ],
      solution: {
        body: [
          { t: "p", text: "Two findings are near-universal. The pipeline has a schema check — because the warehouse enforces one — and no range or volume checks at all, which is precisely the inverted ordering this lesson measured: the check that exists catches the harmless corruption." },
          { t: "p", text: "The other is that nobody can say what the expected row count is, because it was never written down. That makes the duplicate and partial-file cases undetectable, and it is a one-line fix: record the count per batch, alert on a deviation from the trailing median." }
        ]
      } }

  ],

  takeaways: [
    "**A trained model raises nothing, ever.** In all six corruptions the estimator predicted happily, including on an income of 57 where it expected 57,000 — so everything protective must happen before it.",
    "**Derive the spec from the training data**, using quantiles rather than min/max, and version it with the model under the same `data_sha`. A hand-typed spec is stale within a quarter and then gets muted.",
    "**Four separate classes of check**: schema (is it a number), nulls (is a join failing), range (could this value occur), distribution (has the batch moved). They catch different things.",
    "**The ordering is inverted, as in 1.1**: `income as string` was caught by the type check and cost nothing — coercion recovered it exactly, 0.7760 unchanged.",
    "**The unit change cost 19.1 points** — accuracy 0.7760 to 0.5853 and the approval rate 0.447 to 0.036 — while being numeric, complete and silent. Only range and distribution saw it.",
    "**`100.0% outside [12662.17, 208068.14]` is as unambiguous as validation gets**, and it requires having written down the training distribution.",
    "**A coercion that usually works is worse than one that never does**: the same `pd.to_numeric` that rescued a clean string column yields silent NaN on `\"1,234.00\"` or `\"N/A\"`.",
    "**20% duplicate rows were caught by nothing**: every value valid, no distribution moved, approval 0.448 against 0.447 — and every aggregate computed from the batch is wrong.",
    "**Duplication upweights training rows, leaks across the train/test split, inflates business metrics and makes drift statistics overconfident** — four separate harms, no bad value anywhere.",
    "**Column checks cannot express a batch assertion.** Row count against expectation, key uniqueness and overlap with the previous batch are a different kind of check, and the third catches a re-delivered file.",
    "**Block when the batch cannot be correct, warn when it is merely different** — and a distribution shift is 'merely different', which is why it should log rather than page."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An upstream team changes an income column from units to thousands. Your pipeline checks dtypes and null fractions. What happens?",
        options: [
          "The dtype check fails, because the magnitude changed",
          "Both checks pass, the model raises nothing, and predictions change severely — measured here as accuracy 0.7760 to 0.5853 and approval 0.447 to 0.036",
          "The model raises a ValueError on out-of-range input"
        ],
        answer: 1,
        why: "The column is still a float and still complete, so neither check has anything to say, and an estimator is a numerical function with no notion of meaning. Only a range check derived from the training distribution sees it — and it sees it unambiguously, at 100% of values outside the expected bounds."
      },
      {
        stem: "A retry duplicates 20% of rows in a batch. Which class of check detects it?",
        options: [
          "The distribution check, since the batch no longer matches the reference",
          "None of the column-level checks — every value is valid and a random duplication moves no mean; it needs a row-count, uniqueness or batch-overlap assertion",
          "The null check, because duplicated keys produce nulls on join"
        ],
        answer: 1,
        why: "Measured: no check fired and the approval rate moved from 0.447 to 0.448. The damage is to aggregates rather than values — upweighted training rows, leakage across the split, inflated volumes, and overconfident drift statistics. That requires a batch-level assertion, which most column-oriented validators cannot express."
      },
      {
        stem: "Which validation finding should block a pipeline rather than warn?",
        options: [
          "A feature's mean has shifted half a standard deviation from the training reference",
          "100% of a column's values fall outside the range ever seen in training — the data cannot be correct, as against merely being different",
          "Any finding at all; validation should be strict by default"
        ],
        answer: 1,
        why: "The distinction is possible-versus-impossible. A half-sd shift is ordinary population movement — it cost 0.4 points here and is lesson 1.1's World A, where acting on it is usually wrong. Blocking on everything is how a validator gets disabled, which is strictly worse than not having one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What would you validate about data arriving at a model?",
        strong: "Four classes, because they catch different things. Schema: columns present and typed. Nulls: is a join failing. Range: could this value ever have occurred, with bounds derived from quantiles of the training data rather than typed by hand. Distribution: has the batch moved as a whole even though every value is plausible. Then two batch-level assertions that no column check can express — row count against expectation, and key uniqueness or overlap with the previous batch. I would add that the model itself raises nothing in any of these cases; I have measured an income unit change taking accuracy from 0.78 to 0.59 with no exception anywhere.",
        answer: [
          { t: "p", text: "Separating the four classes, and then naming the batch-level checks as a distinct kind, is what distinguishes this from a list. Most answers stop at schema and nulls, which is also what most pipelines do." },
          { t: "p", text: "Deriving bounds from the training data is the detail that shows operational experience, because hand-typed thresholds going stale is the mechanism by which validation gets switched off." }
        ]
      },
      {
        level: "senior",
        q: "A pipeline's validation suite has been disabled because it was too noisy. How would you bring it back?",
        strong: "By splitting block from warn on measured harm rather than on severity of language. I would take the real corruptions — unit change, nulls, sentinel, population shift, re-delivery — apply each to a real batch, score it, and record what it does to the predictions and to the business metric. Then block only where the data cannot be correct: a missing column, a large fraction out of range, a row count or uniqueness violation. A distribution shift logs, because it fires on ordinary population movement, which I have measured costing 0.4 points of accuracy while shifting a mean half a standard deviation. And I would derive the thresholds from the training data and version the spec with the model, so it does not go stale and get muted again.",
        answer: [
          { t: "p", text: "The insight is that noise is a design failure, not a discipline failure: a suite that blocks on a Tuesday-shaped change will be disabled, and should be." },
          { t: "p", text: "Grounding block-or-warn in a measurement is the senior move. It makes the policy arguable with evidence rather than by seniority." }
        ]
      },
      {
        level: "senior",
        q: "Why is a silent type coercion worse than a crash?",
        strong: "Because it removes the failure from your test environment and leaves it in production. A crash happens on the first bad row, in staging, with a stack trace pointing at the column. A coercion produces a number, or a NaN that something fills with a median, and the batch completes — so the pipeline is green and the predictions are wrong. I measured a clean case where coercion recovered a stringified column exactly, accuracy identical to baseline, which is the dangerous outcome: the same code path on a value like \"1,234.00\" or \"N/A\" yields NaN silently. So I want validation to decide explicitly, and imputation to be the trained imputer rather than a convenience default applied at read time.",
        answer: [
          { t: "p", text: "The 'it worked, which is the problem' framing is the strong part — a coercion that usually succeeds is what makes the failure unobservable until it matters." },
          { t: "p", text: "Linking to imputation is the right follow-through: a median filled at read time differs from the imputer fitted in training, which is exactly the training-serving skew of lesson 13.1." }
        ]
      }
    ]
  }
});
