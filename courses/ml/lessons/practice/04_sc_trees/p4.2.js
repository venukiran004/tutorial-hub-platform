/* ============================================================================
   PRACTICE P4.2 — Trees and Ensembles · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/04_Trees_and_Ensembles.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.2",
 "lede": "**25 scenarios** from Trees and Ensembles. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "26",
   "q": "How does tree depth affect bias and variance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Shallow tree (depth=2):** High bias, low variance → underfitting",
      "**Deep tree (depth=20):** Low bias, high variance → overfitting",
      "**Optimal depth:** Balances bias-variance tradeoff"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Depth controls model complexity. Use cross-validation to find optimal depth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What happens when you have highly correlated features in a Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The importance gets \"shared\" among correlated features. Each correlated feature appears less important individually."
    },
    {
     "t": "p",
     "text": "**Explanation:** If feature_A and feature_B have r=0.99, either can be used for a split. Total importance is similar but split between them. Use clustering or VIF to identify and handle."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How does feature importance change with tree depth in a Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features used at the top (root) of trees appear more important because they affect more samples. Deep features split fewer samples → lower importance."
    },
    {
     "t": "p",
     "text": "**Explanation:** Importance is weighted by number of samples reaching the node. Root node processes all samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the difference between feature_importances_ and permutation_importance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "feature_importances_ (MDI)",
      "permutation_importance"
     ],
     "rows": [
      [
       "Training needed?",
       "Computed during training",
       "Post-training"
      ],
      [
       "Bias",
       "Biased toward high-cardinality",
       "Unbiased"
      ],
      [
       "Data used",
       "Training data",
       "Any data"
      ],
      [
       "Speed",
       "Fast (built-in)",
       "Slower (requires re-evaluation)"
      ],
      [
       "Correlation handling",
       "Splits importance",
       "Shows each feature's unique contribution"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Can decision trees capture XOR-like patterns?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Yes, but inefficiently. XOR requires multiple splits that are individually weak."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "x1  x2  y\n0   0   0\n0   1   1\n1   0   1\n1   1   0"
    },
    {
     "t": "p",
     "text": "**Explanation:** Tree needs at least depth 2: split on x1 first, then x2 in each branch. Interaction features (x1 XOR x2) would help."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is variable importance via permutation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute baseline score on test data",
      "For each feature: shuffle its values randomly",
      "Recompute score — drop in performance = importance",
      "Repeat multiple times for stability"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If shuffling destroys accuracy → feature is important. If no change → feature is irrelevant or redundant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "When would you choose a single decision tree over Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Need fully interpretable model (regulatory requirements)",
      "Very small dataset",
      "Need fast prediction with minimal resources (edge devices)",
      "Visualization of decision logic required"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random Forest is almost always more accurate, but sacrifices interpretability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How does Random Forest handle categorical features with many levels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "sklearn: Requires encoding (OHE or ordinal)",
      "For binary: OHE creates separate features",
      "For high-cardinality: Target encoding or ordinal encoding works well with trees",
      "LightGBM: Native categorical handling"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trees with ordinal encoding of unordered categories: may create suboptimal but reasonable splits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the effect of max_features parameter in Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**max_features=n_features (all):** Trees are more correlated → less variance reduction → basically bagging",
      "**max_features=1:** Maximum randomness → very diverse but weak trees",
      "**max_features='sqrt':** Good balance for classification (default)",
      "**max_features=0.33:** Good for regression (default)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Controls the randomness-accuracy tradeoff per tree."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How would you use Random Forest for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Importance threshold\nimportances = rf.feature_importances_\nselected = features[importances > threshold]\n\n# Method 2: Boruta algorithm\n# Compares real feature importance to importance of shuffled shadow features\n\n# Method 3: Recursive Feature Elimination\nfrom sklearn.feature_selection import RFE\nrfe = RFE(rf, n_features_to_select=10)\nrfe.fit(X, y)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Boruta is gold standard for RF-based selection — statistically tests each feature's importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is a decision stump?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A decision tree with depth=1 (single split, two leaves). Used as weak learner in boosting."
    },
    {
     "t": "p",
     "text": "**Explanation:** Makes one decision based on one feature threshold. Very high bias but very low variance. AdaBoost traditionally uses stumps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "How does a decision tree handle continuous features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Sort feature values",
      "Consider midpoints between consecutive distinct values as potential thresholds",
      "For each threshold: split data, calculate impurity of both sides",
      "Choose threshold with minimum weighted impurity"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For n unique values, evaluate n-1 potential splits. Repeat for each feature at each node."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the stability of decision trees and how do Random Forests address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Single trees are unstable — small data changes can create completely different splits. This is high variance."
    },
    {
     "t": "p",
     "text": "**Random Forest:** Averages many unstable trees → stable predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Averaging reduces variance by factor of 1/n (independent trees). With correlation: Var = ρσ² + (1-ρ)σ²/n."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the effect of min_samples_leaf on the decision boundary?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**min_samples_leaf=1:** Can create very specific regions → may overfit to noise",
      "**min_samples_leaf=50:** Smoother boundaries → prevents small noisy regions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Larger min_samples_leaf = simpler, smoother model. Good regularization technique."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How would you visualize a decision tree?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.tree import plot_tree, export_text\nimport matplotlib.pyplot as plt\n\n# Visual plot\nplt.figure(figsize=(20,10))\nplot_tree(dt, feature_names=features, class_names=classes, filled=True)\nplt.show()\n\n# Text representation\nprint(export_text(dt, feature_names=features))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Visual inspection helps validate that splits make domain sense and the tree isn't learning spurious patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "When would a Random Forest perform poorly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Very high-dimensional sparse data (text)",
      "Strong linear relationships (linear model more efficient)",
      "Extrapolation beyond training range (trees can't extrapolate)",
      "Small datasets with many features",
      "When interpretability is required"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trees partition space into rectangles — can't extrapolate trends. For y=2x, RF can't predict beyond training max."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is proximity in Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two samples' proximity = fraction of trees where they end up in the same leaf."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ol",
     "items": [
      "Measuring sample similarity",
      "Detecting outliers (low proximity to all)",
      "Missing value imputation (use similar samples)",
      "Clustering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates a similarity matrix based on forest structure. More informative than Euclidean distance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is class probability estimation in Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The class probability is the proportion of trees voting for each class:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(class=k) = (Number of trees predicting k) / (Total trees)"
    },
    {
     "t": "p",
     "text": "**Explanation:** With 100 trees: 70 predict class A, 30 predict class B → P(A)=0.7, P(B)=0.3. Better calibrated than single tree."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you handle prediction time constraints with Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Reduce n_estimators (fewer trees)",
      "Limit max_depth",
      "Use tree pruning",
      "Quantize/compress trees",
      "Use feature selection (fewer features → faster traversal)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Prediction time = O(n_estimators × depth). Each constraint reduces time linearly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the difference between Gini impurity and entropy in practice?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Gini:** Computationally cheaper (no logarithm), slightly prefers splits that isolate one class",
      "**Entropy:** Slightly more balanced splits, theoretically grounded in information theory",
      "**In practice:** Results are nearly identical (>95% of splits are the same)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Default to Gini (faster). Switch to entropy only if Gini gives poor results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "How does Random Forest handle irrelevant features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Irrelevant features rarely get selected for splits (low impurity reduction). They receive very low feature importance scores."
    },
    {
     "t": "p",
     "text": "**Limitation:** With many irrelevant features and max_features='sqrt', relevant features may be excluded from consideration at some nodes."
    },
    {
     "t": "p",
     "text": "**Explanation:** RF is fairly robust to irrelevant features compared to other algorithms, but extreme cases can still cause problems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the effect of increasing n_estimators in Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Accuracy:** Improves then plateaus (diminishing returns)",
      "**Training time:** Increases linearly",
      "**Prediction time:** Increases linearly",
      "**Overfitting:** Does NOT increase (fundamental property of bagging)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike boosting, more trees in RF doesn't overfit. It's safe to use more trees if compute allows."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How would you tune a Random Forest model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Key hyperparameters and typical ranges:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "param_grid = {\n    'n_estimators': [100, 300, 500],\n    'max_depth': [None, 10, 20, 30],\n    'min_samples_split': [2, 5, 10],\n    'min_samples_leaf': [1, 2, 4],\n    'max_features': ['sqrt', 'log2', 0.3],\n}"
    },
    {
     "t": "p",
     "text": "**Priority:** max_depth and min_samples_leaf (regularization) → max_features → n_estimators."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is a conditional inference tree?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses statistical tests (p-values) instead of impurity measures to select splits. Only splits when statistically significant."
    },
    {
     "t": "p",
     "text": "**Advantages:**"
    },
    {
     "t": "ol",
     "items": [
      "Built-in stopping criterion",
      "Unbiased variable selection",
      "No bias toward high-cardinality features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** More principled approach but slower. Available in R's `party` package."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How does a Random Forest make predictions for a new sample?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Classification:\n1. Feed sample through all N trees\n2. Each tree votes for a class\n3. Final prediction = majority vote\n\nRegression:\n1. Feed sample through all N trees\n2. Each tree outputs a value\n3. Final prediction = average of all outputs"
    },
    {
     "t": "p",
     "text": "**Explanation:** All trees predict independently. No weighting (unlike boosting). Ties broken arbitrarily."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
