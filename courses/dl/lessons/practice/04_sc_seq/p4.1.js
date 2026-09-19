/* ============================================================================
   PRACTICE P4.1 — Sequence Models and NLP · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/03_Sequence_Models_and_NLP.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.1",
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
   "n": "1",
   "q": "What is a Recurrent Neural Network (RNN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A neural network with loops — hidden state is passed from one time step to the next:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "h_t = tanh(W_hh · h_{t-1} + W_xh · x_t + b)\ny_t = W_hy · h_t + b_y"
    },
    {
     "t": "p",
     "text": "**Explanation:** RNNs process sequential data (text, time series, audio) by maintaining a \"memory\" (hidden state). Same weights shared across time steps. Can handle variable-length sequences."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the vanishing gradient problem specific to RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradient flows through time via chain rule multiplication:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "∂L/∂h₁ = ∂L/∂h_T × ∂h_T/∂h_{T-1} × ... × ∂h₂/∂h₁"
    },
    {
     "t": "p",
     "text": "Each factor involves W_hh and tanh derivative. Many multiplications of values < 1 → gradient vanishes exponentially."
    },
    {
     "t": "p",
     "text": "**Result:** RNN can't learn long-range dependencies (word at position 1 doesn't influence position 100)."
    },
    {
     "t": "p",
     "text": "**Solution:** LSTM, GRU with gating mechanisms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How does an LSTM work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** LSTM adds a cell state (highway for information flow) and three gates:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forget gate:  f_t = σ(W_f · [h_{t-1}, x_t] + b_f)     → what to forget\nInput gate:   i_t = σ(W_i · [h_{t-1}, x_t] + b_i)      → what to add\nCell update:  C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)   → new candidate\nCell state:   C_t = f_t ⊙ C_{t-1} + i_t ⊙ C̃_t          → updated cell\nOutput gate:  o_t = σ(W_o · [h_{t-1}, x_t] + b_o)       → what to output\nHidden state: h_t = o_t ⊙ tanh(C_t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cell state provides unimpeded gradient flow (additive, not multiplicative). Gates are sigmoid (0-1) → control what information passes. Can learn 100+ time steps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is a GRU and how does it compare to LSTM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** GRU simplifies LSTM with two gates (instead of three):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Reset gate:  r_t = σ(W_r · [h_{t-1}, x_t])     → how much past to forget\nUpdate gate: z_t = σ(W_z · [h_{t-1}, x_t])      → how much to update\nCandidate:   h̃_t = tanh(W · [r_t ⊙ h_{t-1}, x_t])\nHidden:      h_t = (1-z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t"
    },
    {
     "t": "p",
     "text": "**vs LSTM:**"
    },
    {
     "t": "ul",
     "items": [
      "GRU: Fewer parameters, faster training, no cell state",
      "LSTM: More powerful for longer sequences, separate cell/hidden state"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Performance is often comparable. GRU preferred for smaller datasets/faster training. LSTM preferred when memory capacity matters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is a bidirectional RNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Processes sequence in both directions and combines:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forward:  h_f = RNN_forward(x₁, x₂, ..., x_T)\nBackward: h_b = RNN_backward(x_T, x_{T-1}, ..., x₁)\nOutput:   h_t = [h_f_t ; h_b_t]  (concatenation)"
    },
    {
     "t": "p",
     "text": "**When useful:** When future context matters (named entity recognition, sentiment analysis)."
    },
    {
     "t": "p",
     "text": "**Not useful:** Autoregressive tasks where you can't see the future (language generation, real-time prediction)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is teacher forcing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** During training, use ground truth previous tokens as input instead of model's own predictions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "With teacher forcing:    input at t: [BOS, \"the\", \"cat\"]     (ground truth)\nWithout teacher forcing: input at t: [BOS, \"a\", \"dog\"]       (model's predictions)"
    },
    {
     "t": "p",
     "text": "**Problem:** Exposure bias — at inference, model uses its own (possibly wrong) predictions, which it never saw during training."
    },
    {
     "t": "p",
     "text": "**Solution:** Scheduled sampling — gradually decrease teacher forcing probability during training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between many-to-one, one-to-many, and many-to-many RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Many-to-one:** Input sequence → single output (sentiment classification)",
      "**One-to-many:** Single input → output sequence (image captioning)",
      "**Many-to-many (equal):** Sequence → sequence of same length (POS tagging)",
      "**Many-to-many (unequal):** Sequence → sequence of different length (translation) — requires encoder-decoder"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Architecture chosen based on task input/output structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the encoder-decoder architecture for sequence-to-sequence?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: input sequence → context vector (final hidden state)\nDecoder: context vector → output sequence (one token at a time)"
    },
    {
     "t": "p",
     "text": "**Limitation:** Entire input compressed into fixed-size context vector — information bottleneck for long sequences."
    },
    {
     "t": "p",
     "text": "**Solution:** Attention mechanism — decoder looks at all encoder hidden states, not just the last one."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the attention mechanism in sequence models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "# At each decoder step t:\nscores = decoder_h_t · encoder_h_i  (dot product for each encoder position i)\nweights = softmax(scores)            (attention weights)\ncontext = Σ weights_i × encoder_h_i  (weighted sum of encoder states)\noutput = f(context, decoder_h_t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Model learns which parts of input to focus on for each output token. \"The cat sat\" → translating \"chat\" attends to \"cat.\" Solved the information bottleneck problem. Predecessor to Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are the types of attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Additive (Bahdanau):** `score = v · tanh(W₁h_encoder + W₂h_decoder)` — learnable",
      "**Multiplicative (Luong):** `score = h_decoder · W · h_encoder` — or dot product",
      "**Scaled dot-product:** `score = (Q · K) / √d_k` — used in Transformers",
      "**Self-attention:** Sequence attends to itself",
      "**Multi-head:** Multiple parallel attention computations"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Scaled dot-product prevents large dot products from pushing softmax into saturated regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is Backpropagation Through Time (BPTT)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unroll the RNN through time steps and apply standard backpropagation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Unrolled: x₁→h₁→x₂→h₂→...→x_T→h_T→Loss\nGradients flow from Loss back through all time steps"
    },
    {
     "t": "p",
     "text": "**Problem:** For long sequences, many multiplications → vanishing/exploding gradients."
    },
    {
     "t": "p",
     "text": "**Solution:** Truncated BPTT — only backpropagate through last k time steps. Lose long-range gradients but practically stable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do you handle variable-length sequences in RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Padding:** Pad shorter sequences with zeros to max length",
      "**Packing:** Use `pack_padded_sequence` to skip padding in computation",
      "**Bucketing:** Group similar-length sequences to minimize padding"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyTorch packed sequences\npacked = nn.utils.rnn.pack_padded_sequence(padded_input, lengths, batch_first=True)\noutput, hidden = rnn(packed)\nunpacked, _ = nn.utils.rnn.pad_packed_sequence(output, batch_first=True)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Padding wastes computation. Packing skips padded positions. Always sort by length (descending) for packing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the difference between stateful and stateless RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Stateless:** Hidden state reset to zero at the start of each batch",
      "**Stateful:** Hidden state carried over between batches (for long continuous sequences)"
     ]
    },
    {
     "t": "p",
     "text": "**When stateful:** Processing very long sequences that don't fit in one batch (books, long time series)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Stateful requires careful batching (consecutive segments in same position across batches). More complex but can learn patterns spanning multiple batches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is a sequence classification task and how do you use RNNs for it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class SentimentClassifier(nn.Module):\n    def __init__(self):\n        self.embedding = nn.Embedding(vocab_size, embed_dim)\n        self.lstm = nn.LSTM(embed_dim, hidden_dim, bidirectional=True)\n        self.fc = nn.Linear(hidden_dim * 2, num_classes)\n    \n    def forward(self, x):\n        embeds = self.embedding(x)\n        output, (hidden, cell) = self.lstm(embeds)\n        # Use last hidden state from both directions\n        hidden = torch.cat((hidden[-2], hidden[-1]), dim=1)\n        return self.fc(hidden)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Process entire sequence, use final hidden state for classification. Alternatively, use attention-weighted average of all hidden states."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is a language model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A model that assigns probability to sequences of words: P(w₁, w₂, ..., w_n)"
    },
    {
     "t": "p",
     "text": "**Autoregressive:** P(w_t | w₁, ..., w_{t-1}) — predict next word given previous words"
    },
    {
     "t": "p",
     "text": "**Training:** On large text corpus, minimize negative log-likelihood of next token prediction."
    },
    {
     "t": "p",
     "text": "**Evaluation:** Perplexity = exp(average negative log-likelihood). Lower = better."
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation of NLP. GPT is an autoregressive language model. BERT is a masked language model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is perplexity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "PPL = exp(-1/N × Σ log P(w_i | context))"
    },
    {
     "t": "p",
     "text": "**Interpretation:** If PPL = 10, model is \"equally confused\" as choosing from 10 options at each step."
    },
    {
     "t": "p",
     "text": "**Good perplexity:** Depends on vocabulary and domain. GPT-2 on WikiText: ~21. Lower = better."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard evaluation metric for language models. Not directly comparable across different tokenizations or vocabularies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between word-level and character-level RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Word-level:** Input is words. Larger vocabulary. Faster training. Can't handle OOV (out-of-vocabulary).",
      "**Character-level:** Input is characters. Small vocabulary (26+). Slower (longer sequences). Handles any word.",
      "**Subword (BPE, WordPiece):** Compromise — common words as tokens, rare words split. Used in BERT, GPT."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Subword tokenization (BPE) is now standard — handles OOV while keeping sequence length manageable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What are word embeddings?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dense vector representations of words that capture semantic meaning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "\"king\" → [0.2, -0.1, 0.8, ...]  (300 dimensions)\n\"queen\" → [0.21, -0.09, 0.79, ...]  (similar vector)"
    },
    {
     "t": "p",
     "text": "**Methods:** Word2Vec (Skip-gram, CBOW), GloVe (co-occurrence matrix factorization), FastText (subword-aware)."
    },
    {
     "t": "p",
     "text": "**Property:** king - man + woman ≈ queen (vector arithmetic captures relationships)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-trained embeddings provide good initialization. Fine-tuning during training adapts to specific task. Replaced by contextual embeddings (BERT, GPT)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the difference between Word2Vec and contextual embeddings?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Word2Vec:** One fixed vector per word regardless of context. \"bank\" (river) = \"bank\" (financial).",
      "**Contextual (BERT, ELMo):** Different vectors for same word in different contexts. \"bank\" (river) ≠ \"bank\" (financial)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Contextual embeddings solved polysemy (multiple meanings). BERT produces different representations of \"bank\" based on surrounding words. Massive improvement for NLP tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do you handle the exploding gradient problem in RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Gradient clipping by norm\ntorch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)\n\n# Gradient clipping by value\ntorch.nn.utils.clip_grad_value_(model.parameters(), clip_value=1.0)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Clip gradient norm: scale gradients if total norm exceeds threshold (preserves direction). Clip gradient value: clamp each element (changes direction). Norm clipping preferred. Essential for RNN training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is a stacked/deep RNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple RNN layers stacked vertically:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Layer 1: x_t → h¹_t\nLayer 2: h¹_t → h²_t\nLayer 3: h²_t → h³_t → output"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "rnn = nn.LSTM(input_size, hidden_size, num_layers=3, dropout=0.3)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each layer captures different abstraction level. 2-4 layers common. More layers need more data and regularization (inter-layer dropout). Deeper ≠ always better for RNNs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is beam search decoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Explores top-k candidates at each step instead of greedy (top-1):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Beam width k=3:\nStep 1: \"The\" (0.5), \"A\" (0.3), \"In\" (0.2)\nStep 2: \"The cat\" (0.4), \"The dog\" (0.35), \"A cat\" (0.25)\n...continue keeping top-k total sequences"
    },
    {
     "t": "p",
     "text": "**vs Greedy:** Greedy: always pick best token. May miss globally optimal sequence."
    },
    {
     "t": "p",
     "text": "**Explanation:** Beam search finds better sequences than greedy. k=5-10 typical. Larger k = better but slower. Length normalization prevents bias toward shorter sequences."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the difference between autoregressive and autoencoding models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Autoregressive (GPT):** Predicts next token given previous tokens. Left-to-right. Causal mask.",
      "**Autoencoding (BERT):** Predicts masked tokens given all surrounding tokens. Bidirectional."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Autoregressive: natural for generation (complete the sequence). Autoencoding: natural for understanding (classify, extract). GPT: good at generation. BERT: good at classification/NER."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is ELMo?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Embeddings from Language Models — contextual word representations from a bidirectional LSTM language model."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forward LM:  P(w_t | w₁, ..., w_{t-1})\nBackward LM: P(w_t | w_{t+1}, ..., w_N)\nELMo: weighted combination of all BiLSTM layers"
    },
    {
     "t": "p",
     "text": "**Explanation:** First practical contextual embeddings (2018). Each layer captures different information: lower layers = syntax, higher layers = semantics. Superseded by BERT/Transformers but showed the value of contextual representations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you handle multi-step time series forecasting with RNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Recursive:** Predict one step, feed prediction back as input. Error accumulates.",
      "**Direct:** Separate model for each forecast horizon. More models, no error accumulation.",
      "**Seq2Seq:** Encoder processes history, decoder outputs all future steps. Shared model."
     ]
    },
    {
     "t": "p",
     "text": "**Best practice:** Seq2Seq for longer horizons. Recursive is simplest but degrades over time."
    },
    {
     "t": "p",
     "text": "**Explanation:** Error accumulation in recursive approach can make predictions useless after a few steps. Teacher forcing during training but recursive at inference creates train-test mismatch."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
