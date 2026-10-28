EC.receiveLesson({
  id: "4.5",

  lede: "The most repeated container-security mistake is believing that `RUN rm` removes something. It does not, and this lesson proves it rather than asserting it: an image layer is a tar, so two real tar streams were built — one adding a credentials file, one recording the deletion — and the secret was read **straight back out of layer 1**, in full. A running container sees nothing at that path; `docker save` yields `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/...` immediately. The rest of the surface follows from lesson 4.1's shared kernel: root in the container is root on that kernel, the daemon socket is root-equivalent, and a scanner sees known CVEs and never sees your secret.",

  objectives: [
    "Demonstrate why a deleted file persists in an image layer, and name the two correct fixes",
    "Explain why running as root in a container matters given a shared kernel",
    "Say what mounting the Docker socket actually grants",
    "State what an image scanner does and does not detect"
  ],

  prerequisites: ["4.4"],

  blocks: [

    { t: "h2", n: "01", id: "whiteout", text: "A deleted secret is still in the image",
      sub: "Read back out of a real tar" },

    { t: "p", text: "The pattern looks careful and is worthless:" },

    { t: "code", lang: "dockerfile", title: "The mistake, in three lines",
      code: `COPY credentials /root/.aws/credentials
RUN pip install --extra-index-url=$(cat /root/.aws/token) private-package
RUN rm -rf /root/.aws` },

    { t: "p", text: "Lesson 4.2 established that each instruction produces a layer, and that a layer is a tar of filesystem changes. A deletion in a later layer cannot reach back into an earlier tar — the earlier tar is immutable and content-addressed. What the union filesystem records instead is a **whiteout**: a marker file telling the overlay driver to hide that path. The data is untouched." },

    { t: "p", text: "So rather than assert that, here are two real tar streams: one containing the credentials, one containing only the whiteout markers a `rm -rf` produces." },

    { t: "code", lang: "python", title: "m4.py — building the two layers",
      code: `# layer 1: the build copies a credentials file in and uses it
with tarfile.open(L1, "w") as tf:
    for name, data in (("app/requirements.txt", b"scikit-learn==1.8.0\\n"),
                       ("root/.aws/credentials", SECRET),
                       ("app/src/app.py", b"print('hello')\\n")):
        ti = tarfile.TarInfo(name); ti.size = len(data)
        tf.addfile(ti, io.BytesIO(data))

# layer 2: RUN rm -rf /root/.aws  -> a whiteout entry, nothing more
with tarfile.open(L2, "w") as tf:
    for name in ("root/.aws/.wh..wh..opq", "root/.aws/.wh.credentials"):
        ti = tarfile.TarInfo(name); ti.size = 0
        tf.addfile(ti, io.BytesIO(b""))`,
      out: `  layer 1 contents:
    app/requirements.txt             20 bytes
    root/.aws/credentials            63 bytes
    app/src/app.py                   15 bytes
  layer 2 contents (the rm):
    root/.aws/.wh..wh..opq            0 bytes
    root/.aws/.wh.credentials         0 bytes` },

    { t: "p", text: "Layer 2 is the entire effect of `rm -rf /root/.aws`: **two zero-byte marker files.** The 63-byte credential in layer 1 is exactly where it was." },

    { t: "code", lang: "python", title: "m4.py — reading it back",
      code: `with tarfile.open(L1) as tf:
    data = tf.extractfile("root/.aws/credentials").read()`,
      out: `  what the running container sees at /root/.aws/credentials : nothing
  what \`docker save\` + tar -x of layer 1 yields             : AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  secret recoverable from the image: True` },

    { t: "callout", kind: "trap", title: "Anyone who can pull the image has the secret",
      body: [
        { t: "p", text: "No exploit is required and no privilege is needed beyond `docker pull`. `docker save` writes the layers as tars; `tar -xf` extracts them. A registry with read access for a whole engineering organisation is a credential shared with that organisation, for as long as the image exists — and images persist in registries far longer than anyone's rotation policy." },
        { t: "p", text: "It is also undetectable by the obvious means: the running container genuinely does not have the file, so inspecting a container, running `find`, or testing the application tells you nothing." }
      ] },

    { t: "h2", n: "02", id: "fixes", text: "The two fixes",
      sub: "Never put it in a layer" },

    { t: "p", text: "Both correct answers share a principle: the secret must never be written into a layer that ships, because once it is, nothing later can remove it." },

    { t: "code", lang: "dockerfile", title: "Fix 1 — a BuildKit secret mount",
      code: `# The file is mounted for the duration of ONE RUN and is in no layer.
RUN --mount=type=secret,id=pipcreds \\
    pip install --extra-index-url=$(cat /run/secrets/pipcreds) private-package

# docker build --secret id=pipcreds,src=./credentials .` },

    { t: "code", lang: "dockerfile", title: "Fix 2 — a multi-stage build where the stage is discarded",
      code: `FROM python:3.11-slim AS build
COPY credentials /tmp/creds                      # in THIS stage's layers
RUN pip install --extra-index-url=$(cat /tmp/creds) -t /deps private-package

FROM python:3.11-slim AS runtime
COPY --from=build /deps /deps                    # only /deps crosses over
# the build stage's layers -- credentials included -- are never pushed` },

    { t: "p", text: "The secret mount is the better fix: the secret is present for one instruction, lands in no layer in any stage, and the build does not need the file on disk at all beyond the moment of the build. Multi-stage works because unreferenced stages are not pushed — but the credential *is* in the build cache locally, which matters on a shared builder or a CI runner with a persistent cache." },

    { t: "callout", kind: "warn", title: "Build arguments are not secrets either",
      body: [
        { t: "p", text: "`ARG TOKEN` followed by `RUN pip install --extra-index-url=https://$TOKEN@...` puts the token in the layer's **command string**, which `docker history` prints. That is arguably worse than a file, because it needs no extraction at all — one command displays it." },
        { t: "p", text: "The same applies to `ENV`: lesson 4.4 noted environment values are visible in `docker inspect`, and `ENV` bakes them into the image's configuration permanently." }
      ] },

    { t: "h2", n: "03", id: "root", text: "Root in the container",
      sub: "Why the shared kernel makes this matter" },

    { t: "p", text: "Containers run as root by default, and the reason it matters is lesson 4.1's third mechanism. There is **one kernel**. The container's root is uid 0 on that kernel, distinguished from the host's root only by namespaces — and a namespace is a configuration, not a hardware boundary." },

    { t: "p", text: "The consequences are concrete rather than theoretical. A container escape through a kernel vulnerability lands as uid 0 on the host. A bind-mounted host directory is written as root, so a container can create files the host user cannot remove. And any capability the runtime grants — `--privileged`, `--cap-add SYS_ADMIN`, a mounted device — is granted to root, which is why those flags are so much more dangerous than they look." },

    { t: "p", text: "Lesson 4.3's image already does the right thing, and the ordering in it is deliberate:" },

    { t: "code", lang: "dockerfile", title: "From lesson 4.3 — the user, and why it is created early",
      code: `RUN useradd --create-home --uid 10001 appuser
COPY --from=build /opt/venv /opt/venv
COPY --chown=appuser:appuser src/ ./src/
USER appuser` },

    { t: "p", text: "An explicit high uid rather than letting the system pick, so it is stable across rebuilds and predictable when a volume's ownership has to match it. `--chown` on the copy, because a file copied as root and then switched to `USER appuser` is not writable by the process. And `USER` after the installs, because `pip install` into `/opt/venv` needs to write there." },

    { t: "callout", kind: "good", title: "Three flags that cost nothing and remove most of the surface",
      body: [
        { t: "p", text: "**`--read-only`** with a `tmpfs` for `/tmp`: a model service writes nothing to its filesystem, so making it immutable removes the ability to drop a binary. **`--cap-drop=ALL`** and add back only what is needed, which for an HTTP server is usually nothing — it does not even need `NET_BIND_SERVICE` above port 1024. **`--security-opt no-new-privileges`**, which prevents a setuid binary inside from elevating." },
        { t: "p", text: "In Kubernetes these are the `securityContext` fields — `runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, `capabilities.drop` — and lesson 5.4 covers enforcing them centrally rather than hoping each manifest sets them." }
      ] },

    { t: "h2", n: "04", id: "socket", text: "The daemon socket",
      sub: "Granting it is granting root" },

    { t: "p", text: "`-v /var/run/docker.sock:/var/run/docker.sock` appears in CI configurations, in build containers, and in anything that needs to start other containers. It is worth being precise about what it grants, because it is usually mistaken for a limited capability." },

    { t: "p", text: "The daemon runs as root and its API has no authorisation model: any client that can reach the socket can do anything the daemon can. Which includes starting a container with `--privileged` that bind-mounts the host's `/` and runs a shell. **Access to the socket is equivalent to root on the host**, by one obvious step, with no exploit involved." },

    { t: "diagram", kind: "matrix", id: "dg-4_5-04-0",
      title: "The four surfaces, and what each one actually grants",
      caption: "The first row is the one measured in this lesson; the rest follow from the shared kernel. **Only the last is a vulnerability in the usual sense** — the other three are the system working exactly as designed.",
      rows: ["A secret in a layer", "Running as root", "The daemon socket", "A base-image CVE"],
      cols: ["What it grants", "The fix"],
      cells: [
        [{ text: "the secret, to anyone who can pull", tone: "crit" }, { text: "secret mount, or a discarded stage", tone: "good" }],
        [{ text: "uid 0 on the shared kernel if anything escapes", tone: "crit" }, { text: "USER, cap-drop ALL, read-only root fs", tone: "good" }],
        [{ text: "root on the host, in one step, no exploit", tone: "crit" }, { text: "do not mount it; use a rootless builder", tone: "good" }],
        [{ text: "whatever the CVE allows", tone: "warn" }, { text: "rebuild on a fresh base, pin by digest", tone: "good" }]
      ] },

    { t: "h2", n: "05", id: "scanning", text: "What a scanner sees",
      sub: "And the thing it is blind to" },

    { t: "p", text: "Image scanners — Trivy, Grype, the registry's built-in — enumerate installed packages from the image's metadata and compare versions against vulnerability databases. That is genuinely useful: it finds the openssl in your base image that has a known CVE, and it does it in seconds." },

    { t: "p", text: "It is also exactly the limit. A scanner compares **package versions against a database**, so:" },

    { t: "dl", items: [
      { k: "It does not see your secret", v: "The credential measured in section 1 is a 63-byte file in a tar. No CVE describes it and no package manifest lists it. Dedicated secret scanners exist and are a different tool." },
      { k: "It does not know what is reachable", v: "A CVE in a library your code never imports is reported identically to one in your request path, which is how a hundred-finding report becomes something nobody reads." },
      { k: "It cannot see your own code", v: "The lesson-19.5 guardrail problem and the lesson-4.4 published-database-port problem are both invisible to it." },
      { k: "It is only as fresh as its database", v: "A clean scan means no *known* vulnerability as of that database, which is why scanning is continuous rather than a gate you pass once." }
    ] },

    { t: "callout", kind: "insight", title: "Rebuilding regularly beats patching reactively",
      body: [
        { t: "p", text: "Most base-image CVEs are fixed by rebuilding on a current base, which means the useful control is a **scheduled rebuild** rather than a scramble per advisory. It also exercises the build, so the build still works when you urgently need it — the same argument lesson 3.1 made for a scheduled retrain." },
        { t: "p", text: "Which creates a tension with lesson 4.3's advice to pin the base by digest: pinning makes the environment reproducible, and never moving the pin accumulates vulnerabilities. The resolution is that the pin is **updated deliberately on a schedule** and the update is a reviewed change with the gate from lesson 3.2 behind it — not that the pin is omitted." }
      ] },

    { t: "exercise", kind: "practice", title: "Extract a secret from your own image", difficulty: "core", minutes: 30,
      prompt: "Build an image that copies a dummy credential file in, uses it, and removes it with `RUN rm`. Then `docker save` it, extract the tar, and find the credential in one of the layer tars — this takes about three commands and is the only way the lesson lands. Also run `docker history --no-trunc` and look for any ARG or secret that appears in a command string. Then fix it with a BuildKit secret mount and repeat the extraction to confirm the secret is gone. Finally audit a real image: does it run as root, does it drop capabilities, is its root filesystem writable, and does anything in your CI mount the daemon socket.",
      hints: [
        "`docker save img -o img.tar && tar -xf img.tar` gives you the layer tars; grep across all of them.",
        "`docker history --no-trunc` prints the command strings, which is where an ARG-passed token is visible with no extraction at all.",
        "The socket audit is the highest-value item: it is usually in a CI job nobody reviews, and it is root on the host."
      ],
      solution: {
        body: [
          { t: "p", text: "Doing the extraction yourself is what changes behaviour. The measurement in this lesson used synthetic tars to show the mechanism cleanly; against a real image it takes three commands, and the fact that it needs no exploit and no privilege beyond pull access is the part that is hard to un-learn." },
          { t: "p", text: "The `docker history` check often finds something worse than a file, because an ARG-passed token is in the command string and needs no extraction. And the socket audit usually finds one CI job that mounts it, which is a root-on-host grant sitting in a config file nobody has read in a year." }
        ]
      } }

  ],

  takeaways: [
    "**`RUN rm` removes nothing from a previous layer.** An earlier layer's tar is immutable and content-addressed; the deletion records a whiteout marker in a later layer.",
    "**Measured**: `rm -rf /root/.aws` produced two zero-byte whiteout files, and the 63-byte credential was read straight back out of layer 1 in full.",
    "**Anyone with `docker pull` has the secret** — `docker save` plus `tar -xf` is the whole attack, with no exploit and no privilege.",
    "**It is undetectable from the running container**, which genuinely does not have the file, so inspecting the container tells you nothing.",
    "**Fix 1, the better one: a BuildKit secret mount** — present for one instruction, in no layer in any stage.",
    "**Fix 2: a multi-stage build whose secret-holding stage is discarded** — correct, but the credential remains in the local build cache, which matters on a shared builder.",
    "**Build arguments are worse than files.** `ARG TOKEN` lands in the layer's command string and `docker history` prints it with no extraction at all.",
    "**Root in a container is uid 0 on the shared kernel**, separated only by namespaces — so an escape lands as host root, and granted capabilities are granted to root.",
    "**Create the user with an explicit high uid, `--chown` the copies, and set `USER` after the installs** — each of those orderings matters.",
    "**Three cheap flags remove most of the surface**: `--read-only` with a tmpfs, `--cap-drop=ALL`, `--security-opt no-new-privileges`.",
    "**Mounting the daemon socket is root on the host, in one step** — the daemon runs as root and its API has no authorisation model.",
    "**A scanner compares package versions to a CVE database.** It does not see your secret, does not know what is reachable, cannot see your own code, and is only as fresh as its database.",
    "**Scheduled rebuilds beat per-advisory scrambles**, and the resolution with digest pinning is that the pin is updated deliberately on a schedule, not omitted."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A Dockerfile copies a credentials file, uses it, then runs `RUN rm -rf /root/.aws`. Is the secret in the image?",
        options: [
          "No — the file is deleted, so the final filesystem does not contain it",
          "Yes, in full: the earlier layer's tar is immutable and the deletion only writes a whiteout marker, so `docker save` plus `tar -xf` recovers it",
          "Only if the build used `--no-cache`"
        ],
        answer: 1,
        why: "Measured in this lesson: the `rm` produced two zero-byte whiteout files while the 63-byte credential sat untouched in layer 1 and was read straight back out. The running container genuinely cannot see the file, which is what makes this undetectable by inspecting a container."
      },
      {
        stem: "Your CI job mounts `/var/run/docker.sock` into a build container. What does that grant?",
        options: [
          "The ability to build and run containers, scoped to that container's namespace",
          "Root on the host — the daemon runs as root with no authorisation model, so the client can start a privileged container that bind-mounts the host's root filesystem",
          "Read-only access to the daemon's container list"
        ],
        answer: 1,
        why: "There is no privilege separation in the daemon API: any client that can reach the socket can do anything the daemon can, and starting a `--privileged` container with `/` mounted is one obvious step. This is why rootless builders and daemonless tools exist."
      },
      {
        stem: "An image scan comes back clean. What has it established?",
        options: [
          "The image contains no secrets and no vulnerable code",
          "Only that no installed package matches a known CVE in that database as of that moment — it cannot see baked-in secrets, your own code, or which CVEs are reachable",
          "That the image is safe to run as root"
        ],
        answer: 1,
        why: "A scanner enumerates packages and compares versions. The 63-byte credential from this lesson matches no CVE and appears in no package manifest, so a clean scan is entirely consistent with a leaked credential. Secret scanning is a separate tool, and reachability is a separate question again."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How do you handle secrets in a Docker build?",
        strong: "With a BuildKit secret mount, because the only reliable rule is that the secret must never enter a layer. `RUN --mount=type=secret,id=x` makes it available for one instruction and it lands in no layer in any stage. What does not work is copying it in and deleting it: I have extracted a credential straight out of layer 1 of an image after a `RUN rm -rf` — the deletion only writes a zero-byte whiteout marker, the earlier tar is immutable, and `docker save` plus `tar -xf` recovers the secret in full with no exploit and no privilege beyond pull access. Build arguments are worse still, because an ARG-passed token ends up in the layer's command string and `docker history` prints it directly. Multi-stage with a discarded stage is acceptable, with the caveat that the secret stays in the local build cache.",
        answer: [
          { t: "p", text: "Having actually extracted one is the detail that makes this answer land. The whiteout mechanism is the explanation that turns 'do not do that' into 'here is why it cannot work'." },
          { t: "p", text: "Ranking the options — secret mount, then discarded stage with a caveat, and ARG as actively worse — shows judgement rather than a single memorised answer." }
        ]
      },
      {
        level: "senior",
        q: "What is your container security checklist, and what does it not cover?",
        strong: "Four things in the image and build: no secret ever written to a layer, a non-root user with an explicit uid, capabilities dropped to none with a read-only root filesystem and no-new-privileges, and a base pinned by digest with a scheduled rebuild. One thing in the platform: nothing mounts the daemon socket, because that is root on the host in one step with no exploit. What that does not cover is most of the real surface. A scanner compares package versions to a CVE database, so it cannot see a baked-in secret, cannot see my own code, and does not know which CVEs are reachable — which is how a hundred-finding report becomes something nobody reads. It also does not cover the application: a published database port, an unauthenticated endpoint, or a prompt-injection path through retrieved documents are all invisible to it.",
        answer: [
          { t: "p", text: "Pairing the checklist with its limits is what makes this senior; a list alone invites the follow-up about false confidence." },
          { t: "p", text: "The reachability point is the practically important one, because unprioritised scan output is the usual reason container scanning produces no security improvement at all." }
        ]
      }
    ]
  }
});
