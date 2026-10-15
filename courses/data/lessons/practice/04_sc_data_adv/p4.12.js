/* ============================================================================
   PRACTICE P4.12 — Predict the Output / Scenarios · 12
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.12",
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
   "text": "Predict the Output / Scenarios · 12",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "276",
   "q": "The marketing team wants to know the optimal budget allocation across 5 channels. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Marketing Mix Modeling (MMM): regression of sales on channel spend + controls, (2) response curves: diminishing returns per channel (log or Hill function), (3) attribution: how much each channel contributes to conversions, (4) optimization: allocate budget to maximize total conversions subject to constraints, (5) constraints: minimum/maximum per channel, total budget, (6) incrementality testing: holdout tests per channel to validate causal impact, (7) Bayesian approach: uncertainty in response curves → uncertainty in optimal allocation, (8) dynamic: re-optimize monthly as conditions change."
    },
    {
     "t": "p",
     "text": "**Theme: ML for Specific Data Types**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "277",
   "q": "You need to model hierarchical data (employees → departments → divisions → company). What methods handle this structure?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Mixed-effects models: fixed effects for features + random effects for hierarchy, (2) hierarchical Bayesian models: shrinkage toward group mean (partial pooling), (3) feature engineering: aggregate features at each level (department avg salary, division size), (4) multilevel regression: allows coefficients to vary by group, (5) complete pooling (one model for all): ignores structure, (6) no pooling (model per group): overfits small groups, (7) partial pooling (mixed effects): best of both — groups with less data borrow from overall, (8) XGBoost with group IDs as categorical features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "278",
   "q": "Your data has network/graph structure (social connections, transaction networks). What features do you extract?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Node-level: (1) degree centrality, (2) betweenness centrality, (3) clustering coefficient, (4) PageRank. Neighborhood: (5) average neighbor feature values, (6) neighbor count by type, (7) second-degree connections. Graph-level: (8) connected component size, (9) community membership, (10) ego-network density. Advanced: (11) Node2Vec embeddings, (12) GNN-learned representations, (13) motif counts (triangles, etc.), (14) temporal: how network features change over time."
    },
    {
     "t": "p",
     "text": "**Theme: Production Troubleshooting**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "279",
   "q": "Your model deployment suddenly starts returning 500 errors. Walk through your debugging process.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check error logs: what's the exception? (OOM, dependency failure, input error), (2) check health endpoint: is the process running?, (3) recent changes: any deployment, config change, or data pipeline change?, (4) resources: CPU/memory/disk usage, (5) dependencies: is the database/feature store reachable?, (6) input validation: are incoming requests malformed?, (7) model loading: can the model file be read and deserialized?, (8) reproduce: send known-good request, does it work?, (9) scale: is it all requests or intermittent? (load-related?), (10) mitigation: rollback last change, restart service, scale up."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "280",
   "q": "Your model's prediction latency increased from 20ms to 200ms gradually over 3 months. No code changes. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data growth: feature computations touching larger tables, (2) feature store: index degradation, growing state store, (3) model: if online learning, model complexity may have grown, (4) infrastructure: shared resources being consumed by other services, (5) memory: memory leak causing GC overhead, (6) connection pooling: database connections not being released, (7) feature cardinality: categorical features with growing vocabulary, (8) profiling: instrument each pipeline stage to identify the bottleneck, (9) fix: optimize slow query, add indices, clean up memory, right-size resources."
    },
    {
     "t": "p",
     "text": "**Theme: Multi-Task & Multi-Target Learning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "281",
   "q": "You need to predict both whether a customer will buy AND how much they'll spend. How do you set up the model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Two-part model: first classify buy/no-buy, then regress amount for predicted buyers, (2) expected revenue = P(buy) × E[amount|buy], (3) multi-task neural network: shared layers → two heads (classification + regression), (4) joint loss: weighted combination of cross-entropy + MSE, (5) independent models: separate classifier and regressor (simpler, often competitive), (6) hurdle model (zero-inflated): probability of zero × positive amount distribution, (7) benefit of multi-task: shared representations improve both tasks, especially with limited data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "282",
   "q": "You have 10 related classification tasks (e.g., predicting different user behaviors). Should you build 10 separate models or one multi-task model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-task when: (1) tasks share underlying patterns, (2) some tasks have limited data (benefit from shared learning), (3) inference efficiency matters (one forward pass for all). Separate when: (4) tasks are unrelated, (5) different feature sets are optimal, (6) different update frequencies needed, (7) failure isolation matters. Architecture: (8) shared base layers + task-specific heads, (9) hard parameter sharing (same weights) vs. soft (regularize toward similar), (10) task weighting: balance losses to prevent dominant task from dominating learning."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science Communication**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "283",
   "q": "Write a one-page executive summary for a model that reduces customer churn by 25%.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Structure: **Title**: \"Customer Retention Model — 25% Churn Reduction\" **Key Result**: Model identifies at-risk customers 30 days before churn, enabling proactive retention. Pilot showed 25% churn reduction → $1.2M annual savings. **How It Works**: Analyzes 15 behavioral signals (purchase recency, support tickets, engagement) to score churn risk daily. **Business Impact**: (1) $1.2M saved/year, (2) 85% of actual churners caught by model, (3) marketing team contacts top 200 at-risk customers weekly. **Next Steps**: (1) Expand to all segments (Q2), (2) automate interventions (Q3), (3) expected full-year impact: $3M. **Risk**: Model needs quarterly refresh; monitoring in place."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "284",
   "q": "Your model's accuracy decreased by 2%. When should you inform stakeholders vs. handle it quietly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Inform when: (1) 2% translates to meaningful business impact, (2) trend is ongoing (not one-time fluctuation), (3) root cause is unknown, (4) within regulatory reporting requirements, (5) it affects decisions being made currently. Handle quietly when: (6) 2% is within normal fluctuation, (7) you've identified root cause and have a fix in progress, (8) business impact is negligible. Best practice: (9) have pre-defined thresholds for escalation, (10) include in regular model health report (transparent but not alarming)."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Data Types**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "285",
   "q": "Your data includes timestamps with millisecond precision. What features do you extract that you'd miss at daily granularity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Session identification: gap > 30 min = new session, (2) interaction velocity: clicks per second, actions per minute, (3) response time: time between event and user reaction, (4) dwell time: duration on each page/screen, (5) patterns: morning vs. evening vs. night usage (hour:minute matters), (6) bot detection: superhuman speed = likely bot, (7) sequence patterns: action A → B within 5 seconds vs. 5 minutes, (8) concurrent activities: multiple sessions simultaneously?."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "286",
   "q": "Your data has hierarchical categories (Product → Category → Subcategory → SKU). How do you encode this for modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple features: separate columns per level, (2) label encoding per level: preserves hierarchy, (3) target encoding per level: captures category-level target means, (4) entity embeddings: learn representations that preserve hierarchy, (5) create features at each level: category_avg_price, subcategory_return_rate, (6) tree-based models: can split at any level naturally, (7) path encoding: \"Electronics/Phones/Smartphones\" as a string → character n-grams, (8) hierarchical regularization: child categories regularize toward parent."
    },
    {
     "t": "p",
     "text": "**Theme: Meta-Topics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "287",
   "q": "What makes a good data science portfolio project?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) End-to-end: data collection → EDA → modeling → evaluation → deployment, (2) real data: not toy datasets (but can be public Kaggle data), (3) business framing: \"I solved X for Y audience,\" not \"I trained a model,\" (4) communication: clear README, visualizations, insights narrative, (5) code quality: clean, documented, reproducible, (6) unique angle: novel approach or interesting domain, (7) deployed: even a simple Streamlit app shows production thinking, (8) avoid: Titanic, Iris, Boston Housing without a twist."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "288",
   "q": "How do you evaluate whether a data science hire is right for your team?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Technical depth: can they explain WHY they chose techniques, not just what (foundational understanding), (2) problem framing: given a business problem, can they define the ML task?, (3) data intuition: can they spot data quality issues in a sample?, (4) communication: can they explain results to non-technical audience?, (5) coding: clean, efficient, reproducible code (not just notebooks), (6) curiosity: do they ask good questions about the problem?, (7) collaboration: how do they work with engineering, product?, (8) learning: evidence of staying current, learning new methods."
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
   "n": "289",
   "q": "Your company acquires another company. You need to merge their ML models with yours. What challenges do you face?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Different feature engineering: same concept, different computation, (2) different model frameworks: TensorFlow vs. PyTorch vs. scikit-learn, (3) different data definitions: what counts as \"active user\"?, (4) different infrastructure: AWS vs. GCP, different monitoring tools, (5) approach: (a) evaluate both models on combined data, (b) keep the better one, retrain on combined data, (c) ensemble if both have unique strengths, (6) data migration: standardize data pipelines, (7) team alignment: establish shared standards, tooling, vocabulary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "290",
   "q": "Your model uses customer age as a feature. Data analysis shows age is missing for 15% of users (didn't provide it). These users are systematically different (younger, privacy-conscious). What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) This is MNAR: missing because of the attribute itself (age-aware missing), (2) \"is_age_missing\" binary feature: captures the systematic difference, (3) don't impute with mean — that would assign average age to privacy-conscious young users, (4) estimate age from behavioral proxies: device type, browsing patterns, language style, (5) multiple imputation with auxiliary information, (6) model without age: if model still performs well, age may not be necessary, (7) respect user choice: using inferred age may violate privacy expectations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "291",
   "q": "Your A/B test platform uses cookies for user assignment. Mobile users frequently get new cookies. How does this affect your test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Cookie churn → users hop between treatment/control → diluted treatment effect, (2) intent-to-treat analysis: analyze based on first cookie assignment, (3) use user IDs instead of cookies for logged-in users, (4) device fingerprinting: more persistent than cookies (but privacy concerns), (5) server-side randomization: more stable than client-side, (6) measure: what % of users appear in both groups?, (7) quantify dilution: the observed effect is biased toward zero — actual effect is larger."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "292",
   "q": "Your model handles well-structured tabular data, but a new requirement adds unstructured data (images, PDFs). How do you integrate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Extract structured features from unstructured data: OCR for PDFs, CNN features for images, (2) add extracted features to tabular model (simplest), (3) late fusion: separate models for tabular and unstructured, combine predictions, (4) multi-modal model: shared neural network with different input branches, (5) embedding approach: generate embedding vectors from unstructured → concatenate with tabular, (6) start with feature extraction (approach 2), evolve to multimodal if needed, (7) evaluate: does unstructured data actually improve predictions?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "293",
   "q": "Your time series forecasting model is deployed but you realize the test set evaluation didn't account for the deployment scenario. In production, you forecast 7 days ahead, but you evaluated on 1-day-ahead. How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Re-evaluate with 7-day-ahead predictions — performance will be worse, (2) use multi-step forecasting evaluation: walk-forward with 7-day horizon, (3) different metrics per horizon: day 1, day 3, day 7 accuracy, (4) direct multi-output model: train separate models for each horizon (day 1, day 2, ..., day 7), (5) recursive forecasting: evaluate the accumulated error from chaining predictions, (6) set realistic expectations: communicate actual production accuracy to stakeholders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "294",
   "q": "Your model uses an API for geocoding addresses. The API has a rate limit of 100 requests/minute. Your pipeline needs to geocode 500K addresses. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Caching: store geocoded results, only geocode new addresses, (2) batch processing: respect rate limits with sleep/retry logic, (3) time estimate: 500K / 100 per min = ~83 hours for uncached, (4) local geocoding: use offline geocoder (Nominatim/OpenStreetMap) to avoid API limits, (5) fuzzy dedup: normalize addresses before geocoding to reduce unique lookups, (6) priority: geocode most-used addresses first, (7) incremental: geocode new addresses only, maintain mapping table."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "295",
   "q": "Your model's training data comes from user interactions, but users only interact with items they're shown (presentation bias). How does this affect your model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Selection bias: model only learns from served items, not all possible items, (2) popular items get shown more → model learns to recommend popular items (rich get richer), (3) inverse propensity scoring (IPS): weight each observation by 1/P(shown), (4) doubly robust estimation: combine IPS with direct estimation, (5) uniform random exploration: show random items to some users for unbiased data, (6) causal inference: separate the effect of being shown from being relevant, (7) off-policy evaluation: evaluate ranking policy using logged data from different policy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "296",
   "q": "Your model deployment uses a Kubernetes pod that occasionally gets OOM-killed. How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Profile memory usage: identify peak memory during inference, (2) increase pod memory limits: set resource requests/limits in YAML, (3) model optimization: quantize, prune to reduce memory footprint, (4) batch size control: limit concurrent predictions per pod, (5) memory-mapped model loading: load from mmap, only access needed weights, (6) garbage collection: force GC after large operations, (7) streaming inference: process large inputs in chunks, (8) horizontal scaling: more pods with manageable memory each."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "297",
   "q": "You need to create a reliable, reproducible ML experiment. What's your checklist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Random seeds: set for Python, NumPy, framework (torch.manual_seed), (2) data versioning: DVC or snapshot training data, (3) code versioning: Git commit hash linked to experiment, (4) environment: Docker or conda environment.yml, (5) hyperparameters: log all (MLflow, W&B), (6) hardware: record GPU model, CPU count, memory, (7) data splitting: deterministic splits (by hash, not random), (8) metrics: record all, not just primary, (9) artifacts: save model file, preprocessor, config, (10) documentation: what was tried and why."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "298",
   "q": "Your model needs to handle adversarial attacks (small input perturbations designed to fool the model). How do you make it robust?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Adversarial training: generate adversarial examples, include in training, (2) input validation: reject inputs with suspicious patterns, (3) randomized smoothing: add noise during inference, certify robustness, (4) defensive distillation: train model on soft labels from robust teacher, (5) input preprocessing: denoise, quantize inputs before model, (6) ensemble: harder to attack multiple diverse models simultaneously, (7) detection: separate model to detect adversarial inputs, (8) monitoring: track prediction confidence distributions for anomalies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "299",
   "q": "Your data science team wants to implement pair programming for ML work. How do you adapt the practice for data science?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) EDA pairing: one person drives exploration, other questions assumptions, (2) review sessions: walk through notebook analysis together, (3) modeling pairing: one implements, other validates methodology, (4) code review: mandatory for production code, feature engineering, (5) pair debugging: especially valuable for data pipeline issues, (6) senior-junior pairing: mentoring opportunity, (7) cross-functional pairing: data scientist + ML engineer for deployment, (8) time-limited: 1-2 hour sessions for focused work."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "300",
   "q": "You need to build a model for a seasonal business (ski resort). You only have 3 years of data. What challenges do you face?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Only 3 seasons of data: very few seasonal cycles for pattern learning, (2) each year may be different: snow conditions, economy, COVID, (3) limited validation: can only do 1 train-test temporal split with 2-1 split, (4) feature engineering: use similar businesses' data for external validation, (5) simpler models: fewer parameters to avoid overfitting 3 seasons, (6) external data: weather, economic indicators as features, (7) domain expert input: incorporate expert knowledge as priors or features, (8) transfer learning: use data from similar seasonal businesses."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
