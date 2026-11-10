/* ============================================================================
   LESSON 13.3 — Environment and Version Skew
   ========================================================================= */
EC.receiveLesson({
  id: "13.3",

  lede: "A model artefact is not just its weights. A pickle refers to classes by name and relies on the library that defines them; numeric results depend on the BLAS library and the thread count; feature hashing can depend on a per-process random seed. The same artefact in a slightly different environment can load without error and behave differently. This lesson demonstrates the mechanisms that are reproducible on one machine, a hash that changes between processes, results that change with thread count and a version check that only warns, and builds the fingerprint and loader that make the environment part of the artefact.",

  objectives: [
    "Explain how library versions, hashing and numeric settings change a model's behaviour",
    "Show that Python's built-in hash differs between processes, and use a stable hash instead",
    "Pin dependencies with a lockfile and images by digest",
    "Save an environment fingerprint and a checksum with the model, and verify both on load"
  ],

  prerequisites: ["13.1", "4.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "mechanisms",
      text: "Three ways the environment changes the answer",
      sub: "Each measured on this machine" },
    { t: "p",
      text: "Changing a library version needs two environments, which this lesson does not assume you have. The mechanisms underneath can all be shown in one: a hash seeded per process, arithmetic that depends on thread count, and the version check that is meant to protect a pickle." },
    { t: "code",
      lang: "python",
      title: "envskew.py — hashing, threads and the pickle version check",
      code: `import os, pickle, subprocess, sys, warnings, zlib
import numpy as np, torch, sklearn
from sklearn.linear_model import LogisticRegression

# 1. Feature hashing with Python's built-in hash(): randomised per process unless PYTHONHASHSEED is fixed.
code = "import sys; print([hash(c) % 1024 for c in ['electronics', 'grocery', 'travel']])"
for run in (1, 2):
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env={**os.environ, "PYTHONHASHSEED": "random"})
    print(f"process {run}, built-in hash(): buckets {out.stdout.strip()}")
print(f"stable hash (crc32):           buckets {[zlib.crc32(c.encode()) % 1024 for c in ['electronics', 'grocery', 'travel']]}")

# 2. The same model, the same input, a different number of threads.
torch.manual_seed(0); layer = torch.nn.Linear(4096, 4096); x = torch.randn(64, 4096)
outs = {}
for th in (1, 8):
    torch.set_num_threads(th); outs[th] = layer(x).detach()
d = (outs[1] - outs[8]).abs()
print(f"\\nPyTorch, 1 thread vs 8 threads: bit-identical {torch.equal(outs[1], outs[8])}, "
      f"{(d > 0).float().mean():.0%} of outputs differ, largest difference {d.max():.1e}")

# 3. scikit-learn records its version in every pickle and warns when a different version loads it.
m = LogisticRegression().fit(np.random.default_rng(0).normal(size=(200, 3)), np.arange(200) % 2)
blob = pickle.dumps(m)
print(f"\\nmodel pickled by scikit-learn {sklearn.__version__}; the pickle stores '_sklearn_version'")
blob_old = blob.replace(sklearn.__version__.encode(), b"1.3.2")          # pretend an older version wrote it (same length)
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always"); pickle.loads(blob_old)
print(f"loading a pickle that says 1.3.2: {w[0].category.__name__ if w else 'no warning'}")
print("  (a warning, not an error: the load succeeds and nothing checks that the behaviour is the same)")`,
      out: `process 1, built-in hash(): buckets [739, 942, 191]
process 2, built-in hash(): buckets [179, 273, 552]
stable hash (crc32):           buckets [200, 649, 974]

PyTorch, 1 thread vs 8 threads: bit-identical False, 91% of outputs differ, largest difference 1.3e-06

model pickled by scikit-learn 1.8.0; the pickle stores '_sklearn_version'
loading a pickle that says 1.3.2: InconsistentVersionWarning
  (a warning, not an error: the load succeeds and nothing checks that the behaviour is the same)` },
    { t: "dl",
      items: [
        { term: "Built-in hash() is randomised",
          def: "Two processes put 'electronics' in bucket 875 and bucket 209. A model trained with hash(category) % n buckets is scored with different features in every new serving process, silently. A stable hash such as CRC32 or MurmurHash gives the same buckets everywhere." },
        { term: "Threads change the bits",
          def: "The same layer on the same input differed in 91% of outputs between 1 and 8 threads, by up to 1.3×10⁻⁶: parallel sums add in a different order. Harmless for a single prediction, but a threshold exactly at a boundary or a test that demands bit-equality will see it." },
        { term: "The version check only warns",
          def: "scikit-learn stores its version in every pickle and raises InconsistentVersionWarning when another version loads it. The load succeeds; nothing checks that the estimator's behaviour, defaults or attributes are the same. Warnings in a serving log are rarely read." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Pickles as a long-term format",
      body: [
        { t: "p",
          text: "A pickle stores references to classes, not their code. Loading it under another library version runs the new code on the old object's state. Sometimes that works, sometimes it fails, and sometimes it loads and behaves differently. Keep the environment that wrote it, or export to a format with a specification (ONNX, a framework's own saved format, or plain arrays plus code)." }
      ] },
    { t: "h2",
      n: "02",
      id: "pin",
      text: "Making the environment part of the artefact",
      sub: "Lockfiles, digests and fingerprints" },
    { t: "viz",
      title: "What has to be pinned for a model to behave the same",
      caption: "Code by commit, dependencies by a lockfile with hashes, the image by digest, the artefact by checksum, with the environment it was trained in recorded beside it.",
      svg: `<svg viewBox="0 0 760 200" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="180.0" y1="62.3" x2="260.0" y2="77.7" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="180.0" y1="129.7" x2="260.0" y2="114.3" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="450.0" y1="113.3" x2="520.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="630.0" y1="72.0" x2="630.0" y2="120.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="95.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Model code</text>
<text x="95.0" y="60" text-anchor="middle" class="s-sub">git commit</text>
<rect x="10" y="120" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="95.0" y="142" text-anchor="middle" class="s-label" style="fill:var(--violet)">Dependencies</text>
<text x="95.0" y="160" text-anchor="middle" class="s-sub">lockfile with hashes</text>
<rect x="260" y="70" width="190" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="355.0" y="92" text-anchor="middle" class="s-label" style="fill:var(--warn)">Container image</text>
<text x="355.0" y="110" text-anchor="middle" class="s-sub">pinned by digest</text>
<rect x="520" y="20" width="220" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="630.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--good)">Model artefact</text>
<text x="630.0" y="60" text-anchor="middle" class="s-sub">sha256 + env fingerprint</text>
<rect x="520" y="120" width="220" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="630.0" y="142" text-anchor="middle" class="s-label" style="fill:var(--crit)">Serving process</text>
<text x="630.0" y="160" text-anchor="middle" class="s-sub">checks before loading</text>
</svg>` },
    { t: "table",
      head: ["Layer", "Pinned by", "Not by"],
      rows: [
        [
          "Python packages",
          "Lockfile with exact versions and hashes (pip-tools, uv, Poetry)",
          "requirements.txt with >= ranges"
        ],
        ["Container image", "Digest: image@sha256:…", "A tag such as :latest or :1.2, which can be moved"],
        ["Model artefact", "Checksum, registry version", "A file path that can be overwritten"],
        [
          "Runtime settings",
          "Thread counts, PYTHONHASHSEED, locale, timezone in config",
          "Whatever the host happens to have"
        ]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A fingerprint and a loader that checks it",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Save a model together with a JSON file holding a SHA-256 of the artefact's bytes and an environment fingerprint: Python version, the versions of the libraries the model depends on, and the hash seed setting. Write a loader that verifies the checksum and refuses to load if any pinned library version differs. Show it loading in the same environment, refusing after the recorded scikit-learn version is changed, and refusing a modified artefact." }
      ],
      requirements: [
        "A fingerprint from importlib.metadata versions",
        "A checksum over the exact bytes saved",
        "A clear error naming every mismatch",
        "The three demonstrations"
      ],
      hint: "Compare the Python version at major.minor only; patch releases rarely change behaviour, library versions often do.",
      solution: { lang: "python",
        title: "fingerprinted_artifact.py",
        code: `import hashlib, json, os, pickle, platform, sys, tempfile
from importlib.metadata import version
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression

PINNED = ["numpy", "scikit-learn", "scipy"]                 # libraries whose behaviour the artefact depends on

def fingerprint() -> dict:
    return {"python": platform.python_version(), "packages": {p: version(p) for p in PINNED},
            "hashseed": os.environ.get("PYTHONHASHSEED", "random")}

def save(model, path: Path):
    blob = pickle.dumps(model)
    meta = {"env": fingerprint(), "sha256": hashlib.sha256(blob).hexdigest()}
    path.write_bytes(blob); path.with_suffix(".json").write_text(json.dumps(meta, indent=1))

class EnvironmentMismatch(RuntimeError): pass

def load(path: Path, strict=("packages",)):
    meta = json.loads(path.with_suffix(".json").read_text()); blob = path.read_bytes()
    if hashlib.sha256(blob).hexdigest() != meta["sha256"]: raise EnvironmentMismatch("artefact bytes changed since save")
    now, then = fingerprint(), meta["env"]
    diffs = [f"{p}: saved with {then['packages'][p]}, running {now['packages'][p]}"
             for p in PINNED if then["packages"][p] != now["packages"][p]]
    if then["python"].rsplit(".", 1)[0] != now["python"].rsplit(".", 1)[0]: diffs.append(f"python {then['python']} -> {now['python']}")
    if diffs and "packages" in strict: raise EnvironmentMismatch("; ".join(diffs))
    return pickle.loads(blob)

d = Path(tempfile.mkdtemp()); p = d / "model.pkl"
X = np.random.default_rng(0).normal(size=(300, 4)); y = (X[:, 0] > 0).astype(int)
save(LogisticRegression().fit(X, y), p)
print("saved:", json.loads(p.with_suffix(".json").read_text())["env"])
print("load in the same environment:", type(load(p)).__name__)

meta = json.loads(p.with_suffix(".json").read_text()); meta["env"]["packages"]["scikit-learn"] = "1.3.2"
p.with_suffix(".json").write_text(json.dumps(meta))                     # as if trained in an older image
try: load(p)
except EnvironmentMismatch as e: print("load after a version change: refused:", e)

p.write_bytes(p.read_bytes()[:-1] + b"\\x00")                              # one byte of the artefact altered
try: load(p, strict=())
except EnvironmentMismatch as e: print("load of a modified artefact: refused:", e)`,
        out: `saved: {'python': '3.11.3', 'packages': {'numpy': '2.4.4', 'scikit-learn': '1.8.0', 'scipy': '1.17.1'}, 'hashseed': 'random'}
load in the same environment: LogisticRegression
load after a version change: refused: scikit-learn: saved with 1.3.2, running 1.8.0
load of a modified artefact: refused: artefact bytes changed since save`,
        notes: [
          { t: "p",
            text: "The loader turned scikit-learn's warning into an error that names the mismatch, 'saved with 1.3.2, running 1.8.0', before any prediction was made, and rejected an artefact with one altered byte. In the same environment it loaded normally." },
          { t: "p",
            text: "Refusing is the right default for serving: a model that cannot load is noticed at deploy time; one that loads and behaves differently is noticed weeks later, if at all. When an upgrade is intended, re-validate the model under the new environment and save a new fingerprint, rather than relaxing the check." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the category buckets that moved every restart",
      body: [
        { t: "p",
          text: "**Symptom.** A recommendation model's click-through dropped a few percent after each deploy and partly recovered over the day, in a pattern nobody could connect to model changes." },
        { t: "p",
          text: "**Mechanism.** Item categories were hashed into 512 buckets with Python's built-in hash(). Training ran in one process with one seed; every serving process started with a random one, so categories landed in different buckets than in training. Each deploy restarted all processes; over the day, autoscaling replaced some, and the mix of mappings shifted." },
        { t: "p",
          text: "**Fix.** The features switched to a stable hash, the model was retrained with it, PYTHONHASHSEED was fixed in the image as a second guard, and a parity test (lesson 13.1) now runs in a freshly started process rather than the one that trained the model." }
      ] }
  ],

  takeaways: [
    "An artefact's behaviour depends on its **environment**: library versions, hashing, threads and numeric settings.",
    "Python's built-in **hash()** put the same category in bucket **875** and **209** in two processes; use a stable hash.",
    "Thread count changed **91%** of a layer's outputs at the **10⁻⁶** level: do not demand bit-equality across environments.",
    "scikit-learn's version check is a **warning**; the load succeeds regardless.",
    "Pickles store class references, not code; prefer a specified format for long-lived artefacts.",
    "Pin packages with a **lockfile with hashes**, images by **digest**, artefacts by **checksum**.",
    "Save an environment **fingerprint** with the model and refuse to load on a mismatch."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why is Python's built-in hash() unsafe for feature hashing in a model?",
        options: [
          "It is too slow for production workloads",
          "Its values for strings differ between processes",
          "It only accepts integers as its input",
          "It produces a collision for every single string"
        ],
        answer: 1,
        why: "String hashing is randomised per process unless PYTHONHASHSEED is fixed: 'electronics' went to bucket 875 in one process and 209 in another. Speed, input types and collision rates are not the problem." },
      { stem: "What happens when scikit-learn loads a pickle written by a different version?",
        options: [
          "It refuses to load and raises an error",
          "It warns, loads it, and checks nothing else",
          "It converts the model to the new version's format",
          "It retrains the model automatically"
        ],
        answer: 1,
        why: "It raises InconsistentVersionWarning and loads the object; behaviour may or may not match. There is no refusal, conversion or retraining." },
      { stem: "Which pins a container image so it cannot change underneath you?",
        options: [
          "A version tag such as :1.2 for the release",
          "Its digest, image@sha256:…",
          "The name of the registry it was pushed to",
          "The date on which the image was built"
        ],
        answer: 1,
        why: "A digest identifies the exact content; tags can be moved to another image, and registry names or build dates identify nothing about content." },
      { stem: "Outputs differ at the 10⁻⁶ level between 1 and 8 threads. What should a parity test do?",
        options: [
          "Require exact bit-for-bit equality",
          "Compare with a tolerance suited to the arithmetic",
          "Ignore numeric outputs and only compare the shapes",
          "Always run with one thread in production"
        ],
        answer: 1,
        why: "Parallel sums add in different orders, so tiny differences are expected; a tolerance distinguishes them from real skew. Exact equality fails spuriously, shapes catch nothing, and one thread wastes the hardware." }
    ] },

  interview: { title: "In an interview",
    sub: "Reproducibility questions want specific pins, not good intentions.",
    questions: [
      { level: "core",
        q: "How do you make sure a model behaves the same in production as in training?",
        strong: "A strong answer pins every layer and verifies on load.",
        answer: [
          { t: "p",
            text: "Train and serve from images built from the same lockfile, referenced by digest. Store the artefact with a checksum and an environment fingerprint, and have the loader verify both. Fix runtime settings that change results, such as hash seeds, thread counts where determinism matters, locale and timezone. Run a parity test in a fresh serving process on real rows, with tolerances that allow for floating-point ordering." }
        ] },
      { level: "advanced",
        q: "Is pickle an acceptable format for model artefacts?",
        strong: "A strong answer weighs convenience against security and version coupling.",
        answer: [
          { t: "p",
            text: "For short-lived artefacts inside a pinned environment, it is common and workable. Its risks: unpickling runs code, so artefacts from untrusted sources are a security hole; and a pickle couples the artefact to the library version that wrote it. For long-lived or cross-team artefacts, prefer a specified format such as ONNX, safetensors for weights, or the framework's own saved format, and always record the environment and verify checksums." }
        ] },
      { level: "core",
        q: "What is the difference between a lockfile and a requirements file with version ranges?",
        strong: "A strong answer explains transitive dependencies and hashes.",
        answer: [
          { t: "p",
            text: "Ranges let the resolver pick new versions at every build, including of transitive dependencies you never named, so two builds of the same commit can differ. A lockfile records the exact version of every package in the tree, with hashes of the files, so the environment is reproducible and tampering is detectable. Upgrades become deliberate changes to the lockfile that go through review and evaluation." }
        ] }
    ] }
});
