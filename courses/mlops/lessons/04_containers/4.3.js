EC.receiveLesson({
  id: "4.3",

  lede: "A serving image written line by line, with every choice costed from the measurements in 4.2. The two decisions that dominate are the base image and what goes in `requirements.txt`: a serving stack of numpy, scipy and scikit-learn is **186.3 MB** of dependencies, and leaving torch in the file adds **446.7 MB** — 2.4 times the whole serving stack — for a model that never imports it. Then the question nobody settles cleanly: whether the model artifact belongs **in** the image. Baking it in makes the image the complete, immutable unit; pulling it at startup lets you change models without a rebuild. Both are defensible, and the choice determines what *rollback* means.",

  objectives: [
    "Write a multi-stage Dockerfile for a model service and justify each line",
    "Choose a base image from what the dependencies actually need to compile",
    "Decide whether the model artifact is baked in, pulled at startup, or mounted",
    "Get `CMD` versus `ENTRYPOINT` right, and understand why it decides signal delivery"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", id: "base", text: "The base image",
      sub: "slim, alpine, or distroless" },

    { t: "p", text: "Four realistic choices, and the right one depends on whether your dependencies ship compiled wheels." },

    { t: "table",
      head: ["Base", "Roughly", "For a Python ML service"],
      rows: [
        ["python:3.11", "~1 GB", "Full Debian with a build toolchain. Convenient, and most of it is never used at run time."],
        ["python:3.11-slim", "~150 MB", "The usual right answer. Debian without the toolchain; manylinux wheels install fine."],
        ["python:3.11-alpine", "~50 MB", "musl libc, so manylinux wheels do not apply — numpy and scipy compile from source, slowly, or fail."],
        ["distroless / scratch", "~20 MB + deps", "No shell, no package manager. Smallest and hardest to debug; a multi-stage target, not a build base."]
      ] },

    { t: "callout", kind: "trap", title: "Alpine is usually the wrong choice for ML, and for a specific reason",
      body: [
        { t: "p", text: "Alpine uses musl rather than glibc, and the Python wheel ecosystem's binary compatibility tag — `manylinux` — is glibc-based. So `pip install scipy` on alpine does not find a compatible wheel and attempts to build from source, which needs a Fortran compiler, BLAS headers and considerable patience, and often fails." },
        { t: "p", text: "The base saves perhaps 100 MB against `slim` while adding a toolchain to the build and a long compile. Lesson 4.2 measured scipy alone at **112.7 MB** installed; building it rather than downloading a wheel is not a trade worth making to save less than that." }
      ] },

    { t: "h2", n: "02", id: "multistage", text: "The Dockerfile, with reasons",
      sub: "Multi-stage, and why" },

    { t: "code", lang: "dockerfile", title: "A serving image for the loan model",
      code: `# ---- build stage: has a compiler, is not shipped -------------------------
FROM python:3.11-slim AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update \\
 && apt-get install -y --no-install-recommends build-essential \\
 && rm -rf /var/lib/apt/lists/*

# A virtualenv so the whole dependency tree is one copyable directory.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# The narrow cache key, before the expensive layer (lesson 4.2).
COPY requirements-serve.txt .
RUN pip install -r requirements-serve.txt

# ---- runtime stage: no compiler, no apt lists, no build cache ------------
FROM python:3.11-slim AS runtime

# A non-root user, created before anything is copied so ownership is right.
RUN useradd --create-home --uid 10001 appuser

COPY --from=build /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    OMP_NUM_THREADS=2 \\
    MODEL_VERSION=loan-approval:4d8e8c10a2bb

# Source last: the layer that changes every build, and it is 0.03 MB.
COPY --chown=appuser:appuser src/ ./src/

USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=3 \\
  CMD python -c "import urllib.request,sys; \\
  sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz').status==200 else 1)"
ENTRYPOINT ["python", "-m", "uvicorn", "src.app:app", \\
            "--host", "0.0.0.0", "--port", "8000"]` },

    { t: "p", text: "Ten decisions in that file are deliberate. Taking the ones that are not obvious:" },

    { t: "p", text: "**The build stage installs a compiler and is discarded.** `build-essential` is roughly 200 MB and is needed only if a dependency has no wheel. Because only `/opt/venv` is copied forward, none of it reaches the runtime image — which is the entire point of multi-stage and the reason the pattern exists." },

    { t: "p", text: "**A virtualenv at `/opt/venv` rather than a system install**, so the whole dependency tree is one directory that `COPY --from=build` can move as a unit. Copying site-packages out of a system Python means tracking several paths and getting the console scripts wrong." },

    { t: "p", text: "**`OMP_NUM_THREADS=2` is set explicitly**, because lesson 4.1 established that cgroup limits are not virtualised: without this, numpy's BLAS sizes its thread pool from the node's core count and creates dozens of threads for two cores of quota. It should match the container's CPU limit." },

    { t: "p", text: "**`--start-period=40s` on the health check**, because lesson 2.1 measured uvicorn taking **2.82 seconds** just to import scikit-learn and reach readiness on this machine, and a real image on a cold node also pays the pull. A health check that starts probing immediately restarts the container before it has ever served a request." },

    { t: "h2", n: "03", id: "artifact", text: "Where the model lives",
      sub: "Three answers, and what each makes rollback mean" },

    { t: "p", text: "Notice what the Dockerfile above does *not* do: it never copies a model. That is the decision this section is about, and it has no universally right answer — it trades image immutability against deployment flexibility." },

    { t: "diagram", kind: "matrix", id: "dg-4_3-03-0",
      title: "Three homes for the model artifact",
      caption: "The column that matters is the last one. **Baking the model in makes the image the whole unit, so a rollback is an image tag**; pulling at startup makes the model a separate axis, so a rollback is a config change — which lesson 3.6 wanted to be one command.",
      rows: ["Baked into the image", "Pulled at startup", "Mounted as a volume"],
      cols: ["Cost", "What rollback means"],
      cells: [
        [{ text: "a rebuild and a 164 KB+ push per model", tone: "warn" }, { text: "redeploy the previous image tag", tone: "good" }],
        [{ text: "startup latency; the store is now a dependency", tone: "warn" }, { text: "change a config value, no rebuild", tone: "good" }],
        [{ text: "the volume is state; needs a mount per node", tone: "crit" }, { text: "unclear — who updated the volume, and when?", tone: "crit" }]
      ] },

    { t: "p", text: "**Baked in** is the right default for most teams. The image digest then identifies code *and* model together, which means the environment fingerprint from lesson 1.2 is a single value, and *which model is running* (lesson 15.1) is answerable from the running image. The cost is a rebuild per model, which for a 164 KB artifact is trivial and for a multi-gigabyte one is not." },

    { t: "p", text: "**Pulled at startup** decouples the two, which is genuinely useful when models are large or change far more often than code. The costs are real: startup grows by the download, the object store becomes a hard runtime dependency on every pod start, and the image no longer identifies the behaviour — so the model version must be emitted on every response, as lesson 2.1's endpoint does." },

    { t: "p", text: "**Mounted as a volume** is the one to avoid for serving. The model becomes mutable state outside any versioning, there is no record of who changed it, and the container's behaviour depends on a filesystem it does not describe. It is defensible for a notebook or a batch job reading a shared model, not for an endpoint." },

    { t: "callout", kind: "good", title: "Whichever you choose, the version must be in the response",
      body: [
        { t: "p", text: "Baked-in makes the image digest sufficient in principle, but a response header is still what an incident needs — the person diagnosing it has a prediction, not a pod. Lesson 2.1's `X-Model-Version` and the `model_version` field exist for exactly this, and the id should be the `run_id` from lesson 1.2 so one prediction traces back to params, data hash and environment." }
      ] },

    { t: "h2", n: "04", id: "entrypoint", text: "CMD, ENTRYPOINT and signals",
      sub: "The form decides whether your process gets SIGTERM" },

    { t: "p", text: "`ENTRYPOINT` is the thing that runs; `CMD` is its default arguments, which a `docker run` argument replaces. That much is in every tutorial. The consequential part is the difference between the two *forms*, and it is not about arguments at all." },

    { t: "code", lang: "dockerfile", title: "Two forms, two completely different processes",
      code: `# exec form: argv, no shell. uvicorn is pid 1 and receives SIGTERM.
ENTRYPOINT ["python", "-m", "uvicorn", "src.app:app"]

# shell form: becomes /bin/sh -c "...". The SHELL is pid 1.
ENTRYPOINT python -m uvicorn src.app:app` },

    { t: "p", text: "In shell form, `/bin/sh` is pid 1 and your server is its child. `docker stop` and Kubernetes send **SIGTERM to pid 1**, and `sh` does not forward it. So the server never learns it is being shut down, the grace period elapses — 10 seconds for `docker stop`, 30 in Kubernetes by default — and then everything receives SIGKILL." },

    { t: "p", text: "The visible consequence is in-flight requests dropped on every deploy. Which makes this the mechanism underneath lesson 3.3's rollout strategies: a rolling update is only zero-downtime if the old pod drains, and it cannot drain if its process never hears the signal." },

    { t: "callout", kind: "trap", title: "Always use the exec form, and know what pid 1 owes you",
      body: [
        { t: "p", text: "Lesson 4.1 noted that a container is a process and your app is pid 1. Pid 1 has two obligations an ordinary process does not: it must handle signals it wants to act on (default dispositions are *not* applied to pid 1, so an unhandled SIGTERM is simply ignored), and it must reap orphaned children or they accumulate as zombies." },
        { t: "p", text: "Uvicorn handles SIGTERM properly, so exec form is enough here. If your entrypoint genuinely needs a shell — to expand a variable, say — use `exec` to replace it: `ENTRYPOINT [\"sh\", \"-c\", \"exec python -m uvicorn ...\"]`. For processes that spawn children and do not reap, `--init` or `tini` supplies a real pid 1." }
      ] },

    { t: "h2", n: "05", id: "checklist", text: "The production checklist",
      sub: "What each line is defending against" },

    { t: "diagram", kind: "steps", id: "dg-4_3-05-0",
      title: "The five that matter most, with the failure each prevents",
      caption: "Ordered by how often each one bites. **The first two are measured in this course**; the rest are mechanism from 4.1 and 4.5.",
      items: [
        { label: "Serving requirements, separate from training", desc: "186.3 MB against 633 MB: torch is 446.7 MB and 2.4x the sklearn serving stack, for a model that never imports it." },
        { label: "Install before COPY, narrow copies, a .dockerignore", desc: "Lesson 4.2: 7,346x the work per edit, and a context of 414.2 MB against 0.188 MB." },
        { label: "Non-root user, created in the runtime stage", desc: "Lesson 4.5's surface. Root in a container is root on a shared kernel if anything escapes." },
        { label: "Exec-form ENTRYPOINT, explicit thread counts", desc: "Shell form means sh is pid 1 and SIGTERM is dropped, so every deploy sheds in-flight requests." },
        { label: "A health check that touches the model, with a start period", desc: "40 s against the 2.82 s import measured in 2.1, plus the pull. A check ignoring the model is a lie." }
      ] },

    { t: "p", text: "Two items that are not in the Dockerfile and belong in the build. **Pin by digest, not by tag** — `FROM python:3.11-slim` resolves to a different image next month, which makes the environment fingerprint from lesson 1.2 a lie; `FROM python:3.11-slim@sha256:...` does not. And **scan the image**, accepting lesson 4.5's limit: a scanner compares package versions against a vulnerability database, so it sees a known-CVE library and does not see a secret you baked into a layer." },

    { t: "exercise", kind: "practice", title: "Rewrite one Dockerfile", difficulty: "core", minutes: 30,
      prompt: "Take a model service Dockerfile you own and make five specific changes, measuring the first two. Split serving requirements from training requirements and sum the site-packages footprint you removed. Move the dependency install above the source copy and copy narrowly. Add a non-root user. Convert the entrypoint to exec form and confirm your server handles SIGTERM — send one and watch whether it drains or is killed. Add a health check that touches the model, with a start period at least as long as your measured import time. Then decide deliberately where your model artifact lives, and write down what rollback means under that choice.",
      hints: [
        "Send SIGTERM by hand (`docker stop` or `kill -TERM 1` inside) and watch the logs: a server that drains logs its shutdown, one that is killed logs nothing.",
        "If the base is alpine and anything compiles from source, try slim and compare build times before defending the choice.",
        "The artifact decision is the one to write down rather than leave implicit, because it silently defines your rollback procedure."
      ],
      solution: {
        body: [
          { t: "p", text: "The requirements split and the install ordering are usually the two biggest wins and both are a few minutes of work. The SIGTERM test is the one that surprises people: shell-form entrypoints are common, and the symptom — dropped requests on every deploy — is usually blamed on the load balancer." },
          { t: "p", text: "The artifact question rarely has a wrong answer, but leaving it undecided does: teams end up with a model baked into an image *and* a volume override in one environment, at which point nobody can say what is serving." }
        ]
      } }

  ],

  takeaways: [
    "**`python:3.11-slim` is the usual right base.** Full python is ~1 GB of mostly-unused toolchain; distroless is a multi-stage target, not a build base.",
    "**Alpine is usually wrong for ML**: musl rather than glibc means manylinux wheels do not apply, so numpy and scipy compile from source — to save less than scipy's own 112.7 MB.",
    "**Multi-stage exists to discard the compiler.** `build-essential` is ~200 MB in the build stage and reaches the runtime image not at all.",
    "**Install into a virtualenv at `/opt/venv`** so the whole dependency tree is one directory `COPY --from=build` can move as a unit.",
    "**Set `OMP_NUM_THREADS` explicitly** to the container's CPU limit, because lesson 4.1 showed cgroup limits are not virtualised and BLAS sizes itself from the node.",
    "**Give the health check a start period** — 40 s against the 2.82 s import measured in 2.1 plus the pull, or the container is restarted before it ever serves.",
    "**Three homes for the model, and the choice defines rollback**: baked in means redeploy a tag, pulled at startup means change a config value, mounted means nobody can say who changed it.",
    "**Baked in is the right default** because the image digest then identifies code and model together; pulled at startup is for large or fast-moving models, at the cost of a runtime dependency on the store.",
    "**Avoid a mounted model for serving** — it is mutable state outside any versioning, with no record of who changed it.",
    "**Emit the model version on every response regardless**, because an incident starts from a prediction, not a pod.",
    "**Use exec-form ENTRYPOINT.** Shell form makes `/bin/sh` pid 1, SIGTERM is not forwarded, the grace period elapses and in-flight requests are dropped on every deploy.",
    "**Pid 1 has no default signal dispositions**, so an unhandled SIGTERM is ignored; it must also reap children, which is what `--init` or `tini` is for.",
    "**Pin the base by digest, not by tag**, or the environment fingerprint from lesson 1.2 is a lie next month."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your service drops in-flight requests on every deployment. The Dockerfile ends `ENTRYPOINT python -m uvicorn src.app:app`. What is wrong?",
        options: [
          "The grace period is too short and should be increased",
          "Shell form makes /bin/sh pid 1, and sh does not forward SIGTERM — so the server never learns it is shutting down and is SIGKILLed when the grace period elapses",
          "uvicorn does not support graceful shutdown and needs gunicorn"
        ],
        answer: 1,
        why: "In shell form the ENTRYPOINT becomes `/bin/sh -c \"...\"`, so the signal goes to the shell rather than the server. The exec form — a JSON array — makes uvicorn pid 1, and it handles SIGTERM properly. This is also why a rolling update cannot be zero-downtime without it."
      },
      {
        stem: "Why is `python:3.11-alpine` usually a poor base for a scikit-learn service?",
        options: [
          "Alpine images lack a Python interpreter suitable for scientific work",
          "Alpine uses musl rather than glibc, so glibc-based manylinux wheels do not apply and numpy and scipy build from source — to save less than scipy's own installed size",
          "Alpine does not support multi-stage builds"
        ],
        answer: 1,
        why: "The saving is around 100 MB against slim, while scipy alone was measured at 112.7 MB installed. Paying a from-source Fortran build, a toolchain in the image, and frequent failures to save less than one dependency's footprint is a poor trade."
      },
      {
        stem: "You pull the model artifact from object storage at container startup instead of baking it in. What have you given up?",
        options: [
          "Nothing — this is strictly better, since models can change without a rebuild",
          "The image digest no longer identifies the behaviour, startup now depends on the object store on every pod start, and the version must be emitted on each response to remain answerable",
          "The ability to roll back, since the previous model is no longer available"
        ],
        answer: 1,
        why: "It is a real trade rather than an upgrade: you gain the ability to change models by configuration — which makes rollback a config change rather than a redeploy — and you lose the single-value identification of code plus model, while adding a hard runtime dependency at every pod start."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Walk me through a Dockerfile for a model serving API.",
        strong: "Multi-stage. A build stage on python:3.11-slim with build-essential and a virtualenv at /opt/venv, installing from a serving-only requirements file — I separate that from training requirements because I measured torch at 447 MB against 186 MB for the whole numpy/scipy/sklearn serving stack, and the model never imports torch. Then a runtime stage on the same slim base that creates a non-root user, copies just /opt/venv forward so the compiler is discarded, sets OMP_NUM_THREADS to the CPU limit because cgroup limits are not virtualised, and copies source last because that is the layer that changes every build. Exec-form ENTRYPOINT so uvicorn is pid 1 and receives SIGTERM, and a health check that actually touches the model with a start period long enough for the import — I measured 2.8 seconds just to import sklearn and become ready.",
        answer: [
          { t: "p", text: "The structure plus a reason per line is the answer; the requirements split and the thread-count variable are the two most ML-specific details and both have measurements attached." },
          { t: "p", text: "Mentioning that only /opt/venv is copied forward shows the point of multi-stage is understood as discarding the toolchain rather than as a stylistic convention." }
        ]
      },
      {
        level: "senior",
        q: "Should the model file be inside the image?",
        strong: "Usually yes, and I would frame it as choosing what rollback means. Baked in, the image digest identifies code and model together, so the environment fingerprint in the run record is a single value and 'which model is serving' is answerable from the running image — and rollback is redeploying the previous tag. Pulled at startup, the two are decoupled, which is right when the model is multi-gigabyte or changes far more often than code; rollback becomes a config change, which is cheaper, but startup now depends on the object store on every pod start and the image no longer identifies behaviour. What I would avoid for serving is a mounted volume: the model becomes mutable state outside any versioning with no record of who changed it. Whichever I choose, the model version goes in the response, because an incident starts from a prediction rather than a pod.",
        answer: [
          { t: "p", text: "Framing it as 'what does rollback mean' is the move that makes this a design answer rather than a preference, and it connects to the one-command-rollback practice." },
          { t: "p", text: "Ruling out the mounted volume with a reason — unversioned mutable state — shows the trade has been thought through rather than enumerated." }
        ]
      }
    ]
  }
});
