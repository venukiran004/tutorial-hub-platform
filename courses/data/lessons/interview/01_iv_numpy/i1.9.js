/* ============================================================================
   INTERVIEW I1.9 — Numerical Methods & Scientific Computing
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.9",
 "lede": "**20 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the worked answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Numerical Methods & Scientific Computing",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is numerical stability and how does it affect NumPy computations?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Catastrophic cancellation\na = 1e15 + 1 - 1e15   # Python float: 0.0 — loses 1\nnp.float64(1e15) + np.float64(1) - np.float64(1e15)   # 0.0 — same issue\n\n# Solutions:\n# Use np.log1p(x) instead of np.log(1+x) for small x\n# Use np.expm1(x) instead of np.exp(x)-1\n# Use compensated summation: np.sum(...) uses pairwise summation, more stable than sequential"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is `np.linalg.norm` and its variants?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "v = np.array([3.0, 4.0])\n\nnp.linalg.norm(v)             # L2 norm = 5.0\nnp.linalg.norm(v, ord=1)      # L1 norm = 7.0\nnp.linalg.norm(v, ord=np.inf) # L∞ norm = 4.0 (max abs value)\n\n# Matrix norms\nM = np.array([[1,2],[3,4]])\nnp.linalg.norm(M, ord=\"fro\")   # Frobenius = sqrt(1+4+9+16) = 5.477\nnp.linalg.norm(M, ord=2)       # Spectral = largest singular value"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is `np.linalg.lstsq` and when do you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Solve over-determined and under-determined linear systems Ax = b\n# More numerically stable than np.linalg.solve for non-square systems\nA = np.column_stack([x, np.ones_like(x)])   # Design matrix for linear regression\nb = y  # Targets\n\n# Minimum norm / least squares solution\ncoefficients, residuals, rank, sv = np.linalg.lstsq(A, b, rcond=None)\nslope, intercept = coefficients"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is `np.linalg.eigh` vs `np.linalg.eig`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# eig: General square matrix (complex eigenvalues/vectors possible)\neigenvalues, eigenvectors = np.linalg.eig(A)\n\n# eigh: Symmetric/Hermitian (guarantees real eigenvalues, more stable, faster)\n# For covariance matrices, Gram matrices — always use eigh\neigenvalues, eigenvectors = np.linalg.eigh(A_symmetric)\n# Eigenvalues returned in ascending order (opposite to eig)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is `np.linalg.pinv` (pseudo-inverse)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Moore-Penrose pseudo-inverse: exists for any matrix (not just square)\nA_plus = np.linalg.pinv(A)\n\n# Use cases:\n# - Minimum norm solution to underdetermined system: x = A+ @ b\n# - Least squares for overdetermined: A+ @ b = (AᵀA)⁻¹Aᵀ @ b\n# - More numerically stable than explicit (AᵀA)⁻¹Aᵀ"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is matrix condition number and why does it matter?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# cond: Ratio of largest to smallest singular value\n# High condition number → near-singular → unstable inversion\ncond = np.linalg.cond(A)\n\n# cond >> 1: adding small noise to b can cause large changes in solution\n# cond > 1/machine_epsilon (≈1e16): effectively singular for float64\n\n# Diagnosis for linear regression\ncond = np.linalg.cond(X.T @ X)  # Should be < 1e10 for stable regression"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is `np.linalg.matrix_rank`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Numerical rank (count of singular values above threshold)\nrank = np.linalg.matrix_rank(A)\n\n# Full rank: min(m, n) — no multicollinearity\n# Deficient rank: features are linearly dependent\n\n# Custom threshold\nrank = np.linalg.matrix_rank(A, tol=1e-10)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is `np.linalg.cholesky` and its use in ML?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Cholesky: A = LLᵀ (L is lower triangular) — only for positive definite A\nL = np.linalg.cholesky(covariance_matrix)\n\n# Applications:\n# 1. Efficient solving of positive-definite systems (2x faster than LU)\n# 2. Sampling from multivariate Gaussian: X = μ + L @ z, z ~ N(0,I)\nz = np.random.randn(n_dim, n_samples)\nsamples = mean + L @ z"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is `np.linalg.slogdet` and why use log-determinant?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Log-determinant: avoids overflow/underflow for large matrices\nsign, logdet = np.linalg.slogdet(A)\nlog_abs_det = logdet    # log |det(A)|\ndet = sign * np.exp(logdet)   # Reconstruct if needed (but may overflow)\n\n# Use case: log-likelihood of multivariate Gaussian requires log|Σ|\n# For 100×100 covariance: det can be 10^{-5000} — must use logdet"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What is `np.polynomial.polynomial.polyfit` vs `np.polyfit`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# np.polyfit: Fit polynomial to data (uses Vandermonde matrix)\ncoeffs = np.polyfit(x, y, deg=3)    # Descending degree: [a3, a2, a1, a0]\ny_pred = np.polyval(coeffs, x_new)\n\n# np.polynomial.polynomial (new API): ascending degree, more numerically stable\nfrom numpy.polynomial import polynomial as P\ncoeffs, stats = P.polyfit(x, y, deg=3, full=True)\npoly = P.Polynomial(coeffs)\ny_pred = poly(x_new)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "151",
   "q": "What is `np.interp` for 1D linear interpolation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Linearly interpolate at new x points\nx_known = np.array([0, 1, 2, 3, 4])\ny_known = np.array([0, 1, 4, 9, 16])\n\ny_new = np.interp(2.5, x_known, y_known)   # 6.5\ny_new = np.interp([1.5, 2.5], x_known, y_known)  # [2.5, 6.5]\n\n# Clipping behavior (extrapolation limited to boundary values)\ny_new = np.interp(10, x_known, y_known, right=100)  # Cap at 100 beyond range"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "What is `np.gradient` for numerical differentiation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Approximate derivative using finite differences (central differences)\ny = np.array([1, 4, 9, 16, 25])   # y = x^2\ndy = np.gradient(y)                # Approximate y' ≈ [2x] = [3, 4, 6, 8, 9]\n\n# With non-uniform spacing\nx = np.array([0, 1, 3, 6, 10])\nnp.gradient(y, x)                  # dy/dx with specified x coordinates\n\n# 2D gradient (image gradients)\ngrad_y, grad_x = np.gradient(image_2d)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "What is `np.trapz` and `np.cumtrapz` for numerical integration?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Trapezoidal rule integration\nx = np.linspace(0, np.pi, 1000)\ny = np.sin(x)\n\narea = np.trapz(y, x)   # ≈ 2.0 (integral of sin from 0 to π)\n\n# Cumulative trapz\nfrom scipy.integrate import cumulative_trapezoid as cumtrapz\ncum_area = cumtrapz(y, x, initial=0)  # Running integral"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "What is `np.correlate` for autocorrelation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Autocorrelation (how correlated signal is with shifted version of itself)\nx = np.array([1, 2, 3, 2, 1])\nautocorr = np.correlate(x - x.mean(), x - x.mean(), mode=\"full\")\nautocorr /= autocorr.max()   # Normalize\n\n# Lag 0: maximum (always 1.0 when normalized)\n# Useful for periodicity detection in time series"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "What is `np.random.Generator` and why is it preferred over `np.random.*`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Legacy (deprecated): module-level functions with global state\nnp.random.seed(42)\nnp.random.randn(5)\n\n# Modern: Generator with explicit seeding\nrng = np.random.default_rng(seed=42)    # PCG64 generator\nrng.standard_normal(5)\nrng.integers(0, 100, size=(3, 3))\nrng.choice(arr, size=10, replace=False)\n\n# Benefits: reproducible, no global state, faster PCG64 algorithm"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "156",
   "q": "What is `np.random.Generator.multivariate_normal` for sampling?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(42)\n\nmean = np.array([0, 0])\ncov = np.array([[1, 0.8], [0.8, 1]])\n\nsamples = rng.multivariate_normal(mean, cov, size=1000)\n# samples.shape = (1000, 2)\n\n# Equivalent: using Cholesky\nL = np.linalg.cholesky(cov)\nz = rng.standard_normal((2, 1000))\nsamples = (mean[:, None] + L @ z).T"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "What is `np.random.Generator.permutation` vs `np.random.Generator.shuffle`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(42)\narr = np.array([1, 2, 3, 4, 5])\n\nperm = rng.permutation(arr)   # Returns new COPY — original unchanged\nrng.shuffle(arr)               # In-place shuffle\n\n# Shuffle 2D (rows):\nrng.shuffle(matrix)            # Shuffles rows\n\n# Permutation with n (generates random permutation of 0..n-1):\nindices = rng.permutation(len(arr))\narr[indices]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "What is `np.random.Generator.choice` with and without replacement?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(42)\narr = np.array([10, 20, 30, 40, 50])\n\n# Without replacement (sampling)\nrng.choice(arr, size=3, replace=False)         # [30, 10, 50]\n\n# With replacement (bootstrap)\nrng.choice(arr, size=10, replace=True)\n\n# Weighted sampling\nweights = np.array([0.1, 0.4, 0.3, 0.15, 0.05])\nrng.choice(arr, size=5, replace=True, p=weights)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "What is `np.testing.assert_allclose` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Test approximate equality (for floating point)\nnp.testing.assert_allclose(actual, desired, rtol=1e-5, atol=1e-8)\n\n# Test exact equality (for integers)\nnp.testing.assert_array_equal(actual, desired)\n\n# In unit tests for numerical functions:\ndef test_softmax():\n    x = np.array([1.0, 2.0, 3.0])\n    result = softmax(x)\n    np.testing.assert_allclose(result.sum(), 1.0)\n    np.testing.assert_allclose(result, np.exp(x)/np.exp(x).sum(), rtol=1e-6)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "What is `np.lib.recfunctions` for structured arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy.lib.recfunctions as rfn\n\n# Create structured array (like a DataFrame but in NumPy)\ndt = np.dtype([(\"name\", \"U20\"), (\"age\", \"i4\"), (\"salary\", \"f8\")])\nrecords = np.array([(\"Alice\", 30, 75000.0), (\"Bob\", 25, 65000.0)], dtype=dt)\n\nrecords[\"name\"]      # Access by field name\nrecords[\"salary\"].mean()\n\n# Add a new field\nrfn.append_fields(records, \"bonus\", np.array([5000.0, 4000.0]))"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
