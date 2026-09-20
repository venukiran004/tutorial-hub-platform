/* ============================================================================
   PRACTICE P1.3 — Programs · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.3",
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
   "text": "Programs · 3",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "Multiclass ROC AUC",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import roc_auc_score\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nrf = RandomForestClassifier(random_state=42).fit(X_train, y_train)\ny_proba = rf.predict_proba(X_test)\nauc = roc_auc_score(y_test, y_proba, multi_class='ovr')\nprint(f\"Multiclass AUC (OVR): {auc:.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Multiclass AUC (OVR): 1.0000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "52",
   "q": "MinMax Scaling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import MinMaxScaler\nimport numpy as np\n\nX = np.array([[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]])\nscaler = MinMaxScaler(feature_range=(0, 1))\nX_scaled = scaler.fit_transform(X)\nprint(f\"Original:\\n{X}\")\nprint(f\"Scaled:\\n{X_scaled}\")\nprint(f\"Min: {X_scaled.min(axis=0)}, Max: {X_scaled.max(axis=0)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original:\n[[ 1 10]\n [ 2 20]\n [ 3 30]\n [ 4 40]\n [ 5 50]]\nScaled:\n[[0.   0.  ]\n [0.25 0.25]\n [0.5  0.5 ]\n [0.75 0.75]\n [1.   1.  ]]\nMin: [0. 0.], Max: [1. 1.]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Robust Scaler (Outlier-Resistant)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import RobustScaler\nimport numpy as np\n\nX = np.array([[1], [2], [3], [4], [5], [100]])  # 100 is outlier\nstandard = (X - X.mean()) / X.std()\nrobust = RobustScaler().fit_transform(X)\nprint(f\"Standard scaled: {standard.flatten()}\")\nprint(f\"Robust scaled:   {robust.flatten()}\")\n# Robust scaler uses median & IQR, so outlier has less effect"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Standard scaled: [-0.50221883 -0.47457376 -0.44692869 -0.41928361 -0.39163854  2.23464343]\nRobust scaled:   [-1.  -0.6 -0.2  0.2  0.6 38.6]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Multi-Output Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.multioutput import MultiOutputRegressor\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.datasets import make_regression\nfrom sklearn.model_selection import train_test_split\n\nX, y = make_regression(n_samples=200, n_features=5, n_targets=3, noise=10, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = MultiOutputRegressor(GradientBoostingRegressor(random_state=42))\nmodel.fit(X_train, y_train)\nprint(f\"R² per target: {[f'{s:.4f}' for s in model.score(X_test, y_test)]}\" \n      if hasattr(model, 'score') else \"\")\nprint(f\"Predictions shape: {model.predict(X_test).shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "[did not run to completion] TypeError: 'float' object is not iterable — MultiOutputRegressor.score returns one uniform-average R² (a float), not a list per target, so the comprehension in the print fails. With print(f\"R² (uniform average): {model.score(X_test, y_test):.4f}\") the program prints R² (uniform average): 0.9257 and Predictions shape: (40, 3)."
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Elbow Method for Optimal K",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import KMeans\nfrom sklearn.datasets import make_blobs\nimport numpy as np\n\nX, _ = make_blobs(n_samples=300, centers=4, random_state=42)\ninertias = []\nK_range = range(1, 10)\nfor k in K_range:\n    km = KMeans(n_clusters=k, random_state=42, n_init=10)\n    km.fit(X)\n    inertias.append(km.inertia_)\n    print(f\"k={k}: Inertia={km.inertia_:.2f}\")\n# Look for \"elbow\" — where inertia decrease slows significantly"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "k=1: Inertia=19953.77\nk=2: Inertia=9416.21\nk=3: Inertia=2110.41\nk=4: Inertia=564.91\nk=5: Inertia=512.39\nk=6: Inertia=460.31\nk=7: Inertia=408.95\nk=8: Inertia=360.82\nk=9: Inertia=325.37"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Mean Shift Clustering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.cluster import MeanShift, estimate_bandwidth\nfrom sklearn.datasets import make_blobs\n\nX, _ = make_blobs(n_samples=300, centers=3, random_state=42)\nbandwidth = estimate_bandwidth(X, quantile=0.2)\nms = MeanShift(bandwidth=bandwidth)\nlabels = ms.fit_predict(X)\nprint(f\"Bandwidth: {bandwidth:.2f}\")\nprint(f\"Clusters found: {len(set(labels))}\")\nprint(f\"Cluster centers:\\n{ms.cluster_centers_}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Bandwidth: 1.86\nClusters found: 4\nCluster centers:\n[[-2.71222175  8.97784992]\n [ 4.70229938  2.03600817]\n [-6.90964148 -7.05930286]\n [ 5.15492652  5.82590117]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "57",
   "q": "Polynomial Regression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.pipeline import make_pipeline\nimport numpy as np\n\nnp.random.seed(42)\nX = np.sort(np.random.uniform(0, 10, 100)).reshape(-1, 1)\ny = 2 * X.flatten()**2 - 3*X.flatten() + 5 + np.random.randn(100)*10\nfor degree in [1, 2, 3, 5]:\n    model = make_pipeline(PolynomialFeatures(degree), LinearRegression())\n    model.fit(X, y)\n    print(f\"Degree {degree}: R² = {model.score(X, y):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Degree 1: R² = 0.8913\nDegree 2: R² = 0.9702\nDegree 3: R² = 0.9703\nDegree 5: R² = 0.9707"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Time Series Train-Test Split",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import TimeSeriesSplit\nimport numpy as np\n\nX = np.arange(100).reshape(-1, 1)\ny = np.sin(X.flatten() / 10) + np.random.randn(100) * 0.1\ntscv = TimeSeriesSplit(n_splits=5)\nfor fold, (train_idx, test_idx) in enumerate(tscv.split(X)):\n    print(f\"Fold {fold}: Train[{train_idx[0]}..{train_idx[-1]}], Test[{test_idx[0]}..{test_idx[-1]}]\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Fold 0: Train[0..19], Test[20..35]\nFold 1: Train[0..35], Test[36..51]\nFold 2: Train[0..51], Test[52..67]\nFold 3: Train[0..67], Test[68..83]\nFold 4: Train[0..83], Test[84..99]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Calibrated Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.calibration import CalibratedClassifierCV\nfrom sklearn.svm import SVC\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nsvm = SVC(kernel='rbf')  # SVM doesn't output probabilities natively\ncal_svm = CalibratedClassifierCV(svm, cv=3)\ncal_svm.fit(X_train, y_train)\nproba = cal_svm.predict_proba(X_test)\nprint(f\"Calibrated probabilities (first 3):\\n{proba[:3]}\")\nprint(f\"Accuracy: {cal_svm.score(X_test, y_test):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Calibrated probabilities (first 3):\n[[0.02766501 0.81005563 0.16227936]\n [0.90447383 0.09104197 0.0044842 ]\n [0.03571224 0.02643839 0.93784937]]\nAccuracy: 1.0000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Recursive Feature Elimination",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import RFE\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nfeature_names = ['sepal_l', 'sepal_w', 'petal_l', 'petal_w']\nrfe = RFE(RandomForestClassifier(random_state=42), n_features_to_select=2)\nrfe.fit(X, y)\nselected = [name for name, sel in zip(feature_names, rfe.support_) if sel]\nprint(f\"Selected features: {selected}\")\nprint(f\"Feature ranking: {dict(zip(feature_names, rfe.ranking_))}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Selected features: ['petal_l', 'petal_w']\nFeature ranking: {'sepal_l': np.int64(2), 'sepal_w': np.int64(3), 'petal_l': np.int64(1), 'petal_w': np.int64(1)}"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Custom Transformer in Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.base import BaseEstimator, TransformerMixin\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.datasets import load_iris\nimport numpy as np\n\nclass LogTransformer(BaseEstimator, TransformerMixin):\n    def fit(self, X, y=None):\n        return self\n    def transform(self, X):\n        return np.log1p(X)\n\npipe = Pipeline([\n    ('log', LogTransformer()),\n    ('clf', LogisticRegression(max_iter=200))\n])\nX, y = load_iris(return_X_y=True)\npipe.fit(X, y)\nprint(f\"Pipeline accuracy: {pipe.score(X, y):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Pipeline accuracy: 0.9400"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "62",
   "q": "Mutual Information Feature Selection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import mutual_info_classif\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nfeature_names = ['sepal_l', 'sepal_w', 'petal_l', 'petal_w']\nmi_scores = mutual_info_classif(X, y, random_state=42)\nfor name, score in sorted(zip(feature_names, mi_scores), key=lambda x: -x[1]):\n    print(f\"  {name}: MI = {score:.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "petal_l: MI = 0.9926\n  petal_w: MI = 0.9856\n  sepal_l: MI = 0.5114\n  sepal_w: MI = 0.2994"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "63",
   "q": "Local Outlier Factor",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import LocalOutlierFactor\nimport numpy as np\n\nnp.random.seed(42)\nX_normal = np.random.randn(200, 2)\nX_outliers = np.array([[5, 5], [-5, -5], [5, -5]])\nX = np.vstack([X_normal, X_outliers])\nlof = LocalOutlierFactor(n_neighbors=20, contamination=0.05)\nlabels = lof.fit_predict(X)\nprint(f\"Normal: {sum(labels == 1)}, Outliers: {sum(labels == -1)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Normal: 192, Outliers: 11"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Partial Dependence Plot Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.inspection import partial_dependence\nfrom sklearn.ensemble import GradientBoostingClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\ngb = GradientBoostingClassifier(n_estimators=50, random_state=42).fit(X, y)\npd_result = partial_dependence(gb, X, features=[0], kind='average')\nprint(f\"Feature 0 (sepal length) PDP values: {pd_result['average'][0][:5]}\")\nprint(f\"Grid values: {pd_result['grid_values'][0][:5]}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Feature 0 (sepal length) PDP values: [-1.04083759 -1.04083759 -1.04083759 -1.04083759 -1.04083759]\nGrid values: [4.3 4.4 4.5 4.6 4.7]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "65",
   "q": "UMAP Dimensionality Reduction",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pip install umap-learn\nfrom umap import UMAP\nfrom sklearn.datasets import load_digits\n\nX, y = load_digits(return_X_y=True)\numap = UMAP(n_components=2, random_state=42, n_neighbors=15, min_dist=0.1)\nX_2d = umap.fit_transform(X)\nprint(f\"Original: {X.shape} → UMAP: {X_2d.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original: (1797, 64) → UMAP: (1797, 2)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "66",
   "q": "SVD Decomposition",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.decomposition import TruncatedSVD\nfrom sklearn.datasets import load_digits\nimport numpy as np\n\nX, y = load_digits(return_X_y=True)\nsvd = TruncatedSVD(n_components=10, random_state=42)\nX_svd = svd.fit_transform(X)\nprint(f\"Explained variance ratio: {svd.explained_variance_ratio_.sum():.4f}\")\nprint(f\"Singular values: {svd.singular_values_[:5]}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Explained variance ratio: 0.7324\nSingular values: [2193.11933683  566.99677184  542.00493276  504.1516975   425.59296526]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "67",
   "q": "Label Binarizer",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import LabelBinarizer\n\nlb = LabelBinarizer()\nlabels = ['cat', 'dog', 'fish', 'cat', 'fish']\nbinarized = lb.fit_transform(labels)\nprint(f\"Classes: {lb.classes_}\")\nprint(f\"Binarized:\\n{binarized}\")\nprint(f\"Inverse: {lb.inverse_transform(binarized)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Classes: ['cat' 'dog' 'fish']\nBinarized:\n[[1 0 0]\n [0 1 0]\n [0 0 1]\n [1 0 0]\n [0 0 1]]\nInverse: ['cat' 'dog' 'fish' 'cat' 'fish']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "68",
   "q": "Variance Threshold Feature Selection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import VarianceThreshold\nimport numpy as np\n\nX = np.array([[0, 2, 0], [0, 4, 1], [0, 6, 0], [0, 8, 1], [0, 10, 0]])\nselector = VarianceThreshold(threshold=0.1)\nX_selected = selector.fit_transform(X)\nprint(f\"Variances: {selector.variances_}\")\nprint(f\"Selected features: {selector.get_support()}\")\nprint(f\"Original shape: {X.shape}, After: {X_selected.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Variances: [0.   8.   0.24]\nSelected features: [False  True  True]\nOriginal shape: (5, 3), After: (5, 2)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "69",
   "q": "Kernel PCA",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.decomposition import KernelPCA\nfrom sklearn.datasets import make_moons\n\nX, y = make_moons(n_samples=200, noise=0.1, random_state=42)\nkpca = KernelPCA(n_components=2, kernel='rbf', gamma=15)\nX_kpca = kpca.fit_transform(X)\nprint(f\"Original X range: [{X.min():.2f}, {X.max():.2f}]\")\nprint(f\"KernelPCA X range: [{X_kpca.min():.2f}, {X_kpca.max():.2f}]\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original X range: [-1.23, 2.14]\nKernelPCA X range: [-0.55, 0.82]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Multi-Label Classification",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.multiclass import OneVsRestClassifier\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import make_multilabel_classification\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import f1_score\n\nX, y = make_multilabel_classification(n_samples=500, n_features=10, n_classes=3, \n                                       n_labels=2, random_state=42)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nclf = OneVsRestClassifier(RandomForestClassifier(random_state=42))\nclf.fit(X_train, y_train)\ny_pred = clf.predict(X_test)\nprint(f\"F1 (micro): {f1_score(y_test, y_pred, average='micro'):.4f}\")\nprint(f\"F1 (macro): {f1_score(y_test, y_pred, average='macro'):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "F1 (micro): 0.8669\nF1 (macro): 0.8560"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "Bagging Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import BaggingClassifier\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\nbag = BaggingClassifier(\n    estimator=DecisionTreeClassifier(),\n    n_estimators=50, max_samples=0.8, max_features=0.8, random_state=42\n)\nscores = cross_val_score(bag, X, y, cv=5)\nprint(f\"Bagging CV: {scores.mean():.4f} ± {scores.std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Bagging CV: 0.9667 ± 0.0211"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "72",
   "q": "Extra Trees Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import ExtraTreesClassifier\nfrom sklearn.datasets import load_digits\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_digits(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\net = ExtraTreesClassifier(n_estimators=100, random_state=42)\net.fit(X_train, y_train)\nprint(f\"Extra Trees Accuracy: {et.score(X_test, y_test):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Extra Trees Accuracy: 0.9806"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "73",
   "q": "Nearest Centroid Classifier",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import NearestCentroid\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nnc = NearestCentroid()\nnc.fit(X_train, y_train)\nprint(f\"Accuracy: {nc.score(X_test, y_test):.4f}\")\nprint(f\"Centroids:\\n{nc.centroids_}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Accuracy: 0.9667\nCentroids:\n[[4.99       3.4525     1.45       0.245     ]\n [5.9195122  2.77073171 4.24146341 1.32195122]\n [6.53333333 2.96666667 5.52051282 2.        ]]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "74",
   "q": "Dummy Classifier (Baseline)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.dummy import DummyClassifier\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\n\nX, y = load_iris(return_X_y=True)\nfor strategy in ['most_frequent', 'stratified', 'uniform']:\n    dummy = DummyClassifier(strategy=strategy, random_state=42)\n    scores = cross_val_score(dummy, X, y, cv=5)\n    print(f\"Dummy ({strategy}): {scores.mean():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Dummy (most_frequent): 0.3333\nDummy (stratified): 0.3333\nDummy (uniform): 0.3667"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Train Multiple Models and Compare",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.datasets import load_iris\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier\nfrom sklearn.svm import SVC\nfrom sklearn.neighbors import KNeighborsClassifier\n\nX, y = load_iris(return_X_y=True)\nmodels = {\n    'LogReg': LogisticRegression(max_iter=200),\n    'DTree': DecisionTreeClassifier(max_depth=3),\n    'RF': RandomForestClassifier(n_estimators=50),\n    'GBM': GradientBoostingClassifier(n_estimators=50),\n    'SVM': SVC(),\n    'KNN': KNeighborsClassifier(n_neighbors=5),\n}\nfor name, model in models.items():\n    scores = cross_val_score(model, X, y, cv=5)\n    print(f\"{name:8s}: {scores.mean():.4f} ± {scores.std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "LogReg  : 0.9733 ± 0.0249\nDTree   : 0.9600 ± 0.0249\nRF      : 0.9667 ± 0.0211\nGBM     : 0.9600 ± 0.0327\nSVM     : 0.9667 ± 0.0211\nKNN     : 0.9733 ± 0.0249"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
