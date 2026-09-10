/* ============================================================================
   LESSON 1.5 — Random Numbers and Reproducibility
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**A seed makes a single script reproducible. It does not make a pipeline reproducible.** Global state shared between libraries, dictionary ordering, thread scheduling and floating-point summation order all move results that a seed cannot pin down — and the failures show up as a model you cannot rebuild.",

  objectives: [
    "Use `np.random.default_rng` rather than the legacy global functions",
    "Explain why global random state breaks reproducibility across modules",
    "Pass and split generators so parallel work stays reproducible",
    "Identify the sources of non-determinism a seed cannot fix",
    "Sample correctly: with and without replacement, weighted, and stratified"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Two APIs, and why the old one is a trap", id: "generators" },

    { t: "p", text: "NumPy has a legacy random API — `np.random.seed`, `np.random.rand` — backed by **one global state shared by every piece of code in the process**. Since 2019 it has a Generator API where the state is an object you hold. The difference is not stylistic." },

    { t: "dl", items: [
      ["PRNG", "Pseudo-random number generator — a deterministic algorithm producing a sequence that passes statistical tests for randomness. Same state in, same sequence out, always."],
      ["Seed", "The starting state. Two generators with the same seed produce identical sequences."],
      ["Global state", "The legacy API's single hidden generator. Any library that calls `np.random.*` advances it, changing what your next call returns."],
      ["`default_rng`", "The modern constructor. `rng = np.random.default_rng(42)` gives you a `Generator` whose state belongs to you alone."],
      ["`SeedSequence`", "The mechanism that turns one seed into many independent, non-overlapping streams — the correct way to seed parallel workers."],
      ["Reproducibility", "Rerunning the same code on the same inputs gives the same outputs. Distinct from *replicability*, which is getting the same conclusion from new data."]
    ]},

    { t: "viz",
      title: "Shared global state against owned generators",
      caption: "With the legacy API, any library that draws a random number changes what your code gets next. With Generator objects, each consumer holds its own stream.",
      svg: `<svg viewBox="0 0 880 290" role="img" aria-label="One global random state consumed by three modules, against three independent generator objects">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">Legacy — np.random.seed(42)</text>
  <rect x="150" y="44" width="200" height="46" rx="6" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit);stroke-width:2"/>
  <text x="182" y="72" class="s-sub" style="fill:var(--ink-2)">ONE global state</text>
  <g style="stroke:var(--crit);stroke-width:1.5">
    <line x1="200" y1="90" x2="90" y2="140" marker-end="url(#rg-c)"/>
    <line x1="250" y1="90" x2="250" y2="140" marker-end="url(#rg-c)"/>
    <line x1="300" y1="90" x2="410" y2="140" marker-end="url(#rg-c)"/>
  </g>
  <g stroke-width="1.5">
    <rect x="30" y="142" width="120" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="190" y="142" width="120" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="350" y="142" width="120" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
  </g>
  <text x="44" y="164" class="s-sub" style="fill:var(--ink-3)">your split</text>
  <text x="204" y="164" class="s-sub" style="fill:var(--ink-3)">sklearn</text>
  <text x="364" y="164" class="s-sub" style="fill:var(--ink-3)">a plotting lib</text>
  <text x="30" y="206" class="s-sub" style="fill:var(--crit)">Each draw advances the shared state. Add a library, or import in a</text>
  <text x="30" y="226" class="s-sub" style="fill:var(--crit)">different order, and your "seeded" split changes.</text>

  <text x="540" y="26" class="s-label" style="fill:var(--good)">Modern — default_rng(42)</text>
  <g stroke-width="2">
    <rect x="540" y="44" width="90" height="34" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="640" y="44" width="90" height="34" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="740" y="44" width="90" height="34" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
  </g>
  <text x="556" y="66" class="s-sub" style="fill:var(--ink-2)">rng_a</text>
  <text x="656" y="66" class="s-sub" style="fill:var(--ink-2)">rng_b</text>
  <text x="756" y="66" class="s-sub" style="fill:var(--ink-2)">rng_c</text>
  <g style="stroke:var(--good);stroke-width:1.5">
    <line x1="585" y1="78" x2="585" y2="140" marker-end="url(#rg-g)"/>
    <line x1="685" y1="78" x2="685" y2="140" marker-end="url(#rg-g)"/>
    <line x1="785" y1="78" x2="785" y2="140" marker-end="url(#rg-g)"/>
  </g>
  <g stroke-width="1.5">
    <rect x="540" y="142" width="90" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="640" y="142" width="90" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="740" y="142" width="90" height="34" rx="4" style="fill:none;stroke:var(--line)"/>
  </g>
  <text x="540" y="206" class="s-sub" style="fill:var(--good)">Independent streams from one SeedSequence. Nothing another</text>
  <text x="540" y="226" class="s-sub" style="fill:var(--good)">module does can reach into yours.</text>

  <defs>
    <marker id="rg-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="rg-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "how a seeded script stops being reproducible", code: `
import numpy as np

# THE LEGACY API -- one hidden state for the whole process:
np.random.seed(42)
np.random.rand(3)             # array([0.3745, 0.9507, 0.7320])

np.random.seed(42)
np.random.rand(3)             # identical -- looks reproducible

# NOW SOMETHING ELSE DRAWS FROM THE SAME STATE:
np.random.seed(42)
_ = some_library_function()   # calls np.random internally
np.random.rand(3)             # DIFFERENT -- and nothing in your code changed
#
# The library did not have to be random-looking. A progress bar that
# samples for jitter, a plotting call that dithers, a shuffle inside a
# helper -- any of them advances the state your next line reads.

# THE MODERN API -- state you own:
rng = np.random.default_rng(42)
rng.random(3)                 # array([0.7740, 0.4388, 0.8582])

rng2 = np.random.default_rng(42)
rng2.random(3)                # identical, and NOTHING can change that
#
# No other module can reach rng. There is no global to advance.

# THE METHODS ARE RENAMED, AND THE NEW NAMES ARE BETTER:
#   np.random.rand(3)            ->  rng.random(3)
#   np.random.randn(3)           ->  rng.standard_normal(3)
#   np.random.randint(0, 10, 3)  ->  rng.integers(0, 10, 3)   [see below]
#   np.random.choice(a, 5)       ->  rng.choice(a, 5)
#   np.random.shuffle(a)         ->  rng.shuffle(a)
#   np.random.permutation(a)     ->  rng.permutation(a)

# A BEHAVIOUR CHANGE WORTH KNOWING:
np.random.randint(0, 10)      # high is EXCLUSIVE -- 0..9
rng.integers(0, 10)           # also exclusive by default
rng.integers(0, 10, endpoint=True)   # 0..10 inclusive, if you want it

# THE GENERATOR IS ALSO STATISTICALLY BETTER. The legacy API uses
# Mersenne Twister; default_rng uses PCG64, which is faster, passes
# more stringent tests and has a much smaller state.

# PASS THE GENERATOR, DO NOT CREATE ONE INSIDE:
def bad_sample(data, n):
    rng = np.random.default_rng(42)      # ALWAYS the same sample
    return rng.choice(data, n, replace=False)

def also_bad(data, n):
    rng = np.random.default_rng()        # unseeded -- irreproducible
    return rng.choice(data, n, replace=False)

def good(data, n, rng):
    """Caller owns the stream, so the caller controls reproducibility."""
    return rng.choice(data, n, replace=False)
#
# bad_sample returns the same rows every call, so two "independent"
# bootstrap samples are identical. That is not a hypothetical: it is
# the single most common way a bootstrap silently reports zero variance.

# THE STANDARD SIGNATURE, which accepts a seed, a generator or nothing:
def sample(data, n, random_state=None):
    rng = np.random.default_rng(random_state)
    return rng.choice(data, n, replace=False)
#
# default_rng accepts None (fresh entropy), an int (seeded), or an
# existing Generator (passed straight through). One line covers all three.
`,
      hl: [13, 23, 47, 62],
      caption: "**`np.random.default_rng(x)` accepts `None`, an integer, or an existing `Generator`.** That one line gives a function the standard three-way contract without a branch."
    },

    { t: "callout", kind: "trap", title: "A generator created inside a function is not randomness", body: [
      { t: "p", text: "`rng = default_rng(42)` inside a sampling function returns **the same sample on every call**. Two bootstrap replicates drawn from it are identical, so the estimated variance collapses towards zero and the confidence interval comes out implausibly tight." },
      { t: "p", text: "This passes every test that checks the function \"returns n rows\", and it produces a result that is wrong in the flattering direction — which is why it survives." },
      { t: "p", text: "**Accept the generator as a parameter.** The caller owns reproducibility; a function that seeds itself has taken that decision away from them." }
    ]},

    { t: "h2", n: "02", text: "Splitting streams for parallel work", id: "spawn" },

    { t: "p", text: "**Giving each worker `seed + i` is the wrong way to seed parallel jobs.** Nearby seeds can produce correlated or overlapping streams — `SeedSequence.spawn` exists specifically to generate independent ones from a single root seed." },

    { t: "code", lang: "python", title: "seeding workers so the results are independent and reproducible", code: `
from concurrent.futures import ProcessPoolExecutor
import numpy as np

# WRONG -- seed + i:
def wrong(seed, n_workers):
    return [np.random.default_rng(seed + i) for i in range(n_workers)]
#
# PCG64 makes this less dangerous than it was with older generators,
# but it is still relying on an implementation detail rather than on a
# documented guarantee. There is a supported way, so use it.

# RIGHT -- spawn independent children from one root:
def child_generators(seed, n_workers):
    root = np.random.SeedSequence(seed)
    return [np.random.default_rng(s) for s in root.spawn(n_workers)]

gens = child_generators(42, 4)
[g.random(2).round(4).tolist() for g in gens]
# [[0.4359, 0.026], [0.1497, 0.7302], [0.6072, 0.0993], [0.2385, 0.5843]]
#
# Reproducible AND independent. Rerunning with seed=42 gives the same
# four streams, and no two of them overlap.

# WORKERS MUST RECEIVE THEIR GENERATOR, NOT MAKE ONE:
def bootstrap_worker(args):
    data, seed_seq = args
    rng = np.random.default_rng(seed_seq)
    idx = rng.integers(0, len(data), len(data))
    return data[idx].mean()

def bootstrap(data, n_boot=1000, seed=0, workers=4):
    root = np.random.SeedSequence(seed)
    tasks = [(data, s) for s in root.spawn(n_boot)]
    with ProcessPoolExecutor(workers) as ex:
        return np.array(list(ex.map(bootstrap_worker, tasks)))
#
# NOTE: one spawned sequence PER REPLICATE, not per worker. That way
# the result does not depend on how many processes ran it -- change
# workers from 4 to 8 and the numbers are identical.
#
# This is the property that matters. A bootstrap whose answer depends
# on the machine's core count is not reproducible in any useful sense.

# ON A FORKING PLATFORM, EVERY CHILD INHERITS THE PARENT'S GLOBAL STATE:
# with the legacy API, four forked workers calling np.random.rand()
# produce THE SAME NUMBERS. The bootstrap then has 250 distinct
# replicates instead of 1000, and reports a confidence interval
# roughly half the width it should be.
#
# Generator objects passed explicitly cannot have this problem.

# SAVING AND RESTORING STATE -- for resuming a long job:
rng = np.random.default_rng(0)
rng.random(5)
state = rng.bit_generator.state       # a plain dict, picklable

rng.random(5)                          # advance
rng.bit_generator.state = state        # rewind
rng.random(5)                          # the same five values again
`,
      hl: [14, 36, 42, 51],
      caption: "**Spawn one sequence per replicate, not per worker.** Then changing the pool size from 4 to 8 leaves the results bit-identical — otherwise the answer depends on the machine's core count."
    },

    { t: "h2", n: "03", text: "What a seed cannot fix", id: "limits" },

    { t: "p", text: "Seeding is necessary and not sufficient. **Several sources of run-to-run variation have nothing to do with the random number generator**, and a team that has seeded everything and still cannot reproduce a model is usually looking at one of these." },

    { t: "table",
      head: ["Source", "Why a seed does not help", "What does"],
      rows: [
        ["**Float summation order**", "`a + b + c ≠ a + c + b` in floating point; parallel reductions sum in arrival order", "Single-threaded reduction, or accept a documented tolerance"],
        ["**Thread count**", "BLAS splits matrix products differently across 4 and 8 cores", "Pin `OMP_NUM_THREADS`, or compare with `atol`"],
        ["**Set and dict iteration**", "`set` ordering varies with hash randomisation across processes", "Sort before iterating; `PYTHONHASHSEED=0`"],
        ["**GPU kernels**", "Many are non-deterministic by design — atomic adds land in arbitrary order", "`torch.use_deterministic_algorithms(True)`, at a speed cost"],
        ["**Library versions**", "An algorithm change alters the sequence for the same seed", "Pin versions in a lockfile; record them with the artefact"],
        ["**Wall-clock inputs**", "`datetime.now()` in a feature, or a \"last 30 days\" filter", "Inject the reference time as a parameter"],
        ["**Upstream data**", "The source table is mutable; yesterday's query returns different rows today", "Snapshot the input, or record a content hash"]
      ],
      caption: "**The last row is the one that actually bites.** Most \"irreproducible model\" investigations end at a source table that was updated between the two runs — no amount of seeding touches it."
    },

    { t: "ladder",
      title: "Making an experiment reproducible",
      rungs: [
        { level: "bad", label: "A seed at the top of the notebook", code: `np.random.seed(42)
# ... 400 cells ...`,
          note: "**Reproducible only if the cells run top to bottom, once.** Re-running one cell advances the shared state, so the notebook gives different answers depending on the order you clicked — and it uses the legacy global API, so any library call moves it too." },
        { level: "ok", label: "An explicit generator, threaded through", code: `rng = np.random.default_rng(42)
train, test = split(df, rng=rng)
model = fit(train, rng=rng)`,
          note: "**Correct for randomness and still incomplete.** Nothing here records the library versions, the input snapshot, or the thread count — so it reproduces on this machine today and not necessarily on another one next month." },
        { level: "best", label: "Seed plus provenance", code: `run = {
    "seed": 42,
    "input_hash": sha256_of(df),
    "input_rows": len(df),
    "versions": {"numpy": np.__version__, ...},
    "threads": os.environ.get("OMP_NUM_THREADS"),
    "code_commit": git_rev(),
    "as_of": REFERENCE_DATE,        # never datetime.now()
}
json.dump(run, open(f"runs/{run_id}.json", "w"))`,
          note: "**The seed is one field among seven.** When a rebuild disagrees, this tells you *which* input changed — and in practice the answer is nearly always `input_hash`, not the seed." }
      ]
    },

    { t: "h2", n: "04", text: "Sampling correctly", id: "sampling" },

    { t: "code", lang: "python", title: "the four sampling patterns you actually need", code: `
rng = np.random.default_rng(0)
data = np.arange(100)

# 1. WITHOUT REPLACEMENT -- a subsample. Each element at most once.
rng.choice(data, 10, replace=False)
#
# Cannot request more than len(data). This is what "take a random
# 10% for a quick look" means.

# 2. WITH REPLACEMENT -- a bootstrap. Elements can repeat.
rng.choice(data, 100, replace=True)
#
# A bootstrap sample is the SAME SIZE as the original and contains
# roughly 63.2% of the distinct rows -- the rest are duplicates. That
# is not a flaw; it is what produces the sampling variation you are
# trying to measure.
len(set(rng.choice(data, 100, replace=True)))     # ~63

# 3. WEIGHTED -- probability proportional to some quantity:
weights = np.array([0.5, 0.3, 0.15, 0.05])
rng.choice(["a", "b", "c", "d"], 1000, p=weights)
#
# p MUST sum to 1 or NumPy raises. Normalise explicitly rather than
# trusting the source:
w = np.array([5.0, 3.0, 1.5, 0.5])
rng.choice(4, 10, p=w / w.sum())

# 4. STRATIFIED -- preserve group proportions. NOT a NumPy primitive:
def stratified_sample(labels, frac, rng):
    """Take frac of each class, so the class balance is preserved."""
    idx = []
    for cls in np.unique(labels):
        pool = np.flatnonzero(labels == cls)
        k = max(1, int(round(frac * len(pool))))     # never zero
        idx.append(rng.choice(pool, k, replace=False))
    return np.sort(np.concatenate(idx))

y = np.repeat([0, 1], [950, 50])                  # 5% positive
s = stratified_sample(y, 0.1, rng)
y[s].mean()                                       # ~0.05, preserved
#
# A PLAIN RANDOM 10% OF THIS DATA has a real chance of containing very
# few positives, and on a rarer class it can contain none at all:
plain = rng.choice(len(y), 95, replace=False)
y[plain].sum()                                    # varies -- 1 to 10

# THE max(1, ...) IS LOAD-BEARING. Without it, a class with 8 members
# at frac=0.1 rounds to 0 and vanishes from the sample entirely --
# which is how a rare class silently disappears from a validation set.

# SHUFFLING: in place against returning a copy
a = np.arange(10)
rng.shuffle(a)                # IN PLACE, returns None
b = rng.permutation(np.arange(10))    # returns a new array

# ON 2-D DATA, shuffle MOVES WHOLE ROWS along axis 0:
X = np.arange(12).reshape(4, 3)
rng.shuffle(X)                # rows reordered, rows stay intact
#
# TO SHUFFLE X AND y TOGETHER, permute the INDICES -- never shuffle
# each array separately, which destroys the pairing silently:
idx = rng.permutation(len(X))
X_s, y_s = X[idx], y[:len(X)][idx]
`,
      hl: [17, 34, 47, 63],
      caption: "**A bootstrap sample contains about 63.2% of the distinct rows.** The duplicates are the mechanism, not an artefact — they are what generates the sampling variation you are measuring."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The bootstrap that reported a suspiciously tight interval",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A team's bootstrap confidence interval for a mean came out about a third of the width of the analytical one, and it got narrower when they moved the job to a bigger machine." },
        { t: "code", lang: "python", numbered: false, title: "bootstrap.py", code: `
import numpy as np
from multiprocessing import Pool

def replicate(data):
    idx = np.random.randint(0, len(data), len(data))
    return data[idx].mean()

def bootstrap_ci(data, n_boot=1000, workers=8, seed=42):
    np.random.seed(seed)
    with Pool(workers) as p:
        means = np.array(p.map(replicate, [data] * n_boot))
    return np.percentile(means, [2.5, 97.5])`},
        { t: "p", text: "Find every reason this is wrong, explain why the interval narrows on a bigger machine, and rewrite it so the result does not depend on the pool size." }
      ],
      requirements: [
        "Identify each defect, not just the first.",
        "Explain the direction of the error and why it flatters the result.",
        "Explain why more workers make it worse.",
        "Rewrite it so results are identical for any worker count.",
        "Show the corrected interval against the analytical one.",
        "Include tests, including one that would have caught this."
      ],
      hint: "What does a forked child process inherit? And how many distinct values does `p.map` actually produce?",
      solution: {
        lang: "python",
        title: "bootstrap_fixed.py",
        code: `import numpy as np
from concurrent.futures import ProcessPoolExecutor


# =========================================================================
# THE DEFECTS -- there are four
# =========================================================================
#
# 1. FORKED PROCESSES INHERIT THE PARENT'S GLOBAL RANDOM STATE.
#    np.random.seed(42) sets one global state. Every forked worker
#    starts from an identical copy of it, so all 8 workers generate
#    THE SAME index sequence.
#
#    With 8 workers, 1000 replicates produce roughly 8 distinct
#    values, each repeated 125 times.
#
# 2. THE PERCENTILES ARE THEN COMPUTED FROM ~8 NUMBERS.
#    np.percentile on 8 distinct values (repeated) gives a much
#    narrower spread than 1000 genuine replicates would. Hence the
#    third-width interval.
#
# 3. MORE WORKERS DOES NOT HELP -- but the DIRECTION is the subtle bit.
#    More workers means more distinct states, so 8 workers is better
#    than 4. The team observed it getting NARROWER on a bigger
#    machine, which points at the other mechanism below.
#
# 4. THE RESULT DEPENDS ON THE POOL SIZE AT ALL.
#    Even ignoring correctness, a statistic that changes when you
#    change the core count is not reproducible. Two people running
#    identical code on different laptops get different answers.
#
# WHY BIGGER MACHINE -> NARROWER:
#    A larger machine schedules chunks differently. p.map chunks the
#    input, and with more workers each worker handles a smaller
#    contiguous chunk before the state is re-forked or reused. In
#    practice the observed effect comes from a variable number of
#    genuinely distinct states divided across a fixed 1000 replicates
#    -- the fewer chunks that carry unique state, the fewer distinct
#    means, and the tighter the percentile spread.
#
#    The reliable statement: the number of DISTINCT replicates is an
#    accident of the execution environment, and the interval width is
#    a direct function of that count.


def demonstrate_the_bug(n_boot=1000, n_workers=8, seed=42):
    """Simulate the collapse without needing real processes."""
    rng_state = np.random.RandomState(seed)
    data = rng_state.normal(100, 15, 500)

    # Each "worker" starts from the same inherited state:
    per_worker = []
    for _ in range(n_workers):
        st = np.random.RandomState(seed)            # identical copy
        idx = st.randint(0, len(data), len(data))
        per_worker.append(data[idx].mean())

    means = np.array(per_worker * (n_boot // n_workers))
    return len(np.unique(means)), np.percentile(means, [2.5, 97.5])


demonstrate_the_bug(n_workers=8)      # (8, a very narrow interval)
demonstrate_the_bug(n_workers=2)      # (2, essentially zero width)


# =========================================================================
# THE FIX
# =========================================================================

def _replicate(args):
    """One bootstrap replicate with its own independent stream."""
    data, seed_seq, statistic = args
    rng = np.random.default_rng(seed_seq)
    idx = rng.integers(0, len(data), len(data))
    return statistic(data[idx])


def bootstrap_ci(data, statistic=np.mean, n_boot=2000, seed=0,
                 workers=None, alpha=0.05):
    """Percentile bootstrap CI, identical for any worker count.

    ONE SPAWNED SEED SEQUENCE PER REPLICATE -- not per worker. That is
    what makes the result independent of how the work was distributed.
    """
    data = np.asarray(data, dtype=float)
    if data.ndim != 1:
        raise ValueError(f"expected 1-D data, got {data.shape}")
    if len(data) < 2:
        raise ValueError("need at least two observations")

    root = np.random.SeedSequence(seed)
    tasks = [(data, s, statistic) for s in root.spawn(n_boot)]

    if workers in (None, 1):
        means = np.array([_replicate(t) for t in tasks])
    else:
        with ProcessPoolExecutor(workers) as ex:
            means = np.array(list(ex.map(_replicate, tasks)))

    lo, hi = np.percentile(means, [100 * alpha / 2, 100 * (1 - alpha / 2)])

    return {
        "lo": float(lo),
        "hi": float(hi),
        "width": float(hi - lo),
        "point": float(statistic(data)),
        "n_boot": n_boot,
        "n_distinct": int(len(np.unique(means))),   # the canary
        "se": float(means.std(ddof=1)),
    }


# =========================================================================
# CHECKING IT AGAINST THE ANALYTICAL INTERVAL
# =========================================================================

rng = np.random.default_rng(7)
sample = rng.normal(100, 15, 500)

boot = bootstrap_ci(sample, n_boot=2000, seed=0)

# Analytical CI for a mean: xbar +/- 1.96 * s / sqrt(n)
se = sample.std(ddof=1) / np.sqrt(len(sample))
analytical = (sample.mean() - 1.96 * se, sample.mean() + 1.96 * se)

boot["lo"], boot["hi"]          # (~98.7, ~101.1)
analytical                      # (~98.7, ~101.1)
boot["width"] / (analytical[1] - analytical[0])       # ~1.00
#
# For a mean on well-behaved data the bootstrap should closely match
# the analytical interval. A ratio far from 1 means something is
# wrong with the bootstrap, not that the bootstrap found something.


# =========================================================================
# THE CANARY -- n_distinct
# =========================================================================
#
# A healthy bootstrap of 2000 replicates on continuous data produces
# close to 2000 distinct values. The broken version produced 8.
#
# Reporting n_distinct next to the interval makes the failure visible
# in the OUTPUT, without anyone needing to suspect it first.
boot["n_distinct"]              # ~2000


# =========================================================================
# TESTS
# =========================================================================

def test_result_is_independent_of_worker_count():
    """The property the original version lacked."""
    data = np.random.default_rng(1).normal(50, 10, 200)

    one = bootstrap_ci(data, n_boot=200, seed=3, workers=1)
    four = bootstrap_ci(data, n_boot=200, seed=3, workers=4)

    assert np.isclose(one["lo"], four["lo"])
    assert np.isclose(one["hi"], four["hi"])


def test_same_seed_reproduces():
    data = np.arange(100, dtype=float)
    a = bootstrap_ci(data, n_boot=100, seed=11)
    b = bootstrap_ci(data, n_boot=100, seed=11)

    assert a == b


def test_different_seed_differs():
    data = np.arange(100, dtype=float)
    a = bootstrap_ci(data, n_boot=100, seed=11)
    b = bootstrap_ci(data, n_boot=100, seed=12)

    assert a["lo"] != b["lo"]


def test_replicates_are_genuinely_distinct():
    """The test that would have caught the original bug immediately."""
    data = np.random.default_rng(2).normal(0, 1, 300)
    r = bootstrap_ci(data, n_boot=500, seed=0)

    assert r["n_distinct"] > 0.95 * r["n_boot"]


def test_matches_analytical_interval_for_a_mean():
    data = np.random.default_rng(5).normal(100, 15, 1000)
    r = bootstrap_ci(data, n_boot=2000, seed=0)

    se = data.std(ddof=1) / np.sqrt(len(data))
    expected = 2 * 1.96 * se

    assert 0.85 < r["width"] / expected < 1.15


def test_bootstrap_sample_covers_about_63_percent():
    """Why duplicates are the mechanism, not a defect."""
    rng = np.random.default_rng(0)
    n = 5000
    idx = rng.integers(0, n, n)

    assert 0.60 < len(np.unique(idx)) / n < 0.66


def test_rejects_degenerate_input():
    for bad in (np.array([1.0]), np.zeros((3, 2))):
        try:
            bootstrap_ci(bad)
            assert False, "should have raised"
        except ValueError:
            pass`,
        notes: [
          { t: "p", text: "**Forked workers inherit an identical copy of the global random state**, so eight processes generate eight identical index sequences. A thousand replicates collapse to roughly eight distinct values, and percentiles taken over eight numbers are far tighter than over a thousand." },
          { t: "callout", kind: "insight", title: "The interval width is a direct function of distinct replicates", body: [
            { t: "p", text: "That is why the result moved when the machine changed: the number of genuinely distinct states is an accident of how the pool chunked the work, not a property of the data." },
            { t: "p", text: "**A statistic that changes with the core count is not reproducible in any useful sense** — even setting aside whether it is correct." }
          ]},
          { t: "p", text: "**Spawn one seed sequence per replicate, not per worker.** That single choice makes the output bit-identical for `workers=1` and `workers=8`, which is what the test asserts." },
          { t: "p", text: "**`n_distinct` is the canary worth shipping.** A healthy bootstrap of 2,000 replicates on continuous data produces close to 2,000 distinct values; reporting the count next to the interval makes the failure visible in the output rather than requiring someone to suspect it first." },
          { t: "p", text: "**Compare against the analytical interval when one exists.** For a mean on well-behaved data the ratio should be close to 1 — a bootstrap a third of the analytical width has not discovered something, it is broken." },
          { t: "p", text: "**The 63.2% coverage test documents the mechanism.** Duplicates in a bootstrap sample are not a flaw to be fixed; they are what generates the sampling variation being measured." }
        ]
      }
    },

    { t: "callout", kind: "warn", title: "Never use a PRNG for anything security-related", body: [
      { t: "p", text: "`default_rng` is fast and statistically excellent and completely predictable to anyone who observes enough output. PCG64's state can be recovered from a modest number of consecutive draws." },
      { t: "p", text: "**For tokens, passwords, salts, session identifiers or anything an attacker benefits from guessing, use `secrets`** — `secrets.token_urlsafe(32)` — or `os.urandom`. Those draw from the operating system's cryptographic entropy source." },
      { t: "p", text: "The distinction is the threat model, not the quality of the randomness: reproducibility is exactly the property you want in an experiment and exactly the one that must not exist in a credential." }
    ]}
  ],

  takeaways: [
    "**`np.random.seed` sets one global state shared by every module in the process** — any library that draws from it changes what your next call returns.",
    "**Use `np.random.default_rng(seed)`** and hold the `Generator` yourself; nothing else can reach it.",
    "**`default_rng` accepts `None`, an int, or an existing Generator**, which gives a function the standard three-way contract in one line.",
    "**Pass the generator in; never create one inside a sampling function** — a self-seeded function returns the same sample every call and collapses a bootstrap's variance.",
    "**Use `SeedSequence.spawn` for parallel work**, not `seed + i`.",
    "**Spawn one sequence per replicate, not per worker**, so results do not depend on the pool size.",
    "**Forked processes inherit the parent's global random state** — with the legacy API, every worker produces identical numbers.",
    "**A seed does not fix float summation order, thread count, set iteration, GPU kernels, library versions or mutable source data.**",
    "**Record provenance alongside the seed**: input hash, row count, versions, commit, reference date.",
    "**A bootstrap sample contains about 63.2% of the distinct rows** — the duplicates are the mechanism, not an artefact.",
    "**Stratified sampling is not a NumPy primitive**, and the `max(1, ...)` guard is what stops a rare class vanishing entirely.",
    "**Never use a PRNG for tokens or credentials** — `secrets` and `os.urandom` exist for that, and reproducibility is the property you specifically do not want."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why can a script with `np.random.seed(42)` at the top still produce different results between runs?",
        options: [
          "The seed expires",
          "The seed sets one global state that any imported library also draws from and advances",
          "NumPy re-seeds from the clock periodically",
          "Integer seeds are not supported"
        ],
        answer: 1,
        why: "The legacy API has a single hidden generator shared by the whole process. A library that samples internally — for plot dithering, jitter, or a shuffle inside a helper — advances the state your next line reads. `default_rng` gives you a generator object nothing else can touch."
      },
      {
        stem: "A sampling function does `rng = np.random.default_rng(42)` on its first line. What breaks?",
        options: [
          "Nothing — it is properly seeded",
          "Every call returns the identical sample, so repeated bootstrap draws are the same and the estimated variance collapses",
          "It is too slow",
          "The seed must be prime"
        ],
        answer: 1,
        why: "The generator is recreated from the same seed on every call, so there is no sequence at all. The confidence interval comes out implausibly tight — wrong in the flattering direction, which is why it survives review. Accept the generator as a parameter instead."
      },
      {
        stem: "For a parallel bootstrap, how should replicates be seeded so the result does not depend on worker count?",
        options: [
          "Seed each worker with `seed + worker_id`",
          "Spawn one `SeedSequence` per replicate from a single root, and pass it to whichever worker runs it",
          "Seed once in the parent before forking",
          "Use a different seed for each run"
        ],
        answer: 1,
        why: "One sequence per replicate means replicate 37 gets the same stream regardless of which process handles it, so `workers=1` and `workers=8` give bit-identical output. Seeding per worker makes the answer a function of the machine's core count."
      },
      {
        stem: "Everything is seeded and a model still cannot be rebuilt exactly. What is the most likely cause?",
        options: [
          "The seed was too small",
          "The source data changed between runs — a mutable table queried at two different times",
          "NumPy is non-deterministic",
          "The model has random initialisation"
        ],
        answer: 1,
        why: "Most irreproducibility investigations end at the input, not the generator. That is the argument for recording a content hash and row count alongside the seed — thread count, library versions and float summation order are the other candidates, and none of them is affected by seeding."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why does NumPy have two random APIs, and which should you use?",
        strong: "The legacy `np.random.*` functions share one global state for the whole process, so any library that draws from it changes your results. `default_rng` returns a Generator object you own, uses PCG64 rather than Mersenne Twister, and cannot be disturbed by other code. Use it, and pass the generator into functions rather than creating one inside.",
        answer: [
          { t: "p", text: "The ownership point is the substantive one — the statistical improvement in PCG64 is real but almost never the reason it matters in practice." },
          { t: "p", text: "Mentioning that `default_rng` accepts a seed, a Generator, or None shows you know how to write the standard `random_state` parameter." }
        ]
      },
      {
        level: "advanced",
        q: "How would you seed a parallel bootstrap?",
        strong: "One `SeedSequence.spawn` per replicate from a single root seed, passed to whichever worker executes it. That makes the result identical regardless of pool size. Seeding per worker, or seeding once before forking, makes the answer depend on the machine — and with the legacy API forked children inherit identical state and produce identical numbers.",
        answer: [
          { t: "p", text: "The per-replicate rather than per-worker distinction is the detail that separates people who have debugged this from people who have read about it." },
          { t: "p", text: "Adding the canary — count distinct replicate values and assert it is close to `n_boot` — shows you would catch it in production rather than in review." }
        ]
      },
      {
        level: "expert",
        q: "A colleague says their pipeline is reproducible because everything is seeded. What would you push back on?",
        strong: "Seeding covers the generator and nothing else. Float summation order varies with thread count, set iteration order varies across processes, many GPU kernels are non-deterministic by design, library upgrades change sequences for the same seed, and any `datetime.now()` in a feature makes the output time-dependent. Most often, though, the input table is mutable and was simply different on the second run.",
        answer: [
          { t: "p", text: "Leading with the input data — the cause that actually dominates in practice — rather than the exotic float-ordering answer shows real experience." },
          { t: "p", text: "The constructive follow-up is recording provenance: input hash, row count, versions, commit and reference date, so a disagreement tells you which field moved." }
        ]
      }
    ]
  }
});
