EC.receiveLesson({
  id: "5.2",
  lede: "A loader turns a source into `Document` objects, and the half that decides what your system can do later is the **metadata**. Source, page, owner, visibility, last-updated: each is nearly free to capture at load time and effectively impossible to reconstruct from the text afterwards, so getting it wrong means re-ingesting the corpus. The other thing worth knowing before building anything on top of a loader is that several common formats **lose their structure silently** \u2014 a PDF with columns, a spreadsheet without its header row, HTML with the navigation mixed in. The text is syntactically fine and semantically scrambled, and nothing reports it.",
  objectives: [
    "Describe what a loader produces and which half matters later",
    "List the metadata fields worth capturing at load time",
    "Name the formats that lose structure when loaded naively",
    "Explain why reading ten loaded documents catches most ingestion bugs",
    "Recognise that metadata is unrecoverable after the fact"
  ],
  prerequisites: ["5.1", "1.6"],
  blocks: [
    { t: "h2", n: "01", id: "produces", text: "What a loader produces", sub: "Text, and the fields you will wish you had" },
    { t: "code", lang: "text", title: "A Document from the course corpus",
      code: "page_content : 'Cancelling a subscription. Open Account Settings and ch'\nmetadata     : {'id': 'bill-cancel-sub', 'team': 'billing', 'public': True}",
      caption: "`page_content` is embedded and reaches the model; `metadata` is what you filter on." },
    { t: "h2", n: "02", id: "fields", text: "The fields worth capturing", sub: "And what each one buys later" },
    { t: "table", head: ["Field", "What", "What it buys"], rows: [
      ["`source`", "which file or URL", "citation, and the only route back to the original"],
      ["`page` / offset", "where in it", "a citation that points at a page, not a document"],
      ["`team` / owner", "who it belongs to", "routing, and access control"],
      ["`public` / visibility", "who may see it", "the filter that **is** access control (1.6, 5.5)"],
      ["`updated`", "when it last changed", "freshness and staleness (7.5)"],
      ["doc type", "policy, runbook, FAQ", "weighting, and explaining the answer"]
    ] },
    { t: "callout", kind: "warn", title: "Unrecoverable after the fact", body: [
      { t: "p", text: "Every one of those is cheap while you still have the file handle and the directory structure, and effectively impossible to reconstruct from a block of text later. There is no way to look at a retrieved paragraph and determine which team owns it or whether it was public." },
      { t: "p", text: "So the cost of omitting them is not \u201cadd it later\u201d \u2014 it is re-ingesting the corpus, re-embedding everything, and rebuilding the index. That is why this is worth over-capturing at load time even when you have no filter in mind yet." }
    ] },
    { t: "h2", n: "03", id: "lossy", text: "Formats that lose their structure", sub: "Silently, and the text still looks fine" },
    { t: "table", head: ["Format", "What is lost"], rows: [
      ["PDF", "column order; tables become interleaved text; headers repeat on every page"],
      ["HTML", "navigation and footer text mixed into the content unless stripped"],
      ["spreadsheets", "a row means nothing without its header row"],
      ["slides", "speaker notes and slide text concatenated with no separator"],
      ["code", "indentation carries meaning and is often normalised away"]
    ] },
    { t: "callout", kind: "insight", title: "Read ten loaded documents before building anything", body: [
      { t: "p", text: "A loader that \u201cworks\u201d \u2014 no exception, plausible-looking strings \u2014 may be producing text that is syntactically fine and semantically scrambled. A two-column PDF loaded naively interleaves the columns, so every sentence is half of one paragraph followed by half of another." },
      { t: "p", text: "That failure cannot be found by any downstream metric, because retrieval will happily return the scrambled chunk and the model will happily produce a confident answer from it. Reading ten loaded documents takes ten minutes and catches most ingestion bugs, and almost nobody does it." }
    ] },
    { t: "h2", n: "04", id: "corpus", text: "The corpus this phase uses", sub: "Including three documents that exist to be excluded" },
    { t: "code", lang: "text", title: "What modules 5 to 7 are measured on",
      code: "44 documents, 41 public, 3 restricted\nlength: mean 158, min 109, max 241 chars\nby team: {'billing': 9, 'platform': 23, 'identity': 10, 'people': 1, 'product': 1}",
      caption: "The restricted three are marked in metadata, which is the only place a filter can read." },
    { t: "p", text: "The corpus was built with deliberate difficulty, because an easy one teaches nothing: near-duplicate documents that differ only in the detail that decides the answer, queries phrased the way a user would phrase them rather than the way the document does, and rare exact terms that appear in exactly one place. 5.8 shows what that difficulty does to a baseline." },
    { t: "diagram", kind: "matrix", title: "The metadata is the half that decides what you can build",
      caption: "Each field is nearly free at load time and effectively impossible to reconstruct afterwards. The `visibility` row is the one that matters most — 7.5 measures what happens when it is missing, and it is a data-exposure bug rather than a quality one.",
      cols: ["cost at load", "what it enables later"],
      rows: ["source", "page", "owner", "visibility", "last_updated"],
      cells: [
        [{ text: "free", tone: "good" }, "a citation the user can follow"],
        [{ text: "free", tone: "good" }, "a citation that lands in the right place"],
        [{ text: "free", tone: "good" }, "per-tenant filtering"],
        [{ text: "free", tone: "good" }, { text: "ACCESS CONTROL — see 7.5", tone: "crit" }],
        [{ text: "free", tone: "good" }, { text: "staleness detection", tone: "warn" }]
      ] },
    { t: "exercise", kind: "analysis", title: "Inspect what loading produced",
      difficulty: "foundation", minutes: 20,
      body: "Print a loaded Document and identify which half is embedded and which half is filtered on. Tabulate the metadata fields worth capturing at load time with what each buys later. List the formats that lose structure when loaded naively and say why the failure is invisible downstream. Then characterise the corpus this phase uses.",
      requirements: ["Print a Document's page_content and metadata",
        "Tabulate at least five metadata fields and what each enables",
        "Explain why metadata cannot be added retrospectively",
        "List at least four formats that lose structure and what each loses",
        "Explain why a structure failure is invisible to downstream metrics",
        "Report the corpus size, length distribution and team breakdown"],
      hint: "Ask, for each metadata field, whether you could reconstruct it from the text alone. That is the test for whether it must be captured at load time.",
      solution: { lang: "python", title: "x0502.py \u2014 the half that matters later",
        code: 'from corpus import DOCS, PUBLIC_DOCS\n\nd = PUBLIC_DOCS[0]\nprint("page_content :", repr(d.page_content[:60]))\nprint("metadata     :", d.metadata)\n\nL = [len(x.page_content) for x in DOCS]\nprint("length: mean %.0f, min %d, max %d" % (sum(L) / float(len(L)), min(L), max(L)))\n\nteams = {}\nfor x in DOCS:\n    teams[x.metadata["team"]] = teams.get(x.metadata["team"], 0) + 1\nprint("by team:", teams)',
        out: "==============================================================================\nPART 1 -- what a loader produces\n==============================================================================\n  a Document:\n    page_content : 'Cancelling a subscription. Open Account Settings and choose '\n    metadata     : {'id': 'bill-cancel-sub', 'team': 'billing', 'public': True}\n\n  page_content is embedded and reaches the model.\n  metadata is what you filter on -- and it is only there if the\n  loader put it there.\n\n==============================================================================\nPART 2 -- the metadata to capture at load time\n==============================================================================\n  field                  what                   what it buys later\n  source                 which file or URL      citation, and the only way back to the original\n  page / offset          where in it            a citation that points at a page, not a document\n  team / owner           who it belongs to      routing, and access control\n  public / visibility    who may see it         the filter that is access control (1.6)\n  updated                when it last changed   freshness and staleness (7.5)\n  doc type               policy, runbook, FAQ   weighting, and explaining the answer\n\n  every one is nearly free at load time and effectively impossible to\n  reconstruct from the text afterwards. recovering them means\n  re-ingesting the corpus.\n\n==============================================================================\nPART 3 -- the formats that lose their structure\n==============================================================================\n  PDF            column order, tables become interleaved text, headers repeat\n  HTML           nav and footer text mixed into content unless stripped\n  spreadsheets   a row means nothing without its header row\n  slides         speaker notes and slide text concatenated\n  code           indentation carries meaning and is often normalised away\n\n  a loader that 'works' may be producing text that is syntactically\n  fine and semantically scrambled. the check is to read ten loaded\n  documents before building anything on top of them -- which almost\n  nobody does, and which catches most ingestion bugs in ten minutes.\n\n==============================================================================\nPART 4 -- the corpus this module uses\n==============================================================================\n  44 documents, 41 public, 3 restricted\n  length: mean 158, min 109, max 241 chars\n  by team: {'billing': 9, 'platform': 23, 'identity': 10, 'people': 1, 'product': 1}\n\n  the three restricted documents exist for 5.5's filter lesson. they\n  are marked in METADATA, which is the only place a filter can read.",
        notes: [
          { t: "p", text: "**`page_content` is embedded and reaches the model; `metadata` is what you filter on** \u2014 and the metadata is only there if the loader put it there." },
          { t: "p", text: "**Every useful field is unrecoverable from the text alone.** You cannot look at a retrieved paragraph and determine which team owns it, whether it was public, or when it last changed. So omitting a field means re-ingesting and re-embedding the corpus, not adding a column." },
          { t: "p", text: "**Which is why over-capturing at load time is correct** even with no filter in mind \u2014 the loader is written before anyone knows what they will want to filter on." },
          { t: "p", text: "**Several formats lose structure silently.** A two-column PDF interleaves its columns, so each sentence is half of one paragraph followed by half of another; a spreadsheet row means nothing without its header; HTML mixes navigation into content." },
          { t: "p", text: "**That failure is invisible to every downstream metric**, because retrieval returns the scrambled chunk and the model produces a confident answer from it. Nothing raises and nothing scores it badly." },
          { t: "p", text: "**Reading ten loaded documents takes ten minutes and catches most ingestion bugs**, which makes it the highest-return activity in a RAG build and one almost nobody does." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the answers that were subtly wrong", body: [
      { t: "p", text: "A RAG system over product PDFs gives answers that are usually right and occasionally nonsensical in a specific way \u2014 they combine two unrelated facts into one sentence. Retrieval metrics look fine; the chunks returned are the right ones." },
      { t: "p", text: "The PDFs are two-column, and the loader read them line by line across both columns. Every chunk is an interleaving of two different paragraphs, so a chunk genuinely about shipping also contains half a sentence about warranties \u2014 and the model, doing its job, combines them." },
      { t: "p", text: "Nothing downstream could have caught this. The chunk was retrieved because it really is about shipping, and the answer is grounded in text that really is in the chunk. The only detection is a human reading loaded output, which is why that is worth building into the ingestion process as a step rather than leaving it as something a careful person might do." }
    ] }
  ],
  takeaways: [
    "**A loader produces `page_content` and `metadata`** \u2014 the first is embedded, the second is filtered on.",
    "**Capture source, page, owner, visibility, updated date and doc type at load time.**",
    "**None of them can be reconstructed from the text afterwards**, so omitting one means re-ingesting the corpus.",
    "**Which is why over-capturing is correct** even before you know what you will filter on.",
    "**PDFs lose column order; spreadsheets lose header context; HTML mixes in navigation; slides merge notes with content.**",
    "**A structure failure is syntactically invisible** \u2014 the text looks fine and is semantically scrambled.",
    "**No downstream metric catches it**, because retrieval returns the right chunk and the model answers from it confidently.",
    "**Read ten loaded documents before building anything on top of them** \u2014 ten minutes, and it catches most ingestion bugs.",
    "**The course corpus is 44 documents, 41 public**, built with deliberate near-duplicates, vocabulary mismatch and rare exact terms.",
    "**An easy corpus teaches nothing**, which is why this one was made hard on purpose."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why must metadata be captured at load time rather than added later?",
      options: ["Vector stores reject documents without metadata",
        "None of it can be reconstructed from the text, so adding it means re-ingesting and re-embedding the corpus",
        "Metadata added later is not indexed",
        "LangChain freezes Document objects after creation"],
      answer: 1,
      why: "You cannot look at a paragraph of retrieved text and determine which team owns it, whether it was public, or when it last changed \u2014 that information lives in the file path, the source system and the directory structure, all of which are gone by then. So a missing field is not a column to add; it is a full re-ingestion. That asymmetry is why over-capturing at load time is correct even before you have a filter in mind." },
    { stem: "A two-column PDF is loaded naively. Why is the resulting failure invisible downstream?",
      options: ["The loader raises a warning that is usually suppressed",
        "Retrieval returns the right chunk and the model answers confidently from text that really is in it",
        "Embedding models normalise column order automatically",
        "The failure only appears for queries about tables"],
      answer: 1,
      why: "The chunk genuinely is about the topic queried, so retrieval scores it correctly and every retrieval metric looks healthy. The scrambling is inside the chunk: interleaved columns mean each sentence is half of one paragraph followed by half of another, and a model doing its job combines them into a plausible sentence. Nothing raises and nothing scores it badly \u2014 only a human reading loaded output finds it." },
    { stem: "Which metadata field is doing access control?",
      options: ["`source`, because it identifies the origin system",
        "`public` or a visibility flag, because a filter on it means the document is never fetched",
        "`team`, because it scopes retrieval to the right department",
        "None \u2014 access control belongs in the prompt"],
      answer: 1,
      why: "A filter on visibility removes the document from the candidate set before retrieval returns, so it never enters the context window. The alternative \u2014 instructing the model to ignore non-public documents \u2014 puts the restricted text into the prompt and asks nicely, which is a request rather than a guarantee and is defeatable by an injection in a neighbouring document. 5.5 demonstrates the leak." },
    { stem: "What is the highest-return activity when building a new RAG ingestion pipeline?",
      options: ["Tuning the chunk size against a benchmark",
        "Reading ten loaded documents before building anything on top of them",
        "Choosing the right embedding model first",
        "Measuring Recall@k on a labelled set"],
      answer: 1,
      why: "Every other activity assumes the loaded text is a faithful representation of the source, and that assumption is what fails silently. Ten minutes of reading catches interleaved PDF columns, navigation text mixed into HTML, spreadsheet rows divorced from their headers \u2014 none of which any later measurement can detect, because retrieval and generation both behave correctly on scrambled input." }
  ] },
  interview: { title: "Interview practice", sub: "Loading", questions: [
    { level: "core", q: "What do you pay attention to when ingesting documents?",
      strong: "A strong answer leads with metadata and format fidelity.",
      answer: [
        { t: "p", text: "Two things, and neither is the chunking. First, metadata: source, page or offset, owning team, visibility, last-updated date, document type. Each is nearly free while I still have the file handle and the directory structure, and none of it can be reconstructed from a block of text later." },
        { t: "p", text: "That asymmetry is the point. Omitting a field is not something you fix by adding a column \u2014 it means re-ingesting and re-embedding the whole corpus. So I over-capture, even before I know what I will want to filter on, because the loader always gets written before anyone has thought about filters." },
        { t: "p", text: "Second, whether the loader actually preserved the structure. Several common formats lose it silently: a two-column PDF gets read across both columns so every chunk interleaves two paragraphs, HTML drags navigation and footer text into the content, a spreadsheet row means nothing without its header." },
        { t: "p", text: "And that failure is invisible to every downstream measurement, because retrieval returns the right chunk and the model answers confidently from text that really is in it. So I read ten loaded documents before building anything. Ten minutes, and it catches most ingestion bugs." }
      ] },
    { level: "advanced", q: "A RAG system gives answers that occasionally combine two unrelated facts. Diagnose it.",
      strong: "A strong answer reaches the loader, not the model.",
      answer: [
        { t: "p", text: "I would look at the loaded text before anything else, because that symptom is characteristic of interleaved content rather than of a model or retrieval problem." },
        { t: "p", text: "The usual cause is a multi-column PDF read line by line across both columns. Every chunk then contains half a sentence from one paragraph followed by half a sentence from another, and the model \u2014 behaving correctly \u2014 synthesises them into one plausible statement." },
        { t: "p", text: "What makes it hard to find from the outside is that nothing is wrong by any available measure. Retrieval returns the chunk because it genuinely is about the queried topic, so Recall and MRR look fine. The answer is grounded in text that is genuinely present, so a faithfulness check passes. The model is not hallucinating; it is reading scrambled input accurately." },
        { t: "p", text: "So the diagnosis is to print ten chunks and read them, which takes minutes. And the fix after that is a layout-aware loader for those documents, plus making 'read some loaded output' an explicit step in the ingestion process rather than something a careful person might happen to do." }
      ] },
    { level: "core", q: "What metadata would you capture during ingestion, and why those?",
      strong: "A strong answer justifies each field by what it enables downstream.",
      answer: [
        { t: "p", text: "Source, page or character offset, owning team, a visibility flag, last-updated date, and document type. And I would capture them even with no immediate use for them." },
        { t: "p", text: "Each one earns its place by something it enables later. Source and offset are the only route back to the original, which is what a citation needs to be checkable rather than decorative. Visibility is the field a retrieval filter reads, which means it is doing access control \u2014 and it is the only place access control can live, because the embedding knows nothing about permissions." },
        { t: "p", text: "Owning team gives you routing and scoping. Last-updated gives you staleness detection, which matters because a RAG system will confidently answer from a document that was superseded a year ago and nothing in the answer indicates its age." },
        { t: "p", text: "The reason I over-capture rather than add fields as needed is the asymmetry in cost. While the loader runs I have the file handle and the directory structure, so each field is nearly free. Afterwards none of it can be reconstructed from a block of text, so adding one means re-ingesting and re-embedding the corpus. The loader also always gets written before anyone has thought about filters, which is exactly when the information is available and nobody knows they need it." }
      ] }
  ] }
});
