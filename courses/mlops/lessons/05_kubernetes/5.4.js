EC.receiveLesson({
  id: "5.4",

  lede: "A Kubernetes Secret is **base64, not encryption**. `echo <value> | base64 -d` is the entire attack, and by default the value sits in etcd in plaintext — so a Secret is an access-control boundary, not a cryptographic one, and treating it as the latter is the commonest security misconception on the platform. Then storage, where the question lesson 4.3 left open gets its Kubernetes answer: the model artifact goes in the image or into an `emptyDir` filled by an init container, and almost never onto a PersistentVolume. And lesson 5.1's **1 MB etcd object limit** rules out the thing people try first — a model in a ConfigMap.",

  objectives: [
    "State precisely what a Secret protects against and what it does not",
    "Choose between ConfigMap, Secret, an external secret store and a mounted file",
    "Decide where a model artifact lives in a pod, and why not a PersistentVolume",
    "Set a securityContext that enforces lesson 4.5's container hardening"
  ],

  prerequisites: ["5.3"],

  blocks: [

    { t: "h2", n: "01", id: "secret", text: "A Secret is base64",
      sub: "What it actually protects against" },

    { t: "p", text: "A `Secret` and a `ConfigMap` are nearly the same object. The differences are that a Secret's values are base64-encoded in the manifest, that it is not written to a node's disk unless a pod on that node mounts it, and that RBAC conventionally restricts reading it. None of those is encryption." },

    { t: "code", lang: "bash", title: "The entire 'attack' (shown, not run — no cluster here)",
      code: `$ kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d
s3cr3t-production-password` },

    { t: "p", text: "And by default, **etcd stores it in plaintext**. Encryption at rest for Secrets is a separate feature (`EncryptionConfiguration` on the API server) that many clusters do not enable, and even with it enabled the API server holds the key, so anyone who can read the Secret through the API gets the value decoded." },

    { t: "callout", kind: "trap", title: "The boundary is RBAC, and the grants that leak around it",
      body: [
        { t: "p", text: "A Secret protects against an attacker who cannot talk to the API server and cannot reach the node. It does **not** protect against: anyone with `get secrets` in the namespace; anyone who can create a pod in the namespace, because they can mount the Secret and print it; anyone with `exec` into a pod that already has it mounted; and anyone who can read etcd directly." },
        { t: "p", text: "The second one is the surprise. `create pods` is a routine developer permission and it is **equivalent to read on every Secret in that namespace** — a pod whose command is `cat /secrets/password` is a perfectly ordinary pod. So if the credential genuinely matters, the control has to be something a pod cannot simply mount." }
      ] },

    { t: "p", text: "Which is what the external pattern is for. **Workload identity plus a secret manager** gives the pod a short-lived token tied to its ServiceAccount, which it exchanges with AWS Secrets Manager, Vault or GCP Secret Manager for the actual value. The credential is never a Kubernetes object, access is audited by the secret store, and rotation does not require a redeploy." },

    { t: "table",
      head: ["Mechanism", "Protects against", "Use for"],
      rows: [
        ["ConfigMap", "nothing; it is plain configuration", "Non-sensitive config: thresholds, feature flags, a model version string."],
        ["Secret", "callers without API or node access", "Low-stakes credentials, and as the delivery mechanism for a value fetched from elsewhere."],
        ["Secret + encryption at rest", "an attacker reading etcd's disk", "A baseline worth enabling; it does not change who can read via the API."],
        ["External store + workload identity", "anyone who can create a pod in the namespace", "Anything that matters. Audited, rotatable, never a cluster object."],
        ["A file mounted from a CSI driver", "same as above, with a filesystem interface", "Legacy apps that insist on reading a credentials file."]
      ] },

    { t: "h2", n: "02", id: "config", text: "Env var or mounted file",
      sub: "And the rotation difference that decides it" },

    { t: "p", text: "Both ConfigMaps and Secrets can be exposed as environment variables or as mounted files, and the choice has one consequence that matters." },

    { t: "p", text: "**Environment variables are read once, at process start.** Update the ConfigMap and the running process keeps the old value for ever; it changes on the next restart. **Mounted files are updated in place** by the kubelet, within about a minute, so a process that re-reads the file picks up the new value with no restart." },

    { t: "p", text: "So rotating a credential delivered as an env var requires a rolling restart of every consumer, which is a deploy. Delivered as a file, it requires the application to re-read on failure — which, as lesson 4.4 argued for database connections, it should be doing anyway." },

    { t: "callout", kind: "warn", title: "An env var is visible everywhere a process is visible",
      body: [
        { t: "p", text: "Environment variables appear in `kubectl describe pod`, in crash dumps, in `/proc/<pid>/environ`, and in whatever your error tracker captures when an exception is reported. Lesson 4.4 made the same point about Compose: `environment:` is not a secret, and that is equally true here." },
        { t: "p", text: "Mounted files have the narrower exposure. For a credential, mount it; for a model version string or a threshold, an env var is fine and simpler." }
      ] },

    { t: "h2", n: "03", id: "model", text: "Where the model lives, in a pod",
      sub: "Three options, and why not a PersistentVolume" },

    { t: "p", text: "Lesson 4.3 framed this as a choice between baking the artifact into the image, pulling it at startup, or mounting it — and said the choice defines what rollback means. Kubernetes makes the second option genuinely good and the third genuinely bad." },

    { t: "code", lang: "yaml", title: "The init-container pattern (presented, not applied)",
      code: `spec:
  volumes:
    - name: model
      emptyDir: {}                 # a scratch directory, lives with the pod

  initContainers:
    - name: fetch-model
      image: model-fetcher:1.4     # has the cloud SDK; the app image does not
      env:
        - name: MODEL_URI
          value: s3://models/loan-approval/4d8e8c10a2bb.onnx
      volumeMounts:
        - { name: model, mountPath: /model }

  containers:
    - name: api
      image: loan-api@sha256:...   # pinned by digest, lesson 4.3
      volumeMounts:
        - { name: model, mountPath: /model, readOnly: true }` },

    { t: "p", text: "Three properties make this the right shape. **A failed download is a pod that never becomes ready**, so the ReplicaSet's rollout stalls and the previous version keeps serving — rather than a running server with no model, which a readiness probe then has to catch. **The cloud SDK and its credentials live in the fetcher image**, not in the app image, which is lesson 4.5's surface reduction. And **`emptyDir` is per-pod scratch**: it is created with the pod and deleted with it, so there is no shared mutable state." },

    { t: "p", text: "Two mechanics to know. `emptyDir` is backed by the node's disk and **counts against ephemeral-storage limits**, so a multi-gigabyte model needs that limit raised or the pod is evicted. And `emptyDir: { medium: Memory }` makes it a tmpfs, which is the fix for lesson 4.1's 64 MB `/dev/shm` problem — but it then **counts against the memory limit**, which given lesson 5.3's 260.9 MB floor is a real consideration." },

    { t: "callout", kind: "trap", title: "A PersistentVolume for a serving model is the wrong answer",
      body: [
        { t: "p", text: "It reintroduces every problem lesson 4.3 identified with a mounted model, and adds Kubernetes-specific ones. The artifact becomes mutable state outside any versioning, with no record of who replaced it. A `ReadWriteOnce` volume — which is what most block storage provides — can only attach to **one node**, so your Deployment cannot schedule replicas across nodes. And `ReadWriteMany` means a network filesystem, whose latency is now in your model load path." },
        { t: "p", text: "PersistentVolumes are for things that are genuinely stateful: a database, a vector store, a training job's checkpoint directory. A serving model is not state; it is a versioned artifact, and it belongs in an image or an `emptyDir`." }
      ] },

    { t: "diagram", kind: "matrix", id: "dg-5_4-03-0",
      title: "Four homes for a model in a pod",
      caption: "The first two are the real options. **Baked in is simplest and makes the image digest identify the behaviour; the init container decouples model from code at the cost of a startup dependency** — and the bottom two should be rejected for the reasons given.",
      rows: ["Baked into the image", "emptyDir + init container", "ConfigMap", "PersistentVolume"],
      cols: ["Viable?", "Why"],
      cells: [
        [{ text: "yes, the default", tone: "good" }, { text: "digest identifies code + model", tone: "good" }],
        [{ text: "yes, for large models", tone: "good" }, { text: "failed fetch stalls the rollout", tone: "good" }],
        [{ text: "no", tone: "crit" }, { text: "etcd's ~1 MB object limit (lesson 5.1)", tone: "crit" }],
        [{ text: "no, for serving", tone: "crit" }, { text: "unversioned state; RWO pins one node", tone: "crit" }]
      ] },

    { t: "h2", n: "04", id: "securitycontext", text: "securityContext",
      sub: "Where lesson 4.5's hardening is actually enforced" },

    { t: "p", text: "Lesson 4.5 listed three cheap flags that remove most of the container attack surface. In Kubernetes they are `securityContext` fields, and the important difference is that they can be **enforced centrally** rather than hoped for in each manifest." },

    { t: "code", lang: "yaml", title: "The hardened pod (presented, not applied)",
      code: `securityContext:                  # pod level
  runAsNonRoot: true
  runAsUser: 10001                # lesson 4.3's explicit uid
  fsGroup: 10001                  # so mounted volumes are group-writable
  seccompProfile: { type: RuntimeDefault }

containers:
  - name: api
    securityContext:              # container level
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: { drop: ["ALL"] }
    volumeMounts:
      - { name: tmp, mountPath: /tmp }      # because the root fs is read-only
volumes:
  - name: tmp
    emptyDir: {}` },

    { t: "p", text: "`readOnlyRootFilesystem: true` is the one that needs the extra volume: a read-only root means `/tmp` is unwritable, and Python writes there — so an `emptyDir` at `/tmp` is part of the pattern rather than an afterthought. Lesson 4.3's `PYTHONDONTWRITEBYTECODE=1` removes the other common write." },

    { t: "callout", kind: "good", title: "Enforce it with a policy, or it will be omitted",
      body: [
        { t: "p", text: "Every field above is optional and defaults to the insecure value. A manifest that omits them runs as root with a writable filesystem and all capabilities, and nothing complains." },
        { t: "p", text: "**Pod Security Admission** is built in: labelling a namespace `pod-security.kubernetes.io/enforce: restricted` rejects pods that do not meet the baseline. For anything beyond the three built-in levels, an admission controller — Kyverno or Gatekeeper — enforces arbitrary policy at the API server, which is the admission step from lesson 5.1's chain. Either way the control belongs at the cluster, not in a review checklist." }
      ] },

    { t: "h2", n: "05", id: "rbac", text: "RBAC and the ServiceAccount",
      sub: "What the pod itself can do" },

    { t: "p", text: "Every pod runs as a **ServiceAccount**, and gets one whether you specify it or not — the namespace's `default`. By default a token for it is mounted into the pod at a well-known path, which means your model server is carrying an API credential it has no use for." },

    { t: "p", text: "Two settings follow. `automountServiceAccountToken: false` on a pod that does not call the Kubernetes API, which a model server does not. And a dedicated ServiceAccount with no permissions for anything that does — rather than the `default`, whose bindings tend to accumulate." },

    { t: "p", text: "The ServiceAccount is also the identity half of the external-secrets pattern from section 1: cloud workload identity federation binds a ServiceAccount to an IAM role, so the pod can fetch its credential from the secret manager without a long-lived key anywhere. That is the same OIDC mechanism lesson 6.3 uses to give CI access without a stored secret." },

    { t: "exercise", kind: "practice", title: "Audit one namespace", difficulty: "core", minutes: 25,
      prompt: "For a namespace you have access to, check five things. List the Secrets and decode one you are authorised to read, to make the base64 point concrete. Then check who can `create pods` in that namespace and note that this is equivalent to reading every Secret in it. Check whether credentials are delivered as env vars or mounted files, and work out what rotating one would require. Find where your model artifact comes from and, if it is a PersistentVolume, determine its access mode and whether that constrains scheduling. Finally, check whether any pod sets `runAsNonRoot` and `readOnlyRootFilesystem`, and whether the namespace has a Pod Security Admission label enforcing it.",
      hints: [
        "`kubectl auth can-i --list --as=<user> -n <ns>` is the fastest way to see the create-pods grant.",
        "An env-var credential means rotation is a rolling restart of every consumer — which is a deploy, and worth knowing before the rotation is urgent.",
        "If no pod sets a securityContext, the namespace label is the one change that fixes all of them at once."
      ],
      solution: {
        body: [
          { t: "p", text: "The create-pods finding is the one worth escalating: it is a routine grant that most teams do not realise is equivalent to read on every Secret in the namespace, and it is the reason high-stakes credentials belong in an external store with workload identity rather than in a Secret." },
          { t: "p", text: "The securityContext audit usually comes back empty, because every field defaults to the insecure value and nothing warns. The fix is one namespace label rather than a change to every manifest, which makes it unusually cheap for the surface it removes." }
        ]
      } }

  ],

  takeaways: [
    "**A Secret is base64, not encryption** — `base64 -d` is the whole attack, and by default etcd stores the value in plaintext.",
    "**Encryption at rest is a separate, often-unenabled feature**, and it does not change who can read the value through the API.",
    "**`create pods` in a namespace is equivalent to read on every Secret in it**, because a pod can mount one and print it — which is why routine developer access defeats a Secret.",
    "**For credentials that matter, use workload identity plus an external secret manager**: short-lived, audited, rotatable without a redeploy, and never a cluster object.",
    "**Env vars are read once at process start; mounted files are updated in place** within about a minute — so env-var rotation requires a rolling restart of every consumer.",
    "**Env vars leak widely**: `kubectl describe`, `/proc/<pid>/environ`, crash dumps and error trackers. Mount credentials; env vars are fine for a threshold or a version string.",
    "**A model in a ConfigMap is impossible** — lesson 5.1's ~1 MB etcd object limit, and the rejection message is easy to misread.",
    "**The init-container + emptyDir pattern is the good version of pull-at-startup**: a failed fetch stalls the rollout and keeps the old version serving, and the cloud SDK stays out of the app image.",
    "**`emptyDir` counts against ephemeral-storage limits**, and `medium: Memory` counts against the memory limit — relevant given lesson 5.3's 260.9 MB floor.",
    "**A PersistentVolume for a serving model is wrong**: unversioned mutable state, and ReadWriteOnce attaches to one node, so replicas cannot spread.",
    "**`readOnlyRootFilesystem` needs an `emptyDir` at `/tmp`**, because Python writes there; `PYTHONDONTWRITEBYTECODE` removes the other common write.",
    "**Every securityContext field defaults to the insecure value**, so enforce with Pod Security Admission's `restricted` label or an admission controller rather than per-manifest review.",
    "**Set `automountServiceAccountToken: false`** on a model server, which otherwise carries an API credential it never uses."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A developer has permission to create pods in a namespace but not to read Secrets. Can they obtain a Secret's value?",
        options: [
          "No — RBAC denies the read, so the value is protected",
          "Yes: they can create a pod that mounts the Secret and prints it, so `create pods` is effectively read on every Secret in the namespace",
          "Only if the Secret is mounted as an environment variable rather than a file"
        ],
        answer: 1,
        why: "A pod whose command is `cat /secrets/password` is an ordinary pod. This is why a Secret is an access-control boundary rather than a cryptographic one, and why high-stakes credentials belong in an external store reached through workload identity."
      },
      {
        stem: "You rotate a database password delivered to pods as an environment variable from a Secret. What is required for the change to take effect?",
        options: [
          "Nothing — the kubelet updates environment variables within about a minute",
          "A restart of every consuming pod, because environment variables are read once at process start; a mounted file would be updated in place instead",
          "A new Secret with a different name, referenced by an updated Deployment"
        ],
        answer: 1,
        why: "Mounted files are updated in place by the kubelet, so an application that re-reads on failure picks up a rotated credential without a restart. As an env var, rotation is a rolling restart of every consumer — which is a deploy, and worth knowing before the rotation is urgent."
      },
      {
        stem: "Why is a PersistentVolume a poor place for a serving model's artifact?",
        options: [
          "PersistentVolumes are too slow to load a model from",
          "It becomes unversioned mutable state with no record of who changed it, and a ReadWriteOnce volume attaches to a single node, so replicas cannot be scheduled across nodes",
          "Kubernetes does not permit read-only mounts of PersistentVolumes"
        ],
        answer: 1,
        why: "The scheduling constraint is the one that bites first: most block storage is ReadWriteOnce, so the Deployment is pinned to one node. ReadWriteMany means a network filesystem whose latency enters the model load path. A serving model is a versioned artifact, not state — it belongs in the image or an emptyDir."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Are Kubernetes Secrets secure?",
        strong: "They are an access-control boundary, not a cryptographic one. The values are base64-encoded, so decoding is one command, and by default etcd holds them in plaintext — encryption at rest is a separate feature many clusters never enable, and it does not change who can read through the API anyway. The grant people underestimate is `create pods`: anyone who can create a pod in the namespace can mount the Secret and print it, so a routine developer permission is effectively read access to every Secret there. So I use Secrets for low-stakes values and for delivering something fetched from elsewhere, and for credentials that matter I use workload identity with an external secret manager — short-lived tokens tied to a ServiceAccount, audited by the store, rotatable without a redeploy.",
        answer: [
          { t: "p", text: "The create-pods equivalence is the detail that demonstrates real understanding; the base64 point alone is common knowledge." },
          { t: "p", text: "Ending with the external pattern and naming what it buys — audit and rotation without redeploy — keeps the answer constructive rather than just critical." }
        ]
      },
      {
        level: "senior",
        q: "Where should a model artifact live in a Kubernetes deployment?",
        strong: "In the image by default, or in an emptyDir filled by an init container for large models — and not on a PersistentVolume. Baked in means the image digest identifies code and model together, so 'which model is serving' is answerable from the running image and rollback is redeploying a tag. The init-container pattern decouples them for multi-gigabyte artifacts and has two properties I like: a failed download leaves a pod that never becomes ready, so the rollout stalls and the previous version keeps serving, and the cloud SDK with its credentials lives in the fetcher image rather than the app image. I would reject a PersistentVolume because it makes the artifact unversioned mutable state and, more practically, ReadWriteOnce block storage attaches to one node so the Deployment cannot spread replicas. And a ConfigMap is not an option at all — etcd's object limit is around a megabyte.",
        answer: [
          { t: "p", text: "The failed-download-stalls-the-rollout property is the strongest argument for init containers and the one most people have not thought through." },
          { t: "p", text: "The ReadWriteOnce scheduling constraint is a concrete, checkable objection to PersistentVolumes that goes beyond the architectural argument." }
        ]
      }
    ]
  }
});
