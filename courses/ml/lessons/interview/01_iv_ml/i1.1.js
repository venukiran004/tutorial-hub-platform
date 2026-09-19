/* ============================================================================
   INTERVIEW I1.1 — Basics & Fundamentals
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
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
   "text": "Basics & Fundamentals",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the difference between supervised, unsupervised, and reinforcement learning?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "Supervised",
      "Unsupervised",
      "Reinforcement"
     ],
     "rows": [
      [
       "Input",
       "\\((x_i, y_i)\\) pairs",
       "\\(x_i\\) only",
       "State \\(s_t\\), reward \\(r_t\\)"
      ],
      [
       "Goal",
       "Learn \\(f: x\\to y\\)",
       "Discover structure",
       "Maximise \\(\\sum_t\\gamma^t r_t\\)"
      ],
      [
       "Output",
       "Predictions",
       "Clusters, embeddings",
       "Policy \\(\\pi(a|s)\\)"
      ],
      [
       "Examples",
       "Regression, classification",
       "Clustering, PCA, VAE",
       "Q-learning, PPO"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the bias-variance tradeoff? Derive the decomposition.",
   "body": [
    {
     "t": "p",
     "text": "For any estimator \\(\\hat{f}\\), the expected MSE at point \\(x\\) decomposes as:"
    },
    {
     "t": "math",
     "tex": "E[(y-\\hat{f}(x))^2] = \\underbrace{(E[\\hat{f}(x)] - f(x))^2}_{\\text{Bias}^2} + \\underbrace{E[(\\hat{f}(x)-E[\\hat{f}(x)])^2]}_{\\text{Variance}} + \\underbrace{\\sigma_\\epsilon^2}_{\\text{Irreducible error}}"
    },
    {
     "t": "p",
     "text": "**Derivation sketch:** Let \\(\\mu = E[\\hat{f}(x)]\\), \\(f =\\) true function, noise \\(\\epsilon\\sim(0,\\sigma^2)\\):"
    },
    {
     "t": "math",
     "tex": "E[(y-\\hat{f})^2] = E[(f+\\epsilon-\\hat{f})^2] = E[((f-\\mu)+(\\mu-\\hat{f})+\\epsilon)^2]"
    },
    {
     "t": "p",
     "text": "Cross terms cancel (by independence of noise and \\(\\hat{f}\\)):"
    },
    {
     "t": "math",
     "tex": "= (f-\\mu)^2 + E[(\\hat{f}-\\mu)^2] + \\sigma^2 = \\text{Bias}^2 + \\text{Variance} + \\sigma^2"
    },
    {
     "t": "p",
     "text": "**Implications:**"
    },
    {
     "t": "ul",
     "items": [
      "High bias (underfitting): \\(k\\) too small in KNN, tree depth too shallow",
      "High variance (overfitting): \\(k=1\\) in KNN, unlimited depth in trees",
      "Irreducible error: noise in the labels — cannot be reduced by any model"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is overfitting and how do you prevent it?",
   "body": [
    {
     "t": "p",
     "text": "Formally: model has low training error \\(\\hat{\\epsilon}_{train}\\) but high test error \\(\\hat{\\epsilon}_{test}\\)."
    },
    {
     "t": "p",
     "text": "The **generalisation gap** = \\(\\hat{\\epsilon}_{test} - \\hat{\\epsilon}_{train}\\)."
    },
    {
     "t": "p",
     "text": "By Rademacher complexity, for model class \\(\\mathcal{F}\\) with probability \\(\\geq 1-\\delta\\):"
    },
    {
     "t": "math",
     "tex": "\\epsilon_{test}(f) \\leq \\hat{\\epsilon}_{train}(f) + 2\\mathfrak{R}_n(\\mathcal{F}) + \\sqrt{\\frac{\\log(1/\\delta)}{2n}}"
    },
    {
     "t": "p",
     "text": "Prevention methods:"
    },
    {
     "t": "ul",
     "items": [
      "L1/L2 regularization — constrain \\(||w||\\)",
      "Dropout, weight decay in neural nets",
      "Cross-validation for model selection",
      "Early stopping — implicit regularization",
      "Data augmentation — increase effective \\(n\\)",
      "Ensemble methods — reduce variance"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the difference between a parameter and a hyperparameter?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Parameter:** Learned during training by optimizing a loss function. e.g., \\(\\mathbf{w}\\) in linear regression, attention weights. Not set by the user.",
      "**Hyperparameter:** Governs the learning process / model capacity. Set before training. e.g., \\(\\lambda\\) in regularization, \\(k\\) in KNN, tree depth, learning rate."
     ]
    },
    {
     "t": "p",
     "text": "Hyperparameters cannot be optimized via the same training objective — they are tuned via cross-validation, Bayesian optimization, or random search."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain the curse of dimensionality.",
   "body": [
    {
     "t": "p",
     "text": "In \\(d\\) dimensions, the volume of a hypersphere of radius \\(r\\) is:"
    },
    {
     "t": "math",
     "tex": "V_d(r) = \\frac{\\pi^{d/2}}{\\Gamma(d/2+1)}r^d"
    },
    {
     "t": "p",
     "text": "The fraction of volume of the unit hypercube \\([0,1]^d\\) within distance \\(\\epsilon\\) of a corner:"
    },
    {
     "t": "math",
     "tex": "\\frac{V_d(\\epsilon)}{1} = \\frac{\\pi^{d/2}\\epsilon^d}{\\Gamma(d/2+1)} \\to 0 \\text{ as } d\\to\\infty"
    },
    {
     "t": "p",
     "text": "**Implications:**"
    },
    {
     "t": "ol",
     "items": [
      "Distance concentration: All pairwise distances converge as \\(d\\to\\infty\\)",
      "Data sparsity: \\(n\\) samples needed grows exponentially with \\(d\\)",
      "KNN deteriorates: nearest neighbor is not much closer than farthest",
      "Volume concentration: For uniform data in \\([0,1]^d\\), 95% of data is within \\(\\epsilon\\) of the boundary"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is cross-validation? Derive bias-variance of k-fold estimate.",
   "body": [
    {
     "t": "p",
     "text": "**k-Fold CV procedure:**"
    },
    {
     "t": "ol",
     "items": [
      "Partition data \\(D\\) into \\(k\\) equal folds \\(D_1,\\ldots,D_k\\)",
      "For each fold \\(i\\): train on \\(D\\setminus D_i\\), evaluate on \\(D_i\\)",
      "CV error: \\(\\hat{\\epsilon}_{CV} = \\frac{1}{k}\\sum_{i=1}^k \\hat{\\epsilon}_i\\)"
     ]
    },
    {
     "t": "p",
     "text": "**Bias-variance tradeoff of the CV estimator:**"
    },
    {
     "t": "ul",
     "items": [
      "Small \\(k\\) (e.g., \\(k=2\\)): train on 50% → model smaller → overestimates error (high bias)",
      "Large \\(k\\) (LOOCV, \\(k=n\\)): nearly unbiased but high variance (each model is ~identical)",
      "\\(k=5\\) or \\(k=10\\) recommended as the sweet spot"
     ]
    },
    {
     "t": "p",
     "text": "**Stratified k-fold** preserves class proportions in each fold — critical for imbalanced datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is regularization? Derive L1 and L2 from a Bayesian perspective.",
   "body": [
    {
     "t": "p",
     "text": "**L2 (Ridge) — Gaussian prior view:** Assume \\(w_j \\sim \\mathcal{N}(0, 1/\\lambda)\\) iid. MAP estimate maximises:"
    },
    {
     "t": "math",
     "tex": "\\log P(\\mathbf{y}|\\mathbf{X},\\mathbf{w}) + \\log P(\\mathbf{w}) = -\\frac{n}{2\\sigma^2}||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 - \\frac{\\lambda}{2}||\\mathbf{w}||^2 + \\text{const}"
    },
    {
     "t": "p",
     "text": "→ minimise \\(||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 + \\lambda||\\mathbf{w}||^2\\)"
    },
    {
     "t": "p",
     "text": "**L1 (Lasso) — Laplace prior view:** Assume \\(w_j \\sim \\text{Laplace}(0, 1/\\lambda)\\): \\(P(w_j) \\propto e^{-\\lambda|w_j|}\\). MAP: → minimise \\(||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 + \\lambda||\\mathbf{w}||_1\\)"
    },
    {
     "t": "table",
     "head": [
      "",
      "L2 (Ridge)",
      "L1 (Lasso)"
     ],
     "rows": [
      [
       "Penalty",
       "\\(\\lambda\\sum w_j^2\\)",
       "\\(\\lambda\\sum|w_j|\\)"
      ],
      [
       "Prior",
       "Gaussian",
       "Laplace"
      ],
      [
       "Solution",
       "Shrinks toward 0",
       "Sparsity (exact zeros)"
      ],
      [
       "Closed form",
       "Yes",
       "No (coordinate descent)"
      ],
      [
       "Groups",
       "Splits correlated features",
       "Picks one"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Define precision, recall, F1-score with derivations.",
   "body": [
    {
     "t": "p",
     "text": "Given confusion matrix:"
    },
    {
     "t": "math",
     "tex": "\\text{Precision} = \\frac{TP}{TP+FP}, \\quad \\text{Recall} = \\frac{TP}{TP+FN}"
    },
    {
     "t": "p",
     "text": "**F1 = Harmonic mean** of Precision and Recall:"
    },
    {
     "t": "math",
     "tex": "F_1 = \\frac{2}{\\frac{1}{\\text{Prec}}+\\frac{1}{\\text{Rec}}} = \\frac{2\\cdot P\\cdot R}{P+R}"
    },
    {
     "t": "p",
     "text": "Why harmonic mean? It's the lowest of the two — if either is 0, F1=0. Arithmetic mean would allow a trivially high value from one high component."
    },
    {
     "t": "p",
     "text": "**\\(F_\\beta\\)-score** weights recall \\(\\beta\\) times more than precision:"
    },
    {
     "t": "math",
     "tex": "F_\\beta = (1+\\beta^2)\\frac{P\\cdot R}{\\beta^2\\cdot P+R}"
    },
    {
     "t": "p",
     "text": "\\(\\beta>1\\) → recall more important (medical); \\(\\beta<1\\) → precision more important (spam filter)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the ROC-AUC curve? Derive key properties.",
   "body": [
    {
     "t": "p",
     "text": "**ROC curve** plots: \\(\\text{TPR} = \\frac{TP}{TP+FN}\\) vs \\(\\text{FPR} = \\frac{FP}{FP+TN}\\) for all thresholds \\(\\tau\\in[0,1]\\)."
    },
    {
     "t": "p",
     "text": "**AUC interpretation:** \\(P(\\hat{s}^+ > \\hat{s}^-)\\) where \\(\\hat{s}^+\\) = score for a random positive, \\(\\hat{s}^-\\) = score for a random negative."
    },
    {
     "t": "p",
     "text": "=  Probability the model ranks a random positive above a random negative."
    },
    {
     "t": "p",
     "text": "**PR-AUC** (Precision-Recall AUC): More informative for class-imbalanced problems. ROC-AUC can be inflated by large TN count; PR-AUC is not."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the difference between classification and regression?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "Classification",
      "Regression"
     ],
     "rows": [
      [
       "Output",
       "Discrete label \\(y \\in \\{1,\\ldots,K\\}\\)",
       "Continuous \\(y \\in \\mathbb{R}\\)"
      ],
      [
       "Loss",
       "Cross-entropy, 0-1 loss",
       "MSE, MAE, Huber"
      ],
      [
       "Output layer",
       "Sigmoid/Softmax",
       "Linear (\\(\\hat{y}=w^Tx\\))"
      ],
      [
       "Evaluation",
       "F1, AUC, precision/recall",
       "RMSE, MAE, R²"
      ],
      [
       "Boundary",
       "Decision surface",
       "Regression surface"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the train/validation/test split? Why is data hygiene critical?",
   "body": [
    {
     "t": "p",
     "text": "A clean three-way split prevents data leakage:"
    },
    {
     "t": "ul",
     "items": [
      "**Train (60–70%):** Model learns parameters \\(\\mathbf{w}\\)",
      "**Validation (15–20%):** Tune hyperparameters, select architecture",
      "**Test (15–20%):** Single final evaluation — simulate production"
     ]
    },
    {
     "t": "p",
     "text": "**Contamination sources:** Fitting scalers/encoders on whole dataset, hyperparameter tuning with test set, temporal ordering violation in time-series."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is data leakage and why is it dangerous?",
   "body": [
    {
     "t": "p",
     "text": "Data leakage occurs when the training set contains information unavailable at prediction time, inflating performance:"
    },
    {
     "t": "ol",
     "items": [
      "**Target leakage:** Features derived from the target variable",
      "**Train-test contamination:** Normalization/imputation fitted on full dataset",
      "**Temporal leakage:** Using future signals to predict past events"
     ]
    },
    {
     "t": "p",
     "text": "**Detection:** Suspiciously high validation performance; feature importance of unexpected features; correlation between \"post-event\" features and target."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Bagging vs Boosting — effect on bias and variance.",
   "body": [
    {
     "t": "math",
     "tex": "E[(y-F)^2] = \\text{Bias}^2(F) + \\text{Var}(F) + \\sigma^2"
    },
    {
     "t": "p",
     "text": "**Bagging:** Average of \\(T\\) models. Variance reduces by factor \\(\\approx 1/T\\) (if uncorrelated); Bias unchanged."
    },
    {
     "t": "math",
     "tex": "\\text{Var}(\\bar{F}) = \\frac{\\sigma_F^2}{T} + \\frac{T-1}{T}\\rho\\sigma_F^2 = \\left(\\frac{1-\\rho}{T}+\\rho\\right)\\sigma_F^2"
    },
    {
     "t": "p",
     "text": "**Boosting:** Each step fits residuals — reduces Bias every round at the cost of potentially increasing Variance (sequential fitting → less stable)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is feature importance? Compare MDI, permutation, and SHAP.",
   "body": [
    {
     "t": "p",
     "text": "**MDI (Mean Decrease in Impurity):**"
    },
    {
     "t": "math",
     "tex": "FI^{MDI}(j) = \\frac{1}{T}\\sum_{t}\\sum_{v\\in h_t: \\text{splits on }j} p_v \\Delta G_v"
    },
    {
     "t": "p",
     "text": "Biased toward high-cardinality features; only available for tree models."
    },
    {
     "t": "p",
     "text": "**Permutation Importance:**"
    },
    {
     "t": "math",
     "tex": "FI^{Perm}(j) = \\mathcal{L}(\\mathbf{X}_{\\sigma_j}, y) - \\mathcal{L}(\\mathbf{X}, y)"
    },
    {
     "t": "p",
     "text": "where \\(\\mathbf{X}_{\\sigma_j}\\) has feature \\(j\\) shuffled. Model-agnostic; unbiased; slower."
    },
    {
     "t": "p",
     "text": "**SHAP (Shapley Additive Explanations):**"
    },
    {
     "t": "math",
     "tex": "\\phi_j = \\sum_{S\\subseteq F\\setminus\\{j\\}} \\frac{|S|!(|F|-|S|-1)!}{|F|!}[v(S\\cup j) - v(S)]"
    },
    {
     "t": "p",
     "text": "Satisfies efficiency, symmetry, dummy, linearity axioms — unique fair attribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Generative vs discriminative models — mathematical distinction.",
   "body": [
    {
     "t": "p",
     "text": "**Discriminative:** Model \\(P(y|\\mathbf{x})\\) directly."
    },
    {
     "t": "math",
     "tex": "\\hat{y} = \\arg\\max_y P(y|\\mathbf{x})"
    },
    {
     "t": "p",
     "text": "**Generative:** Model joint \\(P(\\mathbf{x},y) = P(\\mathbf{x}|y)P(y)\\), then apply:"
    },
    {
     "t": "math",
     "tex": "P(y|\\mathbf{x}) = \\frac{P(\\mathbf{x}|y)P(y)}{P(\\mathbf{x})}"
    },
    {
     "t": "p",
     "text": "**Ng & Jordan (2002):** Generative models (Naive Bayes) converge faster with less data but to a higher asymptotic error. Discriminative models (Logistic Regression) reach lower error given enough data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is a confusion matrix? Derive all metrics from it.",
   "body": [
    {
     "t": "math",
     "tex": "\\begin{bmatrix} TN & FP \\\\ FN & TP \\end{bmatrix}"
    },
    {
     "t": "table",
     "head": [
      "Metric",
      "Formula",
      "Notes"
     ],
     "rows": [
      [
       "Accuracy",
       "\\((TP+TN)/N\\)",
       "Misleading if imbalanced"
      ],
      [
       "Precision",
       "\\(TP/(TP+FP)\\)",
       "Low FP"
      ],
      [
       "Recall/TPR",
       "\\(TP/(TP+FN)\\)",
       "Low FN"
      ],
      [
       "Specificity/TNR",
       "\\(TN/(TN+FP)\\)",
       "Low FP rate"
      ],
      [
       "FPR",
       "\\(FP/(FP+TN)\\)",
       "= 1 - Specificity"
      ],
      [
       "F1",
       "\\(2TP/(2TP+FP+FN)\\)",
       "Harmonic mean"
      ],
      [
       "MCC",
       "\\(\\frac{TP\\cdot TN - FP\\cdot FN}{\\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}}\\)",
       "-1 to +1"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Class imbalance — mathematical effects and remedies.",
   "body": [
    {
     "t": "p",
     "text": "With ratio \\(r = n^+/n^-\\ll 1\\), decision boundary of logistic regression shifts:"
    },
    {
     "t": "math",
     "tex": "\\log\\frac{P(y=1|x)}{P(y=0|x)} = w^Tx + b"
    },
    {
     "t": "p",
     "text": "Intercept \\(b\\) is biased toward predicting majority class. Solutions:"
    },
    {
     "t": "ol",
     "items": [
      "**Class weights:** \\(w_+ = n/(2n^+)\\), \\(w_- = n/(2n^-)\\) in loss",
      "**SMOTE:** Oversample minority class synthetically",
      "**Undersampling:** EasyEnsemble, BalancedBagging",
      "**Threshold tuning:** Move decision boundary from 0.5",
      "**Metric:** Use PR-AUC instead of ROC-AUC"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Underfitting — causes and mathematical fixes.",
   "body": [
    {
     "t": "p",
     "text": "A model underfits when the hypothesis class \\(\\mathcal{H}\\) cannot represent \\(f^*\\):"
    },
    {
     "t": "math",
     "tex": "\\text{Bias} = f(x) - E_{\\mathcal{D}}[\\hat{f}(x)] \\gg 0"
    },
    {
     "t": "ul",
     "items": [
      "High training AND validation error",
      "Model capacity < data complexity"
     ]
    },
    {
     "t": "p",
     "text": "Fixes: increase capacity (deeper/wider network, more trees), reduce regularization \\(\\lambda\\), add polynomial features, increase tree depth, train longer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is Maximum Likelihood Estimation (MLE)? Derive for linear regression.",
   "body": [
    {
     "t": "p",
     "text": "**MLE:** \\(\\hat{\\theta} = \\arg\\max_\\theta P(\\mathbf{y}|\\mathbf{X};\\theta)\\)"
    },
    {
     "t": "p",
     "text": "Under the linear model \\(y_i = \\mathbf{w}^T\\mathbf{x}_i + \\epsilon_i\\), \\(\\epsilon_i\\sim\\mathcal{N}(0,\\sigma^2)\\):"
    },
    {
     "t": "math",
     "tex": "P(\\mathbf{y}|\\mathbf{X};\\mathbf{w},\\sigma^2) = \\prod_{i=1}^n \\frac{1}{\\sqrt{2\\pi\\sigma^2}}e^{-\\frac{(y_i-\\mathbf{w}^T\\mathbf{x}_i)^2}{2\\sigma^2}}"
    },
    {
     "t": "p",
     "text": "Log-likelihood:"
    },
    {
     "t": "math",
     "tex": "\\ell(\\mathbf{w}) = -\\frac{n}{2}\\log(2\\pi\\sigma^2) - \\frac{1}{2\\sigma^2}\\sum_i(y_i-\\mathbf{w}^T\\mathbf{x}_i)^2"
    },
    {
     "t": "p",
     "text": "Maximising \\(\\ell(\\mathbf{w})\\) ≡ minimising \\(\\sum_i(y_i-\\mathbf{w}^T\\mathbf{x}_i)^2\\) (MSE). QED."
    },
    {
     "t": "p",
     "text": "Similarly, for logistic regression with Bernoulli likelihood → minimise binary cross-entropy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between parametric and non-parametric models?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "Parametric",
      "Non-parametric"
     ],
     "rows": [
      [
       "# parameters",
       "Fixed (independent of \\(n\\))",
       "Grows with \\(n\\)"
      ],
      [
       "Examples",
       "LR, Logistic, Naive Bayes, LDA",
       "KNN, DT, SVM (kernel)"
      ],
      [
       "Storage",
       "Just weights",
       "Full training data"
      ],
      [
       "Scalability",
       "\\(O(d)\\) inference",
       "\\(O(nd)\\) inference"
      ],
      [
       "Expressiveness",
       "Limited by form",
       "Can model any \\(f\\)"
      ],
      [
       "Statistical theory",
       "Easier to analyse",
       "Harder bounds"
      ]
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
