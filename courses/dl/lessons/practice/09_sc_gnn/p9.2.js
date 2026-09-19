/* ============================================================================
   PRACTICE P9.2 — Graph Neural Networks · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/08_Graph_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.2",
 "lede": "**25 scenarios** from Graph Neural Networks. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "26",
   "q": "What is edge-conditioned convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standard GCN treats all edges equally. Edge-conditioned convolution uses edge features to modulate messages."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "m_ij = f(e_ij) * W * h_j"
    },
    {
     "t": "p",
     "text": "Where `f(e_ij)` generates edge-specific weights from edge features."
    },
    {
     "t": "p",
     "text": "**Applications:** Molecular graphs (bond types), traffic networks (road properties), knowledge graphs (relation types)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Edge features carry important information — ignoring them loses signal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How do you handle imbalanced node classification in graphs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Reweighting:** Assign higher loss weight to minority class nodes",
      "**Oversampling:** GraphSMOTE — generate synthetic minority nodes with edges",
      "**Self-training:** Use confident predictions on unlabeled nodes to augment minority class",
      "**Architecture:** Separate aggregation for different classes"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fraud detection is highly imbalanced (<1% fraud). Label propagation from few labeled nodes makes it worse — majority class dominates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is graph generation and what models are used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate new graphs with desired properties (e.g., novel molecules)."
    },
    {
     "t": "p",
     "text": "**Models:**"
    },
    {
     "t": "ol",
     "items": [
      "**GraphRNN:** Autoregressive — generate nodes/edges sequentially",
      "**GraphVAE:** Variational autoencoder for graphs",
      "**MolGAN:** GAN-based molecular graph generation",
      "**Diffusion models:** Denoise random graphs to valid structures"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Drug discovery: generate molecules with target properties. Optimization: find graph structure that maximizes objective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the difference between homophily and heterophily in graphs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Homophily:** Connected nodes tend to have same label (\"birds of a feather\"). Most GNNs designed for this.",
      "**Heterophily:** Connected nodes tend to have different labels (predator-prey, buyer-seller)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard GNNs struggle with heterophily because averaging neighbor features (same class) is useful for homophily but harmful for heterophily. Solutions: separate ego and neighbor representations, learn when to aggregate vs separate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How do you implement mini-batch training for GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyG-style neighbor sampling\nfrom torch_geometric.loader import NeighborLoader\n\nloader = NeighborLoader(\n    data,\n    num_neighbors=[25, 10],  # sample 25 1-hop, 10 2-hop neighbors\n    batch_size=512,\n    input_nodes=train_mask\n)\n\nfor batch in loader:\n    out = model(batch.x, batch.edge_index)\n    loss = F.cross_entropy(out[:batch.batch_size], batch.y[:batch.batch_size])\n    loss.backward()\n    optimizer.step()"
    },
    {
     "t": "p",
     "text": "**Explanation:** Key insight: batch includes target nodes + their sampled neighborhoods. Only compute loss on target nodes, but need neighbor features for message passing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is graph coarsening and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduce graph size by merging similar nodes into super-nodes."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**Graclus clustering:** Pair adjacent nodes greedily",
      "**Heavy edge matching:** Merge nodes connected by strongest edges",
      "**Algebraic distance:** Merge nodes with similar spectral properties"
     ]
    },
    {
     "t": "p",
     "text": "**Use cases:** Hierarchical pooling in GNNs, speeding up training, multi-scale analysis."
    },
    {
     "t": "p",
     "text": "**Explanation:** Like image downsampling but for graphs. Preserves global structure while reducing size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What are the key GNN frameworks and their differences?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Framework",
      "Backend",
      "Key Feature"
     ],
     "rows": [
      [
       "PyG (PyTorch Geometric)",
       "PyTorch",
       "Message passing API, many models"
      ],
      [
       "DGL (Deep Graph Library)",
       "PyTorch/TF/MXNet",
       "Multi-backend, heterogeneous graph support"
      ],
      [
       "Spektral",
       "TensorFlow/Keras",
       "Keras-style API for GNNs"
      ],
      [
       "GraphNets",
       "TensorFlow/JAX",
       "DeepMind's framework"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** PyG and DGL are most popular. PyG has cleaner API, DGL scales better for heterogeneous graphs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How do Equivariant GNNs handle 3D molecular structures?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Preserve symmetries: output transforms consistently with input rotations/translations."
    },
    {
     "t": "p",
     "text": "**Models:**"
    },
    {
     "t": "ol",
     "items": [
      "**SchNet:** Uses continuous filter on interatomic distances (invariant)",
      "**DimeNet:** Adds angle information between bonds",
      "**EGNN:** Equivariant to rotations/translations by design",
      "**PaiNN:** Equivariant message passing with vector features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Molecule properties don't change if you rotate the molecule → model should be rotation equivariant. Using 3D coordinates directly without equivariance wastes data augmentation capacity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the role of skip connections in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Residual:** `h^(l+1) = GNN(h^(l)) + h^(l)` — mitigate over-smoothing",
      "**Dense:** Concatenate outputs from all layers (JKNet)",
      "**Initial residual (GCNII):** Connect to initial features: `h^(l+1) = (1-α)·GNN(h^(l)) + α·h^(0)`"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Allow deeper GNNs by preserving early-layer information. JKNet lets model adaptively select neighborhood scale per node."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How do you apply GNNs to traffic flow prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Graph:** Road intersections = nodes, roads = edges",
      "**Spatial:** GNN captures spatial dependencies (nearby intersections affect each other)",
      "**Temporal:** RNN/Transformer captures time patterns",
      "**Architecture:** STGCN, DCRNN — combine spatial graph conv with temporal conv"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Traffic flow is spatio-temporal: spatial (nearby roads are correlated) + temporal (rush hour patterns). GNN+temporal model captures both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the neighborhood explosion problem in deep GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a K-layer GNN, each node's receptive field grows exponentially: if average degree is d, need d^K nodes."
    },
    {
     "t": "p",
     "text": "**Example:** d=50, K=3 → 125,000 neighbor nodes per target node."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Neighbor sampling (GraphSAGE): fix sample size per layer",
      "Layer-wise sampling (FastGCN): sample nodes per layer",
      "Subgraph sampling (Cluster-GCN): train on subgraphs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** This is the computational bottleneck for large graphs. Sampling introduces variance but makes training feasible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is graph few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Classify nodes/graphs with very few labeled examples per class."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Meta-learning:** MAML adapted for graphs — learn initialization that adapts quickly",
      "**Metric learning:** Prototypical networks on graph embeddings",
      "**Graph augmentation:** Generate more examples from few labeled nodes"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Many real-world graph tasks have few labels (rare diseases, new fraud patterns). GNNs can leverage graph structure to propagate information from few labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the difference between global and local graph properties?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Local:** Node degree, clustering coefficient, local patterns (triads, motifs)",
      "**Global:** Diameter, connected components, spectral gap, community structure"
     ]
    },
    {
     "t": "p",
     "text": "**GNN implications:** Message-passing captures local neighborhood properties well. Global properties require deep networks or explicit global readouts."
    },
    {
     "t": "p",
     "text": "**Explanation:** Some tasks need global understanding (graph isomorphism testing), others local (node classification). Architecture should match."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you handle missing node features in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Zero imputation:** Simple, but may bias learning",
      "**Mean/median imputation:** Use statistics from observed features",
      "**Learnable embeddings:** Learn default feature vectors",
      "**GNN-based imputation:** Use neighbor features to predict missing ones",
      "**Feature propagation:** Diffuse known features through graph structure"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Missing features are common — not all users have complete profiles. GNNs can naturally leverage neighbor information to compensate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the node2vec algorithm and how does it relate to GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Node2vec learns node embeddings via biased random walks + skip-gram (like Word2Vec)."
    },
    {
     "t": "p",
     "text": "**Parameters:**"
    },
    {
     "t": "ul",
     "items": [
      "**p (return parameter):** Controls revisiting nodes (BFS-like when high)",
      "**q (in-out parameter):** Controls exploring outward (DFS-like when high)"
     ]
    },
    {
     "t": "p",
     "text": "**Relation to GNNs:** Node2vec is a shallow embedding method. GNNs learn function of features. GNNs generalize better but node2vec is simpler for structure-only graphs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is graph data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Node dropout:** Randomly remove nodes during training",
      "**Edge perturbation:** Add/remove random edges",
      "**Feature masking:** Mask random node features",
      "**Subgraph sampling:** Use random subgraphs",
      "**Mixup:** Interpolate between graph representations"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Regularization for GNNs. Unlike image augmentation (flips, crops), graph augmentation must respect structural properties. Too aggressive augmentation can destroy important structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "How do you apply GNNs to program analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**AST (Abstract Syntax Tree):** Parse code into tree/graph, GNN learns code representations",
      "**Control flow graph:** Capture execution paths",
      "**Data flow graph:** Track variable dependencies",
      "**Applications:** Bug detection, code clone detection, vulnerability finding, code summarization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Code has rich structural information beyond text. GNNs on code graphs outperform sequence models for structure-dependent tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the spectral graph convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Transform signal to spectral domain via graph Fourier transform: `x̂ = U^T x`",
      "Apply filter: `ŷ = g(Λ) x̂`",
      "Transform back: `y = U ŷ`"
     ]
    },
    {
     "t": "p",
     "text": "Where U = eigenvectors of graph Laplacian, Λ = eigenvalues."
    },
    {
     "t": "p",
     "text": "**Simplification:** ChebNet uses polynomial approximation to avoid eigendecomposition."
    },
    {
     "t": "p",
     "text": "**Explanation:** GCN is a first-order approximation of spectral convolution — much cheaper but less expressive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you handle directed graphs in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Most GNNs assume undirected graphs. For directed:"
    },
    {
     "t": "ol",
     "items": [
      "**Separate aggregation:** Different weights for incoming vs outgoing neighbors",
      "**Magnetic Laplacian:** Complex-valued spectral approach for directed graphs",
      "**Convert to undirected:** Add reverse edges (loses direction information)",
      "**Edge-type encoding:** Treat direction as edge type in R-GCN framework"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Citation networks, user-follows, web graphs are directed. Direction carries important information (who cites whom ≠ who is cited)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the connection between GNNs and the PageRank algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Both propagate information through graph structure."
    },
    {
     "t": "p",
     "text": "**PageRank:** `PR(v) = (1-d)/n + d * Σ PR(u)/deg(u)` for neighbors u"
    },
    {
     "t": "p",
     "text": "**APPNP (GNN):** Uses personalized PageRank propagation: combine initial features with propagated features with teleport probability α."
    },
    {
     "t": "p",
     "text": "**Explanation:** APPNP decouples prediction (MLP on features) from propagation (PageRank-style). Allows deeper propagation without over-smoothing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What are graph isomorphism networks (GIN) and why are they important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** GIN uses sum aggregation + MLP update — provably as powerful as 1-WL test."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "h_v^(k) = MLP((1 + ε) · h_v^(k-1) + Σ h_u^(k-1))"
    },
    {
     "t": "p",
     "text": "**Why important:**"
    },
    {
     "t": "ol",
     "items": [
      "Theoretically maximally powerful among MPNNs",
      "Sum (not mean/max) distinguishes multisets",
      "MLP (not linear) is injective"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Mean aggregation can't distinguish {1,1,1} from {1}. Sum can. GIN proves this matters for expressiveness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "How do you debug a GNN that isn't learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Check if graph connectivity is correct (edge_index format)",
      "Verify feature normalization",
      "Start with simple model (1-2 layers, small hidden dim)",
      "Check for trivial solutions (majority class baseline)",
      "Visualize learned embeddings (t-SNE)",
      "Test on synthetic graph first (Stochastic Block Model)",
      "Ensure proper train/val/test split (no information leakage through edges)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GNN debugging is harder than standard NNs — graph structure adds complexity. Edge index errors are the most common bug."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the relationship between GNNs and Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**GNN on complete graph ≈ Transformer** (attention over all pairs)",
      "**Transformer ≈ GNN with all-to-all connectivity** (every token attends to every other)"
     ]
    },
    {
     "t": "p",
     "text": "**Differences:**"
    },
    {
     "t": "ol",
     "items": [
      "GNNs use sparse connectivity (local neighbors)",
      "Transformers use dense attention (all pairs)",
      "GNNs are permutation equivariant by design",
      "Transformers need positional encoding"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Graph Transformers blend both: local message passing + global attention. This connection deepens understanding of both architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is signed graph learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Graphs with positive and negative edges (friend/enemy, trust/distrust)."
    },
    {
     "t": "p",
     "text": "**Key theory:** Structural balance theory — \"enemy of my enemy is my friend\""
    },
    {
     "t": "p",
     "text": "**GNN approach:** Separate aggregation for positive and negative neighbors:"
    },
    {
     "t": "ul",
     "items": [
      "Positive neighbors: similar embeddings",
      "Negative neighbors: dissimilar embeddings"
     ]
    },
    {
     "t": "p",
     "text": "**Applications:** Social network analysis, political polarization, sentiment analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What are the current open challenges in GNN research?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Scalability:** Billions of nodes/edges",
      "**Expressiveness:** Beyond 1-WL limitation",
      "**Heterophily:** Better performance when connected nodes differ",
      "**Dynamic graphs:** Efficiently handle temporal evolution",
      "**Explainability:** Why did GNN make this prediction?",
      "**Pre-training:** Foundation models for graphs (like BERT for text)",
      "**Out-of-distribution:** Generalize to unseen graph structures"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GNNs are relatively young compared to CNNs/RNNs. Active research area with many unsolved problems and growing industrial adoption."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
