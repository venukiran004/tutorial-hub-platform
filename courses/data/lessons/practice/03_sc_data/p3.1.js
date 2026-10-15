/* ============================================================================
   PRACTICE P3.1 — Predict the Output / Scenarios · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.1",
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
   "text": "Predict the Output / Scenarios · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "You receive a dataset with 30% missing values in the income column for a loan default prediction model. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "First, analyze the missingness pattern — is it MCAR, MAR, or MNAR. If the data is MAR (e.g., higher earners skip income questions), use multiple imputation or model-based imputation (e.g., KNN imputer, iterative imputer). If MNAR, create a binary flag `income_missing=1` and impute with median. Never drop 30% of rows — that loses too much data. Validate by comparing model performance with different imputation strategies on a holdout set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Your dataset has a date column stored as strings in 5 different formats (MM/DD/YYYY, DD-MM-YYYY, YYYY.MM.DD, etc.). How do you standardize?",
   "body": [
    {
     "t": "p",
     "text": "Use `pd.to_datetime(col, infer_datetime_format=True)` as a first pass. For remaining failures, write explicit format parsers and apply sequentially. Create a parsing function that tries each known format with error handling. Always validate by checking the year range (e.g., all dates should be between 2000-2024) and flag any dates that fall outside expected ranges."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "You have a column with text entries like \"New York\", \"new york\", \"NEW YORK\", \"New York City\", \"NYC\". How do you normalize?",
   "body": [
    {
     "t": "p",
     "text": "Apply a multi-step cleaning pipeline: (1) lowercase all values, (2) strip whitespace, (3) create a mapping dictionary for known aliases ({\"nyc\": \"new york\", \"new york city\": \"new york\"}), (4) use fuzzy matching (fuzzywuzzy) with a similarity threshold of 85% to catch remaining variants. Validate by checking unique value counts before and after — they should decrease significantly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "A feature has outliers where 99% of values are between 0-100 but a few entries are 99999. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "First investigate if 99999 is a sentinel value (meaning \"not available\") — common in legacy systems. If so, replace with NaN and impute. If they're genuine outliers, decide based on the model: tree-based models handle outliers well (keep them), but linear models are sensitive (cap at the 99th percentile using winsorization). Never blindly remove outliers without understanding their origin."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "You receive data from multiple sources with different schemas — same information but different column names and formats. How do you merge?",
   "body": [
    {
     "t": "p",
     "text": "Create a schema mapping configuration (JSON/YAML) that maps each source's columns to a canonical schema. Build a transformation pipeline for each source that: renames columns, converts data types, standardizes units (e.g., km → miles), and applies source-specific cleaning rules. Use `pd.concat` with the canonical schema. Add a `data_source` column for traceability. Validate row counts match expectations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "An important categorical column has 500+ unique categories, many with only 1-2 occurrences. How do you encode it?",
   "body": [
    {
     "t": "p",
     "text": "Group rare categories (frequency < threshold, e.g., < 50 occurrences) into an \"Other\" bucket. For the remaining categories, use target encoding (mean of target per category) with regularization to prevent overfitting, especially for categories with few samples. Alternatively, group by domain knowledge into meaningful hierarchical categories. Never use one-hot encoding with 500 categories — it creates sparse features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Your dataset has duplicate rows, but some duplicates differ in one or two columns. How do you deduplicate?",
   "body": [
    {
     "t": "p",
     "text": "Define a composite key (subset of columns that should be unique, e.g., user_id + timestamp). Use `df.duplicated(subset=key_columns)` to find duplicates. For conflicting values in non-key columns, apply resolution rules: keep the most recent record, take the mean for numeric values, or keep the most common value. Always log how many duplicates were resolved and the resolution method used."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "A numerical feature that should be non-negative has some negative values. How do you investigate and fix?",
   "body": [
    {
     "t": "p",
     "text": "Check if negatives represent valid concepts (e.g., returns in a sales column could be negative). If they're data entry errors, check if they're just missing the absolute value (e.g., -50 should be 50). Compare the distribution of negative values against positive ones. If clearly errors: for small counts, replace with absolute value or NaN; for systematic patterns, investigate the data pipeline for sign inversion bugs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "You need to merge two large datasets (10M rows each) on a key column, but the key has slight variations (spacing, case, typos). How do you handle the fuzzy join?",
   "body": [
    {
     "t": "p",
     "text": "Don't attempt fuzzy matching on 10M × 10M pairs — it's computationally infeasible. Instead: (1) clean keys first (lowercase, strip, remove punctuation), (2) use blocking — group records by first 3 characters or phonetic encoding (Soundex/Metaphone) to reduce comparisons, (3) within blocks, use Levenshtein distance with a strict threshold (e.g., ≤ 2 edits), (4) validate match quality on a sample before full run."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Your time series data has gaps — some days have no records. How do you handle missing timestamps?",
   "body": [
    {
     "t": "p",
     "text": "Create a complete date range with `pd.date_range(start, end, freq='D')` and reindex the DataFrame. For filling gaps: use forward fill for slowly changing values (e.g., stock holdings), interpolation for continuous values (e.g., temperature), or 0 for event counts (e.g., daily sales). Add a flag column `is_imputed=True` for filled values so downstream models can use this information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "You discover that a feature was accidentally shifted by one row during ETL, causing a look-ahead bias. How do you detect and fix this?",
   "body": [
    {
     "t": "p",
     "text": "Check temporal correlations: if a feature at time t is perfectly correlated with the target at time t (instead of t+1), it's likely shifted. Run `df['feature'].shift(1).corr(df['target'])` vs `df['feature'].corr(df['target'])` — if the unshifted version has higher correlation, there's a data leak. Fix by applying the correct shift in the ETL pipeline and reprocess all downstream artifacts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Your dataset has a column with mixed types — some entries are numbers, others are strings like \"N/A\", \">1000\", \"100-200\". How do you parse it?",
   "body": [
    {
     "t": "p",
     "text": "Build a custom parser: (1) replace known NA strings (\"N/A\", \"NA\", \"-\", \"null\") with NaN, (2) handle ranges (\"100-200\") by taking the midpoint or creating min/max columns, (3) handle inequalities (\">1000\") by using the boundary value or creating a separate flag, (4) convert remaining strings to numeric with `pd.to_numeric(errors='coerce')`. Log all unparseable values for manual review. This is common in medical and survey data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "You have a dataset where column order changes between batches and some batches have extra columns. How do you build a robust ingestion pipeline?",
   "body": [
    {
     "t": "p",
     "text": "Reference columns by name, never by position. Define an expected schema with required and optional columns. On ingestion: (1) validate all required columns exist, (2) select only known columns in canonical order, (3) log any unexpected new columns (they may contain useful info), (4) raise an alert if a required column is missing. Use Pandera or Great Expectations for automated schema validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "A currency column has values in different currencies ($, €, £) mixed together. How do you standardize?",
   "body": [
    {
     "t": "p",
     "text": "Extract the currency symbol/code using regex: `r'([$€£])\\s*([\\d,.]+)'`. Create separate columns for amount and currency. Convert all amounts to a base currency (e.g., USD) using exchange rates for the date of each transaction. Store both original and converted amounts. Use a reliable exchange rate API (e.g., ECB rates). Handle edge cases: thousand separators differ by locale (1,000.00 vs 1.000,00)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Your text data contains HTML tags, URLs, special characters, and emojis. How do you clean it for NLP?",
   "body": [
    {
     "t": "p",
     "text": "Apply cleaning in layers: (1) strip HTML with BeautifulSoup or regex `re.sub(r'<[^>]+>', '', text)`, (2) remove/replace URLs, (3) decode HTML entities (`&amp;` → `&`), (4) handle emojis — either remove or convert to text descriptions (e.g., 😊 → \"smiling face\"), (5) normalize Unicode characters, (6) remove or standardize special characters based on task. Keep the original text — never clean in place. Different NLP tasks may need different cleaning levels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "You're working with geolocation data and some lat/long coordinates are clearly wrong (e.g., latitude > 90, longitude = 0). How do you validate?",
   "body": [
    {
     "t": "p",
     "text": "Apply bounds validation: latitude ∈ [-90, 90], longitude ∈ [-180, 180]. Check for swapped lat/long (common error). Use reverse geocoding on a sample to verify locations make sense for the context (e.g., US-only data shouldn't have coordinates in Asia). For suspicious points, check if they fall in the ocean or in the expected country. Flag (0, 0) coordinates — they typically indicate missing data, not actual GPS readings at Null Island."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "A dataset has features with vastly different scales — age (0-100), income (0-1M), and a binary flag (0-1). How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "Scaling depends on the model: tree-based models (Random Forest, XGBoost) don't need scaling, but distance-based (KNN, SVM) and gradient-based (neural nets, logistic regression) do. Use StandardScaler (zero mean, unit variance) for normally distributed features, MinMaxScaler for bounded features, and RobustScaler for features with outliers. Don't scale binary flags. Always fit the scaler on training data only and transform both train and test."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Your pipeline processes data incrementally, but you suspect the data distribution has shifted significantly from the original training data. How do you verify?",
   "body": [
    {
     "t": "p",
     "text": "Compare distributions using statistical tests: KS test for continuous features, chi-squared test for categorical features. Calculate Population Stability Index (PSI) per feature — PSI > 0.2 indicates significant shift. Visualize distributions side-by-side using histograms. If drift is confirmed, decide whether to retrain the model or adapt the preprocessing (e.g., update scalers). Set up automated drift monitoring using Evidently AI."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "You have a DataFrame with 200 columns and need to quickly assess data quality across all columns. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "Run a comprehensive profiling pass: `df.describe(include='all')`, `df.isnull().sum()`, `df.dtypes`, `df.nunique()`. Use `pandas_profiling` (ydata-profiling) for an automated HTML report covering distributions, correlations, missing values, and duplicates. Focus attention on: columns with >5% missing, zero-variance columns, highly correlated pairs (>0.95), and columns with suspicious distributions (e.g., all same value except 1 row)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "You need to handle a dataset where the same person appears multiple times but with slightly different name spellings. How do you create a single customer view?",
   "body": [
    {
     "t": "p",
     "text": "Build an entity resolution pipeline: (1) standardize names (lowercase, remove titles/suffixes), (2) use additional matching fields (email, phone, address) to increase confidence, (3) apply fuzzy string matching on names with Jaro-Winkler similarity (threshold > 0.9), (4) create clusters of matching records using connected components, (5) for each cluster, create a golden record by merging attributes (most recent address, first purchase date, etc.). Validate by manual review of a sample of merged records."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Your data has implicit missing values — zeros that actually mean \"not recorded\" rather than \"zero quantity\". How do you detect this?",
   "body": [
    {
     "t": "p",
     "text": "Compare the distribution of zeros vs non-zeros: if zeros are suspiciously overrepresented at a rate inconsistent with the domain (e.g., 40% of customers have exactly $0 income), they're likely missing. Check if zeros correlate with other missingness patterns. Consult domain experts. Replace implicit zeros with NaN and treat as missing data. Create documentation of which columns use zero as a missing indicator."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "A critical feature is available only for 60% of your records. Should you drop the feature, impute, or create a separate model?",
   "body": [
    {
     "t": "p",
     "text": "Three approaches: (1) Imputation — if missingness is MAR, use KNN or iterative imputer and add a `feature_missing` flag. (2) Two models — train one model for records with the feature and one without, ensemble at prediction time. (3) Feature engineering — if the feature is highly predictive, investigate if you can derive a proxy from available features. Decision depends on how informative the feature is — check importance with and without it. Start with imputation + flag as baseline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Your ETL pipeline sometimes produces duplicate timestamps, leading to fan-out when joining with other tables. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "Add deduplication as a pipeline step: (1) identify the grain of the table (e.g., one row per user per day), (2) check for duplicates on the natural key before loading, (3) if duplicates exist, apply resolution (keep last, aggregate, keep max), (4) add a unique constraint to the target table, (5) log duplicate counts in pipeline metrics. Use `df.groupby(key_columns).agg(resolution_rules)` for resolution. Configure the pipeline to fail if duplicate rate exceeds a threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "You're building a feature from free-text fields and encounter encoding issues (mojibake, mixed encodings). How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "Use `chardet` to detect encoding per file/record: `chardet.detect(raw_bytes)`. Convert all text to UTF-8 with `text.encode('latin1').decode('utf-8', errors='replace')` for common mojibake patterns. Use `ftfy` library for automatic encoding repair. For persistent issues, try multiple encodings and keep the one that produces valid text. Always read files with explicit encoding rather than relying on system defaults."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Your pipeline needs to join a 100M row fact table with a 10K row dimension table, but performance is terrible. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "Ensure the join key is indexed on both tables. Use appropriate join type (usually inner or left). In Pandas: sort both DataFrames by the join key first, use `merge(how='left')`. In SQL: make sure statistics are updated so the query planner chooses hash join for the small dimension table. Consider partitioning the fact table. For extreme sizes, use Spark or Dask. Pre-filter the fact table before joining to reduce rows processed."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
