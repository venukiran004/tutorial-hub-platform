/* ============================================================================
   INTERVIEW: DATA & ML i6.1 — NumPy
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i6.1",
 "lede": "**43 interview questions on numpy**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 43 questions on numpy without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up is where it shows.",
      "Coding problems live in the **Coding Practice** course — these are the ones you answer in conversation."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is an `ndarray` and how does it differ from a Python list?",
   "terms": [
    "Answer",
    "homogeneous",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "An `ndarray` is NumPy's N-dimensional, **homogeneous**, fixed-size array stored in one contiguous block of memory."
    },
    {
     "t": "table",
     "head": [
      "",
      "`ndarray`",
      "Python `list`"
     ],
     "rows": [
      [
       "Element types",
       "One dtype (homogeneous)",
       "Heterogeneous"
      ],
      [
       "Memory",
       "Contiguous values",
       "Pointers to objects"
      ],
      [
       "Operations",
       "Vectorized in C",
       "Python loops"
      ],
      [
       "Multidimensional",
       "Native (shape/strides)",
       "Nested lists"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\na = np.array([1, 2, 3])\na * 2          # [2 4 6] — vectorized, no loop\n[1, 2, 3] * 2  # [1, 2, 3, 1, 2, 3] — list repetition!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The contiguous, homogeneous layout is what enables 10–1000× speedups over pure-Python loops."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Why is NumPy faster than pure Python?",
   "terms": [
    "Answer",
    "Compiled C",
    "No per-element overhead",
    "SIMD",
    "Cache locality",
    "BLAS/LAPACK"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Compiled C**vectorized operations execute in C, not the Python interpreter.",
      "**No per-element overhead**one C loop replaces millions of Python bytecode steps.",
      "**SIMD**modern CPUs apply one instruction to multiple values at once.",
      "**Cache locality**contiguous memory keeps the CPU cache hot.",
      "**BLAS/LAPACK**linear algebra calls highly optimized, cache-blocked libraries."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = np.arange(1_000_000.0)\nnp.sum(data)   # ~100x faster than the built-in sum(data)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Express computation as whole-array operations; the speed comes from staying out of the Python loop."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is `dtype` and why does it matter?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The `dtype` defines the element type (`int32`, `float64`, `bool`, …), which controls memory usage, precision, and overflow behaviour."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.array([1, 2, 3], dtype=np.float32).nbytes   # 12 (3 × 4 bytes)\nnp.array([1, 2, 3], dtype=np.float64).nbytes   # 24 (3 × 8 bytes)\nnp.array([127], dtype=np.int8) + 1             # array([-128]) — overflow!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Choose the smallest dtype that fits — `float32` halves memory vs `float64` and is usually precise enough for ML, but watch for silent integer overflow."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Explain `shape`, `ndim`, `size`, `strides`, and `nbytes`.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.zeros((3, 4, 5))\na.shape    # (3, 4, 5) — size per dimension\na.ndim     # 3         — number of dimensions\na.size     # 60        — total elements\na.nbytes   # 480       — total bytes (60 × 8)\na.strides  # (160, 40, 8) — bytes to step in each dimension",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `strides` reveal the memory layout — they map an N-D index to a position in the flat buffer."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between a view and a copy? When does each occur?",
   "terms": [
    "Answer",
    "view",
    "copy",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **view** shares memory with the original (mutations propagate); a **copy** is independent."
    },
    {
     "t": "table",
     "head": [
      "Operation",
      "Result"
     ],
     "rows": [
      [
       "Basic slicing (`a[1:5]`, `a[:, 0]`)",
       "**View**"
      ],
      [
       "Fancy indexing (`a[[0, 2]]`)",
       "**Copy**"
      ],
      [
       "Boolean indexing (`a[a > 0]`)",
       "**Copy**"
      ],
      [
       "`.ravel()`",
       "View when possible"
      ],
      [
       "`.flatten()`",
       "Always a copy"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(6)\nv = a[::2]; v[0] = 99    # changes a[0] too!\nc = a[::2].copy(); c[0] = -1   # a unchanged\nprint(v.base is a)       # True if v is a view of a",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Slicing gives a view — call `.copy()` when you need independence to avoid accidental mutation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between `ravel()` and `flatten()`?",
   "terms": [
    "Answer",
    "view",
    "always",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both flatten to 1D. `ravel()` returns a **view** when possible (no copy, faster); `flatten()` **always** returns a copy."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "m = np.arange(6).reshape(2, 3)\nm.ravel()[0] = 99    # may modify m\nm.flatten()[0] = 99  # never modifies m",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `ravel()` for performance, `flatten()` when you need a safe independent copy."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Explain broadcasting and give an example where it fails.",
   "terms": [
    "Answer",
    "right-to-left",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Broadcasting performs operations on arrays of different shapes by virtually stretching size-1 dimensions. Compare shapes **right-to-left**: dimensions are compatible if equal or one is 1."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.ones((3, 4)) + np.array([1, 2, 3, 4])   # (3,4)+(4,) -> (3,4)  OK\nnp.ones((3, 4)) + np.array([1, 2, 3])      # (3,4)+(3,) -> ERROR",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The failure: right-aligned dimensions are `4` and `3`, neither is 1 → `ValueError`. Fix by reshaping `(3,)` to `(3, 1)`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.ones((3, 4)) + np.array([1, 2, 3])[:, None]   # (3,4)+(3,1) -> (3,4)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** No data is copied during broadcasting — it is implemented with stride tricks, making it both fast and memory-efficient."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What does the `axis` parameter mean in aggregations?",
   "terms": [
    "Answer",
    "collapsed",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`axis` is the dimension that gets **collapsed**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([[1, 2, 3], [4, 5, 6]])\na.sum(axis=0)   # [5 7 9]  — collapse rows  -> per-column\na.sum(axis=1)   # [6 15]   — collapse cols  -> per-row\na.sum()         # 21       — collapse all",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `axis=0` → result is per-column; `axis=1` → result is per-row. Use `keepdims=True` to retain dimensions for broadcasting."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What are universal functions (ufuncs)?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Ufuncs are C-implemented functions that operate element-wise with broadcasting support, e.g. `np.exp`, `np.sqrt`, `np.add`, `np.maximum`. They also expose `.reduce`, `.accumulate`, and `.outer`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.sqrt([1, 4, 9])           # [1. 2. 3.]\nnp.add.reduce([1, 2, 3])     # 6   (== np.sum)\nnp.add.accumulate([1, 2, 3]) # [1 3 6]\nnp.multiply.outer([1, 2], [3, 4])  # [[3 4] [6 8]]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Ufuncs are the building blocks of vectorization — they run the loop in C."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the difference between `*`, `np.dot`, `np.matmul`, and `@`?",
   "terms": [
    "Answer",
    "element-wise",
    "matrix",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`*` (or `np.multiply`): **element-wise** (Hadamard) product.",
      "`np.dot` / `np.matmul` / `@`: **matrix** multiplication."
     ]
    },
    {
     "t": "p",
     "text": "`@` and `np.matmul` are equivalent and the preferred Pythonic syntax; they support batched (3D+) matmul and reject scalar operands. `np.dot` has slightly different N-D semantics."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1, 2], [3, 4]]); B = np.array([[5, 6], [7, 8]])\nA * B    # [[5 12] [21 32]] — element-wise\nA @ B    # [[19 22] [43 50]] — matrix product",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer `@` for clarity in matrix products."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is fancy indexing and how does it differ from basic indexing?",
   "terms": [
    "Answer",
    "returns a copy",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Fancy indexing uses arrays of integer indices and **returns a copy**; basic slicing returns a view."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([10, 20, 30, 40, 50])\na[[0, 2, 4]]              # [10 30 50] — copy\n\nm = np.arange(9).reshape(3, 3)\nm[[0, 1, 2], [2, 0, 1]]  # [2 3 7] — elements (0,2),(1,0),(2,1)\nm[np.ix_([0, 2], [0, 2])]  # 2×2 submatrix (outer/cross indexing)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Fancy indexing selects arbitrary elements but always copies, so it cannot be used as an in-place view."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is boolean indexing?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Selecting elements with a boolean mask of the same shape; returns a copy of the matching elements (flattened)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, -2, 3, -4, 5])\na[a > 0]        # [1 3 5]\na[a < 0] = 0    # in-place: [1 0 3 0 5]\nm = np.arange(9).reshape(3, 3)\nm[np.any(m < 0, axis=1)]   # rows containing any negative",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Boolean indexing is the idiomatic way to filter; combine with `&`, `|`, `~` (parenthesized) for multiple conditions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What does `np.where` do, and how does `np.select` extend it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.where(cond, x, y)` is a vectorized ternary; `np.where(cond)` alone returns indices of `True`. `np.select` handles many conditions like if/elif/else."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([-2, 3, -4, 5])\nnp.where(a > 0, a, 0)    # [0 3 0 5]\nnp.where(a > 0)          # (array([1, 3]),)\n\ns = np.array([30, 75, 90])\nnp.select([s >= 90, s >= 70], ['A', 'B'], default='C')  # ['C' 'B' 'A']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `np.where` for one condition, `np.select` for a prioritized chain — both vectorized."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `np.newaxis` / `np.expand_dims` used for?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "They add a size-1 dimension, often to make shapes broadcast."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])        # (3,)\na[:, np.newaxis].shape         # (3, 1) — column vector\na[np.newaxis, :].shape         # (1, 3) — row vector\na[:, None] * a[None, :]        # 3×3 outer product via broadcasting",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Inserting axes is the standard trick for turning vectors into broadcastable matrices."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `np.einsum` and when would you use it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Einstein summation gives compact notation for tensor contractions, often fusing operations and avoiding temporaries."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.einsum('ij,jk->ik', A, B)        # matrix multiply\nnp.einsum('bij,bjk->bik', A, B)     # batched matmul\nnp.einsum('ii->', M)                # trace\nnp.einsum('i,j->ij', a, b)          # outer product\nnp.einsum('ij,jk,kl->il', A, B, C, optimize=True)  # optimal order",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use it for complex multi-tensor operations (e.g. attention); `optimize=True` finds the cheapest contraction path."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Explain C-order vs F-order (memory layout). Why does it matter?",
   "terms": [
    "Answer",
    "C-order (row-major, default)",
    "F-order (column-major)",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**C-order (row-major, default):** rows are contiguous; fast for row-wise access.",
      "**F-order (column-major):** columns are contiguous; what BLAS/LAPACK expect."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([[1, 2, 3], [4, 5, 6]])           # C: 1 2 3 4 5 6\na_f = np.asfortranarray(a)                     # F: 1 4 2 5 3 6\na.T.flags['C_CONTIGUOUS']                      # False — transpose breaks contiguity\nnp.ascontiguousarray(a.T)                      # force C-contiguous copy",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Accessing along the contiguous axis is faster (cache locality); non-contiguous arrays passed to BLAS trigger a hidden copy."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What are strides, and how do they enable zero-copy tricks?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Strides are the byte steps per dimension. Manipulating strides creates new views over the same buffer without copying."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.zeros((3, 4)); a.strides   # (32, 8)\n\nfrom numpy.lib.stride_tricks import sliding_window_view\nsliding_window_view(np.arange(6), 3)\n# [[0 1 2] [1 2 3] [2 3 4] [3 4 5]] — read-only, zero-copy",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Stride tricks power reshaping, transposes, broadcasting, and sliding windows. Use `sliding_window_view`/`broadcast_to`; the low-level `as_strided` skips bounds checks and is dangerous."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "`np.random.seed` vs `np.random.default_rng(seed)` — which should you use?",
   "terms": [
    "Answer",
    "global",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.random.seed` mutates a single **global** RNG (stateful, not thread/process safe). `default_rng(seed)` returns an independent `Generator` object — the modern, reproducible, parallel-safe API."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(42)\nrng.normal(0, 1, 5)\nrng.integers(0, 10, 5)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer `default_rng` for new code, especially in multiprocessing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you handle `nan` and `inf` values?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1.0, np.nan, np.inf])\nnp.isnan(a)        # [F T F]\nnp.isinf(a)        # [F F T]\nnp.isfinite(a)     # [T F F]\nnp.nan_to_num(a, nan=0.0, posinf=1e10)   # replace\nnp.nanmean(a)      # NaN-skipping mean",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A single NaN poisons normal aggregations — use the `nan*` variants (`nanmean`, `nansum`) or clean first."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How would you write a numerically stable softmax?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Subtract the row max before exponentiating to prevent overflow."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def softmax(x, axis=-1):\n    x = x - np.max(x, axis=axis, keepdims=True)\n    e = np.exp(x)\n    return e / e.sum(axis=axis, keepdims=True)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Subtracting the max does not change the result mathematically but keeps `exp` from overflowing — a standard numerical-stability trick (see also `np.log1p`, `np.expm1`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you compute pairwise Euclidean distances efficiently?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use the identity ||a−b||² = ||a||² + ||b||² − 2a·b to avoid a Python loop."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def pairwise(A, B):\n    A2 = (A ** 2).sum(1)[:, None]\n    B2 = (B ** 2).sum(1)[None, :]\n    return np.sqrt(np.maximum(A2 + B2 - 2 * A @ B.T, 0))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Reformulating with matrix products turns an O(n²) Python loop into one BLAS call; `np.maximum(..., 0)` guards against tiny negative values from float error."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the difference between `np.sum` and Python's built-in `sum` on an array?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.sum` runs a vectorized C reduction (SIMD, pairwise summation for accuracy); `sum()` iterates element by element in Python."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.arange(1_000_000.0)\nnp.sum(arr)   # ~1 ms\nsum(arr)      # ~100 ms (≈100× slower)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always use `np.sum`/`arr.sum()` on ndarrays. NumPy's pairwise summation is also more numerically stable than naive sequential addition."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Is `np.vectorize` a performance optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "No. `np.vectorize` only adds broadcasting/convenience around a scalar Python function — it still loops in Python."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@np.vectorize\ndef f(x): return x ** 2 if x > 0 else 0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** For real speed, express the logic with ufuncs/`np.where`, or JIT-compile a loop with `numba.njit`. `np.vectorize` is for convenience only."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you reshape an array, and what are the constraints?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(12)\na.reshape(3, 4)\na.reshape(3, -1)   # -1 infers 4\na.reshape(-1, 1)   # column vector",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The total element count must be preserved; reshaping returns a view when the data can stay contiguous, otherwise a copy. `-1` lets NumPy infer one dimension."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** You can't reshape 12 elements into `(5, 2)`; use `-1` to avoid hard-coding sizes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you stack and concatenate arrays?",
   "terms": [
    "Answer",
    "Key takeaway",
    "existing",
    "new"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a, b = np.array([1, 2, 3]), np.array([4, 5, 6])\nnp.concatenate([a, b])      # along existing axis -> [1..6]\nnp.vstack([a, b])           # rows -> [[1 2 3] [4 5 6]]\nnp.hstack([a, b])           # cols (1D) -> [1..6]\nnp.column_stack([a, b])     # [[1 4] [2 5] [3 6]]\nnp.stack([a, b], axis=0)    # NEW axis -> shape (2, 3)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `concatenate`/`vstack`/`hstack` join along **existing** axes; `stack` creates a **new** axis."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How do you solve a linear system Ax = b?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = np.linalg.solve(A, b)                 # square systems\nx = np.linalg.lstsq(A, b, rcond=None)[0]  # over/under-determined (regression)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `solve`, not `inv(A) @ b` — it is faster and more numerically stable. Use `lstsq` for non-square systems."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is SVD and why is it important in ML?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "SVD factorizes any matrix as A = U·Σ·Vᵀ (U, V orthogonal; Σ diagonal singular values)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "U, S, Vt = np.linalg.svd(A, full_matrices=False)\nA_k = U[:, :k] @ np.diag(S[:k]) @ Vt[:k]   # rank-k approximation",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** SVD underpins PCA, low-rank/image compression, recommender systems, and pseudo-inverses."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is `np.linalg.eig` vs `np.linalg.eigh`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both compute eigenvalues/vectors. `eig` is for general matrices; `eigh` is for symmetric/Hermitian matrices — faster, more stable, and returns sorted real eigenvalues."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "vals, vecs = np.linalg.eigh(np.cov(X.T))   # covariance is symmetric",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `eigh` for covariance/Gram matrices (symmetric) to gain stability and speed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you broadcast to compute group/segment sums quickly?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "For integer keys, `np.bincount` with weights does a one-shot group-sum; for general reductions, `np.add.reduceat` works on segments."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "keys = np.array([0, 1, 1, 2, 2, 2])\nvals = np.array([5, 1, 2, 3, 4, 5.])\nnp.bincount(keys, weights=vals)   # [5. 3. 12.] — sum per key\n\nnp.add.reduceat(np.arange(6), [0, 2, 4])  # segment sums [1 5 9]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `np.bincount(keys, weights=...)` is a very fast integer group-by sum."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What are `np.argpartition` and `np.argsort`? When prefer one?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.argsort` fully sorts (O(n log n)); `np.argpartition` only guarantees the k smallest/largest are positioned (O(n))."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "dists = np.array([5, 2, 8, 1, 9, 3])\nnp.argpartition(dists, 2)[:2]   # indices of 2 smallest (unordered) — kNN\nnp.argsort(dists)[:2]           # same but fully sorted, slower",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** For top-k / k-nearest-neighbors where order within the top-k doesn't matter, `argpartition` is much faster."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do you create a one-hot encoding with NumPy?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "labels = np.array([0, 2, 1, 3])\nonehot = np.eye(4)[labels]\n# or, in place:\noh = np.zeros((len(labels), 4)); oh[np.arange(len(labels)), labels] = 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Indexing the identity matrix by the label array is the cleanest one-hot trick."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is the difference between `np.copy`, assignment, and a view in practice?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "b = a            # same object — both names point to one array\nv = a[1:]        # view — shares a's buffer\nc = a.copy()     # independent deep copy",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Modifying `b` or `v` changes `a`; modifying `c` does not."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Plain assignment never copies; slicing makes a view; only `.copy()` (or fancy/boolean indexing as a side effect) yields independent data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How do you count elements satisfying a condition?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 6, 3, 8, 2])\nnp.sum(a > 5)          # 2 — True counts as 1\nnp.count_nonzero(a > 5)  # 2\nnp.mean(a > 5)         # 0.4 — fraction satisfying",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Summing a boolean mask is the idiomatic count; `mean` gives the proportion."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is `np.clip` and how does it relate to `np.maximum`/`np.minimum`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.clip(a, lo, hi)` bounds values to `[lo, hi]`; it equals `np.minimum(np.maximum(a, lo), hi)`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.clip([-5, 3, 20], 0, 10)   # [0 3 10]\nnp.maximum([-5, 3], 0)        # [0 3] — ReLU",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `clip` for two-sided bounds (gradient clipping, winsorizing), `maximum`/`minimum` for one-sided."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How would you reduce the memory footprint of a large NumPy array?",
   "terms": [
    "Answer",
    "Downcast dtype",
    "Use views",
    "np.memmap",
    "Boolean/sparse"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Downcast dtype**`float64`→`float32`, `int64`→`int16` when ranges allow.",
      "**Use views** instead of copies (slicing, `broadcast_to`).",
      "**`np.memmap`** for arrays larger than RAM (lazy disk-backed access).",
      "**Boolean/sparse** representations for mostly-zero data (via `scipy.sparse`)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "big = big.astype(np.float32)   # half the memory\nmm = np.memmap('x.bin', dtype='float32', mode='r', shape=(10**7,))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Right-sizing the dtype is the biggest, easiest win; `memmap` handles out-of-core data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What are structured (record) arrays?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A structured array has a compound `dtype` with named fields of possibly different types — like a lightweight table in a single ndarray."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "dt = np.dtype([('name', 'U20'), ('age', np.int32), ('salary', np.float64)])\nemp = np.array([('Alice', 30, 75000.), ('Bob', 25, 65000.)], dtype=dt)\nemp['salary'].mean()            # access by field name\nnp.sort(emp, order='age')       # sort by a field",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Useful for heterogeneous fixed-schema records without pulling in Pandas; access fields by name and sort with `order=`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is a masked array (`np.ma`)?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A masked array pairs data with a boolean mask so that flagged (\"missing\"/invalid) entries are skipped by reductions — without deleting them."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = np.array([1, -999, 3, -999, 5])\nm = np.ma.masked_equal(data, -999)\nm.mean()                        # ignores the masked -999 sentinels",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Masked arrays give NaN-like skipping behaviour for integer data and sentinel values, where `nanmean` (float-only) cannot help."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How do you do an FFT and read its output?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.fft.fft` returns the complex spectrum; `fftfreq` gives the matching frequency bins; magnitude is `np.abs`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "spec = np.fft.fft(signal)\nfreqs = np.fft.fftfreq(len(signal), d=1/sample_rate)\nmag = np.abs(spec)\nnp.fft.rfft(signal)             # real-input variant (half the spectrum)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `rfft`/`rfftfreq` for real signals; the peak of `|fft|` over positive frequencies identifies dominant components."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What's the difference between `np.convolve`, `np.correlate`, and the `'valid'/'same'/'full'` modes?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.convolve(a, v)` slides a flipped kernel over the signal; `np.correlate` does the same without flipping. The `mode` controls output length:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.convolve([1,2,3,4,5], [1,0,-1], mode='valid')  # no padding -> length n-k+1\n# 'same' -> length of input; 'full' (default) -> n+k-1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A moving average is `np.convolve(x, np.ones(w)/w, mode='valid')`; `'same'` keeps alignment with the input, `'valid'` avoids edge effects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How do you build a coordinate grid to evaluate a 2D function?",
   "terms": [
    "Answer",
    "2 + Y",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`np.meshgrid` returns full coordinate matrices; `np.ogrid` returns broadcastable open grids (less memory)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "X, Y = np.meshgrid(np.linspace(-5, 5, 100), np.linspace(-5, 5, 100))\nZ = np.sin(np.sqrt(X**2 + Y**2))      # full grids\ny, x = np.ogrid[:100, :100]            # open grids, broadcast on use",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `meshgrid` when you need explicit grids (e.g. decision-boundary plotting); `ogrid`/`mgrid` for memory-efficient broadcasting."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How do you compute Gini impurity and entropy with NumPy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both are functions of class probabilities obtained from `np.unique(..., return_counts=True)`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def gini(labels):\n    _, c = np.unique(labels, return_counts=True); p = c / len(labels)\n    return 1 - np.sum(p ** 2)\n\ndef entropy(labels):\n    _, c = np.unique(labels, return_counts=True); p = c / len(labels)\n    return -np.sum(p * np.log2(p + 1e-10))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** These are the split criteria for decision trees — Gini is 0 for a pure node and 0.5 for a balanced binary split; entropy maxes at `log2(n_classes)`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Why subtract the max in softmax and clip the input to sigmoid?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both prevent overflow in `np.exp`. Softmax is shift-invariant, so subtracting the row max is mathematically free but keeps exponents small. Sigmoid clips the input range so `exp(-x)` never overflows."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def sigmoid(x): return 1 / (1 + np.exp(-np.clip(x, -500, 500)))\ndef softmax(x, axis=-1):\n    x = x - x.max(axis, keepdims=True)\n    e = np.exp(x); return e / e.sum(axis, keepdims=True)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Numerical-stability shifts (max subtraction, clipping, `log1p`/`expm1`) leave the math unchanged while avoiding `inf`/`nan`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "How do Xavier and He initialization differ?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both scale initial weights by fan-in/fan-out to keep activation variance stable. Xavier (Glorot) targets tanh/sigmoid; He targets ReLU (uses a larger variance to compensate for the half-rectified output)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "xavier = np.random.uniform(-np.sqrt(6/(fi+fo)), np.sqrt(6/(fi+fo)), (fi, fo))\nhe     = np.random.randn(fi, fo) * np.sqrt(2/fi)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Match the init to the activation — He for ReLU-family, Xavier for symmetric saturating activations."
    }
   ]
  }
 ],
 "takeaways": []
});
