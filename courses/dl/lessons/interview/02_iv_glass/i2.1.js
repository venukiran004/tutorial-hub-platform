/* ============================================================================
   INTERVIEW I2.1 — Algorithms & Coding · Machine Learning Fundamentals · Deep Learning & Neural Networks
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/02_Glassdoor_AI_Engineer.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.1",
 "lede": "**9 questions** from Glassdoor AI Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Algorithms & Coding · Machine Learning Fundamentals · Deep Learning & Neural Networks",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Basic algorithm questions (Google — AI Researcher)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Standard algorithm questions covering searching, sorting, and graph traversal."
    },
    {
     "t": "p",
     "text": "**Must-know algorithms for Google AI interviews:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ═══════════════ BINARY SEARCH ═══════════════\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\n# ═══════════════ BFS & DFS ═══════════════\nfrom collections import deque\n\ndef bfs(graph, start):\n    visited = set([start])\n    queue = deque([start])\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\ndef dfs(graph, start, visited=None):\n    if visited is None:\n        visited = set()\n    visited.add(start)\n    for neighbor in graph[start]:\n        if neighbor not in visited:\n            dfs(graph, neighbor, visited)\n    return visited\n\n# ═══════════════ DYNAMIC PROGRAMMING ═══════════════\ndef longest_common_subsequence(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if text1[i-1] == text2[j-1]:\n                dp[i][j] = dp[i-1][j-1] + 1\n            else:\n                dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n\n    return dp[m][n]\n\n# ═══════════════ TOPOLOGICAL SORT ═══════════════\ndef topological_sort(graph, num_nodes):\n    \"\"\"Kahn's algorithm — BFS-based.\"\"\"\n    in_degree = [0] * num_nodes\n    for u in graph:\n        for v in graph[u]:\n            in_degree[v] += 1\n\n    queue = deque([i for i in range(num_nodes) if in_degree[i] == 0])\n    order = []\n\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph.get(node, []):\n            in_degree[neighbor] -= 1\n            if in_degree[neighbor] == 0:\n                queue.append(neighbor)\n\n    return order if len(order) == num_nodes else []  # Empty if cycle"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Solve: 4, 16, 64, 256 using a for loop (Trutech Web Solutions)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Generate the series 4, 16, 64, 256 using a for loop."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Powers of 4\nfor i in range(1, 5):\n    print(4 ** i, end=\" \")\n# Output: 4 16 64 256\n\n# Method 2: Multiplication pattern\nnum = 4\nfor i in range(4):\n    print(num, end=\" \")\n    num *= 4\n# Output: 4 16 64 256\n\n# Method 3: Using list comprehension\nseries = [4 ** i for i in range(1, 5)]\nprint(series)  # [4, 16, 64, 256]\n\n# Generalized geometric series\ndef geometric_series(first_term, ratio, n_terms):\n    return [first_term * ratio**i for i in range(n_terms)]\n\nprint(geometric_series(4, 4, 4))  # [4, 16, 64, 256]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Sort a dictionary in place in Python (E42.ai — AI Platform Developer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Sort a dictionary by keys and values."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Python dicts maintain insertion order since 3.7+\n# But dicts are NOT \"sortable in place\" — you create a new ordered dict\n\nd = {'banana': 3, 'apple': 1, 'cherry': 2, 'date': 4}\n\n# Sort by keys\nsorted_by_key = dict(sorted(d.items()))\nprint(sorted_by_key)\n# {'apple': 1, 'banana': 3, 'cherry': 2, 'date': 4}\n\n# Sort by values\nsorted_by_value = dict(sorted(d.items(), key=lambda x: x[1]))\nprint(sorted_by_value)\n# {'apple': 1, 'cherry': 2, 'banana': 3, 'date': 4}\n\n# Sort by values (descending)\nsorted_desc = dict(sorted(d.items(), key=lambda x: x[1], reverse=True))\nprint(sorted_desc)\n# {'date': 4, 'banana': 3, 'cherry': 2, 'apple': 1}\n\n# \"In-place\" — clear and re-insert\noriginal = {'banana': 3, 'apple': 1, 'cherry': 2}\nsorted_items = sorted(original.items())\noriginal.clear()\noriginal.update(sorted_items)\nprint(original)  # {'apple': 1, 'banana': 3, 'cherry': 2}"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Technically, dictionaries can't be sorted \"in place\" like lists. The interviewer wants to see if you know this nuance and can explain Python dict ordering (insertion order since Python 3.7, guaranteed in 3.7+)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "BST question and SQL question (IBM — Data Scientist AI)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Standard BST operations and SQL query."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# ═══════════════ BST OPERATIONS ═══════════════\n\ndef insert_bst(root, val):\n    if not root:\n        return TreeNode(val)\n    if val < root.val:\n        root.left = insert_bst(root.left, val)\n    elif val > root.val:\n        root.right = insert_bst(root.right, val)\n    return root\n\ndef search_bst(root, val):\n    if not root or root.val == val:\n        return root\n    if val < root.val:\n        return search_bst(root.left, val)\n    return search_bst(root.right, val)\n\ndef inorder_traversal(root):\n    \"\"\"Returns sorted elements of BST.\"\"\"\n    if not root:\n        return []\n    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right)\n\ndef is_valid_bst(root, min_val=float('-inf'), max_val=float('inf')):\n    \"\"\"Validate if tree is a valid BST.\"\"\"\n    if not root:\n        return True\n    if root.val <= min_val or root.val >= max_val:\n        return False\n    return (is_valid_bst(root.left, min_val, root.val) and\n            is_valid_bst(root.right, root.val, max_val))\n\ndef find_kth_smallest(root, k):\n    \"\"\"Find kth smallest element in BST — in-order traversal.\"\"\"\n    stack = []\n    current = root\n    count = 0\n\n    while stack or current:\n        while current:\n            stack.append(current)\n            current = current.left\n        current = stack.pop()\n        count += 1\n        if count == k:\n            return current.val\n        current = current.right\n    return None"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "ML techniques and their differences (Sypron Solutions — AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Explain different machine learning techniques and when to use each."
    },
    {
     "t": "table",
     "head": [
      "Category",
      "Algorithm",
      "Best For",
      "Key Parameters"
     ],
     "rows": [
      [
       "**Classification**",
       "Logistic Regression",
       "Binary, interpretable",
       "C, penalty"
      ],
      [
       "",
       "Random Forest",
       "Tabular, robust",
       "n_estimators, max_depth"
      ],
      [
       "",
       "XGBoost",
       "Competitions, tabular",
       "learning_rate, max_depth"
      ],
      [
       "",
       "SVM",
       "Small datasets, high-dim",
       "kernel, C, gamma"
      ],
      [
       "**Regression**",
       "Linear Regression",
       "Linear relationships",
       "-"
      ],
      [
       "",
       "Ridge/Lasso",
       "Regularized regression",
       "alpha"
      ],
      [
       "",
       "Random Forest",
       "Non-linear, robust",
       "n_estimators"
      ],
      [
       "**Clustering**",
       "K-Means",
       "Spherical clusters",
       "k"
      ],
      [
       "",
       "DBSCAN",
       "Arbitrary shapes, noise",
       "eps, min_samples"
      ],
      [
       "",
       "Hierarchical",
       "Dendrograms, small data",
       "linkage"
      ],
      [
       "**Dimensionality**",
       "PCA",
       "Linear reduction",
       "n_components"
      ],
      [
       "",
       "t-SNE",
       "Visualization (2D/3D)",
       "perplexity"
      ],
      [
       "",
       "UMAP",
       "Large datasets, structure",
       "n_neighbors"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier\nfrom sklearn.svm import SVC\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\n\nmodels = {\n    'Logistic Regression': LogisticRegression(max_iter=1000),\n    'Random Forest': RandomForestClassifier(n_estimators=100),\n    'SVM': SVC(kernel='rbf'),\n    'Gradient Boosting': GradientBoostingClassifier()\n}\n\nfor name, model in models.items():\n    scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')\n    print(f\"{name}: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Algorithms, data preprocessing methods and models (AMD — AI Intern)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Explain data preprocessing methods and how they affect model performance."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\nfrom sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder\nfrom sklearn.impute import SimpleImputer, KNNImputer\n\n# ═══════════════ HANDLING MISSING VALUES ═══════════════\n\n# Strategy 1: Statistical imputation\nimputer = SimpleImputer(strategy='median')  # mean, median, most_frequent\nX_imputed = imputer.fit_transform(X)\n\n# Strategy 2: KNN Imputer (uses similar samples)\nknn_imputer = KNNImputer(n_neighbors=5)\nX_knn_imputed = knn_imputer.fit_transform(X)\n\n# Strategy 3: Indicator for missingness\nfrom sklearn.impute import MissingIndicator\nindicator = MissingIndicator()\nX_missing_flags = indicator.fit_transform(X)\n\n# ═══════════════ FEATURE SCALING ═══════════════\n\n# StandardScaler: mean=0, std=1 (for SVM, KNN, NN)\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)\n\n# MinMaxScaler: [0, 1] range (for neural networks)\nminmax = MinMaxScaler()\nX_minmax = minmax.fit_transform(X)\n\n# RobustScaler: Uses median/IQR (robust to outliers)\nfrom sklearn.preprocessing import RobustScaler\nrobust = RobustScaler()\nX_robust = robust.fit_transform(X)\n\n# ═══════════════ ENCODING CATEGORICAL ═══════════════\n\n# One-Hot Encoding (nominal categories)\nX_encoded = pd.get_dummies(df, columns=['color', 'size'], drop_first=True)\n\n# Label Encoding (ordinal categories)\nle = LabelEncoder()\ndf['size_encoded'] = le.fit_transform(df['size'])  # S→0, M→1, L→2\n\n# Target Encoding (high-cardinality)\nfrom category_encoders import TargetEncoder\nte = TargetEncoder()\nX_target = te.fit_transform(X[['city']], y)\n\n# ═══════════════ OUTLIER DETECTION ═══════════════\n\n# IQR method\nQ1 = df['salary'].quantile(0.25)\nQ3 = df['salary'].quantile(0.75)\nIQR = Q3 - Q1\nlower = Q1 - 1.5 * IQR\nupper = Q3 + 1.5 * IQR\ndf_clean = df[(df['salary'] >= lower) & (df['salary'] <= upper)]"
    },
    {
     "t": "table",
     "head": [
      "Preprocessing",
      "Needed For",
      "Not Needed For"
     ],
     "rows": [
      [
       "Scaling",
       "SVM, KNN, Neural Nets, PCA",
       "Tree-based (RF, XGBoost)"
      ],
      [
       "One-hot encoding",
       "Linear models, SVM",
       "CatBoost (native support)"
      ],
      [
       "Missing imputation",
       "All models",
       "XGBoost (handles natively)"
      ],
      [
       "Normalization",
       "Distance-based methods",
       "Tree-based methods"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Hotel recommendation based on price search history (WB Hotels — AI/ML)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Which algorithm would you use to recommend hotels based on a user's previous price search history?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Approach 1: Content-Based Filtering (price-range matching)\nimport numpy as np\nfrom sklearn.metrics.pairwise import cosine_similarity\n\ndef recommend_by_price_range(user_history, all_hotels, top_k=5):\n    \"\"\"\n    user_history: list of price points user searched\n    all_hotels: DataFrame with 'price', 'rating', 'location' etc.\n    \"\"\"\n    # Create user preference profile\n    user_profile = {\n        'avg_price': np.mean(user_history),\n        'min_price': np.min(user_history),\n        'max_price': np.max(user_history),\n        'price_std': np.std(user_history)\n    }\n\n    # Score hotels by distance from user's price preference\n    all_hotels['price_score'] = 1 / (1 + abs(all_hotels['price'] - user_profile['avg_price']))\n\n    # Filter to acceptable range\n    mask = (all_hotels['price'] >= user_profile['min_price'] * 0.8) & \\\n           (all_hotels['price'] <= user_profile['max_price'] * 1.2)\n\n    candidates = all_hotels[mask].nlargest(top_k, 'price_score')\n    return candidates\n\n# Approach 2: Collaborative Filtering (users with similar budgets)\nfrom sklearn.decomposition import TruncatedSVD\n\n# User-Hotel interaction matrix\n# Rows: users, Columns: hotels, Values: ratings/bookings\nsvd = TruncatedSVD(n_components=50)\nuser_factors = svd.fit_transform(interaction_matrix)\nhotel_factors = svd.components_.T\n\n# Recommend: dot product of user and hotel factors\nscores = user_factors[user_id] @ hotel_factors.T\ntop_hotels = np.argsort(scores)[::-1][:10]\n\n# Approach 3: Session-Based (sequential recommendation)\n# Use RNN/Transformer on search sequence\n# Input: [search₁, search₂, ..., searchₙ] → Predict next hotel"
    },
    {
     "t": "p",
     "text": "**Best algorithm choice:**"
    },
    {
     "t": "ul",
     "items": [
      "**Cold start (new user):** Content-based filtering on price",
      "**Existing user:** Collaborative filtering (similar users' preferences)",
      "**Real-time session:** Session-based models (RNN/Transformer)",
      "**Production hybrid:** Two-tower model (user encoder + hotel encoder)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "ML domains, SVMs vs NNs, Backpropagation, RNN vs ANN (Accenture — Junior AI Consultant)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Comprehensive deep learning theory — domains of ML, SVMs vs NNs, backprop in RNN vs ANN, OOP concepts."
    },
    {
     "t": "p",
     "text": "**SVMs vs Neural Networks:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "SVM",
      "Neural Networks"
     ],
     "rows": [
      [
       "**Data size**",
       "Small-medium (< 100K)",
       "Large (> 100K)"
      ],
      [
       "**Feature engineering**",
       "Required",
       "Less needed (learns features)"
      ],
      [
       "**Interpretability**",
       "Moderate (support vectors)",
       "Low (black box)"
      ],
      [
       "**Training time**",
       "Fast for small data",
       "Can be slow"
      ],
      [
       "**Non-linearity**",
       "Kernel trick",
       "Multiple layers + activation"
      ],
      [
       "**Convex optimization**",
       "Yes (global optimum)",
       "No (local optima)"
      ],
      [
       "**Unstructured data**",
       "Poor",
       "Excellent (images, text, audio)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Backpropagation in ANN vs RNN:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ═══════════════ ANN BACKPROP ═══════════════\n# Standard chain rule through layers\n# Each layer is independent: ∂L/∂W₁ doesn't depend on time\n\n# ═══════════════ RNN BACKPROP (BPTT) ═══════════════\n# Backpropagation Through Time — unroll the network\n# Gradients flow back through TIME STEPS\n\nclass SimpleRNN:\n    def forward(self, x_sequence):\n        \"\"\"x_sequence: [T, input_dim]\"\"\"\n        h = np.zeros(self.hidden_dim)\n        self.h_states = [h]\n\n        for t in range(len(x_sequence)):\n            h = np.tanh(self.W_xh @ x_sequence[t] + self.W_hh @ h + self.b_h)\n            self.h_states.append(h)\n\n        return h\n\n    def backward(self):\n        \"\"\"\n        Key difference from ANN:\n        ∂L/∂W_hh involves sum over ALL time steps!\n\n        ∂L/∂W_hh = Σ(t=1 to T) ∂L/∂h_T · ∂h_T/∂h_t · ∂h_t/∂W_hh\n\n        Problem: ∂h_T/∂h_t involves product of T-t Jacobians\n        → Vanishing gradients (tanh derivatives < 1)\n        → Exploding gradients (if derivatives > 1)\n        \"\"\"\n        pass\n\n# Fix for vanishing gradients: LSTM, GRU\n# LSTM uses cell state (highway for gradients) + gates\n# GRU simplified version with 2 gates instead of 3"
    },
    {
     "t": "p",
     "text": "**Why is Deep Learning emerging only now?**"
    },
    {
     "t": "ol",
     "items": [
      "**Data:** Internet generated massive training datasets",
      "**Compute:** GPUs made training feasible (1000x speedup)",
      "**Algorithms:** ReLU, batch norm, dropout, skip connections",
      "**Frameworks:** TensorFlow, PyTorch made implementation easy",
      "**Transfer learning:** Pre-trained models reduce data requirements"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Types of Neural Networks and their applications",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "┌──────────────────────────────────────────────────────┐\n│           NEURAL NETWORK TAXONOMY                    │\n├──────────────────┬───────────────────────────────────┤\n│ ANN/MLP          │ Tabular data, classification      │\n│ CNN              │ Images, spatial data              │\n│ RNN              │ Sequential data (deprecated)      │\n│ LSTM             │ Long sequences, time series       │\n│ GRU              │ Efficient sequential processing   │\n│ Transformer      │ NLP, vision, multimodal           │\n│ GAN              │ Image generation, augmentation    │\n│ VAE              │ Generation, latent spaces         │\n│ Autoencoder      │ Compression, anomaly detection    │\n│ Graph Neural Net │ Social networks, molecules        │\n│ Diffusion Model  │ High-quality image generation     │\n└──────────────────┴───────────────────────────────────┘"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\n# CNN for image classification\nclass SimpleCNN(nn.Module):\n    def __init__(self, num_classes=10):\n        super().__init__()\n        self.features = nn.Sequential(\n            nn.Conv2d(3, 32, 3, padding=1),\n            nn.ReLU(),\n            nn.MaxPool2d(2),\n            nn.Conv2d(32, 64, 3, padding=1),\n            nn.ReLU(),\n            nn.MaxPool2d(2),\n        )\n        self.classifier = nn.Sequential(\n            nn.Linear(64 * 8 * 8, 256),\n            nn.ReLU(),\n            nn.Dropout(0.5),\n            nn.Linear(256, num_classes)\n        )\n\n    def forward(self, x):\n        x = self.features(x)\n        x = x.view(x.size(0), -1)\n        return self.classifier(x)\n\n# Transformer for sequence tasks\nclass TransformerBlock(nn.Module):\n    def __init__(self, d_model=512, n_heads=8, d_ff=2048):\n        super().__init__()\n        self.attention = nn.MultiheadAttention(d_model, n_heads)\n        self.norm1 = nn.LayerNorm(d_model)\n        self.norm2 = nn.LayerNorm(d_model)\n        self.ff = nn.Sequential(\n            nn.Linear(d_model, d_ff),\n            nn.GELU(),\n            nn.Linear(d_ff, d_model)\n        )\n\n    def forward(self, x):\n        attn_out, _ = self.attention(x, x, x)\n        x = self.norm1(x + attn_out)\n        ff_out = self.ff(x)\n        x = self.norm2(x + ff_out)\n        return x"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
