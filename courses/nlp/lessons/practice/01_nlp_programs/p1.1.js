/* ============================================================================
   PRACTICE P1.1 — NLP and Text Processing Programs · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Sample_Programs/Part_08_NLP_and_Text_Processing.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.1",
 "lede": "**25 programs** from NLP and Text Processing Programs. Read the title, write the program yourself, then open the reference version and what it printed when it was run.",
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
   "n": "701",
   "q": "Text Preprocessing Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\ndef preprocess(text):\n    text = text.lower()\n    text = re.sub(r'http\\S+', '', text)           # Remove URLs\n    text = re.sub(r'[^a-zA-Z\\s]', '', text)       # Remove special chars\n    text = re.sub(r'\\s+', ' ', text).strip()       # Remove extra spaces\n    tokens = text.split()\n    return tokens\n\ntext = \"Check https://example.com! NLP is AWESOME #AI @2024\"\nprint(preprocess(text))\n# ['check', 'nlp', 'is', 'awesome', 'ai']"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "['check', 'nlp', 'is', 'awesome', 'ai']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "702",
   "q": "Bag of Words",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ndef bag_of_words(corpus):\n    vocab = set()\n    for doc in corpus:\n        vocab.update(doc.lower().split())\n    vocab = sorted(vocab)\n    \n    bow_matrix = []\n    for doc in corpus:\n        words = doc.lower().split()\n        counts = Counter(words)\n        bow_matrix.append([counts.get(w, 0) for w in vocab])\n    return bow_matrix, vocab\n\ncorpus = [\"I love NLP\", \"NLP is great\", \"I love deep learning\"]\nmatrix, vocab = bag_of_words(corpus)\nprint(f\"Vocab: {vocab}\")\nfor i, row in enumerate(matrix):\n    print(f\"Doc {i}: {row}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Vocab: ['deep', 'great', 'i', 'is', 'learning', 'love', 'nlp']\nDoc 0: [0, 0, 1, 0, 0, 1, 1]\nDoc 1: [0, 1, 0, 1, 0, 0, 1]\nDoc 2: [1, 0, 1, 0, 1, 1, 0]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "703",
   "q": "TF-IDF from Scratch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import math\nfrom collections import Counter\n\ndef compute_tfidf(corpus):\n    docs = [doc.lower().split() for doc in corpus]\n    vocab = sorted(set(w for doc in docs for w in doc))\n    N = len(docs)\n    \n    # IDF\n    idf = {}\n    for word in vocab:\n        df = sum(1 for doc in docs if word in doc)\n        idf[word] = math.log(N / (df + 1)) + 1\n    \n    # TF-IDF\n    tfidf_matrix = []\n    for doc in docs:\n        tf = Counter(doc)\n        total = len(doc)\n        row = [tf.get(w, 0) / total * idf[w] for w in vocab]\n        tfidf_matrix.append(row)\n    return tfidf_matrix, vocab\n\ncorpus = [\"the cat sat on the mat\", \"the dog sat on the log\", \"cats and dogs\"]\nmatrix, vocab = compute_tfidf(corpus)\nprint(f\"Vocab ({len(vocab)}): {vocab}\")\nfor i, row in enumerate(matrix):\n    top_words = sorted(zip(vocab, row), key=lambda x: -x[1])[:3]\n    print(f\"Doc {i} top words: {top_words}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Vocab (10): ['and', 'cat', 'cats', 'dog', 'dogs', 'log', 'mat', 'on', 'sat', 'the']\nDoc 0 top words: [('the', 0.3333333333333333), ('cat', 0.23424418468469405), ('mat', 0.23424418468469405)]\nDoc 1 top words: [('the', 0.3333333333333333), ('dog', 0.23424418468469405), ('log', 0.23424418468469405)]\nDoc 2 top words: [('and', 0.4684883693693881), ('cats', 0.4684883693693881), ('dogs', 0.4684883693693881)]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "704",
   "q": "Word2Vec Skip-gram (Simple)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass SkipGram(nn.Module):\n    def __init__(self, vocab_size, embed_dim):\n        super().__init__()\n        self.center_embed = nn.Embedding(vocab_size, embed_dim)\n        self.context_embed = nn.Embedding(vocab_size, embed_dim)\n    \n    def forward(self, center, context):\n        center_emb = self.center_embed(center)     # (batch, dim)\n        context_emb = self.context_embed(context)   # (batch, dim)\n        score = (center_emb * context_emb).sum(dim=1)\n        return torch.sigmoid(score)\n\nmodel = SkipGram(vocab_size=1000, embed_dim=64)\ncenter = torch.randint(0, 1000, (32,))\ncontext = torch.randint(0, 1000, (32,))\nscores = model(center, context)\nprint(f\"Skip-gram scores: {scores.shape}, range: [{scores.min():.4f}, {scores.max():.4f}]\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Skip-gram scores: torch.Size([32]), range: [0.0000, 1.0000]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "705",
   "q": "N-gram Language Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict, Counter\n\ndef build_ngram_model(text, n=2):\n    tokens = text.lower().split()\n    model = defaultdict(Counter)\n    for i in range(len(tokens) - n):\n        context = tuple(tokens[i:i+n-1])\n        next_word = tokens[i+n-1]\n        model[context][next_word] += 1\n    # Convert to probabilities\n    for context in model:\n        total = sum(model[context].values())\n        model[context] = {w: c/total for w, c in model[context].items()}\n    return model\n\ntext = \"the cat sat on the mat the cat ate the food the dog sat on the log\"\nmodel = build_ngram_model(text, n=2)\nfor context, probs in list(model.items())[:5]:\n    print(f\"{context} → {probs}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "('the',) → {'cat': 0.4, 'mat': 0.2, 'food': 0.2, 'dog': 0.2}\n('cat',) → {'sat': 0.5, 'ate': 0.5}\n('sat',) → {'on': 1.0}\n('on',) → {'the': 1.0}\n('mat',) → {'the': 1.0}"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "706",
   "q": "Text Classification with Naive Bayes (from scratch)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict, Counter\nimport math\n\nclass NaiveBayesClassifier:\n    def __init__(self):\n        self.class_counts = Counter()\n        self.word_counts = defaultdict(Counter)\n        self.vocab = set()\n    \n    def fit(self, texts, labels):\n        for text, label in zip(texts, labels):\n            self.class_counts[label] += 1\n            for word in text.lower().split():\n                self.word_counts[label][word] += 1\n                self.vocab.add(word)\n    \n    def predict(self, text):\n        words = text.lower().split()\n        scores = {}\n        total = sum(self.class_counts.values())\n        for label in self.class_counts:\n            score = math.log(self.class_counts[label] / total)\n            total_words = sum(self.word_counts[label].values())\n            for word in words:\n                count = self.word_counts[label].get(word, 0) + 1  # Laplace\n                score += math.log(count / (total_words + len(self.vocab)))\n            scores[label] = score\n        return max(scores, key=scores.get)\n\ntexts = [\"great movie loved it\", \"terrible waste of time\", \"amazing film beautiful\",\n         \"horrible acting bad plot\", \"wonderful story great cast\", \"awful boring slow\"]\nlabels = [\"pos\", \"neg\", \"pos\", \"neg\", \"pos\", \"neg\"]\n\nnb = NaiveBayesClassifier()\nnb.fit(texts, labels)\nprint(nb.predict(\"great film loved the cast\"))        # pos\nprint(nb.predict(\"terrible boring waste\"))             # neg"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "pos\nneg"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "707",
   "q": "Sentiment Analysis Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\nfrom collections import Counter\n\npositive_words = {\"good\", \"great\", \"excellent\", \"amazing\", \"wonderful\", \"love\", \"best\", \"happy\", \"fantastic\"}\nnegative_words = {\"bad\", \"terrible\", \"awful\", \"horrible\", \"worst\", \"hate\", \"boring\", \"poor\", \"ugly\"}\n\ndef sentiment_score(text):\n    words = set(re.sub(r'[^a-z\\s]', '', text.lower()).split())\n    pos = len(words & positive_words)\n    neg = len(words & negative_words)\n    total = pos + neg\n    if total == 0:\n        return 0.0, \"neutral\"\n    score = (pos - neg) / total\n    label = \"positive\" if score > 0 else (\"negative\" if score < 0 else \"neutral\")\n    return score, label\n\nreviews = [\n    \"This movie is great and amazing!\",\n    \"Terrible acting and horrible plot\",\n    \"The weather is okay today\",\n    \"Best restaurant, excellent food, love it\"\n]\nfor review in reviews:\n    score, label = sentiment_score(review)\n    print(f\"{label:>8s} ({score:+.2f}): {review}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "positive (+1.00): This movie is great and amazing!\nnegative (-1.00): Terrible acting and horrible plot\n neutral (+0.00): The weather is okay today\npositive (+1.00): Best restaurant, excellent food, love it"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "708",
   "q": "Named Entity Recognition (Rule-based)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\ndef extract_entities(text):\n    entities = {\n        'EMAIL': re.findall(r'\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b', text),\n        'PHONE': re.findall(r'\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', text),\n        'URL': re.findall(r'https?://\\S+', text),\n        'DATE': re.findall(r'\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b', text),\n        'MONEY': re.findall(r'\\$[\\d,]+\\.?\\d*', text),\n        'HASHTAG': re.findall(r'#\\w+', text),\n    }\n    return {k: v for k, v in entities.items() if v}\n\ntext = \"\"\"Contact john@example.com or call 555-123-4567.\nVisit https://example.com for deals! Sale ends 12/25/2024.\nPrice: $49.99 #BlackFriday #Sale\"\"\"\n\nentities = extract_entities(text)\nfor etype, values in entities.items():\n    print(f\"{etype}: {values}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "EMAIL: ['john@example.com']\nPHONE: ['555-123-4567']\nURL: ['https://example.com']\nDATE: ['12/25/2024']\nMONEY: ['$49.99']\nHASHTAG: ['#BlackFriday', '#Sale']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "709",
   "q": "Levenshtein Distance (Edit Distance)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def levenshtein(s1, s2):\n    m, n = len(s1), len(s2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(m + 1):\n        dp[i][0] = i\n    for j in range(n + 1):\n        dp[0][j] = j\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            cost = 0 if s1[i-1] == s2[j-1] else 1\n            dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost)\n    return dp[m][n]\n\npairs = [(\"kitten\", \"sitting\"), (\"saturday\", \"sunday\"), (\"python\", \"pytorch\")]\nfor a, b in pairs:\n    print(f\"'{a}' → '{b}': {levenshtein(a, b)} edits\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "'kitten' → 'sitting': 3 edits\n'saturday' → 'sunday': 3 edits\n'python' → 'pytorch': 4 edits"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "710",
   "q": "Text Similarity (Jaccard & Cosine)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\nimport math\n\ndef jaccard_similarity(text1, text2):\n    s1, s2 = set(text1.lower().split()), set(text2.lower().split())\n    return len(s1 & s2) / len(s1 | s2)\n\ndef cosine_similarity_text(text1, text2):\n    c1, c2 = Counter(text1.lower().split()), Counter(text2.lower().split())\n    words = set(c1) | set(c2)\n    dot = sum(c1.get(w, 0) * c2.get(w, 0) for w in words)\n    mag1 = math.sqrt(sum(v**2 for v in c1.values()))\n    mag2 = math.sqrt(sum(v**2 for v in c2.values()))\n    return dot / (mag1 * mag2) if mag1 and mag2 else 0\n\nt1 = \"machine learning is great\"\nt2 = \"deep learning is awesome\"\nprint(f\"Jaccard: {jaccard_similarity(t1, t2):.4f}\")\nprint(f\"Cosine:  {cosine_similarity_text(t1, t2):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Jaccard: 0.3333\nCosine:  0.5000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "711",
   "q": "BPE Tokenizer (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ndef get_pairs(word):\n    return [(word[i], word[i+1]) for i in range(len(word)-1)]\n\ndef bpe_train(corpus, num_merges=10):\n    vocab = Counter()\n    for word in corpus:\n        vocab[' '.join(word) + ' </w>'] += 1\n    \n    merges = []\n    for _ in range(num_merges):\n        pairs = Counter()\n        for word, count in vocab.items():\n            symbols = word.split()\n            for i in range(len(symbols)-1):\n                pairs[(symbols[i], symbols[i+1])] += count\n        if not pairs:\n            break\n        best = max(pairs, key=pairs.get)\n        merges.append(best)\n        new_vocab = {}\n        bigram = ' '.join(best)\n        replacement = ''.join(best)\n        for word in vocab:\n            new_word = word.replace(bigram, replacement)\n            new_vocab[new_word] = vocab[word]\n        vocab = new_vocab\n    return merges, vocab\n\ncorpus = [\"low\", \"lower\", \"lowest\", \"new\", \"newer\", \"newest\"]\nmerges, vocab = bpe_train(corpus, num_merges=5)\nprint(\"Merges:\")\nfor m in merges:\n    print(f\"  {m[0]} + {m[1]} → {''.join(m)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Merges:\n  w + e → we\n  l + o → lo\n  n + e → ne\n  w + </w> → w</w>\n  lo + we → lowe"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "712",
   "q": "BLEU Score",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\nimport math\n\ndef ngrams(tokens, n):\n    return [tuple(tokens[i:i+n]) for i in range(len(tokens)-n+1)]\n\ndef bleu_score(reference, candidate, max_n=4):\n    ref_tokens = reference.lower().split()\n    cand_tokens = candidate.lower().split()\n    \n    brevity_penalty = min(1.0, math.exp(1 - len(ref_tokens) / len(cand_tokens)))\n    \n    precisions = []\n    for n in range(1, max_n + 1):\n        ref_ngrams = Counter(ngrams(ref_tokens, n))\n        cand_ngrams = Counter(ngrams(cand_tokens, n))\n        clipped = sum(min(cand_ngrams[ng], ref_ngrams[ng]) for ng in cand_ngrams)\n        total = max(sum(cand_ngrams.values()), 1)\n        precisions.append(clipped / total)\n    \n    log_avg = sum(math.log(p + 1e-10) for p in precisions) / len(precisions)\n    return brevity_penalty * math.exp(log_avg)\n\nref = \"the cat is on the mat\"\ncand1 = \"the cat sits on the mat\"\ncand2 = \"a dog sits on a log\"\nprint(f\"BLEU (good): {bleu_score(ref, cand1):.4f}\")\nprint(f\"BLEU (bad):  {bleu_score(ref, cand2):.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "BLEU (good): 0.0019\nBLEU (bad):  0.0000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "713",
   "q": "ROUGE Score (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def rouge_n(reference, hypothesis, n=1):\n    def get_ngrams(text, n):\n        tokens = text.lower().split()\n        return [tuple(tokens[i:i+n]) for i in range(len(tokens)-n+1)]\n    \n    ref_ngrams = get_ngrams(reference, n)\n    hyp_ngrams = get_ngrams(hypothesis, n)\n    \n    overlap = len(set(ref_ngrams) & set(hyp_ngrams))\n    precision = overlap / len(hyp_ngrams) if hyp_ngrams else 0\n    recall = overlap / len(ref_ngrams) if ref_ngrams else 0\n    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0\n    \n    return {'precision': precision, 'recall': recall, 'f1': f1}\n\nref = \"the cat is sitting on the mat\"\nhyp = \"the cat sat on the mat quietly\"\nfor n in [1, 2]:\n    scores = rouge_n(ref, hyp, n=n)\n    print(f\"ROUGE-{n}: P={scores['precision']:.3f} R={scores['recall']:.3f} F1={scores['f1']:.3f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "ROUGE-1: P=0.571 R=0.571 F1=0.571\nROUGE-2: P=0.500 R=0.500 F1=0.500"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "714",
   "q": "Text Summarization (Extractive)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ndef extractive_summary(text, num_sentences=2):\n    sentences = text.split('. ')\n    words = text.lower().split()\n    word_freq = Counter(words)\n    \n    # Score sentences by word frequency\n    scores = []\n    for sent in sentences:\n        score = sum(word_freq.get(w.lower(), 0) for w in sent.split())\n        scores.append((score, sent))\n    \n    # Take top sentences in original order\n    top = sorted(scores, key=lambda x: -x[0])[:num_sentences]\n    top_sents = set(s[1] for s in top)\n    summary = [s for s in sentences if s in top_sents]\n    return '. '.join(summary)\n\ntext = \"\"\"Natural language processing is a field of AI. It deals with text and speech. \nNLP uses machine learning algorithms. Deep learning has improved NLP significantly. \nTransformers are the backbone of modern NLP. BERT and GPT are popular transformer models\"\"\"\nprint(extractive_summary(text, 2))"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Transformers are the backbone of modern NLP. BERT and GPT are popular transformer models"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "715",
   "q": "Spell Checker",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ndef build_spell_checker(words):\n    word_freq = Counter(words)\n    \n    def candidates(word):\n        alphabet = 'abcdefghijklmnopqrstuvwxyz'\n        splits = [(word[:i], word[i:]) for i in range(len(word)+1)]\n        deletes = [a + b[1:] for a, b in splits if b]\n        transposes = [a + b[1] + b[0] + b[2:] for a, b in splits if len(b) > 1]\n        replaces = [a + c + b[1:] for a, b in splits if b for c in alphabet]\n        inserts = [a + c + b for a, b in splits for c in alphabet]\n        return set(deletes + transposes + replaces + inserts)\n    \n    def correct(word):\n        word = word.lower()\n        if word in word_freq:\n            return word\n        cands = [w for w in candidates(word) if w in word_freq]\n        return max(cands, key=word_freq.get) if cands else word\n    \n    return correct\n\nknown_words = \"the quick brown fox jumps over the lazy dog python machine learning\".split()\nspell = build_spell_checker(known_words * 10)\nfor word in [\"pythn\", \"machne\", \"learing\"]:\n    print(f\"'{word}' → '{spell(word)}'\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "'pythn' → 'python'\n'machne' → 'machine'\n'learing' → 'learning'"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "716",
   "q": "Keyword Extraction (TF-IDF based)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import math\nfrom collections import Counter\n\ndef extract_keywords(doc, corpus, top_k=5):\n    words = doc.lower().split()\n    tf = Counter(words)\n    total = len(words)\n    \n    keywords = []\n    stop_words = {\"the\", \"is\", \"a\", \"an\", \"in\", \"on\", \"at\", \"to\", \"for\", \"of\", \"and\", \"it\", \"with\"}\n    for word in set(words) - stop_words:\n        tf_score = tf[word] / total\n        df = sum(1 for d in corpus if word in d.lower())\n        idf = math.log(len(corpus) / (df + 1)) + 1\n        keywords.append((word, tf_score * idf))\n    \n    return sorted(keywords, key=lambda x: -x[1])[:top_k]\n\ncorpus = [\n    \"machine learning algorithms for data analysis\",\n    \"deep learning neural networks for image recognition\",\n    \"natural language processing with transformers\"\n]\nfor i, doc in enumerate(corpus):\n    kw = extract_keywords(doc, corpus, top_k=3)\n    print(f\"Doc {i}: {[(w, round(s, 4)) for w, s in kw]}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Doc 0: [('data', 0.2342), ('machine', 0.2342), ('analysis', 0.2342)]\nDoc 1: [('neural', 0.2008), ('deep', 0.2008), ('networks', 0.2008)]\nDoc 2: [('transformers', 0.2811), ('language', 0.2811), ('processing', 0.2811)]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "717",
   "q": "Language Detection (Character N-gram)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ndef create_profile(text, n=3):\n    text = text.lower()\n    ngrams = [text[i:i+n] for i in range(len(text)-n+1)]\n    return Counter(ngrams)\n\ndef detect_language(text, profiles):\n    text_profile = create_profile(text)\n    scores = {}\n    for lang, profile in profiles.items():\n        common = set(text_profile) & set(profile)\n        scores[lang] = sum(min(text_profile[ng], profile[ng]) for ng in common)\n    return max(scores, key=scores.get)\n\n# Build profiles\nprofiles = {\n    'english': create_profile(\"the quick brown fox jumps over the lazy dog \" * 10),\n    'spanish': create_profile(\"el rápido zorro marrón salta sobre el perro perezoso \" * 10),\n    'french': create_profile(\"le rapide renard brun saute par dessus le chien paresseux \" * 10),\n}\n\ntests = [\"the cat is on the mat\", \"el gato está en la mesa\", \"le chat est sur la table\"]\nfor t in tests:\n    print(f\"'{t}' → {detect_language(t, profiles)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "'the cat is on the mat' → english\n'el gato está en la mesa' → spanish\n'le chat est sur la table' → french"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "718",
   "q": "Text Augmentation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import random\n\ndef synonym_replace(text, synonyms, n=1):\n    words = text.split()\n    for _ in range(n):\n        idx = random.randint(0, len(words)-1)\n        if words[idx].lower() in synonyms:\n            words[idx] = random.choice(synonyms[words[idx].lower()])\n    return ' '.join(words)\n\ndef random_insertion(text, word_pool, n=1):\n    words = text.split()\n    for _ in range(n):\n        words.insert(random.randint(0, len(words)), random.choice(word_pool))\n    return ' '.join(words)\n\ndef random_deletion(text, p=0.1):\n    words = text.split()\n    return ' '.join(w for w in words if random.random() > p) or words[0]\n\nsynonyms = {\"good\": [\"great\", \"excellent\", \"nice\"], \"fast\": [\"quick\", \"rapid\", \"swift\"]}\ntext = \"this is a good and fast model\"\nprint(f\"Original:  {text}\")\nprint(f\"Synonym:   {synonym_replace(text, synonyms)}\")\nprint(f\"Inserted:  {random_insertion(text, ['very', 'really'], n=2)}\")\nprint(f\"Deleted:   {random_deletion(text, p=0.3)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original:  this is a good and fast model\nSynonym:   this is a good and fast model\nInserted:  this is really really a good and fast model\nDeleted:   this is a good and fast model"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "719",
   "q": "Semantic Similarity with Embeddings",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\ndef sentence_embedding(text, embed_layer, vocab):\n    tokens = text.lower().split()\n    ids = [vocab.get(w, 0) for w in tokens]\n    embeddings = embed_layer(torch.tensor(ids))\n    return embeddings.mean(dim=0)\n\nvocab = {w: i+1 for i, w in enumerate(\"machine learning deep neural network nlp text\".split())}\nvocab['<unk>'] = 0\nembed = nn.Embedding(len(vocab)+1, 32)\n\ns1 = sentence_embedding(\"machine learning\", embed, vocab)\ns2 = sentence_embedding(\"deep learning\", embed, vocab)\ns3 = sentence_embedding(\"neural network\", embed, vocab)\n\ncos_sim = F.cosine_similarity\nprint(f\"'machine learning' vs 'deep learning': {cos_sim(s1.unsqueeze(0), s2.unsqueeze(0)).item():.4f}\")\nprint(f\"'machine learning' vs 'neural network': {cos_sim(s1.unsqueeze(0), s3.unsqueeze(0)).item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "'machine learning' vs 'deep learning': 0.7043\n'machine learning' vs 'neural network': -0.1788"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "720",
   "q": "Beam Search Decoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn.functional as F\n\ndef beam_search(logits_fn, start_token, max_len=10, beam_width=3, vocab_size=50):\n    beams = [(0.0, [start_token])]  # (score, sequence)\n    \n    for _ in range(max_len):\n        all_candidates = []\n        for score, seq in beams:\n            logits = logits_fn(seq)\n            log_probs = F.log_softmax(logits, dim=-1)\n            top_k = torch.topk(log_probs, beam_width)\n            for i in range(beam_width):\n                new_score = score + top_k.values[i].item()\n                new_seq = seq + [top_k.indices[i].item()]\n                all_candidates.append((new_score, new_seq))\n        beams = sorted(all_candidates, key=lambda x: -x[0])[:beam_width]\n    \n    return beams[0]  # Best beam\n\n# Simple logits function\ndef mock_logits(seq):\n    return torch.randn(50)\n\nbest_score, best_seq = beam_search(mock_logits, start_token=1, max_len=5, beam_width=3)\nprint(f\"Best score: {best_score:.4f}\")\nprint(f\"Best sequence: {best_seq}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Best score: -9.0654\nBest sequence: [1, 16, 42, 21, 18, 2]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "721",
   "q": "Text Generation with Temperature Sampling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn.functional as F\n\ndef sample_with_temperature(logits, temperature=1.0, top_k=0, top_p=0.0):\n    logits = logits / temperature\n    \n    # Top-k filtering\n    if top_k > 0:\n        top_values, _ = torch.topk(logits, top_k)\n        logits[logits < top_values[-1]] = float('-inf')\n    \n    # Top-p (nucleus) filtering\n    if top_p > 0:\n        sorted_logits, sorted_indices = torch.sort(logits, descending=True)\n        cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)\n        mask = cumulative_probs > top_p\n        mask[..., 1:] = mask[..., :-1].clone()\n        mask[..., 0] = 0\n        logits[sorted_indices[mask]] = float('-inf')\n    \n    probs = F.softmax(logits, dim=-1)\n    return torch.multinomial(probs, 1).item()\n\nlogits = torch.randn(100)\nprint(\"Temperature sampling:\")\nfor temp in [0.1, 0.5, 1.0, 2.0]:\n    tokens = [sample_with_temperature(logits.clone(), temperature=temp) for _ in range(5)]\n    print(f\"  T={temp}: {tokens}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Temperature sampling:\n  T=0.1: [98, 98, 98, 98, 98]\n  T=0.5: [88, 98, 16, 4, 98]\n  T=1.0: [64, 27, 96, 16, 95]\n  T=2.0: [89, 88, 16, 48, 98]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "722",
   "q": "Attention Visualization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport math\n\ndef attention_with_viz(Q, K, V, mask=None):\n    d_k = Q.size(-1)\n    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)\n    if mask is not None:\n        scores = scores.masked_fill(mask == 0, float('-inf'))\n    weights = torch.softmax(scores, dim=-1)\n    output = torch.matmul(weights, V)\n    return output, weights\n\nseq_len, d = 5, 16\nwords = [\"The\", \"cat\", \"sat\", \"on\", \"mat\"]\nQ = K = V = torch.randn(1, seq_len, d)\n_, attn = attention_with_viz(Q, K, V)\n\nprint(\"Attention matrix:\")\nprint(f\"{'':>6}\", end=\"\")\nfor w in words:\n    print(f\"{w:>6}\", end=\"\")\nprint()\nfor i, w in enumerate(words):\n    print(f\"{w:>6}\", end=\"\")\n    for j in range(seq_len):\n        print(f\"{attn[0, i, j]:.3f} \", end=\"\")\n    print()"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Attention matrix:\n         The   cat   sat    on   mat\n   The0.963 0.010 0.020 0.004 0.002 \n   cat0.118 0.804 0.041 0.007 0.030 \n   sat0.099 0.017 0.850 0.028 0.006 \n    on0.006 0.001 0.010 0.977 0.006 \n   mat0.017 0.018 0.008 0.021 0.936"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "723",
   "q": "Masked Language Model (MLM)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport random\n\nclass SimpleMLM(nn.Module):\n    def __init__(self, vocab_size, d_model=64):\n        super().__init__()\n        self.embedding = nn.Embedding(vocab_size, d_model)\n        self.encoder = nn.TransformerEncoderLayer(d_model, nhead=4, batch_first=True)\n        self.head = nn.Linear(d_model, vocab_size)\n    \n    def forward(self, x):\n        emb = self.embedding(x)\n        encoded = self.encoder(emb)\n        return self.head(encoded)\n\ndef mask_tokens(input_ids, mask_prob=0.15, mask_token=0):\n    masked = input_ids.clone()\n    mask_positions = torch.rand(masked.shape) < mask_prob\n    masked[mask_positions] = mask_token\n    return masked, mask_positions\n\nvocab_size = 100\nmodel = SimpleMLM(vocab_size)\ninput_ids = torch.randint(1, vocab_size, (4, 20))\nmasked_input, mask_pos = mask_tokens(input_ids)\nlogits = model(masked_input)\nprint(f\"Input: {input_ids.shape}, Logits: {logits.shape}\")\nprint(f\"Masked positions: {mask_pos.sum().item()}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 20]), Logits: torch.Size([4, 20, 100])\nMasked positions: 21"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "724",
   "q": "Causal (Autoregressive) Attention Mask",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\ndef causal_mask(size):\n    mask = torch.triu(torch.ones(size, size), diagonal=1)\n    return mask == 0  # True = attend, False = mask\n\nmask = causal_mask(5)\nprint(\"Causal mask (True = can attend):\")\nwords = [\"I\", \"love\", \"deep\", \"learn\", \"ing\"]\nfor i, w in enumerate(words):\n    attended = [words[j] for j in range(5) if mask[i, j]]\n    print(f\"  '{w}' can see: {attended}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Causal mask (True = can attend):\n  'I' can see: ['I']\n  'love' can see: ['I', 'love']\n  'deep' can see: ['I', 'love', 'deep']\n  'learn' can see: ['I', 'love', 'deep', 'learn']\n  'ing' can see: ['I', 'love', 'deep', 'learn', 'ing']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "725",
   "q": "Perplexity Calculation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport math\n\ndef perplexity(log_probs):\n    avg_neg_log_prob = -log_probs.mean().item()\n    return math.exp(avg_neg_log_prob)\n\n# Simulate model predictions\ntorch.manual_seed(42)\ngood_model_probs = torch.log(torch.tensor([0.8, 0.7, 0.9, 0.6, 0.85]))\nbad_model_probs = torch.log(torch.tensor([0.1, 0.2, 0.15, 0.05, 0.3]))\n\nprint(f\"Good model perplexity: {perplexity(good_model_probs):.2f}\")\nprint(f\"Bad model perplexity:  {perplexity(bad_model_probs):.2f}\")\nprint(\"Lower perplexity = better model\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Good model perplexity: 1.31\nBad model perplexity:  7.40\nLower perplexity = better model"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
