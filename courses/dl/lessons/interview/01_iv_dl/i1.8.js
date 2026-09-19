/* ============================================================================
   INTERVIEW I1.8 — NLP & Sequence Models
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.8",
 "lede": "**20 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "NLP & Sequence Models",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is word2vec and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "Learn word embeddings by predicting context from target (Skip-gram) or target from context (CBOW):"
    },
    {
     "t": "ul",
     "items": [
      "Skip-gram: Maximize \\(P(\\text{context}|\\text{word})\\).",
      "Negative sampling: Efficient approximation — distinguish real context from random noise."
     ]
    },
    {
     "t": "p",
     "text": "Resulting embeddings capture semantic analogies: king - man + woman ≈ queen."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is GloVe and how does it differ from word2vec?",
   "body": [
    {
     "t": "p",
     "text": "GloVe uses global word co-occurrence statistics from the entire corpus:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\sum_{i,j} f(X_{ij})(w_i^T \\tilde{w}_j + b_i + \\tilde{b}_j - \\log X_{ij})^2"
    },
    {
     "t": "p",
     "text": "word2vec: local context windows. GloVe: global matrix factorization. GloVe often performs better on analogy tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is FastText and its advantage over word2vec?",
   "body": [
    {
     "t": "p",
     "text": "Represents words as bags of character n-grams. Each word embedding = sum of its n-gram embeddings. Handles OOV (out-of-vocabulary) words naturally — can generate embeddings for unseen words."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is the vanishing gradient problem in RNNs?",
   "body": [
    {
     "t": "p",
     "text": "Gradients are multiplied by the recurrent weight matrix \\(W\\) at every time step. If \\(|W| < 1\\) → gradients vanish (long-range dependencies not learned). If \\(|W| > 1\\) → explode. LSTM and GRU mitigate this with gating mechanisms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is the LSTM gate mechanism in detail?",
   "body": [
    {
     "t": "math",
     "tex": "f_t = \\sigma(W_f \\cdot [h_{t-1}, x_t] + b_f) \\quad \\text{(forget gate)}"
    },
    {
     "t": "math",
     "tex": "i_t = \\sigma(W_i \\cdot [h_{t-1}, x_t] + b_i) \\quad \\text{(input gate)}"
    },
    {
     "t": "math",
     "tex": "\\tilde{C}_t = \\tanh(W_C \\cdot [h_{t-1}, x_t] + b_C) \\quad \\text{(candidate values)}"
    },
    {
     "t": "math",
     "tex": "C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t \\quad \\text{(cell update)}"
    },
    {
     "t": "math",
     "tex": "o_t = \\sigma(W_o \\cdot [h_{t-1}, x_t] + b_o), \\quad h_t = o_t \\odot \\tanh(C_t)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is a Bidirectional RNN?",
   "body": [
    {
     "t": "p",
     "text": "Two RNNs — one processes the sequence forward, one backward. Output = concatenation of both hidden states:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "self.rnn = nn.LSTM(input_size, hidden_size, bidirectional=True)\n# Output size = 2 * hidden_size"
    },
    {
     "t": "p",
     "text": "Each position has context from the full sequence. Used in NER, sentiment analysis (but not language generation where future is unknown)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is the Transformer encoder vs decoder?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Encoder:** Self-attention + FFN; produces contextual representations of input. BERT uses encoder-only.",
      "**Decoder:** Masked self-attention + cross-attention to encoder + FFN; generates output tokens. GPT uses decoder-only.",
      "**Encoder-Decoder:** Machine translation (T5, BART). Separated for analysis but increasingly decoder-only is dominant."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is positional encoding in Transformers and alternatives?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Sinusoidal (original):** Fixed mathematical functions of position. Generalizes to unseen lengths.",
      "**Learned absolute PE:** Trainable embedding per position. Common in BERT.",
      "**RoPE (Rotary PE):** Encodes relative position by rotating query/key vectors. Used in LLaMA, GPT-NeoX.",
      "**ALiBi:** Adds position-scaled bias to attention logits. Extrapolates better to longer sequences."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is masked language modeling (MLM) and causal language modeling (CLM)?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**MLM (BERT-style):** 15% of tokens masked; model predicts them. Learns bidirectional representations. Cannot directly generate text.",
      "**CLM (GPT-style):** Predict next token given previous tokens. Unidirectional. Natural for generation."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What is BERT and what are its pretraining tasks?",
   "body": [
    {
     "t": "p",
     "text": "Bidirectional Encoder Representations from Transformers:"
    },
    {
     "t": "ol",
     "items": [
      "**MLM:** Mask 15% of tokens, predict them.",
      "**NSP (Next Sentence Prediction):** Predict if sentence B follows sentence A."
     ]
    },
    {
     "t": "p",
     "text": "RoBERTa removed NSP, trained on 10× more data with full-sentence masking → better performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "151",
   "q": "What is the GPT architecture and training objective?",
   "body": [
    {
     "t": "p",
     "text": "Decoder-only Transformer trained with causal language modeling: predict the next token at every position. Pretrained on massive web text. At inference: autoregressive token sampling. Fine-tuned with RLHF for instruction following (InstructGPT → ChatGPT)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "What is T5 (Text-to-Text Transfer Transformer)?",
   "body": [
    {
     "t": "p",
     "text": "Frames every NLP task as a text-to-text problem: input = task prefix + text, output = text. \"Translate English to German: The house is wonderful\" → \"Das Haus ist wunderbar.\" Encoder-decoder architecture, enabling generation for any task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "What is sentence transformer / sentence embeddings?",
   "body": [
    {
     "t": "p",
     "text": "Fine-tune a Transformer (BERT-based) to produce fixed-size sentence embeddings for semantic similarity:"
    },
    {
     "t": "ul",
     "items": [
      "Siamese/Triplet networks with cosine similarity loss.",
      "Models: `all-MiniLM-L6-v2`, `all-mpnet-base-v2`, `E5`, `BGE`."
     ]
    },
    {
     "t": "p",
     "text": "Used for semantic search, RAG, clustering, deduplication."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "What is cross-encoder vs bi-encoder for text matching?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Bi-encoder:** Encode query and document independently → dot product. Fast but less accurate.",
      "**Cross-encoder:** Concatenate query + document, encode jointly → classifier. Accurate but O(n·m) for n queries × m docs."
     ]
    },
    {
     "t": "p",
     "text": "Production: bi-encoder for retrieval, cross-encoder for reranking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "What is Byte-Pair Encoding (BPE) tokenization?",
   "body": [
    {
     "t": "p",
     "text": "Start with character vocabulary, iteratively merge the most frequent pair of adjacent tokens until desired vocabulary size is reached. GPT uses BPE. Balances vocabulary size vs OOV rate. Handles morphologically rich languages better than word-level tokenization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "156",
   "q": "What is BLEU score?",
   "body": [
    {
     "t": "p",
     "text": "Measures overlap between generated and reference text (n-gram precision):"
    },
    {
     "t": "math",
     "tex": "BLEU = BP \\cdot \\exp\\left(\\sum_{n=1}^{N} w_n \\log p_n\\right)"
    },
    {
     "t": "p",
     "text": "BP = brevity penalty, \\(p_n\\) = n-gram precision. BLEU 1-4 are standard. Limitations: doesn't capture semantic similarity, heavily penalizes synonyms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "What is ROUGE score?",
   "body": [
    {
     "t": "p",
     "text": "Recall-oriented metric for summarization:"
    },
    {
     "t": "ul",
     "items": [
      "**ROUGE-N:** N-gram recall between hypothesis and reference.",
      "**ROUGE-L:** Longest common subsequence ratio."
     ]
    },
    {
     "t": "p",
     "text": "BLEU = precision-focused; ROUGE = recall-focused. BERTScore measures semantic (cosine) similarity using pretrained embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "What is perplexity in language models?",
   "body": [
    {
     "t": "p",
     "text": "Measures how well a probability model predicts a sample:"
    },
    {
     "t": "math",
     "tex": "PP = 2^{-\\frac{1}{N}\\sum_{i=1}^N \\log_2 P(w_i|w_{<i})}"
    },
    {
     "t": "p",
     "text": "Lower perplexity = better model. GPT-4 has much lower perplexity on open-domain text than GPT-2. Not comparable across different tokenizers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "What is nucleus sampling (top-p)?",
   "body": [
    {
     "t": "p",
     "text": "Sample from the smallest set of tokens whose cumulative probability exceeds \\(p\\):"
    },
    {
     "t": "ul",
     "items": [
      "\\(p=1.0\\): All vocabulary (random).",
      "\\(p=0.9\\): Top 90% probability mass — dynamic vocabulary size."
     ]
    },
    {
     "t": "p",
     "text": "More natural than top-k because it adapts to the distribution's entropy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "What is beam search and its limitations?",
   "body": [
    {
     "t": "p",
     "text": "Maintain K candidate sequences (beams), extend each by all vocabulary tokens, keep top K by accumulated log-probability. More accurate than greedy decoding. Limitations: tends toward generic/repetitive text; over-exploits high-frequency patterns. Modern LLMs prefer sampling over beam search for open-ended generation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
