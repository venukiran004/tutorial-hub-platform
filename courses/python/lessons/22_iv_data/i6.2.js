/* ============================================================================
   INTERVIEW: DATA & ML i6.2 — Pandas
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i6.2",
 "lede": "**49 interview questions on pandas**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 49 questions on pandas without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up is where it shows.",
      "Coding problems live in the **Coding Practice** course — these are the ones you answer in conversation."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What are the core data structures in Pandas?",
   "terms": [
    "Answer",
    "Series",
    "DataFrame",
    "Index",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Series**1-D labeled array (one column).",
      "**DataFrame**2-D labeled table; columns can have different dtypes.",
      "**Index**the row/column labels (integer, string, datetime, or MultiIndex)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ns = pd.Series([1, 2, 3], index=['a', 'b', 'c'])\ndf = pd.DataFrame({'name': ['Alice', 'Bob'], 'age': [30, 25]})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A DataFrame is essentially a dict of Series sharing one Index."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between `loc` and `iloc`?",
   "terms": [
    "Answer",
    "label",
    "integer position",
    "inclusive",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`loc` indexes by **label**; `iloc` indexes by **integer position**. Crucially, `loc` slices are **inclusive** of the end label, `iloc` slices are exclusive (standard Python)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.loc[2:5, ['a', 'b']]   # rows labeled 2..5 INCLUSIVE\ndf.iloc[2:5, [0, 1]]      # rows at positions 2,3,4 (5 excluded)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `loc` with labels and boolean masks, `iloc` with numeric positions; remember the inclusive-vs-exclusive slice difference."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What are `at` and `iat`, and when are they preferable?",
   "terms": [
    "Answer",
    "single scalar",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`at` (label) and `iat` (position) are fast accessors for a **single scalar** cell. They skip the alignment machinery of `loc`/`iloc`, so they are faster for single-cell reads/writes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.at[0, 'name']    # label-based scalar\ndf.iat[0, 1]        # position-based scalar",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `at`/`iat` in hot loops for single cells; use `loc`/`iloc` for slices and bulk selection."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Why do you need parentheses with `&` and `|` when filtering?",
   "terms": [
    "Answer",
    "higher precedence",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The bitwise operators `&` and `|` have **higher precedence** than comparison operators, so without parentheses the expression is mis-parsed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df[(df['a'] > 5) & (df['b'] < 10)]   # correct\n# df[df['a'] > 5 & df['b'] < 10]      # parsed as df['a'] > (5 & df['b']) -> error",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Python `and`/`or` cannot be used because they try to evaluate the whole Series as one boolean (ambiguous)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Parenthesize each condition and use `&`, `|`, `~` (not `and`/`or`/`not`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between a view and a copy? What is `SettingWithCopyWarning`?",
   "terms": [
    "Answer",
    "view",
    "copy",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **view** shares data with the original; a **copy** is independent. Pandas can't always tell whether a slice is a view, so modifying a slice raises `SettingWithCopyWarning` — the write may not propagate."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "sub = df[df['age'] > 25].copy()   # explicit copy -> safe\nsub['flag'] = 1                   # no warning\n\n# df[df['age'] > 25]['flag'] = 1  # chained indexing -> warning, may not write",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Avoid chained indexing; use `df.loc[cond, 'col'] = ...`, and `.copy()` when you intend to mutate a subset. Pandas 2.0+ Copy-on-Write removes much of this ambiguity."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How is `NaN` different from `None`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`NaN` is a float64 sentinel (from NumPy) for missing numeric data; `None` is Python's null object. Pandas usually converts `None` to `NaN` in numeric columns. `pd.isna()` detects both."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.isna(np.nan)   # True\npd.isna(None)     # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `pd.isna()`/`isnull()` rather than `== None` or `== np.nan` (NaN is not equal to itself)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between `apply`, `map`, and `transform`?",
   "terms": [
    "Answer",
    "map",
    "apply",
    "transform",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**`map`**Series only, element-wise; accepts a dict or function. Fastest for value mapping.",
      "**`apply`**Series (element-wise) or DataFrame (row/column-wise via `axis`); most flexible, slowest.",
      "**`transform`**must return the same shape as input; ideal with `groupby` to broadcast a group result back to every row."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['grade'] = df['score'].map({90: 'A', 80: 'B'})\ndf['full'] = df.apply(lambda r: f\"{r.first} {r.last}\", axis=1)\ndf['dept_avg'] = df.groupby('dept')['sal'].transform('mean')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer vectorized operations; among these, `map` > `transform` > `apply` for speed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is vectorization and why is it preferred over `apply`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Vectorized operations act on whole columns using NumPy in C, avoiding the Python-level loop that `apply` runs."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['r'] = df['a'] * 2                 # vectorized — fast\n# df['r'] = df['a'].apply(lambda x: x*2)  # ~100x slower",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** If logic can be expressed as element-wise column operations, vectorize it; reserve `apply(axis=1)` for genuinely row-dependent logic."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How does `groupby` work internally (split-apply-combine)?",
   "terms": [
    "Answer",
    "Split",
    "Apply",
    "Combine",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Split**Pandas builds a hash map from group keys to row indices (lazy; no computation).",
      "**Apply**runs the aggregation/transform/filter on each group.",
      "**Combine**assembles results into a Series/DataFrame."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby('dept')['salary'].mean()   # nothing computed until .mean()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The `GroupBy` object is lazy; computation happens on the terminal call. Use `transform` when you need the result aligned to the original index."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the difference between `agg`, `transform`, `filter`, and `apply` in groupby?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Output"
     ],
     "rows": [
      [
       "`agg`",
       "One row per group (reduction)"
      ],
      [
       "`transform`",
       "Same shape as input (broadcast back)"
      ],
      [
       "`filter`",
       "Subset of original rows (drop whole groups)"
      ],
      [
       "`apply`",
       "Anything (most flexible, slowest)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby('s')['x'].agg(['mean', 'std'])\ndf['z'] = df.groupby('s')['x'].transform('mean')\ndf.groupby('s').filter(lambda g: g['x'].sum() > 100)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pick the narrowest tool: `agg` to summarize, `transform` to keep shape, `filter` to drop groups, `apply` only when nothing else fits."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is `pd.NamedAgg` / named aggregation?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Named aggregation produces clean, flat output column names in one call."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby('store').agg(\n    total=('sales', 'sum'),\n    avg=('sales', 'mean'),\n    n=('id', 'count'),\n)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `agg(name=('col', 'func'))` is cleaner than aggregating then renaming MultiIndex columns."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between `merge`, `join`, and `concat`?",
   "terms": [
    "Answer",
    "pd.merge",
    "df.join",
    "pd.concat",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**`pd.merge`**SQL-style join on columns or index; supports `how` inner/left/right/outer.",
      "**`df.join`**convenience for merging on the index.",
      "**`pd.concat`**stack along an axis (rows or columns); no relational alignment."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.merge(df1, df2, on='id', how='left')\ndf1.join(df2)                      # on index\npd.concat([df1, df2], ignore_index=True)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `merge` for relational joins (95% of cases), `concat` to glue datasets together."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What are the join types in `merge`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "how",
      "Keeps"
     ],
     "rows": [
      [
       "`inner`",
       "Only keys present in both"
      ],
      [
       "`left`",
       "All left rows, NaN where no right match"
      ],
      [
       "`right`",
       "All right rows, NaN where no left match"
      ],
      [
       "`outer`",
       "All rows from both"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.merge(a, b, on='id', how='outer', indicator=True)  # _merge column shows source",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Watch duplicate keys — they create a cartesian product; always verify `result.shape`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the difference between `pivot` and `pivot_table`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`pivot` reshapes without aggregation and fails on duplicate (index, column) pairs. `pivot_table` aggregates duplicates (mean by default), so it is more robust."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.pivot(index='date', columns='metric', values='value')\ndf.pivot_table(index='date', columns='metric', values='value', aggfunc='sum')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `pivot_table` whenever duplicates may exist or you need aggregation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What do `melt`, `stack`, and `unstack` do?",
   "terms": [
    "Answer",
    "melt",
    "stack",
    "unstack",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**`melt`**wide → long: many value columns become rows.",
      "**`stack`**moves a column level into the innermost row index (wide → long).",
      "**`unstack`**moves an inner row index level into columns (long → wide)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.melt(df, id_vars=['id'], value_vars=['2022', '2023'],\n        var_name='year', value_name='rev')\ndf.stack(); df.unstack()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `melt`/`stack` go wide→long; `pivot`/`unstack` go long→wide."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you handle missing data?",
   "terms": [
    "Answer",
    "Strategy",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.isnull().sum()                  # detect\ndf.dropna(subset=['age'])          # drop\ndf['age'].fillna(df['age'].median())   # impute\ndf['v'].ffill(); df['v'].bfill()   # carry forward/back\ndf['v'].interpolate(method='time') # numeric interpolation",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Strategy:** drop if very few and missing-at-random; impute mean/median for numeric, mode for categorical; consider model-based imputation otherwise."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Detection (`isnull`), removal (`dropna`), and imputation (`fillna`/`interpolate`) are the three tools — choice depends on the missingness mechanism."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the `category` dtype and why use it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "For low-cardinality columns, `category` stores integer codes plus a lookup table, saving memory and speeding up groupby/sort. Ordered categories support comparisons."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['city'] = df['city'].astype('category')   # 90%+ memory savings\ndf['size'] = df['size'].astype(\n    pd.CategoricalDtype(['S', 'M', 'L'], ordered=True))\ndf[df['size'] > 'M']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Convert low-cardinality string columns to `category` for big memory and performance wins."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do you optimize the memory usage of a DataFrame?",
   "terms": [
    "Answer",
    "Downcast numerics",
    "Category dtype",
    "Nullable int types",
    "Read only needed columns/rows",
    "Parquet"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Downcast numerics**`pd.to_numeric(col, downcast='integer'/'float')`.",
      "**Category dtype** for low-cardinality strings.",
      "**Nullable int types** (`Int32`) to keep integers with missing values from becoming float.",
      "**Read only needed columns/rows**`usecols`, `read_parquet(columns=...)`.",
      "**Parquet** over CSV; **chunked** reads for huge files."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.memory_usage(deep=True)         # measure first\ndf['city'] = df['city'].astype('category')\ndf['n'] = pd.to_numeric(df['n'], downcast='integer')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Measure with `memory_usage(deep=True)`, then downcast and categorize — often a 50–90% reduction."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Why is Parquet preferred over CSV?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Parquet is a compressed, columnar binary format: smaller files, faster reads, column pruning (read only needed columns), predicate pushdown, and it preserves dtypes (CSV loses them)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.to_parquet('data.parquet')\npd.read_parquet('data.parquet', columns=['id', 'rev'],\n                filters=[('year', '==', 2024)])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** For analytics/ML pipelines, Parquet is faster and smaller and keeps types; CSV is for portability/interchange."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is `query()` and when is it useful?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`query()` filters using a readable SQL-like string and can reference local variables with `@`. On large DataFrames it can be faster (NumExpr) and more concise than boolean masks."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.query('age > 30 and city == \"NYC\"')\nages = [20, 30]\ndf.query('age in @ages')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `query()` for readable complex filters; use `eval()` for fast column expressions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What does `transform` enable that `agg` cannot?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`transform` returns output aligned to the original rows, so you can add group statistics as columns (e.g. group-wise z-scores) without a merge."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['dept_avg'] = df.groupby('dept')['sal'].transform('mean')\ndf['z'] = (df['sal'] - df['dept_avg']) / df.groupby('dept')['sal'].transform('std')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `transform` for \"broadcast a group result back to every row\" — `agg` would collapse the rows."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you get the top-N rows per group?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Via sort + groupby head\ndf.sort_values('sal', ascending=False).groupby('dept').head(3)\n\n# Via rank\ndf['rnk'] = df.groupby('dept')['sal'].rank(method='dense', ascending=False)\ndf[df['rnk'] <= 3]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `sort_values(...).groupby(...).head(n)` or a `rank` filter — both avoid a slow `apply`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the difference between `nlargest`/`nsmallest` and sorting?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`nlargest(n, col)`/`nsmallest(n, col)` retrieve the top/bottom N without fully sorting, so they are faster than `sort_values().head(n)`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.nlargest(5, 'salary')\ndf.nsmallest(3, 'price')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `nlargest`/`nsmallest` for top-N — it is a partial selection, not a full sort."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you work with datetimes and time-based slicing?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['date'] = pd.to_datetime(df['date_str'])\ndf['year'] = df['date'].dt.year\ndf['dow'] = df['date'].dt.day_name()\n\nts = df.set_index('date')\nts.loc['2024']               # all of 2024\nts.loc['2024-01':'2024-06']  # range",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Convert with `to_datetime`, extract parts via `.dt`, and set a `DatetimeIndex` to enable partial-string time slicing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you resample time series, and what is up- vs down-sampling?",
   "terms": [
    "Answer",
    "Downsampling",
    "upsampling",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`resample` is groupby for time. **Downsampling** aggregates to a lower frequency; **upsampling** creates a higher frequency (introducing NaN to fill)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "ts.resample('ME')['sales'].sum()       # downsample -> monthly\nts.resample('D').asfreq()              # upsample -> daily (NaN gaps)\nts.resample('D').interpolate()         # fill the gaps",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Downsample with an aggregation; upsample then fill (`ffill`/`interpolate`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is `shift` and how do you build lag features?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`shift(n)` moves values down (lag) or up (lead), used for time-series features and period-over-period changes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['prev'] = df['sales'].shift(1)\ndf['change'] = df['sales'] - df['sales'].shift(1)\nfor lag in [1, 7, 30]:\n    df[f'lag_{lag}'] = df['sales'].shift(lag)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `shift` (often combined with `groupby` to shift within groups) is the foundation of lag/lead features."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What are rolling, expanding, and ewm windows?",
   "terms": [
    "Answer",
    "rolling(n)",
    "expanding()",
    "ewm()",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**`rolling(n)`**fixed sliding window (e.g. 7-day moving average).",
      "**`expanding()`**cumulative window from the start.",
      "**`ewm()`**exponentially weighted, recent points weighted more."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['ma7'] = df['price'].rolling(7).mean()\ndf['cum'] = df['price'].expanding().mean()\ndf['ema'] = df['price'].ewm(span=12, adjust=False).mean()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Rolling = fixed window, expanding = growing window, ewm = decaying weights."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the difference between `df['col']` and `df[['col']]`?",
   "terms": [
    "Answer",
    "Series",
    "DataFrame",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`df['col']` returns a **Series** (1-D); `df[['col']]` returns a **DataFrame** with one column (2-D)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "type(df['age'])     # Series\ntype(df[['age']])   # DataFrame",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use double brackets when an operation expects a DataFrame, single brackets for a Series."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the `.str` accessor and how do you extract patterns?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`.str` provides vectorized string methods on Series; `.str.extract` pulls regex groups into columns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['name'].str.lower().str.strip()\ndf['year'] = df['date_str'].str.extract(r'(\\d{4})')\ndf[['first', 'last']] = df['name'].str.split(' ', n=1, expand=True)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `.str` instead of `apply(lambda x: x.method())` — it is faster, handles NaN, and reads cleanly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the difference between `where` and `mask`?",
   "terms": [
    "Answer",
    "True",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`df.where(cond)` keeps values where the condition is **True** (replaces False with NaN/other). `df.mask(cond)` does the opposite — replaces where True."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s.where(s > 0, 0)   # keep positives, else 0\ns.mask(s < 0, 0)    # replace negatives with 0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `where` keeps-on-True, `mask` replaces-on-True — mirror images of each other."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do you remove duplicate rows?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.duplicated()                              # boolean mask\ndf.drop_duplicates()                         # keep first\ndf.drop_duplicates(subset=['id'], keep='last')\ndf.drop_duplicates(keep=False)               # drop all copies",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `subset` limits which columns define a duplicate; `keep` controls which occurrence survives."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is `pd.cut` vs `pd.qcut`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`pd.cut` bins by fixed value ranges (equal width); `pd.qcut` bins by quantiles (equal count per bin)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.cut(df['age'], bins=[0, 18, 35, 65], labels=['minor', 'adult', 'senior'])\npd.qcut(df['income'], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `qcut` for skewed data (cut would leave bins nearly empty); both return a Categorical."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is `pd.get_dummies` (one-hot encoding)?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It expands a categorical column into binary indicator columns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.get_dummies(df['city'], prefix='city', drop_first=True)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`drop_first=True` removes one column to avoid the dummy-variable trap (collinearity) in linear models."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `get_dummies` is the quick one-hot encoder; drop the first level for linear models."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is `explode` and when is it used?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`explode` turns a column of lists into one row per element, duplicating the other columns — useful for denormalized data like a tags column."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.DataFrame({'id': [1, 2], 'tags': [['a', 'b'], ['c']]}).explode('tags')\n# id=1 'a'; id=1 'b'; id=2 'c'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `explode` flattens list-valued cells into long-format rows."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is `pd.json_normalize`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It flattens nested JSON/dicts into a flat DataFrame, expanding nested keys into dotted columns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = [{'user': {'name': 'Alice', 'age': 30}, 'city': 'NYC'}]\npd.json_normalize(data)   # columns: user.name, user.age, city",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `json_normalize` to turn semi-structured API responses into tabular data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Should you use `inplace=True`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Generally no. `inplace=True` rarely gives a real performance benefit, breaks method chaining, and makes code harder to reason about. Prefer reassignment."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.dropna()              # preferred\n# df.dropna(inplace=True)     # discouraged",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Favor reassignment / method chaining over `inplace`; it is being deprecated for many methods."
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What are common Pandas performance anti-patterns?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`iterrows()`/`itertuples()` loops instead of vectorized ops.",
      "Repeated `pd.concat` in a loop (O(n²)) — build a list and concat once.",
      "Modifying chained slices (`df[cond]['col'] = ...`).",
      "Not specifying `dtype`/`usecols` when reading CSVs.",
      "Forgetting `reset_index(drop=True)` after filtering."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Vectorize, batch your concatenations, and use `.loc`/`.copy()` correctly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How do you read a file too large for memory?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Process it in chunks and aggregate incrementally."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "results = []\nfor chunk in pd.read_csv('huge.csv', chunksize=100_000):\n    results.append(chunk.groupby('store')['sales'].sum())\nfinal = pd.concat(results).groupby(level=0).sum()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `chunksize` streams the file; better yet, convert to Parquet and read only needed columns/partitions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you read from and write to a SQL database?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sqlalchemy import create_engine\nengine = create_engine('postgresql://user:pass@host/db')\ndf = pd.read_sql('SELECT * FROM t WHERE dt >= %(d)s', engine, params={'d': '2024-01-01'})\ndf.to_sql('t', engine, if_exists='append', index=False, chunksize=10_000)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use SQLAlchemy engines with `read_sql`/`to_sql`; push filtering into SQL and use `chunksize` for large writes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the PyArrow backend in Pandas 2.0+?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Pandas 2.0+ can store columns with Apache Arrow types (`dtype_backend='pyarrow'`), giving a native string type (not `object`), proper nulls for all dtypes, lower memory, and better interop with Polars/DuckDB."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = pd.read_parquet('data.parquet', dtype_backend='pyarrow')\ndf = df.convert_dtypes(dtype_backend='pyarrow')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The Arrow backend speeds up string-heavy workloads and unifies null handling."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How do you compute correlation, and which method?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.corr()                       # Pearson (linear)\ndf.corr(method='spearman')      # rank-based, monotonic\ndf['a'].corr(df['b'])           # single pair\ndf.corrwith(df['target'])       # each column vs a target",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pearson for linear relationships, Spearman/Kendall for monotonic/ranked; `corrwith` is handy for feature-vs-target screening."
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "When should you move from Pandas to Polars, Dask, or Spark?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Situation",
      "Tool"
     ],
     "rows": [
      [
       "> 1 GB, single machine",
       "Polars (lazy, multi-threaded)"
      ],
      [
       "Multi-GB, multi-core",
       "Dask"
      ],
      [
       "Distributed (TBs)",
       "PySpark"
      ],
      [
       "GPU acceleration",
       "cuDF (RAPIDS)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pandas is ideal for < ~1 GB exploratory work; scale out when data exceeds memory or you need parallelism."
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is a MultiIndex and how do you access data in it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A MultiIndex gives a DataFrame multiple levels of row (or column) labels — useful for grouped/hierarchical data like `(department, year)`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = df.set_index(['department', 'year'])\ndf.loc['Sales']                 # outer level\ndf.loc[('Sales', 2024)]         # full tuple\ndf.xs(2024, level='year')       # cross-section on an inner level\ndf.reset_index()                # flatten back to columns",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Access with tuples via `loc`, fix a single level with `.xs()`, and `sort_index()` before slicing a MultiIndex to avoid `PerformanceWarning`/errors."
    }
   ]
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the difference between `map` and `replace` for value substitution?",
   "terms": [
    "Answer",
    "unmapped",
    "unchanged",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`Series.map` substitutes via a dict/function and turns **unmapped** values into `NaN`; `Series.replace` only changes the keys you specify and leaves everything else **unchanged**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s.map({'A': 1, 'B': 2})       # 'C' -> NaN\ns.replace({'A': 1, 'B': 2})   # 'C' -> 'C' (kept)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `map` for a full re-encoding (and to surface unexpected values as NaN), `replace` for targeted edits."
    }
   ]
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How do you apply a function element-wise across an entire DataFrame?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use `DataFrame.map` (called `applymap` before Pandas 2.1). `apply` works along an axis (row/column Series), while `map` is truly element-wise."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df[['a', 'b']].map(lambda x: f\"{x:.1%}\")   # every cell\ndf.apply(np.sum, axis=0)                    # column-wise (Series in)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `DataFrame.map` = per-cell; `apply` = per-row/column. `applymap` is deprecated — prefer `map`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the Sparse dtype and when does it help?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`pd.SparseDtype` stores only the non-fill values plus their positions, so a column dominated by one repeated value (often 0) uses far less memory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "sp = dense.astype(pd.SparseDtype('int', fill_value=0))\nsp['col'].sparse.density        # fraction of non-fill entries",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use sparse columns for one-hot/indicator matrices and other mostly-constant data; dense operations may densify, so keep them sparse end-to-end."
    }
   ]
  },
  {
   "t": "drill",
   "n": "47",
   "q": "How do you take a random sample or bootstrap from a DataFrame?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`df.sample` draws rows; `replace=True` enables bootstrap resampling."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df.sample(n=10, random_state=42)     # 10 rows, reproducible\ndf.sample(frac=0.2)                  # 20% of rows\ndf.sample(frac=1, replace=True)      # bootstrap (same size, with replacement)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `frac=1, replace=True` is the standard bootstrap resample; pass `random_state` for reproducibility and `weights=` for weighted sampling."
    }
   ]
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How do you build a cohort or period column from dates?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`dt.to_period` collapses timestamps to a period (month/quarter/year); a `groupby(...).transform('min')` then assigns each entity its first-seen period as a cohort."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['month'] = df['date'].dt.to_period('M')\ndf['cohort'] = df.groupby('user_id')['month'].transform('min')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `to_period` + `transform('min')` is the canonical cohort-assignment idiom; `pct_change(n)`/`diff(n)` then build period-over-period features."
    }
   ]
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you safely convert messy columns to numbers/dates?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Strip non-numeric characters with `.str.replace`, then convert with `errors='coerce'` so unparseable entries become `NaN`/`NaT` instead of raising."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['salary'] = pd.to_numeric(\n    df['salary'].astype(str).str.replace(r'[$,]', '', regex=True), errors='coerce')\ndf['date'] = pd.to_datetime(df['date'], errors='coerce')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `errors='coerce'` is the key to robust cleaning — it isolates bad rows as missing values you can then drop or impute."
    }
   ]
  }
 ],
 "takeaways": []
});
