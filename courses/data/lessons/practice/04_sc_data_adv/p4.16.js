/* ============================================================================
   PRACTICE P4.16 — Predict the Output / Scenarios · 16
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.16",
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
   "text": "Predict the Output / Scenarios · 16",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "376",
   "q": "You have network/graph data (social network). What graph-based features can improve your user-level predictions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Degree centrality: number of connections, (2) PageRank: importance in the network, (3) clustering coefficient: how interconnected a user's friends are, (4) community membership: detected via Louvain algorithm, (5) embeddedness: how many mutual friends exist within a group, (6) influence reach: how many 2nd-degree connections, (7) node2vec/GraphSAGE embeddings: learned vector representations, (8) temporal: growth rate of connections, activity of connections, (9) label propagation: friends' labels as features (if predicting churn, fraction of churned friends)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "377",
   "q": "You need to detect anomalies in multivariate time series (100 sensors simultaneously). What approach do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Autoencoder: train on normal data, high reconstruction error = anomaly, (2) LSTM-autoencoder: captures temporal patterns, (3) isolation forest per time window: treat window of sensor readings as feature vector, (4) MSCRED (Multi-Scale Convolutional Recurrent Encoder-Decoder): captures inter-sensor correlations, (5) statistical: Mahalanobis distance from normal distribution over time, (6) correlation-based: detect when sensor correlations break down, (7) PCA: project to lower dimension, monitor residuals, (8) evaluation challenge: anomalies are rare and diverse — use domain expert review."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science for Business Strategy**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "378",
   "q": "The CEO asks: \"Should we enter a new market?\" How can data science inform this decision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Market sizing: estimate TAM from public data, surveys, proxies, (2) competitive analysis: scrape and analyze competitors' pricing, reviews, offerings, (3) demand prediction: use analogous markets or similar product launches, (4) customer segmentation: who in the new market matches our existing successful customers?, (5) cost modeling: estimate customer acquisition cost from digital ad data, (6) risk analysis: Monte Carlo simulation of revenue scenarios, (7) NLP: analyze social media/forum discussions about unmet needs in the market, (8) deliverable: data-backed recommendation with confidence intervals and risk scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "379",
   "q": "Marketing wants to attribute conversions to specific ad channels. There are 5 channels with overlapping exposure. How do you approach attribution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Last-touch (simple but biased): credit the last channel before conversion, (2) first-touch: credit the first channel, (3) linear: equal credit to all channels, (4) data-driven: (a) Shapley values: game-theoretic fair allocation, (b) Markov chains: model customer journey as transition probabilities, remove each channel and measure impact, (5) incrementality testing: run holdout experiment per channel — measure true lift, (6) media mix modeling: regression of spend vs. conversions per channel, (7) practical: combine MMM (strategic allocation) with MTA (tactical optimization)."
    },
    {
     "t": "p",
     "text": "**Theme: Handling Complex Data Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "380",
   "q": "Your dataset has hierarchical/nested structure (students within classrooms within schools). Standard models ignore this. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Mixed-effects models: random intercepts/slopes per group level, (2) hierarchical Bayesian: prior distributions respect the nesting, (3) features: aggregate up — classroom average, school average as features for student-level model, (4) cluster-robust standard errors: if using simple regression, adjust for clustering, (5) multilevel cross-validation: don't leak school information — split at school level, (6) deep learning: entity embeddings for categorical group identifiers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "381",
   "q": "You have data from a natural experiment (a policy change affected some regions but not others). How do you estimate the policy's causal effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Difference-in-differences (DiD): compare treated vs. control regions, before vs. after, (2) assumption: parallel trends — without treatment, both groups would have followed same trajectory, (3) validate: check pre-treatment trends are parallel, (4) synthetic control: create a weighted combination of control regions that matches the treated region pre-treatment, (5) regression discontinuity: if policy applied based on a threshold (e.g., population cutoff), (6) event study design: examine effect dynamics around the policy change time, (7) robustness: placebo tests (fake treatment times, fake treatment groups)."
    },
    {
     "t": "p",
     "text": "**Theme: Model Selection & Evaluation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "382",
   "q": "You have 5 candidate models. Three researchers on your team each evaluated them differently (different test sets, different metrics). How do you make a fair final choice?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Standardize: re-evaluate ALL models on the same held-out test set, (2) multiple metrics: agree on primary metric + secondary metrics, (3) statistical significance: paired t-test or McNemar's test between top models, (4) practical considerations: inference time, model size, interpretability, (5) consensus: create a scorecard — each model rated on multiple dimensions, (6) if performance difference < 1%: choose based on simplicity and maintainability, (7) document: decision rationale, comparison results, chosen model and why."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "383",
   "q": "You're comparing a neural network (AUC 0.92) vs. logistic regression (AUC 0.89) for a production system. The LR is 100x faster. Which do you choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Is the 0.03 AUC difference statistically significant? (confidence intervals overlap?), (2) business impact: translate 0.03 AUC to business metric (revenue, cost), (3) at scale: 100x speed difference → significant infrastructure cost difference, (4) latency requirements: does the NN meet SLA?, (5) interpretability: if required, LR wins, (6) maintenance: LR is simpler to debug, retrain, monitor, (7) my default: unless the 0.03 AUC translates to significant business impact AND latency is acceptable, choose LR, (8) compromise: distill NN knowledge into enhanced LR features."
    },
    {
     "t": "p",
     "text": "**Theme: Real-World Debugging**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "384",
   "q": "Your model accuracy dropped from 90% to 80% overnight. Your debugging checklist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Step 1: Data check — (1) did data volume change? (2) new data source added? (3) schema change? (4) null rate spike? Step 2: Feature check — (5) feature distributions shifted? (6) any feature returning constant/null? (7) feature pipeline failed? Step 3: Model check — (8) was model version changed? (9) was model retrained with bad data? Step 4: Environment — (10) library version changed? (11) hardware change? Step 5: Ground truth — (12) did the labeling process change? (13) is the concept genuinely shifting? Tool: automated checks for steps 1-4, manual investigation for step 5."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "385",
   "q": "Your pipeline intermittently produces different results for the same input. It works most of the time but fails ~5% of runs. How do you debug?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Race condition: parallel processes accessing shared state, (2) non-deterministic operations: GPU floating point, random seeds not set, (3) timeout issues: external API call times out occasionally, (4) memory pressure: under high memory, behavior changes, (5) data: upstream data changes between queries, (6) debugging approach: (a) add extensive logging, (b) capture full state when failure occurs, (c) run in single-threaded mode to isolate parallelism issues, (d) monitor system resources during runs, (e) track exact input/output for failed runs."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Topics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "386",
   "q": "Explain how self-supervised learning can be useful for your tabular data when you have limited labels.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pre-train on unlabeled data: mask random features, predict them from others, (2) TabNet: built-in self-supervised pre-training for tabular data, (3) contrastive learning: learn representations where similar rows are close, different rows are far, (4) VIME (Value Imputation and Mask Estimation): corrupt features, train to reconstruct, (5) SubTab: subsetting features as augmentation for contrastive learning, (6) benefits: learned representations capture feature interactions, (7) fine-tune: use pre-trained representations with small labeled dataset, (8) empirical: works best when unlabeled data is 10-100x larger than labeled."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "387",
   "q": "You need to build a model that can say \"I don't know\" when it's uncertain. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Calibrated probabilities: predict below threshold → abstain, (2) conformal prediction: guaranteed coverage — if prediction set is too large, abstain, (3) ensemble disagreement: if models disagree significantly, abstain, (4) MC Dropout: run multiple forward passes, high variance → uncertain, (5) distance to training data: OOD detection — far from training distribution → abstain, (6) implementation: define uncertainty threshold, route to human review, (7) business value: better to say \"I don't know\" than give wrong prediction confidently, (8) metrics: track abstention rate vs. accuracy-on-answered."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "388",
   "q": "Your model needs to handle interventional queries (\"what would happen if we doubled the price?\"). Standard predictive models can't answer this. Why not?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Correlation ≠ causation: model learned P(Y|X), not P(Y|do(X)), (2) example: model sees high-price products sell well (luxury goods) → predicts doubling price increases sales (wrong!), (3) Simpson's paradox: relationship reverses when confounders are considered, (4) solution: causal model — DAG + do-calculus, (5) practical approaches: (a) A/B test the price change, (b) instrumental variables, (c) double ML for causal inference, (d) natural experiments from past pricing changes, (6) tools: DoWhy, EconML for causal inference."
    },
    {
     "t": "p",
     "text": "**Theme: Domain: Healthcare Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "389",
   "q": "You're building a model to predict ICU length of stay. What's unique about healthcare data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Missing data is informative: test not ordered = different from test ordered but normal, (2) temporal: conditions evolve rapidly — features change hour by hour, (3) class imbalance: most patients have normal stays, some are extreme, (4) censoring: patient transferred/died → don't observe full stay, (5) confounders: sicker patients get more interventions (treatment selection bias), (6) privacy: HIPAA compliance, de-identification required, (7) fairness: model must perform equitably across demographics, (8) stakes: model error can affect patient care — need clinician buy-in and oversight, (9) evaluation: calibration is critical — clinicians need to trust probability estimates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "390",
   "q": "Your medical image classification model has 95% accuracy but radiologists are hesitant to use it. How do you increase adoption?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Explainability: show heatmaps (Grad-CAM) highlighting which image regions influenced the prediction, (2) workflow integration: embed into existing PACS system, don't require new tool, (3) second opinion mode: present as \"AI suggestion\" alongside radiologist's read, (4) performance comparison: show head-to-head performance vs. radiologists, (5) failure analysis: be transparent about what cases the model gets wrong, (6) gradual rollout: start with screening/triage, not final diagnosis, (7) clinical validation: publish results in peer-reviewed journal, (8) feedback: allow radiologists to flag AI errors, use for improvement."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Optimization**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "391",
   "q": "You need to solve a complex constrained optimization problem (resource allocation with 100 constraints). What approaches work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Linear programming: if objective and constraints are linear → scipy.optimize.linprog, (2) mixed-integer programming: if some variables are discrete → PuLP, Gurobi, (3) constraint satisfaction: if feasibility is the main question → OR-Tools, (4) genetic algorithms: for non-linear, non-convex problems, (5) gradient-based: if objective is differentiable, (6) decomposition: break large problem into sub-problems (Dantzig-Wolfe), (7) practical: start with LP relaxation to get bounds, then add complexity, (8) tools: Google OR-Tools (free), Gurobi (commercial, fast), CPLEX."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "392",
   "q": "You're optimizing ad spend across 10 channels with a fixed budget. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Response curves: model ROI as function of spend per channel (diminishing returns), (2) typically: log or Hill function — \\(f(x) = \\frac{a \\cdot x^b}{c + x^b}\\), (3) optimization: maximize total conversions subject to budget constraint, (4) formulation: \\(\\max \\sum_{i} f_i(x_i) \\text{ s.t. } \\sum_{i} x_i \\leq B\\), (5) solution: Lagrange multipliers or numerical optimization, (6) marginal analysis: allocate to channel with highest marginal return, (7) constraints: minimum spend per channel, maximum spend, (8) dynamic: re-optimize weekly as response curves change."
    },
    {
     "t": "p",
     "text": "**Theme: Data Quality & Validation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "393",
   "q": "You inherit a data pipeline with no data quality checks. Design a comprehensive validation strategy.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Schema validation: column names, data types, nullable constraints, (2) statistical checks: min/max, mean, std within expected ranges, (3) null rates: alert if null% exceeds historical baseline + threshold, (4) volume checks: row count within expected range (±20% of yesterday), (5) distribution checks: KS test vs. reference distribution, (6) referential integrity: foreign keys exist in referenced tables, (7) business rules: domain-specific constraints (age > 0, price > 0), (8) freshness: data arrived within expected window, (9) tools: Great Expectations, dbt tests, custom checks, (10) implementation: fail-fast → halt pipeline on critical check failure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "394",
   "q": "Your sales data has impossible values (negative prices, quantities of 1 million). But cleaning them might remove real edge cases. How do you decide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Domain expert consultation: get ranges from business (\"max real order is 10K units\"), (2) historical analysis: what's the 99.9th percentile historically?, (3) categorize: (a) clearly impossible: negative prices → data error, (b) extreme but possible: 1M quantity could be bulk order, (c) suspicious: investigate case by case, (4) action by category: impossible → remove/correct, extreme → flag for review, suspicious → keep with flag feature, (5) don't delete silently: log all modifications, (6) create: cleaned_value and original_value columns."
    },
    {
     "t": "p",
     "text": "**Theme: Communication & Soft Skills**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "395",
   "q": "Your model results contradict the VP's intuition about the business. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Assume your model might be wrong first — double-check everything, (2) validate: test model on cases where the VP's intuition is clearly correct, (3) prepare: specific examples where model and intuition diverge, and the data behind the model's prediction, (4) frame: \"the data suggests [X]. Can you help me understand where my analysis might be missing context?\", (5) leave room: VP has context you don't (strategic considerations, market knowledge), (6) decision tool: propose a small experiment to test both hypotheses, (7) never: publicly challenge with \"the data proves you wrong.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "396",
   "q": "Non-technical stakeholders ask you to explain how your random forest works. How do you explain it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"Imagine you're buying a car and you ask 100 friends for advice. Each friend knows different things — some know about engines, some about safety, some about price. Each friend gives their recommendation based on what they know. The random forest takes 'a vote' of all 100 friends and goes with the majority recommendation. Each 'friend' is a decision tree that looks at different aspects of the data. By combining many imperfect opinions, we get a much better overall prediction than any single friend could give. This is why it often works better than simpler models — like asking one expert vs. polling many people.\""
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
   "n": "397",
   "q": "You need to build a data science portfolio project that stands out. What advice do you give?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Choose a unique dataset: don't use Titanic or Boston Housing, (2) end-to-end: data collection → EDA → modeling → deployment (not just a notebook), (3) real problem: solve something you care about, (4) write-up: blog post explaining your approach, decisions, and learnings, (5) production touches: error handling, logging, tests, CI/CD, (6) show impact: \"model would save X hours/dollars,\" (7) GitHub: clean code, clear README, reproducible with instructions, (8) bad portfolio projects: Kaggle competition with copy-pasted top kernel, (9) good: web app where users interact with your model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "398",
   "q": "Your team is migrating from on-premise to cloud. How does this affect your data science workflow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Compute: unlimited auto-scaling → can run larger experiments, (2) cost: pay-per-use replaces fixed hardware — optimize for cost (spot instances, right-sizing), (3) storage: S3/GCS for data lake (cheap, scalable), (4) tools: managed services (SageMaker, Vertex AI) replace manual setup, (5) collaboration: shared environments, notebooks in the cloud, (6) security: new model — IAM roles, VPC, encryption configs, (7) networking: data transfer costs and latency, (8) migration plan: lift-and-shift first, then optimize for cloud-native, (9) training: team needs cloud skills (Terraform, IAM, cloud CLI)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "399",
   "q": "You're asked to reduce your model's inference cost by 50% without significantly impacting performance. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Quantization: FP32 → INT8 (reduces model size and compute by ~4x, <1% accuracy loss typically), (2) pruning: remove unnecessary weights (30-50% without performance loss), (3) distillation: train smaller model to mimic larger model, (4) feature reduction: remove least important features (fewer computations), (5) caching: cache frequent predictions, (6) batch: batch requests for GPU efficiency, (7) simpler model: can a linear model replace part of the pipeline?, (8) hardware: GPU → optimized CPU inference (cheaper per prediction for small models), (9) measure: actual latency and cost per prediction before/after."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "400",
   "q": "What are the most common mistakes you see in data science projects, and how do you prevent them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Leakage: using future information → strict temporal splits, pipeline audit, (2) wrong metric: optimizing accuracy when business cares about cost → align metrics with business goals, (3) skipping EDA: jumping to modeling → mandatory EDA phase, (4) no baseline: can't assess if model is good → always establish baseline first, (5) overcomplication: neural network when logistic regression works → start simple, complexity ladder, (6) poor communication: great model nobody uses → involve stakeholders early, (7) no monitoring: model degrades silently → automated monitoring and alerts, (8) single metric tunnel vision: improving one metric while degrading others → multi-metric evaluation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
