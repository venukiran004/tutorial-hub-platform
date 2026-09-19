/* ============================================================================
   INTERVIEW I2.7 — Additional ML Theory & Depth · Additional System Design for ML · Additional MLOps & Production
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.7",
 "lede": "**8 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Additional ML Theory & Depth · Additional System Design for ML · Additional MLOps & Production",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Explain the bias-variance tradeoff with mathematical derivation (Two Sigma — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Derive the bias-variance decomposition of MSE. Show how model complexity affects each component."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nBias-Variance Decomposition:\n\nFor a model f̂(x) predicting y = f(x) + ε where ε ~ N(0, σ²):\n\nE[(y - f̂(x))²] = Bias²(f̂) + Var(f̂) + σ²\n\nWhere:\n- Bias²(f̂) = (E[f̂(x)] - f(x))²  → Error from wrong assumptions\n- Var(f̂) = E[(f̂(x) - E[f̂(x)])²]  → Sensitivity to training data\n- σ² = Irreducible error (noise)\n\nHigh bias → Underfitting (too simple)\nHigh variance → Overfitting (too complex)\n\"\"\"\n\nimport numpy as np\n\ndef bias_variance_experiment(true_fn, model_class, X_test, n_datasets=200,\n                              n_samples=50, noise_std=0.3):\n    \"\"\"Empirically measure bias and variance.\"\"\"\n    predictions = np.zeros((n_datasets, len(X_test)))\n\n    for i in range(n_datasets):\n        # Generate new training set\n        X_train = np.random.uniform(-3, 3, n_samples)\n        y_train = true_fn(X_train) + np.random.normal(0, noise_std, n_samples)\n\n        # Fit model\n        model = model_class()\n        model.fit(X_train.reshape(-1, 1), y_train)\n        predictions[i] = model.predict(X_test.reshape(-1, 1))\n\n    y_true = true_fn(X_test)\n\n    # Bias² = (mean prediction - true)²\n    mean_pred = predictions.mean(axis=0)\n    bias_sq = np.mean((mean_pred - y_true) ** 2)\n\n    # Variance = E[(prediction - mean prediction)²]\n    variance = np.mean(predictions.var(axis=0))\n\n    # Total error\n    total_error = np.mean((predictions - y_true) ** 2)\n\n    return {\n        'bias²': bias_sq,\n        'variance': variance,\n        'noise': noise_std ** 2,\n        'total_error': total_error,\n        'decomposition_check': bias_sq + variance + noise_std**2\n    }\n\n# Compare simple vs complex models\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.pipeline import make_pipeline\n\ntrue_fn = lambda x: np.sin(x) + 0.5 * x\nX_test = np.linspace(-3, 3, 100)\n\nclass PolyModel:\n    def __init__(self, degree=1):\n        self.degree = degree\n    def fit(self, X, y):\n        self.model = make_pipeline(PolynomialFeatures(self.degree), LinearRegression())\n        self.model.fit(X, y)\n    def predict(self, X):\n        return self.model.predict(X)\n\nfor degree in [1, 3, 5, 10, 15]:\n    class ModelDeg:\n        def __init__(self, d=degree):\n            self.d = d\n        def fit(self, X, y):\n            self.m = make_pipeline(PolynomialFeatures(self.d), LinearRegression()).fit(X, y)\n        def predict(self, X):\n            return self.m.predict(X)\n\n    result = bias_variance_experiment(true_fn, ModelDeg, X_test)\n    print(f\"Degree {degree:2d}: Bias²={result['bias²']:.4f}, \"\n          f\"Var={result['variance']:.4f}, Total={result['total_error']:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Simple models: high bias, low variance. Complex models: low bias, high variance. Sweet spot minimizes total error. Regularization reduces variance at cost of small bias increase. Cross-validation finds the sweet spot empirically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Explain gradient boosting internals — XGBoost vs LightGBM (Shopee — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What are the key differences between XGBoost and LightGBM? When to use each?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nGRADIENT BOOSTING: Additive ensemble of weak learners (trees)\n\nXGBoost vs LightGBM Comparison:\n\n┌─────────────────┬──────────────────────┬──────────────────────┐\n│ Aspect          │ XGBoost              │ LightGBM             │\n├─────────────────┼──────────────────────┼──────────────────────┤\n│ Tree growth     │ Level-wise (BFS)     │ Leaf-wise (best-first)│\n│ Speed           │ Slower               │ 2-10x faster         │\n│ Memory          │ Higher               │ Lower                │\n│ Accuracy        │ Similar              │ Similar/better       │\n│ Overfitting     │ More robust          │ Prone (use max_depth)│\n│ Categorical     │ Needs encoding       │ Native support       │\n│ Missing values  │ Learns direction     │ Learns direction     │\n│ Histogram       │ Optional (approx)    │ Default              │\n│ Best for        │ Small-medium data    │ Large data           │\n└─────────────────┴──────────────────────┴──────────────────────┘\n\"\"\"\n\nimport numpy as np\n\nclass GradientBoostingSimple:\n    \"\"\"Simplified gradient boosting for regression.\"\"\"\n\n    def __init__(self, n_estimators=100, learning_rate=0.1, max_depth=3):\n        self.n_estimators = n_estimators\n        self.lr = learning_rate\n        self.max_depth = max_depth\n        self.trees = []\n\n    def _build_stump(self, X, residuals, depth=0):\n        \"\"\"Build a simple decision tree stump.\"\"\"\n        if depth >= self.max_depth or len(X) < 4:\n            return np.mean(residuals)\n\n        best_mse = float('inf')\n        best_split = None\n\n        for feat in range(X.shape[1]):\n            for thresh in np.percentile(X[:, feat], np.arange(10, 100, 10)):\n                left_mask = X[:, feat] <= thresh\n                right_mask = ~left_mask\n                if sum(left_mask) < 2 or sum(right_mask) < 2:\n                    continue\n\n                mse = (np.var(residuals[left_mask]) * sum(left_mask) +\n                       np.var(residuals[right_mask]) * sum(right_mask)) / len(residuals)\n\n                if mse < best_mse:\n                    best_mse = mse\n                    best_split = (feat, thresh,\n                                  self._build_stump(X[left_mask], residuals[left_mask], depth+1),\n                                  self._build_stump(X[right_mask], residuals[right_mask], depth+1))\n\n        return best_split if best_split else np.mean(residuals)\n\n    def _predict_tree(self, x, tree):\n        if not isinstance(tree, tuple):\n            return tree\n        feat, thresh, left, right = tree\n        if x[feat] <= thresh:\n            return self._predict_tree(x, left)\n        return self._predict_tree(x, right)\n\n    def fit(self, X, y):\n        self.base_pred = np.mean(y)\n        current_pred = np.full(len(y), self.base_pred)\n\n        for i in range(self.n_estimators):\n            residuals = y - current_pred  # Negative gradient of MSE\n            tree = self._build_stump(X, residuals)\n            self.trees.append(tree)\n\n            # Update predictions\n            tree_preds = np.array([self._predict_tree(x, tree) for x in X])\n            current_pred += self.lr * tree_preds\n\n            if i % 20 == 0:\n                mse = np.mean((y - current_pred) ** 2)\n                print(f\"Iter {i}: MSE={mse:.4f}\")\n\n        return self\n\n    def predict(self, X):\n        pred = np.full(len(X), self.base_pred)\n        for tree in self.trees:\n            pred += self.lr * np.array([self._predict_tree(x, tree) for x in X])\n        return pred\n\n# XGBoost key hyperparameters\nxgb_params = {\n    'max_depth': 6,            # Tree depth (3-10)\n    'learning_rate': 0.1,      # Step size (0.01-0.3)\n    'n_estimators': 1000,      # Number of trees\n    'min_child_weight': 1,     # Min samples in leaf\n    'subsample': 0.8,          # Row sampling\n    'colsample_bytree': 0.8,   # Feature sampling\n    'reg_alpha': 0,            # L1 regularization\n    'reg_lambda': 1,           # L2 regularization\n    'gamma': 0,                # Min loss reduction for split\n    'early_stopping_rounds': 50\n}\nprint(\"XGBoost params:\", xgb_params)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** GB fits trees to negative gradient of loss. XGBoost: level-wise growth, more regularization knobs. LightGBM: leaf-wise growth, histogram binning, GOSS for faster training. Always use early stopping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Explain and implement batch normalization (NVIDIA — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Derive batch normalization forward and backward pass. Why does it help training?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass BatchNorm:\n    def __init__(self, num_features, momentum=0.1, eps=1e-5):\n        self.gamma = np.ones(num_features)   # Scale\n        self.beta = np.zeros(num_features)    # Shift\n        self.eps = eps\n        self.momentum = momentum\n\n        # Running stats for inference\n        self.running_mean = np.zeros(num_features)\n        self.running_var = np.ones(num_features)\n\n    def forward(self, x, training=True):\n        \"\"\"\n        x: (batch_size, num_features)\n\n        Forward pass:\n        1. μ = mean(x) over batch\n        2. σ² = var(x) over batch\n        3. x̂ = (x - μ) / √(σ² + ε)\n        4. y = γ * x̂ + β\n        \"\"\"\n        if training:\n            self.batch_mean = x.mean(axis=0)\n            self.batch_var = x.var(axis=0)\n\n            # Normalize\n            self.x_norm = (x - self.batch_mean) / np.sqrt(self.batch_var + self.eps)\n\n            # Update running stats\n            self.running_mean = (1 - self.momentum) * self.running_mean + self.momentum * self.batch_mean\n            self.running_var = (1 - self.momentum) * self.running_var + self.momentum * self.batch_var\n\n            # Cache for backward\n            self.x = x\n        else:\n            self.x_norm = (x - self.running_mean) / np.sqrt(self.running_var + self.eps)\n\n        return self.gamma * self.x_norm + self.beta\n\n    def backward(self, dout):\n        \"\"\"\n        Backward pass through batch norm.\n        dout: gradient from next layer (batch_size, num_features)\n        \"\"\"\n        N = dout.shape[0]\n\n        # Gradients for gamma and beta\n        self.dgamma = np.sum(dout * self.x_norm, axis=0)\n        self.dbeta = np.sum(dout, axis=0)\n\n        # Gradient through normalization\n        dx_norm = dout * self.gamma\n\n        std_inv = 1 / np.sqrt(self.batch_var + self.eps)\n\n        dx = (1 / N) * std_inv * (\n            N * dx_norm -\n            np.sum(dx_norm, axis=0) -\n            self.x_norm * np.sum(dx_norm * self.x_norm, axis=0)\n        )\n\n        return dx\n\n# Test\nnp.random.seed(42)\nx = np.random.randn(32, 64) * 5 + 3  # Batch of 32, 64 features\nbn = BatchNorm(64)\n\n# Forward\ny = bn.forward(x, training=True)\nprint(f\"Input: mean={x.mean():.2f}, std={x.std():.2f}\")\nprint(f\"Output: mean={y.mean():.4f}, std={y.std():.4f}\")\n\n# Backward\ndout = np.random.randn(32, 64)\ndx = bn.backward(dout)\nprint(f\"Gradient shape: {dx.shape}\")\n\n\"\"\"\nWhy BatchNorm helps:\n1. Reduces internal covariate shift\n2. Allows higher learning rates\n3. Acts as regularization (batch statistics add noise)\n4. Smooths loss landscape → easier optimization\n\nLayer Norm vs Batch Norm:\n- BatchNorm: normalize across batch dim → depends on batch size\n- LayerNorm: normalize across feature dim → batch-independent\n- LayerNorm preferred for NLP/Transformers (variable seq lengths)\n\"\"\""
    },
    {
     "t": "p",
     "text": "**Key Insight:** BN normalizes activations to zero mean, unit variance, then applies learnable scale/shift. Enables higher learning rates and faster convergence. Use LayerNorm for transformers (batch-independent)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Design a recommendation system for an e-commerce platform (Amazon — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design an end-to-end recommendation system handling millions of users and items."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nE-Commerce Recommendation System Design:\n\n┌───────────────┐     ┌──────────────────┐     ┌───────────────┐\n│  Data Sources │────→│  Feature Store   │────→│  Candidate    │\n│  - Clicks     │     │  - User features │     │  Generation   │\n│  - Purchases  │     │  - Item features │     │  (1M → 1000)  │\n│  - Searches   │     │  - Interactions  │     └───────┬───────┘\n└───────────────┘     └──────────────────┘             │\n                                                       ▼\n┌───────────────┐     ┌──────────────────┐     ┌───────────────┐\n│  Serving      │←────│  Re-ranking      │←────│  Scoring      │\n│  - Cache      │     │  - Diversity     │     │  (1000 → 50)  │\n│  - A/B test   │     │  - Business rules│     │  Deep model   │\n└───────────────┘     └──────────────────┘     └───────────────┘\n\nSTAGE 1: Candidate Generation (recall-focused, fast)\n- Collaborative Filtering (ALS / Matrix Factorization)\n- Content-based (TF-IDF / embeddings similarity)\n- Popular items / trending\n- User's recent history\n\nSTAGE 2: Scoring/Ranking (precision-focused, complex)\n- Deep model (Wide & Deep / DeepFM / Two-Tower)\n- Features: user profile, item attributes, context, interaction history\n- Predict P(click), P(purchase), expected revenue\n\nSTAGE 3: Re-ranking (business logic)\n- Diversity (MMR - Maximal Marginal Relevance)\n- Freshness boost for new items\n- Suppress already-purchased items\n- Sponsored items insertion\n\"\"\"\n\nimport numpy as np\nfrom scipy.sparse import csr_matrix\n\n# Stage 1: Matrix Factorization (ALS)\nclass ALSRecommender:\n    def __init__(self, n_factors=50, n_iters=20, reg=0.1):\n        self.n_factors = n_factors\n        self.n_iters = n_iters\n        self.reg = reg\n\n    def fit(self, interactions):\n        \"\"\"interactions: (n_users, n_items) sparse matrix\"\"\"\n        n_users, n_items = interactions.shape\n\n        # Initialize factors\n        self.user_factors = np.random.randn(n_users, self.n_factors) * 0.01\n        self.item_factors = np.random.randn(n_items, self.n_factors) * 0.01\n\n        R = interactions.toarray() if hasattr(interactions, 'toarray') else interactions\n\n        for iteration in range(self.n_iters):\n            # Fix items, solve for users\n            for u in range(n_users):\n                items_u = np.where(R[u] > 0)[0]\n                if len(items_u) == 0:\n                    continue\n                V_u = self.item_factors[items_u]\n                r_u = R[u, items_u]\n                self.user_factors[u] = np.linalg.solve(\n                    V_u.T @ V_u + self.reg * np.eye(self.n_factors),\n                    V_u.T @ r_u\n                )\n\n            # Fix users, solve for items\n            for i in range(n_items):\n                users_i = np.where(R[:, i] > 0)[0]\n                if len(users_i) == 0:\n                    continue\n                U_i = self.user_factors[users_i]\n                r_i = R[users_i, i]\n                self.item_factors[i] = np.linalg.solve(\n                    U_i.T @ U_i + self.reg * np.eye(self.n_factors),\n                    U_i.T @ r_i\n                )\n\n            if iteration % 5 == 0:\n                pred = self.user_factors @ self.item_factors.T\n                mask = R > 0\n                rmse = np.sqrt(np.mean((R[mask] - pred[mask]) ** 2))\n                print(f\"Iter {iteration}: RMSE={rmse:.4f}\")\n\n    def recommend(self, user_id, n=10, exclude_seen=True):\n        scores = self.user_factors[user_id] @ self.item_factors.T\n        if exclude_seen:\n            # Would mask already-interacted items\n            pass\n        return np.argsort(-scores)[:n]\n\n# Stage 3: Diversity re-ranking (MMR)\ndef mmr_rerank(scores, embeddings, lambda_=0.5, n=10):\n    \"\"\"Maximal Marginal Relevance for diverse recommendations.\"\"\"\n    selected = []\n    candidates = list(range(len(scores)))\n\n    for _ in range(n):\n        best_score = -float('inf')\n        best_idx = None\n\n        for idx in candidates:\n            relevance = scores[idx]\n\n            if selected:\n                similarities = [np.dot(embeddings[idx], embeddings[s]) /\n                              (np.linalg.norm(embeddings[idx]) * np.linalg.norm(embeddings[s]) + 1e-8)\n                              for s in selected]\n                max_sim = max(similarities)\n            else:\n                max_sim = 0\n\n            mmr_score = lambda_ * relevance - (1 - lambda_) * max_sim\n\n            if mmr_score > best_score:\n                best_score = mmr_score\n                best_idx = idx\n\n        selected.append(best_idx)\n        candidates.remove(best_idx)\n\n    return selected\n\n# Test\nR = np.random.randint(0, 2, (100, 50)).astype(float)\nals = ALSRecommender(n_factors=10, n_iters=10)\nals.fit(R)\nrecs = als.recommend(0, n=5)\nprint(f\"Recommendations for user 0: {recs}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Two-stage: candidate generation (recall) → ranking (precision). ALS for cold-start, embeddings for scale. MMR ensures diversity. A/B test with engagement metrics (CTR, conversion, revenue per session)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Design a real-time fraud detection system (Stripe — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design an ML system that detects fraudulent transactions in real-time with <100ms latency."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nFraud Detection System Architecture:\n\n┌─────────────┐    ┌──────────────────┐    ┌──────────────┐\n│ Transaction │───→│  Feature Engine  │───→│  ML Pipeline │\n│   Stream    │    │  (< 20ms)        │    │  (< 50ms)    │\n│   (Kafka)   │    │  - User history  │    │  ┌────────┐  │\n└─────────────┘    │  - Velocity      │    │  │ Rules  │  │\n                   │  - Device/IP     │    │  │ Engine │  │\n                   │  - Geo features  │    │  ├────────┤  │\n                   └──────────────────┘    │  │ ML     │  │\n                                           │  │ Model  │  │\n                   ┌──────────────────┐    │  ├────────┤  │\n                   │   Decision       │←───│  │ Graph  │  │\n                   │   Engine         │    │  │ Model  │  │\n                   │   - Allow        │    │  └────────┘  │\n                   │   - Block        │    └──────────────┘\n                   │   - Review       │\n                   └──────────────────┘\n\nLatency Budget: 100ms total\n- Feature computation: 20ms (Redis lookups)\n- Model inference: 30ms (optimized model)\n- Rules engine: 10ms\n- Network/overhead: 40ms\n\"\"\"\n\nimport numpy as np\nfrom datetime import datetime, timedelta\nfrom collections import defaultdict\n\nclass FraudFeatureEngine:\n    \"\"\"Real-time feature computation for fraud detection.\"\"\"\n\n    def __init__(self):\n        self.user_history = defaultdict(list)\n        self.device_history = defaultdict(list)\n\n    def compute_features(self, transaction):\n        user_id = transaction['user_id']\n        now = transaction['timestamp']\n\n        # Velocity features\n        recent_txns = [t for t in self.user_history[user_id]\n                       if (now - t['timestamp']).total_seconds() < 3600]\n\n        features = {\n            # Transaction features\n            'amount': transaction['amount'],\n            'amount_log': np.log1p(transaction['amount']),\n            'is_international': int(transaction.get('country') != transaction.get('home_country')),\n\n            # Velocity features (1 hour window)\n            'txn_count_1h': len(recent_txns),\n            'total_amount_1h': sum(t['amount'] for t in recent_txns),\n            'avg_amount_1h': np.mean([t['amount'] for t in recent_txns]) if recent_txns else 0,\n            'max_amount_1h': max([t['amount'] for t in recent_txns], default=0),\n\n            # Time features\n            'hour_of_day': now.hour,\n            'is_weekend': int(now.weekday() >= 5),\n            'is_night': int(now.hour < 6 or now.hour > 22),\n\n            # Deviation features\n            'amount_vs_avg': 0,  # Z-score vs user's average\n            'new_device': int(transaction.get('device_id') not in\n                            [t.get('device_id') for t in self.user_history[user_id][-100:]]),\n            'new_merchant_category': 0,\n        }\n\n        # Amount z-score\n        amounts = [t['amount'] for t in self.user_history[user_id][-100:]]\n        if len(amounts) > 5:\n            mean_amt = np.mean(amounts)\n            std_amt = np.std(amounts) + 1e-8\n            features['amount_vs_avg'] = (transaction['amount'] - mean_amt) / std_amt\n\n        # Update history\n        self.user_history[user_id].append(transaction)\n\n        return features\n\nclass FraudDetector:\n    \"\"\"Multi-layer fraud detection system.\"\"\"\n\n    def __init__(self, model=None, threshold_block=0.9, threshold_review=0.5):\n        self.feature_engine = FraudFeatureEngine()\n        self.model = model\n        self.threshold_block = threshold_block\n        self.threshold_review = threshold_review\n        self.rules = []\n\n    def add_rule(self, name, check_fn, action='block'):\n        self.rules.append({'name': name, 'check': check_fn, 'action': action})\n\n    def score(self, transaction):\n        features = self.feature_engine.compute_features(transaction)\n\n        # Layer 1: Hard rules (deterministic)\n        for rule in self.rules:\n            if rule['check'](features, transaction):\n                return {\n                    'decision': rule['action'],\n                    'reason': f\"Rule: {rule['name']}\",\n                    'score': 1.0,\n                    'features': features\n                }\n\n        # Layer 2: ML model\n        if self.model:\n            feature_vector = np.array(list(features.values())).reshape(1, -1)\n            fraud_prob = self.model.predict_proba(feature_vector)[0][1]\n        else:\n            # Heuristic fallback\n            fraud_prob = min(1.0, (\n                0.1 * features['is_international'] +\n                0.2 * features['new_device'] +\n                0.15 * features['is_night'] +\n                0.1 * min(features['txn_count_1h'] / 10, 1) +\n                0.15 * min(features['amount_vs_avg'] / 5, 1)\n            ))\n\n        # Decision\n        if fraud_prob >= self.threshold_block:\n            decision = 'block'\n        elif fraud_prob >= self.threshold_review:\n            decision = 'review'\n        else:\n            decision = 'allow'\n\n        return {\n            'decision': decision,\n            'score': fraud_prob,\n            'features': features\n        }\n\n# Setup\ndetector = FraudDetector()\ndetector.add_rule(\n    \"high_velocity\",\n    lambda f, t: f['txn_count_1h'] > 20,\n    action='block'\n)\ndetector.add_rule(\n    \"extreme_amount\",\n    lambda f, t: t['amount'] > 10000 and f['new_device'],\n    action='review'\n)\n\n# Test\ntxn = {\n    'user_id': 'u123',\n    'amount': 500,\n    'timestamp': datetime.now(),\n    'country': 'US',\n    'home_country': 'US',\n    'device_id': 'dev_abc'\n}\nresult = detector.score(txn)\nprint(f\"Decision: {result['decision']}, Score: {result['score']:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Multi-layer: rules (fast, interpretable) → ML model (nuanced) → manual review queue. Feature freshness is critical — use Redis for real-time velocity features. Class imbalance: <0.1% fraud, use focal loss or SMOTE. Monitor for concept drift (fraud patterns evolve)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Design a model monitoring and drift detection system (Databricks — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a system to detect model performance degradation and data drift in production."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nModel Monitoring Architecture:\n\n┌──────────────┐    ┌─────────────────┐    ┌───────────────┐\n│  Predictions │───→│  Monitoring     │───→│  Alert System │\n│  + Ground    │    │  Dashboard      │    │  - Slack      │\n│    Truth     │    │  - Drift scores │    │  - PagerDuty  │\n└──────────────┘    │  - Performance  │    │  - Auto-retrain│\n                    │  - Data quality │    └───────────────┘\n                    └─────────────────┘\n\"\"\"\n\nimport numpy as np\nfrom scipy import stats\nfrom collections import deque\n\nclass DataDriftDetector:\n    \"\"\"Detect data distribution shifts using statistical tests.\"\"\"\n\n    def __init__(self, reference_data, window_size=1000):\n        self.reference = reference_data\n        self.window_size = window_size\n        self.current_window = deque(maxlen=window_size)\n\n    def ks_test(self, feature_idx):\n        \"\"\"Kolmogorov-Smirnov test for distribution shift.\"\"\"\n        ref = self.reference[:, feature_idx]\n        curr = np.array(list(self.current_window))[:, feature_idx]\n        stat, p_value = stats.ks_2samp(ref, curr)\n        return {'statistic': stat, 'p_value': p_value, 'drift': p_value < 0.05}\n\n    def psi(self, feature_idx, n_bins=10):\n        \"\"\"Population Stability Index.\"\"\"\n        ref = self.reference[:, feature_idx]\n        curr = np.array(list(self.current_window))[:, feature_idx]\n\n        # Create bins from reference data\n        bins = np.percentile(ref, np.linspace(0, 100, n_bins + 1))\n        bins[0], bins[-1] = -np.inf, np.inf\n\n        ref_counts = np.histogram(ref, bins=bins)[0] / len(ref)\n        curr_counts = np.histogram(curr, bins=bins)[0] / len(curr)\n\n        # Avoid log(0)\n        ref_counts = np.clip(ref_counts, 0.001, None)\n        curr_counts = np.clip(curr_counts, 0.001, None)\n\n        psi = np.sum((curr_counts - ref_counts) * np.log(curr_counts / ref_counts))\n\n        # PSI interpretation: <0.1 no drift, 0.1-0.25 moderate, >0.25 significant\n        return {'psi': psi, 'drift': 'none' if psi < 0.1 else 'moderate' if psi < 0.25 else 'significant'}\n\n    def add_batch(self, data):\n        for row in data:\n            self.current_window.append(row)\n\nclass ConceptDriftDetector:\n    \"\"\"Detect prediction performance degradation.\"\"\"\n\n    def __init__(self, window_size=500, threshold=0.05):\n        self.window_size = window_size\n        self.threshold = threshold\n        self.errors = deque(maxlen=window_size * 2)\n\n    def page_hinkley_test(self):\n        \"\"\"Page-Hinkley test for change detection.\"\"\"\n        if len(self.errors) < self.window_size:\n            return {'drift': False, 'reason': 'insufficient data'}\n\n        errors = np.array(self.errors)\n        cumsum = np.cumsum(errors - np.mean(errors))\n\n        m_t = cumsum[-1]\n        M_t = np.max(cumsum)\n\n        ph_stat = M_t - m_t\n        return {\n            'drift': ph_stat > self.threshold * len(errors),\n            'ph_statistic': ph_stat,\n            'mean_error': np.mean(errors[-self.window_size:])\n        }\n\n    def add_prediction(self, y_true, y_pred):\n        error = abs(y_true - y_pred)\n        self.errors.append(error)\n\nclass ModelMonitor:\n    \"\"\"Complete model monitoring system.\"\"\"\n\n    def __init__(self, reference_data, reference_labels, reference_preds):\n        self.data_drift = DataDriftDetector(reference_data)\n        self.concept_drift = ConceptDriftDetector()\n\n        # Baseline metrics\n        self.baseline_metrics = self._compute_metrics(reference_labels, reference_preds)\n        self.alerts = []\n\n    def _compute_metrics(self, y_true, y_pred):\n        return {\n            'accuracy': np.mean(y_true == (y_pred > 0.5).astype(int)),\n            'mean_prediction': np.mean(y_pred),\n            'prediction_std': np.std(y_pred),\n        }\n\n    def monitor_batch(self, X_batch, y_true_batch, y_pred_batch):\n        \"\"\"Monitor a batch of predictions.\"\"\"\n        report = {'timestamp': 'now', 'alerts': []}\n\n        # Data drift check\n        self.data_drift.add_batch(X_batch)\n        if len(self.data_drift.current_window) >= self.data_drift.window_size:\n            for feat_idx in range(X_batch.shape[1]):\n                psi_result = self.data_drift.psi(feat_idx)\n                if psi_result['drift'] != 'none':\n                    report['alerts'].append(\n                        f\"Data drift on feature {feat_idx}: PSI={psi_result['psi']:.4f} ({psi_result['drift']})\"\n                    )\n\n        # Performance drift\n        current_metrics = self._compute_metrics(y_true_batch, y_pred_batch)\n        for metric, value in current_metrics.items():\n            baseline = self.baseline_metrics[metric]\n            if abs(value - baseline) / (baseline + 1e-8) > 0.1:\n                report['alerts'].append(\n                    f\"Performance drift: {metric} changed from {baseline:.4f} to {value:.4f}\"\n                )\n\n        report['metrics'] = current_metrics\n        report['n_alerts'] = len(report['alerts'])\n\n        return report\n\n# Test\nnp.random.seed(42)\nref_X = np.random.randn(1000, 5)\nref_y = (ref_X[:, 0] + ref_X[:, 1] > 0).astype(int)\nref_preds = ref_y + np.random.randn(1000) * 0.1\n\nmonitor = ModelMonitor(ref_X, ref_y, ref_preds)\n\n# Simulate drift\ndrifted_X = np.random.randn(1000, 5) + 2  # Shifted distribution\ndrifted_y = (drifted_X[:, 0] + drifted_X[:, 1] > 0).astype(int)\ndrifted_preds = drifted_y + np.random.randn(1000) * 0.3\n\nreport = monitor.monitor_batch(drifted_X, drifted_y, drifted_preds)\nprint(f\"Alerts ({report['n_alerts']}):\")\nfor alert in report['alerts']:\n    print(f\"  ⚠️  {alert}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Monitor three levels: data drift (PSI, KS-test), concept drift (performance degradation), prediction drift (output distribution). PSI < 0.1 is stable. Automated retraining triggers when drift exceeds thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Design a CI/CD pipeline for ML models (Google — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you build a CI/CD pipeline specifically for ML models? What's different from software CI/CD?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nML CI/CD Pipeline — Key Differences from Software CI/CD:\n\nSOFTWARE CI/CD:          ML CI/CD:\nCode → Build → Test      Code → Train → Validate → Deploy\n                          Data → Feature Eng → Model → Monitor\n\n┌────────────────────────────────────────────────────────────┐\n│                    ML CI/CD Pipeline                        │\n├────────────────────────────────────────────────────────────┤\n│                                                            │\n│  1. CODE TRIGGER                                           │\n│     - Git push / PR merge                                  │\n│     - Data version change (DVC)                            │\n│     - Scheduled retraining (drift detected)                │\n│                                                            │\n│  2. DATA VALIDATION                                        │\n│     - Schema validation (Great Expectations)               │\n│     - Distribution checks (reference vs current)           │\n│     - Missing value thresholds                             │\n│     - Feature range validation                             │\n│                                                            │\n│  3. TRAINING                                               │\n│     - Reproducible (fixed seeds, versioned data)           │\n│     - Experiment tracking (MLflow/W&B)                     │\n│     - Hyperparameter tuning (Optuna)                       │\n│     - Resource management (GPU allocation)                 │\n│                                                            │\n│  4. MODEL VALIDATION                                       │\n│     - Performance thresholds (AUC > 0.85)                  │\n│     - Comparison vs champion model                         │\n│     - Bias/fairness checks                                 │\n│     - Latency benchmarks (< 50ms p99)                      │\n│     - Edge case testing                                    │\n│                                                            │\n│  5. REGISTRY                                               │\n│     - Model versioning (MLflow Model Registry)             │\n│     - Artifact storage (S3/GCS)                            │\n│     - Metadata (training data hash, metrics, params)       │\n│                                                            │\n│  6. DEPLOYMENT                                             │\n│     - Shadow deployment (log predictions, don't serve)     │\n│     - Canary deployment (5% → 25% → 100%)                 │\n│     - A/B testing                                          │\n│     - Rollback plan                                        │\n│                                                            │\n│  7. MONITORING                                             │\n│     - Data drift (PSI)                                     │\n│     - Model performance (delayed labels)                   │\n│     - Infrastructure (latency, throughput, errors)         │\n│     - Automated retraining triggers                        │\n└────────────────────────────────────────────────────────────┘\n\"\"\"\n\n# Example: Model validation gate\nclass ModelValidationGate:\n    \"\"\"Automated model quality checks before deployment.\"\"\"\n\n    def __init__(self):\n        self.checks = []\n        self.results = []\n\n    def add_check(self, name, check_fn, blocking=True):\n        self.checks.append({'name': name, 'fn': check_fn, 'blocking': blocking})\n\n    def validate(self, model, X_test, y_test, champion_metrics=None):\n        all_passed = True\n\n        for check in self.checks:\n            try:\n                passed, details = check['fn'](model, X_test, y_test, champion_metrics)\n                status = '✅' if passed else ('❌' if check['blocking'] else '⚠️')\n                self.results.append({\n                    'check': check['name'],\n                    'passed': passed,\n                    'blocking': check['blocking'],\n                    'details': details\n                })\n                print(f\"{status} {check['name']}: {details}\")\n\n                if not passed and check['blocking']:\n                    all_passed = False\n\n            except Exception as e:\n                print(f\"❌ {check['name']}: ERROR - {e}\")\n                all_passed = False\n\n        return all_passed\n\n# Setup validation gate\ngate = ModelValidationGate()\n\ngate.add_check(\"min_auc\", lambda m, X, y, c: (\n    (auc := 0.88) >= 0.85, f\"AUC={auc:.4f} (threshold: 0.85)\"\n), blocking=True)\n\ngate.add_check(\"beats_champion\", lambda m, X, y, c: (\n    (auc := 0.88) > (c or {}).get('auc', 0.0),\n    f\"Challenger AUC={auc:.4f} vs Champion={c.get('auc', 'N/A') if c else 'N/A'}\"\n), blocking=True)\n\ngate.add_check(\"latency\", lambda m, X, y, c: (\n    (lat := 15) < 50, f\"p99 latency={lat}ms (threshold: 50ms)\"\n), blocking=True)\n\ngate.add_check(\"bias_check\", lambda m, X, y, c: (\n    True, \"Demographic parity ratio=0.92 (threshold: 0.8)\"\n), blocking=False)\n\n# Run validation\nchampion = {'auc': 0.86, 'accuracy': 0.91}\npassed = gate.validate(None, None, None, champion)\nprint(f\"\\nDeployment {'APPROVED ✅' if passed else 'BLOCKED ❌'}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** ML CI/CD adds data validation, model quality gates, champion-challenger comparison, and post-deployment monitoring. Shadow mode → canary → full rollout. Always have a rollback plan. Test data drift, not just code."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Explain model serving strategies — batch vs real-time vs streaming (Meta — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare batch, real-time, and streaming inference. When to use each?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nModel Serving Strategies:\n\n┌──────────────┬──────────────┬──────────────┬──────────────┐\n│ Aspect       │ Batch        │ Real-time    │ Streaming    │\n├──────────────┼──────────────┼──────────────┼──────────────┤\n│ Latency      │ Hours        │ <100ms       │ Seconds      │\n│ Throughput   │ Very high    │ Medium       │ High         │\n│ Use case     │ Reports,     │ API, search  │ Fraud, feeds │\n│              │ email recs   │ autocomplete │ anomaly det  │\n│ Infra        │ Spark/Airflow│ FastAPI/gRPC │ Flink/Kafka  │\n│ Cost         │ Low (spot)   │ High (GPU)   │ Medium       │\n│ Freshness    │ Stale        │ Fresh        │ Near-fresh   │\n└──────────────┴──────────────┴──────────────┴──────────────┘\n\"\"\"\n\nimport numpy as np\nfrom dataclasses import dataclass\nfrom typing import Dict, List\nfrom datetime import datetime\nimport json\n\n# Real-time serving with caching\nclass ModelServer:\n    def __init__(self, model, cache_ttl=300):\n        self.model = model\n        self.cache = {}\n        self.cache_ttl = cache_ttl\n        self.request_count = 0\n        self.cache_hits = 0\n\n    def predict(self, features: Dict) -> Dict:\n        self.request_count += 1\n\n        # Check cache\n        cache_key = json.dumps(features, sort_keys=True)\n        if cache_key in self.cache:\n            cached = self.cache[cache_key]\n            if (datetime.now() - cached['timestamp']).seconds < self.cache_ttl:\n                self.cache_hits += 1\n                return cached['result']\n\n        # Model inference\n        feature_vector = np.array(list(features.values())).reshape(1, -1)\n        prediction = float(self.model.predict(feature_vector)[0])\n\n        result = {\n            'prediction': prediction,\n            'model_version': '2.1.0',\n            'latency_ms': 12,\n            'timestamp': datetime.now().isoformat()\n        }\n\n        # Cache result\n        self.cache[cache_key] = {'result': result, 'timestamp': datetime.now()}\n\n        return result\n\n    @property\n    def cache_hit_rate(self):\n        return self.cache_hits / max(self.request_count, 1)\n\n# Batch inference pipeline\nclass BatchInferencePipeline:\n    def __init__(self, model, batch_size=1024):\n        self.model = model\n        self.batch_size = batch_size\n\n    def run(self, data_path: str, output_path: str):\n        \"\"\"Process large dataset in batches.\"\"\"\n        # Simulate\n        total_records = 1000000\n        processed = 0\n\n        for batch_start in range(0, total_records, self.batch_size):\n            batch_end = min(batch_start + self.batch_size, total_records)\n            batch_size = batch_end - batch_start\n\n            # Read batch, predict, write\n            X_batch = np.random.randn(batch_size, 10)\n            predictions = self.model.predict(X_batch)\n\n            processed += batch_size\n            if processed % 100000 == 0:\n                print(f\"Processed {processed:,}/{total_records:,}\")\n\n        print(f\"Batch inference complete: {total_records:,} records\")\n\n# Model optimization for serving\n\"\"\"\nOptimization Techniques for Low Latency:\n\n1. MODEL COMPRESSION\n   - Quantization: FP32 → INT8 (2-4x speedup)\n   - Pruning: Remove near-zero weights (30-50% reduction)\n   - Knowledge distillation: Train small model from large one\n\n2. INFRASTRUCTURE\n   - ONNX Runtime (cross-framework optimization)\n   - TensorRT (NVIDIA GPU optimization)\n   - Model caching (Redis/Memcached)\n\n3. BATCHING\n   - Dynamic batching: Wait N ms, batch requests\n   - Async processing with queues\n\n4. ARCHITECTURE\n   - Feature store pre-computation\n   - Two-tower models (pre-compute item embeddings)\n   - Cascade: cheap model filters, expensive model scores top-k\n\"\"\"\nprint(\"Serving strategies loaded\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Choose based on latency requirements. Batch for non-time-sensitive (reports, emails). Real-time for user-facing (<100ms). Streaming for continuous data (fraud, anomalies). Most systems use hybrid: batch for features, real-time for scoring."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
