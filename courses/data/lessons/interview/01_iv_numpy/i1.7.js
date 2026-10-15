/* ============================================================================
   INTERVIEW I1.7 — Advanced Array Indexing
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.7",
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
   "text": "Advanced Array Indexing",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "What is boolean array indexing and how does it differ from integer indexing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Boolean indexing: select elements where condition is True\narr = np.array([1, -2, 3, -4, 5])\npositive = arr[arr > 0]           # [1, 3, 5]\narr[arr < 0] = 0                  # In-place modification: [1, 0, 3, 0, 5]\n\n# Integer indexing: select specific elements by index\narr[[0, 2, 4]]                    # [1, 3, 5]\n# Integer indexing returns a COPY; boolean indexing returns a COPY when result is 1D/non-contiguous"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "What is `np.where` and its ternary form?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# np.where(condition, x, y): element-wise ternary\narr = np.array([1, -2, 3, -4, 5])\nresult = np.where(arr > 0, arr, 0)     # [1, 0, 3, 0, 5] - Replace negatives with 0\nresult = np.where(arr > 0, 1, -1)      # [1, -1, 1, -1, 1] - Sign function\n\n# np.where(condition): returns indices of True elements (like np.nonzero)\nnp.where(arr > 0)         # (array([0, 2, 4]),)\n\n# Multi-condition\nnp.where((arr > 0) & (arr < 4), arr, 0)  # [1, 0, 3, 0, 0]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is `np.select` for multiple conditions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "conditions = [arr < 0, arr == 0, arr > 0]\nchoices = [-1, 0, 1]\n\nresult = np.select(conditions, choices, default=999)\n# Like a vectorized if/elif/else chain"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What is fancy indexing with 2D integer arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "matrix = np.array([[1,2,3],[4,5,6],[7,8,9]])\n\n# Select specific elements by row and column arrays\nrows = np.array([0, 1, 2])\ncols = np.array([2, 0, 1])\nmatrix[rows, cols]   # [3, 4, 8] - (0,2), (1,0), (2,1) elements\n\n# Outer indexing (all combinations)\nnp.ix_([0, 2], [0, 2])  # Creates open mesh for outer indexing\nmatrix[np.ix_([0, 2], [0, 2])]  # [[1,3],[7,9]] - 2x2 submatrix"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is `np.take` vs direct indexing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([10, 20, 30, 40, 50])\nindices = [1, 3, 4]\n\nnp.take(arr, indices)          # [20, 40, 50]\nnp.take(arr, indices, axis=0)  # Same for 1D\n\n# For 2D\nnp.take(matrix, [0, 2], axis=1)   # Take columns 0 and 2\n# Equivalent to matrix[:, [0, 2]]\n\n# np.take is useful in hot paths / Cython — slightly faster than fancy indexing"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is `np.put` and `np.putmask`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.arange(5)\nnp.put(arr, [1, 3], [100, 300])    # In-place: arr[1]=100, arr[3]=300\n\n# putmask: In-place replacement where mask is True\nnp.putmask(arr, arr > 3, [0])      # Replace values > 3 with 0"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is `np.argmax`, `np.argmin`, `np.argsort`, and `np.argpartition`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([5, 2, 8, 1, 9, 3])\n\nnp.argmax(arr)         # 4 (index of 9)\nnp.argmin(arr)         # 3 (index of 1)\nnp.argsort(arr)        # [3, 1, 5, 0, 2, 4] (full sort indices)\n\n# argpartition: O(n) find kth smallest (vs O(n log n) for argsort)\nnp.argpartition(arr, 2)[:2]  # Indices of 2 smallest values (unordered)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is `np.unique` with its return options?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([3, 1, 2, 1, 3, 3, 2])\n\nnp.unique(arr)                              # [1, 2, 3]\nnp.unique(arr, return_counts=True)          # ([1,2,3], [2,2,3]) - unique + frequency\nnp.unique(arr, return_index=True)           # unique + first occurrence index\nnp.unique(arr, return_inverse=True)         # unique + inverse indices to reconstruct arr\n\n# 2D: find unique rows\nnp.unique(matrix, axis=0)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is `np.searchsorted` for binary search?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "sorted_arr = np.array([1, 3, 5, 7, 9])\n\nnp.searchsorted(sorted_arr, 4)        # 2 (insert at index 2 to maintain order)\nnp.searchsorted(sorted_arr, [2, 6])   # [1, 3]\nnp.searchsorted(sorted_arr, 3, side=\"right\")   # 2 (right-side insertion)\n\n# Use case: bucket assignment (faster than pd.cut for NumPy arrays)\nbins = np.array([0, 18, 35, 65])\nnp.searchsorted(bins, ages)   # 0=under 18, 1=18-35, 2=35-65, 3=65+"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is `np.in1d` and `np.isin`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, 2, 3, 4, 5])\n\nnp.isin(arr, [2, 4])          # [F, T, F, T, F] - preferred (N-D support)\nnp.in1d(arr, [2, 4])          # [F, T, F, T, F] - 1D only, slightly faster\n\n# Filter elements present in another array\narr[np.isin(arr, [2, 4])]     # [2, 4]\narr[~np.isin(arr, [2, 4])]    # [1, 3, 5] (NOT in)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is `np.intersect1d`, `np.union1d`, `np.setdiff1d`, `np.setxor1d`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3, 4])\nb = np.array([3, 4, 5, 6])\n\nnp.intersect1d(a, b)   # [3, 4] - common elements\nnp.union1d(a, b)       # [1, 2, 3, 4, 5, 6] - all elements\nnp.setdiff1d(a, b)     # [1, 2] - in a but not in b\nnp.setxor1d(a, b)      # [1, 2, 5, 6] - in one but not both"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is `np.extract` vs boolean indexing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, -2, 3, -4, 5])\ncondition = arr > 0\n\nnp.extract(condition, arr)    # [1, 3, 5] - functional form of boolean indexing\narr[condition]                # [1, 3, 5] - equivalent but more readable"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is multi-dimensional boolean indexing with `np.any` and `np.all`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "matrix = np.array([[1, -2, 3], [4, 5, -6], [7, 8, 9]])\n\n# Rows with any negative\nnp.any(matrix < 0, axis=1)     # [True, True, False]\nmatrix[np.any(matrix < 0, axis=1)]   # Select such rows\n\n# Rows where all elements are positive\nnp.all(matrix > 0, axis=1)     # [False, False, True]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is `np.clip` vs `np.maximum` vs `np.minimum`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1, -5, 10, 20, 3])\n\nnp.clip(arr, 0, 15)           # [1, 0, 10, 15, 3] - two-sided bound\nnp.maximum(arr, 0)            # [1, 0, 10, 20, 3] - element-wise max with scalar\nnp.minimum(arr, 15)           # [1, -5, 10, 15, 3] - element-wise min with scalar\nnp.maximum(arr, arr2)         # element-wise max of two arrays\n\n# np.clip = np.minimum(np.maximum(arr, a_min), a_max)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is `np.nan_to_num`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.array([1.0, np.nan, np.inf, -np.inf, 2.0])\nnp.nan_to_num(arr)              # [1.0, 0.0, large_float, -large_float, 2.0]\nnp.nan_to_num(arr, nan=0.0, posinf=999.0, neginf=-999.0)  # Custom replacements\n\n# Also handles safely:\nnp.isnan(arr)       # [F, T, F, F, F]\nnp.isinf(arr)       # [F, F, T, T, F]\nnp.isfinite(arr)    # [T, F, F, F, T]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is `np.nditer` for efficient multi-array iteration?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Cython/C-extension style iteration\nx = np.array([[1, 2], [3, 4]])\ny = np.array([[5, 6], [7, 8]])\n\nresult = np.empty_like(x)\nwith np.nditer([x, y, result],\n               op_flags=[[\"readonly\"], [\"readonly\"], [\"writeonly\", \"allocate\"]]) as it:\n    for a, b, c in it:\n        c[...] = a * b  # Element-wise operation\n\n# Useful in Cython for avoiding Python overhead in loops"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is `np.meshgrid` and its use in surface plotting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "x = np.linspace(-5, 5, 100)\ny = np.linspace(-5, 5, 100)\n\n# Create 2D coordinate grids\nX, Y = np.meshgrid(x, y)    # X.shape = Y.shape = (100, 100)\n\n# Evaluate function on grid\nZ = np.sin(np.sqrt(X**2 + Y**2))\n\n# indexing=\"ij\" for matrix (row=x, col=y) vs \"xy\" (default, Cartesian)\nX, Y = np.meshgrid(x, y, indexing=\"ij\")  # X.shape = (100, 100) in row=x convention"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What is `np.ogrid` and `np.mgrid`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ogrid: Open grid (memory-efficient broadcasting arrays)\ny, x = np.ogrid[-5:5:100j, -5:5:100j]   # 100 points in [-5, 5]\n# y.shape = (100, 1), x.shape = (1, 100) - broadcast to 100x100\n\n# mgrid: Dense grid (full arrays like meshgrid)\ny, x = np.mgrid[-5:5:100j, -5:5:100j]\n# y.shape = x.shape = (100, 100)\n\n# Use ogrid for efficiency; mgrid for convenience"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is `np.digitize`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Assign each element to a bin (like pd.cut but returns integer bin codes)\nages = np.array([5, 15, 25, 45, 75])\nbins = np.array([0, 18, 35, 65])\n\nnp.digitize(ages, bins)   # [1, 1, 2, 2, 3] — bin 1 = 0-18, 2 = 18-35, 3 = 65+\n\n# right=True: bins are open on right (x <= bins) instead of left (x < bins)\nnp.digitize(ages, bins, right=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is `np.unravel_index` and `np.ravel_multi_index`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Convert flat index to multi-dim index\nflat_idx = np.argmax(matrix)          # Index in flattened array\nrow, col = np.unravel_index(flat_idx, matrix.shape)\n\n# Multiple flat indices\nnp.unravel_index([22, 41, 37], (6, 7))   # rows and cols arrays\n\n# Reverse: multi-dim to flat\nnp.ravel_multi_index((2, 3), (6, 7))     # 2*7 + 3 = 17"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
