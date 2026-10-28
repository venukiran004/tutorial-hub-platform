EC.receiveLesson({
  id: "5.1",

  lede: "Kubernetes is one idea repeated: a **controller** compares desired state to observed state and acts to close the gap, forever. Everything else — Deployments, ReplicaSets, autoscalers, operators — is that loop with a different noun. Getting this straight is what turns `kubectl apply` from an incantation into a traceable sequence of five components writing to and watching one database. **No cluster is reachable from this machine** (`cluster-info` is refused on 127.0.0.1, though kubectl v1.30.6 and the Python client 36.0.3 are both installed), so the manifests here are presented; what *is* measured in this module is the arithmetic — QoS classes, the memory limit that OOMKills on startup, and HPA's 44.8-second lag.",

  objectives: [
    "State the control loop and explain why it makes the API declarative rather than imperative",
    "Trace what happens between `kubectl apply` and a running pod, naming each component",
    "Explain why a pod is the unit of scheduling rather than a container",
    "Say what `kubectl apply` returning successfully does and does not tell you"
  ],

  prerequisites: ["4.5"],

  blocks: [

    { t: "callout", kind: "note", title: "Executed and not executed, in this module",
      body: [
        { t: "p", text: "There is no cluster here, so nothing is applied. The manifests are presented and labelled as such." },
        { t: "p", text: "The arithmetic, though, needs no cluster and is measured: lesson 5.3 derives the QoS classes, shows that a **256 MB memory limit OOMKills this course's model service on startup** against a 260.9 MB resident floor, computes HPA's **44.8-second best-case lag** using the 2.82-second boot measured in lesson 2.1, and prices the latency-versus-utilisation curve from the 1.936 ms service time measured there too." }
      ] },

    { t: "h2", n: "01", id: "loop", text: "One loop, repeated",
      sub: "The whole of the system, in four lines" },

    { t: "p", text: "Almost every Kubernetes component is the same program:" },

    { t: "code", lang: "python", title: "The controller pattern, as pseudocode",
      code: `while True:
    desired  = read_spec_from_api()        # what you declared
    observed = read_status_of_world()      # what is actually running
    for difference in diff(desired, observed):
        act(difference)                    # create, delete, or update one thing` },

    { t: "p", text: "That is the Deployment controller, the ReplicaSet controller, the scheduler, the kubelet, the HorizontalPodAutoscaler and every operator anyone has ever written. They differ only in which objects they read and what `act` does." },

    { t: "p", text: "Three consequences follow, and they explain most of Kubernetes' behaviour." },

    { t: "p", text: "**The API is declarative because the loop is a loop.** You do not tell Kubernetes to start three pods; you record that three are wanted, and a controller keeps noticing the gap. Delete a pod by hand and it comes back — not because deletion was blocked, but because the Deployment's replica count still says three and the loop ran again." },

    { t: "p", text: "**Failure handling is free.** A node dies, its pods stop being observed, the gap reappears, and the controller closes it. There is no separate recovery path to write, which is the single biggest difference from running containers yourself." },

    { t: "p", text: "**Everything is eventually consistent.** The loop has a period. There is no moment at which desired and observed are guaranteed to match, which is why the API gives you `spec` and `status` as two different things — and why checking `status` rather than assuming is the discipline the whole platform requires." },

    { t: "callout", kind: "mental", title: "spec is what you want, status is what is",
      body: [
        { t: "p", text: "Every Kubernetes object has both. `spec` is yours to write; `status` is a controller's to write. Reading `spec` tells you what was asked for and nothing about reality — which is why `kubectl get deploy` showing `3/3` is informative and `kubectl apply` succeeding is not." }
      ] },

    { t: "h2", n: "02", id: "apply", text: "What `kubectl apply` actually does",
      sub: "Five components, one database" },

    { t: "p", text: "The interview question *what happens when you run `kubectl apply -f deployment.yaml`* is a good one, because the answer is a chain of independent loops rather than a procedure." },

    { t: "diagram", kind: "steps", id: "dg-5_1-02-0",
      title: "From a file to a running container",
      caption: "Six steps, and only the first involves kubectl. **Each subsequent actor is watching the API server, not being called by the previous one** — which is why the chain continues if you close your laptop, and why a break in it is diagnosed by asking which actor stopped acting.",
      items: [
        { label: "kubectl: validate, authenticate, POST to the API server", desc: "Client-side schema check, then an HTTPS request. kubectl's involvement ends here; it does not create anything itself." },
        { label: "API server: authn, authz, admission, then write to etcd", desc: "Admission webhooks can mutate or reject here — this is where a policy that forbids root (lesson 4.5) is enforced." },
        { label: "Deployment controller: sees a Deployment with no ReplicaSet", desc: "Creates one. It never creates pods, which is what makes a rolling update two ReplicaSets." },
        { label: "ReplicaSet controller: sees 0 pods, wants 3", desc: "Creates three Pod objects with no node assigned. They are now records in etcd, not processes." },
        { label: "Scheduler: sees pods with nodeName empty", desc: "Filters nodes by feasibility (resources, taints, affinity), scores the survivors, writes nodeName. Still no container." },
        { label: "kubelet: sees a pod assigned to its own node", desc: "Pulls the image, starts the container, reports status. Where a process finally exists." }
      ] },

    { t: "p", text: "The thing worth taking from that sequence is that **the API server is the only component anyone talks to.** The controllers do not call each other; each watches the database and reacts. So the system has no orchestration code in the usual sense, and a stuck deployment is diagnosed by walking the chain and asking which actor has not acted — `kubectl describe` on the Deployment, the ReplicaSet, then the Pod, where the answer almost always is." },

    { t: "callout", kind: "trap", title: "`apply` succeeding means your YAML was accepted, nothing more",
      body: [
        { t: "p", text: "`deployment.apps/loan-api configured` means the API server wrote the object to etcd. It does not mean a pod was scheduled, an image was pulled, or a container started. Every one of those can fail afterwards, asynchronously, and `apply` has already returned 0." },
        { t: "p", text: "This is why CI pipelines that deploy and immediately report success are lying. The check has to be on `status` — `kubectl rollout status deployment/loan-api --timeout=5m`, which blocks until the new ReplicaSet's pods are ready or the timeout expires. Lesson 6.4's GitOps controllers make the same distinction between *synced* and *healthy*." }
      ] },

    { t: "h2", n: "03", id: "pod", text: "Why the unit is a pod",
      sub: "A shared namespace, not a container" },

    { t: "p", text: "Kubernetes does not schedule containers. It schedules **pods**: one or more containers that share a network namespace, an IPC namespace and any declared volumes. Lesson 4.1's three mechanisms explain exactly what that means — the containers in a pod have their own *mount* namespaces, so separate filesystems, and share the *network* namespace, so they reach each other on `localhost`." },

    { t: "p", text: "That is the one place where lesson 4.4's rule inverts. Between pods, `localhost` is wrong and a service name is right. **Within** a pod, `localhost` is exactly right, because there is one network namespace between them." },

    { t: "p", text: "Which makes the sidecar pattern possible, and it has two genuinely useful ML applications:" },

    { t: "dl", items: [
      { k: "An init container that fetches the model", v: "Runs to completion before the app container starts, downloading the artifact to a shared `emptyDir`. This is lesson 4.3's pull-at-startup option, expressed so that a failed download is a pod that never becomes ready rather than a server with no model." },
      { k: "A sidecar for the thing the app should not do", v: "Log shipping, a metrics exporter, a proxy that terminates TLS. The app writes to a shared volume or localhost and stays ignorant of the platform." }
    ] },

    { t: "callout", kind: "good", title: "An init container is the right place for a model download",
      body: [
        { t: "p", text: "Put the download in the app's own startup and a failure gives you a running container that cannot serve, which has to be caught by a readiness probe. Put it in an init container and the pod simply never reaches `Running`, so the ReplicaSet's rollout stalls and the previous version keeps serving — which is the behaviour you want." },
        { t: "p", text: "It also keeps the app image free of cloud SDK credentials and code, which is lesson 4.5's surface reduction." }
      ] },

    { t: "h2", n: "04", id: "objects", text: "The object model, minimally",
      sub: "What each layer is for" },

    { t: "p", text: "The nesting is often presented as bureaucracy. Each layer exists for one reason." },

    { t: "table",
      head: ["Object", "What it owns", "Why it is a separate thing"],
      rows: [
        ["Pod", "one or more containers, a shared network namespace", "The unit of scheduling and of co-location. Rarely created directly."],
        ["ReplicaSet", "a count of identical pods from one template", "Owns the count. A rolling update is two ReplicaSets with opposite counts."],
        ["Deployment", "a succession of ReplicaSets", "Owns the rollout strategy and the history, which is what makes rollback an object operation."],
        ["Service", "a stable name and virtual IP over a changing pod set", "Pods are mortal and their IPs change; a Service is the indirection that survives them."],
        ["Node", "a kubelet and a container runtime", "Where pods actually run. Also mortal, which the control loop handles for free."]
      ] },

    { t: "p", text: "The Deployment-over-ReplicaSet split is the one worth understanding, because it is how every rollout strategy in lesson 3.3 is implemented: a rolling update creates a second ReplicaSet and moves the replica counts between them a few at a time. Which means `kubectl rollout undo` is not a redeploy — it scales the old ReplicaSet back up, and the old pod template is still recorded. That is lesson 3.6's one-command rollback, and it is why it is fast." },

    { t: "h2", n: "05", id: "etcd", text: "etcd, and what being a database implies",
      sub: "Three consequences that bite" },

    { t: "p", text: "All state lives in etcd, a consistent key-value store. Three practical consequences follow from that being a real database rather than an abstraction." },

    { t: "p", text: "**The watch mechanism is why the system scales.** Controllers do not poll; they open a watch and receive changes. A thousand controllers cost one stream each rather than a thousand polls per second." },

    { t: "p", text: "**Objects have a size limit** — roughly 1 MB per object, since etcd is not a blob store. This is the mechanism behind a specific ML failure: a ConfigMap is not a place to put a model, an embedding table or a large feature list, and the error when you try is a confusing rejection at admission time rather than anything about size." },

    { t: "p", text: "**A backup of etcd is a backup of the cluster's intent, not its data.** Restoring it brings back every object definition; it brings back nothing from a PersistentVolume. For a stateless model service that is a complete backup. For anything holding state it is half of one, which is lesson 5.4's storage question." },

    { t: "diagram", kind: "flow", id: "dg-5_1-05-0",
      title: "Everything reads and writes one database",
      caption: "There are no arrows between controllers. **Each one watches etcd through the API server and reacts to what it sees** — which is why components can be restarted independently, and why a failure is localised to one actor rather than breaking a pipeline.",
      cols: 3,
      nodes: [
        { id: "k", label: "kubectl / CI / GitOps", sub: "writes spec", tone: "accent" },
        { id: "a", label: "API server", sub: "authn, authz, admission", tone: "violet" },
        { id: "e", label: "etcd", sub: "all state, ~1 MB per object", tone: "amber" },
        { id: "c", label: "controllers", sub: "Deployment, ReplicaSet, HPA", tone: "good" },
        { id: "s", label: "scheduler", sub: "assigns nodeName", tone: "good" },
        { id: "kl", label: "kubelets", sub: "start containers, write status", tone: "good" }
      ],
      edges: [["k", "a"], ["a", "e"], ["c", "a"], ["s", "a"], ["kl", "a"]] },

    { t: "exercise", kind: "practice", title: "Walk the chain on paper", difficulty: "intro", minutes: 20,
      prompt: "Without a cluster, write out the diagnosis path for three stuck deployments, naming the component at fault and the command that would confirm it. First: `kubectl apply` succeeded, `kubectl get pods` shows nothing at all. Second: pods exist with status `Pending` and no node assigned. Third: pods are `Running` but the Service returns connection refused. For each, say which loop in section 2 has not completed its step, and which of `spec` or `status` you would read. Then, if you do have cluster access, delete a pod belonging to a Deployment and time how long it takes to return.",
      hints: [
        "Nothing at all usually means the controller above the pods never acted — check the ReplicaSet, not the pod.",
        "Pending with no node is the scheduler declining to place it: describe the pod and read the events for the reason.",
        "Running but refused is usually readiness or a label selector that matches nothing — Service to pod is by label, not by name."
      ],
      solution: {
        body: [
          { t: "p", text: "The point of the exercise is the habit of asking *which loop stopped* rather than *what is broken*. Case one is a ReplicaSet or quota problem, case two is the scheduler finding no feasible node — resources, taints, affinity — and case three is almost always a selector mismatch or a readiness probe that never passes." },
          { t: "p", text: "The deleted-pod test is worth doing because watching it come back in a couple of seconds makes the control loop concrete in a way reading about it does not. Nothing granted the deletion an exception; the gap simply reappeared and a controller closed it." }
        ]
      } }

  ],

  takeaways: [
    "**One control loop, repeated**: read desired, read observed, act on the difference, forever. Every controller, the scheduler, the kubelet and every operator is that program.",
    "**The API is declarative because the loop is a loop** — you record that three replicas are wanted, and deleting a pod by hand simply recreates the gap.",
    "**Failure handling is free.** A node dies, its pods stop being observed, and the controller closes the gap; there is no recovery path to write.",
    "**Everything is eventually consistent**, which is why every object has `spec` (yours) and `status` (a controller's), and why reading status is the required discipline.",
    "**`kubectl apply` succeeding means the object was written to etcd** — not scheduled, not pulled, not started. CI must check `kubectl rollout status`, not the exit code of apply.",
    "**Six actors between a file and a container**: kubectl, API server, Deployment controller, ReplicaSet controller, scheduler, kubelet — and only the first is kubectl.",
    "**Controllers do not call each other.** Each watches the API server, which is why a stuck rollout is diagnosed by asking which actor stopped acting.",
    "**The unit is a pod**: containers sharing a network and IPC namespace with separate filesystems — so within a pod `localhost` is correct, inverting lesson 4.4's rule.",
    "**An init container is the right place to fetch a model**: a failed download leaves a pod that never becomes ready, so the rollout stalls and the previous version keeps serving.",
    "**Deployment owns ReplicaSets, ReplicaSets own pod counts** — which is how a rolling update is expressed, and why `rollout undo` is a scale operation rather than a redeploy.",
    "**A Service exists because pod IPs change**, and it selects pods by label rather than by name.",
    "**etcd implies three things**: watches instead of polling, a ~1 MB object limit (so no models in ConfigMaps), and a backup that restores intent but no PersistentVolume data."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your CI runs `kubectl apply -f deploy.yaml`, gets exit code 0, and reports the deployment successful. What is wrong?",
        options: [
          "Nothing — a zero exit code from apply means the pods are running",
          "`apply` only means the object was accepted and written to etcd; scheduling, image pull and container start all happen afterwards and can each fail. CI must wait on `kubectl rollout status`",
          "`apply` should be `create` for a new deployment"
        ],
        answer: 1,
        why: "The asynchrony is the whole design: kubectl's job ends at the API server and six further actors react independently. This is the same distinction GitOps controllers draw between synced and healthy."
      },
      {
        stem: "You delete a pod that belongs to a Deployment and it reappears seconds later. Why?",
        options: [
          "Deletion of managed pods is blocked by the API server",
          "The ReplicaSet's desired replica count is unchanged, so the controller observed a gap between desired and actual and closed it",
          "kubectl automatically recreates pods it detects as missing"
        ],
        answer: 1,
        why: "The deletion genuinely succeeded. Nothing prevented it and nothing recreated that pod — a new one was created because the declared count still said three. This is the same mechanism that handles a node dying, which is why failure recovery needs no separate code."
      },
      {
        stem: "Why can't you store a 5 MB model file in a ConfigMap?",
        options: [
          "ConfigMaps only accept text, not binary data",
          "All state lives in etcd, which is a consistent key-value store with an object size limit around 1 MB — it is not a blob store",
          "ConfigMaps are mounted read-only, so the model could not be loaded"
        ],
        answer: 1,
        why: "ConfigMaps do accept binary via binaryData, so the first option is wrong for the stated reason. The limit is etcd's, which also rules out embedding tables and large feature lists — and the rejection arrives at admission time with a message about size that is easy to misread."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What happens when you run `kubectl apply -f deployment.yaml`?",
        strong: "kubectl validates the YAML and POSTs it to the API server, which authenticates, authorises, runs admission webhooks and writes the object to etcd — and that is where apply's involvement ends, so a zero exit code means accepted, not running. Then four independent loops react to what they see in etcd: the Deployment controller notices a Deployment with no ReplicaSet and creates one; the ReplicaSet controller notices it has zero of three pods and creates three Pod objects with no node; the scheduler notices pods with an empty nodeName, filters nodes for feasibility, scores them and writes nodeName; and the kubelet on that node notices a pod assigned to it, pulls the image and starts the container. None of those components calls another — each watches the API server, which is why a stuck rollout is diagnosed by asking which actor has not acted.",
        answer: [
          { t: "p", text: "Naming the actors in order and stressing that they watch rather than call is what separates a real answer from a recitation. The 'accepted, not running' point is the practical consequence worth leading with." },
          { t: "p", text: "The diagnosis framing at the end invites the natural follow-up and shows the model is used rather than memorised." }
        ]
      },
      {
        level: "senior",
        q: "What is the single idea that explains most of Kubernetes?",
        strong: "A controller comparing desired state to observed state and acting on the difference, in a loop that never ends. Everything else is that pattern with a different noun — Deployment, ReplicaSet, scheduler, kubelet, autoscaler, any operator. Three things fall out of it. The API is declarative because the loop is a loop, so deleting a pod by hand just recreates the gap. Failure recovery is free: a node dies, its pods stop being observed, the gap reappears and the loop closes it — there is no separate recovery code, which is the biggest single difference from running containers yourself. And everything is eventually consistent, so every object carries spec and status as separate fields and the operational discipline is to read status rather than assume. That last point is why `kubectl apply` returning zero is not a deployment check.",
        answer: [
          { t: "p", text: "Leading with the loop and then deriving three consequences is the structure that demonstrates understanding rather than coverage. The free-failure-recovery point is the one that best explains why people accept the complexity." },
          { t: "p", text: "The spec/status distinction is the most practically useful thing in the answer, because it generalises to every object and to GitOps tooling." }
        ]
      }
    ]
  }
});
