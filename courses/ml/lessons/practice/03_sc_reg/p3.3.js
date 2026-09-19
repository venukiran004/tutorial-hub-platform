/* ============================================================================
   PRACTICE P3.3 — Regression and Classification · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/03_Regression.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.3",
 "lede": "**25 scenarios** from Regression and Classification. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the fundamental difference between linear regression and logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Linear regression:** Predicts continuous values (regression)",
      "**Logistic regression:** Predicts probabilities for classification using sigmoid function"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Despite its name, logistic regression is a classification algorithm. Output: P(y=1|X) = σ(θᵀX) = 1/(1+e^(-θᵀX))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What does the sigmoid function do and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maps any real number to (0,1) range:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "σ(z) = 1 / (1 + e^(-z))"
    },
    {
     "t": "ul",
     "items": [
      "σ(0) = 0.5",
      "σ(→∞) → 1",
      "σ(→-∞) → 0"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Converts linear combination of features into probability. Decision boundary at 0.5 by default."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Why can't we use MSE loss for logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** MSE with sigmoid creates a non-convex loss landscape with many local minima → gradient descent may not find global optimum."
    },
    {
     "t": "p",
     "text": "**Explanation:** Binary cross-entropy (log loss) is convex for logistic regression → guaranteed convergence to global minimum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the log loss (binary cross-entropy) formula?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = -1/m * Σ[y_i * log(ŷ_i) + (1-y_i) * log(1-ŷ_i)]"
    },
    {
     "t": "p",
     "text": "**Explanation:** When y=1: penalizes low ŷ (log(ŷ) → -∞). When y=0: penalizes high ŷ (log(1-ŷ) → -∞). Perfect prediction = 0 loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Your logistic regression outputs probability 0.7. What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The model estimates 70% probability that this sample belongs to class 1."
    },
    {
     "t": "p",
     "text": "**With default threshold 0.5:** Predicted class = 1"
    },
    {
     "t": "p",
     "text": "**Explanation:** Probability is model's confidence. Threshold can be adjusted based on business needs for precision/recall tradeoff."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "When would you change the classification threshold from 0.5?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Lower threshold (e.g., 0.3):** When false negatives are costly (medical diagnosis) → more sensitive",
      "**Higher threshold (e.g., 0.7):** When false positives are costly (spam filtering) → more specific"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Threshold directly controls precision-recall tradeoff. Use ROC curve or PR curve to select optimal threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the confusion matrix and what does each cell represent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "                Predicted\n              Pos    Neg\nActual Pos  | TP  |  FN |\nActual Neg  | FP  |  TN |"
    },
    {
     "t": "ul",
     "items": [
      "**TP:** Correctly predicted positive",
      "**FP:** Incorrectly predicted positive (Type I error)",
      "**FN:** Missed positive (Type II error)",
      "**TN:** Correctly predicted negative"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Calculate precision and recall from this confusion matrix:",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "TP=80, FP=20, FN=10, TN=890"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision:** TP/(TP+FP) = 80/100 = 0.80",
      "**Recall:** TP/(TP+FN) = 80/90 = 0.89",
      "**F1:** 2*P*R/(P+R) = 2*0.80*0.89/(0.80+0.89) = 0.84"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Precision: \"Of those predicted positive, how many were correct?\" Recall: \"Of actual positives, how many did we find?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Your cancer detection model has 99% accuracy. Is it good?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Not necessarily. If only 1% of patients have cancer, always predicting \"no cancer\" gives 99% accuracy."
    },
    {
     "t": "p",
     "text": "**Explanation:** Accuracy is misleading for imbalanced data. Check precision, recall, F1, AUC-ROC instead. A model that catches no cancers is 99% accurate but useless."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the ROC curve and what does AUC represent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**ROC curve:** Plots True Positive Rate vs. False Positive Rate at various thresholds",
      "**AUC:** Area Under ROC Curve — probability that model ranks a random positive higher than random negative",
      "AUC = 1.0: Perfect | AUC = 0.5: Random | AUC < 0.5: Worse than random"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AUC is threshold-independent, summarizes model's discriminative ability across all thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "When would you prefer Precision-Recall curve over ROC curve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When classes are heavily imbalanced. ROC can look optimistic for imbalanced data because TN dominates FPR."
    },
    {
     "t": "p",
     "text": "**Explanation:** PR curve focuses on positive class performance. More informative when positives are rare (fraud detection, disease diagnosis)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the difference between micro, macro, and weighted F1 for multi-class?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Micro:** Calculate F1 from total TP, FP, FN across all classes",
      "**Macro:** Calculate F1 per class, then average (treats all classes equally)",
      "**Weighted:** F1 per class, weighted by class frequency"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Macro penalizes bad performance on rare classes. Micro favors majority class. Weighted balances both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How does logistic regression handle multi-class classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**One-vs-Rest (OvR):** Train K binary classifiers, each class vs. all others",
      "**One-vs-One (OvO):** Train K(K-1)/2 classifiers, each pair",
      "**Softmax (Multinomial):** Single model with softmax output layer"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Softmax ensures probabilities sum to 1. OvR is default in sklearn. OvO preferred for SVM."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the softmax function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(class_j) = e^(z_j) / Σ_k e^(z_k)"
    },
    {
     "t": "p",
     "text": "Converts K raw scores into K probabilities that sum to 1."
    },
    {
     "t": "p",
     "text": "**Explanation:** Generalization of sigmoid to multi-class. Each class gets a probability. Largest probability → predicted class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the cost of misclassification in this scenario?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Fraud detection: \n- Predicting fraud when not fraud (FP) → customer inconvenience\n- Missing fraud when it is fraud (FN) → $10,000 loss"
    },
    {
     "t": "p",
     "text": "**Answer:** FN is much more costly than FP. Use cost-sensitive learning:"
    },
    {
     "t": "ul",
     "items": [
      "Assign higher weight to minority class (fraud)",
      "Lower classification threshold to catch more fraud",
      "Optimize recall over precision"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Business cost determines metric priority. Here: maximize recall at acceptable precision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What are class weights and how do they help?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression(class_weight='balanced')"
    },
    {
     "t": "p",
     "text": "**Answer:** Adjusts loss function to weight minority class errors more heavily."
    },
    {
     "t": "p",
     "text": "**balanced:** Weight = n_samples / (n_classes × n_samples_per_class)"
    },
    {
     "t": "p",
     "text": "**Explanation:** For 100 fraud + 10,000 legitimate: fraud weight = 10,100/(2×100) = 50.5. Effectively oversamples minority in loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the odds ratio in logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For coefficient β: odds_ratio = e^β. Represents multiplicative change in odds per unit increase in feature."
    },
    {
     "t": "p",
     "text": "**Example:** β = 0.5 → odds_ratio = 1.65 → 65% increase in odds for each unit increase in feature."
    },
    {
     "t": "p",
     "text": "**Explanation:** Odds = P/(1-P). Odds ratio > 1: feature increases probability. < 1: decreases probability. = 1: no effect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is the decision boundary of logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The hyperplane where P(y=1) = 0.5, i.e., θᵀX = 0. Points on one side → class 1, other side → class 0."
    },
    {
     "t": "p",
     "text": "**Explanation:** Logistic regression creates a linear decision boundary. Can model non-linear boundaries with polynomial features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What regularization does `LogisticRegression(C=0.01)` apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** C = 1/λ, so C=0.01 means λ=100 → very strong regularization. Coefficients will be very small."
    },
    {
     "t": "p",
     "text": "**Explanation:** Smaller C → stronger regularization → simpler model. C=1 is default. Use cross-validation to tune C."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the difference between Type I and Type II errors in medical testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Type I (FP):** Healthy person told they have disease → unnecessary anxiety/treatment",
      "**Type II (FN):** Sick person told they're healthy → missed diagnosis, potentially fatal"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** In medicine, Type II is usually more costly → optimize for recall (sensitivity). Screening tests prioritize recall."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How would you evaluate a multi-label classification problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hamming loss:** Fraction of wrong labels per sample",
      "**Subset accuracy:** Fraction of samples with all labels exactly correct",
      "**Per-label F1:** F1 for each label independently",
      "**Sample-average F1:** Average F1 across samples"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-label: each sample can have multiple true labels. Different from multi-class (exactly one label)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is calibration and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A model is well-calibrated if P(y=1|predicted_prob=0.8) ≈ 80% of the time."
    },
    {
     "t": "p",
     "text": "**Matters for:** Risk assessment, medical decisions, insurance pricing — decisions based on probability values, not just rankings."
    },
    {
     "t": "p",
     "text": "**Check:** Calibration curve (reliability diagram). Fix: Platt scaling, isotonic regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is Platt scaling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Post-processing calibration using a sigmoid function fitted on validation predictions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.calibration import CalibratedClassifierCV\ncalibrated = CalibratedClassifierCV(model, method='sigmoid')\ncalibrated.fit(X_val, y_val)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Trains a logistic regression on model's output scores → maps to calibrated probabilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the Matthews Correlation Coefficient (MCC)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "MCC = (TP×TN - FP×FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))"
    },
    {
     "t": "ul",
     "items": [
      "Range: [-1, 1], where 1 = perfect, 0 = random, -1 = inverse"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Balanced metric that works well for imbalanced datasets. Only gives high score when model performs well on ALL cells of confusion matrix."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "How do you handle ordinal classification (e.g., rating 1-5)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Ordinal regression:** Preserves ordering (cumulative logistic model)",
      "**Treat as regression:** Predict continuous then round",
      "**Multi-class classification:** Ignores ordering",
      "**Binary decomposition:** 1vs2+, 1+2vs3+, etc."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard classification ignores that 1→5 error is worse than 1→2. Ordinal approaches preserve this structure."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
