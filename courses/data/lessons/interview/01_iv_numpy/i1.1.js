/* ============================================================================
   INTERVIEW I1.1 — Array Basics
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
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
   "text": "Array Basics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is NumPy and why is it fundamental to ML/Data Science?",
   "body": [
    {
     "t": "p",
     "text": "NumPy provides N-dimensional array objects (`ndarray`) with C-optimized, vectorized operations. It is the foundation of the Python scientific ecosystem (Pandas, SciPy, TensorFlow, PyTorch internals). Enables 100–1000× speedup over pure Python loops for numerical computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is an `ndarray` and how is it different from a Python list?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "ndarray",
      "Python list"
     ],
     "rows": [
      [
       "Dtype",
       "Homogeneous",
       "Heterogeneous"
      ],
      [
       "Memory",
       "Contiguous block",
       "Pointers to objects"
      ],
      [
       "Operations",
       "Vectorized (C speed)",
       "Python loops"
      ],
      [
       "Multidimensional",
       "Native",
       "Nested lists"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How do you create NumPy arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nnp.array([1, 2, 3])                # From list\nnp.zeros((3, 4))                   # 3×4 zeros\nnp.ones((2, 3), dtype=np.float32) # 2×3 ones\nnp.eye(4)                          # 4×4 identity\nnp.arange(0, 10, 2)               # [0, 2, 4, 6, 8]\nnp.linspace(0, 1, 50)             # 50 evenly spaced values in [0, 1]\nnp.full((3, 3), 7)                # 3×3 filled with 7\nnp.empty((100, 100))              # Uninitialized (garbage values — fast)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is `dtype` and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "`dtype` defines the element type (int32, float64, bool, etc.). Affects memory usage and computation speed. Use `float32` instead of `float64` in ML to halve memory and improve GPU throughput."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are `shape`, `ndim`, `size`, and `dtype` attributes?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.zeros((3, 4, 5))\na.shape  # (3, 4, 5)\na.ndim   # 3\na.size   # 60  (total elements = 3×4×5)\na.dtype  # float64\na.nbytes # 480 (60 × 8 bytes)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How do you reshape a NumPy array?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(12)\na.reshape(3, 4)       # 3 rows, 4 cols\na.reshape(2, -1)      # 2 rows, auto cols → (2, 6)\na.reshape(-1)         # Flatten to 1D\na.ravel()             # Flatten (view if possible)\na.flatten()           # Flatten (always copy)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between `ravel` and `flatten`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`ravel()`: Returns a flattened view (no copy) if possible. Modifying it may modify original.",
      "`flatten()`: Always returns a flattened copy. Safer but uses more memory."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is array indexing and slicing in NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(12).reshape(3, 4)\na[1, 2]        # Element at row 1, col 2\na[0, :]        # First row\na[:, 1]        # Second column\na[0:2, 1:3]   # Submatrix rows 0-1, cols 1-2"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is fancy indexing?",
   "body": [
    {
     "t": "p",
     "text": "Indexing with arrays of indices (returns copies, not views):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([10, 20, 30, 40, 50])\na[[0, 2, 4]]                  # [10, 30, 50]\na[np.array([True, False, True, False, True])]  # Boolean fancy"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is boolean indexing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, -2, 3, -4, 5])\na[a > 0]         # [1, 3, 5]\na[a > 0] = 0     # Zero out positives in-place"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between a view and a copy in NumPy?",
   "body": [
    {
     "t": "p",
     "text": "A view shares memory with the original:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(6)\nb = a[::2]    # View — shares memory\nb[0] = 99    # Also changes a[0]\nc = a.copy() # Independent copy"
    },
    {
     "t": "p",
     "text": "Use `.base` attribute: if `b.base is a`, then b is a view of a."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What does `np.newaxis` do?",
   "body": [
    {
     "t": "p",
     "text": "Adds a new axis (dimension) of size 1 — useful for broadcasting:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])    # shape (3,)\na[:, np.newaxis]           # shape (3, 1) — column vector\na[np.newaxis, :]           # shape (1, 3) — row vector"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `np.squeeze` and `np.expand_dims`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`np.squeeze`: Removes dimensions of size 1.",
      "`np.expand_dims(a, axis=0)`: Adds a new axis at the given position. Equivalent to `a[np.newaxis]`."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How do you concatenate and stack arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.concatenate([a, b], axis=0)  # Join along existing axis\nnp.vstack([a, b])               # Stack vertically (row-wise)\nnp.hstack([a, b])               # Stack horizontally (column-wise)\nnp.stack([a, b], axis=0)        # New axis stack\nnp.column_stack([a, b])         # Stack 1D arrays as columns"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you split arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.split(a, 3)                    # Split into 3 equal parts\nnp.array_split(a, 4)              # Split into 4 parts (allows unequal)\nnp.hsplit(a, 2)                   # Horizontal split\nnp.vsplit(a, 2)                   # Vertical split"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you sort NumPy arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.sort(a)              # Returns sorted copy\na.sort()                # In-place sort\nnp.argsort(a)           # Indices that would sort a\nnp.sort(a, axis=0)      # Sort along rows\nnp.argmax(a) / np.argmin(a)  # Index of max/min"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do you find unique values?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.unique(a)                          # Sorted unique values\nvals, counts = np.unique(a, return_counts=True)  # With frequencies\nnp.unique(a, return_index=True)       # With first occurrence indices"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `np.where`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "np.where(condition, x, y)  # Element-wise: where True → x, else y\nresult = np.where(a > 0, a, 0)   # ReLU activation\n\nnp.where(a > 0)  # With one argument: returns indices where True"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you create structured arrays?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "dt = np.dtype([(\"name\", \"U20\"), (\"age\", np.int32), (\"score\", np.float64)])\narr = np.array([(\"Alice\", 30, 9.5), (\"Bob\", 25, 8.0)], dtype=dt)\narr[\"name\"]   # Access by field name\narr[\"age\"]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is `np.memmap`?",
   "body": [
    {
     "t": "p",
     "text": "Memory-mapped file: accesses a file on disk as if it were an ndarray, loading only needed data into RAM. Essential for datasets larger than RAM:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "arr = np.memmap(\"bigfile.bin\", dtype=\"float32\", mode=\"r+\", shape=(1_000_000, 512))"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
