/* ============================================================================
   INTERVIEW I2.6 — System Design for ML · MLOps & Production · Math & Optimization · Behavioral & Projects · Additional Coding & ML Implementation
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.6",
 "lede": "**13 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "System Design for ML · MLOps & Production · Math & Optimization · Behavioral & Projects · Additional Coding & ML Implementation",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Design an API Rate Limiter (Atlassian â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a rate limiter for an API that limits requests per user."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import time\nfrom collections import defaultdict, deque\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SLIDING WINDOW COUNTER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\nclass SlidingWindowRateLimiter:\n    def __init__(self, max_requests, window_seconds):\n        self.max_requests = max_requests\n        self.window = window_seconds\n        self.requests = defaultdict(deque)  # user_id â†’ timestamps\n\n    def is_allowed(self, user_id):\n        now = time.time()\n        window_start = now - self.window\n\n        # Remove expired requests\n        user_queue = self.requests[user_id]\n        while user_queue and user_queue[0] < window_start:\n            user_queue.popleft()\n\n        # Check limit\n        if len(user_queue) < self.max_requests:\n            user_queue.append(now)\n            return True\n        return False\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOKEN BUCKET ALGORITHM â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\nclass TokenBucketRateLimiter:\n    def __init__(self, rate, capacity):\n        \"\"\"\n        rate: tokens added per second\n        capacity: max tokens (burst size)\n        \"\"\"\n        self.rate = rate\n        self.capacity = capacity\n        self.buckets = {}  # user_id â†’ (tokens, last_refill)\n\n    def is_allowed(self, user_id):\n        now = time.time()\n\n        if user_id not in self.buckets:\n            self.buckets[user_id] = (self.capacity - 1, now)\n            return True\n\n        tokens, last_refill = self.buckets[user_id]\n\n        # Refill tokens\n        elapsed = now - last_refill\n        tokens = min(self.capacity, tokens + elapsed * self.rate)\n\n        if tokens >= 1:\n            self.buckets[user_id] = (tokens - 1, now)\n            return True\n\n        self.buckets[user_id] = (tokens, now)\n        return False\n\n# Usage\nlimiter = TokenBucketRateLimiter(rate=10, capacity=100)\n# Allows burst of 100 requests, then 10/second sustained"
    },
    {
     "t": "p",
     "text": "**Distributed Rate Limiter (production):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import redis\n\nclass DistributedRateLimiter:\n    def __init__(self, redis_client, max_requests, window_seconds):\n        self.redis = redis_client\n        self.max_requests = max_requests\n        self.window = window_seconds\n\n    def is_allowed(self, user_id):\n        key = f\"rate_limit:{user_id}\"\n        pipe = self.redis.pipeline()\n\n        now = time.time()\n        pipe.zremrangebyscore(key, 0, now - self.window)\n        pipe.zcard(key)\n        pipe.zadd(key, {str(now): now})\n        pipe.expire(key, self.window)\n\n        results = pipe.execute()\n        request_count = results[1]\n\n        return request_count < self.max_requests"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Design an ML Labelling System (Atlassian â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a system for labelling ML training data at scale."
    },
    {
     "t": "p",
     "text": "**Architecture:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”\nâ”‚                    ML Labelling System                   â”‚\nâ”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤\nâ”‚  Data Store â”‚  Task Queue  â”‚ Label UI     â”‚ Quality     â”‚\nâ”‚  (S3/GCS)   â”‚  (Celery/    â”‚ (React/      â”‚ Assurance   â”‚\nâ”‚             â”‚   Redis)     â”‚  custom)     â”‚ Engine      â”‚\nâ”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤\nâ”‚             â”‚              â”‚              â”‚             â”‚\nâ”‚ Raw data    â”‚ Task assign  â”‚ Annotation   â”‚ Inter-rater â”‚\nâ”‚ Metadata    â”‚ Priority     â”‚ interface    â”‚ agreement   â”‚\nâ”‚ Versioning  â”‚ Load balance â”‚ Hotkeys      â”‚ Gold sets   â”‚\nâ”‚             â”‚              â”‚ Guidelines   â”‚ Consensus   â”‚\nâ””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜"
    },
    {
     "t": "p",
     "text": "**Key components:**"
    },
    {
     "t": "ol",
     "items": [
      "**Task management:** Queue-based assignment, avoid duplicate labelling",
      "**Quality control:** Gold standard items (known answers), inter-annotator agreement (Cohen's Kappa)",
      "**Active learning:** Prioritize uncertain samples for labelling",
      "**Versioning:** Track label changes over time"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Active Learning for prioritized labelling\nfrom sklearn.ensemble import RandomForestClassifier\nimport numpy as np\n\nclass ActiveLearningLabeller:\n    def __init__(self, model=None):\n        self.model = model or RandomForestClassifier()\n        self.labelled_X, self.labelled_y = [], []\n\n    def get_most_uncertain(self, unlabelled_X, n=10):\n        \"\"\"Select samples with highest uncertainty.\"\"\"\n        if len(self.labelled_X) < 10:\n            # Random sampling initially\n            indices = np.random.choice(len(unlabelled_X), n, replace=False)\n            return indices\n\n        # Train on labelled data\n        self.model.fit(self.labelled_X, self.labelled_y)\n\n        # Get prediction probabilities\n        probs = self.model.predict_proba(unlabelled_X)\n\n        # Uncertainty = entropy\n        entropy = -np.sum(probs * np.log(probs + 1e-10), axis=1)\n\n        # Return indices of most uncertain\n        return np.argsort(entropy)[-n:]\n\n    def add_label(self, x, y):\n        self.labelled_X.append(x)\n        self.labelled_y.append(y)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Code Formal Verification (PathAI â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you ensure correctness of ML code? Discuss formal verification approaches."
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Layer",
      "Tool/Approach",
      "What It Catches"
     ],
     "rows": [
      [
       "**Type checking**",
       "mypy, pyright",
       "Type mismatches, None errors"
      ],
      [
       "**Unit tests**",
       "pytest",
       "Logic errors, edge cases"
      ],
      [
       "**Property testing**",
       "Hypothesis",
       "Unexpected input combinations"
      ],
      [
       "**Data validation**",
       "Great Expectations, Pandera",
       "Schema drift, data quality"
      ],
      [
       "**Model validation**",
       "Custom assertions",
       "Performance regression"
      ],
      [
       "**Integration tests**",
       "pytest + fixtures",
       "Pipeline failures"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Type checking with mypy\nfrom typing import List, Optional\nimport numpy as np\n\ndef predict(features: np.ndarray, threshold: float = 0.5) -> List[int]:\n    \"\"\"Type-safe prediction function.\"\"\"\n    assert features.ndim == 2, f\"Expected 2D array, got {features.ndim}D\"\n    # ... model inference ...\n    return [1 if p > threshold else 0 for p in probabilities]\n\n# Property-based testing with Hypothesis\nfrom hypothesis import given, strategies as st\n\n@given(st.lists(st.floats(min_value=0, max_value=1), min_size=1))\ndef test_predictions_are_binary(probabilities):\n    \"\"\"Property: predictions must always be 0 or 1.\"\"\"\n    preds = [1 if p > 0.5 else 0 for p in probabilities]\n    assert all(p in {0, 1} for p in preds)\n\n# Data validation with Pandera\nimport pandera as pa\n\nschema = pa.DataFrameSchema({\n    \"age\": pa.Column(int, pa.Check.in_range(0, 150)),\n    \"income\": pa.Column(float, pa.Check.ge(0)),\n    \"label\": pa.Column(int, pa.Check.isin([0, 1])),\n})\n\nvalidated_df = schema.validate(df)  # Raises error if schema violated\n\n# Model performance assertions\ndef test_model_performance(model, X_test, y_test):\n    from sklearn.metrics import accuracy_score, f1_score\n\n    preds = model.predict(X_test)\n    accuracy = accuracy_score(y_test, preds)\n    f1 = f1_score(y_test, preds, average='weighted')\n\n    assert accuracy > 0.85, f\"Accuracy {accuracy:.3f} below threshold 0.85\"\n    assert f1 > 0.80, f\"F1 {f1:.3f} below threshold 0.80\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Explain backpropagation step by step",
   "body": [
    {
     "t": "p",
     "text": "**Forward pass â†’ Compute loss â†’ Backward pass â†’ Update weights**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# Simple 2-layer neural network from scratch\nclass SimpleNN:\n    def __init__(self, input_size, hidden_size, output_size):\n        # Xavier initialization\n        self.W1 = np.random.randn(input_size, hidden_size) * np.sqrt(2.0 / input_size)\n        self.b1 = np.zeros((1, hidden_size))\n        self.W2 = np.random.randn(hidden_size, output_size) * np.sqrt(2.0 / hidden_size)\n        self.b2 = np.zeros((1, output_size))\n\n    def relu(self, z):\n        return np.maximum(0, z)\n\n    def relu_derivative(self, z):\n        return (z > 0).astype(float)\n\n    def sigmoid(self, z):\n        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))\n\n    def forward(self, X):\n        # Layer 1\n        self.z1 = X @ self.W1 + self.b1\n        self.a1 = self.relu(self.z1)\n        # Layer 2\n        self.z2 = self.a1 @ self.W2 + self.b2\n        self.a2 = self.sigmoid(self.z2)\n        return self.a2\n\n    def backward(self, X, y, output, lr=0.01):\n        m = X.shape[0]\n\n        # Output layer gradients\n        dz2 = output - y                          # (m, output_size)\n        dW2 = (self.a1.T @ dz2) / m               # (hidden, output)\n        db2 = np.sum(dz2, axis=0, keepdims=True) / m\n\n        # Hidden layer gradients (chain rule!)\n        dz1 = (dz2 @ self.W2.T) * self.relu_derivative(self.z1)\n        dW1 = (X.T @ dz1) / m\n        db1 = np.sum(dz1, axis=0, keepdims=True) / m\n\n        # Update weights\n        self.W2 -= lr * dW2\n        self.b2 -= lr * db2\n        self.W1 -= lr * dW1\n        self.b1 -= lr * db1"
    },
    {
     "t": "p",
     "text": "**Chain rule in backprop:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial L}{\\partial W_1} = \\frac{\\partial L}{\\partial a_2} \\cdot \\frac{\\partial a_2}{\\partial z_2} \\cdot \\frac{\\partial z_2}{\\partial a_1} \\cdot \\frac{\\partial a_1}{\\partial z_1} \\cdot \\frac{\\partial z_1}{\\partial W_1}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Derive the gradient for logistic regression",
   "body": [
    {
     "t": "math",
     "tex": "L(\\theta) = -\\frac{1}{m}\\sum_{i=1}^{m}\\left[y_i \\log(h_\\theta(x_i)) + (1-y_i)\\log(1-h_\\theta(x_i))\\right]"
    },
    {
     "t": "p",
     "text": "Where \\(h_\\theta(x) = \\sigma(\\theta^T x) = \\frac{1}{1+e^{-\\theta^T x}}\\)"
    },
    {
     "t": "p",
     "text": "**Gradient:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial L}{\\partial \\theta_j} = \\frac{1}{m}\\sum_{i=1}^{m}(h_\\theta(x_i) - y_i) \\cdot x_{ij}"
    },
    {
     "t": "p",
     "text": "**Vectorized:**"
    },
    {
     "t": "math",
     "tex": "\\nabla_\\theta L = \\frac{1}{m} X^T (\\sigma(X\\theta) - y)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def logistic_regression_gradient(X, y, theta):\n    m = len(y)\n    h = 1 / (1 + np.exp(-X @ theta))  # predictions\n    gradient = (1/m) * X.T @ (h - y)\n    return gradient"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Tell me about your projects (ByteDance â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Framework for answering:**"
    },
    {
     "t": "table",
     "head": [
      "Component",
      "What to Cover"
     ],
     "rows": [
      [
       "**Problem**",
       "Business problem, why ML was needed"
      ],
      [
       "**Data**",
       "Size, sources, preprocessing challenges"
      ],
      [
       "**Approach**",
       "Model choice, why this architecture"
      ],
      [
       "**Challenges**",
       "Scaling, accuracy, deployment issues"
      ],
      [
       "**Impact**",
       "Metrics improved, business value"
      ],
      [
       "**Learnings**",
       "What you'd do differently"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Example answer structure:**"
    },
    {
     "t": "quote",
     "text": "\"At [Company], we needed to reduce customer churn by 20%. I built an XGBoost model on 2M user records with 150 features. Main challenge was class imbalance (5% churn rate) â€” solved with SMOTE + class weights. Deployed on AWS SageMaker with real-time inference. Reduced churn by 23% in Q1, saving $1.2M ARR. Key learning: feature engineering (user engagement patterns) mattered more than model architecture.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Implement K-Means clustering from scratch (Google — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build K-Means clustering without using sklearn. Include initialization strategies."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass KMeans:\n    def __init__(self, k=3, max_iters=100, init='kmeans++'):\n        self.k = k\n        self.max_iters = max_iters\n        self.init = init\n\n    def _init_centroids(self, X):\n        if self.init == 'random':\n            indices = np.random.choice(len(X), self.k, replace=False)\n            return X[indices].copy()\n\n        # K-Means++ initialization\n        centroids = [X[np.random.randint(len(X))]]\n        for _ in range(1, self.k):\n            distances = np.min([np.sum((X - c)**2, axis=1) for c in centroids], axis=0)\n            probs = distances / distances.sum()\n            centroids.append(X[np.random.choice(len(X), p=probs)])\n        return np.array(centroids)\n\n    def fit(self, X):\n        self.centroids = self._init_centroids(X)\n\n        for _ in range(self.max_iters):\n            # Assign clusters\n            distances = np.array([np.sum((X - c)**2, axis=1) for c in self.centroids])\n            labels = np.argmin(distances, axis=0)\n\n            # Update centroids\n            new_centroids = np.array([X[labels == i].mean(axis=0)\n                                      if np.any(labels == i) else self.centroids[i]\n                                      for i in range(self.k)])\n\n            if np.allclose(self.centroids, new_centroids):\n                break\n            self.centroids = new_centroids\n\n        self.labels_ = labels\n        self.inertia_ = sum(np.sum((X[labels == i] - self.centroids[i])**2)\n                           for i in range(self.k))\n        return self\n\n    def predict(self, X):\n        distances = np.array([np.sum((X - c)**2, axis=1) for c in self.centroids])\n        return np.argmin(distances, axis=0)\n\n# Elbow method\nfrom sklearn.datasets import make_blobs\nX, _ = make_blobs(n_samples=300, centers=4, random_state=42)\n\ninertias = []\nfor k in range(1, 10):\n    km = KMeans(k=k)\n    km.fit(X)\n    inertias.append(km.inertia_)\n    print(f\"k={k}: inertia={km.inertia_:.1f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** K-Means++ initialization avoids poor convergence. Elbow method for optimal k. Inertia = within-cluster sum of squares. K-Means assumes spherical clusters with equal variance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Implement logistic regression with gradient descent (Meta — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build binary logistic regression from scratch including regularization."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass LogisticRegression:\n    def __init__(self, lr=0.01, n_iters=1000, reg='l2', lambda_=0.01):\n        self.lr = lr\n        self.n_iters = n_iters\n        self.reg = reg\n        self.lambda_ = lambda_\n\n    def _sigmoid(self, z):\n        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))\n\n    def _loss(self, y, y_hat):\n        # Binary cross-entropy + regularization\n        bce = -np.mean(y * np.log(y_hat + 1e-8) + (1 - y) * np.log(1 - y_hat + 1e-8))\n        if self.reg == 'l2':\n            bce += self.lambda_ * np.sum(self.weights**2) / (2 * len(y))\n        elif self.reg == 'l1':\n            bce += self.lambda_ * np.sum(np.abs(self.weights)) / len(y)\n        return bce\n\n    def fit(self, X, y):\n        n_samples, n_features = X.shape\n        self.weights = np.zeros(n_features)\n        self.bias = 0\n        self.losses = []\n\n        for i in range(self.n_iters):\n            z = X @ self.weights + self.bias\n            y_hat = self._sigmoid(z)\n\n            # Gradients\n            dw = (1 / n_samples) * (X.T @ (y_hat - y))\n            db = (1 / n_samples) * np.sum(y_hat - y)\n\n            # Add regularization gradient\n            if self.reg == 'l2':\n                dw += (self.lambda_ / n_samples) * self.weights\n            elif self.reg == 'l1':\n                dw += (self.lambda_ / n_samples) * np.sign(self.weights)\n\n            self.weights -= self.lr * dw\n            self.bias -= self.lr * db\n\n            if i % 100 == 0:\n                loss = self._loss(y, y_hat)\n                self.losses.append(loss)\n\n        return self\n\n    def predict_proba(self, X):\n        return self._sigmoid(X @ self.weights + self.bias)\n\n    def predict(self, X, threshold=0.5):\n        return (self.predict_proba(X) >= threshold).astype(int)\n\n# Test\nfrom sklearn.datasets import make_classification\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_classification(n_samples=1000, n_features=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\n\nmodel = LogisticRegression(lr=0.1, n_iters=1000, reg='l2', lambda_=0.01)\nmodel.fit(X_train, y_train)\npreds = model.predict(X_test)\naccuracy = np.mean(preds == y_test)\nprint(f\"Accuracy: {accuracy:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Sigmoid squashes to [0,1]. BCE loss is convex → guaranteed convergence. L2 regularization shrinks weights, L1 produces sparsity. Clip sigmoid input to avoid overflow."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Implement a neural network from scratch — forward & backprop (Amazon — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a 2-layer neural network with backpropagation for classification."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass NeuralNetwork:\n    def __init__(self, input_dim, hidden_dim, output_dim, lr=0.01):\n        self.lr = lr\n        # Xavier initialization\n        self.W1 = np.random.randn(input_dim, hidden_dim) * np.sqrt(2.0 / input_dim)\n        self.b1 = np.zeros((1, hidden_dim))\n        self.W2 = np.random.randn(hidden_dim, output_dim) * np.sqrt(2.0 / hidden_dim)\n        self.b2 = np.zeros((1, output_dim))\n\n    def _relu(self, z):\n        return np.maximum(0, z)\n\n    def _relu_deriv(self, z):\n        return (z > 0).astype(float)\n\n    def _softmax(self, z):\n        exp_z = np.exp(z - np.max(z, axis=1, keepdims=True))\n        return exp_z / exp_z.sum(axis=1, keepdims=True)\n\n    def forward(self, X):\n        self.z1 = X @ self.W1 + self.b1\n        self.a1 = self._relu(self.z1)\n        self.z2 = self.a1 @ self.W2 + self.b2\n        self.a2 = self._softmax(self.z2)\n        return self.a2\n\n    def backward(self, X, y_onehot):\n        m = X.shape[0]\n\n        # Output layer gradient\n        dz2 = self.a2 - y_onehot  # softmax + cross-entropy shortcut\n        dW2 = (1/m) * self.a1.T @ dz2\n        db2 = (1/m) * np.sum(dz2, axis=0, keepdims=True)\n\n        # Hidden layer gradient\n        dz1 = (dz2 @ self.W2.T) * self._relu_deriv(self.z1)\n        dW1 = (1/m) * X.T @ dz1\n        db1 = (1/m) * np.sum(dz1, axis=0, keepdims=True)\n\n        # Update\n        self.W2 -= self.lr * dW2\n        self.b2 -= self.lr * db2\n        self.W1 -= self.lr * dW1\n        self.b1 -= self.lr * db1\n\n    def train(self, X, y, epochs=100):\n        n_classes = len(np.unique(y))\n        y_onehot = np.eye(n_classes)[y]\n\n        for epoch in range(epochs):\n            probs = self.forward(X)\n            self.backward(X, y_onehot)\n\n            if epoch % 20 == 0:\n                loss = -np.mean(np.sum(y_onehot * np.log(probs + 1e-8), axis=1))\n                acc = np.mean(np.argmax(probs, axis=1) == y)\n                print(f\"Epoch {epoch}: loss={loss:.4f}, acc={acc:.4f}\")\n\n    def predict(self, X):\n        return np.argmax(self.forward(X), axis=1)\n\n# Test on Iris\nfrom sklearn.datasets import load_iris\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = load_iris(return_X_y=True)\nX = StandardScaler().fit_transform(X)\nnn = NeuralNetwork(4, 16, 3, lr=0.1)\nnn.train(X, y, epochs=200)\nprint(f\"Final accuracy: {np.mean(nn.predict(X) == y):.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Xavier init prevents vanishing/exploding gradients. Softmax + cross-entropy gradient simplifies to (predicted - actual). ReLU derivative is just 0 or 1. Batch norm and dropout would be added in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Implement random forest from scratch (Databricks — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a random forest classifier with bagging and feature subsampling."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom collections import Counter\n\nclass DecisionTreeSimple:\n    def __init__(self, max_depth=5, min_samples=2, n_features=None):\n        self.max_depth = max_depth\n        self.min_samples = min_samples\n        self.n_features = n_features  # For random subspace\n\n    def _entropy(self, y):\n        counts = Counter(y)\n        probs = [c / len(y) for c in counts.values()]\n        return -sum(p * np.log2(p) for p in probs if p > 0)\n\n    def _best_split(self, X, y):\n        best_gain, best_feat, best_thresh = 0, None, None\n        parent_ent = self._entropy(y)\n\n        # Random feature subset\n        features = np.random.choice(X.shape[1], self.n_features, replace=False)\n\n        for feat in features:\n            thresholds = np.unique(X[:, feat])\n            for thresh in thresholds:\n                left = y[X[:, feat] <= thresh]\n                right = y[X[:, feat] > thresh]\n                if len(left) == 0 or len(right) == 0:\n                    continue\n                gain = parent_ent - (len(left)/len(y) * self._entropy(left) +\n                                     len(right)/len(y) * self._entropy(right))\n                if gain > best_gain:\n                    best_gain, best_feat, best_thresh = gain, feat, thresh\n\n        return best_feat, best_thresh\n\n    def _build(self, X, y, depth=0):\n        if depth >= self.max_depth or len(set(y)) == 1 or len(y) < self.min_samples:\n            return Counter(y).most_common(1)[0][0]\n\n        feat, thresh = self._best_split(X, y)\n        if feat is None:\n            return Counter(y).most_common(1)[0][0]\n\n        left_mask = X[:, feat] <= thresh\n        return {\n            'feature': feat, 'threshold': thresh,\n            'left': self._build(X[left_mask], y[left_mask], depth + 1),\n            'right': self._build(X[~left_mask], y[~left_mask], depth + 1)\n        }\n\n    def fit(self, X, y):\n        if self.n_features is None:\n            self.n_features = int(np.sqrt(X.shape[1]))\n        self.tree = self._build(X, y)\n        return self\n\n    def _predict_one(self, x, tree):\n        if not isinstance(tree, dict):\n            return tree\n        if x[tree['feature']] <= tree['threshold']:\n            return self._predict_one(x, tree['left'])\n        return self._predict_one(x, tree['right'])\n\n    def predict(self, X):\n        return np.array([self._predict_one(x, self.tree) for x in X])\n\nclass RandomForest:\n    def __init__(self, n_trees=100, max_depth=10, min_samples=2):\n        self.n_trees = n_trees\n        self.max_depth = max_depth\n        self.min_samples = min_samples\n        self.trees = []\n\n    def fit(self, X, y):\n        self.trees = []\n        n_samples = len(X)\n\n        for _ in range(self.n_trees):\n            # Bootstrap sample\n            indices = np.random.choice(n_samples, n_samples, replace=True)\n            X_boot, y_boot = X[indices], y[indices]\n\n            tree = DecisionTreeSimple(\n                max_depth=self.max_depth,\n                min_samples=self.min_samples,\n                n_features=int(np.sqrt(X.shape[1]))\n            )\n            tree.fit(X_boot, y_boot)\n            self.trees.append(tree)\n\n        return self\n\n    def predict(self, X):\n        # Majority vote\n        predictions = np.array([tree.predict(X) for tree in self.trees])\n        return np.array([Counter(predictions[:, i]).most_common(1)[0][0]\n                        for i in range(len(X))])\n\n    def feature_importance(self, X, y):\n        \"\"\"Permutation importance.\"\"\"\n        baseline = np.mean(self.predict(X) == y)\n        importances = []\n        for feat in range(X.shape[1]):\n            X_perm = X.copy()\n            X_perm[:, feat] = np.random.permutation(X_perm[:, feat])\n            score = np.mean(self.predict(X_perm) == y)\n            importances.append(baseline - score)\n        return np.array(importances)\n\n# Test\nfrom sklearn.datasets import load_iris\nX, y = load_iris(return_X_y=True)\nrf = RandomForest(n_trees=50, max_depth=5)\nrf.fit(X, y)\nprint(f\"Accuracy: {np.mean(rf.predict(X) == y):.4f}\")\nprint(f\"Feature importance: {rf.feature_importance(X, y)}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Random Forest = Bagging + Random feature subspace. sqrt(n_features) for classification, n_features/3 for regression. Bootstrap provides diversity. Majority vote reduces variance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Implement word2vec skip-gram with negative sampling (ByteDance — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a simplified Word2Vec skip-gram model with negative sampling."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom collections import Counter\n\nclass Word2Vec:\n    def __init__(self, vocab_size, embed_dim=50, lr=0.01, n_neg=5):\n        self.embed_dim = embed_dim\n        self.lr = lr\n        self.n_neg = n_neg\n        # Target and context embeddings\n        self.W_target = np.random.randn(vocab_size, embed_dim) * 0.01\n        self.W_context = np.random.randn(vocab_size, embed_dim) * 0.01\n\n    def _sigmoid(self, x):\n        return 1 / (1 + np.exp(-np.clip(x, -10, 10)))\n\n    def train_pair(self, target_idx, context_idx, neg_indices):\n        \"\"\"Train one skip-gram pair with negative sampling.\"\"\"\n        # Positive sample\n        target_vec = self.W_target[target_idx]\n        context_vec = self.W_context[context_idx]\n\n        score = self._sigmoid(np.dot(target_vec, context_vec))\n        grad_ctx = (score - 1) * target_vec  # Want sigmoid → 1\n        grad_tgt = (score - 1) * context_vec\n\n        # Update context embedding\n        self.W_context[context_idx] -= self.lr * grad_ctx\n\n        # Negative samples\n        for neg_idx in neg_indices:\n            neg_vec = self.W_context[neg_idx]\n            score = self._sigmoid(np.dot(target_vec, neg_vec))\n            grad_neg = score * target_vec  # Want sigmoid → 0\n            grad_tgt += score * neg_vec\n            self.W_context[neg_idx] -= self.lr * grad_neg\n\n        # Update target embedding\n        self.W_target[target_idx] -= self.lr * grad_tgt\n\n    def get_embedding(self, word_idx):\n        return self.W_target[word_idx]\n\n    def most_similar(self, word_idx, top_k=5):\n        target = self.W_target[word_idx]\n        # Cosine similarity\n        norms = np.linalg.norm(self.W_target, axis=1)\n        similarities = (self.W_target @ target) / (norms * np.linalg.norm(target) + 1e-8)\n        top_indices = np.argsort(similarities)[::-1][1:top_k+1]\n        return [(idx, similarities[idx]) for idx in top_indices]\n\n# Training loop\ndef train_word2vec(corpus, embed_dim=50, window=2, n_neg=5, epochs=5, lr=0.025):\n    # Build vocabulary\n    words = corpus.split()\n    word_counts = Counter(words)\n    vocab = {w: i for i, w in enumerate(word_counts.keys())}\n    idx_to_word = {i: w for w, i in vocab.items()}\n\n    # Negative sampling distribution (f(w)^0.75)\n    freqs = np.array([word_counts[idx_to_word[i]] for i in range(len(vocab))])\n    neg_dist = freqs ** 0.75\n    neg_dist /= neg_dist.sum()\n\n    model = Word2Vec(len(vocab), embed_dim, lr, n_neg)\n    word_indices = [vocab[w] for w in words]\n\n    for epoch in range(epochs):\n        total_loss = 0\n        for i, target_idx in enumerate(word_indices):\n            # Context window\n            start = max(0, i - window)\n            end = min(len(word_indices), i + window + 1)\n\n            for j in range(start, end):\n                if j == i:\n                    continue\n                context_idx = word_indices[j]\n                neg_indices = np.random.choice(len(vocab), n_neg, p=neg_dist)\n                model.train_pair(target_idx, context_idx, neg_indices)\n\n        print(f\"Epoch {epoch+1}/{epochs} complete\")\n\n    return model, vocab, idx_to_word\n\ncorpus = \"the king loves the queen and the queen loves the king\"\nmodel, vocab, idx_to_word = train_word2vec(corpus, embed_dim=10, epochs=50)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Skip-gram predicts context from target word. Negative sampling approximates softmax over entire vocab. Sampling distribution f(w)^0.75 downweights frequent words. Two embedding matrices — target and context."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Implement attention mechanism from scratch (Google — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build scaled dot-product attention and multi-head attention."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef scaled_dot_product_attention(Q, K, V, mask=None):\n    \"\"\"\n    Q, K, V: (batch, seq_len, d_k)\n    Returns: (batch, seq_len, d_v), attention_weights\n    \"\"\"\n    d_k = Q.shape[-1]\n    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d_k)  # (batch, seq_q, seq_k)\n\n    if mask is not None:\n        scores = np.where(mask == 0, -1e9, scores)\n\n    # Softmax along last axis\n    exp_scores = np.exp(scores - np.max(scores, axis=-1, keepdims=True))\n    attention_weights = exp_scores / exp_scores.sum(axis=-1, keepdims=True)\n\n    output = attention_weights @ V  # (batch, seq_q, d_v)\n    return output, attention_weights\n\nclass MultiHeadAttention:\n    def __init__(self, d_model, n_heads):\n        assert d_model % n_heads == 0\n        self.d_model = d_model\n        self.n_heads = n_heads\n        self.d_k = d_model // n_heads\n\n        # Linear projections\n        self.W_q = np.random.randn(d_model, d_model) * 0.02\n        self.W_k = np.random.randn(d_model, d_model) * 0.02\n        self.W_v = np.random.randn(d_model, d_model) * 0.02\n        self.W_o = np.random.randn(d_model, d_model) * 0.02\n\n    def _split_heads(self, x):\n        \"\"\"(batch, seq, d_model) → (batch, n_heads, seq, d_k)\"\"\"\n        batch, seq, _ = x.shape\n        x = x.reshape(batch, seq, self.n_heads, self.d_k)\n        return x.transpose(0, 2, 1, 3)\n\n    def _merge_heads(self, x):\n        \"\"\"(batch, n_heads, seq, d_k) → (batch, seq, d_model)\"\"\"\n        batch, _, seq, _ = x.shape\n        x = x.transpose(0, 2, 1, 3)\n        return x.reshape(batch, seq, self.d_model)\n\n    def forward(self, Q, K, V, mask=None):\n        # Project\n        Q = Q @ self.W_q\n        K = K @ self.W_k\n        V = V @ self.W_v\n\n        # Split into heads\n        Q = self._split_heads(Q)\n        K = self._split_heads(K)\n        V = self._split_heads(V)\n\n        # Attention per head\n        d_k = Q.shape[-1]\n        scores = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(d_k)\n        if mask is not None:\n            scores = np.where(mask == 0, -1e9, scores)\n\n        exp_scores = np.exp(scores - np.max(scores, axis=-1, keepdims=True))\n        attn_weights = exp_scores / exp_scores.sum(axis=-1, keepdims=True)\n        attn_output = attn_weights @ V\n\n        # Merge heads and project\n        output = self._merge_heads(attn_output)\n        output = output @ self.W_o\n\n        return output, attn_weights\n\n# Test\nbatch, seq_len, d_model, n_heads = 2, 5, 64, 8\nX = np.random.randn(batch, seq_len, d_model)\n\nmha = MultiHeadAttention(d_model, n_heads)\noutput, weights = mha.forward(X, X, X)  # Self-attention\nprint(f\"Input: {X.shape}, Output: {output.shape}, Weights: {weights.shape}\")\n\n# Causal mask for autoregressive\ncausal_mask = np.tril(np.ones((seq_len, seq_len)))\noutput_masked, _ = mha.forward(X, X, X, mask=causal_mask)\nprint(f\"Masked output: {output_masked.shape}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Attention = softmax(QK^T/√d_k)V. Multi-head lets model attend to different positions. Causal mask prevents looking at future tokens. Scale factor prevents softmax saturation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Implement AUC-ROC from scratch (Stripe — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Calculate AUC-ROC without using sklearn. Explain the intuition."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef compute_roc_curve(y_true, y_scores):\n    \"\"\"Compute ROC curve points.\"\"\"\n    # Sort by score descending\n    sorted_indices = np.argsort(-y_scores)\n    y_sorted = y_true[sorted_indices]\n    scores_sorted = y_scores[sorted_indices]\n\n    # Get unique thresholds\n    thresholds = np.unique(scores_sorted)[::-1]\n\n    tpr_list, fpr_list = [0], [0]\n    total_pos = np.sum(y_true == 1)\n    total_neg = np.sum(y_true == 0)\n\n    for thresh in thresholds:\n        y_pred = (y_scores >= thresh).astype(int)\n        tp = np.sum((y_pred == 1) & (y_true == 1))\n        fp = np.sum((y_pred == 1) & (y_true == 0))\n\n        tpr = tp / total_pos if total_pos > 0 else 0\n        fpr = fp / total_neg if total_neg > 0 else 0\n\n        tpr_list.append(tpr)\n        fpr_list.append(fpr)\n\n    return np.array(fpr_list), np.array(tpr_list)\n\ndef compute_auc(fpr, tpr):\n    \"\"\"Trapezoidal rule for AUC.\"\"\"\n    sorted_idx = np.argsort(fpr)\n    fpr_sorted = fpr[sorted_idx]\n    tpr_sorted = tpr[sorted_idx]\n\n    auc = 0\n    for i in range(1, len(fpr_sorted)):\n        auc += (fpr_sorted[i] - fpr_sorted[i-1]) * (tpr_sorted[i] + tpr_sorted[i-1]) / 2\n    return auc\n\ndef auc_wilcoxon(y_true, y_scores):\n    \"\"\"AUC via Wilcoxon-Mann-Whitney statistic.\n    AUC = P(score(pos) > score(neg)) for random pos/neg pair.\"\"\"\n    pos_scores = y_scores[y_true == 1]\n    neg_scores = y_scores[y_true == 0]\n\n    count = 0\n    for ps in pos_scores:\n        count += np.sum(ps > neg_scores) + 0.5 * np.sum(ps == neg_scores)\n\n    return count / (len(pos_scores) * len(neg_scores))\n\n# Test\nnp.random.seed(42)\ny_true = np.array([0, 0, 1, 1, 0, 1, 0, 1, 1, 0])\ny_scores = np.array([0.1, 0.4, 0.35, 0.8, 0.2, 0.7, 0.3, 0.9, 0.6, 0.5])\n\nfpr, tpr = compute_roc_curve(y_true, y_scores)\nauc_trap = compute_auc(fpr, tpr)\nauc_wmw = auc_wilcoxon(y_true, y_scores)\n\nprint(f\"AUC (trapezoidal): {auc_trap:.4f}\")\nprint(f\"AUC (Wilcoxon): {auc_wmw:.4f}\")\n\n# Verify with sklearn\nfrom sklearn.metrics import roc_auc_score\nprint(f\"AUC (sklearn): {roc_auc_score(y_true, y_scores):.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** AUC = probability that a random positive example scores higher than a random negative. AUC=0.5 is random, AUC=1.0 is perfect. Insensitive to class imbalance (unlike accuracy). Wilcoxon interpretation is the most intuitive."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
