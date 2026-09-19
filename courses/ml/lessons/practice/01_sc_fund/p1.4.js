/* ============================================================================
   PRACTICE P1.4 — Programs · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.4",
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
   "text": "Programs · 4",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "76",
   "q": "Cosine Similarity",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics.pairwise import cosine_similarity\nimport numpy as np\n\ndoc1 = np.array([[1, 0, 1, 1, 0]])  # TF vector\ndoc2 = np.array([[1, 1, 0, 1, 0]])\ndoc3 = np.array([[0, 0, 0, 0, 1]])  # Completely different\nprint(f\"doc1 vs doc2: {cosine_similarity(doc1, doc2)[0][0]:.4f}\")\nprint(f\"doc1 vs doc3: {cosine_similarity(doc1, doc3)[0][0]:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "77",
   "q": "TF-IDF Vectorization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_extraction.text import TfidfVectorizer\n\ndocs = [\n    \"I love machine learning\",\n    \"Machine learning is great\",\n    \"Deep learning is a subset of machine learning\",\n    \"I love deep learning too\"\n]\ntfidf = TfidfVectorizer()\nmatrix = tfidf.fit_transform(docs)\nprint(f\"Vocabulary: {tfidf.get_feature_names_out()}\")\nprint(f\"TF-IDF shape: {matrix.shape}\")\nprint(f\"Doc 0 vector: {matrix[0].toarray()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "78",
   "q": "CountVectorizer (Bag of Words)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_extraction.text import CountVectorizer\n\ncorpus = [\"cat sat on mat\", \"dog sat on log\", \"cat and dog are friends\"]\ncv = CountVectorizer()\nX = cv.fit_transform(corpus)\nprint(f\"Vocabulary: {cv.get_feature_names_out()}\")\nprint(f\"BoW matrix:\\n{X.toarray()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "79",
   "q": "Spectral Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import SpectralClustering\nfrom sklearn.datasets import make_moons\n\nX, y_true = make_moons(n_samples=200, noise=0.1, random_state=42)\nsc = SpectralClustering(n_clusters=2, affinity='nearest_neighbors', n_neighbors=10, random_state=42)\nlabels = sc.fit_predict(X)\nfrom sklearn.metrics import adjusted_rand_score\nprint(f\"Adjusted Rand Index: {adjusted_rand_score(y_true, labels):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "80",
   "q": "LDA (Linear Discriminant Analysis)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.discriminant_analysis import LinearDiscriminantAnalysis\nfrom sklearn.datasets import load_wine\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_wine(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nlda = LinearDiscriminantAnalysis(n_components=2)\nX_train_lda = lda.fit_transform(X_train, y_train)\nprint(f\"LDA components shape: {X_train_lda.shape}\")\nprint(f\"Accuracy: {lda.score(X_test, y_test):.4f}\")\nprint(f\"Explained variance ratio: {lda.explained_variance_ratio_}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "81",
   "q": "Regression Metrics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.datasets import make_regression\nfrom sklearn.model_selection import train_test_split\nimport numpy as np\n\nX, y = make_regression(n_samples=200, n_features=5, noise=20, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = LinearRegression().fit(X_train, y_train)\ny_pred = model.predict(X_test)\nprint(f\"MSE:  {mean_squared_error(y_test, y_pred):.4f}\")\nprint(f\"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}\")\nprint(f\"MAE:  {mean_absolute_error(y_test, y_pred):.4f}\")\nprint(f\"R²:   {r2_score(y_test, y_pred):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "82",
   "q": "Nearest Neighbors Search",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import NearestNeighbors\nimport numpy as np\n\nX = np.array([[0, 0], [1, 1], [2, 2], [3, 3], [10, 10]])\nnn = NearestNeighbors(n_neighbors=3, metric='euclidean')\nnn.fit(X)\ndistances, indices = nn.kneighbors([[1.5, 1.5]])\nprint(f\"Query point: [1.5, 1.5]\")\nprint(f\"Nearest indices: {indices[0]}\")\nprint(f\"Distances: {distances[0]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "83",
   "q": "Feature Hashing (FeatureHasher)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_extraction import FeatureHasher\n\nraw_data = [\n    {'color': 'red', 'size': 'large'},\n    {'color': 'blue', 'size': 'small'},\n    {'color': 'green', 'size': 'medium'},\n]\nhasher = FeatureHasher(n_features=8, input_type='dict')\nX = hasher.transform(raw_data)\nprint(f\"Hashed features:\\n{X.toarray()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Incremental Learning (Partial Fit)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import SGDClassifier\nfrom sklearn.datasets import load_digits\nfrom sklearn.model_selection import train_test_split\nimport numpy as np\n\nX, y = load_digits(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nsgd = SGDClassifier(random_state=42)\nclasses = np.unique(y)\nbatch_size = 100\nfor i in range(0, len(X_train), batch_size):\n    X_batch = X_train[i:i+batch_size]\n    y_batch = y_train[i:i+batch_size]\n    sgd.partial_fit(X_batch, y_batch, classes=classes)\n    print(f\"Batch {i//batch_size}: Test acc = {sgd.score(X_test, y_test):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "85",
   "q": "Quantile Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import QuantileRegressor\nimport numpy as np\n\nnp.random.seed(42)\nX = np.sort(np.random.uniform(0, 10, 100)).reshape(-1, 1)\ny = 2*X.flatten() + np.random.randn(100) * (X.flatten()/2)  # Heteroscedastic\n\nfor q in [0.1, 0.5, 0.9]:\n    qr = QuantileRegressor(quantile=q, alpha=0.01, solver='highs')\n    qr.fit(X, y)\n    print(f\"Quantile {q}: coef={qr.coef_[0]:.4f}, intercept={qr.intercept_:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "86",
   "q": "Ordinal Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import OrdinalEncoder\nimport numpy as np\n\nX = np.array([['low', 'S'], ['medium', 'M'], ['high', 'L'], ['low', 'XL']])\nencoder = OrdinalEncoder(categories=[['low', 'medium', 'high'], ['S', 'M', 'L', 'XL']])\nX_enc = encoder.fit_transform(X)\nprint(f\"Encoded:\\n{X_enc}\")\nprint(f\"Decoded:\\n{encoder.inverse_transform(X_enc)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "87",
   "q": "Power Transformer (Box-Cox)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import PowerTransformer\nimport numpy as np\n\nnp.random.seed(42)\nX = np.random.exponential(2, (100, 2))  # Skewed data\npt = PowerTransformer(method='yeo-johnson')\nX_transformed = pt.fit_transform(X)\nprint(f\"Before - Mean: {X.mean(axis=0)}, Std: {X.std(axis=0)}\")\nprint(f\"After  - Mean: {X_transformed.mean(axis=0).round(4)}, Std: {X_transformed.std(axis=0).round(4)}\")\n# After: approximately standard normal distribution"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "88",
   "q": "K-Fold with Model Selection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import KFold\nfrom sklearn.linear_model import Ridge\nfrom sklearn.metrics import mean_squared_error\nfrom sklearn.datasets import make_regression\nimport numpy as np\n\nX, y = make_regression(n_samples=200, n_features=10, noise=15, random_state=42)\nkf = KFold(n_splits=5, shuffle=True, random_state=42)\nfor alpha in [0.01, 0.1, 1.0, 10.0, 100.0]:\n    mse_scores = []\n    for train_idx, val_idx in kf.split(X):\n        model = Ridge(alpha=alpha).fit(X[train_idx], y[train_idx])\n        pred = model.predict(X[val_idx])\n        mse_scores.append(mean_squared_error(y[val_idx], pred))\n    print(f\"alpha={alpha:6.2f}: MSE = {np.mean(mse_scores):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "89",
   "q": "Spline Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import SplineTransformer\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.pipeline import make_pipeline\nimport numpy as np\n\nnp.random.seed(42)\nX = np.sort(np.random.uniform(0, 10, 200)).reshape(-1, 1)\ny = np.sin(X.flatten()) + np.random.randn(200) * 0.3\n\nmodel = make_pipeline(SplineTransformer(n_knots=5, degree=3), LinearRegression())\nmodel.fit(X, y)\nprint(f\"R² (Spline): {model.score(X, y):.4f}\")\nplain = LinearRegression().fit(X, y)\nprint(f\"R² (Linear): {plain.score(X, y):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "90",
   "q": "Cross-Validated Predictions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import cross_val_predict\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.metrics import accuracy_score\n\nX, y = load_iris(return_X_y=True)\nrf = RandomForestClassifier(random_state=42)\ny_pred = cross_val_predict(rf, X, y, cv=5)\nprint(f\"CV Predicted labels: {y_pred[:10]}\")\nprint(f\"Overall accuracy: {accuracy_score(y, y_pred):.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "91",
   "q": "Successive Halving Search",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.experimental import enable_halving_search_cv\nfrom sklearn.model_selection import HalvingGridSearchCV\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nparam_grid = {'n_estimators': [50, 100, 200], 'max_depth': [3, 5, 7, None]}\nsearch = HalvingGridSearchCV(RandomForestClassifier(random_state=42), param_grid,\n                              cv=3, factor=2, random_state=42)\nsearch.fit(X, y)\nprint(f\"Best params: {search.best_params_}\")\nprint(f\"Best score: {search.best_score_:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "92",
   "q": "Gaussian Process Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.gaussian_process import GaussianProcessClassifier\nfrom sklearn.gaussian_process.kernels import RBF\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\ngpc = GaussianProcessClassifier(kernel=RBF(1.0), random_state=42)\ngpc.fit(X_train, y_train)\nprint(f\"GPC Accuracy: {gpc.score(X_test, y_test):.4f}\")\nprint(f\"Probabilities (first 3):\\n{gpc.predict_proba(X_test)[:3]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "93",
   "q": "BIRCH Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import Birch\nfrom sklearn.datasets import make_blobs\n\nX, y_true = make_blobs(n_samples=500, centers=5, random_state=42)\nbirch = Birch(n_clusters=5, threshold=0.5)\nlabels = birch.fit_predict(X)\nfrom sklearn.metrics import adjusted_rand_score\nprint(f\"BIRCH Adjusted Rand Index: {adjusted_rand_score(y_true, labels):.4f}\")\nprint(f\"Subclusters: {birch.subcluster_centers_.shape[0]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "94",
   "q": "IQR Outlier Detection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef detect_outliers_iqr(data):\n    q1 = np.percentile(data, 25)\n    q3 = np.percentile(data, 75)\n    iqr = q3 - q1\n    lower = q1 - 1.5 * iqr\n    upper = q3 + 1.5 * iqr\n    outliers = data[(data < lower) | (data > upper)]\n    return outliers, lower, upper\n\nnp.random.seed(42)\ndata = np.concatenate([np.random.randn(100), [10, -8, 12]])\noutliers, lower, upper = detect_outliers_iqr(data)\nprint(f\"Bounds: [{lower:.2f}, {upper:.2f}]\")\nprint(f\"Outliers: {outliers}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "95",
   "q": "Pairwise Distance Matrix",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import pairwise_distances\nimport numpy as np\n\nX = np.array([[0, 0], [1, 1], [3, 3], [10, 10]])\nfor metric in ['euclidean', 'manhattan', 'cosine']:\n    dist = pairwise_distances(X, metric=metric)\n    print(f\"\\n{metric}:\\n{np.round(dist, 2)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "96",
   "q": "Latent Dirichlet Allocation (Topic Modeling)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.decomposition import LatentDirichletAllocation\nfrom sklearn.feature_extraction.text import CountVectorizer\n\ndocs = [\n    \"machine learning algorithms data science\",\n    \"deep neural network training\",\n    \"basketball football soccer sports\",\n    \"training data model prediction\",\n    \"soccer player goal championship\",\n]\ncv = CountVectorizer()\nX = cv.fit_transform(docs)\nlda = LatentDirichletAllocation(n_components=2, random_state=42)\nlda.fit(X)\nwords = cv.get_feature_names_out()\nfor i, topic in enumerate(lda.components_):\n    top_words = [words[j] for j in topic.argsort()[-3:]]\n    print(f\"Topic {i}: {top_words}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "97",
   "q": "Normalizer (Row-wise L2)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import Normalizer\nimport numpy as np\n\nX = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])\nnormalizer = Normalizer(norm='l2')\nX_normalized = normalizer.transform(X)\nprint(f\"Original:\\n{X}\")\nprint(f\"L2 Normalized:\\n{X_normalized.round(4)}\")\n# Each row now has unit L2 norm\nprint(f\"Row norms: {np.linalg.norm(X_normalized, axis=1)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "98",
   "q": "SelectKBest Feature Selection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nfeature_names = ['sepal_l', 'sepal_w', 'petal_l', 'petal_w']\nselector = SelectKBest(f_classif, k=2)\nX_selected = selector.fit_transform(X, y)\nselected = [name for name, mask in zip(feature_names, selector.get_support()) if mask]\nprint(f\"F-scores: {dict(zip(feature_names, selector.scores_.round(2)))}\")\nprint(f\"Selected: {selected}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "99",
   "q": "Cohen's Kappa Score",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import cohen_kappa_score\nimport numpy as np\n\n# Two raters classifying 20 items into 3 categories\nrater1 = [0, 0, 1, 1, 2, 2, 0, 1, 2, 0, 1, 1, 2, 0, 0, 1, 2, 2, 1, 0]\nrater2 = [0, 0, 1, 2, 2, 2, 0, 1, 2, 1, 1, 1, 2, 0, 0, 1, 2, 1, 1, 0]\nkappa = cohen_kappa_score(rater1, rater2)\nprint(f\"Cohen's Kappa: {kappa:.4f}\")\n# < 0 = No agreement, 0-0.2 = Slight, 0.2-0.4 = Fair\n# 0.4-0.6 = Moderate, 0.6-0.8 = Substantial, 0.8-1 = Almost perfect"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "100",
   "q": "Full ML Pipeline End-to-End",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import cross_val_score\nimport numpy as np\n\n# Create synthetic dataset with mixed types\nnp.random.seed(42)\nn = 200\nX_num = np.random.randn(n, 3)\nX_num[np.random.choice(n, 20), 0] = np.nan  # Add missing values\nX_cat = np.random.choice(['A', 'B', 'C'], n).reshape(-1, 1)\nX = np.hstack([X_num, X_cat])\ny = (X_num[:, 0] + X_num[:, 1] > 0).astype(int)\n\nnum_pipe = Pipeline([('imputer', SimpleImputer(strategy='mean')), ('scaler', StandardScaler())])\ncat_pipe = Pipeline([('encoder', OneHotEncoder(sparse_output=False))])\npreprocessor = ColumnTransformer([\n    ('num', num_pipe, [0, 1, 2]),\n    ('cat', cat_pipe, [3])\n])\nfull_pipe = Pipeline([('prep', preprocessor), ('clf', RandomForestClassifier(random_state=42))])\nscores = cross_val_score(full_pipe, X, y, cv=5, scoring='accuracy')\nprint(f\"Full Pipeline CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
