/* ============================================================================
   INTERVIEW I2.4 — Time Series · Performance & Advanced
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.4",
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
   "text": "Time Series · Performance & Advanced",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "How do you create and work with datetime columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"date\"] = pd.to_datetime(df[\"date_str\"])\ndf[\"year\"]  = df[\"date\"].dt.year\ndf[\"month\"] = df[\"date\"].dt.month\ndf[\"day_of_week\"] = df[\"date\"].dt.day_name()\ndf[\"is_weekend\"] = df[\"date\"].dt.dayofweek >= 5"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is `DatetimeIndex` and how do you use it?",
   "body": [
    {
     "t": "p",
     "text": "Setting a datetime column as index enables time-based slicing:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.set_index(\"date\")\ndf[\"2024\"]           # All of 2024\ndf[\"2024-01\":\"2024-06\"]  # Jan–Jun 2024"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How do you resample time series data?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.resample(\"M\").sum()    # Monthly sum\ndf.resample(\"W\").mean()   # Weekly mean\ndf.resample(\"Q\").agg({\"sales\": \"sum\", \"orders\": \"count\"})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is `shift` in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"prev_day_sales\"] = df[\"sales\"].shift(1)   # Lag feature\ndf[\"next_day_sales\"] = df[\"sales\"].shift(-1)  # Lead feature\ndf[\"daily_change\"]   = df[\"sales\"] - df[\"sales\"].shift(1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How do you handle time zones in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"ts\"] = pd.to_datetime(df[\"ts\"], utc=True)\ndf[\"ts_et\"] = df[\"ts\"].dt.tz_convert(\"US/Eastern\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What makes Pandas slow and how do you optimize it?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Avoid row-by-row loops; use vectorized operations.",
      "Use appropriate dtypes (`int32` vs `int64`, `category`).",
      "Use `query()` for filtering (can be faster than boolean indexing for large DataFrames).",
      "Avoid `apply` where vectorization is possible.",
      "Use `chunksizes` when reading large files."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "How do you reduce memory usage in a Pandas DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Downcast numeric types\ndf[\"age\"] = pd.to_numeric(df[\"age\"], downcast=\"integer\")\ndf[\"price\"] = pd.to_numeric(df[\"price\"], downcast=\"float\")\n# Convert low-cardinality strings to category\ndf[\"city\"] = df[\"city\"].astype(\"category\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is chunked reading and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "For files too large to fit in memory, read in chunks:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "chunks = []\nfor chunk in pd.read_csv(\"huge.csv\", chunksize=100_000):\n    chunks.append(chunk[chunk[\"age\"] > 25])\ndf = pd.concat(chunks, ignore_index=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is `eval()` in Pandas and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "`df.eval(\"c = a + b\")` uses numexpr under the hood for faster computation on large DataFrames. Avoids creating intermediate Python objects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is the difference between `copy()` and assignment in DataFrames?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df2 = df.copy()         # Independent deep copy\ndf2 = df                # Same object — mutating df2 mutates df\ndf2 = df[[\"a\", \"b\"]]   # Might be a view — use .copy() to be safe"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is `pd.Categorical`?",
   "body": [
    {
     "t": "p",
     "text": "Represents categorical data with a fixed set of possible values (categories). Enables ordered categories, efficient storage, and category-aware operations:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"grade\"] = pd.Categorical(df[\"grade\"], categories=[\"F\",\"D\",\"C\",\"B\",\"A\"], ordered=True)\ndf[df[\"grade\"] > \"C\"]  # Category-aware comparison"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "How do you write a DataFrame to various formats?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.to_csv(\"output.csv\", index=False)\ndf.to_parquet(\"output.parquet\")     # Columnar, compressed, fast\ndf.to_excel(\"output.xlsx\", index=False)\ndf.to_json(\"output.json\", orient=\"records\")\ndf.to_sql(\"table_name\", con=engine, if_exists=\"replace\", index=False)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is Parquet and why is it preferred over CSV for large datasets?",
   "body": [
    {
     "t": "p",
     "text": "Parquet is a columnar binary format. Benefits: much smaller file size (compression), faster reads (column pruning), preserves dtypes. Ideal for ML pipelines and data lakes. Pandas reads/writes via `pyarrow` or `fastparquet`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is `pd.DataFrame.pipe()`?",
   "body": [
    {
     "t": "p",
     "text": "Enables clean, chainable data transformation pipelines:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def clean_names(df):\n    df.columns = df.columns.str.lower().str.replace(\" \", \"_\")\n    return df\n\ndf = (pd.read_csv(\"data.csv\")\n    .pipe(clean_names)\n    .pipe(lambda d: d.dropna(subset=[\"age\"]))\n    .pipe(lambda d: d[d[\"age\"] > 18])\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "How do you profile Pandas code performance?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "%timeit df[\"col\"].apply(lambda x: x*2)   # Jupyter magic\n# Or\nimport time\nstart = time.time()\ndf[\"col\"] * 2\nprint(time.time() - start)"
    },
    {
     "t": "p",
     "text": "Use `pandas-profiling` / `ydata-profiling` for a full statistical report."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
