/* ============================================================================
   INTERVIEW I1.2 — Operations & Math
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
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
   "text": "Operations & Math",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What are universal functions (ufuncs)?",
   "body": [
    {
     "t": "p",
     "text": "Ufuncs are NumPy functions that operate element-wise on ndarrays, implemented in C for speed: `np.sin`, `np.exp`, `np.log`, `np.sqrt`, `np.abs`, `np.add`, `np.maximum`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is broadcasting in NumPy?",
   "body": [
    {
     "t": "p",
     "text": "Broadcasting allows NumPy to perform operations on arrays of different shapes by implicitly expanding smaller arrays:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.ones((3, 4))   # shape (3, 4)\nb = np.array([1,2,3,4])  # shape (4,)\na + b  # b is broadcast to (3, 4) — shape (4,) → (1, 4) → (3, 4)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What are the broadcasting rules?",
   "body": [
    {
     "t": "ol",
     "items": [
      "Prepend 1s to the shape of the smaller array until ndim matches.",
      "Arrays with size 1 in a dimension are stretched to match the other.",
      "If neither is 1 and they differ, raise an error."
     ]
    },
    {
     "t": "p",
     "text": "Example: `(3, 1, 4)` + `(5, 4)` → `(3, 5, 4)` ✓"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the difference between `*` and `np.dot` / `@` for matrix operations?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`*` (or `np.multiply`): Element-wise multiplication.",
      "`np.dot(A, B)` or `A @ B`: Matrix multiplication (sum of products)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "A @ B   # Matrix mult — preferred Pythonic syntax\nA * B   # Element-wise (Hadamard product)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you compute matrix operations in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.dot(A, B)         # Matrix multiplication\nnp.linalg.inv(A)     # Matrix inverse\nnp.linalg.det(A)     # Determinant\nnp.linalg.eig(A)     # Eigenvalues and eigenvectors\nnp.linalg.svd(A)     # Singular value decomposition\nnp.linalg.norm(v)    # Vector/matrix norm\nA.T                  # Transpose"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How do you compute statistics in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.mean(a, axis=0)    # Column means\nnp.std(a, axis=1)     # Row std deviations\nnp.var(a)             # Variance\nnp.median(a)          # Median\nnp.percentile(a, 75)  # 75th percentile\nnp.cumsum(a)          # Cumulative sum\nnp.diff(a)            # Consecutive differences"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is axis in NumPy operations?",
   "body": [
    {
     "t": "p",
     "text": "`axis=0` applies operations along rows (across rows, result has one less row dimension). `axis=1` applies operations along columns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([[1,2],[3,4]])\na.sum(axis=0)   # [4, 6] — sum down columns\na.sum(axis=1)   # [3, 7] — sum across rows"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is `np.einsum`?",
   "body": [
    {
     "t": "p",
     "text": "Einstein summation convention — powerful notation for any tensor contraction:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.einsum(\"ij,jk->ik\", A, B)    # Matrix multiplication\nnp.einsum(\"ij->ji\", A)           # Transpose\nnp.einsum(\"ij->i\", A)            # Row sums\nnp.einsum(\"ii->\", A)             # Trace\nnp.einsum(\"ij,ij->\", A, B)      # Element-wise sum (total)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you compute outer and inner products?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.outer(a, b)    # Outer product — shape (m, n) from vectors of len m and n\nnp.inner(a, b)    # Inner product (dot product for 1D)\nnp.cross(a, b)    # Cross product (3D vectors)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is `np.clip`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.clip(a, a_min=0, a_max=1)   # All values clamped to [0, 1]\n# Implements ReLU:\nnp.clip(a, 0, None)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do you apply a function along an axis?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.apply_along_axis(func, axis=1, arr=a)  # Apply func to each row\n# For simple element-wise, prefer vectorized ufuncs over apply_along_axis"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is `np.vectorize`?",
   "body": [
    {
     "t": "p",
     "text": "Wraps a Python function to apply element-wise to arrays:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@np.vectorize\ndef my_func(x):\n    return x**2 if x > 0 else 0\n\nmy_func(np.array([-1, 2, -3, 4]))"
    },
    {
     "t": "p",
     "text": "Note: `np.vectorize` is syntactic sugar — it still loops in Python. Not faster than a direct ufunc."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the difference between `np.sum` and `np.add.reduce`?",
   "body": [
    {
     "t": "p",
     "text": "`np.sum(a)` is equivalent to `np.add.reduce(a)`. Ufuncs expose `.reduce`, `.accumulate`, `.outer` methods. `accumulate` gives running sum: `np.add.accumulate([1,2,3])` → `[1, 3, 6]`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How do you compute a histogram?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "counts, bin_edges = np.histogram(data, bins=20)\ncounts, bin_edges = np.histogram(data, bins=np.linspace(0, 100, 21))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is `np.digitize`?",
   "body": [
    {
     "t": "p",
     "text": "Returns the bin index for each element:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "bins = np.array([0, 25, 50, 75, 100])\nnp.digitize([10, 45, 80], bins)   # [1, 2, 4]"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
