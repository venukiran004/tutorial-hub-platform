EC.receiveLesson({
  id: "3.5",

  lede: "Kubeflow Pipelines, Vertex AI Pipelines and SageMaker Pipelines all do the same four things on top of the scheduler from lesson 3.1: they make each step a container, they treat inputs and outputs as typed **artifacts** rather than file paths, they **cache** a step whose inputs have not changed, and they record lineage automatically. Those four are genuinely worth something. What you pay is portability and a per-step container startup that lesson 2.1 measured at **2.82 seconds** just to get a Python process with a model into a serving state. **No cloud account is reachable from the authoring machine**, so this lesson is the interfaces and the trade-offs, with no executed trace and no invented numbers.",

  objectives: [
    "Name the four things a managed pipeline service adds over a bare scheduler",
    "Explain why a typed artifact is different from a file path, and what that buys",
    "Judge when step-level caching pays for the container overhead it imposes",
    "Decide between a managed pipeline service and an orchestrator you run yourself"
  ],

  prerequisites: ["3.4"],

  blocks: [

    { t: "h2", n: "01", id: "honest", text: "What this lesson is",
      sub: "Interfaces, not traces" },

    { t: "callout", kind: "note", title: "Nothing in this lesson was executed",
      body: [
        { t: "p", text: "Every other lesson in this course runs its claims. This one cannot: there is no GCP, AWS or Azure credential on the authoring machine, and no cluster — `kubectl cluster-info` is refused on 127.0.0.1, and the `kubernetes` client and `kubectl` v1.30.6 are both present with nothing to talk to." },
        { t: "p", text: "So the code below is **the shape of the interface**, taken from the vendor SDKs, and every claim about behaviour is attributed rather than measured. Where a number would normally appear you will find either a reference to something measured elsewhere in the course or an explicit statement that it depends on your workload. The lesson is still worth having, because the *decision* about whether to adopt one of these is made from the trade-offs rather than from a benchmark." }
      ] },

    { t: "h2", n: "02", id: "four", text: "The four additions",
      sub: "Containers, artifacts, caching, lineage" },

    { t: "p", text: "Lesson 3.1 built a scheduler in sixty lines and got six guarantees from it: dependency order, FAILED versus SKIPPED, idempotency, retries, backfill and cycle detection. A managed pipeline service gives you those and adds four more things, each of which is a real change in the programming model rather than a convenience." },

    { t: "dl", items: [
      { k: "A step is a container", v: "Each task runs in its own image, so two steps can have incompatible dependencies — a step pinned to an old scikit-learn next to one needing a new torch. In lesson 3.1's scheduler every task shared one interpreter." },
      { k: "Inputs and outputs are typed artifacts", v: "A step declares it produces a `Dataset` or a `Model`, not that it writes `/tmp/out.parquet`. The runtime owns the storage, so the path is not part of your code and cannot be wrong." },
      { k: "Steps are cached on input identity", v: "A step whose inputs and image are unchanged is skipped and its previous output reused — lesson 3.1's marker idea, but keyed on *content* rather than on a run id, so it works across runs." },
      { k: "Lineage is recorded, not written", v: "Because the runtime owns the artifacts, it knows which run produced which model from which dataset. Lesson 1.2's three fingerprints become a by-product instead of your responsibility." }
    ] },

    { t: "code", lang: "python", title: "Kubeflow Pipelines v2 — the shape of a component (interface, not executed)",
      code: `from kfp import dsl
from kfp.dsl import Input, Output, Dataset, Model

@dsl.component(base_image="python:3.11",
               packages_to_install=["scikit-learn==1.8.0"])
def train(features: Input[Dataset], model: Output[Model], max_iter: int = 200):
    import pandas as pd, joblib
    from sklearn.ensemble import HistGradientBoostingClassifier
    df = pd.read_parquet(features.path)      # the runtime supplies .path
    m = HistGradientBoostingClassifier(max_iter=max_iter, random_state=0)
    m.fit(df.drop(columns=["y"]), df["y"])
    joblib.dump(m, model.path)
    model.metadata["n_iter"] = int(m.n_iter_)   # lesson 1.2: realised, not requested

@dsl.pipeline(name="loan-retrain")
def pipeline(as_of: str):
    v = validate(raw=ingest(as_of=as_of).outputs["raw"])
    f = features(validated=v.outputs["validated"], as_of=as_of)
    t = train(features=f.outputs["features"])
    gate(candidate=t.outputs["model"], incumbent=fetch_incumbent().outputs["model"])` },

    { t: "p", text: "Three details in that snippet are the whole value proposition. `Input[Dataset]` and `Output[Model]` are types, so a pipeline that wires a model into a step expecting a dataset fails at **compile** time — the same class of win as lesson 3.1's cycle detection, moved from runtime to build time. `model.path` is supplied by the runtime rather than chosen by you. And `as_of` is threaded through as a parameter, which is lesson 3.1's logical date: no `now()` anywhere, so backfill works." },

    { t: "h2", n: "03", id: "caching", text: "Caching on input identity",
      sub: "The feature that pays, and the one that surprises people" },

    { t: "p", text: "Step caching is the addition most likely to change how a pipeline feels to work with. The key is a hash of the step's inputs, parameters and container image; if a step has been run with that exact key before, its recorded output is reused and the step does not execute." },

    { t: "p", text: "The consequence is that iterating on a late step becomes cheap. Change the gate's threshold and re-run the pipeline, and ingest, validate, features and train are all cache hits — you pay only for the step you changed. That is the same economics as lesson 3.1's CACHED ingests, except keyed on content so it works across runs and across people." },

    { t: "callout", kind: "trap", title: "Content-keyed caching is only as honest as the key",
      body: [
        { t: "p", text: "A step that reads something the runtime does not know about — a warehouse table by name, an environment variable, the current date — has inputs outside its cache key. It will be treated as a hit when the underlying data has changed, and serve a stale artifact silently." },
        { t: "p", text: "This is lesson 1.3's point again: a data version has to be identified by content. If `ingest` takes `as_of` as a parameter it caches correctly; if it takes nothing and reads *the latest partition*, the cache becomes a liar. The rule is that **every input a step depends on must be a declared input**, and anything else is a bug waiting for someone to re-run a pipeline and get yesterday's answer." }
      ] },

    { t: "diagram", kind: "matrix", id: "dg-3_5-03-0",
      title: "The four additions, and what each costs",
      caption: "Every row is a real gain with a real price. **Three of the four prices are paid per step and per run**, which is why these services suit heavyweight pipelines and feel absurd on a five-minute one.",
      rows: ["Step as a container", "Typed artifacts", "Content-keyed caching", "Automatic lineage"],
      cols: ["What it buys", "What it costs"],
      cells: [
        [{ text: "incompatible deps per step; isolation", tone: "good" }, { text: "image build + pull + start, per step", tone: "crit" }],
        [{ text: "wiring errors caught at compile time", tone: "good" }, { text: "the SDK's type system in your code", tone: "warn" }],
        [{ text: "iterate on a late step for free", tone: "good" }, { text: "silently stale if an input is undeclared", tone: "crit" }],
        [{ text: "1.2's fingerprints as a by-product", tone: "good" }, { text: "the metadata store is now a dependency", tone: "warn" }]
      ] },

    { t: "h2", n: "04", id: "cost", text: "The container tax",
      sub: "What a step costs before it does anything" },

    { t: "p", text: "Making every step a container is the addition with the largest and least-discussed cost, because it is paid per step on every cache miss: schedule a pod, pull an image if it is not cached on the node, start a Python interpreter, import the libraries, then begin work." },

    { t: "p", text: "Lesson 2.1 measured the tail of that sequence on this machine — **2.82 seconds** for uvicorn to import scikit-learn, train a small model and become ready — and that was with no scheduling, no image pull and no container at all. A managed step adds pod scheduling and, on a cold node, an image pull of hundreds of megabytes." },

    { t: "callout", kind: "tradeoff", title: "The overhead is fixed, so the ratio is what matters",
      body: [
        { t: "p", text: "A seven-step pipeline whose steps each run for twenty minutes will not notice the per-step overhead. The same seven steps each running for four seconds are mostly overhead, and splitting a fast pipeline into fine-grained components makes it slower and no more reliable." },
        { t: "p", text: "The useful question before decomposing a pipeline is **what does this boundary buy** — a different dependency set, an independent retry, a cache point you will actually hit, or a step someone else reuses. If the answer is none of those, the boundary is costing you a container start for tidiness." }
      ] },

    { t: "h2", n: "05", id: "choose", text: "Managed, self-hosted, or neither",
      sub: "The decision, from the trade-offs" },

    { t: "p", text: "The three services differ less than their documentation suggests. All three are a DAG of containerised steps with typed artifacts, caching and a lineage store; the differences are in which cloud's identity and storage they assume, and how much of the control plane you operate." },

    { t: "table",
      head: ["", "Vertex AI Pipelines", "Kubeflow Pipelines", "SageMaker Pipelines"],
      rows: [
        ["You operate", "nothing — serverless", "a Kubernetes cluster, or it is on GKE/EKS", "nothing — serverless"],
        ["Authoring SDK", "KFP SDK (same as Kubeflow)", "KFP SDK", "SageMaker SDK, a different model"],
        ["Portability", "KFP spec is portable; the runtime is not", "the most portable of the three", "the least portable"],
        ["Lineage store", "Vertex ML Metadata", "MLMD, yours to run", "SageMaker Lineage"],
        ["Pays off when", "you are on GCP and want no control plane", "you already run Kubernetes and want portability", "you are on AWS and use its training jobs"]
      ] },

    { t: "diagram", kind: "steps", id: "dg-3_5-05-0",
      title: "Deciding, in the order the questions actually arrive",
      caption: "The first question is the one that most often ends the discussion. **A pipeline that runs nightly in twenty minutes on one machine does not need any of this**, and adopting it buys an SDK, a metadata store and a container tax.",
      items: [
        { label: "Do the steps need different dependency sets?", desc: "If one interpreter serves the pipeline, containers per step are overhead. Usually this ends it." },
        { label: "Will the cache actually be hit?", desc: "Only if every input is declared. An ingest reading 'the latest partition' makes the cache lie." },
        { label: "Is lineage a requirement or a nicety?", desc: "For an auditor, automatic lineage is worth real money. Otherwise 1.2's run record is enough." },
        { label: "Who operates the control plane?", desc: "Serverless (Vertex, SageMaker) trades portability for having nobody on call for the scheduler. Kubeflow is the reverse." }
      ] },

    { t: "p", text: "And the honest default: for a single team with a nightly retrain that fits on one machine, **lesson 3.1's scheduler plus lesson 1.2's run record is enough**, and it is a dependency you can read in an afternoon. The managed services earn their place when steps genuinely need different environments, when a cache hit saves tens of minutes, when several teams share components, or when lineage is an audit requirement rather than good practice." },

    { t: "exercise", kind: "practice", title: "Price the boundaries in your own pipeline", difficulty: "intro", minutes: 25,
      prompt: "Take your retraining pipeline and write down, per step, two numbers: how long it runs, and what its startup overhead would be as a separate container — image pull if cold, pod scheduling, interpreter and imports. Use lesson 2.1's 2.82 seconds as a floor for the import-and-load part. Then compute the overhead as a fraction of total runtime, and identify any step whose boundary exists only for tidiness. Separately, list every input each step reads and mark the ones that are not declared parameters — those are the inputs that would make content-keyed caching lie to you.",
      hints: [
        "A step reading 'the latest partition' rather than an as_of parameter is the classic undeclared input.",
        "Environment variables and the current date are inputs too, and neither is in a cache key.",
        "If the overhead fraction is above about a fifth, the decomposition is costing more than it buys."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual finding is that two or three steps are seconds of work wrapped in a container start, and merging them loses nothing — the boundary was drawn for readability, which a function already provides." },
          { t: "p", text: "The undeclared-input list is the more valuable output. Each entry is a case where a re-run can silently reuse a stale artifact, and the fix is the same one lesson 1.3 argued for: identify the data by content or by an explicit as-of parameter, never by 'latest'." }
        ]
      } }

  ],

  takeaways: [
    "**Nothing in this lesson was executed** — no cloud credential and no cluster is reachable from the authoring machine, so these are vendor interfaces and attributed trade-offs, not measurements.",
    "**Four additions over a bare scheduler**: a step is a container, inputs and outputs are typed artifacts, steps cache on input identity, and lineage is recorded rather than written.",
    "**Typed artifacts move wiring errors to compile time** — passing a Model where a Dataset is expected fails before anything runs, like 3.1's cycle detection.",
    "**The runtime owns the paths.** `model.path` is supplied, so a step cannot write to the wrong place and a path is not part of your code.",
    "**Thread the logical date through as a parameter** (`as_of`), which is 3.1's rule: no `now()` anywhere, so backfill works.",
    "**Content-keyed caching lets you iterate on a late step for free** — change the gate and ingest/validate/features/train are all hits.",
    "**A step with an undeclared input makes the cache lie.** Reading 'the latest partition' rather than an `as_of` parameter serves a stale artifact silently.",
    "**The container tax is paid per step per cache miss**: pod scheduling, image pull, interpreter start, imports — against lesson 2.1's 2.82 s floor for just import-and-load.",
    "**The overhead is fixed, so the ratio decides.** Twenty-minute steps will not notice; four-second steps are mostly overhead.",
    "**Only draw a step boundary that buys something** — a different dependency set, an independent retry, a cache point you will hit, or reuse by another team.",
    "**The three services differ mainly in which cloud they assume and who runs the control plane**; Vertex and SageMaker are serverless, Kubeflow is the portable one you operate.",
    "**For one team with a nightly retrain that fits on a machine, 3.1's scheduler plus 1.2's run record is enough** — and is a dependency you can read in an afternoon."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A managed pipeline caches steps on input identity. Your ingest step reads 'the latest partition' of a warehouse table and takes no parameters. What happens on a re-run after new data lands?",
        options: [
          "The step re-runs, because the underlying table changed",
          "The step is a cache hit and the pipeline silently reuses the old data — the table version is an input that is not in the cache key",
          "The cache is invalidated automatically on any upstream table change"
        ],
        answer: 1,
        why: "The cache key covers declared inputs, parameters and the image. Reading 'latest' makes the real input invisible to the runtime, so you get yesterday's answer with no error — lesson 1.3's argument for identifying data by content, arriving as a caching bug."
      },
      {
        stem: "When is making every pipeline step a separate container a poor trade?",
        options: [
          "Whenever you are not on Kubernetes",
          "When the steps are short relative to the startup cost — pod scheduling, image pull, interpreter and imports are paid per step per cache miss, against a floor of seconds",
          "When steps need different library versions"
        ],
        answer: 1,
        why: "The overhead is fixed per step, so it is the ratio to step runtime that matters: twenty-minute steps absorb it invisibly, four-second steps are mostly overhead. The third option is the strongest reason *for* containers per step, not against."
      },
      {
        stem: "What does a typed artifact (`Input[Dataset]`, `Output[Model]`) give you over passing a file path?",
        options: [
          "Faster I/O, because the runtime optimises artifact storage",
          "Wiring errors caught at compile time plus runtime-owned paths, so a step cannot be connected to the wrong kind of output or write to the wrong place",
          "Automatic schema validation of the data inside the artifact"
        ],
        answer: 1,
        why: "The third option is a common misreading: the type describes the artifact's role, not its contents, so data validation remains your job — lesson 1.5's checks still have to run. The real gains are compile-time wiring safety and not owning the paths."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What does Kubeflow or Vertex Pipelines give you that Airflow does not?",
        strong: "Four things, on top of the scheduling both do. Each step is a container, so steps can have incompatible dependencies. Inputs and outputs are typed artifacts rather than file paths, so wiring a model into a step expecting a dataset fails at compile time and the runtime owns the storage paths. Steps are cached on input identity, so changing a late step and re-running costs only that step. And lineage is recorded by the runtime rather than written by you, because it owns the artifacts. The price is a container start per step per cache miss and a loss of portability, which is why these suit heavyweight pipelines and feel absurd on a five-minute one.",
        answer: [
          { t: "p", text: "Naming the four additions and then the price is the complete answer. Many candidates describe them as 'ML-native Airflow', which is a brand distinction rather than a technical one." },
          { t: "p", text: "The caching point is the one practitioners feel most, so leading with the iterate-on-a-late-step benefit tends to land." }
        ]
      },
      {
        level: "senior",
        q: "When would you not use a managed pipeline service?",
        strong: "When the steps share one dependency set, when the pipeline is short enough that per-step container startup is a meaningful fraction of runtime, and when lineage is good practice rather than an audit requirement. For one team with a nightly retrain that fits on a machine, a small scheduler plus a run record carrying the data, code and environment fingerprints gets you dependency order, failure propagation, idempotency, retries and backfill — I have written that in about sixty lines — and it is a dependency you can read in an afternoon rather than an SDK, a metadata store and a control plane. I would also be wary of adopting one for the caching before checking that every step's inputs are declared, because a step that reads 'the latest partition' turns content-keyed caching into something that silently serves stale artifacts.",
        answer: [
          { t: "p", text: "Being willing to argue against the sophisticated option, with a concrete account of what the simple one already provides, is what makes this senior." },
          { t: "p", text: "The undeclared-input caveat is the detail that shows operational experience: it is the way caching actually bites people, and it is not in anyone's getting-started guide." }
        ]
      }
    ]
  }
});
