/* ============================================================================
   PRACTICE P7.1 — Model Evaluation and Tuning · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/07_Model_Evaluation_and_Tuning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.1",
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
   "n": "1",
   "q": "Your classification model has 99% accuracy on a fraud detection task. Should you celebrate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — if only 1% of transactions are fraud, a model predicting \"not fraud\" for everything gets 99% accuracy."
    },
    {
     "t": "p",
     "text": "**Explanation:** Accuracy is misleading with class imbalance. Use precision, recall, F1-score, and PR-AUC instead. Ask: \"What's the recall for the fraud class?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between precision and recall?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision:** Of all predicted positives, how many are truly positive? TP / (TP + FP)",
      "**Recall (Sensitivity):** Of all actual positives, how many were correctly identified? TP / (TP + FN)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Precision = quality of positive predictions. Recall = coverage of actual positives. Trade-off: increasing threshold → higher precision, lower recall."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "When would you optimize for precision vs recall?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision priority:** Spam filter (false positive = important email in spam), content moderation",
      "**Recall priority:** Disease screening (false negative = missed cancer), fraud detection"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Cost of false positive vs false negative drives the choice. In medical screening, missing a disease (FN) is worse than unnecessary follow-up (FP)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the F1 score and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Harmonic mean of precision and recall: F1 = 2 × (P × R) / (P + R). Ranges [0, 1]."
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful when you want to balance precision and recall, especially with class imbalance. F1 = 0 if either P or R is 0. Harmonic mean penalizes extreme imbalance between P and R."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the F-beta score and how does beta affect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** F_β = (1 + β²) × (P × R) / (β² × P + R)"
    },
    {
     "t": "ul",
     "items": [
      "β = 1: Equal weight (F1)",
      "β = 2: Weights recall 2× more than precision (F2)",
      "β = 0.5: Weights precision 2× more than recall (F0.5)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Choose β based on business cost of FP vs FN. Cancer detection: β=2 (recall matters more). Spam: β=0.5 (precision matters more)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What does the ROC curve plot and what does AUC represent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** ROC plots True Positive Rate (recall) vs False Positive Rate at all classification thresholds. AUC = area under this curve."
    },
    {
     "t": "ul",
     "items": [
      "AUC = 1.0: Perfect classifier",
      "AUC = 0.5: Random classifier",
      "AUC < 0.5: Worse than random"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AUC measures discriminative ability across all thresholds. Threshold-independent metric. Good for comparing models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "When would you prefer PR-AUC (Precision-Recall AUC) over ROC-AUC?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When classes are heavily imbalanced. ROC-AUC can be misleadingly high with imbalanced data because FPR denominator (TN+FP) is large."
    },
    {
     "t": "p",
     "text": "**Explanation:** With 1% positive class: ROC-AUC may show 0.95 while model catches only 30% of positives. PR-AUC directly reflects performance on the minority class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the confusion matrix and how do you interpret it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "                 Predicted\n              Neg    Pos\nActual Neg   TN      FP\nActual Pos   FN      TP"
    },
    {
     "t": "ul",
     "items": [
      "**TN:** Correctly predicted negative",
      "**FP:** Type I error (false alarm)",
      "**FN:** Type II error (missed positive)",
      "**TP:** Correctly predicted positive"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation for all classification metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is specificity and how does it relate to sensitivity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Sensitivity (Recall):** TP / (TP + FN) — true positive rate",
      "**Specificity:** TN / (TN + FP) — true negative rate"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ROC curve: sensitivity vs (1 - specificity). Both are needed for full picture. Medical tests need both high sensitivity AND high specificity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you choose the optimal classification threshold?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Youden's J statistic:** Maximize (sensitivity + specificity - 1) from ROC",
      "**Business cost:** Minimize cost of FP × cost_FP + FN × cost_FN",
      "**Precision-Recall trade-off:** Find acceptable precision at required recall",
      "**F1 maximization:** Threshold that maximizes F1 score"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Default 0.5 is arbitrary. Optimal threshold depends on class distribution and error costs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is log loss (binary cross-entropy) and why is it preferred over accuracy for probabilistic classifiers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Log loss measures the quality of predicted probabilities: -[y×log(p) + (1-y)×log(1-p)]."
    },
    {
     "t": "p",
     "text": "**Explanation:** Penalizes confident wrong predictions heavily. A prediction of 0.99 for a negative example incurs huge loss. Accuracy ignores prediction confidence. Log loss encourages well-calibrated probabilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between macro, micro, and weighted averaging for multi-class metrics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Macro:** Average metric across classes equally (each class has equal weight)",
      "**Micro:** Compute metric globally (total TP, FP, FN) — dominated by large classes",
      "**Weighted:** Average weighted by class support (sample count)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Imbalanced classes: macro treats all classes equally (good for minority class importance), micro/weighted reflect data distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Your model has high training accuracy but low test accuracy. What metric confirms overfitting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The gap between training and test metrics (any metric). Also check learning curves: if training error decreases but validation error increases or plateaus."
    },
    {
     "t": "p",
     "text": "**Explanation:** Overfitting indicators: large train-test gap, high variance in CV scores, model complexity exceeding data complexity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is Cohen's Kappa and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agreement measure adjusting for chance: κ = (accuracy - expected_accuracy) / (1 - expected_accuracy)."
    },
    {
     "t": "ul",
     "items": [
      "κ = 1: Perfect agreement",
      "κ = 0: Agreement by chance",
      "κ < 0: Worse than chance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful for imbalanced classes and inter-annotator agreement. More informative than accuracy for skewed distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What are common regression metrics and when to use each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MSE:** Penalizes large errors more (squared), differentiable",
      "**RMSE:** Same scale as target, interpretable",
      "**MAE:** Robust to outliers, median-centric",
      "**MAPE:** Percentage-based, scale-independent",
      "**R²:** Proportion of variance explained (0 to 1, can be negative)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE/RMSE when large errors are very bad. MAE when errors are equally important. MAPE for relative errors. R² for explained variance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What does a negative R² value mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The model is worse than simply predicting the mean of the target for every sample."
    },
    {
     "t": "p",
     "text": "**Explanation:** R² = 1 - (SS_res / SS_tot). If residuals > total variance, R² < 0. Indicates a useless model. Common with wrong model choice or severe overfitting on different data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between MSE and MAE in terms of outlier sensitivity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MSE:** Squares errors → outlier error of 100 contributes 10,000. Very sensitive.",
      "**MAE:** Absolute errors → outlier error of 100 contributes 100. Robust."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE optimizes for mean (sensitive to outliers). MAE optimizes for median (robust). If outliers are important to capture, use MSE. If they're noise, use MAE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is Huber loss and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combines MSE (for small errors) and MAE (for large errors):"
    },
    {
     "t": "ul",
     "items": [
      "|error| ≤ δ: 0.5 × error²",
      "|error| > δ: δ × (|error| - 0.5δ)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Robust to outliers like MAE but smooth and differentiable like MSE near zero. δ parameter controls transition point. Good for regression with occasional outliers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you evaluate a multi-label classification model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Subset accuracy:** Exact match of all labels (strict)",
      "**Hamming loss:** Fraction of wrong labels",
      "**Per-label metrics:** Precision, recall, F1 per label",
      "**Macro/micro averaged:** Across all labels"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Subset accuracy is very strict — one wrong label = zero score. Hamming loss is more forgiving. Report per-label metrics for detailed analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is calibration and how do you measure it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Whether predicted probability = actual frequency. A model predicting 70% should be correct ~70% of the time."
    },
    {
     "t": "p",
     "text": "**Measurement:**"
    },
    {
     "t": "ol",
     "items": [
      "Reliability diagram (calibration curve)",
      "Brier score",
      "Expected Calibration Error (ECE)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Many models are poorly calibrated (SVMs, deep learning). Use Platt scaling or isotonic regression for post-hoc calibration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the Brier score?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mean squared difference between predicted probability and actual outcome: BS = mean((p - y)²)."
    },
    {
     "t": "ul",
     "items": [
      "BS = 0: Perfect",
      "BS = 0.25: No skill (predicting 0.5 always with balanced data)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combined measure of calibration and discrimination. Lower is better. Only for binary classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How would you evaluate a ranking model (e.g., search results)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**NDCG (Normalized Discounted Cumulative Gain):** Considers position and relevance level",
      "**MAP (Mean Average Precision):** Average precision at each relevant result",
      "**MRR (Mean Reciprocal Rank):** Position of first relevant result",
      "**Precision@K / Recall@K:** Metrics at cutoff K"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher-ranked correct results should contribute more. NDCG handles graded relevance. MAP for binary relevance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the lift curve and cumulative gains chart?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Lift:** How much better the model is vs random at each decile. Lift = (TP rate at decile) / (baseline rate)",
      "**Cumulative gains:** % of positives captured as you go through ranked predictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lift = 3 at top decile means model finds 3× more positives than random in top 10%. Common in marketing (who to target first)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you evaluate a model with custom business costs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Define cost matrix:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FP cost = $10 (unnecessary investigation)\nFN cost = $1000 (missed fraud)\nTotal cost = FP × 10 + FN × 1000"
    },
    {
     "t": "p",
     "text": "Optimize threshold to minimize total cost."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard metrics don't capture business impact. Cost-sensitive evaluation aligns model optimization with business objectives."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is stratified sampling in model evaluation and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ensures each fold/split maintains the same class distribution as the full dataset."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without stratification, some folds may have very few minority class samples → unreliable metrics. Use `StratifiedKFold` in sklearn for classification CV."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
