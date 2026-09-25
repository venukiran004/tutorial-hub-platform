/* ============================================================================
   LESSON 3.6 — Contextual Embeddings and ELMo
   Mirrors 01_NLP_Notes.md · §22. The static-versus-contextual claim is
   measured layer by layer inside BERT, where layer 0 IS the static table
   (scratchpad/nlp/n36.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**At layer 0 the separation between same-sense and different-sense uses of `bank` is 0.0000. By layer 4 it is 0.2867.** Layer 0 of BERT *is* a static embedding table — one vector per word piece, looked up — so it assigns the river bank and the financial bank identical representations, exactly as Word2Vec does. Everything above it is context being mixed in. This lesson runs that measurement through all thirteen layers, which makes the static-to-contextual shift something you can watch happen rather than something you take on faith.",

  objectives: [
    "State precisely what static embeddings cannot represent, and measure it",
    "Describe ELMo's architecture and the layer-weighting idea it introduced",
    "Trace sense separation through BERT's layers and find where it peaks",
    "Explain why layer 0 behaves as a static embedding",
    "Choose a layer to extract features from, and justify it"
  ],

  prerequisites: ["3.3", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The problem, stated exactly", id: "problem" },

    { t: "p", text: "A static embedding is a lookup table: one row per word type. Word2Vec, GloVe and fastText all produce one. That design decision has a consequence that no amount of training data fixes — a word with several meanings gets one vector, which must be some average of its senses, and no downstream model can recover the distinction because the information was destroyed at the input." },

    { t: "p", text: "Lesson 3.2 made the scale of this concrete from WordNet: *bank* has 18 senses and *run* has 57. Those are not edge cases; polysemy is the normal condition of frequent words." },

    { t: "h2", n: "02", text: "The measurement", id: "measurement" },

    { t: "p", text: "Four sentences: two using *bank* financially, two using it geographically. Extract the contextual vector for the token `bank` in each and compare same-sense pairs against cross-sense pairs." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n36.py — extracting a token's vector at a chosen layer", code:
"from transformers import AutoTokenizer, AutoModel\nimport torch\n\ntok = AutoTokenizer.from_pretrained(\"bert-base-uncased\")\nmod = AutoModel.from_pretrained(\"bert-base-uncased\",\n                                output_hidden_states=True).eval()\n\ndef vec(sentence, word, layer=-1):\n    enc = tok(sentence, return_tensors=\"pt\")\n    ids = enc[\"input_ids\"][0]\n    pos = (ids == tok.convert_tokens_to_ids(word)).nonzero()[0].item()\n    with torch.no_grad():\n        out = mod(**enc)\n    return out.hidden_states[layer][0, pos]",
      caption: "`output_hidden_states=True` returns all 13 tensors — the embedding output plus one per transformer layer. `hidden_states[0]` is the embedding layer." },

    { t: "out", text:
"BERT layer 12 (final), cosine between the two 'bank' vectors\n\n  finance / finance     0.5065\n  river   / river       0.4023\n  finance / river       0.2789\n  finance / river       0.2736\n\na static embedding returns 1.0000 for every row, by construction" },

    { t: "callout", kind: "insight", title: "Read the gap, not the absolute numbers",
      body: [{ t: "p", text: "Same-sense pairs sit around 0.40–0.51 and cross-sense pairs around 0.27–0.28. The absolute values look low for \"the same word in the same sense\", and that is a real property of BERT's final layer: its representations are anisotropic, occupying a narrow cone, so cosines there are compressed and not directly interpretable as similarity. What is meaningful is the **gap**. Same-sense is consistently above cross-sense, and a static embedding cannot produce any gap at all, because it emits one identical vector every time." }] },

    { t: "h2", n: "03", text: "Layer by layer", id: "layers" },

    { t: "out", text:
"layer   same-sense   cross-sense   separation\n0       0.9583       0.9583        +0.0000\n1       0.8848       0.7100        +0.1748\n2       0.8693       0.6087        +0.2606\n3       0.7759       0.5042        +0.2717\n4       0.7278       0.4411        +0.2867   <- peak\n5       0.7042       0.4340        +0.2703\n6       0.6510       0.4165        +0.2344\n7       0.6321       0.3706        +0.2615\n8       0.5704       0.3445        +0.2259\n9       0.5112       0.3066        +0.2046\n10      0.5410       0.3399        +0.2011\n11      0.5591       0.3791        +0.1800\n12      0.4544       0.2762        +0.1782" },

    { t: "callout", kind: "crit", title: "Layer 0 is a static embedding, and it scores exactly zero",
      body: [{ t: "p", text: "At layer 0, same-sense and cross-sense are **both 0.9583** — separation **0.0000** to four decimal places. That is not a coincidence, it is the architecture: layer 0 is the embedding table plus positional and segment embeddings, with no attention applied. The word piece `bank` contributes a bit-identical vector in all four sentences, so whatever similarity you measure there has nothing to do with meaning. Word2Vec and GloVe are permanently at layer 0. Every bit of sense discrimination in this table was manufactured by attention in the layers above." }] },

    { t: "p", text: "Direct confirmation: comparing the layer-0 vector for *bank* across two different sentences gives **0.971274**, not 1.0 — and the only reason it is not exactly 1.0 is that positional embeddings were added and the word sits at different positions. Where the word happens to land at the same index in both sentences, the layer-0 cosine is exactly **1.0000**, which is what *light* did in the table below." },

    { t: "h2", n: "04", text: "The same pattern, five words", id: "polysemy" },

    { t: "out", text:
"word     layer 0    layer 12\nbank     0.9713     0.2789\nbat      0.9575     0.5206\nplant    0.9659     0.5831\nlight    1.0000     0.4073\nspring   0.9697     0.4234" },

    { t: "p", text: "Every word enters the model with its senses indistinguishable and leaves with them separated. *light* starts at a perfect 1.0000 — it occupies the same position in both probe sentences, so even the positional embedding matches — and ends at 0.4073. The mechanism that produced that difference is twelve layers of attention reading the surrounding words." },

    { t: "h2", n: "05", text: "ELMo", id: "elmo" },

    { t: "p", text: "ELMo, in 2018, was the first model to make this work at scale, and it did so before transformers took over. It is worth understanding because its central insight survived the architecture that implemented it." },

    { t: "diagram", kind: "flow", title: "ELMo: character CNN, then two LSTMs, then a learned mixture", cols: 3,
      nodes: [
        { id: "c", text: "Character CNN over the raw word", tone: "teal" },
        { id: "f", text: "Forward LSTM: left-to-right context", tone: "accent" },
        { id: "b", text: "Backward LSTM: right-to-left context", tone: "accent" },
        { id: "s", text: "Stack all layer outputs", tone: "violet" },
        { id: "w", text: "Task-specific weighted sum", tone: "violet" },
        { id: "o", text: "One contextual vector per token", tone: "good" }
      ],
      edges: [["c","f"],["c","b"],["f","s"],["b","s"],["s","w"],["w","o"]] },

    { t: "dl", items: [
      ["Character CNN", "Builds the word representation from characters, so a word never seen in training still gets a sensible vector. No out-of-vocabulary problem at all."],
      ["Two separate LSTMs", "One reads left to right, one right to left, and the outputs are concatenated. They are independent — this is not a jointly bidirectional model, which is the gap BERT's masked objective later closed."],
      ["Layer 0 — character CNN", "Morphology and word shape: prefixes, suffixes, capitalisation."],
      ["Layer 1 — first LSTM", "Syntax. Probing studies find POS and constituency information concentrated here."],
      ["Layer 2 — second LSTM", "Semantics, including word-sense disambiguation."],
      ["Task-specific weights", "The downstream task learns a scalar weight per layer and takes a weighted sum, so a POS tagger can lean on layer 1 while a sense task leans on layer 2."]
    ] },

    { t: "callout", kind: "insight", title: "The layer-weighting idea is the part that lasted",
      body: [{ t: "p", text: "ELMo's architecture was superseded within a year. Its finding was not: **different depths encode different linguistic levels, and the right depth depends on the task.** The measurement above shows it in BERT, which is a completely different architecture — sense separation peaks at layer 4 (+0.2867) and *declines* to +0.1782 by layer 12. The final layer is not the best layer for word sense, because by then the representation has specialised toward the pretraining objective of predicting a masked token, which needs different information. ELMo's answer — learn a weighted mixture instead of picking one — is still the right answer." }] },

    { t: "h2", n: "06", text: "Syntax against semantics through the depth", id: "probing" },

    { t: "p", text: "A second probe, separating two kinds of difference. The syntactic contrast uses *bank* in the same sense in two different grammatical roles; the semantic contrast uses the two different senses." },

    { t: "out", text:
"layer   same sense, different role    different sense\n0       0.9496                       0.9713\n4       0.8457                       0.4537\n8       0.8283                       0.3439\n12      0.8740                       0.2789" },

    { t: "callout", kind: "insight", title: "Sense diverges; grammatical role does not",
      body: [{ t: "p", text: "At layer 0 the two contrasts are indistinguishable — 0.9496 against 0.9713, with the *different-sense* pair scoring marginally **higher**, which is exactly the incoherence you expect when the numbers are driven by position rather than meaning. Through the depth they separate decisively: the different-sense pair falls to 0.2789 while the same-sense pair stays around 0.83–0.87 despite the changed grammatical role. The model is building a representation that tracks which *meaning* of the word is in play and is comparatively indifferent to its syntactic position — which is precisely what a useful contextual embedding should do." }] },

    { t: "h2", n: "07", text: "Which layer to use", id: "which" },

    { t: "table",
      head: ["Use", "Layer", "Reason"],
      rows: [
        ["Fine-tuning the whole model", "Not applicable", "Gradients update every layer; the question does not arise. Prefer this whenever you can afford it."],
        ["Frozen features, semantic task", "Middle layers, roughly 4–8", "Sense separation peaked at layer 4 here and was still strong through 8."],
        ["Frozen features, syntactic task", "Lower-middle, roughly 2–6", "Probing work consistently finds syntax concentrated below semantics."],
        ["Sentence embeddings", "Not the final layer alone", "Mean-pooling the final layer is a weak sentence encoder; use a model trained for it, like sentence-transformers."],
        ["Unsure", "Concatenate or learn a weighted sum", "ELMo's original answer, and still the safe default."]
      ] },

    { t: "callout", kind: "trap", title: "The last layer is the most specialised, not the most general",
      body: [{ t: "p", text: "The reflex is to take `last_hidden_state` because it is what `AutoModel` returns first. But the top layer has been shaped hardest by the pretraining objective — for BERT, predicting masked tokens — and that is rarely your objective. Sense separation *fell* from +0.2867 at layer 4 to +0.1782 at layer 12 in this measurement. If you are extracting frozen features, try several layers and measure; the difference is often larger than whatever hyperparameter you were about to tune instead." }] },

    { t: "h2", n: "08", text: "Static, ELMo, transformer", id: "comparison" },

    { t: "diagram", kind: "compare", title: "Three generations",
      columns: [
        { title: "Static (Word2Vec)", tone: "warn", items: [
          "One vector per word type",
          "Sense separation: 0.0000",
          "OOV words have no vector",
          "A lookup table, no compute",
          "Trained on co-occurrence",
          "Still fine when senses do not matter"
        ] },
        { title: "ELMo (2018)", tone: "teal", items: [
          "One vector per token",
          "Character CNN: no OOV",
          "Two independent LSTMs",
          "Sequential, cannot parallelise",
          "Feature extractor, frozen",
          "Introduced learned layer mixing"
        ] },
        { title: "Transformer (BERT)", tone: "good", items: [
          "One vector per token",
          "Subword vocabulary: no OOV",
          "Jointly bidirectional attention",
          "Parallel across the sequence",
          "Fine-tuned end to end",
          "Sense separation peaks mid-stack"
        ] }
      ] },

    { t: "p", text: "The line from ELMo to BERT is short. ELMo proved contextual representations were worth the compute and that depth stratifies linguistic information. BERT replaced the LSTMs with attention — which removed the sequential bottleneck and made genuine bidirectionality possible via the masked objective — and changed the usage pattern from frozen features to fine-tuning. The lesson that carried over is the one measured here: context has to enter the representation, and where it enters determines what the representation is good for." },

    { t: "exercise", title: "Run the probe yourself",
      tasks: [
        "Reproduce the layer sweep on a polysemous word from your own domain and find where separation peaks.",
        "Confirm layer 0 is static: extract the same word from two sentences where it sits at the same index and check the cosine is exactly 1.0000.",
        "Cluster the contextual vectors of a frequent polysemous word across 200 sentences and see whether the clusters match WordNet senses.",
        "Extract frozen features from layers 4, 8 and 12 for a downstream classifier and compare accuracy. Note which wins.",
        "Compare BERT's sense separation against a static GloVe baseline on the same sentence pairs, and confirm GloVe's separation is identically zero."
      ] }
  ],

  takeaways: [
    "Layer 0 of BERT is a static embedding table: same-sense and cross-sense cosines were both 0.9583, separation 0.0000.",
    "Layer-0 vectors differ across sentences only because of positional embeddings — when a word sits at the same index, the cosine is exactly 1.0000.",
    "Sense separation peaked at layer 4 (+0.2867) and declined to +0.1782 at layer 12; the final layer is the most task-specialised, not the most general.",
    "Five polysemous words all started near-identical at layer 0 and ended separated at layer 12.",
    "Different-sense pairs fell to 0.2789 through the depth while same-sense-different-role pairs stayed near 0.87 — the model tracks meaning more than grammatical position.",
    "BERT's final-layer cosines are compressed by anisotropy; read the gap between conditions, not the absolute value.",
    "ELMo's architecture — character CNN, two independent LSTMs — was superseded, but its finding that depth stratifies linguistic information was not.",
    "For frozen features, try several layers and measure; for anything else, fine-tune the whole model."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is the sense separation at BERT's layer 0 exactly 0.0000?",
      options: ["A measurement error", "Layer 0 is the embedding table plus positional embeddings, with no attention — the word piece contributes an identical vector every time", "The sentences were too similar", "BERT cannot disambiguate 'bank'"],
      answer: 1,
      why: "Same-sense and cross-sense both scored 0.9583. Nothing at layer 0 has read the surrounding words yet, so the vector for 'bank' is the same lookup in all four sentences and any variation comes from position alone. That is precisely what a static embedding is, which makes layer 0 a Word2Vec model sitting inside BERT." },
    { stem: "Sense separation peaked at layer 4 and fell to layer 12. What does that imply?",
      options: ["Deeper layers are broken", "The top layer is specialised toward the pretraining objective, so it is not automatically the best source of frozen features", "Layer 4 is always optimal", "The model is overfitting"],
      answer: 1,
      why: "Separation went from +0.2867 at layer 4 to +0.1782 at layer 12. BERT's top layer has been shaped hardest by masked-token prediction, which needs different information from word-sense discrimination. When extracting frozen features, sweep the layers and measure — the gap is often bigger than the hyperparameter you were about to tune." },
    { stem: "Why should you read the gap between conditions rather than the absolute cosine at BERT's final layer?",
      options: ["Cosine is undefined there", "Final-layer representations are anisotropic and occupy a narrow cone, compressing all cosines", "The vectors are not normalised", "Only the gap is computable"],
      answer: 1,
      why: "Same-sense pairs scored only 0.40-0.51, which looks low for the same word in the same sense. That is a known property of the final layer's geometry rather than a statement about similarity. The meaningful signal is that same-sense consistently exceeds cross-sense — a gap a static embedding cannot produce at all." },
    { stem: "What was ELMo's lasting contribution?",
      options: ["The character CNN", "The finding that different depths encode different linguistic levels, so the useful representation is a task-weighted mixture", "Bidirectional LSTMs", "Subword tokenisation"],
      answer: 1,
      why: "Its architecture was superseded within a year, but the layer-stratification finding held — and reproduces in BERT, a completely different architecture, where sense separation peaks mid-stack rather than at the top. Learning a weighted sum over layers rather than picking one is still the right default." }
  ] },

  interview: { title: "Interview", sub: "Contextual representations", questions: [
    { level: "Core", q: "What is the difference between static and contextual embeddings?",
      strong: "Static gives one vector per word type and cannot represent sense; contextual gives one per token occurrence.",
      answer: [{ t: "p", text: "A static embedding like Word2Vec or GloVe is a lookup table with one row per word type, so every occurrence of a word gets the identical vector regardless of context. A contextual embedding produces a vector per token occurrence, computed from the surrounding words. The consequence is sharp and measurable. I ran four sentences using 'bank' — two financial, two geographic — and compared the vectors. At BERT's layer 0, which is literally the embedding table before any attention, the same-sense and different-sense cosines were both 0.9583, a separation of exactly zero. By layer 4 the separation was 0.2867. A static embedding is permanently in that layer-0 state: it has one vector for a word that WordNet lists 18 senses for, so it must encode some average of them, and no downstream model can recover the distinction because the information was destroyed at the input. That's why the shift mattered — it isn't that contextual embeddings are more accurate, it's that they can represent something static ones structurally cannot." }] },
    { level: "Senior", q: "You are extracting frozen features from BERT. Which layer do you use?",
      strong: "Not the last one by default — sweep and measure, because sense separation peaks mid-stack.",
      answer: [{ t: "p", text: "Not `last_hidden_state` just because it's what the model returns first, which is the common reflex. The top layer has been shaped hardest by the pretraining objective — masked-token prediction for BERT — and that's rarely the downstream objective. I measured sense separation across all thirteen layers and it peaked at layer 4 at +0.2867, then declined to +0.1782 at layer 12. So for a semantics-heavy task I'd start in the middle, roughly layers 4 to 8; for syntactic tasks the probing literature consistently finds the useful information a bit lower. But the real answer is to sweep and measure on the actual task, because it's cheap — you run the encoder once with `output_hidden_states=True` and train a light classifier per layer — and the difference between layers is often larger than whatever hyperparameter you were about to tune instead. If I don't want to pick, I'd concatenate a few layers or learn a scalar weight per layer, which is exactly what ELMo did in 2018 and is still a good default. And I'd say that if fine-tuning the whole encoder is affordable, that beats frozen features from any layer and the question stops mattering." }] },
    { level: "Senior", q: "Why did BERT replace ELMo so quickly?",
      strong: "Parallelism and genuine bidirectionality, plus the shift from frozen features to fine-tuning.",
      answer: [{ t: "p", text: "Three things, and they compound. First, parallelism: ELMo's LSTMs are sequential along the time axis, so training time scales with sequence length and you can't use the hardware efficiently. Attention has no such dependency, so the whole sequence processes at once — which is what made it practical to train much larger models on much more text, and scale was where most of the gain came from. Second, genuine bidirectionality: ELMo runs a left-to-right LSTM and a right-to-left LSTM independently and concatenates them, so no single representation ever sees both directions jointly. BERT's masked language modelling objective lets every layer attend in both directions at once, which is a strictly richer conditioning. Third, the usage pattern changed. ELMo was designed as a frozen feature extractor you bolted onto a task-specific architecture; BERT established fine-tuning the entire encoder with a small head, which works better and removed the need to design task architectures at all. What survived from ELMo is the layer-stratification insight — that different depths carry different linguistic levels and the right depth depends on the task. That reproduces in BERT despite the completely different architecture: I measured sense separation peaking at layer 4 and falling by layer 12." }] }
  ] }
});
