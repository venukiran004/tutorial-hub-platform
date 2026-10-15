/* ============================================================================
   PRACTICE P3.10 — Predict the Output / Scenarios · 10
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.10",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Predict the Output / Scenarios · 10",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "226",
   "q": "Your text summarization model sometimes \"hallucinates\" — generates facts not in the source document. How do you detect and prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detection: (1) NLI-based: check if summary is entailed by source, (2) entity verification: are entities in summary present in source?, (3) fact extraction and matching. Prevention: (1) use extractive summarization (only select source sentences), (2) constrained decoding — restrict generation to source vocabulary, (3) add faithfulness reward in training, (4) hybrid: extractive selection then abstractive compression, (5) human evaluation for critical applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "227",
   "q": "You need to classify customer support tickets into 50 categories. Labeled data is scarce. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Few-shot learning with language models: provide category descriptions and examples in prompt, (2) zero-shot classification: use `facebook/bart-large-mnli` with candidate labels, (3) semi-supervised learning: label a small set, propagate labels with self-training, (4) data augmentation: paraphrase, back-translation, (5) hierarchical: first classify into 10 groups, then subcategorize, (6) active learning: have humans label the most uncertain examples first, (7) use embeddings + KNN with few labeled examples per class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "228",
   "q": "Your chatbot needs to detect user intent from free-text messages. New intents appear over time. How do you handle intent evolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Open-set classification: train to detect \"unknown\" intent when confidence is low, (2) cluster unknown intents periodically to discover new categories, (3) use a fallback/escalation path for unrecognized intents, (4) implement online/incremental learning, (5) regular review of \"unknown\" bucket by human analysts to label new intents, (6) use few-shot approach: add new intents with just 5–10 examples, (7) combine intent classification with slot filling for structured extraction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "229",
   "q": "You're comparing TF-IDF + Logistic Regression vs. BERT for document classification. When would you choose TF-IDF?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Choose TF-IDF + LR when: (1) dataset is small (< 5000 labeled examples) — BERT overfits, (2) latency requirements are strict (TF-IDF inference in ms, BERT in 10-100ms), (3) interpretability is important — coefficients are meaningful, (4) limited compute (no GPU), (5) documents are long — BERT has 512 token limit, (6) simple domain without nuanced language, (7) as a strong baseline before investing in BERT fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "230",
   "q": "Your topic model (LDA) produces topics that seem incoherent (mixed themes). How do you improve topic quality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Better preprocessing: remove stop words, lemmatize, remove very frequent and very rare words, (2) experiment with number of topics (try 5, 10, 15, 20, 30), (3) filter short documents (< 20 words), (4) use coherence score (c_v) to evaluate topic quality, (5) try alternative models: NMF, BERTopic (uses embeddings), Top2Vec, (6) increase iterations for LDA convergence, (7) use bigrams/trigrams for multi-word topics, (8) seed topics with domain keywords."
    },
    {
     "t": "p",
     "text": "**Theme: Model Deployment & MLOps**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "231",
   "q": "Your model works in Jupyter notebook but fails in production. What are common causes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Library version mismatch between dev and prod, (2) data format differs (DataFrame in notebook vs JSON in API), (3) missing preprocessing steps not in production code, (4) feature engineering logic not replicated exactly, (5) hardcoded file paths, (6) notebook-specific globals not available in production, (7) training data artifacts baked into notebook state. Fix: package model properly, use Docker, test in staging, CI/CD pipeline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "232",
   "q": "Your model needs to serve 1000 requests/second with < 100ms latency. How do you architect this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Optimize model: quantization, pruning, ONNX conversion, (2) horizontal scaling: multiple replicas behind load balancer, (3) caching: Redis for repeated predictions, (4) batching: group requests for GPU efficiency, (5) async processing: queue non-critical predictions, (6) feature precomputation: store computed features in feature store, (7) use production serving frameworks: TensorFlow Serving, TorchServe, Triton, (8) CDN for static model resources, (9) autoscaling based on traffic."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "233",
   "q": "Your model retraining pipeline takes 6 hours. Business wants daily retraining. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Incremental/online learning instead of full retraining, (2) use warm-start: initialize from previous model, (3) reduce data volume: sample or window recent data, (4) distributed training across multiple machines, (5) use mixed precision (FP16) for 2x speedup, (6) optimize feature engineering (cache intermediate results), (7) use efficient data formats (Parquet over CSV), (8) profile pipeline to find bottlenecks (data loading? feature eng? training?)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "234",
   "q": "You need to roll back a model deployment. The new model is worse than the old one. What's your rollback strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Keep previous model artifacts in model registry (MLflow), (2) blue-green deployment: switch traffic back to old environment, (3) canary deployment: stop canary, route all traffic to stable, (4) version control model artifacts and configs, (5) automated rollback trigger: if accuracy drops > 5%, auto-revert, (6) rollback should take < 5 minutes — practice it, (7) maintain a \"last known good\" model always ready to deploy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "235",
   "q": "Your team manually deploys models by copying files to servers. What improvements do you recommend?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Implement MLOps best practices: (1) model registry (MLflow) for versioned artifacts, (2) CI/CD pipeline (Jenkins/GitHub Actions) for automated testing and deployment, (3) containerization (Docker) for reproducible environments, (4) infrastructure-as-code (Terraform/Kubernetes), (5) automated testing: unit tests, integration tests, model validation tests, (6) staging environment matching production, (7) monitoring and alerting post-deployment, (8) feature store for consistent feature computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "236",
   "q": "You're monitoring a deployed model. What metrics do you track and what are alert thresholds?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model metrics: accuracy, F1, AUC — alert if drops > 5% below baseline, (2) data metrics: feature drift (PSI > 0.2), null rate spikes (> 2x baseline), (3) latency: P99 > 200ms, average > 50ms, (4) error rate: > 1% of requests failing, (5) throughput: sudden drops indicate issues, (6) prediction distribution: significant shift from training distribution, (7) business metrics: conversion rate, revenue — alert on sustained drops, (8) resource usage: CPU > 80%, memory > 85%."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "237",
   "q": "Your model works differently in Python 3.8 (dev) and Python 3.11 (prod) due to numpy behavior changes. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pin ALL library versions exactly in requirements.txt, (2) use Docker containers with exact same base image for dev and prod, (3) run integration tests in production-like environment, (4) use virtual environments consistently, (5) pin Python version itself: `python==3.10.13`, (6) test in CI/CD with production Python version, (7) document Python version in model metadata, (8) consider conda for more reproducible environments with compiled dependencies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "238",
   "q": "Your model serves predictions but you want to A/B test a new version. How do you route traffic?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Deploy both models simultaneously in separate containers, (2) use feature flags (LaunchDarkly/Unleash) to route traffic, (3) load balancer with weighted routing (90/10 split), (4) user-level hashing for consistent assignment (same user always sees same model), (5) log which model served each prediction for analysis, (6) define primary metric and run statistical test on results, (7) start with 5% canary, gradually increase if metrics are good."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "239",
   "q": "Your model depends on a third-party API for feature enrichment. The API goes down. How do you handle this gracefully?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Implement fallback: use cached values, default values, or simpler model without that feature, (2) circuit breaker pattern: detect API failure early, stop calling, switch to fallback, (3) cache recent API responses for reuse, (4) timeout and retry with exponential backoff, (5) precompute features in batch where possible, (6) model should be trained with and without the feature so fallback is still accurate, (7) alert on API failures, track SLA compliance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "240",
   "q": "Your prediction service needs to be highly available (99.9% uptime). What architecture do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple replicas across availability zones, (2) load balancer with health checks (removes unhealthy pods), (3) database replication for feature store, (4) graceful degradation: simpler model when primary fails, (5) caching layer (Redis) for common requests, (6) blue-green deployment for zero-downtime updates, (7) autoscaling for traffic spikes, (8) chaos engineering to test failure scenarios, (9) 99.9% allows ~8.77 hours downtime/year — SLO monitoring."
    },
    {
     "t": "p",
     "text": "**Theme: Statistical Analysis**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "241",
   "q": "Your chi-square test on a contingency table gives a significant result. What does this tell you and what doesn't it tell you?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** It tells you: categorical variables are not independent (there IS a relationship). It doesn't tell you: (1) the direction or strength of association — use Cramér's V, (2) which specific cells deviate from expected — check standardized residuals, (3) causation — only association, (4) practical significance — large samples can make tiny effects significant, (5) which category pairs drive the association. Always report effect size alongside p-value."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "242",
   "q": "You're comparing mean satisfaction scores across 5 product lines. Why can't you just run 10 t-tests?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple comparison problem: with 10 tests at α=0.05, family-wise error rate is 1-(0.95)^10 ≈ 40%. Solution: (1) ANOVA first — tests if ANY group differs, (2) if ANOVA significant, use post-hoc tests: Tukey HSD (all pairs), Dunnett (all vs. control), (3) Bonferroni correction: α/10 = 0.005 per test, (4) Holm-Bonferroni (less conservative), (5) false discovery rate control (Benjamini-Hochberg) for many comparisons."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "243",
   "q": "Your A/B test data is heavily right-skewed (revenue per user). The t-test assumes normality. Is it still valid?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Central Limit Theorem: with large samples (n>30), the sampling distribution of the mean is approximately normal — t-test is usually fine, (2) but extreme skewness can require n>1000 for CLT to kick in, (3) alternatives: Mann-Whitney U test (non-parametric), (4) bootstrap test — no distributional assumptions, (5) log-transform then t-test, (6) use trimmed means to reduce outlier influence, (7) check if the practical conclusion changes across methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "244",
   "q": "You computed a correlation of r=0.3 between two variables. Is this meaningful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on context: (1) in social sciences, r=0.3 is moderate and often meaningful, (2) in physics/engineering, it would be weak, (3) r² = 0.09 means only 9% of variance explained, (4) check statistical significance — may be significant with large n but small effect, (5) check for non-linear relationships (r only captures linear), (6) check for outliers driving the correlation, (7) domain knowledge: r=0.3 for \"advertising → sales\" might be very valuable despite being \"moderate.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "245",
   "q": "Your regression model has a significant F-test but none of the individual coefficients are significant. How is this possible?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multicollinearity! — features are correlated with each other, inflating individual standard errors while the collective model still predicts well. Fix: (1) check VIF for each predictor (remove VIF > 10), (2) use Ridge regression to stabilize coefficients, (3) PCA to create uncorrelated components, (4) drop highly correlated features, (5) the F-test tests all coefficients jointly (features collectively matter even if individually uncertain)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "246",
   "q": "You're asked to analyze the causal effect of a marketing campaign using observational data. What methods do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Propensity score matching — match treated to similar untreated individuals, (2) Difference-in-Differences (DiD) — compare before/after for treatment vs. control groups, (3) Instrumental Variables (IV) — find an instrument correlated with treatment but not outcome, (4) Regression Discontinuity Design — if treatment assigned by a threshold, (5) Granger causality for time series, (6) Causal forests for heterogeneous treatment effects, (7) sensitivity analysis to test assumptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "247",
   "q": "Your hypothesis test has low power (30%). What does this mean and how do you improve it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** 30% power means only 30% chance of detecting a real effect — you'll miss 70% of true effects (high Type II error). Improve by: (1) increase sample size (most common fix), (2) increase effect size (larger treatment), (3) increase α from 0.05 to 0.10 (trade-off with Type I error), (4) reduce noise — control variables, paired designs, stratification, (5) use one-tailed test if direction is known, (6) use CUPED for variance reduction in experiments."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "248",
   "q": "You need to choose between parametric and non-parametric tests. What's your decision framework?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use parametric (t-test, ANOVA) when: (1) data is approximately normal, (2) sample size is large (CLT), (3) you need more statistical power, (4) interval/ratio data. Use non-parametric (Mann-Whitney, Kruskal-Wallis) when: (1) data is ordinal, (2) distributions are heavily skewed with small samples, (3) outliers are present, (4) normality assumption clearly violated, (5) you want to compare medians not means."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "249",
   "q": "You're performing survival analysis for customer churn. Some customers haven't churned yet (right-censored). Why can't you just treat them as \"not churned\"?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ignoring censoring biases results — a customer with 2 months tenure who hasn't churned isn't the same as one who stayed. Proper methods: (1) Kaplan-Meier estimator — handles censoring for survival curves, (2) Cox proportional hazards model — relates features to hazard rate, (3) account for censoring in likelihood function, (4) censored customers contribute information up to their last observed time, (5) never drop censored observations — they're valuable data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "250",
   "q": "Your bootstrap confidence interval for a median gives [45.2, 62.8]. A stakeholder asks \"what does this mean in plain English?\"",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"If we could repeatedly sample customers from the same population and calculate the median each time, 95% of those medians would fall between 45.2 and 62.8. We're 95% confident the true population median is in this range. The interval is wide because there's substantial variation in our data — a wider interval means less precision. To narrow it, we'd need a larger sample size.\""
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
