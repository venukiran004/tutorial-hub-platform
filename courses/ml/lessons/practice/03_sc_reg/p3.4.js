/* ============================================================================
   PRACTICE P3.4 — Regression and Classification · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/03_Regression.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.4",
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
   "n": "76",
   "q": "What is the log-likelihood function in logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "LL = Σ[y_i * log(ŷ_i) + (1-y_i) * log(1-ŷ_i)]"
    },
    {
     "t": "p",
     "text": "We maximize log-likelihood (equivalently minimize negative log-likelihood = log loss)."
    },
    {
     "t": "p",
     "text": "**Explanation:** MLE (Maximum Likelihood Estimation) framework: find parameters that make observed data most probable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is a likelihood ratio test in logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Compares two nested models by their log-likelihoods:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "LR = -2 * [LL(reduced) - LL(full)]"
    },
    {
     "t": "p",
     "text": "Follows chi-squared distribution with df = difference in parameters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Tests if adding features significantly improves model fit. Like F-test for linear regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "Your logistic regression achieves AUC=0.95. Can you trust it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Investigate further:"
    },
    {
     "t": "ol",
     "items": [
      "Check for data leakage",
      "Validate on truly unseen data",
      "Check class distribution",
      "Look at learning curves",
      "Verify temporal ordering if time-series"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Suspiciously high AUC often indicates leakage. Also check if model generalizes across subgroups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is stratified sampling and when is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Preserving class proportions in train/test splits."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import train_test_split\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, stratify=y, random_state=42)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for imbalanced data — random split might put all minority samples in one set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the sigmoid function's derivative and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "σ'(z) = σ(z) * (1 - σ(z))"
    },
    {
     "t": "p",
     "text": "Maximum value = 0.25 at z=0."
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradient for backpropagation. Max gradient of 0.25 means gradients shrink → vanishing gradient problem in deep networks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you interpret the coefficients of a logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a unit increase in feature x_j (others constant):"
    },
    {
     "t": "ul",
     "items": [
      "Log-odds increase by β_j",
      "Odds multiply by e^(β_j)",
      "Probability change depends on current probability (not constant)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike linear regression, probability change is non-linear. At P=0.5, effect is largest."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is Cohen's Kappa and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "κ = (P_observed - P_expected) / (1 - P_expected)"
    },
    {
     "t": "p",
     "text": "Agreement beyond chance. Range: -1 to 1."
    },
    {
     "t": "ul",
     "items": [
      "κ > 0.8: Almost perfect",
      "κ 0.6-0.8: Substantial",
      "κ < 0.2: Slight"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Used for inter-annotator agreement and imbalanced classification. Corrects for chance agreement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the difference between hard and soft classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard:** Output is class label (0 or 1)",
      "**Soft:** Output is probability per class ([0.3, 0.7])"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft classification more informative — preserves confidence. Needed for probability-based decisions, calibration, and ensembling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "In a multi-class problem with 5 classes, how many binary classifiers does OvR need? OvO?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**OvR:** 5 classifiers (one per class)",
      "**OvO:** 5×4/2 = 10 classifiers (one per pair)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** OvR: faster, each classifier uses all data. OvO: more classifiers but each uses smaller subset."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is label encoding vs one-hot encoding for the target variable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classification target:** Label encoding is fine (0, 1, 2, ...)",
      "**Features:** One-hot encoding for nominal categories"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The target variable is inherently categorical in classification. Label encoding is standard for targets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the purpose of the `predict_proba()` method?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "model = LogisticRegression()\nmodel.fit(X_train, y_train)\nproba = model.predict_proba(X_test)\n# proba.shape = (n_samples, n_classes)"
    },
    {
     "t": "p",
     "text": "**Answer:** Returns probability for each class instead of hard label. Enables custom thresholding, probability-based ranking, and calibration."
    },
    {
     "t": "p",
     "text": "**Explanation:** predict() uses default threshold (argmax of probabilities). predict_proba() gives full probability distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "How do you draw a classification report?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import classification_report\nprint(classification_report(y_true, y_pred))"
    },
    {
     "t": "p",
     "text": "**Answer:** Shows per-class precision, recall, F1-score, and support:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "              precision    recall  f1-score   support\n           0       0.90      0.95      0.92       100\n           1       0.85      0.75      0.80        50\n    accuracy                           0.88       150\n   macro avg       0.88      0.85      0.86       150\nweighted avg       0.88      0.88      0.88       150"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the difference between balanced accuracy and regular accuracy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Accuracy:** (TP+TN) / total",
      "**Balanced accuracy:** Average recall per class = (TPR + TNR) / 2"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For imbalanced data (95% negative), accuracy = 95% just by predicting all negative. Balanced accuracy would be 50%."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is focal loss and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FL = -α_t * (1 - p_t)^γ * log(p_t)"
    },
    {
     "t": "p",
     "text": "Down-weights easy examples, focuses on hard ones."
    },
    {
     "t": "p",
     "text": "**Explanation:** Developed for object detection with extreme class imbalance. γ=2 is common. Reduces contribution of well-classified examples to loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the maximum margin classifier concept in logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Logistic regression doesn't maximize margin directly (unlike SVM). It maximizes likelihood."
    },
    {
     "t": "p",
     "text": "**With strong regularization:** Logistic regression's solution approaches maximum margin solution."
    },
    {
     "t": "p",
     "text": "**Explanation:** SVM explicitly maximizes margin. LR with L2 regularization implicitly encourages margin but optimizes probability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "How do you handle large-scale logistic regression (millions of samples)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "SGD or mini-batch optimization",
      "Online learning (partial_fit)",
      "Sparse data format (CSR matrix)",
      "Feature hashing",
      "Use `SGDClassifier(loss='log_loss')` in sklearn"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Full-batch methods don't scale. SGD processes one sample at a time with constant memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the difference between classification and ranking tasks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classification:** Assign correct class labels",
      "**Ranking:** Order items by relevance/probability (relative ranking matters, not absolute values)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AUC measures ranking quality. Calibration measures classification quality. Same model, different evaluation criteria."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "Your model achieves 95% precision and 30% recall. What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**95% precision:** When model says positive, it's correct 95% of the time (few false positives)",
      "**30% recall:** Model finds only 30% of actual positives (misses 70%)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Very conservative model — only predicts positive when very confident. Lower threshold to improve recall at cost of precision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the precision-recall tradeoff?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Improving one typically worsens the other:"
    },
    {
     "t": "ul",
     "items": [
      "**Lower threshold:** More positives predicted → higher recall, lower precision",
      "**Higher threshold:** Fewer positives predicted → higher precision, lower recall"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** F1-score balances both. Choose emphasis based on business cost of FP vs FN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is a learning curve and what does it tell you?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Plots training and validation performance vs. training set size."
    },
    {
     "t": "ul",
     "items": [
      "**Gap persists at max data:** Overfitting (reduce complexity)",
      "**Both plateau low:** Underfitting (increase complexity)",
      "**Both converge high:** Good fit"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Helps diagnose if more data would help. High bias → more data won't help. High variance → more data helps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the difference between `solver='lbfgs'` and `solver='saga'` in LogisticRegression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**lbfgs:** Quasi-Newton method, good for small/medium datasets, supports L2 and multinomial",
      "**saga:** Stochastic average gradient, good for large datasets, supports L1, L2, and elastic net"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** saga scales better but may need more iterations. lbfgs is default and works well for most cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is cross-entropy loss for multi-class classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = -Σ_j y_j * log(ŷ_j)"
    },
    {
     "t": "p",
     "text": "Where y is one-hot encoded true label, ŷ is predicted probability."
    },
    {
     "t": "p",
     "text": "**Explanation:** For 3 classes, true=[0,1,0], pred=[0.1, 0.8, 0.1]: L = -log(0.8) = 0.22. Penalizes low probability for true class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the difference between classification accuracy and top-k accuracy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Accuracy:** Correct if predicted class = true class",
      "**Top-k accuracy:** Correct if true class is among top-k predicted classes"
     ]
    },
    {
     "t": "p",
     "text": "**Example:** ImageNet uses top-5 accuracy (1000 classes). Useful when many similar classes exist."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the effect of regularization on logistic regression coefficients?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**No regularization:** Coefficients can be arbitrarily large, especially with separable data (coefficients → infinity)",
      "**L2:** Shrinks all coefficients proportionally",
      "**L1:** Shrinks some to exactly zero (sparse solution)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** With perfectly separable data, unregularized LR diverges. Regularization ensures finite solution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "When would logistic regression outperform a neural network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Small dataset (< few thousand samples)",
      "Linear decision boundary is sufficient",
      "Need interpretable model",
      "Limited compute resources",
      "When features are well-engineered"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple models with less data often beat complex models. Logistic regression: no hyperparameter tuning maze, fast training, clear interpretation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
