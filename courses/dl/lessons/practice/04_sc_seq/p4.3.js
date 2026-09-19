/* ============================================================================
   PRACTICE P4.3 — Sequence Models and NLP · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/03_Sequence_Models_and_NLP.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.3",
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
   "n": "51",
   "q": "What is the difference between word-level, subword-level, and character-level tokenization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Level",
      "Example (\"unhappiness\")",
      "Vocab Size",
      "OOV Handling"
     ],
     "rows": [
      [
       "Word",
       "[\"unhappiness\"]",
       "Large (100K+)",
       "Unknown token for new words"
      ],
      [
       "Subword (BPE)",
       "[\"un\", \"happiness\"]",
       "Medium (30-50K)",
       "Handles new words via subwords"
      ],
      [
       "Character",
       "[\"u\",\"n\",\"h\",\"a\",...]",
       "Small (~100)",
       "No OOV, but long sequences"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Subword (BPE, WordPiece, SentencePiece) is the standard — balances vocabulary size and OOV handling. Used by BERT, GPT, T5."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is the difference between BERT and GPT architecturally?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "BERT",
      "GPT"
     ],
     "rows": [
      [
       "Architecture",
       "Encoder-only",
       "Decoder-only"
      ],
      [
       "Attention",
       "Bidirectional",
       "Causal (left-to-right)"
      ],
      [
       "Pre-training",
       "Masked LM + NSP",
       "Next token prediction"
      ],
      [
       "Best for",
       "Understanding (classification, NER)",
       "Generation (text, code)"
      ],
      [
       "Context",
       "Sees full input at once",
       "Generates token by token"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BERT: fill in the blank (cloze). GPT: finish the sentence. T5/BART: encoder-decoder — best for seq2seq tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "How does the masked language model (MLM) pre-training work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: \"The [MASK] sat on the [MASK]\"\nTarget: \"The cat sat on the mat\"\n\nProcess:\n1. Randomly mask 15% of tokens\n2. Of masked: 80% → [MASK], 10% → random token, 10% → unchanged\n3. Model predicts original token at masked positions"
    },
    {
     "t": "p",
     "text": "**Explanation:** Model learns bidirectional context — uses both left and right context to predict masked word. The 80/10/10 split prevents model from relying on [MASK] token since it never appears in downstream data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the difference between fine-tuning and prompt engineering for LLMs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Fine-tuning:** Update model weights on task-specific data. Best performance but expensive.",
      "**Prompt engineering:** Design input text to elicit desired behavior without training. Zero cost.",
      "**Few-shot prompting:** Include examples in prompt. No training required.",
      "**Parameter-efficient fine-tuning (PEFT):** LoRA, adapters — update tiny fraction of weights."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trade-off: prompt engineering (free, flexible) → few-shot → PEFT → full fine-tuning (best accuracy, most expensive)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is attention masking and why is it needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Padding mask:** Ignore padding tokens in variable-length batches",
      "**Causal mask:** Prevent attending to future tokens (autoregressive models)",
      "**Cross-attention mask:** Control which encoder positions decoder can attend to"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Causal mask\nmask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()\n# True values are masked (cannot attend)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without padding mask, model wastes capacity on pad tokens. Without causal mask, decoder can \"cheat\" by seeing future tokens."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is the difference between extractive and abstractive summarization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Extractive:** Select important sentences from original text verbatim",
      "— Models: TextRank, BERT + sentence scoring",
      "**Abstractive:** Generate new text that captures key information",
      "— Models: T5, BART, PEGASUS, GPT"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Extractive is simpler and more faithful. Abstractive produces more natural summaries but risks hallucination. Modern systems often combine both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "How does beam search work for text generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Step 1: Generate top-k tokens for position 1\nStep 2: For each beam, generate top-k tokens for position 2\nStep 3: Keep top beam_width sequences by total probability\nRepeat until EOS or max length\n\nExample (beam_width=2):\n\"The\" → \"The cat\" (0.3), \"The dog\" (0.25)\n\"The cat\" → \"The cat sat\" (0.15), \"The cat ran\" (0.12)\n\"The dog\" → \"The dog barked\" (0.10), \"The dog slept\" (0.08)\nKeep top 2: \"The cat sat\", \"The cat ran\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Beam search finds approximately most likely sequence. Larger beam = better but slower. Greedy (beam=1) often produces repetitive text."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What are the different sampling strategies for text generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Greedy:** Always pick highest probability token. Repetitive.",
      "**Temperature sampling:** Divide logits by T before softmax. T<1 = sharper, T>1 = more random.",
      "**Top-k:** Sample from top k tokens only.",
      "**Top-p (nucleus):** Sample from smallest set of tokens whose cumulative probability ≥ p.",
      "**Repetition penalty:** Reduce probability of recently generated tokens."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Top-p is most popular — adapts vocabulary size per step. \"The\" has few valid continuations (use few tokens), \"I want to eat\" has many (use more tokens)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is Named Entity Recognition (NER) and how do deep learning models approach it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Identify and classify entities in text: persons, organizations, locations, dates, etc."
    },
    {
     "t": "p",
     "text": "**DL approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**BiLSTM-CRF:** Bidirectional LSTM with CRF layer for sequence labeling",
      "**BERT + token classification:** Fine-tune BERT with linear head per token",
      "**SpaCy NER:** Pre-trained transformer-based NER"
     ]
    },
    {
     "t": "p",
     "text": "**BIO tagging:** B-PER (begin person), I-PER (inside person), O (outside entity)"
    },
    {
     "t": "p",
     "text": "**Explanation:** CRF layer captures label dependencies (I-PER cannot follow B-ORG). BERT-based NER is current state-of-the-art."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between seq2seq with attention and Transformer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Seq2seq + attention:** RNN encoder + RNN decoder + additive attention to encoder states",
      "**Transformer:** Self-attention replaces recurrence entirely"
     ]
    },
    {
     "t": "p",
     "text": "**Key differences:**"
    },
    {
     "t": "ol",
     "items": [
      "Seq2seq processes sequentially (can't parallelize). Transformer parallelizes.",
      "Seq2seq attention is cross-attention only. Transformer has self-attention too.",
      "Transformer uses multi-head attention. Seq2seq typically single-head.",
      "Transformer has positional encoding. Seq2seq has implicit position from recurrence."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformer's parallelism enables training on much larger datasets → better performance. RNNs are now largely replaced."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is the Transformer's position encoding and why is it needed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-attention is permutation invariant — without position info, \"dog bites man\" = \"man bites dog\"."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**Sinusoidal (original):** Fixed functions of position: PE(pos, 2i) = sin(pos/10000^(2i/d))",
      "**Learned:** Trainable embedding per position",
      "**Rotary (RoPE):** Encode relative positions via rotation — used in LLaMA, GPT-NeoX",
      "**ALiBi:** Linear attention bias based on distance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** RoPE enables extrapolation to longer sequences than seen in training. ALiBi is simpler and also extrapolates well."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is cross-lingual transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train model on one language, apply to another."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**mBERT/XLM-R:** Pre-train on 100+ languages → fine-tune on English → transfer to other languages",
      "**Translation-based:** Translate training data to target language",
      "**Multilingual embeddings:** Align embedding spaces across languages"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** XLM-R achieves remarkable zero-shot cross-lingual transfer — fine-tuned on English sentiment analysis works on French with ~90% of English performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is the difference between token-level and sentence-level embeddings?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Token-level:** Each token gets a separate embedding (BERT output layer). Used for NER, QA.",
      "**Sentence-level:** Single vector represents entire sentence. Used for similarity, search, clustering."
     ]
    },
    {
     "t": "p",
     "text": "**Getting sentence embeddings:**"
    },
    {
     "t": "ol",
     "items": [
      "[CLS] token (not ideal)",
      "Mean pooling of all token embeddings (better)",
      "Sentence-BERT (SBERT): Siamese network trained for similarity"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** SBERT produces semantically meaningful sentence embeddings — \"dog runs\" and \"puppy sprints\" have high similarity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is text classification with pre-trained models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from transformers import AutoTokenizer, AutoModelForSequenceClassification\n\n# Fine-tune BERT for classification\ntokenizer = AutoTokenizer.from_pretrained(\"bert-base-uncased\")\nmodel = AutoModelForSequenceClassification.from_pretrained(\n    \"bert-base-uncased\", num_labels=3\n)\n\n# Tokenize\ninputs = tokenizer(\"This movie is great!\", return_tensors=\"pt\",\n                    padding=True, truncation=True, max_length=512)\noutputs = model(**inputs)\npredictions = torch.argmax(outputs.logits, dim=-1)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-trained transformer + linear classification head. Fine-tune on labeled data. Achieves SOTA on most text classification benchmarks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the difference between BERT, RoBERTa, and ALBERT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Model",
      "Key Difference"
     ],
     "rows": [
      [
       "BERT",
       "Original: MLM + NSP pre-training"
      ],
      [
       "RoBERTa",
       "Remove NSP, more data, longer training, dynamic masking"
      ],
      [
       "ALBERT",
       "Parameter sharing across layers, factorized embeddings"
      ],
      [
       "DeBERTa",
       "Disentangled attention (content + position separately)"
      ],
      [
       "ELECTRA",
       "Replaced token detection (more efficient pre-training)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** RoBERTa showed BERT was undertrained. ALBERT reduced parameters 18× with quality loss. ELECTRA uses all tokens for training (not just masked 15%)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is Question Answering and how do Transformer models solve it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Extractive QA:** Find answer span in given context."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Context: \"Paris is the capital of France.\"\nQuestion: \"What is the capital of France?\"\nAnswer: \"Paris\" (start=0, end=0)"
    },
    {
     "t": "p",
     "text": "**Model:** BERT with two linear heads predicting start and end position."
    },
    {
     "t": "p",
     "text": "**Abstractive QA:** Generate answer text (may not be verbatim from context)."
    },
    {
     "t": "p",
     "text": "**Open-domain QA:** Retriever finds relevant passages + Reader extracts answer (RAG approach)."
    },
    {
     "t": "p",
     "text": "**Explanation:** SQuAD is the standard benchmark. Models achieve super-human performance on extractive QA."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the attention mechanism's computational complexity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Self-attention: O(n² × d)\nn = sequence length, d = model dimension\n\nFor n=1024, d=768:\nO(1024² × 768) ≈ 800M operations per attention layer\n\nFor n=32768 (long context):\nO(32768²) = 1 billion attention scores per head!"
    },
    {
     "t": "p",
     "text": "**Efficient alternatives:**"
    },
    {
     "t": "ol",
     "items": [
      "Linear attention: O(n × d²)",
      "Sparse attention: O(n × √n)",
      "Flash Attention: Same O(n²) but memory-efficient"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Quadratic complexity is the main bottleneck for long sequences. Linear attention sacrifices some quality for scalability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is the difference between encoder-decoder and decoder-only for generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Encoder-decoder (T5, BART):** Encode input fully, then decode output. Good for conditional generation (translation, summarization).",
      "**Decoder-only (GPT):** Process input and output as single sequence. Simpler scaling, unified architecture."
     ]
    },
    {
     "t": "p",
     "text": "**Trend:** Decoder-only dominates at scale (GPT-4, LLaMA, Claude). Encoder-decoder still useful for specific tasks (translation, speech-to-text)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Decoder-only is simpler to scale and train. Prefix acts as implicit encoder. Scaling laws favor decoder-only architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is tokenization and how does BPE (Byte Pair Encoding) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "BPE Algorithm:\n1. Start with character-level vocabulary: {a, b, c, ..., z}\n2. Count all adjacent character pairs in corpus\n3. Merge most frequent pair: (\"e\",\"s\") → \"es\"\n4. Repeat until desired vocabulary size reached\n\nExample evolution:\n\"lowest\" → [\"l\",\"o\",\"w\",\"e\",\"s\",\"t\"]\nAfter merges: [\"low\",\"est\"] or [\"lo\",\"w\",\"est\"]"
    },
    {
     "t": "p",
     "text": "**Explanation:** BPE learns data-driven subword vocabulary. Common words stay whole. Rare words split into subwords. Handles any word (no OOV). GPT uses BPE, BERT uses WordPiece (similar principle)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the Retrieval-Augmented Generation (RAG) approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Query → Retriever → Relevant Documents → Generator (LLM) → Answer\n\nComponents:\n1. Document store: Vector database (Pinecone, FAISS, Chroma)\n2. Retriever: Encode query, find similar documents\n3. Generator: LLM generates answer using retrieved context"
    },
    {
     "t": "p",
     "text": "**Advantages over pure LLM:**"
    },
    {
     "t": "ol",
     "items": [
      "Access to up-to-date information (not limited to training cutoff)",
      "Grounded in sources (less hallucination)",
      "No need to retrain/fine-tune for new knowledge"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** RAG is the standard approach for knowledge-grounded AI systems. Combines retrieval precision with generation fluency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is the difference between word embeddings (Word2Vec) and contextual embeddings (BERT)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Word2Vec:** Each word has ONE fixed embedding regardless of context",
      "— \"bank\" (river) = \"bank\" (financial) = same vector",
      "**BERT:** Each word gets DIFFERENT embedding based on surrounding context",
      "— \"bank\" (river context) ≠ \"bank\" (financial context)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Contextual embeddings capture polysemy (multiple meanings). This is why BERT outperforms Word2Vec on virtually all NLP tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is low-rank adaptation (LoRA) for fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Original weight matrix: W ∈ R^(d×d)\nLoRA: W + ΔW = W + BA where B ∈ R^(d×r), A ∈ R^(r×d)\n\nr << d (rank, typically 8-64)\nParameters: 2×d×r instead of d×d\nSavings: d=4096, r=16 → 131K vs 16.7M parameters per layer"
    },
    {
     "t": "p",
     "text": "**Freeze original weights, only train A and B matrices.**"
    },
    {
     "t": "p",
     "text": "**Explanation:** LoRA achieves near full fine-tuning quality with <1% trainable parameters. No inference overhead (merge BA into W). Standard for LLM adaptation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is text generation hallucination and how to mitigate it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model generates plausible but factually incorrect text."
    },
    {
     "t": "p",
     "text": "**Causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Training data contains errors",
      "Model interpolates between facts",
      "High confidence on wrong information"
     ]
    },
    {
     "t": "p",
     "text": "**Mitigation:**"
    },
    {
     "t": "ol",
     "items": [
      "RAG (ground in retrieved documents)",
      "Self-consistency (sample multiple outputs, take majority)",
      "Chain-of-thought (force reasoning steps)",
      "Fact verification models",
      "Constrained decoding (limit output space)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hallucination is the biggest barrier to LLM deployment in high-stakes domains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the difference between classification, regression, and generation tasks in NLP?",
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
       "Classification",
       "Text",
       "Category",
       "Sentiment: positive/negative"
      ],
      [
       "Regression",
       "Text",
       "Number",
       "Review → rating (1-5)"
      ],
      [
       "Token classification",
       "Text",
       "Label per token",
       "NER, POS tagging"
      ],
      [
       "Generation",
       "Text (optional)",
       "Text",
       "Translation, summarization"
      ],
      [
       "Span extraction",
       "Text + query",
       "Text span",
       "Question answering"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Architecture choice depends on task: classification → encoder + linear head, generation → decoder, span → encoder + two heads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the T5 \"text-to-text\" framework?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Cast ALL NLP tasks as text-to-text:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Classification: \"sentiment: This movie is great\" → \"positive\"\nTranslation: \"translate English to French: Hello\" → \"Bonjour\"\nSummarization: \"summarize: [long text]\" → \"[summary]\"\nQA: \"question: What is AI? context: [text]\" → \"Artificial Intelligence\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Unified framework — same model, same loss, same architecture for every task. Simplifies multi-task learning. Only difference is the prefix/instruction."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
