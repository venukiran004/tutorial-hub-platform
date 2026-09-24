/* ============================================================================
   INTERVIEW I1.3 — Section 3: Probability
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
 "lede": "**20 questions** from Mathematics and Statistics Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Section 3: Probability",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "State and explain Bayes' theorem.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}"
    },
    {
     "t": "ul",
     "items": [
      "\\(P(A|B)\\): **Posterior** — updated belief after observing evidence \\(B\\)",
      "\\(P(B|A)\\): **Likelihood** — probability of evidence given hypothesis",
      "\\(P(A)\\): **Prior** — initial belief",
      "\\(P(B)\\): **Evidence (marginal likelihood)** — normalizing constant"
     ]
    },
    {
     "t": "p",
     "text": "**ML applications:** Naive Bayes classifier, Bayesian optimization, posterior inference, spam filtering."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is the difference between frequentist and Bayesian probability?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Frequentist",
      "Bayesian"
     ],
     "rows": [
      [
       "Definition",
       "Long-run frequency of events",
       "Degree of belief"
      ],
      [
       "Parameters",
       "Fixed but unknown",
       "Random variables with distributions"
      ],
      [
       "Inference",
       "Point estimates + confidence intervals",
       "Posterior distributions"
      ],
      [
       "Prior info",
       "Not used",
       "Explicitly modeled"
      ],
      [
       "Typical output",
       "\\(\\hat{\\theta}, p\\)-value",
       "\\(P(\\theta | \\text{data})\\), credible intervals"
      ],
      [
       "Overfitting",
       "Regularization as add-on",
       "Priors naturally regularize"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Explain the Central Limit Theorem (CLT).",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** If \\(X_1, X_2, \\dots, X_n\\) are i.i.d. with mean \\(\\mu\\) and variance \\(\\sigma^2\\), then as \\(n \\to \\infty\\):"
    },
    {
     "t": "math",
     "tex": "\\bar{X}_n = \\frac{1}{n}\\sum X_i \\xrightarrow{d} \\mathcal{N}\\left(\\mu, \\frac{\\sigma^2}{n}\\right)"
    },
    {
     "t": "p",
     "text": "**Practical implications:**"
    },
    {
     "t": "ul",
     "items": [
      "Sample means are approximately normal for \\(n \\geq 30\\) (rule of thumb)",
      "Justifies confidence intervals and hypothesis tests",
      "Explains why Gaussian noise models work well in many ML settings",
      "**Exceptions:** Heavy-tailed distributions (Cauchy) — CLT doesn't apply"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the Law of Large Numbers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Weak LLN:** \\(\\bar{X}_n \\xrightarrow{P} \\mu\\) (converges in probability)",
      "**Strong LLN:** \\(\\bar{X}_n \\xrightarrow{a.s.} \\mu\\) (almost sure convergence)"
     ]
    },
    {
     "t": "p",
     "text": "As sample size grows, the sample mean converges to the true mean. This justifies:"
    },
    {
     "t": "ul",
     "items": [
      "Using empirical averages to estimate expectations",
      "Monte Carlo methods",
      "SGD converging to the true gradient in expectation"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Compare common probability distributions and their ML uses.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Distribution",
      "Parameters",
      "ML Use Case"
     ],
     "rows": [
      [
       "Bernoulli",
       "\\(p\\)",
       "Binary classification, coin flip"
      ],
      [
       "Binomial",
       "\\(n, p\\)",
       "Count of successes in \\(n\\) trials"
      ],
      [
       "Poisson",
       "\\(\\lambda\\)",
       "Event counts (clicks, arrivals)"
      ],
      [
       "Gaussian",
       "\\(\\mu, \\sigma^2\\)",
       "Regression residuals, latent spaces (VAE)"
      ],
      [
       "Exponential",
       "\\(\\lambda\\)",
       "Time between events, survival analysis"
      ],
      [
       "Beta",
       "\\(\\alpha, \\beta\\)",
       "Bayesian prior for probabilities"
      ],
      [
       "Dirichlet",
       "\\(\\alpha_1, \\dots, \\alpha_k\\)",
       "Prior for categorical distributions (LDA)"
      ],
      [
       "Gamma",
       "\\(\\alpha, \\beta\\)",
       "Prior for precision/rate parameters"
      ],
      [
       "Categorical",
       "\\(p_1, \\dots, p_k\\)",
       "Multi-class classification"
      ],
      [
       "Uniform",
       "\\(a, b\\)",
       "Random initialization, exploration"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is conditional probability? Explain with an ML example.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \\(P(A|B) = \\frac{P(A \\cap B)}{P(B)}\\)"
    },
    {
     "t": "p",
     "text": "**Example — Spam filter:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(P(\\text{spam}|\\text{\"free\"}) = \\frac{P(\\text{\"free\"}|\\text{spam}) \\cdot P(\\text{spam})}{P(\\text{\"free\"})}\\)",
      "If 80% of spam emails contain \"free\", 5% of all emails are spam, and 10% of all emails contain \"free\":",
      "\\(P(\\text{spam}|\\text{\"free\"}) = \\frac{0.80 \\times 0.05}{0.10} = 0.40\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the difference between joint, marginal, and conditional distributions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Joint:** \\(P(X, Y)\\) — probability of \\(X\\) and \\(Y\\) together",
      "**Marginal:** \\(P(X) = \\sum_y P(X, Y=y)\\) — integrate/sum out the other variable",
      "**Conditional:** \\(P(Y|X) = \\frac{P(X, Y)}{P(X)}\\)"
     ]
    },
    {
     "t": "p",
     "text": "**Relationship:** \\(P(X, Y) = P(Y|X) \\cdot P(X) = P(X|Y) \\cdot P(Y)\\)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is independence vs conditional independence?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Independence:** \\(P(A, B) = P(A) \\cdot P(B)\\) — knowing \\(A\\) tells you nothing about \\(B\\)",
      "**Conditional independence:** \\(P(A, B|C) = P(A|C) \\cdot P(B|C)\\) — given \\(C\\), \\(A\\) and \\(B\\) are independent"
     ]
    },
    {
     "t": "p",
     "text": "**ML relevance:** Naive Bayes assumes features are conditionally independent given the class. Markov property: \\(P(X_t | X_{t-1}, X_{t-2}, \\dots) = P(X_t | X_{t-1})\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Explain the concept of expectation, variance, and covariance.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Expectation:** \\(E[X] = \\sum x \\cdot P(x)\\) or \\(\\int x \\cdot f(x)\\,dx\\) — the \"average\" value",
      "**Variance:** \\(\\text{Var}(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2\\) — spread",
      "**Covariance:** \\(\\text{Cov}(X, Y) = E[(X-\\mu_X)(Y-\\mu_Y)]\\) — linear relationship",
      "**Correlation:** \\(\\rho_{XY} = \\frac{\\text{Cov}(X,Y)}{\\sigma_X \\sigma_Y} \\in [-1, 1]\\) — normalized covariance"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between PDF, PMF, and CDF?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PMF (discrete):** \\(P(X = x)\\) — probability at each point, sums to 1",
      "**PDF (continuous):** \\(f(x)\\) where \\(P(a \\leq X \\leq b) = \\int_a^b f(x)\\,dx\\) — density, not probability",
      "**CDF:** \\(F(x) = P(X \\leq x)\\) — cumulative probability, non-decreasing from 0 to 1"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the maximum likelihood estimation (MLE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** MLE finds parameters that maximize the probability of observed data:"
    },
    {
     "t": "math",
     "tex": "\\hat{\\theta}_{MLE} = \\arg\\max_\\theta \\prod_{i=1}^n P(x_i | \\theta) = \\arg\\max_\\theta \\sum_{i=1}^n \\log P(x_i | \\theta)"
    },
    {
     "t": "p",
     "text": "**Example — Gaussian:** \\(\\hat{\\mu}_{MLE} = \\bar{x}\\), \\(\\hat{\\sigma}^2_{MLE} = \\frac{1}{n}\\sum(x_i - \\bar{x})^2\\)"
    },
    {
     "t": "p",
     "text": "**Properties:** Consistent, asymptotically efficient, asymptotically normal. But can overfit with small data (no regularization)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the KL divergence?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** KL divergence measures how one distribution \\(Q\\) differs from a reference \\(P\\):"
    },
    {
     "t": "math",
     "tex": "D_{KL}(P \\| Q) = \\sum_x P(x) \\log \\frac{P(x)}{Q(x)}"
    },
    {
     "t": "p",
     "text": "**Properties:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(D_{KL} \\geq 0\\) (Gibbs' inequality)",
      "\\(D_{KL}(P \\| Q) \\neq D_{KL}(Q \\| P)\\) — not symmetric (not a true distance)",
      "Minimizing cross-entropy = minimizing KL divergence (since \\(H(P, Q) = H(P) + D_{KL}(P\\|Q)\\))"
     ]
    },
    {
     "t": "p",
     "text": "**ML uses:** VAE loss (ELBO), knowledge distillation, policy optimization (PPO/TRPO)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Explain the difference between generative and discriminative models.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Generative",
      "Discriminative"
     ],
     "rows": [
      [
       "Models",
       "\\(P(X, Y)\\) or \\(P(X|Y)\\)",
       "\\(P(Y|X)\\) directly"
      ],
      [
       "Examples",
       "Naive Bayes, GMM, VAE, GAN",
       "Logistic regression, SVM, neural nets"
      ],
      [
       "Can generate data?",
       "Yes",
       "No"
      ],
      [
       "Typically better with",
       "Small data + strong priors",
       "Large data"
      ],
      [
       "Handles missing features?",
       "Yes (marginalize)",
       "Poorly"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the entropy of a distribution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "H(X) = -\\sum_x P(x) \\log P(x)"
    },
    {
     "t": "ul",
     "items": [
      "Measures **uncertainty/information content**",
      "Maximum when distribution is uniform",
      "Minimum (0) when outcome is deterministic",
      "Measured in bits (log base 2) or nats (natural log)"
     ]
    },
    {
     "t": "p",
     "text": "**ML uses:** Information gain in decision trees, cross-entropy loss, maximum entropy models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What are conjugate priors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A prior is conjugate to a likelihood if the posterior has the same distributional family as the prior."
    },
    {
     "t": "table",
     "head": [
      "Likelihood",
      "Conjugate Prior",
      "Posterior"
     ],
     "rows": [
      [
       "Bernoulli/Binomial",
       "Beta",
       "Beta"
      ],
      [
       "Poisson",
       "Gamma",
       "Gamma"
      ],
      [
       "Gaussian (known \\(\\sigma\\))",
       "Gaussian",
       "Gaussian"
      ],
      [
       "Categorical",
       "Dirichlet",
       "Dirichlet"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Advantage:** Closed-form posterior — no MCMC needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the difference between sampling and inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Inference:** Computing posterior \\(P(\\theta|D)\\) analytically or approximately",
      "**Sampling:** Drawing random samples from a distribution"
     ]
    },
    {
     "t": "p",
     "text": "**When exact inference is intractable:**"
    },
    {
     "t": "ul",
     "items": [
      "**MCMC** (Metropolis-Hastings, Gibbs): Sample from posterior",
      "**Variational inference:** Approximate posterior with simpler distribution",
      "**Rejection sampling, importance sampling:** Weighted sampling techniques"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "Explain the Gaussian (Normal) distribution and why it appears everywhere.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)"
    },
    {
     "t": "p",
     "text": "**Why it's everywhere:**"
    },
    {
     "t": "ol",
     "items": [
      "**CLT:** Sum of many independent random variables → Gaussian",
      "**Maximum entropy:** Given mean and variance, Gaussian has maximum entropy (least assumptions)",
      "**Tractability:** Closed-form marginals, conditionals, products",
      "**Conjugacy:** Gaussian prior + Gaussian likelihood → Gaussian posterior"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the multivariate Gaussian?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "p(\\mathbf{x}) = \\frac{1}{(2\\pi)^{d/2}|\\Sigma|^{1/2}} \\exp\\left(-\\frac{1}{2}(\\mathbf{x}-\\mu)^T\\Sigma^{-1}(\\mathbf{x}-\\mu)\\right)"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\mu\\): Mean vector (\\(d\\)-dimensional)",
      "\\(\\Sigma\\): Covariance matrix (\\(d \\times d\\), symmetric PSD)",
      "\\(\\Sigma^{-1}\\): Precision matrix"
     ]
    },
    {
     "t": "p",
     "text": "**ML uses:** GMMs, Gaussian processes, VAE latent space, Mahalanobis distance for anomaly detection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the Poisson distribution and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}"
    },
    {
     "t": "p",
     "text": "Models count of events in a fixed interval when events occur independently at rate \\(\\lambda\\)."
    },
    {
     "t": "p",
     "text": "**Uses:** Website visits per hour, number of clicks on an ad, defect counts, event-driven predictions. Mean = Variance = \\(\\lambda\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the Beta distribution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "math",
     "tex": "f(x; \\alpha, \\beta) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha, \\beta)}, \\quad x \\in [0,1]"
    },
    {
     "t": "p",
     "text": "A distribution over probabilities. Mean = \\(\\frac{\\alpha}{\\alpha+\\beta}\\)."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "Bayesian prior for Bernoulli parameter (e.g., conversion rate)",
      "A/B testing: \\(\\text{Beta}(\\alpha + \\text{successes}, \\beta + \\text{failures})\\)",
      "Thompson sampling in bandits"
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
