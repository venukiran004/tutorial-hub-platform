EC.receiveLesson({
  id: "6.1",

  lede: "Terraform's interesting object is not the configuration language — it is the **state file**, and almost everything that goes wrong with Terraform is something going wrong with state. A fifty-line implementation of plan and apply makes all of it visible: the three-way diff is between **config, state and the world**, which is why a manual console change shows up as a plan to *undo* it; losing the state file makes Terraform propose to **create two resources that already exist**; and two engineers applying without a lock left `aws_s3_bucket.features` existing in the world and absent from state — permanently untracked, and queued for re-creation.",

  objectives: [
    "Describe the three-way diff that plan computes, and name each input",
    "Explain what drift is and why the plan's proposed fix can be harmful",
    "Say what losing or clobbering state does, and what remote state with locking prevents",
    "Decide what belongs in Terraform and what does not"
  ],

  prerequisites: ["5.5"],

  blocks: [

    { t: "callout", kind: "note", title: "Executed, but not against a cloud",
      body: [
        { t: "p", text: "Terraform is not installed here and there is no cloud account, so no real infrastructure is created. What **is** executed is a fifty-line implementation of `plan` and `apply` over a simulated world — enough to produce the state failures faithfully, because they are properties of the algorithm rather than of any provider." },
        { t: "p", text: "Lesson 6.3's CI cost arithmetic and lesson 6.4's reconciliation comparison are executed the same way. Anything that depends on vendor behaviour is labelled as presented." }
      ] },

    { t: "h2", n: "01", id: "three", text: "The three-way diff",
      sub: "Config, state, and the world" },

    { t: "p", text: "Terraform is often described as *declarative infrastructure*, which makes it sound like Kubernetes. It is not the same mechanism. Kubernetes has a controller continuously reconciling (lesson 5.1); Terraform runs **when you run it**, and it compares three things rather than two." },

    { t: "code", lang: "python", title: "m6.py — the whole of plan",
      code: `def plan(config, state, world):
    """The three-way diff that is the whole of terraform.

    config = what you declared
    state  = what terraform believes it created
    world  = what actually exists
    """
    actions = []
    for addr, cfg in sorted(config.items()):
        if addr not in state["resources"]:
            actions.append(("create", addr, None))
            continue
        rid = state["resources"][addr]["id"]
        if rid not in world.res:
            actions.append(("create", addr, "state is stale: resource is gone"))
            continue
        live = world.res[rid]["cfg"]
        if live != cfg:
            actions.append(("update", addr, diff_of(live, cfg)))
    for addr in sorted(state["resources"]):
        if addr not in config:
            actions.append(("destroy", addr, None))
    return actions` },

    { t: "p", text: "**State is the mapping from your names to real resource ids.** `aws_s3_bucket.models` is your address; `r-8f3a...` is the cloud's. Nothing in the cloud records your Terraform address, so without that mapping Terraform cannot connect a line of configuration to a thing that exists. That single fact generates every failure in this lesson." },

    { t: "p", text: "The loop also shows where `destroy` comes from, and it is worth dwelling on: a resource is destroyed because it is **in state and not in config**. Deleting a block from a `.tf` file is a request to delete the real resource — which is correct and is also how a careless refactor removes a production database." },

    { t: "h2", n: "02", id: "idempotent", text: "Plan, apply, and the property that matters",
      sub: "Re-running does nothing" },

    { t: "code", lang: "python", title: "m6.py — two consecutive plans",
      out: `  -- first plan: nothing exists yet
     create   aws_s3_bucket.models
     create   aws_sagemaker_endpoint.loan
     applied. state serial=1, resources=2

  -- second plan: nothing changed
     0 actions  (no changes)
     this is the property that makes IaC safe to re-run: idempotent.

  -- third plan: the config changed (instance type)
     update   aws_sagemaker_endpoint.loan        {'instance': ('ml.m5.large', 'ml.m5.xlarge')}` },

    { t: "p", text: "Zero actions on an unchanged configuration is the property that makes infrastructure-as-code worth having. It is the same guarantee lesson 3.1 built markers for, and the reason a Terraform run can be in a pipeline: it is safe to run on every merge, because when nothing changed it does nothing." },

    { t: "p", text: "The third plan shows the other half: a changed attribute produces an `update`, with the old and new values printed. That diff is the artifact worth reviewing, and it is why `plan` is a separate command — you read the diff, then apply **that exact plan** via a saved plan file, so the thing reviewed is the thing executed." },

    { t: "callout", kind: "trap", title: "An `update` can be a replacement, and the plan says so",
      body: [
        { t: "p", text: "Some attributes cannot be changed in place. Changing them means destroy-then-create, which Terraform shows as `-/+` and a `# forces replacement` comment. For a SageMaker endpoint or an RDS instance that is minutes of downtime or, worse, data loss." },
        { t: "p", text: "The simulation above treats every change as an in-place update, which is the one way it flatters Terraform. In practice **reading the plan for `forces replacement` is the single most important review step**, and `prevent_destroy` in a resource's lifecycle block is the guardrail for anything stateful." }
      ] },

    { t: "h2", n: "03", id: "drift", text: "Drift, and why the fix can be the incident",
      sub: "The plan proposes to undo your 2 a.m. decision" },

    { t: "p", text: "Drift is the world diverging from state — something changed outside Terraform. The usual cause is not malice; it is an engineer resolving an incident." },

    { t: "code", lang: "python", title: "m6.py — a manual console change, then a plan",
      code: `rid = st["resources"]["aws_sagemaker_endpoint.loan"]["id"]
world.res[rid]["cfg"]["count"] = 6   # a human, at 2 a.m., during an incident`,
      out: `  -- DRIFT: someone resized the endpoint by hand in the console
     update   aws_sagemaker_endpoint.loan        {'count': (6, 2), 'instance': ('ml.m5.large', 'ml.m5.xlarge')}
     -> plan proposes to UNDO the manual change, because config is
        the source of truth. Applying this takes the endpoint from
        6 instances back to 2, in the middle of whatever caused it.` },

    { t: "p", text: "Read the diff direction: `'count': (6, 2)` — from six, to two. Terraform is working exactly as designed. The configuration says two, the world says six, so the plan closes the gap by **removing four instances**, and it will do that during whatever traffic event caused someone to add them." },

    { t: "p", text: "The two correct responses are both about the configuration, not about Terraform:" },

    { t: "dl", items: [
      { k: "Commit the change", v: "If six was right, the config was wrong. Edit it, plan, apply — now the world and the config agree, and the next run is a no-op. This is the normal path and it should take minutes." },
      { k: "Take it out of Terraform's hands", v: "If the value is *meant* to vary at run time — which a replica count is, when an autoscaler owns it — then Terraform should not manage it. `lifecycle { ignore_changes = [instance_count] }` declares that, and lesson 5.3's HPA is exactly this case." }
    ] },

    { t: "callout", kind: "insight", title: "Drift is a signal about ownership, not about discipline",
      body: [
        { t: "p", text: "Recurring drift on the same attribute means two things both believe they own it. Usually Terraform and an autoscaler, or Terraform and a platform team's console change. The fix is to decide which one owns it and tell the other to stop looking — `ignore_changes` on the Terraform side, or removing the autoscaler." },
        { t: "p", text: "Treating it as a discipline problem — *stop touching the console* — does not work, because the console change happens during an incident when the alternative is a slower outage. Design for it instead: run `plan` on a schedule so drift is detected in hours rather than discovered during an unrelated apply." }
      ] },

    { t: "h2", n: "04", id: "losing", text: "Losing state, and clobbering it",
      sub: "Two failures with the same cause" },

    { t: "p", text: "Because state is the only mapping from your names to real ids, losing it is not an inconvenience." },

    { t: "code", lang: "python", title: "m6.py — a plan with no state",
      out: `  -- the state file is lost
     plan with no state: 2 actions, all of them:
     create   aws_s3_bucket.models
     create   aws_sagemaker_endpoint.loan
     -> terraform does not know these resources exist, so it plans to
        CREATE them again. The live resources become orphans, and the
        creates fail on name conflicts or silently duplicate.` },

    { t: "p", text: "Terraform proposes to create everything, because by its reckoning nothing exists. For a uniquely-named resource like an S3 bucket the apply fails on a name conflict, which is the good outcome. For anything that permits duplicates — an endpoint, an instance, a role — it **succeeds**, and now you are paying for two and your configuration controls the new one while the old one serves traffic." },

    { t: "p", text: "The concurrent case produces the same orphaning without anyone losing a file." },

    { t: "code", lang: "python", title: "m6.py — two applies from the same read",
      code: `stA = read_state()
stB = read_state()          # both read the same serial -- this is the race
# A adds a feature-store bucket; B, from its stale read, adds a log bucket`,
      out: `  -- two engineers apply at once, with no lock
     A wrote serial 2, B wrote serial 2, file now serial 2
     resources in the file: 3   resources in the world: 4
     -> 1 resource(s) exist and are NOT in state: aws_s3_bucket.features
        B's write clobbered A's, so a real resource is now untracked:
        terraform will never update it, never destroy it, and will
        propose to CREATE it again. This is what the state lock stops.` },

    { t: "p", text: "**`aws_s3_bucket.features` exists and Terraform does not know.** Both engineers read serial 1, both wrote serial 2, and B's write — built from a state that predated A's — simply replaced A's. The bucket is now permanently invisible to Terraform: never updated, never destroyed, and queued for re-creation on the next plan that includes it." },

    { t: "p", text: "Which is why the remote-state configuration is not boilerplate:" },

    { t: "diagram", kind: "matrix", id: "dg-6_1-04-0",
      title: "What each piece of the remote backend prevents",
      caption: "All four are failures demonstrated above. **A local `terraform.tfstate` has none of them**, which is why it is acceptable for a tutorial and not for anything shared.",
      rows: ["Remote backend (S3/GCS)", "State locking", "Object versioning", "Encryption at rest"],
      cols: ["Prevents", "The failure without it"],
      cells: [
        [{ text: "divergent local copies", tone: "good" }, { text: "every engineer has a different idea of reality", tone: "crit" }],
        [{ text: "concurrent applies", tone: "good" }, { text: "aws_s3_bucket.features: untracked for ever", tone: "crit" }],
        [{ text: "an unrecoverable mistake", tone: "good" }, { text: "plan proposes to recreate everything", tone: "crit" }],
        [{ text: "state as a credential leak", tone: "good" }, { text: "state holds attributes, some sensitive", tone: "warn" }]
      ] },

    { t: "p", text: "The last row is worth stating plainly: **state files contain resource attributes, and some of those are secrets** — a generated database password, a connection string, a key. A state file in a git repository is a credential leak of the same kind lesson 4.5 measured in an image layer, and it has the same property of persisting after the mistake is noticed." },

    { t: "h2", n: "05", id: "scope", text: "What belongs in Terraform",
      sub: "And the ML resources that do not" },

    { t: "p", text: "Terraform is good at resources that are **created once and changed rarely**, and poor at anything that varies on its own. The distinction matters more for ML than for ordinary infrastructure, because ML platforms are full of the second kind." },

    { t: "table",
      head: ["Terraform this", "Do not Terraform this"],
      rows: [
        ["Buckets, registries, networks, IAM roles, KMS keys", "Model versions — that is the registry from lesson 15.1"],
        ["The cluster, node pools, their machine types", "Replica counts an autoscaler owns (lesson 5.3's HPA)"],
        ["A feature store's infrastructure", "Feature definitions, which belong with the code (lesson 1.4)"],
        ["Managed endpoint existence and its instance type", "Which model the endpoint serves — that is a deploy, not infrastructure"],
        ["Schedules, queues, alerting rules", "Anything with a per-request or per-run lifetime"]
      ] },

    { t: "callout", kind: "good", title: "Two blast-radius rules worth adopting early",
      body: [
        { t: "p", text: "**Separate state per environment.** One state file covering dev, staging and production means a mistaken `destroy` can reach production, and a lock held by a dev apply blocks a production fix. Separate backends, separate locks, separate blast radii." },
        { t: "p", text: "**Run `plan` in CI on every pull request and post the diff.** The plan is the review artifact — a one-line change to a machine type and a change that forces replacement look identical in the diff of the `.tf` file and completely different in the plan. Lesson 6.3 puts this in the pipeline, and `apply` runs only from the default branch." }
      ] },

    { t: "exercise", kind: "practice", title: "Find the drift and the ownership conflict", difficulty: "core", minutes: 30,
      prompt: "For infrastructure you manage with Terraform, run `terraform plan` against production right now with no configuration change, and read what it proposes. Zero actions is the healthy answer; anything else is drift, and for each item decide which of the two responses applies — commit it, or `ignore_changes` because something else owns that attribute. Then check the backend: is state remote, is locking configured, is object versioning on, and is the bucket encrypted. Finally, grep the configuration for resources whose values legitimately vary at run time — replica counts, desired capacity, anything an autoscaler touches — and check whether they are in `ignore_changes`.",
      hints: [
        "Recurring drift on the same attribute is always an ownership conflict, not carelessness. Name the other owner.",
        "If state is local, that is the finding: every engineer has a different reality and there is no lock.",
        "A plan that proposes `forces replacement` on anything stateful is the one to stop and read carefully."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual discovery is drift on exactly the attributes an autoscaler owns, which is the `ignore_changes` case rather than a problem with anyone's discipline. The second usual discovery is that nobody has run `plan` against production in weeks, so the drift has been accumulating and the next apply will be large." },
          { t: "p", text: "Scheduling a plan-only run daily and alerting on non-empty output converts that from a surprise during an urgent change into a ticket. It is the same argument lesson 3.1 made for a scheduled retrain: the run that happens regularly is the run that still works when you need it." }
        ]
      } }

  ],

  takeaways: [
    "**Terraform computes a three-way diff: config, state, and the world** — and state is the only mapping from your addresses to real resource ids.",
    "**It runs when you run it**, unlike Kubernetes' continuous reconciliation. There is no controller closing the gap between runs.",
    "**A resource is destroyed because it is in state and not in config**, so deleting a block from a `.tf` file is a request to delete the real thing.",
    "**Zero actions on an unchanged config is the property that makes IaC safe to re-run**, which is what lets `plan` live in a pipeline.",
    "**Read the plan for `forces replacement`.** Some attribute changes mean destroy-then-create, which for a stateful resource is downtime or data loss; `prevent_destroy` is the guardrail.",
    "**Drift makes the plan propose to undo the manual change**: measured as `'count': (6, 2)` — removing four instances during whatever incident caused someone to add them.",
    "**Recurring drift is an ownership conflict, not a discipline problem.** Either commit the change or declare `ignore_changes` for the attribute something else owns.",
    "**Losing state makes Terraform plan to create what already exists.** Uniquely-named resources fail on conflict, which is the lucky case; everything else duplicates silently.",
    "**Two applies from the same read orphan a real resource**: `aws_s3_bucket.features` existed in the world and was absent from state — never updated, never destroyed, queued for re-creation.",
    "**The remote backend's four parts each prevent a demonstrated failure**: a shared backend, locking, object versioning, and encryption at rest.",
    "**State contains secrets.** Generated passwords and connection strings live in it, so a state file in git is a credential leak with the same persistence as lesson 4.5's layer.",
    "**Terraform the things created once**: buckets, networks, IAM, the cluster, node pools. Not model versions, not autoscaled replica counts, not feature definitions.",
    "**Separate state per environment**, and run `plan` in CI on every PR with the diff posted — the plan is the review artifact, not the `.tf` diff."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Someone scaled an endpoint from 2 to 6 instances in the console during an incident. What does the next `terraform plan` propose?",
        options: [
          "To update the configuration to match reality, since the world is authoritative",
          "To take the endpoint back from 6 instances to 2 — the configuration is the source of truth, so the plan closes the gap by removing the manual change",
          "Nothing, because Terraform only tracks resources it created"
        ],
        answer: 1,
        why: "Measured: the diff prints `'count': (6, 2)`. Terraform is working as designed, which is why drift is dangerous rather than merely untidy. The two correct responses are to commit the change or to declare `ignore_changes` for an attribute something else legitimately owns."
      },
      {
        stem: "Two engineers run `terraform apply` at the same time against a backend with no locking. What is the worst outcome?",
        options: [
          "One apply fails with a conflict and has to be retried",
          "Both succeed and the second write clobbers the first, leaving a real resource that exists in the world and not in state — never updated, never destroyed, and proposed for re-creation",
          "The state file is corrupted and becomes unparseable"
        ],
        answer: 1,
        why: "Measured: `aws_s3_bucket.features` ended up in the world and absent from state. Both reads saw serial 1, both wrote serial 2, and the later write simply replaced the earlier. The file stays perfectly valid, which is what makes this silent."
      },
      {
        stem: "Which of these should NOT be managed by Terraform?",
        options: [
          "The S3 bucket that stores model artifacts",
          "The replica count of a deployment that a HorizontalPodAutoscaler owns",
          "The IAM role a training job assumes"
        ],
        answer: 1,
        why: "Two things would believe they own that number, producing drift on every plan — which is an ownership conflict rather than a discipline failure. Declare `ignore_changes` for it, or do not manage the resource. Terraform is for things created once and changed rarely."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the Terraform state file for, and why does it matter?",
        strong: "It is the mapping from your configuration addresses to real resource ids — nothing in the cloud records that `aws_s3_bucket.models` is yours, so without state Terraform cannot connect a line of config to a thing that exists. That makes plan a three-way diff: config, state, and the live world. And it means every characteristic Terraform failure is a state failure. If state is lost, plan proposes to create everything that already exists, which fails on uniquely-named resources and silently duplicates everything else. If two people apply from the same read without a lock, the second write clobbers the first and a real resource ends up untracked for ever — I have reproduced that, and the resource is never updated, never destroyed, and queued for re-creation. Which is why remote state with locking, versioning and encryption is not boilerplate.",
        answer: [
          { t: "p", text: "Leading with 'nothing in the cloud records your address' is the clearest way to make state's necessity obvious, and the three-way diff follows naturally." },
          { t: "p", text: "Having reproduced the orphaning, and describing its permanence, is much stronger than citing locking as best practice." }
        ]
      },
      {
        level: "senior",
        q: "How do you handle drift?",
        strong: "By treating it as an ownership question rather than a discipline problem. A plan showing drift gives me two choices: commit the change, because if the manual value was right then my config was wrong; or declare `ignore_changes` for that attribute, because something else legitimately owns it — an autoscaler owning a replica count is the usual case. Recurring drift on the same attribute always means two systems believe they own it, and telling people to stop touching the console does not work, because the console change happens during an incident when the alternative is a longer outage. What I would add operationally: run `plan` on a schedule and alert on non-empty output, so drift is a ticket within hours rather than a surprise discovered during an unrelated apply. And read the plan for `forces replacement`, because a one-character change to a machine type and a change that destroys and recreates a database look identical in the config diff.",
        answer: [
          { t: "p", text: "The ownership framing is the senior insight, and acknowledging why the discipline approach fails shows the incident context has been lived through rather than theorised." },
          { t: "p", text: "The scheduled plan-only run is a concrete, cheap control most teams do not have, and the forces-replacement point is the highest-value review habit." }
        ]
      }
    ]
  }
});
