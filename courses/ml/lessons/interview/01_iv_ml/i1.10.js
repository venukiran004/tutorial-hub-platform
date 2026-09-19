/* ============================================================================
   INTERVIEW I1.10 — Fairness, Causality & Advanced Topics
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.10",
 "lede": "**26 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Fairness, Causality & Advanced Topics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "176",
   "q": "What is algorithmic bias and how do you measure it?",
   "body": [
    {
     "t": "p",
     "text": "Systematic unfair outcomes against certain groups:"
    },
    {
     "t": "ul",
     "items": [
      "**Demographic parity:** \\(P(\\hat{Y}=1|A=0) = P(\\hat{Y}=1|A=1)\\) — equal positive prediction rates.",
      "**Equal opportunity:** Equal true positive rates across groups.",
      "**Equalized odds:** Equal TPR and FPR across groups.",
      "**Calibration:** Equal calibration across groups."
     ]
    },
    {
     "t": "p",
     "text": "Tools: Fairlearn, AIF360."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "What is the impossibility theorem in ML fairness?",
   "body": [
    {
     "t": "p",
     "text": "It is mathematically impossible to simultaneously satisfy all fairness criteria (demographic parity, equal opportunity, calibrated predictions) when base rates differ across groups (Chouldechova 2017, Kleinberg et al. 2016). You must choose which fairness criterion matters most for the specific use case."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "What is causal inference and how does it differ from standard ML?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Standard ML:** Learns correlations P(Y|X) — \"what is the prediction?\"",
      "**Causal inference:** Estimates interventional distributions P(Y|do(X=x)) — \"what happens if we change X?\""
     ]
    },
    {
     "t": "p",
     "text": "Correlation ≠ causation. Required for: policy decisions, A/B test analysis, treatment effect estimation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "What is a directed acyclic graph (DAG) in causality?",
   "body": [
    {
     "t": "p",
     "text": "Encodes causal assumptions: nodes = variables, edges = direct causal effects. Used to identify confounders, determine adjustment sets (backdoor criterion), and derive identification formulas for causal effects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "What is the Potential Outcomes Framework (Rubin Causal Model)?",
   "body": [
    {
     "t": "math",
     "tex": "\\text{ATE} = \\mathbb{E}[Y(1) - Y(0)]"
    },
    {
     "t": "p",
     "text": "\\(Y(1)\\) = outcome if treated, \\(Y(0)\\) = outcome if untreated. The fundamental problem: we can only observe one. Estimation methods: RCT, matching, IPW, DID, instrumental variables, regression discontinuity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "What is propensity score matching?",
   "body": [
    {
     "t": "p",
     "text": "Estimate the propensity score \\(e(x) = P(T=1|X=x)\\) (probability of treatment given covariates). Match treated and control units with similar propensity scores to reduce confounding bias in observational studies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "What is uplift modeling (heterogeneous treatment effect estimation)?",
   "body": [
    {
     "t": "p",
     "text": "Predict the causal effect of a treatment on an individual (not just on average):"
    },
    {
     "t": "math",
     "tex": "\\tau(x) = \\mathbb{E}[Y(1) - Y(0) | X=x]"
    },
    {
     "t": "p",
     "text": "Methods: S-Learner, T-Learner, X-Learner, causal forests (GRF). Used in marketing targeting — treat customers who would be positively influenced, not those who would buy anyway."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "What is federated learning?",
   "body": [
    {
     "t": "p",
     "text": "Training ML models across distributed devices without centralizing data:"
    },
    {
     "t": "ol",
     "items": [
      "Server sends global model to devices.",
      "Each device trains locally on private data.",
      "Devices send gradients/model updates (not data) to server.",
      "Server aggregates (FedAvg) and sends updated global model."
     ]
    },
    {
     "t": "p",
     "text": "Used by: mobile keyboards, healthcare, banking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "What is differential privacy and how does it apply to ML?",
   "body": [
    {
     "t": "p",
     "text": "Provides formal privacy guarantees: any individual's data has bounded influence on model outputs. Adding carefully calibrated Gaussian/Laplace noise to gradients (DP-SGD). Quantified by privacy budget \\(\\epsilon\\) — lower = more private but less accurate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "What is active learning?",
   "body": [
    {
     "t": "p",
     "text": "Query the human labeler only for the most informative unlabeled examples:"
    },
    {
     "t": "ul",
     "items": [
      "**Uncertainty sampling:** Query instances where the model is most uncertain.",
      "**Diversity sampling (core-set):** Query diverse representative examples.",
      "**Expected Model Change:** Query instances that would most change the model."
     ]
    },
    {
     "t": "p",
     "text": "Reduces labeling cost dramatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "186",
   "q": "What is semi-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "Use large amounts of unlabeled data together with small amounts of labeled data:"
    },
    {
     "t": "ul",
     "items": [
      "**Pseudo-labeling:** Train on labeled data, predict on unlabeled, add high-confidence predictions as labels, retrain.",
      "**Label spreading/Label propagation:** Propagate labels through a graph of similar examples.",
      "**Self-training:** Iterative pseudo-labeling."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "What is transfer learning in traditional ML?",
   "body": [
    {
     "t": "p",
     "text": "Reuse features or model components learned on a source task for a related target task. In non-deep ML:"
    },
    {
     "t": "ul",
     "items": [
      "Use pretrained embeddings (word2vec, fastText) as features.",
      "Fine-tune a decision tree on a new dataset using a pre-built ensemble as a starting point.",
      "Domain adaptation via importance weighting (CORAL, MMD)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "What is multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "Train a single model on multiple related tasks simultaneously. Shared representations generalize better than task-specific models:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Multi-output regressor\nfrom sklearn.multioutput import MultiOutputRegressor\nmodel = MultiOutputRegressor(RandomForestRegressor())\nmodel.fit(X, Y)  # Y has multiple target columns"
    },
    {
     "t": "p",
     "text": "Reduces overfitting when tasks are related."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "What is out-of-distribution (OOD) detection?",
   "body": [
    {
     "t": "p",
     "text": "Detect when a model receives inputs very different from its training distribution — critical for safe deployment. Methods:"
    },
    {
     "t": "ul",
     "items": [
      "Confidence thresholding.",
      "Mahalanobis distance from training feature distribution.",
      "Deep ensembles' disagreement.",
      "Energy-based models."
     ]
    },
    {
     "t": "p",
     "text": "Tools: Evidential Deep Learning, OpenMax."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "What is conformal prediction?",
   "body": [
    {
     "t": "p",
     "text": "A distribution-free framework for uncertainty quantification. Produces prediction sets (not just point predictions) with guaranteed coverage:"
    },
    {
     "t": "math",
     "tex": "P(Y_{n+1} \\in C(X_{n+1})) \\geq 1 - \\alpha"
    },
    {
     "t": "p",
     "text": "For any significance level \\(\\alpha\\), the true label is in the set at least \\((1-\\alpha)\\)% of the time without strong distributional assumptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "What is concept learning vs inductive learning?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Concept learning:** Learn a Boolean function (concept) from positive and negative examples.",
      "**Inductive learning:** Generalize from specific examples to a general rule."
     ]
    },
    {
     "t": "p",
     "text": "Both underlie supervised learning but concept learning refers to the classical AI framing of classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "What is PAC learning (Probably Approximately Correct)?",
   "body": [
    {
     "t": "p",
     "text": "A framework for analyzing the sample complexity of learning algorithms:"
    },
    {
     "t": "ul",
     "items": [
      "\"Probably\": with probability ≥ 1-δ.",
      "\"Approximately\": error ≤ ε."
     ]
    },
    {
     "t": "p",
     "text": "PAC-learnable = there exists an algorithm that, with poly(1/ε, 1/δ, n) samples, outputs a hypothesis with error ≤ ε. VC dimension bounds sample complexity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "What is the VC dimension?",
   "body": [
    {
     "t": "p",
     "text": "The largest set of points that a hypothesis class can shatter (classify in all 2^n ways). Measures model capacity:"
    },
    {
     "t": "ul",
     "items": [
      "Hyperplanes in \\(\\mathbb{R}^d\\): VC dim = d+1.",
      "Decision stumps: VC dim = 2."
     ]
    },
    {
     "t": "p",
     "text": "High VC dim → more expressive, more data needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "What is Rademacher complexity?",
   "body": [
    {
     "t": "p",
     "text": "A more refined measure of model capacity than VC dimension. Measures how well a hypothesis class fits random noise labels. Lower Rademacher complexity → better generalization guarantees."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "What is neural architecture search (NAS)?",
   "body": [
    {
     "t": "p",
     "text": "Automate the design of neural network architectures:"
    },
    {
     "t": "ul",
     "items": [
      "**Reinforcement Learning NAS:** LSTM controller generates architectures; trained on architecture performance.",
      "**Differentiable NAS (DARTS):** Relax discrete architecture choice to continuous; gradient-based optimization.",
      "**Evolutionary NAS:** Genetic algorithms to evolve architectures."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "What is meta-learning (\"learning to learn\")?",
   "body": [
    {
     "t": "p",
     "text": "Train a model that adapts quickly to new tasks with few examples:"
    },
    {
     "t": "ul",
     "items": [
      "**MAML (Model-Agnostic Meta-Learning):** Find initial weights that are 1 gradient step away from optimal for any new task.",
      "**Prototypical Networks:** Learn embedding space where classes cluster by prototype.",
      "**Meta-training:** Train on distribution of tasks, test on new tasks."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "What is continual learning and catastrophic forgetting?",
   "body": [
    {
     "t": "p",
     "text": "Continual (lifelong) learning: train on a sequence of tasks without forgetting earlier ones. Neural networks overwrite old knowledge when trained on new data — catastrophic forgetting. Solutions:"
    },
    {
     "t": "ul",
     "items": [
      "**EWC (Elastic Weight Consolidation):** Penalize changes to important weights.",
      "**Progressive neural networks:** Add new columns per task.",
      "**Replay buffers:** Store and interleave old data."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "What is the lottery ticket hypothesis?",
   "body": [
    {
     "t": "p",
     "text": "Frankle & Carlin (2019): \"A randomly initialized dense NN contains a sparse subnetwork (lottery ticket) that, when trained in isolation from the original initialization, can match the performance of the full network.\" Implications for pruning and model compression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "What is a multi-label vs multi-class vs multi-output problem?",
   "body": [
    {
     "t": "table",
     "head": [
      "Type",
      "Classes",
      "Labels per instance",
      "Example"
     ],
     "rows": [
      [
       "Binary",
       "2",
       "1",
       "Spam/Not Spam"
      ],
      [
       "Multi-class",
       ">2",
       "1",
       "Iris species"
      ],
      [
       "Multi-label",
       ">2",
       "Multiple",
       "Movie genres"
      ],
      [
       "Multi-output",
       "Multiple targets",
       "1 per target",
       "Predict height and weight"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "How do you approach a completely new ML problem from scratch?",
   "body": [
    {
     "t": "ol",
     "items": [
      "**Define the problem:** Metric, baseline, business value.",
      "**Explore data:** Distributions, missing values, correlations, class balance.",
      "**Establish baseline:** Majority class, simple heuristic.",
      "**Feature engineering:** Domain-driven transformations.",
      "**Model selection:** Start simple (Logistic/RF), then complex.",
      "**Tune:** Bayesian optimization on validation set.",
      "**Evaluate:** Multiple metrics + fairness + calibration.",
      "**Deploy:** Shadow mode → canary → full rollout.",
      "**Monitor:** Drift detection, performance dashboards."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "201",
   "q": "What is the difference between cosine similarity and Euclidean distance? When should you use each?",
   "body": [
    {
     "t": "p",
     "text": "Both quantify how \"close\" two vectors \\(\\mathbf{a},\\mathbf{b}\\in\\mathbb{R}^d\\) are, but along different notions of closeness:"
    },
    {
     "t": "math",
     "tex": "\\cos(\\mathbf{a},\\mathbf{b}) = \\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\|\\mathbf{a}\\|\\,\\|\\mathbf{b}\\|}\\in[-1,1] \\qquad\\qquad d_{L2}(\\mathbf{a},\\mathbf{b})=\\sqrt{\\textstyle\\sum_i (a_i-b_i)^2}\\in[0,\\infty)"
    },
    {
     "t": "ul",
     "items": [
      "**Cosine similarity** measures the **angle** between the vectors — *orientation only*, magnitude-invariant. Same direction → 1 regardless of length. (Cosine *distance* = \\(1-\\cos\\).)",
      "**Euclidean (L2) distance** measures the **straight-line gap** between the points — sensitive to both direction *and* magnitude. Smaller → more similar."
     ]
    },
    {
     "t": "p",
     "text": "**Key relationship** — for **L2-normalized** vectors (\\(\\|\\mathbf{a}\\|=\\|\\mathbf{b}\\|=1\\)) they are monotonically equivalent:"
    },
    {
     "t": "math",
     "tex": "d_{L2}^2 = \\|\\mathbf{a}\\|^2 + \\|\\mathbf{b}\\|^2 - 2\\,\\mathbf{a}\\cdot\\mathbf{b} = 2 - 2\\cos(\\mathbf{a},\\mathbf{b})"
    },
    {
     "t": "p",
     "text": "So on normalized vectors, ranking by **smallest L2 = largest cosine = largest dot product**. This is exactly why vector DBs normalize embeddings and search by fast dot product."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef cosine_similarity(a, b):\n    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n\ndef euclidean_distance(a, b):\n    return np.sqrt(np.sum((a - b) ** 2))\n\na, b = np.array([1., 2., 3.]), np.array([2., 4., 6.])  # b = 2a (same direction)\ncosine_similarity(a, b)   # 1.0   → identical orientation\neuclidean_distance(a, b)  # 3.74  → far apart in magnitude"
    },
    {
     "t": "table",
     "head": [
      "Use **cosine**",
      "Use **Euclidean**"
     ],
     "rows": [
      [
       "Text/embedding semantic search (length ≠ meaning)",
       "Magnitude is meaningful (counts, physical units)"
      ],
      [
       "High-dim sparse data (TF-IDF, bag-of-words)",
       "Low-dim dense geometric data, K-Means clustering"
      ],
      [
       "You care about *direction / topic*",
       "You care about *absolute position*"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** for embeddings, normalize and use cosine (≡ dot product). For raw feature vectors where scale matters, use Euclidean — but **standardize features first** so one large-scale feature doesn't dominate the distance."
    },
    {
     "t": "p",
     "text": "*Last Updated: April 2026* *Topic: Machine Learning Interview Questions*"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
