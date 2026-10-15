/* ============================================================================
   INTERVIEW I1.7 — 10. ML-Specific SQL Patterns
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.7",
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
   "text": "10. ML-Specific SQL Patterns",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "186",
   "q": "Write SQL to compute feature statistics for ML.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    AVG(feature_1) AS mean_f1,\n    STDDEV(feature_1) AS std_f1,\n    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY feature_1) AS median_f1,\n    MIN(feature_1) AS min_f1,\n    MAX(feature_1) AS max_f1,\n    COUNT(*) - COUNT(feature_1) AS nulls_f1\nFROM ml_dataset;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "Create train/test split in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH numbered AS (\n    SELECT *, ROW_NUMBER() OVER (ORDER BY RANDOM()) AS rn,\n           COUNT(*) OVER () AS total\n    FROM dataset\n)\nSELECT *, CASE WHEN rn <= total * 0.8 THEN 'train' ELSE 'test' END AS split\nFROM numbered;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "Detect target leakage in features.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Features shouldn't have near-perfect correlation with target\nSELECT feature_name,\n       CORR(feature_value, target) AS correlation\nFROM features_unpivoted\nGROUP BY feature_name\nHAVING ABS(CORR(feature_value, target)) > 0.95\nORDER BY ABS(correlation) DESC;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "Compute time-based features for ML.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT user_id,\n       COUNT(*) OVER (PARTITION BY user_id ORDER BY event_time\n                      RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW) AS events_7d,\n       AVG(amount) OVER (PARTITION BY user_id ORDER BY event_time\n                         RANGE BETWEEN INTERVAL '30 days' PRECEDING AND CURRENT ROW) AS avg_amount_30d,\n       EXTRACT(EPOCH FROM event_time - LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)) AS time_since_last\nFROM events;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "Compute class distribution and check imbalance.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT target_class,\n       COUNT(*) AS count,\n       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage\nFROM dataset\nGROUP BY target_class\nORDER BY count DESC;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "Stratified sampling in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH ranked AS (\n    SELECT *,\n           ROW_NUMBER() OVER (PARTITION BY target_class ORDER BY RANDOM()) AS rn,\n           COUNT(*) OVER (PARTITION BY target_class) AS class_count\n    FROM dataset\n)\nSELECT * FROM ranked WHERE rn <= class_count * 0.2;  -- 20% sample per class"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "Find correlated features using SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT CORR(feature_a, feature_b) AS correlation,\n       REGR_SLOPE(feature_a, feature_b) AS slope,\n       REGR_R2(feature_a, feature_b) AS r_squared\nFROM dataset;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "Create lagged features for time series.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT date, value,\n       LAG(value, 1) OVER (ORDER BY date) AS lag_1,\n       LAG(value, 7) OVER (ORDER BY date) AS lag_7,\n       AVG(value) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_avg_7,\n       value - LAG(value, 1) OVER (ORDER BY date) AS diff_1\nFROM time_series_data;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "Compute confusion matrix in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    SUM(CASE WHEN actual = 1 AND predicted = 1 THEN 1 ELSE 0 END) AS true_positive,\n    SUM(CASE WHEN actual = 0 AND predicted = 1 THEN 1 ELSE 0 END) AS false_positive,\n    SUM(CASE WHEN actual = 1 AND predicted = 0 THEN 1 ELSE 0 END) AS false_negative,\n    SUM(CASE WHEN actual = 0 AND predicted = 0 THEN 1 ELSE 0 END) AS true_negative\nFROM predictions;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "Detect data drift with SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Compare distribution of a feature between two time periods\nWITH current_stats AS (\n    SELECT AVG(feature) AS mean, STDDEV(feature) AS std\n    FROM data WHERE date >= CURRENT_DATE - 7\n),\nhistorical_stats AS (\n    SELECT AVG(feature) AS mean, STDDEV(feature) AS std\n    FROM data WHERE date BETWEEN CURRENT_DATE - 37 AND CURRENT_DATE - 7\n)\nSELECT\n    ABS(c.mean - h.mean) / NULLIF(h.std, 0) AS z_score_drift,\n    CASE WHEN ABS(c.mean - h.mean) / NULLIF(h.std, 0) > 2 THEN 'DRIFT' ELSE 'OK' END AS status\nFROM current_stats c, historical_stats h;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "Handle missing values analysis in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    COUNT(*) AS total_rows,\n    SUM(CASE WHEN col1 IS NULL THEN 1 ELSE 0 END) AS col1_nulls,\n    ROUND(100.0 * SUM(CASE WHEN col1 IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS col1_null_pct,\n    SUM(CASE WHEN col2 IS NULL THEN 1 ELSE 0 END) AS col2_nulls,\n    ROUND(100.0 * SUM(CASE WHEN col2 IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS col2_null_pct\nFROM dataset;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "Text-to-SQL: explain the concept.",
   "body": [
    {
     "t": "p",
     "text": "Given a natural language question, generate the corresponding SQL query. Used in: NL2SQL (converting user questions to database queries), chatbots for business analytics. LLM-based approaches (GPT, fine-tuned models) now dominate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "Write SQL for customer RFM analysis.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT customer_id,\n       DATEDIFF(CURRENT_DATE, MAX(order_date)) AS recency_days,\n       COUNT(*) AS frequency,\n       SUM(amount) AS monetary,\n       NTILE(5) OVER (ORDER BY DATEDIFF(CURRENT_DATE, MAX(order_date)) DESC) AS r_score,\n       NTILE(5) OVER (ORDER BY COUNT(*)) AS f_score,\n       NTILE(5) OVER (ORDER BY SUM(amount)) AS m_score\nFROM orders\nGROUP BY customer_id;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "Compute AUC-ROC components in SQL.",
   "body": [
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Calculate TPR and FPR at different thresholds\nWITH thresholds AS (\n    SELECT DISTINCT prediction_score AS threshold FROM predictions\n),\nmetrics AS (\n    SELECT t.threshold,\n           SUM(CASE WHEN p.actual = 1 AND p.prediction_score >= t.threshold THEN 1 ELSE 0 END)::float\n           / NULLIF(SUM(CASE WHEN p.actual = 1 THEN 1 ELSE 0 END), 0) AS tpr,\n           SUM(CASE WHEN p.actual = 0 AND p.prediction_score >= t.threshold THEN 1 ELSE 0 END)::float\n           / NULLIF(SUM(CASE WHEN p.actual = 0 THEN 1 ELSE 0 END), 0) AS fpr\n    FROM thresholds t CROSS JOIN predictions p\n    GROUP BY t.threshold\n)\nSELECT * FROM metrics ORDER BY threshold;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "Optimize a feature engineering query running on millions of rows.",
   "body": [
    {
     "t": "ul",
     "items": [
      "Use appropriate indexes on join and filter columns",
      "Partition table by date if time-based",
      "Pre-aggregate where possible (materialized views)",
      "Use window functions instead of correlated subqueries",
      "Compute features incrementally (only new data)",
      "Consider approximate functions (APPROX_PERCENTILE) for large datasets",
      "Push computation to Spark/Databricks for very large scale"
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
