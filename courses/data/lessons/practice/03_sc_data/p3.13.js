/* ============================================================================
   PRACTICE P3.13 — Predict the Output / Scenarios · 13
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.13",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Predict the Output / Scenarios · 13",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "301",
   "q": "You have very little data (50 samples) but strong domain expertise about the expected parameter range. How do you incorporate this?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Bayesian Methods & Probabilistic Thinking**"
    },
    {
     "t": "p",
     "text": "**Answer:** Use Bayesian methods: (1) define informative priors from domain knowledge (e.g., \"conversion rate is typically 2-5%\"), (2) Bayesian regression with prior on coefficients, (3) posterior combines prior beliefs with observed data, (4) with 50 samples, priors significantly influence results — this is a feature, not a bug, (5) use conjugate priors for analytical solutions or MCMC for complex models, (6) sensitivity analysis: how much do results change with different priors?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "302",
   "q": "Your A/B test is running but the team wants interim results after 3 days (planned for 14 days). How do Bayesian methods help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Bayesian A/B testing allows continuous monitoring without p-value inflation, (2) report posterior probability: \"85% chance variant B is better,\" (3) credible intervals update with each data point, (4) no fixed stopping rule needed — stop when probability crosses decision threshold (e.g., 95%), (5) expected loss framework: \"if we choose B now and it's wrong, expected loss is $X,\" (6) contrast with frequentist: peeking at p-values inflates Type I error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "303",
   "q": "You need to estimate a rare event probability (e.g., system failure rate < 0.1%). How do you get reliable estimates?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Beta-Binomial model: start with Beta(1,1) prior (uniform), update with observed data, (2) even with 0 failures in 1000 trials, posterior gives P(failure) estimate with uncertainty, (3) credible interval: \"95% sure failure rate is between 0% and 0.3%\", (4) use expert elicitation for informative priors, (5) stress testing: create conditions that increase failure rate, extrapolate, (6) never report \"0% failure rate\" — always provide upper confidence bound."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "304",
   "q": "Your team debates whether to use Bayesian or frequentist hypothesis testing. When do you recommend each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bayesian when: (1) prior information is available and valuable, (2) you want probability of hypothesis, not just reject/fail-to-reject, (3) sequential testing with interim analysis, (4) small sample sizes where priors help, (5) decision-making: expected loss calculation. Frequentist when: (1) regulatory requirements (FDA, clinical trials), (2) no strong priors, (3) reproducibility emphasis, (4) simple pre-registered studies, (5) computational simplicity. Both are valid — choose based on the question and audience."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "305",
   "q": "You're building a spam filter. Before observing the email, you know 20% of emails are spam. The word \"free\" appears in 80% of spam and 10% of non-spam. An email contains \"free.\" What's the probability it's spam?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bayes' theorem: P(spam|free) = P(free|spam) × P(spam) / P(free). P(free) = P(free|spam)×P(spam) + P(free|not spam)×P(not spam) = 0.8×0.2 + 0.1×0.8 = 0.16 + 0.08 = 0.24. P(spam|free) = 0.16/0.24 = 0.667 (66.7%). The word \"free\" more than triples the prior probability of spam from 20% to 67%."
    },
    {
     "t": "p",
     "text": "**Theme: SQL & Data Manipulation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "306",
   "q": "You need to find customers who made purchases in every month of 2024. How do you write this query?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT customer_id\nFROM purchases\nWHERE purchase_date >= '2024-01-01' AND purchase_date < '2025-01-01'\nGROUP BY customer_id\nHAVING COUNT(DISTINCT DATE_TRUNC('month', purchase_date)) = 12;"
    },
    {
     "t": "p",
     "text": "This groups by customer, counts distinct months, and keeps only those with all 12 months represented."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "307",
   "q": "Your query joining two tables is extremely slow (10 minutes). Both tables have 100M rows. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Add indexes on join columns, (2) filter BEFORE joining (push WHERE clause to subqueries), (3) check execution plan: `EXPLAIN ANALYZE`, (4) partition tables by date if querying specific periods, (5) avoid SELECT * — only retrieve needed columns, (6) use appropriate join type (INNER vs LEFT), (7) consider materialized views for repeated queries, (8) check for data skew — one join key with millions of matches, (9) increase work_mem/sort_buffer for hash joins."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "308",
   "q": "You need to calculate running totals, moving averages, and rank within groups. What SQL feature do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Window functions:"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT \n    date, revenue,\n    SUM(revenue) OVER (ORDER BY date) AS running_total,\n    AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d,\n    RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS revenue_rank,\n    LAG(revenue, 1) OVER (ORDER BY date) AS prev_day_revenue,\n    revenue - LAG(revenue, 1) OVER (ORDER BY date) AS daily_change\nFROM sales;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "309",
   "q": "You have user event logs and need to create session-based features. Events within 30 minutes belong to the same session. How do you sessionize in SQL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH flagged AS (\n    SELECT user_id, event_time, event_type,\n        CASE WHEN event_time - LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) > INTERVAL '30 minutes'\n             OR LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL\n        THEN 1 ELSE 0 END AS new_session\n    FROM events\n),\nsessions AS (\n    SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id\n    FROM flagged\n)\nSELECT user_id, session_id,\n    MIN(event_time) AS session_start,\n    MAX(event_time) AS session_end,\n    COUNT(*) AS events_count,\n    EXTRACT(EPOCH FROM MAX(event_time) - MIN(event_time)) AS session_duration_sec\nFROM sessions GROUP BY user_id, session_id;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "310",
   "q": "You need to pivot data from long to wide format in SQL. Monthly revenue rows need to become columns. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT customer_id,\n    SUM(CASE WHEN month = 1 THEN revenue ELSE 0 END) AS jan_revenue,\n    SUM(CASE WHEN month = 2 THEN revenue ELSE 0 END) AS feb_revenue,\n    SUM(CASE WHEN month = 3 THEN revenue ELSE 0 END) AS mar_revenue,\n    -- ... etc for each month\n    SUM(revenue) AS total_revenue\nFROM monthly_revenue\nGROUP BY customer_id;"
    },
    {
     "t": "p",
     "text": "In PostgreSQL, you can also use `crosstab()` function. In pandas: `df.pivot_table(index='customer_id', columns='month', values='revenue')`."
    },
    {
     "t": "p",
     "text": "**Theme: Sampling & Experimental Design**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "311",
   "q": "You have 100 million user records but can only label 10,000 for model training. How do you select the most informative samples?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Stratified sampling: ensure rare classes are represented, (2) active learning: start with random sample, train model, select uncertain examples for labeling, iterate, (3) diversity sampling: cluster data, sample from each cluster, (4) importance sampling: oversample from regions where model is weakest, (5) reservoir sampling for streaming data, (6) avoid convenience sampling (latest data only) — need temporal diversity too."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "312",
   "q": "Your survey has a 5% response rate and you suspect non-response bias. How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Compare responders vs. non-responders on known characteristics (demographics, purchase history), (2) propensity score weighting: model P(respond) and weight responses by 1/P(respond), (3) post-stratification: adjust weights to match population characteristics, (4) sensitivity analysis: what if all non-responders answered differently?, (5) follow-up with non-responders using different method (phone vs. email), (6) report non-response rate and potential bias alongside results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "313",
   "q": "You're designing a clinical trial with a rare disease (only 200 patients available). How do you maximize statistical power?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Crossover design: each patient serves as own control, (2) adaptive design: modify randomization based on interim results, (3) Bayesian analysis with informative priors from previous studies, (4) enrichment design: select patients most likely to respond, (5) multi-arm adaptive: drop ineffective arms early, (6) use surrogate endpoints for faster signal, (7) paired design reduces variance substantially, (8) one-sided test if effect direction is known."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "314",
   "q": "Your data scientist colleague wants to run 50 A/B tests simultaneously. What concerns do you have?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Interaction effects: tests may interfere with each other, (2) multiple testing problem: 50 tests at α=0.05 → ~2.5 false positives expected, (3) shared metrics: winning variant in one test may affect another's metric, (4) traffic splitting: 50 tests each needing sufficient traffic may be infeasible, (5) organizational: who resolves conflicting results? Solutions: (1) use multi-variate testing framework, (2) FDR correction, (3) test isolation (different user segments), (4) prioritize and sequence tests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "315",
   "q": "You need a representative sample of website users but mobile users are underrepresented (30% of sample vs. 60% of population). How do you correct?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Oversample mobile users or undersample desktop, (2) post-stratification weighting: weight mobile users by 60/30 = 2.0 and desktop by 40/70 ≈ 0.57, (3) raking/calibration to match multiple known population margins, (4) for model training: stratified sampling to match population proportions, (5) report weighted and unweighted results, (6) investigate why mobile is underrepresented (sampling mechanism bias?) and fix the root cause."
    },
    {
     "t": "p",
     "text": "**Theme: Graph & Network Analysis**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "316",
   "q": "You have a social network of 1 million users. You need to find the most influential users. What metrics do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Degree centrality: most connections (simple but effective), (2) betweenness centrality: bridges between communities, (3) PageRank: importance based on who connects to you, (4) eigenvector centrality: connected to other important nodes, (5) influence spread: simulate information cascading, (6) K-core decomposition: identify highly connected core, (7) for practical use: combine centrality with domain metrics (engagement rate, follower quality)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "317",
   "q": "You need to detect communities in a large transaction network for fraud analysis. What algorithm do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Louvain algorithm: fast, scalable, maximizes modularity, (2) Label Propagation: efficient for very large graphs, (3) Girvan-Newman: edge betweenness-based (slower but interpretable), (4) spectral clustering on adjacency matrix, (5) METIS for graph partitioning, (6) for fraud: look for unusual community structures — dense subgraphs, star patterns, chains, (7) compare community structure over time — new unusual clusters may indicate fraud rings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "318",
   "q": "Your customer graph has 10 million nodes and 500 million edges. How do you process this efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use graph databases: Neo4j, Amazon Neptune, (2) distributed processing: Apache Spark GraphX, (3) approximate algorithms for centrality (sampling-based), (4) subgraph sampling for analysis, (5) graph embeddings (Node2Vec, GraphSAGE) to convert to vectors for ML, (6) streaming graph algorithms for real-time updates, (7) partition graph by community for parallel processing, (8) only store edges above a relevance threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "319",
   "q": "You want to use network features (number of connections, centrality) alongside tabular features for a fraud model. How do you combine them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Compute graph features per node: degree, clustering coefficient, PageRank, community ID, (2) append as additional columns to tabular data, (3) aggregate neighborhood features: average neighbor fraud rate, max neighbor amount, (4) use Graph Neural Networks (GNN) to learn embeddings, concatenate with tabular, (5) two-stage: graph model generates risk scores → input to tabular model, (6) important features: n-hop neighborhood statistics, triangle count, connectivity patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "320",
   "q": "You're analyzing a knowledge graph for a search engine. How do you use it to improve search results?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Entity disambiguation: \"Apple\" → company vs. fruit based on context, (2) query expansion: search for \"COVID\" also includes \"coronavirus, SARS-CoV-2,\" (3) knowledge panels: structured info from graph, (4) relationship-based answers: \"who founded Tesla\" → traverse founder edge, (5) semantic search: embed entities and relationships, (6) fact verification: cross-reference claims with graph, (7) personalized results: user's knowledge graph indicates interests."
    },
    {
     "t": "p",
     "text": "**Theme: Cloud & Big Data**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "321",
   "q": "Your pandas DataFrame doesn't fit in memory (100GB CSV). What tools do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Dask: parallel pandas-like API, handles larger-than-memory data, (2) PySpark: distributed processing on clusters, (3) Polars: faster than pandas, lazy evaluation reduces memory, (4) Vaex: out-of-core DataFrames for exploration, (5) chunked reading: `pd.read_csv(chunksize=100000)` process in batches, (6) use Parquet format (compressed, columnar), (7) filter/aggregate in database first then load results, (8) sample for exploration, full data for production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "322",
   "q": "You need to process 1TB of log data daily for feature engineering. What architecture do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Batch: Spark on EMR/Databricks — daily ETL jobs, (2) data lake: store raw logs in S3/ADLS in Parquet format, (3) orchestration: Airflow/Dagster for pipeline scheduling, (4) for near real-time: Kafka → Spark Streaming → feature store, (5) processing pipeline: raw → cleaned → features → feature store, (6) partition by date for efficient querying, (7) use columnar formats and predicate pushdown for selective reads, (8) cost optimization: spot instances for batch processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "323",
   "q": "Your ML training job fails after 4 hours due to a shuffle error in Spark. How do you debug and fix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check Spark UI: look at failed stage, executor logs, (2) common cause: data skew — one partition has much more data, (3) fix skew: repartition, salting technique for skewed keys, (4) increase executor memory: `spark.executor.memory=8g`, (5) increase shuffle partitions: `spark.sql.shuffle.partitions=2000`, (6) enable AQE (Adaptive Query Execution), (7) checkpoint intermediate results, (8) use broadcast join for small tables, (9) disk spill: increase disk space per executor."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "324",
   "q": "Your company is choosing between AWS SageMaker, GCP Vertex AI, and Azure ML. What factors matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Existing cloud provider — avoid multi-cloud complexity, (2) team expertise with specific platform, (3) GPU/TPU availability and pricing, (4) managed services needed: AutoML, feature store, model monitoring, (5) integration with data stack (Redshift/BigQuery/Synapse), (6) compliance requirements (data residency, certifications), (7) cost: compare on-demand, spot/preemptible, reserved pricing, (8) lock-in risk: can you export models/data easily?, (9) ML-specific features: experiment tracking, model registry, endpoints."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "325",
   "q": "Your model training requires reading features from a data warehouse which is slow. How do you optimize the training data pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Materialize training data as a snapshot (Parquet files in object storage), (2) use a feature store (Feast, Tecton): precompute and serve features, (3) create materialized views for repeated queries, (4) cache results: don't re-query for each training run, (5) use columnar storage format (Parquet/ORC), (6) partition by training date, (7) pre-join tables and denormalize, (8) parallel data loading from distributed storage, (9) incremental updates: only process new data since last snapshot."
    },
    {
     "t": "p",
     "text": "**Theme: Causal Inference**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
