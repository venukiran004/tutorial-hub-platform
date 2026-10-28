EC.receiveLesson({
  id: "5.5",

  lede: "Helm's real job is not templating — it is being a **release**: a named, versioned record of what was applied, which is what makes `helm rollback` an operation rather than a git archaeology exercise. The templating is the part that goes wrong, because a chart is text substitution into YAML and indentation is semantic. Then the mechanics that implement lesson 3.3's strategies: `maxSurge` and `maxUnavailable` are the whole of a rolling update, and the arithmetic matters — the **25% default means a four-replica service deliberately runs on three during every deploy**, which given lesson 5.3's utilisation curve is the knee arriving on purpose.",

  objectives: [
    "Say what a Helm release is and why it makes rollback possible",
    "Recognise the two failure modes of templated YAML and how to catch them before apply",
    "Set maxSurge and maxUnavailable from the capacity you can afford to lose",
    "Map lesson 3.3's four rollout strategies onto what Kubernetes provides natively"
  ],

  prerequisites: ["5.4"],

  blocks: [

    { t: "h2", n: "01", id: "release", text: "A release, not a template engine",
      sub: "The part that earns its place" },

    { t: "p", text: "Helm is usually described as templating for Kubernetes manifests, and that undersells the useful half. The three things it actually provides are a **chart** (a parameterised bundle of manifests), **values** (the parameters), and a **release** — a named, versioned, server-side record of a chart plus the values it was rendered with." },

    { t: "p", text: "The release is what matters operationally. It means the cluster knows that `loan-api` is at revision 7, what revision 6 was, and how to go back." },

    { t: "code", lang: "bash", title: "The release operations (shown, not run — no cluster here)",
      code: `$ helm upgrade --install loan-api ./chart -f values-prod.yaml --wait --atomic
$ helm history loan-api
REVISION  STATUS      CHART            DESCRIPTION
5         superseded  loan-api-1.3.0   Upgrade complete
6         superseded  loan-api-1.4.0   Upgrade complete
7         deployed    loan-api-1.4.1   Upgrade complete
$ helm rollback loan-api 6` },

    { t: "p", text: "Two flags in that first command are the ones worth insisting on. **`--wait`** makes Helm block until the new pods are ready rather than returning as soon as the objects are accepted — which is lesson 5.1's point that `apply` succeeding means nothing. **`--atomic`** rolls the release back automatically if the wait fails, so a broken upgrade leaves the previous version serving instead of a half-applied state." },

    { t: "callout", kind: "insight", title: "`helm rollback` and `kubectl rollout undo` are not the same thing",
      body: [
        { t: "p", text: "`kubectl rollout undo` reverts **one Deployment** to its previous pod template, using the ReplicaSet history from lesson 5.1. It knows nothing about the ConfigMap, the Service, the HPA or the PDB that changed in the same deploy." },
        { t: "p", text: "`helm rollback` reverts **the whole release** — every object the chart manages, together. For a change that touched a Deployment and a ConfigMap, the Deployment-only undo leaves the new config with the old code, which is a state nobody tested. That is the specific thing a release buys, and it is why lesson 3.6's one-command rollback is easier to honour with Helm than without." }
      ] },

    { t: "h2", n: "02", id: "templating", text: "Templating YAML, and its two failure modes",
      sub: "Indentation is semantic" },

    { t: "p", text: "A chart is Go templates substituted into text that is then parsed as YAML. That ordering — text first, YAML second — is the source of both characteristic failures." },

    { t: "code", lang: "yaml", title: "The indentation failure",
      code: `# WRONG: the rendered block starts at column 0 and breaks the document
env:
{{ toYaml .Values.env }}

# RIGHT: indent the rendered block to its position
env:
{{- toYaml .Values.env | nindent 2 }}` },

    { t: "p", text: "`nindent` adds a newline and indents every line; `indent` indents without the newline. Getting it wrong produces a YAML parse error at best, and at worst a **valid document with the wrong structure** — a block that lands one level up and becomes a sibling of the field it was meant to be inside." },

    { t: "code", lang: "yaml", title: "The type failure",
      code: `# "8000" and 8000 are different things, and so are "true" and true
containerPort: {{ .Values.port }}          # unquoted: a number, correct here
tag: {{ .Values.image.tag }}               # DANGER: tag 1.40 becomes 1.4
tag: {{ .Values.image.tag | quote }}       # correct: a string stays a string` },

    { t: "p", text: "The `tag: 1.40` case is a real and memorable one: unquoted, YAML parses it as the number 1.4, and the deploy pulls a tag that may not exist or — worse — may exist and be something else. Anything that is semantically a string gets `| quote`." },

    { t: "callout", kind: "good", title: "Render in CI, do not debug in the cluster",
      body: [
        { t: "p", text: "`helm template ./chart -f values-prod.yaml` renders locally and prints the YAML, which catches indentation and type errors in a second. `helm lint` checks chart structure. And `helm upgrade --dry-run --server-side` additionally sends the result through the API server's validation and admission, so a policy rejection (lesson 5.4) is caught before the real upgrade." },
        { t: "p", text: "All three belong in the PR pipeline from lesson 3.2 — they are seconds of work and they move a class of error from a cluster incident to a failed check." }
      ] },

    { t: "p", text: "One Helm-specific trick worth knowing for ML services: a **ConfigMap change does not restart pods**, because the Deployment's pod template has not changed. So updating a threshold in a ConfigMap leaves every replica running the old value until something else triggers a restart. The standard fix is a checksum annotation:" },

    { t: "code", lang: "yaml", title: "Making a config change trigger a rollout",
      code: `template:
  metadata:
    annotations:
      checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}` },

    { t: "p", text: "Now the pod template's annotation changes whenever the ConfigMap's content does, which changes the template hash, which creates a new ReplicaSet — a normal rolling update. Note that this is only needed for values consumed as **environment variables**; lesson 5.4 showed mounted files update in place." },

    { t: "h2", n: "03", id: "rolling", text: "The rolling-update arithmetic",
      sub: "And why the default costs you capacity" },

    { t: "p", text: "Lesson 5.2 said to set `maxUnavailable: 0`. Here is the arithmetic behind it, which is also the arithmetic of lesson 3.3's strategies." },

    { t: "p", text: "The two parameters bound the replica count during a rollout. **`maxUnavailable`** is how far below the declared count Kubernetes may go; **`maxSurge`** is how far above. Both default to **25%**, rounded." },

    { t: "diagram", kind: "matrix", id: "dg-5_5-03-0",
      title: "Four replicas, three parameter choices",
      caption: "The default deliberately runs below capacity. **At lesson 5.3's utilisation curve, dropping from four replicas to three raises per-replica load by a third** — which at a 70% target lands you around 93% and the runaway part of the curve, on every deploy.",
      rows: ["Default (25%/25%)", "unavailable 0, surge 1", "unavailable 0, surge 100%"],
      cols: ["Replicas during rollout", "Consequence"],
      cells: [
        [{ text: "3 to 5 (one down, one extra)", tone: "crit" }, { text: "a third more load per replica, every deploy", tone: "crit" }],
        [{ text: "4 to 5, never below 4", tone: "good" }, { text: "capacity preserved; slowest, one pod at a time", tone: "good" }],
        [{ text: "4 to 8, never below 4", tone: "good" }, { text: "fastest and safe; needs 2x headroom", tone: "warn" }]
      ] },

    { t: "p", text: "For a model service the middle row is almost always right. The surge costs you one pod's worth of resources for the duration of the rollout, and it buys you never running below the capacity you sized for. Given lesson 5.3's measurement that latency is 3.3× the service time at 70% utilisation and 10× at 90%, deliberately removing a quarter of your replicas during a deploy is a self-inflicted latency incident." },

    { t: "p", text: "The exception is an expensive model. If each replica needs a GPU, `maxSurge: 1` means an extra GPU must be schedulable for the rollout to proceed at all — and if the cluster is full, the rollout simply stalls with a `Pending` pod. There, `maxUnavailable: 1` with `maxSurge: 0` is the honest choice: you accept reduced capacity because you cannot afford the surge." },

    { t: "h2", n: "04", id: "strategies", text: "Lesson 3.3's strategies, natively",
      sub: "What Kubernetes gives you and what it does not" },

    { t: "p", text: "Lesson 3.3 compared blue-green, canary, shadow and feature flags. Mapping them onto bare Kubernetes is instructive, because two are easy and two are not." },

    { t: "table",
      head: ["Strategy", "Native Kubernetes", "Honest assessment"],
      rows: [
        ["Rolling update", "Built in: the Deployment strategy above", "Good. It is the default and the arithmetic is in your hands."],
        ["Blue-green", "Two Deployments; flip the Service's label selector", "Works, and it is crude — the flip is atomic, so there is no gradual anything, which is 3.3's point that blue-green cannot contain a bad model."],
        ["Canary", "Two Deployments behind one Service, replica counts as the ratio", "Poor. The split is by pod count, so 5% needs 19 old pods to 1 new; and you cannot route by user, so a returning user may see both versions."],
        ["Shadow", "Nothing native", "Needs a service mesh or application-level duplication."]
      ] },

    { t: "callout", kind: "trap", title: "Replica-count canarying cannot do small percentages",
      body: [
        { t: "p", text: "A Service load-balances across all pods matching its selector, so the traffic share is the pod share. A 5% canary therefore requires a 19:1 pod ratio — which is both expensive and coarse, and 1:19 is the *finest* granularity 20 pods can express." },
        { t: "p", text: "Lesson 3.3's arithmetic makes this worse than it looks: it computed that a 1% canary needs 3.2 hours to reach significance at 20 rps, and at 5% it needs 38 minutes. If the pod ratio cannot express the share you need, the canary cannot conclude. This is the case for a service mesh — Istio or Linkerd — which splits by **request** rather than by pod, or for Argo Rollouts, which drives the ratio and the analysis as one object." }
      ] },

    { t: "h2", n: "05", id: "choose", text: "Helm, Kustomize, or neither",
      sub: "The honest comparison" },

    { t: "p", text: "Helm is not the only answer, and the choice is about how your environments differ." },

    { t: "p", text: "**Kustomize** is built into kubectl and takes the opposite approach: instead of templating text, it **patches structured YAML**. A base plus per-environment overlays, with strategic merge patches. Because it operates on parsed YAML, the indentation and type failures from section 2 are impossible by construction." },

    { t: "p", text: "**Helm** wins where you need a distributable artifact with its own versioning, a release concept with rollback, and conditional logic — *include the HPA only if autoscaling.enabled*. Kustomize has no conditionals and no release history." },

    { t: "diagram", kind: "steps", id: "dg-5_5-05-0",
      title: "Deciding, by what the chart is for",
      caption: "The first question usually settles it. **If you are deploying your own services to your own clusters, Kustomize is less machinery**; Helm earns its place when you are distributing something or you need the release history.",
      items: [
        { label: "Are you distributing to clusters you do not operate?", desc: "Then Helm: a versioned chart with values is the interface, and consumers expect it. This is why every vendor ships one." },
        { label: "Do you need a release history and whole-release rollback?", desc: "Helm's main operational advantage — reverting every object together, not just one Deployment's pod template." },
        { label: "Do environments differ by a handful of values?", desc: "Kustomize overlays, with no templating language and no indentation hazards. It is already in kubectl." },
        { label: "Whichever: render and validate in CI", desc: "helm template / kustomize build, then --dry-run=server. Seconds, and it moves a class of error out of the cluster." }
      ] },

    { t: "p", text: "And a note on the combination, since it is common: Helm for third-party charts — Prometheus, an ingress controller, a vector database — and Kustomize for your own services. The hybrid is not inconsistency; the two tools are good at different jobs, and lesson 6.4's GitOps controllers support both natively." },

    { t: "exercise", kind: "practice", title: "Check the two numbers and the one annotation", difficulty: "intro", minutes: 20,
      prompt: "For a Kubernetes-deployed model service, find three things. First, the rollout parameters: are maxUnavailable and maxSurge set, or are they the 25% default — and if default, compute the per-replica load increase during a deploy at your replica count, then read lesson 5.3's utilisation table to see what that does to latency. Second, whether a ConfigMap change restarts your pods: if config arrives as environment variables and there is no checksum annotation, it does not, so some replicas may be running configuration from weeks ago. Third, whether your deploy command waits — `--wait --atomic` for Helm, `kubectl rollout status` otherwise — or whether CI reports success the moment the API server accepts the objects.",
      hints: [
        "`kubectl get deploy <name> -o jsonpath='{.spec.strategy}'` shows what is actually set, including the defaults made explicit.",
        "The ConfigMap check is easy to confirm: change a value, then check whether pod start times moved.",
        "If CI does not wait, every deployment report is about acceptance rather than about serving."
      ],
      solution: {
        body: [
          { t: "p", text: "The ConfigMap finding is the one that surprises people most: a value changed last month may still not be in effect on any replica that has not restarted since, and nothing anywhere reports that. The checksum annotation is three lines and makes config changes behave like code changes." },
          { t: "p", text: "The rollout parameters are usually the default, which means every deploy deliberately removes a quarter of capacity. At a 70% utilisation target that moves you to roughly 93% for the duration, which is the runaway end of lesson 5.3's queueing curve — so the deploy itself becomes the latency incident people blame on the new version." }
        ]
      } }

  ],

  takeaways: [
    "**Helm's valuable half is the release**: a named, versioned server-side record of chart plus values, which is what makes rollback an operation.",
    "**Use `--wait --atomic`.** Without `--wait`, Helm returns when objects are accepted, which lesson 5.1 showed means nothing; `--atomic` reverts a failed upgrade automatically.",
    "**`helm rollback` reverts the whole release; `kubectl rollout undo` reverts one Deployment's pod template** — so the latter can leave new config with old code, a state nobody tested.",
    "**A chart is text substituted into YAML, so indentation is semantic**: `nindent` versus `indent`, and the bad case is a valid document with the wrong structure.",
    "**Quote anything semantically a string.** Unquoted, `tag: 1.40` parses as 1.4 and pulls a different image.",
    "**Render and validate in CI**: `helm template`, `helm lint`, and `--dry-run --server-side` to catch admission and policy rejections before the real upgrade.",
    "**A ConfigMap change does not restart pods** — the pod template is unchanged — so env-var config needs a `checksum/config` annotation to trigger a rollout. Mounted files update in place.",
    "**maxUnavailable and maxSurge both default to 25%**, so a four-replica service runs on three during every deploy: a third more load per replica.",
    "**At lesson 5.3's curve that is self-inflicted**: a 70% target becomes roughly 93%, where latency is an order of magnitude above the service time.",
    "**`maxUnavailable: 0, maxSurge: 1` is right for most model services** — one pod's extra resources for the rollout's duration, and capacity never drops.",
    "**The exception is an expensive model**: with one GPU per replica, a surge needs a spare GPU or the rollout stalls Pending, so `maxUnavailable: 1, maxSurge: 0` is the honest choice.",
    "**Replica-count canarying cannot express small shares**: 5% needs a 19:1 pod ratio, and you cannot route by user — which is the case for a service mesh or Argo Rollouts.",
    "**Kustomize patches structured YAML**, so section 2's failures are impossible by construction; Helm wins for distribution, conditionals and release history."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A deploy changed both a Deployment and a ConfigMap. The new version is bad. What does `kubectl rollout undo` on the Deployment leave you with?",
        options: [
          "The previous state, since the Deployment is what was deployed",
          "The old code with the new ConfigMap — rollout undo reverts one Deployment's pod template and knows nothing about other objects, which is a combination nobody tested",
          "A failed command, because the ConfigMap no longer matches the pod template"
        ],
        answer: 1,
        why: "This is the specific thing a Helm release buys: `helm rollback` reverts every object the chart manages together. The Deployment-only undo is correct for its scope and that scope is usually narrower than the change was."
      },
      {
        stem: "Your Deployment has 4 replicas and the default rollout strategy. What happens to per-replica load during a deploy?",
        options: [
          "Nothing — Kubernetes adds a new pod before removing an old one",
          "It can rise by a third: maxUnavailable defaults to 25%, so the service may run on 3 replicas, which at a 70% utilisation target moves you to roughly 93% and the steep part of the latency curve",
          "It halves, because maxSurge adds four more pods"
        ],
        answer: 1,
        why: "The first option describes maxUnavailable: 0, which is what you have to set explicitly. The default deliberately trades capacity for rollout speed, and lesson 5.3's queueing table shows what that costs: 3.3x the service time at 70%, 10x at 90%."
      },
      {
        stem: "You update a threshold in a ConfigMap consumed as an environment variable. Nothing changes. Why?",
        options: [
          "The ConfigMap update failed silently",
          "The Deployment's pod template is unchanged, so no new ReplicaSet is created and no pod restarts — and env vars are read once at process start",
          "ConfigMap changes require a manual `kubectl rollout restart` by design"
        ],
        answer: 1,
        why: "The third option is a workaround rather than the reason. The fix is a checksum annotation on the pod template so its hash changes with the ConfigMap's content, producing a normal rolling update. Mounted files avoid the problem entirely by updating in place."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What does Helm give you over plain kubectl apply?",
        strong: "Three things, and the templating is the least important. A chart is a parameterised bundle, values are the parameters, and a release is a named versioned server-side record of what was applied — that last one is what makes rollback an operation rather than git archaeology. The distinction worth drawing is that `helm rollback` reverts the whole release, every object the chart manages together, whereas `kubectl rollout undo` reverts a single Deployment's pod template and knows nothing about the ConfigMap or HPA that changed in the same deploy, which can leave old code with new config. I would also always use `--wait --atomic`, because without `--wait` Helm returns as soon as the API server accepts the objects, which tells you nothing about whether anything is running.",
        answer: [
          { t: "p", text: "Leading with the release rather than the templating is the right emphasis, and the rollback-scope contrast is a concrete, checkable difference." },
          { t: "p", text: "The --wait/--atomic point connects to the apply-is-not-a-deployment-check idea and shows the asynchrony is understood." }
        ]
      },
      {
        level: "senior",
        q: "How would you implement a 5% canary for a model service on Kubernetes?",
        strong: "Not with replica counts, because the Service load-balances across matching pods so the traffic share is the pod share — 5% means a 19:1 ratio, which is expensive and coarse, and you cannot route by user so a returning user may see both versions. I would use a service mesh or Argo Rollouts, which split by request rather than by pod. But before any of that I would check whether 5% can conclude at all: I have computed that at 20 requests a second a 5% canary needs about 38 minutes to detect a five-point move in the prediction rate, and a 1% canary needs over three hours — and if the canary runs on a fixed timer shorter than that, it promotes on no information. So I would size the share from the arithmetic first and then pick the mechanism that can express it.",
        answer: [
          { t: "p", text: "Rejecting the obvious implementation with the pod-share reason, and then connecting it to whether the share can reach significance, is the senior move — it treats the mechanism as downstream of the statistics." },
          { t: "p", text: "The user-stickiness point is worth volunteering because a canary that shows one user both versions produces incoherent experience and contaminates any comparison." }
        ]
      }
    ]
  }
});
