/* ============================================================================
   INTERVIEW I2.8 — Aggregation, Window & Statistical
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.8",
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
   "text": "Aggregation, Window & Statistical",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is the difference between `groupby().agg()` and `groupby().transform()`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# agg: Reduces each group to one row\nstats = df.groupby(\"store\")[\"sales\"].agg([\"mean\", \"std\", \"count\"])\n\n# transform: Returns value with same index as original\ndf[\"store_avg\"] = df.groupby(\"store\")[\"sales\"].transform(\"mean\")\n# Each row gets its group's mean — useful for standardization within groups\ndf[\"std_sales\"] = (df[\"sales\"] - df[\"store_avg\"]) / df.groupby(\"store\")[\"sales\"].transform(\"std\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is `groupby().apply` and when is it necessary?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def top_n(group_df, n=3):\n    return group_df.nlargest(n, \"sales\")\n\n# Apply custom function to each group, returning transformed DataFrames\ntop_sellers = df.groupby(\"category\").apply(top_n, n=5)\n\n# Best used when built-in agg/transform don't support your operation\n# Slower than vectorized operations — use only when necessary"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is `pd.NamedAgg` and when do you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "result = df.groupby(\"store\").agg(\n    total_sales=pd.NamedAgg(column=\"sales\", aggfunc=\"sum\"),\n    avg_sales=pd.NamedAgg(column=\"sales\", aggfunc=\"mean\"),\n    transaction_count=pd.NamedAgg(column=\"id\", aggfunc=\"count\"),\n    max_date=pd.NamedAgg(column=\"date\", aggfunc=\"max\")\n)"
    },
    {
     "t": "p",
     "text": "Named aggregations in one shot — cleaner than renaming after aggregation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is `groupby().filter` in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Keep groups where maximum sales exceed threshold\nbig_stores = df.groupby(\"store\").filter(lambda g: g[\"sales\"].sum() > 100_000)\n# Returns original rows only for stores meeting criterion"
    },
    {
     "t": "p",
     "text": "Returns a subset of the original DataFrame (rows that belong to passing groups), unlike `agg` which reduces."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is `GroupBy.pipe`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def add_margin(group_df):\n    group_df[\"margin\"] = group_df[\"profit\"] / group_df[\"revenue\"]\n    return group_df\n\nresult = df.groupby(\"region\").pipe(add_margin)"
    },
    {
     "t": "p",
     "text": "Like `DataFrame.pipe` but applied within each group. Enables composable groupby transformations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "126",
   "q": "What is `expanding()` window and how does it differ from `rolling()`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# expanding: Grows from start of series to current position\ndf[\"cumulative_avg\"] = df[\"sales\"].expanding().mean()  # Same as cumsum/cumcount pattern\n\n# rolling: Fixed window\ndf[\"7d_avg\"] = df[\"sales\"].rolling(7).mean()\n\n# expanding is like rolling with window = all data up to t\ndf[\"sales\"].expanding(min_periods=1).mean()  # Same as cumulative mean"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is exponential weighted moving average (ewm)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# EWM: Gives more weight to recent observations\ndf[\"ema\"] = df[\"price\"].ewm(span=12, adjust=False).mean()  # 12-period EMA\ndf[\"ewm_std\"] = df[\"price\"].ewm(span=20).std()\n\n# Parameters:\n# span: Equivalent to n-day EMA (alpha = 2/(span+1))\n# com: Center of mass (alpha = 1/(1+com))\n# halflife: Half-life in periods"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is `rolling().corr` and `rolling().cov`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Rolling correlation between two columns\ndf[\"roll_corr\"] = df[\"price\"].rolling(30).corr(df[\"volume\"])\n\n# Rolling correlation between DataFrame and another Series/DataFrame\ncorr_df = df[[\"asset1\", \"asset2\", \"asset3\"]].rolling(60).corr()\n# Result is a multi-index DataFrame (date, asset) × asset"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is `groupby().cumsum()` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Running total within each group\ndf[\"running_sales\"] = df.sort_values(\"date\").groupby(\"store\")[\"daily_sales\"].cumsum()\n\n# Running count\ndf[\"order_number\"] = df.groupby(\"customer_id\").cumcount() + 1\n\n# First occurrence flag\ndf[\"is_first_visit\"] = df.groupby(\"visitor_id\").cumcount() == 0"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "How do you compute year-over-year change in time series groups?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Percentage change within groups\ndf = df.sort_values([\"region\", \"year\"])\ndf[\"yoy_growth\"] = df.groupby(\"region\")[\"revenue\"].pct_change()\n\n# Shift within group\ndf[\"prev_year_revenue\"] = df.groupby(\"region\")[\"revenue\"].shift(1)\ndf[\"yoy_absolute\"] = df[\"revenue\"] - df[\"prev_year_revenue\"]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is `pd.crosstab` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Frequency table of two (or more) categorical variables\nct = pd.crosstab(df[\"gender\"], df[\"product_category\"])\n\n# With normalization (proportions)\nct_norm = pd.crosstab(df[\"gender\"], df[\"product_category\"], normalize=\"index\")\n\n# With aggregation\npd.crosstab(df[\"region\"], df[\"year\"], values=df[\"sales\"], aggfunc=\"sum\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is `df.corrwith`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Correlation of each column in df1 with corresponding column in df2\ncorrs = df1.corrwith(df2)\n\n# Correlation of each column with a specific Series\ntarget_corr = df.corrwith(df[\"target\"])\n\n# Useful for feature selection: rank features by correlation with target\ntarget_corr.abs().sort_values(ascending=False)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "How do you compute the covariance matrix and correlation matrix?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Correlation (Pearson by default)\ncorr_matrix = df.corr(method=\"pearson\")  # or \"spearman\", \"kendall\"\n\n# Covariance\ncov_matrix = df.cov()\n\n# Visualize correlation matrix\nimport seaborn as sns\nsns.heatmap(corr_matrix, annot=True, cmap=\"coolwarm\", vmin=-1, vmax=1)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is `pd.DataFrame.rank` and its tie-breaking methods?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df[\"rank_avg\"] = df[\"score\"].rank(method=\"average\")    # Average for ties\ndf[\"rank_min\"] = df[\"score\"].rank(method=\"min\")        # Min rank for ties\ndf[\"rank_dense\"] = df[\"score\"].rank(method=\"dense\")    # No gaps in rank numbers\ndf[\"rank_pct\"] = df[\"score\"].rank(pct=True)            # Percentile rank [0, 1]"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is `pd.DataFrame.resample` for downsampling vs upsampling?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Downsampling: aggregate from high to low frequency\nmonthly = df.resample(\"ME\")[\"sales\"].sum()\nweekly_ohlc = df[\"price\"].resample(\"W\").ohlc()\n\n# Upsampling: from low to high frequency (creates NaN)\ndaily = df.resample(\"D\").asfreq()\ndaily_filled = daily.resample(\"D\").interpolate(method=\"linear\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is `pd.DateOffset` and `pd.BusinessDay`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from pandas.tseries.offsets import BusinessDay, MonthEnd, BDay\n\n# Add 5 business days\ndf[\"deadline\"] = df[\"order_date\"] + BusinessDay(5)\n\n# End of month\ndf[\"month_end\"] = df[\"date\"] + MonthEnd(0)\n\n# Custom offset\ndf[\"next_quarter\"] = df[\"date\"] + pd.DateOffset(months=3)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is `pd.bdate_range` and `pd.date_range`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# date_range: All calendar days\npd.date_range(\"2024-01-01\", periods=30, freq=\"D\")\n\n# bdate_range: Business days only (Mon-Fri)\npd.bdate_range(\"2024-01-01\", \"2024-01-31\")\n\n# Custom frequency\npd.date_range(\"2024-01-01\", periods=12, freq=\"ME\")  # Month-end\npd.date_range(\"2024-01-01\", periods=4, freq=\"QS\")   # Quarter start"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "How do you detect seasonal patterns in Pandas time series?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Decompose additive time series\nfrom statsmodels.tsa.seasonal import seasonal_decompose\ndecomposition = seasonal_decompose(df[\"value\"], model=\"additive\", period=12)\n\ndecomposition.trend.plot()\ndecomposition.seasonal.plot()\ndecomposition.resid.plot()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is `pd.infer_freq`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Automatically detect the frequency of a DatetimeIndex\npd.infer_freq(df.index)   # Returns \"D\", \"H\", \"ME\", \"Q\", etc.\n\n# Fix an irregular index\ndf = df.asfreq(pd.infer_freq(df.index))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is lag feature creation for time series in Pandas?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Create lag features\nfor lag in [1, 7, 14, 30]:\n    df[f\"lag_{lag}\"] = df[\"sales\"].shift(lag)\n\n# Rolling window features\ndf[\"rolling_mean_7\"] = df[\"sales\"].rolling(7).mean()\ndf[\"rolling_std_7\"] = df[\"sales\"].rolling(7).std()\n\n# Train/test split: must use time-based split\ntrain = df[df.index < \"2024-01-01\"]\ntest = df[df.index >= \"2024-01-01\"]"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
