EC.receiveLesson({
  id: "1.4",

  lede: "A feature store is usually sold as infrastructure for reuse and low-latency lookups. Its most valuable property is narrower and much harder to replicate by hand: it makes you pass a **timestamp** alongside the entity, which makes one specific bug impossible to write. That bug is a window computed relative to today instead of to each row's decision date — `WHERE ts >= CURRENT_DATE - 90`, one line of SQL from correct. Built deliberately here, it counted **3.4 times more late payments** than the honest join, correlated **+0.4767** with a factor nobody can observe at decision time against **+0.0884**, and produced a model that looked **2.6 points better offline** and then lost **2.5 points** on contact with production — ending up slightly *worse* than the model it beat.",

  objectives: [
    "Explain what a point-in-time join is and why a feature store's API demands an entity and a timestamp",
    "Recognise the current-date window bug in SQL or pandas, and say why a random train/test split cannot catch it",
    "Quantify a leak by correlating the feature against something unavailable at decision time",
    "Describe the offline/online split of a feature store and the one property that matters most about it"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", id: "clock", text: "Features have a clock too",
      sub: "A row is not a customer, it is a customer at a moment" },

    { t: "p", text: "Lesson 1.1 established that an ML system has a clock the repository cannot see. Feature engineering has the same problem one level down, and it is the single most expensive bug in applied ML because it inflates your offline numbers rather than breaking anything." },

    { t: "p", text: "The setup is a loan book. Customers have a transaction history, each applies on their own date, and the label is whether they defaulted in the twelve months after that date. The feature is ordinary: recent spending and recent late payments." },

    { t: "p", text: "The thing to hold onto is that a training row is **not a customer**. It is a customer *as they were on the day of the decision*. The label belongs to a moment, so every feature beside it has to belong to the same moment. A feature computed from any other moment is not a worse feature — it is a different kind of object, and it describes a world the model will never be asked about." },

    { t: "callout", kind: "mental", title: "The question every feature has to answer",
      body: [
        { t: "p", text: "**What would this value have been, at the instant the prediction was made?** If your feature pipeline cannot answer that for an arbitrary past timestamp, it cannot build a correct training set — and no amount of cross-validation will reveal the problem, because the error is in the data, not in the fit." }
      ] },

    { t: "code", lang: "python", title: "m14.py — the latent factor, and the channel the leak flows down",
      code: `# A latent factor nobody can observe at decision time. It drives the default,
# and it drives behaviour AFTER the decision -- the channel the leak flows down.
trouble = rng.beta(2.0, 5.0, N_CUST)

for m in range(MONTHS):
    if m < apply_month[c]:
        amt = base_spend[c] * rng.lognormal(0.0, 0.25)
        late = rng.random() < 0.05 + 0.10 * trouble[c]      # weak signal
    else:
        # After the decision, trouble is loud: spending collapses and
        # payments slip. Both are consequences of the thing we predict.
        amt = base_spend[c] * (1.0 - 0.80 * trouble[c]) * rng.lognormal(0.0, 0.25)
        late = rng.random() < 0.03 + 0.85 * trouble[c]      # strong signal`,
      out: `== the tables ==
  events      144000 rows, 2024-01-01 .. 2025-12-18
  build date  2025-12-21   (the day the training set is assembled)
  labels      6000 rows, default rate 0.386
  decisions   2024-06-29 .. 2025-02-24` },

    { t: "p", text: "`trouble` is the device that makes this measurable. It is unobservable at decision time, it causes the default, and it also causes post-decision behaviour: spending collapses and payments slip. Any feature that reads post-decision rows therefore picks up a proxy for the label. That is what a leak *is* — not a mistake in the arithmetic, but an unintended path from the future into the feature." },

    { t: "p", text: "Note the dates, because they are the whole experiment. Decisions run from June 2024 to February 2025. The table runs to December 2025. The training set is assembled on **2025-12-21**. There is therefore between ten and eighteen months of post-decision data sitting in the same table, and it looks exactly like the pre-decision data." },

    { t: "h2", n: "02", id: "bug", text: "The bug, in one line",
      sub: "A window relative to today instead of to the row" },

    { t: "p", text: "Here are the two joins. They differ by a single predicate, and one of them is what almost everybody writes first — because it is one `groupby`, it runs fast, and it produces a clean-looking table with no nulls." },

    { t: "code", lang: "python", title: "m14.py — the naive join and the as-of join",
      code: `# --- naive: "the last 90 days", relative to the build date ------------------
#     WHERE ts >= CURRENT_DATE - 90
# One window for everybody, and it sits entirely after every decision.
naive_win = events[events.ts >= BUILD_DATE - pd.Timedelta(days=90)]
naive = (naive_win.groupby("customer_id")
         .agg(avg_amount=("amount", "mean"), n_late=("late", "sum"))
         .reset_index())

# --- as-of: 90 days before THIS ROW's decision ------------------------------
# What a feature store does for you, and why its API takes an entity AND a
# timestamp instead of just an entity.
ev = events.merge(labels[["customer_id", "decision_ts"]], on="customer_id")
asof_win = ev[(ev.ts < ev.decision_ts)
              & (ev.ts >= ev.decision_ts - pd.Timedelta(days=90))]
asof = (asof_win.groupby("customer_id")
        .agg(avg_amount=("amount", "mean"), n_late=("late", "sum"))
        .reset_index())`,
      out: `== the same two features, two joins ==
  naive window   2025-09-22 .. 2025-12-21   (identical for all 6000 customers)
  as-of window   per customer, the 90 days before their own decision

  naive   avg_amount 168.73   n_late 0.799
  as-of   avg_amount 217.46   n_late 0.236` },

    { t: "p", text: "Look at `n_late`: **0.799 against 0.236**. The naive window finds 3.4 times as many late payments, because late payments are a *consequence* of the trouble that causes default, and they happen after the loan was granted. The naive feature is not measuring creditworthiness at application time. It is partially measuring the outcome." },

    { t: "diagram", kind: "timeline", id: "dg-1_4-02-0",
      title: "Two windows over the same event table",
      caption: "Each customer's decision sits at a different point, which is the fact the naive join ignores. **One fixed window relative to the build date lands after every decision**, so the feature is computed from rows that did not exist when the prediction was made — and because the window is the same for everyone, the result looks perfectly consistent.",
      lanes: [
        { label: "A: decides Jul 24", bars: [
          { from: 0, to: 20, label: "history", tone: "accent" },
          { from: 20, to: 24, label: "as-of window", tone: "good" },
          { from: 24, to: 88, label: "post-decision: the label forms here", tone: "crit" }
        ] },
        { label: "B: decides Feb 25", bars: [
          { from: 0, to: 48, label: "history", tone: "accent" },
          { from: 48, to: 52, label: "as-of window", tone: "good" },
          { from: 52, to: 88, label: "post-decision", tone: "crit" }
        ] },
        { label: "The naive window", bars: [
          { from: 76, to: 88, label: "CURRENT_DATE - 90: after everyone's decision", tone: "crit" }
        ] }
      ] },

    { t: "p", text: "The leak can be quantified directly, because this experiment has something a real one does not: access to the unobservable factor. Correlating each feature against `trouble` measures exactly how much future the feature absorbed." },

    { t: "code", lang: "python", title: "m14.py — the leak, as a number",
      out: `  correlation with the unobservable 'trouble' factor:
    naive avg_amount  -0.2546        as-of avg_amount  +0.0034
    naive n_late      +0.4767        as-of n_late      +0.0884` },

    { t: "p", text: "The as-of features are essentially uncorrelated with the factor: **+0.0034** and **+0.0884**, the latter being the genuine weak pre-decision signal that it is legitimate to learn from. The naive features carry **−0.2546** and **+0.4767**. Nearly half the variance of a thing that cannot be known at decision time has found its way into a column labelled *recent late payments*." },

    { t: "h2", n: "03", id: "scores", text: "Why the leak gets promoted",
      sub: "It wins the comparison it is judged by" },

    { t: "p", text: "Both feature sets now train the same model with the same split and the same seed, so the only difference is the join." },

    { t: "code", lang: "python", title: "m14.py — offline, then deployed",
      code: `# In production the only data that exists is history before the decision, so
# BOTH models receive as-of features. That is the whole point.
Xserve = df_asof[FEATS].values[ite]
yserve = df_asof["defaulted"].values[ite]
auc_naive_served = roc_auc_score(yserve, m_naive.predict_proba(Xserve)[:, 1])
auc_asof_served  = roc_auc_score(yserve, m_asof.predict_proba(Xserve)[:, 1])`,
      out: `== offline: the number that goes in the deck ==
  trained on the naive 'last 90 days'  offline AUC 0.6557
  trained on the as-of join            offline AUC 0.6296

== deployed: at serving time only the as-of features exist ==
  the naive-trained model, served as-of features   AUC 0.6307
  the as-of-trained model, served as-of features   AUC 0.6296

=============================== THE RESULT ===============================
  naive join   offline 0.6557  ->  deployed 0.6307   (-2.5 points)
  as-of join   offline 0.6296  ->  deployed 0.6296   (+0.0 points)` },

    { t: "p", text: "Read the sequence as a decision process, because that is what makes this bug expensive rather than merely wrong." },

    { t: "p", text: "The leaky model scores **0.6557** and the honest one **0.6296**. Offline, the leak is **2.6 points better**, and 2.6 points of AUC is a convincing margin — it is the kind of gap that settles an argument in a review. So the leaky model is the one that ships. Deployed, it receives the only features that exist at prediction time, the as-of ones, and falls to **0.6307**: it gave back **2.5 of its 2.6 points** and finished marginally *below* the model it beat." },

    { t: "callout", kind: "insight", title: "A leak is a selection mechanism, not just an error",
      body: [
        { t: "p", text: "The damage is not that one model was 2.5 points optimistic. It is that **the leak is what won the comparison.** Every candidate that reads post-decision data gets an advantage in the only evaluation you ran, so your model-selection process systematically prefers the leakiest option on offer." },
        { t: "p", text: "Which means a leak does not stay a single bug. It biases every subsequent decision — which features to keep, which model class to use, how much data to buy — towards whatever best exploits the future." }
      ] },

    { t: "callout", kind: "note", title: "On the size of these numbers",
      body: [
        { t: "p", text: "2.5 points is the measured effect *here*, where income and credit score carry most of the signal and the leaked columns are two features out of four. The magnitude depends entirely on how dominant the leaked feature is: a leak in the single strongest feature can cost twenty points or more, and a leak in a weak one may cost nothing measurable." },
        { t: "p", text: "The direction and the mechanism are what generalise. Do not carry the 2.5 away as a typical figure — carry away that the offline-minus-deployed gap is the measurement, and that it is only visible if you compute it." }
      ] },

    { t: "p", text: "And the reason this survives review: **a random train/test split cannot detect it.** Both halves of the split were built by the same leaky pipeline, so both contain the same future information. Cross-validation, a holdout set, five folds, stratification — all of them agree the model is good, because all of them are asking the same wrongly-posed question. The only evaluation that catches it is one where features are computed as of a timestamp earlier than the label." },

    { t: "h2", n: "04", id: "store", text: "What a feature store actually fixes",
      sub: "An API that makes the bug unwriteable" },

    { t: "p", text: "Feast is not installed here, so what follows is the interface rather than an executed trace. The relevant part is not the implementation but the shape of the call, because that shape is the whole safety mechanism." },

    { t: "code", lang: "python", title: "The shape of a feature store's two reads (interface, not executed here)",
      code: `# TRAINING: the entity dataframe carries a timestamp PER ROW, and the store
# performs the as-of join for every row at that row's own moment.
training_df = store.get_historical_features(
    entity_df=labels[["customer_id", "decision_ts"]],   # <- the timestamp
    features=["txn:avg_amount_90d", "txn:n_late_90d"],
).to_df()

# SERVING: no timestamp, because the moment is now.
vector = store.get_online_features(
    entity_rows=[{"customer_id": 4411}],
    features=["txn:avg_amount_90d", "txn:n_late_90d"],
).to_dict()` },

    { t: "p", text: "There is no argument you can pass to `get_historical_features` that means *the last 90 days relative to today*. The timestamp column is mandatory and it is per-row. The bug measured above is not a bug you can express through this API, and that — rather than the Redis cache — is what you are buying." },

    { t: "diagram", kind: "layers", id: "dg-1_4-04-0",
      title: "The two reads, and the one definition they must share",
      caption: "The offline and online stores are different databases with different latency budgets, and that is fine. **What must not differ is the transformation** — if `avg_amount_90d` is defined once and both paths read that definition, the skew from lesson 13.1 cannot arise; if it is implemented twice, it will.",
      items: [
        { label: "One feature definition: avg_amount_90d, n_late_90d", desc: "Written once, in one place, with its entity, its window and its aggregation. This is the artifact." },
        { label: "Offline store: the event history, queried as-of a timestamp", desc: "Backs training. Big, slow, correct about the past. Answers 'what was true on 2024-07-03?'" },
        { label: "Online store: the latest value per entity, key-value", desc: "Backs serving. Small, fast, only knows now. Answers 'what is true for customer 4411?'" },
        { label: "Materialisation: the job that pushes offline values online", desc: "The weak joint. If it lags, serving reads stale features while training reads fresh ones — lesson 13.4's detection problem." }
      ] },

    { t: "p", text: "Two honest qualifications, because a feature store is frequently adopted for the wrong reason." },

    { t: "p", text: "First, **you do not need the product to get the property.** The as-of join above is eight lines of pandas, and a SQL window function does it server-side. If you write that join once, put it behind a function that takes an entity and a timestamp, and call it from both the training pipeline and the serving path, you have bought the safety without the infrastructure. What a store adds is low-latency online reads, reuse across teams, and a registry — real benefits that are not this one." },

    { t: "p", text: "Second, **the materialisation job is a new failure mode you did not have before.** The online store holds a copy, and a copy can lag. A feature store removes the transformation skew and introduces a freshness skew, which is a better trade but not a free one." },

    { t: "table",
      head: ["The pitch", "What is actually true"],
      rows: [
        ["Reuse features across teams", "Real, and the main economic argument — but it needs a registry and discipline, not just the software."],
        ["Low-latency serving", "Real. This is what the online store is for, and it is hard to build well by hand."],
        ["Prevents training-serving skew", "Only the transformation half. One definition, two readers. The freshness half is newly introduced."],
        ["Point-in-time correctness", "The strongest claim, because the API makes the bug unwriteable rather than merely discouraged."],
        ["You need one to do ML properly", "No. An as-of join behind one shared function gets you the correctness. Buy the store for latency and reuse."]
      ] },

    { t: "h2", n: "05", id: "catch", text: "Catching it without a store",
      sub: "Three checks, in order of cost" },

    { t: "p", text: "Most teams discover a leak in production, months later, when the model underperforms in a way nobody can explain. These three checks find it earlier, and they are cheap enough to be worth running regardless of your infrastructure." },

    { t: "diagram", kind: "steps", id: "dg-1_4-05-0",
      title: "Three checks that find a leak before production does",
      caption: "In cost order, cheapest first. **The third is the only one that is conclusive**, and it is also the only one that measures the quantity you actually care about: the gap between the offline number and the deployed one.",
      items: [
        { label: "Grep the feature SQL for a current-date window", desc: "CURRENT_DATE, NOW(), TODAY, max(ts): any window not relative to the row's own timestamp. Minutes of work." },
        { label: "Split by time, not at random", desc: "Train on decisions before a cutoff, test after. A leak usually survives a random split and not a temporal one." },
        { label: "Recompute one row as of its decision date", desc: "Take ten training rows, rebuild their features from the event table as-of their timestamps, and diff. Conclusive." },
        { label: "Compare offline against the first week of production", desc: "The gap measured here was 2.5 points. If you never compute it, the leak is invisible forever." }
      ] },

    { t: "callout", kind: "trap", title: "Suspiciously good is a symptom",
      body: [
        { t: "p", text: "A new feature that improves AUC far more than its plausible causal relationship to the label justifies is the commonest signature of a leak. *Recent late payments* predicting default is plausible; predicting it that well, when the window straddles the outcome, is not." },
        { t: "p", text: "The useful habit is to be suspicious in proportion to the improvement, and to ask of any strong feature: when is this value written, relative to when the label is known? Lesson 13.2 takes the leak types that survive a temporal split." }
      ] },

    { t: "exercise", kind: "practice", title: "Audit one feature's clock", difficulty: "core", minutes: 30,
      prompt: "Take the strongest feature in a model you work on and establish three timestamps for it: when the underlying data is written, when the feature value is computed, and when the label becomes known. Then find the query that builds it and look specifically at the window predicate — is it relative to the row's event time, or to the time the job ran? If you have an event table, pick ten training rows and recompute their features as of their own decision timestamps, then diff against what is in the training set. Finally, retrain with a temporal split instead of a random one and record both AUCs.",
      hints: [
        "'When is the data written' is often the surprise: a status column updated in place has no history at all, so its past values are unrecoverable.",
        "A dimension table that is overwritten rather than appended cannot be joined point-in-time, and no store can fix that.",
        "If the temporal split is much worse than the random one, you have found something — either a leak or genuine non-stationarity, and both matter."
      ],
      solution: {
        body: [
          { t: "p", text: "The frequent discovery is a mutable dimension table: a customer `segment` or `status` column that is updated in place, so the training set joins today's value onto a two-year-old decision. There is no window predicate to fix, because the history was never kept — the fix is to start appending, and until then the feature cannot be used honestly." },
          { t: "p", text: "The second frequent discovery is that the random and temporal splits differ substantially. That is worth separating carefully: a leak and real non-stationarity both produce the gap, and the recompute-ten-rows check is what distinguishes them." }
        ]
      } }

  ],

  takeaways: [
    "**A training row is a customer at a moment, not a customer.** The label belongs to an instant, so every feature beside it must be computed as of that same instant.",
    "**The bug is one predicate**: `WHERE ts >= CURRENT_DATE - 90` is a window relative to the build date, identical for every row, and it lands after every decision.",
    "**It was 3.4x louder on the leaked column**: the naive window found n_late 0.799 against the as-of join's 0.236, because late payments are a consequence of what we are predicting.",
    "**The leak is measurable as a correlation**: naive features correlated -0.2546 and +0.4767 with a factor unobservable at decision time; as-of features, +0.0034 and +0.0884.",
    "**Leaky offline 0.6557, honest offline 0.6296** — so the leak wins by 2.6 points in the only evaluation that was run, and is therefore the model that ships.",
    "**Deployed, it fell to 0.6307**, giving back 2.5 of its 2.6 points and finishing marginally below the honest model it beat.",
    "**A leak is a selection mechanism.** It biases which features, models and data you choose toward whatever best exploits the future, so it does not stay one bug.",
    "**A random split cannot detect it** — both halves were built by the same leaky pipeline, so cross-validation, holdouts and folds all agree the model is good.",
    "**A feature store's real value is that its API demands a per-row timestamp**, which makes the bug unexpressible rather than merely discouraged.",
    "**You can have the property without the product**: an as-of join behind one function taking an entity and a timestamp, called from both training and serving.",
    "**A store removes transformation skew and introduces freshness skew** — the materialisation job is a copy, and a copy can lag.",
    "**Treat a suspiciously large improvement as a symptom**, and ask of any strong feature when its value is written relative to when the label is known."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your training features come from `WHERE event_ts >= CURRENT_DATE - INTERVAL '90 days'`. Labels are events from the past two years. What is wrong?",
        options: [
          "Nothing, as long as the same query runs at serving time",
          "The window is relative to the day the query runs, so for every historical row it covers a period after that row's decision — measured here as a 2.5-point drop between offline and deployed AUC",
          "The window is too short to capture seasonal behaviour"
        ],
        answer: 1,
        why: "The first option is the tempting one: running the same query at serving time does make the two consistent for new rows, but it cannot retroactively fix the training set, which was built from post-decision data. The window has to be relative to each row's own timestamp."
      },
      {
        stem: "A five-fold cross-validated model scores 0.82 AUC offline and 0.71 in production, with no infrastructure problems. Which explanation does cross-validation fail to rule out?",
        options: [
          "Overfitting to the training set",
          "A point-in-time leak — every fold was built by the same pipeline, so all five contain the same future information and all five agree",
          "Insufficient regularisation"
        ],
        answer: 1,
        why: "Cross-validation tests whether the fit generalises to unseen rows from the same distribution. If the pipeline put future information into every row, every fold inherits it and the procedure validates a wrongly-posed question. A temporal split, or recomputing a few rows as-of their timestamps, is what distinguishes this."
      },
      {
        stem: "What does adopting a feature store NOT give you?",
        options: [
          "Point-in-time correct training sets",
          "Freedom from skew between training and serving — it removes the transformation half while introducing a freshness half, because the online store is a copy that can lag",
          "Low-latency online feature reads"
        ],
        answer: 1,
        why: "One definition read by two paths genuinely removes reimplementation skew, which is lesson 13.1's bug. But materialisation is a new moving part: if the job lags, serving reads stale values while training read fresh ones. A better trade, not a free one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is a point-in-time join, and why does it matter?",
        strong: "It is a join that computes each training row's features as of that row's own event timestamp, rather than as of when the query runs. It matters because the label belongs to a moment, so the features have to belong to the same moment. The bug is one predicate — a window relative to CURRENT_DATE instead of to the row — and I have measured it: the naive window counted 3.4 times more late payments than the honest one, correlated 0.48 with a factor that is unobservable at decision time, and produced a model that scored 2.6 points better offline and then gave back 2.5 of them in production.",
        answer: [
          { t: "p", text: "Defining it in terms of the row's own timestamp is the precise formulation; 'avoiding future data' is vaguer and does not tell the interviewer you have implemented it." },
          { t: "p", text: "The point that elevates the answer is that the leak wins the offline comparison, so it is not merely an error — it is what gets selected for." }
        ]
      },
      {
        level: "senior",
        q: "How would you detect label leakage in an existing model?",
        strong: "Four checks in cost order. Grep the feature SQL for any window that is not relative to the row's own timestamp — CURRENT_DATE, NOW, max(ts). Retrain with a temporal split rather than a random one, because a leak usually survives a random split and not a temporal one. Then the conclusive check: take ten training rows, recompute their features from the event table as of their decision timestamps, and diff against what is in the training set. And compare the offline number against the first week of production, because that gap is the quantity you actually care about and it is invisible unless you compute it. I would also treat any feature whose improvement exceeds its plausible causal relationship to the label as a suspect.",
        answer: [
          { t: "p", text: "The recompute-and-diff check is the one that separates people who have fixed a leak from people who have read about one. It is conclusive where the others are suggestive." },
          { t: "p", text: "Worth volunteering: a temporal split being worse can mean a leak OR genuine non-stationarity, and the recompute check is how you tell them apart. Showing you know the diagnostic is ambiguous is a senior signal." }
        ]
      },
      {
        level: "senior",
        q: "Do we need a feature store?",
        strong: "Probably not for correctness, and possibly for latency and reuse. The correctness property — point-in-time joins — is an as-of join you can write in about eight lines of pandas or one SQL window function; what matters is putting it behind a single function that takes an entity and a timestamp and calling it from both training and serving. What a store genuinely adds is low-latency online reads, which are hard to build well, and a registry so several teams share definitions instead of reimplementing them. It also adds a failure mode: the online store is a materialised copy, so it can lag, and you trade transformation skew for freshness skew. So I would ask how many teams share features and what the serving latency budget is, and if the answer is one team and 200 ms, I would write the join.",
        answer: [
          { t: "p", text: "Separating the correctness property from the infrastructure is the whole answer. Most candidates either dismiss feature stores or treat them as mandatory; the useful position is that the API shape is the valuable part and you can have it cheaply." },
          { t: "p", text: "Naming the freshness skew as newly introduced shows you have operated one rather than evaluated one." }
        ]
      }
    ]
  }
});
