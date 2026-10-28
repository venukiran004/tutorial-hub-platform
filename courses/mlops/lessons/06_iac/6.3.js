EC.receiveLesson({
  id: "6.3",

  lede: "Lesson 3.2 established *what* an ML pipeline must assert. This is the mechanics, and one of its claims is measured: stage ordering changes the expected cost of a run by **16%** — 8.55 minutes against 9.88 with the stages reversed, which at forty runs a day is **53 minutes of runner time daily** for a change that is purely the order of a YAML list. The pass rate is **identical at 70.3%** either way, which is the point: ordering cannot change *whether* a run fails, only what you pay to find out. Then the two things GitHub Actions specifically gets wrong in ML repositories: a cache key that never invalidates, and long-lived cloud credentials where **OIDC** would do.",

  objectives: [
    "Order pipeline stages from expected cost, and show why the pass rate is unaffected",
    "Write a dependency cache key that invalidates when it should",
    "Replace stored cloud credentials with OIDC federation",
    "Separate what belongs in the PR pipeline from what belongs on the default branch"
  ],

  prerequisites: ["6.2"],

  blocks: [

    { t: "h2", n: "01", id: "ordering", text: "Why ordering is worth 16%",
      sub: "And why it cannot change the pass rate" },

    { t: "p", text: "*Run the cheap checks first* is standard advice. It is worth quantifying, because the quantity is larger than people expect and the mechanism is slightly counterintuitive." },

    { t: "p", text: "A stage only costs you time if the run **reaches** it, and a run reaches a stage only if everything before it passed. So the expected cost of a pipeline is each stage's duration weighted by the probability of arriving there." },

    { t: "code", lang: "python", title: "m6.py — expected cost of an ordering",
      code: `def expected_minutes(order):
    """Sum of each stage's duration times the probability of reaching it."""
    total, reach = 0.0, 1.0
    for name, dur, pfail in order:
        total += reach * dur
        reach *= (1 - pfail)
    return total, reach`,
      out: `  stage                  min p(fail)
  lint + types           0.5    0.08
  unit tests             2.0    0.10
  data validation        0.5    0.05
  train (smoke)          4.0    0.03
  quality gate           3.0    0.06
  skew test              0.5    0.02

  cheapest-first (correct)   expected  8.55 min/run, 70.3% reach the end
  slowest-first              expected  9.88 min/run, 70.3% reach the end

  ordering alone changes expected cost by 16% per run (9.88 vs 8.55 min)
  at 40 runs/day that is 53.3 minutes/day of runner time.` },

    { t: "p", text: "**8.55 minutes against 9.88** for the identical set of stages. And the figure that makes the mechanism clear: **70.3% reach the end in both orderings**, because the product of the pass probabilities does not depend on their order." },

    { t: "callout", kind: "insight", title: "Ordering buys time, not reliability",
      body: [
        { t: "p", text: "That identical 70.3% is worth dwelling on. Reordering a pipeline cannot make more runs pass or fewer runs fail — it changes only *how much you spend discovering the outcome*. So the argument for cheapest-first is purely economic, and the economics are about feedback latency as much as runner cost: a developer waiting nine minutes for a lint failure context-switches, and one waiting thirty seconds does not." },
        { t: "p", text: "It also means the ordering rule is **cheapest-and-most-likely-to-fail first**, not simply cheapest. A stage that never fails costs you its full duration on every run regardless of position, so moving it earlier gains nothing." }
      ] },

    { t: "p", text: "Which is why lesson 3.2's stage order puts data validation third, before training: it is 0.5 minutes, it fails 5% of the time, and it catches the corruption that lesson 1.5 measured costing 19 accuracy points. Training on a batch that a thirty-second check would have rejected is four minutes wasted and, worse, a model that then has to be rejected by the gate." },

    { t: "h2", n: "02", id: "two", text: "Two pipelines, not one",
      sub: "What the PR gets and what the branch gets" },

    { t: "p", text: "Lesson 3.2 argued for splitting the pipeline; here is the split as workflow files, with the triggers that enforce it." },

    { t: "code", lang: "yaml", title: ".github/workflows/pr.yml — fast, on every push",
      code: `name: pr
on:
  pull_request:
    paths: ["src/**", "tests/**", "requirements*.txt", ".github/workflows/**"]

concurrency:                       # cancel superseded runs on the same branch
  group: pr-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15            # a hung job is not a free job
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip               # keyed on requirements*.txt by the action
      - run: pip install -r requirements-dev.txt
      - run: ruff check . && mypy src          # 0.5 min, fails 8%
      - run: pytest -q tests/unit              # 2.0 min, fails 10%
      - run: python -m src.validate --fixture tests/fixtures/batch.parquet
      - run: python -m src.train --rows 2000 --smoke    # shape, not quality
      - run: python -m src.skew_test --golden tests/fixtures/golden.json` },

    { t: "p", text: "Three details are deliberate. **`concurrency` with `cancel-in-progress`** kills the previous run when someone pushes again — without it, a branch with six pushes runs six pipelines, which on an ML repo is the single largest source of wasted runner minutes. **`timeout-minutes`** because a hung job otherwise bills until the platform's six-hour default. And **`paths`** so a README change does not run the pipeline at all." },

    { t: "p", text: "The smoke train is the item worth defending. It runs on two thousand rows and asserts the code **completes and produces a model-shaped object** — not that the model is good. Quality is not a function of the diff, so it cannot be a PR check; lesson 3.2's gate belongs in the retraining pipeline, which has the incumbent artifact and the real holdout." },

    { t: "h2", n: "03", id: "cache", text: "The cache key that never invalidates",
      sub: "A specific, common, silent bug" },

    { t: "p", text: "Dependency installation dominates an ML pipeline's runtime — lesson 4.2 measured the serving stack at **186.3 MB** of packages, and `pip install` of scipy and scikit-learn is minutes. So caching is the highest-value optimisation available, and it is routinely written wrongly." },

    { t: "code", lang: "yaml", title: "The bug, and the fix",
      code: `# WRONG: the key never changes, so the cache is never refreshed.
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-cache

# WRONG in the other direction: restore-keys will happily serve a stale
# entry when the exact key misses, so a dependency bump silently reuses it.
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-\${{ hashFiles('requirements*.txt') }}
    restore-keys: pip-            # <- the stale-hit hazard

# RIGHT: the key is a hash of what determines the content.
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-\${{ runner.os }}-py3.11-\${{ hashFiles('requirements*.txt') }}` },

    { t: "p", text: "A static key is the worse bug because it is **silent**: the cache restores, the install appears to work, and the pipeline tests whatever dependency set was current when the cache was first populated. A dependency bump in `requirements.txt` has no effect on CI, and the divergence is only discovered when the deployed image — built without that cache — behaves differently. Lesson 3.4 measured library versions moving a metric; this is how CI stops being able to see that." },

    { t: "callout", kind: "good", title: "Include the OS and Python version in the key",
      body: [
        { t: "p", text: "Wheels are platform- and interpreter-specific — lesson 4.3's note that `manylinux` is glibc-based is the same fact. A cache populated on `ubuntu-22.04` with Python 3.11 is not valid for `ubuntu-24.04` or 3.12, and a key that omits them will serve it anyway." },
        { t: "p", text: "`actions/setup-python` with `cache: pip` handles this correctly, which is a good reason to prefer it over a hand-rolled `actions/cache` step. And note that caching the pip **download** cache is not the same as caching the installed environment: the former avoids the network, the latter avoids the install. For a large dependency set, caching the virtualenv directory saves more." }
      ] },

    { t: "h2", n: "04", id: "oidc", text: "OIDC instead of stored keys",
      sub: "The same mechanism as lesson 5.4's workload identity" },

    { t: "p", text: "An ML pipeline needs cloud access: pull training data, push an image, write a model artifact. The default approach is an access key in repository secrets, and it has the problem every long-lived credential has — it does not expire, it is copied when forked, and rotating it means touching every workflow that uses it." },

    { t: "p", text: "The replacement is **OIDC federation**: GitHub issues a short-lived signed token describing the workflow, and the cloud exchanges it for temporary credentials based on a trust policy. No secret is stored anywhere." },

    { t: "code", lang: "yaml", title: "OIDC, and the condition that makes it safe",
      code: `permissions:
  id-token: write            # required: lets the job request the OIDC token
  contents: read

jobs:
  publish:
    if: github.ref == 'refs/heads/main'      # only from the default branch
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/loan-ci
          aws-region: eu-west-2
          # no access key anywhere

# The trust policy on the role is the real control. Its condition MUST pin
# the repository AND the ref -- a policy trusting only the repo lets any
# branch, including a pull request branch, assume the role:
#
#   "Condition": {"StringEquals": {
#      "token.actions.githubusercontent.com:sub":
#        "repo:acme/loan-model:ref:refs/heads/main"}}` },

    { t: "callout", kind: "trap", title: "A trust policy that pins only the repository is a hole",
      body: [
        { t: "p", text: "The OIDC token's `sub` claim describes the repository **and the ref**. A trust policy matching `repo:acme/loan-model:*` is satisfied by a workflow running on **any** branch — which on a public repository, or one accepting contributions, means a pull request can assume the production role." },
        { t: "p", text: "Pin the ref, use `StringEquals` rather than `StringLike` where you can, and keep separate roles for PR and default-branch workflows with different permissions. The `if: github.ref == 'refs/heads/main'` guard in the workflow is defence in depth, not the control — the control is the trust policy, because the workflow file is editable in a pull request." }
      ] },

    { t: "h2", n: "05", id: "runners", text: "Runners, matrices and what not to do",
      sub: "The ML-specific parts" },

    { t: "p", text: "Three remaining mechanics, each with an ML-specific wrinkle." },

    { t: "p", text: "**Matrices multiply, and that is usually waste.** `python: [3.10, 3.11, 3.12]` crossed with `os: [ubuntu, macos, windows]` is nine jobs. For a library that must work everywhere, correct. For a model service that will only ever run in the Linux container from lesson 4.3, it is nine times the cost to test eight configurations that will never exist. Test the one you ship." },

    { t: "p", text: "**Hosted runners have no GPU**, so a GPU training smoke test is not available on them. The options are a self-hosted runner with a GPU — which means lesson 6.2's driver management and a security boundary, since a self-hosted runner executes code from pull requests — or keeping GPU work out of CI entirely and letting the retraining pipeline on the cluster do it. The second is usually right." },

    { t: "p", text: "**Artifacts and logs are not a prediction log.** Uploading a model from a CI run to `actions/upload-artifact` gives you a 90-day retention and no lineage. Lesson 1.2's run record and lesson 15.1's registry are where a model goes; CI artifacts are for a test report." },

    { t: "diagram", kind: "steps", id: "dg-6_3-05-0",
      title: "The five highest-value changes to an ML pipeline",
      caption: "Ordered by value for effort. **The first two are measured in this lesson and both are a few lines**, and the third is the one that most often turns out to be silently broken.",
      items: [
        { label: "Cancel superseded runs", desc: "concurrency with cancel-in-progress: usually the biggest single saving, and three lines." },
        { label: "Order cheapest-and-most-likely-to-fail first", desc: "Measured: 8.55 against 9.88 expected minutes, 16%, with the pass rate identical at 70.3%." },
        { label: "Fix the cache key", desc: "hashFiles on the requirements, plus OS and Python version. A static key tests a stale set for ever." },
        { label: "Replace stored keys with OIDC, and pin the ref", desc: "No long-lived credential, and a trust policy matching only the repo lets any branch assume the role." },
        { label: "Test the one configuration you ship", desc: "A matrix for a service that only runs in one container is multiplied cost for configurations that will never exist." }
      ] },

    { t: "exercise", kind: "practice", title: "Measure your own pipeline", difficulty: "core", minutes: 30,
      prompt: "Take a real pipeline and compute its expected cost. List each stage with its duration and its observed failure rate from the last fifty runs, then compute expected minutes for the current order and for cheapest-and-most-likely-first, and multiply the difference by your runs per day. Then check four specifics: does `concurrency` cancel superseded runs; does the cache key include a hash of the requirements and the OS and Python version; is any cloud credential stored as a long-lived secret rather than obtained via OIDC; and if OIDC is in use, does the trust policy pin the ref or only the repository. Finally, find anything in the PR pipeline that is not a function of the diff.",
      hints: [
        "Failure rates come from the run history, not from intuition — the stage people think fails most often usually is not.",
        "A cache key with no `hashFiles` is the finding: CI has been testing a frozen dependency set, possibly for months.",
        "'Not a function of the diff' usually catches a full training run or an integration test against a shared environment."
      ],
      solution: {
        body: [
          { t: "p", text: "The two findings that recur are a missing `concurrency` block and a cache key that never invalidates. The first is pure waste and three lines to fix; the second is a correctness problem masquerading as an optimisation, because it means a dependency bump has no effect on anything CI tests." },
          { t: "p", text: "The expected-cost calculation often shows a smaller gain than the concurrency fix, which is worth knowing: ordering is the famous advice and cancelling duplicate runs is usually the bigger number." }
        ]
      } }

  ],

  takeaways: [
    "**Expected cost = each stage's duration weighted by the probability of reaching it**, so a stage you rarely reach is nearly free.",
    "**Ordering changed expected cost by 16%**: 8.55 against 9.88 minutes, which at 40 runs a day is 53 minutes of runner time daily.",
    "**The pass rate was identical at 70.3% in both orderings** — the product of pass probabilities is order-independent, so ordering buys time, not reliability.",
    "**The rule is cheapest-AND-most-likely-to-fail first.** A stage that never fails costs its full duration wherever it sits.",
    "**Data validation belongs before training**: 0.5 minutes, fails 5%, and it catches the corruption lesson 1.5 measured at 19 accuracy points.",
    "**`concurrency` with `cancel-in-progress` is usually the single biggest saving** — without it a branch with six pushes runs six pipelines.",
    "**Set `timeout-minutes`**, or a hung job bills until the platform's six-hour default; and use `paths` so a README change runs nothing.",
    "**A smoke train asserts the code completes and produces a model-shaped object**, not that the model is good — quality is not a function of the diff.",
    "**A static cache key is a silent correctness bug**: the cache always restores, so CI tests a frozen dependency set and a requirements bump has no effect.",
    "**Include the OS and Python version in the key**, because wheels are platform- and interpreter-specific — and prefer `setup-python`'s `cache: pip`, which gets this right.",
    "**OIDC replaces stored cloud keys** with a short-lived signed token exchanged for temporary credentials; no secret is stored.",
    "**Pin the ref in the trust policy, not just the repository** — `repo:org/name:*` lets any branch, including a pull request, assume the role.",
    "**Test the one configuration you ship.** A matrix is correct for a library and multiplied waste for a service that only runs in one container.",
    "**Hosted runners have no GPU**, and a self-hosted one executes pull-request code — so GPU work usually belongs in the cluster pipeline instead.",
    "**CI artifacts are not a model registry**: 90-day retention and no lineage. Models go where lesson 1.2 and 15.1 put them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You reorder a pipeline to run its cheapest stages first. What changes?",
        options: [
          "More runs pass, because expensive stages are reached less often",
          "Only the expected cost — measured at 8.55 against 9.88 minutes, 16% — while the pass rate is identical at 70.3% in both orderings",
          "Nothing measurable; stage ordering is a style preference"
        ],
        answer: 1,
        why: "The product of the pass probabilities does not depend on their order, so ordering cannot change whether a run fails. The argument is economic — runner cost and, just as importantly, feedback latency: thirty seconds to a lint failure instead of nine minutes."
      },
      {
        stem: "A workflow caches pip with `key: pip-cache`. What is the consequence?",
        options: [
          "The cache is too small to be useful and should include a path hash",
          "The key never changes, so the cache always restores and CI silently tests whatever dependency set was current when it was first populated — a requirements bump has no effect",
          "The cache is invalidated on every run because the key is not unique"
        ],
        answer: 1,
        why: "This is a correctness problem wearing an optimisation's clothes: the pipeline appears green while testing a frozen environment, and the divergence surfaces only when the deployed image behaves differently. The key must hash the requirements files and include the OS and Python version, since wheels are platform-specific."
      },
      {
        stem: "Your OIDC trust policy allows `repo:acme/loan-model:*` to assume the production role. What is wrong?",
        options: [
          "Nothing — the repository is correctly pinned",
          "The `sub` claim includes the ref, so the wildcard is satisfied by a workflow on any branch, including a pull request branch — which can therefore assume the production role",
          "Wildcards are not supported in OIDC trust conditions"
        ],
        answer: 1,
        why: "Pin the ref with StringEquals and keep separate roles for PR and default-branch workflows. The `if: github.ref == 'refs/heads/main'` guard in the workflow is defence in depth only, because the workflow file itself is editable in a pull request."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How would you make a slow CI pipeline faster?",
        strong: "Three things, in order of what they actually save. First, cancel superseded runs with a concurrency group — on a repo where people push repeatedly that is usually the single biggest saving and it is three lines. Second, reorder so the cheapest and most-likely-to-fail stages run first: I computed 8.55 expected minutes against 9.88 for the reversed order, about 16%, which at forty runs a day is nearly an hour of runner time. Worth being precise that this buys time and not reliability — the pass rate was identical at 70.3% either way, because the product of the pass probabilities does not depend on order. Third, fix the dependency cache, which for an ML repo dominates runtime: scipy and scikit-learn alone are 186 MB of packages.",
        answer: [
          { t: "p", text: "Putting concurrency ahead of ordering is the practically correct ranking and not the usual answer, which makes it memorable." },
          { t: "p", text: "Explicitly separating cost from reliability shows the mechanism is understood rather than the maxim repeated." }
        ]
      },
      {
        level: "senior",
        q: "How does your CI get access to cloud resources?",
        strong: "OIDC federation rather than a stored key. GitHub issues a short-lived signed token describing the workflow, and the cloud exchanges it for temporary credentials under a trust policy, so there is no long-lived secret to rotate, leak or copy into a fork. The part that matters is the trust policy, because the token's sub claim includes both the repository and the ref: a policy matching `repo:org/name:*` is satisfied by a workflow on any branch, so a pull request can assume the production role. I pin the ref with StringEquals and keep separate roles for PR and default-branch workflows with different permissions. The `if: github.ref == 'refs/heads/main'` guard is defence in depth, not the control, because the workflow file is itself editable in a pull request. It is the same mechanism as workload identity for a pod — a ServiceAccount or a workflow identity exchanged for a short-lived credential, instead of a secret at rest.",
        answer: [
          { t: "p", text: "The wildcard-in-the-trust-policy hole is the detail that distinguishes someone who has configured this from someone who has enabled it, and it is a real and common misconfiguration." },
          { t: "p", text: "Connecting it to pod workload identity shows the pattern is understood as one mechanism rather than two features." }
        ]
      }
    ]
  }
});
