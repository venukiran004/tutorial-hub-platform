/* ============================================================================
   PRACTICE P4.18 — Predict the Output / Scenarios · 18
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.18",
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
   "text": "Predict the Output / Scenarios · 18",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "426",
   "q": "You're building a model to predict employee performance ratings. Your CHRO is excited but HR business partners are concerned. How do you navigate this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Ethical review: performance prediction is high-risk for bias, (2) legal: check labor laws — some jurisdictions restrict algorithmic decision-making for employment, (3) transparency: employees should know if AI is used in evaluations, (4) use case reframe: instead of predicting performance, predict what support an employee needs (development-focused), (5) fairness audit: check model for demographic bias (gender, age, ethnicity), (6) human-in-the-loop: model provides data points, managers still make decisions, (7) stakeholder engagement: involve HR BPs in model design (they have context), (8) pilot: small, voluntary pilot with clear opt-out before full rollout."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "427",
   "q": "Your e-commerce platform has a search relevance problem. Users search \"red shoes\" but get \"Red Bull\" products. How do you improve search relevance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Query understanding: parse intent — \"red\" is color modifier for \"shoes,\" not a brand, (2) attribute extraction: tag products with structured attributes (color, category, brand), (3) field boosting: match in product category > match in description > match in brand, (4) semantic search: BERT/sentence-transformer embeddings for query and products, (5) learning to rank (LTR): train ranking model on click-through data, (6) negative feedback: queries with high bounce rate → improve ranking, (7) query rewriting: \"red shoes\" → filter(category=shoes, color=red), (8) evaluation: NDCG on annotated queries."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "428",
   "q": "You have a successful model running in production. A new data source becomes available that could improve it. How do you safely integrate it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Offline evaluation: add new features to model, evaluate on historical data, (2) check: correlation with existing features (redundant?), missing rates, latency of new source, (3) reliability: is the new data source stable? What's the SLA?, (4) fallback: what happens when the new source is down? Model should work without it, (5) gradual rollout: shadow mode → canary → full deployment, (6) A/B test: model with new source vs. current model, (7) monitoring: track new feature values and their contribution, (8) documentation: update model card with new data dependency."
    },
    {
     "t": "p",
     "text": "**Theme: Model Interpretability**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "429",
   "q": "Your stakeholder asks: \"Which feature is most important?\" This seems simple but it's actually complex. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple definitions: (a) feature importance (how much does removing it hurt?), (b) feature contribution (how much does it contribute per prediction?), (c) feature relevance (does it have a causal relationship?), (2) methods disagree: permutation importance vs. SHAP vs. gain-based importance give different rankings, (3) correlated features: importance is split/shared between correlated features, (4) non-linear effects: a feature can be \"important\" in specific regions but not overall, (5) context: global importance vs. local importance (per prediction), (6) my approach: use SHAP for comprehensive understanding, always clarify what \"important\" means."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "430",
   "q": "You need to explain your ML model to regulators who will determine if it can be used for credit decisions. What documentation do you prepare?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model card: purpose, intended use, limitations, performance by demographic group, (2) feature documentation: every feature with business justification — why included, where from, (3) excluded features: what you explicitly excluded (protected classes) and why, (4) fairness analysis: disparate impact testing, equal opportunity metrics, (5) performance metrics: by demographic group, income level, geography, (6) adverse action reasons: how denial reasons are generated (SHAP-based), (7) model governance: who approved it, review cadence, monitoring plan, (8) alternative model comparison: show simpler model was inadequate (justify complexity), (9) stress tests: performance under adverse economic conditions."
    },
    {
     "t": "p",
     "text": "**Theme: Technical Interview Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "431",
   "q": "\"Walk me through how you would build an ML system from scratch for predicting customer lifetime value (CLV).\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"(1) Define CLV: sum of future revenue from customer over N months (say 12), (2) Data: transaction history, customer demographics, engagement metrics, (3) Target variable: actual revenue in next 12 months for historical customers (need sufficient history), (4) Features: recency (days since last purchase), frequency (purchase count), monetary (average order value), tenure, product categories, channel mix, (5) Model: start with RFM-based heuristic → graduate to regression model, (6) Evaluation: MAE, RMSE on held-out customers, calibration plot, (7) Segmentation: bucket CLV into tiers (high/medium/low) for actionable marketing, (8) Deployment: score new customers monthly, feed into CRM, (9) Monitoring: compare predicted vs. actual CLV as actuals materialize.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "432",
   "q": "\"How would you detect and handle seasonality in a dataset?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"(1) Visualization: plot time series, look for repeating patterns, (2) autocorrelation plot: strong spikes at seasonal lags (lag 12 for monthly data with yearly seasonality), (3) decomposition: `seasonal_decompose()` — separates trend, seasonal, residual components, (4) Fourier transform: identify dominant frequencies, (5) tests: Kruskal-Wallis test by month/day-of-week, (6) handling: (a) seasonal differencing: subtract value from same period last year, (b) Fourier features: sin/cos terms at seasonal frequency, (c) SARIMA: explicit seasonal AR/MA terms, (d) include seasonal indicators as features in ML models, (7) multiple seasonalities: Prophet handles daily + weekly + yearly.\""
    },
    {
     "t": "p",
     "text": "**Theme: Data Privacy & Compliance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "433",
   "q": "You need to share data with an external partner for a joint model development project. How do you do this securely?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data minimization: only share features strictly needed for the project, (2) anonymization: remove direct identifiers, aggregate or generalize quasi-identifiers, (3) k-anonymity: ensure each record is indistinguishable from k-1 others, (4) differential privacy: add calibrated noise to protect individuals, (5) legal: data sharing agreement (DSA) defining use, retention, deletion, (6) secure transfer: encrypted file transfer, not email, (7) alternative: federated learning — each party trains locally, share only model updates, (8) synthetic data: generate realistic synthetic data that preserves statistical properties, (9) monitoring: restrict partner's data access, audit usage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "434",
   "q": "Your model uses location data. What privacy considerations exist beyond GDPR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Location reveals sensitive info: home address, workplace, religious places, healthcare facilities, (2) re-identification: even without names, location trajectories are unique fingerprints, (3) CCPA: location data is personal information, (4) consent: granular consent for location use (not buried in ToS), (5) aggregation: use area-level features instead of exact coordinates, (6) temporal: don't store precise history, use time-windowed aggregates, (7) geofencing: restrict what areas trigger data collection, (8) children: stricter rules under COPPA if users might be minors, (9) retention: delete raw location data after feature extraction."
    },
    {
     "t": "p",
     "text": "**Theme: Complex Modeling Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "435",
   "q": "Your regression target has a long right tail (most values 0-100, some up to 10,000). What modeling strategies help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Log transform: `log(y+1)` compresses tail, predict on log scale, inverse-transform, (2) quantile regression: predict different quantiles (50th, 90th, 99th), (3) two-stage model: classifier (normal vs. extreme) + separate regression for each, (4) Tweedie regression: naturally handles zero-inflated right-skewed distributions, (5) robust loss: Huber loss or MAE instead of MSE (less sensitive to extreme values), (6) winsorization: cap at 99th percentile if extreme values aren't the focus, (7) tree-based models: naturally handle skewed targets better than linear, (8) evaluation: use metrics robust to tail (MAE, MAPE) rather than RMSE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "436",
   "q": "Your model predicts well on average but consistently overestimates for small values and underestimates for large ones. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Regression to the mean: model predictions gravitate toward overall mean, (2) this is expected behavior for models trained with MSE loss on noisy data, (3) solutions: (a) calibration: post-processing to adjust predictions, (b) quantile regression: different quantile estimates for different ranges, (c) binned recalibration: separate calibration per value range, (d) target encoding: log-transform might help if multiplicative errors, (4) check: is the model underfit? (can it capture extreme values at all?), (5) ensemble: mix base model with a model trained specifically on extreme values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "437",
   "q": "You need to predict multiple correlated outputs simultaneously (temperature, humidity, wind speed). Single models per output, or multi-output model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multi-output advantages: (a) captures correlations between outputs, (b) more efficient (one model vs. three), (c) shared representation learning, (2) when to use multi-output: outputs are causally related, share common drivers, (3) approaches: (a) multi-output regression: sklearn supports natively, (b) neural network with multiple heads, (c) chained models: predict output1, use as feature for output2, (4) single models when: outputs are independent or have very different optimal model types, (5) evaluation: per-output metrics + joint consistency check (e.g., predicted humidity should be consistent with predicted temperature)."
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
   "n": "438",
   "q": "You have 500 features. How do you systematically reduce to the most important 50?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Filter: remove zero-variance, near-constant features (immediate), (2) correlation: remove highly correlated feature pairs (keep one), (3) mutual information: rank features by MI with target, keep top-N, (4) model-based: train random forest/XGBoost, rank by feature importance, (5) recursive elimination (RFE): iteratively remove least important features, (6) L1 regularization: Lasso drives unimportant features to zero, (7) SHAP: rank by mean absolute SHAP value, (8) final selection: intersection of top features from multiple methods, (9) validation: compare 50-feature model to 500-feature model on test set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "439",
   "q": "Your features include both very stable features (demographics) and rapidly changing features (real-time behavior). How do you handle this in feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature freshness tiers: static (update monthly), slow (update daily), fast (update in real-time), (2) infrastructure: static features in batch store, fast features in streaming feature store, (3) staleness: timestamp each feature, monitor freshness, (4) model impact: test — does real-time freshness actually improve over daily updates?, (5) cost-benefit: real-time features are expensive to maintain — only use if they significantly help, (6) fallback: if real-time feature unavailable, use last known value, (7) training: use point-in-time correct features at the time of each training example."
    },
    {
     "t": "p",
     "text": "**Theme: Final Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "440",
   "q": "Your model works for English-language content. The business expands to 10 new languages. What's your strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multilingual models: XLM-RoBERTa, mBERT handle 100+ languages, (2) translate: translate all content to English, use existing English model (simpler but loses nuance), (3) per-language models: highest quality but 10x maintenance, (4) few-shot cross-lingual: train on English, evaluate on other languages (zero-shot transfer), (5) data collection: gather labeled data in each new language (even 1000 examples helps), (6) evaluation: per-language metrics — performance varies significantly across languages, (7) deployment: single multilingual model vs. language-routing to specialized models, (8) priority: start with highest-revenue languages, expand iteratively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "441",
   "q": "Your prediction model is used to decide who gets a phone call from sales. Sales reps report the model \"doesn't feel right.\" How do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Calibration check: are high-scored leads actually converting? Plot predicted vs. actual, (2) sales rep bias: reps may prefer certain lead types (familiar industry, local area), (3) feature review: show sales reps what features drive predictions, (4) qualitative: sit with reps, understand their objections on specific cases, (5) missing context: model may lack info reps have (LinkedIn research, past relationship), (6) timing: model may predict interest but not readiness to buy, (7) action: add feedback loop — reps label leads as \"good\" or \"bad\" → improve model, (8) collaboration: involve sales in defining what a \"good lead\" means."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "442",
   "q": "You need to anonymize a dataset for public release while keeping it useful for research. What techniques do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Direct identifiers: remove names, emails, SSNs, (2) quasi-identifiers: generalize (exact age → age range, zip → first 3 digits), (3) k-anonymity: each combination of quasi-identifiers shared by k+ records, (4) l-diversity: sensitive attributes have l+ distinct values within each group, (5) t-closeness: distribution of sensitive attribute in group close to overall distribution, (6) differential privacy: add calibrated noise, (7) utility testing: verify key statistical properties are preserved after anonymization, (8) synthetic data: generate fully synthetic data that matches statistical properties, (9) risk assessment: attempt re-identification attacks on anonymized data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "443",
   "q": "You wrote a Jupyter notebook with 50 cells that produces great results. How do you convert this to production-quality code?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Refactor into functions: each logical step becomes a function, (2) separate concerns: data loading, preprocessing, modeling, evaluation, (3) configuration: hardcoded values → config file (parameters, paths, thresholds), (4) error handling: add try/except, input validation, (5) testing: unit tests for each function, integration tests for pipeline, (6) logging: replace print statements with proper logging, (7) type hints: add type annotations for clarity, (8) documentation: docstrings, README, (9) version control: split into modules, Git, (10) orchestration: Airflow/Dagster DAG, not linear script."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "444",
   "q": "Your model performance metrics look good on paper but users complain about bad predictions. What's the disconnect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Wrong metric: you optimize F1, users care about specific error types, (2) aggregate vs. individual: 90% accuracy means 10% bad experiences, (3) distribution mismatch: model tested on balanced data, production is skewed, (4) user expectations: users notice failures more than successes (negativity bias), (5) latency: technically correct but too slow feels \"wrong,\" (6) presentation: predictions without context or explanation feel arbitrary, (7) edge cases: model fails on cases users care most about, (8) action: collect specific failure examples from users, create targeted test set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "445",
   "q": "You're joining a new team and inheriting an undocumented ML pipeline. How do you get up to speed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Run it: execute the pipeline end-to-end, observe what happens, (2) trace data flow: where does data come from? Where do outputs go?, (3) read code: start from the main entry point, follow the execution path, (4) check Git history: recent changes reveal active development areas, (5) talk to people: who built it? What was the original purpose?, (6) monitoring: what dashboards/alerts exist? What has failed recently?, (7) document as you learn: create the missing documentation, (8) quick wins: fix obvious issues, add missing tests, improve logging, (9) don't rewrite: understand fully before proposing changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "446",
   "q": "Your model uses a third-party API feature (e.g., sentiment from an API). The API changes its model and your predictions shift. How do you protect against this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Version pinning: use specific API model version if available, (2) monitoring: track API output distribution — alert on shifts, (3) caching: store API responses, don't re-query for existing predictions, (4) fallback: local model as backup for when API output shifts, (5) contract: SLA with API provider for notification of model changes, (6) testing: regression tests that check API outputs on fixed inputs, (7) decoupling: batch API calls, don't call in real-time prediction path, (8) long-term: build internal version of the API feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "447",
   "q": "Your team debates: should you use notebooks (Jupyter) or scripts (Python files) for development?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Notebooks for: (1) EDA and exploration, (2) prototyping and visualization, (3) stakeholder presentations with inline results. Scripts for: (4) production code, (5) version control (cleaner diffs), (6) testing and CI/CD, (7) reusable modules and packages. Best practice: (8) prototype in notebooks → refactor to scripts for production, (9) use nbconvert to export notebooks to scripts, (10) Jupyter in VS Code: get best of both worlds, (11) review: notebooks in PRs are hard — use jupytext for notebook-as-Python-file."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "448",
   "q": "Your ML model needs to run on a mobile device with limited compute (smartphone app). What constraints and optimizations apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model size: < 50MB ideally (storage constraint), (2) inference time: < 100ms for good UX, (3) quantization: FP32 → INT8 or FP16 (4x smaller, 2-4x faster), (4) pruning: remove unnecessary weights, (5) architecture: MobileNet, SqueezeNet, EfficientNet-Lite designed for mobile, (6) frameworks: TensorFlow Lite, ONNX Runtime Mobile, CoreML (iOS), (7) on-device vs. API: trade-off between latency (local) and model power (server), (8) battery: continuous inference drains battery — batch or trigger-based, (9) testing: test on low-end devices, not just flagship phones."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "449",
   "q": "Your product manager asks for a \"confidence score\" with each prediction. How do you implement this meaningfully?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Calibrated probabilities: Platt scaling or isotonic regression on model probabilities, (2) calibration check: reliability diagram — predicted probability should match actual rate, (3) conformal prediction: prediction sets with guaranteed coverage, (4) ensemble disagreement: percentage of models that agree, (5) distance-based: how similar is this input to training data?, (6) communication: translate technical uncertainty to user-friendly terms (\"High/Medium/Low confidence\"), (7) don't: use raw model probabilities without calibration — most models are overconfident, (8) UX: show confidence to inform user action — \"high confidence → auto-act, low confidence → human review.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "450",
   "q": "Summarize the top 10 things every data scientist should do on every project.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Understand the business problem before touching data, (2) define success metrics that align with business goals, (3) perform thorough EDA — data issues found early save weeks later, (4) establish a baseline model first (simple), (5) use proper train/validation/test splits (temporal for time-based problems), (6) check for data leakage at every stage, (7) evaluate with multiple metrics, including business-relevant ones, (8) communicate results in stakeholder language, not technical jargon, (9) plan for production from day one (monitoring, retraining, fallbacks), (10) document everything — future you will thank present you."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
