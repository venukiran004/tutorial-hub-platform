/* ============================================================================
   PRACTICE P4.1 — Predict the Output / Scenarios · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.1",
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
   "text": "Predict the Output / Scenarios · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Your time series has multiple seasonal patterns (daily, weekly, yearly). How do you model all of them?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Time Series**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Prophet: explicitly supports multiple seasonalities — additive/multiplicative, (2) TBATS: automatic detection of multiple seasonal periods, (3) Fourier terms: add sin/cos terms for each frequency to regression, (4) STL decomposition: decompose one seasonality at a time iteratively, (5) MSTL: multi-seasonal STL decomposition, (6) deep learning: N-BEATS or transformer-based models capture multiple patterns, (7) feature engineering for ML: hour_of_day, day_of_week, month, quarter as cyclical features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Your demand forecast is accurate on average but fails badly during Black Friday and Christmas. How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Separate models: one for normal periods, one for peak events, (2) event features: binary \"is_black_friday\" + \"days_to_event\" + \"days_from_event\", (3) holiday uplift modeling: estimate multiplicative effect of each event, (4) use previous years' event data as reference (same-event last year), (5) exogenous variables: marketing spend, promotion details during events, (6) post-event analysis: decompose actual vs. forecast to calibrate future event effects, (7) ensemble: base forecast × event multiplier."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "You have 100 related time series (product sales across stores). Should you build 100 individual models or one global model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Individual models: capture unique patterns per series but limited by per-series data, (2) global model: shares patterns across series (LightGBM, neural nets), better with limited data, (3) hybrid: global model + per-series adjustments, (4) hierarchical forecasting: aggregate vs. disaggregate reconciliation (top-down, bottom-up, optimal reconciliation), (5) clustering: group similar series, one model per cluster, (6) modern approach: global model with series-specific features (category, store size, region) — best of both worlds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Your time series model's error increases significantly at longer forecast horizons. How do you manage this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) This is expected — uncertainty grows with horizon, (2) prediction intervals: show widening confidence bands, (3) recursive vs. direct multi-step forecasting: direct models (one per horizon) reduce error accumulation, (4) separate short-term and long-term models with different features, (5) communicate uncertainty: \"next week: 95% confident between 100-120; next month: 80-150\", (6) hierarchical aggregation: daily forecasts → aggregate for monthly accuracy, (7) ensemble: average across models for more stable long-horizon predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Your energy consumption forecast needs to handle a sudden regime change (new factory opened, pandemic lockdown). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Changepoint detection: PELT, BOCPD (Bayesian Online Changepoint Detection), (2) once detected: retrain model using only post-change data, (3) structural break indicators as features, (4) adaptive learning: use recent data more heavily (exponential weighting), (5) Prophet has automatic changepoint detection, (6) real-time approach: monitor forecast error — spike signals regime change → trigger retrain, (7) external variables: if you know the cause (factory output), add it as a feature."
    },
    {
     "t": "p",
     "text": "**Theme: Recommendation Systems (Advanced)**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Your collaborative filtering model has a cold start problem — new users have no interaction history. How do you recommend items to them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Content-based: recommend based on user profile (demographics, stated preferences), (2) onboarding quiz: ask preferences during signup, (3) popularity-based: recommend trending/popular items, (4) bandits: explore-exploit with Thompson Sampling — learn preferences quickly, (5) transfer: use behavior from similar platforms (same company), (6) hybrid: weighted combination of content-based and collaborative, shifting weight as interactions accumulate, (7) session-based: use in-session clicks to adapt recommendations immediately."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Your recommendation model optimizes for clicks but business cares about revenue. How do you realign?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multi-objective optimization: combine click prediction and purchase prediction, (2) value-weighted ranking: score = P(click) × P(purchase|click) × item_value, (3) business rules overlay: boost high-margin items in recommendations, (4) A/B test different objective functions: measure downstream revenue, (5) calibration: ensure click probabilities are well-calibrated for value computation, (6) long-term value: optimize for customer lifetime value, not just immediate revenue, (7) diversity: avoid recommending only expensive items — user experience matters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Users complain that recommendations are repetitive (same type of items). How do you add diversity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Maximal Marginal Relevance (MMR): balance relevance with diversity, (2) category-based diversity: limit recommendations per category, (3) submodular optimization: select diverse relevant subset, (4) exploration-exploitation: include some exploratory recommendations, (5) user-defined diversity: let users set preference diversity level, (6) temporal diversity: avoid recommending similar items in consecutive sessions, (7) intra-list diversity metric: average pairwise distance between recommended items, (8) serendipity: occasionally include unexpected but potentially interesting items."
    },
    {
     "t": "p",
     "text": "**Theme: Data Engineering for Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Your data pipeline loads data from 10 sources daily. Occasionally one source fails but no one notices for days. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data quality checks at each pipeline stage: row counts, null rates, schema validation, (2) freshness monitoring: alert if source data hasn't updated within expected window, (3) Great Expectations or dbt tests for automated data validation, (4) alerting: PagerDuty/Slack notifications on pipeline failures, (5) dashboard: data health overview per source, (6) circuit breaker: halt downstream processing if source fails, (7) SLA tracking per data source, (8) graceful degradation: models can use stale features from cache if source is temporarily down."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Your feature pipeline has a 3-hour lag. The business wants near-real-time features. How do you reduce the lag?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Lambda architecture: batch layer (comprehensive) + speed layer (real-time), (2) move critical features to streaming pipeline (Kafka → feature computation → feature store), (3) Kappa architecture: single streaming pipeline for everything, (4) pre-compute what you can: daily/hourly aggregates in batch, only delta in real-time, (5) feature store with online serving: Feast, Tecton, (6) materialized views updated via CDC (Change Data Capture), (7) prioritize: which features actually need to be real-time? Many don't."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Your data warehouse has inconsistent naming conventions (some tables use snake_case, some camelCase, some have prefixes). How do you standardize for analytics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Create an analytics/mart layer with standardized views/tables, (2) dbt models as the standardization layer: raw → staging (renamed, typed) → marts (business logic), (3) naming convention document: snake_case, prefixes by domain (fact_, dim_), (4) automated linting in CI/CD: reject non-conforming models, (5) data catalog: document canonical names and sources, (6) don't try to rename source tables — build clean layers on top."
    },
    {
     "t": "p",
     "text": "**Theme: Dimensionality Reduction**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "You have 500 features and need to reduce them. When do you use PCA vs. feature selection vs. autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** PCA: (1) linear dimensionality reduction, (2) preserves maximum variance, (3) unsupervised, (4) good for decorrelating features, (5) components are not interpretable. Feature selection: (1) keeps original features (interpretable), (2) L1 regularization, mutual information, RFE, (3) better when some features are clearly irrelevant. Autoencoders: (1) non-linear dimensionality reduction, (2) can capture complex patterns, (3) more powerful but less interpretable, (4) need more data and compute. Rule of thumb: try feature selection first (interpretable), then PCA (quick), then autoencoders (complex data)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Your PCA analysis shows that 95% of variance is explained by 50 components (from 500 features), but the model with all 500 features performs better than with 50 components. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) PCA preserves variance, but low-variance features might be highly predictive, (2) the 5% \"unexplained\" variance might contain the signal, (3) PCA is unsupervised — it doesn't consider the target variable, (4) tree-based models handle high dimensionality well and might benefit from original features, (5) supervised dimensionality reduction (PLS, supervised PCA) might work better, (6) try 80-100 components — there might be a sweet spot, (7) feature selection (guided by target) may outperform PCA."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "You need to visualize 1000 data points in 50 dimensions. What visualization technique do you use and why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) t-SNE: great for visualization, preserves local structure, reveals clusters, but slow for very large datasets, (2) UMAP: faster than t-SNE, preserves both local and global structure better, (3) PCA (first 2-3 components): fast, deterministic, but may miss non-linear structure, (4) recommendation: start with UMAP for exploration, PCA for quick overview, (5) for 1000 points: any method is fast enough, (6) color points by class/cluster to reveal patterns, (7) don't use for distance interpretation in t-SNE — only neighborhood relationships are meaningful."
    },
    {
     "t": "p",
     "text": "**Theme: Sampling & Experimental Design**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Your survey has a 5% response rate and you're worried about non-response bias. How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Compare respondents vs. non-respondents on available variables (demographics, purchase history), (2) weighting: adjust by inverse propensity of responding (weight under-represented groups up), (3) post-stratification weighting: match sample distributions to known population, (4) Heckman selection model for modeling selection bias, (5) sensitivity analysis: how different would results be if non-respondents had different opinions?, (6) improve response rate: incentives, shorter survey, multiple channels, (7) non-response follow-up: contact a sample of non-respondents with a shorter version."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "You're designing a multi-armed bandit experiment for website optimization (5 landing pages). What algorithm do you choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Thompson Sampling: Bayesian, naturally balances exploration/exploitation — recommended default, (2) UCB (Upper Confidence Bound): deterministic, good theoretical guarantees, (3) ε-greedy: simple but inefficient exploration, (4) considerations: (a) Thompson Sampling converges faster for binary outcomes (click/no-click), (b) UCB better with Gaussian rewards, (c) contextual bandits if user features available (LinUCB), (5) practical: most A/B testing platforms support bandits natively, (6) advantage over A/B: allocates more traffic to better variants during testing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Your sample might not be representative of the population. How do you correct for this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Know your population: census data, customer database profiles, (2) stratified sampling: ensure each subgroup proportionally represented, (3) post-stratification weights: demographics should match population, (4) raking/iterative proportional fitting: adjust for multiple marginal distributions simultaneously, (5) propensity score weighting: model probability of being in sample, (6) trimming extreme weights: cap weights to avoid high variance, (7) effective sample size: sum(weights)² / sum(weights²) — shows actual information content."
    },
    {
     "t": "p",
     "text": "**Theme: Cost-Sensitive Learning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Your fraud detection model: a missed fraud costs $10,000 but a false alarm costs $50 in investigation. How do you incorporate this asymmetry?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cost-sensitive classification: pass cost matrix to model, (2) threshold adjustment: lower threshold from 0.5 to 0.005 (reflecting 200:1 cost ratio), (3) sample weights: weight fraud samples 200x more, (4) expected cost minimization: for each prediction, choose class with lowest expected cost, (5) custom metric: total cost = FN × $10,000 + FP × $50, (6) in XGBoost: `scale_pos_weight = cost_FN / cost_FP`, (7) evaluate with cost curve, not just ROC, (8) optimal threshold: where marginal cost of FP = marginal benefit of catching fraud."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Your model predicts whether to send a marketing offer. The offer costs $5, and if accepted generates $100 profit. Not everyone who would accept needs the offer (they'd buy anyway). How do you model this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is uplift modeling / causal ML: (1) train to predict the incremental effect of the offer, not just purchase probability, (2) T-learner: model P(purchase|treated) - P(purchase|control), (3) S-learner: single model with treatment indicator, (4) classes of customers: (a) sure things: buy regardless — don't offer, (b) persuadables: buy only with offer — target these, (c) lost causes: won't buy regardless — don't offer, (d) sleeping dogs: offer causes negative reaction — don't offer, (5) use randomized control group data for training, (6) optimize: offer to those where uplift × $100 > $5."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Your model needs to decide between approving a loan immediately (risky) vs. sending for manual review (costly but safer). How do you model this three-way decision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Reject option / abstaining classifier: three outputs — approve, reject, review, (2) define cost structure: auto-approve bad loan = C1 (highest), auto-reject good loan = C2, manual review = C3, (3) threshold-based: approve if P(good) > t1, reject if P(good) < t2, review otherwise (t2 < t1), (4) optimize t1, t2 on validation set to minimize total cost, (5) capacity constraint: only send k% to manual review (analyst bandwidth), (6) risk-based: adjust thresholds based on loan amount."
    },
    {
     "t": "p",
     "text": "**Theme: Model Monitoring & Maintenance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Your production model's accuracy has been slowly decreasing over 6 months. How do you diagnose gradual drift?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature drift monitoring: PSI (Population Stability Index) by feature over time, (2) KS test on feature distributions: monthly comparisons, (3) concept drift: has the P(Y|X) relationship changed?, (4) performance by cohort: when did the decline start?, (5) segment analysis: which customer segment has degraded most?, (6) business context: market changes, new competitors, policy changes, (7) decay curve analysis: is degradation linear or accelerating?, (8) solution: scheduled retraining (monthly/quarterly), or trigger-based retraining when PSI exceeds threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you set up automated model retraining that's safe (won't deploy a bad model)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Champion/challenger: new model must beat current model on validation set, (2) automated training pipeline: triggered by schedule or drift detection, (3) quality gates: (a) accuracy ≥ threshold, (b) no feature has null rate > X%, (c) prediction distribution within expected range, (d) latency within SLA, (4) canary deployment: route 5% traffic to new model, monitor, (5) automatic rollback if metrics degrade, (6) human approval for significant model changes, (7) shadow mode evaluation before live deployment, (8) version everything: data, model, config."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Your model serves predictions via REST API. How do you monitor it in production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Monitor at multiple levels: (1) Infrastructure: latency (p50, p95, p99), throughput, error rate, (2) Model: prediction distribution, feature distribution, drift scores, (3) Business: downstream KPIs (conversion rate, revenue), (4) data quality: null rates, out-of-range values, (5) tools: Prometheus + Grafana for metrics, Evidently for drift, (6) alerting: PagerDuty for infrastructure, Slack for model quality, (7) logging: structured logs for every prediction (features, scores, latency), (8) dashboards: operational (SRE) + model quality (ML team) + business (stakeholders)."
    },
    {
     "t": "p",
     "text": "**Theme: Data Storytelling**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "You've analyzed customer churn and found 5 insights. How do you structure a presentation for the executive team?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Structure: (1) **Hook**: \"We're losing $2M/quarter to preventable churn,\" (2) **Context**: current churn rate, trend, benchmark vs. industry, (3) **Key finding**: \"Customers who don't engage within first 14 days are 5x more likely to churn,\" (4) **Supporting evidence**: 2-3 visualizations (survival curve, segment comparison), (5) **Root cause**: why are customers disengaging?, (6) **Recommendation**: specific, actionable — \"implement a day-7 engagement campaign targeting inactive users,\" (7) **Expected impact**: \"reducing 14-day inactive rate by 20% saves $400K/quarter,\" (8) **Ask**: resources needed, timeline. Keep to 10 slides max."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Your analysis shows a counterintuitive finding (feature that should hurt actually helps). How do you present this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't suppress it — counterintuitive findings are often the most valuable, (2) validate thoroughly before presenting: check for confounders, Simpson's paradox, data errors, (3) present with humility: \"our data shows something surprising...\", (4) show the evidence: multiple views, statistical significance, (5) provide possible explanations: domain experts may understand why, (6) acknowledge limitations: \"this could be confounded by X,\" (7) propose validation: what additional data or experiment would confirm this?, (8) frame as an opportunity: counterintuitive = competitive advantage if correct."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
