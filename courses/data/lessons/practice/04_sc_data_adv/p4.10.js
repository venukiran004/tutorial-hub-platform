/* ============================================================================
   PRACTICE P4.10 — Predict the Output / Scenarios · 10
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.10",
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
   "text": "Predict the Output / Scenarios · 10",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "226",
   "q": "You're a solo data scientist supporting 5 product teams. How do you manage your workload?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Weekly prioritization: which requests have highest business impact?, (2) office hours: dedicated time for ad-hoc requests (reduces interruptions), (3) self-serve: create dashboards and SQL templates teams can use independently, (4) documentation: write once, reuse — standard analyses, code templates, (5) say no strategically: \"I can do this in Q2 or do this simpler version now,\" (6) estimate work: communicate timelines clearly, (7) force multiply: train analysts on teams to handle basic analyses, (8) focus time: block calendar for deep work, (9) automation: invest in pipelines that replace manual recurring work."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "227",
   "q": "Your analysis reveals a significant finding, but the data sample is from a biased source. How do you communicate this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Lead with the finding AND the limitation: \"our data suggests X, but we should be cautious because...,\" (2) quantify the bias: how biased is the sample? Who's over/under-represented?, (3) attempt correction: weighting, matching to known population, (4) sensitivity analysis: how different would results be if bias went the other way?, (5) contextualize: \"this finding holds for our current user base, which skews toward...,\" (6) recommend: \"we should validate with a broader sample before acting,\" (7) don't suppress: biased data is better than no data — just be transparent."
    },
    {
     "t": "p",
     "text": "**Theme: Production ML Recipes**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "228",
   "q": "Your model needs to be retrained monthly but each retrain takes 8 hours. You want zero-downtime deployments. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Blue-green deployment: train new model while current serves, swap when ready, (2) schedule: start training 12+ hours before deployment window, (3) validation gate: automated tests must pass before swap, (4) canary deployment: route 5% to new model, monitor, then full swap, (5) instant rollback: keep previous model artifact for quick revert, (6) version management: timestamp/version each model artifact, (7) automation: Airflow DAG → train → validate → deploy → verify → alert."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "229",
   "q": "Your serving infrastructure needs to support multiple model versions simultaneously (A/B testing, gradual rollout). How do you architect this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model registry: store multiple versions with metadata, (2) serving layer: load multiple models in memory, route by configuration, (3) traffic splitting: routing rules (userId hash) → model version, (4) feature compatibility: ensure all model versions work with current feature pipeline, (5) configuration service: dynamic routing rules without redeployment, (6) monitoring per version: separate metrics dashboards, (7) KServe / Seldon / BentoML: ML serving platforms with multi-model support."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "230",
   "q": "Your ML model needs to interact with 3 microservices (user service, product service, risk service) to get features. How do you minimize latency?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Parallel requests: fetch from all 3 services simultaneously (async/await), (2) caching: cache user profile (changes slowly) with TTL, (3) feature pre-computation: batch compute features → store in feature store, (4) circuit breaker: if service is slow → use cached/default value, (5) gRPC instead of REST: faster serialization, streaming, (6) service mesh: Istio for automatic load balancing and retries, (7) local cache: in-memory cache for hot data, (8) target: total feature fetching < 20ms, model inference < 10ms."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Pandas Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "231",
   "q": "You need to compute a weighted moving average where weights come from another column. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Weighted moving average with custom weights\ndef weighted_rolling(df, value_col, weight_col, window):\n    result = []\n    for i in range(len(df)):\n        if i < window - 1:\n            result.append(np.nan)\n        else:\n            vals = df[value_col].iloc[i-window+1:i+1]\n            wts = df[weight_col].iloc[i-window+1:i+1]\n            result.append(np.average(vals, weights=wts))\n    return pd.Series(result, index=df.index)\n\n# Faster with numpy stride tricks or rolling().apply()\ndf['wma'] = weighted_rolling(df, 'price', 'volume', 20)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "232",
   "q": "You need to efficiently compute percentile ranks within groups. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Percentile rank within each group\ndf['percentile_rank'] = df.groupby('category')['revenue'].rank(pct=True)\n\n# Binned into quintiles per group\ndf['quintile'] = df.groupby('category')['revenue'].transform(\n    lambda x: pd.qcut(x, 5, labels=[1,2,3,4,5], duplicates='drop')\n)"
    },
    {
     "t": "p",
     "text": "**Theme: Edge Cases & Tricky Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "233",
   "q": "Your target variable is extremely right-skewed (median $100, mean $5000, max $1M). How do you model this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Log transform: `y_log = np.log1p(y)`, model, then `np.expm1(pred)` for predictions, (2) quantile regression: predict median instead of mean (robust to outliers), (3) truncated or censored models if there's a cap, (4) two-stage: classify big vs. normal → separate regression for each, (5) winsorize extreme values: cap at 99th percentile, (6) evaluate with MAE or median absolute error (not MSE which weights outliers heavily), (7) business decision: do you care about predicting the extreme values accurately?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "234",
   "q": "Your classification labels change over time (what was \"spam\" 2 years ago isn't today, and new spam types emerge). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Time-aware training: train on recent data only (sliding window), (2) concept drift detection: monitor label distributions over time, (3) regular annotation refresh: have annotators relabel old data with current definitions, (4) version labels: track which definition version generated each label, (5) multi-task: current labels + historical labels as separate tasks, (6) active learning: continuously sample for re-labeling, (7) documentation: changelog for label definitions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "235",
   "q": "Your binary classifier works great on data from 2023 but terribly on 2024 data. The features haven't changed. What might explain this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Concept drift: the relationship between features and target changed, (2) prior probability shift: positive rate changed (e.g., fraud rate increased), (3) covariate shift: feature distributions shifted (new customer segments), (4) label shift: definition of positive class changed, (5) external factors: economic changes, competitor actions, (6) diagnosis: (a) compare feature distributions, (b) retrain on 2024 sample → does it improve?, (c) learning curve: does model need more 2024 data?, (7) solution: retrain with recent data, add time-aware features."
    },
    {
     "t": "p",
     "text": "**Theme: Final Advanced Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "236",
   "q": "You need to generate counterfactual explanations: \"Customer was denied. What would need to change for approval?\" How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Find nearest approved sample and show the differences, (2) DiCE (Diverse Counterfactual Explanations): generate actionable counterfactuals, (3) constraints: only change actionable features (can increase income, can't decrease age), (4) minimize number of changes (sparse counterfactuals), (5) realistic: changes should be plausible (income +$5K is plausible, +$500K isn't), (6) diverse: provide multiple paths to approval, (7) implementation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dice_ml import Dice\nexp = Dice(data, model)\ncounterfactuals = exp.generate_counterfactuals(\n    query_instance, total_CFs=5, desired_class=\"approved\"\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "237",
   "q": "Your model needs to handle catastrophic forgetting — retraining on new data makes it forget old patterns. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Elastic Weight Consolidation (EWC): penalize changing important weights, (2) replay/rehearsal: mix old data with new data during retraining, (3) progressive neural networks: freeze old network, add new capacity, (4) knowledge distillation: new model mimics old model on old data while learning new data, (5) curriculum learning: present data in meaningful order, (6) practical: keep a representative sample of old data, always include in retraining, (7) for production: this is why we retrain on combined old+new data, not just new data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "238",
   "q": "Your model needs to provide predictions for vastly different data regimes (e.g., small orders $1-$100 AND enterprise orders $100K-$1M). One model or two?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Consider: (1) feature importance likely differs between regimes, (2) relationships may be non-linear across regimes, (3) evaluation: error in $ vs. % matters differently, (4) options: (a) single model with regime indicator + interaction features, (b) two separate models with routing logic, (c) hierarchical model with shared base + regime-specific heads, (5) if relationships are truly different: two models are cleaner, (6) if just different scales: single model with log-transform may be sufficient, (7) always test: does one model or two perform better on each regime?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "239",
   "q": "You need to implement a feedback loop where model predictions influence the data the model trains on. How do you prevent bias amplification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Example: hiring model screens candidates → hired candidates generate training data → model reinforces its own biases. (2) counterfactual evaluation: estimate what would have happened with random selection, (3) exploration: randomly approve X% to maintain unbiased evaluation data, (4) inverse propensity weighting: weight samples by 1/P(selected by model), (5) offline evaluation: use randomized data for evaluation, (6) bias monitoring: track outcomes for borderline cases, (7) human audit of rejected cases, (8) periodic model-free evaluation to detect bias drift."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "240",
   "q": "Your team wants to use reinforcement learning from human feedback (RLHF) to improve a text generation system. What challenges do you expect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Reward model quality: garbage in, garbage out — need consistent human preferences, (2) reward hacking: model finds ways to get high reward without being truly better, (3) annotation consistency: different humans have different preferences — inter-annotator agreement, (4) mode collapse: model becomes very conservative to maximize expected reward, (5) training instability: PPO requires careful hyperparameter tuning, (6) scale: need thousands of human preference comparisons, (7) evaluation: automated metrics don't capture quality well — need ongoing human evaluation."
    },
    {
     "t": "p",
     "text": "**Theme: Practical Wisdom**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "241",
   "q": "What are the most common mistakes junior data scientists make?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Starting with complex models before understanding the data, (2) not establishing a proper baseline, (3) not splitting data correctly (leakage), (4) over-engineering features without domain understanding, (5) ignoring class imbalance, (6) presenting p-values without effect sizes, (7) not communicating results in business terms, (8) optimizing for wrong metric, (9) not testing in production conditions, (10) treating data science as purely technical (ignoring stakeholder management)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "242",
   "q": "What questions should you ask before starting any data science project?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) What business problem are we solving? (not \"build a model\"), (2) How will success be measured? (business KPI), (3) What data is available? Quality?, (4) What's the current baseline? (manual process, rules), (5) Who will use the model output? How?, (6) What's the timeline and budget?, (7) Are there regulatory/ethical constraints?, (8) What's the expected lifespan of this model?, (9) Who maintains it after deployment?, (10) Is there a simpler non-ML solution?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "243",
   "q": "When should you NOT use machine learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Simple rules work: if-else logic covers 95% of cases, (2) not enough data: < 100 labeled examples for the problem, (3) exact answers needed: ML provides probabilistic estimates, not guarantees, (4) full transparency required: some regulations need every decision fully traceable, (5) problem changes too fast: by the time model is built, problem has evolved, (6) ROI doesn't justify: development + maintenance cost > value of automation, (7) human judgment irreplaceable: ethical/moral decisions, (8) data doesn't exist: the features needed for prediction aren't available."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "244",
   "q": "How do you stay current with the rapidly evolving data science field?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Read selectively: follow 3-5 curated newsletters (The Batch, ML Ops Community), (2) papers: focus on applied papers relevant to your work, (3) conferences: NeurIPS, ICML summaries (not every paper), (4) Kaggle competitions: practical learning by doing, (5) side projects: implement new techniques on real problems, (6) community: local meetups, online forums (MLOps community), (7) book per quarter: one foundational or applied data science book, (8) internal knowledge sharing: present learnings to your team."
    },
    {
     "t": "p",
     "text": "**Theme: System Design for DS**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "245",
   "q": "Design a real-time personalization engine for an e-commerce website.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **User context**: session clicks, profile, past purchases → feature store (Redis), (2) **Candidate retrieval**: ANN index on product embeddings → top 100 candidates, (3) **Ranking model**: GBM or neural ranker scores each candidate using user × item features, (4) **Business rules**: filter out-of-stock, boost promotions, ensure diversity, (5) **Serving**: orchestration service calls feature store → retrieval → ranking → rules → response in <100ms, (6) **Training**: daily model refresh on previous day's interactions, (7) **A/B testing**: built-in experimentation framework, (8) **Monitoring**: CTR, conversion rate, latency, diversity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "246",
   "q": "Design a fraud detection system that processes 10,000 transactions per second.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Streaming**: Kafka ingestion → feature enrichment → model scoring, (2) **Features**: real-time (velocity, device, geo) from Redis + batch (user profile, history) from feature store, (3) **Model**: lightweight model (logistic regression) for all transactions + heavy model (GBM/neural) for flagged transactions, (4) **Decision engine**: score → threshold → block/allow/review, (5) **Feedback loop**: analyst decisions feed training data, (6) **Scale**: horizontally scaled stateless scoring service, (7) **Latency**: <50ms end-to-end for blocking decisions, (8) **Monitoring**: false positive rate, detection rate, model drift."
    },
    {
     "t": "p",
     "text": "**Theme: Remaining Practical Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "247",
   "q": "Your stakeholder wants \"AI\" but the problem is better solved with simple analytics. How do you guide them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Understand the actual need: \"what decision will this help you make?\", (2) propose the simplest solution: \"a weekly report showing X answers your question,\" (3) show the cost comparison: dashboard ($5K, 2 weeks) vs. ML model ($50K, 3 months), (4) underpromise, overdeliver: the \"boring\" solution is often more reliable, (5) progressive sophistication: \"let's start with analytics, add ML if the value justifies it,\" (6) reframe: \"this IS data science — the best solution, not the most complex.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "248",
   "q": "Your model performance varies significantly across different customer segments. Should you build one model or multiple?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Consider: (1) why does performance vary? Different feature importance? Different data volume?, (2) one model advantages: simpler to maintain, shared learning across segments, (3) multiple model advantages: tailored to each segment, can handle different feature spaces, (4) hybrid approach: one model with segment-specific features and interactions, (5) practical test: build one model with segment features → if performance gap persists, build separate models for underperforming segments, (6) maintenance cost: N models need N monitoring setups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "249",
   "q": "You discover that your well-performing model relies heavily on a single feature that might be removed due to privacy concerns. What's your contingency plan?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Immediately: evaluate model without that feature — how much does performance drop?, (2) find alternative features: what else captures similar signal?, (3) feature engineering: can you create an aggregate/derived feature that doesn't violate privacy but captures the pattern?, (4) build a \"backup model\": trained without the feature, validated and ready to deploy, (5) gradual transition: A/B test both models while you have the feature, (6) communicate: inform stakeholders of projected performance change, (7) document the dependency: feature importance analysis for all critical features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "250",
   "q": "What's your process for continuous improvement of a production ML model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Monitor: drift metrics, performance on labeled samples, business KPIs, (2) feedback loops: collect ground truth labels, user feedback, (3) error analysis: regularly review worst predictions, find patterns, (4) feature iteration: brainstorm and test new features quarterly, (5) model refresh: scheduled retraining (monthly/quarterly), (6) challenger models: continuously test new approaches in shadow mode, (7) data quality improvements: fix upstream issues as discovered, (8) stakeholder sync: quarterly review of model value and priorities, (9) document: maintain model changelog with metrics at each version."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
