/* ============================================================================
   PRACTICE P2.4 — Preprocessing and Feature Engineering · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/02_Preprocessing_and_Feature_Engineering.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.4",
 "lede": "**25 scenarios** from Preprocessing and Feature Engineering. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "76",
   "q": "What is information gain and how is it used in feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduction in entropy of target variable after knowing the feature value. IG(T, F) = H(T) - H(T|F)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same as mutual information. Higher IG = more informative feature. Used in decision tree splitting AND as standalone filter. Works for categorical features naturally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "You have a target-encoded feature that scores highest in feature importance. Is it reliable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Potentially misleading — target encoding creates direct leakage signal. The feature \"knows\" the target by construction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Target-encoded features often dominate importance because they directly encode target information. Evaluate if the encoding was done properly with CV, and check if removing it significantly hurts out-of-fold performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "How do you perform feature selection for time series data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Use time-aware cross-validation (not random) for any wrapper method",
      "Lag features need temporal consistency",
      "Granger causality for causal feature relevance",
      "Rolling window feature importance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random CV leaks future information. Feature relevance may change over time — use rolling or expanding windows."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the difference between feature selection and feature importance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature importance:** Ranks features by their contribution to a model (continuous score)",
      "**Feature selection:** Binary decision — keep or discard each feature based on criteria"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature importance is often USED for feature selection (threshold on importance), but they're distinct concepts. Importance is descriptive; selection is prescriptive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "How would you build a robust feature selection pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.feature_selection import SelectKBest, f_classif\n\npipe = Pipeline([\n    ('variance', VarianceThreshold(threshold=0.01)),\n    ('univariate', SelectKBest(f_classif, k=50)),\n    ('model', RandomForestClassifier())\n])\n# Use cross-validation — feature selection inside CV\ncross_val_score(pipe, X, y, cv=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature selection INSIDE cross-validation prevents leakage. Never select features on full dataset then CV. Pipeline ensures correct procedure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the Fisher Score for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures class separability: ratio of between-class variance to within-class variance for each feature."
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher Fisher score = better class separation. Filter method. Uni-variate — doesn't consider feature interactions. Extension of ANOVA F-test concept."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "When would you NOT want to do feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Deep learning models (learn their own features)",
      "Tree ensembles with many trees (handle irrelevant features)",
      "Dataset is small and every feature might help",
      "Features are already curated by domain experts"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature selection removes information permanently. When compute isn't an issue and overfitting isn't a problem, keeping all features may be better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "How does group lasso work for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Applies L1 penalty at the group level — selects or removes entire groups of features together."
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful when features belong to logical groups (one-hot encoded variable, polynomial features of same base). Standard Lasso might select some dummies but not others — Group Lasso ensures consistency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the relationship between feature selection and overfitting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Removing irrelevant/noisy features reduces overfitting by reducing model complexity and noise in the learning signal."
    },
    {
     "t": "p",
     "text": "**Explanation:** But aggressive selection can cause underfitting. And if selection uses the full dataset (leakage), it INCREASES overfitting. Proper CV-based selection prevents both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "How would you use SHAP values for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import shap\nexplainer = shap.TreeExplainer(model)\nshap_values = explainer.shap_values(X_test)\nmean_abs_shap = np.abs(shap_values).mean(axis=0)\ntop_features = X.columns[np.argsort(mean_abs_shap)[-20:]]"
    },
    {
     "t": "p",
     "text": "**Explanation:** SHAP provides theoretically grounded importance. Mean |SHAP| gives global importance. More reliable than Gini importance. Captures interactions. But computationally expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the SelectFromModel utility in scikit-learn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Selects features based on a fitted model's `coef_` or `feature_importances_` attribute using a threshold."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import SelectFromModel\nselector = SelectFromModel(RandomForestClassifier(), threshold='median')\nselector.fit(X_train, y_train)\nX_selected = selector.transform(X_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Threshold options: 'mean', 'median', specific value, or '1.25*median'. Embedded approach. Works with any model exposing importances."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "You have 300 features. After feature selection you keep 30. Model improves on test set. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Reduced overfitting — fewer parameters to fit",
      "Removed noisy features that were confusing the model",
      "Removed correlated features that diluted signal",
      "Potentially faster training benefiting hyperparameter search"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The 270 removed features added noise, not signal. Less noise → cleaner decision boundary → better generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the difference between embedded and wrapper feature selection for Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Embedded:** Use built-in `feature_importances_` from a single trained RF (fast)",
      "**Wrapper:** RFE with RF — retrain multiple times removing least important features (slower, potentially better)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Embedded: one training run. Wrapper: d/step training runs. Wrapper accounts for feature interactions during removal but is much more expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How would you validate that selected features generalize to new data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Feature selection + model evaluation inside cross-validation",
      "Test on completely held-out data",
      "Check stability across different folds/samples",
      "Validate feature importance on test set (permutation importance)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If features selected on training data aren't important on test data, selection captured noise. Stability and consistency across samples = generalizable selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the impact of feature selection on model interpretability?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fewer features = easier to understand and explain predictions. Critical for:"
    },
    {
     "t": "ol",
     "items": [
      "Regulatory compliance (finance, healthcare)",
      "Stakeholder communication",
      "Model debugging",
      "Feature cost reduction (fewer measurements needed)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** A model using 5 features is more interpretable than one using 500, even if performance is similar. Business value of interpretability often outweighs marginal accuracy gains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "How does the Relief algorithm work for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For each sample, finds nearest same-class (hit) and nearest different-class (miss) neighbors. Features that differ more from misses and less from hits get higher scores."
    },
    {
     "t": "p",
     "text": "**Explanation:** Detects conditional dependencies and feature interactions. ReliefF: extension handling multi-class and missing values. Computationally O(n² d)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is feature selection bias and how do you avoid it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bias introduced when feature selection is done on the entire dataset before evaluation, making test results overly optimistic."
    },
    {
     "t": "p",
     "text": "**Avoidance:**"
    },
    {
     "t": "ol",
     "items": [
      "Always select features inside cross-validation loop",
      "Use Pipeline with CV",
      "Hold out a final test set untouched until final evaluation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Even simple univariate tests on full data create information leakage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "When would you use correlation-based filtering with the target?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As a quick first pass for regression tasks. Compute Pearson/Spearman correlation of each feature with target. Remove features with |r| < threshold."
    },
    {
     "t": "p",
     "text": "**Limitations:** Only captures linear (Pearson) or monotonic (Spearman) relationships. Misses non-linear importance."
    },
    {
     "t": "p",
     "text": "**Explanation:** Fast filter method. Use Spearman for robustness to non-linearity. Complement with mutual information for non-linear detection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How do you handle feature selection with missing data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Impute first, then select (common approach)",
      "Use missingness pattern as a feature itself",
      "Algorithms handling missing values (XGBoost) for importance",
      "Pairwise deletion for correlation-based methods"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Imputation before selection can affect results. Consider multiple imputation + selection to assess stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the dropout method interpreted as feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Neural network dropout randomly drops features/neurons during training, forcing the network to not rely on any single feature. The surviving features are implicitly selected."
    },
    {
     "t": "p",
     "text": "**Explanation:** Concrete Dropout can provide feature importance. Not traditional feature selection but achieves similar regularization effect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How would you select features for a multi-output prediction task?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Select features relevant to ALL outputs (union approach)",
      "Select per-output and take intersection (conservative)",
      "Multi-target Lasso/Elastic Net",
      "Tree-based importance averaging across outputs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Different outputs may need different features. Union approach is safer but may include irrelevant features for some outputs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the curse of feature selection with small datasets?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** With few samples (n), even random features can appear predictive by chance. Feature selection can overfit to noise."
    },
    {
     "t": "p",
     "text": "**Explanation:** Rule of thumb: need n >> d. With n=50 and d=500, almost any feature subset can fit perfectly. Use strong regularization and conservative selection thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How does feature selection interact with hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** They should be done jointly — optimal features depend on model hyperparameters and vice versa."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipe = Pipeline([\n    ('select', SelectKBest()),\n    ('model', SVM())\n])\nparam_grid = {\n    'select__k': [5, 10, 20, 50],\n    'model__C': [0.1, 1, 10]\n}\nGridSearchCV(pipe, param_grid, cv=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Separate tuning can lead to suboptimal combinations. Joint search explores feature-hyperparameter combinations together."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "When is removing correlated features harmful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "When both correlated features carry different noise patterns (ensemble effect)",
      "When downstream model handles correlation well (trees, neural nets)",
      "When features measure different aspects of the same underlying concept"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Correlation doesn't always mean redundancy. Two noisy measurements of the same signal can improve prediction when averaged."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "How would you explain your feature selection decisions to a non-technical stakeholder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Show before/after model performance",
      "List selected features with plain-language descriptions",
      "Show SHAP plots demonstrating feature effects",
      "Provide business intuition for why each feature matters",
      "Highlight features that were surprisingly important/unimportant"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"We started with 200 data points about customers but found that just these 15 characteristics predict churn with 95% of the accuracy. Here's what each one means and how it affects predictions.\""
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
