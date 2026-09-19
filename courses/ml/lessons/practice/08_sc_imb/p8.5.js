/* ============================================================================
   PRACTICE P8.5 — Imbalanced Data, Time Series and Recommenders · 5
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.5",
 "lede": "**25 scenarios** from Imbalanced Data, Time Series and Recommenders. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "101",
   "q": "What are the two main types of recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Collaborative Filtering (CF):** Uses user-item interaction data (ratings, clicks). \"Users who liked X also liked Y.\"",
      "**Content-Based:** Uses item features (genre, description). \"You liked action movies, here's another action movie.\""
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CF: no item features needed but cold start problem. Content-based: no cold start for new items but limited discovery."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "What is the cold start problem in recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Inability to make recommendations for:"
    },
    {
     "t": "ol",
     "items": [
      "**New users:** No interaction history",
      "**New items:** No ratings/clicks yet"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:** Content-based fallback, popularity-based, ask for preferences, demographic-based, hybrid systems."
    },
    {
     "t": "p",
     "text": "**Explanation:** CF fundamentally requires interaction data. Hybrid systems combine CF and content-based to handle cold start."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is the difference between user-based and item-based collaborative filtering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**User-based:** Find similar users, recommend what they liked. sim(user_A, user_B)",
      "**Item-based:** Find similar items to what user liked. sim(item_A, item_B)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** User-based: preferences change, user similarity unstable. Item-based: item similarity more stable, scalable (fewer items than users typically). Amazon uses item-based."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "How does matrix factorization work for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decomposes the user-item rating matrix R ≈ U × V^T where U = user embeddings, V = item embeddings."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "R (m×n) ≈ U (m×k) × V^T (k×n)"
    },
    {
     "t": "p",
     "text": "**Explanation:** k = latent factor dimension. Each user/item represented by k-dimensional vector. Missing ratings predicted by dot product u_i · v_j. Learned via gradient descent or ALS."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is SVD (Singular Value Decomposition) in the context of recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decomposes rating matrix: R = UΣV^T. Truncate to k components for dimensionality reduction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Simon Funk's SVD for Netflix Prize popularized this. Not true SVD (handles missing values via optimization, traditional SVD requires complete matrix). Foundation of modern recommendation systems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is the implicit vs explicit feedback distinction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Explicit:** Direct ratings (1-5 stars, thumbs up/down)",
      "**Implicit:** Indirect signals (clicks, views, purchase, time spent, scroll depth)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Implicit is more abundant but noisier. Not watching ≠ dislike. Algorithms: BPR (Bayesian Personalized Ranking), WRMF (Weighted Regularized Matrix Factorization) for implicit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "How do you evaluate a recommender system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** RMSE (rating prediction), Precision@K, Recall@K, NDCG, MAP, Hit Rate",
      "**Online:** Click-through rate, conversion rate, user engagement, revenue",
      "**Beyond accuracy:** Diversity, novelty, serendipity, coverage"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Offline metrics often don't correlate well with online metrics. A/B testing is essential for real-world validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is the difference between Precision@K and Recall@K?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Precision@K:** Of top K recommended items, how many are relevant?",
      "**Recall@K:** Of all relevant items, how many appear in top K?"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Precision@10 = 3/10 means 3 of 10 recommendations were relevant. Recall@10 = 3/50 means 3 of 50 relevant items were in top 10."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is NDCG (Normalized Discounted Cumulative Gain)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures ranking quality, giving higher weight to relevant items ranked higher."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "DCG = Σ (relevance_i / log2(position_i + 1))\nNDCG = DCG / ideal_DCG"
    },
    {
     "t": "p",
     "text": "**Explanation:** Position matters — relevant item at position 1 is worth more than at position 10. NDCG = 1 is perfect ranking. Handles graded relevance (not just binary)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is the popularity bias in recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** System tends to recommend popular items more, creating a feedback loop where popular items get even more popular."
    },
    {
     "t": "p",
     "text": "**Explanation:** Solutions: diversity-promoting algorithms, exploration (epsilon-greedy), long-tail boosting, personalized re-ranking. Important for niche content discovery."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is a hybrid recommender system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combines multiple recommendation approaches:"
    },
    {
     "t": "ol",
     "items": [
      "**Weighted:** Combine scores from CF and content-based",
      "**Switching:** Use CF when enough data, content-based for cold start",
      "**Cascade:** Content-based for coarse recommendations, CF for final ranking",
      "**Feature augmentation:** CF features as input to content-based model"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Netflix uses hybrid: matrix factorization + deep learning + content features. Hybrids generally outperform single-approach systems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "How does content-based filtering work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Build user profile from item features they've interacted with. Recommend items with similar features."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "User profile = weighted average of liked item features\nRecommendation score = cosine_similarity(user_profile, item_features)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Requires item feature extraction (TF-IDF for text, genres, metadata). No cold start for items. But limited serendipity — won't recommend outside user's comfort zone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is the Alternating Least Squares (ALS) algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Matrix factorization method: alternately fix user factors and optimize item factors, then fix item factors and optimize user factors."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each step is a closed-form least squares problem → fast. Handles large sparse matrices. Easily parallelizable. Default in Spark MLlib for recommendations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "How do you handle the sparsity problem in collaborative filtering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Most users rate very few items → matrix is 99%+ empty."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Matrix factorization (fills in gaps via latent factors)",
      "Dimensionality reduction",
      "Use implicit feedback (more data points)",
      "Item clustering to group similar items"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Direct user-item similarity fails with sparse data. Latent factor models generalize better across sparse interactions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is Bayesian Personalized Ranking (BPR)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Optimization criterion for implicit feedback: for each user, observed items should rank higher than unobserved items."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Maximize: Σ log σ(x_ui - x_uj)\nwhere i = observed item, j = unobserved item"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pairwise ranking approach. Doesn't predict ratings — just ranks items. Natural for implicit data where positive and \"unknown\" are the two signals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "How do deep learning models improve recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Neural CF (NCF):** Replace dot product with neural network for user-item interaction",
      "**Autoencoders:** Learn compressed user/item representations",
      "**Sequence models:** RNN/Transformer for session-based recommendations",
      "**Wide & Deep:** Combines memorization (wide) and generalization (deep)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** DL captures non-linear user-item interactions. Sequence models handle temporal dynamics (what did user just click?)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is session-based recommendation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Recommending based on current session behavior without user identification. Uses the sequence of actions within one session."
    },
    {
     "t": "p",
     "text": "**Methods:** GRU4Rec (RNN-based), SASRec (self-attention), BERT4Rec."
    },
    {
     "t": "p",
     "text": "**Explanation:** Important for anonymous users (new visitors). Models capture session intent from click sequence. \"User clicked laptop, then laptop case → recommend laptop accessories.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What is the explore-exploit trade-off in recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Exploit:** Recommend items the user will likely enjoy (based on history)",
      "**Explore:** Recommend diverse/novel items to discover new preferences"
     ]
    },
    {
     "t": "p",
     "text": "**Methods:** Epsilon-greedy, Thompson Sampling, UCB (Upper Confidence Bound)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pure exploitation = filter bubble. Pure exploration = poor experience. Contextual bandits balance both adaptively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is a knowledge graph-based recommender system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses knowledge graph (entities + relationships) to enhance recommendations."
    },
    {
     "t": "p",
     "text": "**Example:** Movie → director → other movies by same director. User liked Inception → Nolan → recommend Interstellar."
    },
    {
     "t": "p",
     "text": "**Explanation:** Provides explainability and handles cold start. Captures semantic relationships beyond simple similarity. Combines with CF for richer recommendations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is the filter bubble problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Recommender systems show users only content aligned with their existing preferences, narrowing their information exposure over time."
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates echo chambers. Solutions: diversity constraints, serendipity metrics, editorial curation, exploration mechanisms. Ethical concern for news and social media."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "How do you handle the position bias in recommendation evaluation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Users click on higher-positioned items regardless of relevance. This biases click data."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Inverse propensity scoring (IPS)",
      "Position-aware models",
      "Randomized experiments",
      "Unbiased learning to rank"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Position bias inflates NDCG for items placed higher. Must debias offline evaluation or use causal methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is multi-armed bandit for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Framework for sequential decision-making that balances exploration and exploitation."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "At each step:\n- Select item to recommend (arm to pull)\n- Observe reward (click/no-click)\n- Update belief about item quality"
    },
    {
     "t": "p",
     "text": "**Explanation:** Thompson Sampling: sample from posterior of each item's reward, pick highest. UCB: pick item with highest upper confidence bound. Naturally handles explore-exploit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "How do you implement a simple content-based recommender?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.metrics.pairwise import cosine_similarity\n\n# Item descriptions\ntfidf = TfidfVectorizer(stop_words='english')\nitem_matrix = tfidf.fit_transform(df['description'])\n\n# Find similar items to item_id\nsim_scores = cosine_similarity(item_matrix[item_id], item_matrix)\ntop_k = sim_scores[0].argsort()[-10:][::-1]"
    },
    {
     "t": "p",
     "text": "**Explanation:** TF-IDF converts text to vectors. Cosine similarity finds nearest items in feature space. Simple, interpretable, no interaction data needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is the difference between pointwise, pairwise, and listwise loss in learning to rank?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pointwise:** Predict relevance score for each item independently (regression/classification)",
      "**Pairwise:** Learn that item A should rank above item B (BPR, RankNet)",
      "**Listwise:** Optimize the entire ranked list (LambdaMART, ListNet)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pointwise: simplest but ignores ranking. Pairwise: captures relative ordering. Listwise: directly optimizes ranking metrics (NDCG). Listwise generally best."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is Two-Tower architecture for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Separate neural networks for user and item, combined via dot product or cosine similarity at serving time."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "User Tower: user_features → user_embedding (128d)\nItem Tower: item_features → item_embedding (128d)\nScore = dot(user_embedding, item_embedding)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-compute item embeddings offline. At serving: compute user embedding, find nearest item embeddings via ANN (Approximate Nearest Neighbors). Very scalable."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
