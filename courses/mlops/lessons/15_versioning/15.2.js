/* ============================================================================
   LESSON 15.2 — Lineage, End to End
   ========================================================================= */
EC.receiveLesson({
  id: "15.2",

  lede: "Lineage is the chain from a single prediction back to everything that produced it: the model version, the training run, the code commit, the data snapshot, and from those forwards again to everything else they touched. It answers two questions that come up in every serious incident: why did the model say this, and what else is affected? This lesson builds lineage as a real chain of content hashes and a git commit, traces one prediction back to its sources, shows the in-place edit that silently breaks the chain, and queries forwards from a corrupted dataset to every prediction that depended on it.",

  objectives: [
    "Record lineage as identified artefacts and the edges between them",
    "Identify data and models by content hash, and code by commit",
    "Trace a prediction backwards to its code and data",
    "Detect an artefact that no longer matches its recorded identity",
    "Query forwards from a bad input to every affected model and prediction"
  ],

  prerequisites: ["1.2", "1.3", "15.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "chain",
      text: "A chain of identities",
      sub: "Each link points at something that cannot change" },
    { t: "viz",
      title: "Lineage from a prediction",
      caption: "Each box is identified by something immutable: a content hash or a commit. The edges are recorded when the work happens, not reconstructed later.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="140.0" y1="126.0" x2="190.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="320.0" y1="126.0" x2="370.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="500.0" y1="104.3" x2="567.0" y2="82.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="500.0" y1="147.7" x2="567.0" y2="170.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="100" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="75.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Prediction</text>
<text x="75.0" y="140" text-anchor="middle" class="s-sub">id in the log</text>
<rect x="190" y="100" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="255.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--accent)">Model</text>
<text x="255.0" y="140" text-anchor="middle" class="s-sub">content hash</text>
<rect x="370" y="100" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="435.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--violet)">Training run</text>
<text x="435.0" y="140" text-anchor="middle" class="s-sub">config, metrics</text>
<rect x="560" y="30" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="645.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">Code</text>
<text x="645.0" y="70" text-anchor="middle" class="s-sub">git commit</text>
<rect x="560" y="170" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="645.0" y="192" text-anchor="middle" class="s-label" style="fill:var(--good)">Data snapshot</text>
<text x="645.0" y="210" text-anchor="middle" class="s-sub">content hash</text>
</svg>` },
    { t: "p",
      text: "The script commits a training script to a real git repository, writes a data snapshot and identifies it by the hash of its bytes, records a training run that used both, a model identified by its own hash, and predictions that carry the model's ID. Then it traces one prediction back, and checks whether the recorded identities still match the artefacts." },
    { t: "code",
      lang: "python",
      title: "lineage.py — record the chain, trace it back, verify it",
      code: `import hashlib, json, pickle, sqlite3, subprocess, tempfile, uuid
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression

sha = lambda b: hashlib.sha256(b).hexdigest()[:16]
work = Path(tempfile.mkdtemp())
db = sqlite3.connect(work / "lineage.db")
db.executescript("""CREATE TABLE artefacts (id TEXT PRIMARY KEY, kind TEXT, uri TEXT, meta TEXT);
                    CREATE TABLE edges (child TEXT, parent TEXT, relation TEXT);""")
def record(kind, aid, uri, parents=(), **meta):
    db.execute("INSERT OR IGNORE INTO artefacts VALUES (?, ?, ?, ?)", (aid, kind, uri, json.dumps(meta)))
    for p, rel in parents: db.execute("INSERT INTO edges VALUES (?, ?, ?)", (aid, p, rel))
    return aid

# 1. Code: a real git commit of the training script.
repo = work / "repo"; repo.mkdir()
git = lambda *a: subprocess.run(["git", "-C", str(repo), *a], capture_output=True, text=True, check=True).stdout.strip()
git("init", "-q"); git("config", "user.email", "ml@example.com"); git("config", "user.name", "ml")
(repo / "train.py").write_text("C = 0.5  # regularisation\\n"); git("add", "."); git("commit", "-q", "-m", "train v1")
commit = record("code", git("rev-parse", "HEAD")[:12], "repo@HEAD")

# 2. Data: an immutable snapshot, identified by the hash of its bytes.
rng = np.random.default_rng(0)
df = pd.DataFrame(rng.normal(size=(1_000, 3)), columns=["a", "b", "c"]); df["y"] = (df.a + rng.normal(0, 1, 1_000) > 0).astype(int)
snap_path = work / "snapshot-2024-06-15.csv"; df.to_csv(snap_path, index=False)
data = record("data", sha(snap_path.read_bytes()), str(snap_path.name), rows=len(df))

# 3. The training run consumes both and produces a model, identified by the hash of its bytes.
run = record("run", "run-" + uuid.uuid4().hex[:8], "tracking://runs", [(commit, "code"), (data, "data")], C=0.5)
model_bytes = pickle.dumps(LogisticRegression(C=0.5).fit(df[["a", "b", "c"]], df.y))
model = record("model", sha(model_bytes), "registry://churn", [(run, "produced_by")])

# 4. Predictions carry the model id.
preds = [record("prediction", "pred-" + uuid.uuid4().hex[:8], "log", [(model, "model")]) for _ in range(5)]

def trace(aid, depth=0):
    kind, uri, meta = db.execute("SELECT kind, uri, meta FROM artefacts WHERE id=?", (aid,)).fetchone()
    print(f"{'  ' * depth}{kind:<10} {aid:<18} {uri}{'  ' + meta if meta != '{}' else ''}")
    for parent, rel in db.execute("SELECT parent, relation FROM edges WHERE child=?", (aid,)).fetchall(): trace(parent, depth + 1)
print(f"tracing prediction {preds[2]} back to its sources:")
trace(preds[2])

# Verification: the recorded ids must still match the artefacts' contents.
print(f"\\ndata snapshot still matches its id: {sha(snap_path.read_bytes()) == data}")
snap_path.write_text(snap_path.read_text().replace("0.1", "0.2", 1))       # someone 'fixes' a value in place
print(f"after an in-place edit:            {sha(snap_path.read_bytes()) == data}  -> the snapshot is no longer the one trained on")
print(f"code commit still exists: {git('cat-file', '-t', commit) == 'commit'}")`,
      out: `tracing prediction pred-f9fdb8f8 back to its sources:
prediction pred-f9fdb8f8      log
  model      3f27a7cc06a2a385   registry://churn
    run        run-d2ab2329       tracking://runs  {"C": 0.5}
      code       12fdb543d499       repo@HEAD
      data       1c800987cddab2c2   snapshot-2024-06-15.csv  {"rows": 1000}

data snapshot still matches its id: True
after an in-place edit:            False  -> the snapshot is no longer the one trained on
code commit still exists: True` },
    { t: "dl",
      items: [
        { term: "Backwards in one query",
          def: "From a prediction ID: the model hash, the run and its parameters (C = 0.5), the commit and the data snapshot with its row count. Each step is a lookup, not an investigation." },
        { term: "Identity, not location",
          def: "The snapshot is identified by the hash of its bytes, so the record says exactly which data trained the model, however the file is later named or moved." },
        { term: "In-place edits break the chain",
          def: "Changing one value in the CSV 'to fix it' made its hash stop matching the recorded ID. The model was trained on data that no longer exists. Snapshots must be immutable: corrections become new snapshots with new IDs." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Lineage reconstructed after the fact",
      body: [
        { t: "p",
          text: "'The model was probably trained on last month's table' is not lineage. If the run did not record the exact data identity and commit when it ran, nobody can establish them later, because tables are overwritten and branches move. Record edges at the moment each step runs, in the pipeline code, not in a wiki." }
      ] },
    { t: "h2",
      n: "02",
      id: "forward",
      text: "Forwards: what else is affected?",
      sub: "Impact analysis from a bad input" },
    { t: "p",
      text: "Backward lineage explains a prediction; forward lineage contains a problem. When a dataset turns out to be corrupted, the questions are which derived datasets, runs, models and predictions depend on it, directly or through other datasets. With edges stored, a recursive query answers it." },
    { t: "exercise",
      kind: "Challenge",
      title: "Impact of a corrupted snapshot",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Build a lineage graph with two raw snapshots, a feature table derived from one of them, three training runs (one using both inputs), three models and 18,500 predictions. The derived table's source turns out to be corrupted. Write a recursive SQL query that finds everything downstream of it, and report the counts and IDs by kind." }
      ],
      requirements: [
        "Artefacts and edges in two tables",
        "A recursive common table expression walking child edges",
        "Indirect dependencies through derived datasets",
        "Counts by kind, with the non-prediction IDs listed"
      ],
      hint: "WITH RECURSIVE downstream(id) AS (SELECT ? UNION SELECT e.child FROM edges e JOIN downstream d ON e.parent = d.id).",
      solution: { lang: "python",
        title: "impact_analysis.py",
        code: `import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""CREATE TABLE artefacts (id TEXT PRIMARY KEY, kind TEXT);
                    CREATE TABLE edges (child TEXT, parent TEXT, relation TEXT);""")
def add(aid, kind, *parents):
    db.execute("INSERT INTO artefacts VALUES (?, ?)", (aid, kind))
    for p in parents: db.execute("INSERT INTO edges VALUES (?, ?, 'uses')", (aid, p))

# Two raw snapshots, a feature table derived from one of them, three training runs, three models, predictions.
add("raw-0601", "data"); add("raw-0615", "data")
add("features-0615", "data", "raw-0615")                   # derived dataset
add("run-a", "run", "raw-0601"); add("run-b", "run", "features-0615"); add("run-c", "run", "raw-0601", "features-0615")
add("model-a", "model", "run-a"); add("model-b", "model", "run-b"); add("model-c", "model", "run-c")
n = 0
for m, count in (("model-a", 4_000), ("model-b", 12_000), ("model-c", 2_500)):
    for i in range(count): add(f"pred-{m}-{i}", "prediction", m); n += 1

# raw-0615 turns out to have been corrupted: which models and predictions depend on it, directly or not?
affected = db.execute("""
    WITH RECURSIVE downstream(id) AS (
        SELECT ?
        UNION
        SELECT e.child FROM edges e JOIN downstream d ON e.parent = d.id)
    SELECT a.kind, COUNT(*), GROUP_CONCAT(CASE WHEN a.kind != 'prediction' THEN a.id END)
    FROM downstream d JOIN artefacts a ON a.id = d.id GROUP BY a.kind ORDER BY a.kind""", ("raw-0615",)).fetchall()
print(f"downstream of raw-0615 (of {n:,} predictions in total):")
for kind, count, ids in affected: print(f"  {kind:<11} {count:>6,}  {ids or ''}")`,
        out: `downstream of raw-0615 (of 18,500 predictions in total):
  data             2  raw-0615,features-0615
  model            2  model-b,model-c
  prediction  14,500  
  run              2  run-b,run-c`,
        notes: [
          { t: "p",
            text: "The query found the derived feature table, two runs, two models and 14,500 of the 18,500 predictions, including model-c, which used the corrupted data only through the derived table and alongside a clean snapshot. A search for direct users of the snapshot would have found nothing at all." },
          { t: "p",
            text: "UNION rather than UNION ALL stops the recursion revisiting nodes reachable by two paths. The result is the list an incident needs: which models to roll back, which predictions to re-score or flag, and which customers' decisions to review." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the label fix that could not be traced",
      body: [
        { t: "p",
          text: "**Symptom.** An audit asked which loan decisions in March had been made by models trained on a labels table later found to contain errors. The team could not answer." },
        { t: "p",
          text: "**Mechanism.** The labels table had been corrected in place, training runs recorded the table's name rather than a snapshot identity, and predictions recorded the stage 'production' rather than a model version. Every link in the chain pointed at something that had since changed." },
        { t: "p",
          text: "**Fix.** Training data became immutable snapshots identified by hash, runs record the snapshot and commit, models are content-hashed in the registry, and every prediction logs the model ID. The next audit question of the same kind took one recursive query." }
      ] }
  ],

  takeaways: [
    "Lineage links a **prediction → model → run → code commit + data snapshot**, recorded when each step runs.",
    "Identify data and models by **content hash** and code by **commit**: identities that cannot change.",
    "Tracing one prediction back is a chain of lookups, not an investigation.",
    "An in-place edit changed the snapshot's hash: corrections must be **new snapshots**.",
    "Forward lineage contains incidents: a recursive query found **2 models** and **14,500** predictions downstream of a corrupted snapshot.",
    "Indirect dependencies through derived datasets are the ones manual searches miss.",
    "Lineage reconstructed after the fact is guesswork."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why identify a training dataset by the hash of its contents rather than its table name?",
        options: [
          "Hashes take less space in the tracking database",
          "A name can point at changed data; a hash cannot",
          "Table names are not allowed in lineage records",
          "Hashing the data makes training run faster"
        ],
        answer: 1,
        why: "Tables are overwritten and files edited, so a name says nothing about what the model saw; the in-place edit here changed the hash and exposed it. Space, rules and speed are not the reason." },
      { stem: "A model used a corrupted snapshot only through a derived feature table. How do you find it?",
        options: [
          "Search runs for a direct reference to the snapshot",
          "Walk lineage edges recursively from the snapshot",
          "Compare model accuracy before and after the fix",
          "Check which models were trained most recently"
        ],
        answer: 1,
        why: "The recursive query found model-c through the derived table; a direct search finds nothing. Accuracy and recency do not identify dependencies." },
      { stem: "A value in a training snapshot is wrong. How should it be corrected?",
        options: [
          "Edit the file in place and retrain the model",
          "Write a new snapshot with a new identity",
          "Correct it in the model's weights directly",
          "Leave it, since the model is already trained"
        ],
        answer: 1,
        why: "A new snapshot keeps the old one as the record of what trained existing models and gives the correction its own ID. Editing in place breaks lineage; weights cannot be corrected that way; ignoring it leaves the error." },
      { stem: "When should lineage edges be recorded?",
        options: [
          "During a quarterly review of all the models in use",
          "By the pipeline, at the moment each step runs",
          "When an auditor first asks the question",
          "Only for models that reach production"
        ],
        answer: 1,
        why: "Afterwards, branches have moved and tables changed, so the facts cannot be recovered. Candidates that never reach production still need lineage to be compared and reproduced." }
    ] },

  interview: { title: "In an interview",
    sub: "Lineage answers should name identifiers and when they are recorded.",
    questions: [
      { level: "core",
        q: "How would you implement lineage for an ML platform?",
        strong: "A strong answer covers immutable identities, edges recorded by the pipeline, and queries in both directions.",
        answer: [
          { t: "p",
            text: "Every artefact has an immutable identity: data snapshots and models by content hash, code by commit, runs by ID, environments by image digest. Each pipeline step records edges from its outputs to its inputs as it runs, via the tracking server or a lineage store (MLflow, OpenLineage). Predictions log the model ID. Then backward queries explain a prediction and recursive forward queries find everything affected by a bad input." }
        ] },
      { level: "advanced",
        q: "A training dataset is found to contain mislabelled rows. What do you do?",
        strong: "A strong answer uses forward lineage to scope the impact, then remediates in order.",
        answer: [
          { t: "p",
            text: "Write a corrected snapshot with a new identity. Query forward lineage from the bad one: derived datasets, runs, models and the predictions made by those models, with time ranges. Retrain affected models on the corrected data, compare with the current ones, and promote through the normal gate. For high-stakes decisions made by affected models, re-score and review. Record the incident against the snapshot so its use is blocked in future." }
        ] },
      { level: "core",
        q: "What is the minimum a prediction log needs for lineage?",
        strong: "A strong answer names the model ID and how to resolve it.",
        answer: [
          { t: "p",
            text: "A prediction ID, a timestamp and the immutable model version ID. Everything else (run, code, data, environment) is resolved from the model ID through the registry and the tracking store, so it does not need to be repeated in every log line, as long as those stores keep their records." }
        ] }
    ] }
});
