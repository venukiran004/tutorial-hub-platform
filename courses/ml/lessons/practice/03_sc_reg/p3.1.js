/* ============================================================================
   PRACTICE P3.1 — Regression and Classification · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/03_Regression.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.1",
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
   "n": "1",
   "q": "What assumptions does linear regression make?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Linearity:** Relationship between X and Y is linear",
      "**Independence:** Observations are independent",
      "**Homoscedasticity:** Constant variance of residuals",
      "**Normality:** Residuals are normally distributed",
      "**No multicollinearity:** Features are not highly correlated"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Violations don't prevent fitting but affect reliability of coefficients and p-values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What does this coefficient mean?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Model: salary = 25000 + 3500 * years_experience + 5000 * has_masters"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Base salary: $25,000",
      "Each year of experience adds $3,500 (holding education constant)",
      "Having a master's adds $5,000 (holding experience constant)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Coefficients represent marginal effects — change in Y per unit change in X, other variables held constant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Your linear regression R² is 0.95 on training but 0.40 on test. What happened?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Overfitting — model memorized training data. Likely causes:"
    },
    {
     "t": "ol",
     "items": [
      "Too many features relative to samples",
      "Polynomial features without regularization",
      "Outliers in training data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** High train R² + low test R² is classic overfitting. Add regularization (Ridge/Lasso) or reduce features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the difference between R² and Adjusted R²?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**R²:** Proportion of variance explained, always increases with more features",
      "**Adjusted R²:** Penalizes for additional features, can decrease if added feature isn't useful"
     ]
    },
    {
     "t": "p",
     "text": "**Formula:** Adj R² = 1 - (1-R²)(n-1)/(n-p-1) where p = number of predictors"
    },
    {
     "t": "p",
     "text": "**Explanation:** Adjusted R² is better for comparing models with different numbers of features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the gradient descent update rule for linear regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "θ_j := θ_j - α * (1/m) * Σ(h(x_i) - y_i) * x_ij"
    },
    {
     "t": "p",
     "text": "Where α = learning rate, m = samples, h(x) = prediction"
    },
    {
     "t": "p",
     "text": "**Explanation:** Move parameters in direction that reduces MSE. Learning rate controls step size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What happens if the learning rate is too large?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradient descent diverges — loss oscillates or increases instead of decreasing."
    },
    {
     "t": "p",
     "text": "**Explanation:** Steps overshoot the minimum, bouncing back and forth across the valley. Symptoms: NaN loss, increasing error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What happens if the learning rate is too small?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Very slow convergence — may take thousands of iterations and might get stuck in local minima."
    },
    {
     "t": "p",
     "text": "**Explanation:** Steps are too small to make meaningful progress. Training time increases dramatically without benefit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the difference between batch, mini-batch, and stochastic gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch GD:** Uses entire dataset per update — slow but stable",
      "**Stochastic GD:** Uses one sample per update — fast but noisy",
      "**Mini-batch GD:** Uses subset (e.g., 32-256 samples) — balanced tradeoff"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Mini-batch is most commonly used: benefits from GPU parallelism and noise helps escape local minima."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Your model has these residual patterns. What do they suggest?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Residuals vs. Predicted plot shows a U-shaped pattern"
    },
    {
     "t": "p",
     "text": "**Answer:** Non-linear relationship between features and target — linear model is insufficient."
    },
    {
     "t": "p",
     "text": "**Explanation:** Random residuals → good fit. Pattern in residuals → systematic error. Solution: add polynomial features, use non-linear model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the closed-form solution for linear regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "θ = (X^T X)^(-1) X^T y"
    },
    {
     "t": "p",
     "text": "(Normal equation)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Directly computes optimal parameters. Works well for small datasets (<10K features). Gradient descent preferred for larger datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "When would the normal equation fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "X^T X is singular (non-invertible) — multicollinear features or more features than samples",
      "Very large dataset — O(n³) matrix inversion is too expensive"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Regularization (adding λI to X^T X) fixes singularity. Use gradient descent for large-scale problems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is Ridge regression (L2 regularization)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear regression with penalty on squared magnitude of coefficients:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = MSE + λ * Σ(θ_j²)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Shrinks coefficients toward zero (but never exactly zero). Controls model complexity. λ controls regularization strength. Higher λ → simpler model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is Lasso regression (L1 regularization)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear regression with penalty on absolute magnitude of coefficients:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = MSE + λ * Σ|θ_j|"
    },
    {
     "t": "p",
     "text": "**Explanation:** Can set coefficients exactly to zero → built-in feature selection. Preferred when you suspect many irrelevant features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the difference between L1 and L2 regularization geometrically?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**L1 (Lasso):** Diamond-shaped constraint region → solution often at corners (coefficients = 0)",
      "**L2 (Ridge):** Circular constraint region → solution shrinks but rarely exactly zero"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** L1's corners in parameter space intersect cost contours at axes, creating sparse solutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is Elastic Net and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combination of L1 and L2 regularization:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = MSE + λ₁ * Σ|θ_j| + λ₂ * Σ(θ_j²)"
    },
    {
     "t": "p",
     "text": "**Use when:** Features are correlated and you want feature selection. Lasso arbitrarily selects one from correlated group; Elastic Net keeps groups together."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Your linear model's coefficients are: [age: 0.5, height_cm: 200, weight_kg: 3]. Is height actually 400x more important than age?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — coefficients depend on feature scales. Height_cm has small values per unit, so coefficient is large to compensate."
    },
    {
     "t": "p",
     "text": "**Explanation:** Must standardize features before comparing coefficient magnitudes. After standardization, coefficients reflect relative importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How does feature scaling affect gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unscaled features create elongated contours in the loss landscape, causing slow zigzag convergence. Scaled features create circular contours → faster convergence."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without scaling, gradient updates are dominated by large-scale features, requiring very small learning rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the difference between MSE, MAE, and RMSE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MSE:** Mean of squared errors — penalizes large errors more",
      "**MAE:** Mean of absolute errors — robust to outliers",
      "**RMSE:** Square root of MSE — same units as target"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE: (1/n)Σ(y-ŷ)². MAE: (1/n)Σ|y-ŷ|. Choose MAE for outlier-heavy data, RMSE for Gaussian errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is MAPE and when does it fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mean Absolute Percentage Error = (1/n) Σ |y-ŷ|/|y| × 100%."
    },
    {
     "t": "p",
     "text": "**Fails when:** y contains zeros (division by zero) or small values (inflated percentages)."
    },
    {
     "t": "p",
     "text": "**Explanation:** MAPE is scale-independent but asymmetric — penalizes under-predictions more than over-predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the coefficient of determination and can it be negative?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** R² = 1 - SS_res/SS_tot. Yes, R² can be negative on test data."
    },
    {
     "t": "p",
     "text": "**Explanation:** R² < 0 means model is worse than predicting the mean. Happens with: overfitted models, wrong model choice, or evaluating on different distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is heteroscedasticity and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Non-constant variance of residuals across predicted values."
    },
    {
     "t": "p",
     "text": "**Detection:** Residual plot shows funnel/cone shape. Breusch-Pagan test, White test."
    },
    {
     "t": "p",
     "text": "**Fix:** Log-transform target, weighted least squares, robust standard errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How would you handle polynomial regression?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import PolynomialFeatures\npoly = PolynomialFeatures(degree=3)\nX_poly = poly.fit_transform(X)\nmodel = LinearRegression()\nmodel.fit(X_poly, y)"
    },
    {
     "t": "p",
     "text": "**Answer:** Still linear regression (linear in parameters, not features). Creates polynomial features, fits linear model."
    },
    {
     "t": "p",
     "text": "**Explanation:** Despite being \"polynomial,\" it's linear in the polynomial features. Overfits easily — use regularization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is multicollinearity and how does it affect linear regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When features are highly correlated with each other."
    },
    {
     "t": "p",
     "text": "**Effects:**"
    },
    {
     "t": "ol",
     "items": [
      "Unstable coefficients (small data change → large coefficient change)",
      "Inflated standard errors → unreliable p-values",
      "Prediction accuracy unaffected but interpretation is wrong"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If height_inches and height_cm are both features, model can't distinguish their individual effects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the learning rate schedule and why is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Strategy to change learning rate during training:"
    },
    {
     "t": "ol",
     "items": [
      "**Step decay:** Reduce by factor every N epochs",
      "**Exponential decay:** α_t = α_0 * e^(-kt)",
      "**Cosine annealing:** Cosine-based schedule",
      "**Warm-up:** Start small, increase, then decay"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Large LR initially for fast progress, small LR later for fine convergence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between gradient descent and Newton's method?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**GD:** Uses first derivative (gradient), linear convergence",
      "**Newton's:** Uses first and second derivatives (Hessian), quadratic convergence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Newton's converges faster but computing Hessian is O(n²) storage, O(n³) computation — impractical for large n."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
