/* ============================================================================
   PRACTICE P1.4 — Feature Engineering & Modeling Math
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/Practice/01_Math_and_Stats_Scenarios.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.4",
 "lede": "**10 questions** from Mathematics and Statistics Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Feature Engineering & Modeling Math",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Target Encoding Leakage",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You use target encoding for a categorical feature with 1,000 categories. Your cross-validation score is amazing but test performance drops significantly."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical issue caused this? How do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Problem:** Target encoding uses the target variable to create features → information leakage. For rare categories, the encoded value is essentially the target itself."
    },
    {
     "t": "p",
     "text": "**Fix — Regularized target encoding:**"
    },
    {
     "t": "math",
     "tex": "\\text{enc}(c) = \\frac{n_c \\cdot \\bar{y}_c + m \\cdot \\bar{y}_{\\text{global}}}{n_c + m}"
    },
    {
     "t": "p",
     "text": "Where \\(m\\) is a smoothing parameter. For categories with few samples, the encoding shrinks toward the global mean."
    },
    {
     "t": "p",
     "text": "**Additional safeguards:**"
    },
    {
     "t": "ol",
     "items": [
      "**Leave-one-out encoding** in training (exclude current row's target)",
      "**K-fold target encoding:** Compute encoding from other folds",
      "**Add noise:** Gaussian noise proportional to \\(1/\\sqrt{n_c}\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Feature Scaling Impact",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your KNN model performs poorly. Features range from [0, 1] to [0, 1000000]."
    },
    {
     "t": "p",
     "text": "**Question:** Why is this happening mathematically?"
    },
    {
     "t": "p",
     "text": "**Answer:** KNN uses distance: \\(d(\\mathbf{x}, \\mathbf{y}) = \\sqrt{\\sum (x_i - y_i)^2}\\)"
    },
    {
     "t": "p",
     "text": "The feature with range \\([0, 10^6]\\) dominates the distance calculation. A difference of 1 in this feature overwhelms differences in all other features."
    },
    {
     "t": "p",
     "text": "**Fix:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Formula",
      "When to use"
     ],
     "rows": [
      [
       "StandardScaler",
       "\\(z = \\frac{x - \\mu}{\\sigma}\\)",
       "Gaussian-like features"
      ],
      [
       "MinMaxScaler",
       "\\(z = \\frac{x - \\min}{\\max - \\min}\\)",
       "Bounded features"
      ],
      [
       "RobustScaler",
       "\\(z = \\frac{x - \\text{median}}{IQR}\\)",
       "Outlier-prone features"
      ],
      [
       "MaxAbsScaler",
       "\\(z = \\frac{x}{\\max(|x|)}\\)",
       "Sparse data"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Algorithms affected by scaling:** KNN, SVM, linear regression, PCA, neural networks."
    },
    {
     "t": "p",
     "text": "**Not affected:** Tree-based models (decisions based on thresholds, not distances)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Multivariate Anomaly Detection",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Each feature individually looks normal, but some data points are anomalous when features are considered jointly."
    },
    {
     "t": "p",
     "text": "**Question:** How do you detect multivariate anomalies that are invisible in univariate analysis?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Example:** A person with income = $50K (normal) and house value = $5M (high but possible) — the combination is anomalous."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Mahalanobis distance:** \\(D_M = \\sqrt{(\\mathbf{x}-\\mu)^T\\Sigma^{-1}(\\mathbf{x}-\\mu)}\\) — accounts for correlations",
      "**Isolation Forest:** Randomly partitions feature space; anomalies require fewer splits",
      "**GMM:** Fit mixture model, flag points with low likelihood",
      "**Autoencoder:** Train to reconstruct normal data; high reconstruction error = anomaly"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Dimensionality Reduction Choice",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have 5,000 features from text embeddings. You need to reduce dimensionality for a classifier."
    },
    {
     "t": "p",
     "text": "**Question:** PCA, t-SNE, or UMAP? What are the mathematical trade-offs?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Preserves",
      "Invertible?",
      "Scalable",
      "Use case"
     ],
     "rows": [
      [
       "PCA",
       "Global variance (linear)",
       "Yes",
       "O(nd²)",
       "Preprocessing for classifier"
      ],
      [
       "t-SNE",
       "Local structure (nonlinear)",
       "No",
       "O(n²)",
       "Visualization only"
      ],
      [
       "UMAP",
       "Local + some global",
       "Approximate",
       "O(n log n)",
       "Visualization + preprocessing"
      ],
      [
       "Truncated SVD",
       "Variance (sparse)",
       "Yes",
       "O(ndk)",
       "Sparse matrices (TF-IDF)"
      ],
      [
       "Autoencoders",
       "Learned nonlinear",
       "Yes (decoder)",
       "GPU",
       "Complex manifolds"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**For classification:** Use PCA or UMAP (with supervised mode). Never use t-SNE for downstream ML — it doesn't preserve meaningful distances."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Information Gain is Zero",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your decision tree won't split on a continuous feature that you know is predictive."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical issue could cause this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Possible causes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Feature is predictive but not through axis-aligned splits:** Decision trees split on single features. If the decision boundary is diagonal (e.g., \\(x_1 + x_2 > 5\\)), no single split captures it.",
      "**Interaction effect:** Feature is only useful in combination with another feature. Information gain of A alone is zero, but IG(A|B) is high.",
      "**Insufficient granularity:** If the tree has already split on correlated features, the residual information gain of this feature is zero."
     ]
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "ul",
     "items": [
      "Create interaction features (\\(x_1 \\times x_2\\), \\(x_1 / x_2\\))",
      "Use oblique decision trees (split on linear combinations)",
      "Use ensemble methods (Random Forest samples different feature subsets)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Sample Size for Power Analysis",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to detect a 1% absolute improvement in conversion rate (from 5% to 6%) with 99% power and α = 0.01."
    },
    {
     "t": "p",
     "text": "**Question:** How many users per group do you need?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "n = \\frac{(z_{\\alpha/2} + z_\\beta)^2 \\cdot [p_1(1-p_1) + p_2(1-p_2)]}{(p_1 - p_2)^2}"
    },
    {
     "t": "p",
     "text": "With \\(\\alpha = 0.01\\) (\\(z = 2.576\\)), power = 0.99 (\\(z_\\beta = 2.326\\)), \\(p_1 = 0.05\\), \\(p_2 = 0.06\\):"
    },
    {
     "t": "math",
     "tex": "n = \\frac{(2.576 + 2.326)^2 \\cdot [0.05(0.95) + 0.06(0.94)]}{(0.01)^2} = \\frac{24.06 \\times 0.1039}{0.0001} \\approx 25,002"
    },
    {
     "t": "p",
     "text": "**~25,000 users per group**, or 50,000 total. With CUPED (50% variance reduction), you'd need ~25,000 total."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Log-Transform Decision",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your target variable (house prices) is right-skewed. Should you log-transform it?"
    },
    {
     "t": "p",
     "text": "**Question:** What are the mathematical implications of predicting \\(\\log(y)\\) vs \\(y\\)?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**When log-transforming the target:**"
    },
    {
     "t": "ul",
     "items": [
      "Model predicts \\(\\hat{z} = \\log(y)\\), inference: \\(\\hat{y} = e^{\\hat{z}}\\)",
      "MSE in log space ≈ optimizing **MAPE** (mean absolute percentage error)",
      "Residuals become more homoscedastic (constant variance)",
      "Predictions are always positive (good for prices)"
     ]
    },
    {
     "t": "p",
     "text": "**Pitfall:** \\(E[e^{\\hat{z}}] \\neq e^{E[\\hat{z}]}\\) (Jensen's inequality). Need **Duan smearing** or **correction factor** \\(e^{\\hat{\\sigma}^2/2}\\)."
    },
    {
     "t": "p",
     "text": "**Decision framework:**"
    },
    {
     "t": "ul",
     "items": [
      "Multiplicative effects → log-transform (prices, revenue)",
      "Additive effects → no transform (temperature, time)",
      "Check residual plots both ways"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Kernel Selection for SVM",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your linear SVM gives 70% accuracy. You know the data is non-linearly separable."
    },
    {
     "t": "p",
     "text": "**Question:** How do you choose the right kernel? What's the math behind kernels?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Kernel trick:** Map data to higher-dimensional space without computing the mapping explicitly. \\(K(x_i, x_j) = \\phi(x_i)^T \\phi(x_j)\\)."
    },
    {
     "t": "table",
     "head": [
      "Kernel",
      "Formula",
      "Best for"
     ],
     "rows": [
      [
       "Linear",
       "\\(x_i^T x_j\\)",
       "Linearly separable, high-dim (text)"
      ],
      [
       "RBF",
       "\\(\\exp(-\\gamma|x_i - x_j|^2)\\)",
       "Default, most non-linear problems"
      ],
      [
       "Polynomial",
       "\\((x_i^T x_j + c)^d\\)",
       "Feature interactions of known degree"
      ],
      [
       "Sigmoid",
       "\\(\\tanh(\\gamma x_i^T x_j + c)\\)",
       "Neural network-like behavior"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Selection strategy:**"
    },
    {
     "t": "ol",
     "items": [
      "Start with RBF — universal approximator",
      "Use grid search over \\(C\\) and \\(\\gamma\\): `C ∈ {0.1, 1, 10, 100}`, `γ ∈ {1e-4, 1e-3, 1e-2, 0.1}`",
      "If features >> samples, try linear first (often sufficient)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Eigenface Decomposition",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have 10,000 face images (100×100 pixels = 10,000 features). You want to build a face recognition system."
    },
    {
     "t": "p",
     "text": "**Question:** How does PCA help here? What's the math?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Flatten each image to a 10,000-dim vector",
      "Center: \\(\\bar{x} = \\frac{1}{n}\\sum x_i\\); \\(\\tilde{x}_i = x_i - \\bar{x}\\)",
      "Compute covariance \\(C = \\frac{1}{n}\\tilde{X}^T\\tilde{X}\\) (10,000 × 10,000 — too large!)",
      "**Trick:** Compute \\(\\tilde{X}\\tilde{X}^T\\) instead (n × n = 10,000 × 10,000). Eigenvectors of this smaller matrix can be projected back.",
      "Keep top-\\(k\\) eigenvectors (eigenfaces): \\(k = 100-300\\) typically captures 95%+ variance",
      "Project: \\(z_i = V_k^T \\tilde{x}_i\\) (10,000-dim → 200-dim)",
      "Recognition: Compare projections using cosine similarity or SVM"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Calibration Problem",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model's predicted probabilities don't match observed frequencies. When it predicts 0.8, the actual rate is only 0.5."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical tools help diagnose and fix this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Diagnosis:**"
    },
    {
     "t": "ul",
     "items": [
      "**Reliability diagram:** Plot predicted probability vs observed frequency in bins",
      "**Expected Calibration Error:** \\(ECE = \\sum_{b=1}^{B} \\frac{|B_b|}{n} |acc(B_b) - conf(B_b)|\\)",
      "**Brier score:** \\(BS = \\frac{1}{n}\\sum(p_i - y_i)^2\\) — combines calibration + discrimination"
     ]
    },
    {
     "t": "p",
     "text": "**Calibration methods:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "How it works",
      "Pros"
     ],
     "rows": [
      [
       "Platt scaling",
       "Fit logistic regression on logits",
       "Simple, few parameters"
      ],
      [
       "Isotonic regression",
       "Non-parametric monotonic mapping",
       "Flexible, no assumptions"
      ],
      [
       "Temperature scaling",
       "Divide logits by \\(T\\), optimize \\(T\\) on val set",
       "Single parameter, multiclass"
      ],
      [
       "Beta calibration",
       "Fit beta distribution on scores",
       "Works well for imbalanced"
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
