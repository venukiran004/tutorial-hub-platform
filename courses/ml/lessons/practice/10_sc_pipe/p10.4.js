/* ============================================================================
   PRACTICE P10.4 — Pipelines, Deployment and Advanced · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/10_Pipelines_Deployment_and_Advanced.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.4",
 "lede": "**25 scenarios** from Pipelines, Deployment and Advanced. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "76",
   "q": "How do you handle a situation where adding more data doesn't improve model performance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Data quality issue (noisy labels, irrelevant data)",
      "Model has reached its capacity (underfitting with current architecture)",
      "Feature limitations (missing important features)",
      "Irreducible error (noise in the problem itself)",
      "Distribution mismatch (new data from different distribution)"
     ]
    },
    {
     "t": "p",
     "text": "**Action:** Check learning curves, add features, try more complex model, clean existing data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the difference between prediction and inference in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Prediction (operational):** Using a trained model to make predictions on new data",
      "**Inference (statistical):** Drawing conclusions about population from data (hypothesis testing, confidence intervals)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** In ML engineering: \"inference\" usually means prediction/serving. In statistics/research: \"inference\" means understanding underlying patterns and relationships."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is active learning and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model selects which unlabeled samples would be most informative to label next."
    },
    {
     "t": "p",
     "text": "**When useful:**"
    },
    {
     "t": "ol",
     "items": [
      "Labeling is expensive (medical images, legal documents)",
      "Large pool of unlabeled data available",
      "Limited annotation budget"
     ]
    },
    {
     "t": "p",
     "text": "**Strategies:** Uncertainty sampling, query-by-committee, expected model change."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces labeling cost by 50-80% compared to random sampling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the Rashomon effect in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Many substantially different models can achieve similar predictive performance on the same dataset."
    },
    {
     "t": "p",
     "text": "**Implication:** The \"best\" model may not be unique. Different models may have different biases, fairness properties, and interpretations."
    },
    {
     "t": "p",
     "text": "**Explanation:** Explore the Rashomon set — choose models based on secondary criteria: interpretability, fairness, simplicity, rather than just accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is continual/lifelong learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** ML system that learns continuously from new data without forgetting previous knowledge."
    },
    {
     "t": "p",
     "text": "**Challenge:** Catastrophic forgetting — learning new tasks degrades performance on old tasks."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Elastic Weight Consolidation (EWC)",
      "Replay buffers (store and replay old examples)",
      "Progressive networks (add new modules)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for production systems that must adapt to evolving data while maintaining core capabilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you handle conflicting objectives in model development?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Example:** Marketing wants high recall (catch all potential customers). Operations wants high precision (reduce false alarms)."
    },
    {
     "t": "p",
     "text": "**Resolution:**"
    },
    {
     "t": "ol",
     "items": [
      "Define Pareto front of trade-offs",
      "Quantify business cost of each metric",
      "Stakeholder alignment on acceptable thresholds",
      "Present trade-off curves, let business decide threshold"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ML engineers should present options with trade-offs, not make business decisions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the difference between parametric and distribution-free methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parametric:** Assume specific distribution (normal), estimate parameters (μ, σ). Powerful when assumption holds.",
      "**Distribution-free (non-parametric):** Make no distributional assumptions. More robust, may need more data."
     ]
    },
    {
     "t": "p",
     "text": "**Examples:** t-test (parametric) vs Mann-Whitney U (non-parametric). Linear regression (parametric) vs Random Forest (non-parametric inference)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is Bayesian optimization intuition?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Build a model of the objective function (surrogate), use it to choose next point to evaluate intelligently."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Evaluate f(x) at a few random points\n2. Fit Gaussian Process to observations\n3. Use acquisition function (EI, UCB) to pick next x\n4. Evaluate f(x_new), update GP\n5. Repeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Acquisition function balances: try where model predicts good results (exploit) vs try where model is uncertain (explore)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the Shapley value and why is it important for ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** From game theory: fair way to distribute total payout (prediction) among players (features)."
    },
    {
     "t": "p",
     "text": "**Properties:** Efficiency, symmetry, linearity, null player."
    },
    {
     "t": "p",
     "text": "**SHAP:** Applies Shapley values to ML — each feature's contribution to each prediction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Only method with theoretical guarantees for feature attribution. Additive: sum of SHAP values + base value = prediction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "How do you detect and handle data poisoning attacks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adversary injects malicious training data to corrupt the model."
    },
    {
     "t": "p",
     "text": "**Detection:**"
    },
    {
     "t": "ol",
     "items": [
      "Outlier detection on training data",
      "Influence functions (identify impactful training samples)",
      "Data provenance tracking"
     ]
    },
    {
     "t": "p",
     "text": "**Defense:**"
    },
    {
     "t": "ol",
     "items": [
      "Robust training methods",
      "Data sanitization",
      "Certified defense guarantees"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for models trained on user-generated or web-scraped data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is federated learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training ML models across decentralized devices/data sources without centralizing data."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Server sends model to devices\n2. Each device trains on local data\n3. Devices send model UPDATES (not data) to server\n4. Server aggregates updates (FedAvg)\n5. Repeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Privacy-preserving: raw data never leaves devices. Used by Apple (keyboard predictions), Google (Gboard). Challenges: non-IID data, communication overhead, device heterogeneity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between online A/B testing and interleaving?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**A/B testing:** Split users into groups, each sees one model. Need large sample for significance.",
      "**Interleaving:** Show results from both models mixed together to same user. More sensitive, faster to detect differences."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Interleaving detects preference with 10× fewer users. Common for search/ranking. Not applicable for all use cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is causal inference in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Estimating causal effects (not just correlations) from observational data."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "Propensity Score Matching",
      "Instrumental Variables",
      "Difference-in-Differences",
      "Double Machine Learning (DML)",
      "Causal Forests"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Does treatment X cause outcome Y?\" ML predicts well but doesn't tell you if changing X changes Y. Causal inference bridges this gap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How do you handle the \"last mile\" problem in ML deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The gap between model output and user action:"
    },
    {
     "t": "ol",
     "items": [
      "Model predicts churn probability in batch, but which team member acts on it?",
      "Model ranks products, but how does the UI display them?",
      "Model detects anomaly, but what's the escalation path?"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Perfect model is useless without integration into business processes. Design the complete workflow: model → decision → action → feedback."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the ethical consideration of ML in hiring?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Historical bias: trained on past hiring data reflects past discrimination",
      "Proxy discrimination: features like zip code proxy for protected attributes",
      "Disparate impact: equal treatment but unequal outcomes",
      "Lack of transparency: candidates can't understand rejection"
     ]
    },
    {
     "t": "p",
     "text": "**Mitigation:** Fairness constraints, bias auditing, human oversight, transparent criteria."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is Human-in-the-Loop ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** System where human experts review, correct, or approve model outputs."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ol",
     "items": [
      "Low-confidence predictions sent to human review",
      "Active learning annotation",
      "Exception handling for edge cases",
      "Quality assurance sampling"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combined system often better than either human or model alone. Gradually reduce human involvement as model improves."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the difference between offline and online learning in terms of data requirements?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** All data available at training time. Model sees data multiple times (epochs).",
      "**Online:** Data arrives sequentially. Each sample seen once. Must learn incrementally."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Offline: can shuffle, batch, iterate. Online: must handle distribution shift, can't revisit old data. Online needs robust algorithms (SGD, passive-aggressive)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is AutoML and what are its limitations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automated model/feature/hyperparameter search."
    },
    {
     "t": "p",
     "text": "**Limitations:**"
    },
    {
     "t": "ol",
     "items": [
      "Computationally expensive (tries many combinations)",
      "May miss domain-specific insights",
      "Feature engineering still largely manual",
      "Doesn't handle data quality issues",
      "May select unnecessarily complex models",
      "Interpretability of selected model may be poor"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Great for baselines and non-experts. Not a replacement for domain expertise and ML engineering."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How do you handle the \"catastrophic forgetting\" problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When training on new tasks causes performance on old tasks to degrade."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Replay:** Mix old data with new data during training",
      "**EWC:** Penalize changes to weights important for old tasks",
      "**Progressive:** Add new modules, freeze old ones",
      "**Distillation:** Maintain knowledge from old model"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for production models that must adapt without forgetting. Balance plasticity (learning new) and stability (remembering old)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the role of synthetic data in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Augmentation:** Increase training data variety (images, text)",
      "**Privacy:** Train on synthetic data when real data is sensitive",
      "**Rare events:** Generate examples of rare scenarios (edge cases, failures)",
      "**Simulation:** Generate training data from simulators (robotics, autonomous driving)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Quality of synthetic data varies. Validate that model trained on synthetic data performs well on real data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How do you handle version conflicts in ML dependencies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Virtual environments (venv, conda) per project",
      "Pin exact versions in requirements.txt",
      "Docker for complete environment isolation",
      "Dependency conflict resolution (pip-tools, poetry)",
      "Separate training and serving environments (minimal deps for serving)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** scikit-learn upgrade can change model behavior. Pin versions AND test before upgrading. Different projects can have conflicting requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the \"No Free Lunch\" theorem's practical implication?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No universal best algorithm. For every algorithm that excels on some problems, there exist problems where it performs poorly."
    },
    {
     "t": "p",
     "text": "**Practical implication:**"
    },
    {
     "t": "ol",
     "items": [
      "Always try multiple algorithms",
      "Domain knowledge guides algorithm choice",
      "Baselines are essential for comparison",
      "Feature engineering often matters more than algorithm choice"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** XGBoost may be best on average for tabular data, but specific datasets may favor other algorithms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How do you handle a production model that makes a high-impact wrong prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Immediate:** Assess impact, inform stakeholders, apply fallback if available",
      "**Investigation:** Reproduce with same input, check data quality, feature values",
      "**Root cause:** Data issue? Edge case? Drift? Bug?",
      "**Fix:** Add training data, fix preprocessing, add business rule guard",
      "**Prevention:** Add monitoring for similar cases, update test suite"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Post-mortem analysis. Document learnings. Update monitoring to catch similar issues early. Consider adding confidence thresholds and human review for high-impact decisions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What will ML engineering look like in the next 5 years?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Foundation models:** Fine-tune pre-trained models rather than training from scratch",
      "**LLM integration:** LLMs as components in ML systems",
      "**AutoML maturity:** More automated pipeline creation",
      "**Edge AI:** More models running on devices",
      "**Responsible AI:** Mandatory fairness, explainability, governance",
      "**Synthetic data:** Mainstream training data source",
      "**MLOps standard:** CI/CD for ML becomes normal practice"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The role shifts from model building to model integration, orchestration, and governance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "A junior data scientist asks: \"What's the single most important thing in ML?\" Your answer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **Data quality.** The best model can't fix bad data. Understanding your data, cleaning it, feature engineering, and validating it matters more than any algorithm."
    },
    {
     "t": "p",
     "text": "**Explanation:**"
    },
    {
     "t": "ol",
     "items": [
      "Garbage in, garbage out — always true",
      "Feature engineering > algorithm selection in most cases",
      "More high-quality data > better algorithms",
      "Understanding the problem > understanding the model",
      "Simple model + good data > complex model + bad data"
     ]
    },
    {
     "t": "p",
     "text": "The difference between a good ML engineer and a great one is understanding the data and the problem deeply, not knowing more algorithms."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
