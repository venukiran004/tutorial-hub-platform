/* ============================================================================
   INTERVIEW I1.7 — Optimization & Training Dynamics
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.7",
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
   "text": "Optimization & Training Dynamics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is the difference between first-order and second-order optimization?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**First-order:** Uses gradient ∇f. SGD, Adam, RMSprop — cheap per step, scale well.",
      "**Second-order:** Uses Hessian ∇²f. Newton's method, L-BFGS — faster convergence but quadratic memory cost O(n²). Used for small ML models (sklearn `solver=\"lbfgs\"`)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is the difference between SGD, Mini-batch GD, and Batch GD?",
   "body": [
    {
     "t": "table",
     "head": [
      "Method",
      "Update Per",
      "Noise",
      "Speed",
      "Converges to"
     ],
     "rows": [
      [
       "Batch GD",
       "Full dataset",
       "None",
       "Slow",
       "Local/global min"
      ],
      [
       "Mini-batch GD",
       "Batch of n",
       "Low",
       "Fast",
       "Near-optimal"
      ],
      [
       "SGD",
       "1 sample",
       "High",
       "Fastest",
       "Oscillates around min"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is momentum in gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "Accumulates a velocity vector in directions of persistent gradient:"
    },
    {
     "t": "math",
     "tex": "v_t = \\beta v_{t-1} + (1-\\beta)\\nabla L"
    },
    {
     "t": "math",
     "tex": "\\theta \\leftarrow \\theta - \\alpha v_t"
    },
    {
     "t": "p",
     "text": "Dampens oscillations in narrow valleys and accelerates in persistent directions. Typical \\(\\beta = 0.9\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "How does the Adam optimizer work?",
   "body": [
    {
     "t": "p",
     "text": "Combines momentum (first moment \\(m_t\\)) and RMSprop (second moment \\(v_t\\)):"
    },
    {
     "t": "math",
     "tex": "m_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t"
    },
    {
     "t": "math",
     "tex": "v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2"
    },
    {
     "t": "math",
     "tex": "\\hat{m}_t = \\frac{m_t}{1-\\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1-\\beta_2^t}"
    },
    {
     "t": "math",
     "tex": "\\theta \\leftarrow \\theta - \\frac{\\alpha}{\\sqrt{\\hat{v}_t}+\\epsilon}\\hat{m}_t"
    },
    {
     "t": "p",
     "text": "Defaults: \\(\\beta_1=0.9\\), \\(\\beta_2=0.999\\), \\(\\epsilon=10^{-8}\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is the learning rate schedule and common strategies?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Step decay:** Reduce LR by factor γ every N epochs.",
      "**Cosine annealing:** LR follows cosine curve from \\(\\alpha_{max}\\) to \\(\\alpha_{min}\\).",
      "**Warmup + decay:** Linear increase then decay (common in Transformers).",
      "**Reduce on plateau:** Reduce when validation loss stops improving.",
      "**Cyclical LR:** Oscillates between bounds — escapes local minima."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "126",
   "q": "What is the vanishing/exploding gradient problem in classical ML?",
   "body": [
    {
     "t": "p",
     "text": "In deep models, gradients are products of many partial derivatives. If Jacobians < 1 repeatedly → gradients shrink to zero (vanishing). If > 1 → explode. Primarily affects RNNs and very deep networks. Fixed by normalization, gradient clipping, and skip connections."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is feature scaling and why does it matter for gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "Without scaling, features with large ranges dominate the gradient and the loss surface becomes elongated — gradient descent zigzags slowly. StandardScaler or MinMaxScaler creates symmetric loss contours for faster convergence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is the saddle point problem in optimization?",
   "body": [
    {
     "t": "p",
     "text": "A point where the gradient is zero but is neither a local min nor max (curvature is positive in some directions, negative in others). In high-dimensional spaces, saddle points are far more common than local minima. First-order methods can escape via noise in SGD."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is line search in optimization?",
   "body": [
    {
     "t": "p",
     "text": "After computing the gradient direction, find the optimal step size along that direction:"
    },
    {
     "t": "ul",
     "items": [
      "**Exact:** Minimize loss along direction analytically (expensive).",
      "**Backtracking / Armijo:** Start with large step, reduce until sufficient decrease condition is met."
     ]
    },
    {
     "t": "p",
     "text": "Used in L-BFGS and coordinate descent methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is coordinate descent?",
   "body": [
    {
     "t": "p",
     "text": "Optimize one parameter at a time while holding others fixed. Efficient when each 1D minimization has a closed form (e.g., Lasso via soft thresholding). Used in sklearn's `LinearRegression` with `solver=\"coordinate_descent\"` for Lasso."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is the difference between convex and non-convex optimization in ML?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Convex:** Any local minimum is global. Guaranteed convergence to optimal. Linear/Logistic regression with L2 loss.",
      "**Non-convex:** Multiple local minima. Neural networks, matrix factorization. No guarantee of global opt — but practical results are often very good."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is subgradient descent used for?",
   "body": [
    {
     "t": "p",
     "text": "For non-differentiable loss functions (e.g., hinge loss in SVM, L1 regularization). A subgradient is any element of the subdifferential. Convergence is slower than smooth gradient descent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is proximal gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "Handles regularized objectives by splitting into smooth + non-smooth parts:"
    },
    {
     "t": "math",
     "tex": "\\theta_{t+1} = \\text{prox}_{\\alpha g}\\!\\left(\\theta_t - \\alpha \\nabla f(\\theta_t)\\right)"
    },
    {
     "t": "p",
     "text": "For Lasso, the prox operator is soft-thresholding:"
    },
    {
     "t": "math",
     "tex": "\\text{prox}(z, \\lambda) = \\text{sign}(z)\\max(|z|-\\lambda, 0)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is the generalization gap and how do training dynamics affect it?",
   "body": [
    {
     "t": "p",
     "text": "Gap between training loss and validation loss. Large gap = overfitting. Affected by:"
    },
    {
     "t": "ul",
     "items": [
      "Learning rate (too high → noisy final solution, poor generalization).",
      "Batch size (smaller batches → flatter minima → better generalization).",
      "Number of epochs (more → overfitting without regularization).",
      "Model capacity vs dataset size."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is double descent in ML?",
   "body": [
    {
     "t": "p",
     "text": "The test error curve shows two U-shapes as model capacity increases. After the classical bias-variance peak (interpolation threshold), adding more capacity paradoxically reduces test error again. Observed in neural networks and other over-parameterized models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is a loss landscape and how does its shape affect training?",
   "body": [
    {
     "t": "p",
     "text": "Visualization of loss as a function of model parameters. Sharp minima generalize poorly (sensitive to perturbations); flat minima generalize better. SGD's noise helps find flatter minima than full-batch gradient descent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "How do you diagnose underfitting vs overfitting from learning curves?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import learning_curve\ntrain_sizes, train_scores, val_scores = learning_curve(estimator, X, y, cv=5)"
    },
    {
     "t": "ul",
     "items": [
      "**Underfitting:** Both curves converge to high error.",
      "**Overfitting:** Large gap between training (low error) and validation (high error) that doesn't close with more data."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is the effect of batch size on generalization?",
   "body": [
    {
     "t": "p",
     "text": "Larger batches → more accurate gradient estimates, faster convergence per epoch BUT often converge to sharper minima (worse generalization). \"Large batch training harm\" — mitigation: increase LR proportionally (linear scaling rule), use LR warmup."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is the Polyak-Ruppert averaging scheme?",
   "body": [
    {
     "t": "p",
     "text": "Average model weights across the last T iterations instead of using the final weights:"
    },
    {
     "t": "math",
     "tex": "\\bar{\\theta} = \\frac{1}{T}\\sum_{t=T_0}^T \\theta_t"
    },
    {
     "t": "p",
     "text": "Often improves generalization and smooths out SGD's noise (implemented as `SWA` — Stochastic Weight Averaging in PyTorch)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is hyperparameter optimization beyond grid search?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Random Search:** Sample random configs; better than grid for high-dimensional spaces.",
      "**Bayesian Optimization:** Use Gaussian Process to model performance surface; prioritize promising regions.",
      "**Hyperband:** Adaptive resource allocation — promote best candidates, early-stop others.",
      "**BOHB:** Combines Bayesian and Hyperband.",
      "Tools: Optuna, Ray Tune, Hyperopt."
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
