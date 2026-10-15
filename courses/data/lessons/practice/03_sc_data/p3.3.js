/* ============================================================================
   PRACTICE P3.3 — Predict the Output / Scenarios · 3
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.3",
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
   "text": "Predict the Output / Scenarios · 3",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "You're given a dataset with 50 features for predicting house prices, with no documentation. What's your EDA roadmap?",
   "body": [
    {
     "t": "p",
     "text": "Start with structure: `df.shape`, `df.dtypes`, `df.head()`, `df.describe()`. Then systematically: (1) check missing values per column, (2) plot target distribution — if skewed, consider log transform, (3) numeric features: histograms and box plots to understand distributions, (4) categorical features: value counts and bar charts, (5) target correlations: compute Pearson/Spearman correlations, (6) scatter plots for top correlated features, (7) check for data leakage (features that perfectly predict target), (8) pair plots for feature interactions. Document findings iteratively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Your target variable shows an extreme right skew (long tail). How does this affect your analysis and what do you do?",
   "body": [
    {
     "t": "p",
     "text": "Right-skewed targets bias models toward over-predicting low values and under-predicting high values. Apply log transformation: `np.log1p(target)` — this compresses the tail and makes the distribution more normal. Train the model on log-transformed target and reverse-transform predictions with `np.expm1()`. If log doesn't work, try Box-Cox or Yeo-Johnson transformations. For evaluation, always compute metrics on the original scale. Also consider whether extreme values are genuine or errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Two features have a correlation of 0.98. What do you investigate and what action do you take?",
   "body": [
    {
     "t": "p",
     "text": "High correlation means they carry nearly the same information — likely one is derived from the other (e.g., price and price_with_tax). Investigate: (1) are they semantically related? (2) plot them against each other — is the relationship linear or nonlinear? (3) check if one has fewer missing values (prefer that one). Action: remove one to reduce multicollinearity, which improves model interpretability and coefficient stability for linear models. Tree-based models handle collinearity better but removing one still simplifies the model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "You notice a bimodal distribution in a feature (two distinct peaks). What does this suggest and how do you investigate?",
   "body": [
    {
     "t": "p",
     "text": "Bimodality often indicates the data contains two distinct subpopulations. Investigation: (1) color the histogram by a categorical feature (e.g., gender, product type) to see if peaks separate by group, (2) check if the feature definition changed over time (plot by date), (3) verify it's not a data error (e.g., mixed units — feet vs meters). Action: if subpopulations are meaningful, consider separate models or add an interaction feature. Never just average over bimodal distributions — it misrepresents both groups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "A scatter plot shows the relationship between a feature and target is clearly nonlinear (U-shaped). What do you do?",
   "body": [
    {
     "t": "p",
     "text": "Linear models can't capture this — you need feature engineering. Options: (1) create polynomial features: `feature²`, (2) create binned features (low/medium/high), (3) apply a nonlinear transformation (log, sqrt, inverse), (4) use spline features for smooth nonlinearity, (5) switch to a model that handles nonlinearity natively (tree-based, neural net). Also investigate domain meaning — a U-shaped relationship with target might indicate an optimal range, which is valuable business insight."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Your correlation matrix shows no single feature has correlation > 0.3 with the target. Does this mean the features are useless?",
   "body": [
    {
     "t": "p",
     "text": "No. Low pairwise correlation means no single feature has a strong linear relationship with the target, but: (1) feature interactions might be strong (investigate with interaction terms or decision trees), (2) nonlinear relationships exist but aren't captured by Pearson correlation (use Spearman or mutual information), (3) the combined predictive power of multiple weak features can be strong (ensemble models excel here). Run a quick Random Forest and check if combined features achieve reasonable accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "You plot feature importance from a Random Forest and find that one feature dominates (80% importance). Is this suspicious?",
   "body": [
    {
     "t": "p",
     "text": "Yes — investigate further. Possible causes: (1) data leakage — the feature directly encodes or is derived from the target, (2) proxy for the target — e.g., \"loan approved\" feature predicting \"loan default\", (3) the feature genuinely is that predictive (rare but possible). Verification: check if the feature would be available at prediction time, check if removing it drastically drops performance, check temporal validity (was this feature created after the target was known). Remove if it's leakage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "You're comparing distributions of a feature across train and test sets and notice they're significantly different. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "This indicates either: (1) random split didn't preserve distribution (use stratified split), (2) temporal shift (if data is time-ordered, use time-based split instead of random), (3) data leakage in splitting process. Fix: re-split data appropriately. If using time-based split and shift is natural (data evolves), acknowledge this as concept drift and plan for periodic retraining. Check all features, not just this one. Use PSI (Population Stability Index) for systematic comparison."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "A categorical feature has 95% of values in one category. Is it useful?",
   "body": [
    {
     "t": "p",
     "text": "Likely not very predictive, but investigate before removing. The 5% minority might be strongly predictive of the target. Check: cross-tab the feature with the target — if the minority category has a very different target rate (e.g., 5% of \"premium\" users but they have 80% conversion), the feature is valuable. If the minority has similar target rate as majority, the feature adds little. Consider removing for model simplicity unless the minority signal is strong."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "You discover that your dataset has perfect class balance (exactly 50/50) but the real-world prevalence is 5%. Should you be concerned?",
   "body": [
    {
     "t": "p",
     "text": "Yes — this was likely artificially balanced (oversampled minority or undersampled majority). Concerns: (1) model's predicted probabilities will be miscalibrated — it'll over-predict the minority class, (2) any evaluation on this data won't reflect real performance. Action: train on balanced if needed (or use class weights), but always evaluate on data with natural prevalence. Calibrate probabilities post-training using Platt scaling or isotonic regression to match real-world rates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "You find that a numerical feature has 100 unique values but 3 of them account for 90% of records (the rest are spread across 97 values). What does this tell you?",
   "body": [
    {
     "t": "p",
     "text": "The feature likely has default/sentinel values mixed with real measured values. The 3 dominant values might be: (1) default values from the system (0, -1, 999), (2) rounded estimates (e.g., income reported as $50K, $75K, $100K), (3) legitimate concentrations. Investigate by checking if the 3 values are round numbers, correlate with other features, or appear in specific data sources. Consider creating a binary feature \"is_default_value\" plus the original continuous feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "You're plotting time series of your target and features. The target shows clear seasonality but none of your features capture seasonal patterns. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "Create season-related features: (1) month, day of week, quarter, (2) is_holiday, days_to_holiday, (3) cyclical encoding: `sin(2π × day/365)`, `cos(2π × day/365)`, (4) lag features from the target itself (last week, last month, last year same day), (5) rolling aggregates (7-day mean, 30-day sum). Also check if existing features have seasonal patterns that just aren't obvious — try plotting features by month. Missing seasonality features is a common cause of poor time series model performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "You compute mutual information between features and the target. Several features show high MI but low Pearson correlation. What does this imply?",
   "body": [
    {
     "t": "p",
     "text": "This means the features have strong nonlinear relationships with the target. Mutual information captures any statistical dependency (linear or nonlinear), while Pearson only captures linear. These features are likely valuable — use models that can capture nonlinearity (tree-based, neural nets) or engineer nonlinear transformations (polynomial, binned, log). Never rely solely on Pearson correlation for feature selection when relationships may be nonlinear."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Your boxplot shows that a feature's median is very different between two classes, but the IQR overlaps substantially. Is this feature useful?",
   "body": [
    {
     "t": "p",
     "text": "Yes, but with limitations. Different medians indicate the feature separates classes on average, but overlapping IQRs mean there's no clean decision boundary — many individual cases will be misclassified by this feature alone. It's useful in combination with other features. Calculate separability metrics: effect size (Cohen's d), AUC of single-feature classifier. Features with d > 0.5 or single-feature AUC > 0.6 contribute meaningful signal even with overlap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "You create a correlation heatmap and see a block of 10 features all highly correlated with each other (r > 0.9). What's happening and how do you handle it?",
   "body": [
    {
     "t": "p",
     "text": "These 10 features likely measure the same underlying concept (e.g., different income measures, or pixel intensities from nearby regions). Use PCA on this block to extract 1-2 principal components that capture most variance. Alternatively, select the single feature with: (1) highest correlation with target, (2) fewest missing values, (3) best business interpretability. Keep the representative feature(s) and remove the rest. This reduces dimensionality without losing information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "Your data has GPS coordinates (lat, long). What kind of EDA would you do on spatial data?",
   "body": [
    {
     "t": "p",
     "text": "(1) Plot points on a map using folium or plotly to identify clusters and patterns, (2) compute spatial density — KDE heatmaps to find hotspots, (3) check for geographic outliers (points in wrong country/ocean), (4) create spatial features: distance to landmarks, cluster assignment (DBSCAN), neighborhood density, (5) investigate spatial autocorrelation (Moran's I) — nearby points should have similar target values, (6) check for spatial bias — is your data uniformly distributed or concentrated in certain areas?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "You notice that when you sample your dataset, you get very different summary statistics each time. What does this tell you?",
   "body": [
    {
     "t": "p",
     "text": "The dataset has high variance, heavy-tailed distributions, or extreme outliers that dominate statistics. Investigation: (1) check for outliers — a single extreme value can shift the mean significantly, (2) use robust statistics (median, IQR instead of mean, std), (3) bootstrap confidence intervals to quantify uncertainty, (4) increase sample size or use stratified sampling. This instability means your model may also be unstable — consider robust modeling techniques."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "You're asked to find the most predictive features for a binary classification target. What's your systematic approach?",
   "body": [
    {
     "t": "p",
     "text": "Multi-method approach for robustness: (1) filter methods: mutual information, chi-squared test, point-biserial correlation, (2) wrapper method: recursive feature elimination with cross-validation, (3) embedded methods: L1 regularization (Lasso) coefficients, tree-based feature importance, (4) compare rankings across methods — features consistently ranked high are most reliable, (5) SHAP values for model-agnostic importance. Start with filter methods (fast) to eliminate obvious non-predictors, then refine with more expensive methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "You visualize feature distributions and see that several features follow a power law distribution. How does this affect modeling?",
   "body": [
    {
     "t": "p",
     "text": "Power law features have extreme skewness and heavy tails — a few very large values dominate. This affects: (1) mean and standard deviation are unreliable, (2) StandardScaler doesn't work well, (3) linear models are distorted by extreme values. Solutions: log-transform (`np.log1p`), rank transform, or quantile transform. For tree-based models, raw values usually work fine since trees split by thresholds. Always visualize the transformed distribution to verify it's more analysis-friendly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "You're doing EDA on a multi-class classification problem with 20 classes. Standard visualizations become cluttered. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "Hierarchical analysis: (1) group 20 classes into 3-5 super-classes first, analyze at that level, (2) use heatmaps instead of scatter plots (class × feature mean/median), (3) confusion matrix visualization for class separability, (4) t-SNE or UMAP to visualize class clusters in 2D, (5) analyze one-vs-rest: how does each class differ from the rest, (6) focus on the most confused pairs (classes that are hardest to separate). Small multiples (one plot per class) work better than one crowded plot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "Your dataset has a timestamp column and you want to understand temporal patterns. What plots and analyses do you create?",
   "body": [
    {
     "t": "p",
     "text": "(1) Line plot of target over time (raw and smoothed/rolling average), (2) decomposition into trend, seasonality, and residuals, (3) ACF/PACF plots for identifying lag relationships, (4) volume over time (records per day/week) to check for data collection changes, (5) feature stability over time (monthly boxplots per feature), (6) target drift analysis (monthly accuracy if labels available), (7) day-of-week and hour-of-day patterns. Pay special attention to discontinuities — they often signal data pipeline changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "You find that your target variable has different distributions across different data sources (e.g., regions, devices, channels). How do you handle this in EDA?",
   "body": [
    {
     "t": "p",
     "text": "This is domain shift. Analysis: (1) segment the data by source and compare target distributions (KS test, histograms), (2) check if feature distributions also differ by source, (3) determine if the difference is meaningful or artifactual (e.g., higher churn on mobile might be real behavior vs. different tracking). Options: train separate models per source, add source as a feature, or use domain adaptation techniques. At minimum, ensure your train/test split respects source distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "During EDA you discover the dataset has survivorship bias — you only have data for users who completed onboarding, not those who dropped off. How does this affect your analysis?",
   "body": [
    {
     "t": "p",
     "text": "Major impact: (1) your model won't generalize to the full population — it's trained only on survivors, (2) features correlated with onboarding completion (but not with the target) may appear artificially important, (3) base rates are inflated (e.g., conversion appears high because non-converters already dropped off). Mitigation: try to obtain data on non-completers (even partial), adjust your analysis scope to acknowledge the limitation, build the model explicitly for the surviving population, and document this as a known limitation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "You compute VIF (Variance Inflation Factor) and find 3 features with VIF > 100. What does this mean practically?",
   "body": [
    {
     "t": "p",
     "text": "VIF > 100 means these features are almost perfectly predicted by other features — extreme multicollinearity. For linear models, this causes: (1) unstable, unreliable coefficients, (2) inflated standard errors, (3) difficulty interpreting feature effects. For tree models, it wastes splits on redundant features. Action: remove features iteratively (remove highest VIF, recompute, repeat until all VIF < 10). Alternatively, use PCA to replace correlated features with uncorrelated components. Also check if any features are mathematical combinations of others."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "You want to understand feature interactions but have 50 features (1,225 possible pairs). How do you efficiently identify important interactions?",
   "body": [
    {
     "t": "p",
     "text": "Don't check all pairs manually. (1) Train a Random Forest or XGBoost and use SHAP interaction values to rank top interactions, (2) use Friedman's H-statistic available in some tree implementations, (3) create interaction features for domain-relevant pairs only (not all combinations), (4) visualize top 10-20 interactions with partial dependence plots (PDP) and SHAP dependence plots, (5) check if adding top interaction features improves cross-validated performance. Focus on interactions that have both statistical significance and business interpretability."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
