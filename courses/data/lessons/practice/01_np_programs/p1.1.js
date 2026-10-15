/* ============================================================================
   PRACTICE P1.1 — NumPy Programs · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.1",
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
   "n": "1",
   "q": "NumPy Array Creation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Various ways to create arrays\na = np.array([1, 2, 3, 4, 5])\nb = np.zeros((3, 4))\nc = np.ones((2, 3))\nd = np.eye(3)\ne = np.arange(0, 10, 2)\nf = np.linspace(0, 1, 5)\ng = np.random.randn(3, 3)\n\nprint(f\"Array: {a}\")\nprint(f\"Zeros: {b.shape}\")\nprint(f\"Ones: {c.shape}\")\nprint(f\"Identity:\\n{d}\")\nprint(f\"Arange: {e}\")        # [0 2 4 6 8]\nprint(f\"Linspace: {f}\")      # [0.   0.25 0.5  0.75 1.  ]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Array Reshaping",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.arange(12)\nprint(a.reshape(3, 4))\nprint(a.reshape(2, 2, 3))\nprint(a.reshape(-1, 6))  # Auto-calculate rows\n\n# Flatten\nb = np.array([[1, 2], [3, 4], [5, 6]])\nprint(b.flatten())     # [1 2 3 4 5 6]\nprint(b.ravel())       # [1 2 3 4 5 6] (view)\nprint(b.T)             # Transpose"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Array Indexing & Slicing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])\n\n# Basic indexing\nprint(a[1, 2])        # 6\nprint(a[:2, 1:])      # [[2, 3], [5, 6]]\nprint(a[::2, ::2])    # [[1, 3], [7, 9]]\n\n# Boolean indexing\nprint(a[a > 5])       # [6, 7, 8, 9]\n\n# Fancy indexing\nrows = [0, 2]\ncols = [1, 2]\nprint(a[rows, cols])  # [2, 9]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Broadcasting",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.array([[1, 2, 3], [4, 5, 6]])  # (2, 3)\nb = np.array([10, 20, 30])             # (3,)\n\n# Broadcasting adds b to each row\nprint(a + b)  # [[11, 22, 33], [14, 25, 36]]\n\n# Column broadcast\nc = np.array([[100], [200]])  # (2, 1)\nprint(a + c)  # [[101, 102, 103], [204, 205, 206]]\n\n# Outer product via broadcasting\nx = np.array([1, 2, 3])\ny = np.array([10, 20])\nprint(x[:, np.newaxis] * y)  # [[10, 20], [20, 40], [30, 60]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Matrix Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nA = np.array([[1, 2], [3, 4]])\nB = np.array([[5, 6], [7, 8]])\n\nprint(\"Element-wise multiply:\", A * B)\nprint(\"Matrix multiply:\", A @ B)   # or np.dot(A, B)\nprint(\"Determinant:\", np.linalg.det(A))\nprint(\"Inverse:\\n\", np.linalg.inv(A))\nprint(\"Eigenvalues:\", np.linalg.eigvals(A))\nprint(\"Trace:\", np.trace(A))  # 5\n\n# Solve Ax = b\nb = np.array([5, 11])\nx = np.linalg.solve(A, b)\nprint(f\"Solution: {x}\")  # [1. 2.]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Statistical Functions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndata = np.random.randn(1000)\n\nprint(f\"Mean: {np.mean(data):.4f}\")\nprint(f\"Median: {np.median(data):.4f}\")\nprint(f\"Std: {np.std(data):.4f}\")\nprint(f\"Var: {np.var(data):.4f}\")\nprint(f\"Min: {np.min(data):.4f}\")\nprint(f\"Max: {np.max(data):.4f}\")\nprint(f\"25th percentile: {np.percentile(data, 25):.4f}\")\nprint(f\"75th percentile: {np.percentile(data, 75):.4f}\")\nprint(f\"Correlation:\\n{np.corrcoef(data[:100], data[100:200])}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Vectorized Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Avoid loops — use vectorized operations\na = np.arange(1, 1000001)\n\n# Vectorized sum of squares\nsum_sq = np.sum(a ** 2)\nprint(f\"Sum of squares (1 to 1M): {sum_sq}\")\n\n# Vectorized conditional\nresult = np.where(a % 2 == 0, a, -a)\nprint(f\"First 10: {result[:10]}\")  # [-1, 2, -3, 4, -5, 6, -7, 8, -9, 10]\n\n# Clip values\ndata = np.array([-5, -2, 0, 3, 7, 15])\nprint(np.clip(data, 0, 10))  # [0, 0, 0, 3, 7, 10]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Stacking & Splitting",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\n\n# Stacking\nprint(np.vstack([a, b]))       # [[1,2,3],[4,5,6]]\nprint(np.hstack([a, b]))       # [1,2,3,4,5,6]\nprint(np.column_stack([a, b])) # [[1,4],[2,5],[3,6]]\n\n# Splitting\nc = np.arange(12).reshape(4, 3)\nparts = np.vsplit(c, 2)\nprint(parts[0])  # [[0,1,2],[3,4,5]]\nprint(parts[1])  # [[6,7,8],[9,10,11]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Sorting & Searching",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.array([3, 1, 4, 1, 5, 9, 2, 6])\n\nprint(np.sort(a))              # [1, 1, 2, 3, 4, 5, 6, 9]\nprint(np.argsort(a))           # [1, 3, 6, 0, 2, 4, 7, 5]\nprint(np.searchsorted([1, 2, 3, 4, 5], 3.5))  # 3\n\n# Structured array sort\ndt = np.dtype([('name', 'U10'), ('age', int)])\npeople = np.array([('Alice', 30), ('Bob', 25), ('Charlie', 35)], dtype=dt)\nprint(np.sort(people, order='age'))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Unique, Set Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\na = np.array([1, 2, 2, 3, 3, 4, 5, 5])\nprint(np.unique(a))                      # [1, 2, 3, 4, 5]\nprint(np.unique(a, return_counts=True))  # (array, counts)\n\nb = np.array([3, 4, 5, 6, 7])\nprint(np.intersect1d(a, b))  # [3, 4, 5]\nprint(np.union1d(a, b))      # [1, 2, 3, 4, 5, 6, 7]\nprint(np.setdiff1d(a, b))    # [1, 2]\nprint(np.in1d(a, b))         # [F, F, F, T, T, T, T, T]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Random Number Generation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nrng = np.random.default_rng(42)\n\nprint(rng.random(5))                    # 5 uniform [0,1)\nprint(rng.integers(1, 100, size=5))     # 5 random ints\nprint(rng.normal(0, 1, size=(3, 3)))    # 3x3 standard normal\nprint(rng.choice([1,2,3,4,5], size=3, replace=False))  # Sample without replacement\nprint(rng.shuffle(np.arange(10)))       # In-place shuffle\n\n# Distributions\nprint(rng.poisson(5, size=10))          # Poisson\nprint(rng.exponential(2, size=5))       # Exponential\nprint(rng.binomial(10, 0.5, size=5))    # Binomial"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Polynomial Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Polynomial: 2x³ - 3x² + x - 5\ncoeffs = [2, -3, 1, -5]\np = np.poly1d(coeffs)\n\nprint(f\"p(2) = {p(2)}\")           # 2*8 - 3*4 + 2 - 5 = 5\nprint(f\"Roots: {np.roots(coeffs)}\")\n\n# Polynomial fitting\nx = np.array([0, 1, 2, 3, 4])\ny = np.array([1, 3, 7, 13, 21])\ncoeffs_fit = np.polyfit(x, y, 2)\nprint(f\"Fit coefficients: {coeffs_fit}\")  # ~[1, 1, 1] → x² + x + 1\np_fit = np.poly1d(coeffs_fit)\nprint(f\"p(5) = {p_fit(5):.1f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "13",
   "q": "FFT (Fast Fourier Transform)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Create signal with two frequencies\nfs = 1000  # Sample rate\nt = np.arange(0, 1, 1/fs)\nsignal = np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 120 * t)\n\n# FFT\nfft_result = np.fft.fft(signal)\nfreqs = np.fft.fftfreq(len(t), 1/fs)\n\n# Get magnitudes for positive frequencies\nmagnitude = np.abs(fft_result[:len(t)//2])\npos_freqs = freqs[:len(t)//2]\n\n# Find dominant frequencies\npeak_indices = np.argsort(magnitude)[-2:]\ndominant_freqs = pos_freqs[peak_indices]\nprint(f\"Dominant frequencies: {sorted(dominant_freqs)}\")  # [50, 120]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Convolution",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# 1D Convolution\nsignal = np.array([1, 2, 3, 4, 5])\nkernel = np.array([1, 0, -1])\nresult = np.convolve(signal, kernel, mode='valid')\nprint(f\"1D convolution: {result}\")  # [2, 2, 2]\n\n# 2D Convolution (for images)\ndef convolve2d(image, kernel):\n    kh, kw = kernel.shape\n    ih, iw = image.shape\n    output = np.zeros((ih - kh + 1, iw - kw + 1))\n    for i in range(output.shape[0]):\n        for j in range(output.shape[1]):\n            output[i, j] = np.sum(image[i:i+kh, j:j+kw] * kernel)\n    return output\n\nimage = np.random.rand(5, 5)\nedge_kernel = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])\nprint(f\"2D conv shape: {convolve2d(image, edge_kernel).shape}\")  # (3, 3)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Einsum",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nA = np.arange(6).reshape(2, 3)\nB = np.arange(12).reshape(3, 4)\n\n# Matrix multiply\nprint(np.einsum('ij,jk->ik', A, B).shape)  # (2, 4)\n\n# Trace\nC = np.arange(9).reshape(3, 3)\nprint(np.einsum('ii->', C))  # 0+4+8 = 12\n\n# Batch matrix multiply\nD = np.random.randn(5, 3, 4)\nE = np.random.randn(5, 4, 2)\nprint(np.einsum('bij,bjk->bik', D, E).shape)  # (5, 3, 2)\n\n# Outer product\na = np.array([1, 2, 3])\nb = np.array([4, 5])\nprint(np.einsum('i,j->ij', a, b))\n# [[4, 5], [8, 10], [12, 15]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Masked Arrays",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndata = np.array([1, -999, 3, -999, 5, 6, -999, 8])\nmasked = np.ma.masked_equal(data, -999)\n\nprint(f\"Mean (with mask): {masked.mean():.2f}\")    # 4.6\nprint(f\"Sum (with mask): {masked.sum()}\")           # 23\nprint(f\"Mask: {masked.mask}\")\n\n# Mask based on condition\ndata2 = np.array([10, -5, 30, -2, 15])\nmasked2 = np.ma.masked_less(data2, 0)\nprint(f\"Positive mean: {masked2.mean():.1f}\")  # 18.3"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Memory-Mapped Files",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nimport tempfile\nimport os\n\n# Create large array and save\nwith tempfile.NamedTemporaryFile(suffix='.npy', delete=False) as f:\n    fname = f.name\n\narr = np.arange(1000000, dtype=np.float64)\nnp.save(fname, arr)\n\n# Memory-mapped access (doesn't load entire file)\nmmap = np.load(fname, mmap_mode='r')\nprint(f\"Shape: {mmap.shape}\")\nprint(f\"Element 500000: {mmap[500000]}\")\nprint(f\"Slice: {mmap[0:5]}\")\n\nos.unlink(fname)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Structured Arrays",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Define structured dtype\ndt = np.dtype([\n    ('name', 'U20'),\n    ('age', np.int32),\n    ('salary', np.float64),\n    ('department', 'U15')\n])\n\nemployees = np.array([\n    ('Alice', 30, 75000, 'Engineering'),\n    ('Bob', 25, 65000, 'Marketing'),\n    ('Charlie', 35, 85000, 'Engineering'),\n    ('Diana', 28, 70000, 'Data Science')\n], dtype=dt)\n\n# Query\neng = employees[employees['department'] == 'Engineering']\nprint(f\"Engineering employees: {eng['name']}\")\nprint(f\"Avg salary (Eng): ${np.mean(eng['salary']):.0f}\")\nprint(f\"Oldest: {employees[np.argmax(employees['age'])]['name']}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Advanced Indexing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Multi-dimensional fancy indexing\na = np.arange(20).reshape(4, 5)\nprint(a)\n\n# Select specific elements\nrows = np.array([0, 1, 2, 3])\ncols = np.array([0, 1, 2, 3])\nprint(a[rows, cols])  # Diagonal: [0, 6, 12, 18]\n\n# Boolean mask\nmask = a % 3 == 0\nprint(a[mask])  # [0, 3, 6, 9, 12, 15, 18]\n\n# np.ix_ for cross-indexing\nr = np.array([0, 2])\nc = np.array([1, 3, 4])\nprint(a[np.ix_(r, c)])  # [[1,3,4],[11,13,14]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Custom ufuncs",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Create a universal function\ndef sigmoid(x):\n    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))\n\nsigmoid_ufunc = np.frompyfunc(sigmoid, 1, 1)\n\nx = np.array([-5, -1, 0, 1, 5])\nprint(sigmoid(x))  # [0.007, 0.269, 0.5, 0.731, 0.993]\n\n# Vectorize a Python function\ndef custom_classify(x, threshold):\n    if x > threshold:\n        return \"high\"\n    elif x > 0:\n        return \"medium\"\n    return \"low\"\n\nclassify_vec = np.vectorize(custom_classify)\ndata = np.array([-2, 0.5, 1, 3, 5])\nprint(classify_vec(data, 2))  # ['low', 'medium', 'medium', 'high', 'high']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Window Functions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Moving average\ndef moving_average(data, window=3):\n    return np.convolve(data, np.ones(window)/window, mode='valid')\n\ndata = np.array([1, 3, 5, 7, 9, 11, 13])\nprint(f\"Moving avg (3): {moving_average(data, 3)}\")\n# [3.0, 5.0, 7.0, 9.0, 11.0]\n\n# Exponential moving average\ndef ema(data, alpha=0.3):\n    result = np.zeros_like(data, dtype=float)\n    result[0] = data[0]\n    for i in range(1, len(data)):\n        result[i] = alpha * data[i] + (1 - alpha) * result[i-1]\n    return result\n\nprint(f\"EMA: {ema(data)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Sparse Operations with NumPy",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Simulate sparse matrix operations\ndef sparse_multiply(indices_a, values_a, indices_b, values_b, size):\n    \"\"\"Multiply two sparse vectors\"\"\"\n    a = dict(zip(indices_a, values_a))\n    b = dict(zip(indices_b, values_b))\n    result = 0\n    for idx in set(a.keys()) & set(b.keys()):\n        result += a[idx] * b[idx]\n    return result\n\n# Sparse vectors (only non-zero elements)\nidx_a = [0, 2, 5, 8]\nval_a = [1.0, 3.0, 2.0, 4.0]\nidx_b = [1, 2, 5, 9]\nval_b = [2.0, 1.0, 5.0, 3.0]\n\ndot = sparse_multiply(idx_a, val_a, idx_b, val_b, 10)\nprint(f\"Sparse dot product: {dot}\")  # 3*1 + 2*5 = 13\n\n# Verify with dense\ndense_a = np.zeros(10); dense_a[idx_a] = val_a\ndense_b = np.zeros(10); dense_b[idx_b] = val_b\nprint(f\"Dense dot product: {np.dot(dense_a, dense_b)}\")  # 13.0"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Image as NumPy Array",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Create a simple image (RGB)\nheight, width = 100, 100\nimage = np.zeros((height, width, 3), dtype=np.uint8)\n\n# Draw red rectangle\nimage[20:40, 30:70, 0] = 255  # Red channel\n\n# Draw green circle\ny, x = np.ogrid[:height, :width]\ncenter = (50, 50)\nradius = 20\nmask = (x - center[0])**2 + (y - center[1])**2 <= radius**2\nimage[mask, 1] = 255  # Green channel\n\nprint(f\"Image shape: {image.shape}\")\nprint(f\"Red pixels: {np.sum(image[:,:,0] > 0)}\")\nprint(f\"Green pixels: {np.sum(image[:,:,1] > 0)}\")\n\n# Grayscale conversion\ngray = np.dot(image[...,:3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)\nprint(f\"Grayscale shape: {gray.shape}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Numerical Differentiation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef numerical_derivative(f, x, h=1e-7):\n    return (f(x + h) - f(x - h)) / (2 * h)\n\ndef numerical_gradient(f, x, h=1e-7):\n    grad = np.zeros_like(x, dtype=float)\n    for i in range(len(x)):\n        x_plus = x.copy(); x_plus[i] += h\n        x_minus = x.copy(); x_minus[i] -= h\n        grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)\n    return grad\n\n# Derivative of sin(x) at x=π/4\nf = np.sin\nx = np.pi / 4\nprint(f\"Numerical: {numerical_derivative(f, x):.6f}\")\nprint(f\"Analytical (cos): {np.cos(x):.6f}\")\n\n# Gradient of f(x,y) = x² + y² at (1, 2)\ng = lambda v: v[0]**2 + v[1]**2\nprint(f\"Gradient at (1,2): {numerical_gradient(g, np.array([1.0, 2.0]))}\")\n# [2.0, 4.0]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Numerical Integration",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef trapezoidal(f, a, b, n=1000):\n    x = np.linspace(a, b, n)\n    y = f(x)\n    return np.trapz(y, x)\n\ndef simpsons(f, a, b, n=1000):\n    if n % 2 == 1:\n        n += 1\n    x = np.linspace(a, b, n + 1)\n    y = f(x)\n    h = (b - a) / n\n    return h/3 * (y[0] + y[-1] + 4*np.sum(y[1:-1:2]) + 2*np.sum(y[2:-2:2]))\n\n# Integrate sin(x) from 0 to π (exact = 2)\nprint(f\"Trapezoidal: {trapezoidal(np.sin, 0, np.pi):.6f}\")  # ~2.0\nprint(f\"Simpson's: {simpsons(np.sin, 0, np.pi):.6f}\")      # ~2.0\n\n# Integrate x² from 0 to 1 (exact = 1/3)\nprint(f\"∫x² dx [0,1] = {trapezoidal(lambda x: x**2, 0, 1):.6f}\")  # ~0.333"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
