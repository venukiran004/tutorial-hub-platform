/* ============================================================================
   PRACTICE P7.4 — Model Evaluation and Tuning · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/07_Model_Evaluation_and_Tuning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.4",
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
   "n": "76",
   "q": "What is cross-validation for feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Computing features (like target encoding, NLP embeddings) inside CV folds to prevent leakage."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipe = Pipeline([\n    ('target_enc', TargetEncoder()),\n    ('model', LogisticRegression())\n])\ncross_val_score(pipe, X, y, cv=5)  # Encoding computed per fold"
    },
    {
     "t": "p",
     "text": "**Explanation:** Any feature derived from the target must be computed inside CV. Pipeline ensures this. Without it, information from validation fold contaminates training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the problem with too many hyperparameter tuning iterations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Overfitting to the validation set — the search finds hyperparameters that coincidentally perform well on validation folds but don't generalize."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each trial extracts information from the validation set. Infinite trials → perfectly fit validation set (noise). Use hold-out test set to verify. Nested CV prevents this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is a learning rate schedule and how do you choose one?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Step decay:** Reduce by factor every N epochs",
      "**Cosine annealing:** Smooth cosine decay to near zero",
      "**Warmup + decay:** Start small, increase, then decrease",
      "**Reduce on plateau:** Reduce when metric stops improving",
      "**One-cycle:** Increase then decrease within one cycle"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Schedule often matters more than initial rate. Warmup helps for large learning rates and transformers. Cosine widely used in modern deep learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the difference between hyperparameter and model parameter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model parameters:** Learned from data during training (weights, coefficients, splits)",
      "**Hyperparameters:** Set before training, control the learning process (learning rate, regularization, tree depth)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Parameters: fit from data. Hyperparameters: chosen by practitioner or tuning algorithm. Hyperparameters control model complexity and learning dynamics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "How would you tune a pipeline with multiple stages?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipe = Pipeline([\n    ('scaler', StandardScaler()),\n    ('pca', PCA()),\n    ('svm', SVC())\n])\nparam_grid = {\n    'pca__n_components': [10, 20, 50],\n    'svm__C': [0.1, 1, 10],\n    'svm__kernel': ['rbf', 'linear']\n}\nGridSearchCV(pipe, param_grid, cv=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Use `step__param` naming convention. All combinations are searched. For complex pipelines, use RandomizedSearchCV or Optuna to avoid combinatorial explosion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is transfer learning in the context of hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Using optimal hyperparameters from a similar task/dataset as starting point for the current task."
    },
    {
     "t": "p",
     "text": "**Explanation:** If lr=0.01, depth=6 worked for similar dataset, start search there. Meta-learning: learn hyperparameter patterns across many datasets. Saves significant tuning time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "How does cross-validation handle the bias-variance trade-off?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**More folds (larger K):** Lower bias (training set closer to full data), higher variance (validation sets smaller)",
      "**Fewer folds (smaller K):** Higher bias (less training data), lower variance (larger validation sets)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K=5 or K=10 is the empirical sweet spot. LOOCV (K=n): lowest bias, highest variance. The choice itself involves a trade-off."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the purpose of a validation curve analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Diagnose model complexity:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import validation_curve\ntrain_scores, val_scores = validation_curve(\n    SVC(), X, y, param_name='C', param_range=[0.01, 0.1, 1, 10, 100], cv=5\n)"
    },
    {
     "t": "p",
     "text": "Plot train vs validation score as function of C to see where overfitting begins."
    },
    {
     "t": "p",
     "text": "**Explanation:** If train=high, val=low as C increases → overfitting from low to high C. Optimal C is where val score peaks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the Pareto front in multi-objective optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Set of solutions where no solution is better in ALL objectives than another. Trade-offs between objectives are visualized."
    },
    {
     "t": "p",
     "text": "**Explanation:** Example: Model A (accuracy=90%, latency=10ms), Model B (accuracy=92%, latency=50ms). Both on Pareto front — neither dominates other. Choose based on priorities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "How do you implement early stopping for gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import xgboost as xgb\nmodel = xgb.XGBClassifier(\n    n_estimators=10000,\n    learning_rate=0.01,\n    early_stopping_rounds=50\n)\nmodel.fit(X_train, y_train, \n          eval_set=[(X_val, y_val)],\n          verbose=100)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Trains up to 10000 boosting rounds but stops when validation score doesn't improve for 50 rounds. Automatically finds optimal number of estimators."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the difference between deterministic and stochastic hyperparameter search?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Deterministic:** GridSearch (reproducible, exhaustive, expensive)",
      "**Stochastic:** RandomSearch, Bayesian opt (may find different results each run, faster)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Grid is reproducible but scales exponentially with parameters. Set `random_state` in stochastic methods for reproducibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "How would you tune class_weight for imbalanced classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "param_grid = {\n    'class_weight': ['balanced', {0: 1, 1: 5}, {0: 1, 1: 10}, {0: 1, 1: 20}]\n}\nGridSearchCV(LogisticRegression(), param_grid, cv=5, scoring='f1')"
    },
    {
     "t": "p",
     "text": "**Explanation:** `'balanced'` adjusts inversely proportional to class frequency. Custom weights let you fine-tune. Optimize using recall, F1, or PR-AUC — not accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is cross-validated prediction (cross_val_predict)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each sample is predicted by the model trained without it (out-of-fold predictions)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import cross_val_predict\ny_pred = cross_val_predict(model, X, y, cv=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike `cross_val_score` (returns scores), this returns predictions for every sample. Useful for stacking, error analysis, and creating meta-features. Not appropriate for evaluation (different models predict different folds)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the impact of the scoring metric choice on hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The scoring metric determines what the search optimizes for. Different metrics → different optimal hyperparameters."
    },
    {
     "t": "p",
     "text": "**Example:** Optimizing for 'accuracy' vs 'f1' on imbalanced data: accuracy-optimal model may predict all-majority; F1-optimal model balances precision/recall."
    },
    {
     "t": "p",
     "text": "**Explanation:** Always align scoring with business objective. Available: 'roc_auc', 'f1', 'precision', 'recall', 'neg_log_loss', custom scorers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is Hyperband and how does it allocate resources?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Runs multiple brackets of Successive Halving with different trade-offs between n_configurations and budget_per_configuration."
    },
    {
     "t": "p",
     "text": "**Explanation:** Some brackets try many configurations with small budget (aggressive early stopping). Others try fewer with larger budget (conservative). Automatically balances exploration and exploitation. Very efficient for neural network hyperparameter tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "How do you handle categorical hyperparameters in optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bayesian optimization handles them by creating separate surrogate models or using specialized kernels. RandomSearch samples uniformly."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Optuna example\ndef objective(trial):\n    kernel = trial.suggest_categorical('kernel', ['rbf', 'linear', 'poly'])\n    C = trial.suggest_float('C', 1e-3, 1e3, log=True)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Grid search handles naturally. For Bayesian optimization, categorical params create branching search spaces."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the \"no free lunch\" theorem and its implication for model selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No single algorithm is best for all problems. A model optimal on average across all possible problems doesn't exist."
    },
    {
     "t": "p",
     "text": "**Explanation:** Implication: must try multiple algorithms per problem. Cross-validation guides choice. Domain knowledge narrows candidates. AutoML automates this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is AutoML and how does it relate to hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automated Machine Learning automates model selection, feature engineering, and hyperparameter tuning. Tools: Auto-sklearn, TPOT, H2O AutoML, Google AutoML."
    },
    {
     "t": "p",
     "text": "**Explanation:** AutoML searches over algorithms AND hyperparameters jointly. More comprehensive than tuning one model. Useful as baseline and for non-experts. May miss domain-specific optimizations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How do you define a custom scoring function for GridSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import make_scorer\n\ndef custom_metric(y_true, y_pred):\n    fp_cost = 10\n    fn_cost = 100\n    fp = ((y_pred == 1) & (y_true == 0)).sum()\n    fn = ((y_pred == 0) & (y_true == 1)).sum()\n    return -(fp * fp_cost + fn * fn_cost)  # Negative because sklearn maximizes\n\nscorer = make_scorer(custom_metric)\nGridSearchCV(model, param_grid, scoring=scorer, cv=5)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Custom scorers align optimization with business objectives. Use `needs_proba=True` for probability-based metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between cross_val_score and GridSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**cross_val_score:** Evaluates ONE model with fixed hyperparameters across K folds",
      "**GridSearchCV:** Evaluates MANY models (different hyperparameters) across K folds, selects best"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** `cross_val_score` for evaluation. `GridSearchCV` for selection + evaluation. GridSearchCV refits best model on full training data when `refit=True`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How do you handle the computational cost of large search spaces?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Start with coarse random search to identify promising regions",
      "Fine-tune with grid or Bayesian search in promising region",
      "Use cheaper proxy (smaller data, fewer epochs) for initial screening",
      "Parallelize with `n_jobs=-1`",
      "Use early stopping / pruning (Hyperband, Optuna pruning)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Progressive refinement: coarse → fine. Don't spend compute on clearly bad regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the purpose of the refit parameter in GridSearchCV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When `refit=True` (default), GridSearchCV retrains the best model on the entire training set (all folds combined) after finding optimal hyperparameters."
    },
    {
     "t": "p",
     "text": "**Explanation:** The best model from CV was trained on K-1 folds. Refitting on full data gives better final model. `grid.predict()` uses refitted model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How would you tune hyperparameters for a stacking ensemble?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Tune each base model independently first",
      "Then tune the meta-learner",
      "Optionally re-tune jointly (expensive)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import StackingClassifier\nstack = StackingClassifier(\n    estimators=[('rf', tuned_rf), ('svm', tuned_svm)],\n    final_estimator=LogisticRegression()\n)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Full joint search is combinatorial explosion. Sequential tuning is practical approximation. Use cross-validated predictions for meta-features (cross_val_predict)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the effect of CV folds on hyperparameter tuning time?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Total training runs = n_combinations × K_folds (+ 1 refit). Doubling folds doubles computation."
    },
    {
     "t": "p",
     "text": "**Example:** GridSearch with 100 combinations, 5-fold CV = 500 model fits + 1 refit = 501 total."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduce via: fewer folds (3 instead of 10), fewer combinations (random search), faster convergence (Bayesian), parallelization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "How do you save and reproduce the best model from hyperparameter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# GridSearchCV\ngrid = GridSearchCV(model, param_grid, cv=5)\ngrid.fit(X_train, y_train)\n\n# Best parameters\nprint(grid.best_params_)\nprint(grid.best_score_)\n\n# Save best model\nimport joblib\njoblib.dump(grid.best_estimator_, 'best_model.pkl')\n\n# Reproduce\nmodel = joblib.load('best_model.pkl')"
    },
    {
     "t": "p",
     "text": "**Explanation:** Save `best_params_` for documentation. Save `best_estimator_` for deployment. Log everything in experiment tracking (MLflow, Weights & Biases)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
