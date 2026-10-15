/* ============================================================================
   PRACTICE P4.15 — Predict the Output / Scenarios · 15
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.15",
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
   "text": "Predict the Output / Scenarios · 15",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "351",
   "q": "You're fine-tuning a BERT model for sentiment analysis on your company's product reviews. Training loss decreases but validation accuracy stays flat after epoch 2. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Deep Learning in Practice**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Overfitting to training data: BERT is large, product reviews may be small dataset, (2) solutions: (a) lower learning rate (2e-5 to 5e-5 typical for BERT), (b) add dropout on classification head, (c) freeze BERT layers, only train classification head first, then unfreeze, (d) early stopping after epoch 2-3, (e) data augmentation: back-translation, synonym replacement, (3) check: is validation set representative? Same distribution as training?, (4) warmup: use linear warmup schedule for learning rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "352",
   "q": "You need to detect objects in satellite images where objects are very small (10×10 pixels in a 4000×4000 image). Standard object detection fails. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Sliding window: crop image into overlapping tiles (512×512), detect per tile, stitch results, (2) super-resolution: upscale regions of interest before detection, (3) small object detectors: YOLO-nano, SSD with feature pyramid network (FPN), (4) anchor sizes: customize anchor boxes for small objects, (5) attention mechanisms: focus computation on promising areas, (6) avoid excessive downsampling: modified backbone that preserves resolution, (7) evaluation: use per-pixel metrics, not just bounding box IoU."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "353",
   "q": "Your GAN generates realistic images but has mode collapse (produces only a few variants). How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Wasserstein loss (WGAN): more stable training, prevents mode collapse, (2) spectral normalization: stabilize discriminator, (3) minibatch discrimination: discriminator considers batches not individual samples, (4) progressive training: start with low-res, gradually increase, (5) diversity regularization: penalize generator for producing similar outputs, (6) check training data: enough diversity in real data?, (7) StyleGAN: architecture designed to avoid mode collapse, (8) monitor: track FID and diversity metrics during training."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Leadership & Management**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "354",
   "q": "You're the first data scientist hired at a startup. Where do you start?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Week 1-2: understand the business — talk to every team lead, learn KPIs, revenue model, (2) Week 2-4: audit data infrastructure — what data exists, where, quality, access, (3) Month 1: quick win project — find one impactful problem solvable with simple analytics, (4) Month 2-3: build data infrastructure — logging, warehousing, basic dashboards, (5) Month 3+: first ML project — aligned with highest business impact, (6) don't: jump into complex ML without understanding the business, (7) communicate: regular updates showing data-driven insights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "355",
   "q": "Your data science team of 5 gets conflicting priorities from 4 different stakeholders. How do you manage this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Central intake: all requests go through one channel (Jira, Notion board), (2) prioritization framework: impact × urgency × feasibility scoring, (3) stakeholder alignment meeting: quarterly, agree on top priorities together, (4) transparency: published roadmap showing what's being worked on and ETAs, (5) capacity planning: show stakeholders the math — \"we have X hours, your projects take Y hours,\" (6) say no with data: \"project A has 5x ROI vs project B,\" (7) buffer: keep 20% capacity for urgent requests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "356",
   "q": "You need to evaluate a data scientist candidate. What practical assessment do you give?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Take-home: messy dataset with real-world issues — EDA, cleaning, modeling, communication (4-hour limit), (2) evaluate: (a) data quality investigation (found issues?), (b) feature engineering creativity, (c) model selection rationale, (d) code quality and reproducibility, (e) communication of findings (narrative, not just code), (3) live: pair programming on data problem — how do they think?, (4) avoid: LeetCode-style algorithm questions (unless role requires it), (5) assess: curiosity, business thinking, not just technical skills."
    },
    {
     "t": "p",
     "text": "**Theme: Statistical Edge Cases**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "357",
   "q": "Your A/B test shows a statistically significant result (p=0.03) but the effect size is tiny (0.1% improvement in click rate). What do you recommend?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Statistical significance ≠ practical significance, (2) calculate: what's the business impact of 0.1%? (if 1B clicks/year → 1M additional clicks), (3) implementation cost: if it's a simple config change → ship it; if it requires major engineering → probably not worth it, (4) confidence interval: is the true effect between 0.05% and 0.15%? Wide CI reduces confidence, (5) long-term: will the effect compound or diminish?, (6) recommendation: present both statistical result and business impact, let stakeholders decide."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "358",
   "q": "You're asked to run 20 A/B tests simultaneously. How do you handle the multiple comparisons problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Bonferroni correction: α = 0.05/20 = 0.0025 (conservative), (2) Benjamini-Hochberg: controls false discovery rate (less conservative), (3) hierarchical testing: test primary metric first, secondary only if primary is significant, (4) pre-registration: specify which tests are confirmatory vs. exploratory, (5) sequential testing: not all 20 need to run same duration, (6) practical: group related tests, use FDR for exploration, Bonferroni for critical decisions, (7) communicate: \"of 20 tests, 3 showed significant results after correction.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "359",
   "q": "Your data has a lurking variable you can't measure. How do you minimize its confounding effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Randomized experiment: if possible, randomization balances unmeasured confounders, (2) instrumental variables: find a variable that affects treatment but not outcome except through treatment, (3) difference-in-differences: compare treated vs. untreated before/after, (4) regression discontinuity: if treatment assignment has a cutoff, compare just above/below, (5) sensitivity analysis: how strong would the confounder need to be to explain the result?, (6) proxy variables: find measurable variables that approximate the lurking variable, (7) acknowledge the limitation clearly in your analysis."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Feature Engineering Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "360",
   "q": "You have user clickstream data (sequence of pages visited). How do you extract meaningful features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Session-level: session duration, page count, bounce rate, (2) sequential: last N pages visited (as categorical features), (3) transition probabilities: likelihood of page A → page B, (4) engagement: time on each page, scroll depth, (5) funnel progress: how far through conversion funnel, (6) recency: time since last specific page type, (7) embeddings: learn page embeddings from sequences (word2vec-like), (8) graph features: user navigation graph metrics, (9) attention patterns: which page categories get most time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "361",
   "q": "You have raw GPS trajectory data for delivery drivers. What features can you engineer for delivery time prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Distance: straight-line and route distance to destination, (2) historical: average delivery time for this area, time of day, day of week, (3) traffic: real-time traffic speed from GPS speeds in the area, (4) driver: driver's average speed, experience, current route progress, (5) stop patterns: number of planned stops remaining, (6) area features: urban density, road type, building accessibility, (7) temporal: rush hour indicator, school zone timing, (8) weather integration: current weather conditions, (9) order features: package size/weight (affects walking time)."
    },
    {
     "t": "p",
     "text": "**Theme: Scenario-Based Machine Learning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "362",
   "q": "You're building a model to predict which patients will miss their appointments. The historical no-show rate is 20%. How do you use this model operationally?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Risk scoring: rank patients by no-show probability, (2) interventions: (a) high-risk: phone reminder + overbooking, (b) medium-risk: SMS reminder, (c) low-risk: standard notification, (3) overbooking strategy: if model predicts 3/15 slots will no-show, book 18 patients, (4) cost asymmetry: false positive (unnecessary reminder) is cheap, false negative (unexpected no-show) is expensive (wasted doctor time), (5) optimize threshold for revenue, not accuracy, (6) feedback loop: track whether reminders change behavior."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "363",
   "q": "You're building a credit scoring model and regulators require you to provide a reason for every denial. How do you implement this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) SHAP values: per-prediction feature contributions, (2) reason codes: top 3-4 features that most negatively impacted the score, (3) example: \"Denial reasons: (1) High debt-to-income ratio, (2) Short credit history, (3) Recent late payments,\" (4) implementation: compute SHAP values, filter negative contributors, rank by magnitude, (5) template: map feature names to human-readable reason codes, (6) regulation: ECOA/Regulation B requires specific adverse action reasons, (7) consistency: same feature values should produce same reasons (deterministic)."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Time Series**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "364",
   "q": "You need to forecast demand at the store-SKU level (10K stores × 50K SKUs = 500M series). How do you handle this scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hierarchical forecasting: forecast at aggregate level, reconcile down, (2) global model: one model trained across all series with store/SKU features, (3) clustering: group similar store-SKU combinations, model per cluster, (4) tools: Amazon Forecast, TimeGEN, or custom with LightGBM, (5) cold start: new SKUs use category-level forecasts, (6) sparse demand: many SKUs have zero or near-zero sales — use intermittent demand models (Croston's), (7) compute: distributed training across cluster, (8) evaluation: weighted MAPE by revenue contribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "365",
   "q": "Your time series model works well for 1-day ahead forecasts but poorly for 7-day ahead. How do you improve the longer horizon?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multi-step strategy: direct multi-output model (predict all 7 days at once), (2) recursive vs. direct: recursive compounds errors, direct trains separate models per horizon, (3) different model per horizon: 1-day = ARIMA, 7-day = ML with external features, (4) add longer-term features: day of week, seasonal indicators, (5) ensemble: combine multiple forecast horizons, (6) external data: weather forecasts, event calendars for longer horizons, (7) wider intervals: communicate higher uncertainty at longer horizons, (8) baseline comparison: for 7-day, seasonal naive may be hard to beat."
    },
    {
     "t": "p",
     "text": "**Theme: Interview Fundamentals Deep Dive**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "366",
   "q": "Explain the bias-variance tradeoff with a concrete example from your experience.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"In a customer churn project: (1) High bias model (logistic regression with 3 features): 65% accuracy consistently — underfits, misses non-linear patterns, (2) High variance model (deep neural network): 95% training, 70% test — memorizes noise, (3) Sweet spot (gradient boosting with regularization): 78% train, 76% test — captures patterns without overfitting, (4) How I tuned: started simple (bias), added complexity (reduced bias, increased variance), used cross-validation to find the knee of the curve, (5) Regularization (L2, max_depth, min_samples_leaf) was key to controlling variance.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "367",
   "q": "You're asked: \"Why not just use deep learning for everything?\" What's your response?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data requirements: DL needs 10K-1M+ examples, many business problems have <10K, (2) interpretability: regulated industries need explainable models, (3) compute cost: training and inference costs for DL >> gradient boosting, (4) tabular data: DL rarely beats XGBoost/LightGBM on structured data, (5) time to iterate: simpler models allow faster experimentation, (6) maintenance: DL models are harder to debug and maintain, (7) when DL wins: images, text, speech, multimodal data, very large datasets, (8) my approach: start with simple models, use DL when simpler models plateau and you have sufficient data."
    },
    {
     "t": "p",
     "text": "**Theme: Production ML Operations**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "368",
   "q": "Your model retraining pipeline takes 6 hours. You need to reduce it to under 1 hour for more frequent updates. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Profile: where does time go? Data loading? Training? Evaluation?, (2) data: incremental training on new data only, not full retrain, (3) computation: larger GPU, distributed training across multiple GPUs, (4) model: distill complex model into simpler, faster-to-train student, (5) data sampling: train on stratified sample (maybe 20% of data gives 95% of performance), (6) feature: pre-compute expensive features in batch pipeline, (7) caching: cache preprocessed data, only reprocess new records, (8) early stopping: stop training when validation metric plateaus (maybe epoch 3 of 20)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "369",
   "q": "Your model serving infrastructure handles 1000 requests/sec. The business expects growth to 10,000 req/sec. How do you prepare?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Load test: simulate 10K req/sec to find bottlenecks, (2) horizontal scaling: auto-scaling behind load balancer, (3) model optimization: TensorRT, ONNX runtime for faster inference, (4) caching: cache frequent prediction requests (Redis), (5) batching: batch nearby requests for efficient GPU utilization, (6) architecture: move from synchronous to async (message queue + workers), (7) CDN: if predictions are cacheable per user segment, pre-compute, (8) quantization: INT8 inference for 2-4x speedup, (9) edge: move inference closer to users for latency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "370",
   "q": "Your ML model needs to comply with SOC 2. What does this mean for your ML pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Access control: who can access training data, model artifacts, and predictions?, (2) audit log: every model change, data access, deployment must be logged, (3) encryption: data at rest and in transit, (4) change management: model deployments follow approval process, (5) monitoring: continuous monitoring of system health and anomalies, (6) incident response: documented procedure for model failures, (7) data retention: clear policies on how long data/models are kept, (8) vendor management: if using cloud ML services, they must also be SOC 2 compliant, (9) testing: regular penetration testing of ML APIs."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Pandas & Data Manipulation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "371",
   "q": "You need to compute rolling statistics over irregular time intervals (events happen at random times). How do you handle this in pandas?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Set datetime index\ndf = df.set_index('event_time').sort_index()\n\n# Time-based rolling window (last 1 hour of events)\ndf['rolling_1h_mean'] = df['value'].rolling('1H').mean()\ndf['rolling_1h_count'] = df['value'].rolling('1H').count()\n\n# For event-count-based window on irregular data\ndf['rolling_10events'] = df['value'].rolling(window=10, min_periods=1).mean()\n\n# Resampling to regular intervals first\nregular = df['value'].resample('5T').agg(['mean', 'count', 'sum'])\nregular = regular.fillna(method='ffill')  # forward fill gaps\n\n# Expanding (cumulative) for irregular data\ndf['cumulative_mean'] = df['value'].expanding().mean()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "372",
   "q": "You need to merge two DataFrames with fuzzy matching on names (e.g., \"John Smith\" and \"Jon Smith\"). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from fuzzywuzzy import fuzz, process\n\ndef fuzzy_merge(df1, df2, key1, key2, threshold=80):\n    matches = []\n    for idx, row in df1.iterrows():\n        best_match = process.extractOne(\n            row[key1], df2[key2].tolist(),\n            scorer=fuzz.token_sort_ratio\n        )\n        if best_match and best_match[1] >= threshold:\n            matches.append({\n                'left_idx': idx,\n                'right_idx': df2[df2[key2] == best_match[0]].index[0],\n                'score': best_match[1],\n                'left_name': row[key1],\n                'matched_name': best_match[0]\n            })\n    match_df = pd.DataFrame(matches)\n    result = df1.merge(match_df, left_index=True, right_on='left_idx')\n    result = result.merge(df2, left_on='right_idx', right_index=True)\n    return result"
    },
    {
     "t": "p",
     "text": "**Theme: ML System Design Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "373",
   "q": "Design a fraud detection system that needs to make decisions in < 100ms while serving 50K transactions/sec.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Architecture: (1) **Real-time path**: transaction → feature computation (Redis lookups: user history, device fingerprint) → lightweight model (LightGBM served via ONNX) → decision in <50ms, (2) **Near-real-time enrichment**: Kafka stream → aggregate features (velocity, graph features) → update feature store, (3) **Batch**: daily deep model retrain on labeled fraud cases, (4) rule layer: hard rules (blocklisted IPs, known fraud patterns) evaluated first — fast reject, (5) model layer: ML scoring for remaining transactions, (6) risk tiers: auto-approve (score<0.1), manual review (0.1-0.7), auto-block (>0.7), (7) feedback: analyst decisions flow back as training data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "374",
   "q": "You're designing a personalized news feed. What ML components are needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Candidate generation**: broad retrieval of relevant articles — collaborative filtering + content-based, (2) **Ranking**: score candidates based on user preferences — click/engagement prediction model, (3) **Diversity**: re-rank to avoid filter bubbles — MMR or topic diversity constraint, (4) **Freshness**: time-decay for old articles, boost breaking news, (5) **Cold start**: new users get popular/trending articles, new articles use content features, (6) **Features**: user history, article embeddings, contextual (time, device), social (friends' engagement), (7) **Infrastructure**: pre-compute embeddings hourly, real-time ranking at request time."
    },
    {
     "t": "p",
     "text": "**Theme: Specialized Data Science Topics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "375",
   "q": "You need to implement a multi-armed bandit for website optimization (choosing which banner to show). When is this better than A/B testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) A/B test: fixed allocation, only learns at the end, (2) bandit: adaptive allocation, learns during the test, (3) bandit better when: (a) opportunity cost of showing worse variant is high, (b) many variants (>3), (c) continuous optimization (not one-time decision), (d) non-stationary environment (best option changes), (4) algorithm: Thompson Sampling or UCB, (5) implementation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Thompson Sampling\nsuccesses = [1, 1, 1]  # prior per arm\nfailures = [1, 1, 1]\nfor each_visitor:\n    samples = [np.random.beta(s, f) for s, f in zip(successes, failures)]\n    chosen_arm = np.argmax(samples)\n    reward = show_banner(chosen_arm)\n    if reward: successes[chosen_arm] += 1\n    else: failures[chosen_arm] += 1"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
