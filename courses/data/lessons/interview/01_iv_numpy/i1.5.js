/* ============================================================================
   INTERVIEW I1.5 — Real-World ML Applications
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
 "lede": "**10 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Real-World ML Applications",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "How do you implement linear regression using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Normal equation: w = (XᵀX)⁻¹Xᵀy\nX_b = np.c_[np.ones((X.shape[0], 1)), X]  # Add bias term\nw = np.linalg.lstsq(X_b, y, rcond=None)[0]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "How do you implement sigmoid and ReLU using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def sigmoid(x): return 1 / (1 + np.exp(-np.clip(x, -500, 500)))\ndef relu(x):    return np.maximum(0, x)\ndef tanh(x):    return np.tanh(x)  # Already a ufunc"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How do you compute MSE, MAE, and cross-entropy loss?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "mse = np.mean((y_pred - y_true) ** 2)\nmae = np.mean(np.abs(y_pred - y_true))\neps = 1e-8  # Avoid log(0)\nce  = -np.mean(y_true * np.log(y_pred + eps) + (1 - y_true) * np.log(1 - y_pred + eps))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "How do you normalize / standardize data using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Min-Max normalization\nX_norm = (X - X.min(axis=0)) / (X.max(axis=0) - X.min(axis=0))\n\n# Z-score standardization\nX_std = (X - X.mean(axis=0)) / X.std(axis=0)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "How do you compute a confusion matrix from scratch?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def confusion_matrix(y_true, y_pred, n_classes):\n    cm = np.zeros((n_classes, n_classes), dtype=int)\n    for t, p in zip(y_true, y_pred):\n        cm[t, p] += 1\n    return cm"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "How do you one-hot encode using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "n_classes = 5\ny_onehot = np.eye(n_classes)[y_int_labels]  # Shape: (n_samples, n_classes)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "How do you compute pairwise Euclidean distances between all rows of two matrices?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Efficient NumPy implementation\ndef pairwise_distance(A, B):\n    # ||a - b||² = ||a||² + ||b||² - 2aᵀb\n    A_sq = np.sum(A ** 2, axis=1, keepdims=True)\n    B_sq = np.sum(B ** 2, axis=1, keepdims=True)\n    return np.sqrt(A_sq + B_sq.T - 2 * A @ B.T)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "How do you implement gradient descent update step?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def gradient_descent_step(X, y, w, lr):\n    y_pred = X @ w\n    gradient = X.T @ (y_pred - y) / len(y)  # MSE gradient\n    w -= lr * gradient\n    return w"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "How do you implement K-Means from scratch with NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def kmeans(X, k, n_iter=100):\n    centroids = X[np.random.choice(len(X), k, replace=False)]\n    for _ in range(n_iter):\n        dists = pairwise_distance(X, centroids)\n        labels = np.argmin(dists, axis=1)\n        new_centroids = np.array([X[labels == i].mean(0) for i in range(k)])\n        if np.allclose(centroids, new_centroids): break\n        centroids = new_centroids\n    return labels, centroids"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "How do you implement PCA from scratch using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def pca(X, n_components):\n    X_centered = X - X.mean(axis=0)\n    cov_matrix = np.cov(X_centered.T)\n    eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)\n    # Sort descending\n    idx = np.argsort(eigenvalues)[::-1]\n    components = eigenvectors[:, idx[:n_components]]\n    return X_centered @ components"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
