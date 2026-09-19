/* ============================================================================
   PRACTICE P1.1 — Programs · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.1",
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
   "text": "Programs · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Train-Test Split",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import train_test_split\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\nprint(f\"Train: {X_train.shape}, Test: {X_test.shape}\")\n# Train: (120, 4), Test: (30, 4)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Logistic Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import accuracy_score\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = LogisticRegression(max_iter=200)\nmodel.fit(X_train, y_train)\nprint(f\"Accuracy: {accuracy_score(y_test, model.predict(X_test)):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Linear Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import LinearRegression\nfrom sklearn.datasets import make_regression\nfrom sklearn.metrics import mean_squared_error\nimport numpy as np\n\nX, y = make_regression(n_samples=100, n_features=3, noise=10, random_state=42)\nmodel = LinearRegression()\nmodel.fit(X, y)\nprint(f\"Coefficients: {model.coef_}\")\nprint(f\"Intercept: {model.intercept_:.4f}\")\nprint(f\"R²: {model.score(X, y):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Decision Tree Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.tree import DecisionTreeClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\ntree = DecisionTreeClassifier(max_depth=3, random_state=42)\ntree.fit(X_train, y_train)\nprint(f\"Train Acc: {tree.score(X_train, y_train):.4f}\")\nprint(f\"Test Acc: {tree.score(X_test, y_test):.4f}\")\nprint(f\"Feature importances: {tree.feature_importances_}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Random Forest Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_wine\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_wine(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nrf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)\nrf.fit(X_train, y_train)\nprint(f\"Accuracy: {rf.score(X_test, y_test):.4f}\")\nprint(f\"Top 3 features: {sorted(zip(rf.feature_importances_, range(X.shape[1])), reverse=True)[:3]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "6",
   "q": "K-Nearest Neighbors",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.datasets import load_digits\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = load_digits(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nscaler = StandardScaler()\nX_train_s = scaler.fit_transform(X_train)\nX_test_s = scaler.transform(X_test)\nknn = KNeighborsClassifier(n_neighbors=5)\nknn.fit(X_train_s, y_train)\nprint(f\"KNN Accuracy: {knn.score(X_test_s, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Support Vector Machine",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.svm import SVC\nfrom sklearn.datasets import make_classification\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = make_classification(n_samples=200, n_features=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nscaler = StandardScaler()\nX_train_s = scaler.fit_transform(X_train)\nX_test_s = scaler.transform(X_test)\nsvm = SVC(kernel='rbf', C=1.0, gamma='scale')\nsvm.fit(X_train_s, y_train)\nprint(f\"SVM Accuracy: {svm.score(X_test_s, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Naive Bayes Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.naive_bayes import GaussianNB\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nnb = GaussianNB()\nnb.fit(X_train, y_train)\nprint(f\"Accuracy: {nb.score(X_test, y_test):.4f}\")\nprint(f\"Class priors: {nb.class_prior_}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "9",
   "q": "K-Means Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import KMeans\nfrom sklearn.datasets import make_blobs\nimport numpy as np\n\nX, y_true = make_blobs(n_samples=300, centers=4, random_state=42)\nkmeans = KMeans(n_clusters=4, random_state=42, n_init=10)\nkmeans.fit(X)\nprint(f\"Cluster centers:\\n{kmeans.cluster_centers_}\")\nprint(f\"Inertia: {kmeans.inertia_:.2f}\")\nprint(f\"Labels sample: {kmeans.labels_[:10]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "DBSCAN Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import DBSCAN\nfrom sklearn.datasets import make_moons\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = make_moons(n_samples=300, noise=0.1, random_state=42)\nX_scaled = StandardScaler().fit_transform(X)\ndb = DBSCAN(eps=0.3, min_samples=5)\nlabels = db.fit_predict(X_scaled)\nn_clusters = len(set(labels)) - (1 if -1 in labels else 0)\nn_noise = list(labels).count(-1)\nprint(f\"Clusters: {n_clusters}, Noise points: {n_noise}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "11",
   "q": "PCA Dimensionality Reduction",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.decomposition import PCA\nfrom sklearn.datasets import load_digits\nimport numpy as np\n\nX, y = load_digits(return_X_y=True)\npca = PCA(n_components=0.95)  # Retain 95% variance\nX_pca = pca.fit_transform(X)\nprint(f\"Original: {X.shape[1]} features\")\nprint(f\"Reduced: {X_pca.shape[1]} features\")\nprint(f\"Variance retained: {sum(pca.explained_variance_ratio_):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Cross-Validation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import cross_val_score\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nrf = RandomForestClassifier(n_estimators=50, random_state=42)\nscores = cross_val_score(rf, X, y, cv=5, scoring='accuracy')\nprint(f\"CV Scores: {scores}\")\nprint(f\"Mean: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Grid Search Hyperparameter Tuning",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import GridSearchCV\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nparam_grid = {'C': [0.1, 1, 10], 'kernel': ['linear', 'rbf'], 'gamma': ['scale', 'auto']}\ngrid = GridSearchCV(SVC(), param_grid, cv=3, scoring='accuracy', refit=True)\ngrid.fit(X, y)\nprint(f\"Best params: {grid.best_params_}\")\nprint(f\"Best score: {grid.best_score_:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Confusion Matrix",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import confusion_matrix, classification_report\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nrf = RandomForestClassifier(random_state=42)\nrf.fit(X_train, y_train)\ny_pred = rf.predict(X_test)\nprint(confusion_matrix(y_test, y_pred))\nprint(classification_report(y_test, y_pred))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "15",
   "q": "ROC Curve and AUC",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import roc_curve, auc\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.datasets import make_classification\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_classification(n_samples=500, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = LogisticRegression(max_iter=200)\nmodel.fit(X_train, y_train)\ny_proba = model.predict_proba(X_test)[:, 1]\nfpr, tpr, thresholds = roc_curve(y_test, y_proba)\nroc_auc = auc(fpr, tpr)\nprint(f\"AUC: {roc_auc:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Feature Scaling Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\npipe = Pipeline([\n    ('scaler', StandardScaler()),\n    ('svm', SVC(kernel='rbf'))\n])\nscores = cross_val_score(pipe, X, y, cv=5)\nprint(f\"Pipeline CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "17",
   "q": "One-Hot Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import OneHotEncoder\nimport numpy as np\n\ndata = np.array([['red'], ['blue'], ['green'], ['red'], ['blue']])\nencoder = OneHotEncoder(sparse_output=False)\nencoded = encoder.fit_transform(data)\nprint(f\"Categories: {encoder.categories_[0]}\")\nprint(f\"Encoded:\\n{encoded}\")\n# [[0. 0. 1.]\n#  [1. 0. 0.]\n#  [0. 1. 0.]\n#  [0. 0. 1.]\n#  [1. 0. 0.]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Label Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import LabelEncoder\n\nlabels = ['cat', 'dog', 'cat', 'bird', 'dog', 'bird']\nle = LabelEncoder()\nencoded = le.fit_transform(labels)\nprint(f\"Encoded: {encoded}\")  # [1 2 1 0 2 0]\nprint(f\"Decoded: {le.inverse_transform([0, 1, 2])}\")  # ['bird' 'cat' 'dog']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Handling Missing Values with Imputer",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.impute import SimpleImputer\nimport numpy as np\n\nX = np.array([[1, 2, np.nan], [3, np.nan, 6], [7, 8, 9], [np.nan, 11, 12]])\nimputer_mean = SimpleImputer(strategy='mean')\nimputer_median = SimpleImputer(strategy='median')\nprint(f\"Mean imputed:\\n{imputer_mean.fit_transform(X)}\")\nprint(f\"Median imputed:\\n{imputer_median.fit_transform(X)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Polynomial Features",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import PolynomialFeatures\nimport numpy as np\n\nX = np.array([[2, 3], [4, 5]])\npoly = PolynomialFeatures(degree=2, include_bias=False)\nX_poly = poly.fit_transform(X)\nprint(f\"Feature names: {poly.get_feature_names_out()}\")\nprint(f\"Transformed:\\n{X_poly}\")\n# [x0, x1, x0^2, x0*x1, x1^2]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Gradient Boosting Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import GradientBoostingClassifier\nfrom sklearn.datasets import load_wine\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_wine(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\ngb = GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)\ngb.fit(X_train, y_train)\nprint(f\"Train: {gb.score(X_train, y_train):.4f}, Test: {gb.score(X_test, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "22",
   "q": "XGBoost Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pip install xgboost\nfrom sklearn.datasets import load_breast_cancer\nfrom sklearn.model_selection import train_test_split\nfrom xgboost import XGBClassifier\n\nX, y = load_breast_cancer(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nxgb = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42, eval_metric='logloss')\nxgb.fit(X_train, y_train)\nprint(f\"XGBoost Accuracy: {xgb.score(X_test, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Ridge Regression (L2)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import Ridge\nfrom sklearn.datasets import make_regression\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_regression(n_samples=200, n_features=20, noise=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nridge = Ridge(alpha=1.0)\nridge.fit(X_train, y_train)\nprint(f\"R²: {ridge.score(X_test, y_test):.4f}\")\nprint(f\"Num non-zero coeffs: {sum(abs(c) > 0.01 for c in ridge.coef_)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Lasso Regression (L1)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import Lasso\nfrom sklearn.datasets import make_regression\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_regression(n_samples=200, n_features=20, n_informative=5, noise=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nlasso = Lasso(alpha=1.0)\nlasso.fit(X_train, y_train)\nprint(f\"R²: {lasso.score(X_test, y_test):.4f}\")\nprint(f\"Non-zero coefficients: {sum(abs(c) > 0.01 for c in lasso.coef_)} / {len(lasso.coef_)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "25",
   "q": "ElasticNet Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import ElasticNet\nfrom sklearn.datasets import make_regression\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_regression(n_samples=200, n_features=20, n_informative=5, noise=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nenet = ElasticNet(alpha=0.5, l1_ratio=0.5)  # Mix of L1 and L2\nenet.fit(X_train, y_train)\nprint(f\"R²: {enet.score(X_test, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
