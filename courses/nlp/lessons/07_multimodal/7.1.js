/* ============================================================================
   LESSON 7.1 — Multimodal Fundamentals
   Mirrors 03_Multimodal_AI.md · §1. The four fusion strategies, placed
   against the models built in Module 5, with CLIP run as the late-fusion
   case (scratchpad/nlp/n71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**Every multimodal architecture is answering one question: where do the modalities meet?** Concatenate the raw inputs and there is one encoder. Encode separately and combine only at the decision, and the modalities never interact at all — which is what makes CLIP a retrieval model. Let one attend to the other and you get rich interaction at a cost per layer. Compress through learned queries and the cost stops depending on input size. This lesson places those four choices and shows what each one gives up.",

  objectives: [
    "Name the modalities and what each is tokenised into",
    "Distinguish early, late, cross-attention and bottleneck fusion",
    "Explain why the fusion point determines what a model can be used for",
    "Place CLIP, LLaVA and Flamingo on that spectrum",
    "State the core difficulty of multimodal learning"
  ],

  prerequisites: ["6.7", "5.9"],

  blocks: [

    { t: "h2", n: "01", text: "What makes it hard", id: "hard" },

    { t: "p", text: "A multimodal model understands or generates across several data types. The difficulty is not processing each one — Module 5 showed a transformer handles images by simply tokenising patches — it is **aligning representations** so that a vector derived from pixels and a vector derived from words can be meaningfully compared." },

    { t: "table",
      head: ["Modality", "What it actually is", "Tokenised as", "Example models"],
      rows: [
        ["Text", "Natural language", "Subword ids", "GPT, BERT, LLaMA"],
        ["Image", "Pixels", "Patches, usually 16×16", "ViT, ResNet, CLIP"],
        ["Audio", "Waveforms", "Spectrogram frames", "Whisper, AudioLM"],
        ["Video", "Frame sequences", "Spatio-temporal patches", "VideoMAE, InternVideo"],
        ["Point cloud", "3D coordinates", "Points or voxels", "PointNet, Point-E"],
        ["Tabular", "Structured rows", "Column embeddings", "TabTransformer"]
      ] },

    { t: "callout", kind: "insight", title: "The architecture barely changes — the tokenisation does",
      body: [{ t: "p", text: "Lesson 5.7 established this for vision and it generalises: a transformer consumes a sequence of `d_model` vectors and does not care where they came from. So adding a modality is a **tokenisation** problem, not an architecture problem. Audio becomes spectrogram frames, video becomes spatio-temporal patches, and the encoder blocks are unchanged. What is genuinely new in multimodal work is not the encoder — it is deciding where the modalities meet, and how to train them to agree." }] },

    { t: "h2", n: "02", text: "Four places to fuse", id: "fusion" },

    { t: "table",
      head: ["Strategy", "How", "Advantage", "Cost"],
      rows: [
        ["Early", "Concatenate raw inputs, one shared encoder", "Simple; interaction from layer 1", "Misses modality-specific structure; one tokenisation for very different data"],
        ["Late", "Separate encoders, combine at the decision", "Modality-specific features preserved; embeddings are independent", "No cross-modal interaction at all"],
        ["Cross-attention", "One modality attends to the other", "Rich interaction; used by most VLMs", "Real compute in every layer"],
        ["Bottleneck", "Compress via learned queries (Q-Former, Perceiver)", "Cost independent of input size", "Information lost in the bottleneck"]
      ] },

    { t: "diagram", kind: "compare", title: "The two that dominate",
      columns: [
        { title: "Late fusion — CLIP", tone: "teal", items: [
          "Two towers, no interaction",
          "Each embedding depends only on its own input",
          "Embed a corpus once, search with a dot product",
          "Cannot reason about a specific pair",
          "Used for retrieval and zero-shot classification"
        ] },
        { title: "Cross-attention — LLaVA, Flamingo", tone: "violet", items: [
          "Modalities attend to each other",
          "Representation depends on the pair",
          "Must re-encode for every query",
          "Can answer questions about an image",
          "Used for VQA, captioning and chat"
        ] }
      ] },

    { t: "callout", kind: "crit", title: "The fusion point determines what the model can be used for",
      body: [{ t: "p", text: "This is the consequence that matters and it is easy to miss. In **late fusion** each embedding depends only on its own input, so you can embed ten million images offline and later match any text query against them with a dot product — which lesson 5.9 identified as exactly why CLIP is a retrieval model. In **cross-attention fusion** the representation depends on the *pair*, so answering one query would require re-encoding every candidate against it. That is not a tuning difference; it is a structural one. Choosing a fusion strategy is choosing which tasks the model can perform at all." }] },

    { t: "h2", n: "03", text: "Where the models sit", id: "placing" },

    { t: "out", text:
"CLIP        late fusion        two towers, zero interaction\nLLaVA       cross-attention    visual tokens share the LLM's self-attention\nFlamingo    cross-attention    gated layers between frozen towers\nQ-Former    bottleneck         32 learned queries compress the image\nPerceiver   bottleneck         fixed latent array, any input size" },

    { t: "p", text: "LLaVA is worth a second look. It has no explicit cross-attention module — it projects patches into the LLM's embedding space so they become ordinary tokens. But because self-attention then runs over text and visual tokens together, the *effect* is cross-modal attention in every layer. It achieves cross-attention fusion without a cross-attention mechanism, which is why lesson 5.9 called it the approach that composes with everything." },

    { t: "h2", n: "04", text: "Bottleneck fusion", id: "bottleneck" },

    { t: "callout", kind: "insight", title: "A fixed number of queries decouples cost from resolution",
      body: [{ t: "p", text: "Lesson 5.9 computed the problem this solves: a 1024-pixel image at patch 14 is **5,329 visual tokens**, 130% of a 4k context. BLIP-2's Q-Former uses **32 learned query vectors** that cross-attend to the image features and output 32 tokens — regardless of resolution. Flamingo's Perceiver Resampler does the same with 64. The image cost becomes a constant rather than a function of resolution, which is what makes multi-image and video input feasible at all. The trade is explicit and unavoidable: whatever those 32 vectors fail to capture is gone, and fine detail — small text in a document, a distant object — is exactly what a fixed-size summary tends to lose." }] },

    { t: "h2", n: "05", text: "The alignment problem", id: "alignment" },

    { t: "p", text: "Whichever fusion point you choose, something has to make a picture of a dog and the word *dog* land near each other. There are essentially three ways, and they map onto the fusion strategies." },

    { t: "dl", items: [
      ["Contrastive alignment", "Train both encoders so matching pairs are close and mismatched pairs far apart. This is CLIP, and lesson 7.2 works the loss. Requires enormous paired data — 400M pairs — and very large batches."],
      ["Projection alignment", "Freeze a good vision encoder, freeze a good LLM, and train a small projection between them. This is LLaVA, and the projection is about 21M parameters against a 7B model."],
      ["Joint training", "Train everything together on interleaved multimodal data. Most expensive, and what the largest native-multimodal models do."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Why the projection approach dominates now",
      body: [{ t: "p", text: "Contrastive alignment needs hundreds of millions of paired examples and batch sizes in the tens of thousands, which very few organisations can run. The projection approach needs neither: it inherits a vision encoder someone else trained contrastively and an LLM someone else trained on text, and learns only the small map between them. It is the same dynamic as LoRA in lesson 5.6 — freeze the expensive parts, train the connector — and it is why open vision-language models proliferated so quickly after LLaVA showed it worked." }] },

    { t: "exercise", title: "Classify the architectures",
      tasks: [
        "For three multimodal models you have used, identify where the modalities meet and what that permits.",
        "Work out whether a model you want to use could serve large-scale retrieval, from its fusion strategy alone.",
        "Compute the visual token count for your resolution, and decide whether a bottleneck is necessary.",
        "Find a task that late fusion structurally cannot do, and explain why.",
        "Compare the training data requirements of contrastive against projection alignment for your own domain."
      ] }
  ],

  takeaways: [
    "The hard part of multimodal is aligning representations, not processing each modality — tokenisation is the only architectural change.",
    "Four fusion points: early (shared encoder), late (separate encoders), cross-attention, and bottleneck (learned queries).",
    "The fusion point determines what the model can do: late fusion enables offline corpus embedding and dot-product retrieval; cross-attention makes representations pair-dependent and forbids it.",
    "CLIP is late fusion with zero interaction between towers; LLaVA achieves cross-attention fusion without a cross-attention module, by putting visual tokens in the LLM's own self-attention stream.",
    "Bottleneck fusion — Q-Former's 32 queries, Perceiver's 64 — decouples image cost from resolution, which is what makes multi-image and video feasible.",
    "The bottleneck's cost is explicit: whatever the fixed queries miss is gone, and fine detail is what a fixed-size summary loses first.",
    "Three alignment methods: contrastive (400M pairs, huge batches), projection (~21M trainable parameters), and joint training.",
    "Projection alignment dominates because it inherits both pretrained towers and trains only the connector — the same logic as LoRA."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does the fusion point determine what a model can be used for?",
      options: ["It changes the parameter count", "In late fusion each embedding depends only on its own input, enabling offline indexing; in cross-attention the representation depends on the pair, which forbids it", "It affects training speed only", "It determines the supported modalities"],
      answer: 1,
      why: "CLIP can embed ten million images once and match any query with a dot product, because its towers never interact. A cross-attention model would have to re-encode every candidate against every query. That is structural, not a matter of tuning — choosing a fusion strategy chooses which tasks are possible." },
    { stem: "What does bottleneck fusion solve?",
      options: ["Training instability", "Image cost scaling with resolution — a fixed set of learned queries outputs a constant token count regardless of input size", "Modality imbalance", "The need for paired data"],
      answer: 1,
      why: "A 1024-pixel image at patch 14 is 5,329 tokens, 130% of a 4k context. Q-Former's 32 queries and Perceiver's 64 make that a constant. The cost is that whatever those fixed vectors fail to capture is lost, and fine detail — small text, distant objects — is what a fixed-size summary loses first." },
    { stem: "How does LLaVA achieve cross-modal interaction without a cross-attention module?",
      options: ["It uses early fusion on raw pixels", "It projects patches into the LLM's embedding space so they become ordinary tokens, and self-attention then runs over text and image together", "It fine-tunes the vision encoder", "It uses a Q-Former"],
      answer: 1,
      why: "The LLM consumes a sequence of d_model vectors and cannot tell where they came from. Putting visual tokens in the same sequence means self-attention provides the cross-modal interaction in every layer, with no architectural change — which is why the approach composes with every serving optimisation and every new base model." },
    { stem: "Why has projection alignment largely displaced contrastive alignment for new models?",
      options: ["It produces better representations", "It inherits both pretrained towers and trains only a small connector, avoiding the 400M pairs and huge batches contrastive training needs", "It requires no paired data at all", "It is more interpretable"],
      answer: 1,
      why: "Contrastive pretraining needs hundreds of millions of pairs and batch sizes in the tens of thousands — very few organisations can run that. Projection alignment trains about 21M parameters between a frozen vision encoder and a frozen LLM. It is the LoRA logic: freeze the expensive parts, train the connector." }
  ] },

  interview: { title: "Interview", sub: "Multimodal design", questions: [
    { level: "Core", q: "What are the ways to combine two modalities in one model?",
      strong: "Early, late, cross-attention and bottleneck — and the choice decides what the model can do.",
      answer: [{ t: "p", text: "Four broad options. Early fusion concatenates raw inputs into one shared encoder — simple, gives interaction from the first layer, but forces one tokenisation onto very different data. Late fusion runs separate encoders and combines only at the decision, which preserves modality-specific structure but means the modalities never interact. Cross-attention fusion lets one modality attend to the other, which is rich but costs compute in every layer. Bottleneck fusion compresses through a fixed set of learned queries — Q-Former's 32, Perceiver's 64 — so the cost stops depending on input size. The point I'd emphasise is that this choice determines what the model can be used for, not just how well it works. CLIP's two towers never interact, which means each embedding depends only on its own input, which means you can embed ten million images offline and match any query with a dot product. A cross-attention model structurally cannot do that, because its representation depends on the pair, so one query would require re-encoding the whole corpus. So I'd pick the fusion strategy from the task first: retrieval needs late fusion, visual question answering needs cross-attention, and anything with high-resolution or multi-image input probably needs a bottleneck." }] },
    { level: "Senior", q: "You need to add a new modality to an existing LLM. How do you approach it?",
      strong: "Tokenise it into the LLM's embedding space and train only the projection — the LLaVA pattern.",
      answer: [{ t: "p", text: "The key realisation is that a transformer decoder consumes a sequence of d_model vectors and has no way to know their origin, so adding a modality is a tokenisation problem rather than an architecture problem. Concretely, the LLaVA pattern: take a good pretrained encoder for the new modality, project its output into the LLM's embedding dimension with a small MLP, and concatenate those vectors with the text tokens. The LLM is entirely unmodified, so it inherits every serving optimisation and you can swap in a better base model later by retraining only the projection. That projection is around 21 million parameters for 1024 to 4096, against a 7B model — a rounding error, and often the only thing trained. I'd freeze both towers initially and train just the connector on paired data, then consider unfreezing the LLM with a low learning rate if quality demands it, watching carefully for degradation of its text ability, which is a real risk and is exactly what Flamingo's zero-initialised gate was designed to avoid. The thing I'd size first is token cost. Lesson arithmetic: a 1024-pixel image at patch 14 is 5,329 tokens, more than a 4k context window. If my modality produces long sequences I'd need a bottleneck resampler rather than a straight projection, accepting that fine detail gets lost in the compression." }] },
    { level: "Senior", q: "Why is aligning modalities hard when encoding each one is straightforward?",
      strong: "Nothing makes a pixel-derived and a word-derived vector comparable unless training forces it.",
      answer: [{ t: "p", text: "Because encoding is a within-modality problem with abundant supervision, and alignment is a cross-modality problem with much less. A vision encoder learns good image representations from images alone; a language model learns good text representations from text alone. Neither has any reason to place a picture of a dog near the word 'dog' — those live in two unrelated spaces with no shared coordinate system. Something has to force the correspondence, and the options all cost. Contrastive training works and is what CLIP did, but it needs roughly 400 million paired examples and batch sizes in the tens of thousands, because the loss is an N-way classification per example and the batch is where the negatives come from — at batch 32,768 every positive competes against 32,767 negatives. Very few organisations can run that. Projection alignment is much cheaper but inherits whatever alignment quality the frozen encoders already had. Joint training is the most capable and the most expensive. There's also a data problem underneath all of them: paired data is far scarcer than unpaired data in either modality, and it's biased toward what people happen to caption on the web — which is why CLIP is excellent at recognising photographed objects and much weaker at reading text in images or counting."}] }
  ] }
});
