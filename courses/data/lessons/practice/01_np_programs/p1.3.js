/* ============================================================================
   PRACTICE P1.3 — NumPy Programs · 3
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.3",
 "lede": "**25 programs** from NumPy Programs. Read the title, write the program yourself, then open the worked version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the worked version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "51",
   "q": "Histogram",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\ndata = np.random.randn(1000)\ncounts, edges = np.histogram(data, bins=10)\nprint(f\"Counts: {counts}\")\nprint(f\"Edges: {edges.round(2)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Cumulative Sum & Product",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3, 4, 5])\nprint(f\"Cumsum: {np.cumsum(a)}\")    # [1, 3, 6, 10, 15]\nprint(f\"Cumprod: {np.cumprod(a)}\")  # [1, 2, 6, 24, 120]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Digitize (Binning)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "data = np.array([0.5, 1.5, 2.5, 3.5, 4.5])\nbins = [1, 2, 3, 4]\nprint(np.digitize(data, bins))  # [0, 1, 2, 3, 4]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Meshgrid",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "x = np.linspace(-5, 5, 100)\ny = np.linspace(-5, 5, 100)\nX, Y = np.meshgrid(x, y)\nZ = np.sin(np.sqrt(X**2 + Y**2))\nprint(f\"Meshgrid shape: {Z.shape}\")  # (100, 100)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Kronecker Product",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1, 2], [3, 4]])\nB = np.eye(2)\nprint(np.kron(A, B))\n# [[1,0,2,0],[0,1,0,2],[3,0,4,0],[0,3,0,4]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Outer Product",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\nprint(np.outer(a, b))\n# [[4,5,6],[8,10,12],[12,15,18]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "57",
   "q": "Cholesky Decomposition",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[4, 2], [2, 3]], dtype=float)\nL = np.linalg.cholesky(A)\nprint(f\"L:\\n{L}\")\nprint(f\"L @ L.T:\\n{L @ L.T}\")  # Should equal A"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "58",
   "q": "QR Decomposition",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.random.randn(4, 3)\nQ, R = np.linalg.qr(A)\nprint(f\"Q shape: {Q.shape}, R shape: {R.shape}\")\nprint(f\"Q orthogonal: {np.allclose(Q.T @ Q, np.eye(3))}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Rolling Statistics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def rolling_mean(data, window):\n    cumsum = np.cumsum(np.insert(data, 0, 0))\n    return (cumsum[window:] - cumsum[:-window]) / window\n\ndata = np.arange(10, dtype=float)\nprint(f\"Rolling mean (3): {rolling_mean(data, 3)}\")\n# [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Argmax/Argmin with Axis",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([[1, 5, 3], [4, 2, 6], [7, 8, 0]])\nprint(f\"Argmax overall: {np.unravel_index(np.argmax(a), a.shape)}\")  # (2, 1)\nprint(f\"Argmax per row: {np.argmax(a, axis=1)}\")    # [1, 2, 1]\nprint(f\"Argmax per col: {np.argmax(a, axis=0)}\")    # [2, 2, 1]\n\n# Program 361-370: More array operations"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Diagonal Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "d = np.diag([1, 2, 3, 4])\nprint(f\"Diagonal matrix:\\n{d}\")\nprint(f\"Extract diagonal: {np.diag(d)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "62",
   "q": "Tile and Repeat",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3])\nprint(np.tile(a, 3))         # [1,2,3,1,2,3,1,2,3]\nprint(np.repeat(a, 3))       # [1,1,1,2,2,2,3,3,3]\nprint(np.tile(a, (2, 3)))    # [[1,2,3,1,2,3,1,2,3],[1,2,3,1,2,3,1,2,3]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "63",
   "q": "Advanced Where",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([10, 20, 30, 40, 50])\nresult = np.where(a > 25, a * 2, a // 2)\nprint(result)  # [5, 10, 60, 80, 100]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Select (Multi-condition)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "conditions = [a < 15, (a >= 15) & (a < 35), a >= 35]\nchoices = [0, 1, 2]\nprint(np.select(conditions, choices))  # [0, 1, 1, 2, 2]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Piecewise",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "x = np.linspace(-2, 2, 9)\ny = np.piecewise(x, [x < 0, x >= 0], [lambda x: -x, lambda x: x**2])\nprint(f\"Piecewise: {y}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "66",
   "q": "String Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "names = np.array(['alice', 'bob', 'charlie'])\nprint(np.char.upper(names))        # ['ALICE', 'BOB', 'CHARLIE']\nprint(np.char.capitalize(names))   # ['Alice', 'Bob', 'Charlie']\nprint(np.char.str_len(names))      # [5, 3, 7]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "67",
   "q": "Date Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "dates = np.array(['2024-01-01', '2024-06-15', '2024-12-31'], dtype='datetime64')\nprint(dates + np.timedelta64(30, 'D'))  # Add 30 days\nprint(np.diff(dates))  # Differences between dates"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "68",
   "q": "Stride Tricks (Sliding Window)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def sliding_window_view(arr, window_size):\n    shape = arr.shape[0] - window_size + 1, window_size\n    strides = arr.strides * 2\n    return np.lib.stride_tricks.as_strided(arr, shape=shape, strides=strides)\n\na = np.arange(10)\nwindows = sliding_window_view(a, 3)\nprint(windows)\n# [[0,1,2],[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7],[6,7,8],[7,8,9]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "69",
   "q": "Complex Number Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "z1 = np.array([1+2j, 3+4j, 5+6j])\nprint(f\"Real: {z1.real}\")\nprint(f\"Imag: {z1.imag}\")\nprint(f\"Magnitude: {np.abs(z1).round(2)}\")\nprint(f\"Phase: {np.angle(z1).round(2)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Memory Layout",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.arange(12).reshape(3, 4)\nprint(f\"C-contiguous: {a.flags['C_CONTIGUOUS']}\")     # True\nprint(f\"F-contiguous: {a.flags['F_CONTIGUOUS']}\")     # False\nb = np.asfortranarray(a)\nprint(f\"Fortran order: {b.flags['F_CONTIGUOUS']}\")    # True\n\n# Programs 371-380"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "Hadamard Product",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1,2],[3,4]])\nB = np.array([[5,6],[7,8]])\nprint(f\"Hadamard: {A * B}\")  # [[5,12],[21,32]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "72",
   "q": "L1 and L2 Norm",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "v = np.array([3, -4, 0, 5])\nprint(f\"L1 norm: {np.linalg.norm(v, 1)}\")    # 12\nprint(f\"L2 norm: {np.linalg.norm(v, 2):.4f}\")  # 7.0711\nprint(f\"L∞ norm: {np.linalg.norm(v, np.inf)}\")  # 5"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "73",
   "q": "Matrix Rank",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1,2,3],[4,5,6],[7,8,9]])\nprint(f\"Rank: {np.linalg.matrix_rank(A)}\")  # 2 (rows are linearly dependent)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "74",
   "q": "Condition Number",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1, 0], [0, 1e-10]])\nprint(f\"Condition number: {np.linalg.cond(A):.0e}\")\n# Very large = ill-conditioned"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Moore-Penrose Pseudoinverse",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[1, 2], [3, 4], [5, 6]])\nA_pinv = np.linalg.pinv(A)\nprint(f\"A_pinv @ A ≈ I:\\n{(A_pinv @ A).round(4)}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
