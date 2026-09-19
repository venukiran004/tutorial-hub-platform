/* ============================================================================
   INTERVIEW I1.6 — Ensemble Methods & Boosting — Advanced
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.6",
 "lede": "**20 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Ensemble Methods & Boosting — Advanced",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "What is the difference between bagging and boosting?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Bagging:** Train models in parallel on bootstrap samples; reduces variance. Example: Random Forest.",
      "**Boosting:** Train models sequentially; each corrects errors of the previous; reduces bias. Examples: AdaBoost, Gradient Boosting, XGBoost."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "How does AdaBoost work?",
   "body": [
    {
     "t": "ol",
     "items": [
      "Train a weak learner on the data.",
      "Increase weights of misclassified samples.",
      "Train the next learner on re-weighted data.",
      "Final prediction = weighted vote of all learners."
     ]
    },
    {
     "t": "p",
     "text": "Each learner's vote weight \\(\\alpha_t = \\frac{1}{2}\\ln\\frac{1-\\epsilon_t}{\\epsilon_t}\\) where \\(\\epsilon_t\\) is its error rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is the objective function of Gradient Boosting?",
   "body": [
    {
     "t": "p",
     "text": "At each step \\(t\\), fit a new tree \\(h_t(x)\\) to the negative gradient of the loss function:"
    },
    {
     "t": "math",
     "tex": "r_{it} = -\\frac{\\partial L(y_i, F_{t-1}(x_i))}{\\partial F_{t-1}(x_i)}"
    },
    {
     "t": "p",
     "text": "For MSE loss, residuals = negative gradient. For log-loss, pseudo-residuals are log-odds based."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What hyperparameters are most important in XGBoost and how do they affect the model?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`n_estimators`: More trees → better fit, risk of overfitting.",
      "`learning_rate` (eta): Shrinks each tree's contribution; lower requires more trees.",
      "`max_depth`: Tree complexity; 3–6 typical.",
      "`subsample`: Row sampling each iteration; reduces overfitting.",
      "`colsample_bytree`: Feature sampling; reduces correlation between trees.",
      "`lambda` / `alpha`: L2/L1 regularization on leaf weights.",
      "`min_child_weight`: Minimum sum of hessians in a leaf; controls pruning."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "How does LightGBM differ from XGBoost?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Leaf-wise growth (best leaf first) vs XGBoost's level-wise → fewer nodes, faster, can overfit on small data.",
      "Histogram-based binning → O(n) vs O(n log n) split finding.",
      "Gradient-based One-Side Sampling (GOSS) — drops low-gradient instances.",
      "Exclusive Feature Bundling (EFB) — bundles sparse mutually exclusive features.",
      "Generally 10× faster than XGBoost on large datasets."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is CatBoost and when is it preferred?",
   "body": [
    {
     "t": "p",
     "text": "CatBoost handles categorical features natively without label encoding:"
    },
    {
     "t": "ul",
     "items": [
      "Uses Ordered Target Statistics (OTS) to avoid target leakage.",
      "Ordered boosting prevents prediction shift.",
      "Often best out-of-the-box for datasets with many high-cardinality categoricals."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is stacking (stacked generalization)?",
   "body": [
    {
     "t": "p",
     "text": "Use predictions from base models (Level 0) as features for a meta-learner (Level 1):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import StackingClassifier\nestimators = [(\"rf\", RandomForestClassifier()), (\"svm\", SVC(probability=True))]\nstack = StackingClassifier(estimators=estimators, final_estimator=LogisticRegression())"
    },
    {
     "t": "p",
     "text": "Cross-validation is used during training to prevent target leakage into meta-features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is blending vs stacking?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Blending:** Hold-out set used to train meta-model (simpler but wastes data).",
      "**Stacking:** Full OOF (out-of-fold) cross-validation used to generate meta-features (better but complex)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is a random subspace method?",
   "body": [
    {
     "t": "p",
     "text": "Train each base learner on a random subset of features (not samples). The diversification in feature subsets reduces correlation between models. Random Forest applies both bootstrap sampling (rows) AND random subspaces (features)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "When does an ensemble NOT help?",
   "body": [
    {
     "t": "ul",
     "items": [
      "If all base models make equally correlated errors.",
      "If one model is vastly better than others (blending dilutes it).",
      "When interpretability is required (ensembles are black boxes).",
      "When inference latency is critical (ensembles are slow to predict)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is the bias-variance trade-off in the context of ensembles?",
   "body": [
    {
     "t": "math",
     "tex": "MSE = Bias^2 + Variance + Irreducible Noise"
    },
    {
     "t": "ul",
     "items": [
      "Bagging reduces variance (averaging reduces fluctuation) with minimal bias change.",
      "Boosting reduces bias (each new model corrects errors) but can increase variance if over-iterated."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is isotonic regression and when is it used in ensemble learning?",
   "body": [
    {
     "t": "p",
     "text": "A non-parametric monotone regression used for calibration. It fits a piecewise constant non-decreasing function to predicted probabilities to make them better calibrated:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.isotonic import IsotonicRegression\ncal = IsotonicRegression(out_of_bounds=\"clip\")\ncalibrated_probs = cal.fit_transform(raw_probs, true_labels)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is early stopping in boosting?",
   "body": [
    {
     "t": "p",
     "text": "Stop adding trees when validation loss stops improving:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "xgb_model = XGBClassifier(n_estimators=1000, early_stopping_rounds=50)\nxgb_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)\n# Automatically stops at the best n_estimators"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is the role of `n_estimators` vs `max_depth` in Random Forest?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`n_estimators`: More trees → better generalization (diminishing returns after ~200-500; never hurts accuracy, only speed).",
      "`max_depth`: Deeper trees → higher variance. Use `None` (full depth) with enough trees OR limit depth to tune bias-variance."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is feature importance in Gradient Boosting vs Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "Both use **gain-based importance** (total reduction in loss attributed to each feature). However:"
    },
    {
     "t": "ul",
     "items": [
      "Can be biased toward high-cardinality features.",
      "SHAP values are more reliable — they are model-agnostic and consistent.",
      "Permutation importance is unbiased but slower."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is histogram-based gradient boosting (HistGradientBoosting in sklearn)?",
   "body": [
    {
     "t": "p",
     "text": "Bins feature values into fixed-width histograms before finding splits. Much faster than exact split finding for large datasets (n > 10,000):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import HistGradientBoostingClassifier\nclf = HistGradientBoostingClassifier(max_iter=500, learning_rate=0.05, max_leaf_nodes=31)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is DART (Dropouts for Additive Regression Trees)?",
   "body": [
    {
     "t": "p",
     "text": "Applies dropout to trees during boosting (randomly drops some previously learned trees). Prevents over-specialization of later trees and reduces overfitting. Available in XGBoost and LightGBM as `booster=\"dart\"`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "How do you handle class imbalance in XGBoost?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# scale_pos_weight balances positive/negative class weights\nratio = (y_train == 0).sum() / (y_train == 1).sum()\nmodel = XGBClassifier(scale_pos_weight=ratio, eval_metric=\"aucpr\")"
    },
    {
     "t": "p",
     "text": "Also: `enable_categorical=True`, sample weighting, or focal loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What are warm starts in ensemble models?",
   "body": [
    {
     "t": "p",
     "text": "Continue training from a previously fitted model without starting over:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "rf = RandomForestClassifier(n_estimators=100, warm_start=True)\nrf.fit(X, y)               # Trains 100 trees\nrf.n_estimators = 200      # Add 100 more trees\nrf.fit(X, y)               # Trains only the additional 100 trees"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is the difference between model accuracy and model calibration?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Accuracy/AUC:** How often the model predicts the correct class/rank.",
      "**Calibration:** How well predicted probabilities match empirical frequencies. A model predicting 0.8 for 1,000 cases should see ~800 positives."
     ]
    },
    {
     "t": "p",
     "text": "Evaluate with reliability diagrams and Expected Calibration Error (ECE)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
