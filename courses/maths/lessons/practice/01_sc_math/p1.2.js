/* ============================================================================
   PRACTICE P1.2 — Statistical Modeling
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/Practice/01_Math_and_Stats_Scenarios.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.2",
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
   "text": "Statistical Modeling",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Loss Goes NaN",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your neural network's loss becomes NaN after 50 epochs of stable training."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical causes could produce NaN? How do you debug?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Mathematical causes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Exploding gradients:** Gradient magnitudes grow exponentially → weights overflow to inf → inf × 0 = NaN",
      "**Log of zero/negative:** `log(softmax(x))` when softmax output underflows to 0",
      "**Division by zero:** Normalization with zero variance, empty batches",
      "**Large learning rate:** Updates overshoot → loss oscillates → diverges"
     ]
    },
    {
     "t": "p",
     "text": "**Debug checklist:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Add anomaly detection\ntorch.autograd.set_detect_anomaly(True)\n\n# 2. Check for NaN in inputs\nassert not torch.isnan(inputs).any(), \"NaN in inputs\"\n\n# 3. Use numerically stable loss\nloss = F.cross_entropy(logits, labels)  # internally does log_softmax\n\n# 4. Gradient clipping\ntorch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)\n\n# 5. Lower learning rate, use warmup"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "PCA Explains Only 60% Variance",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You apply PCA to 500 features. The first 50 components explain only 60% of variance."
    },
    {
     "t": "p",
     "text": "**Question:** What does this tell you? What alternatives exist?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Interpretation:** The data has high intrinsic dimensionality — information is spread across many features, not concentrated in a few directions."
    },
    {
     "t": "p",
     "text": "**Possible causes:**"
    },
    {
     "t": "ul",
     "items": [
      "Features have very different scales → **standardize first** (PCA on correlation matrix)",
      "Data has nonlinear structure → PCA (linear) can't capture it",
      "Many independent signals (genomics, text embeddings often have this property)"
     ]
    },
    {
     "t": "p",
     "text": "**Alternatives:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "When to use"
     ],
     "rows": [
      [
       "Standardize + PCA",
       "Features have different scales"
      ],
      [
       "Kernel PCA",
       "Nonlinear manifold"
      ],
      [
       "t-SNE / UMAP",
       "Visualization (non-linear)"
      ],
      [
       "Autoencoders",
       "Nonlinear dimensionality reduction"
      ],
      [
       "Feature selection (MI, L1)",
       "Remove irrelevant features instead"
      ],
      [
       "Random projection",
       "Fast approximate dimensionality reduction"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Multicollinearity Problem",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Two features have correlation 0.95. Your linear regression coefficients are unstable (flip sign between train/test splits)."
    },
    {
     "t": "p",
     "text": "**Question:** How do you diagnose and fix this?"
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
     "t": "ol",
     "items": [
      "Correlation matrix: \\(|r| > 0.9\\) indicates strong collinearity",
      "VIF (Variance Inflation Factor): \\(VIF_j = \\frac{1}{1 - R_j^2}\\). VIF > 10 → severe multicollinearity",
      "Condition number of \\(X^TX\\): \\(\\kappa > 1000\\) → ill-conditioned"
     ]
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "table",
     "head": [
      "Approach",
      "When to use"
     ],
     "rows": [
      [
       "Drop one feature",
       "When domain knowledge identifies the redundant one"
      ],
      [
       "PCA/factor analysis",
       "Create uncorrelated components"
      ],
      [
       "Ridge regression (L2)",
       "Stabilize coefficients without dropping features"
      ],
      [
       "Elastic Net",
       "Combine L1 (selection) + L2 (stabilization)"
      ],
      [
       "Domain-driven combination",
       "Create ratio or difference of correlated features"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Class Imbalance Math",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have 1% positive class. Your model predicts all negatives and gets 99% accuracy."
    },
    {
     "t": "p",
     "text": "**Question:** What metrics should you use? What mathematical adjustments help?"
    },
    {
     "t": "p",
     "text": "**Answer:** Accuracy is meaningless here — majority class baseline = 99%."
    },
    {
     "t": "p",
     "text": "**Better metrics:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision-Recall AUC:** Focuses on positive class performance",
      "**F1 score:** Harmonic mean of precision and recall",
      "**Matthews Correlation Coefficient:** Balanced measure for imbalanced data"
     ]
    },
    {
     "t": "p",
     "text": "**Mathematical fixes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Weighted loss:** \\(\\mathcal{L} = -\\sum w_c \\cdot y_c \\log \\hat{y}_c\\), with \\(w_{\\text{pos}} = \\frac{n_{\\text{neg}}}{n_{\\text{pos}}}\\)",
      "**Focal loss:** \\(\\mathcal{L} = -\\alpha(1-\\hat{p})^\\gamma \\log(\\hat{p})\\) — downweights easy examples",
      "**SMOTE:** Synthetic oversampling in feature space",
      "**Threshold tuning:** Don't use 0.5 — use precision-recall curve to find optimal threshold"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Confidence Interval Crosses Zero",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model shows a 2% improvement in CTR, but the 95% CI is [-0.5%, +4.5%]."
    },
    {
     "t": "p",
     "text": "**Question:** The effect looks real but CI crosses zero. What's your recommendation?"
    },
    {
     "t": "p",
     "text": "**Answer:** The CI crossing zero means you can't reject the null at α = 0.05. But:"
    },
    {
     "t": "ol",
     "items": [
      "**Point estimate is +2%** — the best single guess",
      "**CI width (5%)** suggests the test is underpowered",
      "**Bayesian perspective:** \\(P(\\text{effect} > 0) \\approx 90\\%\\) (based on CI location)"
     ]
    },
    {
     "t": "p",
     "text": "**Options:**"
    },
    {
     "t": "ul",
     "items": [
      "Run longer to narrow the CI (need ~4x users to halve CI width)",
      "Apply CUPED for variance reduction",
      "Report: \"Directionally positive (+2%) but not yet statistically significant. Estimated 90% probability of positive effect.\"",
      "If the cost of shipping is low and reversible, consider a phased rollout with monitoring"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Non-Normal Data in Small Sample",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have n = 25 observations that are clearly right-skewed. You need to compare two groups."
    },
    {
     "t": "p",
     "text": "**Question:** Can you use a t-test? What alternatives exist?"
    },
    {
     "t": "p",
     "text": "**Answer:** The t-test assumes normality of the **sample mean** (via CLT), not the data itself. With n = 25 and skewed data, the CLT approximation may be poor."
    },
    {
     "t": "p",
     "text": "**Options:**"
    },
    {
     "t": "ol",
     "items": [
      "**Log-transform** → t-test on log-transformed data (if data is log-normal)",
      "**Mann-Whitney U test** — non-parametric, tests rank differences",
      "**Permutation test** — exact, no distributional assumptions",
      "**Bootstrap** — resample to get CI for difference in means",
      "**Trimmed mean t-test** — robust to outliers"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy.stats import mannwhitneyu\nstat, p = mannwhitneyu(group1, group2, alternative='two-sided')"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Bayesian Posterior = Prior",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You set up a Bayesian model but the posterior looks almost identical to the prior."
    },
    {
     "t": "p",
     "text": "**Question:** What's wrong?"
    },
    {
     "t": "p",
     "text": "**Answer:** The data is **not informative** relative to the prior. Causes:"
    },
    {
     "t": "ol",
     "items": [
      "**Too strong a prior:** Prior variance is much smaller than likelihood — prior dominates. **Fix:** Use wider (less informative) priors.",
      "**Too little data:** Likelihood is too weak to update the prior. **Fix:** Collect more data.",
      "**Likelihood misspecification:** Model doesn't capture data-generating process. **Fix:** Check model fit.",
      "**Parameter not identifiable:** Multiple parameter values produce the same likelihood. **Fix:** Reparameterize or add constraints."
     ]
    },
    {
     "t": "p",
     "text": "**Diagnostic:** Plot prior predictive vs posterior predictive. If they're similar, the model isn't learning from data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Regularization Strength Selection",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're training a Ridge regression. How do you choose λ?"
    },
    {
     "t": "p",
     "text": "**Question:** Explain the math behind λ selection and its effect."
    },
    {
     "t": "p",
     "text": "**Answer:** Ridge solution: \\(\\hat{\\theta} = (X^TX + \\lambda I)^{-1} X^T y\\)"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\lambda \\to 0\\): Approaches OLS (no regularization, may overfit)",
      "\\(\\lambda \\to \\infty\\): All coefficients → 0 (underfitting)"
     ]
    },
    {
     "t": "p",
     "text": "**Selection methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**Cross-validation:** Try \\(\\lambda \\in \\{10^{-4}, 10^{-3}, \\dots, 10^{4}\\}\\), pick lowest CV error",
      "**Generalized Cross-Validation (GCV):** Efficient leave-one-out approximation",
      "**Bayesian view:** \\(\\lambda = \\sigma^2_\\epsilon / \\sigma^2_\\theta\\) (noise variance / prior variance)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import RidgeCV\nmodel = RidgeCV(alphas=np.logspace(-4, 4, 100), cv=5)\nmodel.fit(X, y)\nprint(f\"Best lambda: {model.alpha_}\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Feature Importance Disagrees with Correlation",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Feature A has highest correlation with target (r = 0.8) but random forest ranks it 5th in feature importance. Feature B (r = 0.3) is ranked 1st."
    },
    {
     "t": "p",
     "text": "**Question:** Why the discrepancy?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Correlation measures linear association. Feature importance measures predictive power.**"
    },
    {
     "t": "p",
     "text": "Possible explanations:"
    },
    {
     "t": "ol",
     "items": [
      "**Feature A is redundant:** Other features (C, D) already capture the same information. Once they split first, A adds little.",
      "**Feature B has nonlinear relationships:** Low linear correlation but strong interaction effects or nonlinear patterns.",
      "**Feature B interacts with others:** Its importance comes from splits combined with other features.",
      "**Feature importance is permutation-based:** Measures drop in accuracy when feature is shuffled — captures all types of relationships."
     ]
    },
    {
     "t": "p",
     "text": "**Lesson:** Don't use correlation alone for feature selection. Use mutual information, permutation importance, or SHAP values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Gradient Descent Oscillates",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your loss function oscillates without converging. It bounces back and forth around a minimum."
    },
    {
     "t": "p",
     "text": "**Question:** What mathematical causes produce oscillation? How do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Cause:** The loss landscape has high curvature in some directions and low in others (high condition number of the Hessian). The learning rate is too large for the high-curvature direction but too small for the low-curvature direction."
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "table",
     "head": [
      "Fix",
      "How it helps"
     ],
     "rows": [
      [
       "Lower learning rate",
       "Reduces oscillation but slows convergence everywhere"
      ],
      [
       "Momentum",
       "Dampens oscillations, accelerates in consistent directions"
      ],
      [
       "Adam/RMSProp",
       "Per-parameter adaptive learning rates"
      ],
      [
       "Learning rate warmup",
       "Start small, gradually increase"
      ],
      [
       "Feature scaling",
       "Equalizes curvature across dimensions"
      ],
      [
       "Second-order methods (L-BFGS)",
       "Uses Hessian to handle curvature differences"
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
