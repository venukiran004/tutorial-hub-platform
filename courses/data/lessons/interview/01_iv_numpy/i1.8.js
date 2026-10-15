/* ============================================================================
   INTERVIEW I1.8 — Broadcasting & Vectorization
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.8",
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
   "text": "Broadcasting & Vectorization",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What are the full broadcasting rules in NumPy?",
   "body": [
    {
     "t": "p",
     "text": "Arrays are broadcast together if for each dimension (from right):"
    },
    {
     "t": "ol",
     "items": [
      "Dimensions are equal, OR",
      "One of them is 1 (it's \"stretched\" to match the other)."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "(3, 4, 5) + (4, 5) → OK: right-align, compatible\n(3, 4, 5) + (4, 1) → OK: dim 1 stretched to 5\n(3, 4, 5) + (3, 1, 5) → OK: middle dims: 4 vs 1, stretch\n(3, 4, 5) + (3, 3, 5) → ERROR: 4 ≠ 3 and neither is 1"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "How do you manually add broadcast dimensions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])          # shape (3,)\nb = np.array([[1], [2], [3]])    # shape (3, 1)\nresult = a + b                   # shape (3, 3) — outer-product-like addition\n\n# Explicit dimension insertion:\na[np.newaxis, :]    # (1, 3)\na[:, np.newaxis]    # (3, 1)\na[None]             # Same as a[np.newaxis, :] — (1, 3)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is `np.einsum` and how does it replace multiple operations?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Matrix multiplication: ij,jk→ik\nnp.einsum(\"ij,jk->ik\", A, B)     # Same as A @ B\n\n# Batched matrix multiplication: bij,bjk→bik\nnp.einsum(\"bij,bjk->bik\", A_batch, B_batch)  # @ on batch dim\n\n# Outer product: i,j→ij\nnp.einsum(\"i,j->ij\", a, b)       # np.outer(a, b)\n\n# Trace: ii→ (no output subscript)\nnp.einsum(\"ii->\", matrix)        # np.trace(matrix)\n\n# Weighted sum: ij,ij→\nnp.einsum(\"ij,ij->\", A, A)       # Frobenius norm squared"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is the performance impact of `optimize` in `np.einsum`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# optimize=True: Find optimal contraction order for multi-tensor einsum\n# Critical for 3+ tensor contractions\nresult = np.einsum(\"ij,jk,kl->il\", A, B, C, optimize=True)\n\n# Without optimize: left-to-right, possibly O(n^5)\n# With optimize: finds O(n^3) path like (A@B)@C\n# Cost: path planning, which is cached after first call"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "How do you implement a fast outer product with broadcasting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\n\n# Method 1: np.outer\nnp.outer(a, b)\n\n# Method 2: broadcasting (works for higher-dims)\na[:, np.newaxis] * b[np.newaxis, :]\n\n# Method 3: einsum\nnp.einsum(\"i,j->ij\", a, b)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "126",
   "q": "What is `np.vectorize` and when should you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def scalar_func(x, y):\n    return x**2 + y if x > 0 else y\n\nvec_func = np.vectorize(scalar_func)\nvec_func(np.array([1, -1, 2]), np.array([3, 3, 3]))  # [4, 3, 7]\n\n# WARNING: np.vectorize is NOT a performance optimization — it's still a Python loop\n# It only adds broadcasting support to scalar functions\n# Use Numba @njit for actual speedup"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is `np.frompyfunc` and how does it differ from `np.vectorize`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# frompyfunc: Like vectorize but always returns object dtype\nadd2 = np.frompyfunc(lambda x, y: x + y, nin=2, nout=1)\nresult = add2(np.array([1, 2, 3]), np.array([10, 20, 30]))\nresult.astype(int)   # [11, 22, 33]\n\n# vectorize: Wraps frompyfunc with dtype inference\n# frompyfunc: Lower-level, slightly faster"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is array contiguity and how does it affect performance?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# C-contiguous: rows stored sequentially in memory (row-major, default)\narr_c = np.array([[1,2,3],[4,5,6]], order=\"C\")\narr_c.flags[\"C_CONTIGUOUS\"]   # True\n\n# F-contiguous: columns stored sequentially (FORTRAN/column-major)\narr_f = np.array([[1,2,3],[4,5,6]], order=\"F\")\narr_f.flags[\"F_CONTIGUOUS\"]   # True\n\n# Non-contiguous (e.g., transposed C array)\narr_t = arr_c.T               # View — NOT C-contiguous\n# Make contiguous:\nnp.ascontiguousarray(arr_t)   # Forces C-contiguous copy"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "How do memory-contiguous arrays affect BLAS/vectorized performance?",
   "body": [
    {
     "t": "p",
     "text": "BLAS routines (used by NumPy for matrix operations) require contiguous arrays. When you pass non-contiguous arrays, NumPy silently makes a copy first. For performance-critical loops: always ensure arrays are C-contiguous before passing to numerical routines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is `np.lib.stride_tricks.as_strided`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from numpy.lib.stride_tricks import as_strided\n\narr = np.array([1, 2, 3, 4, 5, 6])\n\n# Create rolling windows via stride tricks\nwindow_size = 3\nresult = as_strided(arr,\n    shape=(len(arr) - window_size + 1, window_size),\n    strides=(arr.strides[0], arr.strides[0]))\n# [[1,2,3], [2,3,4], [3,4,5], [4,5,6]]\n# ZERO-COPY: shares memory with arr\n# Dangerous if written to — prefer sliding_window_view"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is `np.lib.stride_tricks.sliding_window_view`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from numpy.lib.stride_tricks import sliding_window_view\n\n# Safe alternative to as_strided for rolling windows\nwindows = sliding_window_view(arr, window_shape=3)  # Read-only view\n# windows.shape = (len(arr)-2, 3)\n\n# 2D sliding window (for image patches)\npatches = sliding_window_view(image, window_shape=(8, 8))\n# patches.shape = (H-7, W-7, 8, 8)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is `np.broadcast_to` vs copying?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, 2, 3])\n\n# broadcast_to: Returns a READ-ONLY view with expanded shape\nexpanded = np.broadcast_to(arr, (3, 3))  # No memory allocated for new rows\n# expanded.shape = (3, 3), but stored as 1 row\n\n# Modify → make explicit copy first\nwritable = expanded.copy()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is ufunc accumulate and reduceat?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, 2, 3, 4, 5])\n\n# accumulate: Running/cumulative operation\nnp.add.accumulate(arr)      # [1, 3, 6, 10, 15] — cumsum\nnp.multiply.accumulate(arr) # [1, 2, 6, 24, 120] — cumprod\n\n# reduceat: Reduce over segments\nindices = [0, 2, 4]   # Segment boundaries\nnp.add.reduceat(arr, indices)  # Sum of [0:2], [2:4], [4:] = [3, 7, 5]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is `np.ufunc.outer`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Compute outer product with any ufunc\nnp.multiply.outer([1,2,3], [4,5,6])  # 3x3 matrix of products = np.outer(...)\nnp.add.outer([0,1,2], [0,1,2])       # 3x3 addition table\nnp.equal.outer([1,2,3], [1,2,3])     # 3x3 equality matrix (identity-like)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is the difference between `np.sum` and Python's `sum` for arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import timeit\narr = np.arange(1_000_000, dtype=np.float64)\n\n# np.sum: C-level SIMD vectorized, single-precision accumulator for speed\n# sum(): Python level, slow, doesn't benefit from numpy\ntimeit.timeit(lambda: np.sum(arr), number=1000)   # ~1ms\ntimeit.timeit(lambda: sum(arr), number=1000)      # ~100ms (100x slower)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is `np.frompyfunc` for creating custom ufuncs?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create a ufunc from a Python function\nadd_with_log = np.frompyfunc(lambda x, y: x + y, 2, 1)\n# Supports broadcasting and element-wise application\n\n# For full ufunc with C performance, use Cython or ctypes with np.frompyfunc/CFFI"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is `np.bincount` and when is it faster than `Counter`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([0, 1, 1, 2, 0, 1, 3, 0, 2])\n\n# Count occurrences of each non-negative integer\nnp.bincount(arr)          # [3, 3, 2, 1] — index = value, content = count\n\n# Weighted version (like groupby sum in one operation)\nweights = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0])\nnp.bincount(arr, weights=weights)  # Sum of weights for each index\n\n# Much faster than Counter or pd.value_counts for integer arrays"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is `np.histogram` and `np.histogram2d`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "counts, bin_edges = np.histogram(data, bins=20, range=(0, 100))\n# counts: frequencies, bin_edges: len(bins)+1 boundaries\n\n# 2D histogram (joint distribution)\nH, xedges, yedges = np.histogram2d(x, y, bins=50)\n\n# Normalized histogram (PDF estimate)\ncounts, edges = np.histogram(data, bins=50, density=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is `np.convolve` and `np.correlate`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# 1D convolution (signal processing, polynomial multiplication)\nsignal = np.array([1, 2, 1, 0, -1, 0, 1])\nkernel = np.array([0.25, 0.5, 0.25])  # Smoothing kernel\nsmoothed = np.convolve(signal, kernel, mode=\"same\")\n\n# Correlation (cross-correlation, template matching)\nnp.correlate(signal, template, mode=\"valid\")\n\n# For 2D: use scipy.ndimage.convolve for images"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is `np.fft.fft` and what is it used for in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Fast Fourier Transform — convert time/spatial domain to frequency domain\nx = np.linspace(0, 2*np.pi, 1000)\nsignal = np.sin(2*np.pi*5*x) + 0.5*np.sin(2*np.pi*20*x)  # 5Hz + 20Hz\n\nspectrum = np.fft.fft(signal)\nfreqs = np.fft.fftfreq(len(x), d=x[1]-x[0])\npower = np.abs(spectrum)**2\n\n# Inverse FFT\nreconstructed = np.fft.ifft(spectrum).real"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
