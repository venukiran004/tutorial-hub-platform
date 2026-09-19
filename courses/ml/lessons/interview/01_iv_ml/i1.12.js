/* ============================================================================
   INTERVIEW I1.12 — Scikit-Learn Q&A · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.12",
 "lede": "**19 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Scikit-Learn Q&A · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "26",
   "q": "PCA vs feature selection — when to use which?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "PCA creates new uncorrelated features (linear combinations) maximizing variance; the originals are lost, hurting interpretability. Feature selection keeps a subset of the original features."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use PCA to denoise/speed up when interpretability does not matter; use feature selection when you must explain which original features drive predictions (finance, healthcare). PCA usually hurts tree models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How does PCA work, and when does it fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "PCA finds orthogonal directions (eigenvectors of the covariance matrix) of maximum variance and projects data onto the top components."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "PCA(n_components=0.95).fit_transform(X_scaled)   # keep 95% of variance"
    },
    {
     "t": "p",
     "text": "It **fails** when relationships are non-linear (variance ≠ class separability), features aren't scaled, or outliers dominate the variance."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always StandardScale before PCA; consider Kernel PCA or UMAP for non-linear structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Why does scikit-learn distinguish leaf attributes with a trailing underscore?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It is a naming convention: any attribute set during `fit` (learned from data) ends with `_` (`coef_`, `cluster_centers_`, `n_features_in_`). Constructor hyperparameters never do."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Accessing a `_` attribute before calling `fit` raises `NotFittedError` — a quick way to tell learned state from configuration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "When would you write a custom transformer, and what is the contract?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When you need preprocessing that sklearn doesn't provide (domain feature engineering, custom clipping, smoothed target encoding). Inherit `BaseEstimator` + `TransformerMixin`, implement `fit` (learn state into `_` attributes) and `transform`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Clipper(BaseEstimator, TransformerMixin):\n    def __init__(self, factor=1.5): self.factor = factor\n    def fit(self, X, y=None): self.bounds_ = ...; return self\n    def transform(self, X): return ..."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Keep `__init__` free of logic (just store args) so `get_params`/`set_params` and cloning work — required for GridSearchCV."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How do you persist a model for production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Serialize the **entire Pipeline** with `joblib` so preprocessing travels with the model."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import joblib\njoblib.dump(pipeline, 'model.joblib')\nmodel = joblib.load('model.joblib')"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pin the scikit-learn version (cross-version unpickling is unsafe), and never load joblib/pickle files from untrusted sources — they can execute arbitrary code. For language-agnostic, optimized inference, export to ONNX."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What does `cross_val_score` actually return, and how do you read it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "An array of one score per fold. Report mean ± std to convey both performance and stability."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = cross_val_score(model, X, y, cv=5, scoring='roc_auc')\nprint(f\"{s.mean():.3f} ± {s.std():.3f}\")"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A large std signals an unstable model or too-small folds. Use `cross_validate` for multiple metrics and train scores in one pass."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How do you diagnose underfitting vs overfitting in scikit-learn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Compare train and validation scores (e.g., via `learning_curve`). High bias (underfit): both low and close. High variance (overfit): train high, validation much lower."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import learning_curve\nsizes, train, val = learning_curve(model, X, y, cv=5)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Underfitting → add complexity/features; overfitting → regularize, add data, or simplify. The train–val gap is the key signal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the purpose of `random_state`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It seeds the internal RNG so stochastic operations (splits, bootstrap sampling, K-Means init, SGD shuffling) are reproducible across runs."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Set it everywhere (split, model, CV) for reproducible experiments — but never tune *over* random seeds to cherry-pick results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How do you tune preprocessing and model hyperparameters jointly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Put everything in a Pipeline and reference step parameters with the `stepname__param` syntax inside a single search."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "GridSearchCV(pipe, {\n    'prep__num__imputer__strategy': ['mean', 'median'],\n    'clf__C': [0.1, 1, 10],\n}, cv=5).fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** This searches preprocessing and model together while keeping all transforms re-fit per fold — the leak-free, idiomatic way to tune."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Random Forest vs XGBoost vs LightGBM vs CatBoost — when do you pick each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Random Forest:** bagging — many independent deep trees averaged. Robust low-effort baseline, parallel (`n_jobs=-1`), hard to overfit, but a black box and can't extrapolate.",
      "**XGBoost:** boosting with strong L1/L2 regularization, native NaN handling, GPU. Competition staple; more params, slower than LightGBM.",
      "**LightGBM:** histogram + leaf-wise growth — fastest on large data, native categoricals, low memory; `num_leaves` can overfit small datasets.",
      "**CatBoost:** ordered target encoding for categoricals, great defaults, ordered boosting reduces target leakage; slower on purely numeric data."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Start with LightGBM for speed, reach for CatBoost with many high-cardinality categoricals, use XGBoost as a well-documented strong alternative, and RF as a simple baseline. Leaf-wise (LightGBM) grows the highest-loss leaf; level-wise (XGBoost) grows balanced trees."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the bias–variance trade-off and how do you diagnose it in sklearn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Total error = bias² + variance + irreducible noise. High bias = underfitting (model too simple); high variance = overfitting (model memorizes noise). Diagnose with `learning_curve` (score vs training size) and `validation_curve` (score vs one hyperparameter): both curves low and close → high bias; large persistent train–val gap → high variance."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import learning_curve\nsizes, train, val = learning_curve(model, X, y, cv=5)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Underfit → add complexity/features; overfit → regularize, add data, or simplify. Bagging reduces variance; boosting reduces bias."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Walk through backpropagation in a 2-layer neural network.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Forward: `z1 = XW1 + b1` → `a1 = ReLU(z1)` → `z2 = a1·W2 + b2` → `a2 = softmax(z2)`. Loss `L = -Σ y·log(a2)`. Backward (chain rule from output to input):"
    },
    {
     "t": "ol",
     "items": [
      "`dz2 = a2 − y` (softmax + cross-entropy simplify to this)",
      "`dW2 = a1ᵀ·dz2`, `db2 = Σ dz2`",
      "`da1 = dz2·W2ᵀ`",
      "`dz1 = da1 ⊙ (z1 > 0)` (ReLU derivative)",
      "`dW1 = Xᵀ·dz1`, `db1 = Σ dz1`"
     ]
    },
    {
     "t": "p",
     "text": "Update each: `W -= lr·dW`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The output gradient `a2 − y` is the clean result of softmax+CE cancelling; gradients then flow backward layer by layer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How does PCA work mathematically, and when does it fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "(1) Center the data; (2) compute the covariance matrix; (3) eigen-decompose it — eigenvectors are the principal components, eigenvalues are the variance explained; (4) project onto the top-k eigenvectors. SVD is the numerically stable equivalent. It **fails** when relationships are non-linear (variance ≠ class separability), features aren't scaled, or outliers dominate the variance."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "PCA(n_components=0.95).fit_transform(X_scaled)   # keep 95% variance"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always StandardScale before PCA; for non-linear structure use Kernel PCA or UMAP. PCA usually hurts tree models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Explain Gini impurity vs entropy for decision-tree splits.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both measure node impurity. **Gini** `= 1 − Σ pᵢ²` (binary: `2p(1−p)`); **entropy** `= −Σ pᵢ·log pᵢ`. A pure node = 0; a 50/50 binary split is maximal. At each node the tree picks the split maximizing information gain = `parent_impurity − weighted_child_impurity`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Gini and entropy give very similar trees; Gini is the default because it avoids the logarithm (faster). Pure nodes have impurity 0."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Why does K-Means++ initialization beat random initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Random init can place centroids close together, causing poor convergence or empty clusters. K-Means++ picks the first centroid at random, then each subsequent one with probability proportional to squared distance from the nearest chosen centroid — spreading them out. This yields faster convergence and clustering closer to the global optimum (and is `n_init`'d to keep the best run)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It's sklearn's default (`init='k-means++'`); still set `n_init>1` because K-Means only finds a local optimum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Why scale attention scores by √dₖ in self-attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Dot products `Q·Kᵀ` have variance proportional to `dₖ` (sum of `dₖ` unit-variance products). Large values push softmax into saturation where gradients vanish, making attention nearly one-hot and untrainable. Dividing by `√dₖ` normalizes the variance back to ~1, keeping softmax in its sensitive region."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scores = Q @ K.T / np.sqrt(d_k)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Without scaling, deep transformers fail to learn — hence \"scaled dot-product attention.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "How does BPE tokenization work and why do LLMs use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Byte-Pair Encoding starts from a character-level vocabulary, then iteratively counts adjacent token pairs and merges the most frequent pair into a new token, repeating until a target vocab size. LLMs use it because it (1) handles any text with no true OOV (falls back to characters), (2) compresses common words into single tokens, (3) captures sub-word morphology (\"running\" → \"run\"+\"ning\"), and (4) gives a fixed vocabulary (~32K–100K)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** GPT models use BPE (tiktoken); BERT uses the similar WordPiece. The key trade-off is vocabulary size vs ability to represent rare words."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Greedy decoding vs beam search for sequence generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Greedy** always takes the highest-probability next token — fast `O(V·T)`, but locally-best ≠ globally-best. **Beam search** keeps the top-B partial sequences at each step `O(B·V·T)`, giving higher-quality output (standard for translation/ASR). Larger beams help up to a point, then produce generic/repetitive text."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Beam search optimizes likelihood and suits accuracy-critical tasks; for open-ended/creative generation, sampling (temperature, top-p) is preferred because beam search yields bland, repetitive text."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "From-scratch reference implementations (NumPy)",
   "body": [
    {
     "t": "p",
     "text": "Interviewers often ask you to implement core ML from scratch. Compact, correct templates:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Linear Regression (gradient descent) — dL/dw = (2/n) Xᵀ(Xw − y)\nclass LinearRegressionGD:\n    def __init__(self, lr=0.01, epochs=1000): self.lr, self.epochs = lr, epochs\n    def fit(self, X, y):\n        n, d = X.shape; self.w, self.b = np.zeros(d), 0.0\n        for _ in range(self.epochs):\n            err = (X @ self.w + self.b) - y\n            self.w -= self.lr * (2/n) * (X.T @ err)\n            self.b -= self.lr * (2/n) * err.sum()\n    def predict(self, X): return X @ self.w + self.b\n# Closed form: w = (XᵀX)⁻¹Xᵀy  → np.linalg.pinv(Xb.T@Xb)@Xb.T@y  (O(d³); use when d<10k)\n\n# Logistic Regression — sigmoid + BCE, dL/dw = (1/n) Xᵀ(ŷ − y)\ndef sigmoid(z): return 1/(1 + np.exp(-np.clip(z, -500, 500)))\n\n# KNN — brute-force Euclidean + majority vote, O(n·d) per query\ndef knn_predict(Xtr, ytr, Xte, k=5):\n    out = []\n    for x in Xte:\n        idx = np.argsort(np.sqrt(((Xtr - x)**2).sum(1)))[:k]\n        vals, cnts = np.unique(ytr[idx], return_counts=True)\n        out.append(vals[cnts.argmax()])\n    return np.array(out)\n\n# K-Means (K-Means++ init), O(n·k·d) per iteration\ndef kmeans(X, k, iters=100):\n    C = X[np.random.choice(len(X), k, replace=False)]\n    for _ in range(iters):\n        d = np.linalg.norm(X[:, None] - C, axis=2)\n        lab = d.argmin(1)\n        newC = np.array([X[lab==j].mean(0) if (lab==j).any() else C[j] for j in range(k)])\n        if np.allclose(newC, C): break\n        C = newC\n    return lab, C\n\n# Gini for decision-tree splits\ndef gini(y):\n    _, c = np.unique(y, return_counts=True); p = c/len(y); return 1 - (p**2).sum()"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Self-attention (scaled dot-product)\ndef self_attention(X, Wq, Wk, Wv):\n    Q, K, V = X@Wq, X@Wk, X@Wv\n    s = Q @ K.T / np.sqrt(Q.shape[-1])\n    a = np.exp(s - s.max(-1, keepdims=True)); a /= a.sum(-1, keepdims=True)\n    return a @ V, a\n\n# Conv2D output size: H_out = (H + 2·pad − kernel) / stride + 1\ndef conv_out(h, k, s=1, p=0): return (h + 2*p - k)//s + 1\n\n# K-Fold split from scratch (no leakage: test fold never trains)\ndef kfold(n, k=5, seed=42):\n    idx = np.arange(n); np.random.RandomState(seed).shuffle(idx)\n    sizes = np.full(k, n//k); sizes[:n%k] += 1\n    cur = 0\n    for s in sizes:\n        te = idx[cur:cur+s]; tr = np.concatenate([idx[:cur], idx[cur+s:]])\n        yield tr, te; cur += s"
    },
    {
     "t": "p",
     "text": "**Key takeaways:** Linear/logistic regression differ only by the sigmoid and loss; the gradient form `Xᵀ(ŷ − y)` is shared. Gradient boosting = gradient descent in function space (each tree fits the previous ensemble's residuals). For K-Fold, the test fold must never appear in training — that's the whole point."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
