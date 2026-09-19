/* ============================================================================
   PRACTICE P4.1 — Trees and Ensembles · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/04_Trees_and_Ensembles.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.1",
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
   "n": "1",
   "q": "How does a decision tree decide where to split?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Chooses the feature and threshold that maximizes information gain (or minimizes impurity):"
    },
    {
     "t": "ul",
     "items": [
      "**Gini impurity:** 1 - Σ(p_i²) — default in sklearn",
      "**Entropy:** -Σ(p_i × log₂(p_i))",
      "**MSE** for regression trees"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** At each node, try all features and thresholds, pick the split that creates the most homogeneous child nodes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the Gini impurity of a node with 70% class A and 30% class B?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gini = 1 - (0.7² + 0.3²) = 1 - (0.49 + 0.09) = 0.42"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gini = 0 → pure node (all one class). Gini = 0.5 → maximum impurity for binary. Lower Gini = better split."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is information gain?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "IG = Entropy(parent) - Σ(weighted_Entropy(children))"
    },
    {
     "t": "p",
     "text": "**Example:** Parent entropy = 1.0, left child (60%) entropy = 0.7, right child (40%) entropy = 0.3: IG = 1.0 - (0.6 × 0.7 + 0.4 × 0.3) = 1.0 - 0.54 = 0.46"
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher information gain = better split. Greedy approach at each node."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What happens to a decision tree with no max_depth limit?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tree grows until each leaf contains one sample (or all samples in leaf have same target). This means:"
    },
    {
     "t": "ol",
     "items": [
      "Training accuracy = 100%",
      "Severe overfitting",
      "Poor generalization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unrestricted trees memorize training data, including noise. Must prune or set depth limits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "How do you prevent overfitting in decision trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**max_depth:** Limit tree depth",
      "**min_samples_split:** Minimum samples to attempt split",
      "**min_samples_leaf:** Minimum samples in leaf",
      "**max_features:** Limit features considered per split",
      "**Pre-pruning:** Stop growing early",
      "**Post-pruning (CCP):** Grow full tree, then prune branches"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start with max_depth=5 or cost-complexity pruning. Use cross-validation to tune."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is cost-complexity pruning (CCP)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adds penalty for tree complexity:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Total_cost = Training_error + α × |Leaves|"
    },
    {
     "t": "p",
     "text": "α (ccp_alpha) controls tradeoff: higher α → simpler tree."
    },
    {
     "t": "p",
     "text": "**Explanation:** Grow full tree, then progressively prune subtrees that least decrease quality. Use cross-validation to find optimal α."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What are the advantages of decision trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Easy to interpret and visualize",
      "No feature scaling needed",
      "Handles mixed feature types (numerical + categorical)",
      "Handles non-linear relationships",
      "Built-in feature selection",
      "Fast prediction"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** White-box model — you can explain exactly why a prediction was made by following the path."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What are the disadvantages of decision trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Prone to overfitting",
      "High variance (sensitive to data changes)",
      "Axis-aligned splits (can't capture diagonal boundaries)",
      "Biased toward high-cardinality features",
      "Greedy algorithm (locally optimal, not globally optimal)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Small data change → completely different tree. Random Forest addresses variance issue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How does a Random Forest work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Create N bootstrap samples (sampling with replacement)",
      "For each sample, train a decision tree with random feature subset at each split",
      "Predictions: majority vote (classification) or average (regression)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combining many high-variance trees reduces overall variance through bagging. Each tree sees different data and features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is bagging (Bootstrap Aggregating)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train multiple models on different bootstrap samples (random samples with replacement), then average predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each bootstrap sample is ~63.2% unique data (some samples repeated). Reduces variance without increasing bias. Random Forest = bagging + random feature selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Why does Random Forest use random feature subsets?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** To decorrelate trees. Without random features, all trees would split on the same best features → correlated trees → less variance reduction."
    },
    {
     "t": "p",
     "text": "**Default:** sqrt(n_features) for classification, n_features/3 for regression."
    },
    {
     "t": "p",
     "text": "**Explanation:** Diverse trees = better ensemble. Some trees use \"weaker\" features that capture different patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the Out-of-Bag (OOB) score?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For each sample, evaluate using only trees that didn't include it in their bootstrap sample (~36.8% of trees)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "rf = RandomForestClassifier(oob_score=True)\nrf.fit(X, y)\nprint(rf.oob_score_)  # Validation score without separate holdout"
    },
    {
     "t": "p",
     "text": "**Explanation:** Built-in cross-validation estimate. Useful when data is limited."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you get feature importance from Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Mean Decrease in Impurity (MDI):** Average Gini decrease from splits on each feature (default in sklearn)",
      "**Permutation importance:** Shuffle feature values, measure accuracy drop"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "importances = rf.feature_importances_  # MDI\n# Permutation importance:\nfrom sklearn.inspection import permutation_importance\nresult = permutation_importance(rf, X_test, y_test)"
    },
    {
     "t": "p",
     "text": "**Explanation:** MDI is biased toward high-cardinality features. Permutation importance is more reliable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Why is MDI feature importance biased?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features with more unique values (high cardinality) have more potential split points → more chances to reduce impurity → artificially inflated importance."
    },
    {
     "t": "p",
     "text": "**Example:** Random ID column may show high importance because it perfectly separates samples."
    },
    {
     "t": "p",
     "text": "**Explanation:** Use permutation importance or drop-column importance for reliable results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How many trees should a Random Forest have?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** More trees generally better (diminishing returns). Typical: 100-500."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Performance vs. n_estimators:\n10 trees → moderate, unstable\n100 trees → good performance\n500 trees → marginal improvement\n1000 trees → very marginal improvement, slower"
    },
    {
     "t": "p",
     "text": "**Explanation:** No overfitting from more trees (ensemble averaging prevents it). Limited by computation time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between Random Forest and bagged decision trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging:** Each tree considers ALL features at each split",
      "**Random Forest:** Each tree considers random SUBSET of features at each split"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random feature selection is what decorrelates trees. Bagging alone reduces variance but less effectively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How does a decision tree handle missing values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on implementation:"
    },
    {
     "t": "ul",
     "items": [
      "**sklearn:** Doesn't handle missing values natively (must impute first)",
      "**XGBoost/LightGBM:** Learn optimal direction for missing values at each split",
      "**CART (original):** Surrogate splits — use correlated features as backup"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Tree-based methods can potentially handle missing values well — learn that missingness itself is informative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is a regression tree and how does it predict?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Splits data into regions, predicts the mean of target values in each leaf."
    },
    {
     "t": "p",
     "text": "**Loss:** Mean Squared Error (MSE) at each split"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Prediction = average(y values in leaf node)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates step-function approximation. Each leaf is a constant prediction for all samples in that region."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the time complexity of training a decision tree?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** O(n × m × log(n)) where n = samples, m = features."
    },
    {
     "t": "ul",
     "items": [
      "For each feature: sort values (n log n), evaluate all splits",
      "At each level, process all n samples",
      "Depth is typically O(log n)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random Forest: multiply by number of trees, but parallelizable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do you interpret this decision tree path?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "If age > 30 AND income > 50000 AND credit_score > 700:\n    → Approve loan (confidence: 95%)"
    },
    {
     "t": "p",
     "text": "**Answer:** Customer meeting all three conditions is approved with 95% confidence (95% of training samples meeting these conditions were approved)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Decision trees provide transparent, rule-based explanations that non-technical stakeholders understand."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the difference between ID3, C4.5, and CART?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**ID3:** Uses information gain, only categorical features, no pruning",
      "**C4.5:** Uses gain ratio (corrects ID3 bias), handles continuous features, handles missing values",
      "**CART:** Uses Gini impurity, binary splits only, handles regression, used in sklearn"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CART is most common in modern implementations. All use greedy, top-down approach."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is gain ratio and why was it introduced?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "GainRatio = InformationGain / SplitInfo\nSplitInfo = -Σ(|S_j|/|S|) × log₂(|S_j|/|S|)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Information gain is biased toward features with many values (like ID columns). Gain ratio normalizes by split information, penalizing features that create many small groups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Your Random Forest gives different results each time you train. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Bootstrap sampling is random",
      "Feature subset selection at each node is random",
      "Different random_state → different trees"
     ]
    },
    {
     "t": "p",
     "text": "**Fix:** Set `random_state=42` for reproducibility."
    },
    {
     "t": "p",
     "text": "**Explanation:** Randomness is by design — it's what makes the ensemble diverse. But set seed for reproducible experiments."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How would you handle class imbalance with Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "`class_weight='balanced'` — adjust split criteria",
      "`class_weight='balanced_subsample'` — balance per bootstrap sample",
      "Undersampling majority class in each bootstrap",
      "SMOTE + Random Forest"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "rf = RandomForestClassifier(class_weight='balanced_subsample')"
    },
    {
     "t": "p",
     "text": "**Explanation:** balanced_subsample recalculates weights for each tree's bootstrap sample — generally better than global balanced."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the Extra Trees (Extremely Randomized Trees) algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Like Random Forest but with additional randomization:"
    },
    {
     "t": "ol",
     "items": [
      "Uses entire dataset (no bootstrapping)",
      "Selects random split thresholds instead of finding optimal ones"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Faster training (no optimal threshold search), more randomization → sometimes better generalization. Lower variance but potentially higher bias."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
