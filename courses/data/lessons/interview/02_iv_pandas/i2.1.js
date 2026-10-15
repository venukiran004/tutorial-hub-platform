/* ============================================================================
   INTERVIEW I2.1 — Basics & Data Structures
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.1",
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
   "text": "Basics & Data Structures",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is Pandas and what are its core data structures?",
   "body": [
    {
     "t": "p",
     "text": "Pandas is a Python data analysis library. Core structures:"
    },
    {
     "t": "ul",
     "items": [
      "**Series:** 1D labeled array.",
      "**DataFrame:** 2D labeled table (columns of potentially different dtypes).",
      "**Index:** Labels for rows/columns. Can be integer, string, datetime, multi-level."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "How do you create a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\n# From dict\ndf = pd.DataFrame({\"name\": [\"Alice\", \"Bob\"], \"age\": [30, 25]})\n\n# From list of dicts\ndf = pd.DataFrame([{\"name\": \"Alice\", \"age\": 30}, {\"name\": \"Bob\", \"age\": 25}])\n\n# From CSV\ndf = pd.read_csv(\"data.csv\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the difference between `loc` and `iloc`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`loc`: Label-based indexing — uses row/column labels.",
      "`iloc`: Integer position-based indexing — uses integer indices 0, 1, 2..."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.loc[0, \"name\"]      # Row label 0, column \"name\"\ndf.iloc[0, 1]          # Row 0 (position), column 1 (position)\ndf.loc[2:5, [\"a\",\"b\"]] # Inclusive on both ends\ndf.iloc[2:5, [0,1]]    # Exclusive end (standard Python slice)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How do you select rows based on a condition?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[df[\"age\"] > 25]\ndf.query(\"age > 25 and city == 'NYC'\")  # SQL-like string query\ndf.loc[df[\"age\"] > 25, [\"name\", \"age\"]] # Select cols simultaneously"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between `at`, `iat`, `loc`, and `iloc`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`at` / `iat`: Fast scalar access by label / position. Use for single-cell reads or writes.",
      "`loc` / `iloc`: Slice/bulk access by label / position."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How do you handle missing values in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.isnull().sum()              # Count missing per column\ndf.dropna()                    # Drop rows with any NaN\ndf.dropna(subset=[\"age\"])      # Drop only if \"age\" is NaN\ndf.fillna(0)                   # Fill with 0\ndf.fillna(df.mean(numeric_only=True))  # Fill with column mean\ndf.interpolate()               # Interpolate (good for time series)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `NaN` in Pandas? How is it different from `None`?",
   "body": [
    {
     "t": "p",
     "text": "`NaN` is a float64 sentinel value from NumPy for missing numeric data. `None` is Python's null. Pandas often converts `None` to `NaN` in numeric columns. Use `pd.isna()` to check for both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How do you rename columns in a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.rename(columns={\"old_name\": \"new_name\", \"a\": \"b\"}, inplace=True)\ndf.columns = [\"col1\", \"col2\", \"col3\"]   # Replace all at once\ndf.columns = df.columns.str.lower()     # Vectorized rename"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do you add or remove columns?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"new_col\"] = df[\"a\"] + df[\"b\"]    # Add column\ndf.drop(columns=[\"unwanted\"], inplace=True)  # Remove column\ndf = df[[\"col1\", \"col2\"]]            # Select subset of columns"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is `inplace=True` and should you use it?",
   "body": [
    {
     "t": "p",
     "text": "`inplace=True` modifies the DataFrame in-place without returning a new one. Generally discouraged in modern Pandas — it can confuse chaining, doesn't always provide a performance benefit, and makes code harder to reason about. Prefer reassignment: `df = df.dropna()`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between copy and view in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "A **view** shares the same underlying data as the original; modifying it modifies the original. A **copy** is independent. Pandas raises `SettingWithCopyWarning` when you modify a slice that might be a view. Use `.copy()` to be explicit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do you sort a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.sort_values(\"age\", ascending=False)\ndf.sort_values([\"city\", \"age\"], ascending=[True, False])\ndf.sort_index()   # Sort by index"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `reset_index()` and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "Resets the index to default integer range and optionally moves the old index to a column. Used after filtering (which may leave gaps), groupby, or set_index operations."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df_filtered = df[df[\"age\"] > 25].reset_index(drop=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `set_index()`?",
   "body": [
    {
     "t": "p",
     "text": "Sets a column as the DataFrame's row index:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.set_index(\"user_id\")\ndf.loc[\"USR_001\"]  # Now access by user_id"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you check the shape, info, and dtypes of a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.shape        # (rows, cols)\ndf.dtypes       # Column data types\ndf.info()       # Dtypes + non-null counts + memory usage\ndf.describe()   # Summary statistics for numeric columns\ndf.head(5)      # First 5 rows\ndf.tail(5)      # Last 5 rows"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you change the dtype of a column?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"age\"] = df[\"age\"].astype(int)\ndf[\"price\"] = pd.to_numeric(df[\"price\"], errors=\"coerce\")  # coerce → NaN on fail\ndf[\"date\"] = pd.to_datetime(df[\"date\"])\ndf[\"category\"] = df[\"category\"].astype(\"category\")  # Memory efficient"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the `category` dtype and why use it?",
   "body": [
    {
     "t": "p",
     "text": "For columns with low cardinality (few unique values), `category` dtype stores values as integer codes + a lookup table. Saves significant memory and speeds up groupby/sorting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do you apply a function to a DataFrame?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"col\"].apply(lambda x: x * 2)          # Apply to each element of Series\ndf.apply(lambda row: row[\"a\"] + row[\"b\"], axis=1)  # Apply to each row\ndf.applymap(lambda x: x.strip())          # Element-wise on whole DataFrame (Pandas < 2.1)\ndf.map(lambda x: x.strip())               # Element-wise (Pandas 2.1+)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is vectorization in Pandas and why is it preferred over `apply`?",
   "body": [
    {
     "t": "p",
     "text": "Vectorized operations work on entire columns at once using NumPy under the hood — much faster than Python loops or `apply`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Slow\ndf[\"result\"] = df[\"a\"].apply(lambda x: x * 2)\n# Fast — vectorized\ndf[\"result\"] = df[\"a\"] * 2"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is `pd.cut` vs `pd.qcut`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`pd.cut`: Bins based on fixed value ranges (e.g., 0–10, 10–20).",
      "`pd.qcut`: Bins based on quantiles — each bin has equal frequency."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.cut(df[\"age\"], bins=[0, 18, 35, 60, 100], labels=[\"teen\",\"young\",\"middle\",\"senior\"])\npd.qcut(df[\"income\"], q=4, labels=[\"Q1\",\"Q2\",\"Q3\",\"Q4\"])"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
