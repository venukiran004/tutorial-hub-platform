/* ============================================================================
   PRACTICE P3.14 — Predict the Output / Scenarios · 14
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.14",
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
   "text": "Predict the Output / Scenarios · 14",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "326",
   "q": "You want to measure the impact of a new website feature on purchases, but not all users were exposed equally. How do you estimate the causal effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Propensity score matching: match exposed to similar unexposed users, (2) inverse propensity weighting (IPW): weight by 1/P(treatment|X), (3) doubly robust estimation: combines outcome model + propensity model, (4) instrumental variable: find something that affects exposure but not purchases directly, (5) regression discontinuity: if exposure was based on a threshold, (6) check balance of covariates after adjustment, (7) sensitivity analysis for unobserved confounders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "327",
   "q": "You're asked \"do higher prices cause lower sales?\" Using historical data where prices and demand fluctuate. How do you isolate the causal effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Challenge: prices respond to demand (endogeneity — prices increase when demand is high). Solutions: (1) natural experiments: unexpected price changes (supply shock), (2) instrumental variable: cost of raw materials (affects price, not demand directly), (3) regression discontinuity: price tiers create quasi-experiments, (4) A/B test with random price assignment (the gold standard), (5) panel data with fixed effects to control for unobserved heterogeneity, (6) structural equation modeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "328",
   "q": "You observe that hospital patients who receive treatment X have higher mortality than those who don't. Does treatment X cause death?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Likely Simpson's paradox / confounding by severity: (1) treatment X is given to sicker patients → confounding by indication, (2) stratify by severity: within each severity group, treatment X may actually reduce mortality, (3) use propensity score matching on health indicators, (4) instrumental variable: doctor preference for treatment X, (5) this is the classic observational study problem — association ≠ causation, (6) RCTs are the gold standard but not always ethical/feasible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "329",
   "q": "You're building a causal graph (DAG) for your business problem. What's the process?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) List all relevant variables, (2) draw directed edges representing \"X causes Y\" based on domain knowledge, (3) identify confounders: variables affecting both treatment and outcome, (4) identify mediators: variables on the causal path, (5) identify colliders: variables caused by both treatment and outcome, (6) use d-separation to determine conditional independencies, (7) validate with data: test implied conditional independencies, (8) iterate with domain experts, (9) use the DAG to determine adjustment set for causal estimation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "330",
   "q": "You ran an RCT (randomized controlled trial) but 20% of the treatment group didn't actually use the treatment. How do you analyze this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Intent-to-Treat (ITT): analyze as randomized regardless of compliance — conservative but valid, (2) Per-Protocol: analyze only compliers — biased (non-compliers differ from compliers), (3) CACE/LATE: Complier Average Causal Effect using IV — randomization as instrument for actual treatment, (4) CACE = ITT / compliance rate, (5) ITT is the primary analysis (preserves randomization benefits), CACE is supplementary, (6) investigate why non-compliance occurred."
    },
    {
     "t": "p",
     "text": "**Theme: Geospatial Analysis**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "331",
   "q": "You're building a model to predict optimal store locations. What geospatial features matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Population density within radius (1mi, 3mi, 5mi), (2) demographics: income, age distribution, household size, (3) competitor proximity and density, (4) foot traffic data (mobile phone signals), (5) accessibility: road networks, public transit, parking, (6) existing store cannibalization distance, (7) surrounding amenities (complementary businesses), (8) zoning and regulations, (9) historical performance of similar locations, (10) daytime vs. nighttime population (office vs. residential area)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "332",
   "q": "Your geospatial data has irregular GPS points and you need to aggregate by regions. What approaches work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) H3 hexagonal grid: uniform area cells at various resolutions, (2) administrative boundaries: zip codes, census tracts, (3) custom polygons: business-defined territories, (4) Voronoi tessellation around key points (stores, centers), (5) DBSCAN clustering of GPS points to find natural regions, (6) KD-tree or R-tree for efficient spatial queries, (7) grid cells (square) for simple aggregation, (8) use GeoPandas for spatial joins and aggregation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "333",
   "q": "You need to calculate driving distances between 10,000 points. Computing all pairs (100 million) is too slow. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Only compute distances between relevant pairs (within 50km), (2) use spatial index (R-tree) to find nearby points first, (3) approximate with Haversine formula for straight-line distance as filter, then API for actual driving distance, (4) precompute distance matrix for frequently queried pairs, (5) use OSRM (open source routing) for batch local computation, (6) cache API results, (7) use isochrones (drive-time polygons) instead of point-to-point distances."
    },
    {
     "t": "p",
     "text": "**Theme: Optimization**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "334",
   "q": "Your supply chain team wants to minimize shipping costs while meeting delivery time constraints. How do you formulate this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear programming: (1) decision variables: quantity shipped from warehouse i to customer j, (2) objective: minimize Σ(cost_ij × quantity_ij), (3) constraints: supply ≤ warehouse capacity, demand ≥ customer requirement, delivery time ≤ SLA, (4) solve with PuLP, OR-Tools, or Gurobi, (5) sensitivity analysis: how much does cost change if SLA relaxed by 1 day?, (6) for large-scale: decomposition methods or heuristics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "335",
   "q": "You need to allocate a $1M marketing budget across 5 channels to maximize conversions. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model response curves per channel: conversions = f(spend), typically diminishing returns, (2) constrained optimization: maximize Σ conversions(spend_i) subject to Σ spend_i ≤ $1M, (3) use historical data to estimate response functions, (4) consider channel interactions (attribution), (5) multi-touch attribution model to understand channel synergies, (6) Bayesian optimization for unknown response curves, (7) simulate and A/B test allocation changes incrementally."
    },
    {
     "t": "p",
     "text": "**Theme: Data Privacy & Compliance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "336",
   "q": "A user requests deletion of their data under GDPR \"right to erasure.\" Your ML model was trained on their data. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Delete the user's data from databases and backups, (2) for the model: full retraining without their data (expensive), (3) machine unlearning techniques (approximate methods exist), (4) if model is aggregate statistics (like means), individual contribution is negligible, (5) document the process and compliance, (6) data lineage tracking helps identify all derived data, (7) design systems for mass-deletion requests, (8) consider differential privacy during training to limit individual data impact."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "337",
   "q": "You're training a model on health data. What compliance frameworks apply and how do you ensure compliance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) HIPAA (US): de-identification required (Safe Harbor or Expert Determination), (2) remove 18 HIPAA identifiers, (3) minimum necessary standard: only access data needed, (4) audit trails for all data access, (5) Business Associate Agreement if third parties involved, (6) encryption at rest and in transit, (7) role-based access control, (8) IRB approval for research use, (9) EU: GDPR applies to health data as special category, (10) regular compliance audits and staff training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "338",
   "q": "Your model uses proxy variables that could identify individuals (rare combinations of features). How do you protect privacy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) K-anonymity: ensure each record matches at least K-1 others on quasi-identifiers, (2) L-diversity: each group has at least L distinct sensitive values, (3) differential privacy: add calibrated noise to queries/model, (4) generalize quasi-identifiers (exact age → age range), (5) suppress rare combinations, (6) test re-identification risk: attempt linkage attacks on your data, (7) use synthetic data for development/testing."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Model Evaluation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "339",
   "q": "Your model performs well overall but terribly on a specific segment (e.g., new customers). How do you discover and fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Slice-based evaluation: compute metrics per segment (tenure, geography, product type), (2) error analysis: what do misclassified examples have in common?, (3) use tools like SliceFinder, What-If Tool, (4) fix: add segment-specific features, more training data for that segment, separate model, (5) stratified evaluation should be standard practice — overall metrics hide segment-level issues, (6) monitor segment-level performance in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "340",
   "q": "Your cross-validation gives much better results than your holdout test set. What's going on?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Possible causes: (1) temporal dependence — CV shuffles time-based data, leaking future info, (2) data leakage in preprocessing (fit on full data before split), (3) test set has distribution shift from training data, (4) test set is too small (high variance), (5) information leaking through group structure (same customer in train and test). Fix: use time-based CV for temporal data, ensure preprocessing is inside CV loop, check for data consistency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "341",
   "q": "How do you evaluate a regression model beyond just RMSE and R²?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) MAE: less sensitive to outliers, (2) MAPE: percentage error, interpretable but undefined at zero, (3) residual analysis: plot residuals vs. predicted (should be random), (4) Q-Q plot: check normality of residuals, (5) prediction intervals: are they calibrated? (95% CI should contain 95% of actuals), (6) heteroscedasticity: does error vary with prediction magnitude?, (7) slice-based metrics: RMSE per segment, (8) actual vs. predicted plot, (9) business metric: revenue impact, dollar-value error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "342",
   "q": "You've tuned hyperparameters using cross-validation and selected the best model. Your final test set performance is lower. Is this expected?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Yes, this is expected and common: (1) hyperparameter tuning optimizes for CV performance → some overfitting to validation data, (2) the gap should be small (1-3%) — if large, you may have too many hyperparameter combinations or data leakage, (3) use nested cross-validation: outer loop for evaluation, inner loop for tuning, (4) this is why you keep a final test set — it gives unbiased estimate after all decisions are made, (5) report test set performance, not CV performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "343",
   "q": "Your model has high accuracy but low AUC. How is this possible?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This happens when: (1) model predicts majority class with high confidence for everyone, getting high accuracy on imbalanced data, (2) but it doesn't rank positive examples higher than negatives (low AUC), (3) example: 99% negative class → model predicts all negative → 99% accuracy, AUC=0.5, (4) the model hasn't learned to discriminate — it's just leveraging class imbalance, (5) fix: use class weights, SMOTE, or optimize for AUC directly in training, (6) report both metrics — they measure different things."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "344",
   "q": "Your model's calibration is important (probabilities need to be accurate for downstream decisions). How do you assess and improve calibration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Assess: (1) calibration curve (reliability diagram): plot predicted probability bins vs. actual positive rate, (2) Brier score: mean squared error of probabilities, (3) Expected Calibration Error (ECE): weighted average calibration gap across bins. Improve: (1) Platt scaling: fit sigmoid on validation set, (2) isotonic regression: non-parametric calibration, (3) temperature scaling for neural networks, (4) re-calibrate periodically as data shifts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "345",
   "q": "You need to compare two models but they have overlapping confidence intervals on the test set. How do you determine which is better?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Paired t-test on per-sample predictions (more powerful than unpaired), (2) McNemar's test for classification: counts where models disagree, (3) 5×2 cross-validation t-test (Dietterich), (4) Wilcoxon signed-rank test (non-parametric alternative), (5) bootstrap confidence intervals for the difference in metrics, (6) Bayesian comparison: posterior probability one model is better, (7) if not significantly different, choose simpler/faster model, (8) practical significance: does the difference matter for business?"
    },
    {
     "t": "p",
     "text": "**Theme: Miscellaneous Advanced Topics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "346",
   "q": "Your model needs to handle concept drift — the relationship between features and target changes over time. What strategy do you implement?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Sliding window: train on only last N months of data, (2) online learning: update model incrementally with new data, (3) ensemble with decay: weight recent models more, (4) detect drift: monitor prediction distribution, accuracy over time, PSI for features, (5) trigger retraining when drift exceeds threshold, (6) adaptive models: use time as a feature or time-varying coefficients, (7) shadow deployment: continuously train new model, deploy when it outperforms current."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "347",
   "q": "You're asked to build a model for a problem where collecting labels is extremely expensive ($100 per label). How do you maximize model quality per dollar?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Active learning: model identifies most informative samples to label, (2) semi-supervised learning: use abundant unlabeled data with few labels, (3) self-training: train on labeled, predict on unlabeled, add confident predictions, iterate, (4) transfer learning: pre-train on related task with cheap/free labels, (5) weak supervision (Snorkel): use labeling functions instead of per-sample labels, (6) few-shot learning with pre-trained models, (7) crowdsourcing with quality control for cheaper labeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "348",
   "q": "Your model needs to predict multiple correlated outputs simultaneously (e.g., predicting both price and demand). How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multi-output regression: shared model with multiple heads, (2) chain models: predict price first, use as feature for demand, (3) multivariate regression (PLS, CCA), (4) neural network with shared hidden layers and separate output layers, (5) capture correlations: multi-task learning improves predictions by sharing representations, (6) evaluate: check if multi-output improves over separate models, (7) consider if outputs have different data quality — poor target can hurt good one."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "349",
   "q": "You have a mix of structured data (tabular) and unstructured data (images, text). How do you build a unified model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Late fusion: train separate models (XGBoost for tabular, CNN for images, BERT for text), combine predictions as features in a meta-model, (2) early fusion: extract features from each modality, concatenate, train single model, (3) joint training: multi-modal neural network with separate encoders and shared layers, (4) attention-based fusion: let model learn which modality is most relevant per sample, (5) for tabular-dominant: extract image/text embeddings, add as features to gradient boosting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "350",
   "q": "Your real-time prediction system needs to handle both structured queries (known schema) and ad-hoc analysis queries. How do you architect the data layer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Lambda/Kappa architecture: (1) streaming layer: real-time feature computation (Kafka + Flink) for structured queries, (2) batch layer: daily aggregation (Spark) for complex analytics, (3) serving layer: feature store for model serving + OLAP database for analysis, (4) separate read/write paths: write to event stream, read from materialized views, (5) cache hot features in Redis, (6) use Feast/Tecton as feature store bridging online and offline, (7) data catalog for discoverability."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
