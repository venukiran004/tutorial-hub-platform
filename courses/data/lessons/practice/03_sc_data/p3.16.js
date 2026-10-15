/* ============================================================================
   PRACTICE P3.16 — Predict the Output / Scenarios · 16
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.16",
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
   "text": "Predict the Output / Scenarios · 16",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "376",
   "q": "Tell me about a data science project where you had to deal with messy data. How did you handle it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Structure: (1) describe the business problem briefly, (2) specific data issues: \"40% missing values in key feature, inconsistent formats across 3 source systems, daily duplicates,\" (3) your approach: \"I built a data quality scoring system, used KNN imputation for missing demographics, created a standardization pipeline for addresses,\" (4) quantify impact: \"improved data completeness from 60% to 95%, model accuracy increased 7%,\" (5) what you learned: \"invested in upstream data quality monitoring to prevent issues.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "377",
   "q": "How do you communicate a negative result to stakeholders (e.g., \"the model doesn't work\")?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Frame constructively: (1) \"we tested the hypothesis that X predicts Y — the data doesn't support this,\" (2) share what you learned: \"we discovered that feature A is more predictive than expected,\" (3) provide alternatives: \"while a predictive model isn't viable, we can use rule-based logic for 70% of cases,\" (4) quantify the effort saved: \"we now know to invest elsewhere,\" (5) be honest but solution-oriented, (6) negative results are valuable — they prevent wasted investment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "378",
   "q": "A product manager asks for a \"quick model\" tomorrow. The request would take 2 weeks. How do you set expectations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Understand the actual need: \"what decision does this support? when?\", (2) offer alternatives: \"I can give you a rough analysis by tomorrow using simple heuristics, but a reliable model needs 2 weeks,\" (3) break down the work: \"data prep: 3 days, modeling: 4 days, validation: 3 days, deployment: 4 days,\" (4) define MVP: what's the minimum viable version?, (5) risks of rushing: \"a quick model could give misleading results and damage trust,\" (6) propose a phased approach: quick-and-dirty → refined."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "379",
   "q": "Explain overfitting to a non-technical person.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"Imagine studying for a test by memorizing every practice question word-for-word. You'd ace the practice test but struggle with new questions because you memorized answers instead of understanding concepts. That's what happens when a model overfits — it memorizes the training data patterns too closely, including noise and coincidences, so it performs poorly on new data. We prevent this by testing on data the model hasn't seen, and by keeping the model simple enough to learn general patterns rather than memorizing specifics.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "380",
   "q": "How do you prioritize between multiple data science project requests?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Framework: (1) business impact: which project drives the most value (revenue, cost savings)?, (2) feasibility: do we have the data, skills, and infrastructure?, (3) time to value: quick wins vs. long-term investments, (4) strategic alignment: does it support company goals?, (5) urgency: is there a deadline or competitive pressure?, (6) dependencies: does anything unlock other projects? Score each project on a 2×2 matrix: impact × feasibility. Start with high-impact, high-feasibility projects."
    },
    {
     "t": "p",
     "text": "**Theme: Pandas & Python Data Manipulation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "381",
   "q": "You have a DataFrame with 100 columns. You need to find which columns have more than 10% missing values. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "missing_pct = df.isnull().mean()\nhigh_missing = missing_pct[missing_pct > 0.10].sort_values(ascending=False)\nprint(f\"{len(high_missing)} columns with >10% missing:\")\nprint(high_missing)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "382",
   "q": "You need to apply different aggregations to different columns in a groupby. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = df.groupby('category').agg(\n    total_revenue=('revenue', 'sum'),\n    avg_price=('price', 'mean'),\n    num_transactions=('transaction_id', 'count'),\n    unique_customers=('customer_id', 'nunique'),\n    max_quantity=('quantity', 'max')\n).reset_index()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "383",
   "q": "You need to create a lag feature (previous month's value) for each customer. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.sort_values(['customer_id', 'month'])\ndf['prev_month_revenue'] = df.groupby('customer_id')['revenue'].shift(1)\ndf['revenue_change'] = df['revenue'] - df['prev_month_revenue']\ndf['revenue_pct_change'] = df.groupby('customer_id')['revenue'].pct_change()\n# Rolling features\ndf['rolling_3m_avg'] = df.groupby('customer_id')['revenue'].transform(\n    lambda x: x.rolling(3, min_periods=1).mean()\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "384",
   "q": "Your DataFrame has 50 million rows and operations are slow. How do you speed up pandas?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use appropriate dtypes: `df['category_col'] = df['category_col'].astype('category')`, (2) downcast numerics: `pd.to_numeric(df['col'], downcast='integer')`, (3) use vectorized operations, avoid iterrows/apply, (4) use Polars for 10-100x speedup on large data, (5) read only needed columns: `pd.read_csv(file, usecols=['a','b'])`, (6) use Parquet format instead of CSV, (7) chunk processing for memory efficiency, (8) use numba or numpy for computation-heavy operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "385",
   "q": "You need to reshape data from wide to long format and vice versa. When and how?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Wide to long: `pd.melt(df, id_vars=['customer'], value_vars=['jan','feb','mar'], var_name='month', value_name='revenue')`. Long to wide: `df.pivot_table(index='customer', columns='month', values='revenue', aggfunc='sum')`. Use wide for: human-readable reports, models requiring fixed columns. Use long for: visualization (seaborn), flexible aggregation, database storage."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Feature Engineering**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "386",
   "q": "Your e-commerce model needs behavioral features but you only have raw clickstream data. What features do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Session-level: (1) session duration, (2) pages viewed, (3) unique categories viewed, (4) add-to-cart rate, (5) cart abandonment indicator. User-level: (6) visit frequency, (7) average session duration, (8) purchase conversion rate, (9) days since last visit, (10) device diversity (mobile + desktop). Engagement: (11) search query count, (12) review reading time, (13) wishlist activity, (14) return rate, (15) average time between purchases. Recency: (16) days since last purchase, last search, last page view."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "387",
   "q": "You have a \"product description\" text field. What numerical features can you extract for a tabular model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Text length (chars, words, sentences), (2) TF-IDF top features, (3) sentiment score, (4) readability score (Flesch-Kincaid), (5) keyword presence indicators, (6) named entity counts, (7) topic distribution from LDA, (8) sentence embedding (average/CLS from BERT → 768-dim vector), (9) number of adjectives/superlatives, (10) price mentions, (11) brand mentions, (12) exclamation count, (13) uppercase ratio, (14) special character ratio."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "388",
   "q": "Your model uses \"income\" and \"city\" features. What interaction features help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) income_percentile_in_city: relative income within city, (2) income / city_median_income: ratio showing relative affluence, (3) income × city_cost_of_living: purchasing power, (4) income_bucket × city (create a cross feature), (5) city_income_quintile: which income quintile within city, (6) is_above_city_median: binary indicator. These capture that $100K in NYC means something different than $100K in a small town. Tree-based models can learn some interactions, but explicit features help linear models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "389",
   "q": "You need features that capture temporal patterns from a user's transaction history. What's your feature engineering strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Recency: days since last transaction, (2) Frequency: transactions per week/month (multiple windows), (3) Monetary: average, total, max, min amount, (4) Trend: is spending increasing or decreasing? (slope of last N transactions), (5) Regularity: std of inter-transaction time (regular vs. bursty), (6) Time patterns: preferred day-of-week, time-of-day, (7) Change features: current vs. historical averages, (8) Sequence: last N transaction types as a pattern, (9) Acceleration: change in frequency/amount over time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "390",
   "q": "You need to encode cyclical features (hour of day, day of week, month). Why is simple integer encoding wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Integer encoding implies 23:00 is far from 0:00 (distance=23), but they're actually 1 hour apart. Fix: cyclical encoding using sin/cos:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)\ndf['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)\ndf['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)\ndf['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)\ndf['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)\ndf['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)"
    },
    {
     "t": "p",
     "text": "This preserves the circular nature — midnight is close to 11 PM."
    },
    {
     "t": "p",
     "text": "**Theme: Model Selection & Strategy**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "391",
   "q": "You're starting a new ML project. What's your model selection strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Baseline first: simple model (logistic regression, decision tree) or heuristic, (2) establish lower bound on performance, (3) try 3-4 model families: linear, tree-based, SVM, neural net, (4) use cross-validation for comparison, (5) hyperparameter tuning only for top 2-3 models, (6) consider ensemble of best models, (7) final selection criteria: accuracy, interpretability, latency, maintenance cost, (8) document model selection rationale, (9) principle: start simple, add complexity only if it provides meaningful improvement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "392",
   "q": "Your linear model achieves 80% accuracy. Adding trees gets 85%. Adding neural nets gets 86%. Which do you deploy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Consider the full picture: (1) 80% → 85% (trees): +5% from moderate increase in complexity — likely worth it, (2) 85% → 86% (neural nets): +1% for significant increase in complexity — often not worth it, (3) evaluate business impact of each % improvement, (4) consider operational costs: neural nets need GPU, more monitoring, harder to debug, (5) pragmatic choice: usually deploy the tree model unless 86% has meaningful business impact that justifies complexity, (6) A/B test to confirm the difference matters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "393",
   "q": "When should you use deep learning vs. traditional ML for tabular data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Traditional ML (XGBoost/LightGBM) generally wins for tabular data because: (1) better with limited data (<100K rows), (2) handles mixed feature types naturally, (3) less hyperparameter sensitivity, (4) faster training and inference, (5) more interpretable. Consider deep learning when: (1) very large datasets (>1M rows), (2) complex feature interactions, (3) multi-modal data (tabular + text/images), (4) representation learning is needed, (5) TabNet or FT-Transformer for state-of-the-art tabular DL."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "394",
   "q": "Your model needs to run on edge devices (mobile phones, IoT). What constraints affect model selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Model size: limited to MBs (not GBs), (2) inference time: milliseconds budget, (3) RAM: limited memory, (4) no GPU: CPU-only inference, (5) battery: computation drains battery. Model options: (1) small decision trees or random forests, (2) quantized neural networks (INT8), (3) MobileNet/EfficientNet for vision, (4) TensorFlow Lite or ONNX Runtime Mobile, (5) on-device feature engineering must be simple, (6) consider hybrid: simple model on device, complex model via API for uncertain cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "395",
   "q": "Your model performs well on all standard metrics but users complain about specific types of errors. How do you investigate and fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Collect user complaints and categorize error types, (2) analyze: are errors concentrated in a specific data segment?, (3) create custom metrics for the error types users care about, (4) slice analysis: evaluate on subgroups where complaints originate, (5) add features that distinguish the problematic segment, (6) custom loss function: penalize the specific error type more, (7) human-in-the-loop for the problematic segment, (8) separate model for the segment, (9) user feedback loop: incorporate corrections into retraining."
    },
    {
     "t": "p",
     "text": "**Theme: Final Practical Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "396",
   "q": "You discover a bug in your feature pipeline that's been serving incorrect features for 2 weeks. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Immediate: (1) assess impact: how wrong are the features? how many predictions affected?, (2) fix the bug, (3) if predictions were significantly wrong: notify stakeholders, quantify business impact. Recovery: (4) backfill correct features for the affected period, (5) evaluate: did the model handle incorrect features gracefully or catastrophically?, (6) consider retraining model without the corrupted period. Prevention: (7) add integration tests for feature values, (8) data quality monitoring with bounds checking, (9) postmortem to prevent recurrence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "397",
   "q": "Your production model suddenly starts predicting the same class for every input. What happened?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Emergency debugging: (1) check if model was recently redeployed (wrong model version?), (2) check input features: are they all nulls/zeros? (pipeline failure), (3) check feature distributions: are they within expected range?, (4) run the model on known-good test examples — does it work?, (5) check for infrastructure issues: model file corruption, memory errors, (6) check preprocessing: is normalization using wrong statistics?, (7) immediate fix: rollback to previous model version, then investigate, (8) add monitoring for prediction distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "398",
   "q": "Your team is growing from 2 to 8 data scientists. How do you establish good practices?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Code standards: style guide, code review process, (2) version control: Git workflow (feature branches, PRs), (3) shared development environment: Docker, shared compute, (4) experiment tracking: MLflow for all experiments, (5) documentation: project templates, model cards, (6) data access governance: who can access what, (7) weekly knowledge sharing sessions, (8) project management: sprint planning, backlog prioritization, (9) CI/CD pipeline for model deployment, (10) mentoring: pair junior with senior, (11) shared libraries for common tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "399",
   "q": "You need to handle a production incident where model predictions are causing customer complaints. Walk through your response.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Acknowledge and assess: how many customers affected? revenue impact? (2) Triage: is it a model issue, data issue, or infrastructure issue?, (3) Immediate mitigation: switch to fallback model or rule-based system, (4) communicate: update stakeholders on impact and ETA for fix, (5) root cause analysis: identify what changed (data, model, config), (6) fix and validate: test fix on historical data, (7) deploy fix with monitoring, (8) customer remediation: notify affected customers, correct any wrong actions, (9) postmortem: document, implement preventive measures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "400",
   "q": "Looking back at your data science career, what's the most important lesson you've learned?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Common strong answers: (1) \"Start simple — a basic model with good data beats a complex model with bad data,\" (2) \"Communication matters as much as technical skills — a model that stakeholders don't trust or understand doesn't get used,\" (3) \"Spend 80% of time on data quality, feature engineering, and problem framing — not model architecture,\" (4) \"Measure business impact, not just model metrics,\" (5) \"Build for production from day one — prototype quality code creates technical debt,\" (6) \"The best model is the one that's actually deployed and monitored.\""
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
