/* ============================================================================
   LESSON 18.4 — The ML Lifecycle Against the Traditional One
   ========================================================================= */
EC.receiveLesson({
  id: "18.4",

  lede: "CRISP-DM, the process model most data science teams know, is honest about one thing traditional SDLC models hide: it loops back, from data to business understanding, from modelling to data preparation, from evaluation to the start. What it says little about is what happens after deployment. Ordinary software development rests on assumptions that ML quietly breaks: that code defines behaviour, that tests pass or fail, that a release is finished, and that behaviour changes only when code changes. This lesson demonstrates each break on a live model, and names the anti-patterns that follow from pretending otherwise.",

  objectives: [
    "Describe CRISP-DM's phases and loops, and what it leaves out",
    "Demonstrate four SDLC assumptions that ML breaks",
    "Adapt practices to each: data versioning, statistical tests, monitoring, data contracts",
    "Recognise ML anti-patterns and detect them from project metadata"
  ],

  prerequisites: ["18.1", "18.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "crisp",
      text: "CRISP-DM, and where it is honest",
      sub: "Loops that ordinary SDLC diagrams do not draw" },
    { t: "viz",
      title: "CRISP-DM",
      caption: "Arrows go backwards as well as forwards: data understanding revises the business question, modelling sends you back to preparation, and evaluation can restart the whole cycle.",
      svg: `<svg viewBox="0 0 760 215" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="180.0" y1="46.0" x2="230.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="230.0" y1="46.0" x2="180.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="400.0" y1="46.0" x2="450.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="535.0" y1="72.0" x2="535.0" y2="140.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="535.0" y1="140.0" x2="535.0" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="450.0" y1="166.0" x2="400.0" y2="166.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="267.3" y1="140.0" x2="142.7" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="230.0" y1="166.0" x2="180.0" y2="166.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="95.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Business understanding</text>
<rect x="230" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="315.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Data understanding</text>
<rect x="450" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="535.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Data preparation</text>
<rect x="450" y="140" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="535.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--violet)">Modelling</text>
<rect x="230" y="140" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="315.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--warn)">Evaluation</text>
<rect x="10" y="140" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="95.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--good)">Deployment</text>
</svg>` },
    { t: "p",
      text: "CRISP-DM (1999) describes how analytics work actually proceeds: understanding is revised by what the data shows, and preparation and modelling alternate many times. It ends at deployment, with little about operating the model, retraining or retiring it, which is where MLOps practice fills the gap: monitoring, the response ladder (module 11) and ownership." },
    { t: "h2",
      n: "02",
      id: "assumptions",
      text: "Four assumptions ML breaks",
      sub: "Each demonstrated on the same model" },
    { t: "code",
      lang: "python",
      title: "assumptions.py — four software assumptions, tested on a model",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(34)

def data(n, month=0):
    """The world in a given month: the effect of feature 1 drifts from -0.7 to +0.7 over a year."""
    X = rng.normal(size=(n, 5)); w = np.array([1.0, -0.7 + 1.4 * month / 12, 0.5, 0.0, 0.3])
    y = (rng.random(n) < 1 / (1 + np.exp(-(X @ w)))).astype(int)
    return X, y
def train(X, y): return LogisticRegression().fit(X, y)          # the training code never changes below

probe = rng.normal(size=(5_000, 5))
print("1. 'Behaviour is defined by the code'")
a = train(*data(5_000)); b = train(*data(5_000))                 # same code, two samples of the same population
print(f"   same code, two data snapshots: {np.mean(a.predict(probe) != b.predict(probe)):.1%} of decisions differ")

print("2. 'A test passes or fails'")
X_hold, y_hold = data(2_000)
accs = np.array([train(*data(2_000)).score(X_hold, y_hold) for _ in range(200)])
bar = np.round(np.median(accs), 3)
print(f"   200 retrains on fresh samples: accuracy {accs.min():.3f} to {accs.max():.3f}; "
      f"a test 'accuracy >= {bar}' passed {np.mean(accs >= bar):.0%} of runs")

print("3. 'Done when shipped'")
m = train(*data(5_000))
for month in (0, 3, 6, 12):
    Xm, ym = data(5_000, month)
    print(f"   month {month:>2}: accuracy {m.score(Xm, ym):.3f}  (no code changed)")

print("4. 'Behaviour changes only when the code changes'")
X_live, _ = data(5_000)
broken = X_live.copy(); broken[:, 4] *= 100                       # an upstream service changes a unit; no deploy here
print(f"   after an upstream unit change: {np.mean(m.predict(broken) != m.predict(X_live)):.1%} of decisions changed")`,
      out: `1. 'Behaviour is defined by the code'
   same code, two data snapshots: 0.7% of decisions differ
2. 'A test passes or fails'
   200 retrains on fresh samples: accuracy 0.708 to 0.725; a test 'accuracy >= 0.717' passed 50% of runs
3. 'Done when shipped'
   month  0: accuracy 0.707  (no code changed)
   month  3: accuracy 0.699  (no code changed)
   month  6: accuracy 0.665  (no code changed)
   month 12: accuracy 0.586  (no code changed)
4. 'Behaviour changes only when the code changes'
   after an upstream unit change: 40.5% of decisions changed` },
    { t: "table",
      head: ["Assumption", "What happened", "The adapted practice"],
      rows: [
        [
          "Code defines behaviour",
          "Same code, two data samples: 0.7% of decisions differed",
          "Version data with code; a model is code + data + config"
        ],
        [
          "Tests pass or fail",
          "Retrains ranged 0.708–0.725; a threshold test passed 50% of runs",
          "Statistical tests with tolerances and intervals"
        ],
        [
          "Done when shipped",
          "Accuracy fell from 0.707 to 0.586 in a year with no change",
          "Monitoring, retraining and an owner (modules 11, 16)"
        ],
        [
          "Only code changes behaviour",
          "An upstream unit change altered 40.5% of decisions, no deploy",
          "Data contracts and validation at the boundary (1.5)"
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Flaky model tests 'fixed' by re-running",
      body: [
        { t: "p",
          text: "A test like 'accuracy ≥ 0.717' passed half the time on identical code, because each retrain draws a different sample. Teams respond by re-running until green, which makes the test meaningless. Set thresholds below the expected variation, compare against the champion on the same data (paired, lesson 11.4), or fix seeds for regression tests and test variation separately." }
      ] },
    { t: "h2", n: "03", id: "anti", text: "Anti-patterns", sub: "What pretending causes" },
    { t: "table",
      head: ["Anti-pattern", "Why it happens", "Consequence"],
      rows: [
        [
          "Notebook in production",
          "The notebook worked, so it was scheduled",
          "Hidden state, no tests, no review, unrebuildable"
        ],
        [
          "Model with no owner",
          "The author moved on; the service kept running",
          "Nobody notices decay or answers incidents"
        ],
        ["Metric nobody agreed on", "The data scientist chose AUC", "A model that is good at the wrong thing (18.1)"],
        ["Unversioned training data", "Training read a live table", "No reproduction, no audit (15.2, 15.3)"],
        [
          "No outcome monitoring",
          "Infrastructure dashboards looked green",
          "Harm found in a business review weeks later (16.1)"
        ],
        ["Never retrained", "Treated as done when shipped", "Silent decay"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Scan projects for anti-patterns",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Write checks for six anti-patterns over simple project metadata: scheduled jobs that are notebooks, no owner, no signed-off success metric, no versioned training data snapshot, no outcome monitoring, and over a year since training with no retraining schedule. Run them on three projects and report what each has." }
      ],
      requirements: [
        "Each anti-pattern as a named predicate",
        "Metadata a platform could collect automatically",
        "A report per project",
        "At least one clean project to show the checks are not trivially failing"
      ],
      hint: "A list of (label, function) pairs keeps checks easy to add and lets the report be a single comprehension.",
      solution: { lang: "python",
        title: "anti_patterns.py",
        code: `ANTI_PATTERNS = [
    ("notebook in production", lambda p: any(s.endswith(".ipynb") for s in p.get("scheduled_jobs", []))),
    ("model with no owner", lambda p: not p.get("owner")),
    ("metric nobody agreed on", lambda p: not p.get("success_metric_signed_off_by")),
    ("unversioned training data", lambda p: not p.get("training_data_snapshot")),
    ("no monitoring of outcomes", lambda p: "outcome" not in p.get("monitoring", [])),
    ("never retrained", lambda p: p.get("months_since_training", 0) > 12 and not p.get("retraining_schedule")),
]

projects = {
    "churn-scores": {"scheduled_jobs": ["train_churn_FINAL_v3.ipynb", "score.py"], "owner": None,
                     "monitoring": ["latency"], "months_since_training": 19},
    "fraud-ranker": {"scheduled_jobs": ["pipelines/train.py"], "owner": "risk-ml", "success_metric_signed_off_by": "head of fraud",
                     "training_data_snapshot": "s3://snapshots/fraud/2024-06-01", "monitoring": ["latency", "inputs", "outcome"],
                     "months_since_training": 1, "retraining_schedule": "weekly"},
    "support-routing": {"scheduled_jobs": ["route.py"], "owner": "cx-platform", "training_data_snapshot": "tickets-2023-q4",
                        "monitoring": ["latency", "inputs"], "months_since_training": 14},
}
for name, p in projects.items():
    found = [label for label, test in ANTI_PATTERNS if test(p)]
    print(f"{name:<16} {'clean' if not found else ', '.join(found)}")`,
        out: `churn-scores     notebook in production, model with no owner, metric nobody agreed on, unversioned training data, no monitoring of outcomes, never retrained
fraud-ranker     clean
support-routing  metric nobody agreed on, no monitoring of outcomes, never retrained`,
        notes: [
          { t: "p",
            text: "churn-scores had all six: a notebook named 'FINAL_v3' on a schedule, no owner, no agreed metric, no data snapshot, only latency monitoring, and 19 months without retraining. support-routing had a versioned snapshot and an owner but no agreed metric, no outcome monitoring and no retraining in 14 months. fraud-ranker was clean." },
          { t: "p",
            text: "Most of this metadata already exists in schedulers, registries and monitoring configs. A platform team can run checks like these across every model weekly and publish the list, which turns 'we should own our models' into a short, specific backlog." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the model nobody owned",
      body: [
        { t: "p",
          text: "**Symptom.** A support-ticket routing model had been sending a growing share of billing questions to the wrong queue for months; customers waited longer and agents re-routed by hand." },
        { t: "p",
          text: "**Mechanism.** The model's author had left, the job ran from a scheduled notebook, product categories had changed twice since training, and the only monitoring was the job's success status. Nobody was responsible for its quality, so nobody looked." },
        { t: "p",
          text: "**Fix.** Every production model now has a named owning team in the registry, a scheduled anti-pattern scan reports models without owners, outcome monitoring or recent retraining, and notebooks cannot be scheduled in production." }
      ] }
  ],

  takeaways: [
    "CRISP-DM is honest about **iteration** and silent about **operation** after deployment.",
    "ML breaks four SDLC assumptions: **code defines behaviour**, **tests pass or fail**, **done when shipped**, **only code changes behaviour**.",
    "Measured: a threshold test passed **50%** of identical runs; accuracy fell **0.707 → 0.586** in a year without a code change.",
    "An upstream unit change altered **40.5%** of decisions with no deploy: use data contracts and validation.",
    "Treat a model as **code + data + configuration**, versioned together.",
    "Anti-patterns: notebook in production, no owner, unagreed metric, unversioned data, no outcome monitoring, never retrained.",
    "Scan for them automatically from metadata the platform already has."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does CRISP-DM describe honestly that a linear SDLC diagram hides?",
        options: [
          "The cost of each phase in person-days",
          "Loops back to earlier phases",
          "How to operate and retrain a deployed model",
          "Which tools to use for each of the phases"
        ],
        answer: 1,
        why: "Its arrows return from data to business understanding, from modelling to preparation, and from evaluation to the start. It says little about operation, costs or tools." },
      { stem: "A test 'accuracy ≥ 0.717' passes half the time on identical code. What is the right fix?",
        options: [
          "Re-run it until it passes, then merge it",
          "Allow for run-to-run variation",
          "Delete the test, since models are untestable",
          "Raise the threshold so it fails consistently"
        ],
        answer: 1,
        why: "Retrains vary (0.708 to 0.725 here), so a threshold at the median is a coin flip. Re-running hides it, deleting removes protection, and a consistently failing test is equally useless." },
      { stem: "Decisions changed for 40% of inputs with no deploy. What most likely happened?",
        options: [
          "The model was retrained automatically overnight",
          "An upstream input changed, such as its unit",
          "The serving cache expired all at once",
          "Traffic shifted to a different region entirely"
        ],
        answer: 1,
        why: "A unit change upstream moved 40.5% of decisions in the script. Without a retrain or deploy the model is unchanged; caches and regions do not alter a deterministic model's outputs." },
      { stem: "Which metadata reveals 'notebook in production'?",
        options: [
          "The model registry's list of stages",
          "Scheduled jobs that run a .ipynb file",
          "The number of commits in the repository",
          "The monitoring dashboard's latency panel graph"
        ],
        answer: 1,
        why: "A scheduler running a notebook is the direct evidence. Stages, commit counts and latency panels do not show how the job runs." }
    ] },

  interview: { title: "In an interview",
    sub: "Lifecycle answers should name what ML changes and the practice that answers it.",
    questions: [
      { level: "core",
        q: "How is the ML lifecycle different from the software lifecycle?",
        strong: "A strong answer names the broken assumptions with a practice for each.",
        answer: [
          { t: "p",
            text: "Behaviour comes from data as well as code, so data is versioned with code. Evaluation is statistical, so tests have tolerances and paired comparisons. Models decay after release, so monitoring, retraining and ownership are part of the lifecycle. Upstream data changes alter behaviour without a deploy, so data contracts and validation sit at the boundaries. And the process loops, as CRISP-DM admits, so research and engineering need different planning (18.2)." }
        ] },
      { level: "core",
        q: "What ML anti-patterns have you seen, and how do you prevent them?",
        strong: "A strong answer pairs each anti-pattern with a structural prevention.",
        answer: [
          { t: "p",
            text: "Notebooks scheduled in production (prevent by requiring pipelines from version-controlled code), models without owners (an owner field required in the registry), metrics nobody agreed on (requirements signed off before work, 18.1), training on live tables (snapshots only), no outcome monitoring (part of the definition of done, 18.3), and models never retrained (a retraining plan required). Then scan for them automatically." }
        ] },
      { level: "advanced",
        q: "Why are model tests flaky, and what do you do about it?",
        strong: "A strong answer explains sampling variation and gives three remedies.",
        answer: [
          { t: "p",
            text: "Each retrain sees a different sample and initialisation, so metrics vary from run to run: 0.708 to 0.725 in the script. Remedies: fixed seeds and data for regression tests, so a change in the result means a change in the code; thresholds set below the measured variation for quality tests; and paired comparisons of candidate against champion on the same data, with an interval on the difference, for promotion decisions." }
        ] }
    ] }
});
