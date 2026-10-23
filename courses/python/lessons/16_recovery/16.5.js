/* ============================================================================
   LESSON 16.5 — Recovery for Python Applications, Stage by Stage
   ========================================================================= */
EC.receiveLesson({
  id: "16.5",

  lede: "Underneath every ML, RAG and agentic system is an ordinary Python application, and it has its own six stages — dependencies, build, configuration, deploy, runtime, data. **These are the failures with no AI in them at all, which is why they are the ones that actually take systems down most often.** The stages are well understood and the mitigations are cheap; what makes them worth a lesson is that each one has a specific prevention that most codebases have not applied.",

  objectives: [
    "Make a build reproducible, so a rebuild is a recovery rather than a new version",
    "Separate configuration failures from code failures, and roll back the right one",
    "Deploy in a way that makes a rollback a routine operation rather than an event",
    "Recover a runtime that has exhausted a bounded resource, and prevent the recurrence",
    "Order a schema migration so the deploy before it and the deploy after it both work"
  ],

  prerequisites: ["16.1", "14.8"],

  blocks: [

    { t: "h2", n: "01", text: "Six stages, from dependency to data", id: "stages" },

    {"kind": "trace", "title": "Six stages in deploy order, and the recovery cost rises along it", "caption": "**The last row breaks the mental model the other five share.** Every stage above it recovers by returning to the previous artifact; a migration has already changed the database, and rolling back the application does not roll back the schema. **So stage 6 is the only one where the prevention is mandatory rather than advisable** — expand-and-contract is what keeps a code rollback available, and without it a failed deploy leaves old code against a new database with no fast way back.", "left": "stage", "codeW": 170, "vars": ["recovery cost", "the prevention most codebases lack"], "steps": [{"code": "1 dependencies", "state": ["minutes, with a lock file", "hashes, and a private mirror"], "tone": "good"}, {"code": "2 build", "state": ["minutes to hours", "immutable digests; keep the image"], "changed": [0, 1], "tone": "good"}, {"code": "3 configuration", "state": ["minutes", "validate at start-up, fail fast"], "changed": [0, 1], "tone": "accent"}, {"code": "4 deploy", "state": ["minutes, if rollback is routine", "a rollback exercised on a schedule"], "changed": [0, 1], "tone": "accent"}, {"code": "5 runtime", "state": ["minutes, then it recurs", "a bound on every pool and queue"], "changed": [0, 1], "tone": "warn"}, {"code": "6 migrations", "state": ["HOURS, and not by rolling back code", "expand-and-contract, always"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-16_5-01-0"},

    { t: "p", text: "These run in deploy order, and the recovery cost rises sharply along it. **The first three are cheap to recover and cheap to prevent; the last is the one where a mistake is not recoverable by rolling back code.**" },

    { t: "table",
      head: ["Stage", "Fails as", "Recovery cost", "The prevention most codebases lack"],
      rows: [
        ["**1 Dependencies**", "A build that worked yesterday does not today", "Minutes — if the lock file is complete", "A lock file with hashes, and a private index mirror"],
        ["**2 Build**", "The image cannot be rebuilt identically", "Minutes to hours", "Immutable digests, and keeping the image rather than rebuilding it"],
        ["**3 Configuration**", "The app starts and behaves wrongly", "Minutes", "**Validate at start-up and fail fast, rather than at first use**"],
        ["**4 Deploy**", "The new version is broken", "Minutes — if rollback is routine", "A rollback that is tested as often as the deploy"],
        ["**5 Runtime**", "Memory, descriptors, connections, disk", "Minutes, then it recurs", "A bound on every pool, queue and cache"],
        ["**6 Data / migrations**", "The schema no longer matches the code", "**Hours, and not by rolling back code**", "Expand-and-contract, so no deploy needs a matching schema"]
      ],
      caption: "**Stage 6 is the one that breaks the usual mental model.** Rolling back the application does not roll back a migration, so a deploy that changed the schema and then failed leaves old code against a new database — which is why the ordering discipline in section 05 exists." },

    { t: "h2", n: "02", text: "Stages 1 and 2: dependencies and build", id: "deps-build" },

    {"kind": "flow", "title": "A tag can be moved; a digest cannot", "caption": "**This is the mechanism behind a whole class of incident: the team performs the correct rollback, observes no improvement, and reasonably concludes the problem is elsewhere.** The release moved the tag, so redeploying that tag deploys the broken image again — an action that looks like a fix and is a no-op. Referencing the digest makes the rollback deterministic. **And the second failure in this chain is somebody else's retention policy:** the recovery path depends on an artifact that a registry default may have deleted.", "cols": 3, "nodes": [{"id": "r", "label": "The release pushes app:prod", "sub": "the tag now points at the new build", "tone": "accent"}, {"id": "b", "label": "The deploy is broken", "sub": "errors at 30%", "tone": "crit"}, {"id": "u", "label": "Rollback: set image app=app:prod", "sub": "the correct action", "tone": "warn"}, {"id": "n", "label": "It redeploys the SAME image", "sub": "a no-op that looks like a fix", "tone": "crit"}, {"id": "d", "label": "Deploy by digest instead", "sub": "sha256:9f2a... cannot be moved", "tone": "good"}, {"id": "k", "label": "And retain images past the rollback window", "sub": "a recovery path has dependencies too", "tone": "violet"}], "edges": [["r", "b"], ["b", "u"], ["u", "n"], ["n", "d"], ["d", "k"]], "t": "diagram", "id": "dg-16_5-02-1"},

    { t: "p", text: "A rebuild is a recovery mechanism only if it produces the same thing. **An unpinned build is not a recovery path, it is a new release performed under pressure** — which is the worst possible moment to discover that a transitive dependency published a version this morning." },

    { t: "code", lang: "bash", title: "What makes a rebuild a recovery rather than a new version",
      code: `# 1. A LOCK FILE WITH HASHES. Pinning versions is not enough: a version can
#    be re-uploaded, and a transitive dependency can resolve differently.
uv lock                       # or: pip-compile --generate-hashes
uv sync --frozen              # fails if the lock does not match the manifest
pip install --require-hashes -r requirements.txt

# 2. KEEP THE IMAGE, DO NOT REBUILD IT. The fastest recovery is the artifact
#    you already have, referenced by DIGEST rather than by tag.
#    A tag is a mutable pointer; a digest is the image.
docker pull app@sha256:9f2a...        # exactly what ran in production
#    In the manifest, never "app:latest", rarely "app:v2.3" -- the digest.

# 3. A PRIVATE MIRROR, so an upstream outage or a yanked package is not an
#    outage for you. This is the stage-1 prevention teams skip until the
#    first time PyPI is unreachable during an incident.
pip install --index-url https://artifacts.internal/simple/ \\
            --trusted-host artifacts.internal

# 4. AND THE TEST THAT PROVES IT: build twice, compare.
docker build -t a . && docker build -t b .
[ "$(docker inspect -f '{{.RootFS.Layers}}' a)" = \\
  "$(docker inspect -f '{{.RootFS.Layers}}' b)" ] \\
  && echo reproducible || echo "NOT reproducible -- the rebuild is a new build"`,
      caption: "**Referencing images by digest rather than by tag is the single highest-value change here.** A tag can be moved, so \"roll back to v2.2\" can deploy something other than what v2.2 was; a digest cannot, which makes the rollback deterministic and the recovery a lookup rather than a build." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**1 Dependencies**", "Lock file with hashes; a private index mirror; a dependency-review gate", "A scheduled build of the current lock file, so drift is found before an incident", "Pin to the mirror when upstream is unavailable", "Rebuild from the lock — **minutes, and identical**", "`uv sync --frozen` succeeds; the hash check passes"],
        ["**2 Build**", "Reference images by digest; retain images at least as long as your rollback window", "Compare a rebuild's layers against the retained image", "Deploy the retained image rather than building during an incident", "**Pull the digest — seconds**, and only rebuild if it is gone", "The running digest matches the one the manifest declares"]
      ],
      caption: "**The detection in stage 1 is the cheap habit that prevents the incident entirely:** a nightly build of the existing lock file fails on the day an index becomes unreachable or a package is yanked, which is weeks before you need that build to recover something." },

    { t: "h2", n: "03", text: "Stage 3: configuration, which fails quietly by design", id: "config" },

    {"kind": "flow", "title": "Validating at import turns a bad config into a failed rollout", "caption": "**A value checked at first use means the deploy succeeded, the probe passed and the rollout completed before anything is wrong** — by which time the previous version may be gone. A process that refuses to start is never marked ready, so the orchestrator keeps the old pods and the bad configuration never takes traffic: the failure heals itself. **And `extra=\"forbid\"` is the line that catches the characteristic configuration failure**, which is not a missing value but a mistyped name silently falling back to a default nobody chose.", "cols": 3, "nodes": [{"id": "t", "label": "DATBASE_URL - a typo", "sub": "or a value out of range", "tone": "crit"}, {"id": "i", "label": "Ignored, and the default is used", "sub": "without extra='forbid'", "tone": "crit"}, {"id": "l", "label": "Checked at first use", "sub": "rollout already complete", "tone": "warn"}, {"id": "f", "label": "Checked at import instead", "sub": "the process refuses to start", "tone": "good"}, {"id": "o", "label": "Never marked ready, old pods kept", "sub": "the rollout stops itself", "tone": "good"}, {"id": "h", "label": "And report the config hash in /healthz", "sub": "so a wrong value is visible outside", "tone": "violet"}], "edges": [["t", "i"], ["i", "l"], ["l", "f"], ["f", "o"], ["o", "h"]], "t": "diagram", "id": "dg-16_5-03-2"},

    { t: "p", text: "Configuration is the stage that most often produces a running, healthy, wrong application. **The failure is not that a value is missing — that is easy. It is that a value is present, parses, and is not what was intended.**" },

    { t: "code", lang: "python", title: "Failing at start-up instead of at first use",
      code: `from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="forbid")
    #                                              ^^^^^^^^^^^^^^^^^^
    # extra="forbid" catches the TYPO. A mistyped DATBASE_URL is otherwise
    # silently ignored and the default is used -- which is the quiet failure.

    environment: str = Field(pattern="^(dev|staging|prod)$")
    database_url: PostgresDsn
    model_version: str
    max_workers: int = Field(ge=1, le=64)
    request_timeout_s: float = Field(gt=0, le=60)

    @field_validator("database_url")
    @classmethod
    def not_a_dev_database_in_prod(cls, v, info):
        if info.data.get("environment") == "prod" and "localhost" in str(v):
            raise ValueError("prod cannot point at localhost")
        return v

settings = Settings()        # <- AT IMPORT. The process refuses to start.

# WHY AT START-UP RATHER THAN AT FIRST USE: a missing or wrong value found
# at first use means the deploy succeeded, the health check passed, the
# rollout completed -- and the failure appears on the first real request,
# by which time the previous version is gone.
#
# FAILING AT IMPORT MEANS THE ROLLOUT STOPS ITSELF. A container that will
# not start is never marked ready, so the orchestrator keeps the old pods
# and the bad configuration never takes traffic.

# AND REPORT WHAT IS LOADED, so a wrong value is visible from outside:
@app.get("/healthz")
def healthz():
    return {"status": "ok", "environment": settings.environment,
            "model_version": settings.model_version,
            "config_hash": settings_hash(settings)}      # non-secret fields`,
      caption: "**`extra=\"forbid\"` is the line that catches the typo**, and the typo is the characteristic configuration failure — a mistyped variable name is otherwise ignored in favour of a default, so the application runs with a value nobody chose. Validating at import turns a wrong configuration into a failed rollout, which is a self-healing outcome." },

    { t: "callout", kind: "insight", title: "Configuration and code roll back separately", body: [
      { t: "p", text: "A deploy usually changes both, so when it fails there are two candidates and rolling back the image fixes only one of them. **A configuration change applied to the previous image is not the previous system** — and it is the combination that is untested." },
      { t: "p", text: "**The practical rule is to version configuration with the code and roll back together.** Where configuration genuinely must change independently — a feature flag, a rate limit — keep it in a system designed for that, with its own audit trail and its own instant revert, rather than in the environment of a deployment that cannot be partially undone." }
    ]},

    { t: "h2", n: "04", text: "Stages 4 and 5: deploy and runtime", id: "deploy-runtime" },

    {"kind": "trace", "title": "The arithmetic that turns a successful autoscale into an outage", "caption": "**Each process has its own pool and knows nothing about the others, so the limit that matters is the product.** Four replicas at fifteen connections is comfortable against a hundred; scaling to eight is not, and the symptom is database errors with no code fault anywhere — affecting every service sharing that database, not only yours. **All three runtime bounds default to effectively unlimited**, which is why runtime failures are almost all one shape: a resource nobody capped.", "left": "configuration", "codeW": 200, "vars": ["total connections", "against max_connections 100"], "steps": [{"code": "pool 5 + overflow 5, x4 replicas", "state": ["40", "comfortable"], "tone": "good"}, {"code": "pool 10 + overflow 5, x4", "state": ["60", "fine, with headroom"], "changed": [0, 1], "tone": "good"}, {"code": "pool 10 + overflow 5, x8", "state": ["120", "OVER - a scale-up is an outage"], "changed": [0, 1], "tone": "crit"}, {"code": "pool 20 + overflow 10, x8", "state": ["240", "far over"], "changed": [0, 1], "tone": "crit"}, {"code": "safe ceiling at 8 replicas", "state": ["(100 - 10) / 8 = 11 each", "leave room for migrations"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-16_5-04-3"},

    { t: "p", text: "Deploy is the best-understood stage in this list and still the most common source of incidents, for one reason: **rollback is treated as an emergency procedure rather than as a routine one.** A path exercised only during incidents is a path that does not work during incidents." },

    { t: "code", lang: "python", title: "The three runtime bounds, and what happens without each",
      code: `# RUNTIME FAILURES ARE ALMOST ALL ONE SHAPE: an unbounded resource.
# Each of these has a default that is effectively "no limit".

# 1. THE CONNECTION POOL. Unbounded, and a traffic spike opens connections
#    until the DATABASE refuses them -- which takes down every other service
#    sharing that database, not just yours.
engine = create_engine(
    DSN,
    pool_size=10, max_overflow=5,        # 15 maximum, from THIS process
    pool_timeout=5,                      # fail fast rather than queue forever
    pool_pre_ping=True,                  # survive a database restart
    pool_recycle=1800,
)
#    AND THE ARITHMETIC NOBODY DOES: pool_size x replicas must be below the
#    server's max_connections, with room for migrations and admin sessions.
#    4 replicas x 15 = 60. If max_connections is 100, a scale to 8 replicas
#    is an outage.

# 2. THE QUEUE. Unbounded, and demand above capacity makes latency grow
#    without limit -- clients time out, retry, and the queue grows faster.
queue = asyncio.Queue(maxsize=1000)      # put() now applies backpressure
try:
    queue.put_nowait(job)
except asyncio.QueueFull:
    raise HTTPException(503, headers={"Retry-After": "5"})   # shed, honestly

# 3. THE CACHE. Unbounded, and it is a memory leak with a helpful name.
cache = cachetools.TTLCache(maxsize=10_000, ttl=300)         # both bounds

# AND THE RECOVERY THAT IS NOT A FIX: restarting the process. It clears the
# leak, serves traffic, and guarantees a recurrence -- so the restart buys
# the time to apply the bound, and the incident is not closed until it is.`,
      caption: "**`pool_size × replicas` against the server's `max_connections` is the arithmetic that turns a successful autoscale into an outage**, and almost nobody does it until the first time a scale-up exhausts the database for every service sharing it. All three bounds default to effectively unlimited." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**4 Deploy**", "Rolling or blue-green with a readiness probe that means something; **rollback exercised on a schedule**", "Error rate and latency per version during the rollout; a canary before full traffic", "Halt the rollout automatically on the canary's error rate", "**Roll back to the previous digest — seconds**", "The running digest and config hash match the intended release"],
        ["**5 Runtime**", "Bound every pool, queue and cache; a memory limit that kills rather than swaps; graceful SIGTERM handling", "RSS trend, pool saturation, queue depth, descriptor count — not just CPU", "Shed load with 503 and `Retry-After`; circuit-break a failing dependency", "Restart to clear state — **and the incident stays open until the bound is added**", "The resource curve is flat under sustained load, not merely lower"]
      ],
      caption: "**\"Rollback exercised on a schedule\" is the entry that matters most in this table.** A deploy pipeline that rolls forward twenty times a day and backwards twice a year has an untested recovery path, and the first real use of it is during an incident with an audience." },

    { t: "h2", n: "05", text: "Stage 6: migrations, where rolling back code is not enough", id: "migrations" },

    { t: "p", text: "Every other stage recovers by returning to the previous artifact. **Stage 6 does not: a migration has already changed the database, and the previous image expects the previous schema.** The discipline that removes this is expand-and-contract, and it is the one thing in this lesson that must be designed rather than configured." },

    { t: "code", lang: "python", title: "Expand and contract: four deploys, every one of them reversible",
      code: `# THE GOAL: at no point does any deployed version require a schema that is
# not already there. Renaming user.name to user.full_name, safely.

# DEPLOY 1 -- EXPAND. Add the new column, nullable, no backfill yet.
def upgrade():
    op.add_column("users", sa.Column("full_name", sa.String(), nullable=True))
# Old code ignores it. Rollback is trivial: the column is unused.

# DEPLOY 2 -- WRITE BOTH, READ OLD. The application populates both columns.
def save(user):
    user.name = value
    user.full_name = value          # dual write
# Rollback to deploy 1's code is safe: full_name just stops being written.

# -- BACKFILL, in batches, outside a deploy and interruptible:
#    UPDATE users SET full_name = name
#     WHERE full_name IS NULL AND id BETWEEN :lo AND :hi
#    A backfill inside a migration locks the table and cannot be resumed.

# DEPLOY 3 -- READ NEW, STILL WRITE BOTH. Reads switch over.
# Rollback to deploy 2 is safe: both columns are still current.

# DEPLOY 4 -- CONTRACT. Stop writing the old column, then drop it in a
# LATER deploy, once the previous version is no longer deployable.
def upgrade():
    op.drop_column("users", "name")

# WHAT THIS BUYS: at every single point, the previous image works against
# the current schema. Rollback is a code rollback, which is seconds.
#
# THE ALTERNATIVE -- rename in one migration -- means the moment it applies,
# the previous image is broken. Rolling back the code does not roll back the
# schema, and rolling back the schema needs a down-migration that has
# probably never been run and may not be possible without data loss.`,
      caption: "**The property worth stating precisely: at no point does any deployed version require a schema that is not already there.** That is what makes every one of the four deploys reversible by a code rollback alone — and it is why the backfill lives outside the migration, where it can be batched and resumed." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**6 Migrations**", "**Expand-and-contract, always**; backfills outside migrations, batched and resumable; a CI check that rejects a destructive operation in the same deploy as a code change", "A migration-duration alarm; lock-wait monitoring during the apply", "Statement and lock timeouts on the migration session, so it fails rather than blocking every writer", "**Point-in-time recovery of the database — hours.** A code rollback does not undo a migration", "The previous image still starts and serves against the current schema"]
      ],
      caption: "**The verification is the test worth automating:** start the previous image against the migrated schema in CI and assert it serves. If it cannot, the migration has removed your ability to roll back, and that is worth knowing before the deploy rather than after it." },

    { t: "ladder",
      title: "A deploy pipeline you can retreat through",
      rungs: [
        { level: "bad", label: "Build, migrate, deploy",
          why: "**Three irreversible things in one step.** The build is not reproducible, so a rebuild is a new version; the migration has already changed the schema when the deploy fails; and the only recovery is forward, under pressure, with no known-good state to return to.",
          code: `# .ci/deploy.sh
docker build -t app:latest .
docker push app:latest
alembic upgrade head
kubectl set image deploy/app app=app:latest` },
        { level: "ok", label: "Pinned build, digest deploy, migration separated",
          why: "**A rollback is now possible: the digest is known and the migration is its own step.** What is missing is any guarantee that the previous image still works against the new schema, so the rollback may not be available when it is needed.",
          code: `# .ci/deploy.sh
uv sync --frozen
DIGEST=$(docker build -q . | tee /dev/stderr)
docker push "$DIGEST"
alembic upgrade head                       # separate step, separate approval
kubectl set image deploy/app "app=$DIGEST" # by digest, not by tag
kubectl rollout status deploy/app --timeout=120s` },
        { level: "best", label: "Expand-and-contract, canary, and a rehearsed rollback",
          why: "**Every stage is now reversible, and the reversal is exercised rather than assumed.** The schema check proves the rollback exists before the deploy needs it, the canary limits the blast radius, and the scheduled rollback drill keeps the path working.",
          code: `# .ci/deploy.sh
uv sync --frozen
DIGEST=$(docker build -q .)
docker push "$DIGEST"

# 1. the migration must be expand-only; CI rejects a drop in this deploy
alembic upgrade head

# 2. THE CHECK THAT PROVES ROLLBACK EXISTS: the PREVIOUS image must still
#    serve against the NEW schema. If this fails, stop -- the rollback is
#    already gone and the deploy is one-way.
PREV=$(kubectl get deploy/app -o jsonpath='{...image}')
./ci/smoke.sh "$PREV" || { echo "previous image broken by migration"; exit 1; }

# 3. canary 5%, watch for 5 minutes, promote or halt automatically
kubectl apply -f canary.yaml && ./ci/watch-canary.sh --pct 5 --minutes 5

# 4. full rollout by digest
kubectl set image deploy/app "app=$DIGEST"
kubectl rollout status deploy/app --timeout=120s

# rollback is one command, and it runs on a schedule in staging:
#   kubectl rollout undo deploy/app        -- last drill 2026-07-09, 34s` }
      ] },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "The deploy you cannot retreat from",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "A FastAPI service that serves a model was deployed at 14:10. By 14:25 error rates were at 30% and the team rolled back the image. The errors continued. Work out why the rollback did not help, then rewrite the release so the same change is reversible." },
        { t: "code", lang: "text", numbered: false, title: "what changed in the release", code: `
1. requirements.txt: pydantic unpinned, resolved to 2.9 in this build
2. a migration renamed predictions.score to predictions.confidence
3. a new env var MODEL_VERSION=v42 added to the deployment manifest
4. the image was pushed and deployed as app:prod (the same tag as before)
5. pool_size raised from 5 to 20, and replicas from 4 to 8
` },
        { t: "p", text: "Facts: the database's `max_connections` is 100. The previous image expects a column called `score`. `MODEL_VERSION` is read with `os.environ.get(\"MODEL_VERSION\", \"v41\")`. The rollback was `kubectl set image deploy/app app=app:prod`." }
      ],
      requirements: [
        "The reason the rollback changed nothing, stated precisely",
        "Three distinct failures in this release, each located to a stage from section 01",
        "The connection arithmetic, worked through",
        "A rewritten release sequence in which every step is reversible",
        "One CI check that would have blocked this release"
      ],
      hint: "The rollback command is the first thing to read. There are two independent reasons it could not work, and one of them is in the command itself.",
      solution: {
        lang: "text",
        title: "Solution",
        code: `WHY THE ROLLBACK CHANGED NOTHING -- two independent reasons.

  1. THE TAG. "app:prod" is a mutable pointer and the release had just
     moved it, so "set image app=app:prod" redeployed the SAME broken
     image. The rollback was a no-op that looked like an action.
     Deploying by digest would have made this impossible.

  2. THE MIGRATION. Even with the right image, the previous code reads
     predictions.score and the column is now predictions.confidence.
     Rolling back the code does not roll back the schema, so the old
     image would have failed too -- differently, and just as completely.

THREE FAILURES, BY STAGE.

  STAGE 1, dependencies: pydantic unpinned. The build resolved 2.9 and the
    previous build did not, so the "rollback" build is not the previous
    build either. A lock file with hashes makes a rebuild a recovery.

  STAGE 6, migrations: a rename in one migration. It is destructive by
    construction -- the moment it applies, the previous image is broken.
    Expand-and-contract is the only form of this change that stays
    reversible.

  STAGE 5, runtime: pool_size 20 x 8 replicas = 160 connections against a
    max_connections of 100. The database starts refusing connections, which
    affects every service sharing it -- and this alone would explain a 30%
    error rate with no code fault at all.

  (STAGE 3 is a near miss: MODEL_VERSION has a default of v41, so a missing
   value silently serves the wrong model rather than failing. It did not
   cause this incident and it is the next one.)

THE ARITHMETIC.

  pool_size(20) + max_overflow(default 10) = 30 per process
  30 x 8 replicas                          = 240 potential
  even at pool_size alone: 20 x 8          = 160
  max_connections                          = 100
  room needed for migrations and admin     = ~10
  SAFE CEILING per replica at 8 replicas   = (100 - 10) / 8 = 11
  So pool_size 5 + overflow 5 was already near the limit at 8 replicas,
  and 20 was never viable at any replica count above 4.

A REVERSIBLE RELEASE SEQUENCE.

  R1  lock the dependencies: uv lock; uv sync --frozen. No behaviour change.
  R2  expand: add "confidence", nullable. Old code ignores it.
  R3  deploy code that writes BOTH score and confidence, reads score.
  R4  backfill confidence in batches, outside any migration, resumable.
  R5  deploy code that reads confidence, still writes both.
  R6  pool and replica change, ALONE, with the arithmetic in the PR:
        pool_size 10, max_overflow 5, replicas 6 -> 90 < 100. Watch.
  R7  stop writing score. R8 (a later release) drop the column.
  Every step: deploy by DIGEST, and "kubectl rollout undo" works at each.

THE CI CHECK THAT WOULD HAVE BLOCKED IT.

  Start the PREVIOUS image against the migrated schema and run the smoke
  test. It fails at R-as-released, because the previous image reads a
  column that no longer exists -- which is exactly the statement "this
  release has removed your ability to roll back", made before the deploy
  instead of during the incident.

  Second-best: a migration linter that rejects a drop or rename in the same
  release as an application change.`,
        notes: [
          { t: "p", text: "**The mutable tag is the detail that makes this incident instructive.** The team performed the correct action, observed no improvement, and reasonably concluded the problem was elsewhere — when in fact the rollback had deployed the broken image again. Deploying by digest removes an entire class of incident-time confusion." },
          { t: "p", text: "**And note that three independent faults shipped in one release.** The deeper fix is not any one of them: it is that a release bundling a dependency bump, a destructive migration, a configuration change and a capacity change has no reversible unit. Each of R1 to R7 is separately reversible, which is what the pipeline is for." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's rollback had worked in every drill. During a real incident it failed: the deployment manifest referenced `app:prod`, and the registry's retention policy had removed the previous build two days earlier because it was no longer tagged." },
      { t: "p", text: "**The rollback path depended on an artifact nobody had decided to keep.** Retention was set by a default on the registry, the drills had always run within a day of the deploy, and the one time the gap was longer the artifact was gone." },
      { t: "p", text: "**Two changes followed, and neither is about the deploy script:** retain images for at least as long as the longest plausible rollback window — a quarter, not two days — and reference them by digest so the retention policy cannot quietly remove the one thing the rollback needs." },
      { t: "p", text: "**The general lesson is that a recovery path has its own dependencies**, and they need the same inventory treatment as the system's: the image, the snapshot, the lock file and the credential all have retention policies somebody else set." }
    ]}
  ],

  takeaways: [
    "**An unpinned build is not a recovery path.** Without a lock file and hashes, a rebuild is a new release performed under pressure.",
    "**Reference images by digest, never by a mutable tag.** \"Roll back to prod\" can redeploy the broken image, and it looks like an action.",
    "**Keep images at least as long as your longest plausible rollback window** — a recovery path has its own dependencies, with retention policies somebody else set.",
    "**A nightly build of the existing lock file** finds a yanked package or an unreachable index weeks before you need that build to recover something.",
    "**Validate configuration at import and fail fast.** A container that will not start never takes traffic, so a bad configuration stops its own rollout.",
    "**`extra=\"forbid\"` catches the typo**, which is the characteristic configuration failure — a mistyped variable is otherwise ignored in favour of a default.",
    "**Configuration and code roll back separately**, so version them together; keep genuinely independent switches in a flag system with its own instant revert.",
    "**Rollback must be exercised on a schedule.** A path used twenty times a day forward and twice a year backward is an untested recovery path.",
    "**Runtime failures are almost all one shape: an unbounded resource.** Bound every pool, queue and cache — all three default to effectively unlimited.",
    "**Do the arithmetic: `pool_size × replicas` against `max_connections`**, with headroom for migrations and admin sessions. A successful autoscale is a common outage.",
    "**A restart clears a leak and guarantees a recurrence.** It buys time to add the bound; the incident is not closed until the bound exists.",
    "**Rolling back code does not roll back a migration.** This is the one stage where the usual recovery model does not apply.",
    "**Expand-and-contract, so no deployed version ever requires a schema that is not already there** — which keeps every step reversible by a code rollback alone.",
    "**Backfill outside the migration**, batched and resumable. A backfill inside one locks the table and cannot be resumed.",
    "**Assert in CI that the previous image still serves against the migrated schema.** If it cannot, the release has already removed your rollback."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A deploy fails and the team runs `kubectl set image deploy/app app=app:prod`. Why might this change nothing?",
        options: [
          "Because the rollout needs a restart to take effect",
          "Because `app:prod` is a mutable tag that the release just moved, so this redeploys the same broken image",
          "Because the image cache has to be cleared first",
          "Because the readiness probe fails on the old image"
        ],
        answer: 1,
        why: "A tag is a pointer and the release moved it, so the rollback deploys exactly what is already running — an action that looks like a fix and is a no-op. Deploying by digest removes this entire class of incident-time confusion, because a digest cannot be moved."
      },
      {
        stem: "A release renames a column in one migration and then fails. Why does rolling back the image not recover the service?",
        options: [
          "It does — the previous image is schema-agnostic",
          "Because the previous image expects the old column name, and a code rollback does not roll back a migration",
          "Because the migration has to complete before a rollback is allowed",
          "Because connection pools cache the old schema"
        ],
        answer: 1,
        why: "This is the one stage where the usual recovery model fails: the schema has already changed and the previous code does not match it. Expand-and-contract exists precisely so that no deployed version ever requires a schema that is not already present — which keeps every step reversible by a code rollback alone."
      },
      {
        stem: "A service runs 8 replicas with `pool_size=20` against a database whose `max_connections` is 100. What happens?",
        options: [
          "Nothing — pools are lazy, so connections are only opened as needed",
          "Under load the pools reach 160 connections, the database refuses them, and every service sharing that database is affected",
          "SQLAlchemy caps the total across replicas automatically",
          "The pool blocks until a connection is free, so throughput falls but nothing errors"
        ],
        answer: 1,
        why: "Each process has its own pool and knows nothing about the others, so the limit that matters is the product. With headroom needed for migrations and admin sessions the safe ceiling here is about 11 per replica — which means a scale-up is an outage, and it presents as database errors with no code fault at all."
      },
      {
        stem: "Where should configuration be validated?",
        options: [
          "At first use, so start-up stays fast",
          "At import, so a bad configuration fails the container's start and never takes traffic",
          "In a scheduled job that checks the environment",
          "In the health check, which the orchestrator already calls"
        ],
        answer: 1,
        why: "Validating at first use means the deploy succeeded, the probe passed and the rollout completed before the failure appears — by which time the previous version may be gone. A container that refuses to start is never marked ready, so the orchestrator keeps the old pods and the bad configuration stops its own rollout."
      },
      {
        stem: "Which CI check proves that a release is still reversible?",
        options: [
          "The test suite passes against the new schema",
          "The migration applies and rolls back cleanly in a scratch database",
          "The previous image starts and serves successfully against the migrated schema",
          "The image builds reproducibly twice in a row"
        ],
        answer: 2,
        why: "A down-migration that works in a scratch database says nothing about whether the previous application version can run against the new schema, which is what a rollback actually requires. Starting the previous image against the migrated schema answers exactly that question — and answers it before the deploy rather than during the incident."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you make a Python deployment recoverable?",
        strong: "Make every stage reversible and exercise the reversal. Dependencies locked with hashes and mirrored, so a rebuild is a recovery rather than a new release. Images referenced by digest and retained for longer than the rollback window, because a tag can be moved and a retention policy can delete the artifact the rollback needs. Configuration validated at import so a bad value fails the rollout instead of the first request. Rollback exercised on a schedule, not only during incidents. Every pool, queue and cache bounded, with the pool arithmetic done against max_connections. And migrations expand-and-contract, with a CI check that the previous image still serves against the new schema.",
        answer: [
          { t: "p", text: "Organising the answer by stage, with the reversal as the theme, is what makes it a system rather than a checklist." },
          { t: "p", text: "The digest-versus-tag point is the strongest single specific, because it is a real incident mechanism most people have met without diagnosing." },
          { t: "p", text: "Mentioning that the recovery path has its own dependencies — image retention, the lock file, the credential — is the senior observation here." }
        ]
      },
      {
        level: "advanced",
        q: "Why can rolling back a deploy fail to fix an incident?",
        strong: "Three reasons, and they are independent. The tag was mutable, so the rollback redeployed the same image. The release included a migration, so the previous code no longer matches the schema. Or the release changed configuration or capacity rather than code — raising a pool size or a replica count — so rolling back the image leaves the actual cause in place. The first is fixed by digests, the second by expand-and-contract plus a CI check, and the third by not bundling a capacity change with a code change in one release.",
        answer: [
          { t: "p", text: "Giving three independent mechanisms rather than one shows this has been diagnosed more than once." },
          { t: "p", text: "The configuration-and-capacity case is the one most candidates miss, and it is extremely common." },
          { t: "p", text: "Pairing each cause with its specific prevention is what turns the answer from a war story into a design position." }
        ]
      },
      {
        level: "expert",
        q: "Walk me through renaming a column with no downtime and a working rollback at every point.",
        strong: "Expand and contract, four deploys. Add the new column nullable — old code ignores it, so rollback is trivial. Deploy code that writes both and reads the old one. Backfill in batches outside the migration, so it can be resumed and does not lock the table. Deploy code that reads the new column and still writes both. Then stop writing the old one, and drop it in a later release once the previous version is no longer deployable. The invariant is that at no point does any deployed version require a schema that is not already there, which keeps every step reversible by a code rollback alone.",
        answer: [
          { t: "p", text: "Stating the invariant explicitly is what distinguishes this from reciting the four steps." },
          { t: "p", text: "Putting the backfill outside the migration, batched and resumable, is the operational detail that matters most at scale." },
          { t: "p", text: "Dropping the column in a later release — once the previous version is no longer deployable — is the step people compress, and compressing it is what removes the rollback." }
        ]
      }
    ]
  }
});
