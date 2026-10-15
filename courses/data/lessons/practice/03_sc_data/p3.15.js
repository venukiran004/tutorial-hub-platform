/* ============================================================================
   PRACTICE P3.15 — Predict the Output / Scenarios · 15
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.15",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the worked answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Predict the Output / Scenarios · 15",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "351",
   "q": "Your stakeholder says \"I don't trust the model because I don't understand it.\" How do you build trust?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Model Interpretability & Explainability**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Show global feature importance — \"these 5 factors matter most,\" (2) provide individual explanations (SHAP waterfall) for specific decisions, (3) validate with domain experts — \"does this match your intuition?\", (4) show model performance on historical decisions they made, (5) counterfactuals: \"the decision would change if X were different,\" (6) error analysis: show where model makes mistakes and why, (7) gradual deployment: start with model as advisory tool, humans make final call."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "352",
   "q": "Your SHAP analysis shows that \"age\" is the most important feature for your loan approval model. Regulators ask why age influences decisions. How do you respond?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Clarify: SHAP shows predictive importance, not necessarily direct causality, (2) age may proxy for credit history length, income stability, life stage, (3) check if age is a protected variable in your jurisdiction — it often is, (4) show partial dependence: how does probability change with age?, (5) test removing age: does the model still perform well via other features?, (6) consider fairness: equal opportunity across age groups, (7) document the regulatory analysis and get legal review."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "353",
   "q": "You need to choose between a simple logistic regression (AUC=0.82) and a complex gradient boosting model (AUC=0.86). When do you choose the simpler model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Choose simpler when: (1) regulatory requirement for full explainability (finance, healthcare), (2) the 4% AUC improvement doesn't translate to meaningful business value, (3) model needs to be auditable by non-technical reviewers, (4) deployment constraints — GBM needs more compute/memory, (5) feature relationships are truly linear, (6) maintenance burden matters — LR is easier to debug, (7) model needs to be manually adjustable (coefficient tweaking). Choose complex when: accuracy directly impacts high-value decisions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "354",
   "q": "Your model uses 200 features. A manager asks \"what are the top 3 reasons this customer was flagged?\" How do you generate per-prediction explanations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) SHAP values: compute for this prediction, sort by absolute value, take top 3, (2) LIME: fit local interpretable model around this prediction, (3) present as: \"This customer was flagged because: (a) transaction amount was 5x their average, (b) first international purchase, (c) velocity of 8 transactions in 1 hour,\" (4) use natural language templates to convert feature contributions to sentences, (5) include direction: feature X pushed the score up/down."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "355",
   "q": "You built a complex ensemble model. The model card requires documentation of model behavior. What do you include?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Intended use and limitations, (2) training data description and biases, (3) performance metrics with confidence intervals, (4) performance across demographic groups (fairness), (5) feature importance (global), (6) partial dependence plots for top features, (7) known failure modes and edge cases, (8) operational requirements (latency, memory), (9) monitoring recommendations, (10) ethical considerations, (11) version history and change log, (12) contact information for model owners."
    },
    {
     "t": "p",
     "text": "**Theme: Real-World Data Challenges**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "356",
   "q": "Your data has a \"last updated\" timestamp but some records seem stale (haven't been updated in years). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Calculate time since last update for each record, (2) flag records older than expected update frequency, (3) check if stale records have different characteristics (inactive users?), (4) create a \"data freshness\" feature — models can learn to weight fresh data more, (5) for critical features: query source systems for updates, (6) set retention policy: archive records not updated in N days, (7) monitor freshness as a data quality metric, (8) separate analysis: stale records may introduce bias."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "357",
   "q": "You're joining data from 5 different source systems. Each has slightly different customer identifiers. How do you create a unified customer view?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Entity resolution / record linkage: (1) deterministic matching: exact match on email, phone, SSN, (2) probabilistic matching: fuzzy match on name + address + DOB, (3) use dedupe library or Spark's ML pipeline for fuzzy matching, (4) create a master customer ID mapping table, (5) hierarchical matching: first exact, then fuzzy for remaining, (6) handle edge cases: shared email (family), name changes (marriage), (7) match confidence scores: high confidence → auto-merge, low → manual review, (8) ongoing process: new records need matching against existing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "358",
   "q": "Your feature pipeline runs hourly but the source data sometimes arrives late (data lag). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Event-time vs. processing-time: use event timestamps for feature calculation, (2) watermark strategy: wait for expected lag (e.g., 15 min after hour), (3) recompute features when late data arrives (backfill), (4) use \"as-of\" joins: features at prediction time shouldn't use future data, (5) monitor data lag distribution to set watermarks, (6) graceful degradation: use stale features rather than missing features, (7) SLA with upstream: define acceptable delay, (8) alerting when lag exceeds threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "359",
   "q": "Your dataset has implicit feedback (clicks, views) but no explicit negative feedback. How do you train a model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Treat non-interactions as weak negatives (user saw item but didn't click), (2) negative sampling: randomly sample items user didn't interact with, (3) popularity-based negative sampling: sample proportional to item popularity (harder negatives), (4) exposure-aware modeling: only treat items the user was exposed to as potential negatives, (5) use BPR (Bayesian Personalized Ranking): learn from pairwise preferences (clicked > not clicked), (6) contrastive learning approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "360",
   "q": "Your model was trained on data from one country and needs to be deployed in another. What challenges do you expect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature distributions differ (income levels, demographics), (2) categorical values differ (product names, currencies, region codes), (3) label definitions may differ (what constitutes \"fraud\" varies), (4) regulatory differences (different protected classes, data rules), (5) cultural differences affecting behavior, (6) missing features in new country. Approaches: (1) domain adaptation, (2) transfer learning with fine-tuning, (3) retrain with local data, (4) feature engineering for country-agnostic representations, (5) start with local rules while collecting data."
    },
    {
     "t": "p",
     "text": "**Theme: Survival Analysis**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "361",
   "q": "You need to predict not just \"if\" a customer will churn but \"when.\" What methods do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Survival analysis: (1) Kaplan-Meier estimator for overall survival curve, (2) Cox Proportional Hazards model: relates features to hazard rate, (3) interpret hazard ratios: HR=2.0 means 2x risk of churning, (4) accelerated failure time (AFT) models for direct time prediction, (5) random survival forests for non-linear effects, (6) DeepSurv (neural network-based), (7) output: survival curve per customer — \"probability of being active at month 6, 12, 18.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "362",
   "q": "Your survival model assumes proportional hazards but a feature violates this assumption. How do you detect and fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detection: (1) Schoenfeld residuals: if they correlate with time, assumption violated, (2) log-log plot: survival curves should be parallel, (3) formal test: `cox.zph()` in R or `proportional_hazard_test()` in lifelines. Fix: (1) stratify by the violating variable, (2) add time-varying coefficients: interaction of feature with time, (3) use piecewise Cox model with different intervals, (4) switch to non-parametric methods (random survival forest), (5) model the feature as time-dependent covariate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "363",
   "q": "You have a dataset where 70% of observations are right-censored (event hasn't occurred). Is this too much censoring?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** High censoring is common and manageable if: (1) censoring is non-informative (reason for censoring unrelated to event), (2) enough events still exist for estimation (rule of thumb: 10 events per predictor in Cox model), (3) follow-up time is sufficient to observe events, (4) if most censoring is administrative (study ended), it's fine, (5) informative censoring (e.g., patients stopped treatment because they felt worse) biases results and needs special methods, (6) plot censoring distribution to check for patterns."
    },
    {
     "t": "p",
     "text": "**Theme: Ensemble Methods**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "364",
   "q": "You have 5 models with similar accuracy but different error patterns. How do you create the best ensemble?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Stacking: train meta-learner on base model predictions, (2) weighted average: optimize weights on validation set, (3) voting: majority vote (classification) or average (regression), (4) diversity is key: models with different error patterns combine best, (5) use models with different inductive biases: tree-based + linear + neural, (6) blending: hold out fold for meta-learner training, (7) Bayesian model averaging for principled combination."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "365",
   "q": "Your ensemble of 10 models improves accuracy by 2% over the best single model, but inference takes 10x longer. How do you decide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Cost-benefit analysis: (1) is 2% improvement worth 10x compute cost?, (2) can you distill the ensemble into a single student model (knowledge distillation)?, (3) try smaller ensembles: often 3 diverse models capture most of the gain, (4) remove the weakest models — typically 10→5 models loses <0.5%, (5) use model compression: prune or quantize ensemble members, (6) cache common predictions, (7) for batch predictions: latency less critical, ensemble is fine, (8) for real-time: distillation or smaller ensemble."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "366",
   "q": "Your Random Forest and XGBoost both achieve 90% accuracy. Adding them to an ensemble doesn't improve performance. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Both are tree-based — they have similar inductive bias and make similar predictions (and errors). Low diversity doesn't help ensembling. Fix: (1) add a fundamentally different model type: logistic regression, SVM, or neural network, (2) use different feature subsets for each model, (3) train on different data subsets (bagging across models), (4) use correlation of errors to measure diversity — if r>0.8, models are too similar, (5) stacking with a non-tree meta-learner might still extract some value."
    },
    {
     "t": "p",
     "text": "**Theme: Real-Time & Streaming**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "367",
   "q": "Your model was trained offline but needs to score events in real-time (< 50ms). How do you architect this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pre-compute features that can be cached (user profiles, aggregate stats), (2) feature store: online store (Redis/DynamoDB) for low-latency feature retrieval, (3) model serving: TensorFlow Serving, Triton, or simple Flask/FastAPI with loaded model, (4) minimize feature computation at request time, (5) model format: ONNX for cross-framework optimization, (6) connection pooling for database lookups, (7) async feature enrichment where possible, (8) profile: data loading, feature computation, and inference separately."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "368",
   "q": "Your streaming pipeline processes 100K events/second. Some events arrive out of order. How do you handle this for feature computation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Event-time windowing (not processing-time), (2) watermarks: define how late events can arrive (e.g., 5 minutes), (3) allowed lateness: process late events and update results, (4) use Apache Flink which has native out-of-order handling, (5) session windows based on event timestamps, (6) buffer events and sort before processing, (7) final vs. speculative results: emit early results, revise when late events arrive, (8) monitor late event rate and adjust watermarks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "369",
   "q": "You need to detect credit card fraud in real-time. The model needs the user's last 7 days of transactions as features. How do you maintain this state?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature store with online serving: precompute rolling aggregates updated continuously, (2) Redis sorted sets: store recent transactions per user, compute aggregates on read, (3) Kafka Streams with state stores: maintain per-user rolling windows, (4) DynamoDB streams for event-driven updates, (5) materialized view pattern: update aggregate features on each new transaction, (6) TTL on state entries to control memory, (7) approximate aggregates (HyperLogLog, Count-Min Sketch) for high-cardinality features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "370",
   "q": "Your real-time model occasionally gets a burst of requests (10x normal traffic). How do you handle traffic spikes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Horizontal autoscaling: add replicas based on CPU/request rate, (2) request queuing: buffer excess requests, process FIFO, (3) load shedding: drop low-priority requests under extreme load, (4) caching: repeated predictions served from cache, (5) pre-warm instances before expected spikes (promotional events), (6) circuit breaker: fallback to simpler model under load, (7) rate limiting per customer/API key, (8) async processing: return immediately, deliver result later."
    },
    {
     "t": "p",
     "text": "**Theme: Domain-Specific Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "371",
   "q": "You're building a credit risk model. Regulators require the model to be explainable. What modeling approach do you take?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Logistic regression as primary model — fully interpretable coefficients, (2) scorecard model: discretize features into bins, assign points, (3) use WoE (Weight of Evidence) and IV (Information Value) for feature selection, (4) monotonic constraints on key features (more income → lower risk), (5) use EBM (Explainable Boosting Machine) for near-GBM performance with interpretability, (6) model documentation per SR 11-7 regulatory guidance, (7) include adverse action reasons per ECOA requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "372",
   "q": "You're building a dynamic pricing model for an airline. What features and constraints matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features: (1) days until departure, (2) historical demand for this route/date, (3) current booking velocity, (4) competitor prices (scraped), (5) seasonality, day of week, (6) seat inventory remaining, (7) route popularity, (8) customer segment. Constraints: (1) minimum price floor (cost-based), (2) maximum price ceiling (regulatory/PR risk), (3) price consistency: similar customers should pay similar prices, (4) cannibalization between fare classes, (5) fairness: avoid discriminatory pricing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "373",
   "q": "You're building a predictive maintenance model for manufacturing equipment. Failures are rare (0.1% of readings). How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Anomaly detection: learn normal behavior, flag deviations, (2) remaining useful life (RUL) prediction using survival analysis, (3) multi-class: healthy, degraded, failure states, (4) time-series features: rolling statistics, rate of change, fourier components of sensor readings, (5) handle imbalance: SMOTE, class weights, anomaly detection approach, (6) cost-sensitive: false negative (missed failure) costs much more than false positive (unnecessary inspection), (7) alert at \"degraded\" stage for planned maintenance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "374",
   "q": "Your healthcare model predicts patient readmission risk. How do you validate it doesn't just predict who is sicker?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) The goal IS to predict readmission, which correlates with severity — that's expected, (2) validate actionability: can interventions actually reduce readmission for high-risk patients?, (3) control for severity: does the model add predictive value beyond illness severity alone?, (4) check for social determinant features (access to care, transportation), (5) evaluate: after intervention based on model, did readmission actually decrease?, (6) prospective validation on new patients."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "375",
   "q": "You're building a document classification system for a law firm. Misclassification of confidential documents is extremely costly. How do you design for this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Asymmetric error handling: err toward \"confidential\" classification on uncertain cases, (2) two-stage: first classify broad category, then sensitivity level, (3) human-in-the-loop for uncertain predictions (confidence < 0.9), (4) multi-model voting: require multiple models to agree for non-confidential classification, (5) regular audit: sample classifications for human review, (6) rejection option: \"unsure\" classification triggers manual review, (7) track and learn from misclassifications."
    },
    {
     "t": "p",
     "text": "**Theme: Interview & Communication**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
