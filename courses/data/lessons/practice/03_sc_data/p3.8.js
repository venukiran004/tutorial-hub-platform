/* ============================================================================
   PRACTICE P3.8 — Predict the Output / Scenarios · 8
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.8",
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
   "text": "Predict the Output / Scenarios · 8",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "176",
   "q": "Your feature \"days_since_last_purchase\" has 30% null values for new customers. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Create a binary indicator \"is_new_customer\" = 1 when null, (2) impute with a large value (e.g., 999) meaning \"never purchased,\" (3) use -1 as a sentinel value for tree-based models (they handle this naturally), (4) create a separate \"customer_tenure\" feature, (5) segment models: one for new customers, one for returning, (6) never impute with mean/median — that would be misleading."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "You need to encode a categorical variable with 5,000 unique values (product SKUs). One-hot encoding creates too many features. What alternatives exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Target encoding: replace each SKU with mean of target variable (with smoothing), (2) frequency encoding: replace with occurrence count, (3) embedding: learn dense representation in neural network, (4) hash encoding: map to fixed number of bins (e.g., 100), (5) group into higher-level categories (product type, brand), (6) cluster SKUs by behavior and use cluster ID, (7) binary encoding (log2(5000) ≈ 13 columns)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "Your model uses \"age\" as a feature, but the relationship with the target is non-linear (U-shaped). How do you capture this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Create polynomial features: age², age³, (2) bin age into groups (18-25, 26-35, etc.) and one-hot encode, (3) use spline transformation, (4) apply B-spline or natural spline basis, (5) tree-based models handle this automatically, (6) create interaction terms: age × other_features, (7) use GAM (Generalized Additive Model) for automatic non-linear effects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "You're told a feature is \"important\" by domain experts but your feature selection algorithm removes it. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check if the feature is correlated with another included feature (redundant but not unimportant), (2) check if the feature importance is context-dependent (interactions), (3) test model performance with and without the feature, (4) domain knowledge often captures causality that correlation-based selection misses, (5) keep the feature — it may improve model robustness even if training metrics don't improve, (6) discuss with experts to understand the causal mechanism."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "You have a geospatial feature (latitude, longitude). How do you engineer useful features from it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Distance to key locations (city center, competitor, nearest store), (2) geohash for grid-based aggregation, (3) cluster coordinates into regions using K-means, (4) population density from census data, (5) urban/suburban/rural classification, (6) distance to nearest point of interest, (7) H3 hexagonal grid indexing, (8) local statistics: average target value in radius, (9) driving time/distance (not Euclidean) to relevant locations."
    },
    {
     "t": "p",
     "text": "**Theme: Data Quality & Cleaning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "Your dataset has duplicate rows (identical across all columns). Beyond removing them, what else should you investigate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Why duplicates exist — ETL bug? Multiple source systems? (2) Are duplicates concentrated in specific time periods or sources? (3) Check if removing duplicates changes class distribution, (4) verify downstream reports haven't been inflated by duplicates, (5) add deduplication to the pipeline to prevent recurrence, (6) check if \"duplicates\" are actually valid repeated events (e.g., repeat purchases)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "You receive a dataset where 40% of values are missing for a critical feature. What's your decision framework?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decision tree: (1) Is missingness random (MCAR), related to observed data (MAR), or related to unobserved data (MNAR)? (2) If MCAR: simple imputation (mean/median/mode) is fine, (3) if MAR: use multiple imputation or model-based methods (KNN, MICE), (4) if MNAR: the missingness itself is informative — create indicator variable, (5) at 40% missing, also consider: dropping the feature, using a proxy feature, or getting the data from another source."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "Your data has outliers in multiple features simultaneously (multivariate outliers). How do you detect them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Mahalanobis distance — accounts for correlations between features, (2) Isolation Forest — anomaly detection algorithm, (3) Local Outlier Factor (LOF) — density-based detection, (4) DBSCAN — points not in any cluster are outliers, (5) multivariate box plot (bagplot), (6) PCA then check for extreme values in reduced dimensions. Individual feature outlier detection misses cases where each feature is normal but the combination is unusual."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "You notice that a feature's distribution changed between your training and test sets. What could have gone wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Possible causes: (1) temporal split caused by concept drift, (2) different data collection processes for train vs. test, (3) sampling bias in one of the sets, (4) data leakage — test data was preprocessed differently, (5) seasonal/cyclical patterns not balanced across splits, (6) bug in train/test split code. Fix by: verifying split method, checking distributions, using stratified splitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "Your dataset has inconsistent formats: \"New York\", \"new york\", \"NY\", \"N.Y.\", \"New York City\" all represent the same entity. How do you standardize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Lowercase all values, (2) create a mapping dictionary: {\"ny\": \"new_york\", \"n.y.\": \"new_york\", \"new york city\": \"new_york\"}, (3) use fuzzy matching (fuzzywuzzy library) to find near-duplicates, (4) use a canonical reference table, (5) for addresses, use geocoding APIs, (6) for automated large-scale cleaning: record linkage / entity resolution libraries (dedupe, pandas-dedupe)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "186",
   "q": "You have a dataset with timestamps but they're in mixed timezones. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Convert all timestamps to UTC first, (2) if timezone info is missing, determine from other fields (location, IP), (3) store both UTC and local time (local for features like time-of-day), (4) use `pytz` or `zoneinfo` for reliable conversions, (5) validate by checking for impossible patterns (e.g., business transactions at 3 AM local time), (6) document the timezone convention in data dictionary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "Your training data was collected in 2023 but you need to predict for 2025. What data quality issues should you anticipate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature drift — distributions may have changed, (2) new categories not seen in training (new products, regions), (3) concept drift — relationship between features and target may shift, (4) missing features — some data sources may no longer exist, (5) label definition changes, (6) population demographics shift. Mitigate by: regular retraining, monitoring drift metrics, designing for graceful handling of new categories."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "You discover that your target variable was incorrectly labeled for a subset of data (label noise). How much noise can your model tolerate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on the model and noise level: (1) tree-based models tolerate 5-10% label noise reasonably well, (2) deep learning is more sensitive — can memorize noise, (3) use confident learning (cleanlab library) to identify and correct mislabeled samples, (4) train with noise-robust loss functions (symmetric cross-entropy), (5) use cross-validation-based noise detection — samples consistently misclassified across folds are likely mislabeled."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "Your ETL pipeline occasionally produces zeros where values should be null. How do you detect and fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check if zeros are valid — domain knowledge matters (age=0 is invalid, balance=0 may be valid), (2) compare distribution of zeros over time — sudden spike indicates ETL bug, (3) check if zeros correlate with specific source systems or dates, (4) use business rules: if revenue=0 AND items_sold>0, then revenue is likely a null, (5) add data quality checks at pipeline level to catch this automatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "You're merging two datasets on customer ID but the join produces more rows than expected. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Many-to-many relationship: (1) one or both datasets have duplicate customer IDs, (2) the join key isn't a true primary key in one dataset, (3) customer IDs were recycled or reused, (4) Fix: deduplicate before joining, verify key uniqueness with `df.customer_id.is_unique`, (5) use validation: `pd.merge(df1, df2, validate=\"one_to_one\")` to catch this early, (6) if duplicates are valid (multiple transactions), aggregate first then join."
    },
    {
     "t": "p",
     "text": "**Theme: Regression & Prediction**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "Your linear regression model has a high R² on training data but low R² on test data. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Overfitting. Causes and fixes: (1) too many features relative to samples — use regularization (Ridge/Lasso), (2) polynomial features creating too much complexity — reduce degree, (3) outliers inflating training fit — use robust regression, (4) check for data leakage, (5) use cross-validation instead of single train/test split, (6) try simpler model or feature selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "Your regression model predicts house prices but sometimes produces negative values. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Apply log transformation to target: predict log(price), then exponentiate, (2) use constrained regression (enforce positive predictions), (3) clip predictions: max(prediction, min_valid_price), (4) use Gamma regression (GLM with log link) which naturally produces positive values, (5) check if negative predictions happen for specific segments — may indicate model weakness in those regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "You're predicting customer spending amount. The distribution is zero-inflated (many customers spend $0). How do you model this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two-stage model: (1) Stage 1: Classification — will the customer spend anything? (binary), (2) Stage 2: Regression — given they spend, how much? Train on non-zero subset only. Final prediction: P(spend>0) × E(amount|spend>0). Alternative: use zero-inflated regression models, Tobit model, or Tweedie distribution regression (handles zero-inflation natively)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "Your regression model has heteroscedastic residuals (variance increases with predicted value). Why does this matter and how do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Heteroscedasticity violates OLS assumptions, causing unreliable confidence intervals and biased standard errors. Fix: (1) log-transform the target variable, (2) use Weighted Least Squares (WLS), (3) use robust standard errors (HC0-HC3), (4) use quantile regression for different prediction intervals, (5) transform features using Box-Cox, (6) use models that naturally handle this (tree-based, GAM)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "Your prediction interval is too wide to be useful for business decisions. How do you narrow it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Add more informative features (reduce irreducible error), (2) collect more training data to reduce estimation uncertainty, (3) use conformal prediction for tighter calibrated intervals, (4) segment predictions — narrow intervals for easy cases, wider for hard cases, (5) communicate uncertainty per-prediction rather than overall, (6) use ensemble methods which give better uncertainty estimates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "You've built separate regression models for different product categories. How do you decide between separate models vs. one combined model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Compare using cross-validation: (1) combined model benefits from more data and shared patterns, (2) separate models capture category-specific relationships, (3) compare RMSE/MAE across approaches, (4) middle ground: one model with category as a feature + interaction terms, (5) use hierarchical models (mixed effects) that share information across categories while allowing differences, (6) separate models are better when categories follow fundamentally different patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "Your model predicts well for common cases but poorly for rare high-value cases. How do you improve rare case prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Oversample rare cases or apply sample weights, (2) use separate models for different value tiers, (3) use log-transform to reduce impact of value range, (4) add features that distinguish rare cases, (5) evaluate using weighted metrics (weight by value), (6) use quantile regression for better tail prediction, (7) ensemble: global model + specialist model for high-value cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "Your regression model's feature coefficients seem counterintuitive (e.g., \"marketing spend\" has negative coefficient). How do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check for multicollinearity — VIF analysis (correlated with another positive predictor), (2) check for Simpson's paradox — relationship reverses at segment level, (3) examine interaction effects, (4) check feature scaling — unscaled features have misleading coefficients, (5) use partial dependence plots for true marginal effects, (6) check for confounding variables not in the model, (7) domain validation with subject matter experts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "You need to predict a bounded variable (e.g., customer satisfaction score 1-5). Standard regression doesn't respect bounds. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use beta regression (for 0-1 bounded), scaling the target to (0,1), (2) ordinal regression (ordered logit) since it's an ordered discrete outcome, (3) logit-transform the target: logit((y-1)/4) for 1-5 scale, (4) clip predictions to valid range post-hoc, (5) use constrained optimization in boosting (custom objective), (6) treat as classification if you need discrete classes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "Your model predicts next month's sales. After deployment, actual sales are consistently 15% higher than predictions. What's going on?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Systematic underprediction: (1) training data didn't include recent growth trend, (2) a new marketing campaign or seasonal effect not in training data, (3) target variable definition changed (now includes additional channels), (4) data pipeline issue — training data has stale/partial records, (5) Fix: add recency weighting, include trend features, retrain more frequently, add external regressors for growth drivers, apply bias correction: adjusted_pred = pred × 1.15 as interim fix."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
