/* ============================================================================
   PRACTICE P4.13 — Predict the Output / Scenarios · 13
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.13",
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
   "text": "Predict the Output / Scenarios · 13",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "301",
   "q": "Your binary classification problem has a class ratio of 1:1000. Standard algorithms don't learn the minority class. What's your comprehensive strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Modeling Strategies**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Resampling: SMOTE + Tomek links (clean synthetic oversampling), (2) class weights: `class_weight='balanced'` or custom weights (1000:1), (3) anomaly detection framing: learn normal class, flag deviations, (4) ensemble: balanced bagging — each base model trains on balanced subset, (5) focal loss: down-weight easy-to-classify majority examples, (6) two-stage: rule-based pre-filter → ML on filtered set (more balanced), (7) metric: AUPRC, not accuracy or AUC-ROC, (8) threshold tuning: optimize F1 or custom cost function, (9) collect more minority samples if possible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "302",
   "q": "Your model needs to handle both numerical stability (very large/small numbers) and missing values simultaneously. What preprocessing pipeline do you build?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import RobustScaler, PowerTransformer\n\npipeline = ColumnTransformer([\n    ('numeric', Pipeline([\n        ('impute', SimpleImputer(strategy='median')),\n        ('clip', FunctionTransformer(\n            lambda X: np.clip(X, np.percentile(X, 1, axis=0),\n                              np.percentile(X, 99, axis=0)))),\n        ('transform', PowerTransformer(method='yeo-johnson')),\n        ('scale', RobustScaler())  # robust to remaining outliers\n    ]), numeric_cols),\n    ('categorical', Pipeline([\n        ('impute', SimpleImputer(strategy='constant', fill_value='missing')),\n        ('encode', OrdinalEncoder(handle_unknown='use_encoded_value',\n                                  unknown_value=-1))\n    ]), cat_cols)\n])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "303",
   "q": "Your model ensemble includes 3 models: logistic regression, random forest, and XGBoost. The LR predicts probabilities in 0.2-0.8 range, RF in 0.0-1.0, and XGBoost clusters around 0.5. How do you combine them fairly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Calibrate each model separately before ensembling (Platt scaling or isotonic), (2) after calibration: probabilities are on the same scale → meaningful averaging, (3) weighted average: optimize weights on validation set, (4) stacking: meta-learner that learns to combine irrespective of scale, (5) rank-based ensemble: use rank of predictions rather than raw scores, (6) never average uncalibrated probabilities — models with wider ranges dominate."
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
   "n": "304",
   "q": "Your dataset has text fields with mixed languages (English and Spanish interleaved). How do you process this for NLP tasks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Language detection per sentence: fasttext lid model, (2) options: (a) translate all to English, then process, (b) multilingual model (XLM-R) handles both natively, (c) separate processing: split by language, process each, combine, (3) code-switching specific models exist for common language pairs, (4) features: language ratio in document, (5) challenge: entities may span languages (\"Dr. Garcia says good morning\"), (6) evaluation: ensure quality in both languages."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "305",
   "q": "Your e-commerce data has product descriptions that were copied/pasted from manufacturers (duplicated across many products). How does this affect text-based models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Near-duplicate detection: MinHash/LSH to find similar descriptions, (2) impact on model: TF-IDF weights are wrong (IDF inflated for duplicated terms), (3) topic modeling: topic distributions skewed by duplicates, (4) recommendations: text similarity inflated for products sharing descriptions, (5) fix: deduplicate before TF-IDF computation, (6) better features: extract unique product attributes rather than using full description, (7) create custom descriptions: use LLM to generate unique descriptions from structured attributes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "306",
   "q": "Your data has naturally occurring duplicates (same customer orders same product on consecutive days). How do you distinguish legitimate duplicates from data entry errors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Business rules: define impossible duplicates (same order_id, same timestamp), (2) probable duplicates: same customer + same product + same quantity within X minutes, (3) confirmed legitimate: different order_ids, different timestamps, different items, (4) fuzzy matching: compare fields with edit distance, (5) human review queue: borderline cases for manual verification, (6) don't remove all duplicates blindly — some are real repeat purchases, (7) create a \"is_potential_duplicate\" feature for models, (8) domain knowledge: in what scenarios do legitimate duplicates occur?"
    },
    {
     "t": "p",
     "text": "**Theme: Scalable Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "307",
   "q": "You need to run 1000 experiments (hyperparameter search) overnight. How do you parallelize efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Optuna with distributed backend: multiple workers search in parallel, (2) Ray Tune: distributed hyperparameter optimization, (3) cloud: spin up spot instances, each runs experiments concurrently, (4) job scheduler: SLURM, Kubernetes Job for cluster execution, (5) early stopping: Hyperband/ASHA — kill bad configurations early, free resources, (6) shared results database: all workers write to same Optuna study, (7) resource allocation: GPU-efficient configs run on GPU, CPU configs on CPU."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "308",
   "q": "Your training data grows by 1GB per day. Retraining from scratch weekly takes increasing time. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Incremental learning: fine-tune existing model on new data, (2) sliding window: train on last 90 days only (fixed training size), (3) warm-starting: initialize with previous model weights, (4) downsample old data: keep 10% of old + 100% of recent, (5) active learning: select most informative samples from growing data, (6) online learning: update model continuously as data arrives, (7) evaluate: does more data actually help? Plot learning curve, (8) data versioning: DVC to track which data trained which model."
    },
    {
     "t": "p",
     "text": "**Theme: Domain: E-commerce Analytics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "309",
   "q": "You need to detect price scraping bots that monitor your product prices. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Traffic patterns: high frequency views of pricing pages, no add-to-cart, (2) user agent analysis: known scraper signatures, (3) behavioral: consistent timing intervals (bot-like), no mouse movement or scrolling, (4) IP analysis: data center IPs, VPN exit nodes, rotating proxies, (5) rate limiting: throttle excessive page views, (6) CAPTCHA: challenge suspicious sessions, (7) honeypot: invisible price elements that only bots detect, (8) model: classify sessions as human/bot based on behavioral features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "310",
   "q": "Your product search has a high \"no results\" rate (15% of searches find nothing). How do you reduce this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Query analysis: what are users searching for that has no results?, (2) spell correction: \"iphoone\" → \"iphone\" (Levenshtein distance), (3) synonym expansion: \"sofa\" → also search \"couch,\" \"loveseat,\" (4) partial matching: \"blue running shoes\" → match \"running shoes\" if exact match fails, (5) semantic search: embedding-based search that understands intent, (6) category suggestions: \"we don't have X, but try Y,\" (7) zero-result dashboard: daily monitoring and manual query mapping, (8) long-term: expand inventory for frequently searched items with no results."
    },
    {
     "t": "p",
     "text": "**Theme: Debugging ML Models**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "311",
   "q": "Your neural network produces the same output for every input. What's wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Dead ReLU: neurons saturated, output constant — try LeakyReLU, (2) learning rate too high: weights exploded to extreme values early, (3) vanishing gradients: weights not updating — check gradient norms, (4) initialization: all weights initialized to zero or same value, (5) batch norm without training=True, (6) last layer sigmoid saturated: output stuck near 0 or 1, (7) data: all inputs are the same after preprocessing (normalization bug), (8) debug steps: (a) check if loss changes, (b) print gradients, (c) check intermediate layer activations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "312",
   "q": "Your model performs differently every time you train it (accuracy varies from 75% to 85%). How do you stabilize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Set random seeds: Python, NumPy, framework-specific, (2) deterministic algorithms: `torch.use_deterministic_algorithms(True)`, (3) investigation: variance is high → model is sensitive to initialization or data order, (4) increase training data: more data → less variance, (5) ensemble: average multiple trained models, (6) regularization: prevents fitting to noise that varies between runs, (7) larger batch sizes: reduce stochasticity, (8) report: mean ± std across 5+ runs for fair comparison."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "313",
   "q": "Your XGBoost model performs great on the validation set but feature importance shows a \"user_id\" feature is #1. What's wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data leakage: user_id shouldn't be a predictive feature, (2) it's acting as a lookup table: memorizing user-specific outcomes, (3) won't generalize to new users, (4) immediate fix: remove user_id from features, (5) check other features: any that are unique per row (transaction_id, row_number)?, (6) if you want user-level patterns: engineer features from user_id (user_transaction_count, user_avg_spend), (7) lesson: always review top feature importance for suspiciously informative features."
    },
    {
     "t": "p",
     "text": "**Theme: ML Ethics & Governance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "314",
   "q": "Your company is building an AI ethics board. What should its charter include?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Review process: which projects require ethics review? (risk-based), (2) composition: diverse members — technical, legal, ethicists, affected community representatives, (3) criteria: fairness, privacy, transparency, accountability, safety, (4) authority: can it veto deployment? Or only advise?, (5) timeline: review at design phase (not just pre-launch), (6) documentation: standardized ethics review template, (7) incident response: process for addressing ethics concerns post-deployment, (8) education: training for engineers on ethical AI, (9) external audit: periodic third-party review."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "315",
   "q": "A customer asks for their data to be deleted under GDPR. Your model was trained on their data. What are your obligations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Delete personal data from databases, backups, (2) model weights: generally considered aggregated/anonymized — individual data can't typically be extracted, (3) but: if model memorizes (especially language models), may need action, (4) machine unlearning: approximate methods exist but aren't standard, (5) practical: retrain model without the user's data (if requested and feasible), (6) SISA training: train on shards for efficient unlearning, (7) legal: consult privacy team — interpretation varies by jurisdiction, (8) document: record the deletion request and actions taken."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Code Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "316",
   "q": "You need to process a large DataFrame operation that takes hours. How do you add progress tracking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from tqdm import tqdm\ntqdm.pandas()  # enable progress_apply\n\n# For apply operations\nresult = df.progress_apply(complex_function, axis=1)\n\n# For groupby\nresult = df.groupby('category').progress_apply(complex_agg)\n\n# For chunks\nfor chunk in tqdm(pd.read_csv('large.csv', chunksize=10000),\n                  total=total_rows // 10000):\n    process(chunk)\n\n# For custom loops with ETA\nwith tqdm(total=len(items), desc=\"Processing\") as pbar:\n    for item in items:\n        result = process(item)\n        pbar.update(1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "317",
   "q": "You need a robust exception handling pattern for your ML pipeline that doesn't silently fail. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import logging\nfrom dataclasses import dataclass\nfrom typing import Optional\n\nlogger = logging.getLogger(__name__)\n\n@dataclass\nclass PipelineResult:\n    success: bool\n    data: Optional[any] = None\n    error: Optional[str] = None\n    stage: Optional[str] = None\n\ndef run_pipeline(data):\n    stages = [\n        (\"data_validation\", validate_data),\n        (\"feature_engineering\", engineer_features),\n        (\"model_prediction\", predict),\n        (\"post_processing\", post_process),\n    ]\n    for stage_name, stage_func in stages:\n        try:\n            data = stage_func(data)\n            logger.info(f\"Stage '{stage_name}' completed successfully\")\n        except Exception as e:\n            logger.error(f\"Stage '{stage_name}' failed: {e}\")\n            return PipelineResult(success=False, error=str(e),\n                                 stage=stage_name)\n    return PipelineResult(success=True, data=data)"
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Topic: Causal Discovery**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "318",
   "q": "You have observational data with 20 variables. You want to discover causal relationships (not just correlations). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) PC algorithm: constraint-based, uses conditional independence tests, (2) GES (Greedy Equivalence Search): score-based, searches over DAG space, (3) NOTEARS: continuous optimization for learning DAG structure, (4) FCI algorithm: handles hidden confounders, (5) tools: DoWhy + CausalDiscovery, Tetrad, causal-learn Python package, (6) output: causal graph (DAG) with directed edges, (7) validation: (a) domain expert review — does the graph make sense?, (b) check known causal relationships, (c) interventional data if available, (8) limitations: finite sample issues, untestable assumptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "319",
   "q": "You discovered a causal graph. How do you use it to improve your predictive model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature selection: only use features that are causes of the target (not effects), (2) removing colliders: conditioning on a collider introduces bias, (3) markov blanket: smallest set of features needed for optimal prediction, (4) causal features are stable across distributions (transfer better), (5) avoid: using features that are effects of the target (leakage), (6) anti-causal prediction: when predicting causes from effects, different considerations, (7) robustness: causal features-based models are more robust to distribution shift."
    },
    {
     "t": "p",
     "text": "**Theme: Industry Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "320",
   "q": "You're building a model to predict crop yield for agriculture. What unique data and challenges exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data: (1) satellite imagery (NDVI vegetation index), (2) weather: temperature, rainfall, humidity time series, (3) soil: type, moisture, nutrients, (4) historical yields, (5) crop type, planting date, farming practices. Challenges: (6) spatial autocorrelation: nearby fields have similar yields, (7) temporal: seasonal patterns, climate change trends, (8) small sample: few growing seasons of data, (9) interactions: weather × soil × crop type, (10) resolution: satellite data resolution vs. field size, (11) evaluation: can only validate annually (one harvest per year)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "321",
   "q": "You're building a system to predict energy consumption for a smart grid. What makes this different from standard forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple seasonalities: daily (peak hours), weekly (weekdays), annual (summer AC, winter heating), (2) external factors: weather (strongest predictor), holidays, events, (3) renewable integration: solar/wind production is stochastic, (4) demand response: pricing signals change consumption (endogenous), (5) spatial: different areas have different patterns, (6) high stakes: grid stability depends on accurate forecasts, (7) resolution: 15-minute intervals for grid management, (8) new patterns: EV charging, work-from-home changing historical patterns."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Evaluation Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "322",
   "q": "You need to compare 5 models but each was evaluated on a different test set (legacy issue). How do you make a fair comparison?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Re-evaluate all models on the SAME test set — essential for comparison, (2) if models can't be re-evaluated: statistical comparison isn't meaningful on different data, (3) report limitation: \"models were evaluated on different test sets, comparison is approximate,\" (4) normalize by dataset difficulty: compare vs. baseline on each test set, (5) use relative improvement over a common simple baseline, (6) future: standardize evaluation — shared test set, versioned data, reproducible metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "323",
   "q": "Your model performs differently on weekday vs. weekend data. Should you report one metric or two?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Report both AND combined: \"Overall AUC: 0.88; Weekday: 0.90; Weekend: 0.82\", (2) if performance differs significantly: investigate why and potentially build separate models, (3) weight by volume: if weekdays are 70% of traffic, weighted metric reflects production experience, (4) stakeholder communication: if decisions differ by day, report separately, (5) monitoring: track per-segment metrics in production dashboards."
    },
    {
     "t": "p",
     "text": "**Theme: Data Pipeline Design**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "324",
   "q": "Design a data pipeline for a recommendation system that needs near-real-time updates (< 5 minutes staleness).",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Event collection**: user events → Kafka topic (clicks, views, purchases), (2) **Stream processing**: Flink/Spark Streaming for real-time feature aggregation, (3) **Feature store update**: write computed features to online store (Redis), (4) **Batch enrichment**: daily Spark job for user/item profiles, embeddings, (5) **Model serving**: recommendation API reads from online feature store, scores candidates, (6) **Retraining trigger**: automated daily retrain on new interaction data, (7) **Monitoring**: event lag, feature freshness, recommendation quality metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "325",
   "q": "Your data pipeline has grown organically and is now a mess of cron jobs, scripts, and notebooks. How do you refactor?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Map current state: document all jobs, dependencies, schedules, owners, (2) identify critical paths: which pipelines feed production models?, (3) consolidate to orchestrator: migrate to Airflow/Dagster, (4) incremental migration: move one pipeline at a time, keep others running, (5) add testing: data quality checks at each stage, (6) standardize: common patterns for ingestion, transformation, loading, (7) monitoring: alerting for all pipeline failures, (8) documentation: each pipeline has README, data lineage."
    },
    {
     "t": "p",
     "text": "**Theme: Machine Learning Security**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
