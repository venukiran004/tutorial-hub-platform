/* ============================================================================
   INTERVIEW I2.3 — Merging & Reshaping
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.3",
 "lede": "**10 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Merging & Reshaping",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What are the types of joins in Pandas `merge`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Join",
      "Keeps"
     ],
     "rows": [
      [
       "`inner`",
       "Only matching rows in both"
      ],
      [
       "`left`",
       "All left rows, matched right"
      ],
      [
       "`right`",
       "All right rows, matched left"
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
     "code": "pd.merge(df1, df2, on=\"user_id\", how=\"inner\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the difference between `merge`, `join`, and `concat`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`pd.merge`: Column-based or index-based join (most flexible).",
      "`df.join`: Index-based join (syntactic sugar for merge on index).",
      "`pd.concat`: Concatenate along an axis (stack rows or columns) — no alignment logic."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How do you concatenate DataFrames?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "pd.concat([df1, df2], axis=0, ignore_index=True)  # Stack rows\npd.concat([df1, df2], axis=1)                     # Stack columns"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is `merge_asof`?",
   "body": [
    {
     "t": "p",
     "text": "An ordered merge that matches on the nearest key value (useful for time-based merges where exact timestamp matches are rare):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.merge_asof(trades, quotes, on=\"timestamp\", by=\"ticker\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How do you detect and remove duplicate rows?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.duplicated()                       # Boolean mask of duplicates\ndf.duplicated(subset=[\"name\", \"age\"]) # Based on specific columns\ndf.drop_duplicates(inplace=True)      # Remove all but first occurrence\ndf.drop_duplicates(keep=\"last\")       # Keep last occurrence"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the `explode` function?",
   "body": [
    {
     "t": "p",
     "text": "Transforms list-like columns into individual rows:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = pd.DataFrame({\"user\": [\"A\", \"B\"], \"tags\": [[\"ml\",\"ai\"], [\"python\"]]})\ndf.explode(\"tags\")\n# A  ml, A  ai, B  python"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "How do you reshape a DataFrame from long to wide using `pivot`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df_wide = df_long.pivot(index=\"date\", columns=\"metric\", values=\"value\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is `pd.get_dummies`?",
   "body": [
    {
     "t": "p",
     "text": "Creates one-hot encoded columns from categorical variables:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.get_dummies(df[\"city\"], prefix=\"city\", drop_first=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you handle a merge that creates duplicate column names?",
   "body": [
    {
     "t": "p",
     "text": "`merge` appends `_x` and `_y` suffixes by default. Specify custom suffixes:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pd.merge(df1, df2, on=\"id\", suffixes=(\"_left\", \"_right\"))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is `pd.DataFrame.assign`?",
   "body": [
    {
     "t": "p",
     "text": "Fluent API to add columns without `inplace`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df = (df\n    .assign(bmi=lambda d: d[\"weight\"] / d[\"height\"]**2)\n    .assign(overweight=lambda d: d[\"bmi\"] > 25)\n)"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
