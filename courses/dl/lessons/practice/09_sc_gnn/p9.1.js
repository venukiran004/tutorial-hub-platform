/* ============================================================================
   PRACTICE P9.1 — Graph Neural Networks · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/08_Graph_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.1",
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
   "n": "1",
   "q": "What is a Graph Neural Network (GNN) and when would you use it over a standard neural network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** GNNs operate on graph-structured data where entities (nodes) have relationships (edges). Use GNNs when:"
    },
    {
     "t": "ol",
     "items": [
      "Data is naturally a graph (social networks, molecules, knowledge graphs)",
      "Relationships between entities matter for prediction",
      "Data has variable structure (different number of neighbors per node)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard NNs assume fixed-size inputs. GNNs handle irregular topology by aggregating information from neighbors, preserving structural information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the message passing paradigm in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each node updates its representation by:"
    },
    {
     "t": "ol",
     "items": [
      "**Message:** Each neighbor sends a message (function of its features)",
      "**Aggregate:** Node collects all incoming messages (sum, mean, max)",
      "**Update:** Node updates its own representation using aggregated message"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "h_v^(k+1) = UPDATE(h_v^(k), AGGREGATE({h_u^(k) : u ∈ N(v)}))"
    },
    {
     "t": "p",
     "text": "**Explanation:** After K rounds, each node's representation captures information from its K-hop neighborhood."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the difference between GCN, GraphSAGE, and GAT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Model",
      "Aggregation",
      "Key Feature"
     ],
     "rows": [
      [
       "GCN",
       "Weighted mean (degree-normalized)",
       "Spectral-based, simple"
      ],
      [
       "GraphSAGE",
       "Sample + aggregate (mean/LSTM/pool)",
       "Inductive, scalable"
      ],
      [
       "GAT",
       "Attention-weighted sum",
       "Learnable neighbor importance"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GCN uses fixed weights based on degree. GraphSAGE samples neighbors for scalability. GAT learns which neighbors are important via attention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the over-smoothing problem in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As you stack more GNN layers, node representations converge to similar values — all nodes look the same."
    },
    {
     "t": "p",
     "text": "**Why:** Each layer aggregates from neighbors → after many layers, all nodes receive information from entire graph."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Limit depth (2-3 layers usually optimal)",
      "Residual connections (skip connections)",
      "JumpKing Networks (combine representations from all layers)",
      "DropEdge (randomly remove edges during training)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike CNNs where deeper is often better, GNNs hit diminishing returns quickly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "How does Graph Attention Network (GAT) compute attention weights?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "α_ij = softmax(LeakyReLU(a^T [Wh_i || Wh_j]))"
    },
    {
     "t": "ol",
     "items": [
      "Transform node features: `Wh_i`, `Wh_j`",
      "Concatenate transformed features",
      "Apply learnable attention vector `a`",
      "LeakyReLU activation",
      "Softmax over all neighbors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-head attention: run K parallel attention heads, concatenate or average outputs. Allows different neighbors to have different importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between transductive and inductive learning in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Transductive:** Train and predict on same graph. Test nodes present during training (unlabeled). Example: GCN.",
      "**Inductive:** Can generalize to unseen nodes/graphs. Learns aggregation function, not node-specific embeddings. Example: GraphSAGE."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Inductive is more practical — new users join social network, new molecules synthesized. GraphSAGE samples and aggregates from neighbors, so it works on new nodes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How do you handle heterogeneous graphs in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Heterogeneous graphs have multiple node and edge types (e.g., user-item-category)."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**R-GCN:** Separate weight matrices per relation type",
      "**HAN:** Hierarchical attention (node-level + semantic-level)",
      "**HGT:** Heterogeneous Graph Transformer with type-specific attention",
      "**Metapath-based:** Define meaningful paths connecting node types"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world graphs are rarely homogeneous. Knowledge graphs, e-commerce, academic citation networks all have multiple entity/relation types."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is graph pooling and why is it needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creates graph-level representations from node-level representations for graph classification."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**Global pooling:** Mean/sum/max over all node features",
      "**Hierarchical pooling (DiffPool):** Learn to cluster nodes layer by layer",
      "**TopK pooling:** Keep top-k important nodes based on learned scores",
      "**SAGPool:** Self-attention based graph pooling"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Node classification uses node embeddings directly. Graph classification (e.g., molecule property prediction) needs a single vector → pooling aggregates all node information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the WL (Weisfeiler-Lehman) test and its relation to GNN expressiveness?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** WL test is a graph isomorphism test that iteratively refines node labels based on neighbor labels."
    },
    {
     "t": "ul",
     "items": [
      "Standard message-passing GNNs are at most as powerful as 1-WL test",
      "Cannot distinguish certain non-isomorphic graphs (e.g., some regular graphs)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GIN (Graph Isomorphism Network) is designed to be as powerful as 1-WL test. Higher-order GNNs (k-WL) are more expressive but computationally expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you apply GNNs to molecular property prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Representation:** Atoms = nodes, bonds = edges, with features (atom type, charge, etc.)",
      "**Architecture:** Message passing → readout (pooling) → MLP for prediction",
      "**Edge features:** Bond type, distance, angle",
      "**3D information:** SchNet, DimeNet use spatial coordinates"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GNNs revolutionized drug discovery — predict solubility, toxicity, binding affinity directly from molecular graphs. Outperform fingerprint-based methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between spectral and spatial GNN methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Spectral:** Based on graph Fourier transform. Define convolution in frequency domain. Example: ChebNet, GCN.",
      "**Spatial:** Directly aggregate neighbor features. More intuitive, flexible. Example: GraphSAGE, GAT, GIN."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Spectral methods rely on graph Laplacian eigendecomposition — computationally expensive and graph-specific. Spatial methods are more scalable and generalizable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do you handle large-scale graphs that don't fit in memory?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Mini-batch training:** GraphSAGE samples K-hop neighborhoods per node",
      "**Cluster-GCN:** Partition graph into clusters, train on subgraphs",
      "**Graph sampling:** Random walk-based, importance sampling",
      "**DistDGL/PyG:** Distributed GNN training across machines"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Social networks have billions of edges. Full-batch GCN is O(n²) memory. Sampling-based methods reduce to O(batch_size × neighborhood_size)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is link prediction in graphs and how do GNNs approach it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict missing or future edges in a graph (e.g., friend recommendations, drug interactions)."
    },
    {
     "t": "p",
     "text": "**GNN approach:**"
    },
    {
     "t": "ol",
     "items": [
      "Learn node embeddings via message passing",
      "Score pairs: `score(u,v) = f(h_u, h_v)` — dot product, MLP, or distance-based",
      "Train with positive (existing edges) and negative (non-edges) samples"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Negative sampling critical — random non-edges as negatives. Evaluation: AUC-ROC, hits@K. Applications: knowledge graph completion, social networks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the role of positional encoding in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standard GNNs are permutation invariant — they can't distinguish symmetric positions."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Laplacian eigenvectors:** Use first k eigenvectors of graph Laplacian",
      "**Random walk encoding:** Probability of returning to node after k steps",
      "**Degree encoding:** Encode node degree as additional feature"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformers use sinusoidal PE for sequence position. Graph PE gives nodes \"awareness\" of their structural position, improving expressiveness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you implement a basic GCN layer in PyTorch?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass GCNLayer(nn.Module):\n    def __init__(self, in_features, out_features):\n        super().__init__()\n        self.linear = nn.Linear(in_features, out_features)\n    \n    def forward(self, X, A_hat):\n        # A_hat = D^(-1/2) * (A + I) * D^(-1/2) (normalized adjacency)\n        return torch.relu(A_hat @ self.linear(X))"
    },
    {
     "t": "p",
     "text": "**Explanation:** GCN: multiply node features by normalized adjacency matrix (aggregate neighbors), then linear transform and activation. `A_hat` includes self-loops and degree normalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between node classification, graph classification, and edge classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Task",
      "Input",
      "Output",
      "Example"
     ],
     "rows": [
      [
       "Node classification",
       "Graph + some labels",
       "Label per node",
       "User fraud detection"
      ],
      [
       "Graph classification",
       "Set of graphs",
       "Label per graph",
       "Molecule toxicity"
      ],
      [
       "Edge classification",
       "Graph",
       "Label per edge",
       "Relationship type prediction"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Node: use node embeddings directly. Graph: pool node embeddings to graph vector. Edge: combine connected node embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the over-squashing problem in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Information from distant nodes gets compressed into fixed-size vectors as it passes through many hops."
    },
    {
     "t": "p",
     "text": "**Analogy:** Like squeezing a river through a narrow pipe — information loss."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Graph rewiring (add shortcut edges)",
      "Multi-scale architectures",
      "Graph Transformers (full attention avoids bottleneck)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Different from over-smoothing. Over-squashing: information loss. Over-smoothing: representations converge. Both limit depth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do Graph Transformers differ from standard GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Standard GNN:** Aggregates from local neighbors only (message passing)",
      "**Graph Transformer:** Full self-attention over all nodes (global receptive field)"
     ]
    },
    {
     "t": "p",
     "text": "**Advantages:** No over-smoothing/squashing, captures long-range dependencies"
    },
    {
     "t": "p",
     "text": "**Challenges:** O(n²) complexity, needs positional encoding, may lose local structure"
    },
    {
     "t": "p",
     "text": "**Examples:** Graphormer, GPS (General Powerful Scalable Graph Transformer)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is knowledge graph embedding and how do GNNs help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Knowledge graphs: (head, relation, tail) triples. Embedding: map entities/relations to vectors."
    },
    {
     "t": "p",
     "text": "**Traditional:** TransE, RotatE — score functions for triples"
    },
    {
     "t": "p",
     "text": "**GNN-based:** R-GCN, CompGCN — aggregate neighbor information through typed edges"
    },
    {
     "t": "p",
     "text": "**Advantage of GNNs:** Capture multi-hop reasoning and structural patterns automatically."
    },
    {
     "t": "p",
     "text": "**Explanation:** GNNs learn richer entity representations by considering neighborhood context, not just direct connections."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What are temporal/dynamic GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Graphs that evolve over time — new nodes/edges appear, features change."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Snapshot-based:** Separate GNN per time step, combine with RNN/Transformer",
      "**Continuous-time:** Neural ODEs on graphs, time-aware attention",
      "**TGN (Temporal Graph Networks):** Memory module + message passing over temporal interactions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Social networks, financial transactions, citation networks are all dynamic. Static GNNs miss temporal patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the expressive power limitation of message-passing neural networks (MPNNs)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** MPNNs cannot distinguish certain non-isomorphic graphs that the 1-WL test fails on."
    },
    {
     "t": "p",
     "text": "**Example:** Regular graphs with same degree sequence but different structure."
    },
    {
     "t": "p",
     "text": "**Beyond 1-WL:**"
    },
    {
     "t": "ol",
     "items": [
      "Higher-order GNNs (k-WL hierarchy)",
      "Subgraph GNNs (process multiple subgraphs)",
      "Random features (break symmetry)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** This is a fundamental theoretical limit. Practical impact varies — many real-world tasks don't require distinguishing such pathological cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you handle node features of different types in GNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Categorical:** One-hot encoding or learned embeddings",
      "**Numerical:** Normalize/standardize, then linear projection",
      "**Text:** Use pre-trained embeddings (BERT, Word2Vec)",
      "**No features:** Use structural features (degree, centrality) or learnable embeddings"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature engineering matters for GNNs too. Combining heterogeneous features: project each to same dimension, concatenate or sum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is contrastive learning on graphs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn node/graph representations by contrasting positive pairs (similar) against negative pairs."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**GraphCL:** Augment graph (node drop, edge perturbation), contrast original vs augmented",
      "**GCC:** Pre-train by contrasting subgraphs across graphs",
      "**DGI:** Contrast node embedding with graph summary"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised — no labels needed. Augmentations: node/edge dropout, feature masking, subgraph sampling. Useful when labels scarce."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you evaluate GNN model performance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Node classification:** Accuracy, F1 (with proper train/val/test splits — random, temporal, or structural)",
      "**Graph classification:** Accuracy, AUC (use cross-validation for small datasets)",
      "**Link prediction:** AUC-ROC, Hits@K, MRR (Mean Reciprocal Rank)",
      "**Common pitfall:** Data leakage from message passing — test nodes receive messages from train nodes"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random splits can leak information in graphs. Consider inductive splits where test nodes are completely unseen."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the application of GNNs in recommender systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**User-item bipartite graph:** Users and items as nodes, interactions as edges",
      "**LightGCN:** Simplified GCN for collaborative filtering — only neighborhood aggregation, no feature transformation",
      "**PinSage:** Industry-scale GNN for Pinterest recommendations",
      "**Social influence:** Leverage social graph for better recommendations"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GNN-based recommenders capture high-order connectivity (friend-of-friend preferences), outperforming matrix factorization on sparse data."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
