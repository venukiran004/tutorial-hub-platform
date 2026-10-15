/* ============================================================================
   INTERVIEW I1.10 — Performance, Memory & Integration · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.10",
 "lede": "**25 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Performance, Memory & Integration · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "161",
   "q": "What is `np.memmap` for working with large arrays on disk?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create memory-mapped array backed by file\narr = np.memmap(\"large_array.dat\", dtype=\"float64\", mode=\"w+\", shape=(1_000_000, 100))\narr[:] = 0.0                    # Written to disk, not RAM\narr[0:1000, :] = some_data      # Partial write\n\n# Read existing memmap\narr = np.memmap(\"large_array.dat\", dtype=\"float64\", mode=\"r\", shape=(1_000_000, 100))\nchunk = arr[0:1000, :]          # Only reads this chunk from disk"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "What is `np.save`, `np.load`, and `np.savez`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Save single array (.npy — raw binary, very fast)\nnp.save(\"array.npy\", arr)\nloaded = np.load(\"array.npy\")\n\n# Save multiple arrays (.npz — compressed archive)\nnp.savez(\"arrays.npz\", X=X_train, y=y_train, X_val=X_val)\ndata = np.load(\"arrays.npz\")\nX_train = data[\"X\"]\n\n# Compressed (zlib)\nnp.savez_compressed(\"arrays_c.npz\", **arrays)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "What is `np.frombuffer` and `np.frompyfunc` for zero-copy interfacing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Convert bytes/bytearray to NumPy array (zero-copy)\nraw_bytes = b\"\\x00\\x01\\x02\\x03\\x04\\x05\\x06\\x07\"\narr = np.frombuffer(raw_bytes, dtype=np.uint8)\n# arr = [0, 1, 2, 3, 4, 5, 6, 7]\n\n# From Python buffer protocol (shared memory, ctypes, etc.)\nbuf = (ctypes.c_float * 4)(1.0, 2.0, 3.0, 4.0)\narr = np.frombuffer(buf, dtype=np.float32)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "What is `np.shares_memory` and when should you check it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3, 4, 5])\nb = a[1:4]        # View: shares memory\nc = a[1:4].copy() # Copy: does not share\n\nnp.shares_memory(a, b)    # True\nnp.shares_memory(a, c)    # False\n\n# Check before in-place modification to avoid unintended side effects"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "What is `np.copyto` for efficient in-place copying?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "dest = np.empty((1000, 1000))\nsrc = some_data\n\n# Faster than dest[:] = src for large arrays in certain cases\nnp.copyto(dest, src)\n\n# With casting options\nnp.copyto(dest, src, casting=\"safe\")  # Only safe type casts\n\n# With where mask\nnp.copyto(dest, src, where=mask)  # Only copy where mask is True"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "What is `np.char` for vectorized string operations?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Vectorized string operations without object dtype conversion\nnames = np.array([\"Alice\", \"Bob\", \"Charlie\"])\n\nnp.char.lower(names)                # ['alice', 'bob', 'charlie']\nnp.char.upper(names)                # ['ALICE', 'BOB', 'CHARLIE']\nnp.char.replace(names, \"a\", \"4\")    # Vectorized string replace\nnp.char.startswith(names, \"A\")      # [True, False, False]\nnp.char.join(\"-\", [\"hello\", \"world\"])  # ['h-e-l-l-o', 'w-o-r-l-d']"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "What is `np.apply_along_axis` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "matrix = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])\n\n# Apply function to 1D slices along an axis\ndef normalize(v): return (v - v.min()) / (v.max() - v.min())\n\nnormalized = np.apply_along_axis(normalize, axis=1, arr=matrix)\n# Each row is independently normalized\n\n# NOTE: Still Python-level loop — prefer broadcasting where possible\nrow_min = matrix.min(axis=1, keepdims=True)\nrow_max = matrix.max(axis=1, keepdims=True)\nnormalized_fast = (matrix - row_min) / (row_max - row_min)  # Vectorized"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "What is `np.apply_over_axes`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Sum over multiple axes simultaneously\narr = np.arange(24).reshape(2, 3, 4)\n\n# Sum over axes 0 and 2\nresult = np.apply_over_axes(np.sum, arr, axes=[0, 2])\nresult.shape   # (1, 3, 1)\n\n# Equivalent: arr.sum(axis=(0, 2), keepdims=True)\n# apply_over_axes applies function iteratively; sum tuple is faster"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "What is `np.ufunc.at` for non-contiguous in-place operations?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Like arr[indices] += values but handles repeated indices correctly!\narr = np.array([1, 2, 3, 4, 5])\nindices = [0, 0, 2]   # Index 0 appears twice\nvalues = [10, 10, 10]\n\n# WRONG: arr[indices] += values  — only adds 10 once for index 0\n# CORRECT:\nnp.add.at(arr, indices, values)  # arr[0] += 10 twice = 21, arr[2] += 10 = 13"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "What is `np.fromfunction` for array creation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create array where each element is a function of its indices\nn = 5\ndistance_matrix = np.fromfunction(lambda i, j: np.abs(i - j), (n, n))\n\n# Adjacency matrix for cycle graph\nadj = np.fromfunction(lambda i, j: ((i-j) % n == 1) | ((j-i) % n == 1), (n, n)).astype(int)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "How do you profile NumPy code for bottlenecks?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import cProfile, pstats\n\n# Profile NumPy operations\ncProfile.run(\"np.linalg.svd(large_matrix)\", \"profile.bin\")\nstats = pstats.Stats(\"profile.bin\").sort_stats(\"cumtime\")\nstats.print_stats(10)\n\n# Memory profiling\nfrom memory_profiler import profile\n\n@profile\ndef expensive_op():\n    large = np.random.randn(10000, 10000)\n    return large.T @ large"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "What is Numba's JIT compilation with NumPy arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from numba import njit, prange\nimport numpy as np\n\n@njit(parallel=True)\ndef parallel_distance(X: np.ndarray) -> np.ndarray:\n    n = X.shape[0]\n    dist = np.empty((n, n))\n    for i in prange(n):\n        for j in range(n):\n            diff = X[i] - X[j]\n            dist[i, j] = np.sqrt(np.dot(diff, diff))\n    return dist\n\n# First call: ~0.5s (JIT compilation)\n# Subsequent: ~10ms (native speed, parallel across CPU cores)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "What is CuPy and how does it integrate with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import cupy as cp\n\n# Same API as NumPy, executes on GPU\nX_gpu = cp.array(X_cpu)           # CPU → GPU\nresult_gpu = cp.linalg.svd(X_gpu) # GPU computation\nresult_cpu = cp.asnumpy(result_gpu[0])  # GPU → CPU\n\n# Array interop\nX_gpu = cp.asarray(X_cpu)   # Zero-copy if possible\nX_cpu = cp.asnumpy(X_gpu)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "What is JAX and how does it differ from NumPy?",
   "body": [
    {
     "t": "p",
     "text": "JAX is \"NumPy on accelerators + autodiff + JIT\":"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import jax.numpy as jnp\nfrom jax import grad, jit, vmap\n\n@jit\ndef loss(params, x): return jnp.mean((jnp.dot(x, params) - y) ** 2)\n\n# Automatic differentiation\ngrad_fn = grad(loss)\ngradients = grad_fn(params, X_train)\n\n# vmap: Vectorize over batch dimension\nbatched_predict = vmap(predict, in_axes=(None, 0))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "What is `np.block` for constructing block matrices?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.eye(2)\nB = np.zeros((2, 3))\nC = np.ones((3, 2))\nD = 2 * np.eye(3)\n\nblock_matrix = np.block([\n    [A, B],   # Top row: [2×2 | 2×3]\n    [C, D]    # Bot row: [3×2 | 3×3]\n])\n# block_matrix.shape = (5, 5)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "176",
   "q": "How do you implement K-Means clustering with NumPy from scratch?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def kmeans(X: np.ndarray, k: int, max_iter: int = 100, rng=None) -> np.ndarray:\n    rng = rng or np.random.default_rng()\n    centroids = X[rng.choice(len(X), k, replace=False)]\n\n    for _ in range(max_iter):\n        # Assign\n        dists = np.linalg.norm(X[:, None] - centroids[None], axis=2)  # (n, k)\n        labels = np.argmin(dists, axis=1)\n\n        # Update\n        new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(k)])\n        if np.allclose(centroids, new_centroids): break\n        centroids = new_centroids\n\n    return labels, centroids"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "How do you implement softmax with numerical stability in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:\n    # Subtract max for numerical stability (equivalent mathematically)\n    x_max = x.max(axis=axis, keepdims=True)\n    exp_x = np.exp(x - x_max)\n    return exp_x / exp_x.sum(axis=axis, keepdims=True)\n\n# Without stability fix:\n# np.exp([1000, 1000]) → [inf, inf] → nan after division\n# With stability: np.exp([0, 0]) → [1, 1] → [0.5, 0.5] ✓"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "How do you compute attention mechanism in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def attention(Q, K, V, mask=None):\n    d_k = Q.shape[-1]\n    # Scaled dot-product attention\n    scores = Q @ K.T / np.sqrt(d_k)    # (seq_len, seq_len)\n    if mask is not None:\n        scores = np.where(mask, -1e9, scores)   # Mask future tokens\n    weights = softmax(scores, axis=-1)\n    return weights @ V                  # (seq_len, d_v)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "How do you implement PCA from scratch with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def pca(X: np.ndarray, n_components: int):\n    # Center the data\n    X_c = X - X.mean(axis=0)\n\n    # Covariance matrix\n    cov = X_c.T @ X_c / (len(X) - 1)\n\n    # Eigendecomposition (use eigh for symmetric matrices)\n    eigenvalues, eigenvectors = np.linalg.eigh(cov)\n\n    # Sort descending\n    idx = np.argsort(-eigenvalues)\n    eigenvectors = eigenvectors[:, idx]\n    eigenvalues = eigenvalues[idx]\n\n    # Project\n    components = eigenvectors[:, :n_components]\n    return X_c @ components, eigenvalues[:n_components], components"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "How do you implement gradient descent from scratch with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def linear_regression_gd(X, y, lr=0.01, epochs=1000):\n    n, d = X.shape\n    X_b = np.column_stack([np.ones(n), X])  # Add bias\n    theta = np.zeros(d + 1)\n\n    losses = []\n    for epoch in range(epochs):\n        y_pred = X_b @ theta\n        error = y_pred - y\n        gradient = X_b.T @ error / n          # dL/dθ\n        theta -= lr * gradient\n        loss = np.mean(error ** 2)\n        losses.append(loss)\n\n    return theta, losses"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "What is `np.linalg.matrix_power` for efficient matrix exponentiation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Compute A^n using fast exponentiation (O(log n) matrix multiplications)\nA = np.array([[1, 1], [1, 0]])   # Fibonacci recurrence matrix\nnp.linalg.matrix_power(A, 10)   # A^10\n\n# Also works for A^(-1) = A^{-n}: np.linalg.matrix_power(A, -1) = inv(A)\nnp.linalg.matrix_power(A, -2)   # (A^2)^{-1}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "What is `np.kron` (Kronecker product)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1, 0], [0, 1]])\nB = np.array([[1, 2], [3, 4]])\n\nnp.kron(A, B)   # Block matrix: A[i,j] * B\n# Used in quantum computing, signal processing, sparse matrix construction\n\n# Block diagonal construction:\nnp.kron(np.eye(3), B)  # 3 copies of B on diagonal"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "What is `np.tensordot` and when is it preferred over `matmul`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Generalize matrix multiplication to arbitrary tensor axes\nA = np.random.randn(3, 4, 5)\nB = np.random.randn(4, 5, 6)\n\n# Contract last 2 axes of A with first 2 axes of B\nresult = np.tensordot(A, B, axes=2)   # shape (3, 6)\n\n# Equivalent einsum\nnp.einsum(\"ijk,jkl->il\", A, B)\n\n# Use tensordot for N-way contractions; einsum for clarity"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "What is `np.cross` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Cross product of 3D vectors (or 2D — returns scalar z-component)\na = np.array([1, 0, 0])  # x-axis\nb = np.array([0, 1, 0])  # y-axis\n\nnp.cross(a, b)   # [0, 0, 1] — z-axis\n\n# Batch of vectors\nA = np.random.randn(100, 3)\nB = np.random.randn(100, 3)\nnp.cross(A, B)   # (100, 3) — 100 cross products in parallel"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "What is `np.linalg.tensorsolve`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Solve tensor equation: A x = b  where A is an N-dim tensor\n# More general than linalg.solve for multi-index problems\n\nA = np.random.randn(2, 3, 2, 3)  # Maps (2,3) → (2,3)-shaped tensors\nb = np.random.randn(2, 3)\nx = np.linalg.tensorsolve(A, b)"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
