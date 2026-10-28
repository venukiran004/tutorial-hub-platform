EC.receiveLesson({
  id: "6.4",

  lede: "GitOps inverts the direction of deployment: instead of CI pushing to the cluster, a controller **inside** the cluster pulls from a repository and reconciles continuously. Simulated as two loops against the same scenario, the difference is not the deploy — both applied v2 — it is what happens afterwards. Someone scales a Deployment by hand at t=10; the push model leaves that change in place **for ever**, with nothing recording that the cluster no longer matches the repository, and the pull model **reverted it at t=15** and logged the drift. Which is also the cost: it will revert a legitimate emergency change just as fast, so the break-glass procedure becomes part of the design.",

  objectives: [
    "State what reverses between push and pull deployment, and what each does about drift",
    "Explain why pull changes the credential model and the audit trail",
    "Distinguish synced from healthy, and say why both are needed",
    "Design the break-glass procedure before it is needed"
  ],

  prerequisites: ["6.3"],

  blocks: [

    { t: "h2", n: "01", id: "invert", text: "What actually reverses",
      sub: "Not the YAML — the direction and the duration" },

    { t: "p", text: "In the push model, CI holds a cluster credential and runs `kubectl apply` or `helm upgrade` at the end of a successful pipeline. The deployment is an **event**: it happens, it finishes, and nothing watches afterwards." },

    { t: "p", text: "In the pull model, a controller runs in the cluster, watches a git repository, and continuously makes the cluster match it. The deployment is a **state**: the repository describes what should be true, and a loop keeps making it true — which is lesson 5.1's control loop extended to include your manifests." },

    { t: "code", lang: "python", title: "m6.py — the two models, as loops",
      code: `def push_model(events):
    """CI pushes on merge. Nothing watches afterwards."""
    cluster = {"version": "v1", "replicas": 3}
    for t, ev, arg in events:
        if ev == "merge":
            cluster["version"] = arg          # CI applies, then stops caring
        elif ev == "manual":
            cluster.update(arg)               # and nothing notices

def gitops_model(events, period=5):
    """A controller reconciles the cluster against the repo, forever."""
    repo = {"version": "v1", "replicas": 3}
    cluster = dict(repo)
    for t, ev, arg in events:
        if ev == "merge":
            repo["version"] = arg             # the repo changes
        elif ev == "manual":
            cluster.update(arg)
        elif ev == "tick" and t % period == 0:
            if cluster != repo:
                cluster = dict(repo)          # and the loop closes the gap` },

    { t: "p", text: "The same scenario through both: deploy v2 at t=0, a human scales replicas from 3 to 9 at t=10, then nothing for twenty more ticks." },

    { t: "code", lang: "python", title: "m6.py — the outcome",
      out: `  PUSH (CI applies)
     t=0   CI applied v2
     t=10  human changed {'replicas': 9}
     final cluster: {'version': 'v2', 'replicas': 9}

  PULL (GitOps)
     t=0   repo updated to v2
     t=5   controller reconciled {'version': ('v1', 'v2')}
     t=10  human changed {'replicas': 9}
     t=15  controller reconciled {'replicas': (9, 3)}
     final cluster: {'version': 'v2', 'replicas': 3}` },

    { t: "p", text: "Both applied v2. The difference is the manual change: **push leaves `replicas: 9` in place indefinitely** and nothing anywhere records that the cluster and the repository disagree, while **pull reverted it one period later** and logged the diff." },

    { t: "callout", kind: "insight", title: "The repository stops being a record and becomes the definition",
      body: [
        { t: "p", text: "Under push, the manifest in git is a *description of what was applied once*. Divergence accumulates silently — lesson 6.1's drift problem, with the same cause: nothing is comparing. Under pull, the repository is the **definition**, and the cluster is a cache of it that is continuously refreshed." },
        { t: "p", text: "That is what makes the question *what is running in production* answerable by reading the repository, which under push it never is." }
      ] },

    { t: "h2", n: "02", id: "drift", text: "Drift, and the same choice as Terraform",
      sub: "Self-heal is a decision, not a default virtue" },

    { t: "p", text: "The reversion at t=15 is ArgoCD's `selfHeal`, and it is optional — which it should be, because it is the same trade lesson 6.1 identified for Terraform drift. The controller does not know whether `replicas: 9` was a mistake or a response to an incident." },

    { t: "code", lang: "yaml", title: "The policy that decides it (presented, not applied)",
      code: `syncPolicy:
  automated:
    prune: true        # delete objects removed from the repo
    selfHeal: true     # revert manual changes -- the t=15 behaviour
  syncOptions:
    - CreateNamespace=true

# And the escape hatch for things the cluster legitimately owns:
# ignoreDifferences:
#   - group: apps
#     kind: Deployment
#     jsonPointers: ["/spec/replicas"]      # the HPA owns this` },

    { t: "p", text: "That `ignoreDifferences` block is lesson 6.1's `ignore_changes` under a different name, solving exactly the same problem: **two systems believing they own one field.** If a HorizontalPodAutoscaler owns the replica count (lesson 5.3), then a GitOps controller with `selfHeal` will fight it — reverting the autoscaler's decision every sync period, which produces a cluster that oscillates and an incident nobody can explain." },

    { t: "callout", kind: "trap", title: "`prune: true` deletes what you removed, including by accident",
      body: [
        { t: "p", text: "Pruning is the half of reconciliation that handles deletion: an object removed from the repository is removed from the cluster. It is necessary — without it, deleting a manifest leaves the object running for ever — and it is the mechanism by which a bad refactor deletes a production object, exactly as lesson 6.1's `destroy` does." },
        { t: "p", text: "The guardrails are a `Prevent Deletion` annotation on anything stateful, and reviewing the controller's diff before a sync rather than trusting the repository diff — for the same reason lesson 6.1 insisted on reading the Terraform plan rather than the `.tf` diff." }
      ] },

    { t: "h2", n: "03", id: "credentials", text: "What pull does to credentials",
      sub: "The strongest argument, and it is a security one" },

    { t: "p", text: "Under push, CI needs a credential that can change production. Lesson 6.3 improved that with OIDC — short-lived rather than stored — but the shape is unchanged: **an external system holds the ability to modify the cluster**, and it is a system that executes code from pull requests." },

    { t: "p", text: "Under pull, nothing outside the cluster has write access. The controller runs inside, holds its own permissions, and reads a repository. CI's only privilege is **write access to git**." },

    { t: "diagram", kind: "matrix", id: "dg-6_4-03-0",
      title: "Push against pull, on four axes",
      caption: "The credential row is the one that most often decides it. **Under pull, the set of things that can modify production is the set of things inside it** — and the audit trail becomes the git history, which exists whether anyone planned it or not.",
      rows: ["Cluster write access", "Drift after a manual change", "Audit trail", "Multi-cluster"],
      cols: ["Push (CI applies)", "Pull (GitOps)"],
      cells: [
        [{ text: "CI, which runs PR code", tone: "crit" }, { text: "a controller inside the cluster", tone: "good" }],
        [{ text: "persists for ever, unrecorded", tone: "crit" }, { text: "reverted in one period, logged", tone: "good" }],
        [{ text: "CI run logs, if retained", tone: "warn" }, { text: "the git history, by construction", tone: "good" }],
        [{ text: "N credentials in one CI system", tone: "crit" }, { text: "each cluster pulls for itself", tone: "good" }]
      ] },

    { t: "p", text: "The multi-cluster row scales the argument. Deploying to twelve clusters by push means twelve credentials in one CI system, and a compromise of that system is a compromise of all twelve. By pull, each cluster has a controller that reads the repository and nothing has cross-cluster write access — which is why GitOps is close to universal at that scale and optional at one cluster." },

    { t: "h2", n: "04", id: "synced", text: "Synced is not healthy",
      sub: "The distinction lesson 5.1 predicted" },

    { t: "p", text: "A GitOps controller reports two independent statuses, and conflating them is the commonest operational mistake with these tools." },

    { t: "dl", items: [
      { k: "Synced", v: "The objects in the cluster match the repository. This is the controller's own job and it is the equivalent of `kubectl apply` succeeding — which lesson 5.1 established means only that the API server accepted the objects." },
      { k: "Healthy", v: "Those objects are actually working: pods are ready, the Deployment's rollout completed, probes pass. This is the equivalent of `kubectl rollout status`." }
    ] },

    { t: "p", text: "**Synced and Degraded is the normal state of a failed deploy.** The controller did its job perfectly — the cluster matches the repository — and the thing in the repository does not work. A pipeline that gates on *synced* will report a broken deploy as a success, which is lesson 5.1's `apply`-is-not-a-check in a new costume." },

    { t: "p", text: "The two features that follow from the distinction are worth knowing by name. **Sync waves** order the objects within a sync — a namespace and a ConfigMap before the Deployment that needs them — because without ordering a Deployment can be created before its ConfigMap exists. And **progressive sync with health gating** will not proceed to the next wave until the previous one is healthy, which is what makes a GitOps rollout comparable to lesson 5.5's `helm upgrade --wait --atomic`." },

    { t: "h2", n: "05", id: "breakglass", text: "The break-glass procedure",
      sub: "Design it before the incident" },

    { t: "p", text: "Everything good about reconciliation becomes a problem at 3 a.m. A controller with `selfHeal` will undo the emergency change within one sync period, which during an outage is the platform actively fighting the person fixing it." },

    { t: "p", text: "So the procedure has to be decided in advance, and there are exactly three options:" },

    { t: "diagram", kind: "steps", id: "dg-6_4-05-0",
      title: "Three break-glass options, best first",
      caption: "**The first is the only one that preserves the invariant** — the repository still describes production — which is why it should be made fast enough to use under pressure. The other two are escape hatches with a cost.",
      items: [
        { label: "Commit the change", desc: "A one-line PR on an emergency approval path. Preserves the invariant and records the fix." },
        { label: "Suspend automated sync for that application", desc: "The controller stops reconciling, so manual changes stick. Rehearse it; un-suspending is forgotten." },
        { label: "Disable selfHeal permanently for that field", desc: "ignoreDifferences for a field the cluster owns, such as HPA replicas. A design fix, not break-glass." }
      ] },

    { t: "callout", kind: "good", title: "The failure mode is a suspended application nobody re-enables",
      body: [
        { t: "p", text: "Suspending sync is the easy option under pressure and the one that silently removes the guarantee. An application left suspended for three weeks is a cluster diverging from its repository with a controller that has been told not to care — the push model's problem, reintroduced deliberately." },
        { t: "p", text: "The control is an alert on *application suspended for longer than N hours*, which is cheap and is almost never configured. It belongs with the alerts lesson 7.4 covers." }
      ] },

    { t: "p", text: "Two honest limits to finish. **GitOps does not deploy a model** — it syncs manifests, so if the model artifact is baked into an image (lesson 4.3) a new model means a new image tag in the repository, which means something must write that tag. That writer is CI, and it is the one remaining push in the system. And **GitOps is not a rollout strategy**: lesson 3.3's canary and shadow still need a mesh or Argo Rollouts, as lesson 5.5 noted, because reverting the repository gives you an all-at-once rollback rather than a gradual one." },

    { t: "exercise", kind: "practice", title: "Find the drift and write the procedure", difficulty: "core", minutes: 25,
      prompt: "For a cluster you deploy to, establish two things. First, whether the repository currently matches the cluster: if you use GitOps, list applications that are OutOfSync or suspended and for how long; if you deploy by push, diff a live Deployment against the manifest in git and count the fields that differ. Second, write the break-glass procedure down — which of the three options your team would use, who can approve it, and how the change gets back into the repository afterwards. Then check for ownership conflicts: does anything in the repository specify a field that an autoscaler or an operator also writes?",
      hints: [
        "Under push, `kubectl get deploy -o yaml` against the manifest usually finds several differences, and replica count is the most common.",
        "A suspended application is the one to look for first — it is the push model reintroduced, and nothing alerts on it.",
        "Any field in the repository that an HPA also writes will oscillate under selfHeal, which is lesson 6.1's ownership conflict in a new tool."
      ],
      solution: {
        body: [
          { t: "p", text: "Under push, the diff almost always finds something: a replica count changed during an incident, an annotation added by a tool, a resource limit raised. None of it is recorded anywhere, which is the point — the repository was a description of one past apply." },
          { t: "p", text: "The break-glass answer that works is *commit it*, with an approval path that takes a minute rather than a day. Every team that relies on suspending sync eventually leaves something suspended, and an alert on suspension duration is the cheapest control for that." }
        ]
      } }

  ],

  takeaways: [
    "**Push makes a deployment an event; pull makes it a state.** CI applies and stops caring; a controller keeps making the cluster match the repository.",
    "**Both models applied v2 — the difference was afterwards**: a manual change at t=10 persisted for ever under push and was reverted at t=15 under pull, with the diff logged.",
    "**Under pull the repository becomes the definition rather than a record**, which is what makes 'what is running in production' answerable by reading it.",
    "**`selfHeal` is a decision, not a default virtue** — the controller cannot tell an emergency fix from a mistake, which is lesson 6.1's drift trade exactly.",
    "**`ignoreDifferences` is `ignore_changes` under another name**, and it is required wherever something else owns a field — an HPA-managed replica count will otherwise oscillate every sync period.",
    "**`prune: true` deletes objects removed from the repository**, which is necessary and is also how a bad refactor deletes a production object; annotate stateful things against deletion.",
    "**The credential argument is the strongest one**: under push, CI — a system that runs pull-request code — holds cluster write access. Under pull, nothing outside the cluster can modify it.",
    "**The audit trail becomes the git history by construction**, rather than CI run logs retained for ninety days.",
    "**Multi-cluster is where it stops being optional**: twelve clusters by push is twelve credentials in one CI system, and one compromise reaches all of them.",
    "**Synced is not healthy.** Synced means the cluster matches the repository — lesson 5.1's `apply` succeeded — and Synced + Degraded is the normal state of a failed deploy.",
    "**Gate on health, not on sync**, and use sync waves with health gating for ordering, which is the equivalent of `helm upgrade --wait --atomic`.",
    "**Decide break-glass in advance**: commit the change (best), suspend sync (rehearse it, and alert on how long it stays suspended), or `ignoreDifferences` for a field the cluster owns.",
    "**GitOps does not deploy a model** — something still has to write the new image tag into the repository, and that writer is CI: the one remaining push.",
    "**GitOps is not a rollout strategy**: reverting the repository is an all-at-once rollback, so canary and shadow still need a mesh or Argo Rollouts."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Someone runs `kubectl scale` on a Deployment by hand. What happens under push deployment versus GitOps with selfHeal?",
        options: [
          "Both revert it on the next CI run",
          "Push leaves it in place indefinitely with nothing recording the divergence; GitOps reverts it within one sync period and logs the diff",
          "Push reverts it immediately; GitOps records it as the new desired state"
        ],
        answer: 1,
        why: "Measured in the simulation: the manual change at t=10 survived to the end under push, and was reverted at t=15 under pull. Nothing in the push model is comparing the cluster to the repository, which is why the manifest in git degrades into a description of one past apply."
      },
      {
        stem: "Your GitOps application reports Synced but the new version is not serving. Is the controller working?",
        options: [
          "No — Synced should only be reported once pods are ready",
          "Yes, perfectly: Synced means the cluster matches the repository, which is the controller's job. Healthy is the separate status saying those objects work, and Synced + Degraded is the normal state of a failed deploy",
          "No — Synced indicates a partial sync that needs retrying"
        ],
        answer: 1,
        why: "This is lesson 5.1's point that `kubectl apply` succeeding means only that objects were accepted. A pipeline gating on Synced will report a broken deploy as a success; it has to gate on Healthy, which is the equivalent of `kubectl rollout status`."
      },
      {
        stem: "A HorizontalPodAutoscaler manages replicas and the repository also specifies `replicas: 3`, with selfHeal enabled. What happens?",
        options: [
          "The HPA takes precedence, since it is a controller inside the cluster",
          "They fight: the HPA scales up and the GitOps controller reverts to 3 every sync period, producing an oscillating cluster and an incident nobody can explain",
          "The GitOps controller detects the HPA and stops managing that field"
        ],
        answer: 1,
        why: "Two systems believing they own one field — lesson 6.1's ownership conflict in a different tool. The fix is `ignoreDifferences` on `/spec/replicas`, which is `ignore_changes` by another name, or removing the field from the repository entirely."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is GitOps, and what does it actually change?",
        strong: "It inverts the direction: instead of CI pushing to the cluster, a controller inside the cluster pulls from a repository and reconciles continuously. The deploy itself is not the difference — both models apply the new version. What changes is afterwards. I simulated the same scenario through both: someone scales a Deployment by hand, and under push that change persists indefinitely with nothing recording that the cluster and the repository disagree, while under pull the controller reverts it within one sync period and logs the drift. So the repository stops being a description of one past apply and becomes the definition, which is what makes 'what is running in production' answerable by reading it. The other big change is credentials: under push, CI holds cluster write access and CI runs pull-request code; under pull, nothing outside the cluster can modify it.",
        answer: [
          { t: "p", text: "Leading with 'the deploy is not the difference' is a strong framing, because it redirects to the part that actually matters and that most descriptions skip." },
          { t: "p", text: "The credential point is the one that persuades security-minded interviewers, and noting that CI executes PR code sharpens it." }
        ]
      },
      {
        level: "senior",
        q: "What are the downsides of GitOps?",
        strong: "Three, and they are real. Reconciliation will revert a legitimate emergency change as fast as a mistaken one, because the controller cannot tell them apart — so the break-glass procedure becomes part of the design, and the only option that preserves the invariant is committing the fix with an approval path fast enough to use under pressure. Teams that rely on suspending sync instead eventually leave something suspended for weeks, which is the push model reintroduced deliberately, and almost nobody alerts on suspension duration. Second, ownership conflicts: anything an autoscaler or operator writes will oscillate against selfHeal every sync period, which needs ignoreDifferences — the same problem as Terraform drift. Third, scope: it syncs manifests, so it does not deploy a model. If the artifact is in an image, something still has to write the new tag into the repository, and that writer is CI — the one remaining push. And it is not a rollout strategy either; reverting the repository is all-at-once, so canary still needs a mesh or Argo Rollouts.",
        answer: [
          { t: "p", text: "The suspended-application failure mode is the most useful thing in this answer because it is operational, common, and rarely anticipated." },
          { t: "p", text: "Noting that something must still push the image tag shows the boundary of the model is understood, which is a frequent source of confusion when teams expect GitOps to handle model releases." }
        ]
      }
    ]
  }
});
