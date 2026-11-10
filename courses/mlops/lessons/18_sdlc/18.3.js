/* ============================================================================
   LESSON 18.3 — Branching, Testing and Done
   ========================================================================= */
EC.receiveLesson({
  id: "18.3",

  lede: "Three engineering conventions decide how safely a team can change an ML system: how code is branched and merged, what is tested, and what 'done' means. Long-lived branches collect conflicts; short-lived ones need tests good enough to merge daily. ML adds layers to the testing pyramid that ordinary software lacks: data checks, behavioural tests on the model, and an evaluation gate. And a model is not done when its code is merged, because most of what makes it safe to run lives outside the code. This lesson measures branch lifetime against conflicts, runs behavioural tests that catch a learned bias, and writes a definition of done for a model release.",

  objectives: [
    "Compare Git Flow and trunk-based development by the release cadence each assumes",
    "Measure how merge overlap grows with branch lifetime",
    "Build an ML testing pyramid: unit, data, behavioural and evaluation tests",
    "Write directional, invariance and minimum-functionality tests for a model",
    "Define done for a model release and check it automatically"
  ],

  prerequisites: ["8.4", "18.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "branching",
      text: "Branches and their lifetime",
      sub: "Git Flow, trunk-based, and the overlap between them" },
    { t: "p",
      text: "Git Flow keeps long-lived develop and release branches with feature branches off them, which suits scheduled releases of versioned products. Trunk-based development merges small changes to main at least daily, behind feature flags where needed, which suits continuous deployment. The difference that matters is branch lifetime, because everything others merge in the meantime is something your merge must reconcile." },
    { t: "code",
      lang: "python",
      title: "branching.py — merge overlap by branch lifetime, and behavioural tests",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(32)

print("== 1. merge conflicts and branch lifetime ==")
# 8 developers, each commits 3 times a day, each commit touching 2 of 3,000 files (some files are hot).
FILES = 3_000; w = 1 / np.arange(1, FILES + 1) ** 0.8; w /= w.sum()
def overlap(branch_days, trials=2_000):
    shared = []
    for _ in range(trials):
        mine = set(rng.choice(FILES, 2 * 3 * branch_days, p=w))                     # what my branch touched
        others = set(rng.choice(FILES, 2 * 3 * branch_days * 7, p=w))              # what 7 others merged meanwhile
        shared.append(len(mine & others))
    return np.mean(shared), np.mean(np.array(shared) > 0)
for days in (1, 3, 10):
    m, any_ = overlap(days)
    print(f"  branch lives {days:>2} day(s): {m:4.1f} files changed on both sides on average; at least one in {any_:.0%} of merges")

print("\\n== 2. behavioural tests for a credit model ==")
rng = np.random.default_rng(33)                                                # part 2 has its own generator
n = 20_000
income = rng.lognormal(10.5, 0.5, n); debt = rng.gamma(2, 0.15, n); gender = rng.integers(0, 2, n)
postcode_risk = rng.normal(0, 1, n) + 0.8 * gender                              # a proxy correlated with gender
# historical labels came from past decisions that were slightly harsher on one group: the bias is in the data
y = (rng.random(n) < 1 / (1 + np.exp(-(-2 - 0.8 * np.log(income / 36000) + 3 * debt + 0.3 * postcode_risk + 0.3 * gender)))).astype(int)
X = np.column_stack([np.log(income), debt, postcode_risk, gender])                # gender left in the feature set by mistake
m = LogisticRegression(max_iter=2000).fit(X, y)
def p(xs): return m.predict_proba(xs)[:, 1]
base = X[:2000].copy()
tests = {
    "directional: more debt never lowers risk": np.all(p(base + [0, 0.2, 0, 0]) >= p(base)),
    "directional: more income never raises risk": np.all(p(base + [np.log(1.2), 0, 0, 0]) <= p(base)),
    "invariance: flipping gender changes no score by > 0.01": np.all(np.abs(p(np.column_stack([base[:, :3], 1 - base[:, 3]])) - p(base)) <= 0.01),
    "minimum function: clear low-risk case below 0.1": p(np.array([[np.log(120_000), 0.02, -1, 0]]))[0] < 0.1,
}
for name, ok in tests.items(): print(f"  {'PASS' if ok else 'FAIL'}  {name}")
flip = np.abs(p(np.column_stack([base[:, :3], 1 - base[:, 3]])) - p(base))
print(f"  gender coefficient {m.coef_[0][3]:+.3f}; largest score change from flipping it {flip.max():.3f}")`,
      out: `== 1. merge conflicts and branch lifetime ==
  branch lives  1 day(s):  0.8 files changed on both sides on average; at least one in 60% of merges
  branch lives  3 day(s):  4.0 files changed on both sides on average; at least one in 100% of merges
  branch lives 10 day(s): 19.0 files changed on both sides on average; at least one in 100% of merges

== 2. behavioural tests for a credit model ==
  PASS  directional: more debt never lowers risk
  PASS  directional: more income never raises risk
  FAIL  invariance: flipping gender changes no score by > 0.01
  PASS  minimum function: clear low-risk case below 0.1
  gender coefficient +0.303; largest score change from flipping it 0.076` },
    { t: "viz",
      title: "Files changed on both sides of a merge",
      caption: "With eight developers committing three times a day, overlap grew faster than linearly with branch lifetime, because both sides change more files the longer they diverge.",
      svg: `<svg viewBox="0 0 760 134" width="100%" role="img">
<text x="160" y="31.0" text-anchor="end" class="s-label">branch lives 1 day</text>
<rect x="170" y="14" width="17.5" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="195.5" y="31.0" class="s-sub">0.8 files changed on both sides</text>
<text x="160" y="69.0" text-anchor="end" class="s-label">branch lives 3 days</text>
<rect x="170" y="52" width="87.4" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="265.4" y="69.0" class="s-sub">4.0</text>
<text x="160" y="107.0" text-anchor="end" class="s-label">branch lives 10 days</text>
<rect x="170" y="90" width="415.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="107.0" class="s-sub">19.0</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Overlap grows with lifetime",
          def: "A one-day branch shared 0.8 changed files with what others merged; a three-day branch 4.0; a ten-day branch 19.0. Not every shared file conflicts, but each needs attention, and the effort lands at merge time when context is gone." },
        { term: "Trunk-based needs tests",
          def: "Merging daily is safe only with fast automated tests and feature flags for unfinished work. Without them, long branches are the rational choice and the conflicts are the price." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Conventional commits without reviewable changes",
      body: [
        { t: "p",
          text: "Commit message conventions ('feat:', 'fix:', 'chore:') help changelogs and release tooling; they do not make a 2,000-line merge reviewable. Small, frequent, focused changes matter more than their prefixes." }
      ] },
    { t: "h2",
      n: "02",
      id: "pyramid",
      text: "The ML testing pyramid",
      sub: "And the tests ordinary software does not need" },
    { t: "table",
      head: ["Layer", "Checks", "Speed"],
      rows: [
        [
          "Unit tests",
          "Transforms, feature code, parsing: exact, deterministic (TDD works well here)",
          "Milliseconds"
        ],
        ["Data tests", "Schema, ranges, nulls, freshness of training and serving data (lesson 1.5)", "Seconds"],
        [
          "Behavioural tests",
          "Directional, invariance and minimum-functionality expectations on the model",
          "Seconds"
        ],
        ["Evaluation gate", "Metrics and segments against the champion (lesson 15.1)", "Minutes"],
        ["Integration and parity", "Offline and online paths agree (lesson 13.4)", "Minutes"]
      ] },
    { t: "p",
      text: "Behavioural tests state what the model must do whatever its accuracy: a directional test that more debt never lowers estimated risk, an invariance test that changing a protected attribute does not change the score, and minimum-functionality tests on cases with obvious answers. In the script, the model's historical labels carried a small bias against one group, and it was trained with gender in its features by mistake." },
    { t: "dl",
      items: [
        { term: "The invariance test failed",
          def: "The model learned a gender coefficient of +0.30 from the biased labels, and flipping gender moved scores by up to 0.076. Accuracy-based tests would not show this; the behavioural test did." },
        { term: "Removing the column is not the whole fix",
          def: "The postcode feature is correlated with gender, so a model without the column can still carry part of the effect. The invariance test should run on proxies too, alongside per-group error rates (lesson 13.4 of System Design)." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A definition of done for a model",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Write the definition of done for a model release as a list of checks: registered with an immutable version, lineage recorded, promotion gate passed, model card, monitoring, rollback rehearsed, a named owner and a retraining plan. Check three releases against it and list what each is missing." }
      ],
      requirements: [
        "Each item as a key and a description",
        "A checker that lists every missing item",
        "Three releases, including a notebook hand-off",
        "A clear DONE or NOT DONE"
      ],
      hint: "Keep the definition as data so the release pipeline and the review checklist read the same list.",
      solution: { lang: "python",
        title: "definition_of_done.py",
        code: `DONE = [   # (key, what 'done' requires)
    ("registered", "artefact in the registry with an immutable version id"),
    ("lineage", "data snapshot, code commit and run id recorded"),
    ("gate_passed", "promotion gate passed: metrics, segments, behavioural tests"),
    ("model_card", "model card: intended use, limits, evaluation, owner"),
    ("monitoring", "dashboards and alerts for data, model and business metrics"),
    ("rollback_tested", "rollback to the previous version rehearsed in staging"),
    ("owner", "a named owner and on-call rotation"),
    ("retraining_plan", "retraining trigger or schedule and label source defined"),
]

def check(release: dict):
    missing = [desc for key, desc in DONE if not release.get(key)]
    return ("DONE" if not missing else f"NOT DONE ({len(missing)} of {len(DONE)} missing)"), missing

releases = {
    "churn v7 (notebook hand-off)": {"registered": True, "gate_passed": True},
    "churn v8": {"registered": True, "lineage": True, "gate_passed": True, "model_card": True, "monitoring": True,
                 "rollback_tested": True, "owner": "retention-ml", "retraining_plan": "weekly, labels from billing"},
    "fraud v3": {"registered": True, "lineage": True, "gate_passed": True, "model_card": True, "monitoring": True, "owner": "risk-ml"},
}
for name, r in releases.items():
    verdict, missing = check(r)
    print(f"{name:<30} {verdict}")
    for m in missing: print(f"   - {m}")`,
        out: `churn v7 (notebook hand-off)   NOT DONE (6 of 8 missing)
   - data snapshot, code commit and run id recorded
   - model card: intended use, limits, evaluation, owner
   - dashboards and alerts for data, model and business metrics
   - rollback to the previous version rehearsed in staging
   - a named owner and on-call rotation
   - retraining trigger or schedule and label source defined
churn v8                       DONE
fraud v3                       NOT DONE (2 of 8 missing)
   - rollback to the previous version rehearsed in staging
   - retraining trigger or schedule and label source defined`,
        notes: [
          { t: "p",
            text: "The notebook hand-off had a registered model that passed its gate and was missing six of eight items: no lineage, model card, monitoring, rehearsed rollback, owner or retraining plan. By a code-only definition of done it was finished." },
          { t: "p",
            text: "The fraud model was close, missing a rehearsed rollback and a retraining plan, the two items most often skipped and most missed during incidents. A definition of done for a function ends at merge; for a model it ends when the model can be operated, measured, rolled back and maintained by someone named." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the merge that took a week",
      body: [
        { t: "p",
          text: "**Symptom.** A feature-engineering rewrite on a branch that lived seven weeks took a week to merge, and the merged pipeline produced subtly different features from both parents; the next model trained on it underperformed." },
        { t: "p",
          text: "**Mechanism.** While the branch lived, others had changed 40 of the files it touched, including two transforms it had also rewritten. Conflicts were resolved by hand, and one resolution kept half of each version of a transform. No test compared feature outputs before and after." },
        { t: "p",
          text: "**Fix.** The team moved to trunk-based development with feature flags for unfinished pipeline stages, added unit tests on every transform with fixed expected outputs, and a parity test of features before and after any pipeline change." }
      ] }
  ],

  takeaways: [
    "Branch **lifetime** drives merge pain: shared changed files grew from **0.8** (1 day) to **19.0** (10 days).",
    "Git Flow suits scheduled releases; **trunk-based** suits continuous delivery and needs fast tests and feature flags.",
    "The ML testing pyramid adds **data tests**, **behavioural tests**, an **evaluation gate** and **parity tests**.",
    "Behavioural tests: **directional**, **invariance** and **minimum functionality**.",
    "An invariance test caught a learned gender effect (**+0.30** coefficient, scores moved up to **0.076**) that accuracy would not show.",
    "Removing a protected column does not remove proxies; test them too.",
    "**Done** for a model means registered, traced, gated, documented, monitored, reversible, owned and maintainable."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why do long-lived branches cause more merge pain?",
        options: [
          "Git compresses long branches less efficiently",
          "Both sides change more files over time",
          "Long branches cannot run continuous integration",
          "Merge tools refuse branches older than a week"
        ],
        answer: 1,
        why: "Shared changed files grew from 0.8 to 19.0 as branch life went from 1 to 10 days. Compression, CI and tool limits are not the cause." },
      { stem: "What does an invariance test on a credit model check?",
        options: [
          "That predictions are identical across retrains",
          "That an irrelevant attribute changes nothing",
          "That the model's accuracy stays above a threshold",
          "That inputs are within their expected ranges"
        ],
        answer: 1,
        why: "It perturbs something that must not affect the decision, such as a protected attribute, and expects no change; here it caught a learned gender effect. Retrain stability, accuracy and input ranges are other tests." },
      { stem: "Gender is removed from the features. Is the invariance concern resolved?",
        options: [
          "Yes, the model can no longer see gender",
          "Not necessarily: correlated proxies can carry it",
          "Yes, if the model's accuracy is unchanged afterwards",
          "No, gender must always be included"
        ],
        answer: 1,
        why: "Postcode correlated with gender here, so part of the effect can survive. Accuracy says nothing about it, and the remedy is testing proxies and per-group errors, not adding the attribute back." },
      { stem: "Which item is part of 'done' for a model but not for an ordinary function?",
        options: [
          "Code review by another engineer",
          "A rehearsed rollback and a retraining plan",
          "Unit tests that pass in continuous integration",
          "A descriptive commit message"
        ],
        answer: 1,
        why: "Models decay and fail in production, so rollback and maintenance are part of done. Review, unit tests and commit messages apply to all code." }
    ] },

  interview: { title: "In an interview",
    sub: "Engineering-practice answers should tie conventions to failures.",
    questions: [
      { level: "core",
        q: "Git Flow or trunk-based development for an ML team?",
        strong: "A strong answer ties the choice to release cadence and testing, with numbers.",
        answer: [
          { t: "p",
            text: "Trunk-based if the team deploys continuously and has fast tests: short branches keep merges small, since overlap grows quickly with branch lifetime (0.8 shared files at one day, 19 at ten in the simulation). Unfinished pipeline stages go behind flags. Git Flow fits when releases are scheduled and versions must be maintained in parallel. Research code can live on short-lived branches or separate repositories, with promotion into the main pipeline through review." }
        ] },
      { level: "core",
        q: "How do you test an ML model?",
        strong: "A strong answer describes the pyramid with ML-specific layers.",
        answer: [
          { t: "p",
            text: "Unit tests on transforms and feature code with fixed expected outputs; data tests on schemas, ranges and freshness; behavioural tests for directional, invariance and minimum-functionality expectations; an evaluation gate on metrics and segments against the champion; and parity tests that offline and online paths agree. The fast layers run on every commit, the evaluation on every candidate model." }
        ] },
      { level: "advanced",
        q: "What is your definition of done for a model?",
        strong: "A strong answer lists operational items, not only code items.",
        answer: [
          { t: "p",
            text: "Registered with an immutable version and lineage; passed the promotion gate including behavioural tests; a model card with intended use and limits; monitoring of data, model and business metrics with alerts; rollback rehearsed; a named owner on call; and a retraining plan with its label source. I would encode it as data checked by the release pipeline, so it is enforced rather than remembered." }
        ] }
    ] }
});
