/* ============================================================================
   LESSON 3.13 — Embeddings, and RNN against Transformer
   Mirrors 03_Sequence_Models.md · §15–§18. Attention memory, KV cache size,
   the embedding-as-matrix identity and the analogy geometry are all computed
   (scratchpad/dl/d313.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.13",

  lede: "**Two questions close this module: what goes into a sequence model, and whether it should be recurrent at all.** The input is almost always an embedding — a dense vector per token, learned rather than assigned, which is exactly a one-hot vector times a matrix with the multiplication skipped. The architecture question has a clear default (transformers) and a set of cases where recurrence still wins, all of which come down to one number: an RNN's state is O(1) and attention's is O(n²).",

  objectives: [
    "Explain what `nn.Embedding` computes and why dense beats one-hot",
    "Describe Word2Vec, GloVe and FastText and what each addresses",
    "Use pretrained embeddings and decide whether to freeze them",
    "Compare RNN and transformer cost, and identify where each wins",
    "Name the cases where a recurrent model is still the right choice"
  ],

  prerequisites: ["3.12", "3.8"],

  blocks: [

    { t: "h2", n: "01", text: "What an embedding is", id: "embedding" },

    { t: "out", text: `  embedding lookup  : (3, 64)  (64,000 params = V x E)
  one-hot @ weight  : identical? True
  same index gives same vector: True` },

    { t: "callout", kind: "insight", title: "An embedding layer is a linear layer with the multiplication skipped",
      body: [{ t: "p", text: "`nn.Embedding(V, E)` holds a `V × E` matrix, and looking up index `i` returns row `i` — which is identical to multiplying a one-hot vector by that matrix, verified exactly above. The lookup exists purely because multiplying by a one-hot vector is a wasteful way to select a row. This equivalence explains a few things at once: why embeddings are trainable like any other weights, why the gradient reaches only the rows actually used in a batch, and why tying input and output embeddings in a language model is a sensible thing to do rather than a trick." }] },

    { t: "out", text: `  vocab    10,000: one-hot needs    10,000 dims; a 300-d embedding needs 300 (33x smaller)
  vocab   100,000: one-hot needs   100,000 dims; a 300-d embedding needs 300 (333x smaller)
  vocab 1,000,000: one-hot needs 1,000,000 dims; a 300-d embedding needs 300 (3,333x smaller)` },

    { t: "p", text: "Size is the lesser argument. The decisive one is that **all one-hot vectors are equidistant** — `cat` is exactly as far from `dog` as from `Tuesday`, so a one-hot representation encodes no similarity whatsoever and every word must be learned about independently. A dense space can place related words near each other, so what the model learns about one transfers to its neighbours." },

    { t: "h2", n: "02", text: "The analogy, geometrically", id: "analogy" },

    { t: "p", text: "In a space deliberately constructed so that *gender* is a consistent offset vector, `king − man + woman` should land on `queen`:" },

    { t: "out", text: `    cos(king - man + woman, king  ) = +0.6758
    cos(king - man + woman, queen ) = +1.0000
    cos(king - man + woman, man   ) = +0.3319
    cos(king - man + woman, woman ) = +0.6201
    cos(king - man + woman, apple ) = +0.0856` },

    { t: "callout", kind: "note", title: "This space was constructed, not learned",
      body: [{ t: "p", text: "The cosine of exactly 1.0000 for `queen` is not evidence about real embeddings — I built the space so the relation held, precisely to isolate the geometric claim: analogies work when a relation is a consistent *translation* in the vector space. What is genuine is that Word2Vec and GloVe do learn approximately this structure from co-occurrence statistics alone, with nothing about gender or royalty supplied. It is worth adding that the famous result is weaker than usually presented — later analysis showed the standard evaluation excludes the input words from the candidate answers, and without that exclusion `king` itself is often the nearest vector, as the 0.676 above hints." }] },

    { t: "h2", n: "03", text: "Where embeddings come from", id: "methods" },

    { t: "table", head: ["Method", "Idea", "Handles OOV?"],
      rows: [
        ["Word2Vec skip-gram", "Predict context words from the centre word; negative sampling", "No"],
        ["Word2Vec CBOW", "Predict the centre word from its context. Faster, slightly worse on rare words", "No"],
        ["GloVe", "Factorise a global co-occurrence matrix — global statistics plus local context", "No"],
        ["FastText", "Word2Vec over character n-grams, summed", "**Yes**"]
      ] },

    { t: "out", text: `  word2vec/GloVe lookup 'cat   ' -> index 0
  word2vec/GloVe lookup 'dogs  ' -> index 2 (<unk>) - all information lost
  word2vec/GloVe lookup 'xyzzy ' -> index 2 (<unk>) - all information lost` },

    { t: "p", text: "Out-of-vocabulary handling is the practical difference. A word not in the training vocabulary maps to `<unk>` and every word so mapped becomes indistinguishable — including morphological variants of words you *do* know. FastText represents a word as the sum of its character n-grams, so `dogs` shares most of its n-grams with `dog` and an entirely unseen word still gets a meaningful vector. This is the same motivation behind subword tokenisation (BPE, WordPiece) in modern transformers." },

    { t: "code", lang: "python", title: "Loading pretrained vectors",
      code: `embedding = nn.Embedding(vocab_size, 100)
embedding.weight.data.copy_(pretrained_glove_tensor)
embedding.weight.requires_grad = False     # freeze, or True to fine-tune`,
      caption: "Freeze on a small dataset — the embedding matrix is often the largest parameter block in the model and will overfit. Fine-tune when you have enough data or a domain far from the pretraining corpus." },

    { t: "h2", n: "04", text: "RNN against transformer", id: "comparison" },

    { t: "table", head: ["Aspect", "RNN / LSTM / GRU", "Transformer"],
      rows: [
        ["Computation", "Sequential — O(n) steps", "Parallel — O(1) depth"],
        ["Long-range path", "O(n) hops, decaying", "O(1) — direct attention"],
        ["Memory", "O(1) state per step", "O(n²) attention matrix"],
        ["Training speed", "Slow — inherently sequential", "Fast — fully parallel"],
        ["Position", "Built into the recurrence", "Must be injected"],
        ["Inductive bias", "Sequential, local", "None — data-hungry"],
        ["Pretrained models", "Few", "BERT, GPT, T5, and everything since"]
      ] },

    { t: "out", text: `  T=   512: attention matrix =     0.01 GB (batch 1, 8 heads, fp32)
  T=  2048: attention matrix =     0.13 GB
  T=  8192: attention matrix =     2.15 GB
  T= 32768: attention matrix =    34.36 GB` },

    { t: "callout", kind: "crit", title: "Quadratic memory is the wall",
      body: [{ t: "p", text: "**34 GB for a single sequence of 32,768 tokens at batch size 1.** The attention matrix is `T × T` per head, so doubling the context quadruples the memory, and it is memory rather than arithmetic that stops you. This is why long-context work is overwhelmingly about *not materialising that matrix* — FlashAttention computes it in tiles that stay in fast on-chip memory, and the sparse and linear attention families approximate it. An LSTM at 32,768 tokens needs a fixed-size hidden state and would be perfectly comfortable, just slow and forgetful." }] },

    { t: "out", text: `  after 5 steps the entire state is h (1, 128) + c (1, 128) = 256 floats

  a transformer must keep a KV cache: 2 * n_layers * T * d per sequence
    T=  100: KV cache ~      3.7 MB   (12 layers, d=768, fp16)
    T= 1000: KV cache ~     36.9 MB
    T=10000: KV cache ~    368.6 MB` },

    { t: "p", text: "This is the streaming argument. An LSTM processing a live audio feed carries 256 floats no matter how long the stream runs. A transformer generating token by token must keep every previous key and value — 369 MB per sequence at 10,000 tokens — which is why serving many concurrent long conversations is a memory problem, and why techniques like grouped-query attention exist." },

    { t: "diagram", kind: "compare", title: "Choosing",
      caption: "The default is a transformer. The exceptions are real and specific.",
      columns: [
        { title: "Still use recurrence when", tone: "accent", items: [
          "Streaming or online — one token at a time, bounded state",
          "Very long sequences where O(n²) is prohibitive",
          "Edge devices with a hard memory budget",
          "Simple time series with short dependencies",
          "No pretrained model exists for your domain"
        ] },
        { title: "Use a transformer when", tone: "good", items: [
          "Any NLP task — essentially always",
          "Pretrained weights exist, which for text they do",
          "You have GPUs and want parallel training",
          "Long-range dependencies matter",
          "Vision with a large dataset (ViT)"
        ] }
      ] },

    { t: "exercise", kind: "practice", title: "Measure the crossover", difficulty: "intermediate", minutes: 40,
      prompt: "Benchmark an LSTM and a transformer encoder layer of comparable size at sequence lengths 32, 128, 512, 2048 and 8192, recording both time and peak memory. Find the length where the transformer's memory becomes the binding constraint on your hardware. Then verify the embedding identity — that `nn.Embedding(idx)` equals one-hot times the weight matrix — and train a small classifier three ways: random embeddings, frozen pretrained, and fine-tuned pretrained, on both a small and a large training set.",
      hints: [
        "Use `torch.cuda.max_memory_allocated()` if on GPU, or track tensor sizes analytically on CPU.",
        "Keep parameter counts roughly matched so the comparison is about architecture.",
        "The embedding comparison should differ by one or two data-set sizes, not just one."
      ],
      solution: {
        notes: [
          { t: "p", text: "The memory curves are the point: the LSTM's grows linearly with length while the transformer's grows quadratically, so they cross somewhere and after that the transformer simply cannot run. Computing where that happens on your own hardware is more useful than any general rule, because it tells you exactly when you need FlashAttention or a sparse variant rather than guessing." },
          { t: "p", text: "On embeddings, the expected pattern is that frozen pretrained wins clearly on the small dataset and fine-tuned wins on the large one, with random embeddings worst on both but closing the gap as data grows. The reason frozen wins when data is scarce is capacity: the embedding matrix is frequently the largest parameter block in the whole model — at 50,000 words by 300 dimensions it is 15 million parameters — so unfreezing it on a few thousand examples is inviting it to memorise. This is the same size-versus-data argument as lesson 2.5's transfer learning strategy table." },
          { t: "p", text: "The one-hot identity is worth verifying once because it demystifies the layer permanently. Once you have seen that they agree exactly, the fact that gradients only reach the rows used in a batch, and that input and output embeddings can be tied in a language model, both follow without needing to be memorised separately." }
        ]
      } }

  ],

  takeaways: [
    "`nn.Embedding` is a `V × E` matrix with row lookup — verified identical to one-hot times that matrix.",
    "One-hot vectors are all equidistant, so they encode no similarity; dense vectors let learning transfer between related words.",
    "Word2Vec and GloVe cannot handle out-of-vocabulary words; FastText can, via character n-grams.",
    "Freeze pretrained embeddings on small datasets — the matrix is often the model's largest parameter block.",
    "Attention memory is quadratic: 34.36 GB for one sequence of 32,768 tokens at 8 heads in fp32.",
    "An LSTM's state is 256 floats regardless of stream length; a transformer's KV cache reaches 369 MB at 10,000 tokens.",
    "Default to transformers; keep recurrence for streaming, very long sequences, and hard memory budgets."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does `nn.Embedding` actually compute?",
      options: ["A learned nonlinear transformation", "A row lookup in a V × E matrix, identical to one-hot times that matrix", "A hash of the token", "A frequency-weighted average"],
      answer: 1,
      why: "Verified exactly: `emb(idx)` equals `onehot @ emb.weight`. The lookup exists only because multiplying by a one-hot vector is a wasteful way to select a row. This also explains why gradients reach only the rows used in a batch, and why tying input and output embeddings makes sense." },
    { stem: "Why are dense embeddings better than one-hot encoding?",
      options: ["They use less memory", "All one-hot vectors are equidistant, so they encode no similarity between words", "They train faster", "They handle OOV words"],
      answer: 1,
      why: "Memory is the lesser argument. The decisive one is geometric: in a one-hot space `cat` is exactly as far from `dog` as from `Tuesday`, so nothing learned about one word transfers to a related one. Dense spaces place similar words near each other, which is what makes generalisation across vocabulary possible." },
    { stem: "Which embedding method handles out-of-vocabulary words?",
      options: ["Word2Vec skip-gram", "GloVe", "FastText", "CBOW"],
      answer: 2,
      why: "FastText represents a word as the sum of its character n-gram vectors, so an unseen word still gets a meaningful representation and `dogs` shares most of its n-grams with `dog`. The others map anything outside the vocabulary to `<unk>`, making all such words indistinguishable — the same problem subword tokenisation solves in modern transformers." },
    { stem: "When is a recurrent model still preferable to a transformer?",
      options: ["Never", "Streaming inference and very long sequences where O(n²) attention memory is prohibitive", "All NLP tasks", "Whenever the dataset is large"],
      answer: 1,
      why: "An LSTM carries a fixed 256-float state however long the stream runs, while a transformer's attention matrix reaches 34 GB at 32,768 tokens and its KV cache reaches 369 MB at 10,000. For bounded-memory streaming and extreme sequence lengths recurrence still wins; for essentially everything else in NLP, pretrained transformers dominate." }
  ] },

  interview: { title: "Interview", sub: "Embeddings and architecture choice", questions: [
    { level: "Core", q: "What are word embeddings and why are they used?",
      strong: "Dense learned vectors where geometric proximity encodes semantic similarity; one-hot encodes none.",
      answer: [{ t: "p", text: "An embedding maps each token to a dense vector, learned rather than assigned. Mechanically it is a lookup in a V × E matrix, which is exactly a one-hot vector times that matrix with the multiplication skipped — I have verified the two give identical results. The reason to use them is not primarily size, although a 300-dimensional vector against a million-dimensional one-hot is a real saving. It is that one-hot vectors are all equidistant from each other, so the representation encodes nothing about which words are related and everything must be learned independently for each word. A dense space can place `cat` near `dog`, so what the model learns about one transfers. That transfer is what makes learning from limited text feasible at all." }] },
    { level: "Senior", q: "When would you still use an RNN over a transformer?",
      strong: "Streaming with bounded state, very long sequences, and tight memory budgets.",
      answer: [{ t: "p", text: "The decisive number is state size. An LSTM carries a fixed hidden and cell state — 256 floats in a setup I measured — regardless of how long the stream has been running, so it processes one token at a time in constant memory. That makes it genuinely well suited to streaming speech or online time series where you cannot wait for the sequence to end. A transformer has to keep a KV cache that grows with context, reaching around 369 MB per sequence at 10,000 tokens for a 12-layer model, and its attention matrix is quadratic — 34 GB for a single 32,768-token sequence at batch size 1. So for extremely long sequences or hard memory budgets, recurrence is still the answer unless you bring in FlashAttention or a sparse variant. Beyond those cases I would default to a transformer, mainly because pretrained weights exist for essentially every text task and will beat anything I train from scratch." }] },
    { level: "Senior", q: "Would you freeze or fine-tune pretrained embeddings?",
      strong: "Freeze on small datasets — the embedding matrix is usually the largest parameter block.",
      answer: [{ t: "p", text: "It is the same calculation as lesson 2.5's transfer learning strategy: how much data do I have, and how far is my domain from the pretraining corpus. The thing people underestimate is size — a 50,000-word vocabulary at 300 dimensions is 15 million parameters, frequently more than the rest of the model combined. Unfreezing that on a few thousand examples is inviting it to memorise, and you will see it as a training loss that drops much faster than validation. So: freeze on small data, fine-tune when there is enough of it or when the domain is genuinely distant, such as clinical text or code. A useful middle option is to freeze initially, train the rest of the model to convergence, then unfreeze the embeddings at a much lower learning rate — the same warm-up-then-unfreeze pattern that works for a pretrained CNN backbone, and for the same reason: you do not want the first epoch's large random gradients flowing into weights you want to preserve." }] }
  ] }
});
