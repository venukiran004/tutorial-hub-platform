/* ============================================================================
   PRACTICE P1.7 — Scenarios · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.7",
 "lede": "**25 scenarios** from Fundamentals: Programs and Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Scenarios · 3",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "A model achieves 55% accuracy on both training and test data for a binary classification. What is the issue?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Underfitting (high bias)"
    },
    {
     "t": "p",
     "text": "**Explanation:** 55% on binary classification is barely better than random. Model is too simple to capture patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What happens if you train a linear regression model on this data?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "X: [1, 2, 3, 4, 5]\nY: [2, 4, 5, 4, 5]"
    },
    {
     "t": "p",
     "text": "**Answer:** The model will find the best-fit line minimizing MSE, approximately y ≈ 0.6x + 2.2"
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear regression minimizes sum of squared residuals. With noise, it finds the best linear approximation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "You have a dataset with 10,000 samples and 500 features. What is the risk?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Curse of dimensionality — risk of overfitting"
    },
    {
     "t": "p",
     "text": "**Explanation:** High feature-to-sample ratio increases overfitting risk. Consider dimensionality reduction (PCA) or feature selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What's wrong with this train/test split approach?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Time series data\nfrom sklearn.model_selection import train_test_split\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)"
    },
    {
     "t": "p",
     "text": "**Answer:** Data leakage — random split on time series allows future data to train and past data to test."
    },
    {
     "t": "p",
     "text": "**Explanation:** For time series, use chronological splits. Random split violates temporal ordering, causing overly optimistic results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "A dataset has 95% Class A and 5% Class B. A model predicts everything as Class A. What's the accuracy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** 95% accuracy — but the model is useless"
    },
    {
     "t": "p",
     "text": "**Explanation:** Accuracy is misleading with imbalanced classes. The model doesn't detect Class B at all. Use precision, recall, F1, or AUC-ROC instead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What's the difference between a parameter and a hyperparameter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parameter:** Learned from data during training (e.g., weights, coefficients)",
      "**Hyperparameter:** Set before training, controls learning process (e.g., learning rate, max_depth)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Parameters are internal model values. Hyperparameters are external configuration choices."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What happens when you scale features for KNN but not for Decision Trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**KNN:** Feature scaling is critical—unscaled features with larger ranges dominate distance calculations",
      "**Decision Trees:** Unaffected by scaling—splits based on thresholds, not distances"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Distance-based algorithms (KNN, SVM, K-Means) need scaling. Tree-based algorithms don't."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is the Bias-Variance tradeoff?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Model A: Simple linear model → High bias, low variance\nModel B: Complex polynomial model → Low bias, high variance"
    },
    {
     "t": "p",
     "text": "**Answer:** Finding the sweet spot between underfitting (bias) and overfitting (variance)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bias = error from wrong assumptions. Variance = error from sensitivity to training data. Total error = Bias² + Variance + Noise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "You have a feature \"income\" with values ranging from 20,000 to 500,000 and \"age\" from 18 to 80. What preprocessing is needed for SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Feature scaling (StandardScaler or MinMaxScaler)"
    },
    {
     "t": "p",
     "text": "**Explanation:** SVM uses distance/dot products. Income would dominate without scaling. StandardScaler: zero mean, unit variance. MinMaxScaler: [0,1] range."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What happens if you include the target variable as a feature?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data leakage — model will have near-perfect accuracy but zero real-world value."
    },
    {
     "t": "p",
     "text": "**Explanation:** Target leakage gives the model direct access to the answer. Performance in production will be terrible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What's the output of this confusion matrix interpretation?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "              Predicted\n              Positive  Negative\nActual Pos      80        20\nActual Neg      10        90"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Accuracy: (80+90)/200 = 85%",
      "Precision: 80/(80+10) = 88.9%",
      "Recall: 80/(80+20) = 80%",
      "F1: 2 × (0.889 × 0.8)/(0.889 + 0.8) = 84.2%"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TP=80, FP=10, FN=20, TN=90. Precision = TP/(TP+FP), Recall = TP/(TP+FN)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "When would you use MAE over MSE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use MAE when outliers should not heavily influence the model; use MSE when larger errors should be penalized more."
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE squares errors, so outliers have disproportionate impact. MAE treats all errors linearly. RMSE has same units as target."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What's wrong with this validation approach?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "scaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)  # fit on entire dataset\nX_train, X_test = train_test_split(X_scaled, test_size=0.2)"
    },
    {
     "t": "p",
     "text": "**Answer:** Data leakage — scaler learned statistics from test data too."
    },
    {
     "t": "p",
     "text": "**Explanation:** Must fit scaler on training data only, then transform test data: `scaler.fit(X_train)`, `scaler.transform(X_test)`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the No Free Lunch theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No single ML algorithm works best for every problem. Algorithm choice depends on data characteristics."
    },
    {
     "t": "p",
     "text": "**Explanation:** Every algorithm has assumptions. What works for one domain may fail for another. Always try multiple approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Given this scenario, which metric should you optimize?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Medical diagnosis: Detecting cancer (positive = cancer)"
    },
    {
     "t": "p",
     "text": "**Answer:** Recall (Sensitivity) — minimize False Negatives"
    },
    {
     "t": "p",
     "text": "**Explanation:** Missing a cancer diagnosis (FN) is far worse than a false alarm (FP). High recall catches more actual cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "Given this scenario, which metric should you optimize?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Email spam filter (positive = spam)"
    },
    {
     "t": "p",
     "text": "**Answer:** Precision — minimize False Positives"
    },
    {
     "t": "p",
     "text": "**Explanation:** Marking legitimate email as spam (FP) is costly. Users lose important emails. Some spam getting through (FN) is more acceptable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the difference between L1 and L2 regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**L1 (Lasso):** Adds |w| penalty → drives some weights to exactly 0 → feature selection",
      "**L2 (Ridge):** Adds w² penalty → shrinks all weights → prevents large coefficients"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** L1 produces sparse models. L2 produces small but non-zero weights. ElasticNet combines both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What happens to a linear regression model when features are highly correlated (multicollinearity)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Coefficients become unstable — large magnitudes with opposite signs, high variance in estimates."
    },
    {
     "t": "p",
     "text": "**Explanation:** With correlated features, small data changes cause large coefficient changes. Use Ridge regression, PCA, or remove correlated features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "You have 100 features but only 50 samples. What approach would you take?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dimensionality reduction (PCA), feature selection, or regularization (Lasso/Ridge)."
    },
    {
     "t": "p",
     "text": "**Explanation:** n < p problem (more features than samples). Model will overfit without constraints. Lasso can select relevant features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What's the difference between stratified and regular K-fold cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Regular K-fold:** Random splits, class distribution may vary across folds",
      "**Stratified K-fold:** Preserves class distribution in each fold"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For imbalanced datasets, stratified K-fold ensures each fold has representative class proportions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is the purpose of a validation set?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** To tune hyperparameters and make model selection decisions without touching test data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Train set → learn parameters. Validation set → tune hyperparameters. Test set → final unbiased evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "A model's training loss is decreasing but validation loss starts increasing. What should you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop training (early stopping) — the model is beginning to overfit."
    },
    {
     "t": "p",
     "text": "**Explanation:** Divergence between training and validation loss indicates overfitting. Early stopping saves the model at optimal point."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What's the issue with using accuracy for a model predicting rare fraud (0.1% of transactions)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A model predicting \"no fraud\" for everything achieves 99.9% accuracy but detects zero fraud."
    },
    {
     "t": "p",
     "text": "**Explanation:** Use precision-recall AUC, F1-score, or Matthews Correlation Coefficient for highly imbalanced data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "You train a model and get these results:",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Cross-validation scores: [0.95, 0.48, 0.93, 0.50, 0.94]\nMean: 0.76, Std: 0.22"
    },
    {
     "t": "p",
     "text": "What's the issue?"
    },
    {
     "t": "p",
     "text": "**Answer:** High variance across folds suggests data quality issues — possible data leakage, inconsistent labeling, or non-stationary data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Good models have consistent CV scores. High std indicates some folds have fundamentally different data distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What's the key difference between bagging and boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging:** Trains models independently in parallel, reduces variance (e.g., Random Forest)",
      "**Boosting:** Trains models sequentially, each correcting predecessor's errors, reduces bias (e.g., XGBoost)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bagging averages predictions for stability. Boosting iteratively focuses on hard examples."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
