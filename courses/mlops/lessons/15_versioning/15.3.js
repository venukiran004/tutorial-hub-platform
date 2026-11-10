/* ============================================================================
   LESSON 15.3 — Reproducible a Year Later
   ========================================================================= */
EC.receiveLesson({
  id: "15.3",

  lede: "'Can you retrain the model that made this decision, a year from now, and get the same model?' is a question regulators, auditors and debugging all ask. The answer depends on a short list of things being recorded at training time: the exact data, the code, the configuration and seeds, and the environment. This lesson trains the same network under controlled changes to see which ones alter the result bit for bit, writes the manifest that captures them, verifies a retrain against it, and states plainly what stays irreproducible even when everything on the list is done.",

  objectives: [
    "Name the inputs that determine a trained model: data, code, config, seeds, environment",
    "Measure which uncontrolled factors change the trained weights",
    "Write a reproducibility manifest at training time",
    "Verify a retrain against the manifest, refusing when the data has changed",
    "State what remains irreproducible and record it"
  ],

  prerequisites: ["15.2", "13.3"],

  blocks: [
    { t: "h2", n: "01", id: "factors", text: "What changes the result", sub: "One network, six runs" },
    { t: "p",
      text: "The script trains a small network with dropout for five epochs, hashes the final weights, and repeats with one factor changed at a time: nothing, the model seed unset, the data-order seed unset, a different thread count, and one value of the training data changed." },
    { t: "code",
      lang: "python",
      title: "repro.py — which factors change the weights",
      code: `import hashlib
import numpy as np, torch
from torch import nn

X_all = torch.tensor(np.random.default_rng(0).normal(size=(4_000, 20)), dtype=torch.float32)
y_all = (X_all[:, :3].sum(1) > 0).long()

def train(seed=0, data_seed=0, threads=4, snapshot=X_all, set_seed=True):
    torch.set_num_threads(threads)
    if set_seed: torch.manual_seed(seed)
    model = nn.Sequential(nn.Linear(20, 64), nn.ReLU(), nn.Dropout(0.1), nn.Linear(64, 2))
    opt = torch.optim.AdamW(model.parameters(), lr=3e-3)
    g = torch.Generator().manual_seed(data_seed) if data_seed is not None else None
    for epoch in range(5):
        order = torch.randperm(len(snapshot), generator=g) if g else torch.randperm(len(snapshot))
        for i in range(0, len(order), 64):
            idx = order[i:i + 64]
            loss = nn.functional.cross_entropy(model(snapshot[idx]), y_all[idx]); opt.zero_grad(); loss.backward(); opt.step()
    model.eval()
    with torch.no_grad(): acc = (model(X_all).argmax(1) == y_all).float().mean().item()
    digest = hashlib.sha256(b"".join(p.detach().numpy().tobytes() for p in model.parameters())).hexdigest()[:12]
    return digest, acc

ref = train()
print(f"{'run':<44}{'weights':>14}{'accuracy':>10}{'identical':>11}")
cases = [("reference: seeds fixed, 4 threads", {}),
         ("the same again", {}),
         ("model seed not set", {"set_seed": False}),
         ("data order not seeded", {"data_seed": None}),
         ("8 threads instead of 4", {"threads": 8}),
         ("one value in the data changed", {"snapshot": X_all.clone().index_put_((torch.tensor([7]), torch.tensor([3])), torch.tensor(0.5))})]
for name, kw in cases:
    d, a = train(**kw) if kw or name != "reference: seeds fixed, 4 threads" else ref
    print(f"{name:<44}{d:>14}{a:>10.4f}{'yes' if d == ref[0] else 'no':>11}")`,
      out: `run                                                weights  accuracy  identical
reference: seeds fixed, 4 threads             33fb9f569df4    0.9955        yes
the same again                                33fb9f569df4    0.9955        yes
model seed not set                            4a8d7ab346f0    0.9927         no
data order not seeded                         995ec5442af9    0.9923         no
8 threads instead of 4                        33fb9f569df4    0.9955        yes
one value in the data changed                 62cb6fc79070    0.9955         no` },
    { t: "dl",
      items: [
        { term: "Seeds fixed: bit-identical",
          def: "Two runs with the same seeds, data and environment produced the same weight hash. On CPU, with deterministic operations, exact reproduction is achievable." },
        { term: "Any unseeded randomness: different model",
          def: "An unset model seed or an unseeded data order each gave different weights and accuracy (0.9927 and 0.9923 against 0.9955). Initialisation, dropout masks and shuffling all draw random numbers." },
        { term: "One data value: different weights",
          def: "Changing a single number in 80,000 gave different weights with the same accuracy. Metrics alone cannot tell you that two models were trained on the same data." },
        { term: "Threads: it depends on size",
          def: "At this size 8 threads gave the same bits as 4; on the 4096-wide layer in lesson 13.3 they did not. Record the thread count rather than assume it does not matter." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Seeding only the framework",
      body: [
        { t: "p",
          text: "torch.manual_seed covers PyTorch's generator, not NumPy's, Python's random module, a DataLoader's worker processes or a shuffling library with its own generator. Every source of randomness needs its seed, and data order is the one most often forgotten." }
      ] },
    { t: "h2",
      n: "02",
      id: "checklist",
      text: "The checklist that works",
      sub: "Recorded at training time, verified at retraining time" },
    { t: "table",
      head: ["Item", "Recorded as", "Without it"],
      rows: [
        [
          "Data",
          "Immutable snapshot ID (content hash)",
          "'The table' has changed since; the model cannot be rebuilt"
        ],
        ["Code", "Git commit, clean working tree", "Uncommitted notebook edits are lost"],
        [
          "Config and seeds",
          "A file in version control, all seeds included",
          "Hyperparameters live in someone's notebook"
        ],
        ["Environment", "Image digest or lockfile; library versions", "Different library, different numerics (13.3)"],
        ["Hardware note", "CPU/GPU type, thread and device counts", "GPU kernels and reductions vary by device"],
        ["Result", "Weights hash and metrics", "Nothing to compare the retrain against"]
      ] },
    { t: "viz",
      title: "A manifest and its verifier",
      caption: "Everything that determines the model is recorded when it is trained; the verifier checks the inputs still match before retraining, then compares the result.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="160.0" y1="62.0" x2="310.0" y2="122.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="180.0" y1="122.2" x2="290.0" y2="136.8" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="180.0" y1="174.5" x2="290.0" y2="159.5" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="159.4" y1="235.0" x2="310.6" y2="174.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="460.0" y1="148.0" x2="560.0" y2="148.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="10" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="95.0" y="32" text-anchor="middle" class="s-label" style="fill:var(--good)">Data snapshot</text>
<text x="95.0" y="50" text-anchor="middle" class="s-sub">content hash</text>
<rect x="10" y="85" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="95.0" y="107" text-anchor="middle" class="s-label" style="fill:var(--warn)">Code</text>
<text x="95.0" y="125" text-anchor="middle" class="s-sub">git commit</text>
<rect x="10" y="160" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="95.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--violet)">Config + seeds</text>
<text x="95.0" y="200" text-anchor="middle" class="s-sub">in version control</text>
<rect x="10" y="235" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="95.0" y="257" text-anchor="middle" class="s-label" style="fill:var(--accent)">Environment</text>
<text x="95.0" y="275" text-anchor="middle" class="s-sub">image digest</text>
<rect x="290" y="122" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="375.0" y="144" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Manifest</text>
<text x="375.0" y="162" text-anchor="middle" class="s-sub">written at training</text>
<rect x="560" y="122" width="180" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="650.0" y="144" text-anchor="middle" class="s-label" style="fill:var(--crit)">Verifier</text>
<text x="650.0" y="162" text-anchor="middle" class="s-sub">retrain and compare</text>
</svg>` },
    { t: "callout",
      kind: "insight",
      title: "What stays irreproducible",
      body: [
        { t: "p",
          text: "Many GPU kernels are non-deterministic by default (atomic additions in reductions and some convolution algorithms), distributed training changes the order of gradient sums with the number of devices, and data from external APIs or human labels may never be obtainable again. Deterministic modes exist and cost speed. The honest manifest records the hardware and states the expected tolerance, 'metrics within 0.001', instead of promising bit-identity it cannot deliver." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A manifest and a verifier",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Write a manifest at training time with the configuration and seeds, the data snapshot's hash, the environment's library versions and thread count, the weights hash and the accuracy. Then write a verifier that checks the data and environment, retrains from the manifest alone, and compares weights and accuracy. Run it against the same snapshot, and against a copy of the table that has been 'cleaned'." }
      ],
      requirements: [
        "Everything needed to retrain, in one JSON document",
        "A refusal to retrain when the data hash differs",
        "Bit-identity of weights and a metric tolerance, reported separately",
        "A note of what is not guaranteed"
      ],
      hint: "Report weight identity and metric agreement as separate checks; on GPUs the first may fail while the second passes.",
      solution: { lang: "python",
        title: "manifest.py",
        code: `import contextlib, hashlib, io, json, platform, runpy
from importlib.metadata import version
import torch

with contextlib.redirect_stdout(io.StringIO()):
    ns = runpy.run_path("repro.py")
train, X_all = ns["train"], ns["X_all"]
data_hash = lambda X: hashlib.sha256(X.numpy().tobytes()).hexdigest()[:12]

def write_manifest(config, snapshot):
    digest, acc = train(**config, snapshot=snapshot)
    return {"config": config, "data": data_hash(snapshot), "result": {"weights": digest, "accuracy": round(acc, 4)},
            "env": {"python": platform.python_version(), "torch": version("torch"), "numpy": version("numpy"),
                    "threads": config.get("threads", 4)},
            "note": "CPU training; GPU kernels may not be bit-reproducible"}

def verify(manifest, snapshot):
    checks = {"data snapshot": data_hash(snapshot) == manifest["data"],
              "environment": all(manifest["env"][k] == v for k, v in
                                 {"python": platform.python_version(), "torch": version("torch"), "numpy": version("numpy")}.items())}
    if not checks["data snapshot"]: return checks, "not retrained: the data is not the snapshot the manifest names"
    digest, acc = train(**manifest["config"], snapshot=snapshot)
    checks["weights bit-identical"] = digest == manifest["result"]["weights"]
    checks["accuracy within 0.001"] = abs(acc - manifest["result"]["accuracy"]) < 1e-3
    return checks, f"retrained: weights {digest}, accuracy {acc:.4f}"

m = write_manifest({"seed": 0, "data_seed": 0, "threads": 4}, X_all)
print(json.dumps(m, indent=1))
for label, snap in (("a year later, same snapshot", X_all), ("a year later, the table was 'cleaned'", X_all * 1.0001)):
    checks, outcome = verify(m, snap)
    print(f"\\n{label}: {outcome}")
    for k, ok in checks.items(): print(f"  {'ok  ' if ok else 'FAIL'} {k}")`,
        out: `{
 "config": {
  "seed": 0,
  "data_seed": 0,
  "threads": 4
 },
 "data": "d3863fdba83d",
 "result": {
  "weights": "33fb9f569df4",
  "accuracy": 0.9955
 },
 "env": {
  "python": "3.11.3",
  "torch": "2.10.0",
  "numpy": "2.4.4",
  "threads": 4
 },
 "note": "CPU training; GPU kernels may not be bit-reproducible"
}

a year later, same snapshot: retrained: weights 33fb9f569df4, accuracy 0.9955
  ok   data snapshot
  ok   environment
  ok   weights bit-identical
  ok   accuracy within 0.001

a year later, the table was 'cleaned': not retrained: the data is not the snapshot the manifest names
  FAIL data snapshot
  ok   environment`,
        notes: [
          { t: "p",
            text: "Against the original snapshot the retrain reproduced the weights exactly (33fb9f569df4) and the accuracy. Against the 'cleaned' table, multiplied by 1.0001, the verifier refused before training: the data was not the snapshot the manifest names, and a retrain on it would have produced a different model that looked like a reproduction." },
          { t: "p",
            text: "Separating the checks matters on real hardware. A GPU retrain often fails bit-identity and passes the metric tolerance, which is an acceptable, explainable outcome, provided the manifest said so in advance." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the model nobody could rebuild",
      body: [
        { t: "p",
          text: "**Symptom.** A regulator asked a lender to show how a credit model from the previous year produced a set of declines. The team retrained it and got a model whose decisions differed for 4% of the cases in question." },
        { t: "p",
          text: "**Mechanism.** The training data had been a query over a live table that had since been corrected and backfilled; the hyperparameters were in a notebook; the data order was shuffled without a seed; and the library versions had moved. Nobody could say which difference mattered." },
        { t: "p",
          text: "**Fix.** Training now reads only immutable snapshots, configs and seeds are committed, images are pinned by digest, and every run writes a manifest. A quarterly drill retrains one production model from its manifest and checks the result against the recorded hash and metrics." }
      ] }
  ],

  takeaways: [
    "A trained model is determined by **data, code, config and seeds, and environment**; record all of them when training.",
    "Measured: with seeds fixed, two runs produced **bit-identical** weights.",
    "An unset model seed or unseeded data order changed the weights and the accuracy (**0.9927**, **0.9923** against **0.9955**).",
    "One changed data value gave different weights with the **same accuracy**: metrics cannot prove the data matched.",
    "Seed every random source, including data order, NumPy and worker processes.",
    "A manifest plus a verifier reproduced the weights exactly, and **refused** a 'cleaned' table before training.",
    "GPU and distributed training may not be bit-reproducible; record hardware and state the tolerance honestly.",
    "Rehearse: retrain a production model from its manifest on a schedule."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Two retrains give the same accuracy. Does that show they used the same training data?",
        options: [
          "Yes, accuracy would differ if the data differed",
          "No: one changed value kept the same accuracy",
          "Yes, if both runs used the same random seed",
          "No, because accuracy is never reproducible"
        ],
        answer: 1,
        why: "Changing one number gave a different weight hash with accuracy unchanged at 0.9955. Seeds do not prove data identity, and accuracy was reproducible in the same conditions." },
      { stem: "Which of these did NOT change the weights at this model size?",
        options: [
          "Leaving the model's seed unset",
          "Using 8 threads instead of 4",
          "Leaving the data order unseeded",
          "Changing one value in the data"
        ],
        answer: 1,
        why: "At this size the thread count gave identical bits, while the other three each changed the weights; on a larger layer (lesson 13.3) threads did change results." },
      { stem: "The verifier finds the data hash differs from the manifest. What should it do?",
        options: [
          "Retrain anyway and just compare the resulting metrics",
          "Refuse: it cannot reproduce from different data",
          "Update the manifest to the new hash",
          "Retrain with more epochs to compensate"
        ],
        answer: 1,
        why: "A retrain on different data is a different model, however close its metrics. Updating the manifest hides the change; more epochs change something else." },
      { stem: "Why might a GPU retrain fail bit-identity even with everything recorded?",
        options: [
          "GPUs cannot store model weights exactly",
          "Some GPU kernels sum in non-deterministic orders",
          "GPU training never uses random seeds",
          "CUDA drivers round every single result to float16 format"
        ],
        answer: 1,
        why: "Atomic additions and some convolution algorithms change the order of floating-point sums between runs. Weights are stored exactly, seeds are used, and results are not rounded to float16." }
    ] },

  interview: { title: "In an interview",
    sub: "Reproducibility answers should include what you cannot guarantee.",
    questions: [
      { level: "core",
        q: "How do you make model training reproducible?",
        strong: "A strong answer lists recorded inputs, seeds, environment and verification.",
        answer: [
          { t: "p",
            text: "Train only from immutable data snapshots identified by hash; run from a clean git commit; keep config and every seed in version control, including data order; pin the environment by image digest or lockfile; record hardware. Write a manifest with all of that plus the weights hash and metrics, and periodically retrain from a manifest to verify. Where bit-identity is impossible, state the tolerance in advance." }
        ] },
      { level: "advanced",
        q: "What remains irreproducible even with perfect records?",
        strong: "A strong answer names non-deterministic kernels, distributed reductions and external data, with mitigations.",
        answer: [
          { t: "p",
            text: "Non-deterministic GPU kernels, reduction order that depends on the number of devices, mixed-precision rounding, and data that cannot be obtained again, such as external API responses or human labels. Mitigations: deterministic modes where affordable, keeping the original artefact (so reproduction is not needed to explain a decision), recording the hardware, and accepting a stated metric tolerance rather than bit-identity." }
        ] },
      { level: "core",
        q: "An auditor asks how last year's model made a decision. What do you need?",
        strong: "A strong answer prefers the original artefact and inputs over a retrain.",
        answer: [
          { t: "p",
            text: "The prediction log entry with the model version and the input features, and the original model artefact from the registry, so the decision can be replayed exactly. A retrain is a second line of evidence and needs the manifest. Keeping artefacts and inputs for the regulatory retention period is cheaper and more convincing than reproducing them." }
        ] }
    ] }
});
