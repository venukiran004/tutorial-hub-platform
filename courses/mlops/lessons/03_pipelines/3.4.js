EC.receiveLesson({
  id: "3.4",

  lede: "*Set the seed* is the standard advice, and it is not sufficient. The same training code, the same seed and the same data were run in separate processes while varying only things nobody thinks of as inputs. Scikit-learn came out **bit-identical across 1, 2, 4 and 8 threads** — genuinely good news. Torch did not: three thread counts produced **three different digests**, with AUC 0.8511029338 against 0.8510956526. `PYTHONHASHSEED` produced **four different feature column orders** from the same source line. And rows arriving in a different order shifted a scaler's mean by **2.26e-10**, which propagated to predictions at **5.0e-16** and changed **zero of 6,000 decisions** — which is the finding that tells you which kind of reproducibility to demand.",

  objectives: [
    "Distinguish bit-exact reproducibility from behavioural reproducibility, and say which to require",
    "Name the inputs to a training run that are not in the code or the data",
    "Explain how set iteration order can produce training-serving skew with no code difference",
    "Decide what to pin, what to record, and what to accept as irreducible"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", id: "control", text: "The control, and the hidden inputs",
      sub: "Everything that is an input and is not in the repository" },

    { t: "p", text: "Lesson 1.2 found that re-running from the recorded parameters reproduced an AUC bit-exactly: 0.853975 twice. That is the control, and it establishes that the training code itself is deterministic." },

    { t: "code", lang: "python", title: "m34.py — the control",
      out: `== 1. the control: identical environment, twice ==
  run 1  threads=1  n_iter=44  AUC 0.8472806398  digest 0de6c888b8e33db9
  run 2  threads=1  n_iter=44  AUC 0.8472806398  digest 0de6c888b8e33db9
  bit-exact: True` },

    { t: "p", text: "The digest is a sha256 of the 6,000 held-out probabilities, so *bit-exact* means exactly that: every one of six thousand float64 values identical. Now the question is what else is an input." },

    { t: "p", text: "The method throughout is to run the same worker script in **separate processes**, because the interesting variables — thread counts and `PYTHONHASHSEED` — are read at interpreter or library start and cannot be changed from inside a running process. Anything that only reproduces within one process is not reproducibility." },

    { t: "diagram", kind: "flow", id: "dg-3_4-01-0",
      title: "The inputs to a training run, including the ones not in the repo",
      caption: "The top row is what people version. **The bottom row is equally an input and is usually unrecorded** — and three of the four were measured to change the result or the feature layout.",
      cols: 4,
      nodes: [
        { id: "c", label: "Code", sub: "commit + dirty flag", tone: "good" },
        { id: "d", label: "Data", sub: "content hash", tone: "good" },
        { id: "s", label: "Seed", sub: "random_state", tone: "good" },
        { id: "h", label: "Hyperparameters", sub: "realised, not requested", tone: "good" },
        { id: "t", label: "Thread count", sub: "torch: 3 digests", tone: "crit" },
        { id: "p", label: "PYTHONHASHSEED", sub: "4 column orders", tone: "crit" },
        { id: "o", label: "Row order", sub: "scaler mean 2.3e-10", tone: "warn" },
        { id: "l", label: "Library versions", sub: "env_sha, lesson 1.2", tone: "warn" }
      ],
      edges: [["c", "t"], ["d", "p"], ["s", "o"], ["h", "l"]] },

    { t: "h2", n: "02", id: "threads", text: "Thread count",
      sub: "Good news for sklearn, bad news for torch" },

    { t: "p", text: "Parallel reductions are the classic source of non-determinism: floating-point addition is not associative, so summing a histogram across four threads can give a different last bit from summing it across one." },

    { t: "code", lang: "python", title: "m34.py — scikit-learn across thread counts",
      out: `== 2. the same code, different OMP_NUM_THREADS ==
  OMP_NUM_THREADS=1   n_iter=44   AUC 0.8472806398  digest 0de6c888b8e33db9
  OMP_NUM_THREADS=2   n_iter=44   AUC 0.8472806398  digest 0de6c888b8e33db9
  OMP_NUM_THREADS=4   n_iter=44   AUC 0.8472806398  digest 0de6c888b8e33db9
  OMP_NUM_THREADS=8   n_iter=44   AUC 0.8472806398  digest 0de6c888b8e33db9
  distinct digests across thread counts: 1
  -> bit-identical regardless of threads` },

    { t: "p", text: "**One digest across four thread counts.** `HistGradientBoostingClassifier` is thread-count reproducible here, which is a deliberate property rather than luck — its histogram accumulation is ordered so the reduction does not depend on scheduling. Worth knowing, because it means a CPU tree model does not need thread pinning to be reproducible." },

    { t: "code", lang: "python", title: "m34.py — torch across thread counts",
      out: `== 3. a torch MLP, different thread counts ==
  threads=1   AUC 0.8511029338  first=0.041281875223  digest 954ebd2b53710fd9
  threads=2   AUC 0.8510956526  first=0.041205767542  digest 4918049360c0365d
  threads=4   AUC 0.8510956526  first=0.041205748916  digest d8f3beb1af67848d
  distinct digests: 3  -> NOT reproducible` },

    { t: "p", text: "**Three distinct digests from three thread counts**, with the same seed and the same data. The first held-out probability is 0.041281875223 at one thread and 0.041205748916 at four — a relative difference around 2e-3 in that value, and AUC differing in the sixth decimal." },

    { t: "p", text: "Note that threads=2 and threads=4 share an AUC (0.8510956526) while having different digests. The aggregate metric collided; the underlying predictions did not. That is a useful warning about verifying reproducibility by comparing a single summary number." },

    { t: "callout", kind: "trap", title: "Comparing one metric is not a reproducibility check",
      body: [
        { t: "p", text: "Two of the three torch runs agree on AUC to ten decimal places and disagree on their predictions. AUC is a rank statistic over 6,000 values — an enormous amount of per-prediction movement can leave it untouched, exactly as lesson 2.3's int8 quantization moved individual probabilities by 0.045 while accuracy moved 0.0007." },
        { t: "p", text: "Check a **hash of the full prediction vector**. It is one line, it is unambiguous, and it is the only comparison that means what you want it to mean." }
      ] },

    { t: "h2", n: "03", id: "hashseed", text: "PYTHONHASHSEED and column order",
      sub: "The same source line, four different layouts" },

    { t: "p", text: "This one has nothing to do with floating point, and it is the most dangerous of the four because it produces a *structural* difference rather than a numerical one." },

    { t: "code", lang: "python", title: "m34_worker.py — a feature list built from a set",
      code: `# The feature list built from a SET. Set iteration order for strings
# depends on PYTHONHASHSEED, so the column order of the matrix changes
# between processes -- and a model trained on one order, served on
# another, is lesson 13.1's skew with no code difference at all.
feats = {"income", "dti", "credit_score", "tenure"}
order = list(feats)
idx = [common.COLS.index(c) for c in order]`,
      out: `== 4. feature list built from a set, different PYTHONHASHSEED ==
  PYTHONHASHSEED=0      order=income,dti,tenure,credit_score                 AUC 0.847281
  PYTHONHASHSEED=1      order=dti,income,credit_score,tenure                 AUC 0.847281
  PYTHONHASHSEED=7      order=tenure,credit_score,dti,income                 AUC 0.847281
  PYTHONHASHSEED=12345  order=credit_score,income,tenure,dti                 AUC 0.847281
  distinct column orders: 4    distinct digests: 1` },

    { t: "p", text: "**Four processes, four different column orders, from one literal in the source.** Python randomises string hashing per process by default, so `list({...})` has no stable order — and a set is an extremely natural way to write *the features I want*, especially after a set operation like removing a column from a list of candidates." },

    { t: "p", text: "The AUC is identical in all four, which is exactly what makes it dangerous. Within a single process the model is trained and evaluated under the same order, so permuting the columns is harmless — a tree ensemble does not care which index a feature lives at, as long as training and inference agree." },

    { t: "callout", kind: "trap", title: "The failure is across the boundary, not within it",
      body: [
        { t: "p", text: "Train in one process with order `income, dti, tenure, credit_score`; serve in another with `credit_score, income, tenure, dti`. Now the serving path hands the model a credit score where it expects an income and a tenure where it expects a score. The model raises nothing — lesson 1.5 established it never does — and the predictions are garbage." },
        { t: "p", text: "This is lesson 13.1's training-serving skew with **no code difference at all**: the same line, in the same file, at the same commit, producing a different layout in two processes. It is also why the model pointer in lesson 1.3 has to carry the input schema with its ordering, and why a golden-row test (lesson 13.4) is the check that catches it." }
      ] },

    { t: "p", text: "The fix is one word: **a sorted list, or an explicit ordered literal**. `sorted(feats)` is deterministic across processes; `list(feats)` is not. And the serving path should assert the order it received against the schema recorded with the artifact rather than trusting it." },

    { t: "h2", n: "04", id: "roworder", text: "Row order, and the limit of bit-exactness",
      sub: "A 2.3e-10 shift that changed nothing" },

    { t: "p", text: "The last variable is the most mundane: the same rows, in a different order, because a parquet read, a shuffle or a parallel scan returned them differently. Float addition is not associative, so a mean computed over permuted rows differs in its last bits." },

    { t: "code", lang: "python", title: "m34_worker.py — the scaler, then the model",
      code: `perm = np.random.default_rng(5).permutation(len(Xtr))
mu_a, sd_a = Xtr.mean(0), Xtr.std(0)
mu_b, sd_b = Xtr[perm].mean(0), Xtr[perm].std(0)
# ... then standardise with each, fit a logistic regression to each,
# and compare the resulting predictions`,
      out: `== 5. two mathematically identical feature computations ==
  scaler mean/std bit-identical     False
  max |diff| in the mean            2.256e-10
  max |diff| in the std             1.455e-11
  max |diff| in a scaled feature    6.839e-14
  max |diff| in a fitted coef       6.661e-16
  predictions bit-identical         False
  max |diff| in predictions         4.996e-16
  decisions changed                 0 of 6000
  AUC  0.849114270032  vs  0.849114270032` },

    { t: "p", text: "The chain is visible: the mean differs by **2.26e-10**, the scaled features by **6.8e-14**, a fitted coefficient by **6.7e-16**, and the predictions by **5.0e-16**. The perturbation **shrank** as it propagated rather than amplifying, because a logistic regression on standardised features is a well-conditioned problem." },

    { t: "p", text: "And the consequence: **zero of 6,000 decisions changed**, with AUC identical to twelve decimal places. Bit-exactness was lost; behaviour was not." },

    { t: "callout", kind: "insight", title: "Require behavioural reproducibility, record enough for bit-exactness",
      body: [
        { t: "p", text: "This is the practical conclusion of the lesson. **Bit-exact reproducibility is fragile** — it is defeated by row order, thread count, a library patch release, or a different CPU's vectorisation — and chasing it costs real engineering: single-threaded training, pinned CPU flags, sorted inputs everywhere." },
        { t: "p", text: "**Behavioural reproducibility is robust and is what you actually need**: the same data and config produce a model that agrees on every decision and whose metrics match within the noise floor. Lesson 3.2 already supplies the yardstick — a 0.17-AUC-point floor on a 6,000-row holdout. A rebuild landing inside that band is reproduced; one landing outside it is a different model and the three fingerprints tell you which input moved." },
        { t: "p", text: "The exception is a regulated setting where you must demonstrate an identical artifact. Then bit-exactness is a requirement rather than a nicety, and it has to be bought deliberately: a pinned container digest, a fixed thread count, sorted inputs, and a stored digest of the predictions to prove it." }
      ] },

    { t: "h2", n: "05", id: "ledger", text: "What to pin, record, or accept",
      sub: "The summary, and the honest residue" },

    { t: "code", lang: "python", title: "m34.py — the summary",
      out: `== what the seed did and did not fix ==
  same process, same env             bit-exact
  different OMP_NUM_THREADS          bit-exact
  different torch thread count       DIFFERS
  different PYTHONHASHSEED           DIFFERENT COLUMN ORDER
  training rows in a different order DIFFERS` },

    { t: "diagram", kind: "matrix", id: "dg-3_4-05-0",
      title: "Each hidden input: what to do about it",
      caption: "Three responses, and they are not interchangeable. **Pin what is cheap and structural, record what is expensive to control, accept what is irreducible** — and use the noise floor from 3.2 to judge whether a rebuild counts as reproduced.",
      rows: ["Seed", "PYTHONHASHSEED / set order", "Thread count", "Row order", "Library versions", "CPU / instruction set"],
      cols: ["Measured effect", "Response"],
      cells: [
        [{ text: "controls the fit entirely", tone: "good" }, { text: "PIN and record", tone: "good" }],
        [{ text: "4 different column orders", tone: "crit" }, { text: "PIN: use sorted(), never list(set)", tone: "good" }],
        [{ text: "torch: 3 digests; sklearn: 1", tone: "warn" }, { text: "RECORD; pin only if bit-exact is required", tone: "warn" }],
        [{ text: "pred diff 5e-16, 0 decisions", tone: "good" }, { text: "ACCEPT; judge against the noise floor", tone: "good" }],
        [{ text: "can move a metric silently", tone: "warn" }, { text: "RECORD as env_sha (1.2), pin via image digest", tone: "warn" }],
        [{ text: "AVX/vectorisation differences", tone: "warn" }, { text: "ACCEPT unless running in a fixed image", tone: "warn" }]
      ] },

    { t: "p", text: "One residue worth stating plainly: a GPU adds non-determinism this lesson could not measure, because none is available here. Atomic accumulation order in cuDNN kernels is genuinely scheduling-dependent, and `torch.use_deterministic_algorithms(True)` exists precisely because the default is not — at a real throughput cost, and with some operations having no deterministic implementation at all. A team that needs bit-exactness on a GPU is choosing to be slower, deliberately." },

    { t: "exercise", kind: "practice", title: "Find your own hidden inputs", difficulty: "core", minutes: 30,
      prompt: "Run your training twice in separate processes and compare a sha256 of the full prediction vector, not a metric. If they differ, bisect the cause: fix the thread count and retry, set PYTHONHASHSEED and retry, sort the input rows and retry. Then grep your codebase for `list(set(`, `set(` used to build a feature or column list, and dictionary iteration used for ordering — each one is a column order that is not stable across processes. Finally, decide and write down which kind of reproducibility you need, and if it is behavioural, state the tolerance using the noise floor you measured in 3.2.",
      hints: [
        "Compare a hash of all predictions. Two of the torch runs here agreed on AUC to ten decimals and had different predictions.",
        "`sorted(feats)` instead of `list(feats)` is the entire fix for the column-order class, and it costs nothing.",
        "Writing down the tolerance is the part that matters: 'reproducible' with no number attached is unfalsifiable."
      ],
      solution: {
        body: [
          { t: "p", text: "The `list(set(...))` grep usually finds something, and it is the highest-value fix in the exercise because the failure is structural rather than numerical — a column permutation between training and serving produces garbage predictions with no error anywhere." },
          { t: "p", text: "The tolerance statement is the other durable output. Once 'reproduced' means 'agrees on every decision and matches within 0.17 AUC points', a rebuild that fails is a real signal and one that passes is genuinely reassuring — and the three fingerprints from 1.2 tell you which input moved." }
        ]
      } }

  ],

  takeaways: [
    "**The seed is not sufficient.** The same code, seed and data gave different results when thread count, hash seed or row order changed.",
    "**scikit-learn's HistGradientBoosting was bit-identical across 1, 2, 4 and 8 threads** — one digest, so a CPU tree model needs no thread pinning for reproducibility.",
    "**Torch was not**: three thread counts, three digests, AUC 0.8511029338 against 0.8510956526, and the first probability 0.041281875223 against 0.041205748916.",
    "**Two torch runs agreed on AUC to ten decimals and had different predictions** — so comparing one metric is not a reproducibility check. Hash the full prediction vector.",
    "**`PYTHONHASHSEED` produced four different column orders** from the single line `list({\"income\", \"dti\", \"credit_score\", \"tenure\"})`.",
    "**Within a process that is harmless; across the training/serving boundary it is garbage** — the same line, same commit, different layout, and the model raises nothing.",
    "**Use `sorted(feats)`, never `list(set(...))`**, and have the serving path assert the received order against the schema recorded with the artifact.",
    "**Row order broke bit-exactness and changed nothing**: scaler mean differed 2.26e-10, predictions 5.0e-16, zero of 6,000 decisions changed, AUC identical to 12 decimals.",
    "**The perturbation shrank as it propagated** (2.3e-10 to 5.0e-16), because a logistic regression on standardised features is well conditioned.",
    "**Require behavioural reproducibility, not bit-exactness**: same decisions, metrics inside lesson 3.2's 0.17-point noise floor. Bit-exactness is fragile and expensive.",
    "**Pin what is structural (seed, sorted order), record what is expensive to control (threads, library versions), accept what is irreducible (row order, CPU vectorisation).**",
    "**GPUs add non-determinism not measurable here** — `torch.use_deterministic_algorithms(True)` exists because the default is not, and it costs throughput."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two training runs report AUC 0.8510956526 to ten decimal places. Is the training reproducible?",
        options: [
          "Yes — agreement to ten decimals is conclusive",
          "Unknown: two torch runs here matched on AUC to ten decimals and had different prediction digests, because AUC is a rank statistic that absorbs a great deal of per-prediction movement",
          "No — any two runs of the same code must differ"
        ],
        answer: 1,
        why: "AUC over 6,000 values can be identical while individual probabilities differ, the same way int8 quantization in lesson 2.3 moved probabilities by 0.045 while accuracy moved 0.0007. Compare a hash of the whole prediction vector; it is one line and it is unambiguous."
      },
      {
        stem: "A feature list is built with `list({\"income\", \"dti\", \"credit_score\", \"tenure\"})`. What is the risk?",
        options: [
          "None — sets contain the same elements regardless of order",
          "Column order varies between processes because string hashing is randomised per process, so a model trained under one order and served under another receives features in the wrong positions and raises nothing",
          "The set may silently drop a duplicate feature name"
        ],
        answer: 1,
        why: "Measured: four PYTHONHASHSEED values gave four different orders from that one line. Within a single process it is harmless because training and inference agree; across the boundary it is training-serving skew with no code difference at all. `sorted(feats)` fixes it entirely."
      },
      {
        stem: "A rebuild of last quarter's model produces predictions differing by at most 5e-16, with no decision changed. Is it reproduced?",
        options: [
          "No — the predictions are not bit-identical, so reproducibility failed",
          "Yes, behaviourally: it agrees on every decision and the metric matches well inside the noise floor, which is the standard worth holding unless a regulator requires an identical artifact",
          "Cannot say without rerunning with a fixed thread count"
        ],
        answer: 1,
        why: "Bit-exactness is defeated by row order, thread count, a patch release or a different CPU, so demanding it costs real engineering for little benefit. The useful definition is agreement on decisions plus metrics inside lesson 3.2's measured 0.17-point floor — with bit-exactness bought deliberately only where it is a requirement."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How do you make model training reproducible?",
        strong: "Setting the seed is necessary and not sufficient, and I would say what else is an input. I ran the same code, seed and data in separate processes and varied only the environment: scikit-learn was bit-identical across one to eight threads, but torch gave three different prediction digests for three thread counts, and PYTHONHASHSEED produced four different feature column orders from a single `list({...})` line. So: pin the seed and use `sorted()` rather than `list(set(...))`, record the thread count and the library versions as part of the run, and recognise that row order and CPU vectorisation will break bit-exactness regardless. Then define reproduced as behavioural — same decisions, metric inside the noise floor — rather than bit-identical.",
        answer: [
          { t: "p", text: "Naming the hidden inputs with measurements attached is what separates this from the standard seed answer. The sklearn-versus-torch contrast is useful because it shows the property is per-library rather than universal." },
          { t: "p", text: "The behavioural-versus-bit-exact distinction, with a tolerance taken from a measured noise floor, is the senior part of a mid-level answer." }
        ]
      },
      {
        level: "senior",
        q: "A model cannot be rebuilt to match last quarter's results. How do you investigate?",
        strong: "I would bisect the hidden inputs in order of likelihood, which the three fingerprints from the run record make cheap. First the data hash: if the bytes differ, I am not reproducing a run, I am comparing two experiments — and that is the common case. Then the code hash and the dirty flag, because a commit id from a dirty tree describes code that never ran. Then the environment hash: a numpy or sklearn patch release moves a metric in the third decimal. Then the things that are not usually recorded at all — thread count, which I have measured giving torch three different digests, and set-derived column order, which I have measured giving four different layouts. And before any of that I would ask how close is close enough, because if the rebuild is within the holdout's noise floor then nothing failed and the question is wrongly posed.",
        answer: [
          { t: "p", text: "Ordering the bisection by likelihood, with data first, is right and shows the diagnosis has been done before. The last point — questioning the premise against the noise floor — is what a senior engineer adds." },
          { t: "p", text: "Mentioning that a dirty commit id describes code that never ran is a sharp detail that connects provenance to this investigation." }
        ]
      },
      {
        level: "senior",
        q: "Is bit-exact reproducibility worth pursuing?",
        strong: "Usually not, and I would say why with numbers. It is fragile: in my measurements the same rows in a different order broke it — the scaler's mean moved 2.3e-10 and the predictions 5e-16 — while changing zero of six thousand decisions and leaving AUC identical to twelve decimal places. So bit-exactness failed and nothing about the model's behaviour did. Buying it means single-threaded training, sorted inputs everywhere, pinned container digests and fixed CPU flags, and on a GPU it means `use_deterministic_algorithms` with a real throughput cost and some operations having no deterministic implementation. What I want instead is behavioural reproducibility with a stated tolerance — agrees on every decision, metric within the measured noise floor — which is robust and falsifiable. The exception is a regulated setting where you have to demonstrate an identical artifact, and then it is a requirement to be bought deliberately rather than hoped for.",
        answer: [
          { t: "p", text: "The row-order measurement is the whole argument in one example: reproducibility failed by the strict definition and nothing that mattered changed." },
          { t: "p", text: "Naming the regulated exception, and framing it as something bought deliberately, keeps the answer from sounding like an excuse for sloppiness." }
        ]
      }
    ]
  }
});
