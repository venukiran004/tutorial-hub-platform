EC.receiveLesson({
  id: "8.2",

  lede: "One signal is a request a process may honour and the other is not deliverable to it at all, and that distinction is the whole of graceful shutdown. Measured four ways on a process writing a file: **only the combination of a handler and a handleable signal drained** — exit 0, 487 rows, `complete=True`. A handler with an unhandleable signal wrote nothing; no handler with either signal wrote nothing. Which is exactly lesson 4.3's shell-form `ENTRYPOINT` bug: `/bin/sh` as pid 1 does not forward SIGTERM, so the container is the *no handler* row, and after the grace period SIGKILL arrives — and nothing catches SIGKILL.",

  objectives: [
    "Distinguish a handleable signal from an unhandleable one, and say what each permits",
    "Explain why pid 1 has no default signal dispositions and what that obliges",
    "Diagnose a process from its state, RSS and open descriptors",
    "Choose between systemd and cron, and avoid cron's environment trap"
  ],

  prerequisites: ["8.1"],

  blocks: [

    { t: "h2", n: "01", id: "signals", text: "Two kinds of signal",
      sub: "Measured, with one platform surprise" },

    { t: "p", text: "A signal is a number delivered to a process. Most can be caught, so the process chooses what to do; two cannot — SIGKILL and SIGSTOP are handled by the kernel, which stops the process without giving it an instruction to run. That is the asymmetry everything else follows from." },

    { t: "callout", kind: "note", title: "A platform finding from running this",
      body: [
        { t: "p", text: "The first version of this measurement showed four identical rows, all writing nothing. The cause: on Windows, `Popen.terminate()` calls `TerminateProcess`, which is **not** SIGTERM — it is an immediate, unhandleable kill, so `terminate()` and `kill()` are the same operation and the distinction cannot be demonstrated." },
        { t: "p", text: "The deliverable signal on Windows is `CTRL_BREAK_EVENT`, which maps to `SIGBREAK` and can be handled. So the measurement below uses that as the handleable signal and `kill()` as the unhandleable one. On Linux the roles are SIGTERM and SIGKILL, and the mechanism is identical — which is the point, because the container semantics in lesson 4.3 are the Linux ones." }
      ] },

    { t: "code", lang: "python", title: "the worker, and what it does with a signal",
      code: `def on_sig(signum, frame):
    global stop
    stop = True                      # drain, do not die

if MODE == "graceful":
    for s in ("SIGBREAK", "SIGTERM", "SIGINT"):
        if hasattr(signal, s):
            signal.signal(getattr(signal, s), on_sig)

for i in range(1, 1000000):
    state["rows"] = i
    if stop:
        state["complete"] = True     # finish the record properly
        with open(OUT, "w") as fh:
            json.dump(state, fh)
        sys.exit(0)`,
      out: `  process              signal         exit     file on disk
  has a handler        handleable     0        complete=True rows=487
  has a handler        unhandleable   1        NOTHING WRITTEN
  no handler           handleable     3221225786 NOTHING WRITTEN
  no handler           unhandleable   1        NOTHING WRITTEN` },

    { t: "p", text: "**One row of four produced a complete file.** The handler sets a flag rather than writing from inside the handler — which is the correct shape, because a signal handler runs at an arbitrary point and should do as little as possible — and the main loop notices the flag, finishes the record, and exits 0." },

    { t: "p", text: "Every other row lost the work. The handler is useless against an unhandleable signal, and the signal is useless against a process with no handler." },

    { t: "callout", kind: "insight", title: "This is lesson 4.3's bug, in one table",
      body: [
        { t: "p", text: "Lesson 4.3 established that a shell-form `ENTRYPOINT` makes `/bin/sh` pid 1, and `sh` does not forward SIGTERM to its child. So the server is the **no handler** row: the signal arrives somewhere that ignores it, the grace period elapses — 10 seconds for `docker stop`, 30 in Kubernetes — and then SIGKILL arrives, which is the unhandleable column." },
        { t: "p", text: "The visible symptom is lesson 5.2's dropped requests on every deploy. The table is why: there is no configuration that rescues a process which never hears the request, because by the time the second signal arrives there is nothing to rescue it with." }
      ] },

    { t: "h2", n: "02", id: "pid1", text: "pid 1 is special, in two ways",
      sub: "Both of which a container exposes" },

    { t: "p", text: "Lesson 4.1 noted that a container is a process and your application is pid 1. That position carries two obligations an ordinary process does not have." },

    { t: "p", text: "**pid 1 has no default signal dispositions.** For a normal process, a signal with no handler gets the kernel's default action — usually terminate. For pid 1 the defaults do **not** apply, so an unhandled SIGTERM is simply *ignored*. This is why `docker stop` on a container running a shell script appears to do nothing for ten seconds: it is not slow, the signal was discarded." },

    { t: "p", text: "**pid 1 must reap children.** When a process exits, its parent must call `wait()` to collect the status; until then the entry stays as a zombie. Orphans are re-parented to pid 1, so pid 1 accumulates them unless it reaps. A normal init does this; a Python web server does not." },

    { t: "p", text: "For a single-process model server neither matters much — uvicorn handles SIGTERM and spawns nothing. It matters when the container runs something that forks: a training script using `multiprocessing`, a DataLoader with workers, or anything shelling out. Then `--init` (Docker) or a `tini` entrypoint supplies a real pid 1 that reaps, and your process runs as its child with ordinary semantics." },

    { t: "h2", n: "03", id: "diagnose", text: "Reading a process",
      sub: "State, memory and descriptors" },

    { t: "p", text: "Three things to look at, and for each one the number that is routinely misread." },

    { t: "p", text: "**State.** `R` running, `S` sleeping (waiting on something, which is normal), `D` uninterruptible sleep — almost always blocked on I/O — and `Z` zombie. A process in `D` cannot be killed, not even with SIGKILL, because it is inside a kernel call; that is the one case where *kill -9 did nothing* is literally true, and the fix is to resolve the I/O, usually a hung network mount." },

    { t: "p", text: "**Memory, and the number not to use.** `RSS` is resident set size, and it **double-counts shared pages**: fork four workers that share the parent's loaded libraries and the sum of their RSS far exceeds the memory actually used. Lesson 4.2 measured scipy at 112.7 MB installed — shared between workers, counted four times by naive summing." },

    { t: "callout", kind: "trap", title: "The cgroup's number is the one that gets you killed",
      body: [
        { t: "p", text: "For a container, what matters is not RSS but the cgroup's accounting — `container_memory_working_set_bytes` — because that is what the limit is enforced against. It **includes page cache** attributable to the cgroup, so a process that reads a large file accrues chargeable memory that is not its heap at all." },
        { t: "p", text: "This is why lesson 5.3 insisted on measuring under load rather than summing package sizes: a training job reading a 40 GB dataset can be OOMKilled for memory it never allocated, and the per-process RSS will not show it." }
      ] },

    { t: "p", text: "**Descriptors.** `lsof -p <pid>` lists what a process has open. Two ML-relevant failures live here: lesson 8.1's deleted-but-open file holding disk, and descriptor exhaustion — a client that opens a connection per request without closing it hits the limit and then fails with `Too many open files`, which reads like a disk error and is not." },

    { t: "h2", n: "04", id: "systemd", text: "systemd, and the two things it adds",
      sub: "Restart policy and resource limits" },

    { t: "p", text: "On a host that is not Kubernetes — lesson 6.2's on-prem GPU box, a jump host, a long-lived notebook server — systemd is what makes a process a service. The two fields worth getting right are the two Kubernetes gives you for free." },

    { t: "code", lang: "ini", title: "A unit for a model service on a bare host",
      code: `[Service]
ExecStart=/opt/venv/bin/uvicorn src.app:app --host 0.0.0.0 --port 8000
User=appuser
Restart=on-failure
RestartSec=5
# the restart loop needs a bound, or a crash on startup becomes a hot loop
StartLimitBurst=5
StartLimitIntervalSec=120

KillSignal=SIGTERM
TimeoutStopSec=45            # longer than the longest in-flight request

# the cgroup limits -- the same mechanism as lesson 5.3, different syntax
MemoryMax=2G
CPUQuota=200%
Environment=OMP_NUM_THREADS=2    # lesson 4.1: limits are not virtualised` },

    { t: "p", text: "**`Restart=on-failure` with a start limit** is the pairing that matters. Without the limit, a service that crashes immediately restarts immediately, for ever — the systemd equivalent of `CrashLoopBackOff`, except that Kubernetes applies exponential backoff by default and systemd does not." },

    { t: "p", text: "**`TimeoutStopSec` is the grace period**, and the same reasoning as lesson 5.2 applies: it must exceed the longest in-flight request, after which systemd sends SIGKILL. And `MemoryMax` is the same cgroup mechanism as a Kubernetes memory limit — so the OOMKill behaviour measured in lesson 5.3 is identical, including the 260.9 MB floor." },

    { t: "h2", n: "05", id: "cron", text: "cron, and the trap that is always the same",
      sub: "A different environment from your shell" },

    { t: "p", text: "A cron job runs with a **minimal environment**: usually `HOME`, `PATH` set to something short like `/usr/bin:/bin`, `SHELL`, and nothing else. Not your `PATH`, not your virtualenv, not your `AWS_PROFILE`, not the variables your shell profile exports — because no profile is sourced." },

    { t: "p", text: "Which produces the single most common cron failure: *it works when I run it by hand and does nothing from cron.* The command cannot find `python`, or finds the system one instead of the virtualenv's, and the error goes to an email nobody receives." },

    { t: "code", lang: "bash", title: "The four fixes, all of which are necessary",
      code: `# WRONG: relies on PATH, on the cwd, and discards the error
0 2 * * * python retrain.py

# RIGHT: absolute interpreter, absolute script, explicit cwd, captured output
0 2 * * * cd /opt/app && /opt/venv/bin/python -m src.retrain \\
  --as-of "$(date -u +\\%Y-\\%m-\\%d)" >> /var/log/retrain.log 2>&1` },

    { t: "p", text: "Four distinct fixes in that line. **The absolute interpreter path** removes the `PATH` dependency and pins the virtualenv. **The absolute working directory**, because cron starts in `HOME` and relative paths resolve differently. **Redirecting both streams to a file**, because cron's default is to mail output to the user, which on a server means it is lost. And **the escaped `%`** — cron treats `%` as a newline in the command field, which silently truncates a `date` format string and is the second-most-common cron bug." },

    { t: "callout", kind: "trap", title: "cron has no overlap protection and no state",
      body: [
        { t: "p", text: "If a nightly retrain takes longer than its interval, cron starts a second one anyway. Two training jobs writing the same checkpoint directory is a genuine corruption. `flock` is the standard guard: `flock -n /var/lock/retrain.lock -c '...'` exits rather than overlapping." },
        { t: "p", text: "And cron has no concept of a missed run. A machine down at 02:00 simply skips that night, with no record and no backfill — which is lesson 3.1's whole argument: a scheduler keyed by logical date can backfill, and a cron line cannot, because `date` inside it is wall-clock. `systemd` timers at least offer `Persistent=true` to run a missed job on boot." }
      ] },

    { t: "diagram", kind: "steps", id: "dg-8_2-05-0",
      title: "A process-level incident, in order",
      caption: "**The first step is the one that decides everything else**: a `D`-state process is not killable and the fix is elsewhere, while a `Z` means the parent is not reaping — which in a container means pid 1.",
      items: [
        { label: "Check the state first: R, S, D or Z", desc: "D is blocked I/O and survives SIGKILL: the one case where 'kill -9 did nothing' is true. Z means nothing is reaping." },
        { label: "Use the cgroup's working set, not the sum of RSS", desc: "RSS double-counts shared pages across workers and excludes page cache, which the cgroup charges you for." },
        { label: "List descriptors before blaming the disk", desc: "'Too many open files' is a descriptor limit, and a deleted-but-open file is lesson 8.1's held disk space." },
        { label: "Send the handleable signal and watch for a drain", desc: "One row of four drained in the measurement. No drain means no handler, or a shell between the signal and the process." }
      ] },

    { t: "exercise", kind: "practice", title: "Prove your service drains", difficulty: "core", minutes: 25,
      prompt: "For a containerised service you run, establish whether it actually handles shutdown. Send SIGTERM to pid 1 inside the container and watch the logs: a server that drains logs its shutdown sequence, one that does not logs nothing and then dies when the grace period expires. If it does not drain, check whether the entrypoint is exec form or shell form. Then check two process-level things: whether anything in the container forks — DataLoader workers, multiprocessing, a subprocess — and therefore needs a reaping init, and whether the grace period exceeds your measured p99 request duration. If you also run a cron job, check it for all four of the fixes in section 5.",
      hints: [
        "`kill -TERM 1` from inside the container is the test; `docker stop` conflates the signal with the timeout.",
        "`ps -ef` inside the container shows whether your process is pid 1 or a child of a shell.",
        "For the cron line, the escaped `%` is the one people have never heard of and it silently truncates the command."
      ],
      solution: {
        notes: [
          { t: "p", text: "The commonest finding is a shell-form entrypoint, which puts the service in the *no handler* row of the measurement: nothing drains, and the dropped requests on every deploy get blamed on the load balancer. The fix is one line and it is the difference between the one row of four that worked and the three that did not." },
          { t: "p", text: "The cron audit usually finds a bare `python` relying on PATH, which is why the job works by hand and silently does nothing on schedule — and if output is not redirected, the error went to a mail spool nobody reads." }
        ]
      } }

  ],

  takeaways: [
    "**Only one of four combinations drained**: a handler plus a handleable signal gave exit 0 and a complete file. A handler without a deliverable signal, or a signal without a handler, both lost the work.",
    "**SIGKILL and SIGSTOP cannot be caught** — the kernel acts without running your code, so no cleanup is possible by construction.",
    "**On Windows, `Popen.terminate()` is `TerminateProcess`, not SIGTERM**, so it is unhandleable; `CTRL_BREAK_EVENT` is the deliverable one. The mechanism is the same, the roles differ.",
    "**Set a flag in the handler, drain in the main loop.** A handler runs at an arbitrary point and should do as little as possible.",
    "**pid 1 has no default signal dispositions**, so an unhandled SIGTERM is ignored — which is why `docker stop` on a shell script seems to hang for ten seconds.",
    "**pid 1 must reap children**, so anything that forks — DataLoader workers, multiprocessing — needs `--init` or `tini` to supply a real init.",
    "**A `D`-state process survives SIGKILL**, because it is inside a kernel call; that is the one case where 'kill -9 did nothing' is literally true, and the fix is the blocked I/O.",
    "**RSS double-counts shared pages** across forked workers and excludes page cache; the cgroup's working set is the number the limit is enforced against.",
    "**`Too many open files` is a descriptor limit, not a disk problem** — and `lsof` also finds lesson 8.1's deleted-but-open files.",
    "**`Restart=on-failure` needs a start limit**, or a startup crash becomes a hot loop: systemd has no default backoff where Kubernetes does.",
    "**`TimeoutStopSec` is the grace period** and must exceed the longest in-flight request; `MemoryMax` is the same cgroup mechanism as a Kubernetes limit.",
    "**cron runs with a minimal environment and sources no profile**, which is why a job works by hand and does nothing on schedule.",
    "**Four fixes to every cron line**: absolute interpreter, explicit `cd`, redirect both streams, and escape `%` — which cron treats as a newline and silently truncates on.",
    "**cron has no overlap protection and no concept of a missed run** — `flock` for the first, and lesson 3.1's logical-date scheduler for the second."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your containerised server drops in-flight requests on every deploy. It has a SIGTERM handler. What is the most likely cause?",
        options: [
          "The handler is too slow and the grace period is too short",
          "A shell-form ENTRYPOINT: /bin/sh is pid 1 and does not forward SIGTERM, so the handler never runs — the 'no handler' row, after which SIGKILL arrives and cannot be caught",
          "SIGTERM cannot be handled by a Python process"
        ],
        answer: 1,
        why: "The measurement showed that a handler is useless if the signal never reaches the process. Exec form makes the server pid 1 so the signal is delivered. The first option is a real but different problem, and it is distinguishable because a drain would at least start to be logged."
      },
      {
        stem: "A process is in state `D` and `kill -9` has no effect. Why?",
        options: [
          "The process has a SIGKILL handler installed",
          "`D` is uninterruptible sleep inside a kernel call, so the signal cannot be delivered until that call returns — usually blocked I/O such as a hung network mount",
          "Only root can send SIGKILL to that process"
        ],
        answer: 1,
        why: "SIGKILL cannot be handled, so the first option is impossible. `D` is the one state where 'kill -9 did nothing' is literally true, and the fix is to resolve whatever I/O the process is blocked on rather than to try harder to kill it."
      },
      {
        stem: "A cron job runs `python retrain.py` and works when you run it by hand. From cron it silently does nothing. Why?",
        options: [
          "cron requires the full crontab path syntax for scripts",
          "cron provides a minimal environment and sources no profile, so `python` resolves differently or not at all — and with no output redirection the error goes to a mail spool nobody reads",
          "cron jobs cannot execute Python without a shebang"
        ],
        answer: 1,
        why: "Four fixes are needed together: an absolute interpreter path to pin the virtualenv, an explicit `cd` because cron starts in HOME, redirecting both streams to a file, and escaping `%` — which cron treats as a newline and which silently truncates a `date` format string."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between SIGTERM and SIGKILL?",
        strong: "SIGTERM is a request the process can catch and act on; SIGKILL is handled by the kernel and cannot be caught, so no cleanup code runs. I measured the consequence four ways on a process writing a file, and only one combination produced a complete file: a handler plus a deliverable signal. A handler against SIGKILL wrote nothing, and no handler against either signal wrote nothing. That table is exactly the container shutdown problem: a shell-form ENTRYPOINT makes /bin/sh pid 1 and sh does not forward SIGTERM, so the server is the no-handler row, the grace period elapses, and then SIGKILL arrives — which is why requests get dropped on every deploy and it is usually blamed on the load balancer.",
        answer: [
          { t: "p", text: "The four-way table is a compact way to show that both halves are required, and tying it to the container symptom makes it operational rather than trivia." },
          { t: "p", text: "Worth adding that the handler should set a flag rather than do work, since it runs at an arbitrary point in the program." }
        ]
      },
      {
        level: "senior",
        q: "Why does pid 1 behave differently in a container?",
        strong: "Two ways, and both bite. First, pid 1 has no default signal dispositions: for an ordinary process an unhandled signal gets the kernel's default action, usually terminate, but for pid 1 the defaults do not apply, so an unhandled SIGTERM is simply ignored. That is why `docker stop` on a container running a shell script appears to hang for ten seconds — it is not slow, the signal was discarded, and then SIGKILL arrives. Second, pid 1 is where orphans are re-parented, so it has to reap them or they accumulate as zombies. A single-process uvicorn does not care, because it handles SIGTERM and forks nothing. It matters as soon as the container runs something that forks — DataLoader workers, multiprocessing, a subprocess — and then `--init` or tini supplies a real init so my process runs as an ordinary child with ordinary semantics.",
        answer: [
          { t: "p", text: "The no-default-dispositions fact is the one most people have not internalised, and it explains a symptom everyone has seen." },
          { t: "p", text: "Scoping it correctly — irrelevant for a single-process server, necessary as soon as anything forks — shows judgement rather than a blanket recommendation to always use tini." }
        ]
      },
      {
        level: "mid",
        q: "A nightly retrain works when you run it by hand and does nothing from cron. Walk me through it.",
        strong: "I start from the fact that cron runs with a minimal environment and sources no profile, so `python` resolves differently or not at all, and with no redirection the error goes to a mail spool nobody reads. So first I capture the failure by redirecting both streams to a file. Then the line needs four fixes together: an absolute interpreter path to pin the virtualenv, an explicit `cd` because cron starts in HOME, the redirection, and escaping `%`, which cron treats as a newline and which silently truncates a `date` format. Beyond the line itself, cron has no overlap protection, so a retrain that outlasts its interval runs twice against the same checkpoint directory, and `flock` is the guard. It also has no concept of a missed run, so if the machine was down at 02:00 that night is simply gone. If either of those matters, this has outgrown cron and belongs in a scheduler keyed by logical date.",
        answer: [
          { t: "p", text: "Getting the error onto disk first is the step that separates diagnosis from guessing: everything after it is informed." },
          { t: "p", text: "Ending on what cron structurally cannot do shows you know when to stop patching the line and change the tool." }
        ]
      }
    ]
  }
});
