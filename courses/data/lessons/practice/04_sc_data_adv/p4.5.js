/* ============================================================================
   PRACTICE P4.5 — Predict the Output / Scenarios · 5
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.5",
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
   "text": "Predict the Output / Scenarios · 5",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "You ran K-Means with k=5 but the business says the clusters don't make sense. How do you improve?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Advanced Clustering**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Feature engineering: are you clustering on the right features? Add/remove features based on what makes business sense, (2) feature scaling: ensure all features are normalized (K-Means is sensitive to scale), (3) try different algorithms: DBSCAN (density-based, no fixed k), Gaussian Mixture Models (soft assignments), hierarchical clustering, (4) try different k: use elbow plot, silhouette analysis, gap statistic, (5) dimensionality reduction: PCA/UMAP before clustering to remove noise, (6) profile clusters with stakeholders: map features to business meaning, (7) iterative: cluster → review with business → refine features → re-cluster."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "You need to cluster customers but some features are numerical (spend, frequency) and some are categorical (region, channel). How do you handle mixed data types?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) K-Prototypes: extends K-Means with Hamming distance for categoricals, (2) Gower distance: handles mixed types natively — use with hierarchical clustering, (3) encode categoricals: one-hot encoding → K-Means (but high cardinality is problematic), (4) entity embeddings: learn continuous representations for categoricals via neural network, then cluster, (5) separate clustering + fusion: cluster on numericals and categoricals separately, combine results, (6) latent class analysis: probabilistic model for mixed data, (7) practical: encode categoricals as target-encoded continuous values, then K-Means."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "Your clustering needs to handle outliers — K-Means assigns outliers to the nearest cluster, distorting centroids. What alternative do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) DBSCAN: explicitly labels outliers (points in low-density regions), (2) HDBSCAN: hierarchical DBSCAN, adapts to varying densities, handles outliers, (3) robust K-Means: use K-Medoids (PAM) — medians less sensitive to outliers, (4) trimmed K-Means: remove X% extreme points before clustering, (5) Gaussian Mixture Models: low-probability points can be flagged as outliers, (6) preprocessing: detect and remove outliers before clustering (IQR, Isolation Forest), (7) two-stage: outlier detection → cluster remaining data."
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
   "n": "104",
   "q": "You need to extract key phrases from 1 million product reviews for trend analysis. How do you do this efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) TF-IDF: extract high TF-IDF terms per time period, (2) RAKE (Rapid Automatic Keyword Extraction): unsupervised, fast, (3) KeyBERT: BERT embeddings + cosine similarity for contextual key phrases, (4) n-gram frequency analysis: bigrams/trigrams trending up over time, (5) for scale: batch process with Spark or Dask, (6) temporal analysis: compare key phrases month-over-month to find emerging trends, (7) topic modeling (BERTopic): topics evolve over time, (8) output: dashboard with trending phrases, sentiment per phrase, volume over time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "Your chatbot needs to detect user intent from free-text messages. You have 30 intents and 100 labeled examples per intent. How do you build this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Fine-tune a pre-trained model: DistilBERT or MiniLM on 3000 examples, (2) data augmentation: paraphrase each example 3-5x using back-translation or LLM, (3) few-shot approach: SetFit works well with limited labeled data, (4) fallback intent: \"I don't understand\" for low-confidence predictions, (5) confidence threshold: below 0.7 → ask for clarification, (6) confusion matrix: identify intents that are frequently confused → add more examples or merge, (7) active learning: log ambiguous messages, have humans label them, (8) slot extraction: after intent detection, extract entities (dates, names, amounts)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "Your text summarization model sometimes \"hallucinates\" facts not in the original document. How do you detect and prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Factual consistency checking: NLI (Natural Language Inference) model — does the summary entail from the source?, (2) entity verification: every entity in summary must appear in source, (3) extractive constraints: force summary to use source phrases, (4) faithfulness rewards during training (RLHF), (5) post-processing: flag sentences that can't be grounded in source, (6) human evaluation: faithfulness as a primary metric, (7) controllable generation: constrain decoding to source vocabulary, (8) hybrid: extractive (select sentences) + abstractive (paraphrase selected content)."
    },
    {
     "t": "p",
     "text": "**Theme: Model Fairness in Practice**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "Your hiring model has equalized odds across gender but a disparate impact ratio of 0.75 (below the 80% rule). How do you reconcile?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Different fairness metrics can conflict — can't satisfy all simultaneously, (2) disparate impact ratio < 0.8 may violate EEOC guidelines regardless of equalized odds, (3) approaches: (a) threshold adjustment per group to achieve 80% rule, (b) re-weighting training data, (c) adversarial debiasing with disparate impact constraint, (4) business-legal decision: which fairness definition takes priority?, (5) consult legal team: regulatory requirements often dictate, (6) document tradeoffs: improving one metric may worsen another, (7) consider process fairness: is the model being used appropriately regardless of metrics?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "Your loan approval model uses zip code as a feature. Someone points out zip code is a proxy for race. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Test proxy effect: does removing zip code change approval rates by race?, (2) indirect: zip code correlates with income, education, employment — some legitimate signal, (3) options: (a) remove zip code entirely (safe but may lose legitimate signal), (b) residualize: use only the portion of zip code uncorrelated with race, (c) fair representation: learn zip code embedding that's decorrelated from protected attributes, (4) test both: with and without zip code, compare fairness metrics, (5) domain: in regulated lending, proxy discrimination is legally prohibited, (6) document analysis and decision rationale."
    },
    {
     "t": "p",
     "text": "**Theme: Data Lake & Data Mesh**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "Your company has a data lake but data scientists complain data is hard to find, poorly documented, and unreliable. How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data quality layer: implement Great Expectations or dbt tests at ingestion, (2) metadata management: deploy data catalog (DataHub, Amundsen), (3) data contracts: define expected schema, freshness, quality between producers and consumers, (4) domain ownership: teams own their data products (data mesh principles), (5) SLAs: data freshness guarantees per dataset, (6) golden datasets: curated, validated datasets for common use cases, (7) lineage tracking: understand data flow from source to consumption, (8) incremental: start with top 10 most-used datasets, expand."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "Your team is debating: should data scientists query the data lake directly or use a curated data warehouse? What's the right approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Both — for different purposes: (1) Data warehouse (curated): for standard analytics, dashboards, production ML features — cleaned, documented, fast, (2) Data lake (raw): for exploration, research, new feature discovery — flexible but messy. Architecture: (3) raw zone → staging zone (data warehouse) → feature store → models, (4) data scientists explore in raw, validate hypotheses, then engineer features productionized in curated layer, (5) access control: read access to raw, write access only through governed processes, (6) Lakehouse architecture (Delta Lake, Iceberg): combines both with ACID transactions."
    },
    {
     "t": "p",
     "text": "**Theme: Scenario Analysis & What-If**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "Your CEO asks \"what would happen to revenue if we increased prices by 10%?\" How do you answer this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Price elasticity estimation: regression of demand on price (using historical price changes), (2) causal approach: use past A/B tests or natural experiments with price changes, (3) instrumental variables: use cost shocks as instruments for exogenous price variation, (4) segment analysis: elasticity varies by customer segment, product category, (5) competitor response: will competitors match or hold prices?, (6) simulation: model revenue = quantity(price) × price, optimize, (7) uncertainty: provide range \"revenue likely changes between -2% to +5%\", (8) caveats: historical elasticity may not hold for large price changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "Your supply chain team wants to know: \"If supplier X has a 2-week disruption, what's the financial impact?\" How do you model this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Identify products dependent on supplier X, (2) current inventory levels for those products, (3) demand forecast: expected sales during 2-week period, (4) substitution: can alternative suppliers fill the gap? At what cost?, (5) customer impact: lost sales, delayed orders, customer churn, (6) Monte Carlo simulation: vary demand, lead times, substitute availability, (7) scenario modeling: best case (minimal impact), expected case, worst case, (8) financial model: lost revenue + expediting costs + customer compensation, (9) prevention: what inventory buffer would mitigate this risk?"
    },
    {
     "t": "p",
     "text": "**Theme: Deep Learning Practical**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "Your deep learning model converges but to a poor local minimum. How do you escape?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Learning rate warmup + cosine annealing: explore then refine, (2) stochastic weight averaging (SWA): average weights from different training points, (3) random restarts: train multiple times with different initializations, (4) larger batch size + higher learning rate: smoother loss landscape, (5) shake-shake / shake-drop regularization, (6) cyclical learning rates: periodically increase LR to escape, (7) architecture changes: skip connections help with loss landscape, (8) label smoothing: softens the loss landscape, (9) knowledge distillation from a better model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "Your GAN training is unstable — mode collapse where the generator only produces one type of output. How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Wasserstein GAN (WGAN): more stable gradient, (2) spectral normalization: stabilize discriminator, (3) progressive training: start low-resolution, progressively add layers, (4) minibatch discrimination: penalize lack of diversity, (5) feature matching: match statistics of real and generated distributions, (6) Fréchet Inception Distance (FID) monitoring during training, (7) unrolled GAN: discriminator sees multiple generator steps ahead, (8) diversity loss: explicitly reward diverse outputs, (9) practical: train discriminator more steps per generator step."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "You need to train a model on a dataset that's too large to fit in GPU memory. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Mini-batch training: standard approach — load batches from disk, (2) gradient accumulation: simulate larger batch size with multiple forward/backward passes, (3) mixed precision: FP16 reduces memory 2x, (4) gradient checkpointing: trade compute for memory by recomputing activations, (5) model parallelism: split model across GPUs, (6) data parallelism: replicate model across GPUs, split data, (7) offloading: CPU offloading for optimizer states (DeepSpeed ZeRO), (8) efficient data loading: streaming datasets, memory-mapped files, (9) reduce model size: fewer layers/parameters if possible."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Statistics Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "Your A/B test shows a statistically significant negative result (the new feature hurts). The PM says \"let's test again.\" Should you?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Generally NO — re-running tests to get desired results is p-hacking, (2) unless: (a) implementation bug affected the test, (b) confounding factor identified (holiday, outage), (c) test had technical issues (SRM), (3) legitimate reasons to re-test: fundamentally changed the treatment based on learnings, (4) if re-testing: update sample size for smaller expected effect, pre-register the new test, (5) accept negative results: they're informative — save resources from bad ideas, (6) Bayesian approach: posterior probability the treatment is harmful — quantify the risk."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "Your dataset shows a strong correlation between ice cream sales and drowning deaths. How do you explain this to a non-technical stakeholder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Classic confounding: (1) correlation ≠ causation — a third variable (confound) causes both, (2) the confound is summer/heat: hot weather → more ice cream AND more swimming → more drownings, (3) controlling for temperature: correlation disappears, (4) teach the lesson: always ask \"what else could cause both?\", (5) directed acyclic graph (DAG): temperature → ice cream sales, temperature → swimming → drownings, (6) business implication: don't ban ice cream to prevent drowning — address the actual cause."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "Your power analysis says you need 10,000 users for your A/B test but your product only has 1,000 active users. What options do you have?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Run longer: accumulate 10,000 user-sessions over time (if user-level effects work), (2) increase expected effect size: make a bigger change (10% lift is easier to detect than 2%), (3) reduce variance: use CUPED/variance reduction techniques (pre-experiment covariates), (4) change metric: find a more sensitive metric with less variance, (5) Bayesian test: more efficient with small samples (but need informative priors), (6) sequential testing: stop early if effect is large enough, (7) composite metric: combine related metrics to increase sensitivity, (8) accept lower power: 60% power — know you might miss real effects."
    },
    {
     "t": "p",
     "text": "**Theme: Data Visualization Best Practices**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "Your dashboard has 30 charts. Stakeholders say they're overwhelmed. How do you redesign?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Start with \"what decisions do you make?\": each chart should support a decision, (2) hierarchy: 3-5 KPIs at top level, drill-down for details, (3) remove vanity metrics: charts that don't drive action, (4) group by theme: business performance, operations, customer, product, (5) progressive disclosure: summary → click for detail, (6) annotation: add context (\"this spike was due to Black Friday\"), (7) consistent design: same color scheme, axis conventions, (8) narrative: page-by-page tells a story — not just data dump, (9) rule of thumb: 5-8 charts per dashboard page maximum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "You need to visualize model performance for a non-technical audience. What do you show?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace technical metrics with business-interpretable views: (1) confusion matrix with business labels: \"correctly caught 850/1000 fraud cases, missed 150, falsely flagged 200 legitimate,\" (2) cost table: \"saved $8.5M, missed $1.5M, investigation cost $10K,\" (3) comparison: \"vs. manual review: catches 30% more fraud with 50% less investigation work,\" (4) example predictions: \"here are 5 correct catches and 5 misses — see the pattern?,\" (5) before/after KPIs: \"fraud loss rate decreased from 1.2% to 0.4%,\" (6) simple trend charts: performance over time, (7) avoid: ROC curves, precision-recall curves, loss curves."
    },
    {
     "t": "p",
     "text": "**Theme: Regression Diagnostics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "Your linear regression has non-random residual patterns (U-shaped). What does this indicate and how do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Indicates non-linear relationship between features and target, (2) residuals vs. fitted plot should be random/flat — U-shape means the linear assumption is violated. Fixes: (1) add polynomial features: x², x³, (2) log/sqrt transform the target or features, (3) add interaction terms, (4) use non-linear models: splines, GAMs, tree-based models, (5) piecewise linear regression, (6) check which features contribute to the pattern — partial residual plots."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "Your regression model's residuals show increasing variance (funnel shape). What's this called and how do you handle it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Heteroscedasticity: variance of errors depends on the prediction level. Impact: (1) coefficient estimates still unbiased but standard errors are wrong → invalid hypothesis tests. Detection: (2) Breusch-Pagan test, White test. Fixes: (3) log-transform the target (most common fix), (4) weighted least squares: weight observations inversely to their variance, (5) robust standard errors (Huber-White): correct SE without changing model, (6) Generalized Least Squares (GLS), (7) if using for prediction only (not inference): less critical — focus on prediction accuracy."
    },
    {
     "t": "p",
     "text": "**Theme: Recommendation System Design**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "Design a recommendation system for a news website. What unique challenges exist compared to e-commerce?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Challenges: (1) item lifespan: articles expire quickly (hours/days), (2) cold start is constant: new articles arrive every hour, (3) no repeat consumption: user reads an article once, (4) filter bubbles: must balance relevance with diversity/serendipity, (5) engagement vs. quality: clickbait gets clicks but hurts trust. Approach: (1) content-based for new articles: NLP features (topic, entities, sentiment), (2) collaborative + session-based for returning users, (3) editorial rules: ensure important news surfaces, (4) recency weighting: strongly prefer new content, (5) diversity injection, (6) metrics: beyond CTR — time-on-page, shares, return visits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "Your recommendation system has a popularity bias — always recommends popular items. How do you give niche items a chance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Inverse propensity weighting: down-weight popular items in training, (2) calibrated recommendations: match user's historical genre distribution, (3) explore-exploit: reserve 10-20% slots for exploration, (4) long-tail promotion: score = relevance × (1 + tail_bonus), (5) coverage metric: what fraction of catalog was recommended to any user?, (6) sub-linear popularity: use log(popularity) instead of raw counts, (7) causal debiasing: exposure-aware models that account for what was shown, (8) business argument: long-tail items often have higher margins."
    },
    {
     "t": "p",
     "text": "**Theme: Time-to-Event Analysis**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "You need to predict which customers will upgrade from free to paid, and when. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Survival analysis for conversion: (1) event = upgrade, censored = still on free plan, (2) features: engagement metrics, feature usage, company size, trial duration, (3) Cox PH model: identify factors accelerating conversion, (4) survival curve per user: \"40% probability of converting within 30 days,\" (5) segment: power users convert faster — target others with nudges, (6) competing risks: churn vs. convert — account for both, (7) actionable: predict \"conversion readiness score\" → trigger sales outreach at optimal time, (8) ROI: focus sales effort on users with highest conversion probability."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Process**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
