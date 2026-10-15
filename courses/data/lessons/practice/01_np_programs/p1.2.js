/* ============================================================================
   PRACTICE P1.2 — NumPy Programs · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.2",
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
   "n": "26",
   "q": "Cosine Similarity",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef cosine_similarity(a, b):\n    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n\na = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\nprint(f\"Cosine similarity: {cosine_similarity(a, b):.4f}\")  # 0.9746\n\n# Batch cosine similarity\ndef batch_cosine(matrix, vector):\n    norms = np.linalg.norm(matrix, axis=1)\n    return matrix @ vector / (norms * np.linalg.norm(vector))\n\nM = np.random.randn(5, 3)\nv = np.random.randn(3)\nprint(f\"Batch similarities: {batch_cosine(M, v)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "27",
   "q": "PCA from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef pca(X, n_components):\n    # Center data\n    mean = np.mean(X, axis=0)\n    X_centered = X - mean\n    \n    # Covariance matrix\n    cov = np.cov(X_centered.T)\n    \n    # Eigendecomposition\n    eigenvalues, eigenvectors = np.linalg.eigh(cov)\n    \n    # Sort by eigenvalue (descending)\n    idx = np.argsort(eigenvalues)[::-1]\n    eigenvalues = eigenvalues[idx]\n    eigenvectors = eigenvectors[:, idx]\n    \n    # Project\n    W = eigenvectors[:, :n_components]\n    X_projected = X_centered @ W\n    \n    explained_var = eigenvalues[:n_components] / np.sum(eigenvalues)\n    return X_projected, explained_var\n\nX = np.random.randn(100, 5)\nX_pca, var_explained = pca(X, 2)\nprint(f\"Projected shape: {X_pca.shape}\")  # (100, 2)\nprint(f\"Variance explained: {var_explained}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "28",
   "q": "K-Means from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef kmeans(X, k, max_iter=100):\n    n, d = X.shape\n    # Random initialization\n    idx = np.random.choice(n, k, replace=False)\n    centroids = X[idx]\n    \n    for _ in range(max_iter):\n        # Assign clusters\n        distances = np.linalg.norm(X[:, np.newaxis] - centroids, axis=2)\n        labels = np.argmin(distances, axis=1)\n        \n        # Update centroids\n        new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(k)])\n        \n        if np.allclose(centroids, new_centroids):\n            break\n        centroids = new_centroids\n    \n    return labels, centroids\n\n# Generate clusters\nnp.random.seed(42)\nX = np.vstack([\n    np.random.randn(50, 2) + [0, 0],\n    np.random.randn(50, 2) + [5, 5],\n    np.random.randn(50, 2) + [10, 0]\n])\n\nlabels, centroids = kmeans(X, 3)\nprint(f\"Cluster sizes: {[np.sum(labels==i) for i in range(3)]}\")\nprint(f\"Centroids:\\n{centroids}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Linear Regression from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef linear_regression(X, y):\n    \"\"\"Normal equation: θ = (X'X)^(-1) X'y\"\"\"\n    X_b = np.c_[np.ones(len(X)), X]  # Add bias\n    theta = np.linalg.pinv(X_b.T @ X_b) @ X_b.T @ y\n    return theta\n\ndef predict(X, theta):\n    X_b = np.c_[np.ones(len(X)), X]\n    return X_b @ theta\n\n# Generate data\nnp.random.seed(42)\nX = 2 * np.random.rand(100, 1)\ny = 4 + 3 * X.squeeze() + np.random.randn(100) * 0.5\n\ntheta = linear_regression(X, y)\nprint(f\"Intercept: {theta[0]:.2f}, Slope: {theta[1]:.2f}\")\n# ~4.0, ~3.0\n\n# R² score\ny_pred = predict(X, theta)\nss_res = np.sum((y - y_pred) ** 2)\nss_tot = np.sum((y - np.mean(y)) ** 2)\nr2 = 1 - ss_res / ss_tot\nprint(f\"R² score: {r2:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Gradient Descent",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef gradient_descent(X, y, lr=0.01, epochs=1000):\n    m, n = X.shape\n    X_b = np.c_[np.ones(m), X]\n    theta = np.zeros(n + 1)\n    history = []\n    \n    for _ in range(epochs):\n        predictions = X_b @ theta\n        errors = predictions - y\n        gradient = 2/m * X_b.T @ errors\n        theta -= lr * gradient\n        loss = np.mean(errors ** 2)\n        history.append(loss)\n    \n    return theta, history\n\nnp.random.seed(42)\nX = 2 * np.random.rand(100, 1)\ny = 4 + 3 * X.squeeze() + np.random.randn(100) * 0.5\n\ntheta, history = gradient_descent(X, y, lr=0.1, epochs=500)\nprint(f\"θ₀={theta[0]:.2f}, θ₁={theta[1]:.2f}\")\nprint(f\"Final loss: {history[-1]:.4f}\")\nprint(f\"Loss reduced: {history[0]:.2f} → {history[-1]:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Logistic Regression from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef sigmoid(z):\n    return 1 / (1 + np.exp(-np.clip(z, -500, 500)))\n\ndef logistic_regression(X, y, lr=0.1, epochs=1000):\n    m, n = X.shape\n    X_b = np.c_[np.ones(m), X]\n    theta = np.zeros(n + 1)\n    \n    for _ in range(epochs):\n        z = X_b @ theta\n        h = sigmoid(z)\n        gradient = X_b.T @ (h - y) / m\n        theta -= lr * gradient\n    \n    return theta\n\ndef predict_proba(X, theta):\n    X_b = np.c_[np.ones(len(X)), X]\n    return sigmoid(X_b @ theta)\n\n# Generate binary classification data\nnp.random.seed(42)\nX = np.random.randn(200, 2)\ny = (X[:, 0] + X[:, 1] > 0).astype(float)\n\ntheta = logistic_regression(X, y)\nprobs = predict_proba(X, theta)\npredictions = (probs >= 0.5).astype(int)\naccuracy = np.mean(predictions == y)\nprint(f\"Accuracy: {accuracy:.2%}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Softmax Function",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef softmax(x, axis=-1):\n    \"\"\"Numerically stable softmax\"\"\"\n    x_max = np.max(x, axis=axis, keepdims=True)\n    exp_x = np.exp(x - x_max)\n    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)\n\nlogits = np.array([2.0, 1.0, 0.1])\nprobs = softmax(logits)\nprint(f\"Softmax: {probs}\")        # [0.659, 0.242, 0.099]\nprint(f\"Sum: {probs.sum():.4f}\")  # 1.0\n\n# Batch softmax\nbatch_logits = np.random.randn(4, 5)\nbatch_probs = softmax(batch_logits)\nprint(f\"Batch sums: {batch_probs.sum(axis=1)}\")  # [1, 1, 1, 1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Cross-Entropy Loss",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef binary_cross_entropy(y_true, y_pred, eps=1e-15):\n    y_pred = np.clip(y_pred, eps, 1 - eps)\n    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))\n\ndef categorical_cross_entropy(y_true, y_pred, eps=1e-15):\n    y_pred = np.clip(y_pred, eps, 1)\n    return -np.sum(y_true * np.log(y_pred)) / len(y_true)\n\n# Binary\ny_true = np.array([1, 0, 1, 1, 0])\ny_pred = np.array([0.9, 0.1, 0.8, 0.7, 0.3])\nprint(f\"BCE: {binary_cross_entropy(y_true, y_pred):.4f}\")\n\n# Categorical (one-hot)\ny_true_oh = np.array([[1,0,0], [0,1,0], [0,0,1]])\ny_pred_oh = np.array([[0.7,0.2,0.1], [0.1,0.8,0.1], [0.2,0.3,0.5]])\nprint(f\"CCE: {categorical_cross_entropy(y_true_oh, y_pred_oh):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "34",
   "q": "SVD (Singular Value Decomposition)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nA = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]])\n\nU, S, Vt = np.linalg.svd(A, full_matrices=False)\n\nprint(f\"U shape: {U.shape}\")     # (4, 3)\nprint(f\"S: {S}\")                  # Singular values\nprint(f\"Vt shape: {Vt.shape}\")   # (3, 3)\n\n# Low-rank approximation (keep top k singular values)\nk = 2\nA_approx = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]\nprint(f\"Reconstruction error: {np.linalg.norm(A - A_approx):.6f}\")\n\n# Image compression simulation\nimage = np.random.rand(100, 100)\nU, S, Vt = np.linalg.svd(image)\nfor k in [5, 10, 20, 50]:\n    compressed = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]\n    error = np.linalg.norm(image - compressed) / np.linalg.norm(image)\n    ratio = k * (100 + 100 + 1) / (100 * 100) * 100\n    print(f\"k={k:2d}: error={error:.4f}, storage={ratio:.1f}%\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Distance Metrics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef euclidean(a, b):\n    return np.sqrt(np.sum((a - b) ** 2))\n\ndef manhattan(a, b):\n    return np.sum(np.abs(a - b))\n\ndef cosine_dist(a, b):\n    return 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n\ndef minkowski(a, b, p):\n    return np.sum(np.abs(a - b) ** p) ** (1/p)\n\na = np.array([1, 2, 3])\nb = np.array([4, 5, 6])\n\nprint(f\"Euclidean: {euclidean(a, b):.4f}\")       # 5.1962\nprint(f\"Manhattan: {manhattan(a, b)}\")             # 9\nprint(f\"Cosine dist: {cosine_dist(a, b):.4f}\")   # 0.0254\nprint(f\"Minkowski(3): {minkowski(a, b, 3):.4f}\") # 4.3267\n\n# Pairwise distance matrix\ndef pairwise_distances(X, metric=euclidean):\n    n = len(X)\n    D = np.zeros((n, n))\n    for i in range(n):\n        for j in range(i+1, n):\n            D[i, j] = D[j, i] = metric(X[i], X[j])\n    return D\n\nX = np.random.randn(5, 3)\nprint(f\"Pairwise distances:\\n{pairwise_distances(X).round(2)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Batch Normalization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef batch_norm(X, gamma=1.0, beta=0.0, eps=1e-5):\n    mean = np.mean(X, axis=0)\n    var = np.var(X, axis=0)\n    X_norm = (X - mean) / np.sqrt(var + eps)\n    return gamma * X_norm + beta\n\nX = np.random.randn(32, 10) * 5 + 3  # Unnormalized\nX_bn = batch_norm(X)\n\nprint(f\"Before BN - mean: {X.mean(axis=0)[:3].round(2)}, std: {X.std(axis=0)[:3].round(2)}\")\nprint(f\"After BN  - mean: {X_bn.mean(axis=0)[:3].round(4)}, std: {X_bn.std(axis=0)[:3].round(4)}\")\n# After: mean ≈ 0, std ≈ 1"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Layer Normalization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef layer_norm(X, gamma=1.0, beta=0.0, eps=1e-5):\n    mean = np.mean(X, axis=-1, keepdims=True)\n    var = np.var(X, axis=-1, keepdims=True)\n    X_norm = (X - mean) / np.sqrt(var + eps)\n    return gamma * X_norm + beta\n\nX = np.random.randn(4, 8) * 5 + 3\nX_ln = layer_norm(X)\n\nprint(f\"Per-sample mean after LN: {X_ln.mean(axis=1).round(6)}\")\n# ≈ [0, 0, 0, 0]\nprint(f\"Per-sample std after LN: {X_ln.std(axis=1).round(4)}\")\n# ≈ [1, 1, 1, 1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Attention Score Computation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef scaled_dot_product_attention(Q, K, V, mask=None):\n    d_k = Q.shape[-1]\n    scores = Q @ K.swapaxes(-2, -1) / np.sqrt(d_k)\n    \n    if mask is not None:\n        scores = np.where(mask, scores, -1e9)\n    \n    attention_weights = np.exp(scores - scores.max(axis=-1, keepdims=True))\n    attention_weights /= attention_weights.sum(axis=-1, keepdims=True)\n    \n    output = attention_weights @ V\n    return output, attention_weights\n\n# Example: sequence length=4, d_model=8\nseq_len, d_model = 4, 8\nQ = np.random.randn(seq_len, d_model)\nK = np.random.randn(seq_len, d_model)\nV = np.random.randn(seq_len, d_model)\n\noutput, weights = scaled_dot_product_attention(Q, K, V)\nprint(f\"Output shape: {output.shape}\")    # (4, 8)\nprint(f\"Attention weights:\\n{weights.round(3)}\")\nprint(f\"Weights sum per row: {weights.sum(axis=1).round(4)}\")  # [1, 1, 1, 1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Position Encoding (Transformer)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef positional_encoding(seq_len, d_model):\n    PE = np.zeros((seq_len, d_model))\n    position = np.arange(seq_len)[:, np.newaxis]\n    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))\n    \n    PE[:, 0::2] = np.sin(position * div_term)\n    PE[:, 1::2] = np.cos(position * div_term)\n    return PE\n\npe = positional_encoding(10, 16)\nprint(f\"PE shape: {pe.shape}\")  # (10, 16)\nprint(f\"PE[0, :4]: {pe[0, :4].round(4)}\")  # [0, 1, 0, 1]\nprint(f\"PE[1, :4]: {pe[1, :4].round(4)}\")  # [sin(1), cos(1), ...]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Word Embeddings (Simple)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass SimpleEmbedding:\n    def __init__(self, vocab_size, embed_dim):\n        self.weights = np.random.randn(vocab_size, embed_dim) * 0.01\n    \n    def forward(self, indices):\n        return self.weights[indices]\n    \n    def similarity(self, idx1, idx2):\n        a, b = self.weights[idx1], self.weights[idx2]\n        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n\n# Vocabulary\nvocab = {\"king\": 0, \"queen\": 1, \"man\": 2, \"woman\": 3, \"prince\": 4}\nembed = SimpleEmbedding(len(vocab), 50)\n\n# Lookup embeddings\nsentence = [vocab[\"king\"], vocab[\"queen\"]]\nembeddings = embed.forward(sentence)\nprint(f\"Shape: {embeddings.shape}\")  # (2, 50)\nprint(f\"Similarity king-queen: {embed.similarity(0, 1):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "One-Hot Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef one_hot_encode(labels, num_classes=None):\n    if num_classes is None:\n        num_classes = len(np.unique(labels))\n    one_hot = np.zeros((len(labels), num_classes))\n    one_hot[np.arange(len(labels)), labels] = 1\n    return one_hot\n\nlabels = np.array([0, 2, 1, 3, 1, 0])\nprint(one_hot_encode(labels, 4))\n# [[1,0,0,0], [0,0,1,0], [0,1,0,0], [0,0,0,1], [0,1,0,0], [1,0,0,0]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Min-Max Normalization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef min_max_normalize(X, feature_range=(0, 1)):\n    X_min = X.min(axis=0)\n    X_max = X.max(axis=0)\n    X_std = (X - X_min) / (X_max - X_min)\n    return X_std * (feature_range[1] - feature_range[0]) + feature_range[0]\n\nX = np.array([[1, 100], [2, 200], [3, 300], [4, 400]])\nprint(min_max_normalize(X))\n# [[0, 0], [0.33, 0.33], [0.67, 0.67], [1, 1]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Z-Score Standardization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef standardize(X):\n    return (X - X.mean(axis=0)) / X.std(axis=0)\n\nX = np.array([[1, 100], [2, 200], [3, 300], [4, 400]], dtype=float)\nX_std = standardize(X)\nprint(f\"Mean: {X_std.mean(axis=0).round(6)}\")  # [0, 0]\nprint(f\"Std: {X_std.std(axis=0).round(6)}\")    # [1, 1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Train-Test Split",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef train_test_split(X, y, test_size=0.2, random_state=42):\n    rng = np.random.default_rng(random_state)\n    n = len(X)\n    indices = rng.permutation(n)\n    test_n = int(n * test_size)\n    test_idx = indices[:test_n]\n    train_idx = indices[test_n:]\n    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]\n\nX = np.random.randn(100, 5)\ny = np.random.randint(0, 2, 100)\nX_train, X_test, y_train, y_test = train_test_split(X, y)\nprint(f\"Train: {X_train.shape}, Test: {X_test.shape}\")\n# Train: (80, 5), Test: (20, 5)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "45",
   "q": "Confusion Matrix",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef confusion_matrix(y_true, y_pred, n_classes=None):\n    if n_classes is None:\n        n_classes = max(max(y_true), max(y_pred)) + 1\n    cm = np.zeros((n_classes, n_classes), dtype=int)\n    for t, p in zip(y_true, y_pred):\n        cm[t][p] += 1\n    return cm\n\ndef classification_report(y_true, y_pred):\n    cm = confusion_matrix(y_true, y_pred)\n    n = len(cm)\n    for i in range(n):\n        tp = cm[i, i]\n        fp = cm[:, i].sum() - tp\n        fn = cm[i, :].sum() - tp\n        precision = tp / (tp + fp) if (tp + fp) > 0 else 0\n        recall = tp / (tp + fn) if (tp + fn) > 0 else 0\n        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0\n        print(f\"Class {i}: P={precision:.2f}, R={recall:.2f}, F1={f1:.2f}\")\n\ny_true = [0, 0, 1, 1, 2, 2, 0, 1]\ny_pred = [0, 1, 1, 1, 2, 0, 0, 2]\nprint(confusion_matrix(y_true, y_pred))\nclassification_report(y_true, y_pred)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "ROC Curve Points",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef roc_curve(y_true, y_scores):\n    thresholds = np.sort(np.unique(y_scores))[::-1]\n    tpr_list, fpr_list = [0], [0]\n    \n    P = np.sum(y_true == 1)\n    N = np.sum(y_true == 0)\n    \n    for thresh in thresholds:\n        y_pred = (y_scores >= thresh).astype(int)\n        tp = np.sum((y_pred == 1) & (y_true == 1))\n        fp = np.sum((y_pred == 1) & (y_true == 0))\n        tpr_list.append(tp / P)\n        fpr_list.append(fp / N)\n    \n    return np.array(fpr_list), np.array(tpr_list)\n\ndef auc(fpr, tpr):\n    return np.trapz(tpr, fpr)\n\ny_true = np.array([0, 0, 1, 1, 0, 1, 0, 1])\ny_scores = np.array([0.1, 0.3, 0.6, 0.8, 0.4, 0.9, 0.2, 0.7])\n\nfpr, tpr = roc_curve(y_true, y_scores)\nprint(f\"AUC: {auc(fpr, tpr):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "47",
   "q": "K-Fold Cross Validation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef k_fold_split(n, k=5, shuffle=True, seed=42):\n    indices = np.arange(n)\n    if shuffle:\n        np.random.seed(seed)\n        np.random.shuffle(indices)\n    \n    fold_size = n // k\n    folds = []\n    for i in range(k):\n        test_start = i * fold_size\n        test_end = test_start + fold_size if i < k - 1 else n\n        test_idx = indices[test_start:test_end]\n        train_idx = np.concatenate([indices[:test_start], indices[test_end:]])\n        folds.append((train_idx, test_idx))\n    return folds\n\nfolds = k_fold_split(100, k=5)\nfor i, (train, test) in enumerate(folds):\n    print(f\"Fold {i+1}: train={len(train)}, test={len(test)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Outlier Detection (IQR)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef detect_outliers_iqr(data, factor=1.5):\n    Q1 = np.percentile(data, 25)\n    Q3 = np.percentile(data, 75)\n    IQR = Q3 - Q1\n    lower = Q1 - factor * IQR\n    upper = Q3 + factor * IQR\n    outliers = (data < lower) | (data > upper)\n    return outliers, lower, upper\n\nnp.random.seed(42)\ndata = np.concatenate([np.random.randn(100), [10, -8, 15]])\nmask, lower, upper = detect_outliers_iqr(data)\nprint(f\"Outliers found: {mask.sum()}\")\nprint(f\"Bounds: [{lower:.2f}, {upper:.2f}]\")\nprint(f\"Outlier values: {data[mask]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Missing Value Imputation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef impute_mean(X):\n    result = X.copy()\n    for col in range(X.shape[1]):\n        mask = np.isnan(X[:, col])\n        if mask.any():\n            col_mean = np.nanmean(X[:, col])\n            result[mask, col] = col_mean\n    return result\n\ndef impute_median(X):\n    result = X.copy()\n    for col in range(X.shape[1]):\n        mask = np.isnan(X[:, col])\n        if mask.any():\n            result[mask, col] = np.nanmedian(X[:, col])\n    return result\n\nX = np.array([[1, np.nan, 3], [4, 5, np.nan], [np.nan, 8, 9], [10, 11, 12]], dtype=float)\nprint(\"Original:\\n\", X)\nprint(\"Mean imputed:\\n\", impute_mean(X))\nprint(\"Median imputed:\\n\", impute_median(X))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Feature Scaling Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass Scaler:\n    def __init__(self, method='standard'):\n        self.method = method\n        self.params = {}\n    \n    def fit(self, X):\n        if self.method == 'standard':\n            self.params['mean'] = X.mean(axis=0)\n            self.params['std'] = X.std(axis=0)\n        elif self.method == 'minmax':\n            self.params['min'] = X.min(axis=0)\n            self.params['max'] = X.max(axis=0)\n        elif self.method == 'robust':\n            self.params['median'] = np.median(X, axis=0)\n            self.params['iqr'] = np.percentile(X, 75, axis=0) - np.percentile(X, 25, axis=0)\n        return self\n    \n    def transform(self, X):\n        if self.method == 'standard':\n            return (X - self.params['mean']) / self.params['std']\n        elif self.method == 'minmax':\n            return (X - self.params['min']) / (self.params['max'] - self.params['min'])\n        elif self.method == 'robust':\n            return (X - self.params['median']) / self.params['iqr']\n    \n    def fit_transform(self, X):\n        return self.fit(X).transform(X)\n\nX = np.random.randn(50, 3) * [1, 10, 100] + [0, 50, 500]\nfor method in ['standard', 'minmax', 'robust']:\n    scaler = Scaler(method)\n    X_scaled = scaler.fit_transform(X)\n    print(f\"{method:10s}: mean={X_scaled.mean(axis=0).round(3)}, std={X_scaled.std(axis=0).round(3)}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
