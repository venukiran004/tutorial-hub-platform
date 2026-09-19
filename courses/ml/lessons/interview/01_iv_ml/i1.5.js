/* ============================================================================
   INTERVIEW I1.5 — Advanced Topics
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
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
   "text": "Advanced Topics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is AutoML?",
   "body": [
    {
     "t": "p",
     "text": "Automated Machine Learning automates the end-to-end ML pipeline: feature engineering, model selection, hyperparameter tuning. Tools: AutoSklearn, H2O AutoML, Google AutoML, TPOT."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is meta-learning / few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "Meta-learning: \"Learning to learn\" — models that can adapt to new tasks with very few examples. Approaches: MAML (model-agnostic meta-learning), Prototypical Networks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "A single model is trained on multiple related tasks simultaneously, sharing representations. Often improves generalization compared to training separate models for each task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is federated learning?",
   "body": [
    {
     "t": "p",
     "text": "Training a model across multiple decentralized devices/servers holding local data, without sharing raw data with a central server. Preserves privacy; used in mobile (Gboard, iOS)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is differential privacy in ML?",
   "body": [
    {
     "t": "p",
     "text": "A mathematical framework guaranteeing that model outputs do not reveal information about individual training samples. Implemented by adding calibrated noise (e.g., Laplace/Gaussian mechanism) during training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is graph machine learning?",
   "body": [
    {
     "t": "p",
     "text": "ML applied to graph-structured data (social networks, molecules, knowledge graphs). Methods: Graph Neural Networks (GNNs), node/edge classification, graph classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the kernel density estimation (KDE)?",
   "body": [
    {
     "t": "p",
     "text": "A non-parametric way to estimate the probability density function (PDF) of a variable. Places a kernel (e.g., Gaussian) at each data point and sums them for a smooth distribution estimate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is isotonic regression?",
   "body": [
    {
     "t": "p",
     "text": "A non-parametric regression that fits a monotonically increasing (or decreasing) function to data. Used for probability calibration (convert raw scores to calibrated probabilities)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is quantile regression?",
   "body": [
    {
     "t": "p",
     "text": "Estimates the conditional median (or any quantile) of the response instead of the mean. Useful when understanding the range of outcomes matters (e.g., predicting 90th percentile delivery time)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is survival analysis?",
   "body": [
    {
     "t": "p",
     "text": "Analysis of time-to-event data (e.g., time until customer churn, machine failure). Handles censored observations (event not yet occurred). Methods: Kaplan-Meier, Cox Proportional Hazards."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is the Vapnik-Chervonenkis (VC) dimension?",
   "body": [
    {
     "t": "p",
     "text": "A measure of the capacity (complexity) of a statistical classification model. Higher VC dimension → model can fit more complex functions → higher risk of overfitting with limited data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is stochastic gradient descent (SGD) vs. mini-batch SGD?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**SGD:** Update weights after each single sample. Noisy but fast per update.",
      "**Mini-batch:** Update after a small batch (32–256). Balances stability and speed. Most common in practice."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the difference between parametric and non-parametric hypothesis tests in ML evaluation?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Parametric** (t-test): Assumes data follows a distribution.",
      "**Non-parametric** (Wilcoxon, Mann-Whitney): No distributional assumption. Preferred for comparing classifier performance across CV folds."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is label smoothing?",
   "body": [
    {
     "t": "p",
     "text": "Instead of hard 0/1 labels, use soft labels (e.g., 0.9/0.1). Prevents overconfident predictions and improves calibration. Common in deep learning classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is knowledge distillation?",
   "body": [
    {
     "t": "p",
     "text": "A smaller \"student\" model is trained to mimic the output distribution of a larger \"teacher\" model. Produces compact, efficient models that retain much of the teacher's performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is an ensemble and what are the most common ensemble strategies?",
   "body": [
    {
     "t": "p",
     "text": "Combining multiple models to improve performance. Strategies: Bagging (Random Forest), Boosting (XGBoost), Stacking (meta-learner), Blending (hold-out based stacking)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is stacking (stacked generalization)?",
   "body": [
    {
     "t": "p",
     "text": "Train several base models (level-0), then train a meta-model (level-1) on their out-of-fold predictions. The meta-model learns how to best combine base model outputs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the role of a validation set during Bayesian hyperparameter optimization?",
   "body": [
    {
     "t": "p",
     "text": "The validation set provides the objective function score that the Bayesian optimizer uses to build its surrogate model. It must be held out from training to provide unbiased feedback about hyperparameter configurations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "How do you handle high cardinality categorical features?",
   "body": [
    {
     "t": "p",
     "text": "Options: Target encoding (with CV), frequency encoding, grouping rare categories into \"Other\", entity embeddings (neural networks), hashing trick."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the difference between a discriminative and generative model? Give examples.",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Discriminative:** Learns boundary P(Y|X). Examples: Logistic Regression, SVM, Neural Networks.",
      "**Generative:** Learns joint distribution P(X,Y) = P(X|Y)·P(Y). Examples: Naive Bayes, HMMs, VAEs, GANs. Generative models can also synthesize new data."
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
