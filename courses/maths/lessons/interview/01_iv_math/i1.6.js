/* ============================================================================
   INTERVIEW I1.6 — Section 6: Applied Math for ML
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.6",
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
   "text": "Section 6: Applied Math for ML",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the bias-variance tradeoff?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a model predicting \\(y = f(x) + \\epsilon\\):"
    },
    {
     "t": "math",
     "tex": "\\text{MSE} = \\text{Bias}^2 + \\text{Variance} + \\text{Irreducible Noise}"
    },
    {
     "t": "ul",
     "items": [
      "**Bias:** Error from simplifying assumptions (\\(E[\\hat{f}] - f\\))",
      "**Variance:** Error from sensitivity to training data fluctuations"
     ]
    },
    {
     "t": "table",
     "head": [
      "High Bias",
      "High Variance"
     ],
     "rows": [
      [
       "Underfitting",
       "Overfitting"
      ],
      [
       "Simple models (linear)",
       "Complex models (deep NN, unpruned trees)"
      ],
      [
       "Fix: More features, complex model",
       "Fix: More data, regularization, dropout"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "Explain L1 vs L2 regularization mathematically.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**L1 (Lasso):** \\(\\mathcal{L}_{\\text{reg}} = \\mathcal{L} + \\lambda \\sum_j |\\theta_j|\\)",
      "— Gradient: \\(\\text{sign}(\\theta_j)\\) — constant push toward zero → exact zeros → **sparsity**"
     ]
    },
    {
     "t": "ul",
     "items": [
      "**L2 (Ridge):** \\(\\mathcal{L}_{\\text{reg}} = \\mathcal{L} + \\lambda \\sum_j \\theta_j^2\\)",
      "— Gradient: \\(2\\theta_j\\) — proportional push toward zero → **shrinkage but not zero**"
     ]
    },
    {
     "t": "p",
     "text": "**Geometric view:** L1's diamond-shaped constraint set has corners on axes (parameters hit zero). L2's circular constraint set doesn't."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is information gain and how is it used in decision trees?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "\\text{IG}(S, A) = H(S) - \\sum_{v \\in \\text{values}(A)} \\frac{|S_v|}{|S|} H(S_v)"
    },
    {
     "t": "p",
     "text": "Where \\(H(S) = -\\sum p_i \\log_2 p_i\\) is entropy."
    },
    {
     "t": "p",
     "text": "Information gain measures the reduction in entropy after splitting on attribute \\(A\\). Decision trees greedily select the attribute with highest IG at each node."
    },
    {
     "t": "p",
     "text": "**Alternatives:** Gini impurity (CART): \\(G = 1 - \\sum p_i^2\\) — computationally simpler, similar results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the Kullback-Leibler divergence in the context of neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In neural networks, KL divergence appears in:"
    },
    {
     "t": "ol",
     "items": [
      "**VAE loss:** \\(\\mathcal{L} = \\text{reconstruction} + D_{KL}(q(z|x) \\| p(z))\\) — regularizes latent space toward \\(\\mathcal{N}(0,1)\\)",
      "**Knowledge distillation:** Student network minimizes KL from teacher's soft labels",
      "**PPO/TRPO:** Constrains policy updates: \\(D_{KL}(\\pi_{\\text{old}} \\| \\pi_{\\text{new}}) < \\delta\\)",
      "**Mutual information:** \\(I(X;Y) = D_{KL}(P(X,Y) \\| P(X)P(Y))\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the Mahalanobis distance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "D_M(\\mathbf{x}) = \\sqrt{(\\mathbf{x} - \\mu)^T \\Sigma^{-1} (\\mathbf{x} - \\mu)}"
    },
    {
     "t": "p",
     "text": "Unlike Euclidean distance, Mahalanobis distance accounts for correlations and different scales in the data."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "Anomaly/outlier detection (large \\(D_M\\) = unusual point)",
      "Cluster assignment in GMMs",
      "Multivariate hypothesis testing (Hotelling's \\(T^2\\))"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "Explain the relationship between entropy, cross-entropy, and KL divergence.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "H(P, Q) = H(P) + D_{KL}(P \\| Q)"
    },
    {
     "t": "ul",
     "items": [
      "\\(H(P)\\): Entropy of true distribution — fixed, irreducible uncertainty",
      "\\(D_{KL}(P\\|Q)\\): Extra bits needed because we use \\(Q\\) instead of \\(P\\)",
      "\\(H(P, Q)\\): Total bits needed to encode data from \\(P\\) using code from \\(Q\\)"
     ]
    },
    {
     "t": "p",
     "text": "Since \\(H(P)\\) is constant during training, minimizing cross-entropy = minimizing KL divergence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the Fisher Information Matrix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{I}(\\theta)_{ij} = -E\\left[\\frac{\\partial^2 \\log P(X|\\theta)}{\\partial \\theta_i \\partial \\theta_j}\\right]"
    },
    {
     "t": "p",
     "text": "The Fisher Information measures how much information data carries about parameters:"
    },
    {
     "t": "ul",
     "items": [
      "**Cramér-Rao bound:** \\(\\text{Var}(\\hat{\\theta}) \\geq \\mathcal{I}(\\theta)^{-1}\\) — lower bound on estimator variance",
      "**Natural gradient:** \\(\\theta_{t+1} = \\theta_t - \\eta \\mathcal{I}^{-1} \\nabla \\mathcal{L}\\) — invariant to parameterization",
      "**EWC (Elastic Weight Consolidation):** Uses Fisher to identify important weights for continual learning"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the EM algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Expectation-Maximization finds MLE when data has latent variables:"
    },
    {
     "t": "ol",
     "items": [
      "**E-step:** Compute expected value of latent variables given current parameters \\(Q(\\theta | \\theta^{(t)}) = E_{Z|X,\\theta^{(t)}}[\\log P(X, Z | \\theta)]\\)"
     ]
    },
    {
     "t": "ol",
     "items": [
      "**M-step:** Maximize \\(Q\\) with respect to \\(\\theta\\) \\(\\theta^{(t+1)} = \\arg\\max_\\theta Q(\\theta | \\theta^{(t)})\\)"
     ]
    },
    {
     "t": "p",
     "text": "**Applications:** GMM fitting, hidden Markov models, matrix factorization, missing data imputation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the curse of dimensionality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As dimensions increase:"
    },
    {
     "t": "ul",
     "items": [
      "Volume of space grows exponentially → data becomes sparse",
      "Distance between nearest and farthest neighbors converges → distance metrics lose meaning",
      "Number of samples needed grows exponentially to maintain density"
     ]
    },
    {
     "t": "p",
     "text": "**Impact on ML:**"
    },
    {
     "t": "ul",
     "items": [
      "KNN fails in high dimensions",
      "Kernel density estimation breaks down",
      "Need dimensionality reduction (PCA, t-SNE, UMAP)"
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** Need \\(O(10^d)\\) samples for \\(d\\) dimensions (for uniform coverage)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is mutual information?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "I(X;Y) = \\sum_{x,y} P(x,y) \\log \\frac{P(x,y)}{P(x)P(y)} = H(X) - H(X|Y) = D_{KL}(P(X,Y) \\| P(X)P(Y))"
    },
    {
     "t": "p",
     "text": "Measures how much knowing \\(Y\\) reduces uncertainty about \\(X\\). Unlike correlation, captures nonlinear dependencies."
    },
    {
     "t": "p",
     "text": "**ML uses:** Feature selection (select features with high MI with target), InfoGAN, MINE (Mutual Information Neural Estimation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the Gini coefficient/impurity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "G = 1 - \\sum_{i=1}^k p_i^2"
    },
    {
     "t": "p",
     "text": "Where \\(p_i\\) is the proportion of class \\(i\\)."
    },
    {
     "t": "ul",
     "items": [
      "\\(G = 0\\): Pure node (all one class)",
      "\\(G = 0.5\\): Maximum impurity for binary (50-50 split)"
     ]
    },
    {
     "t": "p",
     "text": "Used in CART decision trees. Compared to entropy, Gini is computationally cheaper and behaves similarly in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the Frobenius norm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "\\|A\\|_F = \\sqrt{\\sum_{ij} A_{ij}^2} = \\sqrt{\\text{tr}(A^T A)} = \\sqrt{\\sum_i \\sigma_i^2}"
    },
    {
     "t": "p",
     "text": "Matrix analogue of the L2 vector norm. Used in:"
    },
    {
     "t": "ul",
     "items": [
      "Low-rank matrix approximation (minimize \\(\\|A - \\hat{A}\\|_F\\))",
      "Weight decay in neural networks",
      "Nuclear norm regularization (sum of singular values — convex relaxation of rank)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "Explain the reparameterization trick in VAEs.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In VAEs, we need gradients through sampling from \\(z \\sim \\mathcal{N}(\\mu, \\sigma^2)\\). But sampling is non-differentiable."
    },
    {
     "t": "p",
     "text": "**Trick:** Sample \\(\\epsilon \\sim \\mathcal{N}(0, 1)\\), then \\(z = \\mu + \\sigma \\cdot \\epsilon\\)."
    },
    {
     "t": "p",
     "text": "Now the gradient flows through \\(\\mu\\) and \\(\\sigma\\) (deterministic operations), while the randomness is in \\(\\epsilon\\) (independent of parameters)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the Lipschitz constant and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A function \\(f\\) is \\(L\\)-Lipschitz if \\(\\|f(x) - f(y)\\| \\leq L\\|x - y\\|\\) for all \\(x, y\\)."
    },
    {
     "t": "p",
     "text": "**ML relevance:**"
    },
    {
     "t": "ul",
     "items": [
      "**WGAN:** Discriminator must be 1-Lipschitz (enforced by weight clipping or gradient penalty)",
      "**Robustness:** Small Lipschitz constant → small input perturbations cause small output changes",
      "**Generalization:** Lipschitz constraint bounds generalization gap",
      "**Spectral normalization:** Divides weights by spectral norm to enforce Lipschitz"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the difference between convex optimization and non-convex optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Property",
      "Convex",
      "Non-convex"
     ],
     "rows": [
      [
       "Local optima",
       "Only one (= global)",
       "Many local optima"
      ],
      [
       "Saddle points",
       "None",
       "Common in high dimensions"
      ],
      [
       "Guarantees",
       "Global convergence",
       "Only local convergence"
      ],
      [
       "Examples",
       "Linear/logistic regression, SVM",
       "Neural networks, matrix factorization"
      ],
      [
       "Algorithms",
       "Gradient descent, interior point",
       "SGD + momentum, Adam, LBFGS"
      ],
      [
       "Speed",
       "Polynomial time",
       "NP-hard in general"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Practical insight:** Despite non-convexity, neural networks train well because:"
    },
    {
     "t": "ol",
     "items": [
      "Overparameterization creates connected low-loss regions",
      "SGD noise helps escape bad local minima",
      "Most critical points in high dimensions are saddle points, not local minima"
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
