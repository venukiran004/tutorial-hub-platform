/* ============================================================================
   LESSON 10.1 — The Platform Landscape
   ========================================================================= */
EC.receiveLesson({
  id: "10.1",

  lede: "AWS SageMaker, Google Vertex AI and Azure Machine Learning look different in their consoles and documentation, but they cover the same lifecycle with mostly equivalent pieces: notebooks, training jobs, tuning, pipelines, a registry, endpoints and monitoring. Comparing them piece by piece shows what is genuinely different, what is the same service under another name, and where each one ties your code to it. This lesson maps the three, then shows the cheapest defence against lock-in that actually works: a training entrypoint whose only platform-specific code is a single function, checked by a contract test.",

  objectives: [
    "Map the three managed ML platforms onto the same lifecycle stages",
    "Separate genuinely differentiated capabilities from renamed equivalents",
    "Identify where lock-in actually happens: data, artefact paths, SDK calls and IAM",
    "Write a training entrypoint that runs unchanged on two platforms and locally",
    "Test the platform contract before paying for a cloud job to find the bug"
  ],

  prerequisites: ["3.5", "4.3"],

  blocks: [
    { t: "h2", n: "01", id: "map", text: "One lifecycle, three vocabularies", sub: "The pieces, side by side" },
    { t: "p",
      text: "Each platform offers a service for each stage below. Product names change often, and AWS renamed SageMaker to Amazon SageMaker AI in December 2024, so check current documentation before you write them into a design. The mapping itself has been stable for years." },
    { t: "table",
      head: ["Stage", "AWS SageMaker", "Google Vertex AI", "Azure Machine Learning"],
      rows: [
        ["Notebooks", "Studio notebooks", "Workbench", "Compute instances"],
        ["Training", "Training jobs", "Custom training jobs", "Command jobs"],
        ["Tuning", "Automatic model tuning", "Vizier / tuning jobs", "Sweep jobs"],
        ["Pipelines", "SageMaker Pipelines", "Vertex AI Pipelines (KFP)", "Azure ML pipelines"],
        ["Experiment tracking", "Experiments, managed MLflow", "Vertex AI Experiments", "MLflow, built in"],
        ["Model registry", "Model Registry", "Model Registry", "Model registry"],
        [
          "Online serving",
          "Real-time and serverless endpoints",
          "Online prediction endpoints",
          "Managed online endpoints"
        ],
        ["Batch scoring", "Batch transform", "Batch prediction", "Batch endpoints"],
        ["Monitoring", "Model Monitor", "Model Monitoring", "Model monitoring"]
      ] },
    { t: "dl",
      items: [
        { term: "Genuinely different",
          def: "Vertex is tightly joined to BigQuery and offers TPUs. SageMaker has the widest catalogue, managed spot training with checkpoint syncing, and AWS's own Trainium and Inferentia chips. Azure ML is built around MLflow and sits next to Azure OpenAI and Entra ID, which matters to enterprises already on Microsoft identity." },
        { term: "The same thing renamed",
          def: "Training jobs, registries, endpoints and batch scoring work the same way on all three: a container, a data location, an artefact location, a machine type. Choosing between them on these features alone is choosing between names." },
        { term: "Where lock-in lives",
          def: "Not in the model, which is a file. In the data's location and egress cost, IAM roles and networking, pipeline definitions written in a platform SDK, and code that reads platform paths and environment variables all over the training script." }
      ] },
    { t: "h2",
      n: "02",
      id: "contract",
      text: "The training contract",
      sub: "What the platform gives the script, and what it collects" },
    { t: "p",
      text: "A managed training job runs your container with a contract. SageMaker copies each input channel to `/opt/ml/input/data/<channel>` and sets `SM_CHANNEL_<CHANNEL>`, passes hyperparameters as command-line arguments, and uploads whatever is in `SM_MODEL_DIR` (`/opt/ml/model`) when the job ends. Vertex AI sets `AIP_MODEL_DIR` to a Cloud Storage URI, which the script can write through the `/gcs/` FUSE mount. Anything written elsewhere disappears with the machine." },
    { t: "viz",
      title: "Keep platform knowledge in one function",
      caption: "The training logic never reads a platform variable. One small function turns each platform's contract into a data path and a model path.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="180.0" y1="126.0" x2="240.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="410.0" y1="101.9" x2="533.2" y2="67.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="410.0" y1="126.0" x2="500.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="410.0" y1="150.1" x2="533.2" y2="185.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="100" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="95.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--accent)">Training logic</text>
<text x="95.0" y="140" text-anchor="middle" class="s-sub">data in, model out</text>
<rect x="240" y="100" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="325.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--violet)">resolve_paths()</text>
<text x="325.0" y="140" text-anchor="middle" class="s-sub">the only platform code</text>
<rect x="500" y="15" width="250" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="625.0" y="37" text-anchor="middle" class="s-label" style="fill:var(--warn)">SageMaker</text>
<text x="625.0" y="55" text-anchor="middle" class="s-sub">SM_CHANNEL_*, /opt/ml/model</text>
<rect x="500" y="100" width="250" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="625.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--good)">Vertex AI</text>
<text x="625.0" y="140" text-anchor="middle" class="s-sub">AIP_MODEL_DIR, /gcs/ mount</text>
<rect x="500" y="185" width="250" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="625.0" y="207" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Laptop / CI</text>
<text x="625.0" y="225" text-anchor="middle" class="s-sub">./data, ./artifacts</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "portable_train.py — one entrypoint, three environments",
      code: `"""One training entrypoint for SageMaker, Vertex AI and a laptop. Only resolve_paths() knows about platforms."""
import argparse, json, os, pickle
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression

def resolve_paths() -> tuple[str, Path, Path]:
    if "SM_MODEL_DIR" in os.environ:                       # SageMaker script mode
        return "sagemaker", Path(os.environ["SM_CHANNEL_TRAIN"]), Path(os.environ["SM_MODEL_DIR"])
    if "AIP_MODEL_DIR" in os.environ:                      # Vertex AI custom training
        model_dir = os.environ["AIP_MODEL_DIR"].replace("gs://", "/gcs/", 1)   # Cloud Storage FUSE mount
        return "vertex", Path(os.environ.get("TRAIN_DATA_DIR", "/gcs/data/train")), Path(model_dir)
    return "local", Path("data/train"), Path("artifacts/model")

def main() -> None:
    ap = argparse.ArgumentParser()                         # both platforms pass hyperparameters as arguments
    ap.add_argument("--C", type=float, default=1.0)
    ap.add_argument("--max-iter", type=int, default=200)
    args = ap.parse_args()
    platform, data_dir, model_dir = resolve_paths()
    X = np.load(data_dir / "X.npy"); y = np.load(data_dir / "y.npy")
    model = LogisticRegression(C=args.C, max_iter=args.max_iter).fit(X, y)
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "model.pkl").write_bytes(pickle.dumps(model))
    (model_dir / "metrics.json").write_text(json.dumps({"train_accuracy": model.score(X, y), "C": args.C}))
    print(f"[{platform}] trained on {len(X)} rows from {data_dir.name}/, wrote {sorted(p.name for p in model_dir.iterdir())}")

if __name__ == "__main__":
    main()` },
    { t: "code",
      lang: "python",
      title: "run_contracts.py — the same script under each contract, simulated locally",
      code: `"""Run the same entrypoint under each platform's contract, simulated locally with the environment each one sets."""
import json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

root = Path(tempfile.mkdtemp())
rng = np.random.default_rng(0)
X = rng.normal(size=(500, 6)); y = (X[:, 0] + 0.5 * X[:, 1] > 0).astype(int)

contracts = {
    # SageMaker copies channel "train" to /opt/ml/input/data/train and uploads /opt/ml/model when the job ends.
    "sagemaker": {"SM_CHANNEL_TRAIN": root / "opt/ml/input/data/train", "SM_MODEL_DIR": root / "opt/ml/model"},
    # Vertex sets AIP_MODEL_DIR to gs://bucket/...; the script maps it to the /gcs/ FUSE mount. Here the mount is a local folder.
    "vertex": {"TRAIN_DATA_DIR": root / "gcs/bucket/data/train", "AIP_MODEL_DIR": root / "gcs/bucket/models/run-7"},
    "local": {},
}
for name, env in contracts.items():
    data = Path(env.get("SM_CHANNEL_TRAIN") or env.get("TRAIN_DATA_DIR") or root / "local/data/train")
    data.mkdir(parents=True, exist_ok=True); np.save(data / "X.npy", X); np.save(data / "y.npy", y)
    run_env = {**os.environ, **{k: str(v) for k, v in env.items()}}
    cwd = root / "local" if name == "local" else root
    out = subprocess.run([sys.executable, str(Path(__file__).with_name("portable_train.py")), "--C", "0.5"],
                         env=run_env, cwd=cwd, capture_output=True, text=True, check=True)
    print(out.stdout.strip())

for name, path in (("sagemaker", root / "opt/ml/model"), ("vertex", root / "gcs/bucket/models/run-7"), ("local", root / "local/artifacts/model")):
    m = json.loads((path / "metrics.json").read_text())
    print(f"{name:<10} artifact at {path.relative_to(root).as_posix():<28} C={m['C']}  train_accuracy={m['train_accuracy']:.3f}")`,
      out: `[sagemaker] trained on 500 rows from train/, wrote ['metrics.json', 'model.pkl']
[vertex] trained on 500 rows from train/, wrote ['metrics.json', 'model.pkl']
[local] trained on 500 rows from train/, wrote ['metrics.json', 'model.pkl']
sagemaker  artifact at opt/ml/model                 C=0.5  train_accuracy=0.998
vertex     artifact at gcs/bucket/models/run-7      C=0.5  train_accuracy=0.998
local      artifact at local/artifacts/model        C=0.5  train_accuracy=0.998` },
    { t: "callout",
      kind: "trap",
      title: "This is a simulation of the contract, not a cloud run",
      body: [
        { t: "p",
          text: "The script sets the same environment variables and directory layout that each platform provides, which is enough to catch the bugs that matter here (wrong paths, missing arguments). It does not test IAM, networking or the platform's upload step; a single small cloud job in CI covers those." }
      ] },
    { t: "dl",
      items: [
        { term: "One function of platform code",
          def: "All three runs used the same training code with C=0.5 and produced the same metrics. Moving platforms means rewriting resolve_paths() and the job definition, not the training script." },
        { term: "Hyperparameters as arguments",
          def: "Both SageMaker script mode and Vertex pass hyperparameters on the command line, so argparse with defaults works everywhere, including on a laptop." },
        { term: "Keep the SDK at the edge",
          def: "Platform SDK calls (launching jobs, registering models) belong in a thin orchestration layer, not inside training or inference code." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A contract test for the training entrypoint",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Write a test that runs a training entrypoint exactly as SageMaker would: data in `/opt/ml/input/data/train`, the environment variables set, hyperparameters as arguments, and a working directory that will be thrown away. It should fail if the model is not in `SM_MODEL_DIR`, if files were written to the working directory, or if a hyperparameter did not reach the script. Run it on the portable entrypoint and on a variant that saves to a relative `model/` folder." }
      ],
      requirements: [
        "A temporary directory tree with SageMaker's layout",
        "The entrypoint run as a subprocess with the platform's environment",
        "Checks on what would be collected, what would be lost, and the hyperparameters",
        "A clear message for each failure"
      ],
      hint: "Run the subprocess with cwd set to an empty working directory, then list what ended up there: anything in it is lost when the job ends.",
      solution: { lang: "python",
        title: "contract_test.py",
        code: `"""A contract test: run an entrypoint as SageMaker would, and check what the platform would actually collect."""
import json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent

def sagemaker_contract_test(entrypoint: Path, hyperparams: dict) -> list[str]:
    root = Path(tempfile.mkdtemp())
    train, model, out = root / "opt/ml/input/data/train", root / "opt/ml/model", root / "opt/ml/output"
    for d in (train, model, out): d.mkdir(parents=True)
    rng = np.random.default_rng(0); X = rng.normal(size=(200, 6)); np.save(train / "X.npy", X); np.save(train / "y.npy", (X[:, 0] > 0).astype(int))
    env = {**os.environ, "SM_CHANNEL_TRAIN": str(train), "SM_MODEL_DIR": str(model), "SM_OUTPUT_DATA_DIR": str(out)}
    args = [a for k, v in hyperparams.items() for a in (f"--{k}", str(v))]
    work = root / "work"; work.mkdir()                     # the job's working directory is not uploaded
    r = subprocess.run([sys.executable, str(entrypoint), *args], env=env, cwd=work, capture_output=True, text=True)
    problems = []
    if r.returncode != 0: problems.append(f"exit code {r.returncode}: {r.stderr.strip().splitlines()[-1]}")
    collected = sorted(p.name for p in model.iterdir())
    if "model.pkl" not in collected: problems.append(f"no model.pkl in SM_MODEL_DIR (collected: {collected or 'nothing'})")
    stray = sorted(p.relative_to(work).as_posix() for p in work.rglob("*") if p.is_file())
    if stray: problems.append(f"files written to the working directory, which is discarded: {stray}")
    metrics = model / "metrics.json"
    if metrics.exists() and json.loads(metrics.read_text()).get("C") != hyperparams["C"]:
        problems.append("hyperparameter C did not reach the script")
    return problems

# A variant with the commonest bug: saving to a relative path that works on a laptop.
buggy = HERE / "buggy_train.py"
src = (HERE / "portable_train.py").read_text()
buggy.write_text(src.replace('model_dir.mkdir(parents=True, exist_ok=True)', 'model_dir = Path("model"); model_dir.mkdir(parents=True, exist_ok=True)'))

for name, ep in (("portable_train.py", HERE / "portable_train.py"), ("buggy_train.py", buggy)):
    problems = sagemaker_contract_test(ep, {"C": 0.25, "max-iter": 300})
    print(f"{name}: {'PASS' if not problems else 'FAIL'}")
    for p in problems: print(f"  - {p}")
buggy.unlink()`,
        out: `portable_train.py: PASS
buggy_train.py: FAIL
  - no model.pkl in SM_MODEL_DIR (collected: nothing)
  - files written to the working directory, which is discarded: ['model/metrics.json', 'model/model.pkl']`,
        notes: [
          { t: "p",
            text: "The buggy variant ran without error and wrote both files, to `model/` in the working directory. On SageMaker the job would have reported success and uploaded an empty model artefact, and you would find out at deployment. The contract test caught it in about a second, for free." },
          { t: "p",
            text: "The test checks what the platform will collect, not whether the script ran. That distinction is the point of a contract test: the failures that cost money in the cloud are mostly successful runs that put things in the wrong place." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: six hours of GPU training, no model",
      body: [
        { t: "p",
          text: "**Symptom.** A fine-tuning job ran for six hours on an 8-GPU instance, finished with status Completed, and the registered model artefact was an empty archive." },
        { t: "p",
          text: "**Mechanism.** The script saved checkpoints and the final model to `./outputs`, a habit carried over from another platform where that folder is uploaded automatically. On SageMaker, only `/opt/ml/model` and `/opt/ml/output` are kept, so the model was deleted with the instance." },
        { t: "p",
          text: "**Fix.** Paths now come from one function that reads the platform's variables, a contract test runs in CI for each supported platform, and the pipeline's registration step fails if the artefact is smaller than a minimum size." }
      ] }
  ],

  takeaways: [
    "SageMaker, Vertex AI and Azure ML map onto the same lifecycle; most pieces are **renamed equivalents**.",
    "Real differences: **BigQuery and TPUs** (Vertex), **breadth, spot training, Trainium/Inferentia** (SageMaker), **MLflow and Entra ID** (Azure).",
    "Product names change; the mapping is stable. Check names against current docs.",
    "Lock-in lives in **data location, IAM, pipeline SDKs and platform paths**, not in the model file.",
    "SageMaker uploads only **SM_MODEL_DIR** (`/opt/ml/model`); Vertex writes through **AIP_MODEL_DIR** and the `/gcs/` mount.",
    "Keep platform knowledge in **one function**; the same script trained identically under three contracts.",
    "A local contract test caught a relative-path bug that would have produced an **empty artefact** after a successful job.",
    "Test what the platform will **collect**, not just whether the script exits zero."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A SageMaker training script saves its model to ./model. What happens when the job ends?",
        options: [
          "SageMaker uploads the whole working directory",
          "The model is lost; only SM_MODEL_DIR is uploaded",
          "The job fails, since ./model is not writable",
          "SageMaker moves ./model into /opt/ml/model for you"
        ],
        answer: 1,
        why: "Only /opt/ml/model (and the output directory) are collected; the working directory goes with the instance. The job still succeeds, which is why the bug is expensive. Nothing is moved automatically." },
      { stem: "Which is a genuine differentiator rather than a renamed equivalent?",
        options: [
          "Each platform's managed model registry and its versions",
          "Vertex AI's integration with BigQuery and TPUs",
          "Each platform's batch scoring service",
          "Each platform's managed training job and its containers"
        ],
        answer: 1,
        why: "Registries, batch scoring and training jobs work the same way on all three. BigQuery integration and TPU access are specific to Google Cloud and can decide the choice." },
      { stem: "Where does most ML platform lock-in actually come from?",
        options: [
          "The model file format each platform requires",
          "Data location, IAM and platform calls in code",
          "The Python version each platform supports",
          "The notebook interface that teams get used to over time"
        ],
        answer: 1,
        why: "Models are portable files. Moving data costs egress, roles and networks must be rebuilt, and SDK calls and paths scattered through code must be rewritten; notebooks and Python versions are minor." },
      { stem: "What does the contract test check that 'the script exited with code 0' does not?",
        options: [
          "That training accuracy is above the agreed threshold value",
          "That artefacts are where the platform collects them",
          "That the container image is small enough",
          "That the job will finish within its budget"
        ],
        answer: 1,
        why: "A script can exit cleanly having written its model to a directory that is discarded. The contract test inspects the collected and discarded locations and the hyperparameters; accuracy, image size and budget are other checks." }
    ] },

  interview: { title: "In an interview",
    sub: "Platform questions reward knowing what is the same, as much as what differs.",
    questions: [
      { level: "core",
        q: "How would you choose between SageMaker, Vertex AI and Azure ML?",
        strong: "A strong answer starts from where the data and identity already live, then looks at the genuinely different capabilities.",
        answer: [
          { t: "p",
            text: "Start with the company's cloud: where the data sits, which identity system and network the security team runs, and existing contracts. Egress and IAM work dominate the cost of choosing against them. Then check the real differences that matter to the workload: TPUs or BigQuery on Google, specific accelerators or spot training on AWS, MLflow and Entra ID on Azure. Training jobs, registries and endpoints are close equivalents and should not decide it." }
        ] },
      { level: "core",
        q: "How do you keep ML code portable across clouds?",
        strong: "A strong answer isolates platform specifics behind small interfaces and tests the contracts.",
        answer: [
          { t: "p",
            text: "Training and inference code reads paths and arguments from one adapter and never imports a platform SDK. Containers follow each platform's contract through that adapter. Orchestration (job launch, registration, deployment) lives in a thin layer or in a portable tool such as Kubeflow Pipelines or MLflow. Contract tests run the entrypoint under each platform's layout in CI. Data is the hardest part to move, so I would keep formats open (Parquet, model files) and accept that the data's location is the real commitment." }
        ] },
      { level: "advanced",
        q: "A team wants to be multi-cloud for ML from day one. What do you advise?",
        strong: "A strong answer weighs the cost of abstraction against the realistic chance of moving.",
        answer: [
          { t: "p",
            text: "Usually not. Running on two clouds doubles IAM, networking, monitoring and on-call knowledge, and data gravity keeps training where the data is. Get the cheap portability (open formats, one adapter, contract tests, no SDK calls in model code) and stay on one platform. Go multi-cloud for a concrete reason: a regulatory requirement, a customer who needs their cloud, or accelerator capacity that one provider cannot supply." }
        ] }
    ] }
});
