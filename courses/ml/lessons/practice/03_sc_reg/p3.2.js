/* ============================================================================
   PRACTICE P3.2 — Regression and Classification · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/03_Regression.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.2",
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
   "n": "26",
   "q": "What is momentum in gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Accumulates past gradients to accelerate descent:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "v_t = β * v_(t-1) + α * gradient\nθ = θ - v_t"
    },
    {
     "t": "p",
     "text": "β typically 0.9"
    },
    {
     "t": "p",
     "text": "**Explanation:** Momentum smooths updates, accelerates through shallow gradients, dampens oscillations in steep directions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the Adam optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adaptive Moment Estimation — combines momentum with adaptive learning rates per parameter."
    },
    {
     "t": "ul",
     "items": [
      "Tracks first moment (mean) and second moment (variance) of gradients",
      "Each parameter gets its own effective learning rate"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Default choice for deep learning. Robust to hyperparameter settings. Typical: lr=0.001, β1=0.9, β2=0.999."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Your regression model has high training MSE and high test MSE. What's wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Underfitting — model is too simple to capture the patterns."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Add more features / polynomial features",
      "Use more complex model",
      "Reduce regularization strength",
      "Check data quality"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Both high = underfitting. Train low/test high = overfitting. Both low = good fit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is Huber loss and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combines MSE (for small errors) and MAE (for large errors):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L(δ) = 0.5*(y-ŷ)² if |y-ŷ| ≤ δ\nL(δ) = δ*|y-ŷ| - 0.5*δ² if |y-ŷ| > δ"
    },
    {
     "t": "p",
     "text": "**Explanation:** Less sensitive to outliers than MSE, differentiable everywhere unlike MAE. δ controls the transition point."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is quantile regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predicts specific quantiles (e.g., median, 90th percentile) instead of the mean."
    },
    {
     "t": "p",
     "text": "**Loss:** Tilted absolute value: ρ_τ(u) = u*(τ - I(u<0))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful for prediction intervals, understanding distributional effects, and when you care about specific percentiles (e.g., worst-case shipping time)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "When would you prefer MAE loss over MSE loss for training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When you want a model robust to outliers or when the target has a skewed distribution."
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE: y=[1,2,3,100], outlier gets (100-ŷ)² weight. MAE treats all errors linearly. MSE → predicts mean; MAE → predicts median."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is feature normalization vs standardization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Normalization (MinMax):** Scale to [0,1]: (x-min)/(max-min)",
      "**Standardization (Z-score):** Scale to mean=0, std=1: (x-μ)/σ"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Normalization bounded but sensitive to outliers. Standardization unbounded but robust. Choose based on downstream algorithm."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What does the intercept (bias term) represent in linear regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The predicted value when all features are zero."
    },
    {
     "t": "p",
     "text": "**Explanation:** In y = β₀ + β₁x → β₀ is the y-intercept. May not have physical meaning if x=0 is outside data range. Omitting bias term forces line through origin."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How do you interpret p-values for regression coefficients?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** P-value of coefficient: probability of observing that coefficient (or more extreme) if true coefficient is zero."
    },
    {
     "t": "ul",
     "items": [
      "p < 0.05: Feature is statistically significant",
      "p > 0.05: Cannot reject null hypothesis that coefficient = 0"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Low p-value → feature likely has real effect. But significance ≠ importance — small but consistent effect can be significant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is Cook's distance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures influence of each observation on fitted regression model. Points with Cook's D > 4/n are influential."
    },
    {
     "t": "p",
     "text": "**Explanation:** Combines residual magnitude and leverage. High influence point: removing it substantially changes model parameters. Use to detect influential outliers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the difference between leverage and influence?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Leverage:** How far a point's X values are from the mean (unusual input)",
      "**Influence:** How much removing a point changes the model (leverage × residual)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** High leverage + small residual = okay (point fits model). High leverage + large residual = influential (distorts model)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is weighted least squares?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear regression where each observation gets a different weight in the loss:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = Σ w_i * (y_i - ŷ_i)²"
    },
    {
     "t": "p",
     "text": "**Use cases:** Heteroscedasticity (weight by 1/variance), different data quality, more recent data more important."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is regularization path?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Coefficient values plotted as a function of regularization strength (λ)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Shows how coefficients shrink toward zero as λ increases. In Lasso, shows which features get eliminated first — useful for feature selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Your model: y = 3x₁ + 2x₂ + x₃. What's the predicted change in y when x₁ increases by 2 units?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** y increases by 6 (3 × 2 = 6), assuming x₂ and x₃ remain constant."
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear models: effect is additive and constant. Doubling the change in x₁ doubles the change in y."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between simple, multiple, and multivariate regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Simple:** One X, one Y → y = β₀ + β₁x",
      "**Multiple:** Multiple Xs, one Y → y = β₀ + β₁x₁ + β₂x₂ + ...",
      "**Multivariate:** Multiple Xs, multiple Ys → vector of Y predictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multiple is most common. Multivariate handles correlated targets jointly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is stepwise regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Feature selection by iteratively adding/removing features based on statistical criteria:"
    },
    {
     "t": "ul",
     "items": [
      "**Forward:** Start empty, add best feature each step",
      "**Backward:** Start full, remove worst feature each step",
      "**Stepwise:** Both add and remove at each step"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple but criticized: p-values are unreliable after selection, prone to overfitting. Prefer Lasso or cross-validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the Gauss-Markov theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Under OLS assumptions, the OLS estimator is BLUE: Best Linear Unbiased Estimator — has minimum variance among all linear unbiased estimators."
    },
    {
     "t": "p",
     "text": "**Explanation:** Doesn't mean OLS is the best overall — biased estimators (Ridge) can have lower MSE through bias-variance tradeoff."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is batch normalization in the context of gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalizing inputs to each layer during training: subtract mean, divide by std, then scale and shift."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces internal covariate shift, allows higher learning rates, acts as mild regularizer. Typically used between linear transformation and activation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "When would you transform the target variable (y)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Skewed target → log(y) or Box-Cox",
      "Heteroscedastic residuals → log(y) often stabilizes variance",
      "Multiplicative relationships → log transform makes them additive"
     ]
    },
    {
     "t": "p",
     "text": "**Caveat:** Must inverse-transform predictions. Metrics should be computed on original scale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the difference between SGD with learning rate 0.01 and 0.001 for the same dataset?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**0.01:** Faster convergence but might overshoot minimum, more oscillation",
      "**0.001:** Slower convergence but more precise, less oscillation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** No universally best LR — depends on loss landscape. Use learning rate finder or adaptive optimizers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is gradient clipping?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Limiting gradient magnitude during training to prevent exploding gradients:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Clip by value\ngradient = max(min(gradient, clip_value), -clip_value)\n# Clip by norm\nif ||gradient|| > threshold:\n    gradient = gradient * threshold / ||gradient||"
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents unstable training without changing gradient direction (when clipping by norm)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the vanishing gradient problem in deep networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradients become exponentially small as they propagate back through many layers → early layers learn very slowly."
    },
    {
     "t": "p",
     "text": "**Causes:** Activation functions like sigmoid/tanh squash gradients below 1, repeated multiplication → near-zero."
    },
    {
     "t": "p",
     "text": "**Solutions:** ReLU activation, skip connections, batch normalization, better initialization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How would you choose between Ridge and Lasso for your problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Scenario",
      "Choose"
     ],
     "rows": [
      [
       "Many features, few relevant",
       "Lasso (sparse solution)"
      ],
      [
       "Many correlated features",
       "Ridge (keeps all) or Elastic Net"
      ],
      [
       "Want feature selection",
       "Lasso"
      ],
      [
       "Want stable coefficients",
       "Ridge"
      ],
      [
       "Not sure",
       "Elastic Net (combines both)"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the convergence criterion for gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop when:"
    },
    {
     "t": "ol",
     "items": [
      "Loss change < threshold: |L(t) - L(t-1)| < ε",
      "Gradient norm < threshold: ||∇L|| < ε",
      "Maximum iterations reached",
      "Validation loss starts increasing (early stopping)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Practical: use combination of criteria. Early stopping prevents overfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the curse of dimensionality in regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As features increase, data becomes sparse in high-dimensional space. Need exponentially more data to maintain density."
    },
    {
     "t": "p",
     "text": "**Effects:**"
    },
    {
     "t": "ol",
     "items": [
      "Distance metrics become meaningless",
      "Models overfit more easily",
      "Feature selection becomes critical"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 10 features, 10 values each → 10^10 possible combinations. No dataset covers this space adequately."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
