/* ============================================================================
   PRACTICE P1.2 — NLP and Text Processing Programs · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Sample_Programs/Part_08_NLP_and_Text_Processing.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.2",
 "lede": "**15 programs** from NLP and Text Processing Programs. Read the title, write the program yourself, then open the reference version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the reference version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "726",
   "q": "Positional Embeddings (Learnable)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass LearnablePositionalEncoding(nn.Module):\n    def __init__(self, max_len, d_model):\n        super().__init__()\n        self.pos_embed = nn.Embedding(max_len, d_model)\n    \n    def forward(self, x):\n        batch, seq_len, _ = x.shape\n        positions = torch.arange(seq_len, device=x.device)\n        return x + self.pos_embed(positions)\n\npe = LearnablePositionalEncoding(512, 64)\nx = torch.randn(4, 20, 64)\nout = pe(x)\nprint(f\"With positional encoding: {out.shape}\")\nprint(f\"Learnable params: {pe.pos_embed.weight.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "With positional encoding: torch.Size([4, 20, 64])\nLearnable params: torch.Size([512, 64])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "727",
   "q": "Rotary Position Embedding (RoPE)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\ndef apply_rotary_emb(x, cos, sin):\n    x1, x2 = x[..., ::2], x[..., 1::2]\n    x_rotated = torch.stack([-x2, x1], dim=-1).flatten(-2)\n    return x * cos + x_rotated * sin\n\ndef precompute_rope(dim, max_len=512, base=10000):\n    freqs = 1.0 / (base ** (torch.arange(0, dim, 2).float() / dim))\n    t = torch.arange(max_len).float()\n    angles = torch.outer(t, freqs)\n    cos = torch.cos(angles).repeat(1, 2)[None, :, None, :]\n    sin = torch.sin(angles).repeat(1, 2)[None, :, None, :]\n    return cos, sin\n\nd_model = 64\ncos_cached, sin_cached = precompute_rope(d_model)\nq = torch.randn(1, 10, 4, d_model)  # batch, seq, heads, dim\nq_rotated = apply_rotary_emb(q, cos_cached[:, :10], sin_cached[:, :10])\nprint(f\"Query: {q.shape} → Rotated: {q_rotated.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Query: torch.Size([1, 10, 4, 64]) → Rotated: torch.Size([1, 10, 4, 64])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "728",
   "q": "KV Cache for Efficient Inference",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass CachedAttention(nn.Module):\n    def __init__(self, d_model=64, num_heads=4):\n        super().__init__()\n        self.attn = nn.MultiheadAttention(d_model, num_heads, batch_first=True)\n        self.k_cache = None\n        self.v_cache = None\n    \n    def forward(self, q, k, v, use_cache=False):\n        if use_cache and self.k_cache is not None:\n            k = torch.cat([self.k_cache, k], dim=1)\n            v = torch.cat([self.v_cache, v], dim=1)\n        if use_cache:\n            self.k_cache = k.detach()\n            self.v_cache = v.detach()\n        return self.attn(q, k, v)[0]\n\nattn = CachedAttention()\n# Prefill\nfull_q = torch.randn(1, 10, 64)\nout = attn(full_q, full_q, full_q, use_cache=True)\nprint(f\"Prefill output: {out.shape}\")\n\n# Decode (single token)\nnew_token = torch.randn(1, 1, 64)\nout = attn(new_token, new_token, new_token, use_cache=True)\nprint(f\"Decode output: {out.shape}, KV cache: {attn.k_cache.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Prefill output: torch.Size([1, 10, 64])\nDecode output: torch.Size([1, 1, 64]), KV cache: torch.Size([1, 11, 64])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "729",
   "q": "Token Classification (NER Model)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass NERModel(nn.Module):\n    def __init__(self, vocab_size=5000, embed_dim=64, hidden_dim=128, num_tags=9):\n        super().__init__()\n        self.embedding = nn.Embedding(vocab_size, embed_dim)\n        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=True)\n        self.fc = nn.Linear(hidden_dim * 2, num_tags)\n    \n    def forward(self, x):\n        emb = self.embedding(x)\n        lstm_out, _ = self.lstm(emb)\n        return self.fc(lstm_out)\n\n# BIO tags: B-PER, I-PER, B-ORG, I-ORG, B-LOC, I-LOC, B-MISC, I-MISC, O\nmodel = NERModel()\nx = torch.randint(0, 5000, (4, 30))\ntags = model(x)\nprint(f\"Input: {x.shape}, Tag logits: {tags.shape}\")\npredicted = tags.argmax(-1)\nprint(f\"Predicted tags: {predicted[0][:10]}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 30]), Tag logits: torch.Size([4, 30, 9])\nPredicted tags: tensor([1, 0, 0, 0, 2, 2, 1, 1, 0, 0])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "730",
   "q": "Retrieval-Augmented Generation Simulation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn.functional as F\n\nclass SimpleRAG:\n    def __init__(self, dim=64):\n        self.documents = []\n        self.embeddings = []\n        self.embed_fn = torch.nn.Linear(dim, dim, bias=False)\n    \n    def add_documents(self, docs, embeddings):\n        self.documents.extend(docs)\n        self.embeddings.extend(embeddings)\n    \n    def retrieve(self, query_embedding, top_k=3):\n        if not self.embeddings:\n            return []\n        db = torch.stack(self.embeddings)\n        query = query_embedding.unsqueeze(0)\n        sims = F.cosine_similarity(query, db)\n        top_idx = sims.topk(min(top_k, len(self.documents))).indices\n        return [(self.documents[i], sims[i].item()) for i in top_idx]\n\nrag = SimpleRAG()\ndocs = [\"Python is great for ML\", \"PyTorch is a DL framework\", \"Transformers changed NLP\"]\nembeds = [torch.randn(64) for _ in docs]\nrag.add_documents(docs, embeds)\n\nquery = torch.randn(64)\nresults = rag.retrieve(query, top_k=2)\nfor doc, score in results:\n    print(f\"  [{score:.4f}] {doc}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "[0.1107] Python is great for ML\n  [0.0785] PyTorch is a DL framework"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "731",
   "q": "Tokenization Comparison",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def whitespace_tokenize(text):\n    return text.split()\n\ndef character_tokenize(text):\n    return list(text)\n\ndef wordpiece_tokenize(text, vocab):\n    tokens = []\n    for word in text.lower().split():\n        if word in vocab:\n            tokens.append(word)\n        else:\n            remaining = word\n            sub_tokens = []\n            while remaining:\n                found = False\n                for end in range(len(remaining), 0, -1):\n                    sub = (\"##\" if sub_tokens else \"\") + remaining[:end]\n                    if sub in vocab:\n                        sub_tokens.append(sub)\n                        remaining = remaining[end:]\n                        found = True\n                        break\n                if not found:\n                    sub_tokens.append(\"[UNK]\")\n                    break\n            tokens.extend(sub_tokens)\n    return tokens\n\nvocab = {\"machine\", \"learn\", \"##ing\", \"deep\", \"model\", \"##s\", \"[UNK]\"}\ntext = \"machine learning models\"\nprint(f\"Whitespace: {whitespace_tokenize(text)}\")\nprint(f\"Character:  {character_tokenize(text)}\")\nprint(f\"WordPiece:  {wordpiece_tokenize(text, vocab)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Whitespace: ['machine', 'learning', 'models']\nCharacter:  ['m', 'a', 'c', 'h', 'i', 'n', 'e', ' ', 'l', 'e', 'a', 'r', 'n', 'i', 'n', 'g', ' ', 'm', 'o', 'd', 'e', 'l', 's']\nWordPiece:  ['machine', 'learn', '##ing', 'model', '##s']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "732",
   "q": "Sequence-to-Sequence Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass Seq2Seq(nn.Module):\n    def __init__(self, src_vocab=1000, tgt_vocab=1000, embed_dim=64, hidden_dim=128):\n        super().__init__()\n        self.encoder_embed = nn.Embedding(src_vocab, embed_dim)\n        self.encoder_rnn = nn.GRU(embed_dim, hidden_dim, batch_first=True)\n        self.decoder_embed = nn.Embedding(tgt_vocab, embed_dim)\n        self.decoder_rnn = nn.GRU(embed_dim, hidden_dim, batch_first=True)\n        self.output_proj = nn.Linear(hidden_dim, tgt_vocab)\n    \n    def forward(self, src, tgt):\n        enc_emb = self.encoder_embed(src)\n        _, hidden = self.encoder_rnn(enc_emb)\n        dec_emb = self.decoder_embed(tgt)\n        dec_out, _ = self.decoder_rnn(dec_emb, hidden)\n        return self.output_proj(dec_out)\n\nmodel = Seq2Seq()\nsrc = torch.randint(0, 1000, (4, 20))\ntgt = torch.randint(0, 1000, (4, 15))\nout = model(src, tgt)\nprint(f\"Source: {src.shape}, Target: {tgt.shape}, Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Source: torch.Size([4, 20]), Target: torch.Size([4, 15]), Output: torch.Size([4, 15, 1000])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "733",
   "q": "CRF Layer for Sequence Labeling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\nclass SimpleCRF:\n    def __init__(self, num_tags):\n        self.num_tags = num_tags\n        self.transitions = torch.randn(num_tags, num_tags)\n    \n    def viterbi_decode(self, emissions):\n        seq_len, num_tags = emissions.shape\n        scores = emissions[0]\n        paths = []\n        \n        for t in range(1, seq_len):\n            prev_scores = scores.unsqueeze(1) + self.transitions\n            max_scores, max_indices = prev_scores.max(dim=0)\n            scores = max_scores + emissions[t]\n            paths.append(max_indices)\n        \n        # Backtrack\n        best_tag = scores.argmax().item()\n        best_path = [best_tag]\n        for indices in reversed(paths):\n            best_tag = indices[best_tag].item()\n            best_path.insert(0, best_tag)\n        \n        return best_path, scores.max().item()\n\ncrf = SimpleCRF(5)\nemissions = torch.randn(10, 5)  # 10 timesteps, 5 tags\npath, score = crf.viterbi_decode(emissions)\nprint(f\"Viterbi path: {path}\")\nprint(f\"Score: {score:.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Viterbi path: [3, 1, 2, 0, 0, 1, 1, 0, 0, 1]\nScore: 19.1231"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "734",
   "q": "Document Chunking Strategies",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def fixed_size_chunking(text, chunk_size=100, overlap=20):\n    words = text.split()\n    chunks = []\n    for i in range(0, len(words), chunk_size - overlap):\n        chunk = ' '.join(words[i:i+chunk_size])\n        if chunk:\n            chunks.append(chunk)\n    return chunks\n\ndef sentence_chunking(text, max_sentences=3):\n    import re\n    sentences = re.split(r'(?<=[.!?])\\s+', text)\n    chunks = []\n    for i in range(0, len(sentences), max_sentences):\n        chunks.append(' '.join(sentences[i:i+max_sentences]))\n    return chunks\n\ntext = \"This is sentence one. This is sentence two. Third sentence here. Fourth one. Fifth one. Sixth.\"\nprint(\"Fixed-size chunks:\")\nfor i, c in enumerate(fixed_size_chunking(text, 5, 1)):\n    print(f\"  {i}: {c}\")\nprint(\"\\nSentence chunks:\")\nfor i, c in enumerate(sentence_chunking(text, 2)):\n    print(f\"  {i}: {c}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Fixed-size chunks:\n  0: This is sentence one. This\n  1: This is sentence two. Third\n  2: Third sentence here. Fourth one.\n  3: one. Fifth one. Sixth.\n\nSentence chunks:\n  0: This is sentence one. This is sentence two.\n  1: Third sentence here. Fourth one.\n  2: Fifth one. Sixth."
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "735",
   "q": "Stopword Removal",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "STOP_WORDS = {\n    \"the\", \"is\", \"at\", \"which\", \"on\", \"a\", \"an\", \"and\", \"or\", \"but\",\n    \"in\", \"with\", \"to\", \"for\", \"of\", \"not\", \"no\", \"can\", \"had\", \"has\",\n    \"have\", \"it\", \"its\", \"i\", \"my\", \"me\", \"we\", \"our\", \"you\", \"your\",\n    \"he\", \"she\", \"they\", \"them\", \"this\", \"that\", \"these\", \"those\",\n    \"am\", \"are\", \"was\", \"were\", \"be\", \"been\", \"being\", \"do\", \"does\", \"did\"\n}\n\ndef remove_stopwords(text, stop_words=STOP_WORDS):\n    words = text.lower().split()\n    return ' '.join(w for w in words if w not in stop_words)\n\ntext = \"This is a sample text with many stop words in it\"\nprint(f\"Original: {text}\")\nprint(f\"Filtered: {remove_stopwords(text)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original: This is a sample text with many stop words in it\nFiltered: sample text many stop words"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "736",
   "q": "Stemming and Lemmatization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def simple_stemmer(word):\n    suffixes = ['ing', 'tion', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ous', 'ly', 'ed', 'er', 'es', 's']\n    word = word.lower()\n    for suffix in sorted(suffixes, key=len, reverse=True):\n        if word.endswith(suffix) and len(word) - len(suffix) > 2:\n            return word[:-len(suffix)]\n    return word\n\nwords = [\"running\", \"happiness\", \"beautiful\", \"effectively\", \"processed\", \"computers\", \"learning\"]\nfor w in words:\n    print(f\"  {w:15s} → {simple_stemmer(w)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "running         → runn\n  happiness       → happi\n  beautiful       → beauti\n  effectively     → effective\n  processed       → process\n  computers       → computer\n  learning        → learn"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "737",
   "q": "Text Window Sliding (Context Window)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def sliding_window_context(tokens, window_size=5, stride=2):\n    windows = []\n    for i in range(0, len(tokens) - window_size + 1, stride):\n        window = tokens[i:i + window_size]\n        windows.append(window)\n    return windows\n\ntext = \"The quick brown fox jumps over the lazy dog near the river\"\ntokens = text.split()\nwindows = sliding_window_context(tokens, window_size=4, stride=2)\nfor i, w in enumerate(windows):\n    print(f\"Window {i}: {' '.join(w)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Window 0: The quick brown fox\nWindow 1: brown fox jumps over\nWindow 2: jumps over the lazy\nWindow 3: the lazy dog near\nWindow 4: dog near the river"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "738",
   "q": "Sentence Transformer Simulation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\nclass SentenceEncoder(nn.Module):\n    def __init__(self, vocab_size=5000, embed_dim=64, hidden_dim=128):\n        super().__init__()\n        self.embedding = nn.Embedding(vocab_size, embed_dim)\n        self.encoder = nn.TransformerEncoderLayer(embed_dim, nhead=4, batch_first=True)\n        self.pool = lambda x: x.mean(dim=1)  # Mean pooling\n    \n    def forward(self, input_ids):\n        emb = self.embedding(input_ids)\n        encoded = self.encoder(emb)\n        return F.normalize(self.pool(encoded), dim=-1)\n\nmodel = SentenceEncoder()\nsent1 = torch.randint(0, 5000, (1, 10))\nsent2 = torch.randint(0, 5000, (1, 15))\nemb1, emb2 = model(sent1), model(sent2)\nsim = F.cosine_similarity(emb1, emb2)\nprint(f\"Sentence embeddings: {emb1.shape}, {emb2.shape}\")\nprint(f\"Similarity: {sim.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Sentence embeddings: torch.Size([1, 64]), torch.Size([1, 64])\nSimilarity: 0.1223"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "739",
   "q": "Document Embedding with Hierarchical Attention",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass HierarchicalAttention(nn.Module):\n    def __init__(self, d_model=64):\n        super().__init__()\n        self.word_attn = nn.Linear(d_model, 1)\n        self.sent_attn = nn.Linear(d_model, 1)\n    \n    def forward(self, word_embeddings, num_sentences):\n        # Word-level attention within each sentence\n        word_weights = torch.softmax(self.word_attn(word_embeddings), dim=1)\n        sentence_embs = (word_weights * word_embeddings).sum(dim=1)\n        \n        # Sentence-level attention\n        sent_embs = sentence_embs.unsqueeze(0)  # Add batch\n        sent_weights = torch.softmax(self.sent_attn(sent_embs), dim=1)\n        doc_emb = (sent_weights * sent_embs).sum(dim=1)\n        return doc_emb\n\nmodel = HierarchicalAttention()\n# 3 sentences, each with 10 words, 64-dim embeddings\nword_embs = torch.randn(3, 10, 64)\ndoc_emb = model(word_embs, num_sentences=3)\nprint(f\"Word embeddings: {word_embs.shape}\")\nprint(f\"Document embedding: {doc_emb.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Word embeddings: torch.Size([3, 10, 64])\nDocument embedding: torch.Size([1, 64])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "740",
   "q": "Cross-Encoder vs Bi-Encoder",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\nclass BiEncoder(nn.Module):\n    \"\"\"Encodes query and doc separately — fast retrieval\"\"\"\n    def __init__(self, vocab_size=1000, dim=64):\n        super().__init__()\n        self.encoder = nn.Sequential(nn.Embedding(vocab_size, dim), nn.Flatten())\n        self.proj = nn.Linear(dim * 10, dim)  # Fixed seq length\n    \n    def encode(self, x):\n        return F.normalize(self.proj(self.encoder(x)), dim=-1)\n    \n    def forward(self, query, doc):\n        return F.cosine_similarity(self.encode(query), self.encode(doc))\n\nclass CrossEncoder(nn.Module):\n    \"\"\"Processes query+doc together — more accurate but slower\"\"\"\n    def __init__(self, vocab_size=1000, dim=64):\n        super().__init__()\n        self.embed = nn.Embedding(vocab_size, dim)\n        self.classifier = nn.Sequential(nn.Linear(dim * 20, 128), nn.ReLU(), nn.Linear(128, 1))\n    \n    def forward(self, query, doc):\n        combined = torch.cat([self.embed(query), self.embed(doc)], dim=1).flatten(1)\n        return torch.sigmoid(self.classifier(combined))\n\nq = torch.randint(0, 1000, (4, 10))\nd = torch.randint(0, 1000, (4, 10))\nprint(f\"Bi-Encoder score:    {BiEncoder()(q, d).shape}\")\nprint(f\"Cross-Encoder score: {CrossEncoder()(q, d).shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Bi-Encoder score:    torch.Size([4])\nCross-Encoder score: torch.Size([4, 1])"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
