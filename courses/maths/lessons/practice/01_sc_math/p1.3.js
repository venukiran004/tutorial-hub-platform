/* ============================================================================
   PRACTICE P1.3 — Probability & Distributions
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/Practice/01_Math_and_Stats_Scenarios.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.3",
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
   "text": "Probability & Distributions",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Estimating Conversion Rate with Limited Data",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You launched a new product. After 10 users, 3 converted. PM asks: \"What's our conversion rate?\""
    },
    {
     "t": "p",
     "text": "**Question:** How do you give a meaningful estimate with only 10 observations?"
    },
    {
     "t": "p",
     "text": "**Answer:** Point estimate: 3/10 = 30%, but the CI is huge."
    },
    {
     "t": "p",
     "text": "**Frequentist CI** (Wilson interval, better than Wald for small n):"
    },
    {
     "t": "math",
     "tex": "\\hat{p} = \\frac{x + z^2/2}{n + z^2} \\pm \\frac{z}{n + z^2}\\sqrt{\\frac{x(n-x)}{n} + \\frac{z^2}{4}}"
    },
    {
     "t": "p",
     "text": "For n=10, x=3: 95% CI ≈ [10.8%, 60.3%] — very wide."
    },
    {
     "t": "p",
     "text": "**Bayesian approach** (more intuitive):"
    },
    {
     "t": "ul",
     "items": [
      "Prior: Beta(1, 1) (uniform) or Beta(2, 8) if similar products convert ~20%",
      "Posterior: Beta(1+3, 1+7) = Beta(4, 8)",
      "Mean: 4/12 = 33%, 95% credible interval ≈ [12%, 58%]",
      "With informative prior Beta(2,8): Posterior = Beta(5, 15), mean = 25%"
     ]
    },
    {
     "t": "p",
     "text": "**Recommendation:** Report \"Estimated 25-33% with wide uncertainty. Need 100+ users for a reliable estimate.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Detecting Data Drift",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your production model's accuracy dropped 5% over 3 months. You suspect the input distribution shifted."
    },
    {
     "t": "p",
     "text": "**Question:** How do you mathematically detect and quantify the drift?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Statistical tests for drift:**"
    },
    {
     "t": "ol",
     "items": [
      "**KS test** (continuous features): Tests if two distributions differ",
      "**Chi-squared test** (categorical features): Tests frequency changes",
      "**PSI (Population Stability Index):**"
     ]
    },
    {
     "t": "math",
     "tex": "PSI = \\sum (p_i^{\\text{new}} - p_i^{\\text{old}}) \\ln\\frac{p_i^{\\text{new}}}{p_i^{\\text{old}}}"
    },
    {
     "t": "ul",
     "items": [
      "PSI < 0.1: No drift. 0.1-0.25: Moderate. >0.25: Significant."
     ]
    },
    {
     "t": "ol",
     "items": [
      "**MMD (Maximum Mean Discrepancy):** Kernel-based test for high-dimensional drift"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy.stats import ks_2samp\nfor col in features:\n    stat, p = ks_2samp(train_data[col], prod_data[col])\n    if p < 0.01:\n        print(f\"Drift detected in {col}: KS={stat:.3f}, p={p:.4f}\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Handling Missing Data",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** 15% of a key feature is missing. Your stakeholder says \"just fill with the mean.\""
    },
    {
     "t": "p",
     "text": "**Question:** When is mean imputation appropriate and when is it dangerous?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Types of missing data (Rubin's framework):**"
    },
    {
     "t": "table",
     "head": [
      "Type",
      "Definition",
      "Mean imputation OK?"
     ],
     "rows": [
      [
       "MCAR",
       "Missingness is completely random",
       "Yes (but loses variance)"
      ],
      [
       "MAR",
       "Missingness depends on observed variables",
       "No — biased"
      ],
      [
       "MNAR",
       "Missingness depends on the missing value itself",
       "No — biased"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Mean imputation always:**"
    },
    {
     "t": "ul",
     "items": [
      "Reduces variance (standard errors too small)",
      "Distorts correlations between features",
      "Can bias coefficient estimates if not MCAR"
     ]
    },
    {
     "t": "p",
     "text": "**Better alternatives:**"
    },
    {
     "t": "ul",
     "items": [
      "MICE (Multiple Imputation by Chained Equations)",
      "KNN imputation",
      "Model-based imputation (predict missing from other features)",
      "For trees: native missing handling (XGBoost, LightGBM)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Choosing a Prior",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're building a Bayesian model but don't know what prior to use."
    },
    {
     "t": "p",
     "text": "**Question:** How do you select an appropriate prior?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Prior selection strategy:**"
    },
    {
     "t": "table",
     "head": [
      "Prior Type",
      "When to use",
      "Example"
     ],
     "rows": [
      [
       "Non-informative (flat)",
       "No domain knowledge",
       "Uniform, Jeffreys"
      ],
      [
       "Weakly informative",
       "Some knowledge of scale",
       "Normal(0, 10) for coefficients"
      ],
      [
       "Informative",
       "Strong domain knowledge",
       "Beta(50, 50) if conversion rate ~50%"
      ],
      [
       "Empirical Bayes",
       "Use data to estimate prior hyperparameters",
       "Marginal likelihood maximization"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Best practices:**"
    },
    {
     "t": "ol",
     "items": [
      "Do a **prior predictive check:** Sample from the prior and generate fake data. Does it look reasonable?",
      "Check **prior sensitivity:** Run with different priors. If conclusions change, you need more data or better priors.",
      "For regression coefficients: Use `Normal(0, σ)` where σ reflects the expected effect size."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "CLT Doesn't Apply",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your metric is highly right-skewed with extreme outliers (e.g., revenue per user). With n = 1,000, the sampling distribution of the mean still looks skewed."
    },
    {
     "t": "p",
     "text": "**Question:** CLT says the mean should be normal. Why isn't it working?"
    },
    {
     "t": "p",
     "text": "**Answer:** CLT requires **finite variance**. Heavy-tailed distributions (Pareto, Cauchy-like tails) can have:"
    },
    {
     "t": "ul",
     "items": [
      "Infinite or very large variance → CLT converges very slowly",
      "A few extreme values dominate the sum"
     ]
    },
    {
     "t": "p",
     "text": "**Evidence:** \\(n = 1,000\\) may not be enough for convergence if the tail index is close to 2."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Log-transform:** If data is lognormal, log-mean is normally distributed",
      "**Winsorize at 99th percentile:** Remove tail influence",
      "**Trimmed mean:** Remove top/bottom 5%",
      "**Bootstrap:** Empirical sampling distribution without CLT assumption",
      "**Robust statistics:** Use median instead of mean"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Outlier Detection",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your dataset has 10,000 records. You need to identify outliers for a fraud detection system."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical approaches can you use?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Assumptions",
      "Formula/Approach"
     ],
     "rows": [
      [
       "Z-score",
       "Normal distribution",
       "\\(z = \\frac{x - \\mu}{\\sigma}\\), flag if \\(|z| > 3\\)"
      ],
      [
       "IQR method",
       "Any distribution",
       "Flag if \\(x < Q_1 - 1.5 \\cdot IQR\\) or \\(x > Q_3 + 1.5 \\cdot IQR\\)"
      ],
      [
       "Mahalanobis",
       "Multivariate normal",
       "\\(D_M = \\sqrt{(x-\\mu)^T\\Sigma^{-1}(x-\\mu)}\\)"
      ],
      [
       "Isolation Forest",
       "Any",
       "Random partitioning — outliers isolated faster"
      ],
      [
       "DBSCAN",
       "Density-based",
       "Points not in any cluster = outliers"
      ],
      [
       "LOF",
       "Local density",
       "Compares density of point to neighbors"
      ]
     ]
    },
    {
     "t": "p",
     "text": "For fraud detection, combine multiple methods and use **domain knowledge** to distinguish anomalies from errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Sampling Strategy for Rare Events",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're training a model for a disease that affects 0.01% of the population. Your training data has 10M records but only 1,000 positive cases."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this extreme imbalance mathematically?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Stratified sampling:** Ensure train/val/test splits maintain the 0.01% ratio",
      "**Oversampling positives:** SMOTE generates synthetic positives in feature space",
      "**Undersampling negatives:** Random or Tomek links (remove borderline negatives)",
      "**Cost-sensitive learning:** Assign class weights inversely proportional to frequency: \\(w_+ = \\frac{n}{2 \\cdot n_+}\\)",
      "**Anomaly detection framing:** Treat positives as anomalies, train on negatives only",
      "**Focal loss:** \\(\\mathcal{L} = -\\alpha(1-p_t)^\\gamma \\log(p_t)\\) — focuses on hard examples"
     ]
    },
    {
     "t": "p",
     "text": "**Evaluation:** Use PR-AUC, not ROC-AUC (ROC is overly optimistic for rare events)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Distribution Shift in Production",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model was trained on data from 2023. Now in 2024, user behavior has changed significantly."
    },
    {
     "t": "p",
     "text": "**Question:** How do you mathematically characterize and handle this shift?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Types of shift:**"
    },
    {
     "t": "ul",
     "items": [
      "**Covariate shift:** \\(P_{\\text{train}}(X) \\neq P_{\\text{test}}(X)\\) but \\(P(Y|X)\\) unchanged",
      "**Concept drift:** \\(P(Y|X)\\) changes",
      "**Prior shift:** \\(P(Y)\\) changes"
     ]
    },
    {
     "t": "p",
     "text": "**Detection:** KS test, PSI, MMD on features. Monitor prediction distribution shifts."
    },
    {
     "t": "p",
     "text": "**Handling covariate shift** (importance weighting):"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{\\text{adjusted}} = \\sum_i \\frac{p_{\\text{test}}(x_i)}{p_{\\text{train}}(x_i)} \\ell(f(x_i), y_i)"
    },
    {
     "t": "p",
     "text": "**Handling concept drift:** Retrain on recent data, use online learning, or sliding window models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Correlation Matrix is Not Positive Definite",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You compute a correlation matrix from data with missing values. When you try to use it for portfolio optimization, it fails because the matrix is not positive semi-definite."
    },
    {
     "t": "p",
     "text": "**Question:** Why does this happen and how do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Cause:** Pairwise deletion of missing values means each correlation is computed from a different subset of data. The resulting matrix may not be a valid correlation matrix."
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Nearest PSD matrix:** Find the closest PSD matrix in Frobenius norm (Higham's algorithm)",
      "**Eigenvalue clipping:** Set negative eigenvalues to a small positive number (e.g., \\(10^{-6}\\)), reconstruct",
      "**Shrinkage estimator:** \\(\\hat{\\Sigma} = (1-\\alpha)\\hat{C} + \\alpha I\\) (Ledoit-Wolf)",
      "**Complete case analysis:** Use only rows with no missing values",
      "**EM algorithm:** Estimate full correlation matrix handling missing values properly"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Monte Carlo Estimation",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to estimate the expected value of a complex function \\(E[f(X)]\\) where \\(X\\) has a known but complex distribution."
    },
    {
     "t": "p",
     "text": "**Question:** How do you use Monte Carlo methods? How many samples do you need?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "\\hat{E}[f(X)] = \\frac{1}{N}\\sum_{i=1}^N f(x_i), \\quad x_i \\sim P(X)"
    },
    {
     "t": "p",
     "text": "**Error:** \\(\\text{SE} = \\frac{\\sigma_f}{\\sqrt{N}}\\) where \\(\\sigma_f\\) is the standard deviation of \\(f(X)\\)."
    },
    {
     "t": "p",
     "text": "**For 1% relative error:** \\(N \\geq \\left(\\frac{100 \\cdot \\sigma_f}{\\mu_f}\\right)^2\\)"
    },
    {
     "t": "p",
     "text": "**Variance reduction:**"
    },
    {
     "t": "ul",
     "items": [
      "**Importance sampling:** Sample from proposal \\(q(x)\\), weight by \\(\\frac{p(x)}{q(x)}\\)",
      "**Stratified sampling:** Partition domain, sample from each stratum",
      "**Antithetic variates:** Use \\(x_i\\) and \\(1-x_i\\) pairs (for monotone functions)",
      "**Control variates:** Subtract known-expectation function correlated with \\(f\\)"
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
