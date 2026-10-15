/* ============================================================================
   PRACTICE P4.20 — Predict the Output / Scenarios · 20
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.20",
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
   "text": "Predict the Output / Scenarios · 20",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "476",
   "q": "You're assigned a project with no clear success criteria. The stakeholder says: \"just make it better.\" What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Define \"better\": ask specific questions — \"better means fewer customer complaints? Faster processing? Higher revenue?\", (2) baseline measurement: measure current state objectively, (3) propose metrics: suggest 2-3 concrete, measurable metrics, (4) set targets: \"if we improve metric X from A to B, would that be considered a success?\", (5) get written alignment: email summary of agreed metrics and targets, (6) iterative: show early results, refine definition of success, (7) avoid: spending months on a model only to hear \"that's not what I meant,\" (8) documentation: project charter with problem statement, metrics, timeline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "477",
   "q": "Your model training keeps running out of memory. The dataset doesn't fit in RAM. What strategies do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Chunked processing: `pd.read_csv(chunksize=N)`, process incrementally, (2) data types: downcast columns (`int64→int32`, `float64→float32`), use categoricals, (3) column selection: only load needed columns, (4) sampling: train on stratified sample for development, full data for final model, (5) Dask/Vaex: lazy evaluation, processes larger-than-memory data, (6) database: keep data in DB, pull batches for training (SQL queries), (7) generators: Python generators for streaming data to model, (8) model-specific: mini-batch SGD (sklearn's `partial_fit`), out-of-core learning, (9) cloud: upgrade to larger memory instances for final training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "478",
   "q": "Your team is building multiple models that share common preprocessing steps. How do you avoid duplication?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Shared library: internal Python package with common transformers, (2) feature store: compute features once, reuse across models, (3) preprocessing pipeline: sklearn Pipeline as a shared artifact, (4) templates: cookiecutter project template with standard preprocessing, (5) Docker base image: common environment with shared utilities, (6) DAG: Airflow DAG with shared preprocessing task → branching to model-specific tasks, (7) testing: unit tests for shared components, (8) versioning: version the shared library, pin in each model's requirements."
    },
    {
     "t": "p",
     "text": "**Theme: Emerging Technologies**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "479",
   "q": "How can you use reinforcement learning (RL) in a practical business context (not games)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Real-world RL applications: (1) Dynamic pricing: agent learns optimal pricing strategy through trial and error, (2) Recommendation: contextual bandits choose what to recommend, learn from engagement, (3) Supply chain: optimize inventory ordering decisions, (4) Ad bidding: real-time bidding on ad impressions, (5) Resource allocation: assign computing resources to workloads, (6) Challenges: (a) need a simulator or safe environment to explore (can't experiment freely in production), (b) reward design is critical and hard, (c) sample efficiency — RL needs many interactions, (7) Start: contextual bandits (simpler than full RL) for recommendation/personalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "480",
   "q": "You're asked to evaluate whether graph neural networks (GNNs) would help your problem. When do GNNs add value?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** GNNs help when: (1) data has natural graph structure (social network, molecular structure, knowledge graph), (2) neighbor information is predictive (fraud detection: is connected to known fraudsters?), (3) you need to capture relational patterns beyond pairwise features, (4) community structure matters (e.g., customer clusters). GNNs DON'T help when: (5) data has no relational structure, (6) relations are fully captured by aggregate features (e.g., \"number of friends\"), (7) graph is too large or dense for efficient computation, (8) simpler graph features (PageRank, centrality) capture the signal adequately. (9) Start with: graph features as input to XGBoost → if insufficient, try GNN."
    },
    {
     "t": "p",
     "text": "**Theme: Industry Case Studies**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "481",
   "q": "How would Uber use data science to reduce wait times for riders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Demand prediction: forecast ride requests per zone per 15min → pre-position drivers, (2) driver repositioning: suggest idle drivers move to high-demand areas, (3) matching optimization: assign best driver considering distance, route, and future demand, (4) batch matching: wait briefly to accumulate requests, then optimize assignment globally, (5) ETAs: accurate ETA prediction so riders know what to expect, (6) incentives: surge pricing shifts supply to high-demand areas, (7) carpool/shared rides: reduce vehicles needed per rider, (8) data: GPS traces, historical rides, events, weather, (9) metrics: P50/P90 wait time per zone per time period."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "482",
   "q": "How would Netflix use data science to decide which original content to produce?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Viewing pattern analysis: what genres/actors/themes get high completion rates?, (2) gap analysis: content types with high demand but low supply on platform, (3) audience segmentation: which underserved segments are growing?, (4) competitor analysis: successful content on other platforms not yet available, (5) talent analytics: which actors/directors correlate with hit content?, (6) cost-value modeling: predicted viewership × lifetime subscriber impact vs. production cost, (7) regional strategy: content for specific markets (Korean, Indian), (8) A/B test: thumbnail, description variations correlate with content interest, (9) cannibalization: launching similar content may split audience."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Tooling**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "483",
   "q": "You need to choose between Airflow, Dagster, and Prefect for ML pipeline orchestration. How do you compare?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Airflow: (1) most mature, huge community, (2) Python-based DAGs, (3) good for complex scheduling, (4) weak: local development experience, (5) best for: established teams with devops support. Dagster: (6) software-defined assets (data-centric), (7) great local development and testing, (8) type system for data, (9) best for: data engineering-heavy teams. Prefect: (10) simplest to get started, (11) dynamic workflows easy, (12) cloud-managed option, (13) best for: small teams wanting minimal setup. Decision: (14) team size >10 with dedicated infra → Airflow, (15) data-centric team → Dagster, (16) small team, simple needs → Prefect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "484",
   "q": "When should you use DuckDB vs. Pandas for data analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** DuckDB better when: (1) large data (>1GB): DuckDB uses columnar processing, much faster, (2) SQL-comfortable team: write SQL instead of pandas, (3) analytics queries: aggregations, window functions, joins are faster, (4) out-of-core: handles larger-than-memory data natively. Pandas better when: (5) complex transformations: custom Python functions per row, (6) rich ecosystem: extensive library integration, (7) small data: overhead of DuckDB not worth it, (8) ML integration: scikit-learn, etc. work directly with pandas. Best: (9) use both — DuckDB for heavy data processing, pandas for final analysis and ML, (10) `duckdb.sql(\"SELECT * FROM df\")` works directly on pandas DataFrames."
    },
    {
     "t": "p",
     "text": "**Theme: Problem Solving Under Constraints**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "485",
   "q": "You have only 100 labeled examples for a text classification task. What approaches maximize performance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pre-trained models: use BERT/RoBERTa fine-tuned — even 100 examples can give decent results, (2) few-shot with LLM: GPT-4 with prompt engineering (no training needed), (3) data augmentation: back-translation, synonym replacement, paraphrasing with LLM, (4) active learning: label the most informative samples next, (5) semi-supervised: label propagation on unlabeled data using model predictions, (6) transfer: fine-tune on related labeled dataset first, then on your 100, (7) SetFit: few-shot framework designed for small datasets, (8) evaluation: cross-validation on 100 samples has high variance — use stratified k-fold + report CI."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "486",
   "q": "You need to deliver an ML project in 2 weeks. What's your rapid development strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Day 1-2: (1) Clarify scope: what's the minimum viable model?, (2) data audit: is data accessible and minimally clean? Day 3-5: (3) EDA + feature engineering: focus on top 5-10 features, (4) baseline: logistic regression or simple heuristic. Day 6-8: (5) modeling: try 2-3 algorithms max, (6) evaluation: proper train/test split, business-relevant metrics. Day 9-11: (7) simple deployment: Flask/FastAPI endpoint or saved model + script, (8) basic monitoring: log predictions. Day 12-14: (9) documentation, (10) stakeholder demo with recommendations for improvements. Skip: complex feature engineering, hyperparameter optimization, sophisticated infrastructure."
    },
    {
     "t": "p",
     "text": "**Theme: Scenario Questions for Specific Skills**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "487",
   "q": "\"Given this confusion matrix [TP=80, FP=20, FN=30, TN=870], calculate precision, recall, F1. Then tell me: should we optimize for precision or recall if this is a cancer screening model?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Precision = 80/(80+20) = 0.80 (80% of positive predictions are correct), Recall = 80/(80+30) = 0.727 (72.7% of actual positives are detected), F1 = 2×(0.80×0.727)/(0.80+0.727) = 0.762. **For cancer screening: optimize for recall.** Rationale: missing a cancer case (FN) is far worse than a false alarm (FP) that leads to additional tests. A missed cancer can be fatal. A false positive causes anxiety and extra tests but isn't life-threatening. Target recall > 95% even if precision drops to 50%."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "488",
   "q": "\"I have a feature with 50% missing values. Walk me through your decision process on how to handle it.\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **(1) Is missingness informative?** Check if missing vs. present correlates with target — if yes, create `is_missing` binary feature. **(2) What type of missingness?** MCAR (random) → safe to impute; MAR (depends on other features) → model-based imputation; MNAR (depends on the value itself) → tricky, domain knowledge needed. **(3) How important is the feature?** If permutation importance shows it's not useful even when present → drop it. **(4) Imputation options:** (a) Simple: median/mode, (b) Model-based: KNN imputer, iterative imputer, (c) For trees: XGBoost handles missing natively — let it learn optimal split direction. **(5) Validation:** compare model performance: drop feature vs. impute vs. indicator approach."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Production Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "489",
   "q": "You need to deploy a model that must work offline (no internet). What considerations apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model packaging: embed model weights in the application binary, (2) size constraints: quantize/compress model to fit device storage, (3) feature computation: all features must be computable without external APIs, (4) data: pre-load any lookup tables (embeddings, encodings), (5) updates: mechanism to update model when connected (OTA update), (6) versioning: track which model version is on each device, (7) monitoring: queue predictions and sync analytics when online, (8) fallback: simple rule-based logic if model fails, (9) testing: test on actual target devices."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "490",
   "q": "Your model handles PII. How do you ensure predictions don't leak sensitive information?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Input sanitization: strip PII before logging predictions, (2) output review: ensure predictions don't embed input data (e.g., LLM doesn't repeat PII), (3) differential privacy: training with DP guarantees protects individual data, (4) access control: prediction logs behind IAM with need-to-know access, (5) encryption: predictions at rest and in transit encrypted, (6) retention: auto-delete prediction logs after defined period, (7) audit: regular privacy audit of prediction outputs, (8) model auditing: membership inference tests — can someone determine if their data was in training?"
    },
    {
     "t": "p",
     "text": "**Theme: Remaining Questions**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "491",
   "q": "Your Jupyter notebook runs fine but takes 2 hours. You need to speed it up for regular use. Where do you look first?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Profile: `%%timeit` or `line_profiler` on each cell to find hotspots, (2) typical culprits: (a) iterating rows with `for row in df.iterrows()` → vectorize, (b) repeated DataFrame copies → use `inplace` or chain operations, (c) reading entire large file → read only needed columns/rows, (d) training model without early stopping → add early stopping, (3) quick wins: use `%%time` on cells, fix the 2-3 slowest, (4) cache: save intermediate results to disk, reload when re-running, (5) parallel: `joblib` for independent operations, (6) usually 80% of runtime is in 20% of cells."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "492",
   "q": "Your model needs to serve predictions to both a mobile app (latency-critical) and a batch analytics pipeline (throughput-critical). How do you design for both?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Two serving paths: (a) online: REST/gRPC API behind load balancer with auto-scaling, optimized for low latency (p99 < 100ms), (b) batch: scheduled Spark/Python job that scores entire datasets efficiently, (2) same model artifact: both paths load the same model version, (3) online optimization: caching, quantization, ONNX runtime for speed, (4) batch optimization: vectorized batch prediction, parallelization, (5) feature consistency: same feature computation logic for both, (6) monitoring: separate dashboards for online (latency, error rate) and batch (job completion, throughput)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "493",
   "q": "Your stakeholder wants to know if the model will work before you've built it. How do you set expectations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Literature review: what accuracy have others achieved on similar problems?, (2) data assessment: data quality and volume determines ceiling, (3) baseline: quick simple model (2 days) gives a lower bound, (4) \"ceiling analysis\": if a perfect model existed, what's the business impact?, (5) comparable projects: share results from analogous internal projects, (6) honest communication: \"we don't know yet, but here's how we'll find out in X weeks,\" (7) milestones: \"by week 2 we'll know if this is feasible,\" (8) risk: highlight what could make the project infeasible early."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "494",
   "q": "You need to detect concept drift in a model that predicts continuous values (regression). Most drift detection methods are for classifiers. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Prediction distribution monitoring: compare recent prediction distribution to reference (KS test, PSI), (2) error monitoring: track MAE/RMSE on recent labeled data — if increasing, drift likely, (3) residual analysis: plot residuals over time — systematic patterns indicate drift, (4) feature drift: monitor individual feature distributions using PSI per feature, (5) page-Hinkley test: sequential test for mean shift in error series, (6) adaptive windowing: ADWIN on prediction error stream, (7) comparison: periodically retrain on recent data — if significantly better, drift has occurred, (8) practical: trigger alert when multiple signals agree."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "495",
   "q": "You're training on GPU but only achieving 40% GPU utilization. How do you diagnose and improve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) PyTorch Profiler: `torch.profiler` shows GPU vs. CPU timeline, (2) common causes: (a) data loading bottleneck: CPU can't feed GPU fast enough → increase `num_workers`, use persistent workers, (b) small batch size: GPU underutilized → increase batch size, (c) CPU preprocessing: move augmentations to GPU (kornia, NVIDIA DALI), (d) synchronization: frequent CPU-GPU transfers → minimize `.item()`, `.numpy()` calls, (e) memory transfers: use pinned memory, (3) mixed precision: `torch.cuda.amp` → faster + fits larger batches, (4) data format: use optimized loaders (WebDataset, FFCV)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "496",
   "q": "Your model is used to allocate limited resources (e.g., social worker visits to at-risk families). How do you ensure fair allocation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Define fairness: equal allocation per group? Proportional to need? Equal outcomes?, (2) calibration: model probabilities should be well-calibrated across groups, (3) capacity constraints: algorithm must respect resource limits, (4) assessment: does model perform equally well for all demographic groups?, (5) threshold equity: if using different thresholds per group, justify transparently, (6) human review: high-stakes decisions need human oversight, (7) feedback: track outcomes per group — are resources effective equally?, (8) accountability: clear documentation of how allocation decisions are made, (9) community input: involve affected communities in designing the system."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "497",
   "q": "Your model serves predictions via API but you also want to track prediction quality. Ground truth arrives weeks later. How do you build a delayed feedback loop?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Log: store every prediction with unique ID, timestamp, features, and prediction, (2) Ground truth ingestion: automated pipeline to ingest outcomes when they arrive, (3) Matching: join predictions to outcomes by ID, (4) Metric computation: calculate performance metrics on matched pairs, (5) Decay analysis: performance by prediction age (does model degrade over time?), (6) Dashboard: rolling metrics updated as ground truth trickles in, (7) Alerts: if recent matched performance drops below threshold, (8) Retraining trigger: if sustained performance degradation, trigger retrain, (9) Proxy metrics: use intermediate signals (clicks, engagement) as early indicators before ground truth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "498",
   "q": "You're evaluating whether to use open-source or proprietary ML tools. What framework do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Consider: (1) Cost: open source = free license but internal maintenance; proprietary = license fee but managed, (2) support: proprietary has dedicated support; open source has community + paid options, (3) customization: open source = full control, modify source; proprietary = limited to provided features, (4) security: proprietary may have certifications; open source = audit yourself, (5) community: large open source community = faster innovation, more resources, (6) lock-in: proprietary creates vendor dependency; open source = portable (usually), (7) compliance: some industries require vendor compliance certifications, (8) my approach: open source default, proprietary only when clear advantage or requirement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "499",
   "q": "You need to present your model results to the board of directors (non-technical, strategic thinkers). How do you structure your presentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Start with the business problem: \"we lose $X million to Y problem,\" (2) solution in plain language: \"we built a system that predicts Z, enabling [action],\" (3) results in business terms: ROI, cost savings, revenue impact — not AUC or F1, (4) comparison: before vs. after (with model vs. without), (5) risk section: what could go wrong, how we mitigate, (6) competitive context: how does this compare to industry?, (7) ask: what you need from them (budget, approval, headcount), (8) no: technical details, model architecture, code, jargon, (9) backup slides: technical appendix for follow-up questions from the CFO or CTO."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "500",
   "q": "What's the most underrated skill for a data scientist, and why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **Communication and stakeholder management.** (1) The best model is worthless if you can't explain why it matters, (2) translating technical findings to business impact is where value is created, (3) managing expectations prevents disappointment (\"we can improve by 10%, not eliminate the problem\"), (4) asking the right business questions is harder than building the model, (5) writing clear documentation saves future-you and your team weeks, (6) saying no (with data) to low-impact projects is as valuable as executing high-impact ones, (7) building trust with stakeholders leads to more ambitious, impactful projects, (8) technical skills can be learned from courses — communication skills require practice and empathy."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
