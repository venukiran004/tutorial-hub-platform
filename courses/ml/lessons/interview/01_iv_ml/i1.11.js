/* ============================================================================
   INTERVIEW I1.11 — Scikit-Learn Q&A · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.11",
 "lede": "**25 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Scikit-Learn Q&A · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the scikit-learn Estimator API and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Every algorithm in scikit-learn is an object exposing the same methods: `fit(X, y)` to learn, `predict(X)`/`transform(X)` to apply, plus `score`, `get_params`, and `set_params`. This uniformity means you can swap one model for another without touching the surrounding code."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.ensemble import RandomForestClassifier\n\nfor clf in (LogisticRegression(max_iter=200), RandomForestClassifier()):\n    clf.fit(X_train, y_train)           # identical calls\n    print(clf.score(X_test, y_test))    # identical interface"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Learned attributes carry a trailing underscore (`coef_`, `feature_importances_`); constructor hyperparameters do not. Once you know one estimator, you know them all."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between `fit`, `transform`, and `fit_transform`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`fit` learns parameters (e.g., a scaler's mean/std) and stores them.",
      "`transform` applies those learned parameters to data.",
      "`fit_transform` does both in one call and is often optimized."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scaler.fit(X_train)            # learns μ, σ from train\nX_tr = scaler.transform(X_train)\nX_te = scaler.transform(X_test)   # SAME μ, σ applied to test"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Call `fit`/`fit_transform` on **training data only**, then `transform` everything else. Calling `fit_transform` on the test set leaks information and inflates your scores."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is data leakage and how do you prevent it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Data leakage is when information from outside the training fold sneaks into the model — most commonly by fitting preprocessing on the whole dataset before splitting. The model then looks great in validation but fails in production."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# WRONG — scaler sees test statistics\nX_all = StandardScaler().fit_transform(X)\nX_tr, X_te = train_test_split(X_all, ...)\n\n# RIGHT — preprocessing inside a Pipeline, re-fit per CV fold\npipe = Pipeline([('sc', StandardScaler()), ('clf', LogisticRegression())])\ncross_val_score(pipe, X, y, cv=5)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Wrap all preprocessing in a Pipeline so it is re-fit on each fold's training portion. Also watch for target leakage (features computed from the target) and temporal leakage (future data in time series)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Why use a Pipeline instead of applying transforms manually?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A Pipeline chains preprocessing and the estimator into one object. Benefits: (1) no leakage — preprocessing is re-fit on each CV fold; (2) one serializable artifact; (3) works with GridSearchCV so you tune preprocessing and model together; (4) identical transforms guaranteed at train and inference time."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipe = Pipeline([('sc', StandardScaler()), ('clf', SVC())])\nGridSearchCV(pipe, {'clf__C': [0.1, 1, 10]}, cv=5).fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pipeline step parameters are addressed with `stepname__param` in grids."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What does ColumnTransformer do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It applies different transformers to different column subsets in parallel — e.g., scale numeric columns while one-hot encoding categoricals — and concatenates the results."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "ColumnTransformer([\n    ('num', StandardScaler(), numeric_cols),\n    ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols),\n], remainder='drop')   # or 'passthrough'"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Real datasets are mixed-type; ColumnTransformer is the standard way to handle them. Use `remainder='passthrough'` to keep untouched columns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "When do you need to scale features, and which scaler?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Scale for **distance- and gradient-based** models: SVM, KNN, logistic/linear regression with regularization, neural nets, PCA, K-Means. Tree-based models (Decision Tree, Random Forest, gradient boosting) are scale-invariant and need none."
    },
    {
     "t": "table",
     "head": [
      "Scaler",
      "Use when"
     ],
     "rows": [
      [
       "StandardScaler",
       "Default for most models"
      ],
      [
       "MinMaxScaler",
       "Bounded `[0,1]` needed"
      ],
      [
       "RobustScaler",
       "Outliers present (uses median/IQR)"
      ],
      [
       "MaxAbsScaler",
       "Sparse data"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Scaling never hurts tree models but is mandatory for distance-based ones. Fit the scaler on train only."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Explain `train_test_split` and the role of `stratify`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It randomly partitions data into train and test sets. `stratify=y` keeps the class distribution identical in both splits — essential for classification, especially imbalanced data."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always stratify for classification; never shuffle time series (split chronologically). `random_state` makes the split reproducible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is cross-validation and which splitter do you choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Cross-validation repeatedly splits the data into train/validation folds and averages the scores, giving a lower-variance estimate of generalization than a single split."
    },
    {
     "t": "ul",
     "items": [
      "`StratifiedKFold` — classification (preserves class ratios).",
      "`KFold` — regression.",
      "`GroupKFold` — a group (patient/user) must not span folds.",
      "`TimeSeriesSplit` — temporal data (train always precedes test)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "cross_val_score(model, X, y, cv=StratifiedKFold(5), scoring='f1_weighted')"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Match the splitter to the data's structure; the wrong CV (e.g., shuffled KFold on time series) gives optimistic, invalid estimates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Compare Ridge, Lasso, and ElasticNet.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "All add a penalty to linear regression to control overfitting:"
    },
    {
     "t": "ul",
     "items": [
      "**Ridge (L2):** shrinks coefficients toward zero but never to exactly zero; handles multicollinearity; keeps all features.",
      "**Lasso (L1):** drives some coefficients to exactly zero → automatic feature selection; arbitrarily picks one among correlated features.",
      "**ElasticNet (L1+L2):** blends both via `l1_ratio`; better than Lasso with correlated features."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use Ridge when all features matter, Lasso for sparse/interpretable models, ElasticNet when features are correlated. All require scaling because the penalty is scale-dependent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How does `C` in SVM / LogisticRegression relate to regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`C` is the **inverse** of regularization strength. Small `C` = strong regularization (simpler model, more bias); large `C` = weak regularization (fits training data harder, more variance)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "LogisticRegression(C=0.01)   # heavy regularization\nLogisticRegression(C=100)    # almost unregularized"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It is inverted relative to `alpha` in Ridge/Lasso, where larger `alpha` means *more* regularization. Easy to confuse in interviews."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Random Forest vs Gradient Boosting — how do they differ?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both are tree ensembles but combine trees differently. **Random Forest** (bagging) trains many deep trees independently on bootstrap samples and averages them — reduces **variance**. **Gradient Boosting** trains shallow trees sequentially, each correcting the previous ensemble's errors — reduces **bias**."
    },
    {
     "t": "table",
     "head": [
      "",
      "Random Forest",
      "Gradient Boosting"
     ],
     "rows": [
      [
       "Trees",
       "Independent, deep",
       "Sequential, shallow"
      ],
      [
       "Reduces",
       "Variance",
       "Bias"
      ],
      [
       "Parallel",
       "Yes (`n_jobs=-1`)",
       "No (sequential)"
      ],
      [
       "Overfitting",
       "Hard to overfit",
       "Easier; tune learning rate / early stopping"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** RF is a robust low-effort baseline; boosting (XGBoost/LightGBM) usually wins on tabular data with proper tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "When would you pick LightGBM over XGBoost or CatBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**LightGBM:** fastest on large datasets (histogram + leaf-wise growth), low memory; can overfit small data via `num_leaves`.",
      "**XGBoost:** strong regularization, GPU support, very mature.",
      "**CatBoost:** best native categorical handling (ordered target encoding), great defaults."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Start with LightGBM for speed, reach for CatBoost when you have many high-cardinality categoricals, and use XGBoost as a strong, well-documented alternative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "GridSearchCV vs RandomizedSearchCV vs HalvingRandomSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**GridSearchCV:** exhaustive over the grid — guaranteed best in the grid but explodes combinatorially.",
      "**RandomizedSearchCV:** samples `n_iter` random combinations from distributions — far more efficient for large/continuous spaces.",
      "**HalvingRandomSearchCV:** successive halving — trains many candidates on little data, keeps the best for more data; fastest."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use Grid for tiny spaces, Randomized for large ones, Halving when compute is the bottleneck."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Why is accuracy a poor metric for imbalanced data? What instead?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "With 99% negatives, a model predicting \"negative\" for everything scores 99% accuracy while being useless. Use metrics that focus on the minority class: precision, recall, F1, PR-AUC, and Matthews Correlation Coefficient."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import average_precision_score, f1_score\naverage_precision_score(y_test, y_prob)   # PR-AUC — robust to imbalance"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer **PR-AUC** over ROC-AUC under severe imbalance — ROC-AUC can look deceptively high."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Explain precision, recall, and F1.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision** = TP / (TP + FP): of predicted positives, how many are correct.",
      "**Recall** = TP / (TP + FN): of actual positives, how many were caught.",
      "**F1** = harmonic mean of precision and recall."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import classification_report\nprint(classification_report(y_test, y_pred, digits=3))"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Optimize precision when false positives are costly (spam), recall when false negatives are costly (cancer screening), and F1 when you need one balanced number."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What does the confusion matrix tell you?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It tabulates predictions against actual labels: rows = actual, columns = predicted. The off-diagonal cells are the errors (false positives and false negatives), which precision/recall are derived from."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import confusion_matrix\nconfusion_matrix(y_test, y_pred)\n# [[TN FP]\n#  [FN TP]]"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It exposes *which kind* of error your model makes, not just how often — crucial for choosing the right metric and threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is ROC-AUC and how does it differ from PR-AUC?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**ROC-AUC** plots TPR vs FPR across thresholds; 1.0 is perfect, 0.5 is random. It is threshold-independent. **PR-AUC** plots precision vs recall and is more informative when positives are rare because it ignores the large number of true negatives."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** ROC-AUC for roughly balanced data; PR-AUC for severe imbalance. Both summarize ranking quality across all thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do you handle a 1:100 class imbalance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Layered approach: (1) use PR-AUC/F1, not accuracy; (2) `class_weight='balanced'`; (3) resample with SMOTE inside an imbalanced-learn pipeline (train-time only); (4) tune the decision threshold on validation; (5) collect more minority data if possible."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from imblearn.over_sampling import SMOTE\nfrom imblearn.pipeline import Pipeline as ImbPipeline\nImbPipeline([('smote', SMOTE()), ('clf', LGBMClassifier())])"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** SMOTE must be applied only during `fit` — the imbalanced-learn pipeline handles this automatically; never resample the test set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is SMOTE and how is it different from random oversampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "SMOTE (Synthetic Minority Over-sampling) creates **new** synthetic minority samples by interpolating between a minority point and its k nearest neighbors. Random oversampling just duplicates existing minority rows."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Duplicates encourage overfitting to exact copies; SMOTE generates plausible new points and generalizes better. ADASYN is a variant focusing synthesis near the decision boundary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is model calibration and when do you need it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Calibration ensures predicted probabilities match real frequencies — when the model says 0.7, ~70% of such cases should be positive. Needed when decisions rest on probability thresholds (fraud, medical risk) or when comparing models by log loss."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.calibration import CalibratedClassifierCV\nCalibratedClassifierCV(rf, method='isotonic', cv=5).fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Random Forest and SVM are often poorly calibrated; logistic regression usually is not. Use Platt (`'sigmoid'`) for small data, isotonic for larger."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "SimpleImputer vs KNNImputer vs IterativeImputer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SimpleImputer:** fills with mean/median/most_frequent/constant — fast, no relationships used.",
      "**KNNImputer:** fills from the k nearest complete rows — captures local structure, slower.",
      "**IterativeImputer (MICE):** models each feature from the others round-robin — most powerful, experimental."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Median is the safe default for skewed numeric data; most_frequent for categoricals. Put the imputer in the Pipeline so statistics are learned per fold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Compare OneHotEncoder, OrdinalEncoder, and LabelEncoder.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**OneHotEncoder:** one binary column per category — for nominal features.",
      "**OrdinalEncoder:** integer codes for ordered categories (low<med<high) — for features.",
      "**LabelEncoder:** integer codes for the **target** `y` only."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never use LabelEncoder on features — its arbitrary integers imply a false ordering. Use `handle_unknown='ignore'` on OneHotEncoder to survive unseen categories at inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the difference between `predict` and `predict_proba`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`predict` returns the final class label (using a 0.5 threshold for binary); `predict_proba` returns class probabilities, letting you choose a custom threshold or rank by confidence."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "clf.predict(X)[:3]                 # array([1, 0, 1])\nclf.predict_proba(X)[:3].round(2)  # array([[0.2, 0.8], [0.7, 0.3], [0.4, 0.6]])"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** For imbalanced problems, use `predict_proba` plus a tuned threshold rather than the default 0.5."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you choose the classification threshold?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Compute precision/recall across thresholds and pick the one optimizing your objective (max F1, or a target recall)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import precision_recall_curve\nimport numpy as np\np, r, thr = precision_recall_curve(y_test, y_prob)\nbest = thr[np.argmax(2*p[:-1]*r[:-1] / (p[:-1]+r[:-1]+1e-9))]\ny_pred = (y_prob >= best).astype(int)"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Tune the threshold on a validation set, never on the test set, and align it with the business cost of FP vs FN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Filter vs wrapper vs embedded feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Filter** (`SelectKBest`, `VarianceThreshold`): score features by a statistic independent of any model — fast.",
      "**Wrapper** (`RFE`, `SequentialFeatureSelector`): repeatedly train a model and add/drop features — accurate but expensive.",
      "**Embedded** (`SelectFromModel`, Lasso): selection happens during model fitting via importances/coefficients."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Embedded methods are usually the best speed/quality trade-off; always do selection inside CV to avoid leakage."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
