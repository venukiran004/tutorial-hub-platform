/* ============================================================================
   PRACTICE P4.9 — Predict the Output / Scenarios · 9
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.9",
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
   "text": "Predict the Output / Scenarios · 9",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "201",
   "q": "Your feature pipeline has a training-serving skew: features computed differently during training (pandas) vs. serving (Spark). How do you diagnose and fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Data Engineering for DS**"
    },
    {
     "t": "p",
     "text": "**Answer:** Diagnosis: (1) score identical records through both pipelines, compare feature values, (2) check null handling: pandas NaN vs. Spark null behavior differs, (3) aggregation: pandas default handles nulls differently than Spark, (4) join behavior: pandas inner join vs. Spark outer join defaults. Fix: (5) shared transformation library (feature store), (6) test suite: unit tests computing same features in both, (7) integration test: compare full pipeline outputs, (8) long-term: use feature store (Feast, Tecton) as single source of truth for both training and serving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "202",
   "q": "Your data arrives as nested JSON from an API. You need to flatten it for tabular modeling. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Flatten nested JSON\nfrom pandas import json_normalize\n\ndata = [{\"user\": {\"name\": \"John\", \"address\": {\"city\": \"NYC\"}}, \n         \"orders\": [{\"id\": 1}, {\"id\": 2}]}]\n\n# Flatten with separator\nflat = json_normalize(data, sep='_')\n# Result: user_name, user_address_city\n\n# For arrays (orders): use record_path\norders = json_normalize(data, record_path='orders',\n                        meta=[['user', 'name']])"
    },
    {
     "t": "p",
     "text": "Considerations: (1) decide max depth for flattening, (2) array fields require special handling (explode or aggregate), (3) document the flattening schema for reproducibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "203",
   "q": "Your Airflow DAG for model training fails intermittently. Retries usually fix it. How do you make it more robust?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Identify failure types: transient (network, API timeout) vs. persistent (data quality), (2) configuration: `retries=3, retry_delay=timedelta(minutes=5)`, (3) idempotency: ensure each task can safely re-run without side effects, (4) timeout settings: `execution_timeout` per task to prevent hanging, (5) alerting: Slack/PagerDuty on final failure, (6) dead letter queue: capture failed records for investigation, (7) checkpointing: save intermediate results to resume from failure point, (8) dependency checks: sensor tasks to verify upstream data exists before processing."
    },
    {
     "t": "p",
     "text": "**Theme: Spatial Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "204",
   "q": "You need to analyze taxi trip data to find optimal locations for electric vehicle charging stations. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cluster trip endpoints (dropoffs): high-density areas need charging, (2) dwell time analysis: where do taxis park/idle longest for charging opportunity?, (3) spatial analysis: DBSCAN on GPS coordinates for hotspot detection, (4) capacity planning: demand estimation based on trip volume per zone, (5) constraint satisfaction: power grid access, zoning, land availability, (6) coverage optimization: maximize taxis within X km of a charger, (7) time-of-day patterns: demand varies by hour, (8) simulation: model taxi flows with proposed station locations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "205",
   "q": "Your geo-data has GPS coordinates with varying accuracy (some ±5m, some ±100m). How does this affect your spatial analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Accuracy metadata: use reported accuracy as a feature or weight, (2) spatial aggregation: aggregate to H3 hexagons or grid cells — reduces impact of noise, (3) weighted analysis: weight precise measurements more, (4) smoothing: kernel density estimation handles noise naturally, (5) snap to roads/buildings: map-match to correct positions, (6) outlier detection: remove points that are physically impossible (in water, outside city), (7) uncertainty propagation: report spatial results with confidence regions, not points."
    },
    {
     "t": "p",
     "text": "**Theme: Recommendation Engine Implementation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "206",
   "q": "You need to implement collaborative filtering for 10M users and 1M items. The user-item matrix is 99.99% sparse. How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Matrix factorization: ALS (Alternating Least Squares) on Spark — handles massive sparse matrices, (2) implicit feedback: use weighted ALS from the implicit library, (3) approximate nearest neighbors: FAISS or Annoy for fast similarity search, (4) embedding-based: learn user/item embeddings, serve via ANN index, (5) two-tower model: separate user and item encoders for efficient retrieval, (6) candidate generation + ranking: retrieve 100 candidates via ANN → rank with detailed model, (7) incremental updates: update embeddings without full retrain as new interactions arrive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "207",
   "q": "Your recommendation model has high online A/B test improvements on click-through but users report lower satisfaction. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Clickbait effect: model learned to recommend attention-grabbing but unsatisfying items, (2) engagement ≠ satisfaction: clicks don't mean enjoyment, (3) filter bubble: recommendations too narrow, reducing discovery, (4) metric mismatch: optimize for satisfaction, not just clicks. Fix: (5) add quality signals: time-on-page, return visits, ratings, shares, (6) composite metric: clicks × satisfaction_score, (7) diversity requirements: ensure variety in recommendations, (8) survey: periodic user satisfaction survey linked to recommendation quality, (9) longer-term metrics: retention, not just session metrics."
    },
    {
     "t": "p",
     "text": "**Theme: Natural Language Understanding**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "208",
   "q": "Your NER (Named Entity Recognition) model trained on news articles doesn't work well on social media text. Why and how do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Why: (1) different language style: abbreviations, slang, hashtags, (2) no capitalization cues (people type in lowercase), (3) new entity types: @mentions, product nicknames, (4) short context: tweets have 280 chars vs. full articles. Fix: (5) fine-tune on social media NER dataset (W-NUT, etc.), (6) add social-media specific features: @mention detection, hashtag parsing, (7) character-level models handle misspellings/abbreviations better, (8) pre-train on social media text (BERTweet), (9) active learning: label social media examples iteratively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "209",
   "q": "You need to extract structured data from unstructured contract documents (parties, dates, amounts, terms). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Document OCR if scanned: Tesseract or cloud OCR (AWS Textract), (2) layout understanding: LayoutLM model considers visual document structure, (3) NER fine-tuned for legal entities: party names, dates, monetary amounts, (4) relation extraction: link parties to their obligations, (5) template-based: many contracts follow templates — rule-based extraction for known formats, (6) table extraction: pandas from detected tables, (7) validation: business rules (dates should be future, amounts should be positive), (8) human review: flag low-confidence extractions for legal team review."
    },
    {
     "t": "p",
     "text": "**Theme: Statistical Modeling**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "210",
   "q": "You need to model count data (number of customer complaints per day). Why is linear regression inappropriate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Counts are non-negative integers — linear regression can predict negative/fractional values, (2) count distributions are typically right-skewed, not normal, (3) variance often increases with mean (heteroscedastic). Better models: (4) Poisson regression: for count data, assumes mean = variance, (5) Negative Binomial: when variance > mean (overdispersion — common in real data), (6) Zero-Inflated Poisson: many zeros (most days have 0 complaints), (7) hurdle model: separate zero/non-zero process, (8) use GLM framework: `statsmodels.api.GLM(family=Poisson())`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "211",
   "q": "Your regression has a non-linear relationship that log-transforms don't fix. What alternatives do you have?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Polynomial regression: add x², x³ terms, (2) Splines: piecewise polynomial for flexible smooth fits, (3) GAMs (Generalized Additive Models): non-linear smooth functions of each feature, (4) LOESS/LOWESS: local regression for exploration, (5) piecewise linear: different slopes in different regions, (6) Box-Cox transformation: find optimal power transform, (7) interaction terms: non-linearity may come from feature interactions, (8) if prediction is goal: tree-based models handle non-linearity naturally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "212",
   "q": "You're building a mixed-effects model for data with nested structure (students within schools within districts). When is this necessary?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When: (1) observations within groups are correlated (students in same school share characteristics), (2) ignoring structure: inflated sample size, incorrect standard errors, (3) fixed effects: school-specific intercepts (many schools, interested in specific schools), (4) random effects: school effects drawn from a distribution (many schools, interested in population-level effects), (5) implementation: `import statsmodels.formula.api as smf; model = smf.mixedlm(\"score ~ study_hours\", data, groups=\"school_id\")`, (6) random slopes: if the effect of study hours varies by school."
    },
    {
     "t": "p",
     "text": "**Theme: Deep Learning Architectures**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "213",
   "q": "You have sequential user behavior data (page views over time). Which architecture — RNN, LSTM, Transformer, or 1D CNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) LSTM: good for moderate-length sequences (50-200 steps), captures temporal dependencies, (2) Transformer: best for longer sequences, captures global patterns via attention, highly parallelizable, (3) 1D CNN: fast, good for local patterns, use with pooling for sequence features, (4) GRU: lighter than LSTM, often similar performance, (5) for user behavior prediction: Transformer typically wins if you have enough data, (6) training data matters more than architecture: 100K+ sequences for Transformer, LSTM/GRU works with less, (7) practical: start with GRU (simple), try Transformer if performance insufficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "214",
   "q": "Your attention mechanism shows that the model attends to specific tokens. Does this mean those tokens are \"important\" for the prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Caution: (1) attention weights are NOT explanations — they show what the model looks at, not why, (2) multiple attention heads may attend to different things, (3) attention can be high for tokens that are just easy to process (stop words), (4) gradient-based attribution (Integrated Gradients) is more reliable for importance, (5) attention rollout: combine attention across layers for a more complete picture, (6) probing: test if attention weights correlate with known important features, (7) use attention as a hypothesis generator, validate with perturbation tests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "215",
   "q": "You need to train a model but your team doesn't have GPU infrastructure. What are your options?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cloud GPUs: AWS EC2 (p3/p4), GCP (A100), Azure (NCasT4) — pay per hour, (2) Google Colab: free tier with T4 GPU (limited hours), Pro for more, (3) Kaggle notebooks: free GPU (30 hrs/week), (4) Lambda Cloud: GPU instances at competitive rates, (5) Paperspace: persistent GPU workstations, (6) for tree-based models: GPU not needed — CPU training is fine for XGBoost/LightGBM, (7) model distillation: use a smaller model that trains on CPU, (8) pre-trained models: fine-tuning requires less compute than training from scratch."
    },
    {
     "t": "p",
     "text": "**Theme: Customer Analytics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "216",
   "q": "You need to calculate Customer Lifetime Value (CLV) probabilistically. What model do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** BG/NBD + Gamma-Gamma model (lifetimes library): (1) BG/NBD: predicts expected number of future transactions per customer, (2) Gamma-Gamma: predicts expected average order value, (3) CLV = expected_transactions × expected_AOV × profit_margin, (4) inputs: frequency, recency, age (T), monetary value per customer, (5) calibration period + holdout validation, (6) implementation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from lifetimes import BetaGeoFitter, GammaGammaFitter\nbgf = BetaGeoFitter().fit(df['frequency'], df['recency'], df['T'])\nggf = GammaGammaFitter().fit(df['frequency'], df['monetary_value'])"
    },
    {
     "t": "p",
     "text": "(7) Discount rate for present value of future revenue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "217",
   "q": "Your RFM analysis reveals 5 customer segments. How do you develop targeted marketing strategies for each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Champions** (high R, F, M): loyalty rewards, referral programs, early access, (2) **Loyal** (high F, M, moderate R): upsell, cross-sell, personalized recommendations, (3) **At Risk** (low R, high F, M): re-engagement campaigns, special offers, \"we miss you\" emails, (4) **New Customers** (high R, low F, M): onboarding nurture, first-purchase incentives, education, (5) **Lost** (low R, F, M): aggressive win-back offers, feedback surveys, (6) budget allocation: invest most in At Risk and Loyal (highest ROI), (7) measure: per-segment conversion rates from campaigns."
    },
    {
     "t": "p",
     "text": "**Theme: ML System Architecture**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "218",
   "q": "You need to design an ML system that handles both batch and real-time predictions. What architecture do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Lambda architecture adapted for ML: (1) Batch path: nightly scoring of all entities → stored in prediction table/cache, (2) Real-time path: model API for on-demand predictions, (3) Feature store: shared features for both paths — offline store for batch, online store for real-time, (4) model serving: same model artifact used in both paths, (5) priority: serve from batch cache first (faster), fall through to real-time (fresh), (6) monitoring: unified for both paths, (7) example: batch-score all users nightly for recommendations, real-time scoring for new users or events."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "219",
   "q": "You need to A/B test a new model in production. How do you implement this safely?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Shadow mode first: new model runs alongside, predictions logged but not served, (2) compare shadow predictions vs. champion model — validate offline, (3) A/B deployment: traffic splitter routes X% to new model, (4) gradual ramp: 1% → 5% → 25% → 50% — monitor at each stage, (5) automated guardrails: if error rate spikes, automatically route all traffic to champion, (6) user-level consistency: same user always sees same model (hash user_id), (7) statistical significance: run until pre-calculated sample size reached, (8) rollback plan: one-click revert to champion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "220",
   "q": "Your ML system needs to handle 99.9% uptime SLA. How do you design for reliability?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Redundancy: multiple model replicas across availability zones, (2) load balancing: distribute requests across healthy replicas, (3) health checks: automatic removal of unhealthy instances, (4) circuit breaker: fallback to rule-based model if ML model fails, (5) caching: serve repeated predictions from cache, (6) graceful degradation: serve partial features if some are unavailable, (7) auto-scaling: handle traffic spikes, (8) chaos engineering: intentionally break things to test resilience, (9) SLA budget: 99.9% = ~8.7 hours downtime/year."
    },
    {
     "t": "p",
     "text": "**Theme: Interview Deep Dives**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "221",
   "q": "Walk through how you would approach a new dataset you've never seen before. First 30 minutes.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) `.shape`, `.dtypes`, `.head()`: size, types, first rows, (2) `.describe()`: basic statistics per column, (3) `.isnull().sum()`: missing data overview, (4) target distribution: `df['target'].value_counts()` or histogram, (5) unique values per column: spot IDs, constants, high-cardinality, (6) correlations: `df.corr()` heatmap for numerics, (7) sample rows: read raw data to understand context, (8) data dictionary: if available, understand business definitions, (9) time range: if temporal data, what period does it cover?, (10) quick plot: 2-3 features vs. target for initial insights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "222",
   "q": "\"How do you handle a disagreement with a stakeholder about methodology?\" Give an example.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Structure: (1) listen first: understand their concern fully, (2) seek common ground: agree on the goal, (3) explain your reasoning with evidence (not authority), (4) show don't tell: quick prototype or analysis demonstrating your approach, (5) be open: they may have domain knowledge you lack, (6) compromise: \"let's try both and compare results,\" (7) example: \"PM wanted to use simple average for forecasting. I showed side-by-side: average prediction vs. time series model. The time series model was 30% more accurate during seasonal periods, which convinced them.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "223",
   "q": "\"What's one mistake you made early in your career and what did you learn?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Good answer pattern: (1) be genuine and specific, (2) show growth, (3) example: \"Early project: I built a complex neural network for a tabular problem with 5K rows. Spent 2 weeks tuning when a simple gradient boosting model would have performed better in 2 hours. Lesson: always start simple, add complexity only when justified. Now my workflow always begins with a baseline model.\""
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Optimization**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "224",
   "q": "Your hyperparameter search takes too long (100 combinations × 10-fold CV × 1hr training = 1000 hours). How do you make it feasible?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Bayesian optimization: Optuna, Hyperopt — intelligently searches promising regions (20-50 evaluations often sufficient), (2) random search: beats grid search, good coverage with 60 evaluations out of 100, (3) early stopping: kill poorly performing runs early (Hyperband), (4) reduce CV: 5-fold instead of 10, or single validation set for early exploration, (5) smaller data: search on 10% sample, validate best on full data, (6) warm starting: initialize with known good hyperparameters, (7) BOHB: combines Bayesian optimization + early stopping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "225",
   "q": "You need to optimize a multi-objective function (accuracy AND latency AND fairness). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pareto front: find solutions that are non-dominated on all objectives, (2) scalarization: weighted sum of objectives (w1×accuracy + w2×(1/latency) + w3×fairness), (3) constraint-based: maximize accuracy subject to latency < 50ms AND fairness > 0.8, (4) NSGA-II: evolutionary algorithm for multi-objective optimization, (5) Optuna supports multi-objective optimization natively, (6) interactive: present Pareto front to stakeholders, let them choose tradeoff, (7) hierarchical: first filter by hard constraints (latency, fairness), then optimize accuracy."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science in Practice**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
