/* ============================================================================
   PRACTICE P4.2 — Predict the Output / Scenarios · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.2",
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
   "text": "Predict the Output / Scenarios · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "26",
   "q": "You need to present a complex model to non-technical executives. How do you explain it without dumbing it down?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Analogy: \"the model works like a doctor examining symptoms — it looks at 10 key patient signals and weighs them to assess risk,\" (2) Show input → output: \"when this happens, the model predicts that,\" (3) Feature importance: \"the top 3 factors driving predictions are...,\" (4) example walk-through: \"for customer John, the model flagged him because...,\" (5) performance in business terms: \"it correctly identifies 85% of churners, which means...,\" (6) comparison: \"vs. the current rule-based system, this catches 30% more,\" (7) avoid: math, algorithm names, technical metrics without business translation."
    },
    {
     "t": "p",
     "text": "**Theme: Geospatial Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "You need to optimize delivery routes for 200 daily orders in a city. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Vehicle Routing Problem (VRP) formulation, (2) Google OR-Tools for exact/heuristic solutions, (3) features: order locations (geocoded), time windows, vehicle capacity, traffic patterns, (4) clustering: group nearby orders into route clusters (K-means on geo coordinates), (5) within cluster: solve TSP (Traveling Salesman Problem), (6) real-time adjustments: re-optimize when new orders come in, (7) historical analysis: average delivery time by zone and time of day, (8) constraints: driver hours, vehicle capacity, customer time windows, (9) evaluate: total distance, time, fuel cost, customer satisfaction (on-time delivery rate)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "You're analyzing store performance and suspect location is a key factor. How do you incorporate geospatial features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Distance to nearest competitor, (2) population density within 1/3/5 km radius, (3) median household income in catchment area, (4) foot traffic data (mobile location data), (5) proximity to transit stations, highways, parking, (6) demographic composition of surrounding area, (7) land use: residential vs. commercial vs. mixed, (8) cannibalization: distance to own other stores, (9) spatial autocorrelation: Moran's I to check if nearby stores have similar performance, (10) geographically weighted regression: allow coefficients to vary by location."
    },
    {
     "t": "p",
     "text": "**Theme: Reinforcement Learning Basics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Your e-commerce site needs to decide the order of products on a page. Each user interaction provides feedback. How do you frame this as an RL problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) State: user profile, session context, current page, (2) action: ordering/ranking of products, (3) reward: click, add-to-cart, purchase (possibly with different weights), (4) start with contextual bandits (simpler than full RL): no state transitions needed for single-page ranking, (5) use REINFORCE or policy gradient for sequence optimization, (6) explore-exploit: show diverse orderings to learn, (7) off-policy evaluation: evaluate new policy using logged data from old policy, (8) practical: start with bandit approach, move to full RL if needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What are the risks of deploying a reinforcement learning model in production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Unsafe exploration: trying bad actions in production hurts users/business, (2) reward hacking: model finds loopholes (e.g., showing clickbait to maximize clicks), (3) instability: policy can oscillate or degrade suddenly, (4) difficult to debug: complex state-action-reward relationships, (5) data hungry: needs many interactions to learn, (6) delayed rewards: hard to attribute long-term outcomes to specific actions, (7) non-stationarity: user behavior changes. Mitigations: (a) constrained exploration (safe RL), (b) comprehensive reward design, (c) guardrails (business rules over RL), (d) A/B testing against baseline."
    },
    {
     "t": "p",
     "text": "**Theme: Simulation & Synthetic Data**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "You need to test your model on edge cases that rarely appear in real data. How do you generate synthetic test data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Rule-based: manually specify edge cases based on domain knowledge, (2) SMOTE/ADASYN: generate synthetic minority samples, (3) GANs: train on real data to generate realistic synthetic examples, (4) VAE: generate from latent space, control attributes, (5) copulas: preserve statistical relationships while generating new samples, (6) perturbation: take real examples, modify specific attributes to create edge cases, (7) adversarial examples: find inputs that fool the model, (8) domain-specific simulators: physics engines, financial models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Your company wants to use synthetic data to augment a small training set. How do you validate that synthetic data improves the model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Train model on: (a) real only, (b) synthetic only, (c) real + synthetic, (2) statistial fidelity: compare distributions of real vs. synthetic on all features, (3) utility test: does adding synthetic data improve test set performance?, (4) privacy: ensure synthetic data doesn't memorize real examples (nearest neighbor distance test), (5) downstream validity: evaluate on real holdout test set only, (6) overfitting risk: synthetic data from the same distribution doesn't add true new information, (7) best use: data augmentation where you know the transformation preserves labels (rotated images, etc.)."
    },
    {
     "t": "p",
     "text": "**Theme: Production Debugging Case Studies**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Your model scored 0.95 AUC in development but only 0.72 in production. What are the most likely causes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Check in order: (1) Data leakage in development: target information leaked to features, (2) feature pipeline mismatch: training features computed differently than serving features, (3) temporal leakage: training on future data, (4) population shift: production users differ from training population, (5) preprocessing differences: different normalization, encoding, (6) feature availability: some features unavailable at prediction time (computed after the fact), (7) sample selection: training data was a biased subset. Debug: (a) score training data through production pipeline, (b) compare feature distributions train vs. production, (c) check feature computation logic matches exactly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Your model's latency spiked from 50ms to 500ms after a deployment. No model changes were made. What do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Infrastructure: CPU/memory exhaustion, container resource limits, (2) data: is input data larger/more complex? (longer text, more features), (3) feature computation: is a database query slow? (missing index, table growth), (4) dependency: external API response time increased, (5) garbage collection: memory pressure causing GC pauses, (6) model file: is the correct model version loaded? (accidentally loading larger model), (7) cold start: first requests after deployment are slow (model loading), (8) connection pooling: exhausted database connections."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Users report the model gives different predictions for the same input at different times. What causes this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Non-determinism: dropout still active in inference mode (model.eval() not called), (2) feature computation using real-time data: \"current time\" changes features, (3) race condition: features cached at different times across replicas, (4) A/B test: user may hit different model versions (by design), (5) model update between requests: new model deployed mid-experiment, (6) floating point non-determinism across different hardware, (7) random seed not fixed in preprocessing (sampling, shuffling), (8) debug: log complete feature vectors and model version for every prediction."
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
   "n": "36",
   "q": "Your classification problem has 200 classes with severe class imbalance (1 class has 50% of data, some have < 10 samples). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hierarchical classification: group into 10 super-classes → sub-classes, (2) for rare classes: few-shot learning, prototypical networks, (3) focal loss: down-weight easy (majority) class examples, (4) oversampling rare classes + undersampling majority, (5) data augmentation for rare classes, (6) threshold moving: per-class optimal thresholds, (7) metric: macro F1 (weights all classes equally), (8) separate model for rare classes after detection, (9) combine rare classes into \"other\" if business allows, (10) active learning for rare class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Your multi-label classification model predicts too many labels per sample (high recall, low precision per sample). How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Increase decision threshold from 0.5 to higher value, (2) per-label threshold optimization on validation set, (3) use label-wise calibration: Platt scaling per label, (4) constrain max labels per prediction (top-k), (5) add negative mining: hard negative examples during training, (6) label smoothing to prevent overconfidence, (7) hierarchical: predict parent labels first, children only if parent is positive, (8) post-processing rules: mutually exclusive labels can't co-occur."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Your model correctly separates 2 classes but the decision boundary is in the wrong place (calibration issue). How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Platt scaling: fit sigmoid function on validation set logits, (2) isotonic regression: non-parametric calibration (more flexible), (3) temperature scaling: learn a single temperature parameter for softmax, (4) calibration curve (reliability diagram): plot predicted vs. actual probability, (5) ECE (Expected Calibration Error) metric to quantify miscalibration, (6) note: tree models and neural nets tend to be poorly calibrated; logistic regression is usually well-calibrated, (7) always calibrate on held-out data (not training data)."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Regression**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Your regression model predicts house prices but sometimes predicts negative values. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Log-transform the target: model log(price), then exp() predictions — guarantees positive, (2) constraint: clip predictions at minimum value, (3) Tobit regression: censored regression at zero, (4) use models with natural non-negative output: Poisson regression, (5) Gamma regression for positive continuous outcomes, (6) post-processing: abs() or max(prediction, min_reasonable_price), (7) investigation: negative predictions usually indicate extrapolation — check feature ranges vs. training data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Your prediction intervals are too wide (95% interval covers a huge range). How do you narrow them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Better features: more informative features reduce unexplained variance, (2) heteroscedastic models: different uncertainty for different inputs (predict mean AND variance), (3) quantile regression: directly predict 5th and 95th quantiles, (4) conformal prediction: guaranteed coverage with data-adaptive widths, (5) natural gradient boosting (NGBoost): probabilistic predictions per instance, (6) reduce epistemic uncertainty: more training data for input regions with wide intervals, (7) stratify: intervals should be wider for data-sparse regions by design."
    },
    {
     "t": "p",
     "text": "**Theme: Data Governance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Your company has no data catalog. Data scientists spend 30% of time finding and understanding data. How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Implement a data catalog: Amundsen, DataHub, or Atlan, (2) start with the most-used 20 datasets — don't try to catalog everything, (3) document per dataset: schema, owner, freshness, quality, business definition, (4) automated metadata extraction: lineage, stats, profiling, (5) make it searchable: data scientists should Google-search for data, (6) data stewards: assign owners responsible for documentation, (7) integrate with notebooks/SQL editors for discovery, (8) measure usage: which datasets are most queried?, (9) crowdsource: let data scientists add descriptions as they use data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Your team has different versions of the same dataset floating around in shared drives, S3 buckets, and local machines. How do you manage this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Single source of truth: store canonical datasets in one location, (2) versioning: DVC (Data Version Control) or Delta Lake for datasets, (3) immutable datasets: never overwrite, create new versions, (4) naming convention: dataset_name_v{version}_{date}, (5) lineage tracking: how was each dataset created?, (6) access control: read-only for analysts, write for data engineers, (7) deprecation process: clearly mark old versions, sunset them, (8) CI/CD for data: automated validation on new dataset versions, (9) training data should reference specific dataset versions."
    },
    {
     "t": "p",
     "text": "**Theme: Interview Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "You're given a dataset and 2 hours for a take-home assignment. How do you structure your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** 0-15 min: (1) understand the problem, read instructions carefully, (2) quick data exploration: shape, dtypes, nulls, target distribution. 15-45 min: (3) clean data, handle missing values, basic feature engineering. 45-75 min: (4) baseline model + evaluation, (5) iterate: try 2-3 model types, quick tuning. 75-100 min: (6) best model with proper cross-validation, feature importance. 100-115 min: (7) clean up code, add comments, (8) write summary of findings and next steps. 115-120 min: (9) final review, check everything runs. Key: working solution > perfect solution. Document assumptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "The interviewer asks: \"You see a spike in your model's error rate on dashboards at 3 AM. Walk me through your investigation.\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check: is this a real spike or a monitoring artifact (small volume at 3 AM inflates rate)?, (2) check recent deployments: was anything changed in the last 24 hours?, (3) data quality: are features being computed correctly? Any upstream pipeline failures?, (4) volume analysis: is the traffic pattern unusual (bot traffic, batch processing)?, (5) input analysis: are the 3 AM inputs from a different distribution (different geography, use case)?, (6) correlation: does this happen every night or was it a one-off?, (7) narrow down: is it one feature, one model, one customer segment?, (8) if recurring: the model may need time-of-day features or separate night model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "\"Design a system to detect fake reviews on an e-commerce platform.\" Walk through your end-to-end approach.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data: (1) review text, metadata (timestamp, reviewer history, product info), (2) known labels: previously identified fake/genuine (even small labeled set). Features: (3) text: sentiment, length, readability, generic phrases, (4) behavioral: review velocity (many reviews in short time), (5) reviewer: account age, review count, category diversity, (6) temporal: reviews clustered around product launch, (7) network: reviewers reviewing same products (collusion). Model: (8) gradient boosting or neural network ensemble, (9) graph-based features (reviewer-product bipartite graph). System: (10) real-time scoring, (11) human review queue, (12) feedback loop from moderators."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "\"What would you do if you found out your model was being used for a purpose it wasn't designed for?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Assess the risks: is the new use case appropriate for the model's capabilities?, (2) model was validated for specific use case — no guarantee it works for others, (3) check for harm: could the repurposed use cause damage or discrimination?, (4) communicate with the team using the model: explain limitations, (5) if harmless: document the new use case, validate on relevant data, monitor performance, (6) if harmful: escalate to management, recommend stopping, (7) implement model usage governance: model cards clearly state intended use, (8) technical controls: API rate limiting, usage logging, access control."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "\"How would you handle a situation where your analysis shows that a proposed business initiative won't work?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Verify your analysis: is the methodology sound? Have you checked for errors?, (2) consider alternative interpretations: could the data be wrong or incomplete?, (3) quantify clearly: \"the expected lift is 2% with 60% probability, not the 10% assumed\", (4) be diplomatic but honest: present findings factually, (5) offer alternatives: \"this approach won't work, but here's what might\", (6) show your work: let stakeholders see the analysis, (7) provide a path to prove you wrong: \"if we test with these conditions, we'd know for sure\", (8) document your findings and recommendations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "\"You join a new team and find their current model has poor documentation, no tests, and messy code. What do you do?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Don't immediately rewrite — understand the current system first, (2) document what you learn: architecture, data flows, model decisions, (3) add monitoring first: understand current performance before changing anything, (4) add tests incrementally: start with critical paths, (5) talk to the team: understand why it's in this state (time pressure, turnover?), (6) propose gradual improvement plan: prioritize by risk, (7) use model refresh/retrain cycles to refactor, (8) lead by example: your new code follows best practices."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "\"Tell me about a time you had to make a technical tradeoff.\" How do you structure this answer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use STAR format: **Situation**: \"We needed to deploy a model within 2 weeks for a time-sensitive marketing campaign.\" **Task**: \"Choose between a complex ensemble model (better accuracy) and a simple logistic regression (faster to deploy).\" **Action**: \"I analyzed the accuracy difference (2%), estimated deployment effort (1 week vs. 2 days), and evaluated business impact. I chose logistic regression with a plan to upgrade post-launch.\" **Result**: \"Deployed on time, captured $500K revenue from campaign, upgraded to ensemble in month 2 with 15% improvement in targeting.\" Key: show your decision-making process, not just the outcome."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "\"Where do you see data science heading in the next 5 years?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Good answer elements: (1) \"LLMs are changing how we interact with data — natural language querying, automated EDA, code generation, but they don't replace understanding,\" (2) \"AutoML democratizes basic modeling, so data scientists will focus more on problem framing, experimentation, and causal inference,\" (3) \"MLOps maturity — models in production with proper monitoring will be the norm, not the exception,\" (4) \"Real-time ML will become standard — streaming features, online learning,\" (5) \"Responsible AI will move from optional to mandatory — regulations are coming,\" (6) \"The role will split: ML engineers (production), applied scientists (research), analytics engineers (data).\""
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
