/* ============================================================================
   MLOPS & DEPLOYMENT — CURRICULUM
   ----------------------------------------------------------------------------
   The course for the part of the job that starts after the model is accurate.
   A trained model is a file; a deployed model is a system whose behaviour
   changes when the world changes, which is the one thing ordinary software
   deployment does not have to think about.

   Nineteen modules in seven phases:

     Phase 1  The lifecycle        tracking, versioning, feature stores,
                                   validation, serving, monitoring, pipelines
     Phase 2  The platform         containers, Kubernetes, IaC, delivery
     Phase 3  The ground floor     Linux, Git, and the serving protocols
     Phase 4  The cloud            managed platforms, GPUs, spot, cost
     Phase 5  Production issues    drift, latency, skew, scaling, versioning,
                                   observability, experimentation
     Phase 6  Process              SDLC, and how it bends for ML
     Phase 7  LLMOps               what changes when the model is a prompt

   Phase 5 is the heart of the course. The other phases exist so that its six
   incident classes can be read as engineering rather than as folklore.

   On execution: this course is written against what the machine can actually
   run, and says so whenever it cannot. Drift statistics, skew, quantization,
   serving latency, percentile arithmetic, experiment statistics and ONNX
   conversion are all measured here. Docker, Kubernetes, Terraform and the
   cloud platforms are presented rather than executed, because no daemon,
   cluster or account is reachable from the authoring machine — the client
   libraries are installed and introspected, and every figure that comes from
   a vendor rather than from a run is labelled as such.

     Versions pinned at authoring: Python 3.11.3, scikit-learn 1.8.0,
     numpy 2.4.4, pandas 2.3.3, scipy 1.17.1, statsmodels 0.15.0,
     torch 2.10.0+cpu, onnx 1.22.0, onnxruntime 1.30.0, skl2onnx,
     fastapi 0.141.1, uvicorn 0.53.0, httpx 0.28.1, grpcio 1.84.0,
     protobuf 6.33.6, kubernetes 36.0.3 (client only), docker 7.2.0
     (SDK only), kubectl v1.30.6 (client only), prometheus_client.

   Not in this course: training models, which the ML and DL courses cover; the
   maths of evaluation metrics, which belongs to ML; and LLM serving internals
   (KV cache, batching, speculative decoding), which are in GenAI's inference
   module. This course is the operations around them.
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "mlops",
    title: "MLOps & Deployment",
    subtitle: "Shipping, watching and rolling back systems that learn",
    short: "MLOps",
    tagline: "The job after the model is accurate: version it, serve it, watch it drift, and get it back when it breaks — with the drift statistics, the latency percentiles and the skew bugs all measured rather than asserted.",

    blurb: "A model that scores 0.94 offline is not a deployed model. This course covers what stands between the two: experiment tracking and lineage, data and model versioning, feature stores and the point-in-time join that silently leaks labels, containers and Kubernetes, CI/CD that tests data as well as code, and the six incident classes that take ML systems down — drift, latency, training-serving skew, scaling failures, lost reproducibility and blind observability. It ends with LLMOps, where the artifact is a prompt and the index is a deployable.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5"],

    modules: [

      /* ================================================================
         PHASE 1 · THE LIFECYCLE
         ================================================================ */
      {
        id: "lifecycle",
        short: "M1",
        dir: "01_lifecycle",
        phase: "Phase 1 · The lifecycle",
        title: "Tracking, Versioning and the Two Clocks",
        blurb: "Why ML deployment is a different problem from software deployment: the code is one input and the data is another, and only one of them is in your repository. Then the four practices that make a model reproducible — experiment tracking, data and model versioning, a feature store, and validation at the boundary — each built small enough to see the mechanism.",
        outcome: "You can state what must be recorded for a model to be reproducible, build a tracking store and a content-addressed data version by hand, and name the join that leaks labels into a training set.",
        lessons: [
          { id: "1.1", title: "The Two Clocks", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Ordinary software fails when its code changes; an ML system fails when its data changes, and nothing in the repository records that. A model is measured here as its input distribution shifts, with the accuracy fall and the silence that accompanies it.",
            keywords: ["mlops", "model decay", "data drift", "deployment", "two clocks", "stale model"] },
          { id: "1.2", title: "Experiment Tracking, Built Small", difficulty: "core", minutes: 32, tier: "must",
            summary: "What a tracking store is for, demonstrated by writing one: run ids, params, metrics, artifacts and the lineage triple. Then the same sweep read back to answer the question that motivates all of it — which run produced the model now in production. MLflow and Weights & Biases are mapped onto the parts.",
            keywords: ["experiment tracking", "mlflow", "weights and biases", "run id", "params", "metrics", "artifacts", "lineage"] },
          { id: "1.3", title: "Versioning Data and Models", difficulty: "core", minutes: 30, tier: "must",
            summary: "Why git is the wrong store for a 2 GB parquet file, measured; content-addressed storage and the pointer file that makes it work; and the three hashes — data, code, environment — that a model artifact has to carry to be reproducible at all.",
            keywords: ["dvc", "data versioning", "content addressed", "hash", "lfs", "reproducibility", "lineage", "model registry"] },
          { id: "1.4", title: "Feature Stores and the Point-in-Time Join", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The offline/online split, and the bug a feature store exists to prevent: a naive join that gives the training set a feature value from after the label was known. Both joins are run on the same frame, and the leak is measured as the accuracy it invents.",
            keywords: ["feature store", "point in time", "label leakage", "offline", "online", "feast", "parity", "as-of join"] },
          { id: "1.5", title: "Validation at the Boundary", difficulty: "core", minutes: 28, tier: "should",
            summary: "A schema and distribution check at ingestion, written and run against a corrupted batch: types, ranges, nullability, cardinality and distribution. Which failures should block a pipeline and which should only warn, and why a silent coercion is worse than a crash.",
            keywords: ["data validation", "great expectations", "schema", "pandera", "nulls", "cardinality", "fail fast", "ingestion"] }
        ]
      },

      {
        id: "serving",
        short: "M2",
        dir: "02_serving",
        phase: "Phase 1 · The lifecycle",
        title: "Serving, Monitoring and Compression",
        blurb: "Getting the model behind an endpoint, knowing what it is doing there, and making it cheaper. The serving patterns compared on the axis that decides between them, a monitoring stack that separates the four things that can go wrong, and compression measured on a real model rather than quoted.",
        outcome: "You can choose between online, batch and streaming serving from the latency and freshness requirements, say what a monitoring stack must emit for an incident to be diagnosable, and quantify what quantization costs in accuracy and buys in size.",
        lessons: [
          { id: "2.1", title: "Four Ways to Serve a Model", difficulty: "core", minutes: 30, tier: "must",
            summary: "Online, batch, streaming and embedded, separated by the question each answers rather than by the tool. A real FastAPI endpoint around a trained model, with the three things a prediction response should carry and the model-version header that makes an incident traceable.",
            keywords: ["model serving", "fastapi", "online", "batch", "streaming", "embedded", "endpoint", "model version"] },
          { id: "2.2", title: "What to Monitor, and in Which Order", difficulty: "core", minutes: 30, tier: "must",
            summary: "The four layers of an ML monitoring stack — infrastructure, traffic, data and model — and why teams buy the fourth and neglect the third. The metrics each layer emits, and the delay that makes model quality the slowest signal you have.",
            keywords: ["monitoring", "observability", "four layers", "slo", "latency", "data quality", "model quality", "feedback delay"] },
          { id: "2.3", title: "Compression: Quantization and Distillation", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "A model converted to ONNX and quantized, with size, latency and accuracy all measured on the same inputs before and after. Distillation and pruning described against the same baseline, and the honest answer to when compression is not worth it.",
            keywords: ["quantization", "onnx", "onnxruntime", "distillation", "pruning", "int8", "model size", "latency"] }
        ]
      },

      {
        id: "pipelines",
        short: "M3",
        dir: "03_pipelines",
        phase: "Phase 1 · The lifecycle",
        title: "Orchestration, CI/CD and Rollout",
        blurb: "The pipeline that retrains the model and the pipeline that ships it are different pipelines with different triggers, and conflating them is a common and expensive mistake. Orchestration as a DAG, a CI pipeline that tests data as well as code, and the four rollout strategies with the failure each one is designed to contain.",
        outcome: "You can draw the retraining DAG and the delivery pipeline separately, say what a CI run on an ML repo must assert beyond unit tests, and choose a rollout strategy from the blast radius you are willing to accept.",
        lessons: [
          { id: "3.1", title: "Orchestration as a DAG", difficulty: "core", minutes: 30, tier: "must",
            summary: "Why retraining is a directed graph of tasks rather than a script: idempotency, retries, backfills and the difference between a schedule and a trigger. A small scheduler executed on a real task graph, including what happens to the downstream tasks when one node fails.",
            keywords: ["airflow", "orchestration", "dag", "idempotency", "backfill", "retry", "prefect", "dagster", "trigger"] },
          { id: "3.2", title: "CI/CD for a Model, Not a Binary", difficulty: "core", minutes: 32, tier: "must",
            summary: "The stages an ML pipeline adds to an ordinary one: data validation, training reproducibility, a model quality gate against the incumbent, and skew tests. Executed as a real gate that rejects a candidate model, with the threshold arithmetic that decides it.",
            keywords: ["ci/cd", "github actions", "quality gate", "champion challenger", "model test", "pipeline", "promotion"] },
          { id: "3.3", title: "Rollout: Blue-Green, Canary, Shadow", difficulty: "core", minutes: 32, tier: "must",
            summary: "Four strategies and the failure each contains: blue-green for a bad binary, canary for a bad model, shadow for an unmeasured one, and a feature flag for a bad decision. The traffic arithmetic of a canary, and how long one has to run before its numbers mean anything.",
            keywords: ["blue green", "canary", "shadow deployment", "rollback", "traffic split", "feature flag", "progressive delivery"] },
          { id: "3.4", title: "Reproducibility in Practice", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Seeds, environment pinning, hardware non-determinism and the limits of all three — measured, including a case where the same seed and the same data give different weights. What reproducibility actually means in a world with non-deterministic kernels.",
            keywords: ["reproducibility", "seed", "determinism", "pinning", "lockfile", "docker digest", "cudnn", "non-determinism"] },
          { id: "3.5", title: "Managed Pipelines: Kubeflow and Vertex", difficulty: "core", minutes: 28, tier: "could",
            summary: "What a managed pipeline service adds over a scheduler and what it takes away: components, artifacts, caching and lineage against portability and cost. Presented from the vendor interfaces rather than executed, and labelled as such.",
            keywords: ["kubeflow", "vertex pipelines", "components", "artifact", "caching", "sagemaker pipelines", "managed"] },
          { id: "3.6", title: "The Practices That Survive Contact", difficulty: "core", minutes: 26, tier: "should",
            summary: "The short list worth arguing for: one path from feature code to both consumers, a model registry with a promotion gate, a rollback that is one command, alerting on inputs rather than only on outputs, and a runbook per incident class.",
            keywords: ["best practices", "runbook", "registry", "rollback", "promotion", "checklist", "on-call"] }
        ]
      },

      /* ================================================================
         PHASE 2 · THE PLATFORM
         ================================================================ */
      {
        id: "containers",
        short: "M4",
        dir: "04_containers",
        phase: "Phase 2 · The platform",
        title: "Containers and Images",
        blurb: "The unit of deployment. What an image is made of and why the layer order decides your build time, a Dockerfile for a model service that does not ship the training set, Compose for the dependencies a service needs locally, and the security surface a container hands its host.",
        outcome: "You can write a multi-stage Dockerfile whose cache survives a code change, explain the difference between a bind mount and a volume, and name what a container does not isolate.",
        lessons: [
          { id: "4.1", title: "What a Container Actually Is", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Namespaces, cgroups and a shared kernel — the three facts that explain every difference between a container and a virtual machine, including the ones that matter for ML: GPU access, shared memory and the page cache.",
            keywords: ["docker", "container", "namespace", "cgroup", "vm", "kernel", "isolation", "oci"] },
          { id: "4.2", title: "Images, Layers and the Build Cache", difficulty: "core", minutes: 30, tier: "must",
            summary: "An image as a stack of content-addressed layers, and the single ordering rule that follows from it: install dependencies before copying source. The cache arithmetic of a one-line code change, and why COPY . . near the top costs you every build.",
            keywords: ["image", "layer", "build cache", "digest", "dockerfile", "copy", "invalidation", "tag"] },
          { id: "4.3", title: "A Dockerfile for a Model Service", difficulty: "core", minutes: 32, tier: "must",
            summary: "A real service image written line by line: base image choice, non-root user, dependency pinning, the model artifact question, CMD against ENTRYPOINT, and .dockerignore. Multi-stage, with the size difference computed.",
            keywords: ["dockerfile", "multi-stage", "slim", "non-root", "entrypoint", "cmd", "dockerignore", "image size"] },
          { id: "4.4", title: "Networking, Volumes and Compose", difficulty: "core", minutes: 30, tier: "should",
            summary: "How two containers find each other, why a bind mount is a development tool and a volume is a production one, and a Compose file for the stack a model service needs: API, database, cache. Health checks, depends_on and what it does not wait for.",
            keywords: ["docker compose", "network", "volume", "bind mount", "healthcheck", "depends_on", "service discovery", "env"] },
          { id: "4.5", title: "Container Security", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The surface: root in the container, the docker socket, secrets in layers, base image CVEs and what a scanner does and does not see. The failure where a deleted secret is still in the image, demonstrated by reading a layer.",
            keywords: ["security", "root", "capabilities", "secrets", "layer", "cve", "scanning", "read-only", "docker socket"] }
        ]
      },

      {
        id: "kubernetes",
        short: "M5",
        dir: "05_kubernetes",
        phase: "Phase 2 · The platform",
        title: "Kubernetes for Model Services",
        blurb: "The scheduler most ML services end up on. The object model and the one control loop that explains all of it, the workload types and which one a model server is, requests and limits and the OOMKill they cause, and autoscaling that reacts to the wrong signal.",
        outcome: "You can read a Deployment manifest and say what the control loop will do with it, set requests and limits that do not get your pod killed, and explain why CPU-based autoscaling is wrong for a GPU model server.",
        lessons: [
          { id: "5.1", title: "The Object Model and the Control Loop", difficulty: "core", minutes: 32, tier: "must",
            summary: "Desired state, observed state and the reconciliation loop — then container, pod, node, cluster, and what actually happens between kubectl apply and a running pod. Traced through the API server, etcd, scheduler and kubelet.",
            keywords: ["kubernetes", "control loop", "reconciliation", "pod", "node", "api server", "etcd", "scheduler", "kubelet"] },
          { id: "5.2", title: "Workloads, Services and Ingress", difficulty: "core", minutes: 30, tier: "must",
            summary: "Deployment, StatefulSet, Job and CronJob, and which one a model server, a batch scoring run and a retraining job each are. Then how traffic reaches a pod: Service, kube-proxy, Ingress, and readiness as the gate that keeps a loading model out of the pool.",
            keywords: ["deployment", "statefulset", "job", "cronjob", "service", "ingress", "readiness", "liveness", "endpoints"] },
          { id: "5.3", title: "Requests, Limits and Autoscaling", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "What requests and limits do to scheduling and to the kernel, the OOMKill a wrong limit produces, and the three autoscalers. Why queue depth or in-flight requests beats CPU as a scaling signal for inference, and the cold start that makes HPA too slow for a large model.",
            keywords: ["requests", "limits", "oomkill", "hpa", "vpa", "cluster autoscaler", "cold start", "queue depth", "qos"] },
          { id: "5.4", title: "Config, Secrets and Storage", difficulty: "core", minutes: 26, tier: "should",
            summary: "ConfigMap and Secret and the fact that a Secret is base64, not encrypted; the volume types a model server needs; and where the model artifact should live — baked into the image, pulled at startup, or mounted.",
            keywords: ["configmap", "secret", "pvc", "volume", "storage class", "init container", "model artifact", "rbac"] },
          { id: "5.5", title: "Helm and Deployment Strategies", difficulty: "core", minutes: 28, tier: "should",
            summary: "Templating the same manifests across environments, and what a chart is: values, templates, releases and the upgrade that is not atomic. Then rolling update parameters and how they implement the strategies from 3.3.",
            keywords: ["helm", "chart", "values", "release", "rolling update", "maxsurge", "maxunavailable", "rollback"] }
        ]
      },

      {
        id: "iac",
        short: "M6",
        dir: "06_iac",
        phase: "Phase 2 · The platform",
        title: "Infrastructure as Code and Delivery",
        blurb: "The infrastructure a pipeline runs on, declared in a file. Terraform's state file as the thing that makes it work and the thing that breaks, Ansible for the other half of the problem, a GitHub Actions pipeline for an ML repo, and GitOps as the pattern that makes the cluster match the repository.",
        outcome: "You can say what Terraform state is for and what happens when two people apply at once, choose between Terraform and Ansible from what they each model, and describe how a GitOps controller differs from a deploy step in CI.",
        lessons: [
          { id: "6.1", title: "Terraform and the State File", difficulty: "core", minutes: 30, tier: "must",
            summary: "Declarative provisioning, the plan/apply cycle and the state file that maps config to real resources. Drift between state and reality, locking, and the failure mode where a state file is lost. Providers, modules and the ML resources you actually declare.",
            keywords: ["terraform", "state", "plan", "apply", "drift", "lock", "module", "provider", "idempotent"] },
          { id: "6.2", title: "Ansible, and Where It Fits", difficulty: "core", minutes: 24, tier: "could",
            summary: "Configuration management against provisioning: inventories, playbooks, idempotent modules and agentless SSH. The honest comparison with Terraform, and the cases where you want both.",
            keywords: ["ansible", "playbook", "inventory", "idempotent", "agentless", "configuration management", "terraform"] },
          { id: "6.3", title: "A CI Pipeline for an ML Repository", difficulty: "core", minutes: 30, tier: "must",
            summary: "GitHub Actions concretely: triggers, jobs, matrices, caching, OIDC instead of long-lived keys, and the stage order that fails fastest. The ML-specific jobs, and why the training job does not belong in the PR pipeline.",
            keywords: ["github actions", "workflow", "job", "matrix", "cache", "oidc", "secrets", "runner", "artifact"] },
          { id: "6.4", title: "GitOps with ArgoCD", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Pull instead of push: a controller that reconciles the cluster against a git repository, and what that changes about rollback, audit and credentials. Sync waves, drift detection, and the question of where an image tag gets written.",
            keywords: ["gitops", "argocd", "flux", "reconcile", "pull", "sync", "drift", "declarative", "audit"] }
        ]
      },

      {
        id: "observe",
        short: "M7",
        dir: "07_observability",
        phase: "Phase 2 · The platform",
        title: "Metrics, Logs and Dashboards",
        blurb: "The instrumentation layer underneath everything in Phase 5. Prometheus's pull model and the four metric types, the histogram that lets you compute a percentile and the averaging mistake that invalidates it, structured logs with a correlation id, and what belongs on a dashboard someone is woken up by.",
        outcome: "You can instrument a service with the right metric type, compute a p99 from a histogram and say why you cannot average percentiles, and design an alert that fires on user-visible harm rather than on a resource number.",
        lessons: [
          { id: "7.1", title: "Prometheus: Pull, Series and the Four Types", difficulty: "core", minutes: 30, tier: "must",
            summary: "Scraping instead of pushing, and what that implies for a short-lived job. Counter, gauge, histogram and summary, with the question each answers; labels and the cardinality explosion; and a real metrics endpoint exposed from a model service.",
            keywords: ["prometheus", "pull", "scrape", "counter", "gauge", "histogram", "summary", "labels", "cardinality", "promql"] },
          { id: "7.2", title: "Percentiles, Honestly", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "Why a mean hides the incident, how a histogram bucket approximates a quantile, and the arithmetic showing that the average of two p99s is not a p99. Bucket boundaries chosen badly and the error that results, measured.",
            keywords: ["percentile", "p99", "histogram", "bucket", "quantile", "tail latency", "averaging", "slo"] },
          { id: "7.3", title: "Logs, Traces and the Correlation Id", difficulty: "core", minutes: 26, tier: "should",
            summary: "Structured logging, levels that mean something, the one id that makes a request reconstructible across services, and sampling. What to log around a prediction, and the PII you must not.",
            keywords: ["logging", "structured", "correlation id", "trace", "span", "sampling", "pii", "retention", "loki"] },
          { id: "7.4", title: "Dashboards and Alerts People Trust", difficulty: "core", minutes: 26, tier: "should",
            summary: "The dashboard that answers is it broken, where, and since when. Alerting on symptoms rather than causes, burn-rate alerts against static thresholds, and the arithmetic of an alert that pages twice a night and gets muted.",
            keywords: ["grafana", "dashboard", "alert", "slo", "error budget", "burn rate", "paging", "noise", "runbook"] }
        ]
      },

      /* ================================================================
         PHASE 3 · THE GROUND FLOOR
         ================================================================ */
      {
        id: "linux",
        short: "M8",
        dir: "08_linux_git",
        phase: "Phase 3 · The ground floor",
        title: "Linux and Git for ML Engineers",
        blurb: "The two tools every other tool in this course sits on. The parts of Linux that come up in an incident — permissions, processes, signals, disk, ports — and the parts of Git that come up in a review, including the history-rewriting commands that are safe and the ones that are not.",
        outcome: "You can read a permission string, kill a process without corrupting its output, find what filled a disk, and recover a branch you rewrote.",
        lessons: [
          { id: "8.1", title: "Files, Permissions and Disk", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The filesystem layout that matters, the permission triple and what 755 and 644 mean for a model artifact, ownership, and the disk investigation that finds the checkpoint directory nobody pruned.",
            keywords: ["linux", "permissions", "chmod", "chown", "umask", "df", "du", "inode", "filesystem"] },
          { id: "8.2", title: "Processes, Signals and Services", difficulty: "core", minutes: 30, tier: "must",
            summary: "Process state, memory as the kernel reports it, and the difference between SIGTERM and SIGKILL — which is the difference between a graceful shutdown and a half-written file. Then systemd for a service and cron for a schedule, with the environment trap that breaks cron jobs.",
            keywords: ["process", "signal", "sigterm", "sigkill", "systemd", "cron", "ps", "top", "graceful shutdown", "oom killer"] },
          { id: "8.3", title: "Networking, SSH and the Shell", difficulty: "core", minutes: 28, tier: "should",
            summary: "Finding what is listening on a port and what a connection is doing, SSH keys and port forwarding to a remote notebook, and enough shell scripting to write a wrapper that fails loudly: set -euo pipefail, traps, and quoting.",
            keywords: ["ss", "netstat", "curl", "dns", "ssh", "port forward", "tunnel", "bash", "set -e", "pipefail", "makefile"] },
          { id: "8.4", title: "Git: The Model Underneath", difficulty: "core", minutes: 30, tier: "must",
            summary: "Commits as snapshots, branches as pointers, and the index as the thing that explains the commands. Merge against rebase on the same history, with both results shown, and when each is the right answer on a shared branch.",
            keywords: ["git", "commit", "branch", "index", "merge", "rebase", "fast forward", "head", "dag"] },
          { id: "8.5", title: "Git in an Incident", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The commands you need under pressure: bisect to find the commit that broke accuracy, reflog to recover a rewritten branch, revert against reset, cherry-pick for a hotfix, and the hooks that stop a 2 GB file or an API key from being committed at all.",
            keywords: ["bisect", "reflog", "revert", "reset", "cherry-pick", "stash", "pre-commit", "secrets", "lfs"] }
        ]
      },

      {
        id: "protocols",
        short: "M9",
        dir: "09_protocols",
        phase: "Phase 3 · The ground floor",
        title: "REST and gRPC for Inference",
        blurb: "How a prediction request gets to the model. REST's resource model and its costs, gRPC's contract-first schema and streaming, and a measurement of the serialization and transport difference on prediction-shaped payloads — because the usual claim is quoted far more often than it is checked.",
        outcome: "You can choose a protocol from the payload shape and the caller, state what a proto contract buys over an OpenAPI schema, and quote a serialization overhead you measured rather than one you read.",
        lessons: [
          { id: "9.1", title: "REST, and What It Costs", difficulty: "core", minutes: 26, tier: "must",
            summary: "Resources, verbs, status codes and content negotiation, then the costs for inference specifically: JSON number parsing, the absence of a schema at runtime, and what a float array actually weighs as text. Measured on a real feature vector.",
            keywords: ["rest", "http", "json", "openapi", "status codes", "idempotency", "payload", "serialization"] },
          { id: "9.2", title: "gRPC: Contracts and Streaming", difficulty: "core", minutes: 30, tier: "should",
            summary: "Protocol buffers as a contract and HTTP/2 as the transport: generated stubs, the four call types, and what bidirectional streaming makes possible that REST cannot. Deadlines, status codes and the load-balancing problem a long-lived connection creates.",
            keywords: ["grpc", "protobuf", "http/2", "streaming", "stub", "deadline", "proto", "multiplexing", "load balancing"] },
          { id: "9.3", title: "The Comparison, Measured", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The same prediction payload encoded both ways: bytes on the wire, encode and decode time, and how the gap moves with the size and shape of the feature vector. Then the decision checklist, with the cases where REST is the correct engineering answer.",
            keywords: ["grpc vs rest", "benchmark", "payload size", "latency", "throughput", "gateway", "browser", "decision"] }
        ]
      },

      /* ================================================================
         PHASE 4 · THE CLOUD
         ================================================================ */
      {
        id: "cloud",
        short: "M10",
        dir: "10_cloud",
        phase: "Phase 4 · The cloud",
        title: "Managed Platforms, GPUs and Cost",
        blurb: "What the three big platforms actually give you and what they lock in. Choosing a GPU from the model rather than from the price list, spot instances and the checkpointing that makes them usable, managed training and HPO, endpoints and autoscaling to zero, and where a cloud ML bill really comes from.",
        outcome: "You can size a GPU from a model's memory arithmetic, make a training job survive a spot interruption, and find the line item that dominates an inference bill.",
        lessons: [
          { id: "10.1", title: "The Platform Landscape", difficulty: "core", minutes: 26, tier: "should",
            summary: "SageMaker, Vertex AI and Azure ML mapped onto the same lifecycle, so the comparison is about the pieces rather than the brochures. What is genuinely differentiated, what is a renamed equivalent, and the portability cost of each.",
            keywords: ["sagemaker", "vertex ai", "azure ml", "databricks", "platform", "lock-in", "managed", "comparison"] },
          { id: "10.2", title: "Sizing a GPU", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The memory arithmetic that decides the instance: parameters, gradients, optimizer state and activations, computed for real model sizes. Then the instance families, what the numbers mean, and the check that tells you whether you are compute-bound or memory-bound.",
            keywords: ["gpu", "vram", "memory", "a100", "t4", "batch size", "mixed precision", "compute bound", "instance type"] },
          { id: "10.3", title: "Spot Instances and Checkpointing", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Why spot is 60-90% cheaper and what it demands in return: a two-minute warning, checkpoint frequency chosen against interruption rate, and a resume path that is actually tested. The arithmetic of when spot is cheaper in wall-clock terms too.",
            keywords: ["spot", "preemptible", "interruption", "checkpoint", "resume", "savings plan", "reserved", "cost"] },
          { id: "10.4", title: "Managed Training, HPO and Endpoints", difficulty: "core", minutes: 28, tier: "should",
            summary: "Handing a training job to the platform: containers, channels, artifacts and the hyperparameter search strategies with their sample budgets. Then endpoints — real-time, serverless, async and batch transform — and autoscaling with a cold start.",
            keywords: ["managed training", "hpo", "bayesian", "early stopping", "endpoint", "serverless", "async", "batch transform", "autoscaling"] },
          { id: "10.5", title: "Where the Bill Comes From", difficulty: "core", minutes: 26, tier: "should",
            summary: "The line items that dominate an ML bill in practice — idle endpoints, egress, storage classes, notebook instances left running — and the three changes that reduce it most. Tagging and showback so the number has an owner.",
            keywords: ["cost", "egress", "idle", "storage class", "tagging", "showback", "rightsizing", "finops", "budget alert"] },
          { id: "10.6", title: "Governance, Access and Data Residency", difficulty: "core", minutes: 26, tier: "could",
            summary: "The controls an audit asks for: least-privilege roles for a training job, encryption at rest and in transit, private networking, audit logs, lineage, and the residency constraint that decides a region before anything else does.",
            keywords: ["iam", "least privilege", "encryption", "kms", "vpc", "audit log", "residency", "gdpr", "governance"] }
        ]
      },

      /* ================================================================
         PHASE 5 · PRODUCTION ISSUES
         ================================================================ */
      {
        id: "drift",
        short: "M11",
        dir: "11_drift",
        phase: "Phase 5 · Production issues",
        title: "Incident 1: Drift and Degradation",
        blurb: "The failure that has no exception and no error rate: the model is fine, the world moved. The four things people call drift separated by which probability changed, three detection statistics computed on the same shift, and the detector-threshold problem that makes most drift alerting useless.",
        outcome: "You can say which distribution changed from the symptom, choose between PSI, KS and a chi-square test knowing what each is sensitive to, and set a threshold that survives a large sample size.",
        lessons: [
          { id: "11.1", title: "Four Things Called Drift", difficulty: "core", minutes: 30, tier: "must",
            summary: "P(X), P(Y|X), P(Y) and the pipeline, separated on one running example, because the mitigation differs completely: retraining fixes one of them, and nothing about retraining fixes another. Each shift simulated and measured.",
            keywords: ["data drift", "concept drift", "label drift", "covariate shift", "prior shift", "feature drift", "p(y|x)"] },
          { id: "11.2", title: "Detecting It: PSI, KS and Chi-Square", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Three statistics computed on the same shifts, with the result that matters: on 5,000 samples the KS p-value screams at a shift PSI calls negligible. Binning choices, the n-dependence of a p-value, and why PSI's 0.1/0.25 thresholds are conventions rather than theory.",
            keywords: ["psi", "ks test", "chi-square", "kl divergence", "wasserstein", "threshold", "p-value", "sample size", "binning"] },
          { id: "11.3", title: "Three Shapes of Degradation", difficulty: "core", minutes: 28, tier: "must",
            summary: "Gradual decay, a sudden drop and a seasonal cycle, each with its own signature in the monitoring data and its own correct response. The seasonal case is the one that gets retrained unnecessarily; the arithmetic shows why.",
            keywords: ["gradual", "sudden", "seasonal", "degradation", "retraining", "baseline", "window", "false alarm"] },
          { id: "11.4", title: "Responding: Retrain, Reweight, Roll Back", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The response ladder: scheduled retraining, triggered retraining, recency weighting, online learning and a shadow model. What each costs, and the label delay that determines whether any of them is even available yet.",
            keywords: ["retraining", "trigger", "recency weighting", "online learning", "shadow", "label delay", "feedback loop", "rollback"] }
        ]
      },

      {
        id: "latency",
        short: "M12",
        dir: "12_latency",
        phase: "Phase 5 · Production issues",
        title: "Incident 2: Latency and Throughput",
        blurb: "The p99 is 40x the median and nobody can say why. Where inference time actually goes, measured; the three classic causes — cold start, queueing and a feature fetch — separated; and the optimisations in the order their payoff justifies, which is not the order people try them in.",
        outcome: "You can decompose a request's latency into its stages from a measurement, identify queueing from the shape of the distribution, and say which optimisation to try first for a given bottleneck.",
        lessons: [
          { id: "12.1", title: "Where the Time Goes", difficulty: "core", minutes: 30, tier: "must",
            summary: "One prediction request measured stage by stage: deserialize, fetch features, transform, infer, serialize. The result is usually surprising — inference is rarely the largest term — and it determines everything you do next.",
            keywords: ["latency", "profiling", "breakdown", "inference time", "feature fetch", "serialization", "overhead", "p50"] },
          { id: "12.2", title: "Cold Starts and Queueing", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Two causes of a tail that look identical on a dashboard and need opposite fixes. A cold start measured on first load; then queueing, with the utilisation arithmetic showing why latency explodes past about 70% and why adding a replica beats optimising the model.",
            keywords: ["cold start", "queueing", "utilisation", "little's law", "tail latency", "p99", "concurrency", "warm pool"] },
          { id: "12.3", title: "Batching, Caching and the Memory Ceiling", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Dynamic batching and the throughput-latency trade it makes, measured; a prediction cache and the hit rate that justifies it; and the memory leak that reads as a latency problem for a day before it reads as an OOM.",
            keywords: ["batching", "dynamic batching", "cache", "hit rate", "memory leak", "oom", "throughput", "rss", "gc"] },
          { id: "12.4", title: "The Optimisation Ladder", difficulty: "core", minutes: 28, tier: "should",
            summary: "What to try, in order of payoff per unit of risk: fix the pipeline, batch, cache, scale out, then compress the model. The flowchart from symptom to first action, and the two optimisations that usually make things worse.",
            keywords: ["optimisation", "flowchart", "triage", "scale out", "quantization", "distillation", "async", "ladder"] }
        ]
      },

      {
        id: "skew",
        short: "M13",
        dir: "13_skew",
        phase: "Phase 5 · Production issues",
        title: "Incident 3: Training-Serving Skew",
        blurb: "Offline 0.94, online 0.71, and no error anywhere. The four skews, each reproduced as a real bug on the same model and the same data: a transformation written twice, a processing difference, a leaked feature, and a library version. Then the one architectural change that removes the whole class.",
        outcome: "You can reproduce each of the four skews deliberately, detect skew by comparing distributions across the boundary, and say why shared feature code removes the cause rather than the symptom.",
        lessons: [
          { id: "13.1", title: "The Same Code, Twice", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Transformation skew built on purpose: a scaler fitted in training and reimplemented in serving, with the accuracy fall it causes measured. Then imputation, categorical encoding and a timezone, each a one-line difference with a large consequence.",
            keywords: ["training serving skew", "transformation", "scaler", "imputation", "encoding", "timezone", "parity", "reimplementation"] },
          { id: "13.2", title: "Leakage and the Clock", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "A feature that is available in the training table and not at prediction time, and the offline score it inflates. The point-in-time discipline from 1.4 applied as a test, and the leak types that survive a random train/test split.",
            keywords: ["leakage", "target leakage", "point in time", "lookahead", "split", "temporal", "inflated score"] },
          { id: "13.3", title: "Environment and Version Skew", difficulty: "core", minutes: 26, tier: "should",
            summary: "The same pickle, a different library version, a different answer — with a real case where a serialized transformer loads and silently behaves differently. Pinning, lockfiles, image digests, and the serialization boundary that should be versioned.",
            keywords: ["version skew", "pickle", "lockfile", "pinning", "digest", "serialization", "compatibility", "environment"] },
          { id: "13.4", title: "Prevention and Detection", difficulty: "core", minutes: 28, tier: "must",
            summary: "One code path to both consumers, a serialized pipeline rather than a reimplemented one, and an integration test that asserts offline and online agree on the same row. Then detection: comparing feature and prediction distributions across the boundary.",
            keywords: ["prevention", "shared code", "pipeline", "integration test", "golden row", "distribution comparison", "detection"] }
        ]
      },

      {
        id: "scaling",
        short: "M14",
        dir: "14_scaling",
        phase: "Phase 5 · Production issues",
        title: "Incident 4: Scaling and Infrastructure",
        blurb: "The four failures that take an inference service down and the patterns that contain them: GPU OOM, CrashLoopBackOff, pool exhaustion and a full disk — each with its diagnosis path — then horizontal scaling, sharding, queues, and a rollback that works under pressure.",
        outcome: "You can diagnose each of the four failures from its symptom, choose between replicas, sharding and a queue from the workload, and write a rollback and fallback that are tested rather than assumed.",
        lessons: [
          { id: "14.1", title: "Four Infrastructure Failures", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "GPU OOM, CrashLoopBackOff, connection pool exhaustion and disk exhaustion: the symptom each presents, the command that confirms it, and the fix. The pool case is the one that looks like a slow model; the arithmetic separates them.",
            keywords: ["oom", "crashloopbackoff", "connection pool", "disk", "diagnosis", "probe", "exhaustion", "eviction"] },
          { id: "14.2", title: "Scaling Patterns", difficulty: "core", minutes: 30, tier: "must",
            summary: "Replicas for throughput, sharding for a model that does not fit, a queue for work that need not be synchronous, and routing for a comparison. Which bottleneck each addresses, and the one they cannot help with.",
            keywords: ["horizontal scaling", "replica", "sharding", "queue", "async", "routing", "stateless", "throughput"] },
          { id: "14.3", title: "Rollback, Fallback and Degradation", difficulty: "core", minutes: 28, tier: "must",
            summary: "What to do when the new model is wrong: an instant rollback path, a fallback to the previous model or a heuristic, circuit breaking, and deciding in advance what the service does when the model is simply unavailable.",
            keywords: ["rollback", "fallback", "circuit breaker", "graceful degradation", "timeout", "retry", "disaster recovery", "runbook"] }
        ]
      },

      {
        id: "versioning",
        short: "M15",
        dir: "15_versioning",
        phase: "Phase 5 · Production issues",
        title: "Incident 5: Versioning and Reproducibility",
        blurb: "Three questions that should be trivial and usually are not: which model is serving, what produced it, and can we build it again. The registry pattern and the promotion gate, lineage from prediction back to data, and an audit trail that answers a regulator.",
        outcome: "You can trace a single prediction back to the data and code that produced it, design a promotion workflow with a gate, and say what must be stored for a result to be reproducible a year later.",
        lessons: [
          { id: "15.1", title: "Which Model Is Running?", difficulty: "core", minutes: 28, tier: "must",
            summary: "The question that should be answerable from a response header, and the three ways teams lose the answer. A model registry's stages, the promotion gate, and the immutable version id that every prediction should carry.",
            keywords: ["model registry", "version", "promotion", "staging", "production", "immutable", "header", "mlflow registry"] },
          { id: "15.2", title: "Lineage, End to End", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "From a prediction to the model, to the run, to the code commit, to the data snapshot — built here as a real chain of hashes, then queried backwards from a single prediction id.",
            keywords: ["lineage", "provenance", "audit", "hash chain", "snapshot", "commit", "traceability", "artifact"] },
          { id: "15.3", title: "Reproducible a Year Later", difficulty: "core", minutes: 26, tier: "should",
            summary: "The checklist that actually works: data snapshot, environment digest, seed, hardware note, and the config in version control rather than in a notebook. What remains irreproducible even then, stated honestly.",
            keywords: ["reproducibility", "snapshot", "digest", "seed", "config", "retention", "archive", "determinism"] }
        ]
      },

      {
        id: "mlobs",
        short: "M16",
        dir: "16_observability",
        phase: "Phase 5 · Production issues",
        title: "Incident 6: Observability for ML",
        blurb: "The incident you cannot diagnose because nothing recorded the inputs. The four pillars of ML observability, the prediction log as the artifact everything else is built from, the alerts worth paging on, and the dashboard that shortens an incident instead of decorating it.",
        outcome: "You can specify a prediction log that makes drift, skew and quality all computable after the fact, and set alerts whose thresholds you can defend.",
        lessons: [
          { id: "16.1", title: "The Four Pillars", difficulty: "core", minutes: 28, tier: "must",
            summary: "Data, model, infrastructure and business metrics as four separate monitoring problems with four different latencies and owners. Why the business metric is the one that proves harm, and the one nobody wires up.",
            keywords: ["observability", "pillars", "data quality", "model quality", "business metric", "latency", "ownership"] },
          { id: "16.2", title: "The Prediction Log", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The single artifact that makes everything else possible: inputs, output, model version, timestamp, correlation id and, later, the label. Sampling, PII, retention, and the schema written so that drift and skew are both computable from it.",
            keywords: ["prediction log", "schema", "sampling", "pii", "retention", "join", "label", "backfill", "replay"] },
          { id: "16.3", title: "Alerts Worth Waking Up For", difficulty: "core", minutes: 26, tier: "should",
            summary: "Thresholds derived rather than guessed, alerting on user-visible symptoms, burn-rate windows, and the fatigue arithmetic that explains why a noisy alert is worse than none.",
            keywords: ["alert", "threshold", "burn rate", "slo", "error budget", "fatigue", "paging", "symptom"] }
        ]
      },

      {
        id: "experiments",
        short: "M17",
        dir: "17_experiments",
        phase: "Phase 5 · Production issues",
        title: "Incident 7: Experimentation",
        blurb: "Shipping a model because its offline metric went up is not evidence. The online experiment: randomisation that holds, a sample size computed before the test rather than after, the peeking that invalidates most results, and the metrics that move in opposite directions.",
        outcome: "You can compute a required sample size before running a test, explain why stopping early inflates the false-positive rate, and read a result where the model metric improved and the business metric did not.",
        lessons: [
          { id: "17.1", title: "Designing the Test", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Randomisation unit, hypothesis, the one primary metric and its guardrails, and the power calculation that tells you how long to run — computed here for realistic effect sizes, including the case where the honest answer is that you cannot detect it.",
            keywords: ["a/b test", "randomisation", "power", "sample size", "mde", "primary metric", "guardrail", "hypothesis"] },
          { id: "17.2", title: "Reading the Result", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Confidence intervals rather than a p-value verdict, the peeking problem simulated to show the real false-positive rate, multiple comparisons, and Simpson's paradox on a segmented result — all computed.",
            keywords: ["p-value", "confidence interval", "peeking", "sequential testing", "multiple comparison", "simpson", "segment", "novelty effect"] },
          { id: "17.3", title: "Beyond A/B: Bandits and Interleaving", difficulty: "core", minutes: 26, tier: "could",
            summary: "When a fixed split is the wrong design: multi-armed bandits for continuous allocation, interleaving for ranking, and switchback tests for network effects. What each buys and what each gives up.",
            keywords: ["bandit", "thompson sampling", "epsilon greedy", "interleaving", "switchback", "network effect", "allocation"] }
        ]
      },

      /* ================================================================
         PHASE 6 · PROCESS
         ================================================================ */
      {
        id: "sdlc",
        short: "M18",
        dir: "18_sdlc",
        phase: "Phase 6 · Process",
        title: "SDLC, and How ML Bends It",
        blurb: "The process the rest of the organisation runs on, and the four places ML does not fit it: requirements you cannot specify, a testing pyramid with a probabilistic top, a definition of done that includes a monitoring plan, and an estimate for work that is research.",
        outcome: "You can place an ML project in a lifecycle model, say which SDLC assumptions it violates and why, and write a definition of done for a model that includes its rollback.",
        lessons: [
          { id: "18.1", title: "The Phases, and Why They Exist", difficulty: "foundation", minutes: 26, tier: "should",
            summary: "The seven phases from planning to maintenance, each as the answer to a specific failure, plus the cost-of-change curve that explains why requirements get the attention they do.",
            keywords: ["sdlc", "phases", "requirements", "design", "testing", "deployment", "maintenance", "cost of change"] },
          { id: "18.2", title: "Waterfall, Agile and the Honest Comparison", difficulty: "core", minutes: 26, tier: "should",
            summary: "Waterfall, V-model, iterative and spiral, then Scrum concretely: ceremonies, user stories, estimation and velocity. Where each genuinely fits, and the mismatch between a two-week sprint and a research task.",
            keywords: ["waterfall", "v-model", "spiral", "agile", "scrum", "sprint", "user story", "velocity", "estimation"] },
          { id: "18.3", title: "Branching, Testing and Done", difficulty: "core", minutes: 28, tier: "should",
            summary: "Git Flow against trunk-based development and what each assumes about release cadence; the testing pyramid and TDD; conventional commits; and a definition of done for a model, which is not the definition of done for a function.",
            keywords: ["git flow", "trunk based", "testing pyramid", "tdd", "bdd", "conventional commits", "definition of done", "adr"] },
          { id: "18.4", title: "The ML Lifecycle Against the Traditional One", difficulty: "core", minutes: 26, tier: "must",
            summary: "CRISP-DM and where it is honest about iteration, the four SDLC assumptions ML breaks, and the anti-patterns that follow from pretending it does not: the notebook in production, the model with no owner, the metric nobody agreed on.",
            keywords: ["crisp-dm", "ml lifecycle", "anti-pattern", "notebook", "ownership", "technical debt", "hidden debt"] }
        ]
      },

      /* ================================================================
         PHASE 7 · LLMOPS
         ================================================================ */
      {
        id: "llmops",
        short: "M19",
        dir: "19_llmops",
        phase: "Phase 7 · LLMOps",
        title: "LLMOps",
        blurb: "What changes when the model is a dependency you do not control and the artifact is a prompt. Prompts and indexes as versioned deployables, evaluation as the gate that replaces an accuracy check, cost as a first-class SLI, and the latency pair that MLOps never had to think about.",
        outcome: "You can version and canary a prompt the way you would a model, build an eval gate that can block a release, and account for token cost and TTFT as operational signals.",
        lessons: [
          { id: "19.1", title: "MLOps and LLMOps, Side by Side", difficulty: "core", minutes: 28, tier: "must",
            summary: "What carries over unchanged, what changes shape, and what is genuinely new — laid out against the lifecycle from Phase 1 rather than as a list of tools. The model as a third-party dependency, and what that does to your release process.",
            keywords: ["llmops", "mlops", "comparison", "dependency", "prompt", "index", "evaluation", "lifecycle"] },
          { id: "19.2", title: "Prompts and Indexes Are Deployables", difficulty: "core", minutes: 30, tier: "must",
            summary: "A prompt as a versioned artifact with an owner, a test suite and a rollback, rather than a string in a source file. Then the retrieval index as the other deployable: rebuild, reindex, and the staleness nobody is monitoring.",
            keywords: ["prompt versioning", "registry", "canary", "index", "reindex", "staleness", "artifact", "rollback"] },
          { id: "19.3", title: "The Eval Gate", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "What replaces the accuracy check: a golden set, a judge with known biases, pass rates with confidence intervals, and a gate that can actually block a release. The regression suite that catches the prompt change which fixed one case and broke nine.",
            keywords: ["evaluation", "golden set", "llm judge", "regression", "gate", "pass rate", "confidence interval", "ci"] },
          { id: "19.4", title: "Cost, Latency and Reliability", difficulty: "core", minutes: 30, tier: "must",
            summary: "Token accounting as an SLI, TTFT and TPOT as the two latencies that matter, and the provider as a dependency with its own outages, rate limits and deprecations. Fallbacks, caching and the budget alert that fires before the invoice.",
            keywords: ["cost", "tokens", "ttft", "tpot", "rate limit", "fallback", "cache", "budget", "deprecation", "reliability"] },
          { id: "19.5", title: "Traces, Guardrails and the Feedback Loop", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "A span per model call with its tokens and cost, guardrails in the request path with their own latency budget, and the loop that closes it: traces become eval cases become the next golden set.",
            keywords: ["tracing", "span", "observability", "guardrail", "feedback loop", "eval set", "annotation", "incident"] }
        ]
      }

    ]
  });
})();
