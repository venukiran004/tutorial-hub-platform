/* ============================================================================
   PRACTICE P8.2 — Imbalanced Data, Time Series and Recommenders · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.2",
 "lede": "**25 scenarios** from Imbalanced Data, Time Series and Recommenders. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is Isolation Forest and how does it handle imbalanced detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Builds random trees that isolate samples. Anomalies are easier to isolate (shorter path from root to leaf)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import IsolationForest\nclf = IsolationForest(contamination=0.02)  # Expected 2% anomalies\nclf.fit(X)\npredictions = clf.predict(X_new)  # 1=normal, -1=anomaly"
    },
    {
     "t": "p",
     "text": "**Explanation:** Doesn't need class labels. Contamination parameter sets expected anomaly proportion. Efficient, scales well. Good for high-dimensional data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How do you handle imbalanced data in a multi-class scenario?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Per-class balancing strategies",
      "Multi-class SMOTE (SMOTE on each minority class vs rest)",
      "Class-weighted loss (weight per class inversely proportional to frequency)",
      "Hierarchical classification"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** More complex than binary — each class may need different treatment. Use macro-averaged metrics to give each class equal importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the effect of imbalanced data on neural network training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Loss dominated by majority class gradients",
      "Model converges to predicting majority class",
      "Output probabilities are poorly calibrated",
      "Batch composition may miss minority class entirely"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Solutions: class-weighted loss, focal loss, balanced batch sampling, oversampling. Batch sampling ensures each mini-batch contains minority examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is stratified sampling and why is it critical for imbalanced data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ensures that each data subset (fold, batch, split) maintains the same class proportion as the full dataset."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without stratification, random splits might create folds with 0 minority samples. Use `StratifiedKFold`, `StratifiedShuffleSplit`. Critical for reliable CV estimates with rare classes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How would you build a fraud detection system handling extreme imbalance (0.1% positive)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Feature Engineering: Transaction patterns, velocity features, device fingerprinting\n2. Handling Imbalance:\n   - Train with class_weight='balanced'\n   - Also try BalancedBagging with XGBoost base learners\n3. Evaluation: PR-AUC, recall@precision=80%\n4. Threshold: Optimize for business costs (FP → investigation cost, FN → fraud loss)\n5. Production: Score all transactions, investigate top K\n6. Monitoring: Track precision/recall drift, retrain regularly"
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-layered approach. No single technique sufficient. Human review of flagged transactions common in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the Synthetic Minority Over-sampling Technique for Nominal (SMOTE-N)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extension of SMOTE for categorical/nominal features. Uses Value Difference Metric (VDM) instead of Euclidean distance, and uses most common value among neighbors instead of interpolation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Original SMOTE only works with continuous features. SMOTE-N handles categorical, SMOTE-NC handles mixed nominal-continuous."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is cluster-based oversampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Cluster the data first, then oversample within each cluster to maintain data structure."
    },
    {
     "t": "p",
     "text": "**Explanation:** Preserves cluster distribution while balancing classes. If minority class has two sub-clusters, oversampling within each preserves both patterns rather than blurring them."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How does NearMiss undersampling work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Selects majority samples closest to minority samples (different versions):"
    },
    {
     "t": "ul",
     "items": [
      "**NearMiss-1:** Majority samples closest to nearest minority samples",
      "**NearMiss-2:** Majority samples closest to farthest minority samples",
      "**NearMiss-3:** Selects majority samples closest to each minority sample"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Informed undersampling — keeps majority samples that are most informative for decision boundary. Better than random undersampling but may keep only borderline examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the condensed nearest neighbor (CNN) rule for undersampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Iteratively removes majority samples that don't affect nearest-neighbor classification. Keeps only samples needed for correct classification."
    },
    {
     "t": "p",
     "text": "**Explanation:** Produces a consistent subset — classifying with this subset gives same result as full majority class. Efficient but may remove too much."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How do you handle imbalance with deep learning using balanced batch sampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from torch.utils.data import WeightedRandomSampler\n\n# Weight samples inversely by class frequency\nweights = [1.0/class_count[label] for label in labels]\nsampler = WeightedRandomSampler(weights, num_samples=len(weights))\ndataloader = DataLoader(dataset, batch_size=32, sampler=sampler)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each batch contains roughly equal classes. Minority samples selected more frequently. Alternative to loss weighting. Both can be combined."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the impact of extreme imbalance on the ROC curve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** ROC curve can look good because FPR denominator (TN + FP) is large with many negatives. Even many FP don't significantly increase FPR."
    },
    {
     "t": "p",
     "text": "**Explanation:** ROC-AUC = 0.95 might correspond to very low precision. PR-AUC is more informative for imbalanced data because precision directly shows FP proportion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "When should you NOT use SMOTE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Very high-dimensional data (distances become meaningless)",
      "Very noisy data (synthetic samples amplify noise)",
      "When classes overlap significantly (expands overlap)",
      "Very small datasets (too few minority samples for meaningful synthesis)",
      "When model handles imbalance natively (XGBoost with scale_pos_weight)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** SMOTE assumptions: meaningful distance metric, local structure, linear interpolation makes sense. May not hold for text, images, or sparse data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How do you combine oversampling and undersampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from imblearn.combine import SMOTETomek, SMOTEENN\n\n# SMOTE then remove Tomek links\nsmt = SMOTETomek()\nX_res, y_res = smt.fit_resample(X_train, y_train)\n\n# SMOTE then ENN cleaning\nsmenn = SMOTEENN()\nX_res, y_res = smenn.fit_resample(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** SMOTE creates synthetic minority samples, Tomek/ENN cleans noisy boundary. Combined often better than either alone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the effect of imbalanced data on tree-based models specifically?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Trees split to minimize impurity (Gini/entropy). With imbalance, most splits ignore minority because majority dominance minimizes overall impurity."
    },
    {
     "t": "p",
     "text": "**Explanation:** Solution: class_weight, min_samples_leaf (prevents small minority leaves), balanced subsample for bagging. XGBoost: scale_pos_weight, custom eval metric."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How do you monitor class imbalance in a production system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Track class distribution drift over time",
      "Monitor per-class metrics (recall for minority class)",
      "Alert on prediction distribution changes",
      "Periodic retraining with updated distributions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world class ratios change (fraud patterns evolve, seasonal effects). Model trained on 2% positive may face 5% — recalibration needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is one-class classification and how does it differ from binary classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Binary:** Learns decision boundary between two known classes",
      "**One-class:** Learns boundary around ONE class only, everything outside is anomalous"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** One-class: only needs \"normal\" data for training. Binary: needs both classes. When minority is too rare or diverse, one-class is preferred."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the class overlap problem and how does it affect imbalanced learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When minority and majority class samples occupy the same feature space regions. Imbalanced + overlapping = worst case."
    },
    {
     "t": "p",
     "text": "**Explanation:** SMOTE can make overlap worse by creating synthetic minority samples in majority-dominated regions. Solutions: informed undersampling (NearMiss), cleaning methods (Tomek, ENN), better features to reduce overlap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "How does calibration differ for imbalanced classifiers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Models trained on imbalanced data often produce poorly calibrated probabilities — overconfident on majority, underconfident on minority."
    },
    {
     "t": "p",
     "text": "**Explanation:** After resampling, recalibrate using original class distribution. Platt scaling or isotonic regression on a properly distributed validation set. Calibration essential for probability-based decisions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the minimum number of minority samples needed for SMOTE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** SMOTE needs at least k+1 minority samples (k = number of nearest neighbors, default 5), so minimum 6 minority samples."
    },
    {
     "t": "p",
     "text": "**Explanation:** With very few minority samples, SMOTE generates very similar synthetic samples (limited diversity). Below ~20-30 minority samples, SMOTE may not be effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How would you approach an extremely imbalanced regression problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Regression can also be \"imbalanced\" — rare extreme values:"
    },
    {
     "t": "ol",
     "items": [
      "Stratified sampling by target bins",
      "Weighted loss (higher weight for rare target regions)",
      "Log transformation of target",
      "Separate models for different target ranges",
      "Quantile regression"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Traditional regression minimizes MSE, dominated by common target range. Rare high values get underfit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the precision-recall breakeven point?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Threshold where precision = recall. The value at this point indicates model quality on minority class."
    },
    {
     "t": "p",
     "text": "**Explanation:** At breakeven: model is equally careful about false positives and false negatives. Higher breakeven value = better model. Useful for comparing models on imbalanced data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "How do GANs help with imbalanced data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train a GAN to generate realistic minority class samples. Generator learns the minority distribution, creates diverse synthetic examples."
    },
    {
     "t": "p",
     "text": "**Explanation:** More sophisticated than SMOTE — can generate complex, non-linear patterns. Requires significant compute and tuning. Risk of mode collapse (generating similar samples)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the impact of the evaluation metric on handling strategy choice?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Optimizing recall → threshold lowering or aggressive oversampling",
      "Optimizing precision → conservative threshold, targeted oversampling",
      "Optimizing F1 → balanced approach",
      "Optimizing PR-AUC → overall discrimination improvement"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Strategy and metric must be aligned. Optimizing accuracy with SMOTE: may show improvement but actual minority recall may not improve."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you handle imbalanced data in a streaming/online learning context?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Adaptive class weights updated as distribution shifts",
      "Windowed class tracking",
      "Online SMOTE variants",
      "Prequential evaluation (test-then-train)",
      "Concept drift detection for class ratio changes"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Batch SMOTE doesn't apply directly to streaming. Online methods must adapt to evolving class proportions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the complete workflow for handling a 1:100 imbalanced classification problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. EDA: Understand class distribution, overlap, separability\n2. Baseline: Train without handling, establish baseline metrics\n3. Try multiple approaches:\n   a. Class weights (simplest, no data modification)\n   b. SMOTE + ENN on training data\n   c. BalancedBagging with strong base learner\n4. Evaluate with: PR-AUC, F1, recall, confusion matrix\n5. Threshold optimization on validation set\n6. Calibrate probabilities\n7. Final evaluation on held-out test set\n8. Deploy with monitoring of per-class metrics"
    },
    {
     "t": "p",
     "text": "**Explanation:** No single solution — compare multiple approaches. Class weights is the simplest and often competitive. Always evaluate on the ORIGINAL distribution."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
