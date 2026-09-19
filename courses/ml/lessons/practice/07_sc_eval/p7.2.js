/* ============================================================================
   PRACTICE P7.2 — Model Evaluation and Tuning · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/07_Model_Evaluation_and_Tuning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.2",
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
   "n": "26",
   "q": "What is the difference between holdout, k-fold CV, and leave-one-out CV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Holdout:** Single train/test split (fast, high variance)",
      "**K-fold CV:** K splits, each used as test once (balanced)",
      "**LOOCV:** K=n, each sample is test set once (low bias, high variance, slow)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K=5 or 10 is standard. LOOCV for very small datasets. Holdout only for very large datasets or quick checks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the difference between cross-validation score and test set score?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** CV score estimates generalization on seen data distribution. Test set (held out completely) validates the final model on truly unseen data."
    },
    {
     "t": "p",
     "text": "**Explanation:** CV for model selection/hyperparameter tuning. Final test set used ONCE for reporting. Using test set for decisions causes optimistic bias."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is statistical significance in model comparison?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Whether the performance difference between two models is real or due to random chance. Use paired t-test on CV fold scores or McNemar's test on predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Model A: 0.85 accuracy, Model B: 0.84. Is A significantly better? If p > 0.05 on paired test, difference may be random noise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you create a meaningful baseline for model evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classification:** Majority class predictor, random predictor matching class distribution",
      "**Regression:** Mean/median predictor",
      "**Time series:** Naive forecast (last value), seasonal naive",
      "**Always:** Simple model (logistic regression, decision stump)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model must beat baseline to add value. A complex model with 80% accuracy is useless if baseline is 79%."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the learning curve and what does it tell you?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Plot model performance vs training set size."
    },
    {
     "t": "ul",
     "items": [
      "**High bias:** Both train and val scores are low and converge → underfitting, more data won't help",
      "**High variance:** Train high, val low, gap remains → overfitting, more data may help"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Tells you if more data will help and if model has capacity issues. Essential diagnostic tool."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the validation curve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Plot model performance vs hyperparameter value (e.g., tree depth, regularization strength)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Shows how a specific hyperparameter affects bias-variance trade-off. Where training and validation scores diverge → overfitting begins."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How do you evaluate a model on time series data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use time-based splits, never random splits:"
    },
    {
     "t": "ol",
     "items": [
      "**Rolling/expanding window:** Train on past, test on future",
      "**Walk-forward validation:** Sequentially move the train/test boundary",
      "**Time Series Split** in sklearn"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random CV leaks future information into training. Performance must be measured on future data only."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the Matthews Correlation Coefficient (MCC)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** MCC = (TP×TN - FP×FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))"
    },
    {
     "t": "ul",
     "items": [
      "Range: [-1, 1]. 1 = perfect, 0 = random, -1 = inverse"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Balanced measure using all four confusion matrix cells. Works well even with imbalanced classes. Considered the most informative single number for binary classification quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "When would you use adjusted R² instead of R²?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When comparing models with different numbers of features. Adjusted R² penalizes for additional features that don't improve the model."
    },
    {
     "t": "p",
     "text": "**Formula:** Adj R² = 1 - (1-R²)(n-1)/(n-k-1) where k = number of features."
    },
    {
     "t": "p",
     "text": "**Explanation:** R² always increases with more features (even noise). Adjusted R² can decrease, revealing overfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between in-sample and out-of-sample evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**In-sample:** Evaluate on training data — always optimistic",
      "**Out-of-sample:** Evaluate on unseen data — realistic estimate"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** In-sample error is always ≤ out-of-sample error. The gap indicates overfitting. Never report in-sample metrics as model performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "How would you compare performance of multiple models fairly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Same data splits for all models (same CV folds)",
      "Statistical tests for significance (Friedman + Nemenyi post-hoc)",
      "Report confidence intervals, not just point estimates",
      "Same preprocessing pipeline",
      "Account for compute time and complexity"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fair comparison requires controlled conditions. Use `cross_val_score` with same `cv` object for all models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the difference between discrimination and calibration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Discrimination:** Can the model separate positive from negative examples? (AUC)",
      "**Calibration:** Do predicted probabilities match true frequencies? (Brier score, reliability diagram)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** A model can discriminate well but be poorly calibrated (ranking correct, probabilities wrong). Both matter for different use cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the Kolmogorov-Smirnov (KS) statistic in model evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maximum separation between cumulative distribution of positive and negative class predictions. KS = max|TPR - FPR| at all thresholds."
    },
    {
     "t": "p",
     "text": "**Explanation:** Widely used in credit scoring. Higher KS = better discrimination. KS > 0.4 is considered good. Related to ROC — it's the maximum vertical distance from diagonal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you evaluate a clustering model when there are no ground truth labels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Silhouette score:** [-1, 1], higher = better separated clusters",
      "**Calinski-Harabasz:** Higher = better (between/within variance ratio)",
      "**Davies-Bouldin:** Lower = better (cluster similarity ratio)",
      "**Stability:** Consistency across runs and subsamples"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Internal validation metrics. No single metric is definitive. Combine with domain knowledge."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the concept of statistical power in A/B testing for models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Probability of correctly detecting a true difference between models. Power = 1 - β (β = Type II error probability)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Low power → might conclude models are equivalent when they're not. Increase power: larger test set, bigger effect size, lower variance. Aim for power ≥ 0.8."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How would you evaluate a generative model (e.g., text generation)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Automated:** BLEU, ROUGE, perplexity, BERTScore",
      "**Human:** Fluency, coherence, relevance ratings",
      "**Task-specific:** Downstream task performance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Automated metrics are imperfect proxies. Human evaluation is gold standard but expensive and subjective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between online and offline evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** Evaluate on historical data before deployment",
      "**Online:** Evaluate on live traffic after deployment (A/B testing, canary deployment)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Offline is necessary but insufficient. Online captures real-world behavior, distribution shifts, and user interactions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is a coverage metric and when is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fraction of inputs for which the model makes a prediction (vs abstaining/deferring)."
    },
    {
     "t": "p",
     "text": "**Explanation:** A model with 99% precision but 10% coverage is useless in practice. Trade-off: higher confidence threshold → better precision but lower coverage. Report precision@coverage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you evaluate fairness of a model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Demographic parity:** Equal positive prediction rate across groups",
      "**Equalized odds:** Equal TPR and FPR across groups",
      "**Calibration:** Equal precision across groups",
      "**Individual fairness:** Similar individuals get similar predictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fairness metrics can conflict — impossible to satisfy all simultaneously (impossibility theorem). Choose based on context and legal requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the expected calibration error (ECE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mean absolute difference between predicted probability and actual accuracy, weighted by bin size."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ECE = Σ (|bin_size/n| × |accuracy_in_bin - avg_predicted_prob_in_bin|)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Divide predictions into probability bins (e.g., 0-0.1, 0.1-0.2, ...). Compare predicted vs actual rate per bin. Lower ECE = better calibrated."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the role of confidence intervals in model evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Quantify uncertainty in metric estimates. \"Accuracy = 85% ± 3%\" is more informative than \"Accuracy = 85%.\""
    },
    {
     "t": "p",
     "text": "**Calculation:** Bootstrap: resample predictions, compute metric each time, take percentile interval."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without CI, you can't know if 85% vs 83% is real or noise. Essential for reliable model comparison."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the Gini coefficient in model evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gini = 2 × AUC - 1. Maps AUC from [0.5, 1] to [0, 1]. Common in credit scoring."
    },
    {
     "t": "p",
     "text": "**Explanation:** Gini = 0: random model. Gini = 1: perfect model. Gini = 0.6 ≈ AUC = 0.8. Same information as AUC, different scale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How do you evaluate model robustness?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Test on different data distributions (domain shift)",
      "Adversarial examples",
      "Feature perturbation sensitivity",
      "Performance across subgroups/slices",
      "Test under missing data / noisy inputs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** A model performing 90% on clean data but 50% under slight noise is not robust. Stress test before deployment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is slice-based evaluation and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Evaluating model performance on specific subgroups of data (slices) rather than overall aggregate."
    },
    {
     "t": "p",
     "text": "**Example:** Model accuracy = 90% overall but 60% for users age > 65."
    },
    {
     "t": "p",
     "text": "**Explanation:** Aggregate metrics hide poor performance on subgroups. Critical for fairness, safety, and understanding model limitations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How would you create a comprehensive model evaluation report?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Dataset statistics and splits used",
      "Baseline comparison",
      "Primary metric + confidence intervals",
      "Multiple complementary metrics (precision, recall, F1, AUC)",
      "Confusion matrix",
      "Calibration curve",
      "Learning/validation curves",
      "Slice-based performance",
      "Feature importance/SHAP",
      "Error analysis (what does the model get wrong?)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Go beyond a single number. Report tells the full story of model capabilities and limitations."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
