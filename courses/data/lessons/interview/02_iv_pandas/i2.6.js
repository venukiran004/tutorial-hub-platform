/* ============================================================================
   INTERVIEW I2.6 — Advanced Scenarios
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.6",
 "lede": "**30 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Scenarios",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How do you merge DataFrames on multiple columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "pd.merge(df1, df2, on=[\"user_id\", \"product_id\"])\npd.merge(df1, df2, left_on=[\"uid\", \"pid\"], right_on=[\"user\", \"product\"])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is `pd.IndexSlice` and why is it useful?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "idx = pd.IndexSlice\ndf.loc[idx[\"2024\":\"2024-06\", \"ProductA\"], :]  # Slice MultiIndex rows"
    },
    {
     "t": "p",
     "text": "Clean way to slice MultiIndex DataFrames without complex tuples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "How do you apply multiple aggregations to different columns simultaneously?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby(\"dept\").agg(\n    avg_salary=(\"salary\", \"mean\"),\n    max_salary=(\"salary\", \"max\"),\n    emp_count=(\"emp_id\", \"count\"),\n    total_sales=(\"sales\", \"sum\")\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the `IntervalIndex` in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "An index of `Interval` objects. Useful for representing bins, age ranges, duration ranges. Used with `pd.cut` results as index."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "How do you compute correlation between columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.corr()                          # Pearson correlation matrix\ndf.corr(method=\"spearman\")        # Spearman rank correlation\ndf[\"a\"].corr(df[\"b\"])             # Single pair"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "76",
   "q": "What is the difference between `df[\"col\"]` and `df[[\"col\"]]`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`df[\"col\"]` returns a **Series**.",
      "`df[[\"col\"]]` returns a **DataFrame** with one column. Important distinction for many Pandas operations."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "How do you work with sparse data in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"sparse_col\"] = pd.arrays.SparseArray(df[\"col\"])"
    },
    {
     "t": "p",
     "text": "For columns with mostly zeros or NaN (e.g., one-hot encoded features with high cardinality), sparse storage saves significant memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "How do you create a date range?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "dates = pd.date_range(start=\"2024-01-01\", end=\"2024-12-31\", freq=\"D\")\nmonths = pd.date_range(start=\"2024-01\", periods=12, freq=\"MS\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "How do you read only specific columns from a large CSV?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df = pd.read_csv(\"large.csv\", usecols=[\"date\", \"sales\", \"city\"])\ndf = pd.read_csv(\"large.csv\", usecols=[\"date\",\"sales\"], dtype={\"sales\": \"float32\"})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is `pd.Series.map` vs `apply`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`.map(dict_or_func)`: Element-wise transformation on a Series. Can use a dict for mapping values.",
      "`.apply(func)`: Element-wise function (more general, slightly slower)."
     ]
    },
    {
     "t": "p",
     "text": "For simple value mapping, `.map(dict)` is fastest."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you handle large integer IDs that overflow int64?",
   "body": [
    {
     "t": "p",
     "text": "Store as object (string) dtype or use `UInt64` if values are always non-negative but exceed signed int64 max (9.2 × 10¹⁸)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What are common Pandas performance anti-patterns?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Using `iterrows` or `itertuples` in loops (use vectorized ops).",
      "Repeatedly appending rows in a loop (use `pd.concat` once at the end).",
      "Not using `dtype` specification when reading CSVs.",
      "Modifying slices (triggers copy warnings and bugs).",
      "Forgetting to reset index after filtering."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is `SettingWithCopyWarning` and how do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "Occurs when modifying a DataFrame that may be a view of another. Fix: use `.copy()` when creating a subset you plan to modify:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df_subset = df[df[\"age\"] > 25].copy()\ndf_subset[\"new_col\"] = 1  # Safe now"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How do you compute percentiles for each group?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby(\"dept\")[\"salary\"].quantile(0.9)\ndf.groupby(\"dept\")[\"salary\"].describe()  # All common percentiles"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is `pd.wide_to_long`?",
   "body": [
    {
     "t": "p",
     "text": "Converts wide data with repetitive column naming patterns to long format:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.wide_to_long(df, stubnames=[\"score\"], i=\"user_id\", j=\"test_num\")\n# Converts score1, score2, score3 → long format with test_num column"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "How do you compute cumulative statistics?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"cumsum\"]    = df[\"sales\"].cumsum()\ndf[\"cumprod\"]   = df[\"sales\"].cumprod()\ndf[\"cummax\"]    = df[\"sales\"].cummax()\ndf[\"cummin\"]    = df[\"sales\"].cummin()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the `Styler` API in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "Applies visual formatting (colors, bold, bars) to DataFrames displayed in Jupyter notebooks:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.style.highlight_max(axis=0).format({\"price\": \"${:.2f}\"})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "How do you do a fuzzy/approximate string merge?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Using thefuzz (formerly fuzzywuzzy)\nfrom thefuzz import process\nmatches = df1[\"name\"].apply(lambda x: process.extractOne(x, df2[\"name\"]))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How do you build a lag feature matrix for ML?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "for lag in [1, 2, 3, 7, 14, 30]:\n    df[f\"sales_lag_{lag}\"] = df[\"sales\"].shift(lag)\ndf.dropna(inplace=True)  # Drop rows with NaN from lags"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the `infer_objects()` method?",
   "body": [
    {
     "t": "p",
     "text": "Attempts to infer better dtypes for object-type columns that actually contain numeric or boolean data. Lightweight type inference pass."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "How do you find rows where any column contains a specific value?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "mask = (df == target_value).any(axis=1)\ndf[mask]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is `pd.json_normalize`?",
   "body": [
    {
     "t": "p",
     "text": "Flattens semi-structured nested JSON/dict data into a flat DataFrame:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = [{\"user\": {\"name\": \"Alice\", \"age\": 30}, \"city\": \"NYC\"}]\npd.json_normalize(data)\n# → columns: user.name, user.age, city"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "How do you compute the lag autocorrelation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"sales\"].autocorr(lag=7)   # Correlation with 7-period lag"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is `pd.DataFrame.combine_first`?",
   "body": [
    {
     "t": "p",
     "text": "Patches missing values in one DataFrame with values from another. Useful for combining incomplete datasets:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df_filled = df1.combine_first(df2)  # Prefer df1; use df2 where df1 is NaN"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "How do you compare two DataFrames?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df1.equals(df2)                    # True if exactly equal\ndf1.compare(df2)                   # Show differences (Pandas 1.1+)\n(df1 != df2).any().any()           # Any difference exists?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How do you perform an anti-join in Pandas (rows in A not in B)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# LEFT anti-join: rows in df1 with no match in df2\nmerged = pd.merge(df1, df2[[\"id\"]], on=\"id\", how=\"left\", indicator=True)\ndf_antijoin = merged[merged[\"_merge\"] == \"left_only\"].drop(\"_merge\", axis=1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "How do you sample a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.sample(n=100)          # 100 random rows\ndf.sample(frac=0.1)       # 10% random sample\ndf.sample(frac=1).reset_index(drop=True)  # Random shuffle"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is `pd.testing.assert_frame_equal`?",
   "body": [
    {
     "t": "p",
     "text": "Test utility that checks if two DataFrames are equal and provides detailed diffs on failure. Essential for validating data pipeline outputs in unit tests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the Arrow backend in Pandas 2.0+?",
   "body": [
    {
     "t": "p",
     "text": "Pandas 2.0+ supports Apache Arrow as an optional backend for some dtypes (`pd.ArrowDtype`). Offers: better performance for string operations, smaller memory footprint, interoperability with Polars/Spark Arrow."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "When should you switch from Pandas to Polars, Dask, or Spark?",
   "body": [
    {
     "t": "table",
     "head": [
      "Situation",
      "Tool"
     ],
     "rows": [
      [
       "> 1GB, single machine",
       "Polars (10–100× faster, lazy eval)"
      ],
      [
       "Multiple GBs, multi-core",
       "Dask (Pandas-like API, parallel)"
      ],
      [
       "Distributed (TBs)",
       "PySpark"
      ],
      [
       "Streaming data",
       "Faust, Kafka + PySpark"
      ],
      [
       "GPU acceleration",
       "cuDF (RAPIDS)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Pandas is optimal for < 1GB exploratory data analysis."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
