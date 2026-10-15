/* ============================================================================
   PRACTICE P4.8 — Predict the Output / Scenarios · 8
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.8",
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
   "text": "Predict the Output / Scenarios · 8",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "176",
   "q": "You need to model both the expected value AND the uncertainty of your predictions. What methods provide uncertainty estimates?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Bayesian regression: posterior distribution over predictions, (2) Gaussian Process: mean + variance at each point, (3) Quantile regression: predict multiple quantiles (5th, 50th, 95th), (4) MC Dropout: approximate Bayesian inference via multiple forward passes, (5) Deep ensembles: variance across ensemble members, (6) NGBoost: natural gradient boosting predicts distribution parameters, (7) Conformal prediction: distribution-free prediction intervals with coverage guarantee, (8) choose based on: computational budget, calibration needs, interpretability requirements."
    },
    {
     "t": "p",
     "text": "**Theme: Real-World Case Studies**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "Netflix wants to decide: should they invest $200M in a new show? How does data science inform this decision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Content demand modeling: predict viewership based on genre, cast, concept (comparison to similar shows), (2) subscriber retention: how does new content affect churn? (engagement → retention), (3) acquisition: will this show attract new subscribers? (marketing appeal analysis), (4) competitive analysis: what are competitors releasing in the same genre/period?, (5) A/B test on promotional materials: which concept resonates most?, (6) financial model: predicted viewership × subscription value → ROI, (7) risk assessment: Monte Carlo simulation over viewership uncertainty, (8) portfolio effect: how does this show fill gaps in content library?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "Uber needs to predict rider demand 30 minutes into the future for driver positioning. Walk through your approach.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Spatial decomposition: city divided into hex zones, predict per zone, (2) features: historical demand (same hour/day last week), current demand, weather, events, time features, (3) temporal: LSTM or transformer on recent demand sequences per zone, (4) spatial: graph neural network capturing spatial relationships between zones, (5) exogenous: concerts, sports events, weather forecasts, transit disruptions, (6) resolution: 5-minute intervals × hex zones, (7) output: expected demand + uncertainty per zone, (8) optimization: position drivers in high-demand zones ahead of time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "A hospital wants to predict ICU patient mortality risk. What unique challenges and ethical considerations exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Technical: (1) time-series vital signs (irregular intervals), (2) missing data (lab tests not ordered = informative missingness), (3) small datasets (ICU patients are few), (4) high stakes: must be very reliable. Ethical: (5) don't use to deny care — use to prioritize resources, (6) bias: model should perform equally across demographics, (7) transparency: clinicians must understand and trust the model, (8) human-in-the-loop: model advises, doctor decides, (9) calibration critical: predicted 50% risk should mean 50% actual risk, (10) regulatory: FDA clearance required for clinical decision support."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "Amazon wants to optimize warehouse inventory levels. How does data science help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Demand forecasting: per-SKU, per-warehouse, daily/weekly, (2) lead time prediction: supplier reliability, shipping times, (3) safety stock optimization: buffer stock = f(demand variability, lead time variability, service level), (4) reorder point: when to order = expected demand during lead time + safety stock, (5) EOQ (Economic Order Quantity): minimize total cost (ordering + holding), (6) seasonal preparation: pre-stock for peaks, (7) slow-moving inventory: identify and reduce via markdown/clearance, (8) simulation: Monte Carlo for inventory scenarios."
    },
    {
     "t": "p",
     "text": "**Theme: Additional Practical Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "You built a model that performs well on your holdout test set but the business doesn't see improvement in KPIs. What could be wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model-business metric gap: model optimizes accuracy, business cares about revenue, (2) threshold choice: production threshold differs from evaluation threshold, (3) incomplete adoption: not all decisions use the model yet, (4) treatment effect: model identifies but intervention is ineffective, (5) counterfactual: without the model, would KPIs have been even worse?, (6) lag: business KPIs take time to respond, (7) cannibalization: model helps one area but hurts another, (8) instrumentation: are you measuring the right KPI correctly?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "Your model needs to handle multiple currencies, time zones, and measurement units in features. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Standardize early: convert all currencies to base currency (USD) using exchange rate at transaction time, (2) timestamps: convert to UTC, add local time features (hour_local, is_business_hours_local), (3) measurement units: normalize to SI units, (4) create features that are unit-invariant: ratios, percentages, z-scores, (5) exchange rate as a separate feature (captures economic environment), (6) purchasing power parity: $100 means different things in different countries, (7) document normalization decisions, (8) test: model should learn same patterns regardless of units."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "Your stakeholder wants a \"dashboard that updates in real-time.\" What questions do you ask to scope this correctly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) \"What decisions do you make based on this data?\" (determines what to show), (2) \"How quickly do you need to react?\" (true real-time vs. hourly vs. daily), (3) \"Who is the audience?\" (executive vs. operational vs. analyst), (4) \"What data sources are needed?\" (determines pipeline complexity), (5) \"What devices will you view on?\" (mobile, desktop, TV), (6) often \"real-time\" means \"not a monthly PDF\" — 15-minute refresh is usually fine, (7) start with a daily dashboard, prove value, then discuss real-time if truly needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "You need to predict rare events (< 0.01%) like security breaches. Standard classification approaches don't work. What alternatives do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Anomaly detection: learn \"normal,\" flag deviations (no need for labeled breaches), (2) one-class SVM: learn a boundary around normal data, (3) autoencoders: high reconstruction error = anomaly, (4) isolation forest: isolate anomalies via random splits, (5) change point detection: monitor streams for sudden changes, (6) combine: anomaly score + rule-based filters, (7) don't try to learn from 10 positive examples — use unsupervised methods, (8) if some labels exist: semi-supervised approach."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "You're asked to build a \"data-driven culture\" at a company with no analytics maturity. Where do you start?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Quick wins: solve a visible business problem with data (dashboard showing key metrics), (2) executive sponsorship: get a leader who champions data, (3) single source of truth: centralize key metrics, (4) self-service analytics: Looker, Tableau — let people explore data, (5) data literacy training: teach basic SQL, chart interpretation, (6) embed data in decisions: require data backing for proposals, (7) celebrate wins: share data-driven success stories, (8) incremental: don't build ML before basic analytics is solid, (9) measure: track decision quality and speed improvement."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Time Series Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "186",
   "q": "You need to forecast electricity demand for grid management. Peak demand is critical — underestimation causes blackouts. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Focus on tail risk: predict 95th/99th percentile, not just mean, (2) quantile regression: directly predict demand at different risk levels, (3) asymmetric loss function: heavily penalize underestimation, (4) ensemble of forecasts: take the maximum for safety, (5) weather integration: temperature is the strongest predictor (AC/heating), (6) special events: industrial schedules, holidays, sports events, (7) reserve margin: always over-provision by X% above forecast, (8) real-time adjustment: update forecast every 15 minutes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "Your multivariate time series has 50 variables potentially influencing each other. How do you capture these relationships?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) VAR (Vector Autoregression): model all variables jointly with lags, (2) Granger causality: test if one variable helps predict another, (3) dynamic factor models: find common factors driving multiple series, (4) graph neural network: model variables as nodes, learn relationships, (5) temporal fusion transformer: attention-based, handles multiple series with different characteristics, (6) dimensionality reduction: PCA on the multivariate series first, (7) start simple: analyze pairwise correlations, build complexity gradually."
    },
    {
     "t": "p",
     "text": "**Theme: Miscellaneous**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "How do you handle a feature that's normally distributed during training but becomes bimodal during production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Detect: KS test or PSI comparing distributions, (2) investigate cause: new user segment? Product change? Data collection change?, (3) if valid change: retrain including data from both modes, (4) if data quality issue: fix upstream, (5) model impact: evaluate predictions on each mode separately, (6) engineering solution: split feature into two indicators (mode membership + value within mode), (7) monitoring: add automated alerts for distribution shape changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "Your target variable has a natural lower bound of 0 but your regression model sometimes predicts values between 0 and 1 when the true value is exactly 0. How do you model this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is a zero-inflated or hurdle model problem: (1) Two-stage model: first predict if value is 0 (classification), then predict the positive value (regression), (2) Tobit regression: handles censoring at 0, (3) hurdle model: probability of zero × conditional distribution of positive values, (4) zero-inflated Poisson/Negative Binomial for count data, (5) tweedie distribution: naturally handles point mass at zero plus continuous positive values, (6) practical: multiply classification probability × regression prediction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "You need to validate that your model generalizes to a new geographic market before launching there. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Collect small sample of data from new market, (2) run model on new market data — compare metrics to training performance, (3) feature distribution analysis: are key features within training range?, (4) partial overlap analysis: which features transfer well vs. which are market-specific?, (5) fine-tuning: retrain with small sample from new market + major dataset, (6) staged rollout: launch with human oversight, monitor closely, (7) market-specific adaptations: different thresholds, rules, or model variants if needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "Your classification model needs to handle new, previously unseen categories at inference time (open-set recognition). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Threshold-based rejection: if max softmax probability < threshold → \"unknown,\" (2) OpenMAX: replace softmax with openmax calibrated for unknown rejection, (3) distance-based: if embedding distance to training data > threshold → unknown, (4) outlier detection layer: autoencoder + threshold on reconstruction error, (5) class hierarchy: classify to broader known parent category, (6) zero-shot: CLIP-like models can recognize unseen categories from descriptions, (7) monitoring: track frequency of \"unknown\" classifications — too high signals systematic issue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "Your pipeline computes features using a lookup table that's updated monthly. Between updates, new categories appear that aren't in the table. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Default values: map unknown categories to a meaningful default (global average), (2) hierarchical fallback: if specific category unknown → use parent category's value, (3) update frequency: increase to weekly/daily if new categories appear frequently, (4) real-time lookup: compute from raw data when table misses, (5) \"unknown\" category: assign a dedicated category for unseen values in training, (6) monitoring: alert when miss rate exceeds threshold, (7) backfill: when table updates, recompute historical predictions with correct values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "You need to choose between AUC-ROC and AUC-PR for your evaluation metric. When do you choose which?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** AUC-ROC: (1) balanced or moderately imbalanced classes, (2) equal importance of positive and negative classes, (3) comparing models across different class ratios. AUC-PR: (1) severe class imbalance (positive class < 5%), (2) you care primarily about positive class detection, (3) use cases: fraud, disease detection, anomaly detection. Why: AUC-ROC can be misleadingly high when negatives dominate (easy to classify). AUC-PR reveals whether the model actually identifies the rare positive class well."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "Your model outputs probabilities that don't match actual frequencies (says 80% but actual positive rate is 60%). How do you calibrate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Platt scaling: fit logistic regression on validation set logits, (2) isotonic regression: non-parametric mapping of scores to calibrated probabilities, (3) temperature scaling: single parameter T — divide logits by T before softmax, (4) histogram binning: bin predictions, replace with actual frequency per bin, (5) evaluation: reliability diagram (calibration curve), ECE, (6) caution: calibrate on held-out data, not training data, (7) tree models and neural nets typically need calibration; logistic regression usually doesn't."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "Your time series model uses the previous day's actual value as a feature. In production, this value arrives with a 2-hour delay. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use predicted value from day before instead of actual (recursive), (2) use last available actual value (which is 2 hours stale), (3) feature: \"hours since last actual update\" as additional context, (4) build a separate \"nowcast\" model for the delayed feature, (5) evaluate model performance with stale features (realistic evaluation), (6) during training: simulate the 2-hour delay to train with realistic feature availability, (7) never evaluate offline with perfect feature availability if production has delay."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "You need to implement online learning — the model updates with each new data point. When is this appropriate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Appropriate when: (1) data distribution changes continuously (financial markets), (2) new patterns emerge constantly (trending topics), (3) can't afford periodic batch retraining (real-time systems), (4) data arrives in streams. Algorithms: (5) SGD-based models (LogisticRegression with partial_fit), (6) Vowpal Wabbit: efficient online learning, (7) River: Python library for online ML. Caution: (8) susceptible to concept drift and adversarial data, (9) need validation: monitor performance continuously, (10) combine with periodic full retrain for stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "Your model runs fine in your development environment (Mac) but fails in production (Linux). What are common causes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Package version differences: pin all versions with requirements.txt or conda environment, (2) path separators: Mac uses /, same for Linux, but watch for hardcoded paths, (3) random seed behavior: may differ across OS, (4) floating point precision: depends on CPU/BLAS implementation, (5) locale: date parsing, number formatting (decimal point vs. comma), (6) case sensitivity: Mac filesystem is case-insensitive by default, Linux isn't, (7) line endings: \\n vs. \\r\\n in data files, (8) solution: develop in Docker that matches production environment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "You're asked to estimate ROI for a proposed ML project before building it. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Estimate potential value: what's the business impact of perfect predictions? (upper bound), (2) realistic performance: what accuracy is achievable? (based on similar problems), (3) value at realistic performance: expected improvement × business value per unit, (4) cost: development (team × months), infrastructure (compute, storage), ongoing maintenance, (5) calculate: ROI = (expected value - total cost) / total cost, (6) sensitivity analysis: ROI at optimistic/pessimistic accuracy levels, (7) non-financial benefits: speed, consistency, scalability, (8) comparison: what's the alternative? (manual process cost)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "Your model works well on standard business hours data but poorly on weekends/holidays. How do you adapt?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Analyze: are weekends genuinely different patterns or just low volume (high variance)?, (2) separate models: weekday model + weekend model, (3) time features: is_weekend, is_holiday as features in the model, (4) model interaction: feature × is_weekend interactions, (5) dynamic thresholds: different decision boundaries for different periods, (6) more data: accumulate more weekend samples if low volume is the issue, (7) transfer learning: share most patterns from weekday model, fine-tune for weekends."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "You're leaving a project and need to hand it off to another data scientist. What documentation and process do you provide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) README: project overview, business context, key decisions and rationale, (2) architecture diagram: data flow, model pipeline, deployment, (3) code walkthrough: 1-2 hour pairing session, (4) model card: performance, limitations, monitoring, (5) runbook: how to retrain, debug common issues, deploy, (6) data dictionary: feature definitions, sources, update frequencies, (7) known issues and tech debt, (8) stakeholder map: who to contact for what, (9) access and credentials setup, (10) ongoing tasks: scheduled retraining, monitoring alerts to watch."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
