/* ============================================================================
   LESSON 7.6 — Multimodal Embeddings and RAG
   Mirrors 03_Multimodal_AI.md · §7-8. Cross-modal retrieval is run (3/3),
   and text-to-text similarity is shown to work despite never being a
   training objective — while absolute scores prove uncomparable across
   pairs (§03) (scratchpad/nlp/n71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.6",

  lede: "**CLIP's loss only ever compared images against text, yet text-to-text similarity orders correctly: `dog`/`puppy` 0.9594 against `dog`/`engine` 0.8323.** Alignment transfers to pairings the objective never touched. That transfer is the entire bet behind ImageBind, which uses images as an anchor to bind six modalities without ever training most of the pairs. But look at the second number — 0.8323 for *dog* and *engine* is higher than 0.6762 for a red circle and a blue square. The ordering is reliable; the absolute scale is not, and that distinction decides how you build retrieval on top.",

  objectives: [
    "Explain what a unified embedding space enables",
    "Run cross-modal retrieval and read the similarity structure",
    "Describe ImageBind's anchor strategy and why it works",
    "Design a multimodal RAG pipeline and choose an indexing strategy",
    "Recognise why absolute similarity scores cannot be compared across pairs"
  ],

  prerequisites: ["7.5", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "One space, many modalities", id: "space" },

    { t: "out", text:
"Image -> image encoder -> embedding\nText  -> text encoder  -> embedding      all in the SAME space\nAudio -> audio encoder -> embedding\n\nwhich enables:\n  text query   -> find matching images\n  image query  -> find matching descriptions\n  audio query  -> find matching video clips" },

    { t: "table",
      head: ["Model", "Modalities", "Use"],
      rows: [
        ["CLIP", "Image + text", "Image-text retrieval, zero-shot classification"],
        ["CLAP", "Audio + text", "Audio-text retrieval"],
        ["ImageBind", "Image, text, audio, depth, thermal, IMU", "Universal binding across six modalities"],
        ["ONE-PEACE", "Vision, language, audio", "Unified embedding"]
      ] },

    { t: "h2", n: "02", text: "Cross-modal retrieval, run", id: "retrieval" },

    { t: "out", text:
"text queries against three generated images\n\n  query                          circle      square      triangle\n  a photo of a red circle        0.2857      0.2219      0.2102\n  a photo of a blue square       0.2248      0.3191      0.2406\n  a photo of a green triangle    0.2115      0.2495      0.3493\n\n  retrieval correct: 3/3" },

    { t: "callout", kind: "insight", title: "Correct ranking, compressed range",
      body: [{ t: "p", text: "Every query retrieves its image — but the correct score is 0.2857 and the worst distractor is 0.2102, a gap of only 0.0755 on an absolute scale where 1.0 is identity. That narrow band is the **anisotropy** lesson 3.6 measured in BERT's final layer and lesson 5.9 noted in CLIP's text space: embeddings occupy a narrow cone, so cosines cluster high and close. It does not harm retrieval, which only needs the ranking, and it does mean a similarity threshold chosen on one dataset will not transfer to another." }] },

    { t: "h2", n: "03", text: "Transfer to untrained pairings", id: "transfer" },

    { t: "out", text:
"text-to-text similarity — a pairing CLIP's loss NEVER compared\n\n  0.8064   'a photo of a red circle' / 'a photo of a crimson round shape'\n  0.6762   'a photo of a red circle' / 'a photo of a blue square'\n\n  0.9594   'a photo of a dog'        / 'a photo of a puppy'\n  0.8323   'a photo of a dog'        / 'a photo of an engine'" },

    { t: "callout", kind: "insight", title: "Within each pair the ordering is right; across pairs it is meaningless",
      body: [{ t: "p", text: "Paraphrase beats contrast in both cases — 0.8064 over 0.6762, and 0.9594 over 0.8323. CLIP was never trained to compare two texts, only text against images, so this is **emergent transfer**: forcing both modalities into one space aligns text with text as a side effect. But notice that *dog*/*engine*, two completely unrelated concepts, scores **0.8323** — higher than *red circle*/*blue square* at 0.6762, which are at least both simple coloured shapes. The absolute value carries almost no information across different comparisons. Use these scores to **rank within a query** and never to threshold across queries, which is a standing rule for embedding retrieval and the reason recall@k is the metric rather than a similarity cutoff." }] },

    { t: "h2", n: "04", text: "ImageBind's anchor", id: "imagebind" },

    { t: "out", text:
"the key observation: images appear in all the natural pairings\n\n  image <-> text       from CLIP-style caption pairs\n  image <-> audio      from video with sound\n  image <-> depth      from RGBD cameras\n  image <-> thermal    from thermal cameras\n  image <-> IMU        from video with motion sensors\n\nbind each modality to IMAGES, and all six share one space" },

    { t: "callout", kind: "crit", title: "Audio can retrieve images from a pairing never trained",
      body: [{ t: "p", text: "ImageBind never trains audio against text. It trains audio against images, and text against images, and the shared anchor makes audio-to-text work anyway — the same emergent transfer just measured for text-to-text in CLIP, scaled up. This matters because **paired data is the binding constraint in multimodal learning**. Image-text pairs exist in enormous quantity as web alt-text; audio-text pairs are far scarcer; thermal-text pairs essentially do not exist. Routing everything through the one modality that co-occurs with everything else turns an impossible data problem into a tractable one. The cost is that quality degrades for pairs mediated through the anchor rather than trained directly." }] },

    { t: "h2", n: "05", text: "Multimodal RAG", id: "rag" },

    { t: "diagram", kind: "flow", title: "Retrieve across modalities, then generate", cols: 3,
      nodes: [
        { id: "q", text: "Query: text, optionally with an image", tone: "accent" },
        { id: "t", text: "Text chunks -> text embeddings", tone: "teal" },
        { id: "i", text: "Images -> CLIP embeddings, or VLM descriptions", tone: "teal" },
        { id: "b", text: "Tables -> structured extraction", tone: "teal" },
        { id: "c", text: "Retrieved context: text, images, tables", tone: "violet" },
        { id: "v", text: "VLM generates a grounded answer", tone: "good" }
      ],
      edges: [["q","t"],["q","i"],["q","b"],["t","c"],["i","c"],["b","c"],["c","v"]] },

    { t: "dl", items: [
      ["Describe then embed", "Caption each image with a VLM and index the caption as text. Uses your existing text pipeline, and inherits the VLM's hallucinations — lesson 7.3 showed all three captions of simple shapes were wrong."],
      ["Embed directly with CLIP", "Index image embeddings and search them with the text query. No captioning step and no hallucination, but limited by CLIP's weak spots: counting, spatial relations, text in images."],
      ["Hybrid", "Do both and fuse the results. More storage and more complexity; usually the best recall."],
      ["Page-as-image (ColPali)", "Skip parsing entirely — embed the rendered page with a vision model. Preserves layout, tables and figures that text extraction destroys."]
    ] },

    { t: "callout", kind: "tradeoff", title: "The describe-then-embed trap",
      body: [{ t: "p", text: "Captioning images with a VLM and indexing the captions is the most common approach because it reuses everything you already have. It also inserts a **lossy, hallucinating** step at index time, and the errors are permanent — lesson 7.3's model captioned a red circle as *\"a white circle with a black dot\"*, and once that is in the index the image is unfindable by anyone searching for a red circle and wrongly findable by someone searching for a black dot. Direct CLIP embedding has no such step. If you use captions, evaluate them: sample a hundred and count how many are accurate before building an index on them." }] },

    { t: "h2", n: "06", text: "ColPali: retrieval without parsing", id: "colpali" },

    { t: "out", text:
"traditional:  PDF -> parse -> extract text -> embed text -> retrieve\nColPali:      PDF -> render page as image -> embed with a vision model" },

    { t: "callout", kind: "insight", title: "Parsing is where the information is lost",
      body: [{ t: "p", text: "PDF text extraction destroys exactly what makes documents comprehensible: table structure becomes a jumble of cells, figures vanish, column layout interleaves, and a chart's meaning disappears entirely. ColPali skips it — render the page, embed the image, retrieve on that. The document is preserved as it appears. This inverts the usual instinct that text is the canonical representation and images are a degraded form; for documents, **the rendered page is the canonical form** and the extracted text is the degradation. The cost is storage and compute per page, and that the retrieval model must be strong at reading text in images — which lesson 7.2 identified as one of CLIP's weakest areas, hence the specialised models." }] },

    { t: "exercise", title: "Build and probe an index",
      tasks: [
        "Run cross-modal retrieval on your own images and check the gap between the correct match and the best distractor.",
        "Compute text-to-text similarity for pairs you understand, and confirm the ordering holds while absolute values do not compare across pairs.",
        "Caption 100 images with a VLM and count how many captions are accurate enough to index.",
        "Build both a caption index and a CLIP index over the same images, and compare recall@5.",
        "Take a PDF with tables and figures, extract it as text, and list what was lost."
      ] }
  ],

  takeaways: [
    "A unified embedding space lets any modality query any other, provided all encoders project into it.",
    "Cross-modal retrieval scored 3/3, but the correct match at 0.2857 beat the best distractor at 0.2102 by only 0.0755 — anisotropy compresses the range.",
    "CLIP's loss never compared text to text, yet dog/puppy scores 0.9594 against dog/engine's 0.8323 — alignment transfers to untrained pairings.",
    "But dog/engine at 0.8323 exceeds red-circle/blue-square at 0.6762, so absolute scores are meaningless across different comparisons.",
    "Rank within a query; never threshold across queries. That is why recall@k is the metric rather than a similarity cutoff.",
    "ImageBind binds six modalities through images, because images co-occur with everything and paired data is the real constraint.",
    "Audio-to-text retrieval works in ImageBind without ever being trained — the same transfer, scaled.",
    "Describe-then-embed inserts a hallucinating step at index time whose errors are permanent; evaluate captions before indexing them.",
    "ColPali treats the rendered page as canonical and skips parsing, which is where table structure, figures and layout are destroyed."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "CLIP was never trained on text-to-text pairs. Why does text-to-text similarity work?",
      options: ["It was secretly trained on them", "Forcing both modalities into one space aligns text with text as a side effect — emergent transfer to untrained pairings", "The text encoder is a general language model", "It does not actually work"],
      answer: 1,
      why: "dog/puppy scores 0.9594 against dog/engine's 0.8323 — the ordering is correct. This transfer is exactly ImageBind's bet, scaled: bind every modality to images and pairings that were never trained together still align, because they share one space." },
    { stem: "dog/engine scores 0.8323 while red-circle/blue-square scores 0.6762. What follows?",
      options: ["The model thinks dogs and engines are related", "Absolute similarity values are not comparable across different comparisons — rank within a query, never threshold across queries", "The embeddings are broken", "The prompts were poorly chosen"],
      answer: 1,
      why: "Two unrelated concepts outscore two simple coloured shapes. Within each pair the ordering is correct, but the absolute scale carries almost no cross-comparison information. That is a standing rule for embedding retrieval and the reason evaluation uses recall@k rather than a similarity cutoff." },
    { stem: "Why does ImageBind use images as the anchor modality?",
      options: ["Images are the richest modality", "Images co-occur naturally with every other modality, and paired data is the binding constraint", "Image encoders are the most accurate", "It reduces the parameter count"],
      answer: 1,
      why: "Image-text pairs exist as web alt-text in enormous quantity; audio-text pairs are scarce and thermal-text pairs essentially do not exist. But images pair naturally with audio through video, with depth through RGBD, with motion through IMU. Routing everything through the one universally co-occurring modality makes the data problem tractable." },
    { stem: "What is the risk of captioning images with a VLM and indexing the captions?",
      options: ["It is too slow", "The captioning step hallucinates, and those errors become permanent index entries", "Captions are too short", "It requires more storage than CLIP embeddings"],
      answer: 1,
      why: "Lesson 7.3 measured a VLM captioning a red circle as 'a white circle with a black dot'. Indexed, that image is unfindable by anyone searching for a red circle and wrongly findable for a black dot. Direct CLIP embedding has no such step — if you do use captions, sample and measure their accuracy before building on them." }
  ] },

  interview: { title: "Interview", sub: "Multimodal retrieval", questions: [
    { level: "Core", q: "How would you build search over a corpus of images?",
      strong: "Embed images with CLIP, index with ANN, and search with the text query directly.",
      answer: [{ t: "p", text: "Embed every image once with CLIP, index the embeddings with approximate nearest neighbours — HNSW or IVF — and at query time embed the text and search. That works because CLIP's two towers never interact, so each image embedding depends only on that image and can be computed offline. Serving cost is one text encoding plus a sublinear search regardless of corpus size. Two things I'd do carefully. First, prompting: I measured 'a photo of a red circle' scoring 0.9951 against bare 'circle' at 0.7440 on the identical image, because CLIP's text tower was trained on web alt-text. Applying the template to queries is free accuracy. Second, I would not threshold on similarity. I measured 'dog' and 'engine' — completely unrelated — scoring 0.8323, while 'red circle' and 'blue square' scored 0.6762. The absolute values aren't comparable across queries, so a cutoff tuned on one set of queries will fail on another. Rank within a query and use recall@k to evaluate. The alternative approach, captioning each image with a VLM and indexing the text, reuses your existing pipeline but inserts a hallucinating step whose errors become permanent — I'd measure caption accuracy on a sample before committing to it." }] },
    { level: "Senior", q: "What is ImageBind's insight and why does it matter?",
      strong: "Bind every modality to images, because images co-occur with everything and paired data is the constraint.",
      answer: [{ t: "p", text: "The insight is that images appear in all the natural pairings, so you can use them as an anchor. Train image-to-text from captions, image-to-audio from video soundtracks, image-to-depth from RGBD cameras, image-to-IMU from video with motion sensors — and all six modalities end up in one shared space, so audio can retrieve text even though that pair was never trained. That matters because paired data, not compute or architecture, is the real constraint in multimodal learning. Image-text pairs exist in the hundreds of millions as web alt-text. Audio-text pairs are far scarcer. Thermal-text pairs essentially don't exist at all. Training every pair directly would need data that isn't there. Routing through the one modality that co-occurs with everything turns an impossible problem into a tractable one. I can show a small version of why it works: CLIP's loss only ever compared images against text, never text against text, and yet text-to-text similarity still orders sensibly — dog/puppy at 0.9594 against dog/engine at 0.8323. Alignment transfers to pairings the objective never touched. The honest caveat is that quality is lower for pairs mediated through the anchor than for pairs trained directly, so I'd evaluate the specific pairing I depend on rather than assuming uniform quality across the six." }] },
    { level: "Senior", q: "You need RAG over PDFs with tables and charts. How do you approach it?",
      strong: "Consider page-as-image retrieval, because parsing is where the information is lost.",
      answer: [{ t: "p", text: "I'd start by questioning the parsing step, because that's usually where the failure originates. Standard PDF text extraction destroys exactly what makes a document comprehensible — table structure becomes a jumble of cells in reading order, column layout interleaves, figures disappear, and a chart's meaning is simply gone. If the answers live in tables and charts, a text-only index cannot retrieve them regardless of how good the embeddings are. So the ColPali approach is worth serious consideration: render each page as an image and embed it with a vision retrieval model. The document is preserved as it appears, layout and all. It inverts the usual instinct that text is canonical — for documents the rendered page is canonical and the extracted text is the degradation. The costs are real: storage and compute per page are higher, and the retrieval model has to be genuinely good at reading text in images, which is one of CLIP's weakest areas, so you need a model specialised for it. If I stayed with a parse-based pipeline, I'd extract tables as structured data rather than flattened text, keep figures as images indexed separately, and use a hybrid index. And either way I'd evaluate on questions whose answers are only in tables or charts, because those are the ones a text pipeline silently fails on while the aggregate metric looks fine." }] }
  ] }
});
