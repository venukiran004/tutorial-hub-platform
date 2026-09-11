/* ============================================================================
   LESSON 8.7 — The Data Mistakes That Ship
   ========================================================================= */
EC.receiveLesson({
  id: "8.7",

  lede: "**The mistakes that reach production are not exotic. They are the same two dozen, and each one leaves a mark you can spot in someone else's notebook in under a minute.** This lesson is the course folded into a review: every failure from dtype inference to SMOTE-before-the-split as a shape, the one-line check that exposes it, and a procedure for reading a model's code that finds them in the order they matter — plus the ones that only appear after shipping.",

  objectives: [
    "Recognise each failure in this course from its signature in code, not from its consequence in production",
    "Run a review procedure that finds the split, the fits, the label, the time and the score in that order",
    "Automate the checks that can be automated and know which ones cannot",
    "Catch the post-shipping failures — skew, drift, schema change, feedback — with a contract and a stability index",
    "Make a result reproducible: seed, data fingerprint, environment, and the run-it-twice test"
  ],

  prerequisites: ["8.3", "8.4", "8.5", "8.6"],

  blocks: [

    { t: "h2", n: "01", text: "Mistakes have signatures", id: "signatures" },

    { t: "p", text: "A leak does not announce itself as a leak. It appears as a `transform(\"mean\")` on an entity column, a `fillna` above the split, a `SMOTE()` above a `train_test_split`, a column called `refund_date` in a refund model. **You do not need to run the code to find these; you need to know what they look like.** Reviewing a model is reading for those shapes, in an order that starts with the ones that invalidate everything else." },

    { t: "dl", items: [
      ["Signature", "The line, pattern or omission in code that a particular mistake produces. Reviewable without running anything."],
      ["One-line check", "The cheapest test that confirms or clears the signature: a scan, a count, a comparison of two numbers."],
      ["Review procedure", "Reading the code in a fixed order — reproduce, split, fits, label, time, score, metric — so that the mistake which invalidates the rest is found first."],
      ["Training–serving skew", "Any difference between how features are computed in training and in serving. Impossible when one fitted object does both; likely whenever anything is reimplemented."],
      ["Drift", "The scored population moving away from the training population — in the features (covariate drift), in the label rate (prior drift), or in the relationship (concept drift). Measured, not assumed."],
      ["Population stability index", "A divergence between the training distribution of a column and its serving distribution, binned on training quantiles. Under 0.1 is stable; over 0.25 the population has moved."],
      ["Data contract", "Expected columns, dtypes, ranges, categories and null rates, checked at every ingestion and every scoring call. The schema version of the feature manifest."],
      ["Run card", "The data fingerprint, seed, library versions, split definition and metric that let a result be reproduced. If two runs from the same card disagree, something is unseeded."]
    ]},

    { t: "viz",
      title: "Where each check lives",
      caption: "Seven stages, and the checks that belong at each. A mistake made at one stage is cheapest to catch there and is usually invisible by the next — a leak built into a feature passes every split, and a wrong split passes every metric.",
      svg: `<svg viewBox="0 0 880 330" role="img" aria-label="Seven boxes in a row labelled extract, features, split, fit, evaluate, ship and monitor, connected by arrows, each with two or three short checks listed beneath it.">
  <defs>
    <marker id="rv-ah-87" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g stroke-width="1.5">
    <rect x="20" y="40" width="108" height="44" rx="7" style="fill:var(--acc);fill-opacity:.10;stroke:var(--acc)"/>
    <rect x="144" y="40" width="108" height="44" rx="7" style="fill:var(--acc);fill-opacity:.10;stroke:var(--acc)"/>
    <rect x="268" y="40" width="108" height="44" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="392" y="40" width="108" height="44" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="516" y="40" width="108" height="44" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="640" y="40" width="108" height="44" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="764" y="40" width="108" height="44" rx="7" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="74" y="67">extract</text><text x="198" y="67">features</text><text x="322" y="67">split</text><text x="446" y="67">fit</text>
    <text x="570" y="67">evaluate</text><text x="694" y="67">ship</text><text x="818" y="67">monitor</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="128" y1="62" x2="144" y2="62" marker-end="url(#rv-ah-87)"/><line x1="252" y1="62" x2="268" y2="62" marker-end="url(#rv-ah-87)"/>
    <line x1="376" y1="62" x2="392" y2="62" marker-end="url(#rv-ah-87)"/><line x1="500" y1="62" x2="516" y2="62" marker-end="url(#rv-ah-87)"/>
    <line x1="624" y1="62" x2="640" y2="62" marker-end="url(#rv-ah-87)"/><line x1="748" y1="62" x2="764" y2="62" marker-end="url(#rv-ah-87)"/>
  </g>
  <g class="s-sub">
    <text x="24" y="112">dtypes explicit</text><text x="24" y="130">encoding, tz</text><text x="24" y="148">join validate=</text><text x="24" y="166">dedupe</text><text x="24" y="184">contract check</text>
    <text x="148" y="112">manifest known_at</text><text x="148" y="130">as-of only</text><text x="148" y="148">truncation test</text><text x="148" y="166">single-feature AUC</text><text x="148" y="184">censor labels</text>
    <text x="272" y="112">who + when?</text><text x="272" y="130">group / time</text><text x="272" y="148">gap = horizon</text><text x="272" y="166">twin share</text><text x="272" y="184">stratify</text>
    <text x="396" y="112">everything in</text><text x="396" y="130">the Pipeline</text><text x="396" y="148">batch invariance</text><text x="396" y="166">sampler at fit</text><text x="396" y="184">nested CV</text>
    <text x="520" y="112">natural base rate</text><text x="520" y="130">AP not accuracy</text><text x="520" y="148">shuffled labels</text><text x="520" y="166">honest &lt; shuffled</text><text x="520" y="184">threshold by cost</text>
    <text x="644" y="112">one object</text><text x="644" y="130">version pinned</text><text x="644" y="148">batch of one</text><text x="644" y="166">run card</text><text x="644" y="184">run twice, diff</text>
    <text x="768" y="112">PSI per feature</text><text x="768" y="130">label rate</text><text x="768" y="148">live vs CV score</text><text x="768" y="166">null-rate gap</text><text x="768" y="184">feedback loop</text>
  </g>
  <line x1="20" y1="210" x2="872" y2="210" style="stroke:var(--line)" stroke-width="1"/>
  <text x="20" y="240" class="s-sub">A feature leak survives every split. A wrong split survives every metric. A wrong metric survives every review that reads only the number.</text>
  <text x="20" y="262" class="s-sub">Read left to right: the earliest stage with a fault is the one that matters, because everything after it measured the fault.</text>
  <g class="s-sub">
    <rect x="20" y="290" width="14" height="14" rx="3" style="fill:var(--acc);fill-opacity:.3;stroke:var(--acc)" stroke-width="1"/><text x="40" y="302">data (modules 5–7)</text>
    <rect x="200" y="290" width="14" height="14" rx="3" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)" stroke-width="1"/><text x="220" y="302">evaluation (module 8)</text>
    <rect x="400" y="290" width="14" height="14" rx="3" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)" stroke-width="1"/><text x="420" y="302">after shipping (this lesson)</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "The catalogue", id: "catalogue" },

    { t: "p", text: "Three tables, one per phase of the course. Each row is a mistake, the shape it takes in code, the check that confirms it, and where the course covered it. **Read the signature column as a list of things to grep for.**" },

    { t: "table",
      head: ["Mistake", "Signature in the code", "One-line check", "Lesson"],
      rows: [
        ["Inferred dtypes", "`read_csv(path)` with no `dtype=`; IDs as float, zip codes without leading zeros, dates as strings", "`df.dtypes`; `df.id.astype(str).str.len().nunique() > 1`", "5.1"],
        ["Silent encoding damage", "`Ã©` in a string column; a BOM in the first header", "`df.columns[0]`; `.str.contains('Ã')`.any()", "5.2"],
        ["Excel-mangled values", "Dates as 45123; gene-like strings as dates; 16-digit IDs ending in 000", "`.describe()` on ID columns; `pd.to_datetime` errors='coerce' null count", "5.2"],
        ["Join fan-out", "`merge` without `validate=`; row count grows after a join", "`len(after) == len(before)`; `validate='m:1'`", "3.6"],
        ["Timezone mixing", "Naive and aware datetimes in one column; a DST day with 23 rows", "`df.ts.dt.tz`; per-day counts around March and October", "4.4"],
        ["Sentinel nulls", "`-999`, `0`, `\"N/A\"`, `\"\"` counted as values", "`value_counts().head()` per numeric column; `na_values=`", "3.4, 5.1"],
        ["Groupby dropping NaN keys", "`groupby(col)` on a column with nulls; totals do not reconcile", "`groupby(col, dropna=False)` and compare sums", "4.1"],
        ["Categorical explosion", "`groupby` on categoricals returning every combination", "`observed=True`", "4.1"],
        ["MNAR treated as ignorable", "`fillna(median)` on income, blood pressure, a salary field", "Missingness rate against the target; the missing-indicator feature's importance", "6.5, 6.6"],
        ["Outliers removed without a cause", "`df[df.x < df.x.quantile(.99)]` before modelling, also applied to the test rows", "Why is each one there? Cap in the pipeline, never drop test rows", "6.7, 6.8"],
        ["Chained assignment", "`df[mask].col = value`; a `SettingWithCopyWarning` in the log", "`.loc[mask, col] = value`; enable copy-on-write", "3.2"]
      ]
    },

    { t: "table",
      head: ["Mistake", "Signature in the code", "One-line check", "Lesson"],
      rows: [
        ["Target encoding on all rows", "`groupby(cat).y.mean()` mapped back before the split", "`TargetEncoder` in the pipeline; the shuffled-label control", "7.2"],
        ["Scaling with full-data statistics", "`(X - X.mean()) / X.std()` above the split; `fit_transform` on all rows", "Every `fit` below the split or inside a `Pipeline`", "7.4, 8.5"],
        ["Bins or quantiles from all rows", "`pd.qcut(df.x, 10)` before the split", "`KBinsDiscretizer` in the pipeline", "7.6"],
        ["Log of zero or a negative", "`np.log(x)` on a count or a balance", "`(x <= 0).sum()`; `log1p`, or Yeo–Johnson", "7.5"],
        ["Retransformation bias", "`np.exp(model.predict(...))` reported as a mean", "Smearing factor, or a log-link GLM", "7.5"],
        ["High-cardinality one-hot", "`get_dummies` on an ID-like column; thousands of columns", "`nunique()` per object column; `min_frequency`", "7.1"],
        ["Cyclical time as an integer", "`hour`, `month`, `day_of_week` fed raw to a linear model", "sin/cos pair, or a tree model", "7.8"],
        ["Whole-history aggregates", "`groupby(entity).x.transform('mean' / 'count' / 'max')`", "The truncation test", "7.9, 8.3"],
        ["Centred or forward windows", "`rolling(..., center=True)`; `shift(-1)`", "The truncation test; `shift(1)` before every `rolling`", "7.8, 8.3"],
        ["WoE on tiny bins", "Bins with fewer than 5 % of rows or zero events", "Bin counts; Laplace smoothing; monotonic merge", "7.3"],
        ["Text vocabulary from all rows", "`TfidfVectorizer().fit_transform(all_text)` before the split", "Vectoriser inside the pipeline", "7.10"]
      ]
    },

    { t: "table",
      head: ["Mistake", "Signature in the code", "One-line check", "Lesson"],
      rows: [
        ["Selection before CV", "`SelectKBest(...).fit(X, y)` above `cross_val_score`", "Selector inside the pipeline; shuffled-label control", "8.1"],
        ["PCA on raw columns or by 95 %", "`PCA(0.95)` with no scaler; k not on the grid", "Scaler before PCA; passthrough on the grid", "8.2"],
        ["A column written after the label", "`refund_date`, `closure_code`, `days_to_event` in the feature list", "Single-feature AUC scan; null rate in a live pull", "8.3"],
        ["Duplicates across the split", "`concat` of extracts; a retry; no `drop_duplicates`", "Twin share per fold", "8.3"],
        ["Unclosed label windows", "Label = 'event within N days' with rows from the last N days included", "Label rate by extraction recency; censor", "8.3"],
        ["Shuffled split on ordered data", "`train_test_split(X, y)` with a date column present", "`TimeSeriesSplit` with `gap`; honest < shuffled", "8.4"],
        ["Entities on both sides", "`KFold` where an ID column has repeats", "`GroupKFold`; the who-will-be-scored question", "8.4"],
        ["Tuning on the test set", "`X_te` inside a loop that changes a hyperparameter", "Nested CV; the test set read once", "8.4"],
        ["Best-of-grid reported", "`grid.best_score_` in the summary", "The outer-fold mean instead", "8.4"],
        ["SMOTE before the split", "`fit_resample` above `train_test_split` or `cross_val_score`", "`imblearn` pipeline; `ys.mean()` of the evaluated rows", "8.6"],
        ["Accuracy at a skewed rate", "`accuracy_score` with `y.mean()` under 0.1", "Average precision at the natural rate", "8.6"],
        ["The 0.5 threshold", "`.predict()` with no threshold in sight", "Threshold from a cost sweep on validation predictions", "8.6"],
        ["Unseeded randomness", "`RandomForestClassifier()` and `train_test_split` without `random_state`", "Run twice, diff the predictions", "1.5, this lesson"]
      ]
    },

    { t: "p", text: "The catalogue's last column points back to lessons; this table points forward to the model. **What preparation a feature needs depends on what the model does with it**, and half the mistakes above are preparation done for a model that did not need it, or skipped for one that did." },

    { t: "table",
      head: ["Model family", "Scaling", "Categoricals", "Missing values", "Outliers", "Cyclical / interactions"],
      rows: [
        ["Linear, logistic, ridge, lasso", "**Required** — penalties and gradients see units", "One-hot (drop one with an intercept), or WoE / target encoding for high cardinality", "Impute, add a missing indicator", "Cap or robust-scale; a single point can move the fit", "Sin/cos for cycles; interactions must be built by hand (7.8, 7.9)"],
        ["Tree, random forest, gradient boosting", "Not needed — splits are threshold comparisons", "Ordinal or target encoding; one-hot wastes splits; LightGBM and CatBoost take categories natively", "XGBoost / LightGBM route NaN natively; otherwise impute plus indicator", "Harmless — a split isolates them", "Learnt from splits; rotated coordinates and ratios still help (7.9)"],
        ["k-NN, k-means, SVM with RBF", "**Critical** — the model is a distance", "One-hot, then scale; or Gower distance for mixed types", "Impute — distance to NaN is undefined", "Robust scaling; an outlier is a far neighbour for everyone", "Sin/cos; distances already capture interactions"],
        ["Naive Bayes", "Not needed", "Counts or one-hot; the model is per feature", "Impute or treat missing as a category", "Bin or log heavy tails for the Gaussian variant", "None — independence is the assumption"],
        ["Neural network", "**Required** — optimisation depends on it", "Entity embeddings for high cardinality; one-hot for low", "Impute plus indicator, or a learnt missing token", "Clip or transform; gradients follow the tail", "Sin/cos help; interactions are learnt, given enough data"],
        ["Any model, on time-ordered rows", "As above", "As above", "As above — fitted inside the fold", "As above", "Every window trailing, every aggregate as-of, the split by time (8.3, 8.4)"]
      ]
    },

    { t: "callout", kind: "mental", title: "Which one to find first", body: [
      { t: "p", text: "A target-leak column makes every later number meaningless; a wrong split makes every metric optimistic; a wrong metric makes a right split unreadable. **Order the review by what invalidates the most**: reproduce, then the split, then every fit relative to it, then the label's timing, then time itself, then the score's plausibility, then the metric. Stop and report the first fault that invalidates the rest — the second-order fixes can wait until the first-order one is in." }
    ]},

    { t: "h2", n: "03", text: "The review procedure, and what can be automated", id: "procedure" },

    { t: "p", text: "Thirty minutes with a notebook. **Reproduce**: run it fresh, top to bottom, on a clean environment; if it fails or differs, stop. **Find the split** and read everything above it as suspect. **Find every `fit` and every statistic** — mean, median, quantile, vocabulary, category list — and place each inside or outside the fold. **Find the label** and ask when each feature column is populated relative to it. **Find time**: is there a date, is the split ordered by it, are the windows trailing, is the label window closed. **Find the score** and ask whether it is plausible for the domain; run the single-feature scan and the shuffled-label control. **Find the metric** and ask whether it reflects the base rate and the decision." },

    { t: "code", lang: "python", title: "The checks that can be automated, as one function",
      hl: [16, 22, 27, 33, 40, 44],
      code: `import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score

def review(df, y, build_features, pipeline, time_col=None, group_col=None, seed=0):
    """Automatable checks from 8.3-8.6. Everything it cannot check is in the manifest and the reading."""
    rng = np.random.default_rng(seed)
    f = build_features(df)
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    out = {}

    # target leakage: any column that alone rivals the model
    num = f.select_dtypes("number").fillna(f.select_dtypes("number").median())
    sfa = {c: max(a, 1 - a) for c in num for a in [roc_auc_score(y, num[c])]}
    out["single_feature_flags"] = sorted(c for c, a in sfa.items() if a > 0.9)

    # contamination: twins across folds, entities across folds
    keys = f.astype(str).agg("|".join, axis=1)
    out["twin_share"] = round(float(np.mean([keys.iloc[te].isin(keys.iloc[tr]).mean() for tr, te in cv.split(f, y)])), 3)
    if group_col is not None:
        g = df[group_col]
        out["group_overlap"] = round(float(np.mean([g.iloc[te].isin(g.iloc[tr]).mean() for tr, te in cv.split(f, y)])), 3)

    # temporal: features that change when the future is removed
    if time_col is not None:
        cut = df[time_col].quantile(0.8)
        trunc = build_features(df[df[time_col] <= cut]); full = f.loc[trunc.index]
        changed = ~((full == trunc) | (full.isna() & trunc.isna()))
        out["truncation_flags"] = changed.mean()[changed.mean() > 0].index.tolist()

    # fit-time contamination: the pipeline on shuffled labels must score chance
    y_sh = pd.Series(rng.permutation(np.asarray(y)), index=y.index)
    out["shuffled_auc"] = round(float(cross_val_score(clone(pipeline), f, y_sh, cv=cv, scoring="roc_auc").mean()), 3)

    # the ordering: an honest split must not beat the shuffled one
    out["shuffled_cv_auc"] = round(float(cross_val_score(clone(pipeline), f, y, cv=cv, scoring="roc_auc").mean()), 3)
    if time_col is not None:
        order = np.argsort(df[time_col].values, kind="stable"); n_tr = int(0.8 * len(order))
        tr, te = order[:n_tr], order[n_tr:]
        m = clone(pipeline).fit(f.iloc[tr], y.iloc[tr])
        out["time_split_auc"] = round(float(roc_auc_score(y.iloc[te], m.predict_proba(f.iloc[te])[:, 1])), 3)
        out["ordering_ok"] = out["time_split_auc"] <= out["shuffled_cv_auc"] + 0.02

    out["base_rate"] = round(float(np.mean(y)), 4)
    return out

# review(df, y, build_features=features, pipeline=pipe, time_col="order_date", group_col="customer_id")
# -> {'single_feature_flags': [], 'twin_share': 0.0, 'group_overlap': 0.61, 'truncation_flags': [],
#     'shuffled_auc': 0.502, 'shuffled_cv_auc': 0.81, 'time_split_auc': 0.77, 'ordering_ok': True, 'base_rate': 0.034}`,
      caption: "One function, six checks, all built in earlier lessons. `group_overlap` of 0.61 is not a fault by itself — it is the prompt to ask who will be scored. What it cannot see is in the manifest: when each column is populated, and whether the label window had closed."
    },

    { t: "p", text: "The checks that cannot be automated are the ones that need a fact about the world: whether a column is written before or after the outcome, whether the deployment scores seen or new entities, what a false alarm costs. **Those go in the manifest and the run card, and the review reads them rather than guessing.**" },

    { t: "viz",
      title: "The honest number is the last one",
      caption: "One model, one dataset, six evaluations from the earlier lessons. Each fix removes an advantage the deployment will not have, and the number falls. The one that ships is the one on the right, and every number to its left was a promise the model could not keep.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Descending staircase of six bars: target-leak column 1.00, SMOTE before split 0.97, shuffled split 0.84, grouped split 0.74, time split 0.71, future rows of unseen customers 0.66; the last bar is highlighted as the honest estimate.">
  <line x1="60" y1="250" x2="850" y2="250" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="60" y1="40" x2="60" y2="250" style="stroke:var(--line)" stroke-width="1"/>
  <text x="30" y="46" class="s-sub">1.0</text><text x="30" y="150" class="s-sub">0.75</text><text x="30" y="254" class="s-sub">0.5</text>
  <g>
    <rect x="80" y="42" width="100" height="208" rx="3" style="fill:var(--crit);fill-opacity:.35"/>
    <rect x="205" y="54" width="100" height="196" rx="3" style="fill:var(--crit);fill-opacity:.28"/>
    <rect x="330" y="108" width="100" height="142" rx="3" style="fill:var(--warn);fill-opacity:.35"/>
    <rect x="455" y="150" width="100" height="100" rx="3" style="fill:var(--warn);fill-opacity:.28"/>
    <rect x="580" y="163" width="100" height="87" rx="3" style="fill:var(--acc);fill-opacity:.35"/>
    <rect x="705" y="184" width="100" height="66" rx="3" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)" stroke-width="1.5"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="130" y="34">1.00</text><text x="255" y="46">0.97</text><text x="380" y="100">0.84</text><text x="505" y="142">0.74</text><text x="630" y="155">0.71</text><text x="755" y="176" style="fill:var(--good)">0.66</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="130" y="268">closure code</text><text x="130" y="284">in features · 8.3</text>
    <text x="255" y="268">SMOTE before</text><text x="255" y="284">the split · 8.6</text>
    <text x="380" y="268">shuffled split,</text><text x="380" y="284">duplicates · 8.4</text>
    <text x="505" y="268">grouped by</text><text x="505" y="284">customer · 8.4</text>
    <text x="630" y="268">walk-forward</text><text x="630" y="284">in time · 8.4</text>
    <text x="755" y="268" style="fill:var(--good);font-weight:600">new customers,</text><text x="755" y="284" style="fill:var(--good);font-weight:600">later · honest</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "After shipping", id: "after" },

    { t: "p", text: "Some mistakes exist only once the model is live. **Training–serving skew**: the serving code computes a feature differently — a different null handling, a different timezone, a reimplemented scaler — and the model sees inputs it was never validated on; one fitted object for both paths (8.5) removes it, and a fixed-sample comparison in CI catches it when reimplementation is unavoidable. **Drift**: the population moves. **Schema change**: a new category, a renamed column, a unit switched from pence to pounds, arriving without an error. **Feedback**: the model's decisions change the data it will be retrained on — rows it declined never get a label." },

    { t: "code", lang: "python", title: "A stability index per feature and a contract at the door",
      hl: [3, 12, 18, 27, 30],
      code: `def psi(expected, actual, bins=10):
    """Population stability index: training column versus serving column, binned on training quantiles."""
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-6, None), np.clip(a, 1e-6, None)
    return float(((a - e) * np.log(a / e)).sum())
# < 0.10 stable   0.10-0.25 investigate   > 0.25 the population has moved

def drift_report(train_df, live_df, cols):
    return pd.Series({c: psi(train_df[c].dropna(), live_df[c].dropna()) for c in cols}).sort_values(ascending=False)
# amount 0.31  <- a pricing change; cust_prior_avg 0.04; category 0.02 ...

contract = {
    "amount":   dict(dtype="float64", lo=0, hi=50_000, null_max=0.01),
    "channel":  dict(dtype="object",  values={"web", "app", "store"}, null_max=0.0),
    "zip":      dict(dtype="object",  null_max=0.05),
    "order_date": dict(dtype="datetime64[ns, UTC]", null_max=0.0),
}

def check_contract(df, contract):
    faults = []
    for c, spec in contract.items():
        if c not in df:                                   faults.append(f"{c}: missing"); continue
        if str(df[c].dtype) != spec["dtype"]:             faults.append(f"{c}: dtype {df[c].dtype}")
        if df[c].isna().mean() > spec["null_max"]:        faults.append(f"{c}: null rate {df[c].isna().mean():.3f}")
        if "lo" in spec and (df[c].dropna() < spec["lo"]).any():  faults.append(f"{c}: below {spec['lo']}")
        if "hi" in spec and (df[c].dropna() > spec["hi"]).any():  faults.append(f"{c}: above {spec['hi']}")
        if "values" in spec and not set(df[c].dropna().unique()) <= spec["values"]:
            faults.append(f"{c}: unexpected values {set(df[c].dropna().unique()) - spec['values']}")
    return faults
# run at ingestion and at every scoring call. A schema change is an error, not a silent 0.`,
      caption: "**PSI says which columns moved and the contract says which columns are no longer what the model was trained on.** Neither needs labels, which is the point: labels arrive late or never, and the live score is the last thing to tell you something changed."
    },

    { t: "callout", kind: "production", title: "The label delay and the feedback loop", body: [
      { t: "p", text: "A fraud model's live AUC cannot be computed until chargebacks arrive, weeks later — so the first signal of failure is drift, not score. And **the rows the model rejects never get a label**: retraining on approved transactions only teaches the next model that everything it approves is fine. Keep a small random slice that the model does not decide, so there is an unbiased sample to learn from and to measure against." }
    ]},

    { t: "h2", n: "05", text: "Reproducibility", id: "repro" },

    { t: "p", text: "A result that cannot be rerun cannot be reviewed. Four things make it rerunnable: **a seed** for every random step (1.5); **a fingerprint** of the data the run used, because extracts change under you; **pinned versions** of the libraries, because a pickle and a default both change between releases; and **the split definition and the metric**, written down. The test is the simplest one there is: run it twice and diff the predictions." },

    { t: "code", lang: "python", title: "The run card, and the run-it-twice test",
      hl: [11, 12, 19, 20],
      code: `import hashlib, sys, json
import numpy, pandas, sklearn

def fingerprint(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()[:16]

run_card = {
    "data": fingerprint("orders_2025-09.parquet"), "seed": 0,
    "versions": {"python": sys.version.split()[0], "numpy": numpy.__version__,
                 "pandas": pandas.__version__, "sklearn": sklearn.__version__},
    "split": "time; cut = 2025-07-01; gap = 30 days; test = last block, read once",
    "metric": "average precision at the natural base rate (0.034)",
}
json.dump(run_card, open("run_card.json", "w"), indent=2)

p1 = build_pipeline(seed=run_card["seed"]).fit(X_tr, y_tr).predict_proba(X_te)[:, 1]
p2 = build_pipeline(seed=run_card["seed"]).fit(X_tr, y_tr).predict_proba(X_te)[:, 1]
assert np.array_equal(p1, p2), "two runs from one card disagree: an unseeded step, or a non-deterministic op"
# common culprits: random_state left at None; n_jobs > 1 changing float summation order;
# a dict or set iteration deciding column order; a SQL query without ORDER BY (5.5)`,
      caption: "The run card is one JSON file, and it turns 'the model scored 0.34' into a claim someone else can check. The equality assertion is strict on purpose: a run that differs in the eighth decimal has a non-deterministic step, and the next difference will not be in the eighth decimal."
    },

    { t: "ladder",
      title: "Reviewing a colleague's model before it ships",
      rungs: [
        { level: "bad", label: "Read the number", code: `# "AP 0.71 on the holdout, up from 0.52. Looks great, approving."`,
          note: "**The number is the output of every mistake above it.** A review that reads only the score approves the leak that produced it." },
        { level: "ok", label: "Read the code for leaks", code: `# scan for fit_transform above the split, SMOTE before CV, entity aggregates,
# refund_date in the feature list ... found two, asked for fixes`,
          note: "**Finds what the reviewer already knows to look for.** Misses the unclosed label window, the unseeded forest, and the fact that the notebook does not run from the top." },
        { level: "best", label: "Run the procedure", code: `# 1 reproduce from a clean env + run card   2 find the split; everything above is suspect
# 3 every fit inside the fold?   4 label: manifest known_at per column, window closed?
# 5 time: ordered split, gap, trailing windows, truncation test   6 score: plausible? scan + shuffled control
# 7 metric: base rate, decision, threshold   -> review() output attached to the PR`,
          note: "**The order finds the fault that invalidates the rest first**, the automated checks are attached as evidence, and the two questions the code cannot answer — when is each column written, who will be scored — are asked out loud." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Review",
      title: "Review this before it ships",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "The script below trains a refund-prediction model on an orders extract. It runs without error and reports 0.96. Find every mistake — there are at least eight — and for each give its signature, the lesson that covers it and the one-line check. Then rewrite the script so it is honest, and say what number you would expect it to report instead." },
        { t: "code", lang: "python", title: "refund_model.py (as submitted)", code: `import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

df = pd.read_csv("orders.csv")
df["order_date"] = pd.to_datetime(df.order_date)
df["days_to_refund"] = (pd.to_datetime(df.refund_date) - df.order_date).dt.days
df["cust_avg_amount"] = df.groupby("customer_id").amount.transform("mean")
df["cust_n_orders"] = df.groupby("customer_id").amount.transform("count")
df = df.fillna(df.median(numeric_only=True))

X = pd.get_dummies(df.drop(columns=["refunded", "order_date", "refund_date"]))
y = df.refunded
Xs, ys = SMOTE().fit_resample(X, y)
X_tr, X_te, y_tr, y_te = train_test_split(Xs, ys, test_size=0.2)

model = RandomForestClassifier().fit(X_tr, y_tr)
print("accuracy", accuracy_score(y_te, model.predict(X_te)))      # 0.96` }
      ],
      requirements: [
        "A numbered list of the faults, each with signature, lesson and check.",
        "The order in which you would report them — which one invalidates the rest.",
        "A rewritten script: explicit dtypes, as-of features only, censored labels, time split with a gap, a Pipeline, average precision at the natural rate, a seed.",
        "An honest expectation for the reported number, with the reasoning."
      ],
      hint: "Start from the label: what does `refund_date` contain for a row that was not refunded, and what does `days_to_refund` become after `fillna`? Then find the split and read upwards. Then ask what `accuracy` on a SMOTE-balanced test set can possibly mean.",
      solution: {
        lang: "python",
        title: "refund_model_reviewed.py",
        code: `# ---- the review ------------------------------------------------------------
# 1  days_to_refund: refund_date exists only for refunded orders -> after fillna it is 'the median' for
#    non-refunds and a real number for refunds. It is the label. (8.3; single-feature AUC ~1.0; known_at = after outcome)
# 2  cust_avg_amount / cust_n_orders: whole-history aggregates -- for each order, later orders are included,
#    and the count encodes how long the customer stayed. (7.9, 8.3; truncation test flags both)
# 3  fillna(df.median()) above the split: imputation statistics from all rows, including the test rows.
#    (8.5; every fit below the split or inside a Pipeline)
# 4  read_csv without dtype: customer_id and zip inferred; leading zeros lost; dates parsed late. (5.1)
# 5  get_dummies on everything: customer_id one-hot -> thousands of columns and an entity fingerprint;
#    vocabulary from all rows; nothing for unseen categories at serving. (7.1, 8.5; nunique per object column)
# 6  SMOTE before the split: synthetic relatives of test rows in training; test set 50 % refunds. (8.6)
# 7  train_test_split on dated rows, shuffled, no random_state: future in training, and not reproducible.
#    (8.4, 1.5; TimeSeriesSplit with gap; run twice and diff)
# 8  accuracy on a resampled test set with the default threshold: meaningless twice over. (8.6)
# 9  no censoring: orders from the last refund-window days are labelled 'not refunded' because the window
#    has not closed. (8.3; label rate by recency)
# Report order: 1 first (the score is the label), then 6 and 7 (the evaluation is not an evaluation),
# then 2, 3, 5, 9 (the features and rows), then 4 and 8. Fixing 1 alone drops 0.96 to ~0.9; fixing all
# of them lands near 0.3 average precision at a 3-4 % base rate -- and that number can ship.

# ---- the rewrite -----------------------------------------------------------
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, precision_score, recall_score
from sklearn.model_selection import TimeSeriesSplit, cross_val_predict
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SEED, HORIZON = 0, pd.Timedelta(days=30)                       # refunds count if within 30 days of the order

df = (pd.read_csv("orders.csv", dtype={"customer_id": "string", "zip": "string", "category": "string", "channel": "string"},
                  parse_dates=["order_date", "refund_date"])
        .sort_values("order_date", kind="stable").reset_index(drop=True))

# label: refunded within the horizon; censor rows whose window had not closed at extraction
extract_date = df.order_date.max()
df = df[df.order_date <= extract_date - HORIZON].copy()
y = ((df.refund_date - df.order_date) <= HORIZON).fillna(False).astype(int)
print("base rate", round(y.mean(), 4))                          # 0.034

# features: only what exists at order time. Aggregates are strictly prior.
g = df.groupby("customer_id").amount
feats = pd.DataFrame({
    "amount":           df.amount,
    "cust_prior_n":     df.groupby("customer_id").cumcount(),                       # orders before this one
    "cust_prior_avg":   g.transform(lambda s: s.shift().expanding().mean()),         # NaN for a first order: imputed in-fold
    "category": df.category, "channel": df.channel, "zip": df.zip,
})
num, cat = ["amount", "cust_prior_n", "cust_prior_avg"], ["category", "channel", "zip"]

pre = ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), num),
    ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=50), cat),
])
pipe = Pipeline([("pre", pre), ("clf", RandomForestClassifier(300, min_samples_leaf=5, class_weight="balanced",
                                                                random_state=SEED, n_jobs=1))])

# evaluation: walk forward in time with the label horizon embargoed; out-of-fold probabilities for the threshold
gap_rows = int((df.order_date > extract_date - 2 * HORIZON).sum() / 2)           # ~ 30 days of rows
cv = TimeSeriesSplit(n_splits=5, gap=gap_rows)
p = cross_val_predict(pipe, feats, y, cv=cv, method="predict_proba")[:, 1]
scored = np.zeros(len(y), bool)
for _, te in cv.split(feats): scored[te] = True                                   # rows that received an OOF prediction
ap = average_precision_score(y[scored], p[scored])
print("average precision, natural rate, walk-forward:", round(ap, 3))              # ~0.31

# threshold from costs on the OOF predictions (a missed refund costs 20, a needless hold costs 1)
cost_fn, cost_fp = 20, 1
ts = np.linspace(0.01, 0.6, 120)
cost = [((p[scored] < t) & (y[scored] == 1)).sum() * cost_fn + ((p[scored] >= t) & (y[scored] == 0)).sum() * cost_fp for t in ts]
t_star = ts[int(np.argmin(cost))]
yhat = p[scored] >= t_star
print(f"threshold {t_star:.2f}: precision {precision_score(y[scored], yhat):.2f}  recall {recall_score(y[scored], yhat):.2f}")

# the automated checks from section 03 go here: review(df, y, build_features, pipe, time_col="order_date", group_col="customer_id")
# and the run card: data fingerprint, SEED, versions, the split definition above, and 'AP at base rate 0.034'.`,
        notes: [
          { t: "p", text: "**Nine faults, and the first one is the whole score.** `days_to_refund` is `refund_date − order_date`, which exists only when a refund happened; after `fillna` it is a real number for refunds and the median for everything else. The forest learns that in one split. Reported first because nothing else in the script can be assessed until it is gone." },
          { t: "p", text: "**The evaluation was not an evaluation**: SMOTE before the split put synthetic relatives of test rows in training and balanced the test set to 50 %; the shuffled split put future orders in training; accuracy at 50 % with the default threshold measured nothing the business will see. Those three are reported together, because fixing the features without fixing them changes a meaningless 0.96 into a meaningless 0.9." },
          { t: "p", text: "**The rewrite is mostly about time.** Explicit dtypes and date parsing up front; the label censored to orders whose window had closed; every customer aggregate strictly prior (`cumcount`, `shift().expanding()`); a walk-forward split with the label horizon embargoed; every fit inside the pipeline; average precision at the 3.4 % base rate; the threshold from a cost sweep on out-of-fold predictions. It reports about 0.31 — a number the live model can match, and one that says a refund flagged by this model is roughly nine times more likely to be real than a random one." },
          { t: "p", text: "**What the rewrite still cannot know is in the manifest**: whether `channel` or `zip` can be updated after the order, and whether the model will score customers it has seen. Both are questions for the person who owns the data, and the review asks them." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A reviewer finds a `fillna(df.median())` above the split, a `SMOTE()` above `train_test_split`, and `refund_date` in the feature list. Which do they report first, and why?",
          options: [
            "The fillna — it is the earliest line",
            "`refund_date`: it is the label under another name, so every number in the notebook measures it; the other two faults cannot even be assessed until it is gone",
            "SMOTE — it produces the largest inflation",
            "All three equally"
          ],
          answer: 1,
          why: "Order by what invalidates the most. A target-leak column makes the score meaningless regardless of how the split or the imputation is done. Fixing the others first turns 0.96 into 0.9 and still says nothing."
        }
      ]
    }
  ],

  takeaways: [
    "**Every mistake in this course has a signature you can read without running the code** — grep for the shape, then run the one-line check.",
    "**Order the review by what invalidates the most**: reproduce, split, fits, label, time, score, metric. Report the first fault that makes the rest unreadable.",
    "**A feature leak survives every split, a wrong split survives every metric, a wrong metric survives a review that reads only the number.**",
    "**Six checks automate**: single-feature scan, twin share, group overlap, truncation test, shuffled labels, honest-below-shuffled ordering. Two do not: when each column is written, and who will be scored.",
    "**The honest number is the last one** — each fix removes an advantage the deployment will not have, and the estimate falls to the one that can ship.",
    "**After shipping, the failures are skew, drift, schema change and feedback.** One fitted object removes skew; PSI per feature and a data contract catch the rest without waiting for labels.",
    "**Labels arrive late or never**: drift is the first signal, and a random slice the model does not decide keeps an unbiased sample to learn from.",
    "**Reproducibility is a seed, a data fingerprint, pinned versions and the split written down** — and the test is to run it twice and diff the predictions.",
    "**A review attaches evidence**: the `review()` output, the manifest, the run card. 'Looks good' is not a review."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`df[\"cust_n_orders\"] = df.groupby(\"customer_id\").amount.transform(\"count\")` appears in a churn model. What is wrong and which check shows it?",
        options: [
          "Nothing — order count is a legitimate feature",
          "It counts every order in the extract, including those after each row, so it encodes how long the customer stayed — which is the label; the truncation test shows it changing when later rows are removed",
          "It should be `size` not `count`",
          "It needs a `reset_index`"
        ],
        answer: 1,
        why: "A whole-history count is a clock. The as-of version is `groupby(...).cumcount()` — orders strictly before this one — and the truncation test is the automated guard: rebuild on a shortened history and any past value that changes used the future."
      },
      {
        stem: "Which pair of post-shipping checks works without any labels?",
        options: [
          "Live AUC and live precision",
          "PSI per feature against the training distribution, and a data contract on dtypes, ranges, categories and null rates at every scoring call",
          "Retraining accuracy and calibration",
          "A/B test lift"
        ],
        answer: 1,
        why: "Labels arrive late — chargebacks, churn windows, outcomes — or never for rows the model declined. Drift in the inputs and violations of the schema are visible immediately, and they are the first signal that the live score will be wrong when it finally arrives."
      },
      {
        stem: "Two runs of the same training script produce predictions that differ in the sixth decimal place. What is the right response?",
        options: [
          "Ignore it — the difference is negligible",
          "Find the non-deterministic step — an unseeded estimator, `n_jobs` changing summation order, a set iteration, a SQL query without ORDER BY — because the next difference will not be in the sixth decimal",
          "Average the two runs",
          "Round the predictions"
        ],
        answer: 1,
        why: "The run-it-twice test is strict on purpose. A tiny difference proves the pipeline has a step that is not under the seed's control; the same step can produce a different feature order or a different split next time."
      },
      {
        stem: "A model rejects 10 % of applications, and only approved applications ever receive a repayment label. What happens at retraining, and what is the fix?",
        options: [
          "Nothing — more data is more data",
          "The next model trains only on rows the current model approved, learns that its approvals are fine, and the rejected region is never re-examined; keep a small random slice that is decided without the model so an unbiased labelled sample exists",
          "Use class weights",
          "Retrain less often"
        ],
        answer: 1,
        why: "A feedback loop is a selection mechanism on the training data. The holdout slice is expensive — some of those applications will default — and it is the only source of ground truth for the region the model has stopped looking at."
      },
      {
        stem: "In the review procedure, why is 'find the split' the second step rather than 'read the features'?",
        options: [
          "Because splits are shorter to read",
          "Because everything above the split is applied to test rows too — every statistic, imputation, encoding, aggregate and resampling there is suspect, and reading upwards from the split is how to find them in one pass",
          "Because the split determines the metric",
          "It is not; features come first"
        ],
        answer: 1,
        why: "The split is the line that separates what the model may learn from what it must be tested on. Finding it first turns the rest of the notebook into two regions with different rules, and the region above it is where the leaks live."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "You are handed a notebook that reports AUC 0.97. How do you review it?",
        strong: "In a fixed order. First I reproduce it from a clean environment — if it does not run or gives a different number, that is the finding. Then I find the split and read everything above it as suspect: every fit, statistic, aggregate and resampling. Then the label: when is it known, and is any feature column populated with or after it — I run a single-feature AUC scan for the 0.97's source. Then time: is there a date, is the split ordered by it, is there a gap, are the windows trailing — the truncation test. Then the score's plausibility and the shuffled-label control. Then the metric against the base rate and the decision. I report the first fault that invalidates the rest, attach the automated checks, and ask the two questions the code cannot answer: when is each column written, and who will be scored.",
        answer: [
          { t: "p", text: "Order, evidence, and the two human questions — that is a review rather than a reading." }
        ]
      },
      {
        level: "expert",
        q: "What does a model need in production that it did not need in the notebook?",
        strong: "One object for training and serving, so there is no reimplemented preprocessing to drift. A data contract at the door — dtypes, ranges, categories, null rates — so a schema change is an error rather than a silent zero. A stability index per feature against the training distribution, because labels arrive late and drift is the first signal. A record of the live null rate per column, which exposes features that were populated by the outcome. A random slice the model does not decide, so retraining has an unbiased sample and the feedback loop is broken. And a run card — data fingerprint, seed, versions, split, metric — so that when the live score finally arrives and disagrees with the notebook, the notebook can be rerun and the disagreement diagnosed.",
        answer: [
          { t: "p", text: "Each item is a failure mode the notebook could not have — the answer shows which ones the candidate has actually met." }
        ]
      },
      {
        level: "expert",
        q: "Every fix you made lowered the reported score. How do you explain that to the people who saw the first number?",
        strong: "That the first number was not an estimate of the model; it was an estimate of the mistakes. The closure code made it 1.0 — that is the label. SMOTE before the split made it 0.97 — that is recognising synthetic copies. The shuffled split made it 0.84 — that is remembering customers and seeing the future. The honest number is what the model will do on the rows it will actually meet: new customers, next quarter, at the real refund rate. It is lower and it is real, and a decision made on it will hold. The alternative is shipping the 0.97 and explaining in three months why the live model is at 0.6 — which is the conversation this one is replacing.",
        answer: [
          { t: "p", text: "Attributing each drop to the advantage it removed turns a disappointing number into a credible one." }
        ]
      }
    ]
  }
});
