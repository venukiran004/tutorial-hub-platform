/* ============================================================================
   INTERVIEW I1.8 — Bayesian & Probabilistic ML
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.8",
 "lede": "**15 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Bayesian & Probabilistic ML",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is Bayesian inference?",
   "body": [
    {
     "t": "p",
     "text": "Update beliefs about model parameters given observed data using Bayes' theorem:"
    },
    {
     "t": "math",
     "tex": "P(\\theta | X) = \\frac{P(X | \\theta) \\cdot P(\\theta)}{P(X)}"
    },
    {
     "t": "ul",
     "items": [
      "\\(P(\\theta)\\): Prior — beliefs before data.",
      "\\(P(X|\\theta)\\): Likelihood — probability of data given parameters.",
      "\\(P(\\theta|X)\\): Posterior — updated beliefs."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is the difference between MLE and MAP estimation?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**MLE (Maximum Likelihood Estimation):** Find \\(\\theta\\) maximizing \\(P(X|\\theta)\\). No prior. Prone to overfitting.",
      "**MAP (Maximum A Posteriori):** Find \\(\\theta\\) maximizing \\(P(\\theta|X) \\propto P(X|\\theta)P(\\theta)\\). Equivalent to MLE + regularization (L2 prior = Gaussian, L1 prior = Laplace)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is a Gaussian Process (GP)?",
   "body": [
    {
     "t": "p",
     "text": "A distribution over functions where any finite set of function values follows a multivariate Gaussian distribution. Defined by mean function \\(m(x)\\) and covariance kernel \\(k(x, x')\\). Used for regression with uncertainty estimates, Bayesian optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is the Naive Bayes assumption and when does it fail?",
   "body": [
    {
     "t": "p",
     "text": "Features are conditionally independent given the class: \\(P(x_1,...,x_n|y) = \\prod_i P(x_i|y)\\). Fails when features are correlated (e.g., adjacent pixels in images, word co-occurrences). Despite this \"naive\" assumption, it works surprisingly well for text classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is Bayesian Linear Regression?",
   "body": [
    {
     "t": "p",
     "text": "Places a prior on weights \\(w \\sim \\mathcal{N}(0, \\sigma_p^2 I)\\) and computes the posterior analytically. Returns a distribution over predictions (not a point estimate):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "α = 1/σ_prior², β = 1/σ_noise²\nS_N = (αI + βΦᵀΦ)⁻¹   # Posterior covariance\nm_N = β·S_N·Φᵀ·t        # Posterior mean"
    },
    {
     "t": "p",
     "text": "Provides calibrated uncertainty — variance grows in low-data regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is a Dirichlet distribution and where is it used in ML?",
   "body": [
    {
     "t": "p",
     "text": "The Dirichlet is the conjugate prior to the categorical/multinomial distribution. Used in:"
    },
    {
     "t": "ul",
     "items": [
      "LDA (Latent Dirichlet Allocation) as prior over topic distributions.",
      "Bayesian classification as prior over class probabilities."
     ]
    },
    {
     "t": "p",
     "text": "Parameters \\(\\alpha > 1\\) encourage uniform distributions; \\(\\alpha < 1\\) encourages sparse distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is variational inference?",
   "body": [
    {
     "t": "p",
     "text": "Approximate the true posterior \\(P(\\theta|X)\\) with a simpler distribution \\(q(\\theta)\\) by minimizing KL divergence. Equivalent to maximizing the ELBO (Evidence Lower Bound):"
    },
    {
     "t": "math",
     "tex": "\\text{ELBO} = \\mathbb{E}_q[\\log P(X|\\theta)] - KL(q(\\theta) \\| P(\\theta))"
    },
    {
     "t": "p",
     "text": "Used in VAEs, topic models, and scalable Bayesian DL."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is MCMC (Markov Chain Monte Carlo)?",
   "body": [
    {
     "t": "p",
     "text": "A family of algorithms to sample from the posterior when it's intractable. Constructs a Markov chain whose stationary distribution is the target posterior:"
    },
    {
     "t": "ul",
     "items": [
      "**Metropolis-Hastings:** Accept/reject samples probabilistically.",
      "**Gibbs Sampling:** Sample each variable from its conditional.",
      "**HMC (Hamiltonian MC):** Uses gradient info for efficient sampling."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is Bayesian Optimization and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "Efficiently optimize expensive black-box functions (e.g., hyperparameter tuning):"
    },
    {
     "t": "ol",
     "items": [
      "Fit a surrogate model (GP or TPE) over evaluated configurations.",
      "Use an acquisition function (EI, UCB) to select the next point to evaluate.",
      "Evaluate the objective, update surrogate."
     ]
    },
    {
     "t": "p",
     "text": "Finds good optima in far fewer evaluations than random/grid search."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What is the expected improvement (EI) acquisition function?",
   "body": [
    {
     "t": "math",
     "tex": "EI(x) = \\mathbb{E}[\\max(f(x) - f^*, 0)]"
    },
    {
     "t": "p",
     "text": "Balances exploration (high uncertainty) and exploitation (high predicted value). The point with highest EI is evaluated next. Other acquisition functions: Upper Confidence Bound (UCB), Probability of Improvement (PI)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "151",
   "q": "What is a Bayesian Network?",
   "body": [
    {
     "t": "p",
     "text": "A DAG where nodes are random variables and edges represent conditional dependencies. Joint probability factors as:"
    },
    {
     "t": "math",
     "tex": "P(X_1,...,X_n) = \\prod_i P(X_i | \\text{Parents}(X_i))"
    },
    {
     "t": "p",
     "text": "Used for probabilistic reasoning, causal inference, medical diagnosis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "What is calibration error and how do you measure it?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Expected Calibration Error (ECE):** Weighted average of |confidence - accuracy| across probability bins.",
      "**Maximum Calibration Error (MCE):** Worst bin.",
      "**Reliability diagram:** Plot mean predicted probability vs fraction of positives per bin."
     ]
    },
    {
     "t": "p",
     "text": "A perfectly calibrated model's reliability diagram is the diagonal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "What is Platt scaling?",
   "body": [
    {
     "t": "p",
     "text": "Post-hoc calibration: fit a logistic regression on a held-out set using raw model scores as input:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.calibration import CalibratedClassifierCV\ncal_model = CalibratedClassifierCV(base_model, method=\"sigmoid\", cv=5)\ncal_model.fit(X, y)"
    },
    {
     "t": "p",
     "text": "`method=\"isotonic\"` for non-monotone calibration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "What is a Bayesian A/B test vs frequentist A/B test?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Frequentist:** Computes p-value and requires pre-defined sample size; no \"peeking\" rule.",
      "**Bayesian:** Computes P(B > A) directly from posterior. Can stop early, incorporates priors, and gives probability statements rather than binary reject/fail-to-reject."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "What is Thompson Sampling?",
   "body": [
    {
     "t": "p",
     "text": "A Bayesian exploration strategy for multi-armed bandits: sample one reward estimate from each arm's posterior, then choose the arm with highest sample. Over time, posteriors tighten around true means — naturally balances exploration and exploitation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
