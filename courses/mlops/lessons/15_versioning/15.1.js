/* ============================================================================
   LESSON 15.1 — Which Model Is Running?
   ========================================================================= */
EC.receiveLesson({
  id: "15.1",

  lede: "'Which model produced this prediction?' should be answerable from the response itself, in seconds, for any request, months later. Teams lose the answer in three ordinary ways: a model file overwritten in place, so the path no longer identifies the content; a mutable pointer such as 'latest' with nothing recorded about what it pointed to; and replicas that loaded different versions at different times. This lesson builds a minimal registry with content-hash version IDs and stages, serves the version in a response header, shows replicas disagreeing after a promotion, and writes the gate a version must pass to become production.",

  objectives: [
    "Identify model versions by the hash of their content, not by a path or tag",
    "Use registry stages and a production pointer, and return the version with every prediction",
    "Recognise mixed versions across replicas after a promotion",
    "Write a promotion gate with metric, segment, lineage and approval checks"
  ],

  prerequisites: ["1.3", "14.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "registry",
      text: "A registry, minimally",
      sub: "Immutable versions, movable stages" },
    { t: "p",
      text: "A model registry stores each version immutably and lets named stages, such as staging and production, point at versions. The script implements one in SQLite: a version's ID is the SHA-256 of its bytes, so the same content always has the same ID and different content never shares one. Three replicas load whatever production points to when they start and put the version ID in an `X-Model-Version` header on every response." },
    { t: "code",
      lang: "python",
      title: "registry.py — content-hashed versions, a production pointer and three replicas",
      code: `import hashlib, json, pickle, sqlite3, time
from collections import Counter
import numpy as np
from fastapi import FastAPI, Response
from fastapi.testclient import TestClient
from sklearn.linear_model import LogisticRegression

# A minimal registry: versions are identified by the hash of their bytes, and a stage points at one version.
db = sqlite3.connect(":memory:")
db.executescript("""CREATE TABLE versions (id TEXT PRIMARY KEY, name TEXT, blob BLOB, meta TEXT, created REAL);
                    CREATE TABLE stages (name TEXT, stage TEXT, version TEXT, PRIMARY KEY (name, stage));""")
def register(name, model, **meta):
    blob = pickle.dumps(model); vid = hashlib.sha256(blob).hexdigest()[:12]
    db.execute("INSERT OR IGNORE INTO versions VALUES (?, ?, ?, ?, ?)", (vid, name, blob, json.dumps(meta), time.time())); return vid
def set_stage(name, stage, vid): db.execute("INSERT OR REPLACE INTO stages VALUES (?, ?, ?)", (name, stage, vid))
def load(name, stage):
    vid, = db.execute("SELECT version FROM stages WHERE name=? AND stage=?", (name, stage)).fetchone()
    return vid, pickle.loads(db.execute("SELECT blob FROM versions WHERE id=?", (vid,)).fetchone()[0])

rng = np.random.default_rng(0); X = rng.normal(size=(500, 3)); y = (X[:, 0] > 0).astype(int)
v1 = register("churn", LogisticRegression(C=1.0).fit(X, y), auc=0.81, data="snap-0601")
v2 = register("churn", LogisticRegression(C=0.1).fit(X, y), auc=0.83, data="snap-0615")
set_stage("churn", "production", v1)
print(f"registered {v1} and {v2}; production -> {v1}")

# Three replicas each load production when they start, and report the version on every response.
class Replica:
    def __init__(self): self.reload()
    def reload(self): self.vid, self.model = load("churn", "production")
replicas = [Replica() for _ in range(3)]
app = FastAPI()
@app.post("/predict/{r}")
def predict(r: int, response: Response):
    rep = replicas[r]; response.headers["X-Model-Version"] = rep.vid
    return {"score": float(rep.model.predict_proba([[0.2, 0.1, -0.3]])[0, 1])}
client = TestClient(app)

def versions_seen():
    return Counter(client.post(f"/predict/{i % 3}").headers["X-Model-Version"] for i in range(300))
print("before promotion:", dict(versions_seen()))
set_stage("churn", "production", v2)                       # promote v2 ...
replicas[0].reload()                                       # ... but only the replica that restarted picks it up
print("after promotion, one replica restarted:", dict(versions_seen()))
for r in replicas: r.reload()
print("after a rolling restart:", dict(versions_seen()))

# The ways the answer is lost: overwriting a file in place, and a mutable 'latest' pointer with no id in the response.
a = pickle.dumps(LogisticRegression(C=1.0).fit(X, y)); b = pickle.dumps(LogisticRegression(C=0.1).fit(X, y))
print(f"\\n'model.pkl' overwritten in place: same path, content hash {hashlib.sha256(a).hexdigest()[:12]} -> "
      f"{hashlib.sha256(b).hexdigest()[:12]}; a log that recorded only the path cannot tell them apart")`,
      out: `registered 97471eace9c0 and e2f413273581; production -> 97471eace9c0
before promotion: {'97471eace9c0': 300}
after promotion, one replica restarted: {'e2f413273581': 100, '97471eace9c0': 200}
after a rolling restart: {'e2f413273581': 300}

'model.pkl' overwritten in place: same path, content hash 97471eace9c0 -> e2f413273581; a log that recorded only the path cannot tell them apart` },
    { t: "viz",
      title: "Versions in 300 responses, before and after a promotion",
      caption: "Moving the pointer changed nothing until replicas reloaded. With one replica restarted, a third of traffic used the new version.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="210" y="31.0" text-anchor="end" class="s-label">before promotion: v1</text>
<rect x="220" y="14" width="365.0" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">300 of 300 responses</text>
<text x="210" y="69.0" text-anchor="end" class="s-label">one replica restarted: v2</text>
<rect x="220" y="52" width="121.7" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="349.7" y="69.0" class="s-sub">100</text>
<text x="210" y="107.0" text-anchor="end" class="s-label">one replica restarted: v1</text>
<rect x="220" y="90" width="243.3" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="471.3" y="107.0" class="s-sub">200</text>
<text x="210" y="145.0" text-anchor="end" class="s-label">after rolling restart: v2</text>
<rect x="220" y="128" width="365.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="593.0" y="145.0" class="s-sub">300 of 300</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The pointer moves; the replicas do not",
          def: "Promoting v2 changed the registry instantly, but only the replica that restarted served it: 100 of 300 responses. For as long as that lasts, two models are in production, and anyone looking only at the registry would say one." },
        { term: "Headers make it observable",
          def: "Because every response carried its version, the mixed state was visible by counting headers. Log the same ID with every prediction (lesson 16.2)." },
        { term: "Content hashes do not lie",
          def: "Refitting the same model on the same data reproduced the same ID; a different C gave a different one. An overwritten 'model.pkl' keeps its path while its content, and its hash, change." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Tags and paths as version identifiers",
      body: [
        { t: "p",
          text: "':latest', 'prod' and 's3://models/churn/model.pkl' name a location, not a content. Anything that records only them, a log, a dashboard, an incident report, cannot say which model was running. Record the immutable ID and resolve tags to IDs at the moment they are used." }
      ] },
    { t: "h2",
      n: "02",
      id: "gate",
      text: "The promotion gate",
      sub: "What a version must show to become production" },
    { t: "table",
      head: ["Check", "Why"],
      rows: [
        ["Metric gain over the champion, same evaluation set", "A gain on a different dataset is not a comparison"],
        ["No regression beyond a margin on key segments", "Averages hide groups the new model serves worse"],
        [
          "Complete lineage: data snapshot, code commit, run ID",
          "Without it the version cannot be reproduced or audited (15.2)"
        ],
        ["A reviewer's approval", "A person accountable for the decision"],
        ["Then a canary, with automatic rollback", "Offline checks are evidence, not proof (lesson 3.3)"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A promotion gate",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Write a promote function that refuses a candidate unless its AUC beats the champion's by a minimum gain on the same evaluation set, no listed segment regresses by more than 0.01, its lineage records a data snapshot, a code commit and a run ID, and it has an approval. Test it on a good candidate, one that is better overall but worse for new users, and one trained in a notebook." }
      ],
      requirements: [
        "Every failed check reported, not just the first",
        "Segment comparison against the champion",
        "A same-dataset check on the evaluation",
        "The three candidates' outcomes"
      ],
      hint: "Collect problems into a list and raise once at the end, so a refused candidate's owner sees everything to fix.",
      solution: { lang: "python",
        title: "promotion_gate.py",
        code: `from dataclasses import dataclass, field

@dataclass
class Version:
    id: str
    metrics: dict
    lineage: dict = field(default_factory=dict)          # data snapshot, code commit, training run
    approvals: list = field(default_factory=list)

class PromotionRefused(Exception): pass
REQUIRED_LINEAGE = ("data_snapshot", "code_commit", "run_id")

def promote(candidate: Version, champion: Version | None, min_gain=0.002, max_regression=0.01):
    problems = []
    missing = [k for k in REQUIRED_LINEAGE if not candidate.lineage.get(k)]
    if missing: problems.append(f"lineage missing: {', '.join(missing)}")
    if champion:
        gain = candidate.metrics["auc"] - champion.metrics["auc"]
        if gain < min_gain: problems.append(f"AUC gain {gain:+.4f} below the required {min_gain}")
        for seg, v in champion.metrics.get("segments", {}).items():
            c = candidate.metrics.get("segments", {}).get(seg)
            if c is None or c < v - max_regression: problems.append(f"segment '{seg}' {c} against {v}")
        if candidate.metrics.get("evaluated_on") != champion.metrics.get("evaluated_on"):
            problems.append("evaluated on a different dataset from the champion")
    if not candidate.approvals: problems.append("no reviewer approval")
    if problems: raise PromotionRefused("; ".join(problems))
    return f"{candidate.id} promoted to production"

champ = Version("97471eace9c0", {"auc": 0.810, "evaluated_on": "holdout-0615", "segments": {"new_users": 0.74, "mobile": 0.80}},
                {"data_snapshot": "snap-0601", "code_commit": "a1b2c3d", "run_id": "r-120"}, ["sam"])
cases = {
    "good candidate": Version("e2f413273581", {"auc": 0.823, "evaluated_on": "holdout-0615", "segments": {"new_users": 0.75, "mobile": 0.81}},
                              {"data_snapshot": "snap-0615", "code_commit": "d4e5f6a", "run_id": "r-131"}, ["kim"]),
    "better overall, worse for new users": Version("5b1c0a9d22e7", {"auc": 0.826, "evaluated_on": "holdout-0615", "segments": {"new_users": 0.70, "mobile": 0.82}},
                              {"data_snapshot": "snap-0615", "code_commit": "d4e5f6a", "run_id": "r-133"}, ["kim"]),
    "from a notebook": Version("c0ffee000001", {"auc": 0.840, "evaluated_on": "my-sample", "segments": {"new_users": 0.78, "mobile": 0.84}},
                              {"data_snapshot": "snap-0615"}, []),
}
for name, v in cases.items():
    try: print(f"{name:<38} {promote(v, champ)}")
    except PromotionRefused as e: print(f"{name:<38} REFUSED: {e}")`,
        out: `good candidate                         e2f413273581 promoted to production
better overall, worse for new users    REFUSED: segment 'new_users' 0.7 against 0.74
from a notebook                        REFUSED: lineage missing: code_commit, run_id; evaluated on a different dataset from the champion; no reviewer approval`,
        notes: [
          { t: "p",
            text: "The good candidate passed. The one with the best overall AUC, 0.826, was refused because new users fell from 0.74 to 0.70, exactly the regression an average hides. The notebook model had the highest number of all, 0.840, and failed four ways: evaluated on its own sample, no code commit, no run ID, no approval." },
          { t: "p",
            text: "Reporting every problem at once matters in practice: a gate that stops at the first failure makes people fix issues one round-trip at a time. The highest offline score was the least trustworthy candidate, which is the reason the gate exists." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: two versions for three days",
      body: [
        { t: "p",
          text: "**Symptom.** A support team reported that identical requests sometimes got different scores. Dashboards showed one production model version." },
        { t: "p",
          text: "**Mechanism.** A new version had been promoted in the registry, but the deployment relied on pods reloading at restart, and only some pods had restarted. For three days, a third of traffic used the new model. Prediction logs recorded the registry stage ('production'), not the version ID, so nobody could say which requests were affected." },
        { t: "p",
          text: "**Fix.** Responses and prediction logs now carry the immutable version ID, the deployment rolls all pods when the pointer changes, and a monitor alerts if more than one version serves production traffic for longer than the rollout window." }
      ] }
  ],

  takeaways: [
    "Every prediction should say which model made it: an **immutable version ID** in the response and the log.",
    "Identify versions by **content hash**; paths and tags name locations, not content.",
    "A registry's stages are **pointers**; replicas serve what they loaded, not what the pointer says now.",
    "Measured: after promotion with one replica restarted, **100 of 300** responses used the new version.",
    "Alert when more than one version serves production beyond the rollout window.",
    "A promotion gate checks gain on the **same** evaluation set, **segment** regressions, **lineage** and **approval**.",
    "The highest offline score (0.840, from a notebook) failed four checks."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why identify a model version by the hash of its content?",
        options: [
          "Hashes are shorter than most file paths",
          "The same ID can never refer to different content",
          "Registries cannot store any other kind of identifier",
          "Hashes make the model load more quickly"
        ],
        answer: 1,
        why: "A content hash changes when the content changes and only then, so a logged ID always identifies exactly one model. Length, registry limitations and load speed are not the reason." },
      { stem: "The registry says v2 is in production. Which model is serving?",
        options: [
          "v2 everywhere, since the pointer changed",
          "Whatever each replica loaded; check responses",
          "v1 everywhere until the next scheduled deploy runs",
          "Neither, until the registry cache expires"
        ],
        answer: 1,
        why: "Replicas serve what they loaded; after promotion with one restart, 100 of 300 responses were v2. Only the versions reported by responses or logs answer the question." },
      { stem: "A candidate has the best overall AUC but is 4 points worse for new users. What should the gate do?",
        options: [
          "Promote it, since the overall number improved",
          "Refuse it, and report the segment regression",
          "Promote it with a note in the changelog",
          "Average the two numbers and decide on that"
        ],
        answer: 1,
        why: "Averages hide groups the model serves worse; a segment check with a margin exists to catch exactly this. Notes and averaging do not protect the segment." },
      { stem: "What does a prediction log need so 'which model?' can be answered a year later?",
        options: [
          "The stage name, such as production or staging",
          "The immutable version ID of the model",
          "The path of the model file on disk",
          "The date of the last deployment"
        ],
        answer: 1,
        why: "Stages, paths and deployment dates all point at things that change; only the immutable ID identifies the model that ran." }
    ] },

  interview: { title: "In an interview",
    sub: "Versioning answers should be checkable from data, not from memory.",
    questions: [
      { level: "core",
        q: "How do you know which model version served a given prediction?",
        strong: "A strong answer puts an immutable ID in the response and the log, and resolves tags at load time.",
        answer: [
          { t: "p",
            text: "Each model version has an immutable ID, ideally a content hash or a registry version that can never be reused. The serving process records the ID it loaded, returns it in a response header and writes it into every prediction log line. Stage names and tags are resolved to IDs when loading, never logged in their place. Then 'which model?' is a lookup in the log for the request's correlation ID." }
        ] },
      { level: "core",
        q: "What does a model registry give you?",
        strong: "A strong answer covers immutable versions, stages, metadata and the promotion workflow.",
        answer: [
          { t: "p",
            text: "Immutable storage of versions with metadata (metrics, lineage, environment), named stages that point at versions, and a controlled way to move those pointers: promotion with checks and approvals, demotion and rollback. Serving loads by stage and reports the resolved version. It is the single answer to 'what is in production and why'." }
        ] },
      { level: "advanced",
        q: "Design the promotion process for a model.",
        strong: "A strong answer combines offline gates, a canary and automatic rollback.",
        answer: [
          { t: "p",
            text: "Offline gate: gain over the champion on the same evaluation set, segment regressions within margins, calibration, complete lineage and a reviewer's approval, all reported together. Then a canary on a small share of traffic with guardrail metrics and automatic rollback, then progressive rollout with every replica reporting its version, and an alert if mixed versions persist. Every step is logged against the version ID." }
        ] }
    ] }
});
