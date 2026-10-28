EC.receiveLesson({
  id: "3.1",

  lede: "A retraining script and a retraining pipeline differ in six specific ways, and none of them is about the training code. A scheduler in sixty lines demonstrates all six on a real graph: when `validate` fails, `train`, `evaluate` and `register` come back **SKIPPED rather than FAILED** — so nothing trained on unvalidated data; a re-run with the same id shows the two ingests **CACHED**, so a fix does not re-download; a flaky task succeeds on **attempt 3 of 3**; three logical dates backfill independently; and a cycle is refused at plan time with **zero tasks executed**. Those six properties belong to the runner, and a script gets you none of them.",

  objectives: [
    "Distinguish FAILED from SKIPPED and say why the difference matters operationally",
    "Explain what idempotency means for a pipeline task and how a marker implements it",
    "Separate a schedule from a trigger, and a logical date from a wall-clock time",
    "Say which of a scheduler's six guarantees your current setup actually has"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", id: "why", text: "Why a graph and not a script",
      sub: "The training code is the same either way" },

    { t: "p", text: "Retraining starts life as `retrain.py`, and for a while that is correct — it is the simplest thing that works and it has no dependencies. What eventually breaks is never the modelling. It is that the script is a single unit of failure: when step four of seven dies at 3 a.m., somebody has to work out which steps completed, whether re-running the whole thing is safe, and whether the half-written artifact from the previous attempt is still on disk." },

    { t: "p", text: "A scheduler does not make the training better. It makes **failure a first-class outcome** rather than an exception, and that is the whole of its value." },

    { t: "code", lang: "python", title: "m31.py — the retraining graph",
      code: `needs = {
    "ingest_txns": [],
    "ingest_crm":  [],
    "validate":    ["ingest_txns", "ingest_crm"],
    "features":    ["validate"],
    "train":       ["features"],
    "evaluate":    ["train"],
    "register":    ["evaluate"],
}
return {n: Task(n, make(n), needs[n], retries=2) for n in names}` },

    { t: "diagram", kind: "flow", id: "dg-3_1-01-0",
      title: "The retraining graph, with its one fan-in",
      caption: "Seven tasks, and the shape matters: **`validate` is a fan-in, so it cannot start until both ingests finish**, and everything downstream of it is gated on validation passing. That ordering is what makes the failure behaviour in section 3 possible.",
      cols: 4,
      nodes: [
        { id: "it", label: "ingest_txns", sub: "transactions", tone: "accent" },
        { id: "ic", label: "ingest_crm", sub: "customer records", tone: "accent" },
        { id: "v", label: "validate", sub: "lesson 1.5's checks", tone: "amber" },
        { id: "f", label: "features", sub: "as-of joins, lesson 1.4", tone: "violet" },
        { id: "t", label: "train", sub: "with the run record, 1.2", tone: "violet" },
        { id: "e", label: "evaluate", sub: "the gate, lesson 3.2", tone: "good" },
        { id: "r", label: "register", sub: "promote, lesson 15.1", tone: "good" }
      ],
      edges: [["it", "v"], ["ic", "v"], ["v", "f"], ["f", "t"], ["t", "e"], ["e", "r"]] },

    { t: "p", text: "The scheduler is deliberately small, because the point is that these properties are cheap. The interesting part is the first four lines of the loop." },

    { t: "code", lang: "python", title: "m31.py — the executor, and the SKIPPED decision",
      code: `def run_dag(tasks, run_id, log):
    """Execute in dependency order. A task whose upstream failed is SKIPPED,
    which is a different outcome from FAILED and must be reported as one."""
    for name in toposort(tasks):
        t = tasks[name]
        bad = [d for d in t.needs if status.get(d) not in ("SUCCESS", "CACHED")]
        if bad:
            status[name] = "SKIPPED"
            log.append((run_id, name, "SKIPPED", 0, "upstream %s" % ",".join(bad)))
            continue
        if os.path.exists(marker(run_id, name)):
            status[name] = "CACHED"
            continue
        # ... attempt, retry with backoff, write marker on success` },

    { t: "h2", n: "02", id: "order", text: "Dependency order, and a cycle refused",
      sub: "Before any side effect happens" },

    { t: "p", text: "The order comes from a topological sort over task names, iterated in sorted order so the result is **deterministic** — two runs of the same graph execute in the same sequence, which matters when you are comparing logs from a good run and a bad one." },

    { t: "p", text: "More importantly, the sort is where a malformed graph is caught." },

    { t: "code", lang: "python", title: "m31.py — a cycle, refused at plan time",
      out: `== run 6: a cycle, refused before anything executes ==
  ValueError: cycle through evaluate
  refused at plan time: zero tasks ran, so no partial state exists.` },

    { t: "p", text: "**Zero tasks ran.** That is the property worth naming: validation of the graph happens before execution, so a configuration mistake cannot leave half a pipeline's side effects behind. A script discovers its own structural problems by running into them, at which point the ingests have already happened." },

    { t: "callout", kind: "good", title: "Plan, then execute — and refuse unknown dependencies too",
      body: [
        { t: "p", text: "The same sort also rejects a dependency on a task that does not exist (`%s needs unknown task %s`), which is the commonest real error — a typo in a task name, or a task renamed without updating its consumers." },
        { t: "p", text: "Both failures are configuration errors, and both are free to catch at plan time. Any orchestrator worth adopting does this; the thing to check is whether *your* definition is validated in CI rather than on first run at 3 a.m." }
      ] },

    { t: "h2", n: "03", id: "failure", text: "FAILED and SKIPPED are different outcomes",
      sub: "The most useful distinction a runner makes" },

    { t: "p", text: "Now the case the whole design exists for. `validate` is made to fail — exactly the scenario from lesson 1.5, where a batch arrives with income in the wrong units." },

    { t: "code", lang: "python", title: "m31.py — validate fails",
      out: `== run 2: validate fails (retried twice, then gives up) ==
  task           status    attempts note
  ingest_txns    SUCCESS   1
  ingest_crm     SUCCESS   1
  validate       FAILED    3        RuntimeError: deliberate failure in validate
  features       SKIPPED   -        upstream validate
  train          SKIPPED   -        upstream features
  evaluate       SKIPPED   -        upstream train
  register       SKIPPED   -        upstream evaluate
  -> FAILED 1, SKIPPED 4, SUCCESS 2` },

    { t: "p", text: "One FAILED, four SKIPPED, two SUCCESS. Read what that buys. **Nothing trained on unvalidated data**, because `train` never executed — and therefore nothing was evaluated, nothing was registered, and no model with a corrupt lineage exists to be accidentally promoted later." },

    { t: "p", text: "The distinction between the two words is not cosmetic. **FAILED means this task is broken; SKIPPED means this task is fine and was never given a chance.** When the on-call engineer opens the run, there is exactly one thing to look at — and when it is fixed, the four skipped tasks need no investigation at all." },

    { t: "callout", kind: "trap", title: "A script's version of this is an exception and a dirty tree",
      body: [
        { t: "p", text: "The same failure in `retrain.py` raises in the middle of the process. Whether `features` ran depends on where the exception was thrown, and the answer lives in a stack trace rather than in a status table. Worse, the ingests *did* happen, so re-running the script re-downloads them." },
        { t: "p", text: "That last point is why people start wrapping steps in `if not os.path.exists(...)` guards — which is the beginning of reimplementing a scheduler, badly, inside the training script." }
      ] },

    { t: "h2", n: "04", id: "idempotent", text: "Idempotency, via a marker",
      sub: "A re-run does the remaining work, not all the work" },

    { t: "p", text: "`validate` is fixed and the **same run id** is executed again." },

    { t: "code", lang: "python", title: "m31.py — the re-run",
      out: `== run 3: same run_id after the fix ==
  task           status    attempts note
  ingest_txns    CACHED    -        marker present
  ingest_crm     CACHED    -        marker present
  validate       SUCCESS   1
  features       SUCCESS   1
  train          SUCCESS   1
  evaluate       SUCCESS   1
  register       SUCCESS   1
  -> CACHED 2, SUCCESS 5` },

    { t: "p", text: "The two ingests are **CACHED**. The expensive, externally-dependent, rate-limited part of the pipeline is not repeated, because a marker on disk records that it completed for this run id. Five tasks run instead of seven, and the two that did not are precisely the two you least want to repeat." },

    { t: "p", text: "The implementation is three lines, and the discipline is the hard part: the marker must be written **after** the task's side effect is durable, never before. A marker written first turns a crash mid-task into a permanently skipped step — the task will be believed complete for ever." },

    { t: "callout", kind: "insight", title: "Idempotency is a property you design into the task",
      body: [
        { t: "p", text: "The marker makes the *scheduler* skip the task. It does not make the task itself safe to run twice, and that is a separate obligation. A task that appends rows is not idempotent; one that writes a partition identified by the logical date is. A task that increments a counter is not; one that sets a value is." },
        { t: "p", text: "The test to apply: **run it twice and compare the output**. If the second run changes anything, a retry — which will happen — corrupts your data. Lesson 14.3 is the same problem for a retried side effect in a serving path, where the stakes are higher because you cannot simply re-run." }
      ] },

    { t: "h2", n: "05", id: "retries", text: "Retries, and what they must not absorb",
      sub: "Attempt 3 of 3" },

    { t: "code", lang: "python", title: "m31.py — a flaky ingest",
      out: `== run 4: ingest_crm fails twice, succeeds on attempt 3 ==
  task           status    attempts note
  ingest_txns    SUCCESS   1
  ingest_crm     SUCCESS   3
  validate       SUCCESS   1
  ...
  -> SUCCESS 7` },

    { t: "p", text: "`ingest_crm` raises twice and succeeds on the third attempt, with exponential backoff between tries. The run is a success and nobody is woken up, which is correct: a transient network error at 3 a.m. is not an incident." },

    { t: "p", text: "But the `attempts` column is retained and reported, and that matters. A task that habitually succeeds on attempt three is an upstream system degrading, and the information is only visible because the count survived the success. **A retry that leaves no trace converts a reliability signal into silence.**" },

    { t: "callout", kind: "trap", title: "Never retry a deterministic failure",
      body: [
        { t: "p", text: "The `validate` failure above was retried twice before giving up, which wasted two attempts on something that could never succeed — a schema violation does not become valid on the third try. That is a flaw in the demonstration graph, which gave every task `retries=2` uniformly." },
        { t: "p", text: "Retry policy belongs per task and per exception type: a connection error or a 503, yes; a validation failure, a `KeyError`, a bad schema, no. LangGraph's `default_retry_on` makes the same distinction as a deny list, and lesson 14.2 covers the serving-side version with circuit breakers." }
      ] },

    { t: "h2", n: "06", id: "backfill", text: "Logical dates and backfill",
      sub: "The reason a run has an id at all" },

    { t: "p", text: "Every run above was keyed by a date — `2026-10-28`, `2026-10-29` — and that key is not a timestamp of when it executed. It is the **logical date**: the period the run is *about*. The distinction is what makes the next measurement possible." },

    { t: "code", lang: "python", title: "m31.py — three dates, run now",
      out: `== run 5: a backfill over three logical dates ==
  2026-10-25  7/7 tasks ok
  2026-10-26  7/7 tasks ok
  2026-10-27  7/7 tasks ok
  each date is an independent run with its own state, which is what
  makes a backfill possible at all.` },

    { t: "p", text: "Three historical dates processed in the present, each with its own independent task state and its own markers. That is a backfill, and it is available only because every task is parameterised by the logical date rather than by `datetime.now()`." },

    { t: "callout", kind: "trap", title: "`datetime.now()` in a task is the bug that prevents backfill",
      body: [
        { t: "p", text: "A task that computes its window from the current time cannot be re-run for last Tuesday: it will produce today's answer under last Tuesday's label. This is exactly lesson 1.4's point-in-time failure arriving through a different door — `WHERE ts >= CURRENT_DATE - 90` is the same mistake expressed in SQL." },
        { t: "p", text: "The rule is that **the logical date is an input to every task**, and `now()` does not appear anywhere in pipeline code. It is also what makes a pipeline testable, because you can run it for a date whose correct output you already know." }
      ] },

    { t: "p", text: "And one more distinction the date exposes: a **schedule** is time-based and a **trigger** is event-based. A nightly retrain is a schedule. *Retrain when the drift monitor fires* is a trigger — and after lesson 1.1, a bad one, since input drift alerted for eleven consecutive months while the model was fine. Lesson 11.4 takes the question of what should actually trigger a retrain." },

    { t: "h2", n: "07", id: "ledger", text: "The six guarantees",
      sub: "And which ones you currently have" },

    { t: "code", lang: "python", title: "m31.py — the summary",
      out: `== what the runner gave you that a script does not ==
  dependency order          deterministic topological sort
  failure propagation       SKIPPED != FAILED, and nothing downstream ran
  idempotency               CACHED on re-run, via a per-task marker
  retries                   transient errors absorbed (attempt 3 of 3)
  backfill                  the same graph per logical date
  cycle detection           refused at plan time, before side effects` },

    { t: "diagram", kind: "matrix", id: "dg-3_1-07-0",
      title: "The six guarantees, and where they come from",
      caption: "Sixty lines bought all six. **The reason to adopt Airflow, Prefect or Dagster is not these properties** — it is the UI, the operator library, the metadata database and the fact that someone else maintains it. If you are writing the scheduler, you are paying for the guarantees twice.",
      rows: ["Dependency order", "FAILED vs SKIPPED", "Idempotency", "Retries", "Backfill", "Cycle detection"],
      cols: ["Mechanism", "A bare script's version"],
      cells: [
        [{ text: "deterministic toposort", tone: "good" }, { text: "the order you wrote the lines in", tone: "warn" }],
        [{ text: "upstream status check", tone: "good" }, { text: "an exception and a stack trace", tone: "crit" }],
        [{ text: "a marker per task per run", tone: "good" }, { text: "if not os.path.exists guards", tone: "warn" }],
        [{ text: "per-task count and backoff", tone: "good" }, { text: "a while loop, usually untraced", tone: "warn" }],
        [{ text: "logical date as an input", tone: "good" }, { text: "impossible if now() is used", tone: "crit" }],
        [{ text: "refused at plan time", tone: "good" }, { text: "found by running into it", tone: "crit" }]
      ] },

    { t: "p", text: "Two honest notes to finish. The marker scheme here is a file on local disk, which fails the moment two workers run the same graph — a real scheduler keeps task state in a database with locking, and that is a genuine reason to use one. And none of this addresses *data* dependencies: the graph knows `features` runs after `validate`, but not that `features` should wait for a partition to be complete. That is what sensors and data-aware scheduling are for, and it is where the managed services in lesson 3.5 earn their keep." },

    { t: "exercise", kind: "practice", title: "Audit your retraining for the six", difficulty: "core", minutes: 30,
      prompt: "Take your retraining process and answer six questions with evidence rather than belief. When a middle step fails, does the log distinguish broken from never-ran? If you re-run after a fix, which steps repeat — and specifically, do the ingests? Which tasks are retried, and is the retry conditional on the exception type or blanket? Can you run the pipeline for a date three weeks ago, and if not, find the `now()` that prevents it. Is the pipeline definition validated in CI, or discovered to be malformed at runtime? And finally, pick your most expensive task and run it twice against the same logical date, then diff the output — if it changed, a retry corrupts your data.",
      hints: [
        "Grep for `datetime.now`, `CURRENT_DATE`, `today()` and `max(ts)` in pipeline code. Each one is a backfill you cannot do.",
        "The run-it-twice test is the only one of the six that cannot be answered by reading the config.",
        "A blanket retry on a validation error is worse than no retry: it delays the failure and hides the cause."
      ],
      solution: {
        body: [
          { t: "p", text: "The two findings that recur: retries are blanket rather than per-exception, so deterministic failures burn three attempts and arrive later with a less useful error; and at least one task is not idempotent, usually one that appends rather than overwrites a partition." },
          { t: "p", text: "The `now()` audit is the highest-value grep in the list. It is the same defect as lesson 1.4's `CURRENT_DATE` window, and finding it in pipeline code usually means the training set has been built from a window relative to the build date all along." }
        ]
      } }

  ],

  takeaways: [
    "**A scheduler does not improve the training; it makes failure a first-class outcome.** All six of its guarantees are properties of the runner, not of your model code.",
    "**FAILED and SKIPPED are different outcomes.** When `validate` failed, train/evaluate/register came back SKIPPED — one thing to investigate, and nothing trained on unvalidated data.",
    "**A cycle was refused at plan time with zero tasks executed**, so a configuration error cannot leave half the pipeline's side effects behind. Unknown dependencies are caught the same way.",
    "**Idempotency showed as CACHED**: a re-run after the fix skipped both ingests and ran five tasks instead of seven.",
    "**Write the marker after the side effect is durable.** A marker written first turns a mid-task crash into a permanently skipped step.",
    "**The scheduler skipping a task is not the same as the task being safe to run twice.** Test by running it twice and diffing: appends are not idempotent, partition overwrites are.",
    "**Retries absorbed a flaky ingest at attempt 3 of 3**, and the attempt count survived into the log — a task that habitually needs three attempts is a degrading upstream.",
    "**Never retry a deterministic failure.** The demo graph wasted two attempts on a schema violation; retry policy belongs per task and per exception type.",
    "**A run is keyed by a logical date, not a wall-clock time**, which is the only reason a backfill over three historical dates was possible.",
    "**`datetime.now()` in a task is the bug that prevents backfill** — and it is lesson 1.4's `CURRENT_DATE` window arriving through a different door.",
    "**A schedule is time-based, a trigger is event-based**, and after lesson 1.1 'retrain when drift fires' is a bad trigger: it would have fired for eleven straight months.",
    "**A local-disk marker fails with two workers**, and the graph knows nothing about data readiness — which is what real schedulers and sensors are for."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your data validation task fails. What should the status of the downstream training task be?",
        options: [
          "FAILED, since the pipeline as a whole did not succeed",
          "SKIPPED — it is not broken, it was never given a chance, and the distinction means one task to investigate instead of five",
          "SUCCESS with a warning, so the run can complete"
        ],
        answer: 1,
        why: "SKIPPED also carries the operational guarantee that matters: train never executed, so nothing was fitted on unvalidated data and no model with corrupt lineage exists to be promoted later. The third option is how corrupt data reaches a model."
      },
      {
        stem: "A task writes its completion marker before performing its work rather than after. What goes wrong?",
        options: [
          "Nothing, as long as the marker is removed on failure",
          "A crash mid-task leaves the marker in place, so the task is believed complete for ever and is silently skipped on every re-run",
          "The task will be retried indefinitely"
        ],
        answer: 1,
        why: "The marker is an assertion that the side effect is durable, so it must follow the side effect. The first option is not reliable: a process killed by the OOM killer or a node eviction gets no chance to clean up."
      },
      {
        stem: "Why can a pipeline containing `datetime.now()` not be backfilled?",
        options: [
          "Because the scheduler cannot override the system clock",
          "Because the task computes its window from the present rather than from the run's logical date, so re-running it for a past date produces today's answer under that date's label",
          "Because backfills must run in chronological order"
        ],
        answer: 1,
        why: "This is lesson 1.4's point-in-time failure in a different syntax — `WHERE ts >= CURRENT_DATE - 90` is the same defect. The logical date must be an input to every task, which is also what makes a pipeline testable against a known-correct output."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Why use an orchestrator instead of a cron job running a script?",
        strong: "Because a script makes failure an exception and an orchestrator makes it a status. Concretely, six things: deterministic dependency order; the distinction between FAILED and SKIPPED, so a validation failure means nothing downstream trained on bad data and there is one task to investigate rather than five; idempotency, so a re-run after a fix does not re-download the ingests; per-task retries with the attempt count retained; backfill, because runs are keyed by a logical date rather than wall-clock time; and cycle detection at plan time, before any side effect. I wrote a sixty-line scheduler that demonstrates all six, which is also the point — the properties are cheap, so adopt Airflow or Dagster for the UI, the operator library and the metadata store, not for these.",
        answer: [
          { t: "p", text: "Enumerating the guarantees rather than naming tools is what makes this answer strong, and the FAILED-versus-SKIPPED distinction is the one that signals real operational experience." },
          { t: "p", text: "Saying the properties are cheap, and that you buy the product for other reasons, shows judgement rather than enthusiasm." }
        ]
      },
      {
        level: "senior",
        q: "What makes a pipeline task idempotent, and why does it matter?",
        strong: "It matters because retries happen, so every task will eventually run twice whether you planned for it or not. A task is idempotent if running it twice against the same logical date leaves the same output — which means writing a partition keyed by that date rather than appending, and setting values rather than incrementing. The test is to run it twice and diff the output; nothing in the configuration can tell you. I would separate two things that get conflated: the scheduler skipping an already-complete task via a marker, which is caching, and the task itself being safe to repeat, which is a property of how it writes. The marker also has to be written after the side effect is durable, or a crash mid-task makes the step permanently skipped.",
        answer: [
          { t: "p", text: "Separating scheduler-level caching from task-level safety is the senior distinction; most answers treat the marker as the whole of idempotency." },
          { t: "p", text: "The run-it-twice-and-diff test is concrete and is the one thing that cannot be established by reading code." }
        ]
      },
      {
        level: "senior",
        q: "When should a retrain be triggered?",
        strong: "Almost never by a drift alert, which is the usual answer. I measured a case where a KS test on an input feature fired from month two and reached p of 1e-87 while accuracy was flat and AUC improved — so an automatic drift trigger would have run eleven unnecessary retrains, each one a cost and a risk of regression. What I want is a schedule for the routine case, because it is predictable and testable, plus a trigger on something correlated with harm: a model-quality metric once labels arrive, or a business metric, or a human-adjudicated review sample. And the retrain has to end at a promotion gate rather than at a deploy, so a retrain producing a worse model does not ship — which means the trigger decides whether to try, not whether to release.",
        answer: [
          { t: "p", text: "The measured counterexample is what makes this answer land, and the separation between triggering a retrain and promoting its output is the part most people miss." },
          { t: "p", text: "A scheduled retrain being 'predictable and testable' is worth saying: it exercises the pipeline regularly, so the pipeline still works when you urgently need it." }
        ]
      }
    ]
  }
});
