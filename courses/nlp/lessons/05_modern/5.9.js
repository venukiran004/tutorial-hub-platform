/* ============================================================================
   LESSON 5.9 — Multimodal Transformers
   Mirrors 02_Transformers_InDepth.md · §20. CLIP's shared space is measured,
   the visual-token arithmetic computed (a 1024px image is 130% of a 4k
   context), and the three architectural patterns compared. Full multimodal
   treatment is Module 7 (scratchpad/nlp/n59.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.9",

  lede: "**A single 1024×1024 image at patch 14 becomes 5,329 visual tokens — 130% of a 4,096-token context window.** The image alone does not fit. That arithmetic is the central constraint on every vision-language model, and it explains most of their design: why resolution is capped so aggressively, why token-pooling schemes exist, and why \"just send the image at full resolution\" is not an option. This lesson covers the three ways a transformer is given more than one modality.",

  objectives: [
    "Distinguish CLIP, LLaVA and Flamingo by where the modalities meet",
    "Explain contrastive alignment and verify the shared space is semantic",
    "Compute visual token cost from resolution and patch size",
    "Explain why the projection approach became standard",
    "Recognise the resolution-versus-context trade every VLM makes"
  ],

  prerequisites: ["5.8", "5.7"],

  blocks: [

    { t: "h2", n: "01", text: "Three ways to combine modalities", id: "patterns" },

    { t: "table",
      head: ["Model", "Where the modalities meet", "What is trained", "Used for"],
      rows: [
        ["CLIP", "Nowhere — two separate towers, no cross-attention", "Both towers, contrastively on paired data", "Retrieval, zero-shot classification"],
        ["LLaVA", "ViT patches projected into the LLM's token stream", "The projection, then instruction tuning", "Visual question answering, chat"],
        ["Flamingo", "Gated cross-attention between frozen towers", "Only the inserted cross-attention layers", "Few-shot multimodal"]
      ] },

    { t: "h2", n: "02", text: "CLIP: alignment without interaction", id: "clip" },

    { t: "out", text:
"openai/clip-vit-base-patch32\n\n  vision tower   87,456,000 params (ViT-B/32)\n  text tower     63,165,952 params\n  shared projection dimension: 512\n\n  vision hidden 768 -> 512\n  text   hidden 512 -> 512" },

    { t: "callout", kind: "insight", title: "The two towers never see each other",
      body: [{ t: "p", text: "There is no cross-attention anywhere in CLIP. The image encoder never reads the text and the text encoder never reads the image — each produces one vector independently, and the *only* thing connecting them is a contrastive loss that pulls matching pairs together and pushes mismatched pairs apart in a shared 512-dimensional space. That independence is what makes CLIP useful for retrieval: you can embed a million images once, offline, and later match any query text against them with a dot product. A model where the modalities attend to each other cannot do that, because the representation depends on the pair." }] },

    { t: "out", text:
"cosine similarity between CLIP text embeddings in the shared space\n\n                             dog    puppy  cat    car    city\n  a photo of a dog          1.000  0.959  0.931  0.878  0.735\n  a photo of a puppy        0.959  1.000  0.902  0.846  0.727\n  a photo of a cat          0.931  0.902  1.000  0.869  0.737\n  a photo of a car          0.878  0.846  0.869  1.000  0.742\n  an aerial view of a city  0.735  0.727  0.737  0.742  1.000" },

    { t: "p", text: "The ordering is exactly right: dog/puppy 0.959 > dog/cat 0.931 > dog/car 0.878 > dog/city 0.735. Note the absolute values are all high and compressed into a narrow band — the same anisotropy lesson 3.6 found in BERT's final layer, and another reminder to read the *gap* rather than the raw cosine." },

    { t: "out", text:
"the learned temperature\n\n  logit_scale (a learned parameter) = 4.6052\n  exp(4.6052) = 100.00" },

    { t: "callout", kind: "insight", title: "The temperature is learned, and it saturated",
      body: [{ t: "p", text: "CLIP multiplies its cosine similarities by `exp(logit_scale)` before the contrastive softmax, and `logit_scale` is a **trained parameter** rather than a hyperparameter — the model decides how sharply to discriminate. It landed at exactly **100.00**, which is the value CLIP's training clamps it to. So the model pushed the temperature all the way to its ceiling and stayed there, meaning it wanted an even sharper contrastive objective than it was permitted. A similarity gap of 0.05 becomes a logit gap of 5 after scaling, which is what makes the softmax over a large batch discriminative at all." }] },

    { t: "h2", n: "03", text: "LLaVA: images as tokens", id: "llava" },

    { t: "diagram", kind: "flow", title: "The projection approach", cols: 3,
      nodes: [
        { id: "i", text: "Image", tone: "accent" },
        { id: "v", text: "Frozen ViT encoder", tone: "teal" },
        { id: "p", text: "Linear or MLP projection to d_model", tone: "violet" },
        { id: "t", text: "Text tokens", tone: "accent" },
        { id: "s", text: "One sequence: visual tokens then text tokens", tone: "violet" },
        { id: "l", text: "Unmodified LLM decoder", tone: "good" }
      ],
      edges: [["i","v"],["v","p"],["p","s"],["t","s"],["s","l"]] },

    { t: "callout", kind: "insight", title: "The LLM does not know the tokens are images",
      body: [{ t: "p", text: "LLaVA's insight is almost embarrassingly simple: a transformer decoder consumes a sequence of `d_model` vectors, and **it has no way of knowing where those vectors came from**. Project ViT patch embeddings into that space and they *are* tokens. Nothing about the LLM changes — no new layers, no new attention type, no architectural modification at all. Image and text tokens attend to each other in every layer, for free, because they are in the same sequence. A 2-layer MLP projecting 1024 to 4096 is about **20,971,520 parameters** against a 7B model: a rounding error, and often the only thing that needs training." }] },

    { t: "h2", n: "04", text: "What visual tokens cost", id: "cost" },

    { t: "out", text:
"resolution     patch    visual tokens    fraction of a 4k context\n224x224          14           256                6.2%\n336x336          14           576               14.1%\n384x384          16           576               14.1%\n672x672          14          2304               56.2%\n1024x1024        14          5329              130.1%" },

    { t: "callout", kind: "crit", title: "One image can exceed the whole context window",
      body: [{ t: "p", text: "At 672 pixels a single image consumes **56.2%** of a 4k context — leaving less than half for the question, the conversation history and the answer. At 1024 pixels it is **130.1%** and does not fit at all. Since patches scale with area, this gets worse quadratically, exactly as lesson 5.7 measured for ViT. Everything odd about VLM interfaces follows from this: the aggressive downscaling to 336 or 384 pixels, the tiling schemes that process crops separately, the token-pooling and resampler modules (Flamingo's Perceiver Resampler compresses to a fixed 64 tokens regardless of resolution), and the reason multi-image conversations are so much harder than single-image ones." }] },

    { t: "h2", n: "05", text: "Flamingo: cross-attention between frozen towers", id: "flamingo" },

    { t: "p", text: "Flamingo takes a third route: freeze both a vision encoder and a language model, and insert **gated cross-attention** layers between the LM's existing blocks, where the queries come from the text stream and the keys and values from the vision features." },

    { t: "dl", items: [
      ["Both towers frozen", "Neither the vision encoder nor the LM is updated, so the LM's language ability cannot be degraded by multimodal training — a real risk in the LLaVA approach."],
      ["Gated", "Each inserted layer starts with a `tanh` gate initialised at zero, so at the start of training the model is *exactly* the original LM. Visual influence is learned in gradually rather than disrupting a working model."],
      ["Perceiver Resampler", "Compresses a variable number of visual features to a fixed small set — 64 tokens — so image cost does not scale with resolution the way LLaVA's does."],
      ["Cost", "Cross-attention layers are real added compute in every forward pass, unlike LLaVA's projection which is paid once per image."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Why LLaVA's approach won anyway",
      body: [{ t: "p", text: "Flamingo's design is arguably more careful — the zero-initialised gate is an elegant way to avoid damaging a working LM, and the resampler solves the token-count problem directly. LLaVA won on **simplicity**. It requires no modification to the LM at all, so it inherits every optimisation, every serving stack and every new base model for free: when a better LLM appears you swap it in and retrain a small projection. Flamingo's inserted layers have to be redesigned and retrained per architecture. That is the same dynamic that decided decoder-only against encoder-decoder in lesson 5.1 — the approach that composes with everything else tends to win even when it is not the most elegant." }] },

    { t: "h2", n: "06", text: "What carries over from text", id: "carryover" },

    { t: "p", text: "Everything in Modules 4 and 5 applies unchanged. Visual tokens go through the same attention, the same KV cache, the same quantisation. The `O(n²)` cost from lesson 4.3 is what makes high resolution expensive; the KV-cache arithmetic from lesson 5.2 now includes hundreds of visual tokens per image, which is why multi-image conversations exhaust memory so quickly." },

    { t: "callout", kind: "note", title: "Module 7 goes much deeper",
      body: [{ t: "p", text: "This lesson covers the architectural patterns as they appear in the transformer reference. Module 7 — *Multimodal AI* — takes the full treatment: CLIP training in detail, vision-language models, diffusion, audio and speech, video understanding, multimodal RAG and document AI. What matters here is the structural point: making a transformer multimodal is a **tokenisation** problem, not an architecture problem, which is the same conclusion lesson 5.7 reached about ViT." }] },

    { t: "exercise", title: "Measure the multimodal budget",
      tasks: [
        "Load CLIP and verify that the text and vision towers share no parameters and never cross-attend.",
        "Embed a set of captions and check the similarity ordering matches your semantic expectation.",
        "Compute visual token counts for the resolutions your application needs, as a fraction of your context window.",
        "For a multi-image conversation, compute the KV cache required and compare it against a text-only one.",
        "Compare a tiling approach against simple downscaling on a task requiring fine detail, and measure both accuracy and token cost."
      ] }
  ],

  takeaways: [
    "CLIP's two towers never attend to each other — 87,456,000 vision and 63,165,952 text parameters, aligned only by a contrastive loss into a shared 512-d space.",
    "That independence is what makes CLIP a retrieval model: embed the corpus once offline, match with a dot product.",
    "CLIP's text space orders correctly — dog/puppy 0.959 > dog/cat 0.931 > dog/car 0.878 > dog/city 0.735 — though absolute cosines are compressed, as in BERT.",
    "CLIP's temperature is a learned parameter that saturated at exactly exp(4.6052) = 100.00, its training clamp.",
    "LLaVA projects ViT patches into the LLM's embedding space, so the LLM cannot tell they are images and needs no modification at all.",
    "A 1024→4096 MLP projection is about 20,971,520 parameters against a 7B model — often the only part that is trained.",
    "A 672px image at patch 14 is 2,304 visual tokens, 56.2% of a 4k context; a 1024px image is 5,329 tokens, 130.1% — it does not fit.",
    "Flamingo freezes both towers and inserts gated cross-attention initialised at zero, so training starts as exactly the original LM.",
    "LLaVA won on composability: no LM modification means every optimisation and every new base model transfers for free.",
    "Making a transformer multimodal is a tokenisation problem, not an architecture problem."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why can CLIP be used for large-scale retrieval when a cross-attention model cannot?",
      options: ["It is smaller", "Its towers are independent, so images can be embedded once offline and matched with a dot product", "It uses a better loss", "It has a learned temperature"],
      answer: 1,
      why: "CLIP's image encoder never reads the text and vice versa, so each embedding depends only on its own input. That lets you embed a million images once and later compare any query against them cheaply. In a cross-attention model the representation depends on the pair, so every query requires re-encoding every candidate." },
    { stem: "How does LLaVA connect a vision encoder to an LLM?",
      options: ["With cross-attention layers", "By projecting ViT patch embeddings into the LLM's embedding space so they become ordinary tokens in the same sequence", "By fine-tuning the LLM on image captions", "By converting images to text descriptions first"],
      answer: 1,
      why: "A decoder consumes a sequence of d_model vectors and has no way to know their origin. Projecting patches into that space makes them tokens, so image and text attend to each other in every layer with no architectural change. The projection — about 21M parameters for 1024 to 4096 — is often the only trained component." },
    { stem: "What limits image resolution in vision-language models?",
      options: ["GPU memory for the vision encoder", "Visual token count — a 1024px image at patch 14 is 5,329 tokens, 130% of a 4k context", "Training data availability", "The projection layer's capacity"],
      answer: 1,
      why: "Patches scale with area, so resolution costs context quadratically. At 672px one image is already 56.2% of a 4k window, leaving under half for the question and answer. This is why VLMs downscale aggressively, use tiling, and why Flamingo's Perceiver Resampler compresses to a fixed 64 tokens regardless of resolution." },
    { stem: "Why is Flamingo's cross-attention gate initialised at zero?",
      options: ["To save computation", "So the model starts as exactly the original frozen LM and visual influence is learned in gradually without damaging it", "To prevent overfitting", "To match the vision encoder's scale"],
      answer: 1,
      why: "A tanh gate at zero means the inserted layers contribute nothing initially, so the multimodal model begins identical to the working language model. Visual influence grows as training proceeds. It directly addresses the risk that multimodal training degrades the LM's language ability — a real concern in approaches that fine-tune the LM itself." }
  ] },

  interview: { title: "Interview", sub: "Multimodal architectures", questions: [
    { level: "Core", q: "How do you make a transformer multimodal?",
      strong: "Tokenise the other modality into the same embedding space — it is a tokenisation problem, not an architecture one.",
      answer: [{ t: "p", text: "The key realisation is that a transformer decoder consumes a sequence of d_model vectors and has no idea where they came from. So the job is to turn images, or audio, or anything else, into vectors in that space. LLaVA's approach, which is now standard, runs an image through a frozen ViT, projects the patch embeddings through a small MLP into the LLM's embedding dimension, and concatenates them with the text tokens. The LLM is completely unmodified — image and text tokens attend to each other in every layer simply because they're in the same sequence. The projection is tiny, about 21 million parameters for 1024 to 4096, against a 7B model, and it's often the only thing trained. The two alternatives are CLIP, which keeps two independent towers with no cross-attention and aligns them only through a contrastive loss — that independence is what makes it a retrieval model, since you can embed a corpus once offline — and Flamingo, which freezes both a vision encoder and an LM and inserts gated cross-attention between the LM's blocks, with the gate initialised at zero so training begins as exactly the original model. LLaVA won mostly on composability: no LM modification means every serving optimisation and every new base model transfers for free." }] },
    { level: "Senior", q: "What is the main practical constraint on a vision-language model?",
      strong: "Visual tokens consume the context window quadratically in resolution.",
      answer: [{ t: "p", text: "Context, not compute. Visual tokens are patches, so the count scales with image area — and each one occupies a position in the same context window the text needs. I worked the arithmetic: at patch size 14, a 336-pixel image is 576 tokens which is 14% of a 4k window, a 672-pixel image is 2,304 tokens at 56%, and a 1024-pixel image is 5,329 tokens, 130% — the image alone doesn't fit. And attention is quadratic in sequence length on top of that, so the compute cost compounds the context cost. Essentially every design decision in VLMs follows from this. It's why they downscale so aggressively, typically to 336 or 384 pixels, which visibly loses fine detail like small text in a document. It's why tiling schemes exist, processing crops separately and combining results. It's why Flamingo's Perceiver Resampler compresses to a fixed 64 tokens regardless of input resolution, decoupling image cost from resolution entirely. And it's why multi-image conversations are disproportionately hard — each image is hundreds or thousands of tokens of KV cache that persists for the whole conversation. If I were building on one, I'd measure token cost per image at my required resolution first, because it determines how many turns and how many images a conversation can hold, and that's usually a harder limit than latency." }] },
    { level: "Senior", q: "You need image search over 10 million product photos. What architecture?",
      strong: "CLIP-style dual encoder with an ANN index — not a cross-attention VLM.",
      answer: [{ t: "p", text: "A CLIP-style dual encoder, and the reason is the independence of the towers rather than anything about quality. Embed all 10 million images once, offline, into a shared space, and index them with approximate nearest neighbours — HNSW or IVF, as in lesson 2.4. At query time you embed the text once and do an ANN lookup, so serving cost is one text encoding plus a sublinear search, independent of corpus size. A cross-attention model like a VLM cannot do this at all: its representation depends on the image-text pair, so answering one query would require re-encoding all 10 million images against it. That's not a tuning problem, it's structural. What I'd add on top: CLIP's zero-shot embeddings are a strong baseline but a domain fine-tune on your own product-caption pairs usually helps a lot, because product photography and e-commerce language are quite specific. I'd measure recall@k on held-out query-product pairs before and after. And I'd consider a two-stage setup — dual encoder for cheap retrieval of the top few hundred, then a cross-encoder to rerank those, which is exactly the retrieve-then-rerank pattern from lesson 2.8. That gets you cross-attention quality where it matters without paying for it across the whole corpus." }] }
  ] }
});
