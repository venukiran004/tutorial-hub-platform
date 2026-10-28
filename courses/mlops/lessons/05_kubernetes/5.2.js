EC.receiveLesson({
  id: "5.2",

  lede: "Four workload types, and the ML mapping is less obvious than it looks: a model server is a Deployment, a nightly scoring run is a CronJob, a training run is a Job — and a training run is **not** a Deployment, which is a mistake that produces an infinite retrain loop. Then how traffic reaches a pod, where the decisive object is the one nobody configures carefully: the **readiness probe**. Lesson 2.1 measured a cold start of **23.04 ms against a warm p50 of 1.94** and a 2.82-second import before the service could answer at all — a readiness probe that passes before the model is loaded delivers exactly that penalty to real users, and a Service selects pods by **label**, so a typo removes every endpoint silently.",

  objectives: [
    "Map ML workloads onto Deployment, StatefulSet, Job and CronJob, and justify each",
    "Distinguish liveness, readiness and startup probes by the question each answers",
    "Explain how a Service finds its pods and what makes its endpoint list empty",
    "Make a rolling update actually zero-downtime, including the shutdown sequence"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", id: "workloads", text: "Four types, and the ML mapping",
      sub: "The difference is what 'finished' means" },

    { t: "p", text: "The four workload controllers differ on one axis: whether the pod is supposed to **terminate**, and what should happen when it does." },

    { t: "table",
      head: ["Controller", "A pod that exits is...", "The ML workload"],
      rows: [
        ["Deployment", "a failure — restart it, keep N running", "A model server. Stateless, interchangeable, never finishes."],
        ["StatefulSet", "a failure, but identity is preserved", "Rarely the right answer for ML serving. A vector database or a Postgres, if you insist on running it yourself."],
        ["Job", "success — run to completion, N times", "A training run, a backfill, a one-off batch score."],
        ["CronJob", "success, on a schedule", "The nightly retrain or batch scoring from lesson 3.1's DAG."]
      ] },

    { t: "callout", kind: "trap", title: "A training run in a Deployment is an infinite loop",
      body: [
        { t: "p", text: "A Deployment's contract is *keep N pods running*. A training script finishes, the container exits 0, and the Deployment controller observes a gap and starts it again — so the model retrains for ever and the cluster bill grows quietly. The symptom is a pod with a steadily climbing `RESTARTS` count and a `Completed` status flickering past." },
        { t: "p", text: "A Job's contract is the opposite: a pod that exits 0 is success and the Job stops. It also brings `backoffLimit` for retries, `activeDeadlineSeconds` for a wall-clock cap, and `parallelism` with `completions` for a sweep — all of which lesson 3.1's scheduler had to implement by hand." }
      ] },

    { t: "p", text: "Two mechanics worth knowing about Jobs specifically, because both bite ML workloads. **Completed pods are retained**, which is deliberate — their logs are the only record of the run — so `ttlSecondsAfterFinished` is how you stop accumulating thousands of them. And **a Job's pods are not interchangeable with each other** in the way a Deployment's are: `restartPolicy` must be `Never` or `OnFailure`, never `Always`, and `Always` is the default that will be rejected." },

    { t: "h2", n: "02", id: "probes", text: "Three probes, three questions",
      sub: "The one that matters for ML is readiness" },

    { t: "p", text: "Probes are where Kubernetes knowledge most often turns out to be shallow, because all three look like health checks and they answer completely different questions." },

    { t: "dl", items: [
      { k: "Liveness: should this container be killed?", v: "A failure restarts the container. For a deadlock or an unrecoverable state. If it is wrong, it restarts a healthy process — a liveness probe that times out under load turns a slow service into a restarting one." },
      { k: "Readiness: should this pod receive traffic?", v: "A failure removes the pod from its Service's endpoints and leaves it running. This is the one that matters: it is the gate between a loading model and real users." },
      { k: "Startup: has it finished booting?", v: "Disables the other two until it passes. Exists so that a slow start does not require loosening the liveness probe's timeout for the container's whole life." }
    ] },

    { t: "p", text: "The ML consequence comes straight from lesson 2.1's measurements. Uvicorn took **2.82 seconds** to import scikit-learn, train, and become able to answer; the first request after that took **23.04 ms against a warm p50 of 1.94 ms**, nearly twelve times. A readiness probe that passes before the model is loaded sends the first users into exactly that penalty — or worse, into a 500, since the model attribute does not exist yet." },

    { t: "code", lang: "yaml", title: "Probes for the lesson 4.3 image (presented, not applied)",
      code: `startupProbe:                 # generous: boot may be slow, especially cold
  httpGet: { path: /healthz, port: 8000 }
  periodSeconds: 2
  failureThreshold: 30        # up to 60 s to start, then give up

readinessProbe:               # strict: it gates traffic
  httpGet: { path: /healthz, port: 8000 }   # /healthz returns the model version
  periodSeconds: 5
  failureThreshold: 2         # out of rotation quickly

livenessProbe:                # lenient: a failure KILLS the container
  httpGet: { path: /livez, port: 8000 }     # a different, cheaper endpoint
  periodSeconds: 10
  failureThreshold: 6         # 60 s of failure before restarting` },

    { t: "callout", kind: "insight", title: "Liveness and readiness must not be the same endpoint",
      body: [
        { t: "p", text: "If both probe `/healthz` and that endpoint touches the model or a database, then a slow dependency fails **both**: the pod leaves rotation *and* is killed. Every replica does it at once, because they share the dependency, and a brief database hiccup becomes a full outage with every pod restarting." },
        { t: "p", text: "The split: **readiness may depend on dependencies**, because being out of rotation is recoverable and correct. **Liveness must depend on nothing but the process itself** — a trivial `/livez` that returns 200 if the event loop is alive. The failure mode of a wrong liveness probe is a restart storm, which is strictly worse than the problem it was meant to detect." }
      ] },

    { t: "p", text: "And the probe thresholds in that manifest are deliberately asymmetric, which is the general rule: **readiness fails fast** (2 failures, 5 s apart — out of rotation in about 10 seconds) and **liveness fails slow** (6 failures, 10 s apart — 60 seconds before a restart). The costs are asymmetric, so the thresholds should be." },

    { t: "h2", n: "03", id: "service", text: "How traffic finds a pod",
      sub: "By label, which is why it silently finds nothing" },

    { t: "p", text: "Pods are mortal and their IPs change, so clients cannot address them. A **Service** is a stable name and virtual IP in front of a changing set, and the indirection works by **label selection** rather than by name or ownership." },

    { t: "diagram", kind: "flow", id: "dg-5_2-03-0",
      title: "From a request to a pod, and the two places it breaks",
      caption: "The Service does not know about the Deployment at all — it matches labels. **So a selector that matches nothing produces an empty Endpoints list and a connection refused**, with both objects reporting themselves perfectly healthy.",
      cols: 3,
      nodes: [
        { id: "c", label: "caller", sub: "loan-api.default.svc", tone: "accent" },
        { id: "d", label: "cluster DNS", sub: "resolves to the ClusterIP", tone: "violet" },
        { id: "s", label: "Service", sub: "selector: app=loan-api", tone: "violet" },
        { id: "e", label: "Endpoints", sub: "only READY pods appear", tone: "amber" },
        { id: "p", label: "a pod", sub: "labels: app=loan-api", tone: "good" },
        { id: "x", label: "empty Endpoints", sub: "selector typo, or nothing ready", tone: "crit" }
      ],
      edges: [["c", "d"], ["d", "s"], ["s", "e"], ["e", "p"], ["s", "x"]] },

    { t: "p", text: "Two failure modes live in that diagram and both present as *connection refused* with nothing obviously wrong." },

    { t: "p", text: "**The selector matches nothing.** A Service with `selector: app=loan-api` and pods labelled `app=loan-apii` is a working Service with zero endpoints. Neither object is in an error state; `kubectl get svc` looks fine. The diagnosis is `kubectl get endpoints <name>` — if it is empty, it is this or the next one." },

    { t: "p", text: "**No pod is ready.** Only pods passing their readiness probe are added to Endpoints. So a readiness probe that never passes gives you running pods, a healthy Service and no traffic — which is the good failure, because it means a broken rollout does not receive requests." },

    { t: "p", text: "Beyond ClusterIP, the types are a short list: **NodePort** opens a port on every node and is mostly a building block; **LoadBalancer** asks the cloud for one, and one per service gets expensive; **Ingress** is an HTTP router in front of many services, which is what you want for several model endpoints behind one hostname. And a **headless** Service (`clusterIP: None`) returns pod IPs directly rather than load-balancing, which is what gRPC needs — lesson 9.2's long-lived-connection problem." },

    { t: "h2", n: "04", id: "rolling", text: "Making a rolling update actually seamless",
      sub: "Four things, and three of them are in your application" },

    { t: "p", text: "A rolling update is two ReplicaSets with moving counts (lesson 5.1). Kubernetes handles that part. Zero downtime depends on four things, and only the first is a manifest setting." },

    { t: "code", lang: "yaml", title: "The manifest half (presented, not applied)",
      code: `strategy:
  rollingUpdate:
    maxUnavailable: 0      # never go below the declared replica count
    maxSurge: 1            # add one new pod at a time
terminationGracePeriodSeconds: 45   # longer than your longest request` },

    { t: "p", text: "**`maxUnavailable: 0`** is the setting that matters, and the default is 25% — so a default rolling update on four replicas deliberately runs with three while it works. For a service near its capacity limit, that is lesson 5.3's utilisation knee arriving on purpose during every deploy." },

    { t: "p", text: "The other three are application behaviour, and this is where deploys actually shed requests:" },

    { t: "p", text: "**The container must handle SIGTERM.** Lesson 4.3 measured the mechanism: a shell-form `ENTRYPOINT` makes `/bin/sh` pid 1, SIGTERM is not forwarded, the grace period elapses and everything is SIGKILLed mid-request. Exec form, and a server that drains." },

    { t: "p", text: "**The readiness probe must fail before the process stops accepting.** Endpoint removal is asynchronous — kube-proxy on every node has to be told — so a pod that stops accepting the instant it receives SIGTERM will refuse connections that were routed microseconds earlier. The standard fix is a `preStop` hook that sleeps a few seconds: fail readiness, keep serving, *then* shut down." },

    { t: "p", text: "**The grace period must exceed the longest in-flight request.** The default is 30 seconds. For this course's service, where lesson 2.1 measured a p99 of 3.08 ms, 30 seconds is enormous. For a batch endpoint scoring a thousand rows it may not be." },

    { t: "callout", kind: "good", title: "The shutdown sequence, in order",
      body: [
        { t: "p", text: "1. Kubernetes sends SIGTERM and **simultaneously** begins removing the pod from Endpoints — these are concurrent, not sequential, which is the whole problem. 2. Your `preStop` hook sleeps 5 seconds while readiness fails and endpoint removal propagates. 3. The server stops accepting new connections and finishes in-flight ones. 4. The process exits, or is SIGKILLed when the grace period expires." },
        { t: "p", text: "Getting step 2 wrong is the single commonest cause of *a few 502s on every deploy*, and it is usually blamed on the load balancer." }
      ] },

    { t: "h2", n: "05", id: "pdb", text: "Voluntary disruption",
      sub: "The object that protects you from the platform" },

    { t: "p", text: "One more object, because it is the one ML teams discover during an unplanned outage. Node upgrades, cluster autoscaler scale-downs and spot reclamations all **drain** nodes, evicting pods. Nothing in a Deployment prevents every replica being evicted at once if they happen to share a node — or a node pool." },

    { t: "code", lang: "yaml", title: "A PodDisruptionBudget (presented, not applied)",
      code: `apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 2                     # or maxUnavailable: 1
  selector:
    matchLabels: { app: loan-api }` },

    { t: "p", text: "A PDB makes the eviction API refuse a drain that would breach it, so an upgrade proceeds one pod at a time instead of emptying the node. It constrains **voluntary** disruption only — it does not help when a node fails, which is what multiple replicas and anti-affinity are for." },

    { t: "p", text: "And it is the natural pairing for lesson 10.3's spot instances: a training Job on spot wants `activeDeadlineSeconds` and frequent checkpoints, while a serving Deployment on spot wants a PDB and enough replicas that losing one is survivable." },

    { t: "exercise", kind: "practice", title: "Audit the four things a deploy needs", difficulty: "core", minutes: 30,
      prompt: "For a model service you run on Kubernetes, check five specifics. Does the readiness probe touch the model, or does it return 200 from a handler that never loads it? Are liveness and readiness the same endpoint — and if so, what happens to every replica at once when the database is briefly slow? Is `maxUnavailable` set, or is it the 25% default? Does the entrypoint use exec form, and does the server log a graceful shutdown when you send it SIGTERM? Is there a `preStop` sleep? Then run `kubectl get endpoints` for the Service and confirm the count matches your ready replicas.",
      hints: [
        "A readiness endpoint that returns the model version can only answer once the model is loaded, which is what makes it a real gate.",
        "Shared liveness/readiness plus a dependency is the restart-storm setup: the failure is correlated across every replica by construction.",
        "An endpoints count that is lower than your ready pods usually means a label mismatch on a subset — often a leftover pod from a previous template."
      ],
      solution: {
        body: [
          { t: "p", text: "The two findings that recur are a readiness probe that does not touch the model and a shared liveness endpoint that depends on a database. The first delivers lesson 2.1's twelvefold cold start to real users on every rollout; the second converts a dependency blip into a cluster-wide restart storm." },
          { t: "p", text: "The `preStop` sleep is the cheapest fix on the list and the one that removes the 502s everyone has learned to ignore during deploys. Five seconds, and the asynchrony between SIGTERM and endpoint removal stops mattering." }
        ]
      } }

  ],

  takeaways: [
    "**The four workload types differ on whether a pod is supposed to terminate**: Deployment (never), StatefulSet (never, with identity), Job (once), CronJob (on a schedule).",
    "**A training run in a Deployment retrains for ever** — the script exits 0, the controller sees a gap and restarts it. Use a Job, which also gives backoffLimit, activeDeadlineSeconds and parallelism.",
    "**Job pods are retained on purpose** (their logs are the run record), so set `ttlSecondsAfterFinished`; and `restartPolicy: Always` is rejected.",
    "**Three probes, three questions**: liveness (kill it?), readiness (send it traffic?), startup (has it booted?).",
    "**Readiness is the one that matters for ML.** Lesson 2.1 measured a 2.82 s import and a 23.04 ms first request against a 1.94 ms warm p50 — a probe that passes early delivers that to users.",
    "**Never share an endpoint between liveness and readiness.** A slow dependency then fails both on every replica at once, turning a database blip into a restart storm.",
    "**Readiness fails fast, liveness fails slow** — about 10 s out of rotation against 60 s before a restart, because the costs are asymmetric.",
    "**A Service selects pods by label**, so a one-character typo gives a healthy Service with zero endpoints and a connection refused, with nothing in an error state.",
    "**Only ready pods appear in Endpoints**, which is the good failure: a broken rollout receives no traffic.",
    "**gRPC needs a headless Service** (`clusterIP: None`) because a ClusterIP load-balances connections, not requests — lesson 9.2's problem.",
    "**`maxUnavailable` defaults to 25%**, so a default rolling update deliberately runs below capacity; set it to 0 with `maxSurge: 1`.",
    "**SIGTERM and endpoint removal are concurrent, not sequential** — hence a `preStop` sleep of a few seconds, which is the usual cure for 502s on every deploy.",
    "**A PodDisruptionBudget constrains voluntary disruption only** — node drains and autoscaler scale-downs, not node failure, which is what replicas and anti-affinity are for."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A training script is deployed as a Deployment with one replica. What happens?",
        options: [
          "It trains once and the pod stays in Completed state",
          "It retrains for ever: the script exits 0, the Deployment controller sees fewer running pods than declared, and starts it again",
          "The Deployment fails admission because the container is not a long-running service"
        ],
        answer: 1,
        why: "A Deployment's contract is 'keep N running', so a successful exit is indistinguishable from a crash. The symptom is a climbing RESTARTS count and a quietly growing bill. A Job's contract is the opposite, and it brings retry limits, deadlines and parallelism as well."
      },
      {
        stem: "Your liveness and readiness probes both hit `/healthz`, which queries the database. The database is briefly slow. What happens?",
        options: [
          "The pods leave rotation until the database recovers, then return",
          "Both probes fail on every replica at once — so every pod leaves rotation and is also killed, turning a brief dependency blip into a cluster-wide restart storm",
          "Kubernetes prioritises the readiness probe and defers liveness during dependency failures"
        ],
        answer: 1,
        why: "The failure is correlated across replicas by construction, because they share the dependency. Readiness may depend on dependencies — being out of rotation is recoverable. Liveness must depend only on the process, which is why it needs a separate trivial endpoint."
      },
      {
        stem: "A Service exists, pods are Running, and callers get connection refused. What do you check first?",
        options: [
          "Whether the Service type should be LoadBalancer instead of ClusterIP",
          "`kubectl get endpoints` — an empty list means either the label selector matches nothing or no pod is passing its readiness probe",
          "Whether the cluster DNS is resolving the Service name"
        ],
        answer: 1,
        why: "Both causes leave every object looking healthy, which is what makes endpoints the right first command. A selector typo is a working Service with no backends; an unready pod is correctly excluded, which is the behaviour you want during a broken rollout."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between a liveness and a readiness probe?",
        strong: "Liveness asks whether the container should be killed; readiness asks whether the pod should receive traffic. A liveness failure restarts the container, a readiness failure just removes it from the Service's endpoints and leaves it running. The practical rule is that readiness may depend on dependencies, because being out of rotation is recoverable and correct, while liveness must depend on nothing but the process itself — otherwise a brief database slowdown fails both probes on every replica simultaneously and you get a restart storm instead of a short degradation. I also set them asymmetrically: readiness fails fast, two failures five seconds apart, and liveness fails slow, sixty seconds, because the cost of being wrong is much higher for liveness.",
        answer: [
          { t: "p", text: "The restart-storm scenario is the detail that shows this has been operated. Most answers state the definitions correctly and then recommend the same endpoint for both." },
          { t: "p", text: "The asymmetric thresholds, justified by asymmetric costs, is a good concrete follow-through." }
        ]
      },
      {
        level: "senior",
        q: "How do you make a rolling update genuinely zero-downtime for a model service?",
        strong: "Four things, and three are in the application. In the manifest, maxUnavailable: 0 with maxSurge: 1, because the default 25% deliberately runs below capacity during every deploy. Then: the container must actually receive SIGTERM, which means an exec-form entrypoint — a shell-form one makes sh pid 1 and the signal is never forwarded, so requests are killed mid-flight. The grace period must exceed the longest in-flight request. And there has to be a preStop sleep of a few seconds, because SIGTERM and endpoint removal are concurrent rather than sequential: a pod that stops accepting the instant it is signalled will refuse connections that were routed microseconds earlier. That last one is the usual cause of a handful of 502s on every deploy, and it is normally blamed on the load balancer. For a model service I would add that readiness has to actually touch the model — I measured a 2.8 second import and a first request twelve times the warm p50, and a probe that passes before the model loads hands exactly that to users.",
        answer: [
          { t: "p", text: "The concurrency of SIGTERM and endpoint removal is the key technical insight, and the preStop sleep is the fix that most teams are missing. Naming the symptom it cures makes it recognisable." },
          { t: "p", text: "Ending on the ML-specific readiness point ties the generic answer to the domain, and it has a measurement behind it." }
        ]
      }
    ]
  }
});
