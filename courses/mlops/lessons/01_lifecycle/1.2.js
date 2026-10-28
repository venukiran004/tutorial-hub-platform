EC.receiveLesson({
  id: "1.2",

  lede: "Lesson 1.1 ended with a model that had silently become worthless and no way to answer *what produced this*. A tracking store is the answer, and it is small enough to build — about fifty lines, written here and run over a real six-run sweep. Two results came out of running it that are worth more than the code. The whole hyperparameter sweep moved AUC by **0.3 points**, from 0.8512 to 0.8540, while **two runs that recorded different `max_iter` values produced byte-identical metrics** because early stopping halted both at **73 iterations** — so the hyperparameter in the log was not the hyperparameter that ran. And the git state recorded alongside them says `dirty=True`, which means the commit id on its own was already a lie.",

  objectives: [
    "List what has to be recorded for the question 'which run produced this model' to have an answer",
    "Build a run store with content-derived run ids and an append-only log, and say why both of those choices matter",
    "Distinguish the three fingerprints — data, code, environment — and name the failure each one catches alone",
    "Recognise that a requested hyperparameter is not necessarily the realised one, and log accordingly"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", id: "question", text: "The question this exists to answer",
      sub: "Not 'what were my metrics' but 'what produced this file'" },

    { t: "p", text: "A tracking store is usually introduced as a place to keep metrics so you can compare experiments. That undersells it, and it gets the priority wrong. Comparing experiments is a *research* convenience. The operational need is different and much sharper: there is a model file serving traffic right now, and somebody has to be able to say what produced it." },

    { t: "p", text: "That question decomposes into four, and each one is answerable only if something recorded it at the time:" },

    { t: "dl", items: [
      { k: "Which run?", v: "An identifier that connects the artifact in production to one specific training execution. Without it, every subsequent question is unanswerable." },
      { k: "On what data?", v: "Not a filename or a row count — those are reused and overwritten. The content of the rows that were actually fitted." },
      { k: "With what code?", v: "A commit, plus whether the working tree was clean. A commit id from a dirty tree describes code that was never what ran." },
      { k: "In what environment?", v: "The library versions that can change a result without anybody touching the code. This is the one teams omit and the one that bites a year later." }
    ] },

    { t: "callout", kind: "mental", title: "Tracking is provenance, not a leaderboard",
      body: [
        { t: "p", text: "If you only ever read the tracking store when choosing a model, you have built a leaderboard. You find out whether you built a **provenance** system during an incident, when the question is not *which is best* but *what is this, and can I rebuild it*." }
      ] },

    { t: "diagram", kind: "flow", id: "dg-1_2-01-0",
      title: "From a prediction in production back to the data that caused it",
      caption: "Each arrow is a recorded identifier, and the chain is only as strong as its weakest link. **A missing environment hash does not weaken the chain, it severs it** — you can reach the code and the data and still be unable to reproduce the number, with no way to tell why.",
      cols: 3,
      nodes: [
        { id: "p", label: "A prediction", sub: "with a model version header", tone: "accent" },
        { id: "a", label: "A model artifact", sub: "models/<run_id>.pkl", tone: "accent" },
        { id: "r", label: "One run", sub: "run_id, params, metrics", tone: "violet" },
        { id: "d", label: "A data fingerprint", sub: "sha256 of the fitted bytes", tone: "good" },
        { id: "c", label: "A code state", sub: "commit + dirty flag", tone: "good" },
        { id: "e", label: "An environment", sub: "python, numpy, sklearn", tone: "good" }
      ],
      edges: [["p", "a"], ["a", "r"], ["r", "d"], ["r", "c"], ["r", "e"]] },

    { t: "h2", n: "02", id: "store", text: "The store, in fifty lines",
      sub: "Two design choices that are not arbitrary" },

    { t: "p", text: "Neither MLflow nor Weights & Biases is installed on this machine, and rather than transcribe their call signatures it is more useful to build the thing they are. Knowing how small the mechanism is tells you which parts of a tracking product are essential and which are hosting, UI and collaboration — which is exactly the judgement you need when someone asks whether to adopt one." },

    { t: "code", lang: "python", title: "m12.py — a run, recorded",
      code: `class Run(object):
    def __init__(self, name, store=STORE):
        self.rec = {"name": name, "params": {}, "metrics": {},
                    "artifacts": {}, "tags": {}}
        self.store = store

    def __enter__(self):
        self.t0 = time.time()
        # A run id derived from content, not a counter: two processes can
        # write to the same store without coordinating.
        self.rec["run_id"] = _sha(("%s|%.9f|%d" % (self.rec["name"], self.t0,
                                                   os.getpid())).encode())[:12]
        self.rec["started"] = time.strftime("%Y-%m-%dT%H:%M:%S",
                                            time.gmtime(self.t0))
        return self

    def param(self, **kw):   self.rec["params"].update(kw)
    def metric(self, **kw):  self.rec["metrics"].update({k: float(v) for k, v in kw.items()})
    def artifact(self, **kw): self.rec["artifacts"].update(kw)
    def tag(self, **kw):     self.rec["tags"].update(kw)

    def __exit__(self, *exc):
        self.rec["seconds"] = round(time.time() - self.t0, 3)
        self.rec["status"] = "FAILED" if exc[0] else "FINISHED"
        with open(self.store, "a") as f:
            f.write(json.dumps(self.rec, sort_keys=True) + "\\n")
        return False` },

    { t: "p", text: "Two decisions in there are worth defending, because they are the ones that distinguish a store you can trust from a spreadsheet." },

    { t: "p", text: "**The run id is derived from content, not from a counter.** An auto-incrementing id needs a single writer, or a lock, or a database. A hash of name, time and pid needs nothing: six parallel sweeps on six machines can append to the same store and never collide. This is the same reasoning that makes git's object ids hashes, and it is why distributed tracking works at all." },

    { t: "p", text: "**The store is append-only, and a failed run is still written.** `__exit__` records `status: FAILED` and then re-raises by returning `False`. A store that only contains successes is a store that cannot tell you whether a configuration was tried — and *we tried that and it crashed* is information somebody will spend a day rediscovering." },

    { t: "callout", kind: "trap", title: "The context manager has to write on the exception path",
      body: [
        { t: "p", text: "If the write were at the end of the `with` body instead of in `__exit__`, every crashed run would vanish — and crashed runs are disproportionately the interesting ones. Returning `False` from `__exit__` is what lets the exception continue to propagate after the record is safely on disk." }
      ] },

    { t: "h2", n: "03", id: "triple", text: "Three fingerprints",
      sub: "And the specific failure each one catches" },

    { t: "p", text: "The data fingerprint is the one people get wrong, so it is worth being explicit. It hashes the **bytes that were fitted**, together with dtype and shape — not the path, not the row count, not the modification time. A path gets overwritten. A row count collides constantly. The bytes are the only thing that answers *was this the same data*." },

    { t: "code", lang: "python", title: "m12.py — the three fingerprints",
      code: `def data_fingerprint(*arrays):
    """Content hash of the actual bytes that went into training."""
    h = hashlib.sha256()
    for a in arrays:
        a = np.ascontiguousarray(a)
        h.update(str(a.dtype).encode())
        h.update(str(a.shape).encode())
        h.update(a.tobytes())
    return h.hexdigest()

def env_fingerprint():
    """The versions that can change a result without anybody noticing."""
    parts = {"python": platform.python_version(), "numpy": np.__version__,
             "sklearn": sklearn.__version__, "platform": platform.platform()}
    return parts, _sha(json.dumps(parts, sort_keys=True).encode())

def git_state(cwd=REPO):
    sha = subprocess.run(["git", "rev-parse", "HEAD"], ..., cwd=cwd)
    dirty = subprocess.run(["git", "status", "--porcelain"], ..., cwd=cwd)
    return sha.stdout.strip()[:12], bool(dirty.stdout.strip())`,
      out: `== the lineage triple, recorded once per run ==
  data   sha256  da3c0eafec79665c  (14000 rows, the bytes themselves)
  code   sha256  7fb1b7f368fa90be  (this file)
  env    sha256  9bc920eece49819e  {"python": "3.11.3", "numpy": "2.4.4", "sklearn": "1.8.0", "...
  git            967ccb72d5cf  dirty=True` },

    { t: "p", text: "Look at the last line of that output. The commit is `967ccb72d5cf` and `dirty=True`, because the working tree had uncommitted changes when the sweep ran. That flag is the difference between a provenance record and a misleading one: **the commit id alone would have pointed at code that is not what executed.** Anyone trying to reproduce this run by checking out that commit would get a different program and no indication of why their numbers differed." },

    { t: "callout", kind: "good", title: "Record the dirty flag, and refuse to promote on it",
      body: [
        { t: "p", text: "Capturing `dirty` costs one subprocess call. The policy that makes it valuable is separate: a run with `dirty=True` may be used for exploration and may not be promoted to production. That turns an unreproducible model from something you discover later into something the pipeline declines to ship — which is lesson 3.2's quality gate." }
      ] },

    { t: "diagram", kind: "matrix", id: "dg-1_2-03-0",
      title: "What each fingerprint catches on its own",
      caption: "No single fingerprint is sufficient, and the diagonal shows why: each one is blind to exactly the failures the others catch. **The combination is what makes 'I cannot reproduce this' a diagnosable statement** rather than a shrug — the mismatching hash names the cause.",
      rows: ["Data hash", "Code hash / commit", "Dirty flag", "Environment hash"],
      cols: ["Catches", "Blind to"],
      cells: [
        [{ text: "the dataset was regenerated or filtered", tone: "good" }, { text: "a changed library, a changed script", tone: "warn" }],
        [{ text: "the training script changed", tone: "good" }, { text: "uncommitted edits, new data", tone: "warn" }],
        [{ text: "the commit id is not what ran", tone: "good" }, { text: "everything else", tone: "warn" }],
        [{ text: "numpy or sklearn moved under you", tone: "good" }, { text: "data and code changes", tone: "warn" }]
      ] },

    { t: "h2", n: "04", id: "sweep", text: "Six runs, and two surprises",
      sub: "The sweep barely mattered and the log was wrong" },

    { t: "p", text: "With the store in place, a six-point sweep over the loan model from 1.1 — varying `max_iter`, `learning_rate` and `max_depth`, with every run recording its params, its metrics, its artifact path and the three fingerprints." },

    { t: "code", lang: "python", title: "m12.py — the sweep, and what each run records",
      code: `for g in GRID:
    with Run("loan-approval") as r:
        r.param(seed=SEED, rows=len(Xtr), **g)
        r.tag(data_sha=DATA_HASH[:16], code_sha=CODE_HASH[:16],
              env_sha=ENV_HASH[:16], git=GIT_SHA, git_dirty=GIT_DIRTY)
        m = HistGradientBoostingClassifier(random_state=0, **g).fit(Xtr, ytr)
        prob = m.predict_proba(Xte)[:, 1]
        r.metric(accuracy=accuracy_score(yte, m.predict(Xte)),
                 auc=roc_auc_score(yte, prob),
                 # The REALISED iteration count. Logging the requested value
                 # alone is how two runs come to look different and be the same.
                 n_iter_actual=m.n_iter_)
        r.param(early_stopping_effective=bool(m.do_early_stopping_))
        r.artifact(model="models/%s.pkl" % r.rec["run_id"])`,
      out: `== the sweep: six runs, each one recorded ==
  run_id        want  ran   lr     depth  acc      AUC      sec
  4d8e8c10a2bb   100   100   0.10   3      0.7738   0.8540   0.18
  27058881f9e1   100    73   0.10   6      0.7725   0.8512   0.24
  845198e09aef   250    73   0.10   6      0.7725   0.8512   0.56
  87f11e17176a   250   109   0.05   6      0.7712   0.8525   0.78
  9cc57f23bffb   250   105   0.05   None   0.7722   0.8527   0.76
  bc5efd9d24da   600   164   0.03   None   0.7695   0.8525   1.19` },

    { t: "p", text: "The first surprise is the AUC column. It runs from **0.8512 to 0.8540** — a spread of **0.3 points** across a sweep that varied the iteration budget sixfold and the depth from 3 to unlimited. The winner is the *smallest* configuration: 100 iterations at depth 3, which also trains in a fifth of the time of the largest. Whatever is limiting this model, it is not the hyperparameters." },

    { t: "callout", kind: "insight", title: "The spread is the number that tells you where to spend your time",
      body: [
        { t: "p", text: "A 0.3-point spread is the measurement that says *stop tuning*. The remaining error is in the data and the features, not the fit — and an afternoon of further sweeping has a known, tiny ceiling." },
        { t: "p", text: "You cannot know that without a store. With six runs in a notebook's scrollback the natural conclusion is *the big one won by a bit, ship it*, which costs five times the training time for nothing. The store's first dividend is usually a decision to stop." }
      ] },

    { t: "p", text: "The second surprise is more serious, and it is why the `ran` column is there at all." },

    { t: "code", lang: "python", title: "m12.py — the collision",
      out: `== the trap: requested max_iter vs the iterations actually run ==
  identical metrics (acc 0.7725, AUC 0.8512) from 2 runs:
    27058881f9e1  requested max_iter=100   actually ran 73    early_stopping=True
    845198e09aef  requested max_iter=250   actually ran 73    early_stopping=True
  -> the hyperparameter you logged is not the one that ran.` },

    { t: "p", text: "Two runs recorded different `max_iter` — 100 and 250 — and produced metrics identical to twelve decimal places. The reason is that `HistGradientBoostingClassifier` turns **early stopping on automatically** once the training set exceeds 10,000 rows, and here it halted both runs at **73 iterations**. The second run's extra 150-iteration budget was never used. The two models are the same model." },

    { t: "callout", kind: "trap", title: "Log the realised value, not the requested one",
      body: [
        { t: "p", text: "A store that recorded only `max_iter` would show two distinct configurations with suspiciously identical scores, and the obvious reading — *the metric saturates past 100 iterations* — is wrong. The truth is that the second configuration never happened." },
        { t: "p", text: "The rule generalises well beyond early stopping: anywhere a library can override, clamp or auto-tune what you asked for — `n_jobs`, a device placement, a dtype, a batch size reduced to fit memory, a `max_depth` of `None` resolved to something concrete — **log what the fitted object reports, not what you passed in**. Here that is one extra line: `n_iter_actual=m.n_iter_`." }
      ] },

    { t: "h2", n: "05", id: "answer", text: "Answering both questions",
      sub: "Which run, and can it be rebuilt" },

    { t: "p", text: "Now the store can be queried for the two things it was built for." },

    { t: "code", lang: "python", title: "m12.py — which run, and is it reproducible",
      code: `best = max(runs, key=lambda r: r["metrics"]["auc"])
# ... then refit from the recorded params against the recorded data
m2 = HistGradientBoostingClassifier(random_state=0, **recorded_params).fit(Xtr, ytr)
auc2 = roc_auc_score(yte, m2.predict_proba(Xte)[:, 1])`,
      out: `== question 1: which run is in production? ==
  best AUC        0.8540
  run_id          4d8e8c10a2bb
  params          {"early_stopping_effective": true, "learning_rate": 0.1, "max_depth": 3, "max_iter": 100, "rows": 14000, "seed": 20261028}
  artifact        models/4d8e8c10a2bb.pkl
  data / code / env  da3c0eafec79665c / 7fb1b7f368fa90be / 9bc920eece49819e

== question 2: can it be reproduced? ==
  re-run from the recorded params : AUC 0.853975
  recorded                        : AUC 0.853975
  identical                       : True` },

    { t: "p", text: "Reproduction is **bit-exact**: 0.853975 against 0.853975. That is worth noting because it is not guaranteed — lesson 3.4 is about the cases where it fails even with the seed fixed — but for a CPU tree ensemble with a fixed `random_state` and identical input bytes, it holds." },

    { t: "p", text: "The last experiment is the one that shows why the data hash is load-bearing. Same parameters, same code, same environment, same seed for the model — and a training set regenerated from a different draw." },

    { t: "code", lang: "python", title: "m12.py — same params, different data",
      out: `  now the same params against DIFFERENT data (seed+1):
    data sha  beef76acbb515a95  (vs da3c0eafec79665c)
    AUC       0.852670  (vs 0.853975, delta -0.0013)
    params identical, metrics differ -> without the data hash this
    looks like an unreproducible run rather than a different dataset.` },

    { t: "p", text: "The AUC moves by 0.0013. A small number, and that is exactly what makes it dangerous: it is far too small to look like a bug and far too large to be nothing when a promotion gate is comparing a candidate against an incumbent at a 0.005 threshold. With the data hash recorded, the mismatch is visible in one line — `beef76ac` is not `da3c0eaf` — and the question *why don't my numbers match* has an answer. Without it, the run is simply filed as irreproducible and somebody loses a morning." },

    { t: "diagram", kind: "steps", id: "dg-1_2-05-0",
      title: "The diagnosis a complete record makes possible",
      caption: "This is the sequence a tracking store turns from guesswork into four lookups. **The order matters: check the cheapest and most common cause first**, and in practice that is the data, because datasets are regenerated far more often than environments change.",
      items: [
        { label: "Compare the data hashes", desc: "Different? You are comparing two experiments, not reproducing one. The common case, and five seconds of work." },
        { label: "Compare the code hash and the dirty flag", desc: "Either differing means the program is not the same program, and a dirty original cannot be recovered at all." },
        { label: "Compare the environment hash", desc: "A numpy or sklearn minor version moves a metric in the third decimal, and explains the otherwise unaccountable." },
        { label: "Compare realised params, not requested ones", desc: "n_iter_actual, resolved depths, device and dtype: agreeing on requests is not agreeing on computations." }
      ] },

    { t: "p", text: "MLflow, Weights & Biases, Neptune and the rest are this, plus a server, a UI, artifact storage and a permission model. Those are real value — a shared store other people can read is categorically more useful than a JSONL file on your laptop. But the parts that make a model *reproducible* are the parts above, and a hosted tool will happily let you omit every one of them." },

    { t: "table",
      head: ["What the product adds", "What it will still let you get wrong"],
      rows: [
        ["A server, so runs are shared and survive your laptop", "Logging the requested hyperparameter instead of the realised one"],
        ["A UI for comparing runs and plotting curves", "Omitting the data fingerprint entirely"],
        ["Artifact storage with the run attached", "Promoting a model trained from a dirty working tree"],
        ["A model registry with stages and transitions", "Recording no environment, so a year-old run cannot be rebuilt"],
        ["Permissions, teams and audit", "Tracking only successful runs, so failed configurations are rediscovered"]
      ] },

    { t: "exercise", kind: "practice", title: "Interrogate your own store", difficulty: "intro", minutes: 25,
      prompt: "Take the most recent model your team put into production and try to answer four questions using only what was recorded at the time, without asking the person who trained it. Which run produced it? What were the exact bytes of its training data? What commit, and was the tree clean? What library versions? For each one you cannot answer, write down the single smallest change that would have made it answerable. Then pick any two runs from your store with suspiciously similar metrics and check whether the library silently overrode a parameter in both.",
      hints: [
        "'The data is in the warehouse' is not an answer unless the query and a snapshot or timestamp were recorded.",
        "If the dirty flag was never captured, treat every commit id in the store as unverified.",
        "Early stopping, n_jobs, auto dtype selection and memory-reduced batch sizes are the usual silent overriders."
      ],
      solution: {
        body: [
          { t: "p", text: "The common outcome is that run id and params are available, the data is identified only by a table name, and the environment is absent. That ordering is not an accident: params are what the tracking library makes easiest to log, and data and environment are what it leaves to you." },
          { t: "p", text: "The smallest useful fix is almost always the data fingerprint, because it is the one that converts *unreproducible* into *a different dataset* — and as the 0.0013 AUC difference above shows, you will otherwise spend the morning looking for a bug that is not there." }
        ]
      } }

  ],

  takeaways: [
    "**A tracking store is a provenance system, not a leaderboard.** The operational question is 'what produced the artifact serving traffic', and it is only answerable if something recorded it at the time.",
    "**The mechanism is about fifty lines**: an append-only JSONL log, a content-derived run id, and params/metrics/artifacts/tags per run.",
    "**Derive run ids from content, not a counter** — six parallel sweeps on six machines then append to one store without coordination, for the same reason git hashes its objects.",
    "**Write failed runs too.** `__exit__` records `status: FAILED` and returns `False` so the exception still propagates; a success-only store cannot tell you a configuration was already tried and crashed.",
    "**The data fingerprint hashes bytes, dtype and shape** — not the path, not the row count, both of which collide and get overwritten.",
    "**Record the git dirty flag.** The sweep here ran at commit `967ccb72d5cf` with `dirty=True`, so the commit id alone pointed at code that never executed.",
    "**The whole sweep moved AUC 0.3 points** (0.8512 to 0.8540), and the smallest configuration won — which is the measurement that tells you to stop tuning and go look at the features.",
    "**Two runs recorded max_iter 100 and 250 and were the same model**: early stopping, on automatically above 10,000 rows, halted both at 73 iterations.",
    "**Log the realised parameter, not the requested one** — `n_iter_actual=m.n_iter_`. The same applies to n_jobs, resolved depths, dtypes and memory-reduced batch sizes.",
    "**Reproduction was bit-exact** (0.853975 twice) with identical bytes, params, env and `random_state` — exactness is achievable here, though lesson 3.4 covers where it is not.",
    "**Same params on different data moved AUC by only 0.0013** — too small to look like a bug, large enough to flip a promotion gate, and instantly diagnosable from one mismatched hash."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two runs in your store have identical metrics to ten decimal places but different recorded hyperparameters. What is the most likely explanation?",
        options: [
          "A bug in the tracking code wrote the same metrics twice",
          "The library silently overrode the differing parameter, so both runs executed the same computation — measured here as early stopping halting max_iter=100 and max_iter=250 at the same 73 iterations",
          "The metric has saturated and is insensitive to that parameter"
        ],
        answer: 1,
        why: "Identical to ten decimals means the same computation, not a similar one. The third option is the tempting misreading: it concludes something about the model when the truth is that the second configuration never ran. Logging the realised value — n_iter_ — distinguishes them in one column."
      },
      {
        stem: "Your tracking store records run id, params, metrics and the git commit. A colleague cannot reproduce a three-month-old run. What is the first thing to check?",
        options: [
          "Whether the training data is the same bytes as it was then",
          "Whether the model's random seed was recorded",
          "Whether the metric was computed with the same function"
        ],
        answer: 0,
        why: "Data is regenerated, filtered and backfilled far more often than environments or metric code change, so it is both the most likely cause and the cheapest to check. Without a data fingerprint recorded at the time, though, this check is impossible — which is why it is the highest-value field to add to a store that lacks it."
      },
      {
        stem: "A run is recorded with commit 967ccb7 and dirty=True. What does the commit id tell you about the code that ran?",
        options: [
          "It identifies the code exactly, since the commit is the version that was checked out",
          "Almost nothing — there were uncommitted changes, so the tree that ran was not the tree at that commit and is not recoverable from it",
          "It identifies the code, and dirty only refers to untracked files"
        ],
        answer: 1,
        why: "This is why the flag is worth one subprocess call. The useful policy follows from it: dirty runs are fine for exploration and must not be promotable, which turns an unreproducible production model into a pipeline rejection."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What does an experiment tracking tool actually give you? Could you not use a spreadsheet?",
        strong: "A spreadsheet gives you a leaderboard. What you need is provenance: the ability to take the artifact currently serving traffic and recover the run, the exact training bytes, the commit plus whether the tree was clean, and the library versions. The mechanism is small — an append-only log with content-derived run ids is about fifty lines — so the question is not really build-versus-buy. It is whether you are recording the four things that make a model reproducible, and a hosted tool will let you omit all of them while still looking well-instrumented.",
        answer: [
          { t: "p", text: "Leading with provenance rather than comparison is what signals operational experience. The spreadsheet question is a trap only if you defend the tool instead of the requirement." },
          { t: "p", text: "Content-derived ids are a good concrete detail: they are why several machines can write one store without coordination, and it is the same argument as git's object model." }
        ]
      },
      {
        level: "senior",
        q: "Your team records hyperparameters and metrics for every run. Is that enough to reproduce a model?",
        strong: "No, and in two distinct ways. First, params and metrics say nothing about the data or the environment, so a mismatch is undiagnosable — I ran the same params on a regenerated dataset and the AUC moved 0.0013, which is too small to look like a bug and big enough to flip a promotion gate; with a data hash recorded it is one line to see, without it you lose a morning. Second, the recorded parameter may not be the one that ran: early stopping silently halted two runs that requested 100 and 250 iterations at the same 73, so they recorded different configurations and were the same model. So I record three fingerprints — data bytes, code commit plus a dirty flag, environment versions — and I log realised values off the fitted object rather than the requested ones.",
        answer: [
          { t: "p", text: "The two failure classes — missing context, and requested-versus-realised — are what make this a senior answer rather than a list of fields. Both come with a measured example, which is what stops it sounding like recitation." },
          { t: "p", text: "The dirty flag is the detail that usually lands hardest, because almost nobody records it and it invalidates the commit id completely. Pair it with the policy: dirty runs are not promotable." }
        ]
      },
      {
        level: "senior",
        q: "How do you decide when to stop hyperparameter tuning?",
        strong: "From the spread, not from the best score. In the sweep I ran, six configurations varying iteration budget sixfold and depth from 3 to unlimited produced an AUC spread of 0.3 points, and the smallest and fastest configuration won. That is a measurement saying the remaining error is in the data and the features rather than the fit, so further sweeping has a known and tiny ceiling. Without a store you see six numbers in a notebook, conclude the biggest one won by a hair, and pay five times the training cost for nothing.",
        answer: [
          { t: "p", text: "Framing the stopping rule as a property of the spread is the insight. It also reframes tracking as something that saves compute rather than something that documents it." },
          { t: "p", text: "A good follow-up to volunteer: the spread also tells you how large a promotion-gate threshold has to be before it is measuring a real improvement rather than sweep noise." }
        ]
      }
    ]
  }
});
