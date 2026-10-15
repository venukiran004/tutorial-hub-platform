/* ============================================================================
   PRACTICE P4.11 — Predict the Output / Scenarios · 11
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.11",
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
   "text": "Predict the Output / Scenarios · 11",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "251",
   "q": "Your ML pipeline needs to process 10 different data sources, each with different schemas and update frequencies. How do you architect this?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced ML Pipeline Architecture**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Adapter pattern: standardized interface per source, source-specific implementation, (2) schema registry: define and version expected schemas, validate on ingestion, (3) update orchestration: Airflow schedule per source frequency (hourly, daily, weekly), (4) idempotent ingestion: re-running doesn't create duplicates, (5) monitoring: freshness dashboard per source with SLA tracking, (6) state management: track last successful ingestion per source, (7) backfill capability: replay historical data when pipeline changes, (8) decoupling: sources write to landing zone → standardized processing → feature store."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "252",
   "q": "Your team needs to manage feature definitions across multiple models. How do you implement a feature catalog?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Central registry: YAML/JSON definitions with name, description, owner, computation logic, (2) versioning: feature definitions change over time — track versions, (3) lineage: which raw tables produce which features, (4) usage tracking: which models use which features, (5) quality metrics: null rates, distribution stats per feature, (6) discovery: searchable catalog for data scientists to find existing features, (7) implementation: Feast feature repo, Tecton, or custom metadata store, (8) governance: deprecation process, breaking change notifications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "253",
   "q": "Your pipeline computes the same features for 5 different models. How do you avoid redundant computation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature store: compute once, serve many — central feature repository, (2) shared feature engineering module: common code imported by all models, (3) materialized features: pre-compute and store in database/cache, (4) dependency graph: identify common features across models, compute in shared step, (5) scheduling: common feature computation runs first, model-specific features run per model, (6) cost tracking: attribute compute costs to features, optimize expensive ones."
    },
    {
     "t": "p",
     "text": "**Theme: Responsible AI Deep Dives**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "254",
   "q": "Your model is used for parole decisions. What special considerations apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Life-altering decision: must be interpretable and fair, (2) historical bias: past parole decisions reflect systemic racism — training on them perpetuates bias, (3) protected attributes: race, ethnicity must not influence decisions directly or via proxies, (4) COMPAS controversy: study showed bias in a widely-used risk assessment tool, (5) require human decision-maker: model provides input, not decision, (6) right to explanation: defendant should understand factors, (7) regular bias audits: statistical parity, equalized odds across groups, (8) consider: should ML be used here at all? Strong arguments against."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "255",
   "q": "Your recommendation model creates filter bubbles. Users only see content that confirms their views. How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Diversity injection: include items from different categories/perspectives, (2) serendipity bonus: score = relevance + α × novelty, (3) exposure diversity metric: track range of content types shown, (4) editorial curation: human editors ensure important content surfaces, (5) user controls: let users adjust diversity preferences, (6) opposing viewpoints: deliberately include respectful contrasting perspectives, (7) measure: echo chamber metrics (content similarity over time), (8) A/B test: test diversity interventions on engagement AND satisfaction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "256",
   "q": "You need to implement \"right to explanation\" for automated decisions under GDPR Article 22. What do you provide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Decision factors: top 3-5 features that influenced the decision, (2) decision logic: simplified explanation of how factors led to outcome, (3) counterfactual: \"the decision would change if X were different,\" (4) accessible language: non-technical explanation, (5) contact information: human to discuss the decision, (6) appeal mechanism: how to challenge the decision, (7) model documentation: general description of the decision system, (8) timing: explanation should be available upon request, ideally proactively."
    },
    {
     "t": "p",
     "text": "**Theme: Time Series Anomaly Detection**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "257",
   "q": "Your server monitoring system generates 100 metrics. You need to detect anomalies across all metrics simultaneously. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multivariate approach: LSTM autoencoder trained on normal multi-metric patterns, (2) reconstruction error: high error signals anomaly across metrics, (3) per-metric thresholds: 3-sigma or IQR-based for each metric independently, (4) correlation analysis: detect when normal correlations break (e.g., CPU up but throughput down), (5) dimensionality reduction: PCA on metrics, monitor first few components, (6) ensemble: combine per-metric and multivariate detectors, (7) context-aware: different thresholds for business hours vs. off-hours, (8) alert correlation: group related metric anomalies into a single incident."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "258",
   "q": "Your anomaly detection system generates too many alerts. How do you reduce alert fatigue?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Alert grouping: combine related alerts into incidents, (2) severity tiering: critical (page immediately) vs. warning (daily review), (3) alert deduplication: suppress repeated alerts within time window, (4) root cause detection: alert on root cause, not symptoms, (5) adaptive thresholds: adjust based on false positive feedback, (6) contextual suppression: don't alert during known maintenance, (7) anomaly scoring: rank by severity, review top-N, (8) escalation policy: auto-resolve if metric returns to normal within 10 minutes."
    },
    {
     "t": "p",
     "text": "**Theme: Financial ML Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "259",
   "q": "You're building an algorithmic trading strategy using ML. What pitfalls are specific to financial ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Look-ahead bias: using information not available at decision time, (2) survivorship bias: only including currently listed stocks, (3) data snooping: testing many strategies, reporting the best (p-hacking), (4) regime changes: market behavior changes (bull vs. bear), (5) transaction costs: paper profits often disappear after fees, slippage, market impact, (6) non-stationarity: financial time series are non-stationary, (7) overfitting: high-dimensional data, limited independent samples, (8) walk-forward validation mandatory: never random CV, (9) P(data|model) vs. P(profit|model): good predictions don't guarantee profit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "260",
   "q": "Your credit risk model needs to be stress-tested. What does this involve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Scenario analysis: model performance under recession, market crash, pandemic, (2) shift feature distributions: unemployment +5%, GDP -3%, interest rates +2%, (3) evaluate: how does default rate prediction change?, (4) capital adequacy: would the bank have enough reserves under stress?, (5) historical stress: replay 2008 financial crisis data, (6) reverse stress testing: find scenarios that would cause model failure, (7) regulatory requirements: Basel III/IV stress testing frameworks, (8) documentation: full stress test report for regulators."
    },
    {
     "t": "p",
     "text": "**Theme: Computer Vision in Practice**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "261",
   "q": "You need to count objects in images (e.g., count cars in a parking lot from aerial photos). What approaches work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Object detection: YOLO or Faster R-CNN → count bounding boxes, (2) density estimation: CSRNet — predict density map, sum for count, (3) regression on global features: CNN → count (works for fixed perspective), (4) segmentation + counting: instance segmentation (Mask R-CNN) for exact boundaries, (5) considerations: occlusion (partially visible objects), perspective (far vs. near), (6) data: annotate bounding boxes for detection, or dot annotations for density, (7) real-time: YOLO for 30+ FPS, adjust model size for accuracy vs. speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "262",
   "q": "Your image classification model needs to work at night (low light conditions) but was trained on daytime images. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data augmentation: brightness reduction, noise addition, simulated low-light, (2) collect night-time data and fine-tune, (3) domain adaptation: CycleGAN to translate day→night images for training, (4) pre-processing: image enhancement (histogram equalization, dehazing) before inference, (5) infrared/thermal cameras: different modality better for night, (6) multi-modal: combine visible + IR sensors, (7) style transfer augmentation: apply night-time visual styles to training data, (8) test-time adaptation: adjust batch normalization for night conditions."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Missing Data**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "263",
   "q": "Your dataset has MNAR (Missing Not At Random) data — people with high income don't report their income. How does this affect your model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) MNAR means the missingness depends on the unobserved value itself — hardest to handle, (2) simple imputation (mean, median) will underestimate true income for missing entries, (3) \"is_missing\" indicator captures the pattern (high earners don't report → missing = likely high income), (4) selection models (Heckman): model the missing mechanism jointly with the outcome, (5) sensitivity analysis: range of results under different assumptions about missing values, (6) multiple imputation under MNAR assumptions (pattern-mixture models), (7) domain knowledge: consult with experts about the mechanism."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "264",
   "q": "Your pipeline handles missing values with mean imputation during training. In production, a new category of features starts arriving as all nulls. Mean imputation masks the problem. How do you detect this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Monitor null rate per feature: alert when null rate exceeds training-time rate + threshold, (2) feature quality dashboard: daily null rates, (3) conditional monitoring: if feature X and Y are always null together → upstream source failure, (4) alert on 100% null rate: definite pipeline issue, (5) validation gate: reject prediction requests with too many null features, (6) separate monitoring for \"expected missing\" vs. \"unexpected missing,\" (7) data contract: define acceptable null rates per feature, alert on violation."
    },
    {
     "t": "p",
     "text": "**Theme: Simulation & Monte Carlo Methods**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "265",
   "q": "Your business wants to know: \"What's the probability our revenue target is achievable?\" How do you use simulation to answer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Build a revenue model: revenue = customers × conversion rate × average order value, (2) parameterize uncertainty: each component has a distribution (not point estimate), (3) Monte Carlo simulation: sample from each distribution 10,000 times, (4) compute revenue for each simulation, (5) result: distribution of possible revenues, (6) answer: \"there's a 65% probability of meeting the $10M target, and a 90% probability of exceeding $8M,\" (7) sensitivity analysis: which parameter has the largest impact on variance?, (8) scenario planning: what levers would increase probability of hitting target?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "266",
   "q": "You need to estimate the uncertainty of a complex KPI that's a function of multiple model predictions. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Propagate uncertainty through the computation: bootstrap or Monte Carlo, (2) for each simulation: draw from prediction distributions, compute KPI, (3) example: profit = predicted_revenue × (1 - predicted_return_rate) - predicted_cost, (4) each prediction has uncertainty → KPI has uncertainty, (5) correlation: if predictions are correlated, simulate jointly, (6) output: KPI with confidence interval, (7) communication: \"expected profit is $1M with 80% CI of [$0.7M, $1.4M].\""
    },
    {
     "t": "p",
     "text": "**Theme: Interview-Style Design Problems**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "267",
   "q": "\"Design a system to detect fake social media accounts.\" Walk through your approach from data to deployment.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features: (1) account age, (2) posting frequency and timing patterns, (3) follower/following ratio, (4) profile completeness (photo, bio, location), (5) content analysis: copy-pasted text, stock photos, (6) network analysis: connected to other suspected fakes?, (7) behavioral: human-like activity patterns vs. bot patterns, (8) engagement: likes/comments received vs. given."
    },
    {
     "t": "p",
     "text": "Model: (9) gradient boosting on tabular features + graph features, (10) text model for content analysis, (11) image model for profile photo analysis (stock photo detection)."
    },
    {
     "t": "p",
     "text": "System: (12) batch scoring of existing accounts + real-time scoring at registration, (13) graduated response: flag → limit → suspend, (14) appeal process for false positives, (15) adversarial retraining as fake tactics evolve."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "268",
   "q": "\"Design a warranty claims prediction system for an electronics manufacturer.\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data: product specs, manufacturing data (production line, date, QC results), sales data, warranty claims history, (2) features: product model, manufacturing batch, electronic component suppliers, stress test results, customer segment, usage patterns (if IoT-enabled), (3) target: probability of warranty claim within 12 months of purchase, (4) model: survival analysis (time-to-claim) or classification (claim/no-claim), (5) actionable: flag high-risk batches for proactive outreach, adjust warranty pricing, improve QC for problematic components, (6) financial: estimate warranty reserve requirements, (7) feedback: claim reasons feed back to manufacturing for quality improvement."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Ethics Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "269",
   "q": "Your model predicts employee attrition. HR wants to use it to identify \"flight risks\" and pre-emptively manage them. What concerns do you raise?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Manager behavior: labeled \"flight risk\" may lead to reduced investment in employee (self-fulfilling), (2) privacy: what data is used? Monitoring email frequency? Building badge swipes?, (3) false positives: falsely labeling loyal employees as flight risks damages trust, (4) power dynamics: employees can't consent meaningfully to workplace surveillance, (5) fairness: does the model disproportionately flag certain demographics?, (6) acceptable use: use for improving working conditions (aggregate), not targeting individuals, (7) alternative: anonymous employee surveys are more ethical and often more effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "270",
   "q": "Your A/B test shows that a dark pattern (confusing UI) increases short-term conversions by 15%. Should you implement it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) No — dark patterns are unethical and often illegal (FTC enforcement), (2) short-term gain vs. long-term damage: customer trust, brand reputation, (3) metrics gaming: conversion up but returns, complaints, and churn likely increase, (4) regulatory risk: GDPR, FTC, California privacy laws increasingly target dark patterns, (5) measure full impact: include refund rate, customer satisfaction, LTV in analysis, (6) advocate: present full-picture analysis to stakeholders, (7) data scientist's responsibility: recommend against harmful applications."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Feature Engineering**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "271",
   "q": "You need to create features from free-text customer feedback for a churn prediction model. What features do you extract?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Sentiment: positive/negative/neutral score per feedback, (2) emotion: anger, frustration, satisfaction (fine-grained), (3) topic: what are they complaining about? (LDA, BERTopic), (4) aggregated over time: average sentiment, sentiment trend, (5) response time: our response latency to their feedback, (6) resolution: was the issue resolved? (binary from text), (7) escalation language: presence of threat words (\"lawyer,\" \"cancel,\" \"competitor\"), (8) frequency: how often does this customer provide feedback?, (9) text length: longer complaints may indicate stronger feelings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "272",
   "q": "Your model needs interaction features but you have 100 features, creating 4,950 pairs. How do you select meaningful interactions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't create all — domain knowledge to select likely interactions, (2) statistical screening: test each interaction, keep significant ones, (3) decision tree: automatically finds important splits = interactions, (4) SHAP interaction values: identify the most important pairwise interactions from a fitted model, (5) L1 regularization: include all interactions, let Lasso select, (6) random forest interaction importance, (7) practical: create top 20 domain-guided interactions + let GBM find the rest, (8) dimensionality reduction on interaction features if needed."
    },
    {
     "t": "p",
     "text": "**Theme: Streaming & Event-Driven ML**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "273",
   "q": "Your ML model needs to score events from a Kafka stream with exactly-once semantics. How do you ensure this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Kafka transactions: consumer reads + producer writes atomically, (2) idempotent processing: design scoring to be safe for retries, (3) deduplication: track processed event IDs in a database, (4) Kafka consumer groups with manual offset commits after successful processing, (5) Flink: provides exactly-once guarantees with checkpointing, (6) fallback: at-least-once + idempotent consumer is simpler and often sufficient, (7) monitoring: track duplicate detection rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "274",
   "q": "Your streaming feature pipeline needs to compute \"number of transactions in last 1 hour\" per user. How do you implement this efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Sliding window with event-time semantics in Flink or Kafka Streams, (2) State store: per-user sorted list of transaction timestamps, (3) on new event: add to list, remove events older than 1 hour, count remaining, (4) Redis sorted set: `ZADD user_txns timestamp timestamp; ZRANGEBYSCORE user_txns (now-3600) now` → count, (5) approximate: HyperLogLog if exact count isn't critical, (6) windowed aggregation in Spark Structured Streaming, (7) late events: define watermark for acceptable lateness."
    },
    {
     "t": "p",
     "text": "**Theme: Decision Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "275",
   "q": "Your model predicts customer churn probability. How do you translate this into an optimal intervention strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Not all churners should be targeted: some will stay regardless, some will leave regardless, (2) uplift modeling: estimate P(stay | intervention) - P(stay | no intervention), (3) cost-benefit: intervention cost vs. customer value × uplift, (4) target customers where: uplift × customer_value > intervention_cost, (5) rank by expected ROI: (uplift × value - cost) / cost, (6) constraints: budget limit → target top-N by ROI, (7) personalize intervention: different strategies for different churn reasons, (8) measure: A/B test the intervention strategy, not just the model."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
