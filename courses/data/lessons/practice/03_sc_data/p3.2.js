/* ============================================================================
   PRACTICE P3.2 — Predict the Output / Scenarios · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.2",
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
   "text": "Predict the Output / Scenarios · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "26",
   "q": "A dataset arrives with multi-line text in CSV cells that break the parser. How do you properly handle this?",
   "body": [
    {
     "t": "p",
     "text": "Use quoted fields: ensure the CSV writer properly quotes cells containing newlines, commas, or quotes. When reading: `pd.read_csv(file, quoting=csv.QUOTE_ALL, escapechar='\\\\')`. If the file is malformed, preprocess with a streaming parser that handles edge cases. For truly broken files, use Python's csv module with custom dialect settings or parse line by line with state tracking for quoted regions. Always validate row counts after parsing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "You need to anonymize PII (names, emails, phone numbers) before sharing data with a team. What's your approach?",
   "body": [
    {
     "t": "p",
     "text": "For names: replace with consistent pseudonyms using a hash-based mapping (same name always maps to same pseudonym). For emails: replace with `user_{hash}@example.com`. For phone numbers: replace with random but format-valid numbers. For addresses: generalize to zip code or city level. Use differential privacy for aggregate statistics. Never use simple masking (XXX) — it's reversible with context. Keep the mapping in a secure, access-controlled location for potential re-identification if legally required."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Your data pipeline processes events out of order, and some features depend on event sequence. How do you ensure correct ordering?",
   "body": [
    {
     "t": "p",
     "text": "Sort events by timestamp within each entity (user/session) before computing sequence-dependent features. Handle ties in timestamps with a secondary sort key (event_id, sequence_number). For streaming pipelines, implement a watermark — wait for a configurable delay before processing to allow late events to arrive. Buffer events in a window and sort before feature computation. Track event ordering metrics to detect upstream issues."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "A feature column has been silently truncated (e.g., product descriptions cut off at 255 characters due to a DB column limit). How do you detect and handle this?",
   "body": [
    {
     "t": "p",
     "text": "Check distribution of string lengths — if there's a sharp cliff at a round number (255, 1000, 4000), truncation is likely. Compare with source data if available. For affected rows: (1) if the truncated portion is predictive, fix the upstream data source, (2) if not critical, proceed with truncated data but document the limitation, (3) for NLP features, truncation at 255 chars may still preserve enough signal — test model performance with and without the feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "You have a table with 50 address columns from a legacy system (address_line_1, address_line_2, city, state, zip, country, etc.) and need to clean and standardize all of them. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "Parse addresses using a library like `usaddress` (US) or `postal` (international). Validate against postal code databases. Standardize abbreviations (St → Street, Ave → Avenue). Geocode a sample to verify accuracy. Create a standardized address schema (line1, line2, city, state, postal_code, country_code). Build address-specific cleaning functions (strip unit/apartment numbers, normalize directions N/S/E/W). Profile completeness per field and track quality metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Your dataset has multi-label columns where a single cell contains comma-separated values (e.g., \"action,comedy,drama\" in a genre column). How do you handle this for modeling?",
   "body": [
    {
     "t": "p",
     "text": "Split into individual values with `df['genre'].str.split(',')`. Then either: (1) MultiLabelBinarizer to create one-hot columns per unique value, (2) count vectorization if order/frequency matters, (3) embedding-based approach for high cardinality. Handle inconsistencies first (whitespace, case, synonyms). Check cardinality — if too many unique values, group rare ones. For tree models, multi-hot encoding works well. For deep learning, use learned embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "You discover that numeric features were stored as strings with locale-specific formatting (e.g., \"1.234,56\" in European format). How do you convert?",
   "body": [
    {
     "t": "p",
     "text": "Detect the locale format by checking if values consistently use comma as decimal separator. Write a conversion function: replace dots (thousand separators) with nothing, then replace commas with dots. `value.replace('.', '').replace(',', '.')`. Verify by checking the range of converted values makes domain sense. Handle mixed locales by grouping records by source and applying locale-specific parsing. Always preserve the original column until conversion is validated."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Your training data was collected over 3 years, and the data schema changed twice during that period. How do you unify?",
   "body": [
    {
     "t": "p",
     "text": "Create a versioned schema map documenting changes per time period: which columns were added, renamed, removed, or had their types changed. Build version-specific preprocessing functions. Apply the correct preprocessor based on the record's timestamp. Harmonize to the latest schema — map old column names to new ones, fill newly added columns with NaN for old records. Test by comparing distributions of unified features across time periods to catch mapping errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "A sensor dataset has periodic calibration artifacts — readings spike to maximum or drop to zero for a few minutes during calibration. How do you clean this?",
   "body": [
    {
     "t": "p",
     "text": "Identify calibration periods from metadata (calibration logs) or detect them as sudden jumps to min/max values followed by return to normal. Mark calibration windows and exclude them. Use rolling median to detect anomalous spikes (values > 5 × rolling median). Replace calibration readings with interpolated values from surrounding valid readings. Add a `calibration_flag` column. For real-time systems, implement a brief warmup period after calibration before trusting readings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "You need to create a binary feature from a text column — for example, extracting whether an insurance claim mentions \"pre-existing condition\". How do you ensure high accuracy?",
   "body": [
    {
     "t": "p",
     "text": "Don't rely on simple keyword matching — it misses paraphrases (\"prior medical condition\", \"condition diagnosed before policy start\"). Use: (1) keyword list with domain variants, (2) regex patterns for common phrasings, (3) for higher accuracy, a fine-tuned text classifier. Validate with a labeled sample (manually check 200 positive and 200 negative cases). Report precision and recall of the extraction. Consider using NER models for entity extraction if the information is entity-based."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Your pipeline joins user data with event data, but there's a timezone mismatch — user timestamps are in local time while events are in UTC. How do you fix?",
   "body": [
    {
     "t": "p",
     "text": "Standardize all timestamps to UTC before joining. For user timestamps: if user timezone is known, convert with `pytz` using `localize()` then `astimezone(pytz.utc)`. If timezone is unknown, infer from user's registered location or IP geolocation. After conversion, check for anomalies (events \"before\" user signup, midnight spikes from timezone miscounting). Document the timezone convention in the data dictionary. This is a common source of training-serving skew."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "A column representing percentage values has entries sometimes as 0-1 (0.85) and sometimes as 0-100 (85.0). How do you detect and fix?",
   "body": [
    {
     "t": "p",
     "text": "Analyze the bimodal distribution — if values cluster around both 0-1 and 0-100, they're mixed formats. Heuristic: values > 1 are likely in the 0-100 format. But be careful with edge cases (is 1.5 a 150% or 1.5%?). Check by batch or source — often one source uses one format and another uses the other. Convert all to 0-1 by dividing values > 1 by 100 (if values never legitimately exceed 100). Validate with domain knowledge and downstream metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "You have a target variable (customer churn) that's defined differently across business units — one uses 30-day inactivity, another uses 90-day. How do you create a consistent dataset?",
   "body": [
    {
     "t": "p",
     "text": "You cannot simply combine them — different definitions mean the same label represents different behaviors. Options: (1) recalculate the target variable using a single, agreed-upon definition across all data (preferred), (2) train separate models per business unit, (3) include the definition as a feature and let the model learn the difference. Option 1 is best but requires access to raw activity data. Document the chosen definition clearly and get stakeholder buy-in."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Your feature engineering pipeline creates 500 features, but you suspect many are redundant or derived from the same base features. How do you clean this up?",
   "body": [
    {
     "t": "p",
     "text": "Remove zero-variance features (`VarianceThreshold`). Calculate pairwise correlation matrix and remove one feature from each pair with correlation > 0.95. Use VIF (Variance Inflation Factor) to detect multicollinearity — remove features with VIF > 10. Apply feature importance from a quick Random Forest to identify uninformative features. Group features by their base source and ensure derivations add information. Aim for a clean, interpretable feature set rather than maximal count."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "A client gives you an Excel file with merged cells, multiple header rows, data scattered across multiple sheets, and formatted numbers. How do you extract clean data?",
   "body": [
    {
     "t": "p",
     "text": "Use `openpyxl` for full control over merged cells (`sheet.merged_cells.ranges`). Unmerge cells first, forward-filling the values. Identify the actual header row (may not be row 1). Clean formatted numbers (remove `$`, `,`). Process each sheet separately with sheet-specific parsers if structures differ. Use `pd.read_excel(skiprows=n, header=m)` for simpler cases. Always compare your extracted row counts with the original file to verify completeness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Your dataset has a date-of-birth column, but some values are clearly wrong (year 1900, future dates, age 5 for a mortgage applicant). How do you implement validation rules?",
   "body": [
    {
     "t": "p",
     "text": "Define business rules: (1) date must be in the past, (2) calculated age must be between plausible bounds (18-110 for adults), (3) age must match business context (e.g., 18+ for financial products). Implement as a validation function that flags records, doesn't auto-fix. For typos (e.g., 1990 entered as 1900): if only a few, flag for manual review. For systematic errors (e.g., two-digit years 90 interpreted as 0090), apply century adjustment. Track validation failure rates per data source."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "You need to flatten a deeply nested JSON API response into a tabular format for analysis. How do you handle nested arrays and objects?",
   "body": [
    {
     "t": "p",
     "text": "Use `pd.json_normalize(data, sep='_')` for basic flattening. For nested arrays (e.g., a customer with multiple orders), decide on the grain: one row per customer (aggregate arrays) or one row per order (explode). Use `df.explode('orders')` to unnest arrays. For deeply nested objects, first flatten then select needed columns. Handle schema inconsistencies (some records may lack nested fields) with try/except or `.get()` with defaults. Profile the nesting structure before writing the parser."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Your classification target has labeling inconsistencies — different annotators labeled the same examples differently. How do you handle noisy labels?",
   "body": [
    {
     "t": "p",
     "text": "Compute inter-annotator agreement (Cohen's kappa). For disagreements: (1) use majority vote if 3+ annotators, (2) weight by annotator quality (past accuracy), (3) remove samples with low agreement from training, (4) use confident learning (cleanlab library) to detect and correct label errors algorithmically, (5) use label smoothing during training to be robust to noise. Track annotator-level metrics and provide additional training to low-quality annotators."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "A production pipeline suddenly starts producing NaN values in a feature that was always non-null. Your model consumes this Feature and starts failing. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "Immediate: add a fallback imputation (median from training data) so the model doesn't crash. Diagnose: check the feature computation code and upstream data sources for changes. Common causes: a joined table was empty (NULL from left join), a division by zero was introduced, an upstream column type changed. Fix: repair the root cause and add a data quality check (assert no NaNs) before model inference. Add monitoring for null rates per feature to catch future issues early."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "You're working with medical data where different hospitals use different coding systems (ICD-9 vs ICD-10 for diagnoses). How do you harmonize?",
   "body": [
    {
     "t": "p",
     "text": "Use official crosswalk tables (CMS provides ICD-9 to ICD-10 mappings). Note that mappings are often one-to-many (one ICD-9 code maps to multiple ICD-10 codes). Decide on target coding system (usually ICD-10 as it's current). For ambiguous mappings, use the most common/general target code. Group codes into clinical categories (CCS categories) for analysis. Validate mapping quality by checking prevalence rates of common conditions before and after harmonization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Your dataset has a feature computed as a ratio (e.g., events_per_day) but many records have 0 in the denominator, producing inf values. How do you handle?",
   "body": [
    {
     "t": "p",
     "text": "Replace inf with NaN first: `df.replace([np.inf, -np.inf], np.nan)`. Then decide: (1) if 0 in denominator means \"no activity\", the ratio is undefined — use 0 or a missing indicator, (2) use Laplace smoothing: `(events + 1) / (days + 1)` to avoid division by zero, (3) cap at a reasonable maximum, (4) use log transformation of the ratio. The best approach depends on domain meaning. Never leave inf values — they break most ML algorithms silently."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "You need to combine structured data (tabular) with unstructured data (text descriptions) for a prediction model. How do you prepare the data?",
   "body": [
    {
     "t": "p",
     "text": "Process separately then combine: (1) clean and encode structured features as usual, (2) preprocess text (clean, tokenize), (3) extract text features — TF-IDF vectors, pre-trained embeddings (BERT), or topic model scores, (4) create a combined feature matrix by horizontally concatenating structured features with text features. For deep learning: use dual-input architecture (tabular MLP + text encoder, concatenate before final layers). Ensure no data leakage between the two modalities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Your pipeline processes a streaming data feed, but occasional network glitches cause data gaps (missing 5-10 minutes of data every few hours). How do you build a robust pipeline?",
   "body": [
    {
     "t": "p",
     "text": "Implement idempotent processing with gap detection: (1) track expected vs received timestamps, (2) detect gaps automatically using timestamp diffs > 2× expected interval, (3) for small gaps, interpolate or forward-fill, (4) for large gaps, trigger a backfill request from the source system, (5) add a gap metric to monitoring dashboard. Buffer incoming data to handle reordering. Process in micro-batches with watermarks rather than record-by-record to accommodate late arrivals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "You have a feature engineering pipeline that takes 4 hours to run. A change in one feature shouldn't require recomputing all features. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "Implement incremental/modular feature computation: (1) split features into independent groups, (2) cache intermediate results (Parquet files or feature store), (3) track dependencies — if a base feature changes, only recompute derived features, (4) use a DAG-based pipeline (Airflow, Prefect) with task-level caching, (5) add timestamps to cached features and only recompute if inputs changed (hash-based checksums). This reduces a 4-hour pipeline to minutes for incremental updates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Your data team wants to switch from batch preprocessing to real-time feature computation. What challenges should you anticipate?",
   "body": [
    {
     "t": "p",
     "text": "Key challenges: (1) Training-serving skew — ensure real-time feature logic exactly matches batch logic, (2) latency constraints — complex features (aggregations, joins) are slow in real-time, (3) state management — features like \"user's average spend over last 30 days\" require maintaining state, (4) handling late data — real-time features may be incomplete, (5) testing is harder — can't easily replay and compare. Solutions: use a feature store (Feast, Tecton) with shared feature definitions, pre-compute aggregate features, and shadow-test real-time features against batch for weeks before switching."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
