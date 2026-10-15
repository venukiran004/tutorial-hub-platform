/* ============================================================================
   PRACTICE P3.4 — Predict the Output / Scenarios · 4
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.4",
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
   "text": "Predict the Output / Scenarios · 4",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "76",
   "q": "Your dataset has both user-level features (age, location) and transaction-level features (amount, type, timestamp). How do you structure your EDA?",
   "body": [
    {
     "t": "p",
     "text": "Analyze at both granularities: (1) Transaction level: distributions of amounts, frequencies, types over time, (2) User level: aggregate transaction features per user (count, sum, mean, recency, max), (3) Cross-level: how do user demographics relate to transaction patterns? (4) Temporal: user cohort analysis — do different sign-up periods show different behavior? Use groupby operations to move between levels. EDA at the wrong granularity misrepresents patterns — per-transaction analysis ignores that heavy users dominate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "You find that adding polynomial features dramatically improves your linear model but not your gradient boosting model. What does this tell you about the data?",
   "body": [
    {
     "t": "p",
     "text": "This tells you there are important nonlinear relationships and feature interactions in the data. Linear models can't capture these without explicit polynomial features, but gradient boosting naturally learns nonlinear splits and feature interactions through its tree structure. This confirms: (1) nonlinear relationships exist, (2) gradient boosting is already capturing them, (3) the polynomial features are redundant for tree models. For production, prefer the gradient boosting model — it's simpler (no manual feature engineering) and likely more robust."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "You're doing EDA on a NLP dataset (text + labels). What text-specific analyses do you perform?",
   "body": [
    {
     "t": "p",
     "text": "(1) Document length distribution (words per document per class), (2) vocabulary analysis — unique words, word frequency distribution, OOV rate, (3) most frequent n-grams per class (TF-IDF weighted), (4) word clouds per class for quick visual comparison, (5) label distribution and any class imbalance, (6) language detection — are there mixed languages? (7) character-level analysis — emojis, special characters, encodings, (8) topic modeling (LDA) to discover latent topics, (9) embedding visualization (BERT embeddings + UMAP) to see if classes form clusters in semantic space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "Your heatmap shows that features cluster into 3 obvious groups of correlated features. How do you use this insight?",
   "body": [
    {
     "t": "p",
     "text": "Each cluster likely represents a latent concept. (1) Name each cluster based on the features (e.g., \"financial health\", \"engagement\", \"demographics\"), (2) create composite features by PCA within each cluster (first PC per cluster), (3) use the cluster insight for feature selection — pick one representative from each cluster, (4) this guides feature engineering — create cross-cluster interaction features (financial × engagement), (5) present clusters to stakeholders for domain validation — do they align with business concepts?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "You're given a large image dataset for classification. How do you do EDA on image data?",
   "body": [
    {
     "t": "p",
     "text": "(1) Class distribution — count per class, identify imbalance, (2) image size distribution — are all images the same resolution? (3) visual inspection — random samples per class to verify labels, (4) intensity/color histograms per class — are there systematic differences? (5) mean image per class — often reveals dominant patterns, (6) problematic images — corrupted, duplicated, mislabeled, too dark/bright, (7) similarity analysis — find near-duplicate images using perceptual hashing, (8) augmentation preview — check if augmentations produce realistic images. Dataset quality is crucial for computer vision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "You notice a sudden spike in the target variable on one specific date. How do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "Check if it's real or artifact: (1) cross-reference with external events (holiday, promotion, system outage), (2) check if data volume also spiked (more records = higher totals), (3) check if one specific segment caused the spike (one user, one region), (4) check upstream data systems for anomalies (pipeline reruns, duplicate data), (5) compare other features on that date — do they also spike? If the spike is real, decide whether to keep it (if it can recur) or exclude it as an outlier. Document your decision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "Your dataset includes both quantitative features and free-text features. How do you assess their relative predictive power?",
   "body": [
    {
     "t": "p",
     "text": "Train three quick models: (1) structured features only (tabular model), (2) text features only (TF-IDF + logistic regression or simple BERT), (3) combined. Compare cross-validated performance. If text adds significant lift over structured-only, it's worth the complexity. Calculate the marginal improvement of adding text. Also check: does text compensate for missing structured features? Are text insights actionable? Often 80% of predictive power comes from structured data, with text providing diminishing marginal returns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "You're analyzing customer lifetime value (CLV) data and notice the distribution is right-skewed with a long tail and many zeros. How do you approach EDA?",
   "body": [
    {
     "t": "p",
     "text": "This is a zero-inflated continuous distribution — common in revenue data. EDA approach: (1) separate analysis for zero vs non-zero customers (what predicts zero revenue?), (2) for non-zero, analyze the log-transformed distribution, (3) quantile analysis — compute percentile breakdowns (P50, P75, P90, P99), (4) investigate if zeros mean \"never purchased\" vs \"recently acquired\", (5) plot CLV by cohort — is it growing over time? (6) consider modeling as a two-part problem: P(purchase) × E[revenue|purchase]."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Your EDA reveals that missing values in one feature strongly predict the target (missingness is informative). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "This is MNAR (Missing Not At Random) — the missingness itself is a signal. (1) Create a binary feature `feature_is_missing`, (2) don't impute with mean/median — that destroys the signal, (3) use imputation + flag approach: impute with a constant outside the normal range (e.g., -999) or impute with a separate value, (4) analyze why missingness is predictive (e.g., high-income users don't report income → missing income correlates with high credit score), (5) document this insight — it may be domain-relevant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "You're analyzing A/B test data and notice the control and treatment groups have slightly different demographics. How do you proceed?",
   "body": [
    {
     "t": "p",
     "text": "This suggests randomization wasn't perfect (or pre-treatment differences exist). (1) Quantify imbalance: compare means and distributions of key demographics between groups, (2) run statistical tests (chi-squared for categorical, t-test for continuous), (3) if imbalances are significant, they can confound the treatment effect. Mitigation: use CUPED (variance reduction), stratified analysis, propensity score matching, or regression adjustment to control for confounders. Report both unadjusted and adjusted treatment effects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "Your EDA shows that the model's top feature has a different meaning in different markets (e.g., \"credit score\" ranges from 300-850 in the US but 0-999 in the UK). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "Normalize within market: (1) create market-specific percentile ranks instead of raw values, (2) use z-scores within each market, (3) alternatively, create market-specific bins (high/medium/low based on market percentiles), (4) ensure training and test respect market boundaries. A raw feature value of 700 means \"excellent\" in the US but \"moderate\" in the UK — treating them equally misleads the model. Add an interaction feature `credit_score × market` or train separate models per market."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "You discover that 10% of your records have the exact same feature values (all features identical) but different target values. What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "This means the features don't fully determine the target — there's inherent randomness or missing features. Also check: (1) are these true duplicates (same entity measured twice) — if so, they should have the same target, conflicting targets suggest labeling errors, (2) are features too coarse (only capturing broad categories)? (3) is there a missing confounding feature? This puts a ceiling on model performance — perfect accuracy is impossible. The Bayes error rate is at least 10% for these cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "You're exploring graph/network data (social network, transaction network). What EDA do you perform?",
   "body": [
    {
     "t": "p",
     "text": "(1) Node degree distribution — usually power law in real networks, (2) connected components — how many disconnected subgraphs? (3) clustering coefficient — are friends-of-friends also friends? (4) centrality measures (degree, betweenness, PageRank) — identify influential nodes, (5) community detection (Louvain) — find natural groupings, (6) edge attribute analysis — weights, types, timestamps, (7) network visualization of a sample (full network is too dense), (8) assortativity — do high-degree nodes connect to high-degree nodes? These structural features are often highly predictive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "Your EDA reveals that the feature \"number of previous purchases\" has a maximum of 999, with a suspicious number of records at exactly 999. What do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "999 is likely a capping artifact — the system caps at 999 (possibly a 3-digit field limit). Investigation: (1) plot the distribution — is there a spike at 999? (2) what percentage of records are at 999? (3) are 999-records different from others in target rate? If significant proportion: (1) the capped value loses information (customers with 999 and 50,000 purchases look the same), (2) create a binary feature `is_capped`, (3) try to get uncapped data from the source system. This is information censoring."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "You want to present EDA findings to a non-technical business audience. How do you structure the presentation?",
   "body": [
    {
     "t": "p",
     "text": "Focus on business insights, not statistical techniques: (1) start with data overview — what data you have, time period, sample size, (2) key finding #1 — the most actionable insight, presented as a narrative, (3) visualization — simple charts (bar, line, scatter) with clear labels and takeaways, (4) avoid jargon — say \"average\" not \"mean\", \"spread\" not \"standard deviation\", (5) end with recommendations — what should the business do based on findings? (6) keep backup/technical slides for Q&A. Effective EDA communication is as important as the analysis itself."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "You compute feature importances using three different methods and they rank features very differently. How do you reconcile this?",
   "body": [
    {
     "t": "p",
     "text": "Different methods capture different aspects: permutation importance measures prediction impact, SHAP measures contribution, correlation measures linear relationship, mutual information measures any dependency. (1) Create a consensus ranking — average rank across methods, (2) features consistently in top 10 across methods are reliably important, (3) features with high rank in one method but low in others need investigation (maybe important for specific subpopulations), (4) use the ranking most aligned with your use case (SHAP for interpretability, permutation for predictive power)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "Your EDA shows strong day-of-week effects but you're building a model to predict monthly outcomes. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "The day-of-week effect is at a finer granularity than your prediction target. Options: (1) aggregate daily patterns to monthly features (e.g., % of activity on weekdays, weekend-to-weekday ratio), (2) include the proportion of business days in the month as a feature, (3) check if certain months have more weekdays (February vs March) and control for this, (4) create features like \"average daily activity on weekdays × number of weekdays in month\". The key insight: monthly outcomes are partially determined by calendar composition."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "You discover significant collinearity between your features and a time-based trend. Features are increasing over time, and so is the target. How do you determine if the features truly predict the target or if both are just trending?",
   "body": [
    {
     "t": "p",
     "text": "This is the spurious correlation problem. (1) Detrend both features and target: subtract the time trend or use differences (month-over-month changes), (2) after detrending, recompute correlations — if they disappear, the relationship was spurious, (3) use time-based splits (train on past, test on future) — spurious relationships won't generalize, (4) check if the feature-target relationship holds within each time period (yearly analysis). This is critical for avoiding models that seem accurate but are just fitting time trends."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "Your dataset has features extracted from images (512-dimensional embedding vectors). How do you do EDA on these high-dimensional features?",
   "body": [
    {
     "t": "p",
     "text": "(1) Dimensionality reduction for visualization: t-SNE or UMAP to 2D, colored by class/target, (2) check if classes form separable clusters — if yes, simple classifiers will work, (3) analyze the distribution of embedding norms — are they normalized? (4) compute pairwise cosine similarity matrix for a sample, (5) check for degenerate dimensions (near-constant values), (6) PCA to understand explained variance — how many components capture 95% of variance? (7) feature-level statistics: are any dimensions bimodal, heavy-tailed, or constant?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "You're doing EDA on rare event data (fraud: 0.1% positive rate). Standard visualizations are dominated by the majority class. How do you adapt?",
   "body": [
    {
     "t": "p",
     "text": "(1) Separate analysis: analyze fraud and non-fraud cases independently, (2) use log scale for counts when comparing, (3) plot conditional distributions: P(feature|fraud) vs P(feature|non-fraud) rather than overall, (4) use lift charts and rate-based metrics instead of counts, (5) oversample positives for visual analysis only (not for statistical tests), (6) focus your EDA on what makes fraud cases different: which features have the highest lift between fraud and non-fraud? (7) anomaly detection perspective: are fraud cases outliers in feature space?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "You notice that your data has different noise levels across different segments (heteroscedasticity — variance changes with the feature value). How does this affect your analysis?",
   "body": [
    {
     "t": "p",
     "text": "Heteroscedasticity means: (1) standard errors and confidence intervals are incorrect (too narrow where variance is high), (2) linear regression coefficients are still unbiased but inefficient, (3) prediction intervals vary by feature value. In EDA: plot residuals vs predicted values to visualize. For modeling: use weighted least squares, robust standard errors, or models that predict both mean and variance. Log-transforming the target often stabilizes variance. Report segment-specific metrics rather than overall metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "Your stakeholder asks \"which feature is most important for the model?\" but importance depends heavily on the model choice. How do you answer responsibly?",
   "body": [
    {
     "t": "p",
     "text": "Be transparent: different models pick different features as most important. Present: (1) model-agnostic importance (permutation importance across model types), (2) SHAP values from your production model, (3) a caveat that \"important\" has multiple meanings (predictive power vs causal effect vs business controllability). Frame recommendations around features that are both: (a) consistently important across methods, and (b) actionable by the business. A feature can be predictive but not actionable (e.g., age predicts churn but you can't change a customer's age)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "You're exploring data quality and find that exactly 0.1% of records have the value \"-1\" in multiple numeric columns simultaneously. What do you suspect?",
   "body": [
    {
     "t": "p",
     "text": "This pattern (same sentinel value across multiple columns in the same records) strongly suggests these are system-generated default or error codes, not real measurements. Investigation: (1) check if these records share other characteristics (same source, same date, same status), (2) verify with the data documentation or engineering team, (3) replace -1 with NaN for these specific records, (4) add a data quality flag, (5) check if the 0.1% rate is consistent over time or growing (growing means an upstream issue)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "You compute pairwise feature correlations and find a correlation matrix that seems \"too clean\" — all correlations are between -0.3 and 0.3 with suspiciously uniform distribution. What might be wrong?",
   "body": [
    {
     "t": "p",
     "text": "This could indicate: (1) features were already preprocessed to be orthogonal (PCA was applied upstream), (2) data is synthetic or simulated rather than real, (3) features were independently generated (random features, not real measurements), (4) the dataset was specifically designed for a competition and decorrelated. Check: (1) feature names and documentation, (2) data provenance — where did it come from? (3) compare with domain expectations — in reality, age and income are usually correlated. Real-world data almost always has correlated features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "You've completed extensive EDA and found many insights. How do you decide which findings are important enough to act on?",
   "body": [
    {
     "t": "p",
     "text": "Prioritize by: (1) impact on model performance — findings that change feature engineering or model choice, (2) data quality issues — must be fixed before modeling (missing data, leakage, errors), (3) business relevance — insights stakeholders will find actionable, (4) statistical significance — is the pattern robust or could it be noise? (5) reproducibility — does it hold across time periods and subsets? Create three categories: \"must fix before modeling\", \"should investigate further\", and \"interesting but not actionable\". Document everything for future reference."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
