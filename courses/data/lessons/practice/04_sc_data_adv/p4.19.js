/* ============================================================================
   PRACTICE P4.19 — Predict the Output / Scenarios · 19
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.19",
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
   "text": "Predict the Output / Scenarios · 19",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "451",
   "q": "Design an end-to-end system for detecting fake product reviews on an e-commerce platform.",
   "body": [
    {
     "t": "p",
     "text": "**Theme: ML System Design — End-to-End**"
    },
    {
     "t": "p",
     "text": "**Answer:** **(1) Data collection**: reviews with metadata (text, rating, timestamp, reviewer profile, purchase history), **(2) Label acquisition**: human-annotated sample + known fake campaigns, **(3) Feature engineering**: (a) Text: sentiment inconsistency (5-star text sounds negative), duplicate/near-duplicate text, (b) Behavioral: burst of reviews in short time, reviewer reviews many unrelated products, all 5-star or all 1-star, (c) Network: coordinated review clusters (same reviewer group targets same products), (d) Profile: new account, no purchase history, (4) Model: ensemble of text model (fine-tuned BERT) + behavioral model (XGBoost) + graph model (reviewer-product graph anomalies), **(5) Decision**: score → high risk auto-remove, medium → human review queue, **(6) Feedback loop**: reviewer appeals, human review decisions flow back, **(7) Adversarial**: fake reviewers adapt → regularly retrain, monitor for new patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "452",
   "q": "Design a real-time pricing optimization system for a ride-sharing service (dynamic pricing / surge pricing).",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **(1) Inputs**: current demand (ride requests per zone per minute), current supply (available drivers per zone), weather, events, time-of-day, **(2) Demand forecasting**: predict demand 15-30 min ahead per zone using LSTM or gradient boosting, **(3) Supply estimation**: driver availability prediction, ETA calculations, **(4) Pricing model**: price multiplier = f(demand/supply ratio, elasticity estimates), **(5) Elasticity learning**: how much does demand drop when price increases? Learn from historical data, **(6) Constraints**: max multiplier cap (e.g., 3x), minimum driver earnings guarantee, **(7) Optimization**: maximize total completed rides (or revenue) subject to constraints, **(8) Fairness**: cap pricing during emergencies, equity across neighborhoods, **(9) A/B testing**: test pricing strategies on randomized zones, **(10) Latency**: < 200ms for pricing decision."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Data Engineering Patterns**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "453",
   "q": "You need a feature store that supports both batch (training) and real-time (serving) access. How do you architect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **(1) Offline store**: data warehouse (BigQuery/Snowflake/Delta Lake) — historical feature values for training, **(2) Online store**: low-latency key-value store (Redis/DynamoDB) — latest feature values for serving, **(3) Dual write**: batch pipeline writes to offline store, streaming pipeline updates online store, **(4) Point-in-time joins**: offline store supports temporal queries to prevent leakage, **(5) Feature registry**: catalog of all features with metadata (owner, description, freshness SLA), **(6) SDK**: `fs.get_features(entity_ids, feature_list)` works for both batch and online, **(7) Materialization**: scheduled jobs to sync offline → online, **(8) Tools**: Feast (open source), Tecton (managed), Databricks Feature Store."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "454",
   "q": "Your data pipeline processes 100TB daily. How do you manage costs while maintaining freshness?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Tiered processing: (a) critical data: real-time streaming, (b) important: hourly batches, (c) historical: daily batches, **(2) Partitioning**: only process new/changed partitions (incremental), **(3) Columnar format**: Parquet/ORC — process only needed columns, **(4) Compression**: Snappy for balanced speed/size, Zstd for max compression, **(5) Compute optimization**: spot instances (70% cheaper) for non-critical jobs, **(6) Data lifecycle**: hot (SSD, 30 days) → warm (HDD, 1 year) → cold (archive, long-term), **(7) Query optimization**: materialized views for repeated queries, **(8) Cost monitoring**: per-pipeline cost attribution, alert on anomalies."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced NLP Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "455",
   "q": "You need to extract structured information from unstructured contracts (parties, dates, obligations, amounts). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) NER: fine-tune BERT/SpaCy for domain-specific entities (party names, dates, monetary amounts), (2) relation extraction: link entities (who pays whom, what amount, by when), (3) document structure: parse sections — headers, clauses, sub-clauses, (4) pre-processing: OCR for scanned contracts, PDF parsing for digital, (5) few-shot with LLM: GPT-4 with structured prompting for complex extraction, (6) template matching: common contract types follow standard structures, (7) validation: extracted fields checked against business rules, (8) human-in-the-loop: uncertain extractions flagged for legal review, (9) evaluation: field-level precision/recall, full-contract accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "456",
   "q": "You're building a topic modeling system for customer support tickets. LDA gives incoherent topics. What alternatives work better?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) BERTopic: cluster BERT embeddings + extract topic words — much more coherent, (2) Top2Vec: learns topic and word embeddings jointly, (3) pre-processing: clean tickets better — remove greetings, signatures, auto-replies, (4) hyperparameter tuning: LDA — try different number of topics, alpha/beta priors, (5) representation: TF-IDF with n-grams (bigrams capture \"credit card\" as unit), (6) supervised: if you have categories, use them as initial guidance, (7) evaluation: topic coherence score (C_v), human evaluation of top words per topic, (8) practical: visualize with pyLDAvis, share with domain experts for validation."
    },
    {
     "t": "p",
     "text": "**Theme: Production Debugging Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "457",
   "q": "Your batch prediction job completes but produces all NaN values for predictions. The model works fine locally. What happened?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Debugging steps: **(1)** Check input data: are features loading correctly in production? (schema mismatch?), **(2)** Compare one sample: pull same input locally vs. production — are features identical?, **(3)** Serialization: model pickle may not restore correctly across different library versions, **(4)** Numpy/Pandas version: behavior differences in NaN handling, **(5)** Feature order: if model expects features in specific order, column reordering produces garbage, **(6)** Null propagation: new nulls in production data → NaN features → NaN predictions, **(7)** Fix: add assertion checking predictions are valid before writing, (8) Root cause: usually one feature returns all NaN due to a failed upstream dependency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "458",
   "q": "Your ML service responds with 200 OK but the response body is wrong (predictions are stale from 3 hours ago). Users don't notice immediately. How do you detect and prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Freshness metadata: include `prediction_timestamp` and `model_version` in every response, (2) monitoring: alert if prediction timestamp lags current time by > N minutes, (3) cache poisoning: check — is a caching layer serving stale results?, (4) health check: endpoint that verifies model is loaded and current, (5) client validation: consumers verify freshness metadata, reject stale predictions, (6) root cause: likely a failed model reload while service stayed up with old model, (7) canary: include known test inputs — periodically verify expected output, (8) kill switch: automated service restart if staleness detected."
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
   "n": "459",
   "q": "You need to compare customer satisfaction scores before and after a product change. The data is ordinal (1-5 Likert scale), not continuous. What test do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't use t-test: ordinal data violates assumptions of continuous distribution, (2) Wilcoxon signed-rank test: non-parametric, works for paired ordinal data (same customers), (3) Mann-Whitney U: if different customers before/after, (4) ordinal logistic regression: model the probability of each rating level, (5) proportional assessment: compare % of 4-5 ratings before/after, (6) bootstrap: resample and compute difference in median/distribution, (7) practical: with large samples, mean comparisons are often still informative, but report medians and distributions, (8) visualization: stacked bar chart of rating distributions, not just means."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "460",
   "q": "You need to assess if two measurement instruments (old lab equipment vs. new) agree sufficiently to switch. What analysis do you run?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Bland-Altman plot: plot difference vs. mean for each pair of measurements, (2) limits of agreement: mean difference ± 1.96×SD — are these clinically acceptable?, (3) intraclass correlation coefficient (ICC): measures agreement (not just correlation), (4) don't use Pearson correlation: two instruments can be perfectly correlated but systematically biased, (5) regression: new = a + b×old — check if a≈0 and b≈1, (6) domain expert: define acceptable agreement limits before analysis, (7) sample: test across the full range of values (not just typical values), (8) report: bias (systematic difference) and precision (variability of differences) separately."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Strategy**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "461",
   "q": "Your company has 10 data scientists but no centralized data science strategy. How do you establish one?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Audit current state: what projects exist, their business impact, tech stack, (2) align with business strategy: what are the company's top 3-5 priorities? Where does DS add value?, (3) platform: standardize tools, compute, data access (reduce time on infrastructure), (4) prioritization framework: score projects by impact, feasibility, strategic alignment, (5) team structure: centralized (center of excellence) vs. embedded (in business units) vs. hybrid, (6) hiring: define competency gaps, hire strategically, (7) knowledge sharing: regular demo days, internal talks, code reviews, (8) metrics: track DS team impact on business KPIs, not just model metrics, (9) roadmap: quarterly planning with stakeholder input."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "462",
   "q": "You're evaluating whether to adopt MLOps tools or build internal tooling. How do you decide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Evaluate on: (1) team size: <5 DS → adopt open source tools, >20 → consider purpose-built, (2) use case coverage: do available tools handle your specific needs?, (3) vendor lock-in: how tightly coupled would you be?, (4) cost: total cost of ownership (license + implementation + maintenance + training), (5) integration: does it work with your existing stack?, (6) maturity: is the tool production-ready or still evolving?, (7) community: active community for support and plugins?, (8) decision matrix: weight factors by importance, score 3-5 tools, (9) POC: 2-week proof of concept before committing."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Classification**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "463",
   "q": "You build a multi-label classifier (items can belong to multiple categories). How do you evaluate it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hamming loss: fraction of incorrect labels (per-label accuracy), (2) subset accuracy: exact match of entire label set (very strict), (3) micro-F1: aggregate TP/FP/FN across all labels globally, (4) macro-F1: average F1 across labels (gives equal weight to rare labels), (5) per-label metrics: F1 for each label separately, (6) ranking: if outputs are ranked, use NDCG or mean average precision, (7) calibration: per-label probability calibration matters, (8) threshold: each label needs its own decision threshold (optimized separately)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "464",
   "q": "Your classifier has high precision but low recall. The business wants higher recall even at some precision cost. How do you adjust?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Threshold adjustment: lower the decision threshold — more positives predicted, (2) trade-off curve: plot precision-recall curve, find acceptable operating point, (3) cost-sensitive: increase the cost of false negatives in training, (4) class weights: increase weight of positive class, (5) sampling: oversample positives or undersample negatives, (6) ensemble: add a high-recall model to the ensemble, (7) quantify cost: what's the cost of 1 missed positive vs. 1 false alarm?, (8) communicate: \"increasing recall from 60% to 80% will triple false positive rate\" — is that acceptable?"
    },
    {
     "t": "p",
     "text": "**Theme: Domain: Financial Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "465",
   "q": "You're building a market regime detection model (bull/bear/sideways). What features and methods work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Features: rolling returns (20/60/200 day), volatility (realized, implied), yield curve slope, credit spreads, momentum indicators, volume, (2) Hidden Markov Model: learn latent states (regimes) from observable market data, (3) change-point detection: PELT algorithm for identifying regime boundaries, (4) clustering: k-means on rolling market statistics → each cluster is a regime, (5) neural: LSTM autoencoders learn regime-dependent patterns, (6) labeling: if supervised, define regimes by return and volatility thresholds, (7) application: adjust portfolio allocation, risk parameters based on detected regime, (8) real-time: sliding window regime detection for timely response."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "466",
   "q": "You need to backtest a trading strategy. What pitfalls should you avoid?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Lookahead bias: using information not available at decision time, (2) survivorship bias: only including stocks that survived (ignoring delisted ones), (3) overfitting to historical data: strategy works on backtest period but not forward, (4) transaction costs: include realistic slippage, commission, market impact, (5) data snooping: testing many strategies, reporting only the best (multiple comparisons), (6) regime change: past patterns may not repeat in different market conditions, (7) out-of-sample: hold out most recent period for final validation, (8) walk-forward: rolling window train/test to simulate realistic deployment, (9) paper trading: test with live data before real money."
    },
    {
     "t": "p",
     "text": "**Theme: Miscellaneous Advanced Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "467",
   "q": "You need to build a model to score leads for a B2B SaaS company. What makes B2B lead scoring different from B2C?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Account-level: score the company, not just the individual, (2) features: company size, industry, technology stack (technographic data), growth signals, (3) multiple contacts: aggregate engagement across all contacts at the company, (4) long sales cycles: outcome may take 6-12 months — label lag, (5) small data: fewer conversions than B2C, (6) firmographic enrichment: Clearbit, ZoomInfo for company data, (7) intent signals: content downloads, website visits, competitor research, (8) ICP matching: similarity to ideal customer profile, (9) sales feedback: reps should validate model — they have context."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "468",
   "q": "Your model is deployed globally but performs differently in different regions (great in US, poor in India). What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data analysis: how much training data per region? US likely over-represented, (2) feature investigation: which features behave differently by region?, (3) options: (a) single global model with region features — simple but may underfit, (b) region-specific models — best performance but maintenance overhead, (c) global model + regional fine-tuning — balanced approach, (4) transfer learning: pre-train on global data, fine-tune on regional data, (5) evaluation: mandatory per-region metrics (not just global), (6) data collection: invest in data quality for underperforming regions, (7) cultural factors: user behavior, data patterns may fundamentally differ."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "469",
   "q": "You discover that removing one feature improves test performance by 2% while keeping it improves training performance. Why, and what do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) The feature is causing overfitting — it correlates with target in training but not in production data, (2) possible reasons: (a) data leakage: feature contains information it shouldn't, (b) noisy feature: adds more noise than signal, (c) spurious correlation: coincidental pattern in training data, (3) investigation: check if the feature is available at prediction time and not derived from the target, (4) action: remove it — test performance is what matters, (5) deeper check: if the feature SHOULD be predictive (domain knowledge), it might be a data quality issue."
    },
    {
     "t": "p",
     "text": "**Theme: Time Series Advanced**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "470",
   "q": "You need to forecast intermittent demand (a product sells 0 units most days, occasionally sells 1-3). Standard forecasting fails. What models work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Croston's method: separately model demand probability and demand size, (2) SBA (Syntetos-Boylan Approximation): improved Croston's with bias correction, (3) zero-inflated Poisson/negative binomial: model excess zeros explicitly, (4) temporal aggregation: weekly/monthly forecasts instead of daily, (5) classification + regression: stage 1 predicts if demand occurs, stage 2 predicts quantity when it does, (6) evaluation: use scaled metrics (MASE) — MAPE is undefined when actual=0, (7) hierarchical: forecast at category level, disaggregate down, (8) application: spare parts, luxury goods, seasonal items."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "471",
   "q": "Your time series has multiple seasonalities (daily, weekly, monthly, yearly) plus holiday effects. What models handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Prophet: designed for multiple seasonalities + holidays, (2) Fourier features: add sin/cos terms at each frequency to regression/ML model, (3) TBATS: exponential smoothing with multiple seasonal components, (4) neural: N-BEATS, N-HiTS handle complex seasonality, (5) feature engineering: encode each seasonality as features (hour, day_of_week, month, is_holiday), (6) decomposition: STL handles one seasonality — run recursively for multiple, (7) LightGBM: with lag features and seasonal indicators, often competitive, (8) practical: Prophet or LightGBM with features are good starting points, switch to neural for scale."
    },
    {
     "t": "p",
     "text": "**Theme: ML Ethics Deep Dives**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "472",
   "q": "Your hiring algorithm is trained on historical hiring data. This data reflects past biases (e.g., company historically hired fewer women in tech roles). How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Problem: model learns and amplifies historical hiring bias, (2) pre-processing: remove gender-correlated features (name, university type), (3) in-processing: adversarial debiasing — train to predict hiring but NOT predict gender, (4) post-processing: equalize selection rates across groups, (5) alternative: redefine target — predict job PERFORMANCE, not historical hiring DECISION, (6) audit: test model on synthetic candidates identical except for protected attributes, (7) human-in-the-loop: model suggests candidates, humans make final decisions, (8) legal: disparate impact testing is legally required, (9) radical option: don't use ML for initial screening — there's enough bias risk."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "473",
   "q": "Your recommendation system creates filter bubbles (users only see content similar to what they've seen before). How do you break out of this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Exploration: reserve 10-20% of recommendations for diverse/unexpected content, (2) diversity reranking: MMR (Maximal Marginal Relevance) — balance relevance and diversity, (3) serendipity: recommend items similar to OTHER users' interests (expand horizons), (4) topic coverage: ensure recommendations span different categories, (5) temporal: boost trending/global content regardless of user preferences, (6) user control: let users adjust diversity slider, (7) evaluation: measure coverage (how many items get recommended?) and novelty alongside engagement, (8) ethical: especially important for news — filter bubbles harm democratic discourse."
    },
    {
     "t": "p",
     "text": "**Theme: Complex Feature Engineering**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "474",
   "q": "You have transaction data and need to create features that capture user behavior changes over time. What patterns do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Trend features\nuser_features = df.groupby('user_id').agg(\n    # Velocity: recent vs. historical\n    spend_last_7d=('amount', lambda x: x.tail(7).sum()),\n    spend_last_30d=('amount', lambda x: x.tail(30).sum()),\n    # Trend ratios\n    velocity_ratio=('amount', lambda x: x.tail(7).mean() / (x.tail(30).mean() + 1e-8)),\n    # Acceleration: is the trend accelerating?\n    spend_change_rate=('amount', lambda x: (x.tail(7).mean() - x.tail(14).head(7).mean()) /\n                       (x.tail(14).head(7).mean() + 1e-8)),\n    # Regularity: is user becoming more/less regular?\n    purchase_gap_std=('timestamp', lambda x: x.diff().std()),\n    # Category drift: is user exploring new categories?\n    unique_categories_recent=('category', lambda x: x.tail(10).nunique()),\n    unique_categories_historical=('category', lambda x: x.nunique()),\n).reset_index()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "475",
   "q": "You have text + tabular data for the same entity. How do you create a unified feature representation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Early fusion: extract text features (embeddings) → concatenate with tabular features → single model, (2) late fusion: separate models for text and tabular → combine predictions (average, stacking), (3) cross-attention: neural model that attends between text and tabular representations, (4) text features to tabular: extract specific quantities from text (sentiment score, keyword counts, readability metrics), (5) tabular context for text: include tabular features in text prompt (\"user with income $X searched for: [text]\"), (6) practical: early fusion with BERT embeddings + gradient boosting often works well, (7) training: may need different learning rates for text vs. tabular branches."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Problem Solving**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
