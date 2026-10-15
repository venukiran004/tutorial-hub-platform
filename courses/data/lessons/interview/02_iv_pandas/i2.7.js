/* ============================================================================
   INTERVIEW I2.7 — Data Cleaning & Preparation
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.7",
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
   "text": "Data Cleaning & Preparation",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "How do you detect and handle duplicate rows in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Detect\ndf.duplicated()                              # Boolean Series\ndf.duplicated(subset=[\"id\", \"date\"])         # Subsets of columns\ndf.duplicated().sum()                        # Count duplicates\n\n# Remove\ndf.drop_duplicates()                         # Keep first occurrence\ndf.drop_duplicates(subset=[\"id\"], keep=\"last\")\ndf.drop_duplicates(keep=False)               # Remove ALL duplicates, including first"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "How do you identify and treat outliers in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Z-score method\nfrom scipy import stats\nz_scores = np.abs(stats.zscore(df[\"value\"]))\ndf_clean = df[z_scores < 3]\n\n# IQR method\nQ1, Q3 = df[\"value\"].quantile([0.25, 0.75])\nIQR = Q3 - Q1\ndf_clean = df[df[\"value\"].between(Q1 - 1.5*IQR, Q3 + 1.5*IQR)]\n\n# Winsorizing (clip instead of remove)\ndf[\"value\"] = df[\"value\"].clip(lower=Q1 - 1.5*IQR, upper=Q3 + 1.5*IQR)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "How do you map values in a column?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Direct dictionary mapping\ndf[\"grade\"] = df[\"score\"].map({90: \"A\", 80: \"B\", 70: \"C\"})\n\n# Apply function\ndf[\"grade\"] = df[\"score\"].apply(lambda x: \"A\" if x >= 90 else \"B\")\n\n# Replace\ndf[\"status\"].replace({\"active\": 1, \"inactive\": 0}, inplace=True)\n\n# Cut into bins with labels\ndf[\"age_group\"] = pd.cut(df[\"age\"], bins=[0, 18, 35, 65, 100],\n                          labels=[\"child\", \"young\", \"adult\", \"senior\"])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What is `pd.qcut` vs `pd.cut`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pd.cut: Fixed-width bins (equal range)\npd.cut(series, bins=5)                    # 5 equal-width bins\n\n# pd.qcut: Quantile-based bins (equal number of samples)\npd.qcut(series, q=4, labels=[\"Q1\",\"Q2\",\"Q3\",\"Q4\"])  # Equal quantiles\n\n# Use pd.qcut when distribution is skewed (cut creates mostly empty bins)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "How do you handle mixed-type columns in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Convert column with mixed types\ndf[\"value\"] = pd.to_numeric(df[\"value\"], errors=\"coerce\")   # Non-numeric → NaN\ndf[\"date\"] = pd.to_datetime(df[\"date\"], errors=\"coerce\")    # Invalid → NaT\ndf[\"flag\"] = df[\"flag\"].astype(str).str.strip().str.lower().map({\"true\": True, \"false\": False})\n\n# Detect mixed types\ndf[\"col\"].apply(type).value_counts()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "How do you apply multiple imputation strategies to different columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.impute import SimpleImputer\nimport pandas as pd\n\nnum_cols = df.select_dtypes(include=\"number\").columns\ncat_cols = df.select_dtypes(include=\"object\").columns\n\nnum_imputer = SimpleImputer(strategy=\"median\")\ncat_imputer = SimpleImputer(strategy=\"most_frequent\")\n\ndf[num_cols] = num_imputer.fit_transform(df[num_cols])\ndf[cat_cols] = cat_imputer.fit_transform(df[cat_cols])"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is `pd.DataFrame.interpolate` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Time series gap filling\ndf[\"value\"].interpolate(method=\"linear\")     # Linear between neighbors\ndf[\"value\"].interpolate(method=\"time\")       # Time-weighted (index must be DatetimeIndex)\ndf[\"value\"].interpolate(method=\"polynomial\", order=2)  # Polynomial\ndf[\"value\"].interpolate(limit=3)             # Limit max gap length"
    },
    {
     "t": "p",
     "text": "Better than forward-fill for numeric data with natural progression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "How do you normalize and standardize data in Pandas without sklearn?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Min-Max normalization [0, 1]\ndf[\"norm\"] = (df[\"val\"] - df[\"val\"].min()) / (df[\"val\"].max() - df[\"val\"].min())\n\n# Z-score standardization\ndf[\"std\"] = (df[\"val\"] - df[\"val\"].mean()) / df[\"val\"].std()\n\n# Robust scaling (median, IQR)\nq1, q3 = df[\"val\"].quantile([0.25, 0.75])\ndf[\"robust\"] = (df[\"val\"] - df[\"val\"].median()) / (q3 - q1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "How do you extract structured data from a column of JSON/dicts?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Column contains JSON strings\ndf[\"parsed\"] = df[\"json_col\"].apply(json.loads)\n\n# Expand dict column into separate columns\njson_df = pd.json_normalize(df[\"parsed\"])\ndf = pd.concat([df.drop(\"parsed\", axis=1), json_df], axis=1)\n\n# Or: direct json_normalize from list of dicts\npd.json_normalize(df[\"json_col\"].apply(json.loads).tolist())"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "How do you split a column into multiple columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Split on delimiter\ndf[[\"first\", \"last\"]] = df[\"name\"].str.split(\" \", n=1, expand=True)\n\n# Extract with regex\ndf[[\"area_code\", \"number\"]] = df[\"phone\"].str.extract(r\"\\((\\d{3})\\)\\s*(\\d{7,})\")\n\n# Expand list column\ndf_expanded = df[\"tags\"].apply(pd.Series)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "How do you compute row-wise operations in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# axis=1 applies function across columns (row-wise)\ndf[\"max\"] = df[[\"a\", \"b\", \"c\"]].max(axis=1)\ndf[\"total\"] = df[[\"q1\", \"q2\", \"q3\", \"q4\"]].sum(axis=1)\n\n# Custom row function (slow but flexible)\ndf[\"result\"] = df.apply(lambda row: complex_function(row.a, row.b), axis=1)\n\n# Vectorized preferred:\ndf[\"ratio\"] = df[\"sales\"] / df[\"target\"]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is `pd.DataFrame.eval` and `pd.DataFrame.query`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# eval: Fast column creation with string expressions\ndf.eval(\"profit = revenue - cost\", inplace=True)\ndf.eval(\"normalized = (value - value.mean()) / value.std()\", inplace=True)\n\n# query: Filter with string expression\nresult = df.query(\"age > 30 and salary > 50000\")\nresult = df.query(\"city in @city_list and status == 'active'\")  # @ references local variables"
    },
    {
     "t": "p",
     "text": "Faster than boolean indexing for large DataFrames."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "How do you work with categorical data efficiently in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Convert to Categorical\ndf[\"gender\"] = df[\"gender\"].astype(\"category\")\n\n# Ordered categorical\nfrom pandas.api.types import CategoricalDtype\nsize_type = CategoricalDtype(categories=[\"S\", \"M\", \"L\", \"XL\"], ordered=True)\ndf[\"size\"] = df[\"size\"].astype(size_type)\ndf[df[\"size\"] > \"M\"]   # Works with ordered categories\n\n# Memory savings\ndf[\"high_card_col\"].memory_usage() vs df[\"high_card_col\"].astype(\"category\").memory_usage()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "How do you reshape a wide DataFrame to long format?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# melt: Wide → Long\ndf_long = pd.melt(df_wide, id_vars=[\"id\", \"name\"],\n                   value_vars=[\"2021\", \"2022\", \"2023\"],\n                   var_name=\"year\", value_name=\"revenue\")\n\n# stack: Move column level to row index\ndf_long = df_wide.stack().reset_index()\ndf_long.columns = [\"id\", \"year\", \"value\"]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "How do you reshape a long DataFrame to wide format?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# pivot: Long → Wide\ndf_wide = df_long.pivot(index=\"id\", columns=\"year\", values=\"revenue\")\n\n# pivot_table: Long → Wide with aggregation (handles duplicates)\ndf_wide = df_long.pivot_table(index=\"id\", columns=\"year\", values=\"revenue\", aggfunc=\"sum\")\n\n# unstack: Move row index level to columns\ndf_wide = df_long.set_index([\"id\", \"year\"])[\"revenue\"].unstack(\"year\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is `pd.Categorical.from_codes` and why is it useful?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "codes = np.array([0, 1, 2, 1, 0])\ncategories = [\"low\", \"medium\", \"high\"]\ncat = pd.Categorical.from_codes(codes, categories=categories)"
    },
    {
     "t": "p",
     "text": "Efficiently stores categorical data when you already have integer codes (e.g., from a label encoder). Avoids string comparison overhead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "How do you compute a running rank / percentile within groups?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Rank within group\ndf[\"rank\"] = df.groupby(\"category\")[\"score\"].rank(method=\"dense\", ascending=False)\n\n# Percentile rank\ndf[\"pct_rank\"] = df.groupby(\"category\")[\"score\"].rank(pct=True)\n\n# Rank methods: 'average', 'min', 'max', 'first', 'dense'"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "How do you efficiently filter a DataFrame with multiple conditions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Use bitwise operators (not 'and'/'or' which are Python booleans)\nmask = (df[\"age\"] > 30) & (df[\"salary\"] > 50000) | (df[\"manager\"] == True)\nfiltered = df[mask]\n\n# For many conditions, build mask iteratively:\nconditions = [(\"age\", \">\", 30), (\"status\", \"==\", \"active\")]\nmask = pd.Series(True, index=df.index)\nfor col, op, val in conditions:\n    mask &= df[col].map(lambda x, o=op, v=val: eval(f\"x {o} v\"))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is `pd.DataFrame.assign` and why is it useful for pipelines?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "result = (df\n    .assign(\n        revenue_clean=lambda x: x[\"revenue\"].fillna(0),\n        profit=lambda x: x[\"revenue_clean\"] - x[\"cost\"],\n        margin=lambda x: x[\"profit\"] / x[\"revenue_clean\"].replace(0, np.nan)\n    )\n    .query(\"margin > 0.1\")\n    .sort_values(\"profit\", ascending=False)\n)"
    },
    {
     "t": "p",
     "text": "Returns a new DataFrame — enables chained, readable data transformations (method chaining style)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "How do you profile a Pandas DataFrame's data quality?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Manual profile\ndef profile(df: pd.DataFrame) -> pd.DataFrame:\n    return pd.DataFrame({\n        \"dtype\": df.dtypes,\n        \"nulls\": df.isnull().sum(),\n        \"null_pct\": df.isnull().mean() * 100,\n        \"unique\": df.nunique(),\n        \"sample\": df.iloc[0]\n    })\n\n# Library option\nimport ydata_profiling\nProfileReport(df, minimal=True).to_file(\"profile.html\")"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
