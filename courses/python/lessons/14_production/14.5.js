/* ============================================================================
   LESSON 14.5 — Packaging Python into Docker
   ========================================================================= */
EC.receiveLesson({
  id: "14.5",

  lede: "A container image is a build artefact you ship, run and are responsible for the security of. **Most Python Dockerfiles are three times larger than they need to be, rebuild everything on a one-line change, run as root, and kill in-flight requests on every deploy** — and all four are fixed by understanding one thing: what a layer is.",

  objectives: [
    "Order a Dockerfile so a code change does not reinstall dependencies",
    "Use a multi-stage build to leave compilers out of the runtime image",
    "Run as a non-root user, and explain what that actually prevents",
    "Handle SIGTERM so a deploy does not drop requests",
    "Choose a base image on real trade-offs rather than size alone"
  ],

  prerequisites: ["7.6", "14.2"],

  blocks: [

    { t: "h2", n: "01", text: "Layers and caching", id: "layers" },

    {"kind": "layers", "title": "Docker layers, and what invalidates them", "caption": "Each instruction is a cached layer; a change invalidates it and everything after it. Copy the dependency manifest and install before copying the source, so a code change does not reinstall every package.", "items": [{"label": "COPY . .   + CMD", "sub": "changes every commit — keep it last", "tone": "crit"}, {"label": "RUN pip install / uv sync", "sub": "changes when the lock file changes", "tone": "warn"}, {"label": "COPY pyproject.toml uv.lock", "sub": "just the manifest", "tone": "accent"}, {"label": "FROM python:3.12-slim", "sub": "changes rarely — the base", "tone": "good"}], "t": "diagram", "id": "dg-14_5-01-0"},

    { t: "viz",
      title: "Why instruction order decides your build time",
      caption: "Each instruction is a layer, cached by the hash of its inputs. Once one layer is invalidated, every layer after it rebuilds — so anything that changes often must come after anything that is expensive.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Two Dockerfile orderings compared by which layers rebuild after a code change">
  <text x="24" y="30" class="s-label" style="fill:var(--crit)">COPY . . before install</text>
  <g class="s-sub">
    <rect x="24" y="44" width="390" height="28" rx="5" style="fill:var(--good);opacity:.22"/>
    <text x="36" y="63">FROM python:3.12-slim          cached</text>
    <rect x="24" y="78" width="390" height="28" rx="5" style="fill:var(--crit);opacity:.28"/>
    <text x="36" y="97">COPY . .                       INVALIDATED</text>
    <rect x="24" y="112" width="390" height="28" rx="5" style="fill:var(--crit);opacity:.28"/>
    <text x="36" y="131">RUN pip install -r req.txt      rebuilds — 90s</text>
    <rect x="24" y="146" width="390" height="28" rx="5" style="fill:var(--crit);opacity:.28"/>
    <text x="36" y="165">CMD [...]                       rebuilds</text>
  </g>
  <text x="24" y="204" class="s-sub" style="fill:var(--crit)">Every code change: ~95s</text>

  <text x="486" y="30" class="s-label" style="fill:var(--good)">dependencies first</text>
  <g class="s-sub">
    <rect x="486" y="44" width="390" height="28" rx="5" style="fill:var(--good);opacity:.22"/>
    <text x="498" y="63">FROM python:3.12-slim          cached</text>
    <rect x="486" y="78" width="390" height="28" rx="5" style="fill:var(--good);opacity:.22"/>
    <text x="498" y="97">COPY pyproject.toml uv.lock    cached</text>
    <rect x="486" y="112" width="390" height="28" rx="5" style="fill:var(--good);opacity:.22"/>
    <text x="498" y="131">RUN uv sync --frozen           CACHED — 0s</text>
    <rect x="486" y="146" width="390" height="28" rx="5" style="fill:var(--crit);opacity:.28"/>
    <text x="498" y="165">COPY src/ ./src/               rebuilds</text>
  </g>
  <text x="486" y="204" class="s-sub" style="fill:var(--good)">Every code change: ~4s</text>

  <text x="24" y="256" class="s-sub" style="fill:var(--ink-3)">The rule: least-frequently-changed first. Dependencies change weekly; code changes hourly.</text>
  <text x="24" y="280" class="s-sub" style="fill:var(--ink-3)">Copy the lockfile, install, THEN copy the source.</text>
</svg>`
    },

    { t: "code", lang: "bash", title: "the Dockerfile most teams start with", code: `
FROM python:3.12                          # 1.02 GB before you add anything

WORKDIR /app
COPY . .                                  # invalidates everything below
RUN pip install -r requirements.txt       # 90s on every code change
RUN apt-get update && apt-get install -y gcc g++ make   # in the RUNTIME image

EXPOSE 8000
CMD python -m uvicorn app.main:app --host 0.0.0.0

# Six problems:
#   1. python:3.12 is 1GB; slim is 130MB and does the same job
#   2. COPY . . before install destroys the dependency cache
#   3. compilers shipped to production -- attack surface, 400MB
#   4. no .dockerignore, so .git, .venv and tests are in the image
#   5. runs as ROOT
#   6. CMD in shell form: uvicorn is not PID 1, so it never gets SIGTERM
`,
      hl: [4, 6, 9],
      caption: "**Problem six is the one nobody sees.** Shell-form `CMD` runs `/bin/sh -c ...`, so the shell is PID 1 and does not forward signals — every deploy kills in-flight requests."
    },

    { t: "h2", n: "02", text: "A Dockerfile worth copying", id: "dockerfile" },

    { t: "code", lang: "bash", title: "multi-stage, cached, non-root", code: `
# ---------- builder: has compilers, does not ship -------------------
FROM python:3.12-slim AS builder

# Build-only dependencies. This layer never reaches the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \\
        gcc g++ libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.4 /uv /bin/uv

WORKDIR /app

# THE CACHE BOUNDARY. Only the lockfile is copied, so this layer is
# reused until a dependency actually changes.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --frozen --no-install-project --no-dev

# The source comes AFTER, so a code change rebuilds only from here.
COPY src/ ./src/
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --frozen --no-dev


# ---------- runtime: no compilers, no build tools -------------------
FROM python:3.12-slim AS runtime

# Only the RUNTIME shared libraries, not the -dev headers.
RUN apt-get update && apt-get install -y --no-install-recommends \\
        libpq5 \\
    && rm -rf /var/lib/apt/lists/* \\
    && useradd --create-home --uid 1000 --shell /bin/false appuser

WORKDIR /app

# Copy the built virtualenv and the source. Nothing else comes across.
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appuser /app/src /app/src

ENV PATH="/app/.venv/bin:\$PATH" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

# EXEC form. uvicorn becomes PID 1 and receives SIGTERM directly.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# 1.4GB -> 180MB, and a code change rebuilds in ~4 seconds.
`,
      hl: [15, 20, 32, 48],
      caption: "**`PYTHONUNBUFFERED=1` is not optional.** Without it stdout is block-buffered when not a TTY, so logs appear in 4KB chunks — and a crash loses whatever was in the buffer, which is usually the message explaining the crash."
    },

    { t: "code", lang: "bash", title: ".dockerignore — as important as the Dockerfile", code: `
# Everything COPY . . would otherwise pull in. Without this file, the
# build context includes .git (often hundreds of MB) and any local
# .env -- which then sits in an image layer, readable by anyone who
# can pull it.

.git
.venv
venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/
htmlcov/
.coverage

# Secrets. The critical entries.
.env
.env.*
!.env.example
*.pem
*.key

# Not needed at runtime
tests/
docs/
*.md
!README.md
.github/
docker-compose*.yml
`,
      hl: [17, 18],
      caption: "**A secret in a layer cannot be removed by deleting it later.** Layers are immutable and additive — `RUN rm .env` adds a layer where the file is absent, and leaves the layer where it is present."
    },

    { t: "h2", n: "03", text: "Signals and shutdown", id: "signals" },

    { t: "ladder",
      title: "Making a deploy not drop requests",
      rungs: [
        { level: "bad", label: "Shell-form CMD",
          why: "`/bin/sh -c` becomes PID 1 and does not forward signals. Docker sends SIGTERM to the shell, which ignores it, waits ten seconds, then SIGKILLs everything — so every in-flight request dies on every deploy.",
          code: `CMD uvicorn app.main:app --host 0.0.0.0

# In the container:
#   PID 1  /bin/sh -c uvicorn app.main:app ...
#   PID 7  uvicorn ...        <- gets no signal` },
        { level: "ok", label: "Exec-form CMD",
          why: "uvicorn is PID 1 and receives SIGTERM directly, so it stops accepting connections and finishes what it is serving. The remaining gap is anything the application must do on the way out — draining a queue, closing a pool.",
          code: `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]

# PID 1  uvicorn ...          <- receives SIGTERM` },
        { level: "best", label: "Exec form plus an explicit shutdown path",
          why: "The application decides what \"finished\" means: stop accepting, drain in-flight work, close connections, then exit. The platform's grace period is a deadline you must fit inside, not a suggestion.",
          code: `@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await create_pool()
    app.state.pool = pool
    yield                                # <- SIGTERM lands here
    # Ordered shutdown. Uvicorn has already stopped accepting new
    # connections and is waiting for in-flight ones.
    await drain_background_tasks(timeout=20)
    await pool.close()
    logger.info("shutdown_complete")

app = FastAPI(lifespan=lifespan)

# And the deployment must allow time for it:
#   terminationGracePeriodSeconds: 45     # > the drain timeout
#   preStop: sleep 5                      # let the LB deregister first`,
          note: "**The `preStop: sleep 5` is the subtle part.** Kubernetes sends SIGTERM and removes the pod from endpoints concurrently, so without a pause the pod stops accepting while the load balancer is still sending it traffic." }
      ]
    },

    { t: "callout", kind: "trap", title: "Zombie processes and PID 1", body: [
      { t: "p", text: "PID 1 has a special duty in Unix: it reaps orphaned child processes. Most application servers do not implement that, so if your container spawns subprocesses, their zombies accumulate until the process table fills." },
      { t: "code", lang: "bash", title: "when you need an init", numbered: false, code: `
# Symptoms: "fork: Resource temporarily unavailable" after days of
# uptime, and a "ps" full of <defunct> entries.

# The fix -- a minimal init that reaps and forwards signals.
docker run --init myimage              # docker's built-in

# or in the image:
RUN apt-get install -y tini
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "app.main:app"]

# You need this only if your container spawns processes -- gunicorn
# with workers, a supervisor, anything calling subprocess. A single
# uvicorn process does not.`},
      { t: "p", text: "**Gunicorn is a partial exception**: it manages its own workers and reaps them properly, so it is a competent PID 1 for its own children — but not for grandchildren a worker spawns." }
    ]},

    { t: "h2", n: "04", text: "Choosing a base image", id: "base" },

    { t: "table",
      head: ["Base", "Size", "Trade-off"],
      rows: [
        ["`python:3.12`", "~1.0 GB", "Everything included. **Far more attack surface than you need**"],
        ["`python:3.12-slim`", "~130 MB", "**The default choice.** Debian, glibc, wheels just work"],
        ["`python:3.12-alpine`", "~50 MB", "musl libc: **many wheels do not exist**, so they compile from source"],
        ["`gcr.io/distroless/python3`", "~50 MB", "No shell, no package manager. **Secure and hard to debug**"],
        ["`ubuntu:24.04` + python", "~180 MB", "When you need specific system packages"]
      ],
      caption: "**Alpine is usually the wrong optimisation for Python.** manylinux wheels target glibc, so on musl pip builds from source — turning a 30-second install into fifteen minutes, and the resulting image is often *larger* once compilers are involved."
    },

    { t: "callout", kind: "insight", title: "What running as root actually risks", body: [
      { t: "p", text: "Containers are not a security boundary in the way a VM is. Root inside the container is root in the kernel's namespaces, so a container escape — a kernel bug, a misconfigured mount, a privileged flag — lands as root on the host." },
      { t: "code", lang: "bash", title: "the hardening that costs nothing", numbered: false, code: `
# In the image
RUN useradd --create-home --uid 1000 --shell /bin/false appuser
USER appuser

# In the deployment
securityContext:
  runAsNonRoot: true            # refuse to start if the image is root
  runAsUser: 1000
  readOnlyRootFilesystem: true  # writes only to declared volumes
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]               # no CAP_NET_RAW, no CAP_CHOWN, none

# readOnlyRootFilesystem needs somewhere to write:
volumeMounts:
  - name: tmp
    mountPath: /tmp`},
      { t: "p", text: "**`runAsNonRoot: true` is the check worth having**, because it fails the deployment rather than trusting that every image was built correctly. It catches the base image someone changed six months later." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a Dockerfile",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This image is 1.8GB, takes six minutes to build after any change, and every deploy shows a spike of 502s. Security scanning reports 140 vulnerabilities." },
        { t: "code", lang: "bash", numbered: false, title: "Dockerfile", code: `
FROM python:3.12

RUN apt-get update && apt-get install -y \\
    gcc g++ make git curl vim postgresql-client

WORKDIR /app
COPY . .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install pytest black mypy

ENV DATABASE_URL=postgresql://user:pass@db:5432/app
ENV SECRET_KEY=super-secret-key-123

RUN python manage.py collectstatic

EXPOSE 8000
CMD python -m gunicorn app.wsgi:application --bind 0.0.0.0:8000`},
        { t: "p", text: "Rewrite it. Explain the cause of the 502s, and why deleting the ENV lines in a later commit does not fix the secret exposure." }
      ],
      requirements: [
        "List every problem, ranked by severity.",
        "Explain the 502 spike precisely.",
        "Explain why a secret in a layer is permanent.",
        "Give the rewritten Dockerfile and .dockerignore.",
        "Estimate the size and build-time improvement.",
        "Give the deployment settings needed for a clean shutdown."
      ],
      hint: "For the 502s, look at the CMD form and ask which process receives SIGTERM. For the secrets, think about what a layer is.",
      solution: {
        lang: "bash",
        title: "Dockerfile",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# ---- CRITICAL -----------------------------------------------------
#
# 1. SECRETS BAKED INTO THE IMAGE.
#      ENV DATABASE_URL=postgresql://user:pass@db:5432/app
#      ENV SECRET_KEY=super-secret-key-123
#
#    Anyone who can pull this image has the production database
#    password and the signing key. That includes anyone with registry
#    read access, every CI job, and anyone who obtains a cached layer.
#
#    "docker history myimage" prints them. So does "docker inspect".
#    So does unpacking any layer tarball.
#
# 2. RUNS AS ROOT. No USER instruction, so PID 1 is root. A container
#    escape -- a kernel CVE, a bad mount -- is root on the host.
#
# 3. DEV DEPENDENCIES IN PRODUCTION. pytest, black and mypy are
#    installed in the runtime image: more code, more CVEs, no benefit.
#
# 4. COMPILERS AND TOOLS IN THE RUNTIME IMAGE. gcc, g++, make, git,
#    curl and vim. This is most of the 140 vulnerabilities and most of
#    the attack surface: an attacker with code execution now has a
#    compiler and a network client.
#
# ---- HIGH ---------------------------------------------------------
#
# 5. THE 502 SPIKE -- shell-form CMD.
#
#      CMD python -m gunicorn ...
#
#    Shell form runs "/bin/sh -c python -m gunicorn ...", so:
#
#      PID 1  /bin/sh -c python -m gunicorn ...
#      PID 7  gunicorn master
#      PID 8+ workers
#
#    Docker sends SIGTERM to PID 1. /bin/sh does not forward signals
#    to its children and does not exit, so gunicorn NEVER LEARNS the
#    container is stopping. After the grace period (10s by default)
#    Docker sends SIGKILL to every process.
#
#    SIGKILL cannot be caught. Every in-flight request is severed
#    mid-response, and the load balancer reports them as 502s. That
#    is the spike, and it happens on EVERY deploy.
#
#    The fix is exec form -- CMD ["gunicorn", ...] -- so gunicorn is
#    PID 1 and receives SIGTERM directly, stops accepting, and drains.
#
# 6. NO .dockerignore. COPY . . pulls in .git (often hundreds of MB),
#    .venv, tests, and any local .env -- which then sits in a layer.
#
# 7. COPY . . BEFORE pip install. Any code change invalidates the
#    install layer, so every build reinstalls every dependency. This
#    is the six minutes.
#
# 8. python:3.12, not slim. ~1GB before anything is added.
#
# ---- MEDIUM -------------------------------------------------------
#
# 9. FOUR SEPARATE RUN pip install LAYERS. Each adds a layer; the
#    intermediate ones are wasted space.
#
# 10. NO --no-install-recommends, and no apt cache cleanup, so
#     /var/lib/apt/lists persists in the layer.
#
# 11. NO PYTHONUNBUFFERED. stdout is block-buffered when not a TTY, so
#     logs arrive in 4KB chunks and a crash loses the buffer --
#     usually including the message explaining the crash.
#
# 12. UNPINNED BASE. python:3.12 changes under you; the build is not
#     reproducible.
#
# 13. collectstatic AT BUILD TIME with production settings implied --
#     which is part of why the secrets were added.


# =========================================================================
# WHY DELETING THE ENV LINES DOES NOT FIX THE SECRET EXPOSURE
# =========================================================================
#
# AN IMAGE IS A STACK OF IMMUTABLE LAYERS. Each instruction adds one;
# nothing modifies an earlier one. So:
#
#   layer 4:  ENV SECRET_KEY=super-secret-key-123     <- exists forever
#   layer 9:  RUN unset SECRET_KEY                    <- a NEW layer
#
# The second layer does not remove the first. Anyone who pulls the
# image can read every layer:
#
#   docker history --no-trunc myimage:old
#   docker save myimage:old | tar -x && cat */json
#
# The same applies to files: RUN rm /app/.env adds a layer in which
# the file is absent, and the layer where it is present is still
# there and still pullable.
#
# So the secret is compromised the moment the image is pushed. The
# response is the one from Lesson 14.2:
#
#   1. ROTATE both credentials immediately. Assume they are known.
#   2. Delete every tag of every affected image from the registry.
#   3. Note that deletion is best-effort -- anyone who pulled has it,
#      and layer caches on build machines persist.
#   4. Audit database access logs for the exposure window.
#   5. Add a CI scan (trivy, gitleaks) so it cannot recur.
#
# Secrets are supplied AT RUNTIME, never at build time. If a secret
# is genuinely needed during the build -- a private package index --
# use BuildKit secret mounts, which are never written to a layer:
#
#   RUN --mount=type=secret,id=pip_token \\
#       pip install --index-url "https://$(cat /run/secrets/pip_token)@..."


# =========================================================================
# THE REWRITE
# =========================================================================

# syntax=docker/dockerfile:1.7

# ---------- builder ------------------------------------------------
# Pinned by digest: reproducible, and it cannot change under you.
FROM python:3.12-slim@sha256:2a6f1a1a3f... AS builder

# Build-only. None of this reaches the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \\
        gcc g++ libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# THE CACHE BOUNDARY -- lockfile only. Dependencies reinstall only
# when they actually change, not when any source file does.
COPY requirements.txt requirements-lock.txt ./

# A BuildKit cache mount: pip's HTTP cache persists between builds
# without landing in a layer.
RUN --mount=type=cache,target=/root/.cache/pip \\
    python -m venv /opt/venv \\
    && /opt/venv/bin/pip install --require-hashes -r requirements-lock.txt
# --require-hashes: a compromised or substituted package fails the
# build rather than shipping (Lesson 14.7).


# ---------- runtime ------------------------------------------------
FROM python:3.12-slim@sha256:2a6f1a1a3f... AS runtime

# libpq5 -- the RUNTIME library. Not libpq-dev, not gcc.
RUN apt-get update && apt-get install -y --no-install-recommends \\
        libpq5 \\
    && rm -rf /var/lib/apt/lists/* \\
    && useradd --create-home --uid 1000 --shell /bin/false appuser

WORKDIR /app

# The virtualenv, built in the builder stage. Compilers stay behind.
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Source last: the layer that changes most often.
COPY --chown=appuser:appuser src/ ./src/

ENV PATH="/opt/venv/bin:\$PATH" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONFAULTHANDLER=1
# PYTHONFAULTHANDLER: a segfault prints a Python traceback instead of
# a silent exit -- worth the zero cost.

# NO SECRETS. They arrive at runtime, from the orchestrator.

USER appuser

EXPOSE 8000

# EXEC FORM -- gunicorn is PID 1 and receives SIGTERM. This is the
# 502 fix.
CMD ["gunicorn", "app.wsgi:application", \\
     "--bind", "0.0.0.0:8000", \\
     "--workers", "4", \\
     "--worker-class", "uvicorn.workers.UvicornWorker", \\
     # Longer than the longest request, shorter than the platform's
     # grace period. Gunicorn waits this long for workers to finish.
     "--graceful-timeout", "30", \\
     "--timeout", "60", \\
     "--access-logfile", "-", "--error-logfile", "-"]


# =========================================================================
# .dockerignore
# =========================================================================
#
#   .git
#   .venv
#   venv/
#   __pycache__/
#   *.pyc
#   .pytest_cache/
#   .mypy_cache/
#   .ruff_cache/
#   htmlcov/
#   .coverage
#
#   # The critical entries
#   .env
#   .env.*
#   !.env.example
#   *.pem
#   *.key
#
#   tests/
#   docs/
#   .github/
#   docker-compose*.yml
#   *.md
#   !README.md


# =========================================================================
# THE IMPROVEMENT
# =========================================================================
#
#                       before      after
#   image size          1.8 GB      ~190 MB      (-89%)
#   build, code change  6 min       ~8 s         (deps cached)
#   build, dep change   6 min       ~2 min
#   CVEs (high/crit)    140         ~5           (fewer packages)
#   runs as             root        uid 1000
#   secrets in image    2           0
#   502s per deploy     a spike     0
#
# The build-time win is the one the team feels daily; the secret and
# the 502s are the ones that matter.


# =========================================================================
# THE DEPLOYMENT SIDE
# =========================================================================
#
#   spec:
#     terminationGracePeriodSeconds: 45   # > graceful-timeout (30)
#     containers:
#       - name: app
#         securityContext:
#           runAsNonRoot: true            # fails if the image is root
#           runAsUser: 1000
#           readOnlyRootFilesystem: true
#           allowPrivilegeEscalation: false
#           capabilities: { drop: ["ALL"] }
#         lifecycle:
#           preStop:
#             exec:
#               # Kubernetes sends SIGTERM and removes the pod from
#               # endpoints CONCURRENTLY. Without this pause the pod
#               # stops accepting while the load balancer is still
#               # routing to it -- which is its own source of 502s,
#               # separate from the CMD-form bug.
#               command: ["sh", "-c", "sleep 5"]
#         env:
#           - name: DATABASE_URL
#             valueFrom:
#               secretKeyRef: { name: app-secrets, key: database-url }
#         volumeMounts:
#           - { name: tmp, mountPath: /tmp }   # readOnlyRootFilesystem
#         readinessProbe:
#           httpGet: { path: /health/ready, port: 8000 }
#         livenessProbe:
#           httpGet: { path: /health/live, port: 8000 }   # Lesson 14.3


# =========================================================================
# TESTS -- CI gates, so this cannot regress
# =========================================================================
#
# - name: The image does not run as root
#   run: |
#     USER=$(docker run --rm --entrypoint id myimage:test -u)
#     test "$USER" != "0" || { echo "image runs as root"; exit 1; }
#
# - name: No secrets in any layer
#   run: |
#     docker history --no-trunc myimage:test > history.txt
#     ! grep -Ei "(secret|password|token|api_key)=" history.txt
#     trivy image --scanners secret --exit-code 1 myimage:test
#
# - name: The image is under the size budget
#   run: |
#     SIZE=$(docker image inspect myimage:test --format '{{.Size}}')
#     test "$SIZE" -lt 314572800 || { echo "image over 300MB"; exit 1; }
#
# - name: No high or critical vulnerabilities
#   run: trivy image --severity HIGH,CRITICAL --exit-code 1 myimage:test
#
# - name: SIGTERM shuts down cleanly, with no dropped requests
#   run: |
#     docker run -d --name t -p 8000:8000 myimage:test
#     sleep 3
#     # A slow request in flight when the signal arrives.
#     curl -s localhost:8000/slow > result.txt &
#     sleep 1
#     time docker stop -t 30 t          # must be seconds, not 30
#     grep -q "complete" result.txt || { echo "request dropped"; exit 1; }
#
# The last one is the direct regression test for the 502 bug: with
# shell-form CMD, "docker stop" takes the full timeout and the
# in-flight request is severed.`,
        notes: [
          { t: "p", text: "**The 502s are shell-form `CMD`.** `/bin/sh -c` becomes PID 1, does not forward SIGTERM, and does not exit — so after the grace period Docker sends SIGKILL to everything. SIGKILL cannot be caught, so every in-flight request is severed mid-response on every deploy." },
          { t: "p", text: "**A secret in a layer is permanent because layers are immutable and additive.** `RUN unset SECRET_KEY` adds a new layer; it does not modify the one that contains the value. `docker history --no-trunc` prints it, and so does unpacking any layer tarball." },
          { t: "callout", kind: "insight", title: "The two independent sources of deploy 502s", body: [
            { t: "p", text: "The first is the container never receiving SIGTERM, fixed by exec-form `CMD`. The second is that Kubernetes sends SIGTERM and removes the pod from endpoints concurrently — so a correctly-behaving pod stops accepting while the load balancer is still routing to it." },
            { t: "p", text: "`preStop: sleep 5` fixes the second. Teams commonly fix one and are puzzled that the spike shrank rather than disappeared." }
          ]},
          { t: "p", text: "**Copying only the lockfile before installing is what turns six minutes into eight seconds.** Dependencies change weekly and source changes hourly, so the expensive layer must come first — and BuildKit cache mounts keep pip's HTTP cache across builds without adding it to a layer." },
          { t: "p", text: "**The compilers are most of the 140 CVEs and most of the attack surface.** An attacker with code execution in a container containing `gcc`, `git`, `curl` and `vim` has a very different set of options from one in an image containing a Python runtime and `libpq5`." },
          { t: "p", text: "**`runAsNonRoot: true` in the deployment is the belt-and-braces check.** It refuses to start an image whose user is root, which catches the day someone changes the base image and drops the `USER` line without anyone noticing." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team saw a burst of 502s on every deploy, roughly forty per rollout. They assumed it was normal for rolling updates and added a retry to the client." },
      { t: "p", text: "**The cause was one line: `CMD python app.py` instead of `CMD [\"python\", \"app.py\"]`.** The shell was PID 1, never forwarded SIGTERM, and every container was eventually SIGKILLed with requests still open." },
      { t: "p", text: "**Changing the form of one instruction removed the errors entirely.** The client retry stayed, which was fine — but it had been masking a defect rather than handling an inevitability." },
      { t: "p", text: "**The general lesson: \"that's just how deploys are\" is usually a bug nobody has looked at.** A clean rolling deploy drops no requests, and anything else has a cause." }
    ]}
  ],

  takeaways: [
    "**Order instructions least-frequently-changed first.** Copy the lockfile and install, *then* copy the source — a code change should not reinstall dependencies.",
    "**Use a multi-stage build** so compilers and build tools never reach the runtime image; they are most of the size and most of the CVEs.",
    "**`python:3.12-slim` is the right default.** Alpine uses musl, so manylinux wheels do not apply and pip compiles from source.",
    "**Write a `.dockerignore`.** Without one, `.git`, `.venv` and any local `.env` are in the build context and can end up in a layer.",
    "**A secret in a layer is permanent.** Layers are immutable and additive, so deleting the file later adds a layer without removing the earlier one.",
    "**Supply secrets at runtime.** For build-time needs, use BuildKit secret mounts, which never write to a layer.",
    "**Use exec-form `CMD`.** Shell form makes `/bin/sh` PID 1, which does not forward SIGTERM — so every deploy SIGKILLs in-flight requests.",
    "**Set `terminationGracePeriodSeconds` above your graceful timeout**, and add a `preStop` pause so the load balancer deregisters before the process stops accepting.",
    "**Run as a non-root user**, and enforce it with `runAsNonRoot: true` so a future base-image change cannot silently reintroduce root.",
    "**Add `--init` or tini only if the container spawns subprocesses**, otherwise zombies accumulate until the process table fills.",
    "**Set `PYTHONUNBUFFERED=1`**, or logs arrive in 4KB chunks and a crash loses the message explaining it.",
    "**Pin the base image by digest** so a build is reproducible and the base cannot change underneath you.",
    "**Gate size, root, secrets and vulnerabilities in CI**, and add a shutdown test — it is the only way the 502 fix stays fixed."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`CMD python -m gunicorn app:app` causes 502s on every deploy. Why?",
        options: [
          "gunicorn cannot run as PID 1",
          "Shell form makes `/bin/sh` PID 1, which does not forward SIGTERM — so gunicorn never learns to shut down and is eventually SIGKILLed with requests in flight",
          "The `-m` flag prevents signal handling",
          "gunicorn needs an explicit `--graceful-timeout`"
        ],
        answer: 1,
        why: "Exec form — `CMD [\"gunicorn\", ...]` — makes the process PID 1 so it receives the signal directly, stops accepting connections and drains. Note there is a second, independent source of deploy 502s: Kubernetes removes the pod from endpoints concurrently with SIGTERM, which a `preStop` pause fixes."
      },
      {
        stem: "A Dockerfile had `ENV SECRET_KEY=...`. You remove the line and rebuild. Is the old image safe?",
        options: [
          "Yes, once the new image is pushed",
          "No — layers are immutable and additive, so the value remains in every already-pushed image and is readable with `docker history`",
          "Yes, if the tag is overwritten",
          "Only if the registry supports layer deduplication"
        ],
        answer: 1,
        why: "Nothing modifies an earlier layer. The credential must be treated as compromised and rotated, images deleted from the registry as a best effort, and access logs audited for the exposure window. Secrets belong at runtime, or in a BuildKit secret mount which never lands in a layer."
      },
      {
        stem: "Why is `python:3.12-alpine` often a poor choice for a Python service?",
        options: [
          "Alpine lacks a Python interpreter",
          "Alpine uses musl libc, so manylinux wheels do not apply and pip compiles from source — slower builds, and often a larger image once compilers are involved",
          "Alpine images cannot run as non-root",
          "Alpine has more CVEs than Debian slim"
        ],
        answer: 1,
        why: "The base is genuinely smaller, but that saving is regularly wiped out by needing a compiler toolchain, and installs go from thirty seconds to fifteen minutes. `slim` gets most of the size benefit while keeping the wheel ecosystem working."
      },
      {
        stem: "Your Dockerfile copies the source before installing dependencies. What is the cost?",
        options: [
          "The image is larger",
          "Any code change invalidates the install layer, so dependencies reinstall on every build",
          "Dependencies install into the wrong directory",
          "The build cannot be cached at all"
        ],
        answer: 1,
        why: "Layers are cached by their inputs, and invalidating one invalidates everything after it. Copying only the lockfile first means the expensive install layer is reused until a dependency actually changes — typically the difference between six minutes and a few seconds per build."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you optimise a Python Docker image?",
        strong: "Multi-stage build so compilers stay out of the runtime, `slim` rather than the full base, copy the lockfile before the source so dependencies cache, a `.dockerignore`, and a non-root user.",
        answer: [
          { t: "p", text: "Leading with the cache ordering shows you understand what a layer is, which is the concept the rest follows from." },
          { t: "p", text: "Explaining why Alpine is usually the wrong optimisation for Python demonstrates specific knowledge rather than general advice about small images." },
          { t: "p", text: "Mentioning that the compilers are most of the CVE count connects size to security, which is the better argument." }
        ]
      },
      {
        level: "advanced",
        q: "A deploy drops requests. How do you diagnose it?",
        strong: "Check the `CMD` form first — shell form means `/bin/sh` is PID 1 and swallows SIGTERM. Then check that the grace period exceeds the application's drain time, and that a `preStop` pause lets the load balancer deregister first.",
        answer: [
          { t: "p", text: "Naming the two independent causes is what makes this a complete answer; fixing one and being puzzled that the spike shrank is the common outcome." },
          { t: "p", text: "Describing what SIGKILL does to an in-flight response explains why the symptom is a 502 specifically." },
          { t: "p", text: "Suggesting a CI test that stops the container with a request in flight turns the fix into something that stays fixed." }
        ]
      },
      {
        level: "core",
        q: "Why not run a container as root?",
        strong: "A container is not a VM. Root inside is root in the kernel's namespaces, so an escape — a kernel bug, a bad mount — is root on the host. It costs two lines to add a user and one deployment setting to enforce it.",
        answer: [
          { t: "p", text: "Being precise that containers are an isolation mechanism rather than a security boundary is the substance." },
          { t: "p", text: "`runAsNonRoot: true` as an enforcement rather than a convention shows you plan for the base image changing later." },
          { t: "p", text: "Adding `readOnlyRootFilesystem` and dropping capabilities gives depth without straying into a checklist recital." }
        ]
      }
    ]
  }
});
