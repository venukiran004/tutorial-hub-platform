/* ============================================================================
   INTERVIEW I1.6 — Advanced Topics
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.6",
 "lede": "**30 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Topics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What are masked arrays in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "ma = np.ma.array(data, mask=(data < 0))  # Mask negative values\nma.mean()  # Ignores masked values"
    },
    {
     "t": "p",
     "text": "Useful for datasets with invalid/missing measurements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is `np.fft`?",
   "body": [
    {
     "t": "p",
     "text": "NumPy's Fast Fourier Transform implementation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "X_freq = np.fft.fft(signal)           # FFT\nfreqs = np.fft.fftfreq(len(signal), d=1/sample_rate)\nX_back = np.fft.ifft(X_freq)          # Inverse FFT"
    },
    {
     "t": "p",
     "text": "Used in signal processing, feature extraction (audio, vibration)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is `np.correlate` and `np.convolve`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.correlate(a, b, mode=\"full\")  # Cross-correlation\nnp.convolve(a, kernel, mode=\"same\")  # 1D convolution"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the difference between `np.linalg.norm` with different orders?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.linalg.norm(v, ord=1)    # L1 norm: sum of |elements|\nnp.linalg.norm(v, ord=2)    # L2 norm: Euclidean (default)\nnp.linalg.norm(v, ord=np.inf)  # L∞ norm: max |element|\nnp.linalg.norm(A, ord=\"fro\")   # Frobenius norm for matrices"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "How do you generate reproducible datasets for testing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "rng = np.random.default_rng(42)\nX = rng.normal(0, 1, (1000, 5))\ny = X @ np.array([1.5, -2, 0.5, 1, -0.5]) + rng.normal(0, 0.1, 1000)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "76",
   "q": "What is `np.testing`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.testing.assert_array_equal(a, b)           # Exact equality\nnp.testing.assert_allclose(a, b, rtol=1e-5)   # Numerical closeness\nnp.testing.assert_array_less(a, b)             # a < b element-wise"
    },
    {
     "t": "p",
     "text": "Essential for testing numerical algorithms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is `np.searchsorted`?",
   "body": [
    {
     "t": "p",
     "text": "Binary search to find insertion indices in a sorted array:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 3, 5, 7, 9])\nnp.searchsorted(a, 4)   # 2 — would go at index 2\nnp.searchsorted(a, [2, 6, 8])  # [1, 3, 4]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is `np.interp`?",
   "body": [
    {
     "t": "p",
     "text": "1D linear interpolation at new x points:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x_new = np.linspace(0, 10, 100)\ny_new = np.interp(x_new, x_known, y_known)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is `np.tensordot`?",
   "body": [
    {
     "t": "p",
     "text": "Generalized tensor contraction over specified axes — extends `dot` to ND arrays:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.tensordot(A, B, axes=([1,2], [0,1]))   # Contract A's axes 1,2 with B's 0,1"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is `np.pad`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.pad(a, pad_width=2, mode=\"constant\", constant_values=0)  # Zero-pad\nnp.pad(a, ((1,1),(2,2)), mode=\"reflect\")  # Reflect padding for convolutions"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you compute a covariance matrix?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "cov = np.cov(X.T)   # X shape (n_samples, n_features) → X.T shape (n_features, n_samples)\n# Result shape (n_features, n_features)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is `np.poly1d` and polynomial fitting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "coeffs = np.polyfit(x, y, deg=3)  # Fit degree-3 polynomial\np = np.poly1d(coeffs)             # Create callable polynomial\np(x_new)                          # Evaluate"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the relationship between NumPy and CuPy?",
   "body": [
    {
     "t": "p",
     "text": "CuPy is a NumPy-compatible library that runs on NVIDIA GPUs. Most NumPy code can be accelerated by replacing `import numpy as np` with `import cupy as np`. CuPy arrays live in GPU memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is `np.lib.stride_tricks.as_strided`?",
   "body": [
    {
     "t": "p",
     "text": "Low-level function to create arrays with arbitrary strides. Powerful but dangerous (no bounds checking). Used to create rolling window views, im2col for convolutions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from numpy.lib.stride_tricks import as_strided"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "How do you efficiently count array elements satisfying a condition?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.sum(a > 5)          # Count elements > 5 (sum of True = 1, False = 0)\nnp.count_nonzero(a)    # Count non-zero elements\nnp.mean(a > 5)         # Fraction of elements > 5"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is `np.choose`?",
   "body": [
    {
     "t": "p",
     "text": "Selects elements from multiple arrays based on an index array:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "choices = np.array([[0, 1, 2, 3], [10, 11, 12, 13], [20, 21, 22, 23]])\nidx = np.array([0, 2, 1, 2])\nnp.choose(idx, choices)  # [0, 21, 12, 23]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "How do you implement batch matrix multiplication?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# A shape (batch, m, k), B shape (batch, k, n)\nC = np.einsum(\"bmk,bkn->bmn\", A, B)\n# Or\nC = A @ B  # @ supports batched matmul for 3D+ arrays"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is structured broadcasting for feature engineering?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create polynomial features\nX = np.array([[1, 2], [3, 4]])\n# Outer product for all pairs of features:\ncombinations = X[:, :, np.newaxis] * X[:, np.newaxis, :]  # Shape (n, f, f)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How do you handle `inf` and `nan` values?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.isinf(a)           # Boolean mask for infinite values\nnp.isnan(a)           # Boolean mask for NaN\nnp.isfinite(a)        # True where neither inf nor nan\nnp.nan_to_num(a, nan=0, posinf=1e10, neginf=-1e10)  # Replace\nnp.nanmean(a)         # Statistics ignoring NaN"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is `np.piecewise`?",
   "body": [
    {
     "t": "p",
     "text": "Defines piecewise functions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = np.piecewise(\n    x,\n    [x < 0, x >= 0],\n    [lambda x: -x, lambda x: x]   # abs value\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "How do you compute precision-recall curve from scratch?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "thresholds = np.sort(scores)[::-1]\nprecisions, recalls = [], []\nfor t in thresholds:\n    preds = (scores >= t).astype(int)\n    tp = np.sum((preds == 1) & (y_true == 1))\n    fp = np.sum((preds == 1) & (y_true == 0))\n    fn = np.sum((preds == 0) & (y_true == 1))\n    precisions.append(tp / (tp + fp + 1e-8))\n    recalls.append(tp / (tp + fn + 1e-8))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is `np.argpartition`?",
   "body": [
    {
     "t": "p",
     "text": "Returns indices that would partition the array: elements before index k are the k smallest (unordered). Faster than full sort when you only need the k smallest:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "k = 5\ntop_k_idx = np.argpartition(distances, k)[:k]   # k nearest neighbors (unordered)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "How do you compute IoU (Intersection over Union) using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def iou(box1, box2):\n    x1 = max(box1[0], box2[0]); y1 = max(box1[1], box2[1])\n    x2 = min(box1[2], box2[2]); y2 = min(box1[3], box2[3])\n    intersection = max(0, x2 - x1) * max(0, y2 - y1)\n    area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])\n    area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])\n    return intersection / (area1 + area2 - intersection + 1e-8)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the difference between `np.random.choice` with and without replacement?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`replace=True` (default): Same element can be chosen multiple times. Used in bootstrap sampling.",
      "`replace=False`: Each element chosen at most once. Used in train/test split."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "How do you compute the correlation matrix and interpret it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "corr_matrix = np.corrcoef(X.T)  # Shape (n_features, n_features)\n# Values range [-1, 1]\n# corr > 0.8 → potential multicollinearity\n# corr ≈ 0 → features are independent"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is `np.block`?",
   "body": [
    {
     "t": "p",
     "text": "Assembles an ndarray from nested lists of blocks:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.block([[A, B], [C, D]])  # Assemble 2×2 block matrix"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "How do you generate a sparse random matrix efficiently?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# For very sparse random matrices, use scipy\nfrom scipy.sparse import random as sparse_random\nm = sparse_random(1000, 1000, density=0.01, format=\"csr\")  # 1% non-zero"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is `np.gradient`?",
   "body": [
    {
     "t": "p",
     "text": "Computes numerical gradient (derivatives) using central differences:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "dy_dx = np.gradient(y, x)   # dy/dx at each point"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "How do you vectorize a Python function that depends on two arrays simultaneously?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Broadcasting\nresult = f(a[:, np.newaxis], b[np.newaxis, :])  # All pairs\n\n# Method 2: Meshgrid\nA, B = np.meshgrid(a, b)\nresult = f(A, B)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What are the differences between NumPy, SciPy, and PyTorch tensors?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "NumPy",
      "SciPy",
      "PyTorch"
     ],
     "rows": [
      [
       "Core ops",
       "Array math",
       "Scientific algorithms",
       "DL + autograd"
      ],
      [
       "GPU",
       "❌ (need CuPy)",
       "❌",
       "✅ Native"
      ],
      [
       "Autograd",
       "❌",
       "❌",
       "✅"
      ],
      [
       "Sparse",
       "Limited",
       "Full",
       "Partial"
      ],
      [
       "Use case",
       "General arrays",
       "Statistics, optimization",
       "Deep learning"
      ]
     ]
    },
    {
     "t": "p",
     "text": "NumPy is the universal common currency — PyTorch and JAX tensors can be converted from/to NumPy arrays."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
