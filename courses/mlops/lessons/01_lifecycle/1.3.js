EC.receiveLesson({
  id: "1.3",

  lede: "\"Never put data in git\" is the most repeated rule in MLOps, and the reason usually given for it is wrong. Five versions of a 5.6 MB training table were committed three ways and measured. Git's packfiles handled the binary in **7.05 MB** and the same data as CSV in **3.78 MB** — *less than one copy of the file* — because delta compression works. The content-addressed cache that is supposed to be the fix used **29.11 MB**, four times more. The rule is still right, but for a different reason: a fresh clone of the git-tracked repo transfers **13.09 MB against 0.03 MB**, a factor of **455**, and that is a cost every developer and every CI job pays forever.",

  objectives: [
    "State the real cost of committing data to git, separating total storage from transfer on clone",
    "Build a content-addressed store with a pointer file, and verify the deduplication property",
    "Explain why a data version must be reproducible from its identifier rather than merely saved",
    "Decide between git, Git LFS and a DVC-style pointer from the access pattern rather than the file size"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", id: "slogan", text: "Testing the slogan",
      sub: "Three repositories, five versions, measured" },

    { t: "p", text: "The usual justification for keeping data out of git is that *git stores every version in full*, so five versions of a 5 MB file means 25 MB of history and a 500 MB dataset is hopeless. It is a tidy story. It is also not what git does, and believing it leads people to adopt the wrong tool for the wrong reason — which means they also misjudge when they do not need it." },

    { t: "p", text: "So: a realistic training table, 61,200 rows by 12 float64 columns, in five versions. Each version appends a month of new rows and corrects two hundred existing ones, which is what actually happens to a training table over time. Three repositories get the same five versions." },

    { t: "code", lang: "python", title: "m13.py — a version, reproducible from its number",
      code: `base = np.random.default_rng(7).normal(size=(ROWS, COLS)).astype(np.float64)

def version(i):
    """Version i of the training table.

    Deterministic in i: each version has its own generator, so version(3) is
    the same bytes every time it is called. A data version that is not
    reproducible from its identifier is not a version, it is a snapshot --
    and the dedup property below cannot be demonstrated without it.
    """
    r = np.random.default_rng(1000 + i)
    X = base.copy()
    idx = r.choice(ROWS, size=200, replace=False)      # corrections
    X[idx] += r.normal(scale=0.5, size=(200, COLS))
    extra = r.normal(size=(1200 * i, COLS))            # a month of new rows
    return np.vstack([X, extra])`,
      out: `== the dataset ==
  61200 rows x 12 cols, float64
  as .npy  5.60 MB
  as .csv  6.71 MB` },

    { t: "callout", kind: "note", title: "The docstring is the lesson's second point",
      body: [
        { t: "p", text: "The first version of this script drew each version from a shared module-level generator, so calling `version(1)` twice produced different arrays. The deduplication measurement below silently reported *new bytes written* every time and proved nothing." },
        { t: "p", text: "That bug is worth keeping visible, because it is the same mistake as the thing the lesson is about. **A data version that cannot be regenerated from its identifier is not a version.** It is a file you happen to still have, and the moment you lose it the identifier means nothing." }
      ] },

    { t: "p", text: "Each repository is measured after `git gc --aggressive --prune=now`, so what is reported is the packed size rather than a pile of loose objects — otherwise the comparison flatters git's competitors by measuring git before it has done its job." },

    { t: "h2", n: "02", id: "measured", text: "What git actually does with it",
      sub: "Delta compression, and it works" },

    { t: "code", lang: "python", title: "m13.py — five versions of a binary .npy, committed directly",
      out: `== A: a binary .npy committed directly, five versions ==
  v1  working tree    5.60 MB   .git    5.41 MB
  v2  working tree    5.71 MB   .git    5.66 MB
  v3  working tree    5.82 MB   .git    6.01 MB
  v4  working tree    5.93 MB   .git    6.48 MB
  v5  working tree    6.04 MB   .git    7.05 MB` },

    { t: "p", text: "Five full versions of a 5.6 MB file, and `.git` is **7.05 MB**. Not 28. The marginal cost of each extra version is **0.41 MB** — roughly the size of the actual change, not the size of the file. Git's packfile format stores one version and deltas against it, and it does that for binary blobs too." },

    { t: "code", lang: "python", title: "m13.py — the same data as CSV",
      out: `== B: the same data as .csv committed directly ==
  v1  working tree    6.71 MB   .git    2.88 MB
  v2  working tree    6.84 MB   .git    3.02 MB
  v3  working tree    6.97 MB   .git    3.22 MB
  v4  working tree    7.11 MB   .git    3.47 MB
  v5  working tree    7.24 MB   .git    3.78 MB` },

    { t: "p", text: "As CSV it is better still: the file on disk is *larger* (6.71 MB against 5.60 MB, because decimal text is a wasteful encoding of a float) and yet five versions of history fit in **3.78 MB** — **0.6 times a single copy**. Text deltas and zlib together compress this far below the raw size, so the format that looks wasteful in the working tree is the cheap one in history." },

    { t: "callout", kind: "insight", title: "The slogan's stated reason is false",
      body: [
        { t: "p", text: "Git does not store every version in full. On this dataset the marginal cost of a version was 0.41 MB for binary and 0.23 MB for text, against a 5.6 MB file — so history grew at roughly the rate the data actually changed." },
        { t: "p", text: "Which means the honest answer to *can I just commit this CSV?* is often **yes**. A few hundred megabytes of slowly-changing tabular data in git is not the catastrophe it is usually described as, and reaching for a data-versioning tool at that scale buys you a dependency and a cache to administer in exchange for very little." }
      ] },

    { t: "h2", n: "03", id: "pointer", text: "The pointer, and what it costs",
      sub: "Content-addressed storage, measured honestly" },

    { t: "p", text: "The alternative is the idea underneath Git LFS, DVC and every ML data-versioning tool: keep the bytes somewhere else, keyed by their own hash, and commit a small text file that names the hash. The mechanism is about fifteen lines." },

    { t: "code", lang: "python", title: "m13.py — a content-addressed cache",
      code: `def cache_put(path, cache=CACHE):
    """Store a file under the hash of its contents. Identical content stored
    twice occupies the space once -- the property that makes this work."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    digest = h.hexdigest()
    dest = os.path.join(cache, digest[:2], digest[2:])
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(path, dest)
        stored = True
    else:
        stored = False                      # deduplicated
    return digest, os.path.getsize(path), stored`,
      out: `== C: a content-addressed cache, with only a pointer in git ==
  v1  pointer  142 B   .git   0.026 MB   cache    5.60 MB   new=True
  v2  pointer  142 B   .git   0.027 MB   cache   11.32 MB   new=True
  v3  pointer  142 B   .git   0.027 MB   cache   17.14 MB   new=True
  v4  pointer  142 B   .git   0.028 MB   cache   23.07 MB   new=True
  v5  pointer  142 B   .git   0.029 MB   cache   29.11 MB   new=True` },

    { t: "p", text: "The git repository is now **29 KB** regardless of how much data exists, and the pointer is 142 bytes of JSON naming the path, the sha256, the byte size and the row count. That is the headline the tools advertise, and it is true." },

    { t: "p", text: "But look at the cache column, because this is the part that does not get advertised. **29.11 MB.** Each version is stored whole, because a content-addressed store addresses whole objects and two files that differ by two hundred rows have entirely different hashes. There is no delta." },

    { t: "diagram", kind: "matrix", id: "dg-1_3-03-0",
      title: "The three approaches on the axes that actually differ",
      caption: "Read the first column and the slogan collapses: **the pointer scheme uses four times the total storage**, because a content-addressed store cannot delta between versions and git can. The case for it is made entirely in the second column.",
      rows: ["A: binary in git", "B: CSV in git", "C: pointer + cache"],
      cols: ["Total stored, 5 versions", "Fresh clone transfers"],
      cells: [
        [{ text: "7.05 MB (+0.41 MB per version)", tone: "good" }, { text: "13.09 MB", tone: "crit" }],
        [{ text: "3.78 MB (+0.23 MB per version)", tone: "good" }, { text: "11.02 MB", tone: "crit" }],
        [{ text: "29.11 MB (+5.6 MB per version)", tone: "crit" }, { text: "0.03 MB", tone: "good" }]
      ] },

    { t: "p", text: "The deduplication property is real, though, and worth verifying rather than assuming — which is what the determinism fix made possible." },

    { t: "code", lang: "python", title: "m13.py — storing the same bytes twice",
      out: `== the dedup property: store version 1's bytes again ==
  re-storing a previously seen file: new bytes written = False
  storing genuinely new content:     new bytes written = True (+5.49 MB)` },

    { t: "p", text: "Identical content costs nothing the second time. That matters more than it looks: it means a branch that reverts to last month's dataset, or ten experiments that share a training set, or a reproducibility run three months later, all resolve to the same cache entry. The cache is wasteful across *versions* and perfectly efficient across *references*." },

    { t: "h2", n: "04", id: "clone", text: "Who pays, and when",
      sub: "The real argument, which is about transfer" },

    { t: "p", text: "If total storage favours git, why is the rule still right? Because storage on a server is the cheapest thing in this comparison, and it is not what hurts. What hurts is that **git history is not optional**. Clone the repository and you get all of it." },

    { t: "code", lang: "python", title: "m13.py — a fresh clone of each repository",
      code: `for name, repo in (("A .npy in git", A), ("B .csv in git", B),
                   ("C pointer", C)):
    dest = os.path.join(LAB, "clone_" + name.split()[0])
    rmtree(dest)
    t0 = time.perf_counter()
    sh(["git", "clone", "-q", repo, dest], LAB)
    dt = time.perf_counter() - t0
    print("  %-14s  %7.2f MB   %6.2f s" % (name, mb(dirsize(dest)), dt))`,
      out: `== what a fresh clone transfers ==
  A .npy in git     13.09 MB     0.29 s
  B .csv in git     11.02 MB     0.29 s
  C pointer          0.03 MB     0.20 s

  the pointer repo clones 455x smaller than the binary one
  and a developer who needs ONE version fetches 1 x 5.60 MB from the
  cache instead of the whole 13.09 MB of history.` },

    { t: "p", text: "**455 times smaller.** And the asymmetry compounds in a way the storage figure does not: five versions of a 5.6 MB file is a toy. Scale it to a 2 GB table with two years of weekly versions and the git repository is something every new engineer waits twenty minutes for and every CI job pays for on every run, forever, in order to use one version of it." },

    { t: "callout", kind: "tradeoff", title: "The rule, stated correctly",
      body: [
        { t: "p", text: "Keep data out of git not because git stores it badly — it stores it rather well — but because **git history is all-or-nothing and data history is not needed by most of the people who clone the repository.** A pointer makes the history opt-in: 142 bytes to know which version you are on, and a fetch only if you actually need the bytes." },
        { t: "p", text: "The cost you accept in exchange is a second system to administer, authenticate and back up, and a total storage bill several times larger because the cache cannot delta. That is a good trade at gigabyte scale and a bad one at megabyte scale, which is why the decision should be made from the access pattern and not from a slogan." }
      ] },

    { t: "diagram", kind: "steps", id: "dg-1_3-04-0",
      title: "Choosing a store, from the access pattern",
      caption: "The question is never only how big the file is. **It is how often it changes, who has to download it, and whether anyone needs the old versions** — which is why a 300 MB reference table that changes yearly belongs in git and a 50 MB table regenerated nightly does not.",
      items: [
        { label: "Small and slowly changing? Commit it.", desc: "A few hundred megabytes changing monthly: measured at +0.23 MB per CSV version, and no cache to administer." },
        { label: "Large, or changing often? Pointer it.", desc: "Git LFS or a DVC pointer: clones stay fast and bytes arrive on demand, at a whole copy of storage per version." },
        { label: "Already in a warehouse? Version the query.", desc: "Do not copy it out. Record the query, a snapshot id or as-of timestamp, and a hash of the result." },
        { label: "Whatever you choose, record the hash.", desc: "The store decides who pays for the bytes; the hash from 1.2 is what makes 'same data?' answerable." }
      ] },

    { t: "h2", n: "05", id: "models", text: "The model artifact",
      sub: "The same problem, with a worse failure mode" },

    { t: "p", text: "Model files have the same storage question and a sharper identity question. A dataset that loses its provenance costs you an afternoon. A model file that loses its provenance is **serving traffic** while nobody can say what it is — which is lesson 15.1's incident." },

    { t: "p", text: "A model artifact is binary, large, and regenerated often, so the pointer answer is almost always right. The part that needs care is what the pointer carries, because a hash alone identifies the bytes without saying anything about whether they can be loaded or trusted." },

    { t: "table",
      head: ["The pointer field", "The question it answers"],
      rows: [
        ["sha256 of the artifact", "Is this the same file I tested? The only field that makes the rest trustworthy."],
        ["run_id", "What produced it — the link to params, metrics and the three fingerprints from 1.2."],
        ["data_sha, code_sha, env_sha", "Can it be rebuilt, and if the numbers differ, which of the three moved."],
        ["Framework and version", "Will it even deserialize. A pickle is not portable across library versions, which is lesson 13.3."],
        ["Input schema and dtypes", "What it expects to be called with, so a skewed caller fails loudly rather than silently."],
        ["Metrics at promotion", "What it scored when it was approved, so a regression is detectable rather than arguable."]
      ] },

    { t: "callout", kind: "trap", title: "A pickle is a version-coupled artifact, not a model",
      body: [
        { t: "p", text: "`joblib.dump` of a scikit-learn pipeline embeds the class paths and internal attribute layout of the installed version. Load it under a different sklearn and you get, in rough order of luck: an exception, a warning, or a silent behaviour change. The last one is the one that reaches production." },
        { t: "p", text: "Which is why `env_sha` belongs in the pointer and why ONNX exists — a serialization boundary that is a specified format rather than a memory dump. Lesson 2.3 converts a model to it and measures what that costs, and 13.3 measures the silent-difference case directly." }
      ] },

    { t: "exercise", kind: "practice", title: "Price your own history", difficulty: "intro", minutes: 25,
      prompt: "Pick the largest data file your team versions. Measure three things rather than estimating them. First: how big is the repository's .git directory today, and how long does a fresh clone take? Second: how many versions of that file exist in history, and what is the marginal cost per version — commit two successive versions into a throwaway repo, run git gc, and subtract. Third: how many people and CI jobs clone this repository per week, and multiply. Then decide whether a pointer scheme would have saved anything, and write down the number rather than the opinion.",
      hints: [
        "Measure after `git gc --aggressive --prune=now`, or you are measuring loose objects rather than history.",
        "A CSV may surprise you: text deltas compressed to 0.6x a single copy here.",
        "The multiplication in the third step is usually where the answer comes from, not the first two."
      ],
      solution: {
        body: [
          { t: "p", text: "The common outcome is that total storage is unremarkable and clone cost is the real bill — which is the shape of the measurement in this lesson, and it means the fix is a pointer rather than a bigger disk." },
          { t: "p", text: "The other common outcome is discovering that nobody can enumerate the versions in history at all, because the file was overwritten in place and committed with the message 'update data'. That is not a storage problem and a pointer will not fix it; it is the missing data fingerprint from 1.2." }
        ]
      } }

  ],

  takeaways: [
    "**Git does not store every version in full.** Five versions of a 5.6 MB table cost 7.05 MB of packed history for binary and 3.78 MB for CSV — the marginal version was 0.41 MB and 0.23 MB respectively.",
    "**CSV history was 0.6x the size of one copy of the file**, even though the CSV on disk is larger than the .npy — text deltas plus zlib beat a compact binary encoding in history.",
    "**The content-addressed cache used 29.11 MB against git's 7.05 MB**, four times more, because it addresses whole objects and cannot delta between versions.",
    "**The real argument is transfer, not storage**: a fresh clone was 13.09 MB against 0.03 MB, a factor of 455, and every developer and CI job pays it on every clone.",
    "**Git history is all-or-nothing; data history usually need not be.** A pointer makes it opt-in — 142 bytes to know the version, a fetch only if you need the bytes.",
    "**Deduplication is real and verifiable**: re-storing identical content wrote no new bytes, so shared datasets and reverts cost nothing extra.",
    "**A data version must be reproducible from its identifier.** The first version of this script drew versions from a shared RNG, so `version(1)` differed between calls and the dedup test silently measured nothing.",
    "**Commit it when it is small and slow-moving** — a few hundred megabytes changing monthly is genuinely fine in git, and avoiding a tool is worth something.",
    "**Do not copy a warehouse table out in order to version it.** Record the query plus a snapshot id or as-of timestamp, with a row count and content hash of the result.",
    "**A model pointer needs more than a hash**: run_id, the three fingerprints, framework version, input schema and the metrics at promotion.",
    "**A pickle is version-coupled.** It embeds class paths and attribute layouts, so a different library version yields an exception, a warning, or a silent behaviour change — the last being the one that reaches production."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A colleague says you cannot commit a 40 MB CSV that changes monthly because git stores every version in full. What is wrong with the reasoning?",
        options: [
          "Nothing — that is exactly how git works for files it cannot diff",
          "Git packfiles delta-compress successive versions, including binary; measured here, CSV history came to 0.6x a single copy and the marginal version cost 0.23 MB",
          "Git compresses only text, so the claim holds for binary but not CSV"
        ],
        answer: 1,
        why: "The third option is the half-truth worth discarding: binary deltas also worked, costing 0.41 MB per version of a 5.6 MB .npy. The real reason to use a pointer is that clone transfers all history — 13.09 MB against 0.03 MB here — not that storage is large."
      },
      {
        stem: "You move a versioned dataset from git into a DVC-style content-addressed cache. What happens to total bytes stored?",
        options: [
          "It falls, because the pointer is only 142 bytes",
          "It rises, often several-fold — each version is stored whole because content addressing has no delta between versions; measured at 29.11 MB against git's 7.05 MB",
          "It is unchanged, since the same data is being stored either way"
        ],
        answer: 1,
        why: "The pointer shrinks the repository, not the storage bill. Two files differing by two hundred rows hash completely differently, so the cache keeps both in full. You are trading total storage for clone size, and that trade is good at gigabyte scale and poor at megabyte scale."
      },
      {
        stem: "Your data versioning records a pointer with the file path and a sha256. A run from four months ago cannot be reproduced. What is this pointer unable to tell you?",
        options: [
          "Whether the bytes are the same — that is what the hash is for",
          "Whether the data can be regenerated, and what library versions produced the result — a hash identifies bytes you still have, not a version you can rebuild",
          "Nothing; a content hash is sufficient provenance"
        ],
        answer: 1,
        why: "A hash verifies bytes you possess. If the cache entry has been pruned, the hash names something unrecoverable. That is why a version must be reproducible from its identifier — the determinism point — and why env_sha from 1.2 belongs beside it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Why shouldn't you commit training data to git?",
        strong: "The usual reason given — that git stores every version in full — is false, and I have measured it: five versions of a 5.6 MB table came to 7.05 MB of packed history as binary and 3.78 MB as CSV, so history grew at roughly the rate the data changed. The real reason is that git history is all-or-nothing. A fresh clone of that repo transferred 13.09 MB against 0.03 MB for a pointer scheme, 455 times more, and every engineer and every CI job pays that on every clone in order to use one version. So I decide from the access pattern: a few hundred megabytes changing monthly can just be committed, and a large or frequently regenerated table gets a pointer.",
        answer: [
          { t: "p", text: "Correcting the stated reason and then giving the right one is a much stronger answer than reciting the rule, and the clone figure is the number that makes it concrete." },
          { t: "p", text: "Volunteering that committing is sometimes fine signals judgement rather than cargo-culting — and it is the part that saves a team from adopting a cache they do not need." }
        ]
      },
      {
        level: "senior",
        q: "What are the trade-offs of a tool like DVC or Git LFS?",
        strong: "You gain a repository that clones in seconds and data history that is opt-in. You pay in three ways. Total storage goes up, often several-fold — I measured 29 MB against git's 7 MB for the same five versions — because content addressing stores whole objects and cannot delta between them. You add a second system to authenticate, administer and back up, and a cache entry that gets pruned turns a hash into a reference to something unrecoverable. And the pointer only solves the storage question: it says nothing about whether the data can be regenerated, which still needs the query or the generating code recorded. The deduplication is genuinely good though — identical content across branches and experiments costs nothing the second time, which I verified.",
        answer: [
          { t: "p", text: "Naming the storage increase is the detail that shows the measurement was actually run; most answers assume the tool saves space." },
          { t: "p", text: "The pruned-cache point is the operational one worth keeping: a hash is a verification mechanism, not a guarantee of retention, so the retention policy is part of the design." }
        ]
      },
      {
        level: "senior",
        q: "How would you version a model artifact so that a year from now someone can tell what it is?",
        strong: "The bytes go in object storage, keyed by their own hash, and the repository holds a pointer. The pointer needs six things: the artifact sha256, the run id that links back to params and metrics, the three fingerprints — data, code with a dirty flag, environment — the framework and its exact version, the input schema with dtypes, and the metrics it scored at promotion. The framework version matters more than people expect: a pickle embeds class paths and attribute layouts, so loading under a different sklearn gives you an exception, a warning, or a silent behaviour change, and only the first two are survivable. That is also the argument for exporting to a specified format like ONNX rather than dumping memory.",
        answer: [
          { t: "p", text: "The six fields are a good concrete answer. The input schema is the one candidates usually omit, and it is what turns a skewed caller into a loud failure instead of a quiet one." },
          { t: "p", text: "The pickle point lands because the silent-behaviour-change case is the one everybody has been bitten by and few can articulate as a versioning problem." }
        ]
      }
    ]
  }
});
