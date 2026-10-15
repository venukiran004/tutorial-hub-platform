/* ============================================================================
   PRACTICE P4.14 — Predict the Output / Scenarios · 14
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.14",
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
   "text": "Predict the Output / Scenarios · 14",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "326",
   "q": "Your production ML API is publicly accessible. What security threats do you need to address?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model extraction: attacker queries API to replicate your model — rate limit, watermark predictions, (2) data poisoning: attacker corrupts training data — input validation, anomaly detection on training data, (3) adversarial examples: crafted inputs to fool the model — input validation, adversarial training, (4) prompt injection: for LLM-based systems — input sanitization, (5) inference attacks: extracting training data from model — differential privacy, (6) API abuse: DDoS, rate limiting, authentication, (7) model inversion: reconstructing training features from predictions — limit prediction precision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "327",
   "q": "Your model training pipeline downloads pre-trained models from the internet. What are the security risks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Supply chain attack: tampered pre-trained model with backdoor, (2) model poisoning: pre-trained model has hidden malicious behavior, (3) dependency attacks: compromised Python packages, (4) mitigation: (a) verify model checksums/hashes, (b) use trusted sources (HuggingFace with verified badge), (c) scan downloaded models for known vulnerabilities, (d) pin specific model versions, (e) test pre-trained models on validation data before deployment, (f) isolated training environment (no access to production systems)."
    },
    {
     "t": "p",
     "text": "**Theme: Data Storytelling Advanced**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "328",
   "q": "You need to present 6 months of analysis work in a 15-minute presentation. How do you structure it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Min 0-2: Hook — \"we can save $5M/year\" or the key insight, (2) Min 2-5: Context — business problem, why it matters, what we set out to solve, (3) Min 5-8: Journey — key experiments, what worked/didn't (2-3 highlights, not everything), (4) Min 8-11: Results — main findings with supporting visualizations, (5) Min 11-13: Implications — what this means for the business, (6) Min 13-15: Recommendations — specific actions, next steps, resource needs, (7) backup slides: technical details, additional analyses for Q&A, (8) rule: 1 slide per minute max, more white space, fewer bullets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "329",
   "q": "Your analysis reveals uncomfortable truths (e.g., a popular product is unprofitable when accounting for returns). How do you present this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data-first: let the numbers speak — present analysis objectively, (2) validate thoroughly: triple-check methodology before presenting uncomfortable findings, (3) context: explain the full picture — why was this hidden before?, (4) solutions: pair problems with recommendations, (5) private preview: share with key stakeholders before the big meeting, (6) framing: \"this is an opportunity to improve X\" not \"this product is a failure,\" (7) credit the discovery: finding unprofitable activities IS valuable, (8) be prepared for pushback: have supporting analyses ready."
    },
    {
     "t": "p",
     "text": "**Theme: Remaining Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "330",
   "q": "Your company wants to implement a knowledge graph connecting all its data. How does this benefit data science?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature discovery: traverse relationships to find non-obvious features, (2) entity resolution: link same entities across data sources, (3) context: understand relationships between customers, products, transactions, (4) graph features: centrality, community membership for models, (5) recommendation: knowledge graph-enhanced recommendations, (6) search: semantic search over structured knowledge, (7) explainability: explain model predictions using relationship paths, (8) implementation: Neo4j, Amazon Neptune, or simpler property graphs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "331",
   "q": "You need to build a model for a domain where the concept of \"ground truth\" is debatable (e.g., whether a news article is biased). How do you handle subjective labels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple annotators: 5+ people label each sample, (2) agreement metrics: Krippendorff's alpha, Fleiss' kappa for inter-rater reliability, (3) soft labels: if 3/5 say biased, use P(biased)=0.6 as label, (4) annotator modeling: account for individual annotator biases (Dawid-Skene), (5) annotation guidelines: clear, detailed criteria to reduce subjectivity, (6) expert review: adjudicator for disputed cases, (7) model: predict distribution of opinions, not single label, (8) evaluation: model should match human agreement level (not exceed it)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "332",
   "q": "Your team has strong SQL skills but weak Python skills. How do you leverage SQL for ML workflows?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature engineering in SQL: window functions, CTEs for complex features, (2) dbt: SQL-based transformation framework with testing, (3) BigQuery ML / Amazon SageMaker Canvas: train ML models with SQL, (4) SQLite for local experimentation, (5) Metabase / Mode: SQL-based analytics dashboards, (6) teach Python gradually: pandas operations map to SQL concepts, (7) SQL → feature store → Python model (division of labor), (8) many EDA tasks are faster in SQL than Python."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "333",
   "q": "Your model needs to be deployed to 100 different clients, each with slightly different data schemas. How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Configuration-driven: YAML per client mapping their schema to standard features, (2) adapter layer: transforms client data to canonical schema, (3) shared model: one model trained on canonical features, (4) per-client calibration: threshold adjustment per client, (5) multi-tenant serving: single model service, routing by client, (6) template deployment: automated deployment scripts parameterized by client config, (7) monitoring per client: separate dashboards, (8) client onboarding: standardized process for schema mapping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "334",
   "q": "Your time series has structural breaks (company changed pricing strategy). How do you handle this for forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Changepoint detection: identify when the break occurred, (2) option 1: train only on post-break data (if enough), (3) option 2: include a structural break indicator feature, (4) intervention analysis: estimate the break's effect size, (5) piecewise models: different parameters before/after break, (6) regime-switching models: Markov-switching, (7) Prophet: handles changepoints natively, (8) communicate: forecast uncertainty is higher after structural breaks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "335",
   "q": "You need to detect sarcasm in text data for sentiment analysis. Why is this hard and what approaches work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Why hard: (1) words are positive but meaning is negative (\"great job breaking everything\"), (2) requires context and world knowledge, (3) tone/delivery cues absent in text. Approaches: (4) contextual models: BERT captures nuance better than bag-of-words, (5) training data: sarcasm-labeled datasets (Reddit /s tags), (6) features: contrast between sentiment and context (positive words + negative topic), (7) multimodal: for speech, tone/prosody helps, (8) emoji/punctuation analysis: \"sure 🙄\" vs. \"sure!\", (9) pragmatic: for business, flag uncertain sentiment for human review rather than classifying incorrectly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "336",
   "q": "Your model deployment needs to support model versioning with instant rollback. How do you implement this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model registry: store all versions with metadata (MLflow), (2) blue-green deployment: two slots, instant swap, (3) canary with rollback: automated revert if metrics degrade, (4) model artifacts: stored in S3/GCS with version tags, (5) configuration-based: model version in config file, change config to rollback, (6) Kubernetes: rollback to previous deployment with `kubectl rollout undo`, (7) feature flags: model version behind feature flag for instant switching, (8) test: regularly practice rollback to ensure it works."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "337",
   "q": "Your model uses embeddings from a pre-trained model (BERT) as features. The pre-trained model gets updated. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Version lock: use specific pre-trained model version, (2) re-encode all data when updating embedding model, (3) test: does the new embedding version improve downstream performance?, (4) consistency: all data must use the same embedding version (can't mix), (5) migration plan: re-embed → retrain → validate → deploy as atomic update, (6) vector store: if using for retrieval, must re-index with new embeddings, (7) backward compatibility: keep old embeddings until fully migrated."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "338",
   "q": "You need to implement an ML model that handles currency amounts across different countries. What preprocessing is needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Convert to base currency using exchange rate at transaction time, (2) PPP adjustment: $100 has different purchasing power in US vs. India, (3) local normalization: z-score within each country, (4) ratio features: relative to median/mean in country, (5) currency as a feature: model may learn currency-specific patterns, (6) inflation adjustment: for historical data spanning years, (7) rounding: different currencies have different decimal places (JPY vs. USD)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "339",
   "q": "Your model is deployed but you discover that 5% of predictions are being used for a purpose you didn't intend. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Understand: what are they using it for? Is it harmful?, (2) evaluate: does the model perform adequately for this new use case?, (3) if inappropriate/harmful: immediately flag, restrict access, (4) if harmless but unvalidated: validate model performance for this use case, (5) document: update model card with approved and prohibited uses, (6) access control: implement purpose-based access restrictions, (7) education: train consumers on appropriate model use, (8) governance: establish model use request/approval process."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "340",
   "q": "Your stakeholders want real-time model performance dashboards. What do you track and display?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Layer 1 — Business: (1) key business KPIs influenced by model, (2) A/B test results. Layer 2 — Model: (3) prediction distribution histogram, (4) feature drift scores, (5) accuracy on recent labeled data. Layer 3 — Operational: (6) latency p50, p95, p99, (7) error rate, (8) throughput (predictions/sec), (9) resource utilization. Refresh rates: (10) business: daily, (11) model: hourly, (12) operational: real-time, (13) alerting: critical → page, warning → Slack."
    },
    {
     "t": "p",
     "text": "**Theme: Final Batch**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "341",
   "q": "Your team debates: should we use feature stores? What's the argument for and against?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For: (1) consistency: same features in training and serving, (2) reuse: compute once, use across models, (3) time-travel: point-in-time features prevent leakage, (4) team collaboration: shared feature catalog. Against: (5) complexity: another system to maintain, (6) overkill for single-model teams, (7) learning curve: team needs to learn the tool, (8) cost: infrastructure and licensing. Recommendation: (9) worthwhile when: >3 models, feature computation is expensive, or training-serving skew is a problem, (10) start simple: feature store = database table, evolve to Feast/Tecton."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "342",
   "q": "Your model needs to handle concept drift in real-time without scheduled retraining. What approaches exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Online learning: update model weights with each new observation, (2) adaptive windowing: automatically adjust training window based on detected change, (3) ensemble of experts: models trained on different temporal windows, weight by recent performance, (4) drift detection: ADWIN, DDM, Page-Hinkley — trigger quick retrain when detected, (5) River library: online ML in Python, (6) caution: online learning is susceptible to noise and adversarial data, (7) hybrid: online learning + periodic full retrain for stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "343",
   "q": "You need to build a chatbot that answers questions from internal company documents. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RAG (Retrieval-Augmented Generation): (1) index documents: chunk, embed, store in vector database, (2) query: embed user question, retrieve top-k relevant chunks, (3) generate: feed question + context to LLM, generate answer, (4) key decisions: chunk size, embedding model, number of retrieved chunks, (5) evaluation: faithfulness (grounded in source?), relevance, correctness, (6) guardrails: only answer from provided context, don't hallucinate, (7) UX: show source documents for verification, (8) access control: only retrieve documents user has access to."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "344",
   "q": "Your regression model predicts continuous values, but the business makes discrete decisions (approve/deny at threshold). How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Even with continuous predictions, the decision threshold determines business impact, (2) optimize threshold directly on business metric (profit, cost), not statistical metric, (3) cost-sensitive threshold: minimize expected cost = FN×cost_FN + FP×cost_FP, (4) decision curve analysis: plot net benefit at different thresholds, (5) separate calibration: regress → calibrate → threshold, (6) consider: would a classification model trained directly on the decision be better?, (7) stakeholder agreement: align on threshold logic and business rules."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "345",
   "q": "You're training on GPU but your data preprocessing bottlenecks the pipeline. GPU utilization is only 30%. How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data loading: increase num_workers in DataLoader, (2) prefetching: load next batch while GPU processes current, (3) memory mapping: use memory-mapped files for large datasets, (4) preprocessing: move augmentations to GPU (NVIDIA DALI, kornia), (5) format: use optimized format (TFRecord, WebDataset) instead of individual files, (6) caching: cache preprocessed data in memory or fast SSD, (7) profile: use PyTorch Profiler to identify exact bottleneck, (8) mixed precision: reduces memory transfer time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "346",
   "q": "Your model training is reproducible on the same machine but gives different results on different machines. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Floating point: different CPU/GPU architectures have different FP precision, (2) CUDA non-determinism: some GPU operations are non-deterministic by default, (3) BLAS implementation: different math libraries give slightly different results, (4) framework versions: minor version differences in PyTorch/TensorFlow, (5) OS differences: thread scheduling affects parallel operations, (6) mitigation: Docker for environment consistency, set all deterministic flags, accept small (~0.1%) variance, (7) for critical reproducibility: pin hardware, use deterministic mode."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "347",
   "q": "You need to monitor 50 features for drift simultaneously. How do you avoid alert fatigue from many correlated features drifting together?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Dimensionality reduction: monitor PCA components instead of raw features, (2) multivariate drift detection: single test on full feature distribution, (3) feature grouping: group correlated features, one alert per group, (4) hierarchical monitoring: overall drift score → drill down to feature group → individual features, (5) root cause analysis: when drift detected, identify which features changed and why, (6) severity scoring: weight alerts by feature importance to model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "348",
   "q": "Your company needs to decide between building vs. buying an ML platform. What factors determine this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Build when: (1) unique requirements not met by vendors, (2) large team (>10 DS) to justify investment, (3) competitive advantage from custom tooling, (4) data sovereignty requirements. Buy when: (5) small team (focus on models, not infra), (6) standard use cases (classification, regression), (7) time-constrained (need to ship quickly), (8) vendor integration with existing cloud. Options: (9) SageMaker, Vertex AI, Databricks (full platforms), (10) Tecton, Feast (feature store only), (11) MLflow (experiment tracking — free), (12) hybrid: buy platform, customize specific components."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "349",
   "q": "Your model is good overall but terrible for a specific customer segment that the business considers important. What's your strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Diagnose: why does the model fail? Insufficient data? Different patterns?, (2) options: (a) engineer segment-specific features, (b) oversample the segment in training, (c) build separate model for that segment, (d) cost-sensitive: weight errors for that segment more, (3) ensemble: global model + segment specialist model, (4) transfer learning: fine-tune global model on segment data, (5) evaluate: segment-specific metrics as primary, overall as secondary, (6) business alignment: \"overall accuracy drops 1% but target segment improves 15%.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "350",
   "q": "What's the single most important principle for successful production ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"Measure everything and iterate.\" Specifically: (1) monitor model performance continuously, not just at deployment, (2) build feedback loops: ground truth data flowing back to improve models, (3) automate retraining and validation — humans shouldn't be in the critical path, (4) invest in infrastructure and monitoring more than model complexity, (5) the best model is the one that's actually running in production, monitored, and improving, (6) simple model + great data + solid infrastructure > complex model + poor infrastructure."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
