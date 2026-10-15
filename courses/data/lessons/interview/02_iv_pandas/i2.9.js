/* ============================================================================
   INTERVIEW I2.9 — Performance, I/O & Production
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.9",
 "lede": "**20 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Performance, I/O & Production",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is vectorization and why is it critical for Pandas performance?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Slow: Python loop\nfor idx in df.index:\n    df.at[idx, \"result\"] = df.at[idx, \"a\"] * df.at[idx, \"b\"]\n\n# Fast: Vectorized operation (C-level execution)\ndf[\"result\"] = df[\"a\"] * df[\"b\"]   # 100-1000x faster\n\n# Rule: If you can express it as element-wise operations, vectorize it"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What are the different Pandas I/O formats and their trade-offs?",
   "body": [
    {
     "t": "table",
     "head": [
      "Format",
      "Speed",
      "File Size",
      "Preserves Types",
      "Partial Read",
      "Best For"
     ],
     "rows": [
      [
       "CSV",
       "Slow",
       "Large",
       "No",
       "Yes",
       "Portability"
      ],
      [
       "Parquet",
       "Fast",
       "Small",
       "Yes",
       "Yes (cols)",
       "Analytics"
      ],
      [
       "HDF5",
       "Fast",
       "Small",
       "Yes",
       "Yes",
       "Numeric"
      ],
      [
       "Feather",
       "Very fast",
       "Medium",
       "Yes",
       "Yes (cols)",
       "Intermediate"
      ],
      [
       "JSON",
       "Slow",
       "Very large",
       "Partial",
       "No",
       "APIs"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "How do you read only specific columns from Parquet?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Read only needed columns (never reads others from disk)\ndf = pd.read_parquet(\"data.parquet\", columns=[\"id\", \"date\", \"revenue\"])\n\n# With filters (predicate pushdown)\ndf = pd.read_parquet(\"data.parquet\",\n    columns=[\"id\", \"revenue\"],\n    filters=[(\"date\", \">=\", \"2024-01-01\"), (\"region\", \"==\", \"EMEA\")])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "How do you write and read Parquet files with partitioning?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Write partitioned Parquet\ndf.to_parquet(\"data/\", partition_cols=[\"year\", \"month\"], engine=\"pyarrow\")\n\n# Structure: data/year=2024/month=3/part-0.parquet\n\n# Read specific partition\ndf = pd.read_parquet(\"data/\", filters=[(\"year\", \"==\", 2024), (\"month\", \"==\", 3)])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is `pd.read_csv` chunking and when should you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Process large CSV without loading into memory\nresults = []\nfor chunk in pd.read_csv(\"large.csv\", chunksize=100_000):\n    processed = chunk.groupby(\"store\")[\"sales\"].sum()\n    results.append(processed)\n\nfinal = pd.concat(results).groupby(level=0).sum()"
    },
    {
     "t": "p",
     "text": "Use when CSV doesn't fit in RAM. For structured analytics, convert to Parquet first."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is `pd.HDFStore` and HDF5 for large datasets?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with pd.HDFStore(\"data.h5\", mode=\"w\") as store:\n    store.put(\"df\", df, format=\"table\")    # Table format allows querying\n\n# Read with condition (fast for numeric filters)\nwith pd.HDFStore(\"data.h5\") as store:\n    result = store.select(\"df\", where=\"date >= '2024-01-01' and value > 100\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "How do you optimize DataFrame memory using downcasting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def downcast_df(df: pd.DataFrame) -> pd.DataFrame:\n    for col in df.select_dtypes(include=\"integer\").columns:\n        df[col] = pd.to_numeric(df[col], downcast=\"integer\")  # int64 → int8/16/32\n    for col in df.select_dtypes(include=\"float\").columns:\n        df[col] = pd.to_numeric(df[col], downcast=\"float\")    # float64 → float32\n    return df\n\n# Can reduce memory 50-75%"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is `pd.api.types.is_*` type checking functions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from pandas.api.types import (\n    is_numeric_dtype,\n    is_string_dtype,\n    is_datetime64_dtype,\n    is_categorical_dtype,\n    is_integer_dtype\n)\n\n# Use in data validation\nassert is_numeric_dtype(df[\"revenue\"]), \"revenue must be numeric\"\nnumeric_cols = [c for c in df.columns if is_numeric_dtype(df[c])]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is `pd.DataFrame.pipe` and method chaining?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def add_features(df):\n    return df.assign(\n        age_squared=lambda x: x[\"age\"] ** 2,\n        log_income=lambda x: np.log1p(x[\"income\"])\n    )\n\ndef remove_outliers(df, col, threshold=3):\n    z = np.abs((df[col] - df[col].mean()) / df[col].std())\n    return df[z < threshold]\n\nresult = (df\n    .pipe(add_features)\n    .pipe(remove_outliers, col=\"age\")\n    .dropna()\n    .reset_index(drop=True)\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "How do you efficiently compute value counts for multiple columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Single column\ndf[\"category\"].value_counts(normalize=True)          # Proportions\ndf[\"category\"].value_counts(dropna=False)            # Include NaN\n\n# Multiple columns\nfor col in [\"col1\", \"col2\", \"col3\"]:\n    print(f\"\\n{col}:\")\n    print(df[col].value_counts())\n\n# Combined: multi-column frequency\ndf.groupby([\"region\", \"category\"]).size().reset_index(name=\"count\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "151",
   "q": "What is `pd.ExcelWriter` and writing multiple sheets?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with pd.ExcelWriter(\"report.xlsx\", engine=\"openpyxl\") as writer:\n    summary_df.to_excel(writer, sheet_name=\"Summary\", index=False)\n    detail_df.to_excel(writer, sheet_name=\"Detail\", index=False)\n\n    # Apply formatting\n    workbook = writer.book\n    worksheet = writer.sheets[\"Summary\"]\n    # ... add charts, conditional formatting, etc."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "How do you read multiple sheets from an Excel file?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Read all sheets into dict of DataFrames\nall_sheets = pd.read_excel(\"report.xlsx\", sheet_name=None)\n\n# Read specific sheets\nsheets = pd.read_excel(\"report.xlsx\", sheet_name=[\"Sheet1\", \"Sheet3\"])\n\n# Concatenate all sheets\ncombined = pd.concat(all_sheets.values(), ignore_index=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "What is `pd.to_sql` and reading from databases?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sqlalchemy import create_engine\n\nengine = create_engine(\"postgresql://user:pass@host/dbname\")\n\n# Write to database\ndf.to_sql(\"table_name\", engine, if_exists=\"replace\", index=False, chunksize=10000)\n\n# Read from database\ndf = pd.read_sql(\"SELECT * FROM table WHERE date >= '2024-01-01'\", engine)\ndf = pd.read_sql_table(\"table_name\", engine, schema=\"public\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "What is `pyarrow` backend for Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Enable ArrowDtype backend for better performance and interop\ndf = pd.read_parquet(\"data.parquet\", dtype_backend=\"pyarrow\")\n# OR\ndf = df.convert_dtypes(dtype_backend=\"pyarrow\")\n\n# Benefits:\n# - Native string type (not object)\n# - Null support for all types\n# - Better integration with Polars, DuckDB"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "What is `pd.DataFrame.style` for formatted output?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "(df.style\n    .format({\"revenue\": \"${:,.0f}\", \"margin\": \"{:.1%}\"})\n    .background_gradient(cmap=\"RdYlGn\", subset=[\"margin\"])\n    .highlight_max(subset=[\"revenue\"], color=\"lightgreen\")\n    .highlight_null(color=\"lightpink\")\n    .set_caption(\"Sales Report Q1 2024\")\n    .to_excel(\"formatted_report.xlsx\", engine=\"openpyxl\")\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "156",
   "q": "How do you perform data validation in Pandas pipelines?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandera as pa\n\nschema = pa.DataFrameSchema({\n    \"age\": pa.Column(int, pa.Check.in_range(0, 120)),\n    \"email\": pa.Column(str, pa.Check.str_matches(r\".+@.+\\..+\")),\n    \"status\": pa.Column(str, pa.Check.isin([\"active\", \"inactive\"])),\n    \"revenue\": pa.Column(float, nullable=True, pa.Check(lambda s: s.sum() > 0))\n})\n\nvalidated_df = schema.validate(df)  # Raises SchemaError if validation fails"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "What is `pd.testing.assert_frame_equal` used for?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas.testing as tm\n\n# In unit tests for data transformation functions\ndef test_normalize():\n    input_df = pd.DataFrame({\"a\": [1, 2, 3]})\n    expected = pd.DataFrame({\"a\": [0.0, 0.5, 1.0]})\n    result = normalize(input_df)\n    tm.assert_frame_equal(result, expected, check_exact=False, rtol=1e-5)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "What is `pd.DataFrame.compare`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Compare two DataFrames (same shape), show differences\ndiff = df_before.compare(df_after)\n# Returns DataFrame with only changed cells, \"self\" vs \"other\" columns\n\ndiff = df_before.compare(df_after, align_axis=0)  # Side-by-side or stacked"
    },
    {
     "t": "p",
     "text": "Useful for audit logging, tracking changes between pipeline stages."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "What is `pd.option_context` and display settings?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with pd.option_context(\n    \"display.max_rows\", 100,\n    \"display.max_columns\", 30,\n    \"display.float_format\", \"{:.4f}\".format,\n    \"display.max_colwidth\", 200\n):\n    print(df.head(50))   # Uses settings only within this block\n\n# Permanent settings:\npd.set_option(\"display.max_rows\", 100)\npd.reset_option(\"display.max_rows\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "What is `pd.read_csv` with `dtype` parameter for optimization?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df = pd.read_csv(\"data.csv\", dtype={\n    \"id\": \"int32\",\n    \"category\": \"category\",\n    \"amount\": \"float32\",\n    \"status\": \"category\"\n})\n# Specifying dtype upfront avoids dtype inference (faster) and saves memory"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
