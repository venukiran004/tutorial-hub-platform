/* ============================================================================
   INTERVIEW I1.4 — Random & Probability · Performance
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
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
   "text": "Random & Probability · Performance",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the `np.random` module? Explain the Generator API.",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(seed=42)  # Modern Generator (recommended)\nrng.random((3, 4))        # Uniform [0, 1)\nrng.integers(0, 10, 5)   # Integer [0, 10)\nrng.normal(0, 1, 100)    # Normal distribution\nrng.shuffle(arr)          # In-place shuffle\nrng.choice(arr, size=5, replace=False)  # Sample without replacement"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the difference between `np.random.seed` and `default_rng(seed)`?",
   "body": [
    {
     "t": "p",
     "text": "`np.random.seed` sets the global random state (unsafe in multiprocessing; stateful singleton). `np.random.default_rng(seed)` creates an independent `Generator` object — thread-safe and reproducible in parallel scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How do you sample from common distributions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng.normal(loc=0, scale=1, size=1000)        # Gaussian\nrng.uniform(low=0, high=1, size=100)         # Uniform\nrng.binomial(n=10, p=0.5, size=100)         # Binomial\nrng.multinomial(n=10, pvals=[0.3,0.5,0.2])  # Multinomial\nrng.poisson(lam=5, size=100)               # Poisson\nrng.exponential(scale=2, size=100)         # Exponential"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you bootstrap a confidence interval using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "n_bootstrap = 10_000\nbootstrap_means = [\n    rng.choice(data, size=len(data), replace=True).mean()\n    for _ in range(n_bootstrap)\n]\nci_95 = np.percentile(bootstrap_means, [2.5, 97.5])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How do you implement softmax from scratch with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def softmax(x):\n    e_x = np.exp(x - np.max(x))  # Subtract max for numerical stability\n    return e_x / e_x.sum()\n\ndef softmax_batch(x):  # x shape (batch, classes)\n    e_x = np.exp(x - x.max(axis=1, keepdims=True))\n    return e_x / e_x.sum(axis=1, keepdims=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "51",
   "q": "Why is NumPy faster than Python loops?",
   "body": [
    {
     "t": "p",
     "text": "NumPy operations execute in compiled C/Fortran code. Vectorized operations avoid Python interpreter overhead, utilize CPU SIMD instructions, and benefit from memory locality (contiguous arrays)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is memory layout (C-order vs F-order) and why does it matter?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**C-order (row-major):** Last axis varies fastest. Efficient for row operations.",
      "**F-order (column-major, Fortran-order):** First axis varies fastest. Efficient for column operations."
     ]
    },
    {
     "t": "p",
     "text": "Many operations are faster on C-contiguous arrays. Check with `a.flags`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is `np.ascontiguousarray`?",
   "body": [
    {
     "t": "p",
     "text": "Ensures an array is stored in C-contiguous memory layout. Often needed before passing to C extensions or when performance is degraded by non-contiguous strides:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.ascontiguousarray(a.T)  # Transpose creates non-contiguous array"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What are strides in NumPy?",
   "body": [
    {
     "t": "p",
     "text": "Strides define how many bytes to step in each dimension to reach the next element:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.zeros((3, 4), dtype=np.float64)\na.strides  # (32, 8) — 32 bytes per row, 8 bytes per element"
    },
    {
     "t": "p",
     "text": "Clever stride tricks enable zero-copy reshaping (sliding windows, etc.)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "How do you create a sliding window view using strides?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from numpy.lib.stride_tricks import sliding_window_view\nwindows = sliding_window_view(arr, window_shape=7)\n# Each element of windows is a view of 7 consecutive elements — zero copy"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "When should you use `np.float32` vs `np.float64`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`float32`: Half the memory, faster on modern GPUs. Acceptable precision for ML model weights and activations.",
      "`float64`: Default; needed for scientific computing where precision matters (numerical integration, statistics)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is cache blocking / tiling and how does NumPy benefit from it?",
   "body": [
    {
     "t": "p",
     "text": "Matrix operations split large arrays into tiles that fit in CPU cache, reducing memory bandwidth bottlenecks. NumPy uses BLAS/LAPACK libraries that implement cache-aware algorithms automatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is `numexpr` and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "`numexpr` evaluates array expressions avoiding intermediate array allocation. Faster for large arrays with chained operations:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numexpr as ne\nresult = ne.evaluate(\"2 * a + b ** 2 - c\")  # Faster than: 2*a + b**2 - c"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is `numba` and how does it accelerate NumPy code?",
   "body": [
    {
     "t": "p",
     "text": "`numba` JIT-compiles Python functions to machine code using LLVM. Ideal for loops that cannot be vectorized with NumPy:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from numba import njit\n\n@njit\ndef fast_loop(arr):\n    result = 0.0\n    for x in arr:\n        result += x ** 2\n    return result"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between `np.sum` and Python's built-in `sum`?",
   "body": [
    {
     "t": "p",
     "text": "`np.sum(arr)` is ~10–100× faster than Python `sum(arr)` for ndarrays because it uses compiled C code. Python `sum` iterates through elements with Python overhead."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
