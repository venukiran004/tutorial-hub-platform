/* ============================================================================
   LESSON 1.3 — Multiplication, Rank and Invertibility
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "Rank is the most useful number in linear algebra and the least talked about. **It counts how many dimensions survive a transformation** — and once you can read it, singular matrices, unsolvable systems, multicollinearity and rank-deficient design matrices all turn out to be the same fact wearing different clothes.",

  objectives: [
    "Derive the matrix multiplication rule rather than memorising it",
    "Read rank as the number of surviving dimensions",
    "Say which of the three outcomes a linear system has, and why",
    "Explain why you solve a system rather than inverting a matrix",
    "Connect rank deficiency to multicollinearity in a design matrix"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Why the rule is the rule", id: "rule" },

    { t: "code", lang: "python", title: "multiplication is forced, not chosen", code: `
import numpy as np

# The requirement: (AB)x must equal A(Bx) for every x. Work that through
# and the row-times-column rule is the only thing that satisfies it.

B = np.array([[0.0, -1.0],      # rotate 90 degrees
              [1.0,  0.0]])
A = np.array([[3.0,  0.0],      # stretch x by 3
              [0.0,  1.0]])
x = np.array([1.0, 0.0])

np.allclose(A @ (B @ x), (A @ B) @ x)     # True -- and it MUST be

# THE SHAPE RULE FALLS OUT OF THE SAME PLACE.
#   (m x k) @ (k x n) -> (m x n)
# The inner dimensions must match because B's OUTPUT lives in the space
# that A takes as INPUT. A shape error is a type error: you are feeding a
# function something from the wrong space.

M = np.zeros((2, 3))
N = np.zeros((3, 5))
(M @ N).shape                 # (2, 5)   -- 3-space in, 3-space out, fine
# N @ M                       # ValueError: 5 does not match 2

# AND ONE ENTRY, EXPLICITLY: (AB)[i][j] is row i of A dotted with column
# j of B -- "how much does the i-th output direction pick up from the
# j-th input direction".
`,
      hl: [12, 17, 27],
      caption: "**A shape mismatch is not bookkeeping — it is a type error.** The inner dimensions must agree because the first map's output space has to be the second map's input space."
    },

    { t: "h2", n: "02", text: "Rank", id: "rank" },

    { t: "viz",
      title: "Rank counts what survives",
      caption: "A 3×3 matrix can send space to a volume, a plane, a line or a point. Rank names which, and the gap between rank and the number of columns is exactly what was destroyed.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Four matrices of different rank and the shape each one maps space onto">
  <g class="s-sub">
    <rect x="20" y="40" width="190" height="140" rx="10" style="fill:none;stroke:var(--t-green)"/>
    <text x="115" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-green)">rank 3</text>
    <text x="115" y="100" text-anchor="middle">3-D space</text>
    <text x="115" y="126" text-anchor="middle" style="fill:var(--ink-3)">nothing lost</text>
    <text x="115" y="152" text-anchor="middle" style="fill:var(--ink-3)">det ≠ 0 · invertible</text>

    <rect x="232" y="40" width="190" height="140" rx="10" style="fill:none;stroke:var(--t-amber)"/>
    <text x="327" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-amber)">rank 2</text>
    <text x="327" y="100" text-anchor="middle">a plane</text>
    <text x="327" y="126" text-anchor="middle" style="fill:var(--ink-3)">1 dimension gone</text>
    <text x="327" y="152" text-anchor="middle" style="fill:var(--ink-3)">det = 0 · singular</text>

    <rect x="444" y="40" width="190" height="140" rx="10" style="fill:none;stroke:var(--t-orange)"/>
    <text x="539" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-orange)">rank 1</text>
    <text x="539" y="100" text-anchor="middle">a line</text>
    <text x="539" y="126" text-anchor="middle" style="fill:var(--ink-3)">2 dimensions gone</text>
    <text x="539" y="152" text-anchor="middle" style="fill:var(--ink-3)">all columns parallel</text>

    <rect x="656" y="40" width="190" height="140" rx="10" style="fill:none;stroke:var(--crit)"/>
    <text x="751" y="70" text-anchor="middle" class="s-label" style="fill:var(--crit)">rank 0</text>
    <text x="751" y="100" text-anchor="middle">a point</text>
    <text x="751" y="126" text-anchor="middle" style="fill:var(--ink-3)">everything gone</text>
    <text x="751" y="152" text-anchor="middle" style="fill:var(--ink-3)">the zero matrix</text>
  </g>
  <text x="20" y="218" class="s-sub" style="fill:var(--ink-3)">rank + nullity = number of columns. What survives plus what is destroyed accounts for the whole input space.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "rank, and the two ways to read it", code: `
# READING 1: how many columns are genuinely independent?
# READING 2: how many dimensions does the output occupy?
# They are the same number.

full = np.array([[1.0, 0.0],
                 [0.0, 1.0]])
np.linalg.matrix_rank(full)          # 2

dependent = np.array([[1.0, 2.0],
                      [2.0, 4.0]])
np.linalg.matrix_rank(dependent)     # 1 -- column 2 is 2 x column 1

# RANK-NULLITY: rank + nullity = number of columns.
#   2 columns, rank 1, so nullity 1: a one-dimensional set of inputs is
#   crushed to zero. For this matrix that is the direction [2, -1].
dependent @ np.array([2.0, -1.0])    # [0., 0.]

# A TALL MATRIX CANNOT HAVE RANK ABOVE ITS WIDTH.
X = np.random.default_rng(0).normal(size=(100, 5))
np.linalg.matrix_rank(X)             # 5 -- capped by the 5 columns

# AND A WIDE ONE IS CAPPED BY ITS HEIGHT -- which is the p > n problem:
# more features than samples means the columns MUST be dependent, so the
# fit is never unique no matter how much data cleaning you do.
W = np.random.default_rng(0).normal(size=(5, 100))
np.linalg.matrix_rank(W)             # 5, not 100
`,
      hl: [11, 16, 26],
      caption: "**`rank ≤ min(rows, columns)` is not a technicality.** It is why a model with more features than samples cannot have a unique least-squares solution, and why regularisation is mandatory there rather than optional."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Rank is how much of the input space makes it out the other side.** Full rank means the transformation is a faithful re-description — nothing collided, so you could in principle undo it. Anything less means two distinct inputs now share an output, and that information is gone for good." },
      { t: "p", text: "Every consequence follows from that one sentence. No inverse, because an inverse would have to un-collide them. No unique solution to `Ax = b`, because if some direction maps to zero you can add any amount of it and change nothing. Unstable regression coefficients, because the fit genuinely cannot tell two features apart." }
    ]},

    { t: "h2", n: "03", text: "Three things a linear system can do", id: "systems" },

    { t: "table",
      head: ["Situation", "Geometry", "Solutions", "In practice"],
      rows: [
        ["`rank(A) = rank([A|b]) = n`", "The target is reachable, one way", "**Exactly one**", "A well-posed system"],
        ["`rank(A) = rank([A|b]) < n`", "Reachable, but a null direction exists", "**Infinitely many**", "Multicollinearity"],
        ["`rank(A) < rank([A|b])`", "The target is off the reachable set", "**None**", "**Overdetermined — use least squares**"]
      ],
      caption: "**The third row is the normal case in data work.** A hundred observations and five parameters is almost never exactly solvable, so you stop asking for a solution and start asking for the closest thing — which is regression."
    },

    { t: "code", lang: "python", title: "all three, on 2×2 systems", code: `
# ONE SOLUTION -- independent columns.
A = np.array([[2.0, 1.0],
              [1.0, 3.0]])
np.linalg.solve(A, np.array([5.0, 10.0]))     # [1., 3.]

# NO SOLUTION -- parallel columns, target off the line.
#   x + 2y = 3
#  2x + 4y = 7      <- the second says 2(x+2y) = 7, so 6 = 7
B = np.array([[1.0, 2.0],
              [2.0, 4.0]])
# np.linalg.solve(B, np.array([3.0, 7.0]))    # LinAlgError: Singular

# INFINITELY MANY -- parallel columns, target ON the line.
#   x + 2y = 3
#  2x + 4y = 6      <- the same equation twice
# np.linalg.solve(B, np.array([3.0, 6.0]))    # ALSO LinAlgError

# solve() refuses both singular cases identically, which hides the
# distinction. lstsq does not -- it returns the minimum-norm answer and
# reports the rank, so you can tell what you are looking at.
sol, res, rank, sv = np.linalg.lstsq(B, np.array([3.0, 6.0]), rcond=None)
sol, rank                    # [0.6, 1.2], rank 1

# 0.6 + 2(1.2) = 3.0  -- a valid solution, and the SHORTEST of the
# infinitely many. Which one you get is a choice the algorithm makes on
# your behalf, so know that it is making it.
`,
      hl: [12, 17, 22],
      caption: "**`solve` raises for both singular cases and cannot tell you which you have.** `lstsq` returns the rank, which is the diagnostic — rank below the column count means the answer you got was one of many."
    },

    { t: "h2", n: "04", text: "Never invert to solve", id: "inverse" },

    { t: "ladder",
      title: "Computing `x` where `Ax = b`",
      rungs: [
        { level: "bad", label: "Form the inverse and multiply",
          why: "It matches the algebra on paper and is the worst option numerically. Inversion does roughly three times the work of a solve, and it computes n² numbers when you only wanted n — amplifying rounding error along the way.",
          code: `x = np.linalg.inv(A) @ b

# Slower, less accurate, and it computes an entire matrix you then use
# once and discard.` },
        { level: "ok", label: "Use a solver",
          why: "`solve` runs an LU factorisation and back-substitution — fewer operations and better error behaviour. It still raises on a singular matrix, which is correct for a square system but unhelpful when the system is genuinely rank-deficient.",
          code: `x = np.linalg.solve(A, b)

# The right call for a square, well-conditioned system.` },
        { level: "best", label: "Match the solver to the matrix",
          why: "The structure of the matrix determines the fastest stable method. Using a general solver on a symmetric positive-definite matrix leaves a factor of two on the table; using `solve` on a rectangular system does not work at all.",
          code: `# Square and well-conditioned:
x = np.linalg.solve(A, b)

# Rectangular, or possibly rank-deficient -- the regression case:
x, residuals, rank, sv = np.linalg.lstsq(A, b, rcond=None)

# Symmetric positive definite (a covariance or Gram matrix):
from scipy.linalg import cho_factor, cho_solve
c = cho_factor(A)                 # Cholesky: about half the work
x = cho_solve(c, b)

# Triangular already:
from scipy.linalg import solve_triangular
x = solve_triangular(A, b, lower=True)

# THE RULE: never write inv(). The one honest use is when you genuinely
# need the entries of the inverse themselves -- a covariance of
# estimates, say -- and even then a factorisation is usually better.`,
          note: "**Solving with `lstsq` also gives you the rank and singular values for free**, which are the two numbers that tell you whether to trust the answer." }
      ]
    },

    { t: "callout", kind: "trap", title: "Rank is a judgement call in floating point", body: [
      { t: "code", lang: "python", title: "exact zero almost never happens", numbered: false, code: `
# In exact arithmetic this matrix has rank 1. In floating point the
# dependence is only approximate, so nothing is exactly zero.
A = np.array([[1.0, 2.0],
              [2.0, 4.0 + 1e-13]])

np.linalg.det(A)                # 1.0000000000287557e-13 -- not zero
np.linalg.matrix_rank(A)        # 1  -- correctly judged rank-deficient

# matrix_rank does NOT test for zero. It counts singular values above a
# tolerance scaled to the matrix:
np.linalg.svd(A, compute_uv=False)      # [5.0, 2.0e-14]
# One large, one negligible -> rank 1.

# WHICH MEANS "IS THIS SINGULAR?" IS A QUESTION ABOUT SCALE, NOT LOGIC.
# Testing det == 0 is meaningless; testing det against a tolerance is
# meaningless too, because the determinant scales like the n-th power of
# the entries:
big = A * 1000
np.linalg.det(big)              # 1.0e-07 -- looks "bigger", same matrix

# USE THE CONDITION NUMBER, which is scale-invariant:
np.linalg.cond(A)               # 2.5e14 -- effectively singular
np.linalg.cond(big)             # 2.5e14 -- identical, correctly`},
      { t: "p", text: "**`det == 0` is never the right test.** The determinant carries the units of your data raised to the n-th power, so it can be made arbitrarily small or large by rescaling a matrix that has not changed. The condition number is the scale-free version of the same question." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Explain a regression whose coefficients will not sit still",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A model predicts delivery cost. Refitting on the same data with a different random seed produces wildly different coefficients, though predictions barely move." },
        { t: "code", lang: "python", numbered: false, title: "the design matrix", code: `
# columns: [distance_km, distance_miles, weight_kg, is_express]
X = np.array([
    [10.0,  6.21,  2.0, 1.0],
    [25.0, 15.53,  5.0, 0.0],
    [ 5.0,  3.11,  1.5, 1.0],
    [40.0, 24.85,  8.0, 0.0],
    [15.0,  9.32,  3.0, 1.0],
])
y = np.array([12.0, 25.0, 8.0, 38.0, 16.0])

# Fit 1: [ 0.42,  1.31,  0.95,  2.10]
# Fit 2: [ 2.88, -2.65,  0.95,  2.10]
# Fit 3: [-1.94,  6.10,  0.95,  2.10]
#
# Predictions from all three agree to six decimal places.`},
        { t: "p", text: "Diagnose it with rank, explain why predictions are stable while coefficients are not, and give the fix." }
      ],
      requirements: [
        "Compute the rank and say what it should be.",
        "Identify the dependence exactly.",
        "Explain why the predictions are stable but the coefficients are not.",
        "Show that the three fits are related in a specific way.",
        "Give the fix and the check that would have caught it before fitting.",
        "Say why regularisation would hide rather than solve this."
      ],
      hint: "Look at the first two columns and the number 1.609. Then ask what you can add to a coefficient vector without changing any prediction.",
      solution: {
        lang: "python",
        title: "diagnosis.py",
        code: `# =========================================================================
# THE RANK
# =========================================================================
#
#   X is 5 x 4, so rank could be at most 4.
#
np.linalg.matrix_rank(X)          # 3, not 4
#
# One column is redundant. Which one is not a mystery:
#
#   distance_km / distance_miles = 10 / 6.21 = 1.6103
#                                  25 / 15.53 = 1.6098
#                                  40 / 24.85 = 1.6097
#
# That is the kilometres-per-mile constant. Column 2 IS column 1 divided
# by 1.60934 -- the same measurement recorded in two units.
#
#   col1 - 1.60934 * col2 = 0     (to rounding in the stored miles)
#
# So there is a direction in coefficient space,
#
#   d = [1, -1.60934, 0, 0]
#
# that the design matrix sends to zero. X @ d = 0. That is the NULL SPACE,
# and it has dimension 1: nullity = 4 columns - rank 3 = 1.


# =========================================================================
# WHY PREDICTIONS ARE STABLE AND COEFFICIENTS ARE NOT
# =========================================================================
#
# Predictions are X @ beta. If d is in the null space then for ANY scalar t
#
#   X @ (beta + t*d) = X @ beta + t * (X @ d)
#                    = X @ beta + t * 0
#                    = X @ beta
#
# Every one of the infinitely many coefficient vectors beta + t*d produces
# IDENTICAL predictions. The loss surface is not a bowl with one lowest
# point -- it is a valley with a perfectly flat floor running along d, and
# every point on that floor fits equally well.
#
# So the optimiser is not failing. It is returning one arbitrary point on
# the floor, and which point depends on the seed, the solver, the
# initialisation -- anything at all.
#
# CHECK THE THREE FITS ARE ON THE SAME LINE:
#
#   fit2 - fit1 = [ 2.46, -3.96, 0, 0]
#   fit3 - fit1 = [-2.36,  3.79, 0, 0]
#
#   2.46 / -3.96 = -0.621 ;  -2.36 / 3.79 = -0.623
#   and  -1 / 1.60934 = -0.6214
#
# Both differences are multiples of d, to the precision of the rounded
# miles column. The fits differ ONLY along the null direction -- which is
# the arithmetic proof of the diagnosis.
#
# Note the last two coefficients are identical across all three fits
# (0.95 and 2.10). weight_kg and is_express are not involved in the
# dependence, so they are pinned. Only the pair that is confounded moves.


# =========================================================================
# THE FIX
# =========================================================================

# Drop the duplicate. Not because it is "less important" -- the two
# columns carry exactly the same information, so one of them is free.
X_fixed = X[:, [0, 2, 3]]                    # km, weight, express
np.linalg.matrix_rank(X_fixed)               # 3 == number of columns

beta, res, rank, sv = np.linalg.lstsq(X_fixed, y, rcond=None)
# Now unique, reproducible, and interpretable: the distance coefficient
# is "cost per kilometre" rather than a number split arbitrarily between
# two units of the same quantity.


# =========================================================================
# THE CHECK, BEFORE FITTING
# =========================================================================

def assert_full_column_rank(X, names=None):
    """Rank deficiency makes coefficients meaningless while leaving
    predictions and R-squared untouched, so nothing downstream will
    report it. Check at the boundary instead."""
    rank = np.linalg.matrix_rank(X)
    if rank < X.shape[1]:
        # The condition number is the scale-free severity measure;
        # det() is not, because it carries the units to the n-th power.
        raise ValueError(
            f"design matrix has rank {rank} but {X.shape[1]} columns "
            f"(cond = {np.linalg.cond(X):.2e}) -- {X.shape[1] - rank} "
            f"column(s) are redundant"
        )

# For NEAR-dependence, which is the commoner and nastier case, rank is
# still full but the condition number is enormous:
np.linalg.cond(X)                 # ~1e17 -- effectively singular
np.linalg.cond(X_fixed)           # ~30   -- healthy

# A rule of thumb: cond above ~1e10 means the coefficients are noise.


# =========================================================================
# WHY REGULARISATION HIDES THIS
# =========================================================================
#
# Ridge adds lambda * ||beta||^2 to the loss. The flat valley floor stops
# being flat -- among the infinitely many equally-fitting beta, the one
# with the smallest norm now wins uniquely.
#
# So ridge DOES make the answer reproducible. But:
#
#   1. It does not remove the confounding. It splits the distance effect
#      between km and miles in whatever proportion minimises the norm --
#      typically about half each. Neither coefficient means "cost per
#      kilometre" any more.
#
#   2. It makes the symptom disappear, so nobody investigates. The
#      coefficients are now stable AND wrong, which is worse than
#      unstable and obviously untrustworthy.
#
#   3. The duplicated column still shrinks every other coefficient,
#      because the penalty is shared across a redundant parameterisation.
#
# Regularisation is the right tool for genuine near-collinearity you
# cannot remove -- correlated but distinct features. It is the wrong tool
# for an exact duplicate, where the fix is to delete a column.


# =========================================================================
# TESTS
# =========================================================================

def test_design_matrix_has_full_column_rank():
    with pytest.raises(ValueError, match="redundant"):
        assert_full_column_rank(X)
    assert_full_column_rank(X_fixed)          # passes


def test_null_direction_leaves_predictions_unchanged():
    """The reason coefficients wander while predictions do not."""
    d = np.array([1.0, -1.60934, 0.0, 0.0])
    beta = np.array([0.42, 1.31, 0.95, 2.10])

    np.testing.assert_allclose(X @ beta, X @ (beta + 7.3 * d), atol=1e-3)


def test_refitting_is_reproducible_after_the_fix():
    a = np.linalg.lstsq(X_fixed, y, rcond=None)[0]
    b = np.linalg.lstsq(X_fixed, y, rcond=None)[0]

    np.testing.assert_allclose(a, b)


def test_condition_number_flags_near_dependence():
    """Rank is a yes/no answer; cond is the severity, and it catches the
    near-duplicate that rank would call full."""
    assert np.linalg.cond(X) > 1e10
    assert np.linalg.cond(X_fixed) < 1e3`,
        notes: [
          { t: "p", text: "**`distance_km / distance_miles` is 1.609 — the unit conversion.** The two columns are one measurement recorded twice, so the design matrix has a null direction `d = [1, −1.609, 0, 0]` and rank 3 where it should be 4." },
          { t: "p", text: "**`X @ (β + t·d) = X @ β` for every `t`**, so infinitely many coefficient vectors give identical predictions. The loss surface is a valley with a flat floor rather than a bowl, and the optimiser returns an arbitrary point on that floor." },
          { t: "callout", kind: "insight", title: "The three fits differ only along the null direction", body: [
            { t: "p", text: "`fit2 − fit1 = [2.46, −3.96, 0, 0]` and the ratio −0.621 matches `−1/1.609`. That is arithmetic proof rather than a plausible story — the fits are points on one line in coefficient space." },
            { t: "p", text: "The last two coefficients are identical across all three fits, because `weight_kg` and `is_express` are not part of the dependence. Only the confounded pair moves, which is the signature to look for." }
          ]},
          { t: "p", text: "**Use the condition number, not the determinant.** The determinant carries the data's units raised to the n-th power, so rescaling changes it without changing the matrix; `cond` is scale-invariant, and above roughly 1e10 the coefficients are noise." },
          { t: "p", text: "**Ridge would make this reproducible and still wrong.** It picks the minimum-norm point on the flat floor, splitting the distance effect roughly half between kilometres and miles — so the coefficients become stable *and* meaningless, and nobody investigates. Regularisation is for genuine near-collinearity you cannot remove; an exact duplicate is a column to delete." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team one-hot encoded a categorical with all levels included, and kept the intercept. The encoded columns summed to exactly the intercept column, so the design matrix was rank-deficient by one." },
      { t: "p", text: "**Every library handled it differently and none of them complained.** R silently dropped a level, statsmodels returned NaN for one coefficient, and scikit-learn's regularised solver returned finite numbers that quietly split the effect across all levels." },
      { t: "p", text: "**Three tools, three answers, no errors.** The analyst compared coefficients across tools and spent two days trying to reconcile numbers that were never comparable." },
      { t: "p", text: "**The dummy-variable trap is rank deficiency with a name.** Dropping one level — or the intercept — restores full rank and makes every tool agree, because there is then only one answer to agree on." }
    ]}
  ],

  takeaways: [
    "**Matrix multiplication is forced by composition**: `(AB)x = A(Bx)` admits only the row-times-column rule.",
    "**A shape mismatch is a type error** — the first map's output space must be the second's input space.",
    "**Rank counts the dimensions that survive**, and equals the number of independent columns.",
    "**`rank + nullity = columns`**: what survives plus what is destroyed accounts for the whole input space.",
    "**`rank ≤ min(rows, columns)`**, which is why more features than samples guarantees no unique solution.",
    "**A linear system has one solution, none, or infinitely many** — and rank tells you which before you solve it.",
    "**Overdetermined systems are the normal case in data work**, which is why regression is least squares rather than solving.",
    "**Never write `inv()`.** Solving is faster and more accurate; `lstsq` also hands you the rank and singular values.",
    "**Match the solver to the matrix** — Cholesky for symmetric positive definite, triangular solve for triangular.",
    "**`det == 0` is never the right singularity test.** The determinant scales with the units to the n-th power; the condition number does not.",
    "**A condition number above about 1e10 means the coefficients are noise**, even when rank reports full.",
    "**Rank deficiency leaves predictions and R² untouched while making coefficients arbitrary** — so nothing downstream reports it, and you must check the design matrix yourself."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A design matrix has 4 columns and rank 3. Refits give different coefficients but identical predictions. Why?",
        options: [
          "The optimiser has not converged",
          "There is a null direction `d` with `Xd = 0`, so `β + t·d` fits identically for every `t` — the loss floor is flat and the solver returns an arbitrary point on it",
          "The learning rate is too high",
          "The data needs standardising"
        ],
        answer: 1,
        why: "Nothing has failed — there genuinely is no unique answer. The tell is that the differences between fits are all multiples of one direction, and coefficients not involved in the dependence stay pinned. The fix is removing the redundant column, not tuning the solver."
      },
      {
        stem: "Why is `np.linalg.inv(A) @ b` a poor way to solve `Ax = b`?",
        options: [
          "It only works for symmetric matrices",
          "It does roughly three times the work, computes n² numbers when n were wanted, and amplifies rounding error — `solve` factorises instead",
          "It returns the wrong answer for singular matrices",
          "It cannot handle floating point"
        ],
        answer: 1,
        why: "The algebra on paper says `x = A⁻¹b`, but the numerics disagree. `solve` runs an LU factorisation and back-substitution; `lstsq` additionally returns the rank and singular values, which are the numbers telling you whether to trust the result at all."
      },
      {
        stem: "Why is `det(A) == 0` the wrong test for singularity?",
        options: [
          "Determinants are expensive to compute",
          "The determinant scales with the entries raised to the n-th power, so rescaling a matrix changes it without changing the matrix — the condition number is scale-invariant",
          "`det` is only defined for symmetric matrices",
          "Floating point cannot represent zero"
        ],
        answer: 1,
        why: "Multiplying a matrix by 1000 multiplies a 2×2 determinant by a million while leaving the transformation's nature untouched. `matrix_rank` counts singular values above a scaled tolerance, and `cond` reports severity — above roughly 1e10 the solution is dominated by rounding."
      },
      {
        stem: "What would ridge regression do to a design matrix containing distance in both km and miles?",
        options: [
          "Correctly identify and drop the duplicate column",
          "Make the coefficients reproducible by choosing the minimum-norm solution — splitting the effect across both columns, so they become stable and meaningless",
          "Raise an error about collinearity",
          "Leave the coefficients unchanged"
        ],
        answer: 1,
        why: "The penalty makes the flat valley floor curve, so one point wins uniquely. But the confounding remains: neither coefficient means \"cost per kilometre\" any more, and because the instability symptom disappears nobody investigates. Ridge suits genuine near-collinearity; an exact duplicate is a column to delete."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the rank of a matrix?",
        strong: "The number of linearly independent columns — equivalently, how many dimensions the output occupies. Full rank means nothing collided and the map could be undone; less means information was destroyed.",
        answer: [
          { t: "p", text: "Giving both readings, and saying they are the same number, is what separates understanding from a definition." },
          { t: "p", text: "Rank-nullity is worth volunteering: what survives plus what is crushed accounts for the input space." },
          { t: "p", text: "The practical hook is multicollinearity — rank deficiency in a design matrix — which is where the follow-up is heading." }
        ]
      },
      {
        level: "advanced",
        q: "A model's coefficients change on every refit but predictions do not. What is happening?",
        strong: "The design matrix is rank-deficient, so there is a null direction you can add to the coefficients without changing any prediction. The loss floor is flat and the solver returns an arbitrary point on it.",
        answer: [
          { t: "p", text: "Stating it as `X(β + td) = Xβ` makes the explanation exact rather than descriptive." },
          { t: "p", text: "The diagnostic detail worth adding: coefficients not involved in the dependence stay pinned, so the moving subset identifies the confounded columns." },
          { t: "p", text: "Saying that ridge fixes the symptom and not the cause shows judgement about when regularisation is the right answer." }
        ]
      },
      {
        level: "core",
        q: "Would you ever call `inv()`?",
        strong: "Almost never. Solving is faster and numerically better, and `lstsq` gives the rank and singular values too. The honest exception is when you need the entries of the inverse themselves — a covariance of estimates — and even then a factorisation is usually preferable.",
        answer: [
          { t: "p", text: "Naming the exception rather than stating an absolute rule is what makes the answer credible." },
          { t: "p", text: "Mentioning Cholesky for symmetric positive-definite matrices shows you match the method to the structure." },
          { t: "p", text: "The related point — that `cond` rather than `det` is the diagnostic — usually earns the follow-up." }
        ]
      }
    ]
  }
});
