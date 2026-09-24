/* ============================================================================
   PRACTICE P1.5 — Advanced & Edge Cases
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/Practice/01_Math_and_Stats_Scenarios.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.5",
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
   "text": "Advanced & Edge Cases",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Non-Parametric Density Estimation",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to estimate the probability density of a feature but don't know what distribution it follows."
    },
    {
     "t": "p",
     "text": "**Question:** What methods can you use?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Histogram:** Simple but bin-width sensitive",
      "**KDE (Kernel Density Estimation):** \\(\\hat{f}(x) = \\frac{1}{nh}\\sum_{i=1}^n K\\left(\\frac{x-x_i}{h}\\right)\\)",
      "— \\(K\\): Kernel (usually Gaussian)",
      "— \\(h\\): Bandwidth (controls smoothness) — use Silverman's rule or CV",
      "**Normalizing flows:** Neural network-based density estimation",
      "**Gaussian mixture:** Semi-parametric, flexible"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Bayesian A/B Test with Prior",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your previous experiment showed a 2% conversion lift. Now you're running a new experiment on a similar feature."
    },
    {
     "t": "p",
     "text": "**Question:** How do you incorporate prior knowledge into the new test?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Bayesian approach:**"
    },
    {
     "t": "ol",
     "items": [
      "**Prior from previous experiment:** If prior test showed Beta(200, 9800) for control (2% rate) and Beta(204, 9796) for treatment (2.04% rate), use these as informative priors.",
      "**Update with new data:** Posterior = Beta(prior_α + successes, prior_β + failures)",
      "**Decision rule:** Compute \\(P(\\text{treatment} > \\text{control})\\) via simulation"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n# Posterior samples\ncontrol = np.random.beta(prior_a_c + succ_c, prior_b_c + fail_c, 100000)\ntreatment = np.random.beta(prior_a_t + succ_t, prior_b_t + fail_t, 100000)\nprob_better = np.mean(treatment > control)\nprint(f\"P(treatment better) = {prob_better:.3f}\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Metric Sensitivity Analysis",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model improves RMSE by 5% but increases MAE by 2%."
    },
    {
     "t": "p",
     "text": "**Question:** Which metric should you trust? What does this discrepancy tell you?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**RMSE** penalizes large errors more (\\(\\sqrt{\\frac{1}{n}\\sum e_i^2}\\)) — sensitive to outliers",
      "**MAE** treats all errors equally (\\(\\frac{1}{n}\\sum |e_i|\\)) — robust to outliers"
     ]
    },
    {
     "t": "p",
     "text": "**Interpretation:** The new model is better at predicting extreme values (reduces large errors → lower RMSE) but slightly worse at typical predictions (higher MAE)."
    },
    {
     "t": "p",
     "text": "**Decision:** Depends on the business context:"
    },
    {
     "t": "ul",
     "items": [
      "Predicting house prices for buyers → MAE (typical error matters)",
      "Risk assessment where large errors are costly → RMSE",
      "Report both and let stakeholders decide"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Kolmogorov-Smirnov Test False Alarm",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You use KS test to monitor feature distributions daily. It triggers on almost every feature."
    },
    {
     "t": "p",
     "text": "**Question:** Why are there so many false alarms?"
    },
    {
     "t": "p",
     "text": "**Answer:** **With large production datasets (millions of records), even tiny distribution shifts become statistically significant.** The KS test has too much power."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Use PSI** instead — measures practical magnitude, not just statistical significance",
      "**Set effect size thresholds:** Only alert if KS statistic > 0.05 (not just p < 0.05)",
      "**Windowed comparison:** Compare to recent history, not the training set",
      "**Alert levels:** Warning (KS > 0.05), Critical (KS > 0.15)",
      "**Focus on prediction drift:** Monitor output distribution changes, not individual features"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "Choosing Between Mean and Median",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're building a regression model to predict delivery times. The distribution is right-skewed with occasional very late deliveries."
    },
    {
     "t": "p",
     "text": "**Question:** Should your model optimize for mean or median delivery time?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Mean (MSE loss):** Penalizes late deliveries heavily. Good if you want to reduce worst-case",
      "**Median (MAE loss):** Predicts the \"typical\" delivery time. Robust to outliers"
     ]
    },
    {
     "t": "p",
     "text": "**Business context matters:**"
    },
    {
     "t": "table",
     "head": [
      "Objective",
      "Metric",
      "Loss function"
     ],
     "rows": [
      [
       "Customer expectation setting",
       "Median",
       "MAE / Quantile loss at 50%"
      ],
      [
       "SLA compliance (95th percentile)",
       "P95",
       "Quantile loss at 95%"
      ],
      [
       "Cost optimization",
       "Mean",
       "MSE"
      ],
      [
       "Under-promise, over-deliver",
       "P75",
       "Quantile loss at 75%"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Quantile regression** lets you predict any percentile: \\(\\mathcal{L}_\\tau(e) = \\max(\\tau e, (\\tau-1)e)\\)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Multiple Stakeholder Metrics",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Marketing wants to maximize clicks, product wants engagement, finance wants revenue. Your model can't optimize all three."
    },
    {
     "t": "p",
     "text": "**Question:** How do you mathematically handle multiple objectives?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Multi-objective optimization approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Weighted sum:** \\(\\mathcal{L} = w_1 \\cdot L_{\\text{click}} + w_2 \\cdot L_{\\text{engagement}} + w_3 \\cdot L_{\\text{revenue}}\\)",
      "— Pro: Simple. Con: Weights are subjective, can't find concave Pareto front."
     ]
    },
    {
     "t": "ol",
     "items": [
      "**Constrained optimization:** Maximize revenue subject to engagement ≥ threshold, clicks ≥ threshold"
     ]
    },
    {
     "t": "ol",
     "items": [
      "**Pareto frontier:** Find the set of models where improving one metric necessarily hurts another. Present trade-off curve to stakeholders."
     ]
    },
    {
     "t": "ol",
     "items": [
      "**OEC (Overall Evaluation Criterion):** Create one composite metric agreed by all stakeholders. Hard but ideal."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "Covariate Shift in Model Retraining",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You retrain your model monthly. After retraining, performance on historical data looks great but production performance drops."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical issue causes this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Cause:** The retrained model is optimized for the **current data distribution**, which may have shifted from production. If you evaluate on the current training window, it looks good, but production sees data from the evolving distribution."
    },
    {
     "t": "p",
     "text": "**Also:** Potential **data leakage in feature engineering** during retraining (look-ahead bias)."
    },
    {
     "t": "p",
     "text": "**Fix:**"
    },
    {
     "t": "ol",
     "items": [
      "Time-based validation split: Always validate on data **after** the training window",
      "Monitor production metrics alongside offline metrics",
      "A/B test the retrained model before full rollout",
      "Use domain adaptation techniques if shift is expected"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Bootstrapping for Complex Statistics",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need a confidence interval for the ratio of two medians. No analytical formula exists."
    },
    {
     "t": "p",
     "text": "**Question:** How do you use bootstrap to solve this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndata_A = np.array([...])\ndata_B = np.array([...])\nn_bootstrap = 10000\nratios = []\n\nfor _ in range(n_bootstrap):\n    boot_A = np.random.choice(data_A, size=len(data_A), replace=True)\n    boot_B = np.random.choice(data_B, size=len(data_B), replace=True)\n    ratios.append(np.median(boot_A) / np.median(boot_B))\n\nci_lower = np.percentile(ratios, 2.5)\nci_upper = np.percentile(ratios, 97.5)\nprint(f\"Median ratio: {np.median(data_A)/np.median(data_B):.3f}\")\nprint(f\"95% CI: [{ci_lower:.3f}, {ci_upper:.3f}]\")"
    },
    {
     "t": "p",
     "text": "**Bootstrap variants:**"
    },
    {
     "t": "ul",
     "items": [
      "**Percentile method:** Simple, shown above",
      "**BCa (Bias-Corrected Accelerated):** More accurate for skewed statistics",
      "**Parametric bootstrap:** Resample from fitted distribution"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Information Leakage in Time Series",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your time series model achieves 95% accuracy in cross-validation but fails in production."
    },
    {
     "t": "p",
     "text": "**Question:** What went wrong mathematically?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Standard k-fold CV leaks future information.** Folds mix past and future data, so the model \"sees\" the future during training."
    },
    {
     "t": "p",
     "text": "**Correct approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Walk-forward validation:** Train on \\([1, t]\\), test on \\([t+1, t+h]\\), slide forward",
      "**Expanding window:** Train on all data up to \\(t\\), test on next period",
      "**Embargo gap:** Leave a gap between train and test to prevent leakage from lagged features",
      "**Purging:** Remove from training any samples whose label period overlaps with test period"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Correct:   |---train---|gap|--test--|\n            |-----train------|gap|--test--|\n            \nWrong:      fold1=[1,3,5,7] fold2=[2,4,6,8]  ← future leaks into training"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Bayesian Optimization for Hyperparameters",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model has 10 hyperparameters. Grid search would take weeks. Random search is too random."
    },
    {
     "t": "p",
     "text": "**Question:** How does Bayesian optimization work mathematically?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Bayesian optimization** models the objective function \\(f(\\mathbf{x})\\) (validation loss) as a Gaussian Process:"
    },
    {
     "t": "math",
     "tex": "f(\\mathbf{x}) \\sim \\mathcal{GP}(m(\\mathbf{x}), k(\\mathbf{x}, \\mathbf{x}'))"
    },
    {
     "t": "ol",
     "items": [
      "**Surrogate model (GP):** Predicts mean and uncertainty of \\(f\\) at any point",
      "**Acquisition function:** Balances exploration vs exploitation",
      "— **EI (Expected Improvement):** \\(EI(\\mathbf{x}) = E[\\max(f^* - f(\\mathbf{x}), 0)]\\)",
      "— **UCB:** \\(\\alpha(\\mathbf{x}) = \\mu(\\mathbf{x}) - \\kappa \\sigma(\\mathbf{x})\\) (for minimization)",
      "**Next point:** \\(\\mathbf{x}_{\\text{next}} = \\arg\\max \\alpha(\\mathbf{x})\\)",
      "**Evaluate** \\(f(\\mathbf{x}_{\\text{next}})\\), update GP, repeat"
     ]
    },
    {
     "t": "p",
     "text": "**Advantages:** Typically finds good hyperparameters in 20-50 evaluations vs 100s for random search."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from optuna import create_study\nstudy = create_study(direction='minimize', sampler=optuna.samplers.TPESampler())\nstudy.optimize(objective, n_trials=50)"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
