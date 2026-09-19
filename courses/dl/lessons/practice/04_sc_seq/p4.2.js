/* ============================================================================
   PRACTICE P4.2 — Sequence Models and NLP · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/03_Sequence_Models_and_NLP.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.2",
 "lede": "**25 scenarios** from Sequence Models and NLP. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the Connectionist Temporal Classification (CTC) loss?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Loss function for sequence labeling when alignment between input and output is unknown:"
    },
    {
     "t": "p",
     "text": "**Used in:** Speech recognition (audio frames → text), OCR (image strips → characters)."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input:  [frame1, frame2, frame3, frame4, frame5]\nOutput: \"cat\" (but we don't know which frames map to which characters)\nCTC: marginalizes over ALL possible alignments"
    },
    {
     "t": "p",
     "text": "**Explanation:** CTC adds blank token. Allows repeated characters and blanks. Sums probability over all valid alignments. Enables end-to-end training without forced alignment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is an Embedding layer and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "embedding = nn.Embedding(num_embeddings=10000, embedding_dim=300)\n# Internally: lookup table of shape [10000, 300]\n# Input: token indices [3, 7, 1, 5]\n# Output: [embedding[3], embedding[7], embedding[1], embedding[5]]\n# Shape: [4, 300]"
    },
    {
     "t": "p",
     "text": "**Explanation:** More efficient than one-hot encoding + linear layer (mathematically equivalent). Weights are learned during training. Can initialize with pre-trained embeddings (GloVe, Word2Vec)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is sequence-to-sequence learning with copy mechanism?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows model to copy tokens directly from input sequence to output:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: only generate from vocabulary\nCopy mechanism: can also \"point to\" input tokens"
    },
    {
     "t": "p",
     "text": "**Used in:** Text summarization (copy important words), question answering, code generation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pointer-Generator Network combines: generation probability × vocab distribution + copy probability × attention distribution. Handles rare/unknown words by copying from input."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the difference between hard and soft attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Soft attention:** Weighted average of all positions (differentiable, standard): `context = Σ α_i × h_i`",
      "**Hard attention:** Select one position (non-differentiable, requires RL): `context = h_{argmax(α)}`"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft attention is differentiable → standard backprop. Hard attention is more interpretable (clear choice) but requires REINFORCE algorithm. Most implementations use soft attention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How do you handle long documents with RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Truncation:** Process only first/last N tokens",
      "**Hierarchical:** Word-level RNN per sentence → sentence-level RNN per document",
      "**Sliding window:** Process chunks with overlap",
      "**Sparse attention:** Only attend to subset of positions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard RNNs struggle with 1000+ tokens. Hierarchical approach matches document structure. Transformers with long-range attention (Longformer, BigBird) are now preferred for long documents."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the purpose of peephole connections in LSTM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allow gates to look at the cell state directly (not just hidden state):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: f_t = σ(W_f · [h_{t-1}, x_t])\nPeephole: f_t = σ(W_f · [h_{t-1}, x_t] + W_cf · C_{t-1})"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gates can make decisions based on cell state, which has longer memory. Small improvement in some tasks. Not commonly used in practice (marginal gain vs added complexity)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is Temporal Convolutional Network (TCN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses dilated causal convolutions instead of RNNs for sequence modeling:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Causal: output at time t depends only on inputs at t and earlier\nDilated: increasing dilation factors (1, 2, 4, 8) for large receptive field"
    },
    {
     "t": "p",
     "text": "**Advantages over RNNs:**"
    },
    {
     "t": "ol",
     "items": [
      "Parallelizable (no sequential dependency)",
      "Stable gradients (no vanishing/exploding)",
      "Flexible receptive field"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TCNs can outperform LSTMs on many sequence tasks. Faster training. But can't handle unbounded context (fixed receptive field)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How do you interpret what an RNN has learned?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Hidden state visualization:** t-SNE of hidden states shows clustering by class/pattern",
      "**Gate activations:** Visualize forget/input gate values over time",
      "**Saliency maps:** Gradient of output w.r.t. input tokens",
      "**Probing tasks:** Train simple classifiers on hidden states",
      "**Attention weights:** If attention is used, visualize what model attends to"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** LSTM forget gate analysis reveals what information model retains. Gate near 0 = forgotten, near 1 = retained."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What are the common issues when training RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Vanishing/exploding gradients:** Use LSTM/GRU, gradient clipping",
      "**Slow training:** Sequential nature prevents parallelization",
      "**Long-range dependencies:** Even LSTMs struggle beyond ~500 steps",
      "**Overfitting:** Dropout between layers, not within recurrent connections",
      "**Input normalization:** Normalize features for stable training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For most new projects, Transformers are preferred. RNNs still useful for streaming/online applications where you process one token at a time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is scheduled sampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradually transition from teacher forcing to model's own predictions during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Start: 100% teacher forcing (ground truth inputs)\nMiddle: 50% teacher forcing, 50% model predictions\nEnd: 0% teacher forcing (model's own predictions)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bridges the gap between training (sees ground truth) and inference (sees own predictions). Reduces exposure bias. Curriculum: decrease teacher forcing probability linearly or exponentially."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the Transformer XL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extends Transformer for long sequences by using segment-level recurrence:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Segment 1: process, cache hidden states\nSegment 2: attend to segment 2 + cached states from segment 1"
    },
    {
     "t": "p",
     "text": "**Key innovations:**"
    },
    {
     "t": "ol",
     "items": [
      "**Segment recurrence:** Reuses previous segment's representations",
      "**Relative positional encoding:** Generalizes to longer sequences than training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Overcomes fixed-length context limitation of vanilla Transformer. Can model dependencies 450% longer than vanilla Transformer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the difference between seq2seq and sequence labeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Seq2Seq:** Variable-length output different from input (translation, summarization)",
      "**Sequence labeling:** One label per input token (NER, POS tagging)"
     ]
    },
    {
     "t": "p",
     "text": "**Seq2Seq:** Encoder + decoder. Output length differs from input."
    },
    {
     "t": "p",
     "text": "**Sequence labeling:** Single encoder. Output length = input length. Often uses CRF on top for label dependencies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is a Conditional Random Field (CRF) layer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Final layer that models dependencies between output labels:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without CRF: each label predicted independently → \"B-PER I-ORG\" is possible (invalid)\nWith CRF: transition matrix penalizes invalid label sequences → \"B-PER I-PER\" preferred"
    },
    {
     "t": "p",
     "text": "**Explanation:** CRF adds transition scores between adjacent labels. During prediction, uses Viterbi algorithm for optimal sequence. BiLSTM-CRF was long the standard for NER before Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you handle multi-variate time series with RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Multiple features at each time step\n# Input shape: [batch, seq_len, num_features]\nlstm = nn.LSTM(input_size=num_features, hidden_size=128)\n# Each time step processes all features simultaneously"
    },
    {
     "t": "p",
     "text": "**Considerations:**"
    },
    {
     "t": "ol",
     "items": [
      "Normalize each feature independently",
      "Feature selection matters (irrelevant features add noise)",
      "Different features may have different temporal dynamics",
      "Consider separate encoders per feature then combine"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is an attention score and how is it computed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Three common methods:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Dot product\nscore = torch.bmm(query, key.transpose(1, 2))\n\n# Scaled dot product\nscore = torch.bmm(query, key.transpose(1, 2)) / math.sqrt(d_k)\n\n# Additive (Bahdanau)\nscore = V @ tanh(W1 @ query + W2 @ key)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Scores measure relevance between query and key. Softmax converts scores to weights. Scaled dot-product prevents extremely large scores that push softmax to saturation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the difference between global and local attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Global:** Attend to ALL encoder positions (standard). Cost: O(n) per step.",
      "**Local:** Attend to a WINDOW of positions around a predicted alignment point. Cost: O(window_size)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Global is more thorough but expensive for long sequences. Local is faster but may miss relevant positions far from predicted alignment. Sliding window attention (Longformer) is similar to local attention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "How do you generate text with an RNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Sampling-based generation\nhidden = None\ntoken = start_token\nfor _ in range(max_length):\n    logits, hidden = model(token, hidden)\n    probs = softmax(logits / temperature)  # temperature controls randomness\n    token = torch.multinomial(probs, 1)    # sample from distribution\n    if token == end_token:\n        break"
    },
    {
     "t": "p",
     "text": "**Temperature:** <1 = more focused/greedy. >1 = more random/creative. 1 = original distribution."
    },
    {
     "t": "p",
     "text": "**Explanation:** Greedy: always pick highest prob. Sampling: random from distribution. Top-k: sample from top k. Nucleus (top-p): sample from smallest set summing to p."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the copy mechanism in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows model to copy tokens directly from input to output:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(w) = p_gen × P_vocab(w) + (1-p_gen) × Σ α_i where x_i = w\np_gen = σ(W · [context, decoder_state, input])"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pure generation struggles with rare words and named entities. Copy mechanism points to input positions. Essential for abstractive summarization, data-to-text generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is variational dropout for RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply the SAME dropout mask across all time steps (instead of different masks):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard dropout: different mask at each time step (too noisy)\nVariational dropout: same mask at each time step (consistent regularization)"
    },
    {
     "t": "p",
     "text": "**Why:** Different masks at each step is equivalent to adding noise to recurrent hidden state. Same mask correctly regularizes the recurrent weights."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard dropout between RNN layers is fine. Variational dropout for recurrent connections. Significantly better regularization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How do RNNs handle irregular time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Time steps are not equally spaced:"
    },
    {
     "t": "ol",
     "items": [
      "**Time encoding:** Add elapsed time as extra feature",
      "**ODE-RNNs:** Hidden state evolves continuously between observations",
      "**Decay mechanism:** Exponential decay of hidden state between observations",
      "**Interpolation:** Resample to regular intervals (may lose information)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard RNNs assume regular intervals. Medical data, event-driven data have irregular timestamps. Neural ODEs elegantly handle continuous-time dynamics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the importance of hidden state initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Zero initialization:** Default. Works well for short sequences.",
      "**Learned initialization:** Learn initial hidden state as parameter. Better for tasks where initial context matters.",
      "**Warm-up:** Process a prefix sequence to build context before actual input."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For most tasks, zero initialization is fine. Learned initialization helps when the model needs a strong prior (e.g., conditional generation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is Echo State Network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RNN where recurrent weights are RANDOM and FIXED. Only output weights are trained:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "h_t = tanh(W_in × x_t + W_reservoir × h_{t-1})   # W_in, W_reservoir fixed\ny_t = W_out × h_t                                   # Only W_out is trained"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reservoir of randomly connected neurons creates rich dynamics. Training is simple linear regression on output weights. Fast training. Works well for time series prediction. Part of reservoir computing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How do you combine CNN and RNN architectures?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# CNN feature extractor + RNN sequence model (image captioning)\nclass CaptionModel(nn.Module):\n    def __init__(self):\n        self.cnn = resnet50(pretrained=True)\n        self.lstm = nn.LSTM(cnn_features, hidden_size)\n    \n    def forward(self, image, caption):\n        features = self.cnn(image)        # Extract image features\n        captions_embedded = self.embed(caption)\n        outputs, _ = self.lstm(captions_embedded, features)\n        return outputs"
    },
    {
     "t": "p",
     "text": "**Uses:** Image captioning (CNN→RNN), video classification (CNN per frame→RNN over time), audio processing (Conv→RNN)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the difference between online and offline sequence processing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** Entire sequence available. Can use bidirectional models. Batch processing.",
      "**Online:** Tokens arrive one at a time. Must process immediately. Only unidirectional."
     ]
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "ul",
     "items": [
      "Offline: Document classification, batch translation",
      "Online: Real-time speech recognition, streaming predictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Online forces unidirectional processing and incremental updates. Latency constraints apply. Can't use future context."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "When should you choose RNNs over Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**RNNs preferred:**"
    },
    {
     "t": "ol",
     "items": [
      "Streaming/online processing (process one token at a time)",
      "Very limited compute/memory (simpler than Transformers)",
      "Already deployed RNN system that works well",
      "Extremely long sequences where Transformer attention is too expensive"
     ]
    },
    {
     "t": "p",
     "text": "**Transformers preferred:**"
    },
    {
     "t": "ol",
     "items": [
      "Sufficient compute and data",
      "Need to capture long-range dependencies well",
      "Can parallelize training",
      "State-of-the-art performance needed"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformers dominate most benchmarks. But RNNs are simpler, smaller, and natural for streaming. Recent work (RWKV, Mamba) combines benefits of both."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
