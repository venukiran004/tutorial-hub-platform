/* ============================================================================
   PRACTICE P1.2 — Programs · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.2",
 "lede": "**25 programs** from Fundamentals: Programs and Scenarios. Read the title, write the program yourself, then open the reference version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the reference version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Programs · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Stratified K-Fold Cross Validation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import StratifiedKFold\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nimport numpy as np\n\nX, y = load_iris(return_X_y=True)\nskf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\nscores = []\nfor train_idx, test_idx in skf.split(X, y):\n    model = RandomForestClassifier(random_state=42)\n    model.fit(X[train_idx], y[train_idx])\n    scores.append(model.score(X[test_idx], y[test_idx]))\nprint(f\"Stratified KFold: {np.mean(scores):.4f} ± {np.std(scores):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Learning Curve",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import learning_curve\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_digits\nimport numpy as np\n\nX, y = load_digits(return_X_y=True)\ntrain_sizes, train_scores, val_scores = learning_curve(\n    SVC(kernel='rbf'), X, y, train_sizes=np.linspace(0.1, 1.0, 5), cv=3\n)\nprint(f\"Train sizes: {train_sizes}\")\nprint(f\"Train scores: {train_scores.mean(axis=1)}\")\nprint(f\"Val scores: {val_scores.mean(axis=1)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Feature Importance Visualization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nimport numpy as np\n\nX, y = load_iris(return_X_y=True)\nfeature_names = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width']\nrf = RandomForestClassifier(n_estimators=100, random_state=42)\nrf.fit(X, y)\nimportances = rf.feature_importances_\nfor name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):\n    print(f\"  {name}: {imp:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Multi-Class Classification Metrics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import precision_recall_fscore_support\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)\nmodel = RandomForestClassifier(random_state=42).fit(X_train, y_train)\ny_pred = model.predict(X_test)\nprec, rec, f1, sup = precision_recall_fscore_support(y_test, y_pred, average=None)\nfor i in range(3):\n    print(f\"Class {i}: Precision={prec[i]:.3f}, Recall={rec[i]:.3f}, F1={f1[i]:.3f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "30",
   "q": "SMOTE for Imbalanced Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pip install imbalanced-learn\nfrom imblearn.over_sampling import SMOTE\nfrom sklearn.datasets import make_classification\nimport numpy as np\n\nX, y = make_classification(n_samples=1000, weights=[0.9, 0.1], random_state=42)\nprint(f\"Before: {dict(zip(*np.unique(y, return_counts=True)))}\")\nsmote = SMOTE(random_state=42)\nX_res, y_res = smote.fit_resample(X, y)\nprint(f\"After:  {dict(zip(*np.unique(y_res, return_counts=True)))}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Hierarchical Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import AgglomerativeClustering\nfrom sklearn.datasets import make_blobs\n\nX, y_true = make_blobs(n_samples=150, centers=3, random_state=42)\nagg = AgglomerativeClustering(n_clusters=3, linkage='ward')\nlabels = agg.fit_predict(X)\nfrom sklearn.metrics import adjusted_rand_score\nprint(f\"Adjusted Rand Index: {adjusted_rand_score(y_true, labels):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Gaussian Mixture Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.mixture import GaussianMixture\nfrom sklearn.datasets import make_blobs\n\nX, y_true = make_blobs(n_samples=300, centers=3, random_state=42)\ngmm = GaussianMixture(n_components=3, random_state=42)\ngmm.fit(X)\nlabels = gmm.predict(X)\nprobs = gmm.predict_proba(X)\nprint(f\"BIC: {gmm.bic(X):.2f}, AIC: {gmm.aic(X):.2f}\")\nprint(f\"Sample probs: {probs[0]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "33",
   "q": "t-SNE Visualization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.manifold import TSNE\nfrom sklearn.datasets import load_digits\nimport numpy as np\n\nX, y = load_digits(return_X_y=True)\ntsne = TSNE(n_components=2, random_state=42, perplexity=30)\nX_2d = tsne.fit_transform(X)\nprint(f\"Original shape: {X.shape}\")\nprint(f\"t-SNE shape: {X_2d.shape}\")\nprint(f\"Sample 2D coords: {X_2d[:3]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Isolation Forest for Anomaly Detection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import IsolationForest\nimport numpy as np\n\nnp.random.seed(42)\nX_normal = np.random.randn(200, 2)\nX_outliers = np.random.uniform(-6, 6, (20, 2))\nX = np.vstack([X_normal, X_outliers])\niso = IsolationForest(contamination=0.1, random_state=42)\npredictions = iso.fit_predict(X)\nprint(f\"Normal: {sum(predictions == 1)}, Anomalies: {sum(predictions == -1)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Silhouette Score for Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import silhouette_score\nfrom sklearn.cluster import KMeans\nfrom sklearn.datasets import make_blobs\n\nX, _ = make_blobs(n_samples=300, centers=4, random_state=42)\nscores = {}\nfor k in range(2, 8):\n    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)\n    labels = kmeans.fit_predict(X)\n    scores[k] = silhouette_score(X, labels)\n    print(f\"k={k}: Silhouette={scores[k]:.4f}\")\nprint(f\"Best k: {max(scores, key=scores.get)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Permutation Importance",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.inspection import permutation_importance\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nrf = RandomForestClassifier(random_state=42).fit(X_train, y_train)\nresult = permutation_importance(rf, X_test, y_test, n_repeats=10, random_state=42)\nfor i in result.importances_mean.argsort()[::-1]:\n    print(f\"Feature {i}: {result.importances_mean[i]:.4f} ± {result.importances_std[i]:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Stacking Ensemble",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import StackingClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\nestimators = [\n    ('dt', DecisionTreeClassifier(max_depth=3)),\n    ('svm', SVC(kernel='rbf', probability=True))\n]\nstacking = StackingClassifier(estimators=estimators, final_estimator=LogisticRegression())\nscores = cross_val_score(stacking, X, y, cv=5)\nprint(f\"Stacking CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Voting Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import VotingClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\nvoting = VotingClassifier(estimators=[\n    ('lr', LogisticRegression(max_iter=200)),\n    ('dt', DecisionTreeClassifier(max_depth=3)),\n    ('svm', SVC(probability=True))\n], voting='soft')\nscores = cross_val_score(voting, X, y, cv=5)\nprint(f\"Voting CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "39",
   "q": "AdaBoost Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import AdaBoostClassifier\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\nada = AdaBoostClassifier(\n    estimator=DecisionTreeClassifier(max_depth=1),\n    n_estimators=50, learning_rate=1.0, random_state=42\n)\nscores = cross_val_score(ada, X, y, cv=5)\nprint(f\"AdaBoost CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Randomized Search",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import RandomizedSearchCV\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom scipy.stats import randint\n\nX, y = load_iris(return_X_y=True)\nparam_dist = {\n    'n_estimators': randint(50, 200),\n    'max_depth': randint(2, 10),\n    'min_samples_split': randint(2, 20)\n}\nsearch = RandomizedSearchCV(RandomForestClassifier(random_state=42), param_dist,\n                            n_iter=20, cv=3, random_state=42)\nsearch.fit(X, y)\nprint(f\"Best params: {search.best_params_}\")\nprint(f\"Best score: {search.best_score_:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Column Transformer",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\nimport numpy as np\n\n# Numeric features at indices 0,1; categorical at index 2\nX = np.array([[25, 50000, 'M'], [30, 60000, 'F'], [35, 80000, 'M'], [40, 90000, 'F']])\nct = ColumnTransformer([\n    ('num', StandardScaler(), [0, 1]),\n    ('cat', OneHotEncoder(sparse_output=False), [2])\n])\nX_transformed = ct.fit_transform(X)\nprint(f\"Shape: {X_transformed.shape}\")\nprint(X_transformed)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Multivariate Linear Regression from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef gradient_descent(X, y, lr=0.01, epochs=1000):\n    m, n = X.shape\n    X_b = np.c_[np.ones((m, 1)), X]  # Add bias\n    theta = np.zeros(n + 1)\n    for _ in range(epochs):\n        predictions = X_b @ theta\n        errors = predictions - y\n        gradients = (2/m) * X_b.T @ errors\n        theta -= lr * gradients\n    return theta\n\nnp.random.seed(42)\nX = np.random.randn(100, 3)\ny = 3*X[:, 0] + 2*X[:, 1] - X[:, 2] + 5 + np.random.randn(100)*0.5\ntheta = gradient_descent(X, y, lr=0.01, epochs=2000)\nprint(f\"Coefficients: bias={theta[0]:.2f}, w={theta[1:]}\")\n# Expected: ~[5, 3, 2, -1]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Logistic Regression from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef sigmoid(z):\n    return 1 / (1 + np.exp(-np.clip(z, -500, 500)))\n\ndef logistic_regression(X, y, lr=0.1, epochs=1000):\n    m, n = X.shape\n    X_b = np.c_[np.ones((m, 1)), X]\n    theta = np.zeros(n + 1)\n    for epoch in range(epochs):\n        z = X_b @ theta\n        h = sigmoid(z)\n        gradient = (1/m) * X_b.T @ (h - y)\n        theta -= lr * gradient\n    return theta\n\nnp.random.seed(42)\nX = np.random.randn(200, 2)\ny = (X[:, 0] + X[:, 1] > 0).astype(float)\ntheta = logistic_regression(X, y)\npredictions = (sigmoid(np.c_[np.ones((200, 1)), X] @ theta) >= 0.5).astype(int)\naccuracy = np.mean(predictions == y)\nprint(f\"Accuracy: {accuracy:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "44",
   "q": "K-Means from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef kmeans_scratch(X, k, max_iters=100):\n    np.random.seed(42)\n    centroids = X[np.random.choice(len(X), k, replace=False)]\n    for _ in range(max_iters):\n        distances = np.linalg.norm(X[:, np.newaxis] - centroids, axis=2)\n        labels = np.argmin(distances, axis=1)\n        new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(k)])\n        if np.allclose(centroids, new_centroids):\n            break\n        centroids = new_centroids\n    return labels, centroids\n\nfrom sklearn.datasets import make_blobs\nX, y_true = make_blobs(n_samples=300, centers=3, random_state=42)\nlabels, centroids = kmeans_scratch(X, k=3)\nprint(f\"Centroids:\\n{centroids}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "45",
   "q": "KNN from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom collections import Counter\n\ndef knn_predict(X_train, y_train, X_test, k=3):\n    predictions = []\n    for test_point in X_test:\n        distances = np.linalg.norm(X_train - test_point, axis=1)\n        k_nearest = y_train[np.argsort(distances)[:k]]\n        predictions.append(Counter(k_nearest).most_common(1)[0][0])\n    return np.array(predictions)\n\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\ny_pred = knn_predict(X_train, y_train, X_test, k=5)\nprint(f\"Accuracy: {np.mean(y_pred == y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Decision Tree from Scratch (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef gini(y):\n    classes = np.unique(y)\n    total = len(y)\n    return 1 - sum((np.sum(y == c) / total) ** 2 for c in classes)\n\ndef best_split(X, y):\n    best_gini, best_feat, best_thresh = float('inf'), None, None\n    for feat in range(X.shape[1]):\n        thresholds = np.unique(X[:, feat])\n        for thresh in thresholds:\n            left_mask = X[:, feat] <= thresh\n            if left_mask.sum() == 0 or (~left_mask).sum() == 0:\n                continue\n            g = (left_mask.sum() * gini(y[left_mask]) + \n                 (~left_mask).sum() * gini(y[~left_mask])) / len(y)\n            if g < best_gini:\n                best_gini, best_feat, best_thresh = g, feat, thresh\n    return best_feat, best_thresh\n\nfrom sklearn.datasets import load_iris\nX, y = load_iris(return_X_y=True)\nfeat, thresh = best_split(X, y)\nprint(f\"Best split: Feature {feat}, Threshold {thresh:.2f}\")\nprint(f\"Gini before: {gini(y):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "47",
   "q": "Precision-Recall Curve",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import precision_recall_curve, average_precision_score\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.datasets import make_classification\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_classification(n_samples=500, weights=[0.7, 0.3], random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = LogisticRegression(max_iter=200).fit(X_train, y_train)\ny_scores = model.predict_proba(X_test)[:, 1]\nprecision, recall, _ = precision_recall_curve(y_test, y_scores)\nap = average_precision_score(y_test, y_scores)\nprint(f\"Average Precision: {ap:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Target Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef target_encode(categories, targets):\n    \"\"\"Simple target encoding: replace category with mean of target.\"\"\"\n    encoding = {}\n    for cat in np.unique(categories):\n        mask = categories == cat\n        encoding[cat] = targets[mask].mean()\n    return np.array([encoding[c] for c in categories])\n\ncategories = np.array(['A', 'B', 'A', 'C', 'B', 'A', 'C', 'B'])\ntargets = np.array([1, 0, 1, 0, 1, 0, 1, 0])\nencoded = target_encode(categories, targets)\nprint(f\"Categories: {categories}\")\nprint(f\"Encoded: {encoded}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Bayesian Optimization with Optuna",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pip install optuna\nimport optuna\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\ndef objective(trial):\n    X, y = load_iris(return_X_y=True)\n    n_estimators = trial.suggest_int('n_estimators', 50, 200)\n    max_depth = trial.suggest_int('max_depth', 2, 10)\n    rf = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)\n    return cross_val_score(rf, X, y, cv=3).mean()\n\nstudy = optuna.create_study(direction='maximize')\nstudy.optimize(objective, n_trials=20, show_progress_bar=False)\nprint(f\"Best params: {study.best_params}\")\nprint(f\"Best score: {study.best_value:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Save and Load Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import joblib\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nmodel = RandomForestClassifier(random_state=42)\nmodel.fit(X, y)\n\n# Save\njoblib.dump(model, 'rf_model.joblib')\nprint(\"Model saved\")\n\n# Load\nloaded_model = joblib.load('rf_model.joblib')\nprint(f\"Loaded model accuracy: {loaded_model.score(X, y):.4f}\")\n\nimport os\nos.remove('rf_model.joblib')"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
