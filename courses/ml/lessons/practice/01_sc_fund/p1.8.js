/* ============================================================================
   PRACTICE P1.8 — Scenarios · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.8",
 "lede": "**22 scenarios** from Fundamentals: Programs and Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Scenarios · 4",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "76",
   "q": "When should you use MinMaxScaler vs StandardScaler?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MinMaxScaler [0,1]:** When features need bounded range, no strong outliers, neural networks",
      "**StandardScaler (z-score):** When data is roughly normal, outliers present, SVM/logistic regression"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MinMaxScaler compresses outliers. StandardScaler resistant to outliers but output is unbounded."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is feature engineering and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creating new features from existing data to improve model performance. Often more impactful than algorithm choice."
    },
    {
     "t": "p",
     "text": "**Explanation:** Examples: extracting day-of-week from dates, creating interaction features, binning continuous variables, text embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What's the difference between supervised, unsupervised, and semi-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Supervised:** All data labeled (classification/regression)",
      "**Unsupervised:** No labels (clustering, dimensionality reduction)",
      "**Semi-supervised:** Small labeled set + large unlabeled set"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Semi-supervised leverages unlabeled data structure to improve learning with limited labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What happens if you train a model on data with missing values without handling them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on algorithm:"
    },
    {
     "t": "ul",
     "items": [
      "**Tree-based:** Some handle missing values natively (XGBoost)",
      "**Linear/SVM/KNN:** Will error or produce garbage results"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Most algorithms can't handle NaN. Options: imputation (mean/median/mode), indicator features, or algorithms that support missingness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the purpose of one-hot encoding vs label encoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**One-hot:** Creates binary columns for each category — no ordinal relationship implied",
      "**Label encoding:** Assigns integer to each category — implies ordering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use one-hot for nominal categories (color: red/blue/green). Label encoding for ordinal (size: S/M/L)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What happens when you one-hot encode a feature with 1000 categories?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creates 1000 binary columns — dimensionality explosion, sparse matrix, potential overfitting."
    },
    {
     "t": "p",
     "text": "**Explanation:** Solutions: target encoding, frequency encoding, embedding layers, or grouping rare categories."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "A client says \"My model accuracy is 99.5%!\" Is this necessarily good?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Not necessarily. Need to consider:"
    },
    {
     "t": "ol",
     "items": [
      "Class distribution (imbalanced?)",
      "Baseline performance",
      "Business cost of errors",
      "Whether test data was properly held out"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Always compare against naive baselines. 99.5% on a 99.5% majority class dataset is meaningless."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is data leakage and how can you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When information from outside the training data leaks into the model, artificially inflating performance."
    },
    {
     "t": "p",
     "text": "**Detection signals:**"
    },
    {
     "t": "ol",
     "items": [
      "Suspiciously high accuracy",
      "Feature importance showing unexpected features",
      "Poor production performance vs test performance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Common sources: future information, test data in training, preprocessing before splitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the difference between generative and discriminative models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Generative:** Models P(X|Y) and P(Y), learns data distribution (e.g., Naive Bayes, GMM)",
      "**Discriminative:** Models P(Y|X) directly, learns decision boundary (e.g., Logistic Regression, SVM)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Discriminative often better for classification. Generative can synthesize data and handle missing features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "You have a training set of 1M samples. Should you use all of them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Not always. Consider:"
    },
    {
     "t": "ol",
     "items": [
      "Validation curve — does more data help?",
      "Training time constraints",
      "Data quality vs quantity",
      "Learning curve analysis"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If learning curve plateaus, more data won't help. Focus on feature engineering or model complexity instead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What's the difference between parametric and non-parametric models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parametric:** Fixed number of parameters (linear regression, logistic regression) — assumptions about data distribution",
      "**Non-parametric:** Parameters grow with data (KNN, decision trees, SVM) — fewer assumptions, more flexible"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Parametric models are faster but may underfit. Non-parametric are flexible but may overfit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the curse of dimensionality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As dimensions increase, data becomes sparse, distances become meaningless, and models need exponentially more data."
    },
    {
     "t": "p",
     "text": "**Explanation:** In high dimensions, all points are roughly equidistant. KNN, K-means struggle. Need dimensionality reduction or feature selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the difference between online and batch learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch:** Trains on entire dataset at once (most traditional ML)",
      "**Online:** Updates model incrementally with new data points (streaming data)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Online learning for data that arrives continuously. SGD is commonly used for online updates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the effect of increasing the regularization parameter (C) in SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Large C:** Less regularization → smaller margin → fits training data more closely (risk of overfitting)",
      "**Small C:** More regularization → larger margin → allows some misclassifications (risk of underfitting)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** C controls the trade-off between margin size and training error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the difference between hard and soft voting in ensemble methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard voting:** Majority class prediction wins",
      "**Soft voting:** Averages predicted probabilities, takes argmax"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft voting generally performs better as it considers prediction confidence/probability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "When would you use R² vs Adjusted R²?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**R²:** Can only increase with more features (potentially misleading)",
      "**Adjusted R²:** Penalizes adding useless features — only increases if new feature improves model"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For feature selection, Adjusted R² prevents overfitting by accounting for the number of predictors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the assumption behind Naive Bayes being \"naive\"?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Feature independence — assumes all features are conditionally independent given the class label."
    },
    {
     "t": "p",
     "text": "**Explanation:** Rarely true in practice, but Naive Bayes often works surprisingly well despite this incorrect assumption."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is multicollinearity and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When features are highly correlated with each other."
    },
    {
     "t": "p",
     "text": "**Detection:**"
    },
    {
     "t": "ol",
     "items": [
      "Correlation matrix (>0.8)",
      "Variance Inflation Factor (VIF > 5-10)",
      "Eigenvalues of correlation matrix near zero"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Causes unstable coefficients in linear models. Solution: remove features, PCA, or Ridge regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the difference between feature selection and feature extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature selection:** Choose subset of original features (filter, wrapper, embedded methods)",
      "**Feature extraction:** Create new features from originals (PCA, t-SNE, autoencoders)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Selection preserves interpretability. Extraction may capture more information but creates new dimensions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is stratified sampling and when is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Sampling that preserves the proportion of each class in train/test splits."
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for imbalanced datasets. Without stratification, some classes may be absent from test set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What happens if you normalize your target variable in regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The model learns normalized relationships. Predictions must be inverse-transformed back to original scale."
    },
    {
     "t": "p",
     "text": "**Explanation:** Normalizing targets can help when target distribution is skewed. Log-transform for right-skewed targets is common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the difference between Type I and Type II errors in model evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Type I (False Positive):** Model predicts positive but actual is negative (α error)",
      "**Type II (False Negative):** Model predicts negative but actual is positive (β error)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** In medical testing: Type I = false alarm, Type II = missed diagnosis. Trade-off controlled by classification threshold."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
