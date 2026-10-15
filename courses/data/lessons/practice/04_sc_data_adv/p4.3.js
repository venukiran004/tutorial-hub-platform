/* ============================================================================
   PRACTICE P4.3 — Predict the Output / Scenarios · 3
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.3",
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
   "text": "Predict the Output / Scenarios · 3",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "Design an end-to-end ML system for predicting food delivery time. Walk through every component.",
   "body": [
    {
     "t": "p",
     "text": "**Theme: End-to-End ML System Design**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) **Data collection**: order details, restaurant prep times, driver GPS, traffic, weather API. (2) **Feature store**: online (real-time traffic, driver location) + offline (historical restaurant speed, area demand). (3) **Features**: distance, restaurant avg prep time, hour_of_day, weather, current order volume, driver ratings. (4) **Model**: gradient boosting regression → predicted minutes. (5) **Serving**: REST API behind load balancer, <100ms latency. (6) **Display**: show range \"30-40 min\" using quantile regression. (7) **Monitoring**: actual vs. predicted delivery time, MAE by restaurant/zone. (8) **Retraining**: weekly on rolling 3-month window. (9) **Feedback loop**: actual delivery times flow back as labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Design a system to detect and block spam messages in real-time for a messaging platform.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Multi-layer**: rule-based (keyword blocklist, URL patterns) + ML model. (2) **Features**: message text (TF-IDF, embeddings), sender account age, message frequency, recipient count, URL presence, image analysis. (3) **Model**: fast model for all messages (logistic regression, <5ms) + complex model for uncertain cases (BERT, <50ms). (4) **Actions**: block, flag for review, or allow. (5) **Feedback**: user reports feed training data. (6) **Adversarial**: spammers adapt — retrain frequently, monitor for new patterns. (7) **False positive handling**: review queue, user appeals. (8) **Scale**: millions of messages/minute — model must be efficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Design a pricing optimization system for a ride-sharing company.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Objective**: maximize revenue while maintaining rider satisfaction and driver supply. (2) **Demand forecasting**: predict ride requests by zone/time. (3) **Supply forecasting**: predict available drivers by zone/time. (4) **Surge pricing**: when demand > supply, increase prices. (5) **Price elasticity model**: how demand changes with price per segment. (6) **Constraints**: max surge multiplier (PR/regulatory), minimum driver earnings, area-specific regulations. (7) **A/B testing**: test pricing strategies against control. (8) **Real-time**: adjust every 5 minutes per geo-zone. (9) **Monitor**: rider cancellation rates, driver utilization, wait times, revenue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Design a content moderation system for a social media platform.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Multi-modal**: text (hate speech, harassment) + image (nudity, violence) + video (combined). (2) **Architecture**: fast pre-filter (rule-based, keyword matching) → ML classifier → human review queue. (3) **Text model**: fine-tuned BERT for toxicity, context-aware (sarcasm, quotes). (4) **Image model**: CNN for NSFW detection, object detection for weapons. (5) **Thresholds**: auto-remove (high confidence) vs. flag for review (medium confidence) vs. allow (low confidence). (6) **Appeals**: users can contest, human reviewers decide. (7) **Challenges**: cultural context, evolving language, adversarial evasion. (8) **Scale**: real-time for uploads, batch for historical content scanning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Design an ML system for a hospital to predict patient no-shows for appointments.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) **Data**: appointment history, patient demographics, appointment details (type, time, provider), weather. (2) **Features**: patient's historical no-show rate, days since scheduling, day of week, distance to hospital, appointment type, insurance type, number of prior reschedules. (3) **Model**: gradient boosting, predict P(no-show). (4) **Action**: high-risk → send reminders (SMS, call), double-book slots, offer telehealth alternative. (5) **Evaluation**: not just accuracy but impact on schedule utilization. (6) **Fairness**: ensure reminder strategy doesn't disadvantage any group. (7) **Business metric**: slot utilization increase, revenue captured."
    },
    {
     "t": "p",
     "text": "**Theme: Bayesian Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "When should you use Bayesian methods vs. frequentist methods for A/B testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bayesian when: (1) you want to express results as probabilities (\"95% probability variant B is better\"), (2) incorporating prior knowledge (previous similar tests), (3) continuous monitoring without p-value inflation, (4) decision-making focus (\"what's the expected revenue loss from choosing wrong?\"), (5) small sample sizes where priors help. Frequentist when: (1) regulatory or publication requirements expect p-values, (2) no meaningful prior information, (3) large sample size (priors become irrelevant), (4) simple hypothesis testing with well-defined stopping rules. In practice: Bayesian is increasingly preferred for business A/B testing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "You're estimating customer lifetime value using Bayesian methods. What priors do you choose and why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Average spend per visit: Gamma prior (positive, right-skewed) — parameterized from historical average, (2) purchase frequency: Poisson/Gamma (count data), (3) customer lifetime: Exponential/Weibull prior (time-to-event), (4) BG/NBD model: Beta-Geometric for churn, Negative Binomial for frequency. Why Bayesian?: (a) posterior for each customer → personalized predictions, (b) uncertainty quantification → confidence in each estimate, (c) regularization through priors → stable estimates for new customers with few transactions, (d) prior strength reflects how much we trust historical data vs. individual behavior."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Your Bayesian model has very diffuse (uninformative) priors and the posterior looks strange. What might be wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Diffuse priors in high dimensions can create problematic posteriors (masses at extreme values), (2) improper priors: flat priors may not integrate to 1, causing MCMC issues, (3) likelihood may be multimodal — diffuse priors don't constrain sampling, (4) prior-posterior conflict: data conflicts with flat prior assumptions, (5) parameterization issues: use non-centered parameterization for hierarchical models. Fixes: (a) use weakly informative priors instead (constrain to reasonable range), (b) prior predictive checks: simulate data from prior, check if it's reasonable, (c) check MCMC diagnostics: divergences, R-hat, effective sample size."
    },
    {
     "t": "p",
     "text": "**Theme: Computer Vision Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "You need to build a quality inspection system for a manufacturing line. Defective items are 2% of production. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Anomaly detection approach: learn \"normal\" appearance, flag deviations — good when defects are diverse, (2) classification approach: normal vs. defect types — need labeled examples per defect type, (3) data collection: high-res cameras at consistent angles/lighting, (4) data augmentation: rotate, brightness variation, simulate defects on normal images, (5) architecture: EfficientNet or ResNet backbone, fine-tuned, (6) metrics: recall is critical (don't miss defects), (7) false positive handling: separate human review station for flagged items, (8) edge deployment: inference on-line with low latency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Your image classification model works on clean images but fails on real-world photos (different angles, lighting, backgrounds). How do you improve robustness?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data augmentation: random rotation, crop, color jitter, Gaussian blur, occlusion, (2) domain-specific augmentation: simulate real conditions, (3) training on diverse data: collect images from multiple sources, conditions, (4) test-time augmentation (TTA): predict on multiple augmented versions, average, (5) adversarial training: train on adversarially perturbed images, (6) style transfer augmentation: apply different visual styles to training images, (7) normalize preprocessing: standardize brightness, contrast, (8) ensemble of models trained on different augmentations."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Missing Data**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "You have a dataset where a feature is missing for 40% of records but it's the most important predictor. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Investigate missingness mechanism: MCAR, MAR, or MNAR?, (2) if MNAR (missingness is informative): create \"is_missing\" indicator feature AND impute, (3) multiple imputation (MICE): generate multiple imputed datasets, fit models, pool results, (4) for tree models: some implementations handle missing natively (XGBoost, LightGBM), (5) consider: can you obtain the missing data from another source?, (6) build two models: one with the feature (60% of data), one without (all data), blend predictions, (7) KNN imputation using correlated features, (8) deep learning: denoising autoencoders can learn to impute."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "Your dataset has block-missing data (when feature A is missing, features B and C are also always missing). How does this affect imputation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Block missingness usually indicates a structural reason: (1) some data sources didn't capture these features, (2) monotone missingness pattern: features arrive in stages, (3) standard MICE imputation may not capture this structure. Approaches: (1) treat each block as a separate data source, impute within blocks, (2) use the pattern: indicator for \"source X available\" as a feature, (3) train models separately on each complete block and ensemble, (4) matrix completion methods that exploit block structure, (5) imputation models should use only available features to predict missing ones."
    },
    {
     "t": "p",
     "text": "**Theme: Optimization & Operations Research**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "Your company needs to decide where to open 5 new warehouses to minimize average delivery distance. How do you solve this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Facility location problem: (1) formulate as integer programming: minimize sum of (customer × warehouse distance × demand), subject to capacity constraints, (2) K-medoids clustering: cluster customer locations, use medoid as warehouse location, (3) mixed-integer programming solver: PuLP, Gurobi, OR-Tools, (4) features: customer density, demand patterns, transportation infrastructure, (5) constraints: budget, minimum distance between warehouses, zoning regulations, (6) sensitivity analysis: how does the solution change with different assumptions?, (7) multi-objective: balance cost, delivery speed, and risk (natural disasters)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "You need to schedule nurses for a hospital with complex constraints (skills, shifts, preferences, regulations). How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Constraint satisfaction / optimization problem: (1) hard constraints: minimum staffing levels, maximum hours per week, required skills per shift, rest time between shifts, (2) soft constraints: nurse preferences, fairness in shift distribution, (3) formulate as mixed-integer programming (MIP), (4) OR-Tools CP-SAT solver for constraint programming, (5) genetic algorithms for large problem instances, (6) rolling horizon: solve one week at a time, carry forward, (7) feedback: nurses rate schedules, improve soft constraints, (8) real-time adjustment: handle sick calls and swaps."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Evaluation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Your model has high AUC-ROC (0.95) but low AUC-PR (0.60). What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This typically indicates severe class imbalance: (1) AUC-ROC includes true negatives — easy to get right when negatives dominate, (2) AUC-PR focuses on positive class performance — more honest for imbalanced data, (3) the model assigns higher scores to positives on average (decent ranking → good AUC-ROC), (4) but many negatives also get high scores (many false positives → low precision → low AUC-PR). Action: (1) focus on AUC-PR for imbalanced problems, (2) improve precision: better features, cost-sensitive learning, threshold tuning, (3) AUC-ROC can be misleading when positive class is rare."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "You need to evaluate a model where the cost of errors varies by instance (e.g., high-value customers vs. low-value). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Instance-weighted metrics: weight each prediction by its business value, (2) weighted accuracy: sum(correct × value) / sum(value), (3) cost matrix evaluation: total_cost = Σ cost(true_class, predicted_class) per instance, (4) for ranking: sort by model score, compute cumulative value captured at each threshold, (5) lift chart: compare value captured vs. random selection, (6) profit curve: plot profit vs. fraction of customers acting on, (7) business simulation: simulate using model decisions with real cost structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "Your regression model has low MAE but some predictions have enormous errors (100x the MAE). How do you evaluate and fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Evaluation: (1) look beyond mean: percentile errors (p90, p95, p99 error), (2) plot residual distribution — heavy tails indicate extreme errors, (3) identify: what characterizes samples with huge errors?, (4) log-transform target if errors are multiplicative, (5) robust metrics: median absolute error, trimmed mean error. Fix: (1) feature engineering for the problematic subgroup, (2) outlier detection: flag extreme predictions for human review, (3) quantile regression: predict bounds to catch extremes, (4) separate model for the subgroup with large errors, (5) winsorize predictions: cap at reasonable bounds."
    },
    {
     "t": "p",
     "text": "**Theme: Data Science for Marketing**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "You need to build a customer segmentation for a marketing team. They want 4-6 \"intuitive\" segments. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Features: RFM (recency, frequency, monetary), engagement, demographics, (2) K-means clustering with k=4,5,6 — evaluate silhouette scores, (3) profile each cluster: what makes each group different?, (4) name them meaningfully: \"Loyal High-Spenders,\" \"At-Risk,\" \"New Explorers,\" \"Bargain Hunters,\" (5) visualize: radar charts showing each segment's profile, (6) validate with stakeholders: \"do these groups match your intuition?\", (7) actionability: each segment should have a distinct marketing strategy, (8) size: segments shouldn't be too small (<5%) or too large (>40%), (9) stability: re-run monthly, track segment migrations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "Your marketing team runs weekly email campaigns and wants to know the optimal send time per customer. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data: email send time, open/click timestamps, customer timezone, (2) per-customer analysis: historical open rates by hour/day, (3) cold start: use segment-level optimal times for new subscribers, (4) multi-armed bandit: randomly vary send times, learn optimal per customer, (5) features: timezone, job type (B2B → weekday mornings, B2C → evenings/weekends), (6) model: predict P(open | send_time, customer_features), (7) optimize: choose send_time maximizing P(open), (8) constraints: don't send at 3 AM, batch sends for email infrastructure, (9) A/B test: personalized times vs. fixed time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Your attribution model says \"last touch\" channel gets all the credit. Marketing disagrees. How do you build a better attribution model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Last-touch is simplistic: ignores earlier touchpoints that built awareness. Better models: (2) linear attribution: equal credit to all touchpoints, (3) time-decay: more credit to recent touches, (4) position-based (U-shaped): 40% first touch, 40% last touch, 20% middle, (5) data-driven (Markov chain): compute removal effect — how much conversion drops if we remove each channel, (6) Shapley value attribution: cooperative game theory approach, (7) incrementality testing: A/B test each channel by holdout, (8) multi-touch attribution requires tracking user journeys across channels (cookies, login IDs)."
    },
    {
     "t": "p",
     "text": "**Theme: Handling Noise & Uncertainty**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "Your labels are noisy (annotators disagree 30% of the time on the correct label). How do you train a reliable model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multiple annotators: collect 3-5 labels per instance, use majority vote, (2) annotator quality weighting: weight annotations by annotator accuracy (Dawid-Skene model), (3) label smoothing: instead of hard 0/1, use soft labels (0.7/0.3 for uncertain cases), (4) confident learning (cleanlab): detect and correct label errors, (5) noise-robust loss functions: symmetric cross-entropy, GCE loss, (6) train with bootstrapping: iteratively clean labels using model predictions, (7) inter-annotator agreement as instance weight: weight uncertain examples less, (8) adjudication: expert reviews disputed labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "Your sensor data has measurement noise (±5% random error). How does this affect your model and what do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature noise: smoothing (moving average, Savitzky-Golay filter), (2) multiple sensor readings: average to reduce noise, (3) Kalman filter: optimal state estimation from noisy measurements, (4) noise-aware modeling: include measurement uncertainty in model (Gaussian processes), (5) regularization: prevents fitting to noise, (6) feature engineering: aggregate features (hourly averages) reduce noise, (7) ensemble methods: naturally robust to moderate noise, (8) data augmentation: add Gaussian noise during training for robustness."
    },
    {
     "t": "p",
     "text": "**Theme: Federated & Privacy-Preserving ML**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "Your company has data in 3 regions with different privacy laws (US, EU, China). How do you build a global model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Options: (1) Federated learning: train locally in each region, aggregate model updates centrally, (2) Data minimization: only move anonymized/aggregated data, (3) Region-specific models: separate model per region (may sacrifice global patterns), (4) Differential privacy: add noise to ensure individual privacy, share noisy statistics, (5) Synthetic data: generate privacy-safe synthetic data in each region, combine centrally, (6) Secure computation: multi-party computation allows joint training without sharing raw data, (7) Compliance: GDPR, CCPA, PIPL have different requirements — legal review essential."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "How do you implement differential privacy in a gradient boosting model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) DP-GBM: add calibrated Laplace/Gaussian noise to leaf values, (2) limit tree depth (reduces sensitivity), (3) clip gradient contributions per sample (bounded sensitivity), (4) privacy budget (ε): total noise budget across all trees — each tree uses ε/n_trees, (5) subsampling: use random subset per tree (amplification via subsampling), (6) practical implementations: IBM's diffprivlib, OpenDP, Google's DP library, (7) tradeoff: more privacy (smaller ε) → more noise → lower accuracy, (8) evaluate: publish (ε, δ)-DP guarantee alongside model metrics."
    },
    {
     "t": "p",
     "text": "**Theme: Model Compression**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Your deep learning model is 500MB and needs to run on mobile phones (50MB limit). How do you compress it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pruning: remove low-magnitude weights (50-90% sparsity with minimal accuracy loss), (2) quantization: FP32 → INT8 (4x smaller, 2-3x faster), (3) knowledge distillation: train smaller \"student\" model to mimic large \"teacher,\" (4) architecture efficiency: replace with MobileNet, EfficientNet-lite, (5) weight sharing: cluster weights and share across parameters, (6) tensor decomposition: low-rank factorization of weight matrices, (7) ONNX Runtime Mobile / TensorFlow Lite for optimized mobile inference, (8) progressive: prune → quantize → distill in sequence for maximum compression."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
