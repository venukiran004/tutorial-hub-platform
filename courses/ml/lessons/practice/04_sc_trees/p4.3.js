/* ============================================================================
   PRACTICE P4.3 — Trees and Ensembles · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/04_Trees_and_Ensembles.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.3",
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
   "n": "51",
   "q": "What is the fundamental idea behind ensemble methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine multiple \"weak\" models to create a \"strong\" model. Diversity among models reduces error."
    },
    {
     "t": "p",
     "text": "**Analogy:** Asking 100 people a question and taking majority vote is more reliable than asking one person."
    },
    {
     "t": "p",
     "text": "**Key insight:** Ensemble error decreases if models make uncorrelated errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What are the three main types of ensemble methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Bagging:** Parallel models, reduce variance (Random Forest)",
      "**Boosting:** Sequential models, reduce bias (XGBoost, AdaBoost)",
      "**Stacking:** Different model types, meta-learner combines predictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bagging for high-variance models (trees). Boosting for high-bias models. Stacking for maximizing accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "How does AdaBoost work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Train weak learner (stump) on data",
      "Increase weights of misclassified samples",
      "Train next weak learner on reweighted data",
      "Repeat for T iterations",
      "Final prediction = weighted vote of all learners"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Each learner focuses on what previous learners got wrong. Well-classified samples become less important."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the weight update formula in AdaBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Learner weight: α_t = 0.5 * ln((1 - ε_t) / ε_t)\nSample weight: w_i *= exp(-α_t * y_i * h_t(x_i))"
    },
    {
     "t": "ul",
     "items": [
      "ε_t: weighted error rate of learner t",
      "Misclassified: weight increases by exp(α_t)",
      "Correct: weight decreases by exp(-α_t)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Better learners (lower error) get higher α. Harder samples get more focus."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "How does Gradient Boosting differ from AdaBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**AdaBoost:** Adjusts sample weights to focus on errors",
      "**Gradient Boosting:** Fits new model to the residuals (gradient of loss) of previous models"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "F_t(x) = F_{t-1}(x) + η * h_t(x)\nwhere h_t fits the negative gradient of loss"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradient boosting generalizes boosting to any differentiable loss function. More flexible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What are the key hyperparameters of Gradient Boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**n_estimators:** Number of boosting stages",
      "**learning_rate (η):** Shrinkage — how much each tree contributes",
      "**max_depth:** Depth of each tree (typically 3-8)",
      "**subsample:** Fraction of data used per tree (<1 adds randomness)",
      "**min_samples_leaf:** Minimum samples per leaf"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** learning_rate and n_estimators are inversely related. Lower η + more trees = better generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the relationship between learning rate and number of trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**η=0.1, n=1000:** Many small steps → better generalization, slower training",
      "**η=1.0, n=10:** Few large steps → may overfit, fast training",
      "**Best practice:** Small η (0.01-0.1) with many trees and early stopping"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Shrinkage (small η) regularizes boosting. Each tree's contribution is scaled down."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is early stopping in gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop adding trees when validation performance stops improving."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = GradientBoostingClassifier(n_estimators=1000, n_iter_no_change=10)\nmodel.fit(X_train, y_train)\n# Stops when validation score doesn't improve for 10 rounds"
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents overfitting without manually choosing n_estimators. Use validation set or cross-validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is XGBoost and why is it so popular?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** eXtreme Gradient Boosting — optimized gradient boosting with:"
    },
    {
     "t": "ol",
     "items": [
      "**Regularization:** L1/L2 on leaf weights",
      "**Speed:** Parallel tree construction, cache-aware, hardware optimization",
      "**Missing value handling:** Learns optimal default direction",
      "**Built-in cross-validation** and early stopping",
      "**Feature importance** methods"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Won many Kaggle competitions. 10-100x faster than sklearn gradient boosting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What regularization does XGBoost apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Objective = Σ L(y_i, ŷ_i) + Σ Ω(f_t)\nΩ(f) = γ*T + 0.5*λ*||w||² + α*||w||₁"
    },
    {
     "t": "ul",
     "items": [
      "γ: penalty for number of leaves (T)",
      "λ: L2 regularization on leaf weights",
      "α: L1 regularization on leaf weights"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike standard GB, XGBoost explicitly regularizes tree complexity and leaf values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "How does XGBoost handle missing values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** At each split, XGBoost learns optimal direction (left or right) for missing values by trying both and keeping whichever minimizes loss."
    },
    {
     "t": "p",
     "text": "**Explanation:** No imputation needed. Missing values can go either way at each node. This is learned during training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is LightGBM and how does it differ from XGBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Leaf-wise growth:** Splits the leaf with maximum gain (vs. XGBoost's level-wise)",
      "**GOSS:** Gradient-based One-Side Sampling — keeps high-gradient instances",
      "**EFB:** Exclusive Feature Bundling — bundles sparse features",
      "**Faster:** Histogram-based for faster splits"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Leaf-wise can overfit on small data but is more efficient. Much faster for large datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is CatBoost and what's its unique advantage?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Native categorical handling:** Ordered target statistics (no need for encoding)",
      "**Ordered boosting:** Prevents target leakage in gradient estimation",
      "**Symmetric trees:** All leaves at same level"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Best out-of-the-box for datasets with many categorical features. Less hyperparameter tuning needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the difference between level-wise and leaf-wise tree growth?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Level-wise (XGBoost):** Grows all nodes at same depth → balanced tree",
      "**Leaf-wise (LightGBM):** Grows leaf with highest gain → potentially unbalanced tree"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Leaf-wise: faster convergence but may overfit on small data. Level-wise: more conservative, handles small data better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "How does stacking (model stacking) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Level 0: Train base models (RF, XGBoost, LR, etc.)\nLevel 1: Use base model predictions as features for meta-learner"
    },
    {
     "t": "p",
     "text": "**Steps:**"
    },
    {
     "t": "ol",
     "items": [
      "Split data into K folds",
      "For each fold: train base models on K-1 folds, predict on held-out fold",
      "Stack: create new dataset from out-of-fold predictions",
      "Train meta-learner on stacked features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combines diverse models' strengths. Meta-learner learns optimal combination."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the blending approach vs. stacking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Stacking:** Uses cross-validation for out-of-fold predictions → uses all data",
      "**Blending:** Uses a fixed holdout set for base model predictions → simpler but wastes data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Stacking is more robust but complex. Blending is simpler but less data-efficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is voting ensemble?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.ensemble import VotingClassifier\nmodel = VotingClassifier([\n    ('rf', RandomForestClassifier()),\n    ('svc', SVC(probability=True)),\n    ('lr', LogisticRegression())\n], voting='soft')"
    },
    {
     "t": "ul",
     "items": [
      "**Hard voting:** Majority class vote",
      "**Soft voting:** Average predicted probabilities"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft voting usually better — uses model confidence. All models must support predict_proba."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "Why does boosting tend to overfit while bagging doesn't?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging:** Each model is independent, averaging reduces variance. More models = more averaging = better.",
      "**Boosting:** Each model corrects previous errors. Too many rounds → fits noise → overfitting."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bagging reduces variance only. Boosting reduces bias but can increase variance with too many iterations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the subsample parameter in gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fraction of training data used for each tree (stochastic gradient boosting)."
    },
    {
     "t": "ul",
     "items": [
      "subsample = 1.0: Use all data (default)",
      "subsample = 0.8: Random 80% per tree → adds randomness"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** subsample < 1.0 acts as regularization (like dropout). Reduces overfitting, adds bagging effect to boosting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "How do you compare XGBoost, LightGBM, and CatBoost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "XGBoost",
      "LightGBM",
      "CatBoost"
     ],
     "rows": [
      [
       "Speed",
       "Fast",
       "Fastest",
       "Moderate"
      ],
      [
       "Categoricals",
       "Manual encoding",
       "Some support",
       "Best native"
      ],
      [
       "Missing values",
       "Handles natively",
       "Handles natively",
       "Handles natively"
      ],
      [
       "Small data",
       "Good",
       "May overfit",
       "Good"
      ],
      [
       "Default performance",
       "Good",
       "Good",
       "Best out-of-box"
      ],
      [
       "GPU support",
       "Yes",
       "Yes",
       "Yes"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is feature importance in gradient boosting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Three methods:"
    },
    {
     "t": "ol",
     "items": [
      "**Gain:** Total reduction in loss from splits on that feature",
      "**Cover:** Number of samples affected by splits on that feature",
      "**Frequency:** Number of times feature is used in splits"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Gain is most informative. Frequency can be misleading (feature used often but with little gain)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is SHAP and how does it explain model predictions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** SHapley Additive exPlanations — assigns each feature a contribution to the prediction."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import shap\nexplainer = shap.TreeExplainer(model)\nshap_values = explainer.shap_values(X_test)\nshap.summary_plot(shap_values, X_test)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Based on game theory (Shapley values). Consistent, locally accurate. Gold standard for model interpretability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is the out-of-bag (OOB) error estimate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each bootstrap sample uses ~63.2% of data. The remaining ~36.8% is out-of-bag."
    },
    {
     "t": "p",
     "text": "**OOB error:** Evaluate each sample using only trees that didn't include it → unbiased error estimate."
    },
    {
     "t": "p",
     "text": "**Explanation:** Free cross-validation. Similar accuracy to K-fold CV. Available in Random Forest and BaggingClassifier."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "When does boosting fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Noisy data:** Boosting focuses on hard examples, which are often noise",
      "**Outliers:** Gets increasingly focused on outlier samples",
      "**Too many rounds without early stopping:** Overfits",
      "**Weak base learner is too complex:** Overfits early"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Boosting amplifies noise. Use regularization, subsampling, and early stopping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the difference between bagging and pasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bagging:** Sampling WITH replacement → some samples repeated, some missing",
      "**Pasting:** Sampling WITHOUT replacement → each sample appears at most once"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bagging: more diversity, each model sees ~63.2% unique samples. Pasting: less diversity but no sample repetition."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
