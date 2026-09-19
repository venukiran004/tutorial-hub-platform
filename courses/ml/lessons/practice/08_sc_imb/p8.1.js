/* ============================================================================
   PRACTICE P8.1 — Imbalanced Data, Time Series and Recommenders · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.1",
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
   "n": "1",
   "q": "You have a dataset with 98% negative and 2% positive examples. What problems will arise?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Model predicts majority class for everything (98% accuracy but useless)",
      "Minority class severely underrepresented in training",
      "Standard metrics misleading (accuracy, error rate)",
      "Gradient updates dominated by majority class"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model never learns meaningful patterns for the minority class. Must use specialized techniques."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What are the main strategies to handle class imbalance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Data-level:** Oversampling minority, undersampling majority, SMOTE",
      "**Algorithm-level:** Class weights, cost-sensitive learning",
      "**Threshold adjustment:** Optimize classification threshold",
      "**Ensemble methods:** Balanced bagging, EasyEnsemble",
      "**Evaluation:** Use appropriate metrics (F1, PR-AUC, MCC)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combine approaches. No single technique is universally best. Domain and data characteristics guide choice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How does random oversampling work and what are its risks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Duplicate random minority class samples until classes are balanced."
    },
    {
     "t": "p",
     "text": "**Risks:**"
    },
    {
     "t": "ol",
     "items": [
      "Overfitting — model memorizes duplicated samples",
      "No new information added",
      "Decision boundary overfits to exactly duplicated points"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple but risky. Better alternatives: SMOTE, ADASYN which create synthetic (new) samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How does random undersampling work and what are its risks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly remove majority class samples until classes are balanced."
    },
    {
     "t": "p",
     "text": "**Risks:**"
    },
    {
     "t": "ol",
     "items": [
      "Loss of potentially valuable information",
      "Smaller training set → higher variance",
      "May lose important patterns in majority class"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fast and simple. Can be effective if majority class has lots of redundancy. Use with care — test if information loss hurts performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain SMOTE in detail. How does it create synthetic samples?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For each minority sample:"
    },
    {
     "t": "ol",
     "items": [
      "Find its k nearest minority neighbors",
      "Pick one neighbor randomly",
      "Create new sample along the line connecting them: x_new = x + rand(0,1) × (neighbor - x)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates realistic synthetic samples that interpolate between existing minority examples. Applied ONLY to training data, never test. No exact duplicates — less overfitting than random oversampling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are the variants of SMOTE and when to use each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SMOTE:** Basic synthetic oversampling",
      "**Borderline-SMOTE:** Only oversample minority samples near the decision boundary",
      "**SMOTE-Tomek:** SMOTE + remove Tomek links (ambiguous pairs)",
      "**SMOTE-ENN:** SMOTE + Edited Nearest Neighbors (clean noise)",
      "**ADASYN:** Adaptive — generates more samples near harder minority regions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Borderline-SMOTE: focuses on informative regions. SMOTE-ENN: cleans noisy synthetic samples. ADASYN: density-adaptive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is ADASYN and how does it differ from SMOTE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adaptive Synthetic Sampling — generates more synthetic samples for minority examples that are harder to learn (near decision boundary, surrounded by majority)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Density-based weighting: if minority point has many majority neighbors → more synthetic samples generated there. Focuses synthesis where it matters most."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What's wrong with this code?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "smote = SMOTE()\nX_resampled, y_resampled = smote.fit_resample(X, y)\nX_train, X_test, y_train, y_test = train_test_split(X_resampled, y_resampled)\nmodel.fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Answer:** Data leakage — SMOTE applied before train-test split. Synthetic samples in test set may be based on training data neighbors."
    },
    {
     "t": "p",
     "text": "**Correct order:** Split first → SMOTE on training data only → evaluate on original test data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do class weights work in scikit-learn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiply the loss for each class by its weight. Higher weight = more penalty for misclassifying that class."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = LogisticRegression(class_weight='balanced')\n# 'balanced': weight = n_samples / (n_classes * n_samples_per_class)\n# For 980 neg, 20 pos: neg_weight=0.51, pos_weight=25.5"
    },
    {
     "t": "p",
     "text": "**Explanation:** Equivalent to oversampling but without creating new samples. Faster and simpler. No data leakage risk. Works with any algorithm supporting class_weight."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you set custom class weights based on business costs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# If missing fraud costs $1000 and investigating non-fraud costs $10\n# FN cost = 1000, FP cost = 10\n# Set positive class weight proportional to cost ratio\nmodel = RandomForestClassifier(class_weight={0: 1, 1: 100})"
    },
    {
     "t": "p",
     "text": "**Explanation:** Align weights with business impact. False negative (missing fraud) is 100× more costly than false positive. Adjust weights accordingly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is cost-sensitive learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Modifying the learning algorithm to account for different misclassification costs."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "Class weights (loss weighting)",
      "Cost matrix integration",
      "MetaCost (relabeling based on expected cost)",
      "Threshold optimization post-training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Goes beyond simple oversampling/undersampling. Directly incorporates business costs into optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What metrics should you use for imbalanced classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PR-AUC:** Precision-Recall area under curve (best for high imbalance)",
      "**F1/F2 score:** Harmonic mean emphasizing recall",
      "**MCC:** Matthews Correlation Coefficient (balanced measure)",
      "**Balanced accuracy:** Average of per-class recall",
      "**Specificity-Sensitivity:** At chosen threshold",
      "**DO NOT USE:** Accuracy, error rate (misleading)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** PR-AUC focuses entirely on minority class performance. F2 emphasizes recall. Report confusion matrix alongside any summary metric."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is balanced accuracy and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Average of recall per class: (sensitivity + specificity) / 2 for binary."
    },
    {
     "t": "p",
     "text": "**Explanation:** Random baseline = 0.5 regardless of class distribution. Unlike accuracy (baseline = majority proportion). Useful when you want equal weight per class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How does threshold tuning help with imbalanced data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Default threshold = 0.5 is optimal only for balanced data. With imbalance, lower the threshold to increase recall."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "y_prob = model.predict_proba(X_test)[:, 1]\n# Instead of threshold=0.5, optimize:\nfrom sklearn.metrics import f1_score\nthresholds = np.arange(0.1, 0.9, 0.01)\nbest_t = max(thresholds, key=lambda t: f1_score(y_test, y_prob >= t))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Model may assign 0.3 probability to many true positives. Lowering threshold from 0.5 to 0.3 captures them."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is Tomek Links and how does it clean data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A Tomek link is a pair of opposite-class samples that are each other's nearest neighbors. Removing the majority class sample from Tomek links cleans the decision boundary."
    },
    {
     "t": "p",
     "text": "**Explanation:** Removes majority samples that are \"intrusive\" — too close to minority class. Creates cleaner boundary. Often combined with SMOTE (SMOTE then remove Tomek links)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is Edited Nearest Neighbors (ENN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Removes samples whose class differs from the majority class of their k nearest neighbors. Cleans noisy and borderline samples."
    },
    {
     "t": "p",
     "text": "**Explanation:** If a majority class sample is surrounded by mostly minority samples, it's likely noise — remove it. Cleans the decision boundary. Often used after SMOTE to remove noisy synthetic samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is Balanced Bagging and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each bootstrap sample is balanced by undersampling the majority class. Creates an ensemble of models trained on balanced subsets."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from imblearn.ensemble import BalancedBaggingClassifier\nbbc = BalancedBaggingClassifier(\n    estimator=DecisionTreeClassifier(),\n    n_estimators=100\n)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Combines undersampling with ensemble diversity. Each tree sees different majority samples. Less information loss than single undersample."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is EasyEnsemble?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creates multiple balanced subsets by undersampling majority class, trains AdaBoost on each subset, then combines predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Systematic way to use all majority samples across multiple models while maintaining balance. Each AdaBoost learner sees full minority + subset of majority."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How does XGBoost handle class imbalance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "`scale_pos_weight`: Ratio of negative to positive class count",
      "Custom loss function with class weights",
      "Early stopping with minority-focused metric (PR-AUC)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = XGBClassifier(scale_pos_weight=49)  # For 2% positive"
    },
    {
     "t": "p",
     "text": "**Explanation:** `scale_pos_weight` = count(negative) / count(positive). XGBoost handles internally by weighting gradient updates. Also compatible with SMOTE on training data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the Focal Loss and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Modified cross-entropy that down-weights easy/well-classified examples, focusing on hard misclassifications. **FL(p) = -α(1-p)^γ × log(p)**"
    },
    {
     "t": "ul",
     "items": [
      "γ=0: Standard cross-entropy",
      "γ=2: Strong focussing on hard examples"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Originally for object detection (RetinaNet). Effective for extreme imbalance. No need for sampling — loss function handles imbalance directly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you evaluate a model on imbalanced data using cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import StratifiedKFold\nfrom imblearn.pipeline import Pipeline  # NOT sklearn Pipeline!\nfrom imblearn.over_sampling import SMOTE\n\npipe = Pipeline([\n    ('smote', SMOTE()),\n    ('clf', RandomForestClassifier())\n])\ncv = StratifiedKFold(n_splits=5)\nscores = cross_val_score(pipe, X, y, cv=cv, scoring='f1')"
    },
    {
     "t": "p",
     "text": "**Explanation:** Use `imblearn.pipeline.Pipeline` (not sklearn's) because sklearn Pipeline doesn't support samplers. Stratified CV ensures each fold has same class distribution. SMOTE applied inside each fold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the precision-recall trade-off in the context of imbalanced data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As you lower the classification threshold:"
    },
    {
     "t": "ul",
     "items": [
      "Recall increases (catch more positives)",
      "Precision typically decreases (more false positives)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** With 2% positive class, high recall requires accepting many false positives since the prior is so low. PR curve shows this relationship. Choose threshold based on business tolerance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "When would you frame an imbalanced classification problem as anomaly detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When positive class is extremely rare (< 1%) and represents \"anomalies\":"
    },
    {
     "t": "ul",
     "items": [
      "Fraud: 0.1% of transactions",
      "Equipment failure: 0.01% of readings",
      "Intrusion detection: tiny fraction of network traffic"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Anomaly detection doesn't need labeled minority data. Trains on \"normal\" data, flags deviations. Methods: Isolation Forest, One-Class SVM, Autoencoders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the difference between oversampling and data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Oversampling:** Duplicates or interpolates existing samples (SMOTE)",
      "**Data augmentation:** Creates genuinely new variations (rotations, crops for images; paraphrasing for text)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Data augmentation adds real diversity. SMOTE-like methods add interpolated diversity. Augmentation is more common in deep learning, oversampling in traditional ML."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How does the One-Class SVM handle imbalanced data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Trains only on the majority (normal) class to learn its boundary. Flags samples outside the boundary as anomalies (minority class)."
    },
    {
     "t": "p",
     "text": "**Explanation:** No need for labeled minority data. Learns the \"normal\" distribution. New samples too far from normal → flagged. Useful when minority examples are scarce or evolving (new types of fraud)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
