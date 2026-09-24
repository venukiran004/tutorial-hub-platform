/* ============================================================================
   INTERVIEW I1.2 — Section 2: Calculus & Optimization
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
 "lede": "**15 questions** from Mathematics and Statistics Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Section 2: Calculus & Optimization",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the gradient and why is it important for ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The gradient \\(\\nabla f(\\mathbf{x})\\) is a vector of partial derivatives pointing in the direction of steepest ascent:"
    },
    {
     "t": "math",
     "tex": "\\nabla f = \\left[\\frac{\\partial f}{\\partial x_1}, \\frac{\\partial f}{\\partial x_2}, \\dots, \\frac{\\partial f}{\\partial x_n}\\right]"
    },
    {
     "t": "p",
     "text": "**In ML:** Gradient descent updates parameters in the direction of steepest descent:"
    },
    {
     "t": "math",
     "tex": "\\theta_{t+1} = \\theta_t - \\eta \\nabla_\\theta \\mathcal{L}(\\theta_t)"
    },
    {
     "t": "p",
     "text": "The gradient's magnitude indicates how sensitive the loss is to each parameter."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Explain the chain rule and its role in backpropagation.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For composed functions \\(f(g(x))\\): \\(\\frac{df}{dx} = \\frac{df}{dg} \\cdot \\frac{dg}{dx}\\)"
    },
    {
     "t": "p",
     "text": "**Backpropagation** is the chain rule applied to a computation graph. For a network with layers \\(z_1, z_2, \\dots, z_L\\):"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\mathcal{L}}{\\partial W_l} = \\frac{\\partial \\mathcal{L}}{\\partial z_L} \\cdot \\frac{\\partial z_L}{\\partial z_{L-1}} \\cdots \\frac{\\partial z_{l+1}}{\\partial z_l} \\cdot \\frac{\\partial z_l}{\\partial W_l}"
    },
    {
     "t": "p",
     "text": "This is computed efficiently by caching intermediate activations (forward pass) and propagating gradients backward."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is a convex function? Why does convexity matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A function \\(f\\) is convex if for all \\(\\mathbf{x}, \\mathbf{y}\\) and \\(\\lambda \\in [0,1]\\):"
    },
    {
     "t": "math",
     "tex": "f(\\lambda\\mathbf{x} + (1-\\lambda)\\mathbf{y}) \\leq \\lambda f(\\mathbf{x}) + (1-\\lambda)f(\\mathbf{y})"
    },
    {
     "t": "p",
     "text": "Equivalently, the Hessian \\(H\\) is positive semi-definite everywhere."
    },
    {
     "t": "p",
     "text": "**Why it matters:**"
    },
    {
     "t": "ul",
     "items": [
      "Convex problems have a **single global minimum** — no local minima traps",
      "Linear regression, logistic regression, SVM (hinge loss) are convex",
      "Neural network losses are **non-convex** — local minima, saddle points",
      "Convex relaxations are used to approximate hard problems"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the Hessian matrix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The Hessian \\(H\\) is the matrix of second-order partial derivatives:"
    },
    {
     "t": "math",
     "tex": "H_{ij} = \\frac{\\partial^2 f}{\\partial x_i \\partial x_j}"
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "**Positive definite \\(H\\)** → local minimum",
      "**Negative definite \\(H\\)** → local maximum",
      "**Indefinite \\(H\\)** → saddle point",
      "Newton's method uses \\(H\\) for faster convergence: \\(\\theta_{t+1} = \\theta_t - H^{-1}\\nabla f\\)",
      "Fisher Information Matrix (expected Hessian of log-likelihood) → natural gradient"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Compare gradient descent variants: SGD, Mini-batch, Adam.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Variant",
      "Update Rule",
      "Pros",
      "Cons"
     ],
     "rows": [
      [
       "**Batch GD**",
       "\\(\\theta \\leftarrow \\theta - \\eta \\nabla \\mathcal{L}(\\text{all data})\\)",
       "Stable convergence",
       "Slow, memory-intensive"
      ],
      [
       "**SGD**",
       "\\(\\theta \\leftarrow \\theta - \\eta \\nabla \\mathcal{L}(x_i)\\)",
       "Fast per step, escapes local minima",
       "Noisy, slow convergence"
      ],
      [
       "**Mini-batch**",
       "\\(\\theta \\leftarrow \\theta - \\eta \\nabla \\mathcal{L}(\\text{batch})\\)",
       "Balance speed/stability",
       "Requires batch size tuning"
      ],
      [
       "**Momentum**",
       "\\(v_t = \\beta v_{t-1} + \\nabla \\mathcal{L}\\); \\(\\theta \\leftarrow \\theta - \\eta v_t\\)",
       "Accelerates convergence",
       "Extra hyperparameter"
      ],
      [
       "**Adam**",
       "Adaptive LR with 1st/2nd moment estimates",
       "Works well out-of-box",
       "May not generalize as well as SGD"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the learning rate and how do you choose it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The learning rate \\(\\eta\\) controls step size in gradient descent. Too large → divergence. Too small → slow convergence."
    },
    {
     "t": "p",
     "text": "**Selection strategies:**"
    },
    {
     "t": "ol",
     "items": [
      "**Learning rate finder:** Increase LR exponentially, plot loss vs LR, pick steepest descent point",
      "**Schedules:** Step decay, cosine annealing, warm-up + decay",
      "**Adaptive methods:** Adam, AdaGrad, RMSProp adjust per-parameter",
      "**Cyclical LR:** Oscillate between bounds (Smith, 2017)"
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** Start with \\(10^{-3}\\) for Adam, \\(10^{-2}\\) for SGD with momentum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Explain the vanishing and exploding gradient problems.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In deep networks with \\(L\\) layers, the gradient at layer \\(l\\) involves a product:"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\mathcal{L}}{\\partial W_l} \\propto \\prod_{k=l}^{L-1} \\frac{\\partial z_{k+1}}{\\partial z_k}"
    },
    {
     "t": "ul",
     "items": [
      "If \\(\\left\\|\\frac{\\partial z_{k+1}}{\\partial z_k}\\right\\| < 1\\) for most \\(k\\) → gradients **vanish** (exponential decay)",
      "If \\(\\left\\|\\frac{\\partial z_{k+1}}{\\partial z_k}\\right\\| > 1\\) for most \\(k\\) → gradients **explode**"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "table",
     "head": [
      "Problem",
      "Solutions"
     ],
     "rows": [
      [
       "Vanishing",
       "ReLU activation, residual connections, LSTM/GRU gates, proper initialization (He, Xavier)"
      ],
      [
       "Exploding",
       "Gradient clipping, batch normalization, lower learning rate"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the Jacobian matrix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a vector-valued function \\(\\mathbf{f}: \\mathbb{R}^n \\to \\mathbb{R}^m\\), the Jacobian is:"
    },
    {
     "t": "math",
     "tex": "J_{ij} = \\frac{\\partial f_i}{\\partial x_j}"
    },
    {
     "t": "p",
     "text": "The Jacobian is the multivariate generalization of the derivative. In neural networks, each layer's Jacobian relates input perturbations to output perturbations. The chain rule in matrix form: \\(J_{\\text{total}} = J_L \\cdot J_{L-1} \\cdots J_1\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What are Lagrange multipliers and KKT conditions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **Lagrange multipliers** solve constrained optimization: minimize \\(f(x)\\) subject to \\(g(x) = 0\\)."
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}(x, \\lambda) = f(x) + \\lambda g(x)"
    },
    {
     "t": "p",
     "text": "Solve \\(\\nabla_x \\mathcal{L} = 0\\) and \\(g(x) = 0\\)."
    },
    {
     "t": "p",
     "text": "**KKT conditions** extend this to inequality constraints (\\(g(x) \\leq 0\\)):"
    },
    {
     "t": "ol",
     "items": [
      "Stationarity: \\(\\nabla f + \\sum \\lambda_i \\nabla g_i = 0\\)",
      "Primal feasibility: \\(g_i(x) \\leq 0\\)",
      "Dual feasibility: \\(\\lambda_i \\geq 0\\)",
      "Complementary slackness: \\(\\lambda_i g_i(x) = 0\\)"
     ]
    },
    {
     "t": "p",
     "text": "**ML relevance:** SVM optimization is solved using KKT conditions. Support vectors are the points where \\(\\lambda_i > 0\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between local and global minima?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Local minimum:** \\(f(x^*) \\leq f(x)\\) for all \\(x\\) in a neighborhood",
      "**Global minimum:** \\(f(x^*) \\leq f(x)\\) for all \\(x\\) in the entire domain"
     ]
    },
    {
     "t": "p",
     "text": "For convex functions, every local minimum is global. Neural network loss surfaces are non-convex but:"
    },
    {
     "t": "ul",
     "items": [
      "Most local minima in high dimensions have similar loss values",
      "Saddle points (not local minima) are the main obstacle",
      "Overparameterized networks often have connected low-loss regions"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Explain Taylor expansion and its use in optimization.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Second-order Taylor expansion around \\(x_0\\):"
    },
    {
     "t": "math",
     "tex": "f(x) \\approx f(x_0) + \\nabla f(x_0)^T (x - x_0) + \\frac{1}{2}(x - x_0)^T H(x_0)(x - x_0)"
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "**Newton's method:** Set gradient of Taylor expansion to 0 → \\(x_{t+1} = x_t - H^{-1}\\nabla f\\)",
      "**Natural gradient:** Uses Fisher information (expected Hessian) instead of \\(H\\)",
      "**Trust region methods:** Optimize Taylor approximation within a trust region",
      "**L-BFGS:** Approximates inverse Hessian from past gradients"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the softmax function and its gradient?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "\\text{softmax}(z_i) = \\frac{e^{z_i}}{\\sum_j e^{z_j}}"
    },
    {
     "t": "p",
     "text": "Properties: outputs sum to 1, all positive — valid probability distribution."
    },
    {
     "t": "p",
     "text": "**Gradient:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\text{softmax}(z_i)}{\\partial z_j} = \\text{softmax}(z_i)(\\delta_{ij} - \\text{softmax}(z_j))"
    },
    {
     "t": "p",
     "text": "Where \\(\\delta_{ij}\\) is the Kronecker delta (1 if \\(i=j\\), 0 otherwise)."
    },
    {
     "t": "p",
     "text": "**Numerical stability:** Subtract \\(\\max(z)\\) before exponentiation: \\(\\text{softmax}(z - \\max(z))\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the cross-entropy loss and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For true distribution \\(p\\) and predicted distribution \\(q\\):"
    },
    {
     "t": "math",
     "tex": "H(p, q) = -\\sum_{i} p_i \\log q_i"
    },
    {
     "t": "p",
     "text": "**Binary cross-entropy:** \\(\\mathcal{L} = -[y\\log(\\hat{y}) + (1-y)\\log(1-\\hat{y})]\\)"
    },
    {
     "t": "p",
     "text": "**Why cross-entropy over MSE for classification:**"
    },
    {
     "t": "ul",
     "items": [
      "Cross-entropy gradient doesn't saturate when predictions are confident but wrong",
      "It's the negative log-likelihood for categorical/Bernoulli distributions",
      "Minimizing CE = maximizing likelihood = minimizing KL divergence"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Explain the relationship between MLE, MAP, and regularization.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MLE:** \\(\\hat{\\theta}_{MLE} = \\arg\\max_\\theta P(D|\\theta)\\) — maximize likelihood",
      "**MAP:** \\(\\hat{\\theta}_{MAP} = \\arg\\max_\\theta P(\\theta|D) = \\arg\\max_\\theta P(D|\\theta)P(\\theta)\\) — add prior"
     ]
    },
    {
     "t": "p",
     "text": "Taking negative log:"
    },
    {
     "t": "ul",
     "items": [
      "MLE → minimize \\(-\\log P(D|\\theta)\\) = loss function alone",
      "MAP with Gaussian prior → minimize \\(\\mathcal{L} + \\lambda\\|\\theta\\|_2^2\\) = **L2 regularization (Ridge)**",
      "MAP with Laplacian prior → minimize \\(\\mathcal{L} + \\lambda\\|\\theta\\|_1\\) = **L1 regularization (Lasso)**"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What are saddle points and why are they problematic?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A saddle point has zero gradient (\\(\\nabla f = 0\\)) but is neither a minimum nor maximum — the Hessian has both positive and negative eigenvalues."
    },
    {
     "t": "p",
     "text": "**Why they're worse than local minima in deep learning:**"
    },
    {
     "t": "ul",
     "items": [
      "In \\(d\\) dimensions, a critical point with \\(k\\) negative eigenvalues is a \\(k\\)-th order saddle point",
      "The probability of all \\(d\\) eigenvalues being positive (true minimum) decreases exponentially with \\(d\\)",
      "Saddle points create plateaus where gradient is near-zero → slow training"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:** Momentum, Adam (adaptive LR escapes plateaus), noise in SGD, negative curvature descent."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
