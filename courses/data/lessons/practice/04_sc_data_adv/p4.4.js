/* ============================================================================
   PRACTICE P4.4 — Predict the Output / Scenarios · 4
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.4",
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
   "text": "Predict the Output / Scenarios · 4",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "76",
   "q": "You compressed your model from 500MB to 40MB but accuracy dropped 3%. Is this acceptable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decision depends on: (1) Business impact of 3% accuracy drop — translate to dollars/user impact, (2) deployment benefit: 12.5x smaller means running on devices vs. cloud (latency, privacy, offline access), (3) where accuracy dropped: uniform vs. concentrated in specific classes/segments, (4) recovery options: fine-tune compressed model on hard examples, (5) compare: is the compressed model still better than previous-generation alternatives?, (6) user perception: will users notice 3%?, (7) A/B test: real-world comparison. Often acceptable for mobile deployment."
    },
    {
     "t": "p",
     "text": "**Theme: Cross-Validation Advanced**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "Your time series data has temporal dependencies. Why is k-fold cross-validation wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** K-fold randomly splits data → training on future data to predict past (data leakage). Correct approaches: (1) time-series split: train on past, validate on future — expanding window, (2) walk-forward validation: slide window forward, (3) blocked time series split: leave gaps between train/test to avoid autocorrelation leakage, (4) purged cross-validation: remove samples near the boundary, (5) embargo: skip samples between train and test periods, (6) for financial data: Combinatorial Purged Cross-Validation (CPCV)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "Your dataset has groups (e.g., multiple records per patient). Why does regular k-fold fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Same patient in both train and test → data leakage: model memorizes patient-specific patterns. Use GroupKFold: (1) ensure all records from a patient are in the same fold, (2) `from sklearn.model_selection import GroupKFold`, (3) groups defined by patient_id, (4) evaluate: does performance differ between GroupKFold and regular k-fold? If yes, you had leakage, (5) for stratified groups: StratifiedGroupKFold balances target distribution AND respects groups, (6) leave-one-group-out for small number of groups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "You have a small dataset (200 samples). K-fold estimates have high variance. How do you get more stable estimates?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Repeated k-fold: 10-fold × 10 repetitions = 100 evaluation rounds, (2) leave-one-out cross-validation (LOOCV): maximum training data per fold, but high variance in individual fold estimates, (3) nested cross-validation: outer loop for evaluation, inner for hyperparameter tuning, (4) bootstrap: .632+ bootstrap estimates, (5) report mean ± standard deviation across repeats, (6) confidence interval calculation from repeated CV results, (7) stratified splitting: ensure class proportions maintained in each fold."
    },
    {
     "t": "p",
     "text": "**Theme: Text Analytics in Production**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "Your NLP model works on English but receives multilingual input in production. Some inputs are in unexpected languages. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Language detection: fasttext language ID model (first step in pipeline), (2) route to language-specific or multilingual model, (3) for unsupported languages: return \"language not supported\" or translate → process, (4) translation fallback: Google Translate API → English model, (5) multilingual model: XLM-RoBERTa handles 100+ languages, (6) monitoring: log language distribution, track accuracy per language, (7) user feedback for quality in non-English languages, (8) graceful degradation: lower confidence for unsupported languages."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "Your text classifier assigns a single label to support tickets, but some tickets have multiple issues. How do you adapt?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Switch to multi-label classification: (1) one-vs-rest classifiers per label, (2) multi-label BERT: sigmoid outputs per class (not softmax), (3) threshold per label: optimize on validation set, (4) label co-occurrence matrix: understand which labels appear together, (5) hierarchical: primary issue + secondary issues, (6) output: ranked list of applicable labels with confidence, (7) evaluation: hamming loss, subset accuracy, per-label F1, (8) routing: ticket goes to team matching highest-confidence label."
    },
    {
     "t": "p",
     "text": "**Theme: Ethics Case Studies**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "Your model identifies students at risk of dropping out. The school wants to use it to deny enrollment to \"risky\" students. How do you respond?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is a misuse of the model: (1) designed to **support** at-risk students, not exclude them, (2) using it to deny enrollment creates a self-fulfilling prophecy and harms the most vulnerable, (3) ethically: refusing to participate, escalate to leadership, (4) technically: model predicted dropout given **no intervention** — intervention can change outcomes, (5) propose correct use: identify at-risk students for additional support (tutoring, mentoring), (6) document model's intended vs. prohibited uses in model card, (7) implement technical safeguards: don't expose model to enrollment decisions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "Your facial recognition system has 99% accuracy on light-skinned faces but 85% on dark-skinned faces. How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't deploy until performance is equitable across groups, (2) root cause: training data under-represents dark-skinned faces, (3) collect more diverse training data, (4) evaluate per-subgroup: age × gender × skin tone, (5) augmentation: vary lighting, skin tone in training, (6) fairness constraint during training: equalize error rates across groups, (7) if disparities persist: consider whether the application should exist (surveillance vs. photo organization), (8) transparency: publish model performance by demographic group."
    },
    {
     "t": "p",
     "text": "**Theme: ML for Product**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Your product team wants to add an ML-powered search feature. How do you scope and plan this project?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Define success**: what makes search \"good\"? Relevance, speed, user satisfaction? (2) **Metrics**: MRR (Mean Reciprocal Rank), NDCG, click-through rate, zero-result rate, (3) **Baseline**: start with Elasticsearch/BM25 — already good for keyword search, (4) **MVP**: BM25 + typo correction + synonym expansion, (5) **V2**: add ML re-ranking (learning-to-rank) on top of BM25 candidates, (6) **V3**: semantic search with embeddings for understanding intent, (7) **Data needed**: search logs (query, clicks, no-clicks), relevance judgments, (8) **Timeline**: MVP in 2-4 weeks, ML-powered in 2-3 months, (9) **Infrastructure**: search index, embedding service, re-ranking model serving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "The PM says \"make the recommendation system better.\" How do you turn this into a concrete data science project?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Define \"better\": more clicks? more purchases? more diversity? higher retention?, (2) current state: what metrics does the current system achieve?, (3) user research: what do users complain about? (irrelevant, repetitive, not personalized?), (4) hypothesis: \"adding collaborative filtering will increase CTR by 15%,\" (5) success metric: pick ONE primary metric (e.g., purchase conversion from recommendations), (6) guardrail metrics: engagement, diversity, revenue per user shouldn't decrease, (7) scope: specific recommendation surface (homepage, PDP, email), (8) timeline and milestones: weeks 1-2 data prep, weeks 3-4 model, week 5 A/B test."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Python & Tools**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "Your Jupyter notebook analysis grew to 3000 lines and is unmanageable. How do you refactor?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Extract functions into .py modules: data loading, preprocessing, modeling, (2) use notebooks only for exploration and visualization, (3) structure: `src/` for code, `notebooks/` for exploration, `configs/` for parameters, (4) configuration: move hardcoded values to config files, (5) add docstrings and type hints to extracted functions, (6) testing: unit tests for critical transformations, (7) pipeline: convert to script-based pipeline (MLflow, Prefect), (8) version control: .py files diff better than .ipynb in Git, (9) template: cookie-cutter project structure for future projects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "You need to run the same analysis on multiple datasets with different schemas. How do you parameterize your code?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Configuration files: YAML/JSON specifying column mappings, (2) abstract data adapter pattern: standardized interface, dataset-specific implementations, (3) CLI with argparse: `python analyze.py --dataset=retail --target=revenue`, (4) dataclass for config:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@dataclass\nclass DatasetConfig:\n    name: str\n    target_col: str\n    feature_cols: List[str]\n    date_col: str\n    id_col: str"
    },
    {
     "t": "p",
     "text": "(5) Jinja templates for dynamic SQL queries, (6) factory pattern: config → appropriate pipeline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "You need to schedule a Python ML pipeline to run daily. What are your options?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Cron job + script**: simplest, limited error handling, (2) **Airflow**: DAGs for complex workflows, dependency management, monitoring, (3) **Prefect/Dagster**: modern alternatives to Airflow, Python-native, (4) **cloud-native**: AWS Step Functions, GCP Cloud Composer, Azure Data Factory, (5) **GitHub Actions**: for simpler scheduled tasks, (6) selection criteria: complexity (cron for simple, Airflow for complex), team familiarity, infrastructure, monitoring needs, (7) always include: logging, alerting, retry logic, idempotency."
    },
    {
     "t": "p",
     "text": "**Theme: Meta-Learning & Learning Strategy**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "You have 10 different datasets for similar prediction tasks (churn across 10 products). How do you leverage all of them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multi-task learning: shared model with product-specific output heads, (2) transfer learning: pre-train on largest dataset, fine-tune on others, (3) meta-learning: MAML or Reptile — learn initialization that adapts quickly to new tasks, (4) global model with product identifier features, (5) hierarchical/mixed-effects model: shared effects + product-specific random effects, (6) ensemble: train per-product models + global model, combine predictions, (7) feature sharing: features useful for one product often useful for others."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "Your model needs to adapt to new tasks with very few examples (5-shot learning). What approaches work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Prototypical Networks: compute class prototypes from few examples, classify by nearest prototype, (2) MAML: learn initialization for fast adaptation via gradient descent, (3) Siamese/Matching Networks: learn similarity metric, (4) prompt-based learning with LLMs: provide few examples in prompt, (5) fine-tuning pre-trained models: with careful regularization (head-only, then progressive unfreezing), (6) data augmentation to expand 5 examples, (7) nearest-neighbor in embedding space: use pre-trained embeddings, kNN on examples."
    },
    {
     "t": "p",
     "text": "**Theme: Scalability & Performance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "Your model training takes 48 hours on a single GPU. How do you speed it up?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data parallelism: split batches across multiple GPUs (PyTorch DDP), (2) mixed precision training: FP16 computation, 2x speedup, (3) gradient accumulation: simulate larger batch size without more memory, (4) learning rate scheduling: reduce time on learning rate warmup, (5) data loading optimization: num_workers, prefetching, memory-mapped data, (6) model architecture: smaller model (EfficientNet vs. ResNet-152), (7) progressive resizing: start with smaller inputs, increase during training, (8) cloud spot instances: 70% cheaper, with checkpointing for interruptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "Your inference pipeline handles 100 req/sec but needs to handle 10,000 req/sec. How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Horizontal scaling: more model replicas behind load balancer, (2) batching: collect requests, batch inference (GPU utilization), (3) caching: cache frequent predictions, (4) model optimization: ONNX Runtime, TensorRT for faster inference, (5) async processing: queue requests, return results via webhook, (6) CDN/edge caching for static predictions, (7) tiered architecture: simple model for 90% requests, complex model for 10%, (8) auto-scaling: scale replicas based on request queue depth, (9) quantization: INT8 inference 2-4x faster."
    },
    {
     "t": "p",
     "text": "**Theme: Industry-Specific Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "You're a data scientist at an insurance company. How do you build a claims fraud detection system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data: claim details, policyholder history, provider info, (2) features: claim amount vs. policy average, time since policy start, multiple claims in short period, provider billing patterns, geographic anomalies, (3) label: historically investigated and confirmed fraud, (4) challenge: extreme imbalance (<1% fraud), (5) model: gradient boosting with cost-sensitive learning, (6) network analysis: connected claims (same provider, same witness, same accident), (7) text analysis: claim narrative inconsistencies, (8) output: risk score → investigation queue, (9) SIU (Special Investigations Unit) feedback loop, (10) regulatory: ensure model doesn't discriminate on protected classes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "You're building a demand forecasting system for a grocery chain (10,000 SKUs × 500 stores). How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hierarchy: corporate → region → store → category → SKU, (2) global model with store/SKU features: LightGBM trained on all data with store_id, sku_id, category as features, (3) features: historical sales, price, promotion, weather, holidays, competition, (4) reconciliation: ensure store-level forecasts sum to regional totals, (5) intermittent demand: many SKU-store combinations are sparse — use Croston's method, (6) new product: use similar product analogues, (7) scale: distributed training with Spark/Dask, (8) evaluation: WMAPE (weighted by volume), bias tracking, (9) update: daily forecasts, weekly model retraining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "You're building a model for autonomous vehicle perception. What unique ML challenges exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Safety-critical: false negatives (missed pedestrian) can be fatal, (2) real-time: must process at 30+ FPS, (3) multi-modal: cameras, LiDAR, radar — sensor fusion, (4) edge cases: unusual objects, rare scenarios, adversarial weather, (5) long-tail distribution: most driving is routine, critical scenarios are rare, (6) domain shift: different cities, weather, lighting conditions, (7) labeling cost: 3D bounding box annotation is expensive, (8) evaluation: need millions of miles of testing, including simulation, (9) regulatory: validation standards, interpretability requirements, (10) distribution shift detection: know when the model is uncertain and yield to human."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Feature Selection**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "You have 1000 features but suspect most are irrelevant. How do you systematically reduce them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-stage approach: (1) Remove zero-variance features, (2) remove highly correlated pairs (r > 0.95, keep one), (3) univariate: mutual information or chi-squared to rank features, drop bottom 50%, (4) model-based: L1 regularization (Lasso) sets irrelevant coefficients to zero, (5) permutation importance: shuffle each feature, measure accuracy drop, (6) recursive feature elimination (RFE): iteratively remove least important, (7) Boruta: random forest-based method comparing against shadow features, (8) final validation: compare model with all features vs. selected features — should be comparable or better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "Your feature selection on training data chooses different features than when you run it on test data. Is this a problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Yes, this signals instability: (1) features are marginally relevant — small data changes flip selection, (2) possible overfitting in feature selection, (3) solutions: (a) stability selection: run many times on bootstrap samples, keep features selected > 60% of the time, (b) regularization path: features consistently selected across λ values are robust, (c) domain knowledge: keep features that make theoretical sense regardless of statistical significance, (4) cross-validated feature selection: evaluate within CV loop to get unbiased performance."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Troubleshooting**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "Your XGBoost model is overfitting (training AUC=0.99, validation AUC=0.82). How do you regularize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduce overfitting: (1) max_depth: decrease from 6 → 3-4, (2) min_child_weight: increase (more samples per leaf), (3) subsample: 0.7-0.8 (row subsampling), (4) colsample_bytree: 0.7-0.8 (column subsampling), (5) reg_alpha (L1) and reg_lambda (L2): increase regularization, (6) n_estimators: fewer trees with early stopping, (7) learning_rate: lower (0.01-0.05) with more trees, (8) gamma: minimum loss reduction for split — increase it, (9) check for: data leakage (too-good training AUC is suspicious)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "Your neural network loss plateaus after 10 epochs and won't decrease further. What do you try?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Learning rate: try warm restarts (cosine annealing), reduce on plateau, (2) architecture: is network large enough? Add layers/neurons, (3) batch normalization: add if not present, (4) skip connections (residual): help gradient flow, (5) data augmentation: more variation in training data, (6) optimizer: switch (Adam → SGD with momentum, or vice versa), (7) weight initialization: try different schemes (He, Xavier), (8) gradient clipping if gradients are exploding, (9) check: is the loss actually at the minimum? (maybe it's a good model), (10) learning rate finder: sweep to find optimal range."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "Your pipeline works fine locally but fails in production with different results. What are common causes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Package versions: different scikit-learn, pandas, numpy versions, (2) random seed not set: non-deterministic results, (3) data ordering: different sort order affects batch operations, (4) floating point: different hardware gives slightly different results, (5) environment variables: different config in prod, (6) data format: CSV encoding differences, date formats, (7) timezone differences: timestamps computed differently, (8) feature computation: development uses pandas, production uses Spark (different null handling). Prevention: (a) Docker containers for reproducibility, (b) integration tests with fixed data, (c) comparison pipeline: score same data in dev and prod, compare."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
