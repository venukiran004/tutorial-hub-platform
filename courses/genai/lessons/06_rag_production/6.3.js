EC.receiveLesson({
  id: "6.3",

  lede: "The reference collects four things that did not fit anywhere else: how documents get parsed, how a follow-up question gets resolved, how metadata narrows the search, and how duplicates get removed. The last is the longest and the one with real arithmetic in it \u2014 a content hash, a cosine threshold, MinHash with LSH, orphan deletion on update, and MMR at query time. Measured here, **normalising before hashing is what makes the hash useful at all**: without it, a trailing space is a brand-new record.",

  objectives: [
    "Choose a parser from the document format and say what each one loses",
    "Reformulate a follow-up question into a standalone query before retrieving",
    "Apply metadata filtering as a pre-filter and know when the predicate belongs there",
    "Implement exact and near-duplicate deduplication, and pick the threshold deliberately",
    "Delete orphaned chunks when a source document changes"
  ],

  prerequisites: ["5.4", "6.2"],

  blocks: [

    { t: "h2", n: "01", id: "parsing", text: "Parsing, the stage nobody evaluates",
      sub: "Everything downstream inherits its mistakes" },

    { t: "p", text: "5.4 established that chunking is the highest-leverage decision in a retrieval pipeline. Parsing sits *before* chunking, and it has the same property with less attention paid to it: a table flattened into a column of orphaned numbers cannot be rescued by any chunk size, any embedding model or any re-ranker." },

    { t: "table",
      head: ["Format", "Tool", "What it loses if you are careless"],
      rows: [
        ["PDF, text layer", "`PyPDFLoader`, `pdfplumber`", "Running headers and page numbers become chunk content"],
        ["PDF, scanned", "OCR \u2014 Tesseract, Document Intelligence", "Accuracy; OCR noise embeds as plausible nonsense"],
        ["PDF, tables", "Camelot, Tabula, Unstructured", "Row\u2013column structure, which is the entire meaning"],
        ["HTML", "BeautifulSoup plus boilerplate removal", "Nothing \u2014 but navigation and ads become chunks"],
        ["Word", "`Docx2txtLoader`, `python-docx`", "Heading levels, which are free section metadata"],
        ["PowerPoint", "`python-pptx`, Unstructured", "Slide boundaries, which are natural chunk edges"],
        ["Markdown", "`MarkdownHeaderTextSplitter`", "Nothing \u2014 this is the easy case, and 5.4 measured why"],
        ["Code", "`RecursiveCharacterTextSplitter(language=)`", "Function boundaries \u2014 6.6 is about exactly this"],
        ["Images, charts", "Vision model to a text description", "Everything, if you skip it \u2014 6.5 covers the options"]
      ] },

    { t: "callout", kind: "trap", title: "Running headers are the classic parsing bug",
      body: [
        { t: "p", text: "A PDF with a header on every page gives you the same line repeated three hundred times after extraction. Chunk it and you get hundreds of chunks that all begin with the document title \u2014 which is a near-duplicate problem you created at parse time and will then try to solve with a dedup pass." },
        { t: "p", text: "It also quietly damages embeddings. 5.3 measured how much a chunk\u2019s overall topic dominates its vector; prefixing every chunk with the same boilerplate pulls them all toward each other, which flattens exactly the distinctions retrieval depends on." },
        { t: "p", text: "The reference\u2019s step 5 is the fix and it is the least glamorous advice in the document: read fifty chunks by hand before indexing. It takes twenty minutes and it catches this class of bug, which no automated metric will flag because the pipeline is working exactly as instructed." }
      ] },

    { t: "h2", n: "02", id: "conversational", text: "History-aware retrieval",
      sub: "\u201cTell me more about it\u201d is not a query" },

    { t: "p", text: "Standard RAG embeds the latest user message. That works for the first turn and breaks on the second, because a follow-up question is usually not self-contained \u2014 the subject lives in the previous turn." },

    { t: "code", lang: "python", title: "what the retriever actually receives", code: `# turn 1
"What is BERT?"                       -> embeds fine, retrieves BERT chunks

# turn 2
"Tell me more about its architecture" -> embeds to roughly nothing useful.
                                         "its" carries the entire subject and
                                         contributes almost no signal to the vector.`,
      caption: "The second query has no topic in it. Whatever comes back is close to arbitrary." },

    { t: "p", text: "The fix is a generation before the retrieval: rewrite the follow-up into a standalone question using the history, then retrieve on the rewrite. This is the same shape as HyDE in 5.8 \u2014 a model call added in series before the search \u2014 and it carries the same latency cost, which 6.2 put at a full generation on the critical path." },

    { t: "code", lang: "python", title: "contextualise, then retrieve", code: `contextualize_prompt = ChatPromptTemplate.from_messages([
    ("system", "Given chat history and latest question, reformulate it as a "
               "standalone question. Do NOT answer it."),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])
history_aware_retriever = create_history_aware_retriever(
    llm, retriever, contextualize_prompt
)
rag_chain = create_retrieval_chain(history_aware_retriever, qa_chain)

rag_chain.invoke({
    "input": "Tell me more about its architecture",
    "chat_history": [HumanMessage("What is BERT?"),
                     AIMessage("BERT is a transformer-based model for NLP...")],
})
# retrieval now runs on: "Tell me more about BERT's architecture"`,
      hl: [2, 3],
      caption: "\u201cDo NOT answer it\u201d is load-bearing. Without it the model answers from memory and you retrieve on the answer." },

    { t: "callout", kind: "tradeoff", title: "Rewrite every turn, or only when it is needed?",
      body: [
        { t: "p", text: "Rewriting unconditionally costs a generation per turn, including on first turns and on self-contained questions where it does nothing. Rewriting conditionally needs a classifier to decide, which is either a cheap heuristic that is sometimes wrong or another model call." },
        { t: "p", text: "The cheap heuristic is better than it sounds: a question containing a pronoun or a demonstrative with no noun phrase of its own is almost always a follow-up. It is not sound \u2014 \u201cWhat does it cost to fine-tune?\u201d has a pronoun and is self-contained \u2014 but a false positive only costs a rewrite that changes nothing." },
        { t: "p", text: "Which is the asymmetry that settles it: a missed rewrite returns arbitrary chunks, and an unnecessary rewrite returns the same query back. So err toward rewriting, and use a small model for it \u2014 the task is resolving a pronoun, not reasoning." }
      ] },

    { t: "h2", n: "03", id: "metadata", text: "Metadata filtering",
      sub: "A predicate that is exact does not belong in a vector" },

    { t: "p", text: "5.11 made this point from the routing side and it is worth restating as a rule: if a constraint is exactly expressible \u2014 this tenant, this year, this department, this access level \u2014 it should be a filter and not a hope about cosine similarity." },

    { t: "code", lang: "python", title: "filter at search time, not after", code: `docs = [
    Document(page_content="...", metadata={"source": "finance", "year": 2024}),
    Document(page_content="...", metadata={"source": "hr",      "year": 2023}),
]

results = vectorstore.similarity_search(
    "quarterly revenue", k=5,
    filter={"source": "finance", "year": 2024},   # pre-filter
)`,
      hl: [8],
      caption: "The filter restricts the candidate set. The alternative \u2014 searching everything and discarding afterwards \u2014 is a different thing entirely." },

    { t: "callout", kind: "warn", title: "Pre-filter and post-filter are not two implementations of one feature",
      body: [
        { t: "p", text: "They differ in what gets read. A pre-filter never considers the other tenant\u2019s vectors; a post-filter retrieves them, ranks them, and then drops them." },
        { t: "p", text: "6.8 measures this on a simulated two-tenant corpus: both approaches reach the same recall, and post-filtering put other-tenant chunks into the top 5 before discarding them. Those chunks were read, scored, and quite possibly logged." },
        { t: "p", text: "So the choice is a security property rather than a performance one, and the reference is right to list PII filtering as mandatory rather than recommended. A post-filter is one logging statement or one off-by-one away from being a leak." }
      ] },

    { t: "callout", kind: "insight", title: "The hard part of metadata is populating it",
      body: [
        { t: "p", text: "Filtering is one keyword argument. Having something to filter *on* is an ingestion problem, and the reference\u2019s suggestion \u2014 use a model at ingestion time to extract entities, classify document type and assign tags \u2014 is doing real work for which there is no shortcut." },
        { t: "p", text: "It is also the cheap place to do it. Ingestion runs once per document on the slow clock 5.1 identified, so a model call per document there costs nothing per query, unlike anything you add to the request path." },
        { t: "p", text: "Take whatever the format hands you for free first, though: headings from Word, slide numbers from PowerPoint, section paths from Markdown, file paths from a repository. That metadata is exact rather than inferred, which makes it safe to filter on." }
      ] },

    { t: "h2", n: "04", id: "dedup", text: "Deduplication",
      sub: "A vector store does not enforce uniqueness, so you do" },

    { t: "p", text: "Duplicates cost three things: storage, context budget, and diversity. The third is the one that hurts \u2014 a duplicated chunk does not make the wrong answer win, it makes the *same* answer win several times, so the top-k that should have held five perspectives holds one repeated five times." },

    { t: "p", text: "The reference gives a five-stage pattern, and the stages catch different things." },

    { t: "ladder", title: "The dedup ladder", rungs: [
      { level: "bad", label: "Nothing \u2014 let the store assign ids",
        why: "Every re-ingest creates a fresh copy of everything. The index grows linearly with the number of ingests rather than with the corpus.",
        code: `records = [{"id": uuid4(), "text": c, "vector": embed(c)} for c in chunks]`,
        note: "This is the default behaviour of most stores, which is why it is the most common bug." },
      { level: "ok", label: "A content hash as the id",
        why: "Re-ingesting identical content overwrites the same row. Idempotent, exact, and microseconds \u2014 6.2 measured the check as a tiny fraction of the embedding it avoids.",
        code: `def content_id(text): return hashlib.sha256(text.encode()).hexdigest()`,
        note: "Catches exact repeats. Misses a trailing space \u2014 see below, because that turns out to matter." },
      { level: "ok", label: "Normalise, then hash",
        why: "Collapsing whitespace and folding case before hashing is what makes the hash catch the edits that actually occur in practice.",
        code: `def normalize(text): return re.sub(r"\s+", " ", text.lower().strip())
def content_id(text): return hashlib.sha256(normalize(text).encode()).hexdigest()`,
        note: "Measured below: without normalisation, four of five trivial variants hash differently." },
      { level: "best", label: "Hash, then a near-duplicate pass, then MMR at query time",
        why: "The hash catches identical content, a similarity threshold catches edited content, and MMR catches whatever survived into the top-k.",
        code: `# ingest:  normalize -> content-hash id -> upsert -> near-dup filter
# update:  delete by doc_id -> re-upsert the fresh set
# query:   search_type="mmr", fetch_k=20, k=4`,
        note: "Three different mechanisms because exact, near and ranked redundancy are three different problems." }
    ] },

    { t: "h3", text: "Normalisation is what makes the hash work" },

    { t: "code", lang: "python", title: "g63.py \u00a7A \u2014 which trivial edits defeat a raw hash", code: `VARIANTS = [
    ("the original chunk",        "Chunking is the decision that matters most."),
    ("trailing whitespace",       "Chunking is the decision that matters most.   "),
    ("collapsed internal spaces", "Chunking  is   the decision that matters most."),
    ("different case",            "CHUNKING IS THE DECISION THAT MATTERS MOST."),
    ("one word changed",          "Chunking is the choice that matters most."),
]
for label, text in VARIANTS:
    raw = sha256(text).hexdigest()           == base_raw
    nrm = sha256(normalize(text)).hexdigest() == base_norm`,
      out: `  variant                          raw hash normalised
  the original chunk                   same       same
  trailing whitespace             DIFFERENT       same
  collapsed internal spaces       DIFFERENT       same
  different case                  DIFFERENT       same
  one word changed                DIFFERENT  DIFFERENT`,
      hl: [3, 4, 5],
      caption: "Three of the four trivial edits defeat a raw hash entirely. All three are things real pipelines produce." },

    { t: "callout", kind: "good", title: "This is why the reference normalises first",
      body: [
        { t: "p", text: "A raw content hash sounds exact and is nearly useless on its own, because the edits that occur in practice are whitespace and case \u2014 produced by re-parsing the same PDF with a different library version, or by a CMS re-serialising a document nobody touched." },
        { t: "p", text: "Normalising first turns all three into the same record. And the last row is the important control: a real content change still hashes differently, so normalisation is not making the test blind. It is removing exactly the differences that carry no meaning." },
        { t: "p", text: "How far to normalise is a judgement. Folding case means two chunks differing only in capitalisation collapse \u2014 which is right for prose and wrong for code, where `Config` and `config` are different identifiers. 6.6 comes back to this." }
      ] },

    { t: "h3", text: "Near-duplicates: cosine, then MinHash when cosine is too slow" },

    { t: "code", lang: "python", title: "the cosine pass \u2014 O(n\u00b2) per batch, which is fine per batch", code: `def dedup_by_embedding(items, threshold=0.95):
    """items: list of (text, vector). Keep first seen, drop near-duplicates."""
    kept = []
    for text, vec in items:
        if all(cosine(vec, k_vec) < threshold for _, k_vec in kept):
            kept.append((text, vec))
    return kept`,
      caption: "Quadratic in the batch, not in the corpus. At scale you query the index for each candidate's nearest neighbour instead and skip the insert above the threshold." },

    { t: "p", text: "Above some corpus size even that is too slow, and the reference reaches for MinHash: estimate the Jaccard similarity of token shingles from a short signature, and pair it with LSH so only likely duplicates get compared. The question that decides whether it works is how accurate the estimate is for a given signature length." },

    { t: "code", lang: "python", title: "g63.py \u00a7B \u2014 estimator error against signature length", code: `def shingles(text, k=5):
    tok = text.lower().split()
    return {" ".join(tok[i:i+k]) for i in range(len(tok) - k + 1)}

def minhash(sh, num_perm=128):
    return [min((int(md5(("%d:%s" % (p, s)).encode()).hexdigest(), 16)
                 for s in sh), default=0) for p in range(num_perm)]

def est_jaccard(a, b):
    return sum(x == y for x, y in zip(a, b)) / len(a)`,
      out: `  num_perm mean abs err           time per signature
  16            0.0991                      25.7 ms
  64            0.0257                      96.8 ms
  128           0.0102                     178.2 ms
  256           0.0118                     377.9 ms`,
      hl: [4, 5],
      caption: "Error falls roughly as 1/\u221anum_perm while cost rises linearly \u2014 which is the whole argument for 128 as the default." },

    { t: "callout", kind: "trap", title: "My own numbers stop resolving the trend at 128",
      body: [
        { t: "p", text: "Read the last two rows: 256 permutations gave **0.0118** mean absolute error against 128\u2019s **0.0102**. More permutations came out slightly *worse*, which cannot be true of the estimator \u2014 MinHash error is \u221a(J(1\u2212J)/num_perm) and strictly decreases." },
        { t: "p", text: "The explanation is my test, not the method: I averaged over **five pairs**. At that sample size the sampling noise in my own error estimate is larger than the difference between 0.010 and 0.007 that theory predicts, so the comparison is below the resolution of the experiment." },
        { t: "p", text: "I am leaving the number as measured rather than quietly adding pairs until it behaves, because the shape of the mistake is the useful part. The 16-to-128 trend is far outside the noise and is real; the 128-to-256 comparison is not evidence of anything. A measurement can support one of its claims and not another." }
      ] },

    { t: "code", lang: "python", title: "g63.py \u00a7C \u2014 what the threshold actually means", code: `for label, (a, b) in zip(LABELS, PAIRS):
    sa, sb = shingles(a), shingles(b)
    print(true_jaccard(sa, sb), est_jaccard(minhash(sa, 128), minhash(sb, 128)))`,
      out: `  pair                                 true Jaccard est (128 perm)
  identical                                  1.000          1.000
  90% shared tokens                          0.817          0.812
  70% shared                                 0.535          0.547
  50% shared                                 0.329          0.305
  20% shared                                 0.106          0.117`,
      hl: [3],
      caption: "The estimate tracks the truth closely at every level. The surprise is in the left column, not the right." },

    { t: "callout", kind: "insight", title: "A 5-token shingle is far stricter than it looks",
      body: [
        { t: "p", text: "Two documents sharing 90% of their tokens have a shingle Jaccard of **0.817**, not 0.9. Half-shared tokens give **0.329**, not 0.5. The relationship is strongly sublinear because changing one token destroys five shingles \u2014 the one starting at it and the four spanning it." },
        { t: "p", text: "That matters for picking the threshold. The reference suggests ~0.8 for flagging near-duplicates, and on this evidence 0.8 is roughly \u201c90% of tokens identical\u201d \u2014 a genuinely tight match, not a loose one. Someone expecting 0.8 to mean \u201cbroadly similar\u201d will set it far too low and start merging distinct documents." },
        { t: "p", text: "It also means shingle length is a sensitivity dial. Shorter shingles are more permissive and noisier; longer ones demand near-identical phrasing. Picking `k` and picking the threshold are one decision, so they should be tuned together on your own documents." }
      ] },

    { t: "h3", text: "The update case, where duplicates become orphans" },

    { t: "p", text: "A content hash makes re-ingestion idempotent, which solves the duplicate-insert problem and not the stale-chunk problem. If a document shrinks from twelve chunks to nine, the hash-keyed upsert writes the nine and leaves the other three in the index forever \u2014 retrievable, stale, and attributed to a document that no longer says that." },

    { t: "code", lang: "python", title: "delete by document, then insert the fresh set", code: `def reindex_document(doc_id, new_chunks):
    index.delete(filter={"doc_id": doc_id})            # remove all old chunks
    records = [{"id": content_id(c), "text": c, "vector": embed(c),
                "metadata": {"doc_id": doc_id}} for c in new_chunks]
    index.upsert(records)                              # insert the fresh set`,
      hl: [2],
      caption: "Which is why every chunk needs a doc_id in its metadata \u2014 not for filtering, but so deletion has something to key on." },

    { t: "callout", kind: "warn", title: "Delete-then-insert has a window",
      body: [
        { t: "p", text: "Between the delete and the upsert, that document is absent from the index. A query arriving in the gap retrieves nothing from it and answers without it \u2014 which, per 5.7, is the condition under which the model is most likely to fill the gap itself." },
        { t: "p", text: "For a document re-indexed hourly the window is milliseconds and the risk is academic. For a full rebuild it is minutes to hours, which is exactly why 6.2 argues for building a second index and swapping a pointer rather than mutating the live one." },
        { t: "p", text: "If the store supports a transaction or an atomic batch covering both operations, use it. Most vector stores do not, which is one of the operational reasons 6.2 noted for putting vectors in a database that does." }
      ] },

    { t: "h3", text: "MMR, for the redundancy that survives a clean index" },

    { t: "p", text: "Dedup at ingestion removes copies. It does not stop five genuinely distinct chunks from all making the same point \u2014 which is common when a fact is restated across a FAQ, a policy page and a changelog. Maximal Marginal Relevance handles that at query time by penalising a candidate for resembling what has already been selected." },

    { t: "math", tex: "\\text{MMR} = \\arg\\max_{d\\in R\\setminus S}\\big[\\lambda\\,\\text{sim}(d,q) - (1-\\lambda)\\max_{s\\in S}\\text{sim}(d,s)\\big]" },

    { t: "p", text: "At \u03bb = 1 it is plain relevance ranking. At \u03bb = 0 it ignores the query and maximises diversity, which is useless. The useful range is roughly 0.5 to 0.8, and the parameter that matters as much is `fetch_k` \u2014 MMR can only diversify among candidates it was given, so a `fetch_k` of 4 with `k` of 4 does nothing at all." },

    { t: "code", lang: "python", title: "MMR in LangChain", code: `retriever = vs.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 4, "fetch_k": 20, "lambda_mult": 0.5},
)`,
      hl: [3],
      caption: "fetch_k is the shortlist MMR reorders. If it equals k there is nothing to choose between." },

    { t: "callout", kind: "tradeoff", title: "When diversity is the wrong objective",
      body: [
        { t: "p", text: "MMR assumes the ideal top-k covers several distinct aspects. For an exploratory question that is right. For a precise factual question it is not: if the answer is stated in three places, the best top-3 may well be those three statements, and MMR will deliberately replace two of them with less relevant chunks." },
        { t: "p", text: "6.1 gives the way to settle it rather than argue about it. nDCG and MAP are computed over the full relevant set, so if MMR is dropping relevant chunks for diversity the metrics fall; if it is dropping redundant ones they do not move much, and faithfulness improves because the context covers more ground." },
        { t: "p", text: "So treat \u03bb as a tuned parameter, not a default, and tune it on your own query mix. A corpus of mostly-unique documents may need no MMR at all \u2014 which is the cheaper outcome, and the one you should be hoping for." }
      ] },

    { t: "exercise", kind: "build", title: "Audit your index for duplicates", difficulty: "core", minutes: 35,
      body: "Take your own corpus and measure how much of it is duplicated at three levels: byte-identical chunks, chunks identical after normalisation, and near-duplicates above a cosine threshold. Then check whether any document has orphaned chunks \u2014 chunks whose doc_id still exists but whose content no longer appears in the current source.",
      requirements: [
        "Count exact duplicates before and after normalisation separately",
        "Sweep the cosine near-duplicate threshold over at least 0.90, 0.95 and 0.98",
        "Report the proportion of the index each level would remove",
        "Check for orphaned chunks by re-chunking a sample of sources and comparing hashes",
        "State which of the five dedup stages your pipeline currently implements"
      ],
      hint: "Run the normalisation comparison first. If it removes a meaningful fraction, your pipeline is creating duplicates at parse time and that is the bug to fix \u2014 upstream of any dedup pass.",
      solution: { lang: "python", title: "the audit", code: `import hashlib, re
from collections import Counter

def normalize(t):
    return re.sub(r"\s+", " ", t.lower().strip())

raw_ids  = Counter(hashlib.sha256(c.encode()).hexdigest()       for c in chunks)
norm_ids = Counter(hashlib.sha256(normalize(c).encode()).hexdigest() for c in chunks)

print("chunks                        : %d" % len(chunks))
print("unique, raw hash              : %d" % len(raw_ids))
print("unique, normalised hash       : %d" % len(norm_ids))

# near-duplicates: for each chunk, its best neighbour excluding itself
S = E @ E.T
import numpy as np
np.fill_diagonal(S, -1)
best = S.max(axis=1)
for thr in (0.90, 0.95, 0.98):
    print("above cosine %.2f              : %d chunks (%.1f%%)"
          % (thr, int((best >= thr).sum()), 100 * (best >= thr).mean()))

# orphans: chunks whose doc still exists but whose content no longer does
current = {hashlib.sha256(normalize(c).encode()).hexdigest()
           for doc in sample_docs for c in rechunk(doc)}
orphans = [i for i, c in enumerate(chunks)
           if meta[i] in sample_docs
           and hashlib.sha256(normalize(c).encode()).hexdigest() not in current]
print("orphaned chunks in sample     : %d" % len(orphans))`,
        out: `  [illustrative shape -- run this against your own corpus]

  chunks                        : 1187
  unique, raw hash              : 1187
  unique, normalised hash       : 1187
  above cosine 0.90             : 38 chunks (3.2%)
  above cosine 0.95             : 11 chunks (0.9%)
  above cosine 0.98             : 4 chunks (0.3%)
  orphaned chunks in sample     : 0`,
        notes: [
          { t: "p", text: "**That output is the shape to expect rather than a measurement.** The corpus here is twelve hand-written markdown documents with a recursive splitter over them, so it has no re-ingestion history and no parse-time boilerplate \u2014 exactly the conditions under which an audit finds nothing. A corpus assembled from PDFs over two years looks nothing like it." },
          { t: "p", text: "**The first two lines are the diagnostic.** A large gap between them means trivial variants are entering the index, which is a parsing or normalisation bug upstream \u2014 and \u00a7A measured that three of four trivial edits defeat a raw hash, so the gap can be large." },
          { t: "p", text: "**The cosine sweep tells you whether a near-duplicate pass is worth running at all.** Below a percent or so, the pass costs more than it saves and MMR at query time handles the residue. In the high single digits it is worth it, and above that there is a real ingestion problem to find." },
          { t: "p", text: "**Orphan detection is the check people skip** and the one that produces the worst symptom \u2014 a confidently cited chunk, attributed to a current document, that the document no longer contains. Nothing in the retrieval metrics catches it, because the chunk really is in the index and really does answer the question." },
          { t: "p", text: "One caveat on the `S = E @ E.T` line: it materialises an n\u00d7n matrix, which is 1.4 MB at 1,187 chunks and 40 GB at a million. Past a few tens of thousands, query the index for each chunk\u2019s nearest neighbour instead \u2014 or use MinHash and LSH, which is what \u00a7B was about." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Exact, near and ranked redundancy are three problems and they need three mechanisms: a normalised hash at ingestion, a similarity threshold within the batch, MMR at query time. Skipping the normalisation makes the first one nearly decorative." },
        { t: "p", text: "And duplicates are usually a symptom. The index did not acquire copies on its own \u2014 something upstream re-ingested without idempotent ids, or a parser started emitting a header on every chunk. Fix that and the dedup pass has little left to do." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG answers repeat themselves \u2014 the top 5 chunks all say the same thing. How do you fix it?\u201d**" },
        { t: "p", text: "First I would find out whether they are duplicates or distinct chunks making the same point, because those have different fixes. Hashing the chunks after normalising answers it in seconds." },
        { t: "p", text: "If they are duplicates, the question is where they came from. Re-ingestion without idempotent ids is the usual cause, and the fix is a content hash as the record id rather than a cleanup pass. Parse-time boilerplate is the other \u2014 a running header on every page makes every chunk start identically, and I measured that normalisation is what makes the hash catch that class of thing at all: three of four trivial edits defeat a raw hash." },
        { t: "p", text: "If they are genuinely distinct chunks restating one fact, that is MMR\u2019s problem rather than dedup\u2019s. I would set `lambda_mult` around 0.5 with a `fetch_k` well above `k` \u2014 if `fetch_k` equals `k`, MMR has nothing to choose between and does nothing, which is a common way to \u201cenable MMR\u201d and see no change." },
        { t: "p", text: "Then I would check it rather than assume. nDCG and MAP are computed over the full relevant set, so if the diversity penalty is dropping relevant chunks the metrics fall and I have traded accuracy for variety \u2014 which on a precise factual question is the wrong trade, since the three places a fact is stated may well be the correct top 3." },
        { t: "p", text: "And I would look for orphans while I was in there, because the same weakness produces them: chunks from an older version of a document that was re-indexed without deleting by `doc_id` first. Those are worse than duplicates \u2014 they are confidently cited, attributed to a live document, and no retrieval metric flags them." }
      ] }
  ],

  takeaways: [
    "**Parsing is upstream of chunking and inherits none of its attention** \u2014 a flattened table cannot be rescued by any chunk size, model or re-ranker.",
    "**Running headers are the classic parsing bug**: they produce hundreds of near-identical chunk prefixes, which also pulls every vector toward every other.",
    "**Read fifty chunks by hand before indexing.** No automated metric flags a pipeline that is working exactly as instructed on badly parsed input.",
    "**A follow-up question is not a query** \u2014 \u201cTell me more about its architecture\u201d has no topic in it, so rewrite it against the history before retrieving.",
    "**Err toward rewriting**: a missed rewrite returns arbitrary chunks, an unnecessary one returns the same query back. The asymmetry settles the trade-off.",
    "**An exactly expressible constraint belongs in a filter, not in a vector** \u2014 and pre-filtering rather than post-filtering is a security property, not a performance one.",
    "**Normalising before hashing is what makes the hash useful**: measured, three of four trivial edits \u2014 trailing space, collapsed spaces, case \u2014 defeat a raw hash while a real content change still differs.",
    "**MinHash error falls as 1/\u221anum_perm while cost rises linearly**, which is the argument for 128; my five-pair sample was too small to resolve 128 against 256 and I left that showing.",
    "**A 5-token shingle is strict** \u2014 90% shared tokens is 0.817 Jaccard, 50% is 0.329 \u2014 so a 0.8 threshold means \u201cnearly identical\u201d rather than \u201csimilar\u201d.",
    "**Delete by doc_id before re-inserting**, or a shrinking document leaves orphaned chunks that are retrievable, stale and cited as current.",
    "**MMR diversifies only among `fetch_k` candidates**, so `fetch_k` equal to `k` is MMR that does nothing \u2014 and diversity is the wrong objective for precise factual questions."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Measured on four trivial edits, a raw SHA-256 content hash treated a trailing space, collapsed internal spaces and a case change as three new records. What does this imply for dedup?",
        options: [
          "Hashing is unsuitable for deduplication and a cosine threshold should be used instead",
          "Normalisation before hashing is load-bearing \u2014 it collapses exactly the differences that carry no meaning, while a real content change still hashes differently",
          "A longer hash such as SHA-512 would resolve the collisions",
          "The chunks should be hashed after embedding rather than before"
        ],
        answer: 1,
        why: "The edits that occur in practice are whitespace and case \u2014 produced by re-parsing with a different library version or a CMS re-serialising an untouched document \u2014 so a raw hash misses most real duplicates. Normalising first collapses all three into one record, and the control case confirms it is not making the test blind: changing one word still hashes differently. How far to normalise is a judgement, since folding case is right for prose and wrong for code identifiers." },

      { stem: "Two documents share 90% of their tokens. Their measured Jaccard similarity over 5-token shingles is 0.817, not 0.9. Why, and what follows?",
        options: [
          "MinHash underestimates similarity, so the threshold should be lowered to compensate",
          "Changing one token destroys five shingles, so shingle Jaccard is strongly sublinear in token overlap \u2014 a 0.8 threshold therefore means \u201cnearly identical\u201d",
          "The shingles were computed after normalisation, which removed distinguishing tokens",
          "Jaccard is only an approximation of similarity and 0.817 is within error of 0.9"
        ],
        answer: 1,
        why: "A changed token breaks the shingle starting at it and the four spanning it, so overlap falls much faster than token overlap \u2014 50% shared tokens measured 0.329. This is a property of true Jaccard, not of the estimator: MinHash tracked the true value closely at every level. The practical consequence is that someone reading 0.8 as \u201cbroadly similar\u201d will set the threshold far too low and merge distinct documents, and that shingle length and threshold are one decision to tune together." },

      { stem: "A document is re-indexed using content hashes as record ids. It previously produced twelve chunks and now produces nine. What happens?",
        options: [
          "The three removed chunks are deleted automatically, since the hash set shrank",
          "The nine are upserted and the other three remain in the index as orphans \u2014 retrievable, stale and attributed to a document that no longer contains them",
          "The upsert fails because three record ids are missing from the batch",
          "All twelve are replaced because the document's own hash changed"
        ],
        answer: 1,
        why: "Hash-keyed upserts make re-ingestion idempotent, which solves duplicate inserts and not stale chunks \u2014 nothing in the write path knows the other three are gone. The fix is to tag every chunk with its doc_id and delete by that filter before inserting the fresh set. Orphans are worse than duplicates because no retrieval metric flags them: the chunk really is indexed and really does answer the question, so it is confidently cited as current content." },

      { stem: "A team enables MMR with search_kwargs={\"k\": 4, \"fetch_k\": 4} and sees no change in the results. Why?",
        options: [
          "lambda_mult defaults to 1.0, which disables the diversity term",
          "MMR reorders only the fetch_k shortlist, so with fetch_k equal to k there are no alternative candidates to choose between",
          "MMR requires normalised embeddings and the store was using dot product",
          "The index contains no duplicates, so MMR has nothing to penalise"
        ],
        answer: 1,
        why: "MMR selects k items out of a fetch_k shortlist by trading query similarity against similarity to what is already selected; if fetch_k equals k the shortlist is the answer and there is nothing to select. A fetch_k well above k \u2014 20 for a k of 4 is typical \u2014 gives it room to work. Separately, diversity is not always the right objective: if a fact is stated in three places the best top-3 may be those three, and 6.1's nDCG and MAP over the full relevant set are how to tell which case you are in." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The operational questions that do not fit elsewhere",
    questions: [
      { level: "core",
        q: "How do you handle duplicate content in a RAG index?",
        strong: "A strong answer separates exact, near and ranked redundancy and treats duplicates as a symptom.",
        answer: [
          { t: "p", text: "With three mechanisms, because they are three different problems. A normalised content hash as the record id catches identical content and makes re-ingestion idempotent. A cosine or MinHash pass catches edited content. MMR at query time catches distinct chunks that happen to make the same point." },
          { t: "p", text: "The normalisation is the part people skip and it is load-bearing. I measured that a trailing space, collapsed internal spaces and a case change all defeat a raw hash \u2014 three of four trivial edits \u2014 while a real content change still hashes differently. Those edits are what real pipelines produce, from a re-parse with a different library version or a CMS re-serialising an untouched file." },
          { t: "p", text: "At scale the cosine pass gets too slow, since it is quadratic in the batch. MinHash with LSH replaces it, and 128 permutations is the usual default because error falls as one over the square root of the signature length while cost rises linearly. The threshold needs care \u2014 on 5-token shingles, 90% shared tokens is only 0.817 Jaccard, so 0.8 means nearly identical rather than similar." },
          { t: "p", text: "But mostly I would treat duplicates as a symptom and look upstream. An index does not acquire copies by itself: either something re-ingested without idempotent ids, or a parser started prefixing every chunk with a running header. Fix the cause and the dedup pass has little left to do." }
        ] },

      { level: "core",
        q: "How does RAG handle follow-up questions in a conversation?",
        strong: "A strong answer names the failure precisely and places the cost.",
        answer: [
          { t: "p", text: "By rewriting the question into a standalone one before retrieving. The failure is specific: \u201cTell me more about its architecture\u201d carries its entire subject in the word \u201cits\u201d, which contributes almost no signal to the embedding, so the retrieval is close to arbitrary." },
          { t: "p", text: "So you pass the history and the latest message to a model and ask for a reformulation, with an explicit instruction not to answer it \u2014 that instruction is load-bearing, because without it the model answers from its own memory and you end up retrieving against the answer rather than the question." },
          { t: "p", text: "It is the same cost shape as HyDE: a full generation in series before the search starts, which on my own measurements is one of only two stages in a RAG request that are expensive at all. So I would use a small model, since the task is resolving a pronoun rather than reasoning." },
          { t: "p", text: "On whether to rewrite every turn, I would err toward yes. A missed rewrite returns arbitrary chunks; an unnecessary rewrite returns the same query back. That asymmetry makes unconditional rewriting the safe default, and a pronoun heuristic a reasonable optimisation if the latency matters." }
        ] },

      { level: "advanced",
        q: "Where does metadata filtering belong, and what is the risk of getting it wrong?",
        strong: "A strong answer treats pre-filtering as a security property.",
        answer: [
          { t: "p", text: "Any constraint that is exactly expressible \u2014 this tenant, this year, this access level \u2014 belongs in a filter rather than in a hope about cosine similarity. Embeddings are a similarity instrument and tenancy is not a similarity question." },
          { t: "p", text: "And it has to be a pre-filter. A pre-filter never considers the other tenant\u2019s vectors; a post-filter retrieves them, ranks them and then drops them. I measured both reaching the same recall on a two-tenant split, with post-filtering putting other-tenant chunks into the top 5 before discarding them \u2014 so they were read, scored and probably logged." },
          { t: "p", text: "That makes it a security property rather than a performance one, which is why I would treat PII and tenant filtering as mandatory rather than recommended. A post-filter is one logging statement or one off-by-one from being a disclosure." },
          { t: "p", text: "The hard part is having metadata to filter on, and that is an ingestion problem. I would take whatever the format gives for free first \u2014 headings from Word, section paths from Markdown, file paths from a repo \u2014 because that is exact rather than inferred, and only then add model-extracted tags. Ingestion runs on the slow clock, so a model call per document there costs nothing per query." }
        ] }
    ]
  }
});
