/* ============================================================================
   LESSON 14.7 — Dependency and Supply-Chain Security
   ========================================================================= */
EC.receiveLesson({
  id: "14.7",

  lede: "`pip install requests` pulls five packages, each maintained by someone you have never met, each of which executes code on your build machine. **Your application's security is the union of every dependency's security**, and most teams have no idea how large that union is.",

  objectives: [
    "Decide whether to add a dependency at all",
    "Pin transitively, with hashes, so a build is reproducible and verifiable",
    "Find and triage known vulnerabilities without drowning in noise",
    "Recognise typosquatting and dependency confusion",
    "Produce an SBOM and know what question it answers"
  ],

  prerequisites: ["7.6", "14.6"],

  blocks: [

    { t: "h2", n: "01", text: "Should this be a dependency", id: "should" },

    { t: "table",
      head: ["Question", "A bad answer looks like"],
      rows: [
        ["How much of it will we use?", "One function out of two hundred"],
        ["How many transitive packages?", "**One direct becomes forty**"],
        ["When was it last released?", "2019, with open security issues"],
        ["How many maintainers?", "**One, with no succession**"],
        ["Could we write it ourselves?", "It is thirty lines"],
        ["What happens if it is abandoned?", "Nobody has considered it"],
        ["Does it run code at install time?", "**A `setup.py` doing network I/O**"]
      ],
      caption: "**The famous case is `left-pad`**: eleven lines, unpublished by its author, and a significant fraction of the JavaScript ecosystem stopped building. Python's equivalent risk is the single-maintainer package deep in your transitive tree that nobody has ever looked at."
    },

    { t: "code", lang: "bash", title: "look before you install", code: `
# How big is this really?
$ pipdeptree -p fastapi
fastapi==0.115.0
├── pydantic [required: >=1.7.4]
│   ├── annotated-types
│   ├── pydantic-core
│   └── typing-extensions
├── starlette [required: >=0.37.2]
│   └── anyio
│       ├── idna
│       └── sniffio
└── typing-extensions

# Who maintains it, and is it alive?
$ pip download --no-deps package_name && unzip -l package_name*.whl
$ curl -s https://pypi.org/pypi/package_name/json | \\
    jq '{maintainers: .info.maintainer, last: .urls[0].upload_time}'

# THE INSTALL-TIME QUESTION. A sdist runs setup.py AS YOU INSTALL IT,
# with your user's permissions, on your build machine and on every
# developer's laptop.
$ pip download --no-binary :all: --no-deps package_name
$ tar -xzf package_name*.tar.gz && cat package_name*/setup.py
# Look for: network calls, subprocess, os.system, base64 blobs,
# anything writing outside the build directory.

# Prefer wheels. A wheel is a zip that is extracted, not executed.
$ pip install --only-binary :all: package_name
`,
      hl: [17, 24],
      caption: "**`--only-binary :all:` is a meaningful hardening step.** It refuses source distributions, which removes install-time code execution entirely — at the cost of failing on packages that ship no wheel for your platform."
    },

    { t: "h2", n: "02", text: "Pinning", id: "pinning" },

    { t: "ladder",
      title: "Recording what your service depends on",
      rungs: [
        { level: "bad", label: "Unpinned",
          why: "Every install resolves afresh. A patch release of a transitive dependency you have never named changes behaviour, and CI fails with no change on your side. Reproducing a build from last month is impossible.",
          code: `# requirements.txt
fastapi
sqlalchemy
requests

# Today: fastapi 0.115.0. Next week: 0.116.0, with a changed default.` },
        { level: "ok", label: "Direct dependencies pinned",
          why: "Your direct dependencies are stable, which removes the most visible surprises. The transitive tree — usually eighty percent of the code — is still unpinned, so most of the risk remains.",
          code: `fastapi==0.115.0
sqlalchemy==2.0.35
requests==2.32.3

# pydantic, starlette, anyio, urllib3, certifi: all still floating.` },
        { level: "best", label: "Fully resolved, with hashes",
          why: "Every package at every level is pinned, and each hash is verified on install. A tampered or substituted artefact fails the install rather than shipping — and the build is byte-for-byte reproducible.",
          code: `# uv.lock (or requirements.lock via pip-compile --generate-hashes)
fastapi==0.115.0 \\
    --hash=sha256:17ea427674467486e997206a5ab2f4c6... \\
    --hash=sha256:0fc037e9d1d0d0f4b7d6b3b5c0e8e2a1...
pydantic==2.9.2 \\
    --hash=sha256:f048cec7b26778210e28a0459867920c...
# ...every transitive package, every platform wheel

# Installed with verification. A mismatch aborts the install.
pip install --require-hashes -r requirements.lock`,
          note: "**Hashes are what turn a lockfile into a security control.** Without them a pinned version still trusts whatever the index serves under that name today." }
      ]
    },

    { t: "callout", kind: "insight", title: "Two files, two purposes", body: [
      { t: "code", lang: "toml", title: "libraries and applications differ", numbered: false, code: `
# AN APPLICATION -- pin everything. You control the deployment, so
# reproducibility beats flexibility.
#   pyproject.toml   ranges, for the resolver
#   uv.lock          the resolved tree, COMMITTED
#   -> deployed with: uv sync --frozen

# A LIBRARY -- constrain, never pin. Your users have their own trees,
# and an exact pin makes your package uninstallable alongside anything
# else that disagrees.
[project]
dependencies = [
    "requests>=2.28,<3",       # a range: compatible with their pins
    "pydantic>=2.0",
]
# Do NOT commit a lockfile as the install contract for a library.
# Do commit one for your own CI, so YOUR tests are reproducible.`},
      { t: "p", text: "**A pinned library is a library that cannot be used.** `requests==2.32.3` in a published package means anyone whose other dependency needs 2.31 cannot install both — the resolver has no room to work." }
    ]},

    { t: "h2", n: "03", text: "Finding vulnerabilities", id: "cves" },

    { t: "code", lang: "bash", title: "scanning, and what the results mean", code: `
# Dependency CVEs, against the PyPI advisory database.
$ uv run pip-audit --strict
Found 2 known vulnerabilities in 2 packages
Name     Version  ID                Fix Versions
-------  -------  ----------------  ------------
urllib3  2.0.4    GHSA-v845-jxx5    2.0.7
jinja2   3.1.2    GHSA-h5c8-rqwp    3.1.3

# The container image too -- OS packages carry CVEs your Python
# scanner never sees.
$ trivy image --severity HIGH,CRITICAL myimage:sha

# THE TRIAGE QUESTION IS ALWAYS THE SAME:
#   Is the vulnerable code path REACHABLE from our application?
#
# A deserialisation flaw in a YAML parser matters if you parse
# untrusted YAML and not at all if you parse a config file you wrote.
# A denial-of-service in an HTTP client matters if it faces the
# internet and much less if it calls one internal service.
#
# Severity scores describe the vulnerability. Only you know the
# EXPOSURE.
`,
      hl: [15, 20],
      caption: "**A CVSS score is not a priority.** A critical vulnerability in a code path you never execute is a patch to schedule; a medium one in your request-handling path is today's work."
    },

    { t: "callout", kind: "trap", title: "Alert fatigue kills the practice", body: [
      { t: "code", lang: "bash", title: "what makes a scanner ignorable", numbered: false, code: `
# 1. GATING ON UNFIXABLE FINDINGS. A CVE with no patch available
#    gives the team no action except disabling the gate.
trivy image --ignore-unfixed ...

# 2. SCANNING DEV DEPENDENCIES AS IF THEY WERE PRODUCTION. A flaw in
#    pytest is not in your attack surface. Scan the runtime tree.
uv export --no-dev | pip-audit -r /dev/stdin

# 3. NO EXPIRY ON EXCEPTIONS. An ignore entry added "temporarily" in
#    2023 is still there. Require a date and a reason:
#      .trivyignore
#      # CVE-2024-1234 -- not reachable: we never parse untrusted
#      # YAML. Review by 2026-12-01. Owner: platform team.
#      CVE-2024-1234
#
# 4. ONE PULL REQUEST PER PATCH RELEASE. Forty dependency PRs a week
#    is noise nobody reviews. Group them:
#      dependabot.yml:
#        groups:
#          minor-and-patch:
#            update-types: ["minor", "patch"]
#        schedule: { interval: weekly }
# Security updates stay separate and immediate.`},
      { t: "p", text: "**Every ignored finding must have an owner and a review date.** An exception list without expiry becomes a permanent record of things nobody reads, which is worse than no list at all." }
    ]},

    { t: "h2", n: "04", text: "Attacks on the supply chain", id: "attacks" },

    {"kind": "flow", "title": "Where a supply-chain attack gets in", "caption": "Typosquatted names, hijacked maintainer accounts, malicious install scripts and compromised build pipelines all deliver code through the same 'pip install'. Pinning with hashes, a private index and a lock file reviewed in code review narrow every entry.", "cols": 4, "nodes": [{"id": "a", "label": "typosquat", "sub": "requets, python-dateutils", "tone": "crit"}, {"id": "b", "label": "hijacked package", "sub": "a new malicious release", "tone": "crit"}, {"id": "c", "label": "pip install", "sub": "runs setup.py", "tone": "warn"}, {"id": "d", "label": "your CI and prod", "sub": "secrets, tokens", "tone": "accent"}], "edges": [["a", "c"], ["b", "c"], ["c", "d"]], "t": "diagram", "id": "dg-14_7-04-0"},

    { t: "viz",
      title: "Four ways a malicious package reaches you",
      caption: "None of these require a vulnerability in your code. The attack is on the path between the package author and your build machine — and in three of the four, nothing about your repository changes.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Four supply-chain attack vectors described in boxes">
  <rect x="20" y="24" width="420" height="128" rx="10" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="40" y="50" class="s-label" style="fill:var(--crit)">TYPOSQUATTING</text>
  <g class="s-sub">
    <text x="40" y="76">pip install reqeusts   ← one transposed letter</text>
    <text x="40" y="98">pip install python-dateutil  vs  dateutil</text>
    <text x="40" y="120">Installs, works, and exfiltrates on import.</text>
    <text x="40" y="142" style="fill:var(--ink-3)">Defence: a lockfile, and read what you type.</text>
  </g>

  <rect x="460" y="24" width="420" height="128" rx="10" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="480" y="50" class="s-label" style="fill:var(--crit)">DEPENDENCY CONFUSION</text>
  <g class="s-sub">
    <text x="480" y="76">Your private package: acme-internal 1.2.0</text>
    <text x="480" y="98">Attacker publishes acme-internal 99.0 to PyPI</text>
    <text x="480" y="120">pip prefers the higher version. Public wins.</text>
    <text x="480" y="142" style="fill:var(--ink-3)">Defence: --index-url only, never --extra-index-url.</text>
  </g>

  <rect x="20" y="168" width="420" height="128" rx="10" style="fill:var(--surface);stroke:var(--warn)"/>
  <text x="40" y="194" class="s-label" style="fill:var(--warn)">MAINTAINER COMPROMISE</text>
  <g class="s-sub">
    <text x="40" y="220">A real package, a stolen PyPI token.</text>
    <text x="40" y="242">A new patch release contains a payload.</text>
    <text x="40" y="264">Your unpinned build picks it up in minutes.</text>
    <text x="40" y="286" style="fill:var(--ink-3)">Defence: hashes. A new artefact fails the check.</text>
  </g>

  <rect x="460" y="168" width="420" height="128" rx="10" style="fill:var(--surface);stroke:var(--warn)"/>
  <text x="480" y="194" class="s-label" style="fill:var(--warn)">INSTALL-TIME EXECUTION</text>
  <g class="s-sub">
    <text x="480" y="220">setup.py runs during pip install,</text>
    <text x="480" y="242">as your user, on your build machine.</text>
    <text x="480" y="264">Reads ~/.aws, ~/.ssh, environment variables.</text>
    <text x="480" y="286" style="fill:var(--ink-3)">Defence: --only-binary :all: — wheels do not execute.</text>
  </g>
</svg>`
    },

    { t: "code", lang: "bash", title: "the private-index configuration that matters", code: `
# WRONG -- and this is the default advice in most tutorials.
pip install --extra-index-url https://pypi.company.com/simple/ acme-lib
# pip queries BOTH indexes and takes the HIGHEST version. An attacker
# who learns the name "acme-lib" publishes version 99.0.0 to public
# PyPI, and every build silently switches to it. Nothing in your
# repository changed.

# RIGHT -- one index, which proxies public packages.
pip install --index-url https://pypi.company.com/simple/ acme-lib
# The private index is authoritative and mirrors what it chooses to.

# Or, if you must use both, scope explicitly (uv, pip 24.1+):
[tool.uv.sources]
acme-lib = { index = "company" }
# Internal names resolve ONLY from the internal index.

# And claim your namespace on public PyPI, even if you never publish:
# a placeholder package named acme-lib means nobody else can take it.
`,
      hl: [2, 9, 14],
      caption: "**Dependency confusion needs no access to anything of yours** — only the name of an internal package, which leaks through job adverts, stack traces, public Dockerfiles and CI logs."
    },

    { t: "h2", n: "05", text: "SBOM and provenance", id: "sbom" },

    { t: "code", lang: "bash", title: "the question an SBOM answers", code: `
# Generate a bill of materials for the artefact you shipped.
$ uv run cyclonedx-py environment -o sbom.json
$ syft myimage:sha256:abc... -o cyclonedx-json > sbom.json

# THE QUESTION IT ANSWERS, at 9am on a bad morning:
#
#   "A critical flaw was announced in libfoo 2.3. Are we affected?"
#
# Without an SBOM: check every service, every image, every
# transitive tree, by hand. Hours, and the answer is "probably not".
#
# With SBOMs stored per release:
$ jq '.components[] | select(.name=="libfoo")' sboms/*.json
# Seconds, and the answer is a list of exactly which releases of
# which services contain which version.

# Attach it to the build so it cannot drift from the artefact:
$ cosign attach sbom --sbom sbom.json registry/app@sha256:abc...
$ cosign sign --yes registry/app@sha256:abc...
# And verify before deploying:
$ cosign verify --certificate-identity-regexp '^https://github.com/acme/' \\
    registry/app@sha256:abc...
`,
      hl: [8, 14, 21],
      caption: "**An SBOM is inventory, not protection.** Its whole value is answering the exposure question quickly, and that value exists only if one is generated per release and kept."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Audit a project's dependency posture",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "You have joined a team. This is how dependencies are managed, and there is an announced critical vulnerability in `urllib3` this morning." },
        { t: "code", lang: "bash", numbered: false, title: "the current state", code: `
# requirements.txt
fastapi
sqlalchemy>=2.0
requests
celery
python-jose
boto3
pandas

# Dockerfile
RUN pip install --extra-index-url https://pypi.acme-corp.com/simple/ \\
    -r requirements.txt

# .github/workflows/ci.yml
- run: pip install -r requirements.txt
- run: pytest

# No lockfile. No scanning. 3 services, 2 years old.
# Dependabot: disabled, "too noisy".`},
        { t: "p", text: "Give the remediation plan. Also answer the morning's question: are you affected by the `urllib3` advisory, and how long does it take you to find out?" }
      ],
      requirements: [
        "List every problem, ranked by severity.",
        "Identify the vector that requires no access to your systems.",
        "Answer the `urllib3` question, and say what makes it slow.",
        "Give the remediation plan in priority order.",
        "Design a dependency-update policy that will not be disabled as noisy.",
        "Give the CI configuration."
      ],
      hint: "Look carefully at the pip flag in the Dockerfile. And ask what `requests` actually depends on.",
      solution: {
        lang: "bash",
        title: "remediation-plan.md",
        code: `# =========================================================================
# THE FINDINGS
# =========================================================================
#
# ---- CRITICAL -----------------------------------------------------
#
# 1. DEPENDENCY CONFUSION VIA --extra-index-url.
#
#      pip install --extra-index-url https://pypi.acme-corp.com/simple/
#
#    THIS IS THE VECTOR THAT NEEDS NO ACCESS TO ANYTHING OF YOURS.
#
#    --extra-index-url makes pip query BOTH indexes and choose the
#    HIGHEST version, regardless of which index it came from. An
#    attacker who learns the name of any internal package publishes
#    version 99.0.0 to public PyPI, and the next build installs it
#    instead. Nothing in your repository changes. No credential is
#    stolen. No system of yours is touched.
#
#    Internal package names leak constantly: job adverts, stack
#    traces in support tickets, public Dockerfiles, CI logs,
#    conference talks, a screenshot in a blog post.
#
#    THE FIX (do this first, today):
#      --index-url https://pypi.acme-corp.com/simple/
#    One index, authoritative, proxying public packages. Plus
#    claiming your internal names on public PyPI as placeholders so
#    nobody can register them.
#
# 2. NO PINNING AT ALL. "fastapi" with no version means every build
#    resolves fresh. Consequences:
#      - a maintainer compromise reaches you within minutes of
#        publication
#      - builds are not reproducible; last month's release cannot be
#        rebuilt
#      - CI failures appear with no change on your side
#      - you cannot state what is running in production
#
# 3. NO HASH VERIFICATION. Even pinned, "fastapi==0.115.0" trusts
#    whatever the index serves under that name today. Hashes are what
#    make a substituted artefact fail rather than ship.
#
# ---- HIGH ---------------------------------------------------------
#
# 4. NO SCANNING WHATSOEVER. No pip-audit, no trivy, no secret
#    scanning. Nobody knows what is vulnerable, which is why the
#    urllib3 question below has no quick answer.
#
# 5. DEPENDABOT DISABLED. The reason given -- "too noisy" -- is a
#    real problem with a real fix (grouping and scheduling), and
#    disabling it means security patches are never applied either.
#
# 6. python-jose. Worth calling out specifically: it has a history of
#    CVEs, sparse maintenance, and it is doing JWT verification --
#    i.e. it is your authentication boundary (Lesson 12.8). Migrate
#    to PyJWT, which is actively maintained.
#
# 7. NO SBOM. See the urllib3 answer.
#
# ---- MEDIUM -------------------------------------------------------
#
# 8. pandas AND boto3 ARE ENORMOUS. Combined they pull ~30 transitive
#    packages and add hundreds of MB. Worth asking what fraction is
#    used -- boto3 can often be replaced by boto3-stubs plus the two
#    clients you need; pandas by plain csv or polars.
#
# 9. sqlalchemy>=2.0 IS AN UNBOUNDED RANGE. When 3.0 is released
#    with breaking changes, the build breaks. Ranges need an upper
#    bound: >=2.0,<3.
#
# 10. DEV AND RUNTIME DEPENDENCIES ARE NOT SEPARATED, so test tooling
#     ships in the production image and inflates the scan surface.
#
#
# =========================================================================
# THE urllib3 QUESTION
# =========================================================================
#
# "A critical vulnerability was announced in urllib3. Are we
#  affected, and which versions do we run?"
#
# ARE YOU AFFECTED? Almost certainly YES. urllib3 is not in
# requirements.txt at all -- it arrives transitively:
#
#   requests  -> urllib3
#   boto3     -> botocore -> urllib3
#   celery    -> kombu    -> (varies)
#
# This is the point: 80% of your dependency tree is packages nobody
# on the team chose or has heard of.
#
# HOW LONG TO FIND OUT, TODAY:
#
#   1. No lockfile, so the installed version is whatever resolved at
#      the last build of each service. You cannot read it from the
#      repository.
#   2. So: exec into a running pod of each of the 3 services and run
#      "pip show urllib3". If pods have been replaced since the last
#      deploy, they may differ from each other.
#   3. Then work out whether the vulnerable path is reachable, with
#      no record of which code uses it.
#
#   Realistically: 2-4 hours, across three services, with an answer
#   you cannot fully trust -- because tomorrow's rebuild may resolve
#   differently again.
#
# HOW LONG WITH A LOCKFILE AND SBOMs:
#
#   $ grep -A2 '^name = "urllib3"' */uv.lock
#   $ jq '.components[] | select(.name=="urllib3") | .version' sboms/*.json
#
#   Under a minute, with an exact answer per service per release.
#
# THAT GAP IS THE ENTIRE ARGUMENT FOR THIS LESSON.
#
#
# =========================================================================
# THE PLAN, IN PRIORITY ORDER
# =========================================================================
#
# --- TODAY -------------------------------------------------------
#
# 1. Fix the index flag. One line, and it closes the vector that
#    needs no access to your systems.
#
#      -  --extra-index-url https://pypi.acme-corp.com/simple/
#      +  --index-url       https://pypi.acme-corp.com/simple/
#
#    Confirm the internal index proxies public PyPI, or builds break.
#
# 2. Register placeholder packages on public PyPI for every internal
#    name, so the names cannot be claimed.
#
# 3. Answer the urllib3 question by inspecting running pods, and
#    patch if affected.
#
# --- THIS WEEK ---------------------------------------------------
#
# 4. Generate lockfiles for all three services.
#
#      uv lock                       # resolves and writes uv.lock
#      uv sync --frozen              # installs exactly that
#
#    Commit them. From this moment, builds are reproducible and a
#    maintainer compromise cannot reach you without a lockfile change
#    that appears in a diff and gets reviewed.
#
# 5. Add hash verification. uv.lock includes hashes; for pip:
#
#      pip-compile --generate-hashes -o requirements.lock
#      pip install --require-hashes -r requirements.lock
#
# 6. Add scanning to CI (configuration below).
#
# 7. Separate dev and runtime dependencies so the production image
#    and its scan surface shrink.
#
# --- THIS MONTH --------------------------------------------------
#
# 8. Replace python-jose with PyJWT. It guards authentication; an
#    unmaintained library there is the highest-value target you have.
#
# 9. Bound every range: sqlalchemy>=2.0,<3.
#
# 10. Audit pandas and boto3 usage. If pandas is used for one CSV
#     read, that is ~40MB and a dozen transitive packages for
#     something the standard library does.
#
# 11. Generate and store an SBOM per release, attached to the image
#     digest.
#
# 12. Re-enable Dependabot with the policy below.
#
#
# =========================================================================
# A DEPENDENCY-UPDATE POLICY THAT SURVIVES
# =========================================================================
#
# The failure mode is 40 PRs a week that nobody reviews, so the whole
# thing gets switched off -- taking security updates with it. The fix
# is to separate SECURITY from MAINTENANCE.
#
#   # .github/dependabot.yml
#   version: 2
#   updates:
#     - package-ecosystem: "uv"
#       directory: "/"
#       schedule:
#         interval: "weekly"
#         day: "monday"
#       open-pull-requests-limit: 5
#       groups:
#         # ONE pr per week for all routine updates. Reviewable.
#         routine:
#           patterns: ["*"]
#           update-types: ["minor", "patch"]
#         # Major versions are individual -- they need real review.
#         major:
#           patterns: ["*"]
#           update-types: ["major"]
#       ignore:
#         # Pinned deliberately; document WHY, in the file.
#         - dependency-name: "pandas"
#           versions: ["3.x"]      # 3.0 breaks our resampling code
#
#     - package-ecosystem: "docker"
#       directory: "/"
#       schedule: { interval: "weekly" }
#
# Security advisories bypass this entirely: GitHub raises them
# immediately and individually, and they are never grouped or
# deferred. That separation is what makes weekly batching safe.
#
# THE RULE FOR THE TEAM: the grouped PR is reviewed and merged every
# Monday, or it is closed with a reason. A grouped PR that sits open
# for three weeks is the same failure in a different shape.
#
#
# =========================================================================
# CI CONFIGURATION
# =========================================================================
#
#   supply-chain:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: astral-sh/setup-uv@v3
#
#       # The lockfile must match pyproject.toml. Catches a
#       # hand-edited dependency that was never resolved.
#       - run: uv lock --check
#
#       # Reproducible install with hash verification.
#       - run: uv sync --frozen
#
#       # RUNTIME dependencies only. A CVE in pytest is not in your
#       # attack surface, and scanning it is how the signal is lost.
#       - run: uv export --no-dev --format requirements-txt > runtime.txt
#       - run: uv run pip-audit --strict -r runtime.txt
#
#       # OS packages in the image -- a whole class your Python
#       # scanner never sees.
#       - uses: aquasecurity/trivy-action@0.24.0
#         with:
#           image-ref: \${{ env.IMAGE }}@\${{ needs.build.outputs.digest }}
#           severity: HIGH,CRITICAL
#           exit-code: "1"
#           ignore-unfixed: true    # unactionable findings do not gate
#
#       # Secrets: the one failure a later commit cannot undo.
#       - uses: gitleaks/gitleaks-action@v2
#
#       # SBOM per release, attached to the digest so it cannot drift.
#       - run: |
#           uv run cyclonedx-py environment -o sbom.json
#           cosign attach sbom --sbom sbom.json \\
#             \${{ env.IMAGE }}@\${{ needs.build.outputs.digest }}
#       - uses: actions/upload-artifact@v4
#         with: { name: sbom, path: sbom.json }
#
#       # Exception expiry. An ignore list with no review date becomes
#       # permanent, which is worse than no list.
#       - run: |
#           python .ci/check_ignore_expiry.py .trivyignore
#           # fails if any entry's "Review by" date has passed
#
#
# =========================================================================
# VERIFICATION
# =========================================================================
#
# def test_the_lockfile_matches_the_manifest():
#     """A dependency added by hand to pyproject.toml without
#     re-locking installs an unpinned version."""
#     assert run(["uv", "lock", "--check"]).returncode == 0
#
#
# def test_no_extra_index_url_anywhere():
#     """Finding 1, pinned permanently. The flag is easy to
#     reintroduce and the consequence is invisible."""
#     hits = run(["grep", "-rn", "extra-index-url", "."]).stdout
#     assert not hits, f"dependency confusion vector: {hits}"
#
#
# def test_the_runtime_tree_has_no_known_high_severity_cves():
#     result = run(["pip-audit", "--strict", "-r", "runtime.txt"])
#     assert result.returncode == 0, result.stdout
#
#
# def test_every_ignore_entry_has_an_owner_and_a_review_date():
#     """An exception list without expiry is a list nobody reads."""
#     for line in Path(".trivyignore").read_text().splitlines():
#         if line.startswith("CVE-"):
#             assert has_dated_comment_above(line), line`,
        notes: [
          { t: "p", text: "**`--extra-index-url` is the finding to fix today.** It makes pip query both indexes and take the highest version, so an attacker only needs the *name* of an internal package — which leaks through job adverts, stack traces and public Dockerfiles. Nothing of yours is accessed and nothing in your repository changes." },
          { t: "p", text: "**The `urllib3` question exposes the real cost of no lockfile.** urllib3 is not in `requirements.txt` at all; it arrives through `requests`, `botocore` and `kombu`. Answering \"which version do we run\" means shelling into pods, and the answer is only true until the next rebuild." },
          { t: "callout", kind: "insight", title: "Two to four hours versus under a minute", body: [
            { t: "p", text: "That gap is the entire argument. A lockfile makes the installed version a fact in the repository rather than a property of whenever the last build happened, and an SBOM per release makes the exposure question a `jq` query." },
            { t: "p", text: "It matters most on the morning you are least able to spend four hours on it, which is precisely when advisories land." }
          ]},
          { t: "p", text: "**\"Too noisy\" is a real problem with a real fix.** Grouping routine minor and patch updates into one weekly pull request, keeping majors individual, and letting security advisories bypass the schedule entirely gives you one reviewable PR a week instead of forty — and disabling the whole thing had also disabled security patching." },
          { t: "p", text: "**`python-jose` deserves its own line in the plan** because it sits on the authentication boundary. An unmaintained library verifying your JWTs is the highest-value target in the tree, and PyJWT is a direct, actively-maintained replacement." },
          { t: "p", text: "**Scan the runtime tree, not the dev tree.** A CVE in pytest is not in your attack surface, and including it is how the signal gets buried — which is the same mechanism that led to Dependabot being switched off." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A company used `--extra-index-url` to reach their private package index. It worked for four years." },
      { t: "p", text: "**A security researcher found the name of an internal package in a stack trace posted to a public issue tracker**, published a package of that name to PyPI with a higher version number, and every build in the company switched to it within a day." },
      { t: "p", text: "**The proof-of-concept payload phoned home from CI runners and developer laptops**, with access to whatever credentials were in those environments. Nothing in any repository had changed; no system had been breached." },
      { t: "p", text: "**The fix was one flag: `--index-url` instead of `--extra-index-url`.** The vulnerability had been present since the private index was set up, and the only thing that changed was that someone noticed the name." }
    ]}
  ],

  takeaways: [
    "**Your security is the union of every dependency's security**, and most of that tree is packages nobody on the team chose.",
    "**Ask what fraction of a package you will use, and how many transitive packages it brings.** One direct dependency becoming forty is common.",
    "**A source distribution executes `setup.py` at install time**, as your user, on every build machine — `--only-binary :all:` removes that entirely.",
    "**Pin transitively with hashes.** A pinned version still trusts whatever the index serves under that name today; a hash does not.",
    "**Applications pin; libraries constrain.** A published package with `==` pins is uninstallable alongside anything that disagrees.",
    "**`--extra-index-url` is a dependency-confusion vector.** pip takes the highest version from either index, so an attacker needs only your internal package name.",
    "**Internal package names leak** through job adverts, stack traces, public Dockerfiles and CI logs — claim them on public PyPI as placeholders.",
    "**A CVSS score describes the vulnerability; only you know the exposure.** Triage on whether the vulnerable path is reachable.",
    "**Scan the runtime tree, not the dev tree** — a flaw in pytest is not in your attack surface, and including it buries the signal.",
    "**Use `ignore-unfixed`.** A gate on an unpatchable finding gives the team no action except disabling the gate.",
    "**Every exception needs an owner and a review date**, or the ignore list becomes a permanent record nobody reads.",
    "**Group routine updates weekly and keep security advisories immediate.** Forty PRs a week is why teams disable dependency bots entirely — losing security patches with them.",
    "**An SBOM per release turns \"are we affected?\" from four hours into a `jq` query**, on exactly the morning you can least afford four hours."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `pip install --extra-index-url https://internal/ mypackage` dangerous?",
        options: [
          "The internal index may be slower",
          "pip queries both indexes and installs the highest version, so anyone who learns the internal package name can publish a higher version publicly and take over the build",
          "It disables hash checking",
          "Internal packages cannot be cached"
        ],
        answer: 1,
        why: "This is dependency confusion, and it requires no access to any of your systems — only the name, which leaks through stack traces, job adverts and public Dockerfiles. `--index-url` against an index that proxies public packages is the fix, plus registering placeholder names on public PyPI."
      },
      {
        stem: "You pin `requests==2.32.3` but use no hashes. What remains unprotected?",
        options: [
          "Nothing — a pinned version is fully reproducible",
          "The build still trusts whatever the index serves under that name, so a compromised maintainer account or a substituted artefact ships without detection",
          "Transitive dependencies are unaffected by hashes",
          "Only the wheel format is at risk"
        ],
        answer: 1,
        why: "A version is a label; a hash is the artefact's identity. `--require-hashes` makes a tampered or replaced package fail the install rather than run. It also forces the whole tree to be pinned, since an unpinned transitive dependency cannot be hashed."
      },
      {
        stem: "A critical CVE is announced in `urllib3`, which is not in your `requirements.txt`. Are you affected?",
        options: [
          "No — it is not a declared dependency",
          "Very likely yes — it arrives transitively through `requests` and `botocore`, and without a lockfile you cannot say which version you run",
          "Only if you make HTTP requests directly",
          "Only in the development environment"
        ],
        answer: 1,
        why: "Most of a dependency tree is packages nobody chose explicitly. Without a lockfile the installed version is a property of whenever the last build happened, so answering the question means inspecting running pods — and the answer changes on the next rebuild."
      },
      {
        stem: "A team disabled Dependabot because it was \"too noisy\". What is the right response?",
        options: [
          "Accept it — dependency updates can be manual",
          "Group routine minor and patch updates into one weekly PR, keep majors individual, and let security advisories bypass the schedule entirely",
          "Increase the PR limit so nothing is missed",
          "Only enable it for direct dependencies"
        ],
        answer: 1,
        why: "Forty unreviewed PRs a week is a genuine problem, and disabling the bot also disables security patching. Separating routine maintenance from security advisories gives one reviewable PR a week while urgent fixes still arrive immediately and individually."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you secure a Python dependency tree?",
        strong: "Lock transitively with hashes so builds are reproducible and a substituted artefact fails, use a single authoritative index, scan the runtime tree in CI with unfixed findings excluded, and keep an SBOM per release.",
        answer: [
          { t: "p", text: "Leading with hashes rather than pinning shows you know the difference between reproducibility and verification." },
          { t: "p", text: "The single-index point is the one that separates people who have thought about supply chain from people who have run a scanner." },
          { t: "p", text: "Mentioning that scanning dev dependencies buries the signal demonstrates you have made a gate that people actually keep." }
        ]
      },
      {
        level: "advanced",
        q: "What is dependency confusion?",
        strong: "When a build can resolve a package name from more than one index and picks the highest version, an attacker who learns an internal package name publishes a higher version publicly and your build installs theirs.",
        answer: [
          { t: "p", text: "Emphasising that it requires no access to your systems is what makes the severity land." },
          { t: "p", text: "Naming how the internal name leaks — stack traces, job adverts, public Dockerfiles — shows you understand the realistic attack rather than the abstract one." },
          { t: "p", text: "Giving both halves of the fix, one index plus placeholder registrations, is a complete answer." }
        ]
      },
      {
        level: "core",
        q: "A scanner reports twelve vulnerabilities. How do you triage?",
        strong: "By reachability, not by score. Is the vulnerable code path something we execute, and is it exposed to untrusted input? A critical flaw in a path we never take is scheduled work; a medium one in request handling is today's.",
        answer: [
          { t: "p", text: "The distinction between severity and exposure is the substance — a CVSS score knows nothing about your application." },
          { t: "p", text: "Concrete examples, like a YAML deserialisation flaw mattering only if you parse untrusted YAML, make it credible." },
          { t: "p", text: "Adding that every deferral needs an owner and a review date shows you have seen an ignore list rot." }
        ]
      }
    ]
  }
});
