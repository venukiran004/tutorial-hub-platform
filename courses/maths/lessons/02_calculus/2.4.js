/* ============================================================================
   LESSON 2.4 — Convexity, and Why It Decides Everything
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "Convexity is the single property that separates optimisation problems you can *solve* from problems you can only *attempt*. **In a convex problem every local minimum is global**, so finding one is finding the answer. Outside convexity nothing guarantees that — which is why deep learning is an engineering discipline and logistic regression is not.",

  objectives: [
    "State what convexity means and test for it three ways",
    "Explain why local equals global, rather than asserting it",
    "Recognise which common losses are convex and which are not",
    "Say what changes practically when a problem is not convex",
    "Use Jensen's inequality where it appears in machine learning"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "The definition, and what it buys", id: "definition" },

    { t: "viz",
      title: "A chord never dips below the curve",
      caption: "That is the whole definition. Every consequence — local equals global, no saddles, a unique minimum for strictly convex functions — follows from this one geometric fact.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="A convex function with a chord above it, beside a non-convex function with a chord cutting below">
  <g>
    <text x="30" y="30" class="s-label" style="fill:var(--good)">CONVEX</text>
    <path d="M40 200 Q 190 30 340 200" style="stroke:var(--accent);fill:none" stroke-width="2.5" transform="scale(1,-1) translate(0,-230)"/>
    <path d="M40 60 Q 190 230 340 60" style="stroke:var(--accent);fill:none" stroke-width="2.5"/>
    <line x1="90" y1="105" x2="290" y2="105" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="2"/>
    <circle cx="90" cy="105" r="4" style="fill:var(--good)"/>
    <circle cx="290" cy="105" r="4" style="fill:var(--good)"/>
    <text x="150" y="96" class="s-sub" style="fill:var(--good)">chord stays above</text>
    <text x="40" y="232" class="s-sub" style="fill:var(--ink-3)">one minimum · any downhill path reaches it</text>
  </g>

  <g>
    <text x="500" y="30" class="s-label" style="fill:var(--crit)">NOT CONVEX</text>
    <path d="M510 90 C 560 210, 600 60, 650 150 C 690 220, 740 80, 800 190 L 860 120"
          style="stroke:var(--accent);fill:none" stroke-width="2.5"/>
    <line x1="560" y1="150" x2="800" y2="190" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="2"/>
    <circle cx="560" cy="150" r="4" style="fill:var(--crit)"/>
    <circle cx="800" cy="190" r="4" style="fill:var(--crit)"/>
    <text x="600" y="120" class="s-sub" style="fill:var(--crit)">curve rises above the chord</text>
    <text x="500" y="232" class="s-sub" style="fill:var(--ink-3)">many minima · where you land depends on where you start</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "three equivalent tests", code: `
import numpy as np

# TEST 1 -- THE CHORD (the definition itself).
#   f(t*a + (1-t)*b)  <=  t*f(a) + (1-t)*f(b)   for all t in [0,1]
def is_convex_sampled(f, lo, hi, n=200, rng=None):
    rng = rng or np.random.default_rng(0)
    a, b = rng.uniform(lo, hi, n), rng.uniform(lo, hi, n)
    t = rng.uniform(0, 1, n)
    return np.all(f(t*a + (1-t)*b) <= t*f(a) + (1-t)*f(b) + 1e-9)

is_convex_sampled(lambda x: x**2, -5, 5)          # True
is_convex_sampled(lambda x: np.sin(x), -5, 5)     # False

# A sampled test can only DISPROVE convexity. Finding no violation is
# not a proof -- it is a failure to find a counterexample.

# TEST 2 -- SECOND DERIVATIVE (one dimension).
#   f'' >= 0 everywhere.
#   x^2   -> 2      >= 0   convex
#   x^3   -> 6x     < 0 for x < 0   NOT convex
#   e^x   -> e^x    > 0    convex
#   log x -> -1/x^2 < 0    CONCAVE (so -log x is convex)

# TEST 3 -- THE HESSIAN (many dimensions).
#   Positive SEMI-definite everywhere: all eigenvalues >= 0.
def is_convex_at(hess, x):
    return np.linalg.eigvalsh(hess(x)).min() >= -1e-12

# f(x,y) = x^2 + y^2  -> H = [[2,0],[0,2]], eigenvalues [2,2]  convex
# f(x,y) = x^2 - y^2  -> H = [[2,0],[0,-2]], eigenvalues [2,-2] NOT
#                        (a saddle -- exactly the mixed-sign case from 1.4)
`,
      hl: [12, 21, 27],
      caption: "**Test 3 is the one that generalises.** \"All eigenvalues non-negative\" is the multi-dimensional version of \"`f'' ≥ 0`\", and it is the same positive-definiteness that classified critical points in lesson 1.4."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Convexity means there is nowhere to get stuck.** A bowl has one bottom; roll downhill from anywhere and you arrive. That is why a convex problem is *solved* rather than *trained* — the algorithm's job is speed, not luck, and two runs from different starts reach the same answer." },
      { t: "p", text: "The proof of local-equals-global is the chord property directly: if a second, lower minimum existed elsewhere, the chord joining the two would dip below the curve between them, contradicting convexity. So no second minimum can exist." }
    ]},

    { t: "h2", n: "02", text: "Which losses are convex", id: "which" },

    { t: "table",
      head: ["Model / loss", "Convex?", "Consequence"],
      rows: [
        ["Linear regression, squared loss", "**Yes**", "Closed-form solution exists"],
        ["Logistic regression, log loss", "**Yes**", "One optimum; seeds do not matter"],
        ["Ridge (L2 penalty)", "**Yes, strictly**", "Unique minimum even when `X` is rank-deficient"],
        ["Lasso (L1 penalty)", "Yes, not strictly", "Convex but non-smooth — needs subgradients"],
        ["SVM, hinge loss", "**Yes**", "A global optimum, reachable"],
        ["**Any neural network with hidden layers**", "**No**", "**Many minima; initialisation matters**"],
        ["k-means", "No", "Restart with different seeds"],
        ["Matrix factorisation", "No (jointly)", "**Convex in each factor alone** — hence alternating least squares"]
      ],
      caption: "**The last row is the useful trick.** A problem that is not jointly convex is often convex in one block of variables with the others fixed, which is what alternating minimisation exploits."
    },

    { t: "code", lang: "python", title: "why a network cannot be convex", code: `
# PERMUTATION SYMMETRY is a proof, not an intuition. Take any trained
# network and swap two hidden units -- their incoming and outgoing
# weights together. The function computed is IDENTICAL, so the loss is
# identical.

W1 = np.array([[1.0, 2.0],
               [3.0, 4.0]])         # input -> hidden
W2 = np.array([[5.0],
               [6.0]])              # hidden -> output

def net(x, W1, W2):
    return np.maximum(x @ W1, 0) @ W2

# Swap the two hidden units: columns of W1 and rows of W2 together.
W1s, W2s = W1[:, [1, 0]], W2[[1, 0], :]

x = np.array([[0.7, -0.3]])
net(x, W1, W2), net(x, W1s, W2s)          # identical outputs

# So there are at least 2! = 2 distinct parameter vectors with the same
# loss -- and for a layer of h units, h! of them.
#
#   h = 100  ->  100! ~ 9.3e157 equivalent minima
#
# A STRICTLY convex function has exactly ONE minimum. A function with
# 10^157 of them is not convex, and no clever reformulation of the
# weights changes that -- the symmetry is intrinsic to the architecture.

import math
math.factorial(100)                  # 9.33e157
`,
      hl: [15, 24],
      caption: "**Permutation symmetry alone rules out convexity**, before any nonlinearity is considered. It also explains why comparing two trained networks weight-by-weight is meaningless — they may be the same function in a different order."
    },

    { t: "h2", n: "03", text: "What changes when it is not convex", id: "consequences" },

    { t: "ladder",
      title: "Getting a reliable result from an optimisation",
      rungs: [
        { level: "bad", label: "Treat a non-convex problem like a convex one",
          why: "Run once from one initialisation, report the number, and assume it is the answer. For k-means or a neural network that number is a sample from a distribution of outcomes, and reporting it as *the* result hides variance that can exceed the effect you are measuring.",
          code: `model = KMeans(n_clusters=5, n_init=1, random_state=0).fit(X)
print(model.inertia_)          # one draw, reported as the answer` },
        { level: "ok", label: "Restart and take the best",
          why: "Multiple initialisations sample the basins and keep the best, which is why `n_init` exists. It costs linearly more compute and still gives no guarantee — only a better chance.",
          code: `model = KMeans(n_clusters=5, n_init=20).fit(X)
# sklearn's default is already n_init=10 for exactly this reason.` },
        { level: "best", label: "Measure the spread, then decide",
          why: "Run several seeds and look at the distribution, not just the best. If the spread is small the problem is effectively well behaved; if it is large, that variance is a property of your result and must be reported alongside it.",
          code: `losses = [KMeans(n_clusters=5, n_init=1, random_state=s)
          .fit(X).inertia_ for s in range(30)]

np.mean(losses), np.std(losses), np.min(losses)
# If std is a few percent of the mean, restarts are enough.
# If it is 30%, the number of clusters is probably wrong -- high
# variance across seeds usually means the model does not fit the data,
# not that the optimiser is weak.

# THE SAME DISCIPLINE FOR NETWORKS: report mean and spread over seeds.
# A 0.3% improvement from an architecture change is meaningless if the
# seed-to-seed standard deviation is 0.8%, and most reported gains of
# that size are seed noise.`,
          note: "**Seed variance is a measurement you owe the reader.** Without it, any comparison between two non-convex models is uninterpretable." }
      ]
    },

    { t: "callout", kind: "insight", title: "Non-convex is less bad than it sounds", body: [
      { t: "p", text: "In high dimensions the practical difficulty is not local minima but **saddle points** — a critical point needs every Hessian eigenvalue positive to be a minimum, which is vanishingly unlikely when there are millions of them (lesson 1.4). Most critical points a network meets are saddles, and noise escapes those." },
      { t: "code", lang: "python", title: "and the minima that exist tend to be similar", numbered: false, code: `
# The empirical finding that makes deep learning workable: for large
# networks, most local minima reached by SGD have similar loss.
#
#   ten seeds, same architecture, same data:
#     final train loss:  0.0312, 0.0309, 0.0315, 0.0311, 0.0308, ...
#     spread: well under 1%
#
# They are DIFFERENT points in parameter space -- weight-by-weight the
# models are unrelated -- and they are equally good.
#
# So the practical worry is not "did I find the global optimum" (you did
# not, and it does not matter) but:
#
#   1. is the seed variance small enough that my comparison is real?
#   2. does the minimum I found GENERALISE, which convexity says
#      nothing about at all`},
      { t: "p", text: "**Convexity is a statement about the training loss and nothing else.** A convex problem can overfit badly, and a non-convex one can generalise well — the two questions are independent, and conflating them is a common error." }
    ]},

    { t: "h2", n: "04", text: "Jensen's inequality", id: "jensen" },

    { t: "code", lang: "python", title: "the inequality you already use", code: `
# For a CONVEX f:      f(E[X])  <=  E[f(X)]
# For a CONCAVE f:     f(E[X])  >=  E[f(X)]
#
# "The function of the average is at most the average of the function."

x = np.array([1.0, 2.0, 3.0, 10.0])

# Convex: squaring
(x.mean())**2, (x**2).mean()          # 16.0, 28.5   -- f(E) <= E[f]

# Concave: log
np.log(x.mean()), np.log(x).mean()    # 1.386, 1.156 -- f(E) >= E[f]

# WHERE IT SHOWS UP:
#
# 1. VARIANCE IS NON-NEGATIVE. Var(X) = E[X^2] - E[X]^2 >= 0 is exactly
#    Jensen for f(x) = x^2. The inequality IS the reason a variance
#    cannot be negative.
(x**2).mean() - x.mean()**2           # 12.5 >= 0, necessarily

# 2. THE ARITHMETIC MEAN BEATS THE GEOMETRIC MEAN, by Jensen on log.
from scipy.stats import gmean
x.mean(), gmean(x)                    # 4.0, 2.783

# 3. THE ELBO IN VARIATIONAL INFERENCE. log is concave, so
#       log E[p] >= E[log p]
#    and the right-hand side is a computable lower bound on an
#    intractable log-likelihood. That bound is the whole method.

# 4. WHY CROSS-ENTROPY IS MINIMISED BY THE TRUE DISTRIBUTION.
#    KL(p||q) >= 0 follows from Jensen applied to -log, so predicting
#    the true probabilities is optimal -- which is why cross-entropy is
#    a sensible loss at all.
`,
      hl: [8, 17, 24],
      caption: "**Jensen is why a variance cannot be negative and why the ELBO is a bound.** Two results that look unrelated are the same inequality applied to `x²` and to `log`."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Decide whether a result is real or seed noise",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "A team reports that a new architecture improves validation accuracy from 91.2% to 91.9%, and wants to ship it. Each number is from one training run." },
        { t: "code", lang: "python", numbered: false, title: "what is available", code: `
# Baseline, five seeds run earlier for a different purpose:
baseline = [0.912, 0.908, 0.919, 0.905, 0.916]

# New architecture, one run:
new = [0.919]

# Both are non-convex; both use the same data, schedule and budget.
# Training one model takes 6 hours on the available hardware.`},
        { t: "p", text: "Say whether the result supports the claim, what you would run, and what the team should report." }
      ],
      requirements: [
        "Compute the baseline spread and compare it with the claimed gain.",
        "Say what the single new run can and cannot establish.",
        "Explain why this is specifically a consequence of non-convexity.",
        "Say how many seeds are needed, with the reasoning.",
        "Give what should be reported.",
        "Say what you would do if the compute budget forbids that."
      ],
      hint: "Compare the effect size to the standard deviation of the baseline before anything else.",
      solution: {
        lang: "python",
        title: "review.md",
        code: `# =========================================================================
# THE SPREAD AGAINST THE CLAIM
# =========================================================================

baseline = np.array([0.912, 0.908, 0.919, 0.905, 0.916])

baseline.mean()      # 0.9120
baseline.std(ddof=1) # 0.00580
baseline.min()       # 0.905
baseline.max()       # 0.919

# THE CLAIMED GAIN IS 0.919 - 0.912 = 0.007.
# THE BASELINE ALREADY PRODUCED 0.919 ON ONE OF ITS OWN SEEDS.
#
# So the "new" result is exactly equal to the best baseline run. The
# effect size is 0.007 and the seed-to-seed standard deviation is 0.0058
# -- the claimed improvement is about 1.2 standard deviations of pure
# noise, and it is a value the baseline itself reaches routinely.
#
# In other words: if you ran the baseline five more times and reported
# the best, you would claim the same "improvement" with no change at all.
#
#
# =========================================================================
# WHAT ONE RUN CAN ESTABLISH
# =========================================================================
#
# CAN: that the new architecture trains, and lands within the range the
#      baseline already occupies.
#
# CANNOT: that it is better. A single draw from a distribution says
#      almost nothing about that distribution's mean when the spread is
#      comparable to the effect being claimed.
#
# The comparison being made is between ONE sample of the new model and
# the MEAN of five samples of the baseline -- which is not a comparison
# of two methods, it is a comparison of a draw against an average.
#
#
# =========================================================================
# WHY THIS IS A NON-CONVEXITY PROBLEM
# =========================================================================
#
# For a CONVEX problem -- logistic regression, ridge, an SVM -- there is
# one optimum. Two runs from different initialisations converge to the
# same parameters, so one run is the answer and a seed column would be
# a column of identical numbers. Comparing two convex models needs one
# run each.
#
# A network has many minima. Permutation symmetry alone gives h!
# equivalent parameter vectors per hidden layer, and SGD's noise means
# which basin you land in depends on the seed, the data order and the
# hardware's floating-point behaviour.
#
# So a trained network's score is a RANDOM VARIABLE. Reporting one draw
# as "the accuracy" is the same error as reporting one sample as a
# population mean -- and it is a direct consequence of the loss surface
# not being convex.
#
# Note what this does NOT say: the minima are probably similarly good
# (that is why deep learning works at all). The variance is small in
# absolute terms -- under 1% -- and that is exactly the problem, because
# the effects people want to claim are also under 1%.
#
#
# =========================================================================
# HOW MANY SEEDS
# =========================================================================
#
# Work it from the effect you want to be able to detect. To detect a
# true difference d with 80% power at alpha = 0.05, for two independent
# groups of n runs each:
#
#     n ~= 16 * sigma^2 / d^2
#
# With sigma = 0.0058:
#
#   d = 0.010 (1.0pp):  n ~= 16 * 3.4e-5 / 1e-4  =  5.4  -> 6 seeds each
#   d = 0.007 (0.7pp):  n ~= 16 * 3.4e-5 / 4.9e-5 = 11.0 -> 11 seeds each
#   d = 0.003 (0.3pp):  n ~= 16 * 3.4e-5 / 9e-6  = 60    -> 60 seeds each
#
# To detect the CLAIMED 0.7pp effect needs about 11 runs per arm -- 22
# runs, or 132 GPU-hours. That is the honest cost of the claim, and it
# is worth stating before the work rather than after.
#
# The steep dependence on d is the important part: halving the effect
# you want to detect quadruples the runs. Sub-0.5pp claims are usually
# unaffordable to establish, which is a reason to be suspicious of them
# in papers as well as in your own work.
#
#
# =========================================================================
# WHAT TO REPORT
# =========================================================================
#
# Never a single number. At minimum:
#
#     baseline:  91.2% +/- 0.6%  (n = 5 seeds)
#     new arch:  91.9% +/- 0.5%  (n = 5 seeds)
#     difference: +0.7pp, 95% CI [-0.1, +1.5]
#
# A confidence interval that includes zero is the honest summary: the
# result is consistent with no improvement. That is not a failure to
# report -- it is the finding.
#
# Report also: the number of seeds, what varied between them (init only,
# or data order too), and whether any runs were discarded. Silently
# dropping a diverged run biases the mean upward.

def compare(a, b, name_a="baseline", name_b="new"):
    """Report a difference with its uncertainty, or refuse to."""
    from scipy import stats
    a, b = np.asarray(a), np.asarray(b)
    if len(a) < 3 or len(b) < 3:
        raise ValueError(
            f"{len(a)} and {len(b)} runs: too few to estimate spread. "
            f"A single run of a non-convex model is one draw, not a result."
        )
    t = stats.ttest_ind(b, a, equal_var=False)
    d = b.mean() - a.mean()
    se = np.sqrt(a.var(ddof=1)/len(a) + b.var(ddof=1)/len(b))
    return {
        name_a: f"{a.mean():.4f} +/- {a.std(ddof=1):.4f} (n={len(a)})",
        name_b: f"{b.mean():.4f} +/- {b.std(ddof=1):.4f} (n={len(b)})",
        "difference": f"{d:+.4f}",
        "ci95": (round(d - 1.96*se, 4), round(d + 1.96*se, 4)),
        "p": round(float(t.pvalue), 4),
    }


# =========================================================================
# IF THE BUDGET FORBIDS IT
# =========================================================================
#
# 22 full runs may genuinely be unaffordable. Options, roughly in order
# of usefulness:
#
# 1. REDUCE THE VARIANCE INSTEAD OF ADDING RUNS. Fixing the data order
#    across arms, and using the same seeds for both, makes the
#    comparison PAIRED -- which removes the shared component of the
#    variance and can cut the required n substantially. This is free.
#
# 2. TEST ON A SMALLER PROXY. If the effect is visible at 1/10 scale,
#    establish it there and confirm once at full scale.
#
# 3. RAISE THE BAR INSTEAD OF THE SAMPLE. Decide up front that you will
#    only adopt changes exceeding, say, 1.5pp -- a threshold you can
#    afford to establish. Small true effects then go unadopted, which is
#    a deliberate and defensible trade.
#
# 4. DO NOT SHIP, AND SAY WHY. "We cannot distinguish this from noise
#    within our budget" is a legitimate outcome and better than adopting
#    complexity for an effect that may not exist.
#
# WHAT NOT TO DO: run more seeds and report the best. That is the
# original error with extra compute, and it guarantees a positive result
# whether or not one exists.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_claimed_gain_is_within_baseline_spread():
    """The core finding: the 'new' result is a value the baseline
    already produces."""
    baseline = np.array([0.912, 0.908, 0.919, 0.905, 0.916])

    assert 0.919 <= baseline.max()                  # already achieved
    assert (0.919 - baseline.mean()) < 1.5 * baseline.std(ddof=1)


def test_single_run_comparison_is_refused():
    with pytest.raises(ValueError, match="too few"):
        compare([0.912, 0.908, 0.919, 0.905, 0.916], [0.919])


def test_confidence_interval_includes_zero_for_noise():
    """Two samples from the same distribution must not read as a win."""
    rng = np.random.default_rng(0)
    a = rng.normal(0.912, 0.0058, 5)
    b = rng.normal(0.912, 0.0058, 5)

    lo, hi = compare(a, b)["ci95"]
    assert lo < 0 < hi


def test_seed_count_scales_as_one_over_effect_squared():
    """Halving the detectable effect quadruples the runs needed."""
    sigma = 0.0058
    n = lambda d: 16 * sigma**2 / d**2

    assert np.isclose(n(0.005) / n(0.010), 4.0)`,
        notes: [
          { t: "p", text: "**The baseline already produced 0.919 on one of its own seeds.** The claimed gain of 0.007 is about 1.2 standard deviations of seed noise, so running the baseline five more times and reporting the best would produce the same \"improvement\" with no change at all." },
          { t: "p", text: "**The comparison being made is a draw against an average**, not two methods. One sample says almost nothing about a distribution's mean when the spread is comparable to the effect claimed." },
          { t: "callout", kind: "insight", title: "This is non-convexity showing up as a measurement problem", body: [
            { t: "p", text: "For a convex model — ridge, logistic regression, an SVM — every seed reaches the same optimum, so one run *is* the answer and a seed column would be identical numbers. Comparing two convex models needs one run each." },
            { t: "p", text: "A network has many minima, so its score is a random variable. The minima are similarly good, which is why deep learning works — and that small variance is exactly the problem, because the effects people want to claim are also small." }
          ]},
          { t: "p", text: "**Detecting the claimed 0.7pp effect needs about 11 seeds per arm** — 22 runs, 132 GPU-hours. The `n ≈ 16σ²/d²` relationship is steep: halving the effect quadruples the runs, which is why sub-0.5pp claims are usually unaffordable to establish." },
          { t: "p", text: "**Pairing the seeds across arms is the free variance reduction.** Using the same seeds and data order for both removes the shared component and can cut the required sample substantially — worth doing before asking for more compute." },
          { t: "p", text: "**A confidence interval spanning zero is the finding, not a failure.** The one thing not to do is run more seeds and report the best, which is the original error with extra compute and guarantees a positive result either way." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spent a month tuning initialisation schemes for a logistic regression, chasing a metric that moved between runs." },
      { t: "p", text: "**Logistic regression is convex — the optimum is unique.** The variation was not initialisation at all; their pipeline reshuffled the train/validation split on every run, so each \"result\" was measured on different data." },
      { t: "p", text: "**Fixing the split seed made every run identical**, as convexity says it must, and the month of tuning turned out to have been measuring the variance of their evaluation set." },
      { t: "p", text: "**Knowing your problem is convex is a debugging tool.** Two runs that disagree mean something outside the optimiser is varying — and that is a much narrower search than tuning hyperparameters." }
    ]}
  ],

  takeaways: [
    "**Convex means every chord lies on or above the curve**, and every other property follows from that one fact.",
    "**In a convex problem every local minimum is global**, so the algorithm's job is speed rather than luck.",
    "**Three equivalent tests**: the chord definition, `f'' ≥ 0` in one dimension, and a positive semi-definite Hessian in many.",
    "**A sampled convexity check can only disprove convexity** — finding no violation is not a proof.",
    "**Linear and logistic regression, ridge, lasso and SVMs are convex.** Anything with hidden layers is not.",
    "**Permutation symmetry alone rules out convexity for a network** — a 100-unit layer has 100! equivalent parameter vectors.",
    "**Comparing two networks weight-by-weight is meaningless**, since they may be the same function in a different order.",
    "**In high dimensions saddle points, not local minima, are the practical obstacle** — and minibatch noise escapes them.",
    "**Convexity is a statement about the training loss only.** A convex model can overfit; a non-convex one can generalise well.",
    "**A non-convex model's score is a random variable.** Report the mean and spread over seeds, never a single run.",
    "**Seeds needed scale as `σ²/d²`** — halving the effect you want to detect quadruples the runs.",
    "**Jensen's inequality is why variance is non-negative and why the ELBO is a bound** — the same result applied to `x²` and to `log`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is a neural network with hidden layers necessarily non-convex?",
        options: [
          "Because ReLU is not differentiable at zero",
          "Permutation symmetry — swapping two hidden units gives identical output, so a layer of `h` units has `h!` equivalent minima, while a strictly convex function has exactly one",
          "Because the loss can be negative",
          "Because gradient descent is stochastic"
        ],
        answer: 1,
        why: "The argument needs no nonlinearity and no appeal to intuition — it is a construction. It also explains why comparing two trained networks weight-by-weight is meaningless: they may be the same function with the units in a different order."
      },
      {
        stem: "A team reports 91.9% against a 91.2% baseline, one run each. Baseline seeds were `[0.912, 0.908, 0.919, 0.905, 0.916]`. What does this show?",
        options: [
          "A small but real improvement",
          "Nothing — the baseline already reached 0.919 on one of its own seeds, and the gain is about 1.2 standard deviations of seed noise",
          "That the new architecture is worse",
          "That the baseline needs retraining"
        ],
        answer: 1,
        why: "The comparison is one draw against an average. Detecting a true 0.7pp difference at this spread needs about 11 seeds per arm — the `n ≈ 16σ²/d²` relationship is steep, which is why sub-0.5pp claims are usually unaffordable to establish."
      },
      {
        stem: "Two runs of a logistic regression give different results. What does that tell you?",
        options: [
          "The initialisation matters and should be tuned",
          "Something outside the optimiser is varying — logistic regression is convex, so the optimum is unique and runs must agree",
          "The learning rate is too high",
          "The model needs more iterations"
        ],
        answer: 1,
        why: "Convexity is a debugging tool here: it narrows the search enormously. A varying train/validation split, non-deterministic data loading or a changing preprocessing step are the usual culprits — not the optimiser."
      },
      {
        stem: "What does Jensen's inequality give you for a convex `f`?",
        options: [
          "`f(E[X]) = E[f(X)]`",
          "`f(E[X]) ≤ E[f(X)]` — the function of the average is at most the average of the function",
          "`f(E[X]) ≥ E[f(X)]`",
          "It applies only to probability distributions"
        ],
        answer: 1,
        why: "Applied to `x²` it gives `E[X]² ≤ E[X²]`, which is exactly why variance cannot be negative. Applied to `log`, which is concave, it reverses and gives `log E[p] ≥ E[log p]` — the ELBO, a computable lower bound on an intractable log-likelihood."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why does convexity matter in machine learning?",
        strong: "Because every local minimum is global, so finding one is finding the answer. A convex problem is solved rather than trained — runs from different starts agree, and the optimiser's job is speed rather than luck.",
        answer: [
          { t: "p", text: "The practical consequence is what to lead with: convex means one run is the result, non-convex means the result is a distribution." },
          { t: "p", text: "Using convexity as a debugging tool — two disagreeing runs mean something else is varying — is a use most answers miss." },
          { t: "p", text: "Being clear that convexity says nothing about generalisation pre-empts the common conflation." }
        ]
      },
      {
        level: "advanced",
        q: "Neural networks are non-convex. How much of a problem is that?",
        strong: "Less than it sounds. In high dimensions the obstacle is saddle points rather than local minima, and minibatch noise escapes those. Empirically the minima SGD finds have similar loss — the real cost is that results become random variables needing seeds to compare.",
        answer: [
          { t: "p", text: "The saddle-versus-minimum point is the substance, and it connects to the Hessian eigenvalue argument." },
          { t: "p", text: "Turning it into a measurement issue — report mean and spread — is the practical consequence that matters day to day." },
          { t: "p", text: "The permutation-symmetry proof is a good concrete answer if asked *why* it is non-convex." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide whether a 0.5% accuracy improvement is real?",
        strong: "Compare it with the seed-to-seed spread first. If the standard deviation across seeds is similar to the effect, one run each establishes nothing — you need roughly `16σ²/d²` runs per arm, and I would pair the seeds across arms to cut that.",
        answer: [
          { t: "p", text: "Leading with the spread rather than a significance test shows the right instinct: effect size relative to noise is the question." },
          { t: "p", text: "The `σ²/d²` scaling makes the cost concrete, and the fact that halving the effect quadruples the runs is worth stating." },
          { t: "p", text: "Naming \"more seeds, report the best\" as the thing not to do shows you know how these results usually get manufactured." }
        ]
      }
    ]
  }
});
