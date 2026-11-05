EC.receiveLesson({
  id: "8.3",

  lede: "Three tools that come up in every ML incident and are rarely taught together. **Finding what is listening** is the first command of a connectivity problem, and `ss -ltnp` answers it where `ping` cannot. **SSH port forwarding** is how you reach a notebook or a dashboard inside a cluster without exposing it — and `-L` versus `-R` is the one thing to get right. And **enough shell to write a wrapper that fails loudly**, because the default is a script that continues after an error and reports success: `set -euo pipefail` is four changes in one line, and the `pipefail` half is the one that catches `python train.py | tee log` returning the exit code of `tee`.",

  objectives: [
    "Diagnose a connection problem by layer, with the right command at each",
    "Use local and remote SSH forwarding, and say which direction each one is",
    "Write a shell wrapper that stops on error, including inside a pipeline",
    "Use a Makefile as the one-command interface to a project"
  ],

  prerequisites: ["8.2"],

  blocks: [

    { t: "h2", n: "01", id: "listening", text: "What is listening, and on which address",
      sub: "The first command, and the bind-address trap" },

    { t: "p", text: "A connection refused has a short list of causes, and they are distinguished by layer. The mistake is to start with `ping`, which tests ICMP reachability and says nothing about a port — a host can answer pings with every port closed, and plenty of networks drop ICMP while passing TCP." },

    { t: "code", lang: "bash", title: "The four questions, in order",
      code: `# 1. is anything listening, and on what address?
$ ss -ltnp | grep 8000
LISTEN 0 2048 127.0.0.1:8000  users:(("python",pid=4411,fd=8))

# 2. can I reach the port from here?
$ curl -sS -o /dev/null -w '%{http_code} %{time_total}s\\n' http://host:8000/healthz

# 3. is the name resolving to what I think?
$ getent hosts loan-api.default.svc.cluster.local

# 4. what is the connection actually doing?
$ ss -tnp state established '( dport = :5432 )' | wc -l   # pool size in use` },

    { t: "p", text: "The first command contains the trap. **`127.0.0.1:8000` means loopback only** — reachable from inside that network namespace and from nowhere else. A server bound to localhost inside a container is unreachable from another container and from the host, however correct the port mapping is. A server bound to `0.0.0.0:8000` accepts from any interface." },

    { t: "callout", kind: "trap", title: "This is why lesson 4.3's command says `--host 0.0.0.0`",
      body: [
        { t: "p", text: "Uvicorn's default bind address is `127.0.0.1`, which is correct for local development and wrong in a container: lesson 4.1 established that a container has its own network namespace, so loopback is the container's own loopback and nothing outside it can connect." },
        { t: "p", text: "The symptom is a container that passes its own health check — the probe runs inside, via localhost — and refuses every external connection. In Kubernetes that is a pod that is `Ready` and serves nothing, and `ss -ltnp` showing `127.0.0.1` is the whole diagnosis." }
      ] },

    { t: "p", text: "The fourth command is the one that matters for lesson 14.1's connection-pool exhaustion: counting established connections to the database port tells you how much of the pool is in use, which is otherwise invisible — the symptom is latency, and the cause is requests queueing for a connection rather than for the model." },

    { t: "h2", n: "02", id: "ssh", text: "SSH forwarding, in the direction you need",
      sub: "`-L` brings it to you, `-R` sends yours out" },

    { t: "p", text: "Forwarding is the standard way to reach something that is deliberately not exposed — a notebook on a GPU box, a database, a dashboard inside a cluster — without opening it to a network." },

    { t: "code", lang: "bash", title: "Both directions, and the one that needs care",
      code: `# LOCAL (-L): a port on MY machine tunnels to something the REMOTE can see.
# "give me localhost:8888, served from the GPU box's localhost:8888"
ssh -N -L 8888:localhost:8888 gpu-box

# Note the hostname is resolved ON THE REMOTE. To reach a database the GPU
# box can see but you cannot:
ssh -N -L 5432:db.internal:5432 gpu-box

# REMOTE (-R): a port on the REMOTE tunnels back to something I can see.
# Rarer, and the direction to think twice about -- it exposes your machine.
ssh -N -R 9000:localhost:9000 jump-host

# For Kubernetes there is a purpose-built equivalent, and it is safer
# because it needs no SSH access to a node at all:
kubectl port-forward svc/loan-api 8000:8000` },

    { t: "p", text: "The mnemonic that works: **`-L` is *local*, so the port you type is on your machine**, and traffic flows outward. `-R` is *remote*, the port is on the far side, and traffic flows back toward you." },

    { t: "p", text: "The detail that catches people is in the second example: **the destination hostname is resolved on the remote host, not yours.** `-L 5432:db.internal:5432` works even though `db.internal` does not resolve for you — that is the point. Writing `localhost` there means the remote's localhost." },

    { t: "callout", kind: "good", title: "`-N` and a config entry are the two quality-of-life fixes",
      body: [
        { t: "p", text: "`-N` means *do not run a command*, so you get a tunnel instead of a shell you did not want. Add `-f` to background it." },
        { t: "p", text: "And `~/.ssh/config` removes the rest of the friction — a `Host gpu-box` block with the user, key, `LocalForward 8888 localhost:8888`, and `ServerAliveInterval 30` so the tunnel does not silently die on an idle NAT. For a host reachable only through a bastion, `ProxyJump bastion` is one line and replaces a nested `ssh -J` incantation." }
      ] },

    { t: "p", text: "One security note, since this is how ML teams usually expose notebooks. A forwarded Jupyter is only as private as the SSH session; a notebook bound to `0.0.0.0` with no token on a machine with a public IP is a remote code execution service. Bind to localhost and forward — that is the combination, and it is why the bind-address check in section 1 cuts both ways." },

    { t: "h2", n: "03", id: "shell", text: "A wrapper that fails loudly",
      sub: "Four fixes in one line" },

    { t: "p", text: "The default behaviour of a shell script is to keep going after an error and exit 0. For a training wrapper that means a failed data download is followed by a successful-looking training run on yesterday's file." },

    { t: "code", lang: "bash", title: "The line, and what each part does",
      code: `#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'

# -e            exit on any command that fails
# -u            exit on an undefined variable, so a typo is an error not ""
# -o pipefail   a pipeline fails if ANY stage fails, not just the last
# IFS           so unquoted expansion splits on newlines/tabs, not spaces` },

    { t: "p", text: "**`pipefail` is the one that matters for ML**, because of one specific idiom:" },

    { t: "code", lang: "bash", title: "The bug pipefail fixes",
      code: `# Without pipefail: the pipeline's status is tee's, which is 0.
# train.py can crash and the script continues, reporting success.
python train.py | tee train.log

# With pipefail, the pipeline fails when python does.
set -o pipefail
python train.py | tee train.log

# And PIPESTATUS has the per-stage codes if you need them:
echo "python exited \${PIPESTATUS[0]}"` },

    { t: "p", text: "Piping a training run through `tee` to keep its log is completely standard, and without `pipefail` it swallows the exit code of the thing you care about. A CI job built on that script reports green on a crashed training run — which is lesson 3.2's point that CI must assert something real, arriving one layer down." },

    { t: "callout", kind: "trap", title: "`set -e` has holes, and a trap covers the cleanup",
      body: [
        { t: "p", text: "`set -e` does **not** exit for a command in a condition (`if cmd; then`), nor for one followed by `||`, nor — more surprisingly — for a failure inside a function called in a command substitution. It is a large improvement and not a guarantee, so a wrapper that must not continue should check explicitly at the points that matter." },
        { t: "p", text: "And because `-e` exits abruptly, cleanup needs `trap 'rm -rf \"$TMPDIR\"' EXIT`, which runs on normal exit, on error, and on SIGTERM. That is the shell version of lesson 3.1's marker discipline: the cleanup has to be attached to the exit rather than written after the work." }
      ] },

    { t: "p", text: "Two smaller habits worth the keystrokes: **quote every expansion** (`\"$VAR\"`, `\"$@\"`), because an unquoted variable containing a space becomes two arguments and a path with a space is an ML dataset reality; and **`mktemp -d`** rather than a fixed `/tmp/work`, so two concurrent runs do not share a directory — cron's missing overlap protection from lesson 8.2 makes that concrete." },

    { t: "h2", n: "04", id: "make", text: "A Makefile as the project's interface",
      sub: "Self-documenting, and one real gotcha" },

    { t: "p", text: "A Makefile is the cheapest way to give a repository one obvious entry point for every routine task, and it is self-documenting if you add four lines." },

    { t: "code", lang: "makefile", title: "The shape worth copying",
      code: `.PHONY: help lint test train serve
.DEFAULT_GOAL := help

PY := /opt/venv/bin/python

help:  ## list the targets
	@grep -E '^[a-z-]+:.*?##' $(MAKEFILE_LIST) | \\
	  awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\\n", $$1, $$2}'

lint:  ## ruff and mypy, the PR pipeline's first stage
	ruff check . && $(PY) -m mypy src

test:  ## unit tests only
	$(PY) -m pytest -q tests/unit

train: ## retrain for a logical date: make train AS_OF=2026-10-28
	$(PY) -m src.retrain --as-of $(AS_OF)

serve: ## run the service locally with reload
	$(PY) -m uvicorn src.app:app --reload --port 8000` },

    { t: "p", text: "**`.PHONY`** is the gotcha. Make's model is *build this file if its dependencies are newer*, so a target named `test` with a file called `test` in the directory does nothing at all, reporting *'test' is up to date*. Declaring targets phony says they are commands rather than files. A `train` target in a repository containing a `train/` directory is exactly this trap." },

    { t: "p", text: "Two more mechanics: **each line runs in its own shell**, so `cd foo` on one line and a command on the next does not do what it looks like — join them with `&&` or set `.ONESHELL`. And **tabs, not spaces**, for recipe indentation; the error message for a space is `missing separator`, which names nothing useful." },

    { t: "p", text: "The `train` target taking `AS_OF` is deliberate: it is lesson 3.1's logical date surfaced as the interface, so a backfill is `make train AS_OF=2026-10-25` rather than an edit to a script." },

    { t: "h2", n: "05", id: "together", text: "The triage order",
      sub: "What to run, in which sequence" },

    { t: "diagram", kind: "steps", id: "dg-8_3-05-0",
      title: "A connectivity problem, by layer",
      caption: "**Skip `ping`.** It tests ICMP, which many networks drop and which says nothing about a port — and the first command already distinguishes the two commonest causes.",
      items: [
        { label: "ss -ltnp on the server side", desc: "Is anything listening, and on 127.0.0.1 or 0.0.0.0? A loopback bind is unreachable from another namespace." },
        { label: "curl with a timeout from the client side", desc: "Separates 'refused' (nothing listening) from 'timed out' (a firewall dropping) from 'slow' (working, overloaded)." },
        { label: "Resolve the name explicitly", desc: "getent hosts, or nslookup. In Kubernetes a Service name that resolves and refuses is lesson 5.2's empty Endpoints." },
        { label: "Count established connections", desc: "ss -tnp state established to the dependency's port makes pool exhaustion visible, since its symptom is latency." }
      ] },

    { t: "exercise", kind: "practice", title: "Three small things, each on a real system", difficulty: "intro", minutes: 25,
      prompt: "First, run `ss -ltnp` inside a container you operate and record the bind address of your service — if it is 127.0.0.1 you have found a pod that passes its own health check and serves nothing externally. Second, reach something deliberately unexposed through a tunnel: forward a port to a database or dashboard with `ssh -N -L`, or `kubectl port-forward`, and note which side the hostname resolved on. Third, take a shell script in your repository and add `set -euo pipefail`, then find out whether anything breaks — a script that relied on a failing command continuing is a script that was reporting success wrongly. Specifically check for any `| tee` and confirm the exit code now comes from the left side.",
      hints: [
        "In a container, `ss` may not be installed; `cat /proc/net/tcp` or adding the probe's own URL to `curl` from another container both work.",
        "For `-L`, the destination hostname resolves on the remote host — that is what lets you reach a database your own machine cannot resolve.",
        "The `| tee` check is the highest-value one: without pipefail a crashed training run exits 0 and CI goes green."
      ],
      solution: {
        notes: [
          { t: "p", text: "The bind-address check is quick and occasionally finds the whole problem: uvicorn and Flask both default to localhost, which is right for development and wrong in a container, and the resulting pod is Ready while refusing every external connection." },
          { t: "p", text: "Adding `pipefail` to an existing script usually breaks something, and that is the finding rather than a regression — a pipeline that was silently swallowing a failure has been reporting success for however long it has existed." }
        ]
      } }

  ],

  takeaways: [
    "**Do not start with `ping`** — it tests ICMP, which many networks drop, and says nothing about whether a port is open.",
    "**`ss -ltnp` is the first command**, and its most useful output is the bind address: `127.0.0.1` is loopback-only and unreachable from another network namespace.",
    "**That is why lesson 4.3 passes `--host 0.0.0.0`.** Uvicorn defaults to localhost, producing a pod that passes its own health check and refuses every external connection.",
    "**`curl` separates refused from timed out from slow**, which are three different causes: nothing listening, a firewall dropping, and overload.",
    "**`-L` is local: the port you type is on your machine** and traffic flows outward; `-R` is the reverse and exposes your side.",
    "**With `-L`, the destination hostname resolves on the remote host**, which is what lets you reach a database your own machine cannot resolve.",
    "**`-N` gives a tunnel without a shell**, and `~/.ssh/config` with `LocalForward`, `ServerAliveInterval` and `ProxyJump` removes the rest of the friction.",
    "**A notebook bound to 0.0.0.0 without a token is a remote code execution service** — bind to localhost and forward.",
    "**`set -euo pipefail`** is four fixes: exit on error, exit on an undefined variable, fail a pipeline if any stage fails, and sane word splitting.",
    "**`pipefail` is the ML-critical one**: `python train.py | tee train.log` otherwise returns `tee`'s exit code, so a crashed run exits 0 and CI goes green.",
    "**`set -e` has holes** — conditions, `||` chains, functions in command substitution — so check explicitly where it matters, and use `trap ... EXIT` for cleanup.",
    "**Quote every expansion and use `mktemp -d`**, because dataset paths contain spaces and cron has no overlap protection.",
    "**`.PHONY` is the Makefile gotcha**: a `train` target in a repo with a `train/` directory silently reports 'up to date'.",
    "**Each Makefile line is its own shell**, and recipes are indented with tabs — the error for a space is `missing separator`.",
    "**Surface the logical date as a Make variable**, so a backfill is `make train AS_OF=2026-10-25` rather than an edit."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pod reports Ready but every external request is refused. `ss -ltnp` inside shows `127.0.0.1:8000`. What is wrong?",
        options: [
          "The Service's target port does not match the container port",
          "The server is bound to loopback, which is reachable only within that container's network namespace — so the probe succeeds from inside while nothing external can connect",
          "The readiness probe is checking the wrong path"
        ],
        answer: 1,
        why: "The readiness probe runs inside the pod and reaches localhost successfully, which is exactly why this passes its own health check and serves nothing. Uvicorn and Flask both default to 127.0.0.1, which is correct for development and wrong in a container — hence `--host 0.0.0.0`."
      },
      {
        stem: "Your script runs `python train.py | tee train.log`. Training crashes. What is the script's exit code without `pipefail`?",
        options: [
          "Non-zero, inherited from python",
          "Zero — a pipeline's status is its last command's, and `tee` succeeded, so the failure is swallowed and CI reports green",
          "Non-zero, because `set -e` catches it"
        ],
        answer: 1,
        why: "`set -e` does not help: the pipeline as a whole succeeded. `set -o pipefail` makes the pipeline fail when any stage does, and `PIPESTATUS` holds the per-stage codes. This idiom is completely standard for keeping a training log, which is what makes the bug common."
      },
      {
        stem: "You run `ssh -N -L 5432:db.internal:5432 gpu-box`, and `db.internal` does not resolve on your machine. Does it work?",
        options: [
          "No — the hostname must resolve locally for the forward to be set up",
          "Yes: the destination hostname is resolved on the remote host, which is the point of the forward — you reach a database the GPU box can see and you cannot",
          "Only if you add the host to your /etc/hosts first"
        ],
        answer: 1,
        why: "This is the detail that makes `-L` useful rather than merely a port shuffle. The corollary is that writing `localhost` as the destination means the *remote's* localhost, which is what the notebook-forwarding case relies on."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "A service is unreachable. How do you diagnose it?",
        strong: "By layer, and not starting with ping — ping tests ICMP, which many networks drop and which says nothing about a port. First `ss -ltnp` on the server side, because its most useful output is the bind address: 127.0.0.1 is loopback-only, so a server bound there inside a container is unreachable from another container or the host however the ports are mapped, and it will still pass its own health check because the probe runs inside. That one check finds a surprising share of cases. Then `curl` with a timeout from the client, which distinguishes refused — nothing listening or a filter — from timed out, which is a firewall dropping, from slow, which means it works and is overloaded. Then resolve the name explicitly, since in Kubernetes a Service name that resolves and refuses is an empty Endpoints list, meaning a label mismatch or no ready pod.",
        answer: [
          { t: "p", text: "Rejecting ping with a reason, and leading with the bind address, both signal real debugging rather than a memorised checklist." },
          { t: "p", text: "The refused/timed-out/slow distinction is the practically useful part, because the three have completely different causes and the same user-visible symptom." }
        ]
      },
      {
        level: "senior",
        q: "What do you put at the top of a shell script, and why?",
        strong: "`set -euo pipefail` and a sane IFS. The `-e` exits on error, `-u` turns a typo'd variable into an error rather than an empty string, and `pipefail` is the one that matters most for ML: `python train.py | tee train.log` is a completely standard idiom, and without pipefail the pipeline's status is tee's, so a crashed training run exits 0 and a CI job built on that script reports green. I would also be honest that `set -e` has holes — it does not fire for a command in a condition, one followed by `||`, or a failure inside a function in a command substitution — so a wrapper that must not continue still needs explicit checks at the points that matter. And because `-e` exits abruptly, cleanup goes in a `trap ... EXIT` rather than at the end of the script, which is the same discipline as writing a pipeline task's completion marker after the work rather than before.",
        answer: [
          { t: "p", text: "The tee example is the detail that makes this concrete and ML-specific, and it connects to the broader point that CI must assert something real." },
          { t: "p", text: "Volunteering that `set -e` is incomplete is what distinguishes someone who has debugged a script that continued after a failure from someone who has read the recommendation." }
        ]
      },
      {
        level: "mid",
        q: "How do you reach a notebook on a GPU box without exposing it to the network?",
        strong: "Bind it to localhost on the box and forward the port over SSH: `ssh -N -L 8888:localhost:8888 gpu-box`. `-L` means the port I type is on my machine and traffic flows outward, `-N` gives me a tunnel rather than a shell I did not want, and `localhost` in the destination means the remote's localhost, because the destination is resolved on the far side. That last fact is also how I reach a database the box can see and I cannot: `-L 5432:db.internal:5432`. The combination is the point. A notebook bound to 0.0.0.0 with no token on a machine with a public IP is a remote code execution service, so the bind address and the tunnel go together. Inside a cluster I would use `kubectl port-forward` instead, since it needs no SSH access to a node. And I would put the host in `~/.ssh/config` with `ServerAliveInterval` so the tunnel does not die quietly on an idle NAT.",
        answer: [
          { t: "p", text: "Saying where the destination hostname resolves is what shows you have used a tunnel rather than copied one." },
          { t: "p", text: "Naming the failure it prevents, an open notebook as remote code execution, turns a convenience into a security decision." }
        ]
      }
    ]
  }
});
