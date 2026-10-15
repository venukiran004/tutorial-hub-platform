/* ============================================================================
   PRACTICE P3.6 — Predict the Output / Scenarios · 6
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.6",
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
   "text": "Predict the Output / Scenarios · 6",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "126",
   "q": "You have a feature \"price\" and need to create features that capture price perception (expensive vs cheap). How?",
   "body": [
    {
     "t": "p",
     "text": "Create relative price features: (1) `price / category_avg_price` — is it expensive for its category? (2) `price_percentile_in_category` — where it ranks, (3) `price / competitor_avg_price`, (4) `log(price)` — perceptual scale (people perceive $10→$20 as bigger jump than $110→$120), (5) `price_bucket` — cheap/mid/premium based on category percentiles, (6) `discount_pct = (original_price - price) / original_price`, (7) `price_ending` — does it end in .99 (psychological pricing), (8) `price_change_vs_last_month` — trend direction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "You're working with image data and need tabular features from images for a traditional ML model (no CNN). What features do you extract?",
   "body": [
    {
     "t": "p",
     "text": "(1) Color features: mean RGB per channel, dominant colors (K-means on pixels), color histogram, saturation/brightness, (2) texture: Gabor filter responses, LBP (Local Binary Pattern), edge density, (3) shape: aspect ratio, object count (from simple segmentation), symmetry, (4) quality: blur detection (Laplacian variance), brightness, contrast, (5) pre-trained CNN features: pass image through ResNet/VGG, extract penultimate layer activations (2048-dim), reduce with PCA. The CNN embedding approach usually works best — it captures semantic features automatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "You have a user's device information (User-Agent string). What features do you extract?",
   "body": [
    {
     "t": "p",
     "text": "Parse the User-Agent: (1) device_type: mobile/tablet/desktop, (2) OS: iOS/Android/Windows/Mac/Linux, (3) browser: Chrome/Safari/Firefox/Edge, (4) OS_version and browser_version, (5) is_bot (known bot user agents), (6) is_outdated_browser — security risk indicator, (7) device_brand for mobile (Apple/Samsung/Huawei), (8) is_webview — in-app browser, (9) screen resolution if available. Use libraries like `user-agents` for parsing. These features are valuable for fraud detection (bots use unusual user agents), personalization, and compatibility analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "You need to capture \"momentum\" in a user's engagement — are they becoming more or less active? How do you feature engineer this?",
   "body": [
    {
     "t": "p",
     "text": "Compare recent behavior to historical: (1) `activity_last_7d / activity_last_30d` — ratio >1 means increasing, (2) slope of activity over time windows (linear regression coefficient), (3) acceleration: `(activity_last_7d - activity_prev_7d) - (activity_prev_7d - activity_prev_prev_7d)`, (4) streak features: consecutive_active_days, max_streak_length, (5) trend classification: is_increasing, is_stable, is_declining based on recent trajectory, (6) exponentially weighted moving average — more recent activity counts more. Momentum features are powerful predictors for churn and conversion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "You have address data and need features for an insurance pricing model. What do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "(1) Population density of zip code, (2) median income of area, (3) crime rate statistics, (4) natural disaster risk (flood zone, earthquake zone, hurricane zone), (5) distance to fire station, hospital, police station, (6) property value index of the area, (7) urban vs suburban vs rural classification, (8) historical claim density in the area, (9) weather extremes (avg rainfall, temperature range), (10) building code era (newer construction areas = better building standards). Enrich address data with census data, FEMA flood maps, and geographic risk databases. Location is one of the strongest predictors in insurance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "You need to create a \"similarity\" feature between two items (e.g., similarity between a user's past purchases and a candidate recommendation). How?",
   "body": [
    {
     "t": "p",
     "text": "(1) Cosine similarity between item embeddings (pre-trained or learned), (2) Jaccard similarity on categorical attributes (shared tags / total tags), (3) weighted overlap on key attributes (same brand: +0.5, same category: +0.3, similar price: +0.2), (4) collaborative filtering similarity (users who bought A also bought B), (5) text similarity between item descriptions (TF-IDF cosine), (6) price ratio (items with similar price get higher similarity). For recommendations, create `max_similarity_to_history`, `avg_similarity_to_top5`, `min_price_diff_to_history`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "You have a feature with seasonal patterns (e.g., temperature) and your model is trained on 1 year of data. How do you handle prediction for future months the model hasn't seen the same month for?",
   "body": [
    {
     "t": "p",
     "text": "The model HAS seen each month if trained on a full year. The concern is year-over-year changes. Features: (1) month-encoded features (cyclical) capture seasonal patterns, (2) deviation from historical monthly average: `temp - historical_avg_for_this_month`, (3) percentile within historical range for this time of year, (4) trend adjustment: historical_avg + year_over_year_trend, (5) relative features: `temp_vs_last_month`, `temp_vs_same_month_last_year`. The model should learn seasonal effects from month features and adaptations from deviation features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "You have a purchase history with product names (strings). How do you create features indicating purchase patterns without NLP?",
   "body": [
    {
     "t": "p",
     "text": "(1) Category aggregation: map products to categories, compute counts per category, (2) brand loyalty: dominant_brand_share = purchases_from_top_brand / total, (3) variety score: unique_products / total_purchases, (4) repeat purchase rate: products_bought_more_than_once / unique, (5) basket analysis: average items per transaction, co-purchase patterns, (6) price segment: average price tier of purchases, (7) spending velocity: total_spend / active_days. String matching can extract patterns: \"organic\" in name → health_conscious flag, product_name_length as a proxy for specificity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "You need to create prediction intervals (not just point predictions) but your model only outputs point predictions. How do you engineer features for uncertainty?",
   "body": [
    {
     "t": "p",
     "text": "Create features that correlate with prediction difficulty: (1) `distance_to_nearest_training_point` — predictions far from training data are less certain, (2) `density_of_training_points_nearby` — low density = less certain, (3) `feature_novelty_score` — are input values in ranges seen during training?, (4) `model_ensemble_disagreement` — variance across ensemble members, (5) `conformal_prediction_width` — calibrated intervals from conformal prediction. Use quantile regression to directly predict quantiles (10th, 50th, 90th percentile) instead of engineering uncertainty features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "You're building features for a NLP classification model but your text data is in multiple languages. How do you handle multilingual feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "Options: (1) Multilingual embeddings: use mBERT, XLM-RoBERTa, or multilingual-e5 which encode 100+ languages into the same embedding space, (2) Translate all text to English first, then extract features (adds latency but simplifies downstream), (3) Language-specific pipelines: detect language, route to language-specific tokenizer/model, (4) Language-agnostic features: text_length, punctuation_ratio, uppercase_ratio, number_density work across languages, (5) Add language as a categorical feature. Multilingual embeddings are the best modern approach — no translation needed, shared semantic space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "You're told to create \"recency\" features. What are the different ways to measure recency and when would you use each?",
   "body": [
    {
     "t": "p",
     "text": "(1) days_since_last_event — simple, intuitive, good for models that handle linear relationships, (2) log(days_since) — compresses long recency, better for skewed distributions, (3) exponential decay: `exp(-lambda * days_since)` — high value for recent, drops off smoothly, (4) binary recency thresholds: active_in_last_7d, active_in_last_30d — simple but loses granularity, (5) recency rank: where this user falls among all users in recency — normalized, (6) recency relative to user's pattern: days_since_last / avg_inter_event_interval — captures if this gap is unusual for THIS user. Use multiple recency formulations as different features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "Your model ingests features from a feature store. A new real-time feature is 10x slower to compute than others. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "(1) Pre-compute during off-peak hours and cache in feature store (stale but fast), (2) compute async — return prediction without this feature, update when ready, (3) create a cheaper proxy feature that approximates the expensive one (e.g., use a simpler calculation), (4) use a tiered approach — fast features for most requests, expensive features only for borderline predictions (where additional signal matters most), (5) evaluate model performance with and without the feature — if AUC drops by only 0.001, it's not worth the latency. Always measure feature-level ROI: value added vs cost incurred."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "You need to encode a tree/hierarchical structure (e.g., product category → subcategory → sub-subcategory). How?",
   "body": [
    {
     "t": "p",
     "text": "(1) Encode each level separately as categorical features (category_L1, category_L2, category_L3), (2) create path encoding: \"electronics/phones/smartphones\" as a single string, target-encoded, (3) hierarchical target encoding: smooth L3 encoding with L2 average, smooth L2 with L1, (4) create binary features for important paths, (5) learn category embeddings that respect hierarchy using a small neural network, (6) aggregate target statistics at each level as separate features. The hierarchical smoothing approach is particularly effective — a rare sub-subcategory borrows strength from its parent category."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "You're building a model to predict employee attrition. HR gives you raw data: hire date, department, salary, manager ID, performance ratings. What features do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "Tenure: days_since_hire, tenure_bucket. Salary: salary_vs_department_avg, salary_percentile, salary_growth_rate, time_since_last_raise. Manager: manager_team_size, manager_avg_attrition_rate, time_with_current_manager, manager_change_count. Performance: latest_rating, rating_trend (improving/declining), rating_vs_peers. Career: promotions_count, time_since_last_promotion, lateral_moves. Engagement proxies: overtime_frequency, vacation_days_used, training_sessions_attended. High-risk indicators: no_raise_in_2_years, rating_dropped, new_manager."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "You have a binary target but want to capture the \"strength\" of the positive/negative signal. How do you create features that capture prediction confidence?",
   "body": [
    {
     "t": "p",
     "text": "(1) Distance from decision boundary: for linear models, the raw score before sigmoid is the margin, (2) calibrated probability as a feature for downstream models, (3) ensemble agreement: what percentage of trees/models predict positive?, (4) nearest neighbor analysis: target rate among K nearest neighbors, (5) density estimation: P(positive|similar samples), (6) feature-level signal strength: how many features individually suggest positive vs negative? Create `positive_feature_count` and `negative_feature_count`. These meta-features are useful for cascaded models and escalation rules."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "You need a feature that captures \"consistency\" in a time series (does the user behave consistently or erratically?). How?",
   "body": [
    {
     "t": "p",
     "text": "(1) Coefficient of variation: std/mean of periodic values, (2) entropy of binned activity distribution, (3) autocorrelation at lag-1 and lag-7 — high autocorrelation = consistent patterns, (4) count of \"regime changes\" detected by change point detection algorithms, (5) day-to-day correlation of activity patterns, (6) regularity index: 1 - (variance of inter-event intervals / mean²), (7) periodicity score: strength of dominant frequency in Fourier transform. Consistent users are typically more predictable and have higher retention — this is a valuable behavioral feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "You need to create a \"freshness\" feature for a news recommendation system. A 1-hour-old article is fresh, a 1-day-old article is less fresh, a 1-week-old article is stale. How do you encode this?",
   "body": [
    {
     "t": "p",
     "text": "Use exponential decay: `freshness = exp(-decay_rate * hours_since_publication)`. Tune decay_rate for your domain — news might use `decay_rate=0.1` (half-life ≈ 7 hours) while academic papers use `decay_rate=0.001`. Alternatively: (1) logarithmic: `1 / (1 + log(1 + hours))`, (2) piecewise: 1.0 if <1h, 0.8 if <6h, 0.5 if <24h, 0.2 if <7d, 0.0 otherwise, (3) content-type specific: breaking news decays fast, analysis pieces decay slowly. Add content type interaction: `freshness × is_breaking_news`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "You have a user's social graph data (friends, followers, connections). What features do you extract for churn prediction?",
   "body": [
    {
     "t": "p",
     "text": "(1) Network size: friend_count, follower_count, following_count, (2) network activity: active_friends_pct (friends who used the app recently), (3) network density: how interconnected are the user's friends, (4) influence: PageRank score, (5) community: cluster_id, community_size, (6) social engagement: messages_sent, reactions_to_friends, (7) network churn: what percentage of friends churned recently (strong predictor!), (8) network growth: new_connections_last_30d, (9) reciprocity: mutual_connections / total_connections. The \"friends who churned\" feature is often the single strongest churn predictor — churn is contagious."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "You need to create features from a customer's email/call support history for a satisfaction prediction model. What do you engineer?",
   "body": [
    {
     "t": "p",
     "text": "Volume: total_tickets, tickets_last_30d, ticket_frequency_trend. Resolution: avg_resolution_time, unresolved_ticket_count, first_contact_resolution_rate. Sentiment: avg_sentiment_of_messages, sentiment_trend, escalation_count. Content: topic_distribution (billing, technical, shipping), recurring_issue_flag. Effort: avg_messages_per_ticket (high = difficult), channel_switches (email→phone = escalation), (7) agent features: handled_by_senior_agent (indicates severity). Customer effort score (CES) proxies: total_interactions, repeated_contact_for_same_issue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "Your model uses \"user age group\" (18-24, 25-34, 35-44, etc.) but you want to capture non-linear age effects. What features do you create?",
   "body": [
    {
     "t": "p",
     "text": "(1) Quadratic: age² — captures U-shaped relationships (e.g., spending high for young and old), (2) age_midpoint (21, 29.5, 39.5) — for models needing numeric input, (3) age interactions: age_group × product_category, age_group × channel, (4) age relative to product: young_for_luxury_brand = (age_midpoint < 30) & (brand = luxury), (5) generation feature: GenZ, Millennial, GenX, Boomer — culturally meaningful, (6) life stage proxy: student, young_professional, family, pre_retirement, retirement. Life stage is often more predictive than raw age for consumer behavior."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "You're creating features for a credit scoring model and need to comply with fair lending regulations (you can't use race, gender, or age). But other features might serve as proxies. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "(1) Remove protected attributes directly (race, gender, age), (2) audit remaining features for proxy effects: zip code correlates with race, first name correlates with gender, (3) compute fairness metrics: disparate impact ratio per feature, (4) either remove proxy features or apply adversarial debiasing, (5) use interpretable features with clear business justification, (6) document why each feature is included and its fairness assessment. Run group-wise performance analysis: does the model perform equally across demographic groups? This is a legal and ethical requirement, not optional."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "You have both user features (demographics) and item features (product attributes) and need features for a recommendation model. What interaction features do you create?",
   "body": [
    {
     "t": "p",
     "text": "Cross features: user_age_group × product_category, user_income × product_price_tier, user_location × product_shipping_speed. Affinity features: user's historical avg_rating_for_this_category, user's purchase_frequency_for_this_brand, price_sensitivity = (user's chosen_price / category_avg_price). Match features: does_product_match_user_preferences (size, color, style), brand_loyalty_to_this_brand, category_familiarity_score. Collaborative: users_like_me_bought_this_rate, items_like_this_rated_by_user. These cross features capture the user-item compatibility that drives recommendations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "You're told your model needs a \"surprise\" feature — how surprised the system should be by a given event. How do you operationalize this?",
   "body": [
    {
     "t": "p",
     "text": "Surprise = how much the event deviates from expectations: (1) `surprise_score = -log(P(event))` — information theory definition, unlikely events have high surprise, (2) deviation from prediction: `|actual - predicted|` from a baseline model, (3) z-score relative to historical distribution of similar events, (4) percentile rank (inverse): a bottom-1% event has surprise = 0.99, (5) contextual surprise: is this unusual for this user/time/location even if globally common? Combine multiple surprise dimensions: `overall_surprise = surprise_value + surprise_timing + surprise_context`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "Your dataset has a feature that changes meaning over time (e.g., \"premium user\" was redefined after a business change). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "(1) Split the feature into two eras: `premium_v1` (pre-change) and `premium_v2` (post-change), (2) harmonize to one definition: if you can recompute the old definition using raw data, apply the new definition retroactively, (3) create a time-interaction: `premium × is_post_change`, (4) add a `definition_version` feature, (5) if harmonization isn't possible, treat data before and after the change as different datasets and validate the model handles both. Document the definition change timestamp. This is a common production issue — feature drift due to business rule changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "You're told to create features \"robust to missing data\" — features that degrade gracefully when input data is incomplete. How?",
   "body": [
    {
     "t": "p",
     "text": "(1) Use ratio features instead of absolute: `purchases_last_7d / max(account_age_days, 7)` works even if early data is missing, (2) rank-based features: user's percentile is robust to missing outliers, (3) binary threshold features: `has_purchased_recently` works with partial data, (4) features with built-in fallbacks: try specific feature, fall back to aggregate, (5) ensemble of features at different time windows — if 7d is missing, 30d might still be available, (6) design features to be monotonic — partial information still points in the right direction. Test feature robustness by randomly masking inputs and measuring prediction degradation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
