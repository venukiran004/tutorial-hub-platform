/* ============================================================================
   PRACTICE P8.6 — Imbalanced Data, Time Series and Recommenders · 6
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.6",
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
   "n": "126",
   "q": "What is Approximate Nearest Neighbor (ANN) search and why is it important for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Finding similar embeddings without exhaustive comparison. Trade-off: slight accuracy loss for massive speed gain."
    },
    {
     "t": "p",
     "text": "**Libraries:** FAISS (Facebook), Annoy (Spotify), ScaNN (Google)."
    },
    {
     "t": "p",
     "text": "**Explanation:** With millions of items, exact similarity search is too slow. ANN with HNSW or IVF indexes enables sub-millisecond retrieval."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is the candidate generation → ranking pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Candidate generation:** Quickly retrieve ~1000 potentially relevant items (simple model, ANN)",
      "**Ranking:** Precisely score and rank candidates (complex model, many features)",
      "**Re-ranking:** Apply business rules, diversity, freshness constraints"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** YouTube's recommendation system uses this. Can't run complex model on millions of items — narrow down first, then rank carefully."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "How do you handle real-time recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Pre-computed recommendations for known users (batch)",
      "Real-time features from current session",
      "Hybrid: batch base + real-time adjustments",
      "Streaming model updates for fresh content"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Full real-time is expensive. Common: batch recommendations + real-time re-ranking based on session context."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is negative sampling in recommendation models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly selecting unobserved items as negative examples for training. Since most items are unobserved (not interacted with), sample a subset as negatives."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without negative sampling, model sees only positives. Common ratio: 4-10 negatives per positive. Hard negative sampling (near-miss negatives) can improve quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "How do you explain recommendations to users?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "\"Because you watched X\" (item-based CF)",
      "\"Popular in your category\" (popularity context)",
      "\"Users like you also liked\" (user-based CF)",
      "\"Based on your recent searches\" (session context)",
      "\"New in genres you follow\" (content-based)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Explainability increases user trust and engagement. Knowledge graph recommendations naturally support explanations through paths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is the long-tail problem in recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Few popular items (head) get most interactions. Many niche items (long tail) have few interactions and are rarely recommended."
    },
    {
     "t": "p",
     "text": "**Explanation:** CF biased toward head items. Long-tail items often more profitable per-unit. Solutions: content-based features for tail items, exploration, editorial promotion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "How do you handle temporal dynamics in recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Time-decay weighting (recent interactions weighted more)",
      "Session-aware models",
      "Sequential models (RNN, Transformer)",
      "Time-aware matrix factorization",
      "Periodic retraining"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** User preferences evolve. Weekend vs weekday behavior differs. Seasonal trends exist. Models must capture temporal patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is the fairness issue in recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Item fairness:** Equal exposure opportunity for all providers/creators",
      "**User fairness:** Equal recommendation quality across demographics",
      "**Supplier fairness:** Fair allocation of audience across sellers"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Marketplace platforms must balance user satisfaction with supplier fairness. Pure relevance optimization may be unfair to new or minority suppliers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is reinforcement learning for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model user interaction as sequential decision-making. State = user context/history. Action = item to recommend. Reward = click/purchase."
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures long-term user engagement vs short-term clicks. Can learn policies that maximize lifetime value. Deep Q-Networks (DQN) and policy gradient methods used."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "How do you A/B test a recommender system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Random user split (control vs treatment)",
      "Sufficient sample size for statistical power",
      "Metrics: CTR, conversion, engagement, revenue, diversity",
      "Long enough duration (capture weekly patterns)",
      "Guard against novelty effects"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Run 2-4 weeks minimum. Monitor engagement metrics AND business metrics. Include guardrail metrics (latency, coverage). User-level randomization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is cross-domain recommendation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Using knowledge from one domain to improve recommendations in another. Example: music preferences helping recommend movies."
    },
    {
     "t": "p",
     "text": "**Explanation:** Addresses cold start in target domain. Transfer user latent factors across domains. Shared user/item representation learning. Privacy concerns when crossing domains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is the difference between recall and precision in recommendation context?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Recall (coverage):** What fraction of relevant items does the system surface? Important for discovery.",
      "**Precision (accuracy):** What fraction of surfaced items are relevant? Important for user experience."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Music playlist: high recall = includes most songs you'd like. High precision = few skips. Balance depends on use case."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is feature store and why is it important for recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Centralized repository for computed features used across models. Serves features consistently for training and serving."
    },
    {
     "t": "p",
     "text": "**Explanation:** Recommendation features: user history, item popularity, contextual signals. Feature store ensures training/serving consistency, reduces computation, enables feature reuse. Tools: Feast, Tecton."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "How do graph neural networks (GNNs) improve recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model user-item interactions as bipartite graph. GNNs learn representations by aggregating information from graph neighbors."
    },
    {
     "t": "p",
     "text": "**Methods:** PinSage (Pinterest), LightGCN, GAT for recommendations."
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures high-order connectivity: user → item → other_users → their_items. Social influence propagation. State-of-the-art for several benchmarks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is the catalog coverage metric?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Percentage of all items that appear in at least one user's top-K recommendations."
    },
    {
     "t": "p",
     "text": "**Explanation:** Low coverage = system recommends only a small subset of items. Indicates popularity bias. 100% coverage = every item has a chance of being recommended. Important for marketplace fairness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "How do you handle user privacy in recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Federated learning (model trained on-device, only model updates shared)",
      "Differential privacy (add noise to protect individual data)",
      "On-device recommendations",
      "Anonymization of interaction data",
      "GDPR compliance (right to be forgotten)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Recommendations require user data but must respect privacy. Apple's on-device ML and Google's federated learning are production approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is the multi-stakeholder recommendation problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Optimization must serve multiple parties:"
    },
    {
     "t": "ol",
     "items": [
      "**Users:** Relevant, diverse recommendations",
      "**Item providers:** Fair exposure, sales",
      "**Platform:** Revenue, engagement, retention"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pure user optimization may harm suppliers. Multi-objective optimization or constrained optimization addresses this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is sequential recommendation and how does it differ from session-based?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Sequential:** Models entire user history sequence to predict next interaction",
      "**Session-based:** Models only current session (no user identification across sessions)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Sequential: longer history, user-specific. Session-based: anonymous, within-session only. Both use RNN/Transformer architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "How do conversational recommender systems work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Interactive dialogue to elicit preferences and refine recommendations."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "System: \"Do you prefer action or comedy?\"\nUser: \"Action\"\nSystem: \"Recent or classic?\"\nUser: \"Recent\"\nSystem: [Recommends recent action movies]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Active preference elicitation. Uses NLU for understanding, dialogue management for conversation flow. Reduces cold start through direct questioning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is the scalability challenge of collaborative filtering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** User-item matrix grows rapidly. n users × m items = n×m entries,  similarity computation = O(n² or m²)."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Matrix factorization (O(k(n+m)) parameters)",
      "ANN search for nearest neighbors",
      "Distributed computing (Spark ALS)",
      "Two-tower + embedding lookup"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Netflix: 200M users × 15K shows = 3 trillion entries. Must use approximate methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is the difference between item-to-item and user-to-item recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Item-to-item:** Given current item, recommend similar items (product page \"related items\")",
      "**User-to-item:** Given user profile, recommend personalized items (homepage feed)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Item-to-item: context-dependent, no user needed. User-to-item: personalized, requires user data. Both coexist in most systems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is counterfactual evaluation for recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Estimate how a new policy would have performed using data collected by a different policy, without deploying."
    },
    {
     "t": "p",
     "text": "**Methods:** Inverse Propensity Scoring (IPS), Doubly Robust estimation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Existing recommendation data is biased by the current system. Counterfactual methods adjust for this bias. Enables safer offline evaluation before A/B testing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "How does contextual information improve recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Context features: time of day, device, location, weather, mood, companion."
    },
    {
     "t": "p",
     "text": "**Example:** Recommend family movies on weekend evenings, quick recipes during weekday lunch."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same user wants different items in different contexts. Context-aware models (factorization machines, contextual bandits) capture these dynamics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is the inductive vs transductive distinction in recommendations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Transductive:** Model specific users/items seen during training (can't handle new ones)",
      "**Inductive:** Model generalizes to new users/items using features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Traditional CF is transductive. Feature-based/content-based is inductive. Modern GNN approaches can be inductive with node features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "How would you design a production recommendation system from scratch?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Data Collection: User interactions, item metadata, context\n2. Feature Engineering: User profile, item features, interaction features\n3. Candidate Generation: Multiple sources (CF, content, popularity, trending)\n4. Ranking: ML model combining all signals\n5. Re-ranking: Business rules, diversity, freshness\n6. Serving: Low-latency API with caching\n7. Evaluation: Offline metrics + A/B testing\n8. Monitoring: Engagement metrics, coverage, latency\n9. Feedback Loop: Continuous learning from new interactions\n10. Bias Mitigation: Position debiasing, fairness constraints"
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-stage pipeline, not a single model. Each stage optimizes different objectives. Continuous iteration and experimentation drive improvement."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
