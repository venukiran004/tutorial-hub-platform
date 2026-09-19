/* ============================================================================
   PRACTICE P1.5 — Scenarios · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.5",
 "lede": "**25 scenarios** from Fundamentals: Programs and Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Scenarios · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "1: Memory Leak in Production",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your Python web service is consuming more and more memory over time and eventually crashes. The service processes uploaded CSV files."
    },
    {
     "t": "p",
     "text": "**Question:** How would you diagnose and fix this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Diagnosis:** Use `tracemalloc` or `memory_profiler` to track allocations. Check if large DataFrames are being stored in global scope or class attributes. Look for circular references preventing garbage collection.",
      "**Common causes:** (a) Appending to a global list/dict without cleanup, (b) Caching results without an eviction policy (use `@lru_cache(maxsize=N)`), (c) Not closing file handles/connections (use `with` statements), (d) Holding references to large objects in closures or default mutable arguments.",
      "**Fix:** Process files in chunks, delete references with `del`, use generators instead of lists, set `gc.collect()` for circular references, use `weakref` for caches."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "2: Mutable Default Argument Bug",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** A colleague writes this function and reports that it \"remembers\" previous calls:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def add_item(item, items=[]):\n    items.append(item)\n    return items"
    },
    {
     "t": "p",
     "text": "**Question:** What's the bug and how do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:** Default mutable arguments are created ONCE at function definition, not per call. All calls share the same list object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "add_item(\"a\")  # ['a']\nadd_item(\"b\")  # ['a', 'b'] ← Bug! Expected ['b']"
    },
    {
     "t": "p",
     "text": "**Fix:** Use `None` as default and create inside the function:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def add_item(item, items=None):\n    if items is None:\n        items = []\n    items.append(item)\n    return items"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "3: Slow String Concatenation",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** A loop builds a large string by concatenation and runs extremely slowly on 1M records."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = \"\"\nfor record in large_dataset:\n    result += process(record) + \"\\n\""
    },
    {
     "t": "p",
     "text": "**Question:** Why is it slow and how do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:** Strings are immutable in Python. Each `+=` creates a new string and copies the old content — O(n²) total. **Fix:** Use a list and `join()`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "parts = [process(record) for record in large_dataset]\nresult = \"\\n\".join(parts)"
    },
    {
     "t": "p",
     "text": "This is O(n) — allocates memory once at the end. For file output, write directly: `f.write(process(record) + \"\\n\")` inside a loop."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "4: GIL and CPU-Bound Tasks",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have a CPU-intensive image processing pipeline. Using `threading` doesn't speed it up on a 16-core machine."
    },
    {
     "t": "p",
     "text": "**Question:** Why not? What alternatives exist?"
    },
    {
     "t": "p",
     "text": "**Answer:** Python's Global Interpreter Lock (GIL) allows only one thread to execute Python bytecode at a time. Threads help for I/O-bound tasks (network, file) but NOT for CPU-bound tasks."
    },
    {
     "t": "p",
     "text": "**Alternatives:** (1) `multiprocessing` — creates separate processes, each with its own GIL, (2) `concurrent.futures.ProcessPoolExecutor`, (3) Use NumPy/pandas vectorized operations (they release the GIL internally), (4) Use C extensions (Cython, Numba), (5) Use `asyncio` ONLY if the task is I/O-bound, not CPU-bound."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "5: Deep vs Shallow Copy",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You copy a nested configuration dict, modify the copy, but the original also changes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\nconfig = {'db': {'host': 'localhost', 'port': 5432}, 'debug': True}\nnew_config = config.copy()  # Shallow copy\nnew_config['db']['host'] = 'production-server'\nprint(config['db']['host'])  # 'production-server' ← Original changed!"
    },
    {
     "t": "p",
     "text": "**Question:** Explain why and fix it."
    },
    {
     "t": "p",
     "text": "**Answer:** `.copy()` and `dict()` create shallow copies — they copy the top-level dict, but nested objects are still shared references. Both `config['db']` and `new_config['db']` point to the SAME inner dict."
    },
    {
     "t": "p",
     "text": "**Fix:** Use `copy.deepcopy()` which recursively copies all nested objects:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "new_config = copy.deepcopy(config)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "1: Unexpected Broadcasting Error",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You try to add a bias vector to a weight matrix but get a shape error."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "W = np.random.randn(128, 64)  # (128, 64)\nb = np.random.randn(128)       # (128,)\nresult = W + b  # ValueError!"
    },
    {
     "t": "p",
     "text": "**Question:** Why does this fail? How do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:** Broadcasting aligns shapes from the RIGHT. (128, 64) vs (128,) → (128, 64) vs (1, 128) → 64 ≠ 128, fails!"
    },
    {
     "t": "p",
     "text": "**Fix:** Reshape bias to add along the correct axis:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = W + b[:, np.newaxis]  # b becomes (128, 1) → broadcasts to (128, 64)\n# Or equivalently:\nresult = W + b.reshape(-1, 1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "2: Modified View vs Copy",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You slice a NumPy array, modify the slice, and the original array changes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = np.array([1, 2, 3, 4, 5])\nb = a[1:4]\nb[0] = 99\nprint(a)  # [1, 99, 3, 4, 5] ← Original changed!"
    },
    {
     "t": "p",
     "text": "**Question:** Why? When does this happen vs not?"
    },
    {
     "t": "p",
     "text": "**Answer:** NumPy slicing returns a **view** (shares memory), not a copy. Modifying the view modifies the original."
    },
    {
     "t": "ul",
     "items": [
      "**Views (share memory):** Basic slicing (`a[1:4]`), reshape, transpose",
      "**Copies (independent):** Fancy indexing (`a[[1,2,3]]`), boolean indexing (`a[a > 3]`), `.copy()`"
     ]
    },
    {
     "t": "p",
     "text": "**Fix:** Use `b = a[1:4].copy()` to ensure independence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "3: Numerical Precision",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your financial calculation gives wrong results: `0.1 + 0.2 != 0.3`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.array([0.1]) + np.array([0.2]) == np.array([0.3])  # False!"
    },
    {
     "t": "p",
     "text": "**Question:** Why and what's the correct approach?"
    },
    {
     "t": "p",
     "text": "**Answer:** Floating point representation has limited precision. 0.1 + 0.2 = 0.30000000000000004 in IEEE 754."
    },
    {
     "t": "p",
     "text": "**Fix:** Use `np.isclose()` or `np.allclose()` for comparisons:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "np.isclose(0.1 + 0.2, 0.3)         # True\nnp.allclose(result_array, expected)  # For arrays"
    },
    {
     "t": "p",
     "text": "For finance: use Python's `decimal.Decimal` or integer cents."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "1: Slow GroupBy on Large Dataset",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** `df.groupby('user_id').apply(custom_func)` takes 45 minutes on 50M rows."
    },
    {
     "t": "p",
     "text": "**Question:** How do you optimize this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Replace `apply` with built-in aggregations:** `agg('mean')`, `transform('sum')` — these are C-optimized.",
      "**Use `transform` instead of `apply` where possible** — it's vectorized per group.",
      "**Reduce data first:** Filter unnecessary rows/columns before groupby.",
      "**Use `numba` engine:** `df.groupby('x')['y'].transform('mean', engine='numba')`.",
      "**Switch to Polars:** Same operation in Polars is often 10-50× faster due to Rust backend and lazy evaluation."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "2: Merging DataFrames Causes Duplicated Rows",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** After merging two DataFrames, you get 10× more rows than expected."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = pd.merge(orders, products, on='product_id')\nprint(f\"Orders: {len(orders)}, Products: {len(products)}, Result: {len(result)}\")\n# Orders: 1000, Products: 500, Result: 10000  ← WAY too many!"
    },
    {
     "t": "p",
     "text": "**Question:** What went wrong?"
    },
    {
     "t": "p",
     "text": "**Answer:** This is a **many-to-many join** — there are duplicate `product_id` values in BOTH DataFrames. Each duplicate on the left matches every duplicate on the right (Cartesian product for those keys)."
    },
    {
     "t": "p",
     "text": "**Diagnosis:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "orders['product_id'].duplicated().sum()   # Check duplicates in left\nproducts['product_id'].duplicated().sum() # Check duplicates in right"
    },
    {
     "t": "p",
     "text": "**Fix:** (1) Deduplicate before merging: `products.drop_duplicates('product_id')`, (2) Use `validate='many_to_one'` parameter to catch this early: `pd.merge(..., validate='m:1')`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "3: SettingWithCopyWarning in Chained Operations",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You filter a DataFrame and then try to update it, but get `SettingWithCopyWarning` and the original doesn't change."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "subset = df[df['status'] == 'active']\nsubset['discount'] = 0.1  # SettingWithCopyWarning!"
    },
    {
     "t": "p",
     "text": "**Question:** What's happening and how do you fix it?"
    },
    {
     "t": "p",
     "text": "**Answer:** `df[df['status'] == 'active']` might return a view or a copy — pandas can't guarantee which. Modifying what might be a copy won't affect the original."
    },
    {
     "t": "p",
     "text": "**Fix options:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Option 1: Use .loc on the original\ndf.loc[df['status'] == 'active', 'discount'] = 0.1\n\n# Option 2: Explicit copy if you want a separate DataFrame\nsubset = df[df['status'] == 'active'].copy()\nsubset['discount'] = 0.1\n\n# Option 3: Enable Copy-on-Write (pandas 2.0+)\npd.options.mode.copy_on_write = True"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "4: Memory Error Loading Large CSV",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** `pd.read_csv('data.csv')` crashes with MemoryError on a 15GB CSV file."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Read only needed columns\ndf = pd.read_csv('data.csv', usecols=['col1', 'col2'])\n\n# 2. Read in chunks\nchunks = pd.read_csv('data.csv', chunksize=100000)\nresult = pd.concat([process(chunk) for chunk in chunks])\n\n# 3. Specify dtypes to reduce memory\ndf = pd.read_csv('data.csv', dtype={'id': 'int32', 'name': 'category'})\n\n# 4. Use Parquet (columnar, compressed)\ndf.to_parquet('data.parquet')\ndf = pd.read_parquet('data.parquet', columns=['col1', 'col2'])\n\n# 5. Use Dask for out-of-core processing\nimport dask.dataframe as dd\ndf = dd.read_csv('data.csv')\nresult = df.groupby('col').mean().compute()\n\n# 6. Use Polars (much more memory efficient)\nimport polars as pl\ndf = pl.scan_csv('data.csv').filter(pl.col('col1') > 0).collect()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "5: Time Series Gap Detection",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your IoT sensor data should have readings every 5 minutes, but some readings are missing."
    },
    {
     "t": "p",
     "text": "**Question:** How do you detect and fill the gaps?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['timestamp'] = pd.to_datetime(df['timestamp'])\ndf = df.set_index('timestamp').sort_index()\n\n# Create complete time range\nfull_range = pd.date_range(df.index.min(), df.index.max(), freq='5min')\n\n# Reindex to reveal gaps\ndf = df.reindex(full_range)\n\n# Find gaps\ngaps = df[df['sensor_value'].isnull()]\nprint(f\"Missing readings: {len(gaps)}\")\n\n# Fill strategies\ndf['value_ffill'] = df['sensor_value'].fillna(method='ffill')  # Forward fill\ndf['value_interp'] = df['sensor_value'].interpolate(method='time')  # Interpolate"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "1: A/B Test Significance",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your e-commerce company tests a new checkout design. After 2 weeks: Control (old): 2,340 conversions out of 45,000 visits (5.2%). Treatment (new): 2,650 conversions out of 46,000 visits (5.76%)."
    },
    {
     "t": "p",
     "text": "**Question:** Is the new design significantly better? How do you decide?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy import stats\n\n# Two-proportion z-test\nn1, p1 = 45000, 2340/45000\nn2, p2 = 46000, 2650/46000\np_pool = (2340 + 2650) / (45000 + 46000)\nSE = np.sqrt(p_pool * (1-p_pool) * (1/n1 + 1/n2))\nz = (p2 - p1) / SE\np_value = 1 - stats.norm.cdf(z)  # One-tailed\n\n# p_value ≈ 0.0006 < 0.05 → Statistically significant!\n# Also compute lift: (5.76 - 5.2) / 5.2 = 10.8% uplift"
    },
    {
     "t": "p",
     "text": "**Considerations:** (1) Was sample size sufficient? Run power analysis beforehand. (2) Was the test run long enough to cover weekly patterns? (3) Check for novelty effect — new users vs returning. (4) Practical significance: Is 0.56pp uplift worth the engineering cost?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "2: Simpson's Paradox",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Overall, Drug A has a higher recovery rate than Drug B. But when you split by severity (mild/severe), Drug B beats Drug A in BOTH groups."
    },
    {
     "t": "table",
     "head": [
      "",
      "Drug A",
      "Drug B"
     ],
     "rows": [
      [
       "**Mild**",
       "81/87 (93.1%)",
       "234/270 (86.7%)"
      ],
      [
       "**Severe**",
       "192/263 (73.0%)",
       "55/80 (68.8%)"
      ],
      [
       "**Overall**",
       "273/350 (78.0%)",
       "289/350 (82.6%)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Question:** Which drug is better? What's happening?"
    },
    {
     "t": "p",
     "text": "**Answer:** This is **Simpson's Paradox**. Drug B appears better overall because it was given mostly to mild cases (easier to treat). Drug A was given mostly to severe cases."
    },
    {
     "t": "p",
     "text": "**Resolution:** The **within-group** (stratified) analysis is more valid — the severity is a confounding variable. Severity → Drug Assignment AND Severity → Outcome. After controlling for severity, **Drug A is better** in both groups."
    },
    {
     "t": "p",
     "text": "**Fix:** Always check for confounders. Use stratified analysis, or regression with confounder as control variable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "3: Multiple Comparison Problem",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You test 20 different features to predict customer churn. Each at α = 0.05. You find 3 \"significant\" features (p < 0.05)."
    },
    {
     "t": "p",
     "text": "**Question:** Should you trust all 3 results?"
    },
    {
     "t": "p",
     "text": "**Answer:** No! With 20 tests at α = 0.05, you expect 20 × 0.05 = 1 false positive by chance alone. Having 3 \"significant\" results is not surprising — some may be spurious."
    },
    {
     "t": "p",
     "text": "**Fix:** Apply correction for multiple comparisons:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from statsmodels.stats.multitest import multipletests\n\nreject, pvals_corrected, _, _ = multipletests(p_values, method='bonferroni')\n# Bonferroni: α_adjusted = 0.05/20 = 0.0025 (very conservative)\n\nreject, pvals_corrected, _, _ = multipletests(p_values, method='fdr_bh')\n# Benjamini-Hochberg: Controls False Discovery Rate (less conservative, preferred)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "4: Choosing the Right Test",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to compare ML model accuracy across 3 different algorithms on the same dataset. Which statistical test do you use?"
    },
    {
     "t": "p",
     "text": "**Question:** Walk through the decision process."
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**How many groups?** 3 → Not a t-test (2 groups only)",
      "**Same subjects across groups?** Yes (same dataset) → **Repeated measures** (paired)",
      "**Data normally distributed?** Run Shapiro-Wilk test",
      "— If YES → **Repeated Measures ANOVA** + Tukey post-hoc",
      "— If NO → **Friedman test** (non-parametric alternative) + Nemenyi post-hoc",
      "**After finding overall difference:** Use post-hoc pairwise tests with correction"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Friedman test (non-parametric, related samples)\nfrom scipy.stats import friedmanchisquare\nstat, p = friedmanchisquare(model1_scores, model2_scores, model3_scores)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "1: Model Performs Well on Training, Poorly on Test",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your XGBoost model has 98% training accuracy but only 72% test accuracy."
    },
    {
     "t": "p",
     "text": "**Question:** Diagnose and fix."
    },
    {
     "t": "p",
     "text": "**Answer:** This is **overfitting** — the model memorized training data instead of learning generalizable patterns."
    },
    {
     "t": "p",
     "text": "**Diagnosis:** Plot learning curves (training vs validation score vs training set size)."
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Regularization:** Increase `max_depth` penalty, add L1/L2 (`reg_alpha`, `reg_lambda`)",
      "**Reduce complexity:** Lower `max_depth`, increase `min_child_weight`, fewer estimators",
      "**More data:** Often the best fix",
      "**Feature selection:** Remove noisy/irrelevant features",
      "**Cross-validation:** Use k-fold CV during tuning, not just a single train-test split",
      "**Early stopping:** `early_stopping_rounds=50` in XGBoost"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "2: Highly Imbalanced Classes (1% Fraud)",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Fraud detection dataset: 99% legit, 1% fraud. Your model predicts \"legit\" for everything and gets 99% accuracy."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Don't use accuracy!** Use precision, recall, F1, AUC-ROC, AUC-PR",
      "**Resampling:** SMOTE (oversample minority), undersampling majority, or combination",
      "**Class weights:** `class_weight='balanced'` in sklearn, `scale_pos_weight` in XGBoost",
      "**Threshold tuning:** Default 0.5 threshold is often wrong for imbalanced data — tune it using precision-recall curve",
      "**Ensemble:** Use bagging with balanced bootstrap samples",
      "**Anomaly detection approach:** Treat fraud as anomaly (Isolation Forest, One-Class SVM)",
      "**Cost-sensitive learning:** Assign higher misclassification cost to minority class"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "3: Feature Has High Correlation with Target but Model Doesn't Improve",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** A feature has 0.95 correlation with the target, but adding it doesn't improve model performance."
    },
    {
     "t": "p",
     "text": "**Question:** What could be happening?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Multicollinearity:** The feature's information is already captured by other features",
      "**Data leakage:** The feature might be derived from the target (check feature engineering pipeline!)",
      "**Non-linear relationship already captured:** Tree models may already capture this through other features",
      "**Feature is constant in test set:** High training correlation, zero variance in test",
      "**Scale issues:** The feature might need normalization for distance-based models"
     ]
    },
    {
     "t": "p",
     "text": "**Diagnosis:** Check VIF for multicollinearity, inspect feature importances from tree models, check if the feature is \"future leaking\" (would it be available at prediction time?)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "4: Data Leakage",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model achieves 99.5% accuracy in development but 65% in production."
    },
    {
     "t": "p",
     "text": "**Question:** Most likely cause?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Data leakage** — information from the target/future \"leaked\" into the training data."
    },
    {
     "t": "p",
     "text": "**Common sources:**"
    },
    {
     "t": "ol",
     "items": [
      "**Target leakage:** A feature that is a consequence of the target (e.g., \"cancelled_order\" feature when predicting cancellation)",
      "**Train-test contamination:** Normalizing/encoding on full dataset before splitting",
      "**Temporal leakage:** Using future data to predict past (time series must use time-based splits)",
      "**Duplicate rows:** Same record in both train and test",
      "**Preprocessing leakage:** Fitting scaler/encoder on train+test together"
     ]
    },
    {
     "t": "p",
     "text": "**Prevention:** (1) Always split FIRST, preprocess AFTER, (2) Use sklearn `Pipeline` to ensure fit_transform only on training data, (3) For time series, use `TimeSeriesSplit`, (4) Ask \"would this feature be available at prediction time?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "5: Choosing Between Models",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to choose between Logistic Regression, Random Forest, and XGBoost for a customer churn prediction problem with 500K rows and 50 features."
    },
    {
     "t": "p",
     "text": "**Question:** How would you approach this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Start simple:** Logistic Regression as baseline — fast, interpretable, gives probability calibration for free",
      "**Then try tree ensembles:** Random Forest (less tuning), then XGBoost (usually best performance)",
      "**Compare using proper evaluation:**",
      "— K-fold CV (not just one train-test split)",
      "— Business-relevant metric (e.g., recall for churn — catching more churners matters)",
      "— AUC-ROC for ranking ability",
      "**Consider practical factors:**",
      "— Interpretability requirement? → Logistic Regression or RF with feature importances",
      "— Real-time prediction? → Logistic Regression (fastest inference)",
      "— Maximum accuracy? → XGBoost with hyperparameter tuning",
      "**Check calibration:** If probability outputs are used for decisions, check calibration curves"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "1: Categorical Feature with 10,000 Unique Values",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your dataset has a \"city\" column with 10,000 unique cities. One-hot encoding creates 10,000 columns."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Target encoding:** Replace each city with the mean of the target for that city (with smoothing to avoid overfitting on rare cities)",
      "**Frequency encoding:** Replace city with its count/frequency",
      "**Group rare categories:** Top-50 cities kept, rest grouped as \"Other\"",
      "**Embedding:** For neural networks, learn a dense embedding (city → 8-dim vector)",
      "**Feature hashing:** Hash city name to a fixed number of buckets (lossy but fixed-size)",
      "**Geographic features:** Replace city with lat/lon, region, population, median income"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Target encoding with smoothing\nglobal_mean = df['target'].mean()\ncounts = df.groupby('city')['target'].count()\nmeans = df.groupby('city')['target'].mean()\nsmooth = 100  # smoothing factor\ndf['city_encoded'] = (counts * means + smooth * global_mean) / (counts + smooth)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "2: Creating Useful Features from Timestamps",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You have a \"purchase_datetime\" column and need to predict customer behavior."
    },
    {
     "t": "p",
     "text": "**Question:** What features would you extract?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['hour'] = df['datetime'].dt.hour              # Hour of day (0-23)\ndf['day_of_week'] = df['datetime'].dt.dayofweek  # 0=Mon, 6=Sun\ndf['is_weekend'] = df['day_of_week'] >= 5\ndf['month'] = df['datetime'].dt.month\ndf['quarter'] = df['datetime'].dt.quarter\ndf['is_holiday'] = df['date'].isin(holiday_list)\ndf['part_of_day'] = pd.cut(df['hour'], bins=[0,6,12,18,24], labels=['night','morning','afternoon','evening'])\n\n# Cyclical encoding for periodic features\ndf['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)\ndf['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)\n\n# Time since events\ndf['days_since_last_purchase'] = (df['date'] - df['last_purchase_date']).dt.days\ndf['recency'] = (pd.Timestamp.now() - df['last_activity']).dt.days"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "1: Inconsistent Category Names",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your \"country\" column has: 'USA', 'U.S.A.', 'United States', 'US', 'usa', 'UNITED STATES'."
    },
    {
     "t": "p",
     "text": "**Question:** How do you standardize?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Step 1: Normalize case and whitespace\ndf['country'] = df['country'].str.strip().str.lower()\n\n# Step 2: Create mapping\ncountry_map = {\n    'usa': 'united_states', 'u.s.a.': 'united_states',\n    'us': 'united_states', 'united states': 'united_states',\n}\ndf['country'] = df['country'].replace(country_map)\n\n# Step 3: For large-scale, use fuzzy matching\nfrom fuzzywuzzy import process\nchoices = ['united_states', 'united_kingdom', 'canada']\ndf['country_clean'] = df['country'].apply(\n    lambda x: process.extractOne(x, choices, score_cutoff=80)[0]\n    if process.extractOne(x, choices, score_cutoff=80) else 'unknown'\n)"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
