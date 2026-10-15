/* ============================================================================
   INTERVIEW I1.11 — Performance, Memory & Integration · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.11",
 "lede": "**15 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Performance, Memory & Integration · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "186",
   "q": "What is `np.pad` for array padding?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([[1, 2], [3, 4]])\n\n# Constant padding (zero-padding for CNNs)\nnp.pad(arr, pad_width=1, mode=\"constant\", constant_values=0)\n\n# Reflect padding (for signal processing)\nnp.pad(arr, pad_width=1, mode=\"reflect\")\n\n# Edge padding\nnp.pad(arr, pad_width=((1, 2), (0, 1)), mode=\"edge\")  # asymmetric"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "What is `np.squeeze` and `np.expand_dims`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([[[1, 2, 3]]])   # shape (1, 1, 3)\n\nnp.squeeze(arr)                    # (3,) — removes all size-1 dims\nnp.squeeze(arr, axis=0)            # (1, 3) — removes only axis 0\narr.reshape(-1)                    # (3,) — alternative\n\nnp.expand_dims(arr, axis=0)        # Add dimension at position 0\narr[np.newaxis, ...]               # Same: add dim at start\narr[..., np.newaxis]               # Add dim at end"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "What is `np.roll` for circular/cyclic shifting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, 2, 3, 4, 5])\n\nnp.roll(arr, 2)      # [4, 5, 1, 2, 3] — shift right by 2\nnp.roll(arr, -2)     # [3, 4, 5, 1, 2] — shift left by 2\n\n# 2D rolling\nmatrix = np.arange(9).reshape(3,3)\nnp.roll(matrix, 1, axis=0)   # Shift rows down by 1\nnp.roll(matrix, -1, axis=1)  # Shift columns left by 1"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "What is `np.flip` and `np.fliplr`/`np.flipud`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([[1,2,3],[4,5,6]])\n\nnp.flipud(arr)       # Flip vertically (up-down) == arr[::-1]\nnp.fliplr(arr)       # Flip horizontally (left-right) == arr[:, ::-1]\nnp.flip(arr)         # Flip all axes\nnp.flip(arr, axis=1) # Flip along axis 1 only\n\n# Use case: image augmentation (horizontal flip)\naugmented = np.fliplr(image)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "What is `np.rot90` for rotating arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "matrix = np.arange(9).reshape(3, 3)\n\nnp.rot90(matrix)           # Rotate 90° counterclockwise (k=1)\nnp.rot90(matrix, k=2)      # Rotate 180°\nnp.rot90(matrix, k=3)      # Rotate 270°\nnp.rot90(matrix, k=-1)     # Rotate 90° clockwise\n\n# Specify axes for rotation in N-D\nnp.rot90(arr_3d, k=1, axes=(0, 1))  # Rotate in the (0,1) plane"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "How do you implement a Kalman filter update step in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def kalman_update(x, P, z, H, R):\n    \"\"\"\n    x: state estimate, P: state covariance\n    z: measurement, H: measurement matrix, R: measurement noise covariance\n    \"\"\"\n    S = H @ P @ H.T + R                   # Innovation covariance\n    K = P @ H.T @ np.linalg.inv(S)        # Kalman gain\n    x_new = x + K @ (z - H @ x)           # Updated state\n    P_new = (np.eye(len(x)) - K @ H) @ P  # Updated covariance\n    return x_new, P_new"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "How do you implement log-sum-exp trick in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def logsumexp(x: np.ndarray, axis: int = None) -> np.ndarray:\n    \"\"\"Stable computation of log(sum(exp(x)))\"\"\"\n    x_max = x.max(axis=axis, keepdims=True)\n    return np.squeeze(x_max, axis=axis) + np.log(np.sum(np.exp(x - x_max), axis=axis))\n\n# Used in: log-likelihood computation, softmax denominator, hidden Markov models\n# Without trick: exp(1000) → inf; with trick: exp(0) = 1 → stable"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "What is `np.polynomial.hermite` and `np.polynomial.chebyshev` for function approximation?",
   "body": [
    {
     "t": "p",
     "text": "Numpy provides orthogonal polynomial families:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from numpy.polynomial import Chebyshev, Hermite, Legendre\n\n# Fit Chebyshev polynomial (optimal for approximation on [-1, 1])\ncheb = Chebyshev.fit(x, y, deg=5)\ny_approx = cheb(x_new)\n\n# Chebyshev nodes minimize Runge's phenomenon vs equidistant points\nnodes = Chebyshev.basis(n+1).roots()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "What is `np.tensordot` vs `np.einsum` vs `@` for performance?",
   "body": [
    {
     "t": "table",
     "head": [
      "Operation",
      "Method",
      "Notes"
     ],
     "rows": [
      [
       "Matrix multiply",
       "`A @ B`",
       "Fastest — BLAS optimized"
      ],
      [
       "Batched matmul",
       "`A @ B` (3D+)",
       "`np.matmul`"
      ],
      [
       "Contraction",
       "`np.tensordot`",
       "Slightly faster than einsum"
      ],
      [
       "Complex einsum",
       "`np.einsum(opt=True)`",
       "Best for 3+ tensor contractions"
      ],
      [
       "Outer product",
       "`A[:, None] * B[None]`",
       "Broadcasting"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "How do you compute feature cross products (polynomial features) with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# All pairwise products of features\nn_features = X.shape[1]\ncross_products = []\nfor i in range(n_features):\n    for j in range(i, n_features):\n        cross_products.append(X[:, i] * X[:, j])\n\nX_poly = np.column_stack(cross_products)\n\n# Or use broadcasting for degree-2 outer products\nouter = X[:, :, None] * X[:, None, :]  # (n, d, d) outer products\n# Extract unique pairs with np.triu_indices"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "What is `np.linalg.matrix_rank` for feature redundancy detection?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Detect multicollinearity in feature matrix\nrank = np.linalg.matrix_rank(X)\nif rank < X.shape[1]:\n    print(f\"Features are rank-deficient: {rank} independent features out of {X.shape[1]}\")\n\n# Find linearly independent columns:\n_, _, Vt = np.linalg.svd(X)\nthreshold = 1e-10\nindependent_mask = np.abs(Vt).max(axis=1) > threshold"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "How do you implement Gram-Schmidt orthogonalization in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def gram_schmidt(A: np.ndarray) -> np.ndarray:\n    \"\"\"Orthogonalize columns of A\"\"\"\n    Q = np.zeros_like(A, dtype=float)\n    for j in range(A.shape[1]):\n        v = A[:, j].copy()\n        for i in range(j):\n            v -= np.dot(Q[:, i], A[:, j]) * Q[:, i]\n        norm = np.linalg.norm(v)\n        if norm > 1e-10:\n            Q[:, j] = v / norm\n    return Q\n\n# NOTE: Use np.linalg.qr for numerically stable version\nQ, R = np.linalg.qr(A)  # More stable than manual Gram-Schmidt"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "What is `np.block_diag` (scipy) and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy.linalg import block_diag\n\nA = np.array([[1, 2], [3, 4]])\nB = np.array([[5, 6, 7], [8, 9, 10], [11, 12, 13]])\nC = np.array([[14]])\n\nbd = block_diag(A, B, C)\n# Shape: (6, 6) — diagonal blocks, zeros off-diagonal\n# Used in: multi-task learning, covariance for independent groups"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "What are the key NumPy operations every ML engineer should know by heart?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Data manipulation\nreshape, ravel, transpose (T), squeeze, expand_dims, stack, concatenate, split\n\n# Math\nsum/mean/std/var (axis=), min/max/argmin/argmax, clip, abs\n\n# Linear algebra\nmatmul (@), linalg.norm, linalg.solve, linalg.eigh, linalg.svd, linalg.inv\n\n# Indexing\nboolean indexing, fancy indexing, where, nonzero, argsort, unique\n\n# Creation\nzeros/ones/full, eye, arange, linspace, random.default_rng().*\n\n# Performance\nascontiguousarray, frombuffer, memmap, frompyfunc"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "What is the NumPy API stability guarantee and versioning?",
   "body": [
    {
     "t": "p",
     "text": "NumPy follows NEP (NumPy Enhancement Proposals) for deprecation:"
    },
    {
     "t": "ul",
     "items": [
      "Deprecated functions stay for ≥2 major versions with warnings.",
      "Functions in `numpy.core` may change; `numpy.*` is stable public API.",
      "Use `np.__version__` to check version in code requiring specific features.",
      "Key recent additions: `numpy.random.default_rng` (1.17), `sliding_window_view` (1.20), `StringDtype` (2.0), copy-on-write semantics (2.0 default opt-in)."
     ]
    },
    {
     "t": "p",
     "text": "*Last Updated: April 2026* *Topic: NumPy Interview Questions*"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
