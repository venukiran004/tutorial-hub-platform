/* ============================================================================
   LESSON 16.2 — Recovery for ML Systems, Stage by Stage
   ========================================================================= */
EC.receiveLesson({
  id: "16.2",

  lede: "An ML system is a pipeline with six stages, and each one fails in its own way. **The failures that matter are not the ones that crash the pipeline — those get noticed. They are the ones that let it complete successfully and produce a worse model, because every downstream check is about liveness and the loss went down.** This lesson walks ingestion to monitoring and names the prevention, detection, containment, recovery and verification available at each stage.",

  objectives: [
    "Locate a failure to a pipeline stage before reaching for a mitigation",
    "Prevent a stage failure where the design allows it, rather than recovering from it",
    "Detect a silent degradation at the stage that produced it",
    "Recover each stage's assets with the right mechanism and a known time cost",
    "Verify a recovered model against a dated baseline rather than against a health check"
  ],

  prerequisites: ["16.1", "15.5"],

  blocks: [

    { t: "h2", n: "01", text: "The six stages, and where each one actually fails", id: "stages" },

    {"kind": "trace", "title": "Six stages, and only one of them fails loudly", "caption": "**This is the column that makes ML recovery a different discipline rather than an application of the usual one.** Four of the six characteristic failures complete successfully, return a number, and move on — so the question “what broke” cannot be answered by looking at errors, and the mitigation cannot be chosen until the stage is located. **The registry is the only stage that fails loudly, and only at the moment you try to use it.**", "left": "stage", "codeW": 160, "vars": ["characteristic failure", "loud or silent"], "steps": [{"code": "1 ingestion", "state": ["a partial export, or yesterday's file", "SILENT - counts look plausible"], "tone": "crit"}, {"code": "2 features", "state": ["a transform changes; the halves drift", "SILENT - training-serving skew"], "changed": [0, 1], "tone": "crit"}, {"code": "3 training", "state": ["leakage, or an open label window", "SILENT - the loss looks fine"], "changed": [0, 1], "tone": "crit"}, {"code": "4 registry", "state": ["overwritten, or lineage unrecorded", "loud, on restore"], "changed": [0, 1], "tone": "warn"}, {"code": "5 serving", "state": ["wrong version, or skewed preprocessing", "SILENT - plausible numbers"], "changed": [0, 1], "tone": "crit"}, {"code": "6 monitoring", "state": ["it watches liveness, not quality", "silent by construction"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-16_2-01-0"},

    { t: "p", text: "The pipeline is the unit of analysis, because a mitigation is only ever available at a particular stage. **Read the last column first: in four of the six stages the characteristic failure is silent**, which is why ML recovery is a different discipline from application recovery rather than an application of it." },

    { t: "table",
      head: ["Stage", "Produces", "Characteristic failure", "Loud or silent"],
      rows: [
        ["**1 Ingestion**", "Raw data in a landing zone", "The upstream export runs but is partial, or reruns yesterday", "**Silent** — row counts look plausible"],
        ["**2 Features**", "A feature table, offline and online", "A transform changes, or the two halves drift apart", "**Silent** — training-serving skew"],
        ["**3 Training**", "A candidate model plus metrics", "Non-determinism, a leaked column, or a label window not yet closed", "**Silent** — the loss curve looks fine"],
        ["**4 Registry**", "A versioned, immutable artifact", "The artifact is overwritten, or its lineage is unrecorded", "Loud on restore, silent until then"],
        ["**5 Serving**", "Predictions", "The wrong version is loaded, or preprocessing differs from training", "**Silent** — every response is a plausible number"],
        ["**6 Monitoring**", "Drift and quality signals", "It watches liveness and not quality, so it reports green", "Silent by construction"]
      ],
      caption: "**Only stage 4 fails loudly, and only when you try to use it.** Everything else completes, returns a number, and moves on — which is the reason this lesson is organised by stage rather than by mitigation: you cannot choose a mitigation until you know which stage produced the wrong answer." },

    { t: "h2", n: "02", text: "Stages 1 and 2: ingestion and features", id: "ingest-features" },

    {"kind": "flow", "title": "Why freshness is the assertion that catches the most incidents", "caption": "**A pipeline that reprocesses yesterday's file succeeds every time.** Every row is valid, the schema passes, the volume is identical, and the model trains on data that is one day stale — so no row-level validation can possibly notice. One comparison of the maximum timestamp against today catches it, and it is the cheapest assertion in the pipeline. **The volume check is the companion:** compare against the recent average, not against zero, because a truncated export is a plausible row count and so is a doubled one.", "cols": 3, "nodes": [{"id": "u", "label": "The upstream export re-runs yesterday", "sub": "or returns half the rows", "tone": "crit"}, {"id": "s", "label": "Schema validation passes", "sub": "every row is well formed", "tone": "warn"}, {"id": "v", "label": "Volume looks plausible", "sub": "against zero, which is the usual check", "tone": "warn"}, {"id": "t", "label": "The model trains and reports normal metrics", "sub": "on stale or partial data", "tone": "crit"}, {"id": "f", "label": "Freshness: max timestamp is today", "sub": "one query, and it catches this", "tone": "good"}, {"id": "n", "label": "Volume against the recent average", "sub": "not against zero", "tone": "good"}], "edges": [["u", "s"], ["s", "v"], ["v", "t"], ["u", "f"], ["f", "n"]], "t": "diagram", "id": "dg-16_2-02-1"},

    { t: "p", text: "These two stages share a property that makes them the most dangerous in the pipeline: **their failures are indistinguishable from success at every point downstream.** A partial export trains a model on less data; a changed transform trains it on a different meaning of the same column. Both produce a model, and both produce metrics." },

    { t: "code", lang: "python", title: "The three assertions that catch a bad upstream run",
      code: `# PREVENT: make the contract explicit and fail the run rather than the model.
import pandera as pa

schema = pa.DataFrameSchema({
    "customer_id": pa.Column(int, nullable=False, unique=True),
    "signed_up":   pa.Column("datetime64[ns]", nullable=False),
    "plan":        pa.Column(str, pa.Check.isin(["free", "plus", "pro"])),
    "monthly_spend": pa.Column(float, pa.Check.in_range(0, 100_000)),
})
df = schema.validate(raw, lazy=True)        # lazy: every violation at once

# DETECT: three assertions, and the first one is the one teams omit.
def gate(df, prev):
    # 1. FRESHNESS -- the highest-value check in any data pipeline, because a
    #    pipeline that reprocesses yesterday's file succeeds every time.
    assert df["event_at"].max().date() == date.today(), "stale input"

    # 2. VOLUME against the recent norm, not against zero.
    lo, hi = 0.8 * prev["rows"], 1.25 * prev["rows"]
    assert lo <= len(df) <= hi, f"row count {len(df)} outside [{lo:.0f}, {hi:.0f}]"

    # 3. NULL RATE PER COLUMN, which catches a field that stopped arriving.
    for col, rate in (df.isna().mean()).items():
        assert rate <= prev["null_rate"][col] + 0.05, f"{col} nulls jumped"

# CONTAIN: quarantine rather than halt. Write the rejects somewhere
# inspectable, fail the run only above a threshold somebody chose.
rejects = raw[~raw.index.isin(df.index)]
rejects.to_parquet(f"rejects/{run_id}.parquet")
assert len(rejects) / len(raw) < 0.02, "reject rate above 2%"`,
      caption: "**Freshness is the assertion that catches the most incidents and is the one most often missing.** A pipeline that silently reprocesses yesterday's file completes successfully, reports green, and trains on data that is one day stale — and no row-level validation will ever notice, because every row is valid." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**1 Ingestion**", "A schema contract at the boundary; immutable, dated landing-zone paths", "Freshness, volume against the norm, null rate per column", "Quarantine rejects; fail above a chosen threshold", "Re-run from the landing zone — which is why raw data is never transformed in place", "Row counts and totals reconcile against the source"],
        ["**2 Features**", "One transform definition used by both training and serving; versioned", "Compare online and offline distributions on the same keys", "Serve the last-good feature values rather than nulls", "Rebuild the online store from the offline store", "**Skew check: score the same rows through both paths and diff**"]
      ],
      caption: "**The prevention in stage 2 is the one that removes a whole class of failure:** one transform definition, called by both the training job and the serving path, cannot drift from itself. Two implementations of the same logic will." },

    { t: "callout", kind: "trap", title: "Rebuilding the online store creates skew while it runs", body: [
      { t: "p", text: "The recovery for a lost online feature store is to rebuild it from the offline store, which is correct and takes time. **While it runs, some keys have fresh features and some have none — so the model is scoring a mixture of two feature distributions, and its predictions are wrong in a way that is not uniform across users.**" },
      { t: "p", text: "**Decide in advance which is worse: wrong answers or no answers.** Serving a default for a missing feature is a prediction built on a value the model never saw in training; refusing to score until the rebuild completes is an outage with an honest cause. For anything consequential — credit, fraud, clinical — the refusal is usually right, and that decision belongs in the runbook rather than in the moment." }
    ]},

    { t: "h2", n: "03", text: "Stage 3: training", id: "training" },

    {"kind": "trace", "title": "What has to be recorded for a training run to be rebuildable", "caption": "**Two of these fields are the ones that turn provenance from a formality into a guarantee.** A commit sha recorded from a working tree with uncommitted changes describes code that exists nowhere, so the artifact claims a reproducibility it does not have — which is why `git_dirty` belongs beside it. **And the label cutoff is the ML-specific one:** a 90-day outcome cannot be observed for a row extracted 30 days ago, so the most recent rows carry systematically wrong labels, and they are the rows most like production.", "left": "field", "codeW": 160, "vars": ["why it is needed", "if omitted"], "steps": [{"code": "git_sha", "state": ["which code produced this", "cannot rebuild"], "tone": "good"}, {"code": "git_dirty", "state": ["was the tree clean?", "the sha describes code that does not exist"], "changed": [0, 1], "tone": "crit"}, {"code": "data_version + hash", "state": ["which snapshot, and proof", "'latest' is not a version"], "changed": [0, 1], "tone": "good"}, {"code": "seed", "state": ["reproducible initialisation", "a different model each rebuild"], "changed": [0, 1], "tone": "good"}, {"code": "package versions", "state": ["exact, not a range", "a silent behaviour change"], "changed": [0, 1], "tone": "accent"}, {"code": "label cutoff", "state": ["the outcome window had closed", "recent rows are labelled wrong"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-16_2-03-2"},

    { t: "p", text: "Training is the stage where recovery is most expensive and prevention is cheapest. **A training run you cannot reproduce is an artifact you cannot rebuild**, which converts a derived asset into a source one — and the four things that make it reproducible cost one commit." },

    { t: "code", lang: "python", title: "What has to be recorded for a run to be rebuildable at all",
      code: `import json, subprocess, sys

def provenance(seed: int) -> dict:
    """Everything needed to reproduce this run, recorded with the artifact."""
    sha = subprocess.run(["git", "rev-parse", "HEAD"],
                         capture_output=True, text=True).stdout.strip()
    dirty = bool(subprocess.run(["git", "status", "--porcelain"],
                                capture_output=True, text=True).stdout.strip())
    return {
        "git_sha": sha,
        "git_dirty": dirty,          # <- the field people omit and need
        "data_version": DATA_SNAPSHOT_ID,       # a snapshot id, not "latest"
        "data_hash": content_hash(train_path),  # proves it is that snapshot
        "seed": seed,
        "python": sys.version.split()[0],
        "packages": freeze(),        # exact versions, not a range
        "cutoff": LABEL_CUTOFF.isoformat(),     # see below
    }

# git_dirty IS NOT OPTIONAL: a sha recorded from a working tree with
# uncommitted changes describes code that exists nowhere, so the artifact
# claims a reproducibility it does not have.

# AND THE CUTOFF IS THE ML-SPECIFIC ONE. "Churned within 90 days" cannot be
# observed for a row extracted 30 days ago -- that row is labelled "retained"
# because the window had not closed. The most recent rows carry systematically
# wrong labels, and they are the rows most like production.
train = train[train["extracted_at"] <= date.today() - timedelta(days=90)]`,
      caption: "**`git_dirty` and the label cutoff are the two fields that turn provenance from a formality into a guarantee.** A sha from a dirty tree points at code that exists nowhere; an uncensored label window trains on rows whose outcome had not happened yet, which is the one reproducibility failure that also makes the model wrong." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**3 Training**", "Seed everything; pin versions; record provenance; censor the label window; run leakage checks in CI", "Compare metrics against the previous run, not against a threshold; alarm on an *improvement* too", "Never promote automatically — a candidate is a candidate", "Re-run from the recorded provenance; **hours to days, so this is the stage to snapshot rather than rebuild**", "The rebuilt model's metrics match the recorded ones within tolerance"]
      ],
      caption: "**Alarm on an improvement as well as a regression.** A sudden jump in validation score is the signature of leakage far more often than of a better model, and a threshold-based gate passes it enthusiastically." },

    { t: "h2", n: "04", text: "Stages 4 and 5: registry and serving", id: "registry-serving" },

    {"kind": "trace", "title": "Four restore checks, and only the last one catches a wrong version", "caption": "**Every row above the last passes on an older artifact of the same model.** It loads, it serves, the latency is normal and the health check is green — because none of those checks is about identity. **Golden predictions are a few dozen input rows and their expected outputs, committed to git**, and they fail immediately on a wrong version. It is the cheapest verification in ML recovery and almost nobody has it; reporting the version and schema hash from the health endpoint is the other half, because it makes the identity visible from outside.", "left": "check", "codeW": 190, "vars": ["passes on a wrong version?", "catches"], "steps": [{"code": "the artifact loads", "state": ["YES", "a corrupt file only"], "tone": "crit"}, {"code": "it returns a prediction", "state": ["YES", "a crash only"], "changed": [1], "tone": "crit"}, {"code": "latency within budget", "state": ["YES", "nothing about correctness"], "changed": [1], "tone": "crit"}, {"code": "health check 200", "state": ["YES", "liveness"], "changed": [1], "tone": "crit"}, {"code": "golden predictions", "state": ["NO - it fails", "the wrong version, immediately"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-16_2-04-3"},

    { t: "p", text: "These two stages are where the recovery is easy and the verification is hard. **An artifact restored from object storage is a few minutes' work; proving the restored system behaves like the one you lost is the part that gets skipped.**" },

    { t: "code", lang: "python", title: "Immutability, and the version check that belongs in the health endpoint",
      code: `# PREVENT: write-once paths. An artifact that cannot be overwritten cannot be
# lost to a bad deploy, and the storage cost of keeping every version of a
# model is almost always smaller than one incident.
key = f"models/{name}/{version}/{sha}/model.joblib"      # no "latest" path
s3.put_object(Bucket=B, Key=key, Body=buf,
              IfNoneMatch="*")                  # fails if the key exists

# Object Lock or versioning on the bucket makes deletion recoverable too:
#   a lifecycle rule that expires old versions is the thing to check BEFORE
#   relying on versioning as a backup.

# DETECT: the health endpoint reports what is loaded, so a wrong version is
# visible from outside rather than inferable from behaviour.
@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "model_version": MODEL.version,          # <- the one that matters
        "model_sha": MODEL.sha,
        "feature_schema": MODEL.schema_hash,
        "loaded_at": MODEL.loaded_at.isoformat(),
    }

# VERIFY after any restore: the same inputs must give the same outputs.
GOLDEN = json.load(open("tests/golden_predictions.json"))   # dated, in git
for row, expected in GOLDEN:
    got = predict(row)
    assert abs(got - expected) < 1e-6, f"prediction drift: {got} vs {expected}"
# A restored artifact that loads and serves plausible numbers passes every
# other check. This is the one that fails when it is the wrong version.`,
      caption: "**Golden predictions are the cheapest verification in ML recovery and almost nobody has them:** a few dozen input rows and their expected outputs, committed to git. A restored model that is the wrong version loads cleanly, serves plausible numbers, and fails this immediately." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**4 Registry**", "Write-once keys including the sha; bucket versioning with a checked lifecycle rule; provenance stored beside the artifact", "A nightly job that loads the current artifact in a scratch process", "Keep the previous two versions warm and routable", "Restore from object storage — **minutes**", "Load it and run the golden predictions"],
        ["**5 Serving**", "The preprocessing travels with the model, as one fitted object, not reimplemented", "Health endpoint reports the loaded version; output-distribution drift", "Roll back to the previous version; shadow the new one first", "Redeploy the previous artifact — minutes", "**Golden predictions, then the eval suite against a dated baseline**"]
      ],
      caption: "**The prevention in stage 5 removes the most common serving failure outright.** When the scaler and the encoder are part of the saved pipeline, there is no second implementation to drift; when the serving code reimplements them, training-serving skew is a matter of time rather than of chance." },

    { t: "h2", n: "05", text: "Stage 6: monitoring, which has its own failure mode", id: "monitoring" },

    { t: "p", text: "Monitoring is a stage, not an observer of the other stages, and it fails like the rest. **Its characteristic failure is reporting green while quality degrades** — because liveness is easy to measure and quality needs labels that arrive weeks later or never." },

    { t: "code", lang: "python", title: "The signals that work without labels, in order of how soon they move",
      code: `# THE PROBLEM: accuracy needs ground truth. For churn it arrives in 90 days;
# for fraud, when a chargeback lands; for some systems, never. So the signals
# that actually guard a live model are the label-free ones.

# 1. OUTPUT DRIFT -- the cheapest signal you will ever add. A histogram of
#    your own predictions, compared with last week's. Moves within hours of
#    an upstream change, needs no labels at all.
psi = population_stability_index(preds_today, preds_baseline, bins=10)
alarm_if(psi > 0.25, "output distribution shifted")      # 0.1 watch, 0.25 act

# 2. INPUT DRIFT, per feature, same measure. Tells you WHICH column moved,
#    which is what makes the output drift actionable.
for col in FEATURES:
    psi_col = population_stability_index(live[col], train[col])
    alarm_if(psi_col > 0.25, f"{col} drifted")

# 3. SCHEMA AND NULL RATE at the serving boundary -- catches the feature that
#    stopped arriving and is now being imputed to a default.
alarm_if(live[col].isna().mean() > train_null_rate[col] + 0.05, f"{col} nulls")

# 4. PREDICTION VOLUME per segment. A segment that stops appearing is an
#    upstream filter, not a change in the world.

# AND THE ONE THAT IS NOT A SIGNAL: a 200 from /healthz. It says the process
# is alive, which was never the property at risk.`,
      caption: "**Output drift is the signal to add first: no labels, no ground truth, and it moves within hours of an upstream change.** Input drift per feature is what makes it actionable — the output histogram says something broke, and the per-feature comparison says which column did it." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**6 Monitoring**", "Define the quality SLO before launch, with the metric and the floor written down", "Alarm on drift and on *absence of signal* — a metric that stopped reporting is a failure", "Auto-rollback on a drift threshold, with a human in the loop above it", "The dashboards are code; redeploy them. **The baselines are data, so back them up**", "Reconcile a sample against labels when they finally arrive"]
      ],
      caption: "**Alarm on the absence of a signal, not just on its value.** A drift job that silently stopped running reports no drift, which is indistinguishable on a dashboard from a healthy model and is the failure that lets a bad model serve for a month." },

    { t: "ladder",
      title: "Recovering a churn model after a region loss",
      rungs: [
        { level: "bad", label: "Retrain and ship",
          why: "**It is a six-hour recovery for an asset that could have been restored in ten minutes**, and the retrained model is not the model that was lost — different data window, different seed, different scores. Nothing verifies which.",
          code: `# runbook
# 1. re-run the training DAG
# 2. deploy the output
# 3. confirm /healthz returns 200` },
        { level: "ok", label: "Restore the artifact, redeploy, health check",
          why: "**Ten minutes instead of six hours, and the artifact is exactly the one that was lost.** What is missing is any check that the restored system predicts what it used to — the feature store is still rebuilding, so it may well not.",
          code: `# runbook
# 1. restore models/churn/v41/<sha>/model.joblib from object storage
# 2. rebuild the online feature store from the offline store
# 3. deploy, confirm /healthz reports model_version == v41` },
        { level: "best", label: "Restore, verify with goldens, hold traffic until features are warm",
          why: "**The golden predictions prove it is the right artifact, and the feature-store check prevents the window where the model scores a mixture of two feature distributions.** The eval suite proves the whole path, not just the model object.",
          code: `# runbook
# 1. restore models/churn/v41/<sha>/model.joblib  (expect v41, sha a3f9c21)
# 2. load in a scratch process; run tests/golden_predictions.json  -- MUST pass
# 3. rebuild the online feature store from the offline store
# 4. BLOCK traffic until feature coverage >= 99% of active keys
#       serving a default for a missing feature is a prediction on a value
#       the model never saw -- for churn we prefer 503 to a wrong score
# 5. deploy; /healthz must report v41 + schema hash 7c1e
# 6. run evals/suite.py: AUC within 0.005 of the dated baseline (0.881, 2026-06)
# 7. only then remove the traffic block
# rehearsed 2026-07-14: 22 minutes end to end` }
      ] },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Locate the stage, then choose the mitigation",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Five incidents from the same recommendation system. For each, name the stage that produced it, say which of the five mitigations you would reach for, and give the one concrete thing you would add. The point of the exercise is that the stage determines the answer — the same symptom at two stages wants two different fixes." },
        { t: "code", lang: "text", numbered: false, title: "incidents.md", code: `
A. Click-through fell 12% over three weeks. The model, the code and the
   deployment are unchanged. Validation metrics at training time were normal.

B. A Monday deploy served predictions that were all almost identical. Rolled
   back after 40 minutes. The artifact loaded without error.

C. The nightly training run completed and produced a model with an AUC of
   0.97, up from 0.88. It was promoted automatically.

D. A feature store rebuild after an incident took four hours. During it,
   predictions for roughly a third of users were built on default values.

E. The drift dashboard showed nothing unusual for five weeks. It emerged that
   the drift job had been failing since a dependency upgrade.
` }
      ],
      requirements: [
        "A stage for each incident, from the six in section 01",
        "A named mitigation stage — prevent, detect, contain, recover or verify",
        "One concrete addition per incident, specific enough to implement",
        "For at least one incident, say what would have made it impossible rather than merely detectable"
      ],
      hint: "Two of the five are failures of the monitoring stage rather than of the thing being monitored, and one of those is not E.",
      solution: {
        lang: "text",
        title: "Solution",
        code: `A. STAGE 1 or 2 -- ingestion or features. The model did not change, so the
   inputs did. This is input drift, and the mitigation stage is DETECT:
   per-feature PSI against the training distribution, alarmed at 0.25.
   Three weeks of silent decay is a detection failure, not a model failure.
   PREVENTION is not available here -- the world is allowed to change.

B. STAGE 5 -- serving. Near-identical predictions with a clean load is the
   signature of a feature pipeline returning defaults, or of the wrong
   preprocessing. Mitigation stage: VERIFY. Golden predictions would have
   failed in the deploy pipeline, before any traffic.
   PREVENTION: ship the preprocessing inside the fitted artifact so there is
   no second implementation to diverge.

C. STAGE 3 -- training. An AUC jumping 0.88 to 0.97 overnight is leakage,
   not improvement. Mitigation stage: DETECT, by alarming on an IMPROVEMENT
   as well as a regression, plus CONTAIN -- never promote automatically.
   PREVENTION: a leakage check in CI that recomputes features as-of each
   row's timestamp and fails if any feature changes.

D. STAGE 2 -- features. The rebuild is the correct recovery; the damage was
   done by serving during it. Mitigation stage: CONTAIN. Block traffic, or
   return 503, until feature coverage passes a threshold.
   This is the decision that must be in the runbook: a prediction built on a
   default is a prediction on a value the model never saw in training.

E. STAGE 6 -- monitoring. The monitor failed, not the model. Mitigation
   stage: DETECT, applied to the monitoring itself -- alarm on the ABSENCE
   of the signal. A drift job that stops reporting looks exactly like a
   model with no drift.
   PREVENTION: make the alarm a dead-man's switch -- it fires unless a fresh
   metric arrives within the window -- so silence is a failure state rather
   than a healthy one.

THE PATTERN: A and E share a symptom -- nothing visibly wrong for weeks --
and have nothing else in common. A is the world changing and the monitor
working; E is the monitor broken. Only locating the stage separates them,
which is why the stage comes before the mitigation.`,
        notes: [
          { t: "p", text: "**C is the one most people get wrong**, because the number went up. A validation score that improves sharply with no corresponding change to the data or the model is the clearest leakage signature there is, and a threshold-based promotion gate waves it through enthusiastically." },
          { t: "p", text: "**The dead-man's switch in E generalises to every metric you rely on.** An alarm that fires on a bad value cannot fire on no value, so any monitor worth having also needs a staleness check on itself — which is the monitoring stage applying its own stage-6 mitigation to itself." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A fraud team restored a model artifact after a storage incident, verified it loaded, confirmed the health endpoint returned 200, and resumed scoring within fifteen minutes. The restore was clean and the artifact was the right version." },
      { t: "p", text: "**What they had not restored was the feature store, which was still rebuilding.** For two hours the model scored transactions using default values for six of its nineteen features, approving a population it would normally have flagged. The predictions were plausible, the latency was normal and the dashboards were green." },
      { t: "p", text: "**The model was never the problem; the stage boundary was.** Recovery had been planned per asset and executed per asset, with nothing asserting that the stages were consistent with each other before traffic resumed." },
      { t: "p", text: "**The fix was a traffic gate rather than a faster rebuild:** serving blocks until feature coverage exceeds a threshold, and the health endpoint reports coverage alongside the model version — so the inconsistency is visible from outside instead of inferable from outcomes." }
    ]}
  ],

  takeaways: [
    "**Locate the stage before choosing the mitigation.** The same symptom at two stages wants two different fixes, and four of the six stages fail silently.",
    "**Freshness is the highest-value assertion in an ML pipeline.** A run that reprocesses yesterday's file succeeds every time and trains on stale data.",
    "**Validate volume against the recent norm, not against zero** — a truncated export is a plausible row count, and a doubled one is too.",
    "**One transform definition, used by both training and serving.** Two implementations of the same logic drift; one cannot drift from itself.",
    "**Rebuilding the online feature store creates skew while it runs**, so decide in advance whether wrong answers or no answers is worse — and write it in the runbook.",
    "**Record provenance with the artifact, including `git_dirty`.** A sha from a dirty tree describes code that exists nowhere.",
    "**Censor the label window.** Rows whose outcome window has not closed carry systematically wrong labels, and they are the rows most like production.",
    "**Alarm on an improvement as well as a regression.** A sharp jump in validation score is leakage far more often than it is a better model.",
    "**Training is the stage to snapshot rather than rebuild** — hours to days against minutes from object storage.",
    "**Write artifacts to write-once paths that include the sha**, and check the lifecycle rule before trusting bucket versioning as a backup.",
    "**Ship the preprocessing inside the fitted artifact.** It removes training-serving skew by construction rather than by discipline.",
    "**Golden predictions are the cheapest ML verification there is:** a few dozen rows and their outputs, in git. A wrong-version restore passes everything else.",
    "**Output drift is the first signal to add** — no labels, and it moves within hours. Per-feature input drift is what makes it actionable.",
    "**Alarm on the absence of a signal.** A drift job that stopped running reports no drift, which looks healthy and is not."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A model's predictions degrade over three weeks with no change to code, data pipeline or deployment. Which stage, and which mitigation?",
        options: [
          "Stage 3 training — retrain on fresh data",
          "Stage 1 or 2, ingestion or features — the inputs changed, so the mitigation is detection: per-feature drift alarmed against the training distribution",
          "Stage 4 registry — the artifact was corrupted in storage",
          "Stage 5 serving — the preprocessing diverged"
        ],
        answer: 1,
        why: "Nothing you control changed, so the world did — that is input drift, and it is allowed to happen. Prevention is not available; detection is, and three weeks of silent decay is a detection gap rather than a model fault. Retraining may be the eventual response, but only after the drifted feature is identified."
      },
      {
        stem: "Overnight training produces a model whose AUC jumps from 0.88 to 0.97. What is the most likely explanation and the right gate?",
        options: [
          "A genuinely better model — promote it and monitor",
          "Leakage. Alarm on improvements as well as regressions, and never promote automatically",
          "A smaller validation set, which raises variance",
          "A random seed that happened to help"
        ],
        answer: 1,
        why: "A sharp unexplained improvement is the clearest leakage signature there is, and a threshold-based promotion gate passes it enthusiastically because the number went up. The prevention is a CI check that recomputes features as-of each row's timestamp and fails if any feature changes."
      },
      {
        stem: "You restore the model artifact in ten minutes, but the online feature store is still rebuilding. What should serving do?",
        options: [
          "Serve, using default values for missing features — availability matters most",
          "Serve, and flag the affected predictions for later review",
          "Block traffic until feature coverage passes a threshold, because a prediction built on defaults is a prediction on values the model never saw in training",
          "Fall back to a simpler model that needs fewer features"
        ],
        answer: 2,
        why: "A default-filled feature vector is outside the distribution the model was fitted on, so the predictions are wrong in a way that is not uniform across users and not visible in any latency or error metric. For anything consequential the honest outage beats the silent error — and that choice belongs in the runbook, not in the incident."
      },
      {
        stem: "A restored model loads cleanly, serves plausible numbers and reports 200 from /healthz. What has not been verified?",
        options: [
          "That the process is running",
          "That it is the right model version, producing the same outputs for the same inputs",
          "That the latency budget is met",
          "That the container image is signed"
        ],
        answer: 1,
        why: "An older artifact of the same model loads and serves perfectly plausible numbers. Golden predictions — a few dozen inputs with expected outputs, committed to git — are what fail in that case, and the health endpoint reporting the loaded version and schema hash makes the mismatch visible from outside."
      },
      {
        stem: "A drift dashboard shows nothing unusual for five weeks because the drift job had been failing. Which stage failed, and what prevents it?",
        options: [
          "Stage 2 features — the feature pipeline stopped",
          "Stage 6 monitoring — and the prevention is a dead-man's switch, so silence is a failure state rather than a healthy one",
          "Stage 5 serving — predictions were not being logged",
          "Nothing failed; five weeks without drift is plausible"
        ],
        answer: 1,
        why: "The monitor failed, not the thing monitored — and a job that stops reporting is indistinguishable on a dashboard from a model with no drift. An alarm that fires on a bad value cannot fire on no value, so the monitor needs a staleness check on itself."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How would you make an ML pipeline recoverable?",
        strong: "Per stage, because the mitigations differ. Ingestion: a schema contract plus freshness, volume and null-rate assertions, writing to immutable dated paths so a re-run is possible. Features: one transform definition shared by training and serving, and a skew check that scores the same rows through both paths. Training: provenance including git_dirty and the label cutoff, seeds pinned, and snapshot rather than rebuild because it is hours. Registry: write-once keys including the sha. Serving: preprocessing inside the artifact, the version in the health endpoint, golden predictions as the restore gate. Monitoring: output drift first because it needs no labels, and a dead-man's switch so silence is a failure.",
        answer: [
          { t: "p", text: "Answering per stage rather than as a list of tools is what makes this sound like operating experience rather than reading." },
          { t: "p", text: "Freshness and the label cutoff are the two specifics that are hard to know without having been burned by them." },
          { t: "p", text: "Golden predictions as the restore gate is the strongest single point available: it is cheap, it is rare, and it catches the failure every other check passes." }
        ]
      },
      {
        level: "advanced",
        q: "Your feature store is lost. Walk me through recovery.",
        strong: "The online store is derived from the offline store, so the recovery is a rebuild and the question is what serving does while it runs. Coverage climbs from zero, so for a window some keys have features and some do not — and scoring with defaults puts the model outside its training distribution for an uneven subset of users. I would block traffic or return 503 until coverage passes a threshold, with the choice made in advance and written down, and report coverage in the health endpoint so the inconsistency is visible rather than inferred.",
        answer: [
          { t: "p", text: "Naming the mid-rebuild window as the actual risk, rather than the loss itself, is the insight being tested." },
          { t: "p", text: "Preferring an honest 503 to a silent wrong score for consequential decisions is the judgement, and saying it was decided in advance is what makes it credible." },
          { t: "p", text: "Reporting coverage in the health endpoint is a good concrete: it turns a stage inconsistency into something monitorable." }
        ]
      },
      {
        level: "advanced",
        q: "How do you know a restored ML system is correct?",
        strong: "Not from a health check, because every silent failure returns 200. Golden predictions first — a few dozen inputs with expected outputs in git — which catches a wrong artifact version immediately. Then the evaluation suite against a dated baseline, with a tolerance rather than a floor, which catches a feature or preprocessing difference. And the health endpoint should report the model version, the sha and the feature schema hash so the identity of what is loaded is externally visible.",
        answer: [
          { t: "p", text: "The distinction between liveness and correctness is the whole question, and leading with it is the right move." },
          { t: "p", text: "A tolerance against a dated baseline, rather than an absolute floor, shows you have watched a metric drift slowly past a static gate." },
          { t: "p", text: "Mentioning the schema hash alongside the version is a detail that signals real serving experience — it is how a feature-contract mismatch is caught before traffic." }
        ]
      }
    ]
  }
});
