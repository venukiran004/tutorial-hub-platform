/* ============================================================================
   PRACTICE P7.3 — Model Evaluation and Tuning · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/07_Model_Evaluation_and_Tuning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.3",
 "lede": "**25 scenarios** from Model Evaluation and Tuning. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the fundamental purpose of cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Estimate how well a model generalizes to unseen data by repeatedly splitting data into train/validation sets and averaging performance."
    },
    {
     "t": "p",
     "text": "**Explanation:** Single train/test split gives noisy estimate. CV reduces variance of the estimate. NOT for training the final model — for model selection and evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "You use 5-fold CV and get scores [0.85, 0.82, 0.90, 0.79, 0.88]. What can you conclude?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mean accuracy ≈ 0.85 with std ≈ 0.04. The model generalizes reasonably but has some variance across folds."
    },
    {
     "t": "p",
     "text": "**Explanation:** Report mean ± std: 0.85 ± 0.04. High std suggests sensitivity to data split. Check if any fold has unusual data distribution. Score of 0.79 may indicate a hard subset."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is the difference between K-fold, Stratified K-fold, and Group K-fold?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**K-fold:** Random split into K equal folds",
      "**Stratified K-fold:** Preserves class distribution in each fold (for classification)",
      "**Group K-fold:** Ensures samples from same group (patient, user) don't appear in both train and test"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use stratified for classification with imbalanced classes. Group for data with dependencies (multiple samples per patient)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "When should you use Group K-Fold?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When data has grouped/dependent observations:"
    },
    {
     "t": "ul",
     "items": [
      "Multiple images from same patient",
      "Multiple transactions from same customer",
      "Time series from same sensor"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Without grouping, model can memorize patient-specific patterns and appear to generalize. GroupKFold ensures entire groups are held out together."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is Repeated Stratified K-Fold and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Runs stratified K-fold multiple times with different random splits. Averages across all folds × repeats."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import RepeatedStratifiedKFold\ncv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces variance of CV estimate. 5-fold × 10 repeats = 50 evaluations. More stable estimate but 10× more computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is nested cross-validation and why is it needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Inner loop: hyperparameter tuning. Outer loop: unbiased performance estimation."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "inner_cv = StratifiedKFold(n_splits=5)\nouter_cv = StratifiedKFold(n_splits=5)\ngrid = GridSearchCV(model, param_grid, cv=inner_cv)\nscores = cross_val_score(grid, X, y, cv=outer_cv)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without nesting, tuning on the same CV used for evaluation gives optimistic bias. Nested CV provides unbiased estimate of the tuned model's generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the difference between GridSearchCV and RandomizedSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**GridSearchCV:** Exhaustive search over all parameter combinations (guaranteed to find optimal in grid)",
      "**RandomizedSearchCV:** Samples random combinations from parameter distributions (faster, nearly as good)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Grid: 3 params × 10 values = 1000 combinations. Random with 100 iterations covers more diverse parameter space with 10× less computation. Random preferred for > 3 hyperparameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "How does Bayesian Optimization for hyperparameter tuning work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Builds a surrogate model (Gaussian Process) of the objective function, uses it to decide which hyperparameters to try next. Balances exploration (uncertain regions) vs exploitation (promising regions)."
    },
    {
     "t": "p",
     "text": "**Explanation:** More efficient than grid/random — learns from previous evaluations. Libraries: Optuna, Hyperopt, scikit-optimize. Typically finds better parameters in fewer iterations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is Optuna and how does it differ from GridSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Optuna uses Tree-structured Parzen Estimator (TPE) for intelligent search. Features:"
    },
    {
     "t": "ol",
     "items": [
      "Define-by-run API (dynamic search spaces)",
      "Pruning (early stopping bad trials)",
      "Multi-objective optimization",
      "Visualization dashboard"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Optuna adapts search based on results. GridSearchCV blindly tries all combinations. Optuna is more efficient for complex search spaces."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is early stopping in hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Terminating unpromising trials/configurations before full evaluation to save computation."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Optuna pruning\nstudy = optuna.create_study()\nstudy.optimize(objective, n_trials=100, \n               callbacks=[optuna.study.MaxTrialsCallback(100)])"
    },
    {
     "t": "p",
     "text": "**Explanation:** If a trial is performing poorly after 2 epochs, don't wait for 100 epochs. Successive Halving and Hyperband formalize this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What are Successive Halving and Hyperband?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Successive Halving:** Start many configurations with small budget (epochs/data), keep top half, double budget, repeat",
      "**Hyperband:** Runs Successive Halving with different early stopping aggressiveness levels"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Efficiently allocates compute budget. sklearn: `HalvingGridSearchCV`, `HalvingRandomSearchCV`. Much faster for expensive models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What are common hyperparameters to tune for Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`n_estimators`: 100-1000 (number of trees)",
      "`max_depth`: 5-50 or None (tree depth)",
      "`min_samples_split`: 2-20 (min samples to split)",
      "`min_samples_leaf`: 1-10 (min samples in leaf)",
      "`max_features`: 'sqrt', 'log2', 0.3-0.8 (features per split)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** `n_estimators`: more always better but diminishing returns. `max_depth` and `min_samples_leaf`: control overfitting. `max_features`: diversity of trees."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What are common hyperparameters to tune for XGBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`learning_rate`: 0.01-0.3 (step size)",
      "`n_estimators`: 100-5000 (boosting rounds)",
      "`max_depth`: 3-10 (tree depth, typically 6)",
      "`subsample`: 0.6-1.0 (row sampling)",
      "`colsample_bytree`: 0.6-1.0 (column sampling)",
      "`reg_alpha` (L1), `reg_lambda` (L2): regularization",
      "`min_child_weight`: 1-10 (minimum leaf weight)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower learning rate + more estimators = better but slower. Use early stopping with validation set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the relationship between learning rate and number of estimators in gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Inversely related — lower learning rate needs more estimators for same performance but generalizes better (shrinkage effect)."
    },
    {
     "t": "p",
     "text": "**Explanation:** `lr=0.1, n_estimators=100` ≈ `lr=0.01, n_estimators=1000`. Smaller lr = more regularized, less overfitting. Use early stopping to find optimal n_estimators for given lr."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the difference between model selection and model assessment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model selection:** Choosing the best model/hyperparameters (use validation set or inner CV)",
      "**Model assessment:** Estimating generalization performance (use test set or outer CV)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Using the same data for both leads to optimistic estimate. Three-way split (train/val/test) or nested CV solves this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is data leakage in the context of cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Information from the validation fold leaking into training through preprocessing done before splitting."
    },
    {
     "t": "p",
     "text": "**Common leaks:**"
    },
    {
     "t": "ol",
     "items": [
      "Scaling on full data before CV",
      "Feature selection using all data",
      "Oversampling (SMOTE) before CV"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Always use Pipeline to ensure preprocessing happens inside CV. `fit` on train fold, `transform` on validation fold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "How would you tune hyperparameters for an SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Kernel:** 'rbf', 'linear', 'poly'",
      "**C:** Regularization (0.001 to 1000, log scale)",
      "**gamma (RBF):** Kernel width ('scale', 'auto', 0.001 to 10, log scale)",
      "**degree (poly):** Polynomial degree (2-5)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** C and gamma are critical for RBF — grid search on log scale. Start coarse, then fine-tune around best region."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is the one-standard-error rule in model selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Choose the simplest model within one standard error of the best-performing model's CV score."
    },
    {
     "t": "p",
     "text": "**Explanation:** Best CV score may overfit the validation folds. Simpler model within noise range (1 SE ≈ noise level) likely generalizes better. Common in regularization path selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "How do you handle hyperparameter tuning when training is very expensive?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Random search instead of grid (more efficient)",
      "Bayesian optimization (learns from previous trials)",
      "Successive halving (prune bad configurations early)",
      "Transfer from similar tasks (warm starting)",
      "Use smaller proxy dataset for initial tuning"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 100 GridSearch CV trials × 5 folds = 500 model fits. Use progressive strategies: coarse random → fine Bayesian."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the difference between validation set and cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Validation set:** Single held-out partition (~20% of training data)",
      "**Cross-validation:** Multiple train/validation splits, each data point serves as validation once"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Validation set: fast, one model fit. CV: more reliable estimate, K model fits. Use validation set for very large data or extremely expensive models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How does Leave-One-Out CV (LOOCV) compare to K-fold CV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**LOOCV:** K=n (each sample is validation set). Low bias, high variance, expensive.",
      "**K-fold (K=5-10):** More bias than LOOCV but lower variance."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** LOOCV: n model fits (expensive). Training sets nearly identical → high variance in estimate. Recommended only for very small datasets (n < 50)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is time series cross-validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on past data, validate on future data. Never use future data for training."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import TimeSeriesSplit\ntscv = TimeSeriesSplit(n_splits=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Split 1: Train [1-100], Test [101-150]. Split 2: Train [1-150], Test [151-200]. Expanding window. Can also use sliding window to limit training size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is warm starting and how does it help with hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reusing a previously trained model as initialization for a new configuration. Saves computation."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = RandomForestClassifier(n_estimators=100, warm_start=True)\nmodel.fit(X, y)  # Train 100 trees\nmodel.n_estimators = 200\nmodel.fit(X, y)  # Add 100 more trees, don't retrain first 100"
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful for tuning `n_estimators` in ensembles. Also for iterative algorithms where previous solution is close to new optimal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is multi-objective hyperparameter optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tuning hyperparameters to optimize multiple conflicting objectives simultaneously (e.g., accuracy AND inference speed, precision AND recall)."
    },
    {
     "t": "p",
     "text": "**Explanation:** No single best solution — get a Pareto front of non-dominated solutions. Optuna supports multi-objective. Choose based on business priority."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "How do you tune hyperparameters for neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Learning rate: Most critical (1e-5 to 1e-1, log scale)",
      "Batch size: 16, 32, 64, 128, 256",
      "Architecture: Layers, units per layer",
      "Dropout rate: 0.0 to 0.5",
      "Weight decay: 1e-6 to 1e-2",
      "Optimizer: Adam, SGD with momentum, AdamW"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Learning rate schedule often more important than initial rate. Use learning rate finder. Architecture search is expensive — use proven architectures."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
