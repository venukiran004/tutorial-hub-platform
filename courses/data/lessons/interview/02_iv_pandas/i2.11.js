/* ============================================================================
   INTERVIEW I2.11 — Advanced Pandas · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.11",
 "lede": "**15 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Pandas · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "186",
   "q": "How do you compute trailing 12-month (TTM) metrics in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.sort_values(\"date\").set_index(\"date\")\ndf[\"ttm_revenue\"] = df[\"monthly_revenue\"].rolling(\"365D\").sum()  # Timedelta\ndf[\"ttm_avg\"] = df[\"value\"].rolling(\"365D\").mean()\n\n# For irregular dates, timedelta-based rolling is more accurate than count-based"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "What is `pd.DataFrame.diff` for change detection?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Absolute change from previous row\ndf[\"sales_change\"] = df[\"sales\"].diff()\n\n# Percentage change\ndf[\"sales_pct_change\"] = df[\"sales\"].pct_change()\n\n# Change from N periods ago\ndf[\"year_ago_diff\"] = df[\"sales\"].diff(365)\n\n# Within groups\ndf[\"group_diff\"] = df.groupby(\"store\")[\"sales\"].diff()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "What is `pd.DataFrame.applymap` (now `map`) for element-wise operations?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Element-wise operation on entire DataFrame (pandas 2.1+ uses .map for DataFrames)\ndf_clean = df.map(lambda x: x.strip() if isinstance(x, str) else x)\n\n# Format all floats\ndf_formatted = df.map(\"{:.2f}\".format)\n\n# Slower than vectorized str.strip() for string columns — use only for mixed-type DFs"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "How do you identify which rows caused an error in a Pandas apply operation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def safe_apply(func, df, col):\n    errors = {}\n    def wrapped(row):\n        try:\n            return func(row)\n        except Exception as e:\n            errors[row.name] = str(e)\n            return np.nan\n\n    result = df[col].apply(wrapped)\n    if errors:\n        print(f\"Errors in {len(errors)} rows: {list(errors.items())[:3]}\")\n    return result"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "What is `pd.DataFrame.to_dict` and its orient options?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.to_dict(orient=\"records\")   # [{\"a\": 1, \"b\": 2}, ...] — most common for APIs\ndf.to_dict(orient=\"dict\")      # {\"a\": {0: 1, ...}, \"b\": ...} — default\ndf.to_dict(orient=\"list\")      # {\"a\": [1, 2, 3], \"b\": [4, 5, 6]}\ndf.to_dict(orient=\"index\")     # {0: {\"a\": 1, \"b\": 2}, ...}\ndf.to_dict(orient=\"split\")     # {\"columns\": [...], \"index\": [...], \"data\": [[...]]}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "What is `Polars` and when should you use it over Pandas?",
   "body": [
    {
     "t": "p",
     "text": "Polars is a fast DataFrame library written in Rust with a columnar memory model (Apache Arrow):"
    },
    {
     "t": "ul",
     "items": [
      "**10-100× faster** than Pandas for large datasets.",
      "**Lazy evaluation** with query optimization (`df.lazy().filter().collect()`).",
      "**No GIL:** True multi-threaded parallel execution."
     ]
    },
    {
     "t": "p",
     "text": "Use Polars for: datasets > 1GB, ETL pipelines, production data transformations requiring speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "What is DuckDB and how does it integrate with Pandas?",
   "body": [
    {
     "t": "p",
     "text": "DuckDB is an in-process analytical SQL engine. Can query Pandas DataFrames directly:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import duckdb\nresult = duckdb.sql(\"\"\"\n    SELECT region, SUM(sales) as total\n    FROM df                   -- References the Python variable!\n    WHERE date >= '2024-01-01'\n    GROUP BY region\n    ORDER BY total DESC\n\"\"\").df()   # Returns Pandas DataFrame"
    },
    {
     "t": "p",
     "text": "10-100× faster than Pandas for aggregation queries on large DataFrames."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "What is the `vaex` library and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Out-of-core DataFrame library — processes larger-than-RAM datasets lazily using memory mapping. Alternative to Dask for single-machine, memory-limited analytics. Particularly good for 1-500GB datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "What is `cuDF` (RAPIDS) and GPU-accelerated DataFrames?",
   "body": [
    {
     "t": "p",
     "text": "NVIDIA's GPU-accelerated Pandas replacement. Nearly identical API but runs on GPU:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import cudf  # Drop-in replacement\ndf_gpu = cudf.read_parquet(\"data.parquet\")\nresult = df_gpu.groupby(\"store\")[\"sales\"].sum()\nresult.to_pandas()  # Transfer back to CPU"
    },
    {
     "t": "p",
     "text": "100-1000× faster for large datasets with NVIDIA GPU. No code logic change needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "What is `modin.pandas` and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "Drop-in Pandas replacement that distributes computations across all CPU cores (or Ray/Dask clusters):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import modin.pandas as pd  # Same API as pandas\ndf = pd.read_csv(\"large.csv\")   # Parallelized automatically"
    },
    {
     "t": "p",
     "text": "Zero code changes — just change the import. Scales reads/writes and common operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "How do you profile Pandas query performance?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import cProfile\nimport pstats\n\nwith cProfile.Profile() as pr:\n    result = expensive_pandas_operation(df)\n\nstats = pstats.Stats(pr).sort_stats(\"cumtime\")\nstats.print_stats(20)\n\n# Or simpler:\n%timeit df.groupby(\"store\")[\"sales\"].sum()          # Jupyter magic\n%time df[\"col\"].str.lower().str.replace(\" \", \"_\")   # Track single execution"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "What is `pd.DataFrame.pipe` used for in data pipelines?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def validate_schema(df, required_cols):\n    missing = set(required_cols) - set(df.columns)\n    if missing: raise ValueError(f\"Missing columns: {missing}\")\n    return df\n\ndef log_shape(df, stage=\"\"):\n    print(f\"{stage}: {df.shape}\")\n    return df\n\npipeline_result = (raw_df\n    .pipe(validate_schema, required_cols=[\"id\", \"date\", \"value\"])\n    .pipe(log_shape, stage=\"raw\")\n    .pipe(clean_data)\n    .pipe(log_shape, stage=\"cleaned\")\n    .pipe(add_features)\n    .pipe(log_shape, stage=\"features\")\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "How do you batch process large DataFrames in chunks?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def process_in_chunks(df: pd.DataFrame, chunk_size: int = 10_000, func=None):\n    results = []\n    for start in range(0, len(df), chunk_size):\n        chunk = df.iloc[start:start + chunk_size]\n        results.append(func(chunk))\n    return pd.concat(results, ignore_index=True)\n\n# Or use from CSV directly\nfor chunk in pd.read_csv(\"data.csv\", chunksize=10_000):\n    processed = transform(chunk)\n    processed.to_parquet(f\"output/part_{i}.parquet\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "What is data lineage and how do you implement it in Pandas pipelines?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\n\ndef track_lineage(func):\n    @functools.wraps(func)\n    def wrapper(df, *args, **kwargs):\n        before_shape = df.shape\n        result = func(df, *args, **kwargs)\n        after_shape = result.shape\n        print(f\"{func.__name__}: {before_shape} → {after_shape} \"\n              f\"(rows: {before_shape[0]-after_shape[0]:+}, cols: {before_shape[1]-after_shape[1]:+})\")\n        return result\n    return wrapper\n\n@track_lineage\ndef remove_nulls(df): return df.dropna()\n\n@track_lineage\ndef add_features(df): return df.assign(revenue_log=np.log1p(df[\"revenue\"]))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "What does a production-ready Pandas data pipeline look like?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class DataPipeline:\n    def __init__(self, config):\n        self.config = config\n        self.logger = logging.getLogger(__name__)\n\n    def run(self, source_path: str) -> pd.DataFrame:\n        df = self._load(source_path)\n        df = self._validate(df)\n        df = self._clean(df)\n        df = self._transform(df)\n        df = self._feature_engineer(df)\n        self._save(df)\n        return df\n\n    def _load(self, path): ...\n    def _validate(self, df): ...  # pandera schema check\n    def _clean(self, df): ...     # nulls, types, outliers\n    def _transform(self, df): ... # reshape, aggregate\n    def _feature_engineer(self, df): ...\n    def _save(self, df): ...      # to parquet/database"
    },
    {
     "t": "p",
     "text": "*Last Updated: April 2026* *Topic: Pandas Interview Questions*"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
