/* ============================================================================
   PRACTICE P3.5 — Predict the Output / Scenarios · 5
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.5",
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
   "text": "Predict the Output / Scenarios · 5",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "You have a datetime column and need to extract features for a sales prediction model. What features do you create?",
   "body": [
    {
     "t": "p",
     "text": "Extract: day_of_week, month, quarter, is_weekend, is_holiday, day_of_month, week_of_year, is_month_start, is_month_end. For cyclical features use sine/cosine encoding: `sin(2π × hour/24)`, `cos(2π × hour/24)`. Create lag features: sales_yesterday, sales_last_week, sales_same_day_last_year. Create rolling features: 7_day_avg, 30_day_avg, 7_day_max. Add event flags: is_black_friday, is_pay_day. The cyclical encoding avoids the artificial discontinuity where December 31 and January 1 appear far apart."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "You have a customer's transaction history. What aggregate features do you create from it?",
   "body": [
    {
     "t": "p",
     "text": "Recency-Frequency-Monetary (RFM) framework plus extensions: recency (days since last purchase), frequency (purchase count in last 30/90/365 days), monetary (total/avg spend), max single purchase, purchase variety (unique categories), inter-purchase interval (mean, std), trend (is spending increasing or decreasing?), session duration, return rate, preferred payment method, preferred day/time, regularity score (std of inter-purchase intervals — low std = regular customer). Always create features at multiple time windows (7d, 30d, 90d, 365d) to capture different behavioral patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "A feature \"number of days since account creation\" keeps increasing over time. How do you handle this non-stationary feature?",
   "body": [
    {
     "t": "p",
     "text": "Raw account age grows unboundedly, making models trained on past data extrapolate on future data. Solutions: (1) log transform to compress the range, (2) bin into groups (0-30d, 31-90d, 91-365d, 365d+), (3) use percentile rank within the current population, (4) create derived features that capture the concept: account_age_bucket, life_stage (new/active/mature/veteran), (5) create relative features like activity_rate = actions/account_age instead of raw counts. Always think about whether the feature's distribution at prediction time will match training time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "You have user clickstream data (page URL, timestamp, action). What features do you engineer for a conversion prediction model?",
   "body": [
    {
     "t": "p",
     "text": "Session-level features: session_duration, pages_viewed, actions_count, bounce (1 page only), pages_per_minute. Behavioral features: viewed_product_page (bool), added_to_cart (bool), search_count, time_on_product_pages, cart_abandonment_count. Sequential features: funnel_stage_reached, page_sequence_embedding. Engagement features: return_visit (bool), days_since_last_visit, visit_frequency. Content features: product_categories_viewed, price_range_browsed. The features should capture the user's intent and engagement depth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "You have latitude and longitude coordinates for a real estate pricing model. What features do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "Distance-based: distance_to_city_center, distance_to_nearest_school, distance_to_subway, distance_to_park, distance_to_highway. Density-based: num_restaurants_within_1km, crime_density_radius_500m, population_density. Cluster-based: neighborhood_cluster (K-means on coordinates), zip_code_median_price. Spatial aggregates: avg_price_within_1km, num_recent_sales_nearby. Interaction features: distance_to_center × sqft (large homes far from center). Use Haversine formula for accurate distance calculations on Earth's surface."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "Your text feature is customer reviews. What NLP features do you extract for sentiment prediction?",
   "body": [
    {
     "t": "p",
     "text": "Basic: word_count, char_count, avg_word_length, exclamation_count, question_mark_count, caps_ratio. Sentiment: vader_compound_score, textblob_polarity, positive_word_count, negative_word_count. Linguistic: POS tag ratios (adjective density often indicates opinions), named_entity_count. Lexical diversity: unique_words/total_words. Statistical text features: TF-IDF top-N dimensions. Deep features: sentence-BERT embedding (384-dim), fine-tuned classifier's penultimate layer activations. For production, balance feature richness with computation cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "You need to create interaction features but have 50 features, making 1,225 possible pairs. How do you select which interactions to create?",
   "body": [
    {
     "t": "p",
     "text": "Don't create all pairs — it causes overfitting and slow training. Strategies: (1) domain knowledge — create only semantically meaningful interactions (income × debt_ratio, age × experience), (2) tree-based feature importance — train a Random Forest and use SHAP interaction values to identify top 10 interactions, (3) sequential feature engineering — add interactions one at a time, validate improvement via CV, (4) automated selection: create top 20 candidates, use L1 regularization to select, (5) target encoding of feature pairs as a single categorical. Quality over quantity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "A feature has a heavily right-skewed distribution. You tried log transform but it's still skewed. What else can you try?",
   "body": [
    {
     "t": "p",
     "text": "Progressive transformations: (1) Box-Cox transform (finds optimal power transformation), (2) Yeo-Johnson (handles zeros and negatives unlike Box-Cox), (3) quantile transform (forces Gaussian or uniform distribution), (4) rank transform (replace values with their percentile ranks), (5) square root for moderate skew, (6) inverse hyperbolic sine: `np.log(x + sqrt(x² + 1))` — handles zeros naturally. For tree-based models, skewness matters less. For linear models, quantile transform is often the most effective at normalizing distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "You have a categorical feature with high cardinality (10,000 product IDs). One-hot encoding creates too many features. What alternatives do you use?",
   "body": [
    {
     "t": "p",
     "text": "(1) Target encoding: replace each category with the mean target value for that category, with regularization (smoothing with global mean for rare categories). (2) Frequency encoding: replace with category frequency (count in dataset). (3) Leave-one-out encoding: target encoding but excluding the current row. (4) Binary encoding: convert category index to binary digits. (5) Embedding: learn a dense vector per category via neural network. (6) Hash encoding: hash into a fixed number of buckets. (7) Group similar products into clusters first, then encode clusters. Target encoding is usually the best default for tabular data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "You want to capture the \"trend\" of a feature over time. How do you create trend features?",
   "body": [
    {
     "t": "p",
     "text": "(1) Slope of linear regression over last N periods: `np.polyfit(range(N), values[-N:], 1)[0]`, (2) difference features: `value_t - value_{t-1}` (first-order), `diff_t - diff_{t-1}` (second-order acceleration), (3) percentage change: `(value_t - value_{t-1})/value_{t-1}`, (4) ratio to moving average: `value_t / rolling_mean_7d`, (5) sign of trend: -1, 0, +1, (6) number of consecutive increases/decreases. Different trend features capture different aspects — slope is magnitude, sign is direction, ratio is relative position."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "In a fraud detection model, a transaction amount of $500 might be normal for one user but suspicious for another. How do you create user-relative features?",
   "body": [
    {
     "t": "p",
     "text": "Create features relative to each user's baseline: (1) `amount / user_avg_amount` — ratio to user's average, (2) `(amount - user_avg) / user_std` — z-score relative to user, (3) `amount_percentile` — where this transaction falls in user's historical distribution, (4) `amount > user_p95` — binary flag for unusually high amounts, (5) `time_since_last_purchase / user_avg_inter_purchase_time` — is timing unusual?, (6) behavioral deviation score — multi-feature z-score. These user-relative features capture individual anomalies that absolute features miss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "You have a feature \"company size\" with values: \"1-10\", \"11-50\", \"51-200\", \"201-500\", \"501-1000\", \"1000+\". How do you encode this ordinal variable?",
   "body": [
    {
     "t": "p",
     "text": "Options: (1) midpoint encoding: map to representative value (5, 30, 125, 350, 750, 2000), (2) ordinal encoding: 0, 1, 2, 3, 4, 5 — preserves order, (3) log-midpoint encoding: use log of midpoints — better for the large range, (4) create separate binary thresholds: is_small (<50), is_medium (50-500), is_large (500+), (5) target encode each bin. The best approach depends on the model: ordinal encoding works well for trees, midpoint or log-midpoint for linear models. Never use one-hot encoding for ordinal data — it loses the ordering information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "You're building features from IP addresses for a fraud detection system. What features do you extract?",
   "body": [
    {
     "t": "p",
     "text": "(1) Geolocation features: country, city, lat/long from IP, distance from user's registered address, (2) IP metadata: ISP, is_vpn, is_proxy, is_tor, is_datacenter (not residential), (3) IP reputation: known malicious IP lists, (4) behavioral: unique_ips_per_user, ip_changes_per_session, country_changes_per_day, (5) velocity: new_ip_for_user (never seen before), (6) aggregate: transactions_per_ip, users_per_ip (shared IP = suspicious for some use cases). IP-based features are among the most valuable for fraud detection but require regular updating of geolocation databases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "You want to create \"windows\" features — statistics over different time windows (7d, 30d, 90d). The computation is slow across 100K users. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "(1) Use efficient rolling computations: Pandas `rolling()` with `groupby` instead of loops, (2) precompute sorted data by user and timestamp, (3) use cumulative sums for fast windowed aggregates: `cumsum(90d) - cumsum(90d - window)`, (4) compute in parallel with Dask or Spark, (5) store intermediate aggregates in a feature store for incremental updates, (6) use approximate algorithms for large windows (reservoir sampling for percentiles), (7) compute windows at different update frequencies (7d daily, 90d weekly). In production, use a feature store that maintains running aggregates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "You need features that capture the \"diversity\" of a user's behavior (how varied are their purchases/actions?). What measures do you use?",
   "body": [
    {
     "t": "p",
     "text": "(1) Number of unique categories: `nunique()`, (2) Entropy: `-sum(p_i * log(p_i))` where p_i is proportion of each category — higher entropy = more diversity, (3) Gini coefficient: measures inequality of spending across categories, (4) HHI (Herfindahl-Hirschman Index): sum of squared proportions — low HHI = diverse, (5) coefficient of variation of amounts: std/mean, (6) number of categories with > 5% share, (7) concentration ratio: top-3 categories' share of total. Entropy and HHI are the most robust measures. Diversity features capture important behavioral patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "You have email addresses as a feature. What features can you extract from them (ethically and legally)?",
   "body": [
    {
     "t": "p",
     "text": "(1) Domain features: is_gmail, is_corporate, is_disposable_email (temporary email services indicate fraud), domain_age, (2) username patterns: length, has_numbers, has_dots, has_special_chars, looks_random (entropy of username), (3) consistency: does email domain match user's company? does name in email match user's registered name?, (4) email age: if available from verification services. Never extract or use the actual email content. Always comply with privacy regulations (GDPR). Flag disposable email providers as they strongly predict fake/fraudulent accounts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "You have sequential data (user's last 10 actions in order). How do you convert this sequence into fixed-length features?",
   "body": [
    {
     "t": "p",
     "text": "(1) Bag-of-actions: count of each action type (loses order), (2) last-N encoding: what was action 1, 2, 3... (keeps exact positions), (3) transition features: P(action_i → action_j) transition probabilities, (4) sequence embedding: train a small LSTM/Transformer on sequences, extract hidden state, (5) n-gram features: bigrams/trigrams of actions, (6) positional features: first action, last action, most common action, (7) sequence statistics: length, unique_actions, time_between_actions, repetition_rate. For deep models, use the raw sequence directly. For tabular models, combine multiple approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "You need to encode a country feature with 195 countries, many with very few samples. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "Group by region first: assign each country to a continent or economic region (EU, NAFTA, ASEAN, etc.) — reduces to ~20 categories. Then: (1) keep top-10 countries individually, group rest into regions, (2) create economic features instead: GDP_per_capita, HDI, internet_penetration (data from World Bank), (3) target encode with strong smoothing (Bayesian target encoding) for countries with few samples, (4) cluster countries by their target behavior. The key insight: don't treat 195 categories equally — most have too few samples for reliable encoding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "Your model needs a feature for \"customer loyalty\" but there's no direct measurement. How do you engineer a proxy?",
   "body": [
    {
     "t": "p",
     "text": "Build a composite loyalty score from available data: (1) tenure_months / avg_tenure_across_all, (2) purchase_frequency relative to category average, (3) retention indicators: auto_renewal, active_subscription, (4) engagement: login_frequency, feature_usage_breadth, (5) advocacy: referral_count, review_count, NPS_score_if_available, (6) exclusivity: percentage_of_wallet (spending with you / total spending in category), (7) combine into a weighted score or let the model learn from components. Validate the proxy by checking if it correlates with known loyalty outcomes (retention, lifetime value)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "You're told a feature is important by domain experts, but your statistical analysis shows low predictive power. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "Don't dismiss it — investigate further: (1) the relationship might be nonlinear — try transformations and binning, (2) it might interact with other features — create interaction terms, (3) it might be predictive for a subpopulation only — segment and re-analyze, (4) the sample might be too small for the effect to show statistically, (5) the feature might be a causal driver that doesn't appear in correlational analysis. Create the feature both ways (raw per domain expert, engineered per analysis) and let the model select. Domain expertise often captures relationships data can't easily reveal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "You have a text feature with product titles (\"iPhone 15 Pro Max 256GB Space Black\"). How do you extract structured features?",
   "body": [
    {
     "t": "p",
     "text": "(1) Brand extraction: regex/NER for known brands, (2) model/variant: \"Pro\", \"Max\", \"Ultra\", (3) capacity: extract numbers followed by GB/TB, (4) color: match against color dictionary, (5) generation/version: extract numeric version, (6) TF-IDF on cleaned text for similarity search, (7) word embeddings for semantic features. Build a product taxonomy parser with rules + ML: regex for structured parts (numbers, units), NER for entities. Template-based extraction works best when product titles follow consistent patterns (e-commerce data usually does)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "You need to create a \"risk score\" feature from multiple risk indicators. How do you combine them?",
   "body": [
    {
     "t": "p",
     "text": "(1) Simple weighted sum: `0.3 * credit_risk + 0.3 * fraud_risk + 0.2 * churn_risk + 0.2 * complaint_risk` — weights from domain experts, (2) PCA: first component of risk features captures overall risk, (3) train a sub-model: predict a risk-related outcome and use predictions as a feature, (4) rank averaging: convert each risk to percentile, then average, (5) max-risk approach: `max(individual_risks)` — conservative, captures worst-case. Validate by checking if the composite score predicts the target better than individual components. Use monotonic constraints if the score should always be monotonically related to risk."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "You have weather data and want to create features for a retail demand forecasting model. What do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "Direct: temperature, precipitation, wind_speed, humidity, weather_code (sunny/rainy/snowy). Derived: is_extreme_weather (>95th percentile temp or precip), temperature_deviation_from_seasonal_norm, consecutive_rain_days, first_warm_day_of_spring. Impact features: weather_comfort_index, heating/cooling_degree_days. Lagged: weather_yesterday, weather_forecast_next_3_days (people plan ahead). Interaction: is_weekend × is_rainy (bad weather on weekends = more indoor shopping). Weather affects retail significantly — ice cream sales correlate with temperature, umbrella sales with rain forecasts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "You need to encode a timestamp feature that has a natural daily cycle (hour of day). Regular numerical encoding (0-23) makes 23 and 0 appear far apart when they should be close. How do you solve this?",
   "body": [
    {
     "t": "p",
     "text": "Use cyclical encoding with sine and cosine: `hour_sin = sin(2π × hour / 24)` and `hour_cos = cos(2π × hour / 24)`. This creates a circular representation where hour 23 and hour 0 are close together. You need both sin AND cos — using only one is ambiguous (sin(6am) == sin(6pm)). Apply the same for: day_of_week (period=7), month (period=12), day_of_year (period=365). This is critical for models that use distance (KNN, SVM, neural nets), less important for tree-based models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "You're engineering features for anomaly detection in network traffic. What features capture \"unusual\" behavior?",
   "body": [
    {
     "t": "p",
     "text": "Statistical: bytes_mean, bytes_std, packets_per_second, connection_duration_median. Deviation features: current_value / rolling_mean (>2 = unusual), z-score within time window. Pattern features: periodic_traffic_score, new_destination_count (connecting to never-seen-before IPs), protocol_distribution_shift, off_hours_activity_ratio. Volume features: total_connections_per_minute, unique_destinations, payload_size_variance. Temporal: time_since_last_connection, burst_score (many connections in short time). The key is capturing deviations from each entity's normal baseline, not absolute values."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
