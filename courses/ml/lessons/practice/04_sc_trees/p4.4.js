/* ============================================================================
   PRACTICE P4.4 — Trees and Ensembles · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/04_Trees_and_Ensembles.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.4",
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
   "n": "76",
   "q": "How does gradient boosting handle different loss functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Works with any differentiable loss:"
    },
    {
     "t": "ul",
     "items": [
      "**MSE:** Residuals = y - ŷ (simple)",
      "**MAE:** Residuals = sign(y - ŷ) (robust to outliers)",
      "**Log loss:** For classification",
      "**Huber loss:** Blends MSE and MAE",
      "**Custom loss:** Define gradient and hessian"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Gradient\" in gradient boosting refers to gradient of the loss function. Trees fit the negative gradient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is histogram-based gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Discretizes continuous features into bins (e.g., 256), then finds optimal split among bin boundaries."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import HistGradientBoostingClassifier\nmodel = HistGradientBoostingClassifier(max_bins=255)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Much faster than exact split finding. LightGBM uses this natively. sklearn added HistGradientBoosting for this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the warm_start parameter in ensemble models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows incremental training by adding new trees to existing ensemble:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = GradientBoostingClassifier(n_estimators=100, warm_start=True)\nmodel.fit(X, y)  # Train 100 trees\nmodel.n_estimators = 200\nmodel.fit(X, y)  # Add 100 more trees (total: 200)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful for incremental training, hyperparameter search, and online learning scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the difference between Random Forest and Gradient Boosting training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Random Forest",
      "Gradient Boosting"
     ],
     "rows": [
      [
       "Training",
       "Parallel (independent trees)",
       "Sequential (each depends on previous)"
      ],
      [
       "Goal",
       "Reduce variance",
       "Reduce bias"
      ],
      [
       "Base learner",
       "Deep trees",
       "Shallow trees (stumps/depth 3-6)"
      ],
      [
       "Learning rate",
       "N/A",
       "Critical parameter"
      ],
      [
       "Overfitting",
       "Resistant to more trees",
       "Can overfit with too many trees"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is model diversity and why is it important for ensembles?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Models should make different errors (uncorrelated predictions). Diversity sources:"
    },
    {
     "t": "ol",
     "items": [
      "**Data diversity:** Different training subsets (bagging)",
      "**Feature diversity:** Different feature subsets (RF)",
      "**Algorithm diversity:** Different learning algorithms (stacking)",
      "**Hyperparameter diversity:** Same algorithm, different settings"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If all models make the same errors, ensemble can't correct them."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you tune XGBoost hyperparameters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Priority order:\n# 1. Fix learning_rate=0.1, n_estimators=1000 with early stopping\n# 2. Tune max_depth (3-10) and min_child_weight (1-10)\n# 3. Tune subsample (0.6-1.0) and colsample_bytree (0.6-1.0)\n# 4. Tune regularization: reg_alpha (L1), reg_lambda (L2)\n# 5. Reduce learning_rate, increase n_estimators"
    },
    {
     "t": "p",
     "text": "**Explanation:** Don't tune all at once. Use sequential approach. RandomizedSearchCV or Optuna for efficiency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is Optuna and how does it help with hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bayesian optimization framework for hyperparameter search:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import optuna\ndef objective(trial):\n    params = {\n        'max_depth': trial.suggest_int('max_depth', 3, 10),\n        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),\n    }\n    model = XGBClassifier(**params)\n    return cross_val_score(model, X, y, cv=5).mean()\nstudy = optuna.create_study(direction='maximize')\nstudy.optimize(objective, n_trials=100)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Smarter than grid/random search. Uses past results to guide future exploration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the colsample_bytree parameter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fraction of features randomly sampled for each tree (0 to 1)."
    },
    {
     "t": "ul",
     "items": [
      "colsample_bytree=1.0: All features for every tree",
      "colsample_bytree=0.7: Random 70% of features per tree"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Similar to max_features in RF. Adds randomness, reduces overfitting, speeds up training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is label encoding vs frequency encoding for CatBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**CatBoost's method:** Ordered target statistics — uses only \"past\" samples' target mean to encode each value",
      "**Advantage:** Prevents target leakage (each sample only sees previous samples' information)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Regular target encoding uses all data → leakage. CatBoost uses random permutation + ordered statistics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the effect of max_depth on boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**depth=1 (stump):** Captures single feature effects, very weak",
      "**depth=3:** Captures 3-way interactions, good default",
      "**depth=6-8:** Captures complex interactions, risk of overfitting",
      "**depth>10:** Usually too complex for boosting"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike RF where deep trees are default, boosting uses shallow trees (each tree just needs to slightly improve)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "How do ensemble methods handle feature importance across multiple models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging/RF:** Average importance across all trees",
      "**Boosting:** Sum gain across all boosting rounds",
      "**Stacking:** Feature importance of meta-learner shows which base model is most useful"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Ensemble importance is more stable than single model. Use multiple methods to cross-validate importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between scikit-learn's GradientBoosting and XGBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "sklearn GB",
      "XGBoost"
     ],
     "rows": [
      [
       "Speed",
       "Slow (pure Python)",
       "Fast (C++ with Python wrapper)"
      ],
      [
       "Regularization",
       "max_depth only",
       "L1, L2, max_depth, min_child_weight"
      ],
      [
       "Missing values",
       "Must impute",
       "Handles natively"
      ],
      [
       "Parallelism",
       "Single-threaded",
       "Multi-threaded"
      ],
      [
       "GPU",
       "No",
       "Yes"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is model calibration after boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Boosting models often produce poorly calibrated probabilities. Calibrate using:"
    },
    {
     "t": "ol",
     "items": [
      "Platt scaling (sigmoid)",
      "Isotonic regression"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.calibration import CalibratedClassifierCV\ncalibrated = CalibratedClassifierCV(xgb_model, method='isotonic', cv=5)\ncalibrated.fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** XGBoost may predict 0.9 but only 70% of such cases are actually positive. Calibration fixes this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the scale_pos_weight parameter in XGBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Handles class imbalance by scaling the gradient for positive class:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# For 100 positives, 900 negatives:\nmodel = XGBClassifier(scale_pos_weight=9)  # ratio of negatives/positives"
    },
    {
     "t": "p",
     "text": "**Explanation:** Equivalent to class_weight in sklearn. Increases penalty for misclassifying minority class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the difference between Random Forest and extra randomization in ExtraTrees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Random Forest",
      "ExtraTrees"
     ],
     "rows": [
      [
       "Data sampling",
       "Bootstrap (with replacement)",
       "Full dataset"
      ],
      [
       "Split threshold",
       "Optimal (best among candidates)",
       "Random (among candidates)"
      ],
      [
       "Variance",
       "Lower",
       "Even lower"
      ],
      [
       "Bias",
       "Lower",
       "Higher"
      ],
      [
       "Speed",
       "Slower",
       "Faster"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is Bayesian Model Averaging vs. Model Selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model Selection:** Pick the single best model",
      "**Model Averaging:** Average predictions weighted by posterior probability of each model being correct"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Averaging is more robust — even \"wrong\" models can contribute useful information. Ensemble methods approximate this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "When would you use ensemble methods vs. a single complex model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Ensemble better when:**"
    },
    {
     "t": "ol",
     "items": [
      "Diverse base models available",
      "Tabular data",
      "Competition/maximum accuracy needed"
     ]
    },
    {
     "t": "p",
     "text": "**Single model better when:**"
    },
    {
     "t": "ol",
     "items": [
      "Interpretability required",
      "Inference speed critical",
      "Deep learning on images/text/audio",
      "Resource constraints"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the bias-variance decomposition for ensembles?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "MSE = Bias² + Variance + Noise"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging:** Does not reduce bias, reduces variance by factor of ρ/n + (1-ρ)",
      "**Boosting:** Primarily reduces bias, may increase variance",
      "**Stacking:** Can reduce both (if diverse models)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ρ = correlation between base models. Lower ρ → more variance reduction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the snapshot ensemble idea?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Save model checkpoints during training with cyclic learning rate. Ensemble all snapshots."
    },
    {
     "t": "p",
     "text": "**Advantage:** Multiple diverse models from a single training run."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each snapshot captures model at different local minimum. Combining them improves performance without extra training cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "How does dropout relate to ensemble methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dropout in neural networks ≈ training an exponential number of sub-networks."
    },
    {
     "t": "ul",
     "items": [
      "Each training step: random subset of neurons → different \"model\"",
      "At inference: scale outputs (or use averaged weights)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Dropout = implicit ensemble. Each forward pass with different dropout mask = different model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the effective number of trees in a random forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Performance saturates after some number of trees. Effective number depends on:"
    },
    {
     "t": "ol",
     "items": [
      "Dataset size and complexity",
      "Feature diversity",
      "Tree correlation"
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** Plot OOB error vs. n_estimators. Use the elbow point (typically 100-500)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is Mixup for ensemble learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Create synthetic training samples by interpolating between existing samples:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "x_new = λ * x_i + (1-λ) * x_j\ny_new = λ * y_i + (1-λ) * y_j"
    },
    {
     "t": "p",
     "text": "λ ~ Beta(α, α)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Regularization technique that creates softer decision boundaries. Works for both classification and regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How do you handle different base model outputs in stacking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Base models may output different things:\n# - Probabilities: [0.1, 0.9]\n# - Class labels: [1]\n# - Confidence scores: [2.3]\n\n# Best practice: Use probability outputs for meta-learner features\n# Stack shape: (n_samples, n_models × n_classes)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Probability outputs are most informative. Include original features alongside stacked predictions for meta-learner."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the No Free Lunch theorem and how does it relate to ensembles?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No single algorithm is best for all problems. Averaged over ALL possible problems, all algorithms perform equally."
    },
    {
     "t": "p",
     "text": "**Ensemble implication:** Combining diverse algorithms covers more problem types → more robust across different data patterns."
    },
    {
     "t": "p",
     "text": "**Explanation:** NFL means we need domain knowledge to choose algorithms. Ensembles hedge the bet."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the Condorcet Jury Theorem and how does it support ensemble learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** If each voter (model) has >50% accuracy and votes independently, the majority vote accuracy approaches 100% as voters increase."
    },
    {
     "t": "p",
     "text": "**Requirements:**"
    },
    {
     "t": "ol",
     "items": [
      "Each model better than random (>50%)",
      "Models make independent errors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Mathematical justification for ensembles. Independence is key — correlated models don't add much."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
