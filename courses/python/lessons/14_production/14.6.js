/* ============================================================================
   LESSON 14.6 — CI/CD for Python Services
   ========================================================================= */
EC.receiveLesson({
  id: "14.6",

  lede: "A pipeline is a statement about what you believe must be true before code reaches users. **Most pipelines are slower than they need to be and check less than they claim**, because they were assembled one reaction at a time — a step per incident, never a step removed.",

  objectives: [
    "Order pipeline stages so failures surface in seconds, not minutes",
    "Cache dependencies correctly, and know when a cache is a liability",
    "Build one artefact and promote it, rather than rebuilding per environment",
    "Choose gates that catch real problems and drop the ones that do not",
    "Make rollback a first-class operation rather than a fresh deploy"
  ],

  prerequisites: ["14.4", "14.5"],

  blocks: [

    { t: "h2", n: "01", text: "Fast feedback first", id: "ordering" },

    { t: "viz",
      title: "Order by cost, not by importance",
      caption: "Every stage that runs before a cheap check is time wasted on a build that was always going to fail. A lint error should be known in fifteen seconds, not after a nine-minute test suite.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Pipeline stages ordered by execution time from fastest to slowest">
  <text x="24" y="30" class="s-label">Fail fast — cheapest checks first</text>

  <rect x="24" y="46" width="86" height="42" rx="6" style="fill:var(--good);opacity:.25"/>
  <text x="67" y="66" text-anchor="middle" class="s-sub">lint</text>
  <text x="67" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">10s</text>

  <rect x="120" y="46" width="100" height="42" rx="6" style="fill:var(--good);opacity:.25"/>
  <text x="170" y="66" text-anchor="middle" class="s-sub">type check</text>
  <text x="170" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">25s</text>

  <rect x="230" y="46" width="120" height="42" rx="6" style="fill:var(--t-blue);opacity:.28"/>
  <text x="290" y="66" text-anchor="middle" class="s-sub">unit tests</text>
  <text x="290" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">40s</text>

  <rect x="360" y="46" width="150" height="42" rx="6" style="fill:var(--t-violet);opacity:.28"/>
  <text x="435" y="66" text-anchor="middle" class="s-sub">integration tests</text>
  <text x="435" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">3m</text>

  <rect x="520" y="46" width="130" height="42" rx="6" style="fill:var(--t-amber);opacity:.3"/>
  <text x="585" y="66" text-anchor="middle" class="s-sub">build image</text>
  <text x="585" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">2m</text>

  <rect x="660" y="46" width="100" height="42" rx="6" style="fill:var(--t-amber);opacity:.3"/>
  <text x="710" y="66" text-anchor="middle" class="s-sub">scan</text>
  <text x="710" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">1m</text>

  <rect x="770" y="46" width="106" height="42" rx="6" style="fill:var(--t-green);opacity:.3"/>
  <text x="823" y="66" text-anchor="middle" class="s-sub">deploy</text>
  <text x="823" y="82" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">2m</text>

  <text x="24" y="132" class="s-sub" style="fill:var(--ink-3)">Lint, type check and unit tests run in PARALLEL — 40s wall clock, not 75s.</text>
  <text x="24" y="156" class="s-sub" style="fill:var(--ink-3)">Integration tests gate the build. The build gates the scan. The scan gates the deploy.</text>
  <text x="24" y="192" class="s-sub" style="fill:var(--crit)">The anti-pattern: build the image first (2m) so a missing import is found at minute two rather than second ten.</text>
  <text x="24" y="222" class="s-sub" style="fill:var(--ink-3)">Target: under 10 minutes to production. Past 15, people stop watching their own pipelines.</text>
</svg>`
    },

    { t: "code", lang: "toml", title: ".github/workflows/ci.yml", code: `
name: CI

on:
  pull_request:
  push:
    branches: [main]

# Cancel superseded runs. Without this, pushing three times queues
# three full pipelines and you wait for all of them.
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: "3.12"

jobs:
  # ---- fast checks, in parallel -----------------------------------
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 5          # a hung job must not burn an hour
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      - run: uv sync --frozen --all-extras
      - run: uv run ruff check --output-format=github .
      - run: uv run ruff format --check .
      - run: uv run mypy src/

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        # Without a health check the tests start before the database
        # is accepting connections, and fail intermittently.
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 5s --health-retries 5
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }
      - run: uv sync --frozen --all-extras
      - run: uv run pytest -n auto --cov=src --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
`,
      hl: [11, 22, 40],
      caption: "**`cancel-in-progress` and per-job timeouts are the two lines that keep a pipeline usable.** Without them, a busy afternoon queues behind runs nobody wants and a hung step consumes an hour of runner time."
    },

    { t: "h2", n: "02", text: "Build once, promote", id: "promote" },

    {"kind": "flow", "title": "Build once, promote", "caption": "Tests run on the same artefact that ships. The image built on the commit is tagged, tested, then promoted to staging and production by tag — never rebuilt per environment.", "cols": 5, "nodes": [{"id": "ci", "label": "commit → CI", "sub": "lint, type-check, unit tests", "tone": "accent"}, {"id": "build", "label": "build image :sha", "sub": "once", "tone": "good"}, {"id": "int", "label": "integration tests", "sub": "against the image", "tone": "warn"}, {"id": "stg", "label": "promote to staging", "sub": "same tag", "tone": "violet"}, {"id": "prod", "label": "promote to production", "sub": "same tag · rollback = previous tag", "tone": "crit"}], "edges": [["ci", "build"], ["build", "int"], ["int", "stg"], ["stg", "prod"]], "t": "diagram", "id": "dg-14_6-02-0"},

    { t: "ladder",
      title: "Getting the same code into staging and production",
      rungs: [
        { level: "bad", label: "Build per environment",
          why: "Two builds means two artefacts. Base images shift, a transitive dependency publishes a patch, the build cache differs — so what you tested in staging is not what runs in production, and the difference is invisible.",
          code: `deploy-staging:
    - docker build -t app:staging .
    - deploy staging app:staging

deploy-production:
    - docker build -t app:production .    # a DIFFERENT build
    - deploy production app:production` },
        { level: "ok", label: "Build once, tag by environment",
          why: "One artefact, which is the important part. Moving tags make it hard to answer \"what is running right now?\" after the fact, and a re-tag is not an auditable event.",
          code: `build:
    - docker build -t app:\${{ github.sha }} .
    - docker push app:\${{ github.sha }}

promote:
    - docker tag app:\${{ github.sha }} app:production
    - docker push app:production` },
        { level: "best", label: "Immutable digest, promoted by reference",
          why: "The digest is the artefact's identity and cannot be reassigned. Every deployment records exactly which bytes ran, rollback is deploying a previous digest, and the audit question has a precise answer.",
          code: `# Build once. The digest is content-addressed.
- id: build
  run: |
    docker buildx build --push -t app:\${{ github.sha }} .
    DIGEST=$(docker buildx imagetools inspect app:\${{ github.sha }} \\
             --format '{{json .Manifest.Digest}}' | tr -d '"')
    echo "digest=$DIGEST" >> $GITHUB_OUTPUT

# Deploy BY DIGEST, so the reference is unambiguous forever.
- run: |
    kubectl set image deploy/app \\
      app=registry/app@\${{ needs.build.outputs.digest }}

# The record: which digest, where, when, from which commit.
- run: |
    echo "\${{ needs.build.outputs.digest }} \${{ github.sha }} $(date -Is)" \\
      >> deployments.log`,
          note: "**A tag is a pointer; a digest is the thing.** After an incident, \"we deployed `app:production`\" tells you nothing about what actually ran." }
      ]
    },

    { t: "callout", kind: "insight", title: "Environment differences belong in config, not in the build", body: [
      { t: "p", text: "If staging and production need different images, something environment-specific has been compiled in — and that is the thing to remove, not to build around." },
      { t: "code", lang: "bash", title: "the test", numbered: false, code: `
# One image, three environments, differing only in what is injected
# at runtime:
#
#   staging:     DATABASE_URL=...staging    LOG_LEVEL=DEBUG
#   production:  DATABASE_URL=...prod       LOG_LEVEL=INFO
#
# If you cannot do this, ask what the image contains that should have
# been configuration (Lesson 14.2).`},
      { t: "p", text: "**This is also what makes staging meaningful.** Testing a different artefact tells you the build works, not that the release does." }
    ]},

    { t: "h2", n: "03", text: "Caching", id: "caching" },

    { t: "code", lang: "toml", title: "cache keys that are correct rather than fast", code: `
# The key must include everything that changes what is installed.
- uses: actions/cache@v4
  with:
    path: ~/.cache/uv
    # OS, Python version, and the LOCKFILE hash. Omit any of these
    # and you restore a cache built for a different environment.
    key: uv-\${{ runner.os }}-py\${{ env.PYTHON_VERSION }}-\${{ hashFiles('uv.lock') }}
    # A partial key: reuse most of a stale cache, then install the
    # delta. Much faster than a cold start, still correct because the
    # install step reconciles against the lockfile.
    restore-keys: |
      uv-\${{ runner.os }}-py\${{ env.PYTHON_VERSION }}-

# Docker layer caching, for image builds:
- uses: docker/build-push-action@v6
  with:
    # Registry-backed cache: shared across runners, unlike the local
    # one which is empty on every fresh machine.
    cache-from: type=registry,ref=registry/app:buildcache
    cache-to: type=registry,ref=registry/app:buildcache,mode=max
`,
      hl: [7, 11, 20],
      caption: "**`hashFiles('requirements.txt')` on an unpinned file is a false key.** The file is unchanged, the resolved versions are not, and the cache serves yesterday's dependency tree indefinitely."
    },

    { t: "callout", kind: "trap", title: "When a cache costs more than it saves", body: [
      { t: "code", lang: "bash", title: "three failure modes", numbered: false, code: `
# 1. A CACHE KEYED ON SOMETHING THAT DOES NOT CAPTURE THE INPUTS.
key: deps-\${{ runner.os }}
# Never invalidates. The pipeline installs a dependency set nobody
# has specified for months, and CI passes on code that fails in
# production because the versions differ.

# 2. CACHING THE VIRTUALENV RATHER THAN THE DOWNLOAD CACHE.
path: .venv
# A venv contains absolute paths and compiled artefacts. Restoring
# one from a different runner image produces failures that look like
# corruption, and the debugging goes nowhere.

# 3. A CACHE LARGER THAN THE DOWNLOAD IT REPLACES.
# Restoring 2GB over the network to avoid a 40s install is slower,
# and it counts against the cache quota so it evicts caches that
# were helping.`},
      { t: "p", text: "**Measure before caching.** A step that takes twenty seconds does not need a cache, and the cache adds a class of failure — stale, corrupt, or restored from the wrong context — that the step did not have." },
      { t: "p", text: "**When CI fails inexplicably, clear the cache first.** It is the fastest way to eliminate the most likely cause of \"passes locally, fails in CI\"." }
    ]},

    { t: "h2", n: "04", text: "Gates worth having", id: "gates" },

    { t: "table",
      head: ["Gate", "Blocks the deploy?", "Because"],
      rows: [
        ["Lint and format", "**Yes**", "Free, and it ends style review"],
        ["Type check", "**Yes**", "Catches a class of runtime error statically"],
        ["Unit + integration tests", "**Yes**", "The core contract"],
        ["Coverage **decrease**", "Yes", "**Not an absolute number** — see below"],
        ["High/critical CVEs", "**Yes**", "With a documented, expiring exception path"],
        ["Secret scanning", "**Yes**", "Cheap, and the failure is unrecoverable"],
        ["Migration safety check", "Yes", "A non-concurrent index is an outage (13.7)"],
        ["Total coverage ≥ 80%", "No", "Encourages tests of getters, not of behaviour"],
        ["Every dependency current", "No", "Noise; batch upgrades on a schedule"]
      ],
      caption: "**Gate on the delta, not the absolute.** \"Coverage must not fall\" is enforceable on every pull request; \"coverage must be 80%\" is either already true and idle, or false and permanently ignored."
    },

    { t: "code", lang: "toml", title: "the security and migration gates", code: `
  security:
    runs-on: ubuntu-latest
    steps:
      # Dependency CVEs. Fails the build on high or critical.
      - run: uv run pip-audit --strict

      # Image CVEs, before the image is deployable.
      - uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: registry/app:\${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: "1"
          # Findings with no fix available yet cannot be actioned;
          # blocking on them just teaches people to bypass the gate.
          ignore-unfixed: true

      # Secrets. The one failure that cannot be undone by a fix
      # commit -- history is permanent.
      - uses: gitleaks/gitleaks-action@v2

  migrations:
    runs-on: ubuntu-latest
    steps:
      # Every migration must be reversible, and the only proof is
      # running it (Lesson 13.7).
      - run: |
          uv run alembic upgrade head
          uv run alembic downgrade -1
          uv run alembic upgrade head

      # A non-concurrent index build takes ACCESS EXCLUSIVE and is
      # invisible in review.
      - run: |
          ! grep -rn "create_index" migrations/versions/ \\
            | grep -v "postgresql_concurrently=True"
`,
      hl: [15, 26, 33],
      caption: "**`ignore-unfixed` is the setting that keeps a CVE gate credible.** Blocking on a vulnerability with no available patch gives the team no action except disabling the gate — and once disabled it stays disabled."
    },

    { t: "h2", n: "05", text: "Deploying and rolling back", id: "deploy" },

    { t: "code", lang: "toml", title: "deploy, verify, roll back automatically", code: `
  deploy:
    needs: [quality, test, security, build]
    if: github.ref == 'refs/heads/main'
    environment: production        # manual approval, if configured
    steps:
      # Record what is running BEFORE changing it. Rollback needs a
      # target, and finding one during an incident wastes minutes.
      - id: current
        run: |
          echo "digest=$(kubectl get deploy/app -o jsonpath=\\
            '{.spec.template.spec.containers[0].image}')" >> $GITHUB_OUTPUT

      - run: |
          kubectl set image deploy/app app=registry/app@\${{ inputs.digest }}
          kubectl rollout status deploy/app --timeout=5m

      # Verification is part of the deploy, not a separate activity
      # someone remembers to do.
      - run: |
          for i in $(seq 1 30); do
            curl -fsS https://api.example.com/health/ready && break
            sleep 5
          done
          uv run pytest tests/smoke/ --base-url https://api.example.com

      # Automatic rollback. A human deciding takes minutes; this
      # takes seconds and is always correct for a failed rollout.
      - if: failure()
        run: |
          kubectl set image deploy/app app=\${{ steps.current.outputs.digest }}
          kubectl rollout status deploy/app --timeout=5m
          echo "::error::Deploy failed and was rolled back"
`,
      hl: [8, 20, 27],
      caption: "**A rollback that requires thought is not a rollback.** The previous digest is known at deploy time, so restoring it is one command that needs no investigation."
    },

    { t: "callout", kind: "tradeoff", title: "The migration that cannot roll back", body: [
      { t: "p", text: "Code rolls back in seconds. A migration that dropped a column does not — the data is gone, and the previous release expects it. **This is why the four-step sequence in Lesson 13.7 matters**: it keeps every step reversible except the final drop." },
      { t: "code", lang: "bash", title: "the ordering that keeps rollback available", numbered: false, code: `
# Migrations run BEFORE the new code, and must be compatible with the
# OLD code -- because for the duration of the rollout, and for the
# whole window in which you might roll back, the old code is running.
#
#   1. migrate   (additive only: new column, nullable)
#   2. deploy    (new code, writing both shapes)
#   3. verify
#   4. rollback available: the old code still works against the new
#      schema, because step 1 was additive
#
# The destructive migration -- dropping the old column -- is a
# SEPARATE deploy, days later, once rollback is no longer needed.`},
      { t: "p", text: "**Ask of every migration: if we roll the code back in ten minutes, does it still work?** If the answer is no, the migration must be split." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a pipeline nobody trusts",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This pipeline takes 42 minutes, fails randomly about one run in five, and the team merges on red \"because it's probably the flaky test\". A bad deploy last month took 50 minutes to roll back." },
        { t: "code", lang: "toml", numbered: false, title: ".github/workflows/deploy.yml", code: `
on: [push]

jobs:
  everything:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }

      - run: docker build -t app:latest .
      - run: pip install -r requirements.txt
      - run: pip install -r requirements-dev.txt

      - run: pytest tests/
      - run: ruff check .
      - run: mypy src/

      - run: docker push app:latest
      - run: kubectl set image deploy/app app=app:latest
      - run: alembic upgrade head`},
        { t: "p", text: "Rewrite it. Explain the 50-minute rollback, the random failures, and why `app:latest` makes both worse." }
      ],
      requirements: [
        "List every problem, ranked.",
        "Explain precisely why rollback took 50 minutes.",
        "Identify at least two causes of the random failures.",
        "Rewrite the pipeline with parallel jobs and proper gating.",
        "Explain the migration ordering bug.",
        "Estimate the new wall-clock time."
      ],
      hint: "Look at the order of the last three steps, and at what `app:latest` refers to at any given moment.",
      solution: {
        lang: "toml",
        title: ".github/workflows/ci.yml",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# ---- CRITICAL -----------------------------------------------------
#
# 1. MIGRATIONS RUN AFTER THE DEPLOY.
#      kubectl set image ...      <- new code starts serving
#      alembic upgrade head       <- schema changes AFTERWARDS
#
#    Between those two lines the new code is live against the OLD
#    schema. Every request touching a new column 500s. The window is
#    the rollout duration plus the migration duration -- minutes of
#    guaranteed errors on every deploy that adds a column.
#
#    Migrations must run BEFORE the new code, and must be compatible
#    with the OLD code (Lesson 13.7).
#
# 2. app:latest -- THE 50-MINUTE ROLLBACK.
#
#    "latest" is a moving pointer. To roll back you must:
#      - work out which commit was previously deployed (nothing
#        recorded it)
#      - check out that commit
#      - rebuild the image (~6 min) and hope it builds identically
#      - push it, overwriting latest
#      - deploy
#
#    That is the 50 minutes, and most of it is investigation. With a
#    digest, rollback is one kubectl command and takes 40 seconds.
#
#    "latest" is worse than slow: it is AMBIGUOUS. Two concurrent
#    merges both push latest, and which one a pod pulls depends on
#    timing. After an incident there is no way to know what ran.
#
# 3. NO GATES BEFORE DEPLOY. Every step is in one job, running
#    sequentially, and the deploy steps are not conditional on
#    anything. A test failure stops the job -- but there is no
#    branch condition, so this runs "on: [push]" for EVERY branch.
#    Any push to any branch deploys to production.
#
# ---- HIGH ---------------------------------------------------------
#
# 4. EVERYTHING IN ONE SEQUENTIAL JOB. lint (10s), types (25s) and
#    tests (9m) run one after another, after a 6-minute Docker build.
#    A lint error is discovered at minute 16.
#
# 5. THE DOCKER BUILD IS FIRST. The most expensive step gates the
#    cheapest checks. Exactly backwards.
#
# 6. NO CACHING. pip installs everything from scratch on every run:
#    ~4 minutes of the 42.
#
# 7. NO DEPENDENCY PINNING. requirements.txt without a lockfile means
#    each run resolves versions afresh. THIS IS A MAJOR CAUSE OF THE
#    RANDOM FAILURES: a transitive dependency publishes a patch and
#    the build breaks with no change on your side.
#
# 8. NO SERVICE HEALTH CHECK. If tests need a database, they start
#    before it is accepting connections. THE SECOND MAJOR CAUSE OF
#    RANDOM FAILURES -- and it presents as a different test failing
#    each time, which is why it reads as flakiness.
#
# 9. NO TIMEOUTS. A hung test consumes six hours of runner time.
#
# 10. NO CONCURRENCY CONTROL. Three pushes queue three full 42-minute
#     pipelines, and two of them are already obsolete.
#
# ---- MEDIUM -------------------------------------------------------
#
# 11. NO SECURITY SCANNING at all -- no CVEs, no secret scan.
# 12. NO POST-DEPLOY VERIFICATION. Nothing checks the deploy worked.
# 13. NO ROLLBACK PATH. Manual, and see (2).
# 14. dev dependencies installed before tests but the image was built
#     first, so the image may not match what was tested.
#
#
# =========================================================================
# THE RANDOM FAILURES -- the two causes
# =========================================================================
#
# A. UNPINNED DEPENDENCIES (7). Every run resolves the dependency
#    tree independently. A patch release of a transitive dependency
#    -- one you have never named -- changes behaviour or breaks an
#    import. Nothing in your repository changed; the build fails.
#    Re-running "fixes" it only if the resolver picks differently.
#
# B. A RACE WITH THE SERVICE CONTAINER (8). Postgres accepts TCP
#    connections before it is ready to serve, so early tests fail
#    with connection errors. It fails a DIFFERENT test each run
#    depending on ordering and timing -- which is precisely why the
#    team calls it flaky rather than broken.
#
# The cost of "it's probably the flaky test" is that a REAL failure
# is indistinguishable from noise. That is the actual damage: the
# pipeline no longer carries information.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

name: CI/CD

on:
  pull_request:
  push:
    branches: [main]        # NOT every branch (finding 3)

concurrency:                # finding 10
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  packages: write
  id-token: write           # OIDC, so no long-lived cloud credentials

env:
  IMAGE: ghcr.io/\${{ github.repository }}

jobs:
  # ---- STAGE 1: fast checks, in parallel (findings 4, 5) ----------

  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5                     # finding 9
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }       # finding 6
      - run: uv sync --frozen               # finding 7: LOCKFILE
      - run: uv run ruff check --output-format=github .
      - run: uv run ruff format --check .

  types:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }
      - run: uv sync --frozen
      - run: uv run mypy src/

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
        # FINDING 8 -- the race. The job waits for pg_isready rather
        # than for the port to open.
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }
      - run: uv sync --frozen --all-extras
      # -n auto: parallel across cores. --dist loadfile keeps tests
      # from one file on one worker, which avoids fixture contention.
      - run: uv run pytest -n auto --dist loadfile --cov=src --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      - uses: codecov/codecov-action@v4

  security:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2      # finding 11
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      - run: uv run pip-audit --strict

  migrations:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      # Every migration must be reversible, and running it is the
      # only proof (Lesson 13.7).
      - run: |
          uv run alembic upgrade head
          uv run alembic downgrade -1
          uv run alembic upgrade head
      # A non-concurrent index build is an ACCESS EXCLUSIVE lock and
      # is invisible in review.
      - run: |
          ! grep -rn "create_index" migrations/versions/ \\
            | grep -v "postgresql_concurrently=True"

  # ---- STAGE 2: build, only if stage 1 passed --------------------

  build:
    needs: [lint, types, test, security, migrations]
    runs-on: ubuntu-latest
    timeout-minutes: 20
    outputs:
      digest: \${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - id: build
        uses: docker/build-push-action@v6
        with:
          push: true
          # The COMMIT SHA, never "latest" (finding 2).
          tags: \${{ env.IMAGE }}:\${{ github.sha }}
          # Registry-backed layer cache, shared across runners.
          cache-from: type=registry,ref=\${{ env.IMAGE }}:buildcache
          cache-to: type=registry,ref=\${{ env.IMAGE }}:buildcache,mode=max
          provenance: true          # supply-chain attestation

      # Scan the ACTUAL artefact, before it can be deployed.
      - uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: \${{ env.IMAGE }}@\${{ steps.build.outputs.digest }}
          severity: HIGH,CRITICAL
          exit-code: "1"
          ignore-unfixed: true      # unactionable findings do not gate

  # ---- STAGE 3: deploy, main only, with rollback -----------------

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production         # approval gate, if configured
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      # Record what is running NOW. Rollback needs a target, and
      # finding one during an incident is most of the 50 minutes.
      - id: current
        run: |
          CURRENT=$(kubectl get deploy/app \\
            -o jsonpath='{.spec.template.spec.containers[0].image}')
          echo "image=$CURRENT" >> $GITHUB_OUTPUT

      # FINDING 1: MIGRATIONS FIRST, and additive-only so the OLD
      # code keeps working -- which is what makes rollback possible.
      - run: |
          kubectl run migrate-\${{ github.sha }} \\
            --image=\${{ env.IMAGE }}@\${{ needs.build.outputs.digest }} \\
            --restart=Never --attach --rm \\
            --command -- alembic upgrade head

      # Deploy BY DIGEST. Unambiguous, immutable, auditable.
      - run: |
          kubectl set image deploy/app \\
            app=\${{ env.IMAGE }}@\${{ needs.build.outputs.digest }}
          kubectl rollout status deploy/app --timeout=5m

      # FINDING 12: verification is part of the deploy.
      - run: |
          for i in $(seq 1 30); do
            curl -fsS https://api.example.com/health/ready && break
            sleep 5
          done
          uv run pytest tests/smoke/ --base-url https://api.example.com

      # FINDING 13: automatic rollback. 40 seconds, no investigation.
      - if: failure()
        run: |
          kubectl set image deploy/app app=\${{ steps.current.outputs.image }}
          kubectl rollout status deploy/app --timeout=5m
          echo "::error::Deploy failed; rolled back to \\
            \${{ steps.current.outputs.image }}"

      - if: always()
        run: |
          echo "\${{ needs.build.outputs.digest }} \${{ github.sha }} \\
            \${{ job.status }} $(date -Is)" >> deployments.log


# =========================================================================
# THE MIGRATION ORDERING BUG, IN FULL
# =========================================================================
#
# Original order:
#   1. kubectl set image     -> new pods start
#   2. alembic upgrade head  -> schema changes
#
# Between 1 and 2 the new code runs against the old schema. Any query
# referencing a new column raises UndefinedColumn -> 500. The window
# is the rollout plus the migration: minutes of guaranteed errors on
# every schema-changing deploy.
#
# Correct order:
#   1. migrate (ADDITIVE ONLY -- the old code must still work)
#   2. deploy new code
#   3. verify
#   4. (days later, separate deploy) drop the old column
#
# The critical constraint is step 1 being additive. If the migration
# removed something, rolling back the code in step 3 would put the
# OLD code against a schema it cannot use -- so rollback would be
# impossible exactly when it is needed.
#
# THE QUESTION TO ASK OF EVERY MIGRATION: if we roll the code back in
# ten minutes, does it still work?


# =========================================================================
# WALL-CLOCK TIME
# =========================================================================
#
#                        before        after
#   lint                 (in the 42)   ~35 s  ┐
#   types                              ~50 s  │ parallel
#   tests                              ~4 min │ -> 4 min
#   security                           ~1 min │
#   migrations                         ~1 min ┘
#   build + scan         6 min         ~2 min (cached layers)
#   deploy + verify      ~2 min        ~3 min (verification added)
#   ------------------------------------------------------
#   TOTAL                42 min        ~9 min
#
#   feedback on a lint error   16 min      35 s
#   rollback                   50 min      40 s
#   random failure rate        ~20%        ~0  (lockfile + health check)
#
# The feedback number is the one that changes behaviour. At 42
# minutes people stop watching their pipelines and merge on red; at
# nine, they wait -- and a green build starts meaning something
# again.`,
        notes: [
          { t: "p", text: "**Migrations running after the deploy is the most damaging finding.** Between the two steps the new code queries columns that do not exist yet, so every schema-changing deploy produces minutes of guaranteed 500s — and nothing in the pipeline reports it as a failure." },
          { t: "p", text: "**`app:latest` is what made rollback take 50 minutes.** Almost all of it was investigation: nothing recorded which commit was previously deployed, so the team had to work it out, check it out and rebuild. A digest makes rollback one command against a value recorded at deploy time." },
          { t: "callout", kind: "insight", title: "The two random failures are not flakiness", body: [
            { t: "p", text: "Unpinned dependencies mean every run resolves versions afresh, so a patch release of a package you have never named breaks the build with no change on your side. A lockfile removes the class entirely." },
            { t: "p", text: "The service-container race is the second: Postgres accepts TCP connections before it can serve, so early tests fail with connection errors — and a different test fails each run, which is exactly why it reads as flakiness rather than a missing health check." },
            { t: "p", text: "The real cost is that a genuine failure becomes indistinguishable from noise. \"Probably the flaky test\" means the pipeline has stopped carrying information." }
          ]},
          { t: "p", text: "**`on: [push]` with no branch filter deploys every branch to production.** It is the kind of finding that survives because it works correctly whenever anyone happens to push only to main." },
          { t: "p", text: "**Ordering the Docker build first is exactly backwards.** The most expensive step gates the cheapest checks, so a lint error costs sixteen minutes to discover instead of thirty-five seconds." },
          { t: "p", text: "**Nine minutes rather than forty-two is what changes behaviour.** Past roughly fifteen minutes people stop watching their own pipelines, merge on red and treat failures as noise — so the speed work is what makes every gate above it meaningful." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's pipeline took 38 minutes. They added a required approval before deployment, reasoning that a slow pipeline needed a human check." },
      { t: "p", text: "**Deploys dropped from twelve a day to two.** Batches grew, each release contained more changes, and when something broke there were fifteen commits to bisect rather than one — so incidents took longer and were more frequent." },
      { t: "p", text: "**Cutting the pipeline to eight minutes reversed all of it.** Deploys returned to more than a dozen a day, each carrying one change, and mean time to recovery fell because the culprit was obvious." },
      { t: "p", text: "**Slow pipelines make releases riskier, not safer.** The instinct to add process to a slow pipeline treats the symptom and worsens the cause — smaller, more frequent releases are the safety mechanism." }
    ]}
  ],

  takeaways: [
    "**Order stages by cost, cheapest first.** A lint error should be known in seconds, not after a nine-minute test suite.",
    "**Run independent checks in parallel.** Lint, types, tests, security and migrations are five jobs, not five sequential steps.",
    "**Set `cancel-in-progress` and per-job timeouts** — otherwise obsolete runs queue and a hung step burns an hour of runner time.",
    "**Build one artefact and promote it.** Rebuilding per environment means production runs something staging never tested.",
    "**Deploy by digest, never by a moving tag.** A tag is a pointer; after an incident, \"we deployed `app:latest`\" tells you nothing.",
    "**Record the current digest before deploying**, so rollback is a command rather than an investigation.",
    "**Migrations run before the code and must be additive**, or the new code queries columns that do not exist and rollback becomes impossible.",
    "**Ask of every migration: if we roll back in ten minutes, does it still work?**",
    "**Cache keys must include everything that changes what is installed** — OS, Python version and the lockfile hash.",
    "**A lockfile removes a whole class of random CI failure.** Unpinned dependencies resolve differently on every run.",
    "**Service containers need health checks.** Postgres accepts connections before it can serve, and the result reads as flakiness.",
    "**Gate on the delta, not the absolute** — \"coverage must not fall\" is enforceable where \"coverage ≥ 80%\" is idle or ignored.",
    "**Use `ignore-unfixed` on CVE gates.** Blocking on an unpatchable finding gives the team no action except disabling the gate.",
    "**A slow pipeline makes releases riskier.** Past fifteen minutes people stop watching, merge on red, and batches grow."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pipeline runs `kubectl set image` and then `alembic upgrade head`. What is wrong?",
        options: [
          "Migrations should run in a separate pipeline",
          "The new code is live against the old schema between the two steps, so every request touching a new column fails until the migration completes",
          "`kubectl set image` cannot be scripted safely",
          "Alembic requires the old pods to be stopped"
        ],
        answer: 1,
        why: "Migrations must run first, and must be additive so the old code keeps working — which is also what makes rollback possible. A migration that removes something means rolling the code back leaves the old version against a schema it cannot use."
      },
      {
        stem: "Why does deploying `app:latest` make rollback slow?",
        options: [
          "The registry rate-limits `latest`",
          "It is a moving pointer, so nothing records what was previously deployed — the previous version must be identified and rebuilt before it can be redeployed",
          "`latest` images are not cached",
          "Kubernetes refuses to redeploy the same tag"
        ],
        answer: 1,
        why: "Most of a slow rollback is investigation rather than execution. A digest is content-addressed and immutable, so recording it at deploy time makes rollback a single command — and it also removes the ambiguity where two concurrent merges both push `latest`."
      },
      {
        stem: "CI fails about one run in five with different tests each time. Which two causes should you check first?",
        options: [
          "Runner memory limits and disk space",
          "Unpinned dependencies resolving differently each run, and a service container with no health check so tests start before the database can serve",
          "Test ordering and random seeds",
          "Network flakiness to the package index"
        ],
        answer: 1,
        why: "Both produce failures that move around, which is why they get labelled flaky. A lockfile removes the first; `--health-cmd pg_isready` removes the second. The real damage is that a genuine failure becomes indistinguishable from noise, so people merge on red."
      },
      {
        stem: "A team adds a manual approval gate because their 38-minute pipeline feels risky. What happens?",
        options: [
          "Incident rate falls as intended",
          "Deploys become less frequent, batches grow, and each incident has more changes to bisect — so recovery is slower and failures more likely",
          "Nothing measurable changes",
          "Pipeline duration falls as fewer runs are triggered"
        ],
        answer: 1,
        why: "Small, frequent releases are the safety mechanism. Adding process to a slow pipeline treats the symptom and worsens the cause; making the pipeline fast restores frequent single-change deploys, which is what makes the culprit obvious when something breaks."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Design a CI/CD pipeline for a Python service.",
        strong: "Cheap checks in parallel first — lint, types, unit tests — then integration tests, then build one image tagged by commit, scan it, and deploy by digest with automatic rollback on a failed verification.",
        answer: [
          { t: "p", text: "Ordering by cost rather than by importance is the principle, and it explains every other choice in the answer." },
          { t: "p", text: "Build-once-promote is the point interviewers listen for: rebuilding per environment means production runs an artefact staging never tested." },
          { t: "p", text: "Mentioning the target of under ten minutes, and what happens past fifteen, shows you treat speed as a correctness property rather than a convenience." }
        ]
      },
      {
        level: "advanced",
        q: "How do you handle database migrations in a deploy pipeline?",
        strong: "Migrate before deploying, and keep the migration additive so the old code still works. That is what makes rollback possible — a destructive migration means rolling the code back leaves it against a schema it cannot use.",
        answer: [
          { t: "p", text: "The rollback framing is what elevates this: the ordering is not a preference, it is what keeps the previous release runnable." },
          { t: "p", text: "The ten-minute question — if we roll back now, does it still work? — is a memorable test worth offering." },
          { t: "p", text: "Noting that the destructive step is a separate deploy days later connects it to the zero-downtime sequence from schema work." }
        ]
      },
      {
        level: "core",
        q: "What would you gate a deploy on?",
        strong: "Lint, types, tests, secret scanning, high and critical CVEs with unfixed findings excluded, and migration reversibility. Not an absolute coverage number, and not every dependency being current.",
        answer: [
          { t: "p", text: "The delta-versus-absolute distinction on coverage shows you have seen a gate that everyone ignores." },
          { t: "p", text: "`ignore-unfixed` is a small detail with a real consequence: an unactionable gate is one that gets disabled, and stays disabled." },
          { t: "p", text: "Being willing to name gates you would remove is more convincing than listing ones you would add." }
        ]
      }
    ]
  }
});
