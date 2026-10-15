/* ============================================================================
   PRACTICE P3.11 — Predict the Output / Scenarios · 11
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.11",
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
   "text": "Predict the Output / Scenarios · 11",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "251",
   "q": "You're building a recommendation engine for an e-commerce site with 1 million products but most users have bought only 3-5 items. How do you handle this cold-start and sparsity problem?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Recommendation Systems**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Content-based filtering for new users — recommend based on browsed item features, (2) hybrid approach: collaborative filtering for active users + content-based for new ones, (3) popularity-based fallback for true cold-start, (4) use implicit signals: clicks, views, time spent (much more data than purchases), (5) matrix factorization handles sparsity better than user-user CF, (6) use side information: demographics, item metadata, (7) two-tower neural model encoding user and item separately."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "252",
   "q": "Your recommendation model maximizes click-through rate but users complain recommendations are \"all the same.\" How do you add diversity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Maximal Marginal Relevance (MMR) — balance relevance with diversity, (2) category diversification: ensure recommendations span categories, (3) sub-modular optimization for diverse sets, (4) add exploration in bandit-based recommendations, (5) re-rank top-N: cluster candidates and pick one from each cluster, (6) combinatorial objective: maximize expected_utility × diversity_penalty, (7) measure intra-list diversity metric and include in evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "253",
   "q": "Your recommendation system shows a popularity bias — it mostly recommends already-popular items. How do you reduce this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Inverse propensity scoring: weight rare items higher, (2) use causal models: separate genuine quality from exposure effect, (3) calibrated recommendations: match recommendation category distribution to user preference distribution, (4) explore-exploit: allocate some slots for less popular items, (5) train on implicit negative feedback carefully, (6) popularity-stratified evaluation: measure recall@K separately for popular vs. long-tail items."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "254",
   "q": "A user bought a laptop yesterday. Your system recommends more laptops. How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Post-purchase filtering: exclude recently purchased categories, (2) complementary recommendations: suggest accessories (bag, mouse, stand), (3) session-aware models that understand purchase completion, (4) sequential models: LSTM/Transformer that learn \"after laptop, users buy X,\" (5) rule-based overrides: recently purchased high-value items → exclude that category for N days, (6) user intent modeling: distinguish browsing vs. buying intent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "255",
   "q": "You need to evaluate your recommendation system offline. What metrics do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Precision@K: fraction of recommended items user interacted with, (2) Recall@K: fraction of user's interactions captured in top-K, (3) NDCG@K: accounts for position — relevant items ranked higher is better, (4) MAP (Mean Average Precision), (5) diversity: intra-list distance between recommended items, (6) coverage: percentage of catalog ever recommended, (7) novelty: how unexpected recommendations are, (8) serendipity: relevant AND unexpected items."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "256",
   "q": "Your collaborative filtering model requires retraining when new users or items arrive. How do you handle real-time updates?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Approximate Nearest Neighbors for online similarity lookup, (2) factorize periodically but use item embeddings for real-time inference, (3) fold-in technique: project new user into existing latent space without retraining, (4) incrementally update user profiles from interactions, (5) session-based recommendations using RNNs/Transformers that handle new users, (6) combine offline batch CF with online contextual bandits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "257",
   "q": "Your manager wants to know: \"How much revenue did the recommendation engine generate?\" How do you measure this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) A/B test: recommendations vs. no recommendations (or random), (2) click-through rate (CTR) of recommended items, (3) attributed revenue: sales where user clicked recommendation → purchased, (4) uplift modeling: would the purchase have happened anyway?, (5) holdout group that sees no recommendations, (6) careful attribution: last-touch vs. multi-touch, (7) control for selection bias — users who click recommendations may be more purchase-prone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "258",
   "q": "You're building recommendations for a news website where content becomes stale quickly. How do you handle temporal dynamics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Time decay: exponentially decrease item relevance with age, (2) session-based models using recent clicks (not historical), (3) trend detection: boost currently trending articles, (4) TTL (time-to-live) per content type: news=hours, features=days, evergreen=months, (5) real-time feature updates from current session behavior, (6) separate \"What's New\" from \"Personalized\" recommendation slots, (7) recency-weighted training: newer interactions weighted higher."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "259",
   "q": "Your recommendation system in production shows lower performance than offline evaluation suggested. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Offline-online gap: offline metrics measured on historical data which had different exposure, (2) position bias: users click top recommendations regardless of relevance → inflates offline metrics, (3) feedback loop: model recommends → users click → model learns to recommend more → self-reinforcing, (4) real-time context (device, time, mood) not captured offline, (5) user expectations differ from historical behavior, (6) A/B test properly before trusting offline metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "260",
   "q": "You need to build recommendations respecting business rules: no competitors' products, minimum margin requirements, inventory constraints. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Post-filtering: generate candidates with ML, then filter by rules, (2) constrained optimization: maximize relevance subject to constraints, (3) rule engine layer between scoring and serving, (4) multi-objective optimization: relevance + margin + inventory, (5) slot allocation: some slots for best margin, others for best relevance, (6) real-time inventory checks before serving, (7) knowledge graph encoding business rules for rule-aware models."
    },
    {
     "t": "p",
     "text": "**Theme: Deep Learning Applications**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "261",
   "q": "You have 5,000 labeled images for 10 classes. Is this enough to train a CNN from scratch?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Likely not from scratch (500 per class is minimal). Better approaches: (1) transfer learning: use ResNet/EfficientNet pre-trained on ImageNet, fine-tune top layers, (2) data augmentation: rotations, flips, crops, color jitter can 5-10x effective data, (3) progressive resizing: train on small images first, then larger, (4) mixup/cutout augmentation, (5) few-shot learning approaches, (6) start with frozen backbone, unfreeze gradually, (7) with transfer learning, 500/class is usually sufficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "262",
   "q": "Your deep learning model is overfitting despite using dropout. What additional regularization techniques can you apply?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data augmentation (most effective for images), (2) weight decay (L2 regularization): `weight_decay=1e-4`, (3) early stopping based on validation loss, (4) reduce model size (fewer layers/parameters), (5) batch normalization (has regularizing effect), (6) label smoothing: soft targets instead of hard 0/1, (7) mixup training: blend pairs of examples, (8) stochastic depth: randomly drop layers during training, (9) increase training data if possible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "263",
   "q": "You're training a model on GPU but it's slower than expected. How do you diagnose and fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Common bottlenecks: (1) data loading: use `num_workers>0` in DataLoader, pin_memory=True, (2) small batch size: not utilizing GPU parallelism — increase if memory allows, (3) data on CPU: ensure tensors are on GPU before forward pass, (4) excessive CPU preprocessing: move transforms to GPU (Kornia library), (5) synchronization overhead: avoid `.item()` or printing in training loop, (6) profile with `torch.profiler` to find bottleneck, (7) use mixed precision (FP16) for 2x speedup."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "264",
   "q": "Your image classification model achieves 95% accuracy on test data but fails on real-world photos. What's wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Domain gap between test data and real world: (1) test images may be curated (centered, well-lit, clean background), (2) real photos have varying angles, lighting, occlusions, (3) resolution differences, (4) class distribution differs. Fix: (1) augment with realistic variations, (2) test with user-submitted photos, (3) domain adaptation techniques, (4) use TTA (test-time augmentation) for robustness, (5) collect real-world validation set, (6) gradual deployment with monitoring."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "265",
   "q": "You need to explain a neural network's prediction to a stakeholder. What methods do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Grad-CAM for images — highlights important regions, (2) Integrated Gradients — pixel-level attribution, (3) LIME — local interpretable approximation, (4) SHAP (DeepSHAP) — game-theoretic attribution, (5) attention weights (for transformer models) — which tokens/regions model focuses on, (6) counterfactual explanations: \"changing X would change the prediction,\" (7) prototype-based: \"this looks most like training example Y,\" (8) layer-wise relevance propagation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "266",
   "q": "Your NLP model using BERT has 110M parameters. Inference takes 200ms which is too slow for your application. How do you speed it up?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) DistilBERT: 40% smaller, 60% faster, retains 97% performance, (2) quantization: INT8 reduces size 4x and speeds up 2-3x, (3) ONNX Runtime: optimized inference engine, (4) export to TorchScript for production, (5) pruning: remove unimportant weights, (6) knowledge distillation: train smaller student model, (7) reduce sequence length (truncate to needed context), (8) use TinyBERT or MobileBERT for mobile/edge, (9) batch requests for GPU efficiency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "267",
   "q": "You're training a GAN but it suffers from mode collapse (generates same image repeatedly). How do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use Wasserstein GAN (WGAN) with gradient penalty — more stable training, (2) spectral normalization on discriminator, (3) use progressive growing: start low-resolution, gradually increase, (4) minibatch discrimination: discriminator sees batches, not singles, (5) diversify noise: use different noise distributions, (6) unrolled GAN: generator optimizes against future discriminator, (7) style-based architecture (StyleGAN), (8) train discriminator more steps per generator step."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "268",
   "q": "Your sequence model (LSTM) for time series prediction accumulates errors over multi-step forecasting (each step uses previous prediction). How do you mitigate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Teacher forcing during training (use ground truth) + scheduled sampling (gradually use predictions), (2) train with multi-step loss: predict N steps simultaneously, (3) encoder-decoder architecture for sequence-to-sequence prediction, (4) transformer: parallel prediction of all future steps, (5) direct multi-step: train separate model for each horizon, (6) recursive prediction with uncertainty: calibrate prediction intervals that widen with horizon."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "269",
   "q": "You're fine-tuning a pre-trained model but the learning rate is crucial. How do you set it properly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Learning rate finder: sweep LR from 1e-7 to 1, plot loss, pick LR where loss drops steepest, (2) discriminative learning rates: lower LR for pre-trained layers (1e-5), higher for new layers (1e-3), (3) warmup: linearly increase LR for first N steps then decay, (4) cosine annealing schedule, (5) for BERT fine-tuning: 2e-5 to 5e-5 is typical range, (6) reduce LR on plateau, (7) watch validation loss closely for first few epochs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "270",
   "q": "Your multi-GPU training doesn't scale linearly (2 GPUs give 1.5x speedup, not 2x). Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Communication overhead: gradient synchronization between GPUs, (2) data loading bottleneck: GPUs wait for data, (3) batch size per GPU too small — insufficient parallelism, (4) sequential model parts (batch norm synchronization), (5) imbalanced GPU memory usage, (6) Fix: use gradient accumulation, overlap communication with computation (DeepSpeed/FSDP), increase data loading workers, use NCCL backend, consider pipeline parallelism for very large models."
    },
    {
     "t": "p",
     "text": "**Theme: Data Visualization & Communication**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "271",
   "q": "Your model analysis reveals that customer churn is driven by 5 factors. How do you present this to a non-technical executive?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Single-page executive summary with key insights and recommended actions, (2) waterfall chart showing factor contributions to churn probability, (3) simple bar chart of top 5 factors ranked by impact, (4) \"What-if\" scenarios: \"reducing wait time by 20% would decrease churn by 8%,\" (5) dollar impact: translate each factor to revenue, (6) avoid jargon: \"feature importance\" → \"what matters most,\" (7) actionable recommendations tied to each factor, (8) appendix with technical details."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "272",
   "q": "Your scatter plot has 1 million points and is just a blob. How do you visualize this effectively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) 2D density plot / hexbin plot — shows concentration, (2) contour plot overlaid on scatter, (3) random sample of 5-10K points for scatter, (4) transparency: use alpha=0.01 for point opacity, (5) facet by categories to reduce per-plot density, (6) datashader library for big data visualization, (7) highlight specific segments with color while others are grey, (8) aggregation: bin into grid cells and color by count."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "273",
   "q": "Your dashboard has 50 metrics. Users say it's overwhelming. How do you redesign it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Identify 5-7 key KPIs based on user roles, (2) hierarchy: overview page → detail pages on click, (3) traffic light system: green/yellow/red for each metric, only show detail for yellow/red, (4) group metrics by theme (acquisition, engagement, retention, revenue), (5) progressive disclosure: summary first, drill-down available, (6) personalize: different views for different stakeholders, (7) add annotations for anomalies, (8) remove vanity metrics that don't drive action."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "274",
   "q": "You need to show that your model's performance improved over 3 versions. What visualization works best?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Grouped bar chart: metrics (accuracy, F1, latency) per version side by side, (2) radar/spider chart: multiple metrics per version overlaid, (3) table with color-coded cells: green for improvement, red for regression, (4) waterfall chart showing incremental gains, (5) performance over time line chart if versions are chronological, (6) include error bars/confidence intervals, (7) highlight cost of improvement (training time, complexity)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "275",
   "q": "A stakeholder asks for a chart showing \"the trend is going up.\" The actual data fluctuates a lot. How do you balance accuracy with narrative?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Show both: raw data + smoothed trend line (moving average or LOESS), (2) be transparent: \"the overall trend is upward, but with significant variability,\" (3) confidence band around the trend line, (4) annotate key events that caused fluctuations, (5) show appropriate time granularity (weekly instead of daily reduces noise), (6) NEVER cherry-pick start/end points to fabricate a trend, (7) statistical test: is the trend significant? (Mann-Kendall test)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
