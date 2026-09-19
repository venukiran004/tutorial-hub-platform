/* ============================================================================
   PRACTICE P2.3 — Preprocessing and Feature Engineering · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/02_Preprocessing_and_Feature_Engineering.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.3",
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
   "n": "51",
   "q": "What is the difference between filter, wrapper, and embedded feature selection methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Filter:** Evaluate features independently using statistical tests (fast, model-agnostic)",
      "**Wrapper:** Use model performance to evaluate feature subsets (accurate, slow)",
      "**Embedded:** Feature selection built into model training (L1 regularization, tree importance)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Filter: preprocessing step. Wrapper: search for optimal subset. Embedded: selection during training. Trade-off: speed vs accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "How does Recursive Feature Elimination (RFE) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Trains model, removes least important feature(s), repeats until desired number remains."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import RFE\nrfe = RFE(estimator=RandomForestClassifier(), n_features_to_select=10)\nrfe.fit(X_train, y_train)\nselected = X_train.columns[rfe.support_]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Wrapper method. Uses model's `coef_` or `feature_importances_`. RFECV uses cross-validation to find optimal number of features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is mutual information and how is it used for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures how much knowing a feature reduces uncertainty about the target. MI = 0 means independent; higher = more informative."
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures non-linear relationships (unlike correlation). Works for both classification (`mutual_info_classif`) and regression (`mutual_info_regression`). Filter method — fast, no model needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "How does L1 (Lasso) regularization perform feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** L1 penalty drives coefficients of irrelevant features exactly to zero, effectively removing them."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import Lasso\nlasso = Lasso(alpha=0.1)\nlasso.fit(X_train, y_train)\nselected = X_train.columns[lasso.coef_ != 0]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Embedded method. Alpha controls sparsity: higher alpha → fewer features. Among correlated features, Lasso picks one arbitrarily. Use Elastic Net to keep correlated groups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is the difference between univariate and multivariate feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Univariate:** Evaluates each feature independently (chi-squared, ANOVA, mutual information)",
      "**Multivariate:** Considers feature interactions and redundancy (RFE, Lasso, mRMR)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Univariate misses features that are only useful in combination. Feature A and B individually weak but A×B very predictive → univariate misses this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "How would you use chi-squared test for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tests independence between each feature and target for categorical features/classification."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import chi2, SelectKBest\nselector = SelectKBest(chi2, k=20)\nX_selected = selector.fit_transform(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Requires non-negative features (counts, frequencies, one-hot encoded). Higher chi2 statistic = stronger association with target. Only for classification tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is ANOVA F-test for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tests whether means of a numerical feature differ significantly across target classes. Higher F-statistic = more discriminative feature."
    },
    {
     "t": "p",
     "text": "**Explanation:** `f_classif` for classification targets. Assumes normal distribution and linear relationship. Fast filter method. Misses non-linear relationships."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "You have features with correlation > 0.95. Should you drop one? How do you decide which?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Usually yes — highly correlated features add redundancy. Keep the one with:"
    },
    {
     "t": "ol",
     "items": [
      "Higher correlation with target",
      "Fewer missing values",
      "Better interpretability",
      "Lower VIF"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multicollinearity inflates variance in linear models. Tree models less affected but redundancy wastes computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is the Boruta algorithm for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creates \"shadow features\" (shuffled copies of all features), trains Random Forest, selects features significantly more important than the best shadow feature."
    },
    {
     "t": "p",
     "text": "**Explanation:** Wrapper method that determines feature relevance statistically. Runs iteratively — features classified as Confirmed, Rejected, or Tentative. More thorough than simple importance thresholding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "How does permutation importance work for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Shuffles one feature at a time, measures drop in model performance. Large drop = important feature."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.inspection import permutation_importance\nresult = permutation_importance(model, X_test, y_test, n_repeats=10)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Model-agnostic. Measures actual impact on predictions, not just statistical association. Use test set to avoid measuring overfitting. Correlated features: importance shared/diluted."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What's the problem with using tree-based feature importance (Gini importance)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Biased toward high-cardinality features (more split points available)",
      "Doesn't distinguish between predictive and correlated features",
      "Reflects training data, may not generalize"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Permutation importance on test set is more reliable. SHAP values most accurate but expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the variance threshold method?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Removes features with variance below a threshold. Features with zero or near-zero variance carry no information."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import VarianceThreshold\nselector = VarianceThreshold(threshold=0.01)\nX_selected = selector.fit_transform(X)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simplest filter method. Good as first step. Removes constant/quasi-constant features. Apply before other methods. Note: affected by feature scale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How does forward selection differ from backward elimination?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Forward:** Start empty, add best feature one at a time",
      "**Backward:** Start with all features, remove worst one at a time"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Forward: O(d²) model fits. Backward: also O(d²) but starts from full model. Forward misses feature interactions. Backward is expensive with many features but catches interactions better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is mRMR (Minimum Redundancy Maximum Relevance)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Selects features that are maximally relevant to the target while minimally redundant with each other."
    },
    {
     "t": "p",
     "text": "**Formula:** max[relevance(feature, target) - redundancy(feature, selected_features)]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Balances information gain with diversity. Better than pure univariate methods because it considers redundancy. Available in `mrmr` Python package."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "You selected 10 features using Lasso, but model performance is lower than using all 50. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Lasso alpha too high — removed important features",
      "Non-linear relationships: Lasso is linear, may drop features important for non-linear model",
      "Correlated features: Lasso arbitrarily drops one of correlated pair",
      "Interaction effects: important combinations eliminated"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature selection method should match the downstream model. Use cross-validation to find optimal alpha."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "How would you handle feature selection for a dataset with 50,000 features (like genomics)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Variance threshold first (remove near-constant genes)",
      "Univariate tests (ANOVA/mutual info) to get top 1000",
      "Lasso/Elastic Net for further reduction",
      "RFE or Boruta on reduced set"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Sequential approach needed — can't run wrapper methods on 50K features. Filter first, then embedded/wrapper."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the stability of feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** How consistent the selected features are across different data samples/folds. Jaccard similarity between selected sets."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unstable selection → unreliable features. Lasso is often unstable with correlated features. Elastic Net more stable. Stability selection: run on subsamples, keep frequently selected features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is Sequential Feature Selector in scikit-learn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Implements forward or backward selection using cross-validated model performance."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_selection import SequentialFeatureSelector\nsfs = SequentialFeatureSelector(\n    estimator=RandomForestClassifier(),\n    n_features_to_select=10,\n    direction='forward',\n    cv=5\n)\nsfs.fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Wrapper method. Greedy — doesn't guarantee global optimum. 'forward' adds features, 'backward' removes. CV ensures generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "How does Elastic Net handle feature selection better than Lasso alone?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Elastic Net combines L1 (feature selection) with L2 (handling correlated features). Lasso picks one from a group; Elastic Net keeps the whole group."
    },
    {
     "t": "p",
     "text": "**Explanation:** `l1_ratio` controls mix: 1.0 = pure Lasso, 0.0 = pure Ridge. 0.5 = equal mix. Better for genomics/multi-collinear data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the difference between feature importance and SHAP values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature importance (Gini/permutation):** Global importance score, no direction/interaction info",
      "**SHAP values:** Per-prediction, additive attributions based on game theory. Shows direction and magnitude."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** SHAP is more informative: SHAP(feature=age, prediction=high_risk) = +0.3 means age increased risk prediction by 0.3. SHAP summary plot combines global + local importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How do you select features when you have both numerical and categorical features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Numerical:** ANOVA F-test, mutual information, correlation with target",
      "**Categorical:** Chi-squared test, mutual information, target encoding then correlation",
      "**Both:** Tree-based importance, permutation importance, Boruta"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Different statistical tests for different feature types. Tree-based methods handle mixed types naturally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is correlation-based feature selection (CFS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Selects feature subsets that are highly correlated with the target but have low inter-correlation among themselves."
    },
    {
     "t": "p",
     "text": "**Explanation:** Merit(S) = k × avg_correlation_with_target / sqrt(k + k(k-1) × avg_inter_correlation). Balances relevance and redundancy. Classic filter method."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "You run feature selection independently on 5 CV folds and get different feature sets each time. What should you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Keep features selected in majority of folds (≥3/5)",
      "Use stability selection (Randomized Lasso on subsamples)",
      "Consider the union of all selected features",
      "Investigate why selection is unstable (correlated features?)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Stable selection is more trustworthy. Instability from: correlated features, small dataset, noisy features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the wrapper method called Exhaustive Feature Selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Evaluates ALL possible feature subsets to find the globally optimal one. Guarantees best subset."
    },
    {
     "t": "p",
     "text": "**Explanation:** 2^d possible subsets for d features. d=20 → ~1 million subsets. Impractical for d > 15-20. Use greedy methods (forward/backward) as approximation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "How does SelectKBest differ from SelectPercentile?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SelectKBest:** Select top K features by score",
      "**SelectPercentile:** Select top P% of features by score"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Both are univariate filter methods. K: fixed count. Percentile: adapts to total feature count. Both accept scoring functions (f_classif, mutual_info, chi2)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
