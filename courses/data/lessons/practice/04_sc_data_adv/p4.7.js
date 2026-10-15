/* ============================================================================
   PRACTICE P4.7 — Predict the Output / Scenarios · 7
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.7",
 "lede": "**25 scenarios** from Data Science Scenarios: Advanced. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Predict the Output / Scenarios · 7",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "151",
   "q": "You're running an A/B test on a mobile app, but iOS and Android users behave differently. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Experiment Design**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Stratified randomization: randomize within iOS and Android separately, (2) analyze separately: test may work on one platform but not the other, (3) interaction analysis: platform × treatment interaction term in regression, (4) if effect is consistent across platforms: report overall result, (5) if different: report platform-specific results — may deploy differently, (6) ensure equal traffic split within each platform, (7) pre-test balance check: verify randomization worked per platform."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "Your network effect product (social media) violates SUTVA — users in treatment affect users in control. How do you run a valid experiment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cluster randomization: randomize at network cluster level (e.g., geographic regions, friend groups), (2) graph cluster randomization: partition social graph, randomize clusters, (3) ego-network experiments: randomize egos and their alters together, (4) switchback experiments: alternate between treatment/control over time, (5) measure spillover directly: compare control users with many treated neighbors vs. few, (6) interference-robust estimators, (7) larger clusters reduce spillover but reduce sample size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "You want to test multiple variations simultaneously (5 landing pages). Is this fundamentally different from a standard A/B test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) A/B/n test: same principles, more variants, (2) main concern: diluted power — each variant gets fewer users, (3) multiple comparison correction: Bonferroni or Benjamini-Hochberg to control false discoveries, (4) more users needed: each pairwise comparison needs adequate power, (5) Bayesian approach: posterior probability each variant is best — naturally handles multiple comparisons, (6) multi-armed bandit: allocate more traffic to winning variants during test, (7) factorial design if testing independent features (e.g., color × layout)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "Your test has been running for 2 months but the metric is a lagging indicator (annual contract renewal). How do you make a decision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Leading indicators: engagement, usage, NPS scores available sooner, (2) predictive model: predict renewal from early signals, use as surrogate metric, (3) historical correlation: validate that leading indicators predict lagging outcomes, (4) synthetic control: estimate what would have happened without treatment, (5) interim analysis with alpha spending: make a decision if effect is very large, (6) Bayesian: continuously update posterior belief, (7) decision theory: expected cost of waiting vs. expected cost of wrong decision."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science for IoT**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "You're building a predictive model using sensor data from 1000 IoT devices. Each generates 1 reading/second. How do you manage this data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Ingestion: Kafka or AWS Kinesis for streaming data, (2) storage: time-series database (InfluxDB, TimescaleDB) for raw data, (3) downsampling: aggregate to 1-minute/5-minute intervals for analysis, (4) feature engineering: rolling windows computed in streaming pipeline, (5) edge computing: pre-process at device level to reduce transmission, (6) anomaly detection at edge: alert immediately, send details to cloud, (7) storage tiering: hot (recent, high-resolution) → warm (months, downsampled) → cold (years, aggregated)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "156",
   "q": "Your IoT sensor data has clock drift — timestamps from different devices don't align perfectly. How does this affect your model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature alignment: if combining data from multiple sensors, misaligned timestamps corrupt features, (2) NTP synchronization: ensure devices use network time protocol, (3) tolerance windows: join events within ±Δ seconds, (4) event ordering: use sequence numbers in addition to timestamps, (5) interpolation: resample all sensors to common time grid, (6) robust features: use statistics over longer windows (minutes, not seconds) to reduce sensitivity to clock drift, (7) monitor drift: track timestamp discrepancies over time."
    },
    {
     "t": "p",
     "text": "**Theme: Search & Information Retrieval**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "You need to improve search relevance for an e-commerce site. Current search uses keyword matching. What ML approaches help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Query understanding: spell correction, synonym expansion, intent classification, (2) learning-to-rank: RankNet, LambdaMART — learn optimal ranking from click-through data, (3) features for ranking: BM25 score, click-through rate, conversion rate, freshness, popularity, price competitiveness, (4) semantic search: embed queries and products in same space (dense retrieval), (5) personalization: user history influences ranking, (6) query rewriting: expand ambiguous queries, (7) evaluation: NDCG@10, MRR, click-through rate, zero-result rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "Your search system returns good results for popular queries but fails on rare queries (long-tail). How do you improve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Semantic search: dense embeddings capture meaning even for unseen queries, (2) query expansion: add related terms using word embeddings or knowledge graphs, (3) fallback strategy: if exact match fails → semantic search → broader category, (4) related searches: suggest popular queries similar to the long-tail query, (5) spell correction: many long-tail queries are misspellings, (6) zero-result analysis: log and manually review failed queries, (7) synonym and abbreviation dictionaries: domain-specific term mappings."
    },
    {
     "t": "p",
     "text": "**Theme: Production Data Quality**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "Your production model's input data has a feature that occasionally contains impossible values (e.g., age = -5, height = 500cm). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Input validation layer: define acceptable ranges per feature, (2) reject or clip impossible values: `age = max(0, min(age, 120))`, (3) replace with null and use model's missing value handling, (4) log violations: track which features and how often, (5) alert if violation rate exceeds threshold, (6) root cause: fix upstream data issues, (7) Great Expectations or Pandera for schema enforcement, (8) don't silently ignore — these indicate pipeline or data quality issues."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "Your data team discovers that a key feature was computed incorrectly for the past 3 months. Your model has been using these incorrect values. What's your response plan?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Assess impact: how different are correct vs. incorrect values? Run model with corrected features on historical data, (2) if impact is significant: immediately deploy corrected feature, consider retraining, (3) quantify business impact: how many predictions were wrong and what decisions were affected?, (4) backfill correct values, (5) retrain model using corrected feature values, (6) postmortem: how did this bypass quality checks?, (7) add validation tests for this feature, (8) communication: notify stakeholders about the issue and remediation."
    },
    {
     "t": "p",
     "text": "**Theme: Large-Scale ML**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "161",
   "q": "You need to train a model on 1 billion rows. What framework and strategy do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Gradient boosting: LightGBM handles billions of rows natively with histogram-based splitting, (2) distributed: XGBoost on Spark (SparkXGBoost) or Dask-XGBoost, (3) subsampling: train on a representative 10% sample first — does more data help?, (4) incremental learning: algorithms that learn in chunks (SGDClassifier, online learning), (5) Feature reduction: start with top 50 features to reduce compute, (6) infrastructure: multi-GPU or distributed cluster, (7) data format: Parquet for efficient columnar reads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "Your feature store needs to serve 20 features for 50,000 predictions/second with < 10ms latency. How do you design it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Online store: Redis or DynamoDB for key-value lookup (< 1ms per feature), (2) batch pre-computation: compute features offline, materialize to online store, (3) feature grouping: store all user features together (single lookup), (4) read-through caching: if feature not in cache → compute and cache, (5) partition by entity key for distributed serving, (6) circuit breaker: if feature store is slow → use default values, (7) monitoring: p99 latency, cache hit rate, staleness, (8) async updates: stream updates as events arrive."
    },
    {
     "t": "p",
     "text": "**Theme: Behavioral Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "You're analyzing user behavior on a website. Users can take multiple paths to conversion. How do you identify the most effective path?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Sequence analysis: extract common conversion paths, (2) Markov chain: model transitions between pages, calculate transition probabilities, (3) attribution: which touchpoints contribute most to conversion? (Shapley value attribution), (4) funnel analysis: where do users drop off?, (5) path comparison: successful converters vs. non-converters — what's different?, (6) sequential pattern mining: frequent conversion sequences, (7) process mining: discover actual user flows vs. designed flows, (8) segmentation: different user types may have different optimal paths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "Your retention analysis shows users who use Feature X in their first week retain at 80% vs. 40% for non-users. Does Feature X cause retention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Likely confounded: (1) users who use Feature X may be more engaged overall (selection bias), (2) correlation ≠ causation: both Feature X usage and retention may be caused by higher motivation, (3) propensity score matching: compare similar users who did/didn't use Feature X, (4) instrumental variable: is there something that randomly increased Feature X exposure?, (5) A/B test: randomly expose users to Feature X via prompts, measure retention, (6) DAG analysis: draw causal graph with confounders, (7) if causal: Feature X is an \"aha moment\" → optimize onboarding to guide users there."
    },
    {
     "t": "p",
     "text": "**Theme: MLOps Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "You need to set up a model registry for your team. What features are essential?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model versioning: track all model versions with metadata, (2) stage management: dev → staging → production promotion workflow, (3) artifact storage: model files, preprocessing artifacts, configuration, (4) metadata: training data version, features used, metrics, training parameters, (5) lineage: which dataset and code produced which model, (6) comparison: side-by-side metric comparison of versions, (7) access control: who can promote to production, (8) integration: CI/CD pipeline triggers on model promotion, (9) tools: MLflow Model Registry, SageMaker Model Registry, Vertex AI Model Registry."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "Your model training pipeline takes 4 hours. A developer pushes a code change that breaks it. You don't find out until the next day. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) CI/CD for ML: run training pipeline on code push (on small data sample), (2) unit tests for feature engineering functions, (3) integration tests: end-to-end pipeline on test data, (4) data validation tests: schema checks, (5) smoke tests: does the model load and predict?, (6) automated notifications: pipeline failures → Slack/email immediately, (7) canary training: fast mini-pipeline catches issues before full training, (8) branch protection: require passing tests before merge."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "You have 10 models in production. How do you manage monitoring at scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Centralized monitoring dashboard: all models on one view, (2) standardized metrics: every model reports same core metrics (latency, error rate, drift score), (3) tiered alerting: critical (model down) → urgent (drift detected) → informational (performance trending down), (4) automated health checks: scheduled evaluation on holdout data, (5) model scorecards: monthly automated report per model, (6) on-call rotation: ML engineer responsible for production issues, (7) runbooks: standard procedures for common issues per model."
    },
    {
     "t": "p",
     "text": "**Theme: Correlation and Causation Deep Dives**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "Simpson's Paradox appears in your analysis — a trend that appears in several different groups reverses when the groups are combined. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Identify the lurking variable causing the reversal, (2) example: drug appears worse overall but better in each subgroup → groups have different baseline severity, (3) always report stratified (subgroup) results alongside aggregate, (4) causal reasoning: determine which level (stratified or aggregate) answers your question, (5) use DAGs: if the grouping variable is a confounder → stratify; if it's a mediator → don't stratify, (6) communicate to stakeholders: show both views with explanation, (7) example in data science: model A better on easy data, model B better on hard data, A has more easy data → A looks better overall."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "Your manager asks \"does our loyalty program increase customer spending?\" You only have observational data. How do you estimate the causal effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Challenge: customers who join loyalty programs may already be high spenders. (1) Propensity score matching: match joiners with similar non-joiners on pre-program features, (2) DiD: compare spending trends before/after joining vs. non-joiners, (3) regression discontinuity: if there's a qualifying threshold, compare just above/below, (4) IV: use distance to store (affects enrollment) as instrument, (5) always present: \"estimated causal effect with these assumptions: ...\", (6) best: advocate for randomized rollout or holdout for future programs."
    },
    {
     "t": "p",
     "text": "**Theme: Model Governance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "Your company is implementing model governance. What framework do you propose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model inventory: catalog all models, purpose, owner, risk tier, (2) risk tiering: Tier 1 (high-risk: financial, health, safety), Tier 2 (medium: recommendations, pricing), Tier 3 (low: internal analytics), (3) development standards: code review, documentation, testing requirements per tier, (4) validation: independent validation for Tier 1 before deployment, (5) model cards: standardized documentation template, (6) monitoring requirements: drift, performance, fairness — frequency based on tier, (7) review cadence: annual review for all, quarterly for Tier 1, (8) decommissioning: process for retiring models, (9) audit trail: all decisions and changes documented."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "A regulator asks you to explain your model's decision-making process. What documentation do you provide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model card: purpose, methodology, limitations, (2) feature list with business definitions and data sources, (3) model architecture and training procedure, (4) validation results: accuracy, calibration, across subgroups, (5) fairness analysis: disparate impact, equalized odds per protected group, (6) sample explanations: SHAP/LIME for representative decisions, (7) monitoring reports: ongoing performance and drift, (8) override process: when and how humans can override, (9) change history: log of all model updates with justification."
    },
    {
     "t": "p",
     "text": "**Theme: Cross-Functional Collaboration**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "The engineering team wants to rebuild your model's feature pipeline in Spark, but your model was trained with pandas features. How do you ensure consistency?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Unit tests: compare pandas vs. Spark output on same data, (2) feature store: decouple feature computation from model — both write to same interface, (3) snapshot testing: generate features using both, diff the outputs, (4) handle edge cases: null handling differs between pandas and Spark, (5) float precision: may differ — set tolerance for comparison, (6) string handling: encoding, whitespace can differ, (7) regression test pipeline: score same records through both pipelines, compare predictions, (8) gradual migration: one feature at a time with validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "The product team wants your model to also return a \"confidence score\" that users can understand. How do you implement this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't use raw probability — it's not well-calibrated, (2) calibrate: Platt scaling or isotonic regression to get true probabilities, (3) discretize into buckets: \"High Confidence,\" \"Medium,\" \"Low\" based on calibrated thresholds, (4) validate: \"High Confidence\" predictions should actually be right 90%+ of the time, (5) user-facing text: \"We're fairly confident\" vs. technical P(positive)=0.73, (6) visual: color coding or confidence bars, (7) important: calibration evaluation — reliability diagram."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Topics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "You need to build a model that can say \"I don't know\" (abstain from prediction). How do you implement this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Confidence threshold: abstain if max prediction probability < threshold, (2) multiple model agreement: abstain if ensemble members disagree, (3) MC Dropout: run inference multiple times, abstain if high prediction variance, (4) conformal prediction: abstain if prediction set contains multiple classes, (5) out-of-distribution detection: autoencoder reconstruction error, Mahalanobis distance to training data, (6) cost-benefit: tune abstention rate to balance accuracy gain vs. unanswered queries, (7) routing: abstained predictions go to human expert or more complex model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "Your model needs to handle distribution shift at test time without retraining. What approaches exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Test-time adaptation (TTA): fine-tune on test batch using self-supervised objectives, (2) domain generalization: train to be robust across domains from the start, (3) batch normalization adaptation: update BN statistics with test batch, (4) prediction-time augmentation: average predictions over augmented versions, (5) calibration adjustment: recalibrate probabilities using unlabeled test data, (6) importance weighting: weight training examples by similarity to test distribution, (7) ensemble: models trained on diverse domains."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
