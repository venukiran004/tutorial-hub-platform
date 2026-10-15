/* ============================================================================
   INTERVIEW I2.10 — Advanced Pandas · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.10",
 "lede": "**25 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Pandas · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "161",
   "q": "What is a multi-level column index and how do you work with it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create multi-level columns\nresult = df.groupby(\"store\").agg(\n    {\"sales\": [\"sum\", \"mean\", \"std\"], \"transactions\": [\"count\"]}\n)\n# result.columns = MultiIndex([(\"sales\", \"sum\"), (\"sales\", \"mean\"), ...])\n\nresult.columns = [\"_\".join(c) for c in result.columns]  # Flatten\nresult[(\"sales\", \"sum\")]   # Access level-0 then level-1\nresult[\"sales\"][\"sum\"]     # Equivalent\nresult[\"sales\"]            # All aggregations of sales"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "What is `pd.IndexSlice` for multi-index slicing?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.set_index([\"region\", \"store\", \"date\"])\nidx = pd.IndexSlice\n\n# Select all stores in \"EMEA\" region after 2024-01-01\ndf.loc[idx[\"EMEA\", :, \"2024-01-01\":], :]\n\n# Select specific region/store combination\ndf.loc[idx[\"APAC\", \"store_001\"], :]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "How do you sort a multi-index DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df_multi = df.set_index([\"region\", \"date\"]).sort_index()\n\n# Sort by specific level\ndf_multi.sort_index(level=\"date\")\n\n# Sort must be performed before partial slicing on multi-index\n# UnsortedIndexError if not sorted"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "What is `pd.DataFrame.xs` (cross-section)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Select a cross-section from a multi-index\ndf.xs(\"EMEA\", level=\"region\")              # All rows for EMEA\ndf.xs(\"2024-01\", level=\"month\", drop_level=False)\ndf.xs((\"EMEA\", \"Q1\"), level=[\"region\", \"quarter\"])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "What is the difference between `pd.concat` and `pd.DataFrame.combine_first`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# concat: Stack DataFrames (axis=0 or axis=1)\npd.concat([df1, df2], axis=0, ignore_index=True)\n\n# combine_first: Fill NaN in df1 with values from df2 (aligned by index)\ncombined = df1.combine_first(df2)\n# NaN in df1 → takes value from df2 at same index\n# Like coalesce(df1, df2) in SQL"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "What is `pd.DataFrame.update`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Update df1 in-place with non-NA values from df2 (aligned by index/columns)\ndf1.update(df2)                  # Overwrites df1 values where df2 is not NaN\ndf1.update(df2, overwrite=False) # Only fills NaN in df1 — doesn't overwrite existing values"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "What is `pd.Series.map` vs `pd.Series.apply` vs `pd.Series.transform`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# map: Element-wise; accepts dict, Series, or function; fastest\ns.map({\"a\": 1, \"b\": 2})\ns.map(lambda x: x.upper())\n\n# apply: Flexible; can return scalar or Series; slower\ns.apply(custom_function)\n\n# transform: Returns same-size result (like apply but for groups)\ndf.groupby(\"g\")[\"v\"].transform(\"mean\")"
    },
    {
     "t": "p",
     "text": "Prefer `map` for simple mappings/substitutions; `apply` for complex transformations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "What is `pd.DataFrame.explode`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Expand list values to separate rows\ndf = pd.DataFrame({\"id\": [1, 2], \"tags\": [[\"python\", \"ml\"], [\"pandas\"]]})\ndf.explode(\"tags\")\n#    id    tags\n# 0   1  python\n# 0   1      ml\n# 1   2  pandas\n\n# Multiple columns (pandas 1.3+)\ndf.explode([\"tags\", \"scores\"])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "What is `pd.DataFrame.drop_duplicates` with Categorical columns?",
   "body": [
    {
     "t": "p",
     "text": "Categorical columns are compared by their code values (integers) rather than strings — much faster for high-cardinality columns when detecting duplicates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "What is `pd.NA` vs `np.nan` vs `None`?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "np.nan",
      "pd.NA",
      "None"
     ],
     "rows": [
      [
       "Type",
       "float",
       "NAType",
       "NoneType"
      ],
      [
       "dtype",
       "float64",
       "any nullable",
       "object"
      ],
      [
       "Arithmetic",
       "nan propagates",
       "NA propagates",
       "TypeError"
      ],
      [
       "Boolean",
       "True",
       "pd.NA (error)",
       "False"
      ],
      [
       "Best for",
       "Float columns",
       "Nullable int/string",
       "Object columns"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "What are Pandas nullable integer types?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Standard int64 cannot hold NaN (NaN is float)\ns = pd.array([1, 2, None, 4], dtype=\"Int64\")  # Capital I — nullable Int64\ndf[\"count\"] = df[\"count\"].astype(\"Int64\")       # Convert to nullable\n\n# Also: Int8, Int16, Int32, Float32, Float64 (capital letters)\n# Standard: int8, float64 (lowercase, no NaN support)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "What is `pd.StringDtype()` and why is it better than `object`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"name\"] = df[\"name\"].astype(\"string\")  # pd.StringDtype()\n\n# Benefits:\n# - NA represented by pd.NA (not np.nan — avoids NaN is float confusion)\n# - String methods work the same\n# - Better memory usage than object dtype\n# - Arrow-backed string (string[pyarrow]) is even faster for large string data"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "How do you use `pd.Grouper` for time-based aggregation?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# When DatetimeIndex is not the index, use pd.Grouper\ndf[\"date\"] = pd.to_datetime(df[\"date\"])\nmonthly = df.groupby(pd.Grouper(key=\"date\", freq=\"ME\"))[\"sales\"].sum()\n\n# Multiple groupers: group by region AND month\nresult = df.groupby([\"region\", pd.Grouper(key=\"date\", freq=\"QE\")])[\"revenue\"].sum()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "What is `pd.DataFrame.isin` for filtering?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Filter rows where column value is in a list\ndf[df[\"category\"].isin([\"A\", \"B\", \"C\"])]\ndf[~df[\"status\"].isin([\"deleted\", \"archived\"])]  # NOT in (inverted)\n\n# Multi-column: dictionary form\ndf.isin({\"status\": [\"active\"], \"tier\": [\"gold\", \"platinum\"]})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "What is `pd.DataFrame.where` vs `pd.DataFrame.mask`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# where: Replace values where condition is FALSE with other\ndf[\"clipped\"] = df[\"sales\"].where(df[\"sales\"] > 0, other=0)  # Negative → 0\n\n# mask: Replace values where condition is TRUE with other\ndf[\"flagged\"] = df[\"sales\"].mask(df[\"sales\"] < 0, other=-999)  # Negative → -999\n\n# where = keep when True; mask = replace when True (opposite conditions)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "176",
   "q": "How do you work with nested DataFrames and list columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create nested structure (list column)\ndf[\"features\"] = df.apply(lambda r: [r[\"a\"], r[\"b\"], r[\"c\"]], axis=1)\n\n# Expand to matrix\nfeature_matrix = np.vstack(df[\"features\"].values)\n\n# Convert dict column\nrecords = df[\"metadata\"].apply(pd.Series)\ndf = pd.concat([df.drop(\"metadata\", axis=1), records], axis=1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "What is `pd.DataFrame.lookup` (deprecated — replacement)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Old (deprecated): df.lookup(rows, cols)\n# New (pandas 1.2+): Advanced indexing\nrows = df.index\ncols_per_row = column_series.values  # One column name per row\nresult = [df.loc[r, c] for r, c in zip(rows, cols_per_row)]\n\n# Or using NumPy for speed:\nrow_idx = np.arange(len(df))\ncol_idx = df.columns.get_indexer(cols_per_row)\nresult = df.values[row_idx, col_idx]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "What is `pd.CategoricalIndex` and when should you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Replace object/string index with categorical\ndf.index = pd.CategoricalIndex(df.index, categories=category_order, ordered=True)\ndf.sort_index()  # Sorts by category order, not alphabetically\n\n# Use when index is a categorical variable with known ordering\n# Example: size labels (\"S\", \"M\", \"L\", \"XL\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "How do you use `pd.cut` with custom label formatting?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "bins = [0, 25000, 50000, 100000, float(\"inf\")]\nlabels = [\"<25K\", \"25K-50K\", \"50K-100K\", \">100K\"]\n\ndf[\"salary_band\"] = pd.cut(df[\"salary\"], bins=bins, labels=labels, right=False)\n\n# Get bin counts\ndf[\"salary_band\"].value_counts().sort_index()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "What is `pd.DataFrame.sample` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Random sample without replacement\nsample = df.sample(n=1000, random_state=42)\n\n# Stratified sampling by column\nstratified = df.groupby(\"category\", group_keys=False).apply(\n    lambda g: g.sample(frac=0.1)\n)\n\n# Weighted sampling\ndf.sample(n=500, weights=\"probability_col\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "What is `pd.DataFrame.memory_usage` and optimization strategies?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Get memory per column\ndf.memory_usage(deep=True)                   # Includes string object heap\ndf.memory_usage(deep=True).sum() / 1e6      # Total in MB\n\n# Optimization strategies (ranked by impact):\n# 1. Categorical for repeated strings\n# 2. Downcast numeric types\n# 3. Sparse arrays for mostly-NaN data\n# 4. pyarrow backend"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "What is `pd.arrays.SparseArray` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# When DataFrame has mostly zeros/NaN (>90% fill value)\nsparse_col = pd.arrays.SparseArray(data, fill_value=0.0)\ndf[\"sparse\"] = sparse_col\n\n# Check density\ndf[\"sparse\"].sparse.density   # Fraction of non-fill values\ndf[\"sparse\"].sparse.npoints   # Number of stored (non-fill) values"
    },
    {
     "t": "p",
     "text": "Used in recommendation systems, NLP term-frequency matrices, sensor data with many missing values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "What is `pd.IntervalIndex` and range/overlap queries?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create interval index for range lookups\nintervals = pd.IntervalIndex.from_breaks([0, 10, 20, 30, 50, 100])\nintervals.contains(15)      # Which interval contains 15?\n\n# Use case: IP range lookups, date range categorization\nbins = pd.cut(df[\"age\"], bins=[0, 18, 35, 65, 100])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "How do you efficiently compute pair-wise distances in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy.spatial.distance import cdist\n\n# Compute pairwise cosine distances between all rows\nfeature_cols = [\"f1\", \"f2\", \"f3\", \"f4\"]\ndistances = cdist(df[feature_cols].values, df[feature_cols].values, metric=\"cosine\")\ndist_df = pd.DataFrame(distances, index=df[\"id\"], columns=df[\"id\"])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "What is `pd.DataFrame.swaplevel` and when is it useful?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Swap levels in a multi-index\ndf_swapped = df.swaplevel(\"region\", \"date\")\n\n# Useful when you need to sort or select by the inner level\ndf_swapped.sort_index(level=\"region\")\ndf_swapped.loc[\"2024\"]  # Now date is level 0"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
