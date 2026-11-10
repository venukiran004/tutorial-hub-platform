/* ============================================================================
   LESSON 18.1 — The Phases, and Why They Exist
   ========================================================================= */
EC.receiveLesson({
  id: "18.1",

  lede: "The software development lifecycle is a list of phases (plan, requirements, design, build, test, deploy, operate) and each one exists because skipping it caused a recognisable kind of failure: building the wrong thing, building it in a way that cannot change, shipping what was never checked, or abandoning it after launch. This lesson takes each phase as the answer to its failure, models the cost-of-change argument with honest assumptions rather than the famous curve alone, and writes requirements for an ML feature as tests a machine can check.",

  objectives: [
    "Name the seven phases and the failure each one prevents",
    "Explain the cost-of-change argument and how strong its evidence is",
    "Show that catching defects where they are introduced pays even under conservative assumptions",
    "Write measurable requirements for a model as executable acceptance tests"
  ],

  prerequisites: ["3.6"],

  blocks: [
    { t: "h2", n: "01", id: "phases", text: "Seven phases, seven failures", sub: "Why each one exists" },
    { t: "viz",
      title: "The lifecycle as a loop",
      caption: "For software that stays in production, and for every model, operation feeds back into new requirements; the lifecycle is a cycle, not a line.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="130.0" y1="46.0" x2="150.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="270.0" y1="46.0" x2="290.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="410.0" y1="46.0" x2="430.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="550.0" y1="46.0" x2="570.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="599.7" y1="72.0" x2="520.3" y2="140.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="166.0" x2="410.0" y2="166.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="264.8" y1="140.0" x2="225.2" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="70.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Plan</text>
<text x="70.0" y="60" text-anchor="middle" class="s-sub">is it worth it?</text>
<rect x="150" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="210.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Requirements</text>
<text x="210.0" y="60" text-anchor="middle" class="s-sub">what, measurably</text>
<rect x="290" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="350.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Design</text>
<text x="350.0" y="60" text-anchor="middle" class="s-sub">how</text>
<rect x="430" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="490.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Build</text>
<text x="490.0" y="60" text-anchor="middle" class="s-sub">code, data, model</text>
<rect x="570" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="630.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--warn)">Test</text>
<text x="630.0" y="60" text-anchor="middle" class="s-sub">does it meet R*</text>
<rect x="430" y="140" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="490.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--good)">Deploy</text>
<text x="490.0" y="180" text-anchor="middle" class="s-sub">safely</text>
<rect x="150" y="140" width="260" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="280.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--crit)">Operate and maintain</text>
<text x="280.0" y="180" text-anchor="middle" class="s-sub">monitor, fix, retrain, retire</text>
</svg>` },
    { t: "table",
      head: ["Phase", "The failure it prevents", "ML example"],
      rows: [
        ["Plan", "Building something nobody needs or can afford", "A model for a decision a rule already makes well"],
        [
          "Requirements",
          "Building the wrong thing",
          "Optimising AUC when the business needs calibrated probabilities"
        ],
        [
          "Design",
          "A system that cannot change or scale",
          "Features computed differently offline and online (module 13)"
        ],
        ["Build", "Code nobody else can read or rebuild", "A notebook as the only copy of the training logic"],
        ["Test", "Shipping what was never checked", "No segment evaluation before launch"],
        ["Deploy", "A release that cannot be undone", "No rollback path for the model (lesson 14.3)"],
        ["Operate and maintain", "Quiet decay after launch", "No drift or outcome monitoring (modules 11 and 16)"]
      ] },
    { t: "h2",
      n: "02",
      id: "cost",
      text: "The cost of change, modelled honestly",
      sub: "Earlier is cheaper, by how much is debated" },
    { t: "p",
      text: "The classic claim is that a defect costs 10 to 100 times more to fix in production than in requirements. The numbers come from studies of large projects decades ago and are disputed. The script makes the argument without depending on them: 100 defects introduced across the early phases, each caught where it was introduced with some probability or found later, priced under the steep textbook curve and under a deliberately modest one." },
    { t: "code",
      lang: "python",
      title: "costchange.py — the value of catching defects early, under two cost curves",
      code: `import numpy as np
rng = np.random.default_rng(28)

PHASES = ["requirements", "design", "build", "test", "deploy", "operate"]
# Where 100 defects in an ML feature are introduced (shares are assumptions for illustration).
introduced = {"requirements": 30, "design": 20, "build": 40, "test": 5, "deploy": 5}
# The relative cost of fixing a defect found in each phase. The steep curve is the classic textbook claim, whose
# empirical basis is debated; the modest one is a deliberately conservative alternative.
curves = {"steep (textbook)": [1, 3, 7, 15, 40, 100], "modest": [1, 1.3, 1.7, 2.2, 3, 4]}

def total_cost(curve, review_catch):
    """review_catch: chance a defect is caught in the phase where it was introduced (by review/tests there);
    otherwise it is found in a later phase, uniformly."""
    cost = 0.0
    for phase, n in introduced.items():
        i = PHASES.index(phase)
        for _ in range(n):
            j = i if rng.random() < review_catch else rng.integers(i + 1, len(PHASES))
            cost += curve[j]
    return cost

print(f"{'cost curve':<18}{'catch 20% where introduced':>28}{'catch 60% where introduced':>28}{'saving':>8}")
for name, curve in curves.items():
    lo = np.mean([total_cost(curve, 0.2) for _ in range(300)]); hi = np.mean([total_cost(curve, 0.6) for _ in range(300)])
    print(f"{name:<18}{lo:>28.0f}{hi:>28.0f}{1 - hi / lo:>8.0%}")`,
      out: `cost curve          catch 20% where introduced  catch 60% where introduced  saving
steep (textbook)                          3917                        2331     41%
modest                                     260                         206     21%` },
    { t: "dl",
      items: [
        { term: "Under the steep curve",
          def: "Raising the share of defects caught where they are introduced from 20% to 60% cut total cost by 41%." },
        { term: "Under the modest curve",
          def: "Even when a production fix costs only four times a requirements fix, the same improvement saved 21%. The direction holds whichever curve is right; only the size changes." },
        { term: "Why ML sharpens it",
          def: "A wrong requirement in ML (the wrong label, the wrong metric) is discovered after data collection, training and an experiment: weeks of work, not a code change." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Quoting '100×' as a law",
      body: [
        { t: "p",
          text: "The famous multipliers are often repeated as fact. The defensible claim is the weaker one the model supports: mistakes are cheaper to fix closer to where they are made. Argue from that, and from your own project's history, rather than from a number of uncertain origin." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Requirements a machine can check",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Write four requirements for a churn model as numbers: holdout AUC at least 0.80; AUC at least 0.75 in every region; p99 single-row latency under 5 ms; mean prediction within 0.02 of the observed rate. Train a model on data where one region is harder to predict, and run the requirements as tests that print PASS or FAIL with the measured value." }
      ],
      requirements: [
        "Each requirement as a measurable threshold, written before training",
        "A test per requirement with its measured value",
        "A per-segment requirement, not only an overall one",
        "A clear failure when a requirement is not met"
      ],
      hint: "Store requirements as data (name, description, bound) and evaluate them in a loop, so adding one does not mean writing new reporting code.",
      solution: { lang: "python",
        title: "acceptance_tests.py",
        code: `import time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

# Requirements for a churn model, written so a machine can check them, before the model is built.
REQUIREMENTS = {
    "R1 ranking quality":   ("AUC on the holdout is at least", 0.80),
    "R2 no segment left behind": ("AUC for every region is at least", 0.75),
    "R3 latency":           ("p99 single-row scoring time below (ms)", 5.0),
    "R4 calibration":       ("mean prediction within this of the observed rate", 0.02),
}

rng = np.random.default_rng(29)
n = 20_000; region = rng.choice(["north", "south", "east"], n, p=[0.5, 0.4, 0.1])
X = rng.normal(size=(n, 4)); noise = np.where(region == "east", 2.5, 1.0)           # east is harder to predict
y = (X[:, 0] + 0.5 * X[:, 1] + rng.normal(0, 1, n) * noise > 0.3).astype(int)
tr, te = slice(0, 15_000), slice(15_000, None)
model = LogisticRegression().fit(X[tr], y[tr]); p = model.predict_proba(X[te])[:, 1]

lat = []
for row in X[te][:500]:
    t = time.perf_counter(); model.predict_proba(row[None]); lat.append((time.perf_counter() - t) * 1000)
results = {
    "R1 ranking quality": roc_auc_score(y[te], p),
    "R2 no segment left behind": min(roc_auc_score(y[te][region[te] == r], p[region[te] == r]) for r in ("north", "south", "east")),
    "R3 latency": np.percentile(lat, 99),
    "R4 calibration": abs(p.mean() - y[te].mean()),
}
for k, (text, bound) in REQUIREMENTS.items():
    v = results[k]; ok = v >= bound if k in ("R1 ranking quality", "R2 no segment left behind") else v <= bound
    print(f"{'PASS' if ok else 'FAIL'}  {k:<27} {text} {bound}: measured {v:.3f}")
by_region = {r: roc_auc_score(y[te][region[te] == r], p[region[te] == r]) for r in ("north", "south", "east")}
print("AUC by region:", {r: round(v, 3) for r, v in by_region.items()})`,
        out: `PASS  R1 ranking quality          AUC on the holdout is at least 0.8: measured 0.835
FAIL  R2 no segment left behind   AUC for every region is at least 0.75: measured 0.687
PASS  R3 latency                  p99 single-row scoring time below (ms) 5.0: measured 0.123
PASS  R4 calibration              mean prediction within this of the observed rate 0.02: measured 0.002
AUC by region: {'north': 0.855, 'south': 0.849, 'east': 0.687}`,
        notes: [
          { t: "p",
            text: "Overall AUC (0.835), latency (0.12 ms) and calibration (0.002) passed. The segment requirement failed: the east region scored 0.687 against 0.85 elsewhere. Without R2 written down in advance, the overall number would have shipped a model that serves a tenth of customers markedly worse." },
          { t: "p",
            text: "Requirements written as tests turn 'is it good enough?' from a meeting into a result, and they become the release gate (lesson 15.1). They also force the hard conversation early: whether 0.75 for every region is achievable, and what to do if it is not." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the model built to the wrong requirement",
      body: [
        { t: "p",
          text: "**Symptom.** A credit-limit model passed every offline test with high AUC, launched, and the risk team rejected its outputs within a week: limits were systematically too generous for new customers." },
        { t: "p",
          text: "**Mechanism.** The requirement had been 'maximise AUC'. What the business needed were calibrated default probabilities per segment, because limits are computed from expected loss. Nobody had written that down; the model ranked well and was miscalibrated for the segment with least history." },
        { t: "p",
          text: "**Fix.** Requirements for models are now written as checkable statements with the business owner (calibration per segment, ranking, latency, fairness) before data work starts, and become the promotion gate." }
      ] }
  ],

  takeaways: [
    "Seven phases, each preventing a failure: **plan, requirements, design, build, test, deploy, operate**.",
    "For models the lifecycle is a **loop**: operation feeds new requirements.",
    "The textbook cost-of-change multipliers are **disputed**; argue from the direction, not the number.",
    "Catching more defects where they are introduced saved **41%** under the steep curve and still **21%** under a modest one.",
    "ML makes wrong requirements expensive: they surface after data, training and an experiment.",
    "Write requirements as **measurable tests** before building; segment requirements catch what averages hide.",
    "Measured: overall AUC **0.835** passed while one region's **0.687** failed its requirement."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does the cost-of-change model support, whichever cost curve is right?",
        options: [
          "That production fixes cost exactly 100 times more",
          "Catching defects where they start lowers cost",
          "That testing can be skipped with good requirements",
          "That early phases should take most of the schedule"
        ],
        answer: 1,
        why: "Under both curves earlier catching saved money (41% and 21%). The 100× figure is disputed, testing remains necessary, and the model says nothing about schedule shares." },
      { stem: "Which phase prevents 'building the wrong thing'?",
        options: [
          "Design, by choosing the architecture",
          "Requirements, by stating needs measurably",
          "Testing, by checking that all the code is correct",
          "Operation, by monitoring the live system"
        ],
        answer: 1,
        why: "Requirements define the right thing; design, testing and operation check how and whether it works, which cannot rescue the wrong goal." },
      { stem: "Why write a requirement per region rather than only an overall AUC?",
        options: [
          "Per-region AUC is cheaper to compute overall",
          "Averages can hide a poorly served segment",
          "Regulators require AUC per region everywhere",
          "Overall AUC cannot be computed on a holdout"
        ],
        answer: 1,
        why: "Overall AUC passed at 0.835 while the east region was 0.687. Cost, universal regulation and computability are not the reason." },
      { stem: "Why is the lifecycle a loop for ML systems?",
        options: [
          "Because agile requires two-week iterations",
          "Operation surfaces drift and new requirements",
          "Because models must be retrained every day",
          "Because testing always fails the first time round"
        ],
        answer: 1,
        why: "Monitoring, drift and changing needs feed new requirements and retraining. Agile cadence, daily retraining and failing tests are not why." }
    ] },

  interview: { title: "In an interview",
    sub: "Lifecycle answers are stronger with a failure for each phase.",
    questions: [
      { level: "core",
        q: "Walk me through the SDLC.",
        strong: "A strong answer gives each phase with the failure it prevents and an example.",
        answer: [
          { t: "p",
            text: "Plan: decide whether it is worth building. Requirements: state what is needed measurably. Design: choose a structure that can change. Build: code and data others can rebuild. Test: check it meets the requirements. Deploy: release safely and reversibly. Operate: monitor, fix and eventually retire. Each phase exists because skipping it produced a familiar failure, and for long-lived systems, including every model, the phases loop." }
        ] },
      { level: "core",
        q: "How would you write requirements for an ML model?",
        strong: "A strong answer makes them measurable, segment-aware and agreed with the business owner.",
        answer: [
          { t: "p",
            text: "As checkable statements agreed with the business owner: the metric that reflects the decision (often calibration as well as ranking), thresholds overall and per important segment, latency and cost limits, fairness criteria, and behaviour when the model is unavailable. Each becomes an automated test, and together they are the promotion gate." }
        ] },
      { level: "advanced",
        q: "Is the cost-of-change curve real?",
        strong: "A strong answer separates the disputed numbers from the defensible direction.",
        answer: [
          { t: "p",
            text: "The steep multipliers come from old studies of large waterfall projects and are disputed; modern practices flatten the curve for code. The direction is still sound: a defect found far from where it was made costs more context, rework and coordination. For ML the curve is steep again for requirements, because a wrong label or metric is discovered only after data collection, training and experimentation." }
        ] }
    ] }
});
