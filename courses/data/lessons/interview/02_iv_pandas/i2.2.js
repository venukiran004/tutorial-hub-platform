/* ============================================================================
   INTERVIEW I2.2 — Groupby & Aggregation
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.2",
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
   "text": "Groupby & Aggregation",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How does `groupby` work in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby(\"city\")[\"sales\"].sum()               # Sum sales per city\ndf.groupby([\"city\", \"product\"])[\"sales\"].mean() # Multi-level groupby\ndf.groupby(\"dept\").agg({\"salary\": \"mean\", \"emp_id\": \"count\"})  # Multiple agg"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is `agg` (aggregate) and how does it differ from `transform` and `apply`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`agg`: Returns a reduced result (one row per group).",
      "`transform`: Returns the same shape as input (group operation broadcast back to rows).",
      "`apply`: Most flexible; applies a function to each group, can return any shape."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is a practical use case for `transform`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Add group mean as a new column (keeps original DataFrame shape)\ndf[\"dept_avg_salary\"] = df.groupby(\"dept\")[\"salary\"].transform(\"mean\")\n# Now you can compute how each employee compares to their dept avg\ndf[\"vs_avg\"] = df[\"salary\"] - df[\"dept_avg_salary\"]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you count unique values in a column?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"city\"].value_counts()             # Counts + sort by frequency\ndf[\"city\"].nunique()                  # Just the count of unique values\ndf[\"city\"].unique()                   # Array of unique values"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is a pivot table in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "pivot = df.pivot_table(\n    values=\"sales\",\n    index=\"region\",\n    columns=\"product\",\n    aggfunc=\"sum\",\n    fill_value=0\n)"
    },
    {
     "t": "p",
     "text": "Aggregates data in a cross-tabulation format — rows = index, columns = columns, cells = aggregated values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is the difference between `pivot` and `pivot_table`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`pivot`: Reshapes without aggregation — fails if there are duplicate (index, column) combinations.",
      "`pivot_table`: Aggregates duplicates (default: mean). More robust."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is `melt` in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "`melt` converts wide format (many columns) to long format (few columns + many rows):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df_long = df.melt(id_vars=[\"user_id\"], var_name=\"metric\", value_name=\"value\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is `stack` and `unstack`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`stack`: Moves column level to innermost row level (wide → long).",
      "`unstack`: Moves innermost row level to column level (long → wide)."
     ]
    },
    {
     "t": "p",
     "text": "Both work on MultiIndex DataFrames."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you perform a cross-tabulation in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "pd.crosstab(df[\"gender\"], df[\"purchased\"])\n# Rows = gender, Columns = purchased, cells = counts\npd.crosstab(df[\"gender\"], df[\"purchased\"], normalize=\"index\")  # Row %"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is a MultiIndex DataFrame?",
   "body": [
    {
     "t": "p",
     "text": "A DataFrame with hierarchical (multi-level) index on rows and/or columns:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.set_index([\"year\", \"month\"])\ndf.loc[(2024, 1)]          # Access year=2024, month=1\ndf.xs(2024, level=\"year\")  # Cross-section"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do you compute a rolling window?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"rolling_mean_7d\"] = df[\"sales\"].rolling(window=7).mean()\ndf[\"rolling_std\"] = df[\"sales\"].rolling(window=30, min_periods=1).std()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is `expanding` in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "`expanding` computes cumulative statistics from the start up to each position (expanding window):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"cumulative_avg\"] = df[\"sales\"].expanding().mean()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is `ewm` (Exponentially Weighted Mean)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"ewm_sales\"] = df[\"sales\"].ewm(span=7, adjust=False).mean()"
    },
    {
     "t": "p",
     "text": "Gives exponentially decreasing weight to older observations. Useful in time series (smoother, reacts quickly to recent data)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How do you get the top-N rows per group?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Top 3 salary earners per department\ndf.sort_values(\"salary\", ascending=False).groupby(\"dept\").head(3)\n\n# Using rank\ndf[\"rank\"] = df.groupby(\"dept\")[\"salary\"].rank(method=\"dense\", ascending=False)\ndf[df[\"rank\"] <= 3]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is `nlargest` and `nsmallest`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.nlargest(5, \"salary\")    # Top 5 rows by salary\ndf.nsmallest(3, \"price\")    # Bottom 3 rows by price"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
