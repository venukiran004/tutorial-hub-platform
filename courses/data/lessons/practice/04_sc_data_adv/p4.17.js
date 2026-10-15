/* ============================================================================
   PRACTICE P4.17 — Predict the Output / Scenarios · 17
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.17",
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
   "text": "Predict the Output / Scenarios · 17",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "401",
   "q": "Your company wants to use LLMs (Large Language Models) to automate parts of the data science workflow. Where can LLMs help?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Emerging Topics in Data Science**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) EDA automation: \"describe this dataset, identify anomalies,\" (2) code generation: generate feature engineering code from natural language descriptions, (3) documentation: auto-generate docstrings, README files, model cards, (4) data quality: natural language rules → validation code, (5) SQL generation: business questions → SQL queries, (6) insight extraction: summarize model results in plain English, (7) limitations: LLMs can hallucinate statistics, can't replace rigorous analysis, (8) best use: augment, not replace — human reviews LLM-generated code and insights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "402",
   "q": "You need to evaluate a RAG (Retrieval-Augmented Generation) system for answering internal documentation questions. What metrics do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Retrieval quality: Recall@K — does the relevant document appear in top-K results?, (2) Relevance: judge if retrieved chunks actually contain the answer, (3) Faithfulness: is the generated answer grounded in retrieved context? (no hallucinations), (4) Answer correctness: compared to human-annotated ground truth, (5) Answer completeness: does it cover all aspects of the question?, (6) Latency: end-to-end response time, (7) Unanswerable detection: when no answer exists, does it say so?, (8) tools: RAGAS framework, human evaluation for quality, (9) continuous: track user feedback (thumbs up/down) in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "403",
   "q": "Vector databases are becoming popular. When should you use one vs. a traditional database for ML features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use vector DB when: (1) similarity search: finding nearest neighbors in embedding space, (2) recommendation: similar items/users based on learned representations, (3) RAG: retrieving relevant document chunks for LLM, (4) image/text search: semantic search beyond keyword matching. Use traditional DB when: (5) exact lookups: user features by ID, (6) aggregations: sum, count, average by group, (7) structured queries: SQL-based filtering, joining, (8) transactional: ACID compliance needed. Hybrid: (9) many systems use both — structured features from PostgreSQL, embeddings from Pinecone/Weaviate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "404",
   "q": "You need to evaluate whether an LLM is suitable for your classification task vs. a fine-tuned smaller model. How do you compare?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Performance: few-shot LLM vs. fine-tuned BERT/DistilBERT on your specific task, (2) cost: LLM API call ($0.01-0.10 per prediction) vs. self-hosted model (fixed infra cost), (3) latency: LLM API = 500ms-2s vs. fine-tuned model = 5-50ms, (4) data privacy: LLM API sends data to external provider, (5) customizability: fine-tuned model learns your domain perfectly, (6) at scale: fine-tuned model is usually more cost-effective at >1000 predictions/day, (7) maintenance: LLM requires prompt engineering, fine-tuned requires retraining, (8) typical result: fine-tuned model matches or beats LLM at lower cost for focused tasks."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Experiment Design**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "405",
   "q": "You want to run an A/B test but it's impractical to randomize at the user level (network effects — users influence each other). How do you experiment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cluster randomization: randomize at group level (city, school, office), (2) switchback experiments: alternate treatment/control over time for same units, (3) synthetic control: create synthetic control group from untreated units, (4) ego-network randomization: randomize at user's network neighborhood level, (5) interference modeling: explicitly model spillover effects, (6) geographical randomization: treat some regions, keep others as control, (7) pre/post with diff-in-diff: compare before/after accounting for trends, (8) larger sample needed: cluster randomization reduces effective sample size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "406",
   "q": "Your A/B test has been running for 3 weeks but hasn't reached significance. Your PM asks: \"should we keep running or stop?\" What's your analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check power analysis: with current effect size, how many more weeks needed?, (2) futility analysis: is the observed effect so small that even with more data it won't be significant?, (3) sequential testing: use sequential analysis framework (always valid p-values), (4) if effect is near zero with tight CI: stop — there's likely no meaningful effect, (5) if effect is positive but CI includes zero: consider if longer run will narrow CI enough, (6) resource cost: is 3 more weeks of traffic on a test worth the potential insight?, (7) recommendation: present expected timeline + cost to PM, let them decide."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "407",
   "q": "You're running an A/B test on a subscription product. Users in treatment churn less in week 1, but churn MORE in weeks 2-4. How do you interpret this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Novelty effect: treatment excitement wears off → long-term behavior reverts or worsens, (2) selection effect: treatment retained low-quality users in week 1 who then naturally churn later, (3) delayed negative effect: treatment has a genuine negative long-term impact, (4) analysis: cohort-based survival curve — plot retention over time for both groups, (5) check: is the treatment simply delaying churn, not preventing it?, (6) decision: need full customer lifecycle data before declaring winner, (7) recommendation: extend test duration to capture steady-state behavior."
    },
    {
     "t": "p",
     "text": "**Theme: Complex Data Processing**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "408",
   "q": "You receive data where timestamps are in different timezones but the timezone isn't recorded. How do you harmonize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Investigate: check data sources — each source likely uses a consistent timezone, (2) heuristics: look at patterns — if events cluster at 9am-5pm, infer local business hours, (3) metadata: check system documentation for timezone conventions, (4) UTC normalization: convert all to UTC once timezone is determined, (5) store both: original timestamp + UTC conversion for debugging, (6) edge cases: DST transitions create ambiguous hours, (7) validation: cross-reference with known events (if you know a meeting was at 2pm ET, check the timestamp), (8) going forward: mandate UTC storage with timezone offset."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "409",
   "q": "Your data has text fields with PII (emails, phone numbers, SSNs) embedded in free text comments. How do you de-identify?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Regex patterns: detect emails, phone numbers, SSNs with pattern matching, (2) NER models: detect names, addresses, organizations using SpaCy/Presidio, (3) replacement: replace PII with tokens — \"[EMAIL]\", \"[PHONE]\", \"[NAME]\", (4) tools: Microsoft Presidio (free), Amazon Comprehend (managed), (5) validation: sample and manually check de-identification quality, (6) iterative: start aggressive (over-redact), refine rules to reduce false positives, (7) logging: track what was redacted for audit, (8) pipeline: de-identify before any downstream processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "410",
   "q": "You have data in 15 different CSV files with slightly different formats (different delimiters, headers, date formats). How do you build a robust ingestion pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nfrom dataclasses import dataclass\n\n@dataclass\nclass FileConfig:\n    delimiter: str = ','\n    date_columns: list = None\n    date_format: str = '%Y-%m-%d'\n    encoding: str = 'utf-8'\n    header_row: int = 0\n    column_mapping: dict = None  # map source → standard names\n\n# Per-file configuration\nconfigs = {\n    'sales_us.csv': FileConfig(delimiter=',', date_format='%m/%d/%Y'),\n    'sales_eu.csv': FileConfig(delimiter=';', date_format='%d.%m.%Y'),\n    # ... more configs\n}\n\ndef ingest_file(filepath, config):\n    df = pd.read_csv(filepath, delimiter=config.delimiter,\n                     encoding=config.encoding, header=config.header_row)\n    if config.column_mapping:\n        df = df.rename(columns=config.column_mapping)\n    for col in (config.date_columns or []):\n        df[col] = pd.to_datetime(df[col], format=config.date_format)\n    return df"
    },
    {
     "t": "p",
     "text": "**Theme: Specialized ML Techniques**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "411",
   "q": "You need to build a model that predicts a proportion (values between 0 and 1, not binary). What model families work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Beta regression: natural distribution for proportions — statsmodels GLM with Beta family, (2) quasi-binomial: handles over-dispersion in proportion data, (3) logit transformation: transform proportion to log-odds, fit linear regression, (4) zero-one inflated beta: if many observations are exactly 0 or 1, (5) generalized additive model: smooth fit with beta distribution, (6) practical: for ML — XGBoost with square root or logit-transformed target, inverse-transform predictions, (7) evaluation: use appropriate loss (beta negative log-likelihood, RMSE on logit scale), (8) clip predictions to [0, 1] range."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "412",
   "q": "You have spatial data (latitude/longitude) and need to predict property values. What spatial considerations matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Spatial autocorrelation: nearby properties have similar values (Tobler's law), (2) features: distance to landmarks (school, transit, city center), neighborhood statistics, (3) spatial cross-validation: don't train/test on nearby properties — spatial block CV, (4) kriging: geostatistical method that models spatial correlation, (5) spatial lag features: average price of k-nearest neighbor properties, (6) geographically weighted regression: coefficients vary by location, (7) encoding lat/lon: don't use raw coords — use geohash, H3, or learned embeddings, (8) evaluation: check residuals for spatial patterns (Moran's I)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "413",
   "q": "Your classification problem has a very long tail of rare categories (100 categories, top 10 have 90% of data). How do you handle them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hierarchical: group rare categories into \"Other\" at first, build multiclass for top categories, (2) two-stage: model 1 predicts \"top10 vs. rare,\" model 2 classifies within rare, (3) embeddings: category embeddings that capture similarity between rare categories, (4) few-shot learning: learn with limited examples per category, (5) data augmentation: augment rare categories, (6) class-specific thresholds: different confidence thresholds per category frequency, (7) evaluation: macro-F1 to weight all categories equally, (8) practical: define minimum viable frequency — categories below threshold get merged."
    },
    {
     "t": "p",
     "text": "**Theme: Cross-Functional Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "414",
   "q": "The product team wants to implement a new feature based on your model predictions. How do you collaborate effectively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Alignment: agree on what the model predicts, what actions the product takes, (2) API contract: define input/output format, latency requirements, error handling, (3) edge cases: what happens when model returns low confidence? Fallback behavior?, (4) A/B test plan: test product feature with model vs. baseline collaboratively, (5) monitoring: shared dashboard — product metrics + model metrics, (6) iteration: regular sync to review results and refine, (7) documentation: model card + product spec aligned, (8) timeline: model readiness vs. product development timeline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "415",
   "q": "Legal asks you to explain GDPR implications for your ML model. What do you cover?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Lawful basis for processing: consent, legitimate interest, or contract?, (2) data minimization: only collect features necessary for the model, (3) purpose limitation: model used only for stated purpose, (4) right to explanation: automated decisions must be explainable (Article 22), (5) right to erasure: can you remove a person's data from training?, (6) data protection impact assessment: required for high-risk processing, (7) cross-border: if data moves outside EU, additional safeguards needed, (8) data retention: how long are training data and predictions kept?, (9) profiling: if model profiles individuals, specific GDPR requirements apply."
    },
    {
     "t": "p",
     "text": "**Theme: Performance Optimization Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "416",
   "q": "Your pandas code runs too slowly on 10M rows. What optimization strategies do you try, in order?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Vectorization: replace loops with vectorized operations (10-100x speedup), (2) dtypes: downcast int64 → int32/int16, float64 → float32 (reduces memory, faster), (3) categorical: convert string columns to pd.Categorical (huge memory savings), (4) query/eval: `df.query(\"col > 5\")` uses numexpr (faster than boolean indexing for large DataFrames), (5) chunking: process in chunks if memory-bound, (6) switch to Polars/DuckDB: 5-20x faster than pandas on large data, (7) database: push operations to SQL if data is in DB (let DB engine optimize), (8) Dask/Vaex: lazy evaluation for out-of-core computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "417",
   "q": "Your Spark job is slow. How do you diagnose and fix performance issues?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Spark UI: check stage durations — which stage is slow?, (2) data skew: one partition has much more data → salting or pre-aggregation, (3) shuffles: reduce joins and groupBys that trigger expensive shuffles, (4) broadcast join: if one table is small (<100MB), broadcast it, (5) partitioning: repartition to appropriate number (too few = underutilized, too many = overhead), (6) caching: `df.cache()` if same DataFrame used multiple times, (7) serialization: use Kryo serializer (faster than Java default), (8) resources: increase executor memory/cores if underpowered, (9) AQE: enable Adaptive Query Execution for automatic optimization."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "418",
   "q": "You build a customer segmentation model. Marketing applies different strategies to each segment but doesn't see improvement. What went wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Segments aren't actionable: technically valid clusters but no clear marketing action per cluster, (2) wrong features: clustered on demographic features but behavior drives response, (3) no stability: customer segments change frequently → inconsistent strategies, (4) wrong number of segments: too many (can't act on each) or too few (too generic), (5) misalignment: marketing can't differentiate channels/messages by segment, (6) fix: involve marketing in defining what a \"useful segment\" looks like before clustering, (7) better approach: segment on behavioral/attitudinal data, validate with A/B testing that strategies differ by segment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "419",
   "q": "You discover your training data has labels created by a model (pseudo-labels from a previous version). Is this a problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Yes — potential issues: (a) model learns to replicate previous model's biases, (b) ground truth errors compound over generations, (c) label quality degrades each generation (\"model collapse\"), (2) validation: compare pseudo-labels to human-annotated sample, (3) mixing: use pseudo-labels + some human labels (co-training), (4) confidence filtering: only use pseudo-labels where model was very confident, (5) periodic refresh: regularly obtain fresh human labels, (6) monitor: track if model performance degrades over generations, (7) acceptable when: pseudo-labels are for pre-training + human labels for fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "420",
   "q": "Your model predicts well in A/B tests but the product team reports no business impact. How is this possible?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model predicts accurately but predictions don't change actions — no incremental value, (2) implementation gap: model predictions not being used correctly downstream, (3) user behavior: users ignore model suggestions (recommendation not compelling), (4) cannibalization: model improves one metric but hurts another, (5) time lag: business impact takes months to materialize, (6) attribution: business impact affected by other simultaneous changes, (7) wrong metric: model optimizes for clicks but business wants purchases, (8) investigation: follow the full chain — prediction → action → user behavior → outcome."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Probability and Statistics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "421",
   "q": "You're modeling rare events (< 0.01% occurrence). Normal statistical tests don't work well. What approaches do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Extreme value theory: model the tails of distributions specifically, (2) Poisson regression: for count of rare events, (3) exact tests: Fisher's exact test instead of chi-squared for small counts, (4) Bayesian methods: prior helps with sparse data, (5) zero-inflated models: if excess zeros in count data, (6) survival analysis: time-to-event modeling handles rare events naturally, (7) simulation: Monte Carlo for estimating rare event probabilities, (8) importance sampling: bias sampling toward rare events, then correct, (9) aggregate: if per-user events are rare, aggregate to cohort level."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "422",
   "q": "Explain Simpson's Paradox with a real data science example and how to handle it.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Example: \"Treatment A has higher recovery rate than B overall. But within each severity group (mild, severe), B beats A.\" Why: A is used more on mild cases (higher base recovery rate), inflating A's aggregate numbers. (1) Detection: always look at results by subgroups, (2) resolution: determine which level is the correct causal analysis, (3) usually: subgroup-level analysis is correct (within-group comparison), (4) solution: stratified analysis or include group as a covariate, (5) DAG: use causal graph to determine if you should condition on the grouping variable, (6) practical: if the grouping variable is a confounder → condition on it, if it's a mediator → don't."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "423",
   "q": "You need to compute confidence intervals for a complex statistic (ratio of two means). Analytical formulas don't exist. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bootstrap: (1) Resample data with replacement, B=10,000 times, (2) compute your complex statistic on each bootstrap sample, (3) confidence interval: 2.5th and 97.5th percentiles of bootstrap distribution, (4) BCa method: bias-corrected and accelerated bootstrap (more accurate), (5)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\ndef bootstrap_ci(data1, data2, stat_func, n_boot=10000, ci=0.95):\n    stats = []\n    for _ in range(n_boot):\n        idx1 = np.random.choice(len(data1), len(data1), replace=True)\n        idx2 = np.random.choice(len(data2), len(data2), replace=True)\n        stats.append(stat_func(data1[idx1], data2[idx2]))\n    alpha = (1 - ci) / 2\n    return np.percentile(stats, [alpha*100, (1-alpha)*100])"
    },
    {
     "t": "p",
     "text": "**Theme: Data Engineering for Data Scientists**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "424",
   "q": "You need to design a schema for storing ML experiment results. What do you include?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "CREATE TABLE experiments (\n    experiment_id UUID PRIMARY KEY,\n    experiment_name VARCHAR(200),\n    created_at TIMESTAMP DEFAULT NOW(),\n    description TEXT,\n    dataset_version VARCHAR(50),\n    git_commit_hash VARCHAR(40),\n    status VARCHAR(20) -- 'running', 'completed', 'failed'\n);\n\nCREATE TABLE runs (\n    run_id UUID PRIMARY KEY,\n    experiment_id UUID REFERENCES experiments,\n    model_type VARCHAR(100),\n    hyperparameters JSONB,\n    metrics JSONB,  -- {\"auc\": 0.92, \"f1\": 0.85, \"latency_ms\": 12}\n    feature_set VARCHAR(100),\n    training_duration_sec FLOAT,\n    artifact_path VARCHAR(500),\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE TABLE predictions (\n    prediction_id UUID PRIMARY KEY,\n    run_id UUID REFERENCES runs,\n    input_hash VARCHAR(64),\n    prediction JSONB,\n    ground_truth JSONB,\n    created_at TIMESTAMP\n);"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "425",
   "q": "Your data pipeline needs to handle late-arriving data (events that arrive hours or days after they occurred). How do you design for this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Event time vs. processing time: always track when event happened, not when it arrived, (2) watermarking: define how long to wait for late data before finalizing, (3) reprocessing: when late data arrives, trigger re-computation of affected aggregations, (4) append-only: always insert, never overwrite — allows reprocessing, (5) versioned outputs: each reprocessing creates new version of aggregated data, (6) dashboards: show \"data completeness\" indicator, (7) model training: use event time for temporal splits (not arrival time), (8) monitoring: track late arrival rates and patterns."
    },
    {
     "t": "p",
     "text": "**Theme: Scenario Deep Dives**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
