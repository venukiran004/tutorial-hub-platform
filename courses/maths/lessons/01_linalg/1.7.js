/* ============================================================================
   LESSON 1.7 — Numerical Stability and Conditioning
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "Every number in a computation carries about sixteen significant digits, and some operations spend them faster than others. **Conditioning is how much a problem amplifies the error already in your data; stability is how much error an algorithm adds on top.** Confusing the two is why people blame the library when the problem was unanswerable, and blame the data when the code was at fault.",

  objectives: [
    "Distinguish an ill-conditioned problem from an unstable algorithm",
    "Read a condition number and predict how many digits you lose",
    "Recognise catastrophic cancellation and avoid producing it",
    "Choose a factorisation that suits the matrix you have",
    "Write numerical code that fails loudly rather than plausibly"
  ],

  prerequisites: ["1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Two different failures", id: "two" },

    { t: "p", text: "When a numerical result is wrong, the fault lies in one of two places, and confusing them wastes a great deal of time. **Conditioning is a property of the problem; stability is a property of the algorithm.** A well-designed algorithm cannot rescue an ill-conditioned problem." },

    { t: "dl", items: [
      ["Conditioning", "How much the answer changes when the input is perturbed slightly. A property of the problem itself, independent of any code."],
      ["Condition number", "The measurement: `κ = σ_max / σ_min`. Roughly, you lose `log₁₀(κ)` digits of accuracy no matter what you do."],
      ["Stability", "Whether an algorithm adds error beyond what conditioning already forces. A property of the method, and fixable."],
      ["Machine epsilon", "The smallest gap between representable numbers near 1 — about `2.2 × 10⁻¹⁶` in float64. It sets the floor on everything."]
    ]},

    { t: "p", text: "The rule that follows is worth memorising: **a condition number of `10ᵏ` costs you about `k` of your sixteen digits.** At `κ = 10¹⁰` you have six digits left, and at `κ = 10¹⁶` you have none." },

    { t: "viz",
      title: "Conditioning is the problem; stability is the method",
      caption: "A well-conditioned problem solved by a stable algorithm gives an accurate answer. Any other combination does not, and the fix differs in each case — so the first job is telling them apart.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="A two by two grid of conditioning against algorithm stability">
  <text x="255" y="34" text-anchor="middle" class="s-label">STABLE ALGORITHM</text>
  <text x="640" y="34" text-anchor="middle" class="s-label">UNSTABLE ALGORITHM</text>
  <text x="70" y="104" text-anchor="middle" class="s-label" style="fill:var(--ink-3)">WELL</text>
  <text x="70" y="124" text-anchor="middle" class="s-label" style="fill:var(--ink-3)">COND.</text>
  <text x="70" y="188" text-anchor="middle" class="s-label" style="fill:var(--ink-3)">ILL</text>
  <text x="70" y="208" text-anchor="middle" class="s-label" style="fill:var(--ink-3)">COND.</text>

  <rect x="130" y="52" width="250" height="86" rx="9" style="fill:var(--good);opacity:.14;stroke:var(--good)"/>
  <text x="255" y="86" text-anchor="middle" class="s-sub" style="fill:var(--good)">accurate</text>
  <text x="255" y="112" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">what you want</text>

  <rect x="400" y="52" width="480" height="86" rx="9" style="fill:var(--warn);opacity:.14;stroke:var(--warn)"/>
  <text x="640" y="86" text-anchor="middle" class="s-sub" style="fill:var(--warn)">inaccurate — your fault</text>
  <text x="640" y="112" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">fix: use a better method (lstsq, not inv)</text>

  <rect x="130" y="150" width="250" height="86" rx="9" style="fill:var(--t-amber);opacity:.14;stroke:var(--t-amber)"/>
  <text x="255" y="184" text-anchor="middle" class="s-sub" style="fill:var(--t-amber)">as good as possible</text>
  <text x="255" y="210" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">fix: reformulate or regularise</text>

  <rect x="400" y="150" width="480" height="86" rx="9" style="fill:var(--crit);opacity:.14;stroke:var(--crit)"/>
  <text x="640" y="184" text-anchor="middle" class="s-sub" style="fill:var(--crit)">garbage</text>
  <text x="640" y="210" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">and it will look like plausible numbers</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the rule of thumb worth memorising", code: `
import numpy as np

# float64 carries about 16 significant decimal digits. Solving a linear
# system loses roughly log10(cond) of them:
#
#     digits kept  ~  16 - log10(cond)
#
#   cond = 1e2   -> ~14 digits. Fine.
#   cond = 1e8   -> ~8 digits.  Watch reported precision.
#   cond = 1e12  -> ~4 digits.  Do not trust small differences.
#   cond = 1e16  -> ~0 digits.  The answer is noise.

# THE HILBERT MATRIX is the standard example: innocuous entries,
# catastrophic conditioning.
def hilbert(n):
    i = np.arange(1, n + 1)
    return 1.0 / (i[:, None] + i[None, :] - 1)

for n in (4, 8, 12):
    H = hilbert(n)
    x_true = np.ones(n)
    x = np.linalg.solve(H, H @ x_true)         # solve a problem we know
    err = np.max(np.abs(x - x_true))
    print(n, f"{np.linalg.cond(H):.1e}", f"{err:.1e}")
#   4   1.6e+04   1.3e-13
#   8   1.5e+10   1.4e-07
#   12  1.7e+16   1.1e-01     <- 10% error on a problem whose answer is 1

# Nothing went wrong in the code. The n=12 problem simply cannot be
# solved to better than that in float64 -- the information is not there.
`,
      hl: [6, 22],
      caption: "**At `cond ≈ 1e16` the answer has no correct digits at all**, and `solve` reports no error. The result looks like ordinary numbers, which is exactly the danger."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Conditioning is a property of the question; stability is a property of your method.** An ill-conditioned problem is one where the answer genuinely moves a lot when the input moves a little — no algorithm can fix that, because the sensitivity is real." },
      { t: "p", text: "So the diagnostic order is: check the condition number first. If it is large, stop looking at your code — the problem needs reformulating, more data, or regularisation. If it is small and the answer is still wrong, then the code is at fault, and that is a bug you can find." }
    ]},

    { t: "h2", n: "02", text: "Catastrophic cancellation", id: "cancellation" },

    { t: "p", text: "**Subtracting two nearly equal numbers destroys precision**, because the leading digits cancel and what remains is the rounding error you were already carrying. It is the single most common source of silent numerical failure." },

    { t: "dl", items: [
      ["Catastrophic cancellation", "Loss of significant digits when subtracting close values. The result may have no correct digits at all."],
      ["Significant digits", "How many digits of a result are actually meaningful. Cancellation reduces this without changing how many are printed."],
      ["Stable reformulation", "An algebraically equivalent expression that avoids the subtraction — such as centring data before squaring rather than after."]
    ]},

    { t: "code", lang: "python", title: "how subtraction destroys information", code: `
# Subtracting two nearly-equal numbers annihilates the leading digits,
# promoting rounding error from invisible to dominant.

a = 1.0000000123456789
b = 1.0000000123456700

# Each input has ~16 good digits. Their difference has ~7.
a - b                    # 8.88e-15 -- the true value is 8.9e-15, and
                         # only the first digit or two survive

# THE CLASSIC VICTIM: the "computational formula" for variance,
#     Var = E[X^2] - E[X]^2
# which subtracts two large, nearly-equal numbers whenever the mean is
# far from zero.

x = np.array([1e8 + 1, 1e8 + 2, 1e8 + 3])

naive = (x**2).mean() - x.mean()**2
naive                    # 0.0  -- or even NEGATIVE, depending on the run

two_pass = ((x - x.mean())**2).mean()
two_pass                 # 0.6666666666666666  -- correct

np.var(x)                # 0.6666666666666666  -- numpy centres first

# A NEGATIVE VARIANCE IS THE TELL. It is arithmetically impossible, so
# seeing one means cancellation, not unusual data.
`,
      hl: [8, 17, 20],
      caption: "**The two formulas are algebraically identical and numerically different.** `E[X²] − E[X]²` is a fine derivation and a poor implementation — which is the same lesson as the normal equations in 1.5."
    },

    { t: "ladder",
      title: "Computing a variance over a stream",
      rungs: [
        { level: "bad", label: "Accumulate sums and squares",
          why: "It is the obvious one-pass method and it cancels catastrophically. For data far from zero the two accumulated quantities become nearly equal, and the subtraction can return zero or a negative number for data that clearly varies.",
          code: `n = s = ss = 0
for v in stream:
    n += 1; s += v; ss += v * v
var = ss / n - (s / n) ** 2      # cancellation waiting to happen

# On values around 1e8 this returns 0.0 or a negative number.` },
        { level: "ok", label: "Two passes",
          why: "Compute the mean, then the squared deviations. Numerically excellent — and it needs the data twice, which a stream by definition does not give you.",
          code: `mu = sum(data) / len(data)
var = sum((v - mu) ** 2 for v in data) / len(data)

# Correct. Requires the data to be finite and re-readable.` },
        { level: "best", label: "Welford's algorithm",
          why: "One pass, no cancellation, and numerically stable. It updates the mean and the sum of squared deviations together, so the quantities being subtracted are always small relative to what is accumulated.",
          code: `class RunningVariance:
    """Welford. The subtraction is always between a value and the
    CURRENT mean, so the operands stay comparable in size and no
    catastrophic cancellation arises."""

    def __init__(self):
        self.n = 0
        self.mean = 0.0
        self.m2 = 0.0            # sum of squared deviations

    def update(self, x):
        self.n += 1
        delta = x - self.mean            # small, whatever the scale
        self.mean += delta / self.n
        delta2 = x - self.mean           # recomputed AFTER the update
        self.m2 += delta * delta2        # the two deltas differ: that
                                         # is the trick, not a typo

    @property
    def variance(self):
        return self.m2 / (self.n - 1) if self.n > 1 else float("nan")

rv = RunningVariance()
for v in [1e8 + 1, 1e8 + 2, 1e8 + 3]:
    rv.update(v)
rv.variance          # 1.0  -- exact, in one pass`,
          note: "**Using `delta` before the update and `delta2` after is deliberate.** Their product is what keeps the accumulator accurate; using the same delta twice reintroduces the error." }
      ]
    },

    { t: "h2", n: "03", text: "Choosing a factorisation", id: "factorisation" },

    { t: "p", text: "Most numerical linear algebra is a choice among a few factorisations, each trading speed against robustness. **Choosing the cheapest one that will not fail on your data** is the whole of the decision, and a factorisation refusing to run is itself useful information." },

    { t: "dl", items: [
      ["Cholesky", "Fastest, for symmetric positive-definite matrices only. Failing to factorise proves the matrix is not positive definite — a free diagnostic."],
      ["LU", "General square matrices, with partial pivoting for stability. What `solve` uses by default."],
      ["QR", "Least squares without forming `AᵀX`, which would square the condition number. Slower than LU and much better behaved."],
      ["SVD", "Slowest and most robust. Handles rank deficiency gracefully and reports the condition number as a by-product."]
    ]},

    { t: "table",
      head: ["Matrix", "Method", "Cost", "Why"],
      rows: [
        ["Square, general", "**LU** (`solve`)", "⅔n³", "The default; partial pivoting keeps it stable"],
        ["Symmetric positive definite", "**Cholesky**", "⅓n³", "**Half the work**; fails loudly if not PD"],
        ["Least squares", "**QR**", "2mn²", "Avoids forming `XᵀX` and squaring the condition"],
        ["Rank-deficient / uncertain", "**SVD** (`lstsq`)", "~2mn² + n³", "Most robust; reports rank and singular values"],
        ["Triangular", "Back-substitution", "n²", "Already factored — do not refactor it"],
        ["Sparse", "`scipy.sparse.linalg`", "Depends", "Dense methods destroy sparsity and blow up memory"]
      ],
      caption: "**Cholesky failing is useful information.** It raises exactly when a matrix is not positive definite, which for a covariance matrix means it was computed wrongly — so the failure is a free correctness check."
    },

    { t: "code", lang: "python", title: "using failure as a diagnostic", code: `
from scipy.linalg import cho_factor, cho_solve

def solve_covariance_system(C, b):
    """Cholesky is twice as fast as LU on a covariance matrix -- and it
    refuses to run on one that is not positive definite, which is the
    more valuable half."""
    try:
        return cho_solve(cho_factor(C), b)
    except np.linalg.LinAlgError:
        # Not positive definite. For something claiming to be a
        # covariance matrix that is a BUG UPSTREAM, not a hard problem:
        w = np.linalg.eigvalsh(C)
        raise ValueError(
            f"not positive definite: smallest eigenvalue {w.min():.3e}. "
            f"A covariance matrix cannot have one. Check for NaNs, a "
            f"pairwise-deletion correlation, or an unsymmetric build."
        )

# A REAL AND COMMON CAUSE: computing correlations pairwise, dropping
# missing values independently for each pair. Every entry is a valid
# correlation and the MATRIX is not consistent -- so it is not PD, and
# any method assuming it is will produce nonsense rather than an error.

# THE NEAR-MISS CASE is different. A covariance from real data is often
# PD in theory and marginally indefinite in floating point:
C = np.array([[1.0, 0.999999], [0.999999, 1.0]])
np.linalg.eigvalsh(C)          # [1.0e-06, 2.0]  -- barely positive

# Nudging the diagonal is the standard repair, and it should be recorded
# rather than done silently:
C_fixed = C + 1e-8 * np.eye(len(C))
`,
      hl: [8, 19, 27],
      caption: "**A non-positive-definite covariance matrix is almost always a construction bug**, and pairwise deletion of missing values is the usual culprit — each entry is individually valid while the matrix as a whole is impossible."
    },

    { t: "callout", kind: "trap", title: "Four habits that quietly destroy precision", body: [
      { t: "code", lang: "python", title: "each is common and each is avoidable", numbered: false, code: `
# 1. TESTING FLOATS FOR EQUALITY.
0.1 + 0.2 == 0.3                       # False
np.isclose(0.1 + 0.2, 0.3)             # True -- use a tolerance
# And for arrays: np.allclose, with rtol chosen for your scale.

# 2. SUMMING IN A LOOP, IN ORDER.
x = np.array([1e16, 1.0, -1e16])
sum(x)                                  # 0.0   -- the 1.0 is lost
np.sum(x)                               # 0.0   -- pairwise, same here
np.sum(np.sort(x))                      # 0.0
math.fsum(x)                            # 1.0   -- exact, when it matters
# np.sum uses pairwise summation, which is far better than a naive loop
# on large arrays -- but it is not exact.

# 3. EXPONENTIATING BEFORE SUBTRACTING.
z = np.array([1000.0, 1001.0, 1002.0])
np.exp(z) / np.exp(z).sum()             # nan -- exp(1000) overflows
# Subtract the max first: mathematically identical, numerically safe.
e = np.exp(z - z.max())
e / e.sum()                             # [0.09, 0.245, 0.665]
# This is why every library has a "logsumexp" and why softmax
# implementations subtract the maximum.

# 4. TAKING A LOG OF A PROBABILITY PRODUCT.
p = np.full(1000, 0.9)
np.log(p.prod())                        # -inf -- the product underflowed
np.log(p).sum()                         # -105.36 -- correct
# Work in log space from the start rather than converting at the end.`},
      { t: "p", text: "**Number three is the one that reaches production most often**, because it works perfectly on small logits and produces `nan` the first time a model becomes confident. The `nan` then propagates silently through every subsequent batch." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a covariance pipeline that returns impossible numbers",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A risk system computes a covariance matrix from asset returns and uses it to size positions. It occasionally reports a negative portfolio variance, and the Cholesky step fails perhaps once a week." },
        { t: "code", lang: "python", numbered: false, title: "risk.py", code: `
import numpy as np

def covariance(prices):                 # prices: (days, assets)
    returns = prices[1:] / prices[:-1] - 1
    n, k = returns.shape
    C = np.empty((k, k))
    for i in range(k):
        for j in range(k):
            xi, xj = returns[:, i], returns[:, j]
            mask = ~(np.isnan(xi) | np.isnan(xj))       # pairwise
            a, b = xi[mask], xj[mask]
            C[i, j] = (a * b).mean() - a.mean() * b.mean()
    return C

def portfolio_variance(w, C):
    return w @ C @ w

# Observed: portfolio_variance sometimes returns a small negative number,
# and np.linalg.cholesky(C) raises LinAlgError intermittently.`},
        { t: "p", text: "Find the three distinct problems, say which causes which symptom, and give a corrected implementation." }
      ],
      requirements: [
        "Name all three problems.",
        "Say which one causes the negative variance and which the Cholesky failure.",
        "Explain why the failure is intermittent rather than constant.",
        "Give a corrected implementation.",
        "Say what to do when the matrix is only marginally indefinite.",
        "Give the assertions that would catch this at the boundary."
      ],
      hint: "Two of the problems are about the same line; the third is about the word `pairwise`.",
      solution: {
        lang: "python",
        title: "risk.py",
        code: `# =========================================================================
# THE THREE PROBLEMS
# =========================================================================
#
# 1. CATASTROPHIC CANCELLATION in the covariance formula.
#
#      C[i,j] = (a*b).mean() - a.mean() * b.mean()
#
#    This is E[XY] - E[X]E[Y], the computational formula. Daily returns
#    are around 1e-3, so their products are around 1e-6 and the two terms
#    being subtracted agree to several digits. The difference keeps only
#    the digits that differ -- and for weakly correlated assets almost
#    none of them do.
#
#    -> This causes the NEGATIVE PORTFOLIO VARIANCE. A diagonal entry
#       computed this way can come out slightly negative, and a negative
#       variance is arithmetically impossible, so it can only be
#       cancellation.
#
# 2. PAIRWISE DELETION OF MISSING VALUES.
#
#      mask = ~(np.isnan(xi) | np.isnan(xj))
#
#    Each entry C[i,j] is computed on a DIFFERENT subset of days --
#    whichever days had both assets trading. So C[1,2] might use 250
#    days, C[1,3] 180 days and C[2,3] 240 days.
#
#    Every entry is individually a valid covariance. The MATRIX is not a
#    covariance matrix of anything: no single dataset produces it. Such a
#    matrix need not be positive semi-definite, and usually is not.
#
#    -> This causes the CHOLESKY FAILURE. Cholesky succeeds only on a
#       positive definite matrix, and pairwise deletion routinely
#       produces an indefinite one.
#
# 3. NO SYMMETRY GUARANTEE, and wasted work.
#
#    The double loop computes both C[i,j] and C[j,i] independently.
#    Identical inputs, identical arithmetic -- so they agree here, but
#    the structure invites drift, and it does twice the necessary work.
#    Any later change (a different mask, a shrinkage term applied in one
#    branch) breaks symmetry silently, and every eigenvalue routine
#    assumes symmetry.
#
#
# =========================================================================
# WHY IT IS INTERMITTENT
# =========================================================================
#
# Both failures are threshold effects on a quantity that is USUALLY just
# above zero.
#
#   - Cancellation error is proportional to the magnitude of the terms
#     being subtracted. On a calm week returns are small, the terms are
#     small, and the residual error stays below the true variance. On a
#     volatile week -- or when one asset barely moves -- the true
#     variance shrinks toward the error and the sign can flip.
#
#   - Pairwise deletion only produces an indefinite matrix when the
#     missingness pattern is uneven ENOUGH. A week with no missing data
#     gives a consistent matrix; a week where one asset was suspended for
#     three days does not.
#
# So "once a week" is not random: it is the frequency with which a
# holiday, a suspension or a new listing makes the overlap uneven. The
# bug is deterministic given the data -- it is the data that varies.
#
#
# =========================================================================
# THE CORRECTED IMPLEMENTATION
# =========================================================================

def covariance(prices, min_obs=60):
    """Complete-case covariance, centred, symmetric by construction.

    Log returns, a single shared mask, and np.cov -- which centres before
    squaring and so does not cancel.
    """
    # Log returns are additive over time and better behaved numerically
    # than simple returns; log1p is accurate for the small values here,
    # where log(1+x) computed directly would itself cancel.
    returns = np.diff(np.log(prices), axis=0)

    # PROBLEM 2: ONE mask for all assets, so every entry describes the
    # same set of days and the matrix is a covariance of an actual
    # dataset. This discards data -- which is the honest trade, and it
    # must be visible:
    keep = ~np.isnan(returns).any(axis=1)
    used = returns[keep]
    if len(used) < min_obs:
        raise ValueError(
            f"only {len(used)} complete observations (need {min_obs}). "
            f"Pairwise deletion would give more rows and an invalid "
            f"matrix -- drop the sparse assets instead."
        )

    # PROBLEM 1: np.cov centres first, so no cancellation.
    # PROBLEM 3: it returns a symmetric matrix by construction.
    C = np.cov(used, rowvar=False, ddof=1)

    return 0.5 * (C + C.T)          # belt and braces against drift


def portfolio_variance(w, C):
    """A variance cannot be negative. If it is, the matrix is at fault
    and the caller must know rather than receive a plausible number."""
    v = float(w @ C @ w)
    if v < 0:
        if v > -1e-10 * np.trace(C):
            return 0.0              # numerical zero, safe to clamp
        raise ValueError(
            f"negative portfolio variance ({v:.3e}) -- the covariance "
            f"matrix is not positive semi-definite"
        )
    return v


# =========================================================================
# WHEN THE MATRIX IS ONLY MARGINALLY INDEFINITE
# =========================================================================
#
# Even with complete cases, a covariance from real data can come back
# with a tiny negative eigenvalue -- especially when assets are nearly
# collinear or there are more assets than days.
#
# Distinguish the two cases by MAGNITUDE:

def repair(C, tol_ratio=1e-8):
    """Nudge a marginally indefinite matrix; refuse a badly broken one."""
    w = np.linalg.eigvalsh(C)
    if w.min() >= 0:
        return C

    scale = w.max()
    if w.min() < -tol_ratio * scale:
        # Not a rounding artefact. Something is structurally wrong, and
        # patching it would hide a data bug.
        raise ValueError(
            f"smallest eigenvalue {w.min():.3e} against largest "
            f"{scale:.3e} -- this is not floating-point noise"
        )

    # Floating-point noise: project onto the PSD cone by clipping the
    # negative eigenvalues to zero.
    w_clipped = np.clip(w, 0, None)
    _, V = np.linalg.eigh(C)
    return V @ np.diag(w_clipped) @ V.T

# If more assets than observations, the matrix is singular BY
# CONSTRUCTION (rank <= n_days) and no repair helps. That needs a
# shrinkage estimator -- Ledoit-Wolf pulls the sample covariance toward
# a well-conditioned target and is the standard answer:
#
#   from sklearn.covariance import LedoitWolf
#   C = LedoitWolf().fit(used).covariance_


# =========================================================================
# THE ASSERTIONS
# =========================================================================

def validate_covariance(C, names=None, tol_ratio=1e-8):
    """Check at the boundary. Every property here is cheap, and each
    failure points at a specific upstream cause."""
    assert C.shape[0] == C.shape[1], "not square"
    assert np.allclose(C, C.T, atol=1e-12), "not symmetric"
    assert np.isfinite(C).all(), "contains NaN or inf"

    d = np.diag(C)
    assert (d >= 0).all(), f"negative variance on the diagonal: {d.min():.3e}"

    w = np.linalg.eigvalsh(C)
    assert w.min() >= -tol_ratio * w.max(), (
        f"not PSD: smallest eigenvalue {w.min():.3e}"
    )

    # Correlations implied by the covariance must lie in [-1, 1]. This
    # catches pairwise deletion specifically, because inconsistent
    # subsets can produce an "impossible" correlation.
    s = np.sqrt(d)
    R = C / np.outer(s, s)
    assert np.abs(R).max() <= 1 + 1e-8, (
        f"implied correlation {np.abs(R).max():.4f} exceeds 1 -- entries "
        f"were computed on different subsets"
    )

    cond = np.linalg.cond(C)
    if cond > 1e10:
        warnings.warn(f"condition number {cond:.1e}; consider shrinkage")


# =========================================================================
# TESTS
# =========================================================================

def test_cancellation_free_on_large_offset_data():
    """Problem 1. The naive formula returns 0 or negative here."""
    x = np.array([1e8 + 1.0, 1e8 + 2.0, 1e8 + 3.0])

    naive = (x * x).mean() - x.mean() ** 2
    assert naive <= 0.0                       # the bug, demonstrated
    assert np.isclose(np.var(x, ddof=1), 1.0) # the fix


def test_pairwise_deletion_can_produce_an_invalid_matrix():
    """Problem 2. Each entry valid, matrix impossible."""
    C_pairwise = np.array([[1.0,  0.9,  0.9],
                           [0.9,  1.0, -0.9],
                           [0.9, -0.9,  1.0]])

    assert np.linalg.eigvalsh(C_pairwise).min() < 0
    with pytest.raises(AssertionError, match="not PSD"):
        validate_covariance(C_pairwise)


def test_complete_case_covariance_is_psd():
    prices = synthetic_prices(days=500, assets=6, missing=0.05)

    C = covariance(prices)

    validate_covariance(C)
    np.linalg.cholesky(C)                     # must not raise


def test_too_few_complete_observations_fails_loudly():
    prices = synthetic_prices(days=500, assets=40, missing=0.4)

    with pytest.raises(ValueError, match="complete observations"):
        covariance(prices)


def test_marginal_indefiniteness_is_repaired_but_real_breakage_is_not():
    marginal = np.array([[1.0, 1.0 - 1e-12], [1.0 - 1e-12, 1.0]])
    repair(marginal)                          # fine

    broken = np.array([[1.0, 2.0], [2.0, 1.0]])
    with pytest.raises(ValueError, match="not floating-point noise"):
        repair(broken)`,
        notes: [
          { t: "p", text: "**The negative variance is cancellation.** `E[XY] − E[X]E[Y]` subtracts two nearly-equal numbers around 1e-6, so for weakly correlated assets almost no digits survive — and a variance that comes out negative is arithmetically impossible, which is what makes it a reliable tell." },
          { t: "p", text: "**The Cholesky failure is pairwise deletion.** Each entry uses whichever days had both assets trading, so `C[1,2]` might use 250 days and `C[1,3]` 180. Every entry is a valid covariance and the matrix is the covariance of no dataset at all — so it need not be positive semi-definite." },
          { t: "callout", kind: "insight", title: "Intermittent means threshold, not random", body: [
            { t: "p", text: "Both failures are a quantity that usually sits just above zero crossing it. Cancellation error scales with the terms being subtracted, so a calm week hides it and a volatile one does not; pairwise deletion only breaks positive-definiteness when the missingness is uneven enough." },
            { t: "p", text: "\"Once a week\" is therefore the rate at which a holiday, a suspension or a new listing makes the overlap uneven. The bug is deterministic given the data — it is the data that varies." }
          ]},
          { t: "p", text: "**Complete-case deletion discards data, and that is the honest trade.** It must fail loudly when too little is left, because the alternative — pairwise deletion — buys more rows by producing a matrix that describes nothing." },
          { t: "p", text: "**Distinguish a marginal negative eigenvalue from a broken one by magnitude.** Clipping to the PSD cone is right for floating-point noise; applying it to a structurally wrong matrix hides a data bug behind a plausible number." },
          { t: "p", text: "**The implied-correlation check catches pairwise deletion specifically.** Entries computed on different subsets can imply a correlation above 1, which no genuine covariance matrix can do." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A model's loss became `nan` after three days of training. The team spent a week bisecting commits and adding gradient clipping, and found nothing." },
      { t: "p", text: "**A hand-rolled softmax exponentiated the logits before subtracting the maximum.** For three days the model was uncertain, the logits stayed small, and it worked; as it grew confident a logit passed 710 and `np.exp` overflowed to infinity." },
      { t: "p", text: "**One `nan` then poisoned every subsequent weight**, so the failure looked sudden and total rather than like a threshold being crossed." },
      { t: "p", text: "**Numerical bugs hide until the data reaches them.** The code was correct algebra and had been tested — on inputs that never triggered it, which is the only kind of test that would have passed." }
    ]}
  ],

  takeaways: [
    "**Conditioning is a property of the problem; stability is a property of the algorithm.** No method fixes an ill-conditioned problem.",
    "**Digits kept ≈ 16 − log₁₀(cond)** in float64, so `cond = 1e12` leaves about four and `1e16` leaves none.",
    "**Check the condition number before blaming the code**, and stop looking at the code when it is large.",
    "**Subtracting nearly-equal numbers destroys the leading digits**, promoting rounding error to dominant.",
    "**`E[X²] − E[X]²` is correct algebra and a poor implementation.** Centre first, or use Welford for one pass.",
    "**A negative variance is arithmetically impossible**, so it always means cancellation rather than unusual data.",
    "**Match the factorisation to the matrix** — Cholesky for symmetric positive definite, QR for least squares, SVD when rank is uncertain.",
    "**Cholesky failing is a free correctness check.** A covariance matrix that is not positive definite was computed wrongly.",
    "**Pairwise deletion produces a matrix that is the covariance of no dataset**, which is why it need not be positive semi-definite.",
    "**Never test floats with `==`** — use `np.isclose` with a tolerance chosen for your scale.",
    "**Subtract the maximum before exponentiating.** This is why softmax implementations and `logsumexp` exist.",
    "**Work in log space rather than converting at the end**, or a product of probabilities underflows to zero."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A linear system has condition number 1e12 and the answer is wrong in the fourth digit. What should you do?",
        options: [
          "Switch to a more accurate solver",
          "Nothing about the code — float64 keeps roughly `16 − log₁₀(cond) = 4` digits, so the problem cannot be solved more accurately as posed",
          "Increase the number of iterations",
          "Use `inv` instead of `solve`"
        ],
        answer: 1,
        why: "Conditioning belongs to the problem, not the method. The fix is reformulating, gathering more data, or regularising. Checking `cond` first tells you whether to debug your code at all — if it is large, the code is probably fine and the question is the difficulty."
      },
      {
        stem: "`(x**2).mean() - x.mean()**2` returns a negative number. What happened?",
        options: [
          "The data contains complex values",
          "Catastrophic cancellation — the two terms are nearly equal, so subtracting them destroys the leading digits and the sign can flip",
          "The array contains NaN",
          "`mean` uses a different denominator than expected"
        ],
        answer: 1,
        why: "A variance cannot be negative, so the result is arithmetically impossible and can only be a numerical artefact. Centring before squaring, or Welford's algorithm for a single pass, avoids it — the formula is a fine derivation and a poor implementation."
      },
      {
        stem: "`np.linalg.cholesky` fails intermittently on a covariance matrix built with pairwise deletion of missing values. Why?",
        options: [
          "Cholesky requires more memory than is available",
          "Each entry is computed on a different subset of rows, so the matrix is the covariance of no actual dataset and need not be positive semi-definite",
          "The matrix is not square",
          "Missing values propagate as NaN"
        ],
        answer: 1,
        why: "Every individual entry is a valid covariance, which is what makes it so hard to spot. It fails only when the missingness pattern is uneven enough to tip an eigenvalue negative — so a holiday or a suspension triggers it, which is why it looks random."
      },
      {
        stem: "A hand-rolled softmax produces `nan` only after a model becomes confident. Why?",
        options: [
          "The learning rate grew too large",
          "It exponentiates before subtracting the maximum, so once a logit exceeds about 710 `exp` overflows to infinity",
          "The gradients vanished",
          "The batch size changed"
        ],
        answer: 1,
        why: "Subtracting the maximum first is mathematically identical and numerically safe, which is why every library ships a `logsumexp`. It is a threshold bug: correct on small logits, so it passes every test written before the model got good at its task."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is the difference between an ill-conditioned problem and an unstable algorithm?",
        strong: "Conditioning is how much the answer moves when the input moves — a property of the question. Stability is how much error the method adds. An ill-conditioned problem cannot be rescued by a better algorithm, so checking the condition number tells you whether to debug your code at all.",
        answer: [
          { t: "p", text: "Framing it as the diagnostic order — condition number first, then the code — makes the distinction actionable rather than definitional." },
          { t: "p", text: "The rule of thumb, roughly `16 − log₁₀(cond)` digits, turns it into a number you can act on." },
          { t: "p", text: "A concrete unstable-method example, like inverting rather than solving, shows you can name the other half too." }
        ]
      },
      {
        level: "core",
        q: "Why compute variance by centring first rather than `E[X²] − E[X]²`?",
        strong: "Because subtracting two nearly-equal large numbers destroys the leading digits. For data far from zero the computational formula can return zero or a negative variance, which is arithmetically impossible.",
        answer: [
          { t: "p", text: "The negative-variance tell is the memorable part, and it generalises: an impossible result means numerics, not unusual data." },
          { t: "p", text: "Mentioning Welford shows you know how to get one-pass streaming without the cancellation." },
          { t: "p", text: "Connecting it to the normal equations — correct algebra, poor implementation — shows the principle rather than the instance." }
        ]
      },
      {
        level: "advanced",
        q: "Cholesky fails on your covariance matrix. What do you check?",
        strong: "That the matrix was built from a single consistent dataset. Pairwise deletion of missing values is the usual cause — every entry is a valid covariance but the matrix describes no dataset, so it need not be positive semi-definite.",
        answer: [
          { t: "p", text: "Treating the failure as information rather than an obstacle is the right instinct, and it is why Cholesky is worth using on covariance matrices." },
          { t: "p", text: "Distinguishing marginal indefiniteness from structural breakage by magnitude shows judgement about when a repair is legitimate." },
          { t: "p", text: "Mentioning shrinkage for the more-assets-than-observations case shows you know when no repair can work." }
        ]
      }
    ]
  }
});
