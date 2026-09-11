/* ============================================================================
   LESSON 8.3 — Data Leakage: The Three Kinds
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "**A model that scores 0.99 has almost always been told the answer.** Leakage is any way the answer reaches the model that will not exist when it predicts for real: a column written after the outcome, a test row whose twin sits in the training set, a feature that averaged next month into this one. The three kinds have different causes, different symptoms and different one-line checks — and the time split, which most people believe catches all of them, catches one.",

  objectives: [
    "Define leakage as a question about availability at prediction time, and separate a leak from a legitimate proxy",
    "Recognise target leakage from its symptoms and confirm it with a single-feature scan",
    "Recognise train–test contamination: duplicates, shared entities, preprocessing on all rows, tuning on the test set",
    "Recognise temporal leakage in features and in labels, and show why a time split does not catch a forward-looking feature",
    "Run the four checks — single-feature AUC, twin share, truncation test, random-versus-time gap — and know which kind each one catches"
  ],

  prerequisites: ["6.4", "7.8", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "The one question", id: "question" },

    { t: "p", text: "Every leak fails the same test: **at the moment the prediction is made, does this value exist, with this content?** A feature that is populated afterwards, a row the model has already seen, a window that reaches past *t* — each puts information into training that scoring will never have. The score measures how well the model uses that information, which is why the score is the first symptom." },

    { t: "dl", items: [
      ["Leakage", "Information available to the model during training or evaluation that will not be available, in that form, when it predicts. The estimate of performance is inflated by however much the model relied on it."],
      ["Target leakage", "A feature that is a consequence of the label, or is recorded with or after it. A closure code, a refund amount, a discharge date. Alone, it predicts the label almost perfectly; in production it is empty."],
      ["Train–test contamination", "Rows in the evaluation set that influenced the fit: exact duplicates, the same entity on both sides, preprocessing fitted on all rows, hyperparameters chosen by looking at the test score."],
      ["Temporal leakage", "A feature computed from rows that come after the prediction time, or a label whose observation window had not closed when the row was extracted. The backtest is good; the live model is not."],
      ["Proxy", "A legitimate feature that correlates with the target because it shares a cause — support tickets and dissatisfaction. Available at *t*, populated by *t*; the correlation is the point. What separates a proxy from a leak is availability, not strength."],
      ["Point-in-time correctness", "Every feature for a row at time *t* is computed from data that existed at *t*. The as-of joins of 5.6 and 7.8 are how it is built; the truncation test is how it is checked."],
      ["Feature manifest", "For every column: its source, when it becomes known, and whether it can change after the label is determined. The document that makes leaks reviewable."]
    ]},

    { t: "viz",
      title: "Availability on the timeline",
      caption: "For a row predicted at time t, each feature is either settled by t or it is not. A centred window reaches into the future; a closure code is written when the outcome is; a label with a 90-day window is not known until t + 90 — and rows extracted before then carry the wrong one.",
      svg: `<svg viewBox="0 0 880 340" role="img" aria-label="A horizontal timeline with the prediction moment t marked. Feature bars show when each value is populated: tenure and spend before t, a centred rolling window straddling t, a closure code after the outcome, and the label itself after t plus ninety days.">
  <defs>
    <marker id="lk-ah-83" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <line x1="60" y1="300" x2="840" y2="300" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#lk-ah-83)"/>
  <text x="60" y="322" class="s-sub">past</text>
  <text x="790" y="322" class="s-sub">future</text>
  <line x1="470" y1="40" x2="470" y2="300" style="stroke:var(--acc)" stroke-width="2" stroke-dasharray="6 4"/>
  <text x="478" y="56" class="s-label" style="fill:var(--acc);font-weight:600">t · prediction made</text>
  <line x1="700" y1="150" x2="700" y2="300" style="stroke:var(--warn)" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="706" y="166" class="s-sub" style="fill:var(--warn)">outcome occurs</text>

  <text x="60" y="94" class="s-label">tenure_d</text>
  <rect x="160" y="82" width="300" height="16" rx="3" style="fill:var(--good);fill-opacity:.35"/>
  <text x="600" y="94" class="s-sub" style="fill:var(--good)">settled at signup — safe</text>

  <text x="60" y="134" class="s-label">spend (this row)</text>
  <rect x="430" y="122" width="34" height="16" rx="3" style="fill:var(--good);fill-opacity:.35"/>
  <text x="600" y="134" class="s-sub" style="fill:var(--good)">known at t — safe</text>

  <text x="60" y="174" class="s-label">spend_smooth</text>
  <rect x="380" y="162" width="180" height="16" rx="3" style="fill:var(--crit);fill-opacity:.3;stroke:var(--crit)" stroke-width="1"/>
  <text x="600" y="174" class="s-sub" style="fill:var(--crit)">centred window · reaches past t — temporal leak</text>

  <text x="60" y="214" class="s-label">closure_code</text>
  <rect x="700" y="202" width="90" height="16" rx="3" style="fill:var(--crit);fill-opacity:.3;stroke:var(--crit)" stroke-width="1"/>
  <text x="60" y="232" class="s-sub" style="fill:var(--crit)">written when the case closes — target leak</text>

  <text x="60" y="264" class="s-label">label · churn within 90 d</text>
  <rect x="470" y="252" width="300" height="16" rx="3" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)" stroke-width="1"/>
  <text x="60" y="282" class="s-sub" style="fill:var(--warn)">not observable until t + 90 — rows extracted earlier carry a wrong label</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Target leakage", id: "target" },

    { t: "p", text: "The column was populated by the outcome. Sometimes it is obvious — `churn_date` in a churn model — and sometimes it is a code, a flag or a count that a downstream team writes as part of handling the event: the retention team's closure reason, the fraud team's investigation flag, the hospital's discharge disposition. **In the training extract it is present for every row because every row has already had its outcome. At scoring time it is empty for every row, because none has.**" },

    { t: "code", lang: "python", title: "A column that is the label wearing a different name",
      hl: [18, 24, 29, 33],
      code: `import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import cross_val_score

rng = np.random.default_rng(0)
n = 5_000
df = pd.DataFrame({
    "tenure_d": rng.integers(10, 2000, n),
    "spend":    rng.gamma(2, 40, n),
    "tickets":  rng.poisson(1.2, n),
})
logit = -0.0006 * df.tenure_d + 0.006 * df.spend + 0.5 * df.tickets - 0.4
df["churned"] = (logit + rng.logistic(0, 1, n) > 0).astype(int)

# written by the retention team when they close the case -- i.e. after the outcome
df["closure_code"] = np.where(df.churned == 1, rng.choice([2, 3, 4], n), 0)

def cv_auc(cols):
    m = GradientBoostingClassifier(random_state=0)
    return cross_val_score(m, df[cols], df.churned, cv=5, scoring="roc_auc").mean().round(3)

print(cv_auc(["tenure_d", "spend", "tickets", "closure_code"]))   # 1.000
print(cv_auc(["tenure_d", "spend", "tickets"]))                   # 0.744

# the one-line check: every feature on its own
for c in ["tenure_d", "spend", "tickets", "closure_code"]:
    a = roc_auc_score(df.churned, df[c]); print(f"{c:13s} {max(a, 1 - a):.3f}")
# tenure_d 0.61   spend 0.66   tickets 0.60   closure_code 1.000   <- alone, it is the label

# and the question no scan replaces: what does this column hold at the moment we predict?
# closure_code at scoring time is null for every open account. The model trained on a column
# that is populated by the outcome it is meant to predict.`,
      caption: "**AUC 1.000 with the code, 0.744 without; alone, the code scores 1.000.** A single feature that predicts the label on its own better than the whole model has any right to is either the discovery of the year or a leak, and it is a leak."
    },

    { t: "p", text: "Subtler versions: a `total_charges` column that includes the refund you are predicting; an `n_contacts` count that includes the complaint call; a `last_updated` timestamp that is later for rows that had an event. **The symptom set is consistent**: one feature dominates importance, the score is implausibly high for the domain, and the column's null rate in a live scoring sample is far higher than in training." },

    { t: "callout", kind: "trap", title: "A strong feature is not a leak; an unavailable one is", body: [
      { t: "p", text: "Support-ticket count predicts churn strongly and is entirely legitimate — dissatisfaction causes both. The scan flags it as strong, and the manifest clears it: it is populated at *t*, by events before *t*. **The scan finds candidates; the manifest decides.** Dropping every strong feature because it might be a leak throws away the model." }
    ]},

    { t: "h2", n: "03", text: "Train–test contamination", id: "contamination" },

    { t: "p", text: "The evaluation rows influenced the fit. The simplest form is an exact duplicate on each side of the split: the model memorises one copy and is marked correct on the other. The same happens, weaker, when one customer, one patient or one device appears on both sides — the model learns the entity, not the pattern. **Neither is caught by a time split if the twin rows share a timestamp, and neither is caught by cross-validation, which is how the leak was measured in the first place.**" },

    { t: "code", lang: "python", title: "Duplicates across the split, and the twin-share check",
      hl: [8, 13, 14, 18],
      code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold

X, y = df[["tenure_d", "spend", "tickets"]], df.churned

# an ingestion retry wrote a quarter of the rows twice
dup_idx = rng.choice(n, n // 4, replace=False)
Xd = pd.concat([X, X.iloc[dup_idx]], ignore_index=True)
yd = pd.concat([y, y.iloc[dup_idx]], ignore_index=True)

rf = RandomForestClassifier(n_estimators=300, random_state=0, n_jobs=-1)
cv = StratifiedKFold(5, shuffle=True, random_state=0)
print(cross_val_score(rf, Xd, yd, cv=cv, scoring="roc_auc").mean().round(3))   # 0.846
print(cross_val_score(rf, X,  y,  cv=cv, scoring="roc_auc").mean().round(3))   # 0.731

# the check: how many validation rows have an exact twin on the training side?
for tr, te in cv.split(Xd, yd):
    twins = Xd.iloc[te].apply(tuple, axis=1).isin(Xd.iloc[tr].apply(tuple, axis=1)).mean()
    print(f"{twins:.2f}", end="  ")     # 0.32  0.32  0.33  0.31  0.32

# the fix is upstream (6.4): deduplicate on the feature columns before anything is split.
# Rows that share an entity without being identical -- same customer, same device -- are the
# same fault in a weaker form, and 8.4 splits by group for exactly that reason.`,
      caption: "**A third of every validation fold has a twin in training, and the forest's AUC rises from 0.73 to 0.85 by remembering them.** Cross-validation cannot see this — it is the thing being fooled. The twin-share check can."
    },

    { t: "p", text: "The other contamination is procedural. A scaler, imputer, target encoder (7.2), selector (8.1) or PCA (8.2) fitted on all rows has seen the validation fold; the pipeline in 8.5 removes the possibility. And **a test set consulted while tuning is no longer a test set**: each look moves a hyperparameter towards what scores well on those rows, and the final number is an optimistic estimate of the choice, not of the model. The test set is read once, at the end, and the tuning happens on validation folds inside training." },

    { t: "viz",
      title: "Where the evaluation rows reach the fit",
      caption: "Four routes by which validation rows influence what is trained. Only the first two are visible in the data; the other two are visible only in the procedure.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Four labelled boxes describing routes of contamination: duplicate rows on both sides, shared entities on both sides, preprocessing fitted on all rows, and hyperparameters tuned against the test set; each with its check.">
  <g stroke-width="1.5">
    <rect x="30" y="40" width="195" height="170" rx="8" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit)"/>
    <rect x="240" y="40" width="195" height="170" rx="8" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit)"/>
    <rect x="450" y="40" width="195" height="170" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
    <rect x="660" y="40" width="195" height="170" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
  </g>
  <g class="s-label" style="font-weight:600">
    <text x="46" y="66" style="fill:var(--crit)">Duplicate rows</text>
    <text x="256" y="66" style="fill:var(--crit)">Shared entities</text>
    <text x="466" y="66" style="fill:var(--warn)">Preprocessing on all rows</text>
    <text x="676" y="66" style="fill:var(--warn)">Tuning on the test set</text>
  </g>
  <g class="s-sub">
    <text x="46" y="92">Ingestion retries, joins that</text><text x="46" y="108">fan out, augmentation before</text><text x="46" y="124">the split.</text>
    <text x="256" y="92">Same customer, patient or</text><text x="256" y="108">device on both sides; the</text><text x="256" y="124">model learns who, not what.</text>
    <text x="466" y="92">Scaler, imputer, encoder,</text><text x="466" y="108">selector or PCA fitted before</text><text x="466" y="124">the fold was held out.</text>
    <text x="676" y="92">Each look at the test score</text><text x="676" y="108">moves a choice towards those</text><text x="676" y="124">rows. Optimism compounds.</text>
  </g>
  <g class="s-label" style="font-weight:600">
    <text x="46" y="162">Check · twin share per fold</text>
    <text x="256" y="162">Check · group overlap</text>
    <text x="466" y="162">Check · shuffled labels</text>
    <text x="676" y="162">Check · the procedure</text>
  </g>
  <g class="s-sub">
    <text x="46" y="184">Fix · dedupe upstream (6.4)</text>
    <text x="256" y="184">Fix · GroupKFold (8.4)</text>
    <text x="466" y="184">Fix · Pipeline (8.5)</text>
    <text x="676" y="184">Fix · read it once, at the end</text>
  </g>
  <text x="30" y="238" class="s-sub">Visible in the data → · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ← visible only in the procedure</text>
</svg>`
    },

    { t: "h2", n: "04", text: "Temporal leakage", id: "temporal" },

    { t: "p", text: "The row is at time *t*; the feature was computed from rows after *t*. A centred rolling mean, a per-customer average over the whole extract, a `first_purchase_to_last_purchase` span, a count of rows per entity — each folds the future into the present. **A time-based split does not catch this**, because the feature was built before the split and every row already carries its share of the future. The check is to remove the future and see which features change." },

    { t: "code", lang: "python", title: "The time split passes; the feature still leaks",
      hl: [15, 25, 34, 36],
      code: `# a per-customer series: the state that drives the label drifts slowly
m_cust, rows = 800, 8
cust = np.repeat(np.arange(m_cust), rows)
eps = rng.normal(0, 1, (m_cust, rows))
state = np.empty_like(eps)
state[:, 0] = eps[:, 0]
for j in range(1, rows):
    state[:, j] = 0.85 * state[:, j - 1] + eps[:, j]
ts = pd.DataFrame({"cust": cust, "step": np.tile(np.arange(rows), m_cust), "state": state.ravel()})
ts["spend"] = 60 + 25 * ts.state + rng.normal(0, 15, len(ts))
ts["y"] = (ts.state + rng.normal(0, 0.8, len(ts)) > 0.5).astype(int)

g = ts.groupby("cust").spend
ts["spend_prev"]   = g.shift(1)                                               # known at t
ts["spend_smooth"] = g.transform(lambda s: s.rolling(3, center=True).mean())  # uses t + 1
ts["spend_trail"]  = g.transform(lambda s: s.shift(1).rolling(3).mean())      # uses t-3 .. t-1

def time_split_auc(cols):
    d = ts.dropna(subset=cols)
    tr, te = d.step < 6, d.step >= 6          # the last two steps of every customer are the test
    m = GradientBoostingClassifier(random_state=0).fit(d.loc[tr, cols], d.loc[tr, "y"])
    return roc_auc_score(d.loc[te, "y"], m.predict_proba(d.loc[te, cols])[:, 1]).round(3)

print(time_split_auc(["spend", "spend_prev", "spend_trail"]))    # 0.804
print(time_split_auc(["spend", "spend_prev", "spend_smooth"]))   # 0.862  <- split by time, still leaking

# the check that catches it: rebuild the features on a truncated history and compare
def features(d):
    g = d.groupby("cust").spend
    return pd.DataFrame({"spend_prev":   g.shift(1),
                         "spend_smooth": g.transform(lambda s: s.rolling(3, center=True).mean()),
                         "spend_trail":  g.transform(lambda s: s.shift(1).rolling(3).mean())})

full, trunc = features(ts), features(ts[ts.step <= 4])
a = full.loc[trunc.index]
changed = ~((a == trunc) | (a.isna() & trunc.isna()))
print(changed.mean().round(2))     # spend_prev 0.00   spend_smooth 0.20   spend_trail 0.00
# a feature whose past values change when the future is removed was computed from the future`,
      caption: "**The centred window scores 0.86 on a time split and the trailing window 0.80 — the split was honest and the feature was not.** The truncation test rebuilds the features with the last steps removed: `spend_smooth` changes for a fifth of the rows, the two honest features for none."
    },

    { t: "p", text: "Labels leak time too. 'Churned within 90 days' cannot be observed for a row extracted 30 days ago; that row is labelled *retained* because the window had not closed. **The most recent rows carry systematically wrong labels, and they are the rows most like production.** The fix is to censor: keep only rows whose label window closed before the extract, and put the extract date in the manifest." },

    { t: "callout", kind: "insight", title: "The count of rows per entity is a clock", body: [
      { t: "p", text: "A customer with 40 rows in the extract stayed longer than one with 3. A feature like `n_orders_total`, `days_active` or `last_seen − first_seen` encodes how far into the future the extract reaches for that entity — which for churn, default and readmission is the label. **Any aggregate over an entity's full history is suspect until it is rewritten as-of.**" }
    ]},

    { t: "h2", n: "05", text: "The checks, and which kind each one catches", id: "checks" },

    { t: "p", text: "No single check finds all three. The single-feature scan finds a column that is the label; it says nothing about duplicates. The twin-share check finds duplicates; it says nothing about a centred window. The truncation test finds forward-looking features; it says nothing about a closure code, which does not change when the future is removed because it was never a function of other rows. **Run all four, and read the shuffled-label control for what it is: a test of fit-time contamination, not of the data.**" },

    { t: "table",
      head: ["Kind", "Cause", "Symptom", "One-line check", "Fix"],
      rows: [
        ["Target leakage", "Feature derived from, or written after, the label", "Near-perfect score; one feature dominates; column empty at scoring time", "Single-feature AUC scan; manifest `known_at`", "Drop it, or rebuild it as-of if a real signal underlies it"],
        ["Contamination — data", "Duplicates or shared entities on both sides of the split", "Random CV far above grouped or time split; memorising models gain most", "Twin share per fold; group overlap between folds", "Deduplicate (6.4); `GroupKFold` (8.4)"],
        ["Contamination — procedure", "Preprocessing fitted on all rows; tuning against the test set", "Shuffled-label score above chance; test score not reproduced on fresh data", "Shuffled-label control; audit of who touched the test set when", "`Pipeline` (8.5); test set read once"],
        ["Temporal — features", "Windows or aggregates that include rows after *t*", "Good backtest, worse live; time split does not help", "Truncation test", "As-of joins (5.6, 7.8); trailing windows only"],
        ["Temporal — labels", "Outcome window not closed at extraction", "Recent rows all negative; live positives far above training rate", "Label rate by extraction recency", "Censor rows whose window has not closed"]
      ]
    },

    { t: "code", lang: "python", title: "The manifest: the check that is a document",
      code: `manifest = {
    #  column          source          known at        can change after label?
    "tenure_d":     ("accounts",      "signup",        False),
    "spend":        ("billing",       "t",             False),
    "tickets":      ("support",       "t",             False),
    "spend_trail":  ("billing, as-of","t",             False),
    "closure_code": ("crm.cases",     "case closed",   True),     # <- fails review on sight
}
leaks = [c for c, (_, _, post) in manifest.items() if post]
assert not leaks, f"columns populated after the label: {leaks}"

# and the number the manifest cannot give you: what the column holds when you actually score
live = df.sample(500, random_state=1).assign(closure_code=np.nan)   # a live pull: cases still open
null_gap = live.isna().mean() - df.isna().mean()
print(null_gap[null_gap > 0.2])       # closure_code 1.0`,
      caption: "A manifest turns 'is this a leak?' into a review question with a yes or no answer per column. The live null-rate gap is the empirical partner: a column that is full in training and empty at scoring time is telling you when it gets written."
    },

    { t: "ladder",
      title: "Predicting late invoice payment",
      rungs: [
        { level: "bad", label: "A snapshot at extraction, split at random", code: `feats = ["amount", "customer_tier", "days_past_due", "payment_status", "avg_delay_all_invoices"]
X_tr, X_te = train_test_split(df[feats], df.paid_late)`,
          note: "**Three leaks in one list.** `days_past_due` and `payment_status` are the label observed at extraction; `avg_delay_all_invoices` averages invoices issued after this one. AUC 0.98, and the live model is at 0.6." },
        { level: "ok", label: "Drop the obvious columns, split by time", code: `feats = ["amount", "customer_tier", "avg_delay_all_invoices"]
tr, te = df.issued < "2025-07-01", df.issued >= "2025-07-01"`,
          note: "**Two of three fixed, and the time split hides the third.** The customer average still includes later invoices — for training rows, invoices from the test period. The backtest looks honest and is not." },
        { level: "best", label: "Features as-of, a manifest, a truncation test", code: `def features(hist, as_of):
    past = hist[hist.issued < as_of]
    return {"amount": ..., "customer_tier": ...,
            "avg_delay_prior": past.groupby("customer").delay.mean()}
# manifest: every column's known_at <= t; truncation test in CI; time split for the estimate`,
          note: "**Every feature is a function of the history before its own row.** The truncation test proves it, the manifest documents it, and the time split then measures what it is supposed to measure." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An audit that finds all three",
      difficulty: "expert",
      minutes: 38,
      body: [
        { t: "p", text: "Build a per-customer dataset with a slowly drifting state that drives both spend and the label, then plant one leak of each kind: a `resolution_code` written after the outcome, a quarter of the rows duplicated by an ingestion retry, and a centred rolling mean of spend. Put feature construction in one function. Write `audit()` that runs the single-feature scan, the twin-share check, the truncation test and the random-versus-time gap, and returns what each flagged." },
        { t: "p", text: "Then fix all three — drop, deduplicate, trailing window — rerun the audit, and assert that it is clean and that the honest time-split score is materially below the leaky one." }
      ],
      requirements: [
        "All feature construction inside one `features(df)` function so the truncation test can rebuild it.",
        "Single-feature AUC scan flagging any column above 0.9 alone.",
        "Twin share: fraction of validation rows with an exact feature-twin in training, per fold.",
        "Truncation test comparing features built on full versus truncated history, NaN-aware.",
        "Random-CV versus time-split AUC on the same model.",
        "Assertions that the leaky audit flags each planted leak, the fixed audit flags nothing, and the honest score is at least 0.05 below the leaky one."
      ],
      hint: "The closure code will not change under truncation and the centred window will not show up in the single-feature scan — that is the point. Each check has one kind it can see. The time split will pass the centred window; only rebuilding the features without the future exposes it.",
      solution: {
        lang: "python",
        title: "leak_audit.py",
        code: `import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score

rng = np.random.default_rng(11)
m_cust, steps = 700, 10

# --- an honest world -----------------------------------------------------
cust = np.repeat(np.arange(m_cust), steps)
eps = rng.normal(0, 1, (m_cust, steps))
state = np.empty_like(eps); state[:, 0] = eps[:, 0]
for j in range(1, steps):
    state[:, j] = 0.85 * state[:, j - 1] + eps[:, j]
base = pd.DataFrame({"cust": cust, "step": np.tile(np.arange(steps), m_cust), "state": state.ravel()})
base["spend"]  = 60 + 25 * base.state + rng.normal(0, 15, len(base))
base["tenure"] = base.step * 30 + rng.integers(0, 30, len(base))
base["y"] = (base.state + rng.normal(0, 0.8, len(base)) > 0.5).astype(int)

# --- three planted leaks --------------------------------------------------
leaky = base.copy()
leaky["resolution_code"] = np.where(leaky.y == 1, rng.integers(1, 4, len(leaky)), 0)   # target
dup = leaky.sample(frac=0.25, random_state=1)                                          # contamination
leaky = pd.concat([leaky, dup], ignore_index=True)

def features(d, window="centred"):
    g = d.sort_values(["cust", "step"]).groupby("cust").spend
    f = pd.DataFrame({"spend": d.spend, "tenure": d.tenure, "spend_prev": g.shift(1)})
    if window == "centred":
        f["spend_roll"] = g.transform(lambda s: s.rolling(3, center=True).mean())      # temporal
    else:
        f["spend_roll"] = g.transform(lambda s: s.shift(1).rolling(3).mean())
    if "resolution_code" in d:
        f["resolution_code"] = d.resolution_code
    return f

# --- the audit -------------------------------------------------------------
def audit(d, window, model=lambda: RandomForestClassifier(200, random_state=0, n_jobs=-1)):
    f = features(d, window); y = d.y
    ok = f.notna().all(axis=1); f, y, d = f[ok], y[ok], d[ok]
    out = {}
    # 1. single-feature scan (target leakage)
    sfa = {c: max(a, 1 - a) for c in f for a in [roc_auc_score(y, f[c])]}
    out["single_feature"] = [c for c, a in sfa.items() if a > 0.9]
    # 2. twin share (contamination)
    cv = StratifiedKFold(5, shuffle=True, random_state=0)
    keys = f.apply(tuple, axis=1)
    out["twin_share"] = round(np.mean([keys.iloc[te].isin(keys.iloc[tr]).mean() for tr, te in cv.split(f, y)]), 2)
    # 3. truncation test (temporal leakage)
    cut = d.step.max() - 2
    full, trunc = features(d, window), features(d[d.step <= cut], window)
    a = full.loc[trunc.index]
    changed = ~((a == trunc) | (a.isna() & trunc.isna()))
    out["truncation"] = changed.mean()[changed.mean() > 0].index.tolist()
    # 4. random CV versus time split
    out["random_cv"] = round(cross_val_score(model(), f, y, cv=cv, scoring="roc_auc").mean(), 3)
    tr, te = d.step < steps - 2, d.step >= steps - 2
    m = model().fit(f[tr], y[tr])
    out["time_split"] = round(roc_auc_score(y[te], m.predict_proba(f[te])[:, 1]), 3)
    return out

before = audit(leaky, "centred")
print(before)
# {'single_feature': ['resolution_code'], 'twin_share': 0.33, 'truncation': ['spend_roll'],
#  'random_cv': 1.0, 'time_split': 1.0}

# --- the fixes -------------------------------------------------------------
fixed = leaky.drop(columns="resolution_code")
fixed = fixed.drop_duplicates(subset=["cust", "step"]).reset_index(drop=True)   # the retry wrote twins
after = audit(fixed, "trailing")
print(after)
# {'single_feature': [], 'twin_share': 0.0, 'truncation': [], 'random_cv': 0.81, 'time_split': 0.79}

# --- and one more, to show what the time split alone would have hidden ------------
mid = audit(fixed, "centred")
print(mid["time_split"], mid["truncation"])    # 0.85 ['spend_roll']  -- passes the split, fails the test

# --- assertions -------------------------------------------------------------
assert before["single_feature"] == ["resolution_code"]
assert before["twin_share"] > 0.2
assert before["truncation"] == ["spend_roll"]
assert after["single_feature"] == [] and after["twin_share"] == 0 and after["truncation"] == []
assert after["time_split"] < before["time_split"] - 0.05
assert mid["time_split"] > after["time_split"] and mid["truncation"] == ["spend_roll"]
print("audit: three kinds planted, three kinds found, honest score", after["time_split"])`,
        notes: [
          { t: "p", text: "**Each check flags exactly one planted leak, and none of the others.** The scan sees `resolution_code` and not the window; the twin share sees the duplicates and nothing else; the truncation test sees the window and is silent on the code, which does not change when future rows are removed because it was never computed from them." },
          { t: "p", text: "**The middle audit is the lesson**: with the code dropped and the duplicates gone, the centred window still scores 0.85 on a clean time split — and the truncation test still names it. A time split measures whether the *rows* are ordered honestly, not whether the *features* were built honestly." },
          { t: "p", text: "**The honest score is 0.79, and the leaky one was 1.0.** Every point between the two was a promise the live model could not keep. The audit is cheap enough to run on every extract, which is where it belongs." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A per-customer feature `avg_spend` is computed over the customer's whole history in the extract. The model is evaluated on a strict time split and scores well. Is the feature safe?",
          options: [
            "Yes — the time split guarantees no future information reached the training rows",
            "No — for a training row at time t, the average includes the customer's later rows; the feature was built before the split, so the split cannot remove what it already contains",
            "Yes, if the customer is only in one side of the split",
            "Only if spend is scaled"
          ],
          answer: 1,
          why: "A time split orders the rows; it does not rebuild the features. A whole-history aggregate folds the future into every earlier row before the split happens. The truncation test — rebuild on a shortened history and compare — is what detects it, and an as-of construction is what fixes it."
        }
      ]
    }
  ],

  takeaways: [
    "**Leakage is a question of availability**: at the moment of prediction, does this value exist with this content? Every leak fails that test.",
    "**Target leakage is a column written by the outcome** — a closure code, a refund, a discharge date. Alone it scores near 1.0; at scoring time it is empty.",
    "**The single-feature AUC scan finds candidates and the manifest decides**; a strong, available feature is a proxy, not a leak.",
    "**Contamination is evaluation rows reaching the fit**: duplicates, shared entities, preprocessing on all rows, tuning against the test set.",
    "**Cross-validation cannot detect duplicates across folds — it is the thing being fooled.** The twin-share check can.",
    "**A test set consulted during tuning is a validation set with a misleading name.** Read it once, at the end.",
    "**Temporal leakage is a feature computed from rows after t** — centred windows, whole-history aggregates, row counts per entity.",
    "**A time split does not catch a forward-looking feature**, because the feature was built before the split and every row already carries the future.",
    "**The truncation test**: rebuild features on a shortened history; any past value that changes was computed from the future.",
    "**Labels leak time too** — an outcome window that had not closed at extraction produces false negatives on the most recent, most production-like rows.",
    "**Each check sees one kind**: scan for target leakage, twin share for contamination, truncation for temporal, shuffled labels for fit-time contamination. Run all of them.",
    "**Build features as a function of the history before each row**, keep a manifest with `known_at` per column, and put the truncation test in CI."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A churn model scores AUC 0.99. The top feature is `closure_reason`, populated for 100 % of training rows and 0 % of rows in a live scoring sample. What is this?",
        options: [
          "A very strong proxy",
          "Target leakage: the column is written when the case is closed, after the outcome the model is meant to predict; in production it does not exist yet",
          "Temporal leakage",
          "A data-quality problem in the live pull"
        ],
        answer: 1,
        why: "Full in training, empty at scoring time is the signature of a column populated by the outcome. The single-feature scan would show it near 1.0 alone, and the manifest would show its known_at as 'case closed'."
      },
      {
        stem: "Why can cross-validation not detect duplicate rows split across folds?",
        options: [
          "It can, if shuffle=True",
          "Because CV measures how well the model predicts the held-out fold — and a memorised twin in training makes that prediction correct; the inflated score is the symptom, not a detector",
          "Because duplicates are removed automatically",
          "Because trees ignore duplicates"
        ],
        answer: 1,
        why: "The contamination inflates exactly the number CV reports. Detection needs a check that looks at the rows — twin share per fold — or an upstream deduplication before any split."
      },
      {
        stem: "A centred 3-step rolling mean is used as a feature. The model is evaluated on a time split with the last two steps of every customer held out, and scores 0.86 versus 0.80 for a trailing window. Which statement is correct?",
        options: [
          "The centred window is a better feature and the time split proves it is safe",
          "The time split did not stop the leak: for every row, the feature already contained the next step's value before the split was made; the truncation test shows it changing when the future is removed",
          "The trailing window is leaking",
          "The difference is noise"
        ],
        answer: 1,
        why: "Splitting by time orders rows; it cannot remove information that was baked into a feature during construction. Rebuild the feature on a truncated history and any past value that changes used the future."
      },
      {
        stem: "Which planted leak does the shuffled-label control detect?",
        options: [
          "A closure code written after the outcome",
          "Duplicate rows across folds",
          "A selector or encoder fitted on all rows before cross-validation — the control scores above chance because the fit used the validation labels",
          "A centred rolling window"
        ],
        answer: 2,
        why: "With shuffled labels a closure code is no longer aligned, twins carry independent random labels, and a centred window predicts nothing. Only a step that fitted on the validation fold's labels keeps scoring — which is what the control is for. A clean shuffled-label result is not a clean bill for the other three."
      },
      {
        stem: "Rows extracted in the last 60 days for a 'churn within 90 days' label are all labelled retained. What has happened and what is the fix?",
        options: [
          "Churn has fallen recently",
          "The label window had not closed for those rows, so they are false negatives; censor rows whose window has not elapsed and record the extraction date in the manifest",
          "Nothing — more data is always better",
          "Relabel them as churned"
        ],
        answer: 1,
        why: "The label itself leaks the extraction time. The most recent rows — the ones most like production — carry systematically wrong labels, and the model learns that recency predicts retention."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What are the kinds of data leakage and how do you detect each?",
        strong: "Target leakage — a feature that is a consequence of the label, like a closure code — shows as a near-perfect score with one dominant feature; I run a single-feature AUC scan and check the column's null rate in a live sample. Contamination — evaluation rows influencing the fit — comes from duplicates or shared entities across the split, from preprocessing fitted on all rows, or from tuning on the test set; I check twin share per fold, group overlap, and run the shuffled-label control. Temporal leakage — features built from rows after t, or labels whose window had not closed — I catch with a truncation test: rebuild features on a shortened history and see which past values change. And I keep a manifest with known_at for every column, because the checks find candidates and the manifest decides.",
        answer: [
          { t: "p", text: "Naming a distinct check per kind, and knowing the shuffled-label control's scope, is what makes this answer complete." }
        ]
      },
      {
        level: "expert",
        q: "A model passes a strict time-based backtest and fails in production. Where do you look first?",
        strong: "At feature construction rather than at the split. A time split orders rows; it does not undo features that already contain the future — centred windows, whole-history aggregates, counts of rows per entity that encode how long the entity stayed. I rebuild the features on a truncated history and compare; any past value that changes is a leak. Second, the label: if the outcome window had not closed for recent rows, they are false negatives and the model learnt that recency means safe. Third, the live feature nulls: a column full in training and empty at scoring time was written by the outcome. Only after those would I consider drift.",
        answer: [
          { t: "p", text: "Leading with the truncation test, and treating drift as the last hypothesis rather than the first, is the mark of someone who has debugged this before." }
        ]
      },
      {
        level: "expert",
        q: "Your colleague argues that the support-ticket count is leakage because it predicts churn too well. Do you agree?",
        strong: "Not on that evidence. Strength is not the criterion; availability is. Ticket count is populated by events before t and is known at t — the manifest clears it — and it predicts churn because dissatisfaction causes both, which is a proxy, and exactly what a feature should be. What would change my mind is a known_at after t: if the count includes the cancellation call, or if tickets opened after the churn date are being counted, then the version in the extract is not the version scoring time will see, and I would rebuild it as-of. So the answer is to check when it is populated, not how well it scores.",
        answer: [
          { t: "p", text: "Distinguishing strength from availability, and offering the as-of rebuild rather than a drop, shows judgement rather than fear." }
        ]
      }
    ]
  }
});
