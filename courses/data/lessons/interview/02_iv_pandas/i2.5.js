/* ============================================================================
   INTERVIEW I2.5 — String Operations & Cleaning
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.5",
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
   "text": "String Operations & Cleaning",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is the `.str` accessor in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"name\"].str.upper()\ndf[\"email\"].str.contains(\"@gmail.com\")\ndf[\"text\"].str.strip().str.lower().str.replace(r\"\\s+\", \" \", regex=True)\ndf[\"full_name\"].str.split(\" \", expand=True)  # Split into multiple columns"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "How do you extract patterns from strings?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"year\"] = df[\"date_str\"].str.extract(r\"(\\d{4})\")         # Extract year\ndf[[\"first\", \"last\"]] = df[\"name\"].str.extract(r\"(\\w+) (\\w+)\")  # Two groups"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How do you replace values in a column?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"gender\"].replace({\"M\": \"Male\", \"F\": \"Female\"}, inplace=True)\ndf[\"city\"] = df[\"city\"].str.replace(\"NYC\", \"New York\")\ndf[\"value\"] = df[\"value\"].mask(df[\"value\"] < 0, 0)  # Replace negatives with 0"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is `np.where` and how is it used in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\ndf[\"category\"] = np.where(df[\"score\"] >= 60, \"Pass\", \"Fail\")\n# Equivalent to: if score >= 60 then \"Pass\" else \"Fail\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "How do you encode ordinal categories efficiently?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "ordinal_map = {\"low\": 1, \"medium\": 2, \"high\": 3}\ndf[\"priority_encoded\"] = df[\"priority\"].map(ordinal_map)\n\n# Or using Categorical with ordered=True:\ndf[\"priority\"] = pd.Categorical(df[\"priority\"], categories=[\"low\",\"medium\",\"high\"], ordered=True)\ndf[\"priority_encoded\"] = df[\"priority\"].cat.codes"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is `pd.DataFrame.where` vs `mask`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`df.where(cond)`: Keep values where condition is True; replace with NaN (or `other`) where False.",
      "`df.mask(cond)`: Replace values where condition is True; keep where False. (Opposite logic)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "How do you count occurrences of each unique combination?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df.groupby([\"city\", \"product\"]).size().reset_index(name=\"count\")\n# Or\ndf.value_counts([\"city\", \"product\"]).reset_index()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "How do you forward-fill and backward-fill missing values?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"val\"].ffill()   # Propagate last valid value forward\ndf[\"val\"].bfill()   # Propagate next valid value backward\ndf[\"val\"].fillna(method=\"ffill\", limit=3)  # Max 3 consecutive fills"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "How do you detect and handle outliers in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# IQR method\nQ1, Q3 = df[\"value\"].quantile([0.25, 0.75])\nIQR = Q3 - Q1\nmask = (df[\"value\"] >= Q1 - 1.5*IQR) & (df[\"value\"] <= Q3 + 1.5*IQR)\ndf_clean = df[mask]\n\n# Z-score method\nfrom scipy import stats\ndf = df[(np.abs(stats.zscore(df[\"value\"])) < 3)]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is a window function in Pandas?",
   "body": [
    {
     "t": "p",
     "text": "Window functions apply calculations over a sliding window of rows. Types: `rolling` (fixed window), `expanding` (cumulative), `ewm` (exponentially weighted). Used for moving averages, volatility, trend features."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
