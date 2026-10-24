/* ============================================================================
   IV 1.2 — Experience 2: GenAI Engineer, Two Technical Rounds
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "Two technical rounds for a GenAI engineer role. **These are fundamentals, and that is the difficulty** — a question like *“what is RAG”* has a two-sentence answer anybody can give and a two-minute answer that shows you have run one. Round two went wider than GenAI into data engineering, which is worth noticing: slowly changing dimensions and duplicate removal in the same round as chunking strategies. The project question is left out; everything else transfers.",

  objectives: [
    "Answer “what is RAG” with the problem it solves, not the acronym",
    "Choose a chunking strategy from the document shape rather than by default",
    "Improve retrieval accuracy in a stated order, diagnosing first",
    "Explain precision, recall and F1 where accuracy misleads",
    "Say when LangGraph earns its complexity over LangChain"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "What is RAG, and how does it improve LLM responses", id: "rag" },

    {"kind": "trace", "title": "Four problems, not one acronym", "caption": "**The weak answer expands the acronym; the strong one names the problems, because there are four and they are different.** The hallucination row carries the honest caveat worth saying aloud: RAG reduces invention because the model is summarising rather than recalling, and it does **not** stop the model inventing when retrieval returns nothing. **And the comparison they are listening for:** fine-tuning teaches form and behaviour, RAG supplies facts — which complaint you have decides which tool you reach for.", "left": "problem", "codeW": 190, "vars": ["what RAG does about it"], "steps": [{"code": "the model never saw your documents", "state": ["supplies them at query time"], "tone": "good"}, {"code": "the facts have changed since training", "state": ["re-index a document instead of retraining"], "changed": [0], "tone": "good"}, {"code": "hallucination", "state": ["REDUCED - summarising beats recalling - not eliminated"], "changed": [0], "tone": "warn"}, {"code": "nobody can check the answer", "state": ["citations - often the actual requirement"], "changed": [0], "tone": "violet"}, {"code": "and versus fine-tuning", "state": ["fine-tuning teaches FORM; RAG supplies FACTS"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-1_2-01-0"},

    { t: "p", text: "**The weak answer is the expansion of the acronym.** The strong answer names the problems it solves, because there are four and they are different." },

    { t: "dl", items: [
      ["Knowledge the model does not have", "Your documents were not in the training data. No amount of prompting produces facts the weights do not contain."],
      ["Knowledge that has changed", "A model's parameters are frozen at training time. Retrieval is how an answer reflects a policy updated last week."],
      ["Hallucination, reduced rather than eliminated", "Given the passage, the model is summarising rather than recalling, which is a far more reliable operation. **It does not stop the model inventing when retrieval returns nothing** — and that is the honest caveat worth saying."],
      ["Attribution", "The answer can cite the chunk it came from, so a user can check it and a wrong answer is diagnosable. For many enterprise uses this is the actual requirement."]
    ] },

    { t: "code", lang: "text", title: "the pipeline, in the order it runs",
      code: `INGESTION (once, offline)
  load -> parse -> chunk -> embed -> store in a vector index
                                     (+ keyword index, + metadata)

QUERY (per request)
  question -> embed -> search -> top-k chunks
           -> (rerank) -> prompt: instructions + chunks + question
           -> model -> answer (+ citations)`,
      caption: "**Being able to draw this is most of the answer**, and the two-phase split is the part that matters: embedding is expensive and happens once, retrieval is cheap and happens per request. The parenthesised steps are where a baseline becomes a good system." },

    { t: "callout", kind: "good", title: "The comparison they are listening for",
      body: [
        { t: "p", text: "*“The alternative to RAG is fine-tuning, and they solve different problems. **Fine-tuning teaches form and behaviour — tone, output format, a domain's style. RAG supplies facts.** If the complaint is that the model does not know something, that is retrieval. If the complaint is that it does not answer the way we need, that is fine-tuning or prompting.”*" },
        { t: "p", text: "Adding that RAG is also cheaper to update — re-index a document rather than retrain — and auditable, because you can see which chunk produced the claim, usually closes the question." }
      ] },

    { t: "h2", n: "02", text: "Chunking strategies, and how to choose", id: "chunking" },

    {"kind": "tree", "title": "The deciding question, not the list", "caption": "**What is the smallest unit that can answer a question on its own?** Smaller than that cannot answer; much larger dilutes the embedding, because an embedding is one vector for everything in the chunk. **And the signal worth as much as the list: knowing when to stop.** Look at retrieved chunks for failing questions — cut mid-argument means the splitter is wrong, relevant-but-still-wrong means chunking is not the problem and further tuning is wasted effort.", "root": {"label": "What does the document look like?", "sub": "structure decides, not a default", "tone": "accent", "children": [{"label": "Mixed prose, no strong structure", "sub": "the common case", "tone": "good", "children": [{"label": "Recursive character, ~512 tokens, 10% overlap", "sub": "the default to start from", "tone": "good"}]}, {"label": "Real structure: headings, clauses, code", "sub": "policies, manuals, source", "tone": "accent", "children": [{"label": "Split on the structure itself", "sub": "and never inside a table", "tone": "accent"}]}, {"label": "Precision AND context both needed", "sub": "small match, large answer", "tone": "violet", "children": [{"label": "Parent-document: embed small, return the parent", "sub": "or sentence-window", "tone": "violet"}]}, {"label": "Orphaned chunks losing their context", "sub": "overlap is not fixing it", "tone": "teal", "children": [{"label": "Contextual retrieval: prefix a line of context", "sub": "one model call per chunk at ingestion", "tone": "teal"}]}]}, "t": "diagram", "id": "dg-1_2-02-1"},

    { t: "p", text: "**The choice is driven by the document's structure, not by a default.** Name the strategies, then the deciding question." },

    { t: "table",
      head: ["Strategy", "How it splits", "Right when"],
      rows: [
        ["**Fixed-size**", "Every N tokens, with overlap", "The corpus is uniform prose and you need a baseline today"],
        ["**Recursive character**", "Tries paragraph, then sentence, then word", "The sensible default — respects structure where it exists, degrades gracefully"],
        ["**Document-structure aware**", "On markdown headings, HTML tags, code functions", "The document has real structure: policies, manuals, code"],
        ["**Semantic**", "Where the embedding similarity between adjacent sentences drops", "Topic boundaries matter and compute at ingestion is cheap"],
        ["**Parent-document / small-to-big**", "Embed small chunks, return their larger parent", "Precision in matching and context in the answer are both needed"],
        ["**Sentence-window**", "Embed a sentence, return it with N neighbours", "Dense factual text where the matching unit is small"],
        ["**Whole-document**", "No splitting", "Short documents, or a long-context model and few documents"]
      ] },

    { t: "dl", items: [
      ["The deciding question", "**What is the smallest unit that answers a question on its own?** A chunk smaller than that cannot answer; a chunk much larger dilutes the embedding and wastes context. For a policy document that is usually a clause or a subsection; for a chat log it is a turn plus its neighbours."],
      ["Overlap, and why", "10–20% so a fact landing on a boundary is not cut in half. More than that duplicates content across chunks and inflates the index for nothing."],
      ["Size as a starting point", "256–512 tokens is the usual range. Small chunks make precise matches and lose context; large chunks carry context and blur the embedding, because an embedding is one vector for everything in it."],
      ["Contextual retrieval", "Prefix each chunk with a generated line of document context before embedding — *“From the 2026 expenses policy, section on travel”*. It costs a model call per chunk at ingestion and fixes the orphaned-chunk problem better than overlap does."],
      ["Never split a table", "Half a table is worse than none, because each half still reads as plausible data. Extract tables as units before chunking."]
    ] },

    { t: "callout", kind: "insight", title: "What to say about choosing",
      body: [
        { t: "p", text: "*“I would start with recursive character splitting at about 512 tokens with 10% overlap, because it is a reasonable default for mixed content. **Then I would look at actual retrieved chunks for failing questions** — if they are cut mid-argument the splitter is wrong for the document, and if they are relevant but the answer is still wrong then chunking is not the problem and I should stop tuning it.”*" },
        { t: "p", text: "Chunking is where teams spend disproportionate time, so the signal that you would look at output and then stop is worth as much as the list of strategies." }
      ] },

    { t: "h2", n: "03", text: "PDFs with text and images, and unstructured extraction", id: "pdf" },

    {"kind": "flow", "title": "Classify the PDF before parsing it", "caption": "**Step one is the one people skip, and it decides everything downstream:** OCR on a digital PDF is slow and lossy, and text extraction on a scan returns nothing at all. **Reading order is what plain extraction loses** — a two-column paper extracted naively interleaves the columns into nonsense, which is silent and corrupts every multi-column page. And OCR quality bounds everything after it, so check it on a sample before building the rest.", "cols": 3, "nodes": [{"id": "c", "label": "Classify: digital, scanned or mixed", "sub": "per page if mixed", "tone": "violet"}, {"id": "l", "label": "Layout-aware parse", "sub": "reading order, tables, headings", "tone": "accent"}, {"id": "t", "label": "Per content type", "sub": "text chunked, tables whole, images captioned", "tone": "good"}, {"id": "m", "label": "Metadata on every chunk", "sub": "source, PAGE, section, date, access tags", "tone": "good"}, {"id": "o", "label": "OCR quality bounds everything after", "sub": "sample it before building on it", "tone": "crit"}], "edges": [["c", "l"], ["l", "t"], ["t", "m"], ["c", "o"]], "t": "diagram", "id": "dg-1_2-03-2"},

    { t: "p", text: "Asked in both rounds, from two directions. **The core idea: parse with layout awareness, handle each content type in its own way, and index a text representation while returning the original.**" },

    { t: "code", lang: "text", title: "the pipeline for a mixed PDF",
      code: `1. Classify the PDF first
     digital text  -> extract directly, layout-aware
     scanned image -> OCR
     mixed         -> both, per page

2. Layout-aware parse (not plain text extraction)
     text blocks in reading order
     tables detected as tables
     images extracted with their position and caption
     headings kept, so structure survives

3. Per content type
     text   -> chunk (structure-aware where headings exist)
     tables -> keep whole; index a summary + headers; return markdown
     images -> caption with a vision model once; index the caption;
               keep the image for the answer

4. Metadata on every chunk
     source, page, section, document date, access tags`,
      caption: "**Step 1 is the one people skip**, and it decides everything downstream: running OCR on a digital PDF is slow and lossy, and running text extraction on a scan returns nothing at all. Step 4 is what makes filtering, citation and access control possible later." },

    { t: "dl", items: [
      ["Reading order is the thing plain extraction loses", "A two-column paper extracted naively interleaves the columns into nonsense. Layout-aware parsing is the difference between a usable corpus and one that silently garbles every multi-column page."],
      ["OCR quality bounds everything after it", "If the OCR is poor, no chunking or reranking recovers it. Check it on a sample before building the rest — and keep a confidence score, because a low-confidence page is worth flagging rather than indexing silently."],
      ["Headers, footers and page numbers", "They repeat on every page and pollute both the chunks and the embeddings. Strip them, which layout-aware parsers largely do for you."],
      ["Keep the page number", "*“Page 14 of the 2026 policy”* is a citation a user can verify. A citation they cannot check is nearly worthless for an enterprise deployment."]
    ] },

    { t: "h2", n: "04", text: "Improving retrieval accuracy", id: "accuracy" },

    {"kind": "trace", "title": "Diagnose first - it decides which half of the list applies", "caption": "**Pull fifty failing questions and ask whether the right chunk was in the context.** If it was not, the work is retrieval; if it was there and the answer was still wrong, adding retrieval techniques costs latency and changes nothing. **Saying this unprompted is the strongest move on the question**, because it invites a list and rewards a procedure. And the ordering underneath: hybrid search is the highest-value single change, and without recall@k on a golden set every item becomes an opinion.", "left": "change", "codeW": 180, "vars": ["fixes which half", "cost"], "steps": [{"code": "hybrid dense + BM25, fused by rank", "state": ["retrieval", "free - no model"], "tone": "violet"}, {"code": "query rewriting", "state": ["retrieval", "one small call"], "changed": [0, 1], "tone": "good"}, {"code": "metadata pre-filtering", "state": ["retrieval", "free, and beats ranking"], "changed": [0, 1], "tone": "good"}, {"code": "fix the chunking", "state": ["retrieval", "re-index"], "changed": [0, 1], "tone": "accent"}, {"code": "reranking", "state": ["GENERATION side", "30-80 ms"], "changed": [0, 1], "tone": "accent"}, {"code": "a better embedding model", "state": ["retrieval", "re-embed everything"], "changed": [0, 1], "tone": "warn"}, {"code": "recall@k on a golden set", "state": ["tells you which", "without it you are guessing"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_2-04-3"},

    { t: "p", text: "**Diagnose first.** The question invites a list, and the answer that stands out starts by splitting the failure in two." },

    { t: "code", lang: "text", title: "the diagnosis that comes before any technique",
      code: `Pull 50 failing questions. For each, check: was the right chunk
in the context the model received?

  NOT retrieved  ->  a RETRIEVAL problem
                     hybrid search, query rewriting, chunking,
                     better embeddings, metadata filters

  retrieved, and the answer is still wrong
                 ->  a GENERATION problem
                     reranking (is it buried at position 9?),
                     compression, the prompt, the model

Adding retrieval techniques to a generation problem costs
latency and changes nothing.`,
      caption: "This split decides which half of every technique list is relevant, and saying it unprompted is the strongest move available on this question." },

    { t: "dl", items: [
      ["Hybrid search — the highest-value single change", "Dense retrieval misses exact identifiers, error codes and product names; BM25 misses paraphrase. Run both, fuse with reciprocal rank fusion (`1/(k + rank)`, k≈60), which needs no model and is immune to the two score scales being incomparable."],
      ["Query rewriting", "The user's words are not the corpus's words. One rewrite step before retrieval is often the difference between a miss and a hit, and it is cheap."],
      ["Reranking", "Retrieve 50, rerank, keep 5. A cross-encoder scores the query and chunk together — far more accurate, and impossible to precompute, which is exactly why it only runs on the shortlist."],
      ["Metadata filtering", "For anything structured — date, department, document type — **filtering beats ranking**. And pre-filter rather than post-filter, or you need a much larger k and sometimes come back empty."],
      ["Fix the chunking", "If retrieved chunks are cut mid-argument, no amount of reranking helps. This is where the diagnosis pays off."],
      ["A better embedding model", "Real gains, and the most expensive change because it means re-embedding everything. Benchmark on **your** queries rather than a leaderboard — domain fit beats average rank."],
      ["Measure it", "recall@k on a golden set of 50–200 question-and-source pairs. **Without this you are guessing**, and every item above becomes an opinion."]
    ] },

    { t: "h2", n: "05", text: "Prompt engineering techniques", id: "prompting" },

    {"kind": "trace", "title": "Name the failure each technique fixes", "caption": "**Listing techniques is the ordinary answer; pairing each with the failure it addresses is the better one.** Two things then make it senior. **Where the rules belong:** per-field rules go in a schema's field descriptions, where they sit next to the field and cannot drift from it, and anything that must hold is code rather than a prompt. **And that you evaluate prompts rather than eyeball them** — a golden set, one variable changed at a time, run on every edit.", "left": "technique", "codeW": 190, "vars": ["the failure it fixes"], "steps": [{"code": "clear role and task, specific", "state": ["vague output, because the request was vague"], "tone": "good"}, {"code": "few-shot examples", "state": ["wrong format or tone - examples beat description"], "changed": [0], "tone": "good"}, {"code": "chain of thought", "state": ["multi-step reasoning collapsing into a guess"], "changed": [0], "tone": "accent"}, {"code": "a schema, not 'return JSON'", "state": ["fragile parsing - the provider enforces it"], "changed": [0], "tone": "violet"}, {"code": "delimiters around retrieved text", "state": ["the model treating data as instructions"], "changed": [0], "tone": "crit"}, {"code": "explicit refusal instruction", "state": ["answering from weights when retrieval was empty"], "changed": [0], "tone": "crit"}], "t": "diagram", "id": "dg-1_2-05-4"},

    { t: "p", text: "Name techniques with the failure each one addresses, rather than listing them." },

    { t: "table",
      head: ["Technique", "Fixes"],
      rows: [
        ["**Clear role and task**, specific over polite", "Vague output, because the request was vague"],
        ["**Few-shot examples**", "Wrong format or tone — examples specify it better than description"],
        ["**Chain of thought** / \"think step by step\"", "Multi-step reasoning collapsing into a guessed answer"],
        ["**Structured output** (a schema, not \"return JSON\")", "Fragile parsing — the provider enforces a schema; prose asks nicely"],
        ["**Delimiters** around retrieved or user content", "The model treating data as instructions"],
        ["**Explicit refusal instruction**", "Answering from its own weights when retrieval returned nothing"],
        ["**Output constraints** (length, language, audience)", "Three paragraphs where one line was wanted"],
        ["**Decomposition** into chained calls", "One prompt trying to do four things, badly"]
      ] },

    { t: "callout", kind: "good", title: "The two things that make this answer senior",
      body: [
        { t: "p", text: "**Say where the rules belong.** Per-field rules go in the schema's field descriptions rather than in prose, because they sit next to the field they govern and cannot drift from it. Cross-cutting conventions go in the system prompt. And **anything that must hold is code, not a prompt** — an instruction is a request." },
        { t: "p", text: "**And say that you evaluate prompts rather than eyeball them.** A golden set of cases, changed one variable at a time, run on every edit. Prompt engineering without measurement is how a system quietly gets worse while feeling better." }
      ] },

    { t: "h2", n: "06", text: "Imbalanced data, and precision, recall and F1", id: "metrics" },

    {"kind": "trace", "title": "99.11% accuracy, and it caught nothing", "caption": "**The degenerate model is the fastest way to explain why the three metrics exist**, and it is a measurement rather than a claim. Then the threshold rows show the trade on *the same model*: precision 0.03 with recall 0.98, against precision 0.61 with recall 0.25. **And the last two rows are the detail that marks experience** — ROC-AUC reads 0.95 because it is dominated by the vast negative class, while average precision reads 0.36 against a random baseline of 0.0089. On imbalanced problems, report PR-AUC.", "left": "on 0.9% positives", "codeW": 190, "vars": ["precision", "recall", "note"], "steps": [{"code": "predict 'not fraud' always", "state": ["0.0000", "0.0000", "accuracy 0.9911"], "tone": "crit"}, {"code": "threshold 0.2", "state": ["0.0305", "0.9775", "2766 false alarms"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "threshold 0.6", "state": ["0.2701", "0.5281", "the balanced point"], "changed": [0, 1, 2], "tone": "good"}, {"code": "threshold 0.8", "state": ["0.6111", "0.2472", "67 frauds missed"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "ROC AUC", "state": ["0.9496", "-", "flattered by the negatives"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "average precision", "state": ["0.3564", "-", "baseline 0.0089 - the honest one"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-1_2-06-5"},

    { t: "p", text: "Two questions, best answered together, because the imbalance is *why* the three metrics exist. **The sharpest way to answer is with the degenerate model.**" },

    { t: "code", lang: "python", title: "10,000 transactions, 0.9% fraudulent",
      code: `# The model that predicts "not fraud" every single time:
always_zero = np.zeros(n, dtype=int)
print("accuracy :", accuracy_score(y, always_zero))
print("recall   :", recall_score(y, always_zero))`,
      out: `positives: 89 of 10000 (0.9%)

the model that predicts "not fraud" every time:
  accuracy : 0.9911   <- looks excellent
  precision: 0.0000
  recall   : 0.0000   <- it caught nothing
  f1       : 0.0000`,
      caption: "**99.11% accuracy for a model that catches no fraud at all.** That single number is the whole argument for never reporting accuracy on an imbalanced problem, and it makes the point faster than any definition." },

    { t: "dl", items: [
      ["Precision", "Of the things I flagged, how many were right? `TP / (TP + FP)`. **Low precision means false alarms** — and the cost is the analyst's time, or the customer whose card you blocked."],
      ["Recall", "Of the things that were actually positive, how many did I catch? `TP / (TP + FN)`. **Low recall means misses** — the fraud that went through."],
      ["F1", "Their harmonic mean. The harmonic part matters: it punishes imbalance between the two, so you cannot score well by maximising one. Use it when you need a single comparable number and the two costs are roughly symmetric."],
      ["And say which one matters here", "They are a trade, set by the threshold. Medical screening wants recall — a missed disease is worse than a second test. A spam filter wants precision — a lost legitimate email is worse than a spam that got through. **Naming the asymmetry is the answer; quoting F1 without it is not.**"]
    ] },

    { t: "code", lang: "text", title: "the trade, measured at four thresholds",
      code: `  thresh   precision   recall      f1    TP    FP    FN
  0.2       0.0305    0.9775  0.0591    87  2766     2
  0.4       0.0841    0.8090  0.1524    72   784    17
  0.6       0.2701    0.5281  0.3574    47   127    42
  0.8       0.6111    0.2472  0.3520    22    14    67

threshold-free:
  ROC AUC            0.9496   <- flattered by the 99% negatives
  average precision  0.3564   <- the honest one here
  baseline (random)  0.0089   = the positive rate`,
      caption: "**The threshold is the dial, and the model is the same at every row.** Note the last block: ROC AUC looks excellent because it is dominated by the vast negative class, while average precision — the area under precision-recall — reads 0.36 against a random baseline of 0.009. **On imbalanced problems, report PR-AUC rather than ROC-AUC.**" },

    { t: "dl", items: [
      ["Handling the imbalance — at the data level", "Oversample the minority (SMOTE synthesises rather than copies, which avoids some overfitting), or undersample the majority if you can afford to discard data. Resample **inside** the cross-validation fold, not before splitting — doing it before leaks synthesised neighbours into the test set and inflates every number."],
      ["At the algorithm level", "Class weights, which most libraries support in one argument and which costs nothing. `scale_pos_weight` in gradient boosting is the same idea."],
      ["At the threshold level", "**Usually the right answer and the most overlooked.** Train normally, then choose the decision threshold against the business cost of a false positive versus a false negative. The table above is that choice made explicit."],
      ["At the problem level", "If positives are vanishingly rare, it may be anomaly detection rather than classification. And collecting more positives, where possible, beats every technique on this list."]
    ] },

    { t: "h2", n: "07", text: "AI agents against traditional LLM applications", id: "agents" },

    {"kind": "compare", "title": "Who controls the flow", "caption": "**In a traditional application the developer writes the sequence; in an agent the model decides what happens next.** The four parts are a model that decides, tools it can call, state across steps, and **a loop with a stopping condition** — and the loop is the part people omit when describing one. **The answer that earns credit is knowing when not to:** if the steps are known in advance, write them, because a fixed pipeline is cheaper, testable and debuggable, and an agent rediscovering the same sequence is paying for flexibility it never uses.", "columns": [{"title": "Traditional LLM application", "tone": "good", "items": ["Control flow written by the developer", "A fixed, known number of calls", "Your code calls the tools", "Usually stateless per request", "Debug with a stack trace", "Predictable cost"]}, {"title": "Agent", "tone": "violet", "items": ["Control flow decided per step", "Variable, until a stopping condition", "The model chooses from declared tools", "State accumulates across the loop", "Debug with a trajectory", "Variable cost - needs a cap"]}], "t": "diagram", "id": "dg-1_2-07-6"},

    { t: "p", text: "**The difference is who controls the flow.** In a traditional LLM application the developer writes the sequence and the model fills in text at fixed points. In an agent, the model decides what happens next." },

    { t: "table",
      head: ["", "Traditional LLM app", "Agent"],
      rows: [
        ["Control flow", "Written by the developer", "Decided by the model, per step"],
        ["Number of model calls", "Fixed and known", "Variable, until a stopping condition"],
        ["Tools", "Called by your code, if at all", "Chosen by the model from a declared set"],
        ["State", "Usually stateless per request", "Accumulates across the loop"],
        ["Debugging", "A stack trace", "A trajectory — which tools, in what order, with what arguments"],
        ["Failure mode", "An exception", "A loop, a wrong tool, or a confident wrong answer"],
        ["Cost per request", "Predictable", "Variable — needs a cap"]
      ] },

    { t: "dl", items: [
      ["The four parts of an agent", "A **model** that decides, **tools** it can call with described interfaces, **memory or state** carried across steps, and a **loop** with a stopping condition. If any of the four is missing it is not an agent, and the loop is the part people leave out when describing one."],
      ["When an agent is the wrong choice", "If the steps are known in advance, write them. A fixed pipeline is cheaper, faster, testable and debuggable, and an agent that rediscovers the same sequence every time is paying for flexibility it does not use. **Say this** — the question often expects enthusiasm and rewards judgement."],
      ["What agency costs", "Non-determinism, variable cost and latency, and a much harder debugging story. The mitigations are the ones worth naming: cap the steps, cap the spend, make tools narrow, and require approval for anything irreversible."]
    ] },

    { t: "h2", n: "08", text: "Slowly changing dimensions, and removing duplicates", id: "data" },

    {"kind": "trace", "title": "Type 2, and the window function", "caption": "**The concrete reason Type 2 is the usual answer:** if a customer moves from London to Leeds, Type 1 silently restates last year's regional revenue, because every historical order now joins to Leeds. **And for the dedup, `ROW_NUMBER() OVER (PARTITION BY ...)` is what they are listening for**, because it makes “which copy survives” an explicit auditable decision rather than whatever the engine happened to keep — with a tiebreak after the timestamp, or the result is non-deterministic. Then add the unique constraint, or you will do this again next quarter.", "left": "", "codeW": 170, "vars": ["what it does", "cost"], "steps": [{"code": "SCD Type 1", "state": ["overwrite in place", "history gone - reports restate"], "tone": "crit"}, {"code": "SCD Type 2", "state": ["new row, valid_from/to, is_current", "the standard answer"], "changed": [0, 1], "tone": "violet"}, {"code": "+ surrogate key per version", "state": ["a fact references the exact version", "the detail that shows experience"], "changed": [0, 1], "tone": "violet"}, {"code": "find duplicates", "state": ["GROUP BY key HAVING COUNT(*) > 1", "finds, does not choose"], "changed": [0, 1], "tone": "good"}, {"code": "remove them", "state": ["ROW_NUMBER() OVER (PARTITION BY ...)", "6 rows -> 3, survivor chosen"], "changed": [0, 1], "tone": "good"}, {"code": "then prevent it", "state": ["a unique constraint on the key", "or you repeat this next quarter"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_2-08-7"},

    { t: "p", text: "Round two moved into data engineering. **A slowly changing dimension is a dimension-table attribute that changes occasionally — a customer's address, a product's category — and the question is what the warehouse does when it changes.**" },

    { t: "table",
      head: ["Type", "What it does", "Cost"],
      rows: [
        ["**Type 0**", "Never changes after insert", "Nothing — for true constants like a birth date"],
        ["**Type 1**", "Overwrite in place", "Simple, and **history is gone** — old facts now join to the new value"],
        ["**Type 2**", "New row per change, with valid-from/valid-to and a current flag", "The standard answer: full history, and the table grows and every query needs a date predicate"],
        ["**Type 3**", "Add a `previous_value` column", "Only one step of history; rarely enough"],
        ["**Type 4**", "Current row in the main table, history in a separate one", "Fast current-state queries, a join for history"],
        ["**Type 6**", "1 + 2 + 3 combined", "Both current and historical attributes on every row; more complex to load"]
      ] },

    { t: "callout", kind: "insight", title: "The one that matters, and why",
      body: [
        { t: "p", text: "**Type 2 is the answer in most interviews**, and the reason to say is reporting correctness: if a customer moves from London to Leeds, Type 1 silently restates last year's regional revenue, because every historical order now joins to Leeds. Type 2 keeps the row that was current when the order was placed." },
        { t: "p", text: "The implementation detail that shows experience: a **surrogate key** per row version rather than the natural business key, so a fact can reference the exact version that was current, plus `valid_from`, `valid_to` and `is_current` — and a partial index on `is_current` so the common query stays fast." }
      ] },

    { t: "code", lang: "python", title: "identifying and removing duplicates, executed",
      code: `-- find them
SELECT email, COUNT(*) AS n
FROM customer
GROUP BY email
HAVING COUNT(*) > 1;

-- remove them, keeping the most recently updated row per email
DELETE FROM customer
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY email
                   ORDER BY updated DESC, id DESC
               ) AS rn
        FROM customer
    ) ranked
    WHERE rn = 1
);`,
      out: `before: 6 rows
duplicate keys:
  a@x.com    3 copies
  c@x.com    2 copies
after : 3 rows
  a@x.com    Ann B  2026-03-02
  b@x.com    Bob    2026-01-05
  c@x.com    Cal    2026-04-11`,
      caption: "**`ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` is the answer they are listening for**, because it makes “which copy survives” an explicit, auditable decision rather than whatever the engine happened to keep. Note the tiebreak on `id` after `updated`: without it the result is non-deterministic when two rows share a timestamp." },

    { t: "dl", items: [
      ["Say what “duplicate” means first", "Exact row duplicates, or duplicates on a business key with differing attributes? The second is the common and harder case, and it is a *merge* decision rather than a delete — which row's values survive, field by field."],
      ["Then: do not delete in place on a live table", "Take a backup or write the survivors to a new table and swap. A `DELETE` with a wrong predicate on a production table is not recoverable by rerunning it."],
      ["And prevent the recurrence", "A unique constraint or index on the business key, so the duplicates cannot come back. **Deduplicating without adding the constraint means doing it again next quarter** — and saying this is usually what the question is actually probing."],
      ["Fuzzy duplicates are a different problem", "“Robert Jones” and “Bob Jones, 12 Main St” have no exact key to group on. That is record linkage: blocking to make the comparison tractable, then a probabilistic match score, then a threshold with a human in the middle."]
    ] },

    { t: "h2", n: "09", text: "Components of a production-ready GenAI application", id: "production" },

    {"kind": "layers", "title": "Eleven layers, and the three nobody mentions", "caption": "**Almost every candidate lists monitoring and omits evaluation in CI, the per-user cost cap and feedback capture.** Without a golden set in CI, a prompt edit is an unreviewed deploy to production behaviour. Without a spend ceiling, an agent loop is an unbounded bill attached to a stranger's input. And a thumbs-down carrying the trace id is how the golden set grows from real failures rather than from imagination — which closes the loop between production and evaluation.", "items": [{"label": "Ingestion: parse, chunk, embed, index", "sub": "idempotent, resumable, re-runnable", "tone": "good", "side": "data"}, {"label": "Retrieval: hybrid, filters, rerank, access filtering", "sub": "permissions before the context is assembled", "tone": "good", "side": "data"}, {"label": "Orchestration with step and cost caps", "sub": "and a timeout", "tone": "accent", "side": "runtime"}, {"label": "Model layer: pinned versions, a fallback, retries", "sub": "and prompt caching", "tone": "accent", "side": "runtime"}, {"label": "Guardrails at input, tool call and output", "sub": "plus schema validation", "tone": "violet", "side": "safety"}, {"label": "Security: authN, RBAC, tenant isolation, secrets", "sub": "and PII handling", "tone": "violet", "side": "safety"}, {"label": "Observability: traces, token and cost metrics", "sub": "one trace id through every hop", "tone": "accent", "side": "ops"}, {"label": "Evaluation in CI on a golden set", "sub": "FORGOTTEN - a prompt edit is a deploy", "tone": "crit", "side": "forgotten"}, {"label": "Per-user and per-tenant cost caps", "sub": "FORGOTTEN - an unbounded bill", "tone": "crit", "side": "forgotten"}, {"label": "Human path: approval, escalation, feedback", "sub": "FORGOTTEN - feedback carries the trace id", "tone": "crit", "side": "forgotten"}, {"label": "Deployment: canary, rollback, flags", "sub": "backward-compatible migrations", "tone": "good", "side": "ops"}], "t": "diagram", "id": "dg-1_2-09-8"},

    { t: "p", text: "**Answer this as layers, and include the ones people forget**, which are evaluation, cost control and the human path." },

    { t: "table",
      head: ["Layer", "What it contains"],
      rows: [
        ["**Ingestion**", "Parsing, chunking, embedding, indexing — idempotent, resumable, re-runnable"],
        ["**Retrieval**", "Hybrid search, metadata filters, reranking, access filtering before assembly"],
        ["**Orchestration**", "The agent or chain, with step and cost caps and a timeout"],
        ["**Model layer**", "Pinned versions, a fallback model, retry with backoff, prompt caching"],
        ["**Guardrails**", "Input checks, tool-call policy, output scanning, schema validation"],
        ["**Security**", "AuthN, RBAC, per-tenant isolation, secrets in a manager, PII handling"],
        ["**Observability**", "Traces with a shared id, token and cost metrics, quality metrics, structured logs"],
        ["**Evaluation**", "A golden set in CI, groundedness measured, regression gates on change"],
        ["**Cost control**", "Per-user and per-tenant budgets, caching, a cheaper model for cheap tasks"],
        ["**Human path**", "Approval for irreversible actions, escalation when the agent cannot proceed, feedback capture"],
        ["**Deployment**", "Canary with automatic rollback, feature flags for prompts, backward-compatible migrations"]
      ] },

    { t: "callout", kind: "good", title: "The three nobody mentions",
      body: [
        { t: "p", text: "**Evaluation in CI.** Almost every candidate lists monitoring and omits the golden set that runs on every prompt change. Without it, a prompt edit is an unreviewed deploy to production behaviour." },
        { t: "p", text: "**A per-user cost cap.** An agent loop with no spend ceiling is an unbounded bill attached to a stranger's input, and it is the failure that gets noticed by finance rather than by engineering." },
        { t: "p", text: "**Feedback capture.** A thumbs-down with the trace id attached is how the golden set grows from real failures instead of from imagination — and it closes the loop between production and evaluation." }
      ] },

    { t: "h2", n: "10", text: "LangChain and LangGraph, and when to use which", id: "langchain" },

    {"kind": "flow", "title": "Does the flow need to loop or pause?", "caption": "**That one question decides it.** Retrieve-then-generate is a straight line and LCEL expresses it in a few lines. Retrieve, grade, maybe retry, maybe ask a human, then generate is a cycle with state — and expressing that as a chain means hand-rolling the loop, the state and the resumption, which is exactly what LangGraph is. **The answer that reads as experience adds the third option:** for a simple pipeline, neither — an SDK call and a vector client is less abstraction to debug.", "cols": 3, "nodes": [{"id": "q", "label": "Does it loop or pause?", "sub": "the deciding question", "tone": "accent"}, {"id": "n", "label": "No - a straight line", "sub": "retrieve then generate", "tone": "good"}, {"id": "l", "label": "LangChain / LCEL", "sub": "components and composition", "tone": "good"}, {"id": "y", "label": "Yes - retry, or wait for a human", "sub": "a cycle with shared state", "tone": "violet"}, {"id": "g", "label": "LangGraph", "sub": "checkpoints, interrupts, conditional edges", "tone": "violet"}, {"id": "r", "label": "Or neither, for something simple", "sub": "an SDK call and a vector client", "tone": "teal"}], "edges": [["q", "n"], ["n", "l"], ["q", "y"], ["y", "g"], ["n", "r"]], "t": "diagram", "id": "dg-1_2-10-9"},

    { t: "p", text: "**LangChain is a library of components and integrations; LangGraph is a runtime for stateful, cyclic workflows.** They are not competitors — LangGraph is from the same project and is usually used with LangChain's components inside it." },

    { t: "table",
      head: ["", "LangChain", "LangGraph"],
      rows: [
        ["What it is", "Components: loaders, splitters, vector stores, model wrappers, tools, LCEL for composition", "A graph runtime: nodes, edges, shared state, checkpoints"],
        ["Shape of flow", "A chain — mostly a DAG, straight through", "A graph, **including cycles**"],
        ["State", "Passed along the chain", "An explicit shared state object every node reads and writes"],
        ["Control", "Each step runs and passes on", "Conditional edges decide where to go next"],
        ["Durability", "None by default", "Checkpointing — resume after a crash, time-travel a run"],
        ["Human in the loop", "Awkward", "First-class: interrupt before a node, resume later"],
        ["Right for", "RAG pipelines, extraction, summarisation, anything linear", "Agents, retry loops, multi-agent, approval steps, long-running work"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The decision, in one sentence",
      body: [
        { t: "p", text: "**Does the flow need to loop or pause?** Retrieve-then-generate is a straight line and LangChain's LCEL expresses it in a few lines. Retrieve, grade, maybe retry, maybe ask a human, then generate is a cycle with state, and expressing that as a chain means hand-rolling the loop, the state and the resumption — which is what LangGraph is." },
        { t: "p", text: "The answer that reads as experience adds the third option: *“and for a simple pipeline I would consider neither — an SDK call, a vector client and fifty lines is less abstraction to debug than a framework. I reach for LangGraph when I need its checkpointing and interrupts, because those are genuinely hard to build.”*" }
      ] },

    { t: "h2", n: "11", text: "The two coding questions", id: "coding" },

    {"kind": "trace", "title": "At this difficulty the code is free - everything around it is the signal", "caption": "**Both of these are warm-ups, and both have one edge case that catches people.** Python's modulo is never negative, so `n % 2` classifies negatives correctly where C would give −1 and a `== 1` test would silently fail on every negative odd number. And `n < 2` is where most quick prime checks break — 0, 1 and negatives are not prime. **Say the edge cases before writing, state the complexity without being asked, and type-hint it**, because at this level that is the whole assessment.", "left": "question", "codeW": 170, "vars": ["the answer", "the edge case that catches people"], "steps": [{"code": "even and odd from a list", "state": ["two comprehensions on n % 2", "-3 % 2 == 1 in Python, -1 in C"], "tone": "good"}, {"code": "", "state": ["", "0 is even"], "changed": [1], "tone": "good"}, {"code": "prime check", "state": ["trial division to isqrt(n), odds only", "n < 2: 0, 1 and negatives"], "changed": [0, 1], "tone": "violet"}, {"code": "complexity", "state": ["O(sqrt n), not O(n)", "23,170 divisions, not 2.1 billion"], "changed": [0, 1], "tone": "violet"}, {"code": "if asked for many primes", "state": ["Sieve of Eratosthenes", "O(N log log N) overall"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-1_2-11-10"},

    { t: "p", text: "Warm-ups, and still worth doing deliberately: **state the edge cases before writing**, because that is what is being assessed at this difficulty." },

    { t: "code", lang: "python", title: "even and odd from a list",
      code: `nums = [12, 7, 0, -3, -8, 5, 100, 41]

evens = [n for n in nums if n % 2 == 0]
odds  = [n for n in nums if n % 2]

print("even:", evens)
print("odd :", odds)`,
      out: `even: [12, 0, -8, 100]
odd : [7, -3, 5, 41]

-8 % 2 == 0   and   -3 % 2 == 1
0 is even -> True`,
      caption: "**The detail worth saying out loud: Python's modulo is never negative**, so `n % 2` classifies negative numbers correctly — `-3 % 2` is 1, not −1. In C or Java it would be −1 and `n % 2 == 1` would silently fail on every negative odd number. And 0 is even, which is the other case people forget." },

    { t: "code", lang: "python", title: "prime check",
      code: `from math import isqrt

def is_prime(n: int) -> bool:
    """True if n is prime. Trial division up to sqrt(n), odds only."""
    if n < 2:
        return False
    if n < 4:
        return True              # 2 and 3
    if n % 2 == 0:
        return False
    for d in range(3, isqrt(n) + 1, 2):
        if n % d == 0:
            return False
    return True`,
      out: `-7 False | 0 False | 1 False | 2 True | 3 True | 4 False
9 False | 17 True | 25 False | 97 True | 561 False | 7919 True

2147483647  True   in 1.2 ms
  (23,170 divisions because of the sqrt bound, not 2.1 billion)`,
      caption: "**Two things are being checked.** That you stop at `sqrt(n)` — if `n = a × b` then one factor is at most √n, so there is nothing above it to find — and that you handle `n < 2`: 0, 1 and negatives are not prime, and that branch is where most quick answers break." },

    { t: "dl", items: [
      ["Say the complexity", "O(√n) with the odd-only step, against O(n) for the naive loop. The measured 1.2 ms for a ten-digit prime is 23,170 divisions rather than two billion."],
      ["Mention the sieve if asked for many", "Checking one number is trial division; checking every number up to N is the Sieve of Eratosthenes, which is O(N log log N) overall and far better per number."],
      ["And type-hint it", "At this difficulty the code is almost free, so the signal is everything around it: a docstring, a type hint, the edge cases named, and the complexity stated without being asked."]
    ] },

    { t: "exercise", kind: "practice", title: "Answer both rounds out loud", difficulty: "core", minutes: 28,
      prompt: "Round one: what RAG is, PDFs with text and images, prompt engineering, imbalanced data, precision/recall/F1, agents against LLM apps — ninety seconds each. Round two: chunking strategies, unstructured PDF extraction, improving retrieval accuracy, SCD, duplicate removal, production components, LangChain against LangGraph. Then write both coding answers without running them, state the edge cases first, and only then test. Finally pick the three answers where you gave a definition rather than a mechanism, and rewrite those.",
      hints: [
        "For 'what is RAG', the four problems it solves beat the acronym expansion.",
        "For the metrics question, lead with the 99.11%-accuracy model that catches nothing.",
        "For LangChain against LangGraph, the deciding question is whether the flow loops or pauses."
      ],
      solution: {
        notes: [
          { t: "p", text: "The definition-against-mechanism pass at the end is the point of the exercise. Fundamentals questions are dangerous precisely because a correct short answer is available to everybody, so the differentiator is the second sentence: the caveat, the trade-off, or the number." },
          { t: "p", text: "On the coding questions, writing before running reproduces the real condition. The two that catch people are `n < 2` in the prime check and negative numbers in the even/odd split — both are edge cases rather than logic, which is exactly what an easy question is testing." }
        ]
      } }

  ],

  takeaways: [
    "**\"What is RAG\" wants the four problems it solves** — missing knowledge, stale knowledge, hallucination (reduced, not eliminated) and attribution — not the acronym.",
    "**Fine-tuning teaches form and behaviour; RAG supplies facts.** Which complaint you have decides which tool you reach for.",
    "**Chunking is chosen by the document's structure**, and the deciding question is the smallest unit that answers a question on its own. Recursive character at ~512 tokens with 10% overlap is the default to start from.",
    "**Classify the PDF before parsing it** — digital, scanned or mixed — because OCR on a digital PDF is slow and lossy and text extraction on a scan returns nothing.",
    "**Reading order is what plain extraction loses**, and a two-column paper extracted naively is interleaved nonsense.",
    "**Diagnose retrieval failures before fixing them:** was the right chunk retrieved, and was it used? Retrieval techniques cannot fix a generation problem.",
    "**Hybrid dense + BM25 fused by reciprocal rank is the highest-value single retrieval change**, and it needs no model.",
    "**99.11% accuracy for a model that catches no fraud** is the fastest way to explain why precision, recall and F1 exist.",
    "**Precision is false alarms, recall is misses, F1 is their harmonic mean** — and naming which one your problem cares about is the answer; quoting F1 alone is not.",
    "**On imbalanced data report PR-AUC, not ROC-AUC** — measured at 0.36 against 0.95 on the same model — and resample inside the CV fold, never before the split.",
    "**Tuning the decision threshold is usually the right fix for imbalance** and the most overlooked one.",
    "**An agent is a model, tools, state and a loop with a stopping condition** — and if the steps are known in advance, write them instead.",
    "**SCD Type 2 keeps history with valid-from/valid-to and a current flag**; Type 1 silently restates last year's reports when a customer moves.",
    "**`ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...)` is the dedup answer**, with a tiebreak for determinism — and add the unique constraint, or you will do it again next quarter.",
    "**The production components people forget are evaluation in CI, a per-user cost cap and feedback capture** with the trace id attached.",
    "**LangChain is components, LangGraph is a runtime for cyclic stateful flows** — the deciding question is whether the flow needs to loop or pause.",
    "**Python's modulo is never negative**, so `n % 2` works on negatives where C would fail; and `n < 2` is where most prime checks break."
  ],

  quiz: {
    title: "Check your answers",
    questions: [
      {
        stem: "A fraud model reports 99.11% accuracy. What should you ask?",
        options: [
          "Which model architecture was used",
          "What the positive rate is — a model predicting \"not fraud\" every time scores 99.11% on a 0.9% positive set while catching nothing",
          "Whether it was cross-validated",
          "What the training time was"
        ],
        answer: 1,
        why: "Accuracy on an imbalanced problem is dominated by the majority class. The measured degenerate model had precision, recall and F1 all exactly 0.0 alongside that 99.11%, which is the fastest way to make the point."
      },
      {
        stem: "Which metric would you report on a 0.9%-positive problem: ROC-AUC or average precision?",
        options: [
          "ROC-AUC, because it is threshold-free",
          "Average precision — measured at 0.3564 against ROC-AUC's 0.9496 on the same model, because ROC-AUC is flattered by the vast negative class",
          "Neither; use accuracy",
          "Both are equivalent"
        ],
        answer: 1,
        why: "The random baseline for average precision is the positive rate itself, 0.0089 here, so 0.36 is meaningful. ROC-AUC's false-positive rate denominator is huge, which keeps the curve looking good however many false alarms there are."
      },
      {
        stem: "Retrieval returns the right chunk every time and answers are still wrong. What should you not do?",
        options: [
          "Rewrite the prompt",
          "Add hybrid search and query rewriting — they improve retrieval, and retrieval was not the failure",
          "Check whether the chunk is buried at position 9 and add reranking",
          "Add a groundedness check"
        ],
        answer: 1,
        why: "The diagnosis — was it retrieved, and was it used — decides which half of the technique list applies. Adding retrieval techniques to a generation problem costs latency and changes nothing."
      },
      {
        stem: "A customer moves from London to Leeds. The dimension uses SCD Type 1. What happens to last year's regional report?",
        options: [
          "Nothing — facts store their own region",
          "It silently changes: every historical order now joins to Leeds, because the old value was overwritten",
          "The report fails with a null",
          "Both regions are reported"
        ],
        answer: 1,
        why: "This is the concrete reason Type 2 is the usual answer: a new row per change with valid-from/valid-to means a fact references the version that was current when it happened. A surrogate key per row version is what makes that reference possible."
      },
      {
        stem: "Which SQL construct removes duplicates while making the survivor an explicit decision?",
        options: [
          "SELECT DISTINCT",
          "ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated DESC) and delete where the number is not 1",
          "GROUP BY with HAVING COUNT(*) > 1",
          "A unique constraint"
        ],
        answer: 1,
        why: "GROUP BY/HAVING finds duplicates but does not choose a survivor, and DISTINCT only handles exactly identical rows. The ORDER BY inside the window is the decision, and it needs a tiebreak to be deterministic — then add the unique constraint so they cannot return."
      },
      {
        stem: "When does LangGraph earn its complexity over a LangChain chain?",
        options: [
          "Whenever more than one model call is involved",
          "When the flow needs to loop or pause — retry after a grader, or wait for human approval — because that needs cycles, shared state and checkpointing",
          "When using a vector store",
          "When the application has multiple users"
        ],
        answer: 1,
        why: "Retrieve-then-generate is a straight line and expresses fine as a chain. The honest extra answer is that for a simple pipeline neither is required — an SDK call and a vector client is less abstraction to debug."
      },
      {
        stem: "Why does `n % 2` correctly classify negative numbers in Python?",
        options: [
          "Because Python converts them to positive first",
          "Because Python's modulo result takes the sign of the divisor and is never negative here — `-3 % 2` is 1, where C would give −1",
          "Because the list comprehension handles it",
          "It does not; negatives need special handling"
        ],
        answer: 1,
        why: "Measured: -8 % 2 == 0 and -3 % 2 == 1. The same code in C or Java would give −1 for -3 % 2, so a `== 1` test would silently misclassify every negative odd number — which is the kind of detail an easy question is really checking."
      }
    ]
  },

  interview: {
    title: "The follow-ups worth preparing",
    sub: "Fundamentals questions go one level deeper",
    questions: [
      {
        level: "mid",
        q: "What are the different chunking strategies, and how would you choose one?",
        strong: "Fixed-size, recursive character, document-structure aware, semantic, parent-document and sentence-window. I would start with recursive character at about 512 tokens with 10% overlap because it respects structure where it exists and degrades gracefully. The deciding question is the smallest unit that can answer a question on its own — a clause for a policy document, a turn plus neighbours for a chat log. Then I would look at the retrieved chunks for failing questions: cut mid-argument means the splitter is wrong; relevant but still wrong means chunking is not the problem.",
        answer: [
          { t: "p", text: "The smallest-answering-unit framing turns a list into a decision procedure, which is what the 'how would you choose' half is asking for." },
          { t: "p", text: "Saying when to *stop* tuning chunking is unusually valuable, because it is where teams spend disproportionate effort for diminishing returns." },
          { t: "p", text: "A strong addition is contextual retrieval — prefixing each chunk with a generated line of document context before embedding — which fixes orphaned chunks better than overlap does, at one model call per chunk at ingestion." }
        ]
      },
      {
        level: "mid",
        q: "What is an imbalanced dataset and how would you handle it?",
        strong: "One where the classes are very unequal, so accuracy becomes meaningless — a model predicting the majority class on a 0.9% positive set scores 99.11% and catches nothing. I would handle it at four levels: data, with resampling done inside the CV fold rather than before the split; algorithm, with class weights; threshold, by choosing the operating point against the business cost of a false positive versus a false negative, which is usually the real fix; and the problem level, since very rare positives may be anomaly detection. And I would report PR-AUC rather than ROC-AUC.",
        answer: [
          { t: "p", text: "Leading with the degenerate model's score is the fastest way to establish the problem, and it is a number rather than a claim." },
          { t: "p", text: "The resample-inside-the-fold detail is the one that marks someone who has done this: resampling before splitting leaks synthesised neighbours into the test set and inflates every metric." },
          { t: "p", text: "Naming threshold tuning as usually the right answer is the senior move, because it is the cheapest intervention and the one most often skipped in favour of SMOTE." }
        ]
      },
      {
        level: "advanced",
        q: "Explain the key components of a production-ready GenAI application.",
        strong: "Ingestion that is idempotent and resumable; retrieval with hybrid search, metadata filters and access filtering before the context is assembled; orchestration with step and cost caps; a model layer with pinned versions and a fallback; guardrails at input, tool call and output; security with RBAC and per-tenant isolation; observability with traces carrying one id through every hop; evaluation running in CI on a golden set; per-user cost caps; a human path for irreversible actions; and deployment with canary and automatic rollback.",
        answer: [
          { t: "p", text: "The three that distinguish a real answer are evaluation in CI, the cost cap and feedback capture — almost everyone lists monitoring and omits all three." },
          { t: "p", text: "Saying 'access filtering before the context is assembled' rather than just 'security' shows the RAG-specific concern: filtering chunks by permission is retrieval work, not an afterthought at the API layer." },
          { t: "p", text: "Pinned model versions with a fallback is the detail that pre-empts the obvious follow-up about what happens when the provider has an incident or silently updates a pointer alias." }
        ]
      }
    ]
  }
});
