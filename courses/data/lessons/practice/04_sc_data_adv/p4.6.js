/* ============================================================================
   PRACTICE P4.6 — Predict the Output / Scenarios · 6
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.6",
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
   "text": "Predict the Output / Scenarios · 6",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "126",
   "q": "You've been working on a project for 2 months with no clear progress. How do you decide whether to pivot or persevere?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Review objectives: has the problem definition changed?, (2) what have you learned? List concrete findings (even negative ones), (3) root cause of no progress: data quality? wrong approach? impossible problem?, (4) quick win analysis: is there a simpler version that provides 80% of value?, (5) external opinion: peer review from experienced colleague, (6) decision framework: (a) if data fundamentally doesn't support the prediction → pivot, (b) if approach was wrong → try alternative approach, (c) if problem is too complex → simplify scope, (7) communicate transparently with stakeholders, (8) time-box: give 2 more weeks on a specific alternative before deciding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "Your data science team uses different tools and approaches. One uses R, another Python, another SAS. How do you standardize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't force immediate standardization — it kills productivity, (2) standardize gradually on ML approach: Python (most packages, community, deployment), (3) keep R for specialized statistical analysis if needed, (4) phase out SAS: migrate to Python equivalent, (5) standard environment: Docker, shared compute, (6) shared code library for common tasks (data loading, feature engineering), (7) MLflow for experiment tracking (language-agnostic), (8) training investment: workshops for team members switching tools, (9) new hires: require Python proficiency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "How do you estimate the time a data science project will take when there's high uncertainty?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Break into phases: exploration (2-3 weeks), prototype (2-3 weeks), productionize (3-4 weeks), (2) three-point estimation: optimistic, expected, pessimistic per phase, (3) PERT estimate: (O + 4M + P) / 6, (4) add buffer: multiply estimate by 1.5 for unknown unknowns, (5) milestone-based: demo baseline model in week 2 — if it doesn't work, scope changes, (6) historical: how long did similar past projects take?, (7) communicate ranges, not points: \"4-8 weeks\" not \"6 weeks,\" (8) agile: deliver incrementally, re-estimate at each milestone."
    },
    {
     "t": "p",
     "text": "**Theme: Causal Machine Learning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "You need to estimate heterogeneous treatment effects — which customers benefit most from a discount. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Causal Forest: tree-based method that estimates conditional average treatment effects (CATE), (2) T-learner: separate models for treated/control, CATE = f(x|treated) - f(x|control), (3) S-learner: single model with treatment indicator, (4) X-learner: cross-estimation for better efficiency with unequal group sizes, (5) SHAP for treatment effect heterogeneity: which features moderate the treatment effect, (6) practical: sort customers by predicted CATE, target those with CATE > cost_of_discount, (7) validation: A/B test on top predicted CATE segment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "Your observational data shows that customers who receive loyalty rewards spend more. But maybe they'd spend more anyway (selection bias). How do you estimate the causal effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Propensity score matching: match rewarded customers with similar non-rewarded customers, (2) Doubly robust estimation: combine propensity model with outcome model, (3) Instrumental variable: find something that affects reward assignment but not spending directly, (4) Regression discontinuity: if rewards are given at a spending threshold, compare just above/below, (5) Difference-in-differences: compare spending before/after reward program for both groups, (6) sensitivity analysis: Rosenbaum bounds — how much unmeasured confounding would be needed to explain away the effect?"
    },
    {
     "t": "p",
     "text": "**Theme: Model Deployment Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "When should you deploy a model as a batch pipeline vs. a real-time API?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Batch when: (1) predictions needed periodically (daily, weekly), (2) no latency requirement, (3) scoring millions of records (email campaigns), (4) features require heavy computation. Real-time when: (1) predictions needed at point of interaction, (2) latency < 100ms required, (3) features depend on current context (real-time request data), (4) low volume per request. Hybrid: (5) pre-compute batch predictions, serve from cache, (6) real-time model for cache misses, (7) near-real-time: micro-batch (every 5 minutes) for streaming scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "You're deploying your first ML model. What's the minimum viable production setup?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model artifact: serialized model file (pickle, ONNX, joblib), (2) serving: Flask/FastAPI endpoint wrapping model.predict(), (3) containerized: Docker (reproducible environment), (4) input validation: check incoming features for type, range, nulls, (5) logging: log every prediction (input, output, latency, timestamp), (6) health check endpoint: /health, (7) basic monitoring: prediction volume, error rate, latency (Prometheus/CloudWatch), (8) version tracking: which model version is deployed, (9) rollback plan: ability to revert to previous version, (10) NOT needed for MVP: A/B testing, feature store, auto-retraining."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Pandas**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "You need to efficiently process a DataFrame where operations vary by group. How do you optimize group-level operations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) `df.groupby('group').apply(custom_func)` — flexible but slow, (2) faster: use built-in aggregations where possible, (3) `transform`: returns same-sized output, great for group-level normalization:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['normalized'] = df.groupby('group')['value'].transform(\n    lambda x: (x - x.mean()) / x.std()\n)"
    },
    {
     "t": "p",
     "text": "(4) numba: JIT compile custom functions for speed, (5) for large data: Polars groupby is 10-100x faster, (6) avoid: loop over groups with itertools — use vectorized operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "Your DataFrame has 100 million rows. `.merge()` crashes with MemoryError. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Reduce memory first: downcast dtypes, categories for strings, (2) chunk the merge: split larger DataFrame, merge in chunks, concat:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "chunks = np.array_split(df_large, 100)\nresult = pd.concat([chunk.merge(df_small, on='key') for chunk in chunks])"
    },
    {
     "t": "p",
     "text": "(3) Use Dask for out-of-core merge, (4) database: load both tables into SQLite/DuckDB, SQL join, (5) Polars: more memory-efficient than pandas, (6) reduce cardinality: do you need all columns? Select only needed ones before merge."
    },
    {
     "t": "p",
     "text": "**Theme: Scenario: End-to-End Project**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "Walk through an end-to-end data science project from business problem to deployed model for customer churn prediction.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **Week 1-2 — Problem Definition**: (1) define churn (no purchase in 90 days), (2) success criteria: identify 60% of churners 30 days before churn, (3) data audit: what's available?"
    },
    {
     "t": "p",
     "text": "**Week 3-4 — Data Preparation**: (4) pull transaction history, demographics, support tickets, (5) create labels: did each customer churn in the following 30 days?, (6) feature engineering: RFM, engagement, sentiment from tickets, (7) handle missing data, encode categoricals."
    },
    {
     "t": "p",
     "text": "**Week 5-6 — Modeling**: (8) baseline: logistic regression, (9) try: gradient boosting, random forest, (10) cross-validation with temporal splits, (11) feature importance analysis."
    },
    {
     "t": "p",
     "text": "**Week 7 — Evaluation**: (12) precision@k: can marketing contact top-k customers?, (13) fairness: equitable across customer segments, (14) stakeholder review of example predictions."
    },
    {
     "t": "p",
     "text": "**Week 8-9 — Deployment**: (15) containerize model in Docker, (16) REST API for real-time scoring, (17) batch scoring daily for marketing team."
    },
    {
     "t": "p",
     "text": "**Week 10+ — Monitoring**: (18) drift detection, (19) A/B test: model intervention vs. no intervention, (20) retrain quarterly."
    },
    {
     "t": "p",
     "text": "**Theme: Miscellaneous Advanced**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "You need to compare the distributions of a feature between two groups. What test do you choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on data type and assumptions: (1) continuous, normal: t-test (parametric, powerful), (2) continuous, non-normal: Mann-Whitney U / Wilcoxon rank-sum (non-parametric), (3) continuous, any distribution: Kolmogorov-Smirnov test (compares entire distributions), (4) categorical: chi-squared test, (5) ordinal: Kruskal-Wallis, (6) multiple groups: ANOVA (parametric) or Kruskal-Wallis (non-parametric), (7) for monitoring: Population Stability Index (PSI) — bins and compares, (8) effect size: always report alongside p-value."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "Your data has seasonal patterns AND a long-term trend AND irregular spikes. How do you decompose it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Classical decomposition: trend + seasonal + residual (additive or multiplicative), (2) STL (Seasonal and Trend decomposition using LOESS): robust to outliers, handles changing seasonality, (3) Prophet decomposition: trend + multiple seasonalities + holidays + regressors, (4) for multiple seasonal periods: MSTL, (5) wavelet decomposition: captures irregularities at different scales, (6) EMD (Empirical Mode Decomposition): adaptive, data-driven decomposition, (7) visualize each component to understand what drives the series."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "You need to detect concept drift in a deployed model without ground truth labels (labels arrive with 30-day delay). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Feature drift as proxy: (1) PSI / KL divergence on input features vs. training distribution, (2) prediction distribution monitoring: has the score distribution shifted?, (3) model uncertainty: if average prediction uncertainty increases, something changed, (4) page-Hinkley test or ADWIN on feature distributions, (5) autoencoder-based: reconstruction error increases for new patterns, (6) reference window comparison: compare recent data to reference window, (7) domain classifier: train model to distinguish new data from training data — if it can, there's drift."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "Your model uses features from 3 different teams' data sources. How do you manage dependencies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature contracts: SLAs defining expected schema, freshness, quality, (2) data lineage tracking: trace features back to sources, (3) monitoring: alert if upstream schema changes or data quality drops, (4) decoupling: feature store as intermediary — model reads from store, not directly from sources, (5) schema versioning: detect breaking changes early, (6) fallback values: graceful degradation when a feature is unavailable, (7) documentation: feature catalog with owner, source, computation logic, (8) regular sync with data-providing teams."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "You're building a model for a use case you've never worked on before. How do you ramp up quickly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Literature review: 3-5 papers on similar problems (Google Scholar, Arxiv), (2) Kaggle: find similar competitions, study winning solutions, (3) industry benchmarks: what do peers use for this problem?, (4) domain expert interviews: 2-3 conversations with subject matter experts, (5) baseline replication: implement a known good approach first, (6) existing open-source implementations: GitHub repos for similar problems, (7) identify key challenges: what makes this problem hard?, (8) time-box: 1 week for ramp-up, then start building."
    },
    {
     "t": "p",
     "text": "**Theme: Additional Practical Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "Your stacking ensemble uses cross-validation predictions as meta-features, but test set predictions come from models trained on all training data. This creates a discrepancy. How do you handle it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Out-of-fold (OOF) predictions for training: each fold only uses models trained without that fold's data → no leakage, (2) test predictions: average models from all folds for each base model, (3) alternative: blend (split training into two sets: base model training + meta-learner training), (4) multi-level stacking: repeat the process for multiple layers, (5) caution: OOF predictions may overfit if too many base models or too many stacking layers, (6) regularize meta-learner: simple model (linear) to prevent overfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "Your company has a Google Sheet that 10 people manually update with \"data.\" They want ML predictions from it. How do you productionize this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Resist going straight to ML — first analyze: is ML even needed for this volume?, (2) if yes: migrate from Google Sheet to a proper database, (3) intermediate: Google Sheets API → Python script → predictions written back, (4) data validation: add constraints to prevent bad data entry, (5) automated pipeline: scheduled script pulls data, runs model, writes predictions, (6) long-term: build a simple web application with proper data entry forms, (7) pragmatic approach: start with spreadsheet integration, evolve as value is proven."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "You need to join data from a SQL database, a REST API, and a CSV file for your analysis. How do you orchestrate this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Python as orchestrator: SQLAlchemy for DB, requests for API, pandas for CSV, (2) extract all to pandas DataFrames, then merge:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df_sql = pd.read_sql(\"SELECT * FROM table\", conn)\ndf_api = pd.DataFrame(requests.get(api_url).json())\ndf_csv = pd.read_csv(\"data.csv\")\nresult = df_sql.merge(df_api, on='id').merge(df_csv, on='id')"
    },
    {
     "t": "p",
     "text": "(3) for production: Airflow DAG with extract-transform-load tasks, (4) cache API results to avoid repeated calls, (5) error handling: what if API is down? Use cached version."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "Your team wants to use LLMs for classification instead of traditional ML. When is this appropriate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** LLMs appropriate when: (1) zero/few-shot needed (no labeled data), (2) task requires understanding nuance, context, world knowledge, (3) multiple related tasks (LLM handles many vs. one model per task), (4) rapid prototyping (no training infrastructure needed). Traditional ML better when: (5) large labeled dataset available, (6) latency critical (<10ms), (7) cost matters (LLM API calls expensive at scale), (8) task is well-defined classification with clear features, (9) regulatory requirement for deterministic, auditable model. Hybrid: (10) LLM for labeling → train traditional ML on LLM labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "Your model was accidentally trained with a data leak. You discover this after deployment. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Immediate: (1) assess severity: how bad is the leak? How inflated is performance?, (2) if production decisions were significantly wrong: notify stakeholders, quantify impact, (3) retrain correctly: remove leaked feature, proper temporal splits. Analysis: (4) estimate true performance: evaluate on held-out data without leaked info, (5) review any business decisions made based on inflated metrics, (6) communicate honestly: \"we found an error, here's the corrected performance.\" Prevention: (7) adversarial validation to detect leaks, (8) feature list review by domain expert, (9) test: does any single feature give suspiciously high performance?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "You built a model that works great but the engineering team says it's too complex to deploy. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Understand their concerns: latency, memory, dependencies, maintenance?, (2) simplify: (a) feature reduction — fewer features = simpler pipeline, (b) model distillation: train simpler model on complex model's predictions, (c) ONNX export for framework-agnostic serving, (3) compromise on complexity: remove the bottom 30% of features (usually minimal impact), (4) containerize: Docker handles dependency concerns, (5) pre-compute: batch predictions instead of real-time, (6) collaborate: pair with engineer from design phase next time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "How do you handle a situation where your model needs retraining but you can't get new labeled data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Semi-supervised: use model's confident predictions on unlabeled data as pseudo-labels, (2) active learning: have the model identify the most informative examples to label, (3) weak supervision: programmatic labeling rules (Snorkel), (4) data augmentation on existing labeled data, (5) transfer learning: fine-tune a pre-trained model, (6) LLM labeling: use GPT-4 to label examples (with human validation on sample), (7) crowdsourcing: Amazon Mechanical Turk for simple labeling, (8) self-training: iterative pseudo-labeling with confidence thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "Your model predictions need to be explainable for a compliance report. How do you generate explanations at scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) SHAP: compute for every prediction, store in database, (2) top-k features per prediction: summarize as \"predicted due to A, B, C,\" (3) batch compute: SHAP is slow — compute overnight in batch, (4) TreeSHAP for tree-based models: fast, exact, (5) pre-compute explanation templates: \"if feature X > threshold → generates explanation Y,\" (6) rules extraction: convert model to approximate rule set for audit, (7) LIME for sample-specific explanations, (8) audit dashboard: random sample with full explanations for compliance review."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "You need to build a pipeline that identifies at-risk students in a university. What ethical considerations do you address?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Purpose: identification should lead to **support**, not punishment, (2) bias: does the model disproportionately flag certain demographics?, (3) features: avoid proxies for protected attributes (zip code → race/income), (4) transparency: students should know the system exists, (5) consent: opt-in/opt-out mechanism, (6) data minimization: only use necessary data, (7) human-in-the-loop: academic advisors review, not automated actions, (8) appeal process: students can dispute, (9) evaluation: does intervention actually help flagged students?, (10) sunset: re-evaluate model's value annually."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "Looking at the data science field, what skills beyond technical expertise make you a better data scientist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Communication: translating technical findings to business impact, (2) business acumen: understanding how the company makes money, (3) product thinking: framing ML solutions around user needs, (4) stakeholder management: setting expectations, handling feedback, (5) project management: scoping work, estimating timelines, (6) critical thinking: questioning data, methodology, results, (7) intellectual curiosity: continuously learning new methods, (8) empathy: understanding end-user perspective, (9) prioritization: knowing when \"good enough\" beats \"perfect,\" (10) writing: clear documentation, reports, model cards."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
