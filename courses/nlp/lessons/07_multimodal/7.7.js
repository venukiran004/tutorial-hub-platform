/* ============================================================================
   LESSON 7.7 — Document Understanding
   Mirrors 03_Multimodal_AI.md · §9. The classical pipeline, why each stage
   loses information, and the OCR-free alternative.
   ========================================================================= */
EC.receiveLesson({
  id: "7.7",

  lede: "**A document is not text with pictures in it — it is a spatial object where position carries meaning.** A number in a table means something because of the row and column it sits in; a heading is a heading because of its size and placement. Text extraction discards exactly that, which is why the classical five-stage pipeline exists and why a whole family of models now skips it entirely. This lesson covers both routes and what each one costs.",

  objectives: [
    "Explain why layout carries meaning that text extraction destroys",
    "Trace the classical document AI pipeline and locate its failure points",
    "Describe how LayoutLM adds spatial position to a text model",
    "Compare OCR-based and OCR-free approaches",
    "Choose an approach from the document type and the error budget"
  ],

  prerequisites: ["7.6", "3.7"],

  blocks: [

    { t: "h2", n: "01", text: "Why documents are not text", id: "why" },

    { t: "callout", kind: "crit", title: "Position is semantics",
      body: [{ t: "p", text: "In an invoice, `1,240.00` means *total* because it sits in the bottom-right, aligned under a column headed *Amount*, on the row labelled *Total*. Strip the layout and you have a number with no role. In a two-column paper, naive extraction interleaves the columns and produces sentences that alternate between unrelated paragraphs. In a table, reading order flattens a grid into a sequence where no cell knows its row or column. The information was never in the characters alone — it was in the **arrangement**, and every text-extraction step is a lossy projection of a 2-D object onto a 1-D one." }] },

    { t: "h2", n: "02", text: "The classical pipeline", id: "pipeline" },

    { t: "diagram", kind: "steps", title: "Five stages, five places to fail",
      items: [
        { title: "1. Layout analysis", text: "Detect regions — text blocks, tables, figures, headers. Get this wrong and everything downstream operates on the wrong crops." },
        { title: "2. OCR", text: "Characters from pixels. Strong on clean print, weak on handwriting, stamps, low resolution and unusual fonts." },
        { title: "3. Structure understanding", text: "Which block is a heading, which lines form a paragraph, which cells form a row. Reconstructing what layout analysis implied." },
        { title: "4. Information extraction", text: "Entities and key-value pairs — the actual task, often the only stage anyone specified." },
        { title: "5. Output", text: "Structured data, embeddings or summaries for whatever consumes it." }
      ] },

    { t: "callout", kind: "warn", title: "Errors compound, exactly as in lesson 3.7",
      body: [{ t: "p", text: "Five imperfect stages in series. At a generous 90% each the end-to-end accuracy is 0.9⁵ ≈ **59%**, the same arithmetic that made the knowledge-graph pipeline in lesson 3.7 fragile. And the failure mode is the same: a layout error produces a wrong crop, OCR reads it confidently, extraction returns a plausible value, and nothing anywhere signals that the first stage was wrong. When a document pipeline underperforms, measure **each stage separately** — the aggregate number tells you something is wrong and never which thing." }] },

    { t: "h2", n: "03", text: "The model landscape", id: "models" },

    { t: "table",
      head: ["Model", "Task", "Approach"],
      rows: [
        ["LayoutLM", "Document understanding", "Text + 2-D position + image patches in one transformer"],
        ["Donut", "OCR-free understanding", "Image straight to structured output, no OCR stage"],
        ["TrOCR", "OCR", "Transformer encoder-decoder over image patches"],
        ["Table Transformer", "Table detection and structure", "Object detection for rows, columns and cells"],
        ["Nougat", "Academic PDF parsing", "Page image to LaTeX, preserving equations"],
        ["DocTR", "Production OCR", "Detection plus recognition pipeline"]
      ] },

    { t: "h2", n: "04", text: "LayoutLM: position as an input", id: "layoutlm" },

    { t: "p", text: "The idea is small and effective. A text transformer embeds a token and adds a **1-D** positional encoding for its index in the sequence. LayoutLM adds **2-D** positional embeddings as well — the token's bounding box on the page — so the model knows not just that a word is fifth but that it sits at a particular x and y." },

    { t: "out", text:
"standard text model      token embedding + 1-D position (index in sequence)\nLayoutLM                 token embedding + 1-D position\n                                          + 2-D position (x0, y0, x1, y1)\n                                          + image patch features" },

    { t: "callout", kind: "insight", title: "The same trick as lesson 4.2, one dimension higher",
      body: [{ t: "p", text: "Lesson 4.2 established that attention is permutation-equivariant and position must be **added** to the input. LayoutLM applies exactly that reasoning to two dimensions: attention cannot tell that a token sits above another unless you tell it, so you embed the bounding-box coordinates and add them in. Note the contrast with lesson 5.7's observation that ViT flattens a 14×14 grid and applies **1-D** positional embeddings, leaving the model to infer two-dimensional structure. LayoutLM does the thing ViT did not, and for documents — where a cell's column position is the whole meaning — that is not optional." }] },

    { t: "h2", n: "05", text: "OCR-free models", id: "ocrfree" },

    { t: "diagram", kind: "compare", title: "Two routes through a document",
      columns: [
        { title: "OCR-based", tone: "warn", items: [
          "Layout, OCR, structure, extraction",
          "Each stage separately debuggable",
          "Errors compound across five stages",
          "Mature, well-tooled, predictable",
          "OCR errors are permanent downstream",
          "LayoutLM, DocTR, Table Transformer"
        ] },
        { title: "OCR-free", tone: "good", items: [
          "Page image straight to structured output",
          "One model, trained end to end",
          "No compounding pipeline",
          "Harder to debug — it is one black box",
          "Needs training data in your format",
          "Donut, Nougat, ColPali"
        ] }
      ] },

    { t: "callout", kind: "tradeoff", title: "End to end removes compounding and removes visibility",
      body: [{ t: "p", text: "Donut takes a page image and emits structured output directly, with no OCR stage at all, so there is no five-stage product of accuracies to decay. That is a genuine advantage, and it comes with a real loss: when a five-stage pipeline gets something wrong you can find out *which stage*, and when an end-to-end model gets it wrong you have one number and an image. The second cost is data — an OCR pipeline generalises across document types because OCR is generic, whereas an end-to-end model needs training examples in **your** format and layout. My recommendation would be OCR-based for varied document types and modest volume, end-to-end when you process one high-volume format and can afford to label it." }] },

    { t: "h2", n: "06", text: "Where the errors actually come from", id: "errors" },

    { t: "dl", items: [
      ["Layout misdetection", "The most damaging and the least noticed. A merged table region or a missed column boundary corrupts everything downstream, and OCR will happily read the wrong crop."],
      ["OCR on hard input", "Handwriting, stamps, low-resolution scans, unusual fonts, non-Latin scripts. Confidence scores are available and rarely used — surface them."],
      ["Reading order", "Multi-column layouts, sidebars and footnotes. Text that is individually correct assembled into nonsense."],
      ["Table structure", "Merged cells, nested headers, spanning rows. Detecting that a table *exists* is far easier than recovering its grid."],
      ["The VLM shortcut", "Sending the page to a general VLM feels like it skips all of this. Lesson 7.3 measured what that costs: fluent, confident, wrong."]
    ] },

    { t: "callout", kind: "crit", title: "Documents are where fluent wrongness is most expensive",
      body: [{ t: "p", text: "Document AI usually feeds a financial, legal or clinical decision, and the characteristic VLM failure from lesson 7.3 — grammatical, confident and inaccurate — is at its most dangerous there. A misread invoice total or a hallucinated dosage does not announce itself. So this is the domain where verification is least optional: check extracted values against document-level constraints (do the line items sum to the total?), surface OCR confidence rather than discarding it, and route low-confidence extractions to a human. A structural check that a number is internally consistent catches errors no amount of model quality will." }] },

    { t: "exercise", title: "Measure your pipeline",
      tasks: [
        "Take 50 documents and measure layout, OCR and extraction accuracy separately, then compare the product against the end-to-end number.",
        "Extract a two-column PDF as plain text and find where the columns interleave.",
        "Extract a table with merged cells and see what happens to the grid.",
        "Compare a general VLM against a document-specific model on the same pages and count errors.",
        "Add an arithmetic consistency check to your extraction and measure how many errors it catches."
      ] }
  ],

  takeaways: [
    "Position is semantics in a document: a number means 'total' because of where it sits, and text extraction projects a 2-D object onto 1-D.",
    "The classical pipeline is layout analysis, OCR, structure, extraction, output — five stages whose accuracies multiply, roughly 59% at a generous 90% each.",
    "Layout errors are the most damaging and least noticed, because OCR confidently reads whatever crop it is given.",
    "LayoutLM adds 2-D bounding-box positional embeddings alongside the usual 1-D ones — the lesson 4.2 argument applied one dimension higher.",
    "ViT, by contrast, flattens its grid and uses 1-D positions; for documents that would not be acceptable.",
    "OCR-free models like Donut go from page image to structured output, removing the compounding pipeline but also the per-stage visibility.",
    "OCR-based generalises across document types; end-to-end needs training data in your specific format.",
    "Table structure is much harder than table detection — merged cells, nested headers and spanning rows all break naive grids.",
    "Document AI feeds consequential decisions, so structural verification — do the line items sum to the total? — catches errors model quality never will."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does plain text extraction lose so much from a document?",
      options: ["OCR is inaccurate", "Layout carries meaning — a number means 'total' because of its row and column — and extraction projects a 2-D arrangement onto a 1-D sequence", "PDFs compress text lossily", "Fonts are not preserved"],
      answer: 1,
      why: "Even with perfect character recognition, flattening destroys the structure. Two-column layouts interleave, tables become an ordered jumble where no cell knows its row, and headings lose the size and position that made them headings. The information was in the arrangement." },
    { stem: "What does LayoutLM add to a standard text transformer?",
      options: ["More layers", "2-D positional embeddings from each token's bounding box, alongside the usual 1-D sequence position", "A separate OCR module", "Cross-attention to an image encoder"],
      answer: 1,
      why: "Attention is permutation-equivariant, so it cannot know one token sits above another unless told. Lesson 4.2 established that position must be added to the input; LayoutLM applies the same reasoning in two dimensions. Notably ViT does not — it flattens its grid and uses 1-D positions, which would be unacceptable for documents." },
    { stem: "A five-stage document pipeline underperforms. What do you do first?",
      options: ["Upgrade the OCR model", "Measure each stage separately, because the stages' accuracies multiply and the aggregate cannot tell you which one is failing", "Increase the image resolution", "Switch to an end-to-end model"],
      answer: 1,
      why: "At a generous 90% per stage, end-to-end is about 59%. It is the same compounding arithmetic as lesson 3.7's knowledge-graph pipeline, and the same failure shape: a layout error produces a wrong crop that OCR reads confidently and extraction reports plausibly, with nothing signalling the original mistake." },
    { stem: "What is the trade in choosing an OCR-free model like Donut?",
      options: ["Lower accuracy for higher speed", "No compounding pipeline, but no per-stage visibility when it fails, and it needs training data in your specific document format", "It only works on scanned documents", "It cannot handle tables"],
      answer: 1,
      why: "End to end removes the product of five accuracies, which is a genuine advantage. It also means a failure gives you one number and an image rather than a stage to blame, and an OCR pipeline generalises across document types where an end-to-end model needs examples in your layout." }
  ] },

  interview: { title: "Interview", sub: "Document AI", questions: [
    { level: "Core", q: "Why is document understanding harder than text understanding?",
      strong: "Because layout carries meaning that any text extraction destroys.",
      answer: [{ t: "p", text: "Because a document is a spatial object, not a string. A number in an invoice means 'total' because it sits bottom-right, aligned under a column headed Amount, on a row labelled Total — strip the layout and it's just a number with no role. Two-column papers interleave when extracted naively, producing sentences that alternate between unrelated paragraphs. Tables flatten into a sequence where no cell knows its row or column. So even with perfect character recognition you've lost the information, because it was in the arrangement rather than the characters. That's why the classical pipeline has five stages — layout analysis, OCR, structure understanding, information extraction, output — each reconstructing something the previous representation didn't carry. And those accuracies multiply: at a generous 90% each you're at about 59% end to end, which is the same compounding problem as a knowledge-graph pipeline. The specific danger is that layout errors are both the most damaging and the least visible, because OCR will confidently read whatever crop it's handed and extraction will return a plausible value from it, with nothing signalling that the first stage was wrong." }] },
    { level: "Senior", q: "OCR pipeline or end-to-end model for document extraction?",
      strong: "OCR-based for varied documents, end-to-end for one high-volume format you can label.",
      answer: [{ t: "p", text: "It depends on document variety and volume. An OCR-based pipeline — layout detection, OCR, structure, extraction — generalises across document types because OCR itself is generic, and crucially each stage is separately debuggable. When it fails you can identify which stage failed and fix that. The cost is compounding: five imperfect stages in series, and errors propagate silently. An end-to-end model like Donut goes from page image straight to structured output with no OCR stage, so there's no product of accuracies decaying. But it needs training data in your specific format and layout, and when it's wrong you get one number and an image with no stage to blame. So: varied document types, modest volume, and a need to explain failures — OCR pipeline. One high-volume format you process constantly and can afford to label — end-to-end, and it will likely beat the pipeline. Whichever I chose, I'd add structural verification independent of the model, because this domain usually feeds financial or legal decisions. Checking that line items sum to the stated total catches errors that no amount of model quality will, and it's a check the model can't fake." }] },
    { level: "Senior", q: "Can you just send document pages to a general VLM?",
      strong: "You can, and the failure mode is fluent wrongness on exactly the values that matter.",
      answer: [{ t: "p", text: "You can, and it's tempting because it appears to collapse the whole pipeline into one API call. I'd be cautious, for reasons I've measured. The characteristic VLM failure is fluent, confident, plausible wrongness with no confidence signal attached — I tested a captioning model on simple generated shapes and every unconditional caption was grammatical and wrong, describing a red circle as 'a white circle with a black dot'. In documents that failure mode is at its most expensive, because the output feeds financial, legal or clinical decisions and a misread total doesn't announce itself. There are two more specific problems. General VLMs are weak at reading dense text in images, which is the core task here, and they're weak at counting and spatial relations — both traceable to a training distribution of web captions that rarely state those things. And a general VLM discards the confidence information an OCR engine would have given you for free. So my position is: it's a reasonable first prototype to find out whether the task is feasible at all, and for production I'd either use a document-specific model or keep the VLM with verification around it — ask the same extraction several ways and check for agreement, cross-check values against document-level arithmetic, and route disagreements to a human." }] }
  ] }
});
