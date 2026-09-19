/* ============================================================================
   INTERVIEW I1.4 — Model Evaluation & Deployment
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
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
   "text": "Model Evaluation & Deployment",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is RMSE? When is it preferred over MAE?",
   "body": [
    {
     "t": "p",
     "text": "RMSE = √(mean(yᵢ − ŷᵢ)²). Preferred when large errors are especially undesirable (penalizes them more). MAE is preferred when all errors matter equally or outliers should not dominate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is log loss (cross-entropy loss)?",
   "body": [
    {
     "t": "p",
     "text": "Log loss = −(1/n)·Σ[yᵢ·log(pᵢ) + (1−yᵢ)·log(1−pᵢ)]. Measures quality of probability estimates. Lower = better calibrated predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is calibration in ML models?",
   "body": [
    {
     "t": "p",
     "text": "A well-calibrated model's predicted probabilities match empirical frequencies (if it predicts 70% for 100 samples, ~70 should be positive). Calibrate using Platt scaling or isotonic regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is model interpretability vs. explainability?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Interpretability:** Inherent simplicity of the model (linear regression, decision tree).",
      "**Explainability:** Post-hoc methods applied to black-box models (LIME, SHAP)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is SHAP and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "SHAP (SHapley Additive exPlanations) assigns each feature a contribution to the model's prediction using game theory (Shapley values). Satisfies efficiency, symmetry, and dummy axioms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is A/B testing in ML model deployment?",
   "body": [
    {
     "t": "p",
     "text": "Randomly split users between model A (control) and model B (treatment). Measure business metrics to determine if model B is statistically significantly better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is shadow deployment / canary release?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Shadow:** New model receives same traffic as production model but responses are not served to users — used to compare outputs safely.",
      "**Canary:** Route a small % of real traffic to the new model. If healthy, gradually increase."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is concept drift and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "Concept drift: The statistical relationship between features and target changes over time. Detection: Monitor prediction distribution, feature distribution (KL divergence, PSI), model performance metrics. Tools: Evidently AI, Alibi Detect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the difference between covariate shift and label shift?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Covariate shift:** Input distribution P(X) changes but P(Y|X) stays same.",
      "**Label shift:** Output distribution P(Y) changes."
     ]
    },
    {
     "t": "p",
     "text": "Both degrade model performance; handled by importance weighting or retraining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is model versioning and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "Tracking different trained model versions (code, data, hyperparameters, metrics). Enables reproducibility, rollback, and comparison. Tools: MLflow, DVC, W&B."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "76",
   "q": "What is the difference between online and offline evaluation?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Offline:** Evaluation on a held-out dataset before deployment (fast, cheap, may not reflect production).",
      "**Online:** Evaluation in live production using real user feedback or business metrics (accurate, slow, expensive)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the Matthews Correlation Coefficient (MCC)?",
   "body": [
    {
     "t": "p",
     "text": "MCC = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN)). A balanced metric even for imbalanced classes. Range: −1 to +1; +1 is perfect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "How do you assess if a model is production-ready?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Performance meets business KPI threshold.",
      "Latency within SLA.",
      "Bias/fairness checks passed.",
      "Tested for edge cases and failure modes.",
      "Monitoring and alerting configured.",
      "Rollback plan exists."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is feature drift monitoring?",
   "body": [
    {
     "t": "p",
     "text": "Tracking whether feature distributions shift between training data and live data. Use PSI (Population Stability Index), KS-test, Wasserstein distance. High drift signals a need to retrain."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is a champion-challenger model strategy?",
   "body": [
    {
     "t": "p",
     "text": "The champion is the current best production model. Challengers are new candidates. Route a portion of traffic to challengers; promote one to champion if it consistently beats the current champion."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
