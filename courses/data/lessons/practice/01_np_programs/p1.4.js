/* ============================================================================
   PRACTICE P1.4 — NumPy Programs · 4
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.4",
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
   "n": "76",
   "q": "Cross Product",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 0, 0])\nb = np.array([0, 1, 0])\nprint(f\"Cross product: {np.cross(a, b)}\")  # [0, 0, 1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "77",
   "q": "Clip Gradients",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def clip_gradients(gradients, max_norm=1.0):\n    total_norm = np.sqrt(sum(np.sum(g**2) for g in gradients))\n    clip_coef = max_norm / (total_norm + 1e-6)\n    if clip_coef < 1:\n        return [g * clip_coef for g in gradients]\n    return gradients\n\ngrads = [np.random.randn(3, 4), np.random.randn(4, 2)]\nclipped = clip_gradients(grads, max_norm=1.0)\ntotal_after = np.sqrt(sum(np.sum(g**2) for g in clipped))\nprint(f\"Gradient norm after clipping: {total_after:.4f}\")  # ≤ 1.0"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "78",
   "q": "Xavier Initialization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def xavier_init(fan_in, fan_out):\n    limit = np.sqrt(6 / (fan_in + fan_out))\n    return np.random.uniform(-limit, limit, (fan_in, fan_out))\n\ndef he_init(fan_in, fan_out):\n    std = np.sqrt(2 / fan_in)\n    return np.random.randn(fan_in, fan_out) * std\n\nW_xavier = xavier_init(784, 256)\nW_he = he_init(784, 256)\nprint(f\"Xavier std: {W_xavier.std():.4f}\")  # ≈ 0.076\nprint(f\"He std: {W_he.std():.4f}\")          # ≈ 0.051"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "79",
   "q": "Interpolation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "x = np.array([0, 1, 2, 3, 4])\ny = np.array([0, 1, 4, 9, 16])\nx_new = np.array([0.5, 1.5, 2.5, 3.5])\ny_interp = np.interp(x_new, x, y)\nprint(f\"Interpolated: {y_interp}\")  # [0.5, 2.5, 6.5, 12.5]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "80",
   "q": "Covariance Matrix",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "X = np.random.randn(100, 3)\ncov_manual = (X - X.mean(axis=0)).T @ (X - X.mean(axis=0)) / (len(X) - 1)\ncov_numpy = np.cov(X.T)\nprint(f\"Match: {np.allclose(cov_manual, cov_numpy)}\")  # True\n\n# Programs 381-390"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "81",
   "q": "Moving Standard Deviation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def rolling_std(data, window):\n    n = len(data)\n    result = np.full(n, np.nan)\n    for i in range(window - 1, n):\n        result[i] = np.std(data[i-window+1:i+1])\n    return result\n\ndata = np.random.randn(20)\nprint(f\"Rolling std: {rolling_std(data, 5)[-5:].round(3)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "82",
   "q": "Data Augmentation (Noise)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def add_noise(X, noise_factor=0.1):\n    noise = np.random.randn(*X.shape) * noise_factor\n    return X + noise\n\nX = np.random.randn(10, 5)\nX_noisy = add_noise(X, 0.05)\nprint(f\"Mean diff: {np.mean(np.abs(X - X_noisy)):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "83",
   "q": "Label Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def label_encode(labels):\n    unique = np.unique(labels)\n    mapping = {label: idx for idx, label in enumerate(unique)}\n    return np.array([mapping[l] for l in labels]), mapping\n\nlabels = np.array(['cat', 'dog', 'bird', 'cat', 'bird'])\nencoded, mapping = label_encode(labels)\nprint(f\"Encoded: {encoded}\")  # [1, 2, 0, 1, 0]\nprint(f\"Mapping: {mapping}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Stratified Sampling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def stratified_sample(X, y, fraction=0.2, seed=42):\n    rng = np.random.default_rng(seed)\n    indices = []\n    for cls in np.unique(y):\n        cls_idx = np.where(y == cls)[0]\n        n_samples = max(1, int(len(cls_idx) * fraction))\n        selected = rng.choice(cls_idx, n_samples, replace=False)\n        indices.extend(selected)\n    return np.array(indices)\n\ny = np.array([0]*50 + [1]*30 + [2]*20)\nsample_idx = stratified_sample(np.arange(len(y)), y, 0.3)\nfor cls in [0, 1, 2]:\n    print(f\"Class {cls}: {np.sum(y[sample_idx] == cls)} sampled\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "85",
   "q": "Polynomial Features",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def polynomial_features(X, degree=2):\n    from itertools import combinations_with_replacement\n    n, m = X.shape\n    features = [np.ones(n)]\n    for d in range(1, degree + 1):\n        for combo in combinations_with_replacement(range(m), d):\n            feature = np.prod(X[:, combo], axis=1)\n            features.append(feature)\n    return np.column_stack(features)\n\nX = np.array([[1, 2], [3, 4], [5, 6]])\nX_poly = polynomial_features(X, degree=2)\nprint(f\"Original features: {X.shape[1]}, Polynomial: {X_poly.shape[1]}\")\n# 2 -> 6 (1, x1, x2, x1², x1x2, x2²)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "86",
   "q": "SMAPE (Symmetric Mean Absolute Percentage Error)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def smape(actual, predicted):\n    return 100 * np.mean(2 * np.abs(actual - predicted) / (np.abs(actual) + np.abs(predicted) + 1e-8))\n\nactual = np.array([100, 200, 300])\npredicted = np.array([110, 190, 310])\nprint(f\"SMAPE: {smape(actual, predicted):.2f}%\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "87",
   "q": "Mutual Information (Discrete)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def mutual_info(x, y, bins=10):\n    hist_xy = np.histogram2d(x, y, bins=bins)[0]\n    pxy = hist_xy / hist_xy.sum()\n    px = pxy.sum(axis=1)\n    py = pxy.sum(axis=0)\n    \n    mi = 0\n    for i in range(bins):\n        for j in range(bins):\n            if pxy[i,j] > 0 and px[i] > 0 and py[j] > 0:\n                mi += pxy[i,j] * np.log2(pxy[i,j] / (px[i] * py[j]))\n    return mi\n\nx = np.random.randn(1000)\ny = x + np.random.randn(1000) * 0.5\nprint(f\"MI (correlated): {mutual_info(x, y):.4f}\")\nprint(f\"MI (independent): {mutual_info(x, np.random.randn(1000)):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "88",
   "q": "KNN from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def knn_predict(X_train, y_train, X_test, k=3):\n    predictions = []\n    for x in X_test:\n        distances = np.linalg.norm(X_train - x, axis=1)\n        k_nearest = np.argsort(distances)[:k]\n        k_labels = y_train[k_nearest]\n        counts = np.bincount(k_labels)\n        predictions.append(np.argmax(counts))\n    return np.array(predictions)\n\nX_train = np.random.randn(50, 2)\ny_train = (X_train[:, 0] + X_train[:, 1] > 0).astype(int)\nX_test = np.random.randn(10, 2)\npreds = knn_predict(X_train, y_train, X_test, k=5)\nprint(f\"Predictions: {preds}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "89",
   "q": "Decision Boundary Points",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def decision_boundary(model_predict, x_range, y_range, resolution=100):\n    xx, yy = np.meshgrid(\n        np.linspace(*x_range, resolution),\n        np.linspace(*y_range, resolution)\n    )\n    grid = np.c_[xx.ravel(), yy.ravel()]\n    Z = model_predict(grid).reshape(xx.shape)\n    return xx, yy, Z\n\n# Simple linear classifier for demo\ndef simple_classifier(X):\n    return (X[:, 0] + X[:, 1] > 0).astype(int)\n\nxx, yy, Z = decision_boundary(simple_classifier, (-3, 3), (-3, 3))\nprint(f\"Boundary grid shape: {Z.shape}\")  # (100, 100)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "90",
   "q": "Learning Rate Schedules",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def cosine_schedule(epoch, total_epochs, lr_max=0.1, lr_min=0.001):\n    return lr_min + 0.5 * (lr_max - lr_min) * (1 + np.cos(np.pi * epoch / total_epochs))\n\ndef step_decay(epoch, lr_init=0.1, drop=0.5, epochs_drop=10):\n    return lr_init * drop ** (epoch // epochs_drop)\n\ndef warmup_schedule(epoch, warmup_epochs=5, lr_max=0.1):\n    if epoch < warmup_epochs:\n        return lr_max * (epoch + 1) / warmup_epochs\n    return lr_max\n\nfor e in [0, 10, 25, 50, 75, 100]:\n    print(f\"Epoch {e:3d}: cosine={cosine_schedule(e, 100):.4f}, \"\n          f\"step={step_decay(e):.4f}\")\n\n# Programs 391-400: Final NumPy Programs"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "91",
   "q": "Normalize Vectors",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def normalize_vectors(X):\n    norms = np.linalg.norm(X, axis=1, keepdims=True)\n    return X / (norms + 1e-8)\n\nX = np.random.randn(5, 3)\nX_norm = normalize_vectors(X)\nprint(f\"Norms after: {np.linalg.norm(X_norm, axis=1).round(4)}\")  # All 1.0"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "92",
   "q": "Jaccard Similarity",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def jaccard_binary(a, b):\n    intersection = np.sum(a & b)\n    union = np.sum(a | b)\n    return intersection / union if union > 0 else 0\n\na = np.array([1,1,0,1,0,1])\nb = np.array([1,0,0,1,1,1])\nprint(f\"Jaccard: {jaccard_binary(a, b):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "93",
   "q": "Leaky ReLU",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def leaky_relu(x, alpha=0.01):\n    return np.where(x > 0, x, alpha * x)\n\nx = np.array([-2, -1, 0, 1, 2])\nprint(f\"LeakyReLU: {leaky_relu(x)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "94",
   "q": "GELU Activation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def gelu(x):\n    return 0.5 * x * (1 + np.tanh(np.sqrt(2/np.pi) * (x + 0.044715 * x**3)))\n\nx = np.linspace(-3, 3, 7)\nprint(f\"GELU: {gelu(x).round(4)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "95",
   "q": "Swish Activation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def swish(x, beta=1.0):\n    return x * (1 / (1 + np.exp(-beta * x)))\n\nx = np.linspace(-3, 3, 7)\nprint(f\"Swish: {swish(x).round(4)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "96",
   "q": "Dropout Mask",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def dropout(X, p=0.5, training=True):\n    if not training:\n        return X\n    mask = np.random.binomial(1, 1-p, X.shape)\n    return X * mask / (1 - p)\n\nX = np.ones((3, 4))\nprint(f\"With dropout:\\n{dropout(X, p=0.5)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "97",
   "q": "BLEU Score (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def bleu_score(reference, candidate, n=4):\n    from collections import Counter\n    scores = []\n    for i in range(1, min(n+1, len(candidate)+1)):\n        ref_ngrams = Counter(zip(*[reference[j:] for j in range(i)]))\n        cand_ngrams = Counter(zip(*[candidate[j:] for j in range(i)]))\n        matches = sum((cand_ngrams & ref_ngrams).values())\n        total = max(1, sum(cand_ngrams.values()))\n        scores.append(matches / total)\n    \n    if 0 in scores:\n        return 0\n    log_avg = sum(np.log(s) for s in scores) / len(scores)\n    bp = min(1, np.exp(1 - len(reference) / len(candidate)))\n    return bp * np.exp(log_avg)\n\nref = \"the cat sat on the mat\".split()\ncand = \"the cat is on the mat\".split()\nprint(f\"BLEU: {bleu_score(ref, cand):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "98",
   "q": "Perplexity",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def perplexity(probs):\n    log_probs = np.log2(probs)\n    return 2 ** (-np.mean(log_probs))\n\nprobs = np.array([0.9, 0.8, 0.7, 0.6, 0.5])\nprint(f\"Perplexity: {perplexity(probs):.2f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "99",
   "q": "Gini Impurity",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def gini_impurity(labels):\n    _, counts = np.unique(labels, return_counts=True)\n    probs = counts / len(labels)\n    return 1 - np.sum(probs ** 2)\n\nprint(f\"Pure: {gini_impurity([0,0,0,0]):.2f}\")        # 0.0\nprint(f\"Balanced: {gini_impurity([0,0,1,1]):.2f}\")     # 0.5\nprint(f\"Mixed: {gini_impurity([0,0,0,1,1,2]):.4f}\")   # 0.611"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "100",
   "q": "Entropy",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def entropy(labels):\n    _, counts = np.unique(labels, return_counts=True)\n    probs = counts / len(labels)\n    return -np.sum(probs * np.log2(probs + 1e-10))\n\nprint(f\"Pure entropy: {entropy([0,0,0,0]):.2f}\")       # 0.0\nprint(f\"Max entropy: {entropy([0,1,2,3]):.2f}\")        # 2.0\nprint(f\"Binary entropy: {entropy([0,0,1,1]):.2f}\")     # 1.0"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
