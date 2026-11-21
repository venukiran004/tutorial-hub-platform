/* ============================================================================
   LESSON 2.4 — Text Similarity and Semantic Search
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**\"I need a car\" and \"I need an automobile\" share almost no words and mean the same thing; \"the bank raised rates\" and \"the river bank was muddy\" share a word and mean different things.** Lexical overlap is neither necessary nor sufficient for similarity, and this lesson measures exactly that — TF-IDF cosine against a real sentence encoder on the same four pairs, where the encoder scores the paraphrase at **0.910** and the ambiguous pair at 0.335.",

  objectives: [
    "Compute lexical similarity with cosine, Jaccard and edit distance",
    "Measure where lexical methods fail on meaning",
    "Use a sentence encoder for semantic similarity",
    "Explain why an approximate index is needed at scale",
    "Choose between bi-encoder and cross-encoder"
  ],

  prerequisites: ["2.3", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "Lexical similarity", id: "lexical" },

    {"kind": "trace", "title": "The middle value is 0.151, and the reason is a default nobody mentions", "caption": "The quoted figure is roughly 0.4 and **the measured value is 0.151** — because `TfidfVectorizer` **drops single-character tokens by default**, so `I` is not a feature and the two documents share only `learning`. Which is the lesson in miniature: **a similarity number is a property of the vectoriser's settings as much as of the text.** The third row is the one that matters either way: **two documents sharing no words score exactly 0, whatever they mean.**", "left": "pair", "codeW": 220, "vars": ["tf-idf cosine", "why"], "steps": [{"code": "'I love machine learning' / 'I enjoy deep learning'", "state": ["0.151", "share only 'learning'"], "tone": "warn", "note": "quoted as ~0.4"}, {"code": "...because 'I' is not a feature", "state": ["-", "single chars dropped by default"], "changed": [1], "tone": "accent"}, {"code": "either / 'The weather is sunny'", "state": ["0.000", "no shared words at all"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-2_4-01-0"},












    { t: "out", text: `  documents: ['I love machine learning', 'I enjoy deep learning', 'The weather is sunny']
  cosine matrix:
    [1.0, 0.151, 0.0]
    [0.151, 1.0, 0.0]
    [0.0, 0.0, 1.0]` },

    { t: "p", text: "The quoted figure is roughly `[[1, .4, 0], [.4, 1, 0], [0, 0, 1]]`. Run with scikit-learn's defaults the middle value is **0.151**, not 0.4 — the difference is that `TfidfVectorizer` drops single-character tokens by default, so `I` is not a feature, and the two documents share only `learning`. The shape of the result is what the example is illustrating, and that holds: documents 0 and 1 are related, document 2 is unrelated." },

    { t: "table", head: ["Measure", "What it compares", "Range"],
      rows: [
        ["**Cosine on TF-IDF**", "Weighted word-vector angle", "0 to 1 for non-negative vectors"],
        ["**Jaccard**", "Set overlap: `|A∩B| / |A∪B|`", "0 to 1"],
        ["**Levenshtein**", "Character edits to turn one into the other", "0 to max length"]
      ] },

    { t: "out", text: `  Levenshtein('kitten','sitting') = 3   (by hand: 3)
  a simple normalised ratio = 1 - 3/7 = 0.571
  (python-Levenshtein's .ratio() uses a different normalisation and gives 0.615)` },

    { t: "callout", kind: "note", title: "There is more than one way to normalise an edit distance",
      body: [{ t: "p", text: "The raw distance of 3 is unambiguous and matches the hand count. The *ratio* is not: dividing by the longer string gives 0.571, while `python-Levenshtein`'s `.ratio()` computes `(total_length − distance) / total_length` using a slightly different alignment cost and returns 0.615. Neither is wrong; they are different conventions. If you are comparing similarity scores across systems or setting a threshold, check which one you are getting — a threshold tuned on one is not valid for the other. Lesson 8.1 works the edit-distance table out in full." }] },

    { t: "h2", n: "02", text: "Where lexical similarity breaks", id: "failure" },

    {"kind": "trace", "title": "Paraphrase scores 0.000 and an unrelated pair scores 0.311", "caption": "Read the first and last rows together, because together they are the whole indictment. **A genuine paraphrase — *how to learn machine learning* against *the best way to study ML* — scores exactly 0.000, because it shares no words.** And *the bank raised rates* against *the river bank was muddy* scores **0.311, the highest in the table**, because it shares `the` and `bank`. **The ranking is not merely noisy: it is inverted on the two cases that matter most.**", "left": "pair", "codeW": 210, "vars": ["tf-idf cosine", "truth"], "steps": [{"code": "learn ML / study ML", "state": ["0.000", "a paraphrase"], "tone": "crit"}, {"code": "film excellent / movie superb", "state": ["0.155", "a paraphrase"], "changed": [0], "tone": "crit"}, {"code": "a car / an automobile", "state": ["0.247", "a synonym"], "changed": [0], "tone": "crit"}, {"code": "bank rates / river bank", "state": ["0.311", "unrelated - highest score"], "changed": [0, 1], "tone": "crit", "note": "inverted"}], "t": "diagram", "id": "dg-2_4-02-1"},












    { t: "out", text: `  text A                                 text B                                 tf-idf cos
  How to learn machine learning?         What is the best way to study ML?      0.000
  The film was excellent                 The movie was superb                   0.155
  I need a car                           I need an automobile                   0.247
  the bank raised rates                  the river bank was muddy               0.311` },

    { t: "callout", kind: "crit", title: "The ranking is exactly backwards",
      body: [{ t: "p", text: "The first three pairs are paraphrases — they mean the same thing — and they score **0.000, 0.155 and 0.247**. The fourth pair means two completely different things and scores **0.311**, the highest of the four, because both sentences contain `bank` and `the`. A retrieval system built on TF-IDF would rank the unrelated pair above every genuine paraphrase. This is not a tuning problem; it is what happens when the representation encodes which words are present and nothing about what they mean." }] },

    { t: "h2", n: "03", text: "Semantic similarity", id: "semantic" },

    {"kind": "trace", "title": "The same four pairs, and the ordering is now right", "caption": "384 dimensions and the inversion is gone: **the synonym pair goes 0.247 to 0.910, the paraphrase 0.155 to 0.737, and the ML question pair 0.000 to 0.534.** Note the honest detail: **a commonly quoted figure for that last pair is ~0.85 and the measured value is 0.534** — so a short embedding model is less confident on a paraphrase with no shared vocabulary than the write-up suggests. **The ordering is what you rely on, not the magnitude.**", "left": "pair", "codeW": 190, "vars": ["tf-idf", "embedding", "change"], "steps": [{"code": "learn ML / study ML", "state": ["0.000", "0.534", "0 -> usable"], "tone": "good", "note": "quoted as ~0.85"}, {"code": "film excellent / movie superb", "state": ["0.155", "0.737", "+0.58"], "changed": [0, 1, 2], "tone": "good"}, {"code": "a car / an automobile", "state": ["0.247", "0.910", "+0.66"], "changed": [0, 1, 2], "tone": "good"}, {"code": "ML question / weather", "state": ["0.000", "0.059", "still near zero"], "changed": [0, 1, 2], "tone": "good", "note": "the ordering holds"}], "t": "diagram", "id": "dg-2_4-03-2"},












    { t: "out", text: `  embedding shape (3, 384)
  ML question vs ML question : 0.5336
  ML question vs weather     : 0.0593
  commonly quoted: ~0.85 and ~0.10

  the same four pairs, now semantically:
    0.534   'How to learn machine learning?' / 'What is the best way to study ML?'
    0.737   'The film was excellent' / 'The movie was superb'
    0.910   'I need a car' / 'I need an automobile'
    0.335   'the bank raised rates' / 'the river bank was muddy'` },

    { t: "callout", kind: "insight", title: "The ordering is now right, even though one number is not what was quoted",
      body: [{ t: "p", text: "Every paraphrase pair now scores above the ambiguous pair, which is the behaviour a search system needs — `car`/`automobile` reaches **0.910** on a pair TF-IDF scored 0.247. The `bank` pair stays at 0.335 despite sharing a word. What does not reproduce is the quoted 0.85 for the two ML questions; with `all-MiniLM-L6-v2` the value is **0.5336**. Sentence-encoder scores are model-specific and not comparable across models, so a threshold tuned for one encoder is meaningless for another — which is the practical lesson rather than the discrepancy itself." }] },

    { t: "p", text: "The encoder maps a whole sentence to one 384-dimensional vector, and the cosine between two such vectors is the similarity. This is a **bi-encoder**: each text is encoded independently, so the corpus can be encoded once and cached, which is what makes search possible at all." },

    { t: "h2", n: "04", text: "Scale", id: "scale" },

    {"kind": "trace", "title": "Exact cosine is one dot product per document, per query", "caption": "The arithmetic is unforgiving because it is linear in corpus size and there is no constant factor to hide in: **at 10 million documents and 384 dimensions, one query is 3.8×10⁹ multiply-adds.** Which is why approximate nearest-neighbour indexes exist at all — **not to make the search smarter, but to stop it being a full scan.** And the cost is per **query**, so it is paid at serving time rather than once at build time.", "left": "corpus size", "codeW": 170, "vars": ["dot products per query", "multiply-adds at 384 dims"], "steps": [{"code": "1,000", "state": ["1,000", "3.8e5"], "tone": "good"}, {"code": "100,000", "state": ["100,000", "3.8e7"], "changed": [0, 1], "tone": "warn"}, {"code": "10,000,000", "state": ["10,000,000", "3.8e9"], "changed": [0, 1], "tone": "crit", "note": "per query"}], "t": "diagram", "id": "dg-2_4-04-3"},












    { t: "out", text: `        1000 documents: exact cosine = 1000 dot products PER QUERY
      100000 documents: exact cosine = 100000 dot products PER QUERY
    10000000 documents: exact cosine = 10000000 dot products PER QUERY
  at 10M docs and 384 dims that is 3.8e9 multiply-adds per query` },

    { t: "callout", kind: "tradeoff", title: "Approximate nearest neighbour trades recall for sublinear search",
      body: [{ t: "p", text: "Exhaustive cosine is linear in corpus size, so at ten million documents every query is nearly four billion multiply-adds — fine for a batch job, impossible for an interactive search. Approximate nearest-neighbour indexes such as HNSW and IVF give sublinear search by not examining every vector, at the cost of occasionally missing a true nearest neighbour. That recall loss is tunable and usually small, and it is the trade FAISS, Qdrant, Milvus and pgvector all implement. **Measure the recall against exhaustive search on a sample** before trusting an index — the default parameters are not always appropriate for your dimensionality and corpus size." }] },

    { t: "h2", n: "05", text: "Bi-encoder or cross-encoder", id: "encoders" },

    { t: "diagram", kind: "compare", title: "Two ways to score a pair",
      caption: "The bi-encoder makes search possible; the cross-encoder makes it accurate. Production uses both.",
      columns: [
        { title: "Bi-encoder", tone: "good", items: [
          "Encodes each text independently into one vector",
          "Corpus is encoded once and indexed",
          "Query cost is one encode plus a vector search",
          "Less accurate — the two texts never interact",
          "The only option for search over a large corpus"
        ] },
        { title: "Cross-encoder", tone: "accent", items: [
          "Encodes the pair together, with attention across both",
          "No reusable vector — every pair must be run",
          "Cost is one forward pass per candidate",
          "More accurate — it can compare the texts directly",
          "Impossible to run over millions of documents"
        ] }
      ] },

    { t: "callout", kind: "good", title: "Retrieve with a bi-encoder, rerank with a cross-encoder",
      body: [{ t: "p", text: "This is the standard architecture and it resolves the trade cleanly. The bi-encoder searches the whole corpus and returns perhaps the top 100 candidates, which is fast because the corpus vectors are precomputed. The cross-encoder then scores those 100 properly, with the query and document attending to each other, and reorders them. You pay 100 forward passes rather than ten million, and you get most of the cross-encoder's accuracy. It is the same two-pass idea as the streaming-then-rescoring design in speech recognition — a cheap wide pass followed by an expensive narrow one." }] },

    { t: "callout", kind: "trap", title: "Indexing unnormalised embeddings for cosine search",

      body: [

        { t: "p", text: "An inner-product index on unnormalised vectors ranks by length as well as direction, so long documents or common topics dominate results." },

        { t: "p", text: "L2-normalise embeddings before indexing so inner product equals cosine." }

      ] },


    { t: "exercise", kind: "practice", title: "Build and measure a search system", difficulty: "core", minutes: 40,
      prompt: "Build semantic search over a document collection with a bi-encoder, and compare its top-10 results against TF-IDF on the same queries. Construct ten queries that are paraphrases of document content using different vocabulary, and measure recall at 10 for both. Then add a cross-encoder reranker over the top 50 and measure the improvement. Finally, build an approximate index and measure its recall against exhaustive search.",
      requirements: [
        "Build semantic search with a bi-encoder and compare its top-10 with TF-IDF",
        "Write ten paraphrased queries and measure recall at 10 for both",
        "Add a cross-encoder reranker over the top 50 and measure the gain",
        "Build an approximate index and measure its recall against exhaustive search"
      ],
      hints: [
        "The paraphrase queries are where the two approaches separate — on keyword queries TF-IDF is competitive.",
        "Cross-encoder reranking usually helps most when the bi-encoder's top-10 is nearly right but mis-ordered.",
        "For ANN recall, compute exhaustive results on a sample and measure overlap."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import time
import numpy as np
import faiss
from sentence_transformers import CrossEncoder, SentenceTransformer
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer

raw = fetch_20newsgroups(subset="train", remove=("headers", "footers", "quotes")).data
docs = [d.strip().replace("\\n", " ")[:600] for d in raw if len(d.strip()) > 200][:5000]
# Ten paraphrase queries, each written for one target document using different vocabulary.
TARGETS = {
    "automobile engine making a knocking noise": "engine",
    "spacecraft circling the planet": "orbit",
    "handgun ownership laws": "gun control",
    "graphics card drivers for the PC": "video card",
    "ice hockey goaltender statistics": "goalie",
    "the existence of a deity": "god",
    "encrypting messages so the government cannot read them": "encryption",
    "selling a used motorbike": "bike",
    "medical treatment for persistent headaches": "migraine",
    "sharing image files between computers": "gif",
}
# relevant = documents containing the target phrase (the queries avoid that phrase on purpose)
relevant = {q: {i for i, d in enumerate(docs) if t in d.lower()} for q, t in TARGETS.items()}
assert all(relevant.values()), "every query needs at least one relevant document"
queries = list(TARGETS)

tfidf = TfidfVectorizer(stop_words="english", sublinear_tf=True).fit(docs); D_t = tfidf.transform(docs)
bi = SentenceTransformer("BAAI/bge-small-en-v1.5")
import os
t0 = time.time()
if os.path.exists("doc_emb.npy"): D_e = np.load("doc_emb.npy")             # embedding is the slow step: cache it
else: D_e = bi.encode(docs, batch_size=64, normalize_embeddings=True, convert_to_numpy=True); np.save("doc_emb.npy", D_e)
enc_s = time.time() - t0
Q_e = bi.encode(queries, normalize_embeddings=True, convert_to_numpy=True)

def recall_at(ranked, q, k=10):
    return len(set(ranked[:k]) & relevant[q]) / min(k, len(relevant[q]))

lex = {q: np.argsort(-(D_t @ tfidf.transform([q]).T).toarray().ravel())[:50].tolist() for q in queries}
sem = {q: np.argsort(-(D_e @ Q_e[i]))[:50].tolist() for i, q in enumerate(queries)}
ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
rer = {}
for q in queries:
    scores = ce.predict([(q, docs[i]) for i in sem[q]]); rer[q] = [sem[q][j] for j in np.argsort(-scores)]
print(f"{len(docs):,} documents embedded (or loaded from cache) in {enc_s:.0f}s; relevant documents per query: " + ", ".join(str(len(relevant[q])) for q in queries))
print("\\nrecall@10        TF-IDF   bi-encoder   bi-encoder + cross-encoder rerank of top 50")
for q in queries:
    print(f"  {q[:38]:<38} {recall_at(lex[q], q):.2f}     {recall_at(sem[q], q):.2f}         {recall_at(rer[q], q):.2f}")
print(f"  {'mean':<38} {np.mean([recall_at(lex[q], q) for q in queries]):.2f}     {np.mean([recall_at(sem[q], q) for q in queries]):.2f}"
      f"         {np.mean([recall_at(rer[q], q) for q in queries]):.2f}")

exact = faiss.IndexFlatIP(D_e.shape[1]); exact.add(D_e)
hnsw = faiss.IndexHNSWFlat(D_e.shape[1], 16, faiss.METRIC_INNER_PRODUCT); hnsw.add(D_e)
probe = D_e[np.random.default_rng(0).choice(len(D_e), 200, replace=False)]
_, truth = exact.search(probe, 10)
for ef in [8, 16, 64]:
    hnsw.hnsw.efSearch = ef; t0 = time.perf_counter(); _, approx = hnsw.search(probe, 10); ms = (time.perf_counter() - t0) * 1000 / 200
    overlap = np.mean([len(set(a) & set(t)) / 10 for a, t in zip(approx, truth)])
    print(f"HNSW efSearch={ef:<3} recall@10 against exhaustive search {overlap:.3f}   {ms:.3f} ms/query")`,
        out: `

5,000 documents embedded (or loaded from cache) in 0s; relevant documents per query: 103, 43, 10, 31, 10, 182, 64, 99, 8, 40

recall@10        TF-IDF   bi-encoder   bi-encoder + cross-encoder rerank of top 50
  automobile engine making a knocking no 0.50     0.30         0.40
  spacecraft circling the planet         0.20     0.30         0.30
  handgun ownership laws                 0.10     0.00         0.20
  graphics card drivers for the PC       0.10     0.10         0.00
  ice hockey goaltender statistics       0.00     0.20         0.20
  the existence of a deity               0.50     1.00         1.00
  encrypting messages so the government  0.30     0.60         0.60
  selling a used motorbike               0.10     0.70         0.50
  medical treatment for persistent heada 0.25     0.62         0.50
  sharing image files between computers  0.30     0.20         0.10
  mean                                   0.23     0.40         0.38
HNSW efSearch=8   recall@10 against exhaustive search 0.940   0.011 ms/query
HNSW efSearch=16  recall@10 against exhaustive search 0.975   0.007 ms/query
HNSW efSearch=64  recall@10 against exhaustive search 0.997   0.018 ms/query`,
       
        notes: [
          { t: "p", text: "The paraphrase queries are the whole experiment. On queries that share vocabulary with the documents, TF-IDF is genuinely competitive and sometimes better, because exact term matching is a strong signal when the terms are right. The gap appears when the query uses different words for the same thing — I measured `car` against `automobile` at 0.247 lexically and 0.910 semantically. Hybrid retrieval, combining both scores, is common for exactly this reason." },
          { t: "p", text: "Cross-encoder reranking is often the largest gain in the top few positions, but measure it rather than assume it. In the reference run on 20 Newsgroups the bi-encoder roughly doubled TF-IDF's recall@10 on paraphrased queries (0.40 against 0.23), and an MS MARCO cross-encoder reranking its top 50 did not improve it (0.38): a reranker trained on web question-answer pairs is not automatically right for forum posts, and relevance labels defined by keyword matching reward lexical overlap. Whatever it does to precision, it reorders what the bi-encoder found and cannot recover anything the bi-encoder missed. That is the argument for retrieving generously — 100 or 200 candidates — before reranking, since the reranker's ceiling is set by the retrieval." },
          { t: "p", text: "Measuring ANN recall against exhaustive search is a step people skip, and the default index parameters are not always right for your dimensionality and corpus size. A recall of 0.95 at ten times the speed is usually an excellent trade; a recall of 0.7 discovered in production is not. It takes a few minutes on a sample and turns an assumption into a number." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: search that could not find 'automobile'",
      body: [
        { t: "p", text: "**Symptom.** Users searching an internal knowledge base for 'automobile policy' found nothing, though a 'car policy' document existed." },
        { t: "p", text: "**Mechanism.** Search used TF-IDF cosine, which matches words. Different vocabulary for the same meaning scored zero overlap." },
        { t: "p", text: "**Fix.** Search combines BM25 with a sentence-embedding retriever and reranks the top results, and recall is measured on paraphrased queries." }
      ] }
  ],

  takeaways: [
    "The TF-IDF cosine of ~0.4 comes out at 0.151 — `TfidfVectorizer` drops single-character tokens by default.",
    "Levenshtein('kitten','sitting') = 3, but normalised *ratios* differ by convention (0.571 against 0.615).",
    "Measured: three paraphrase pairs scored 0.000–0.247 lexically while an ambiguous pair scored 0.311 — the ranking is backwards.",
    "A sentence encoder fixed the ordering: `car`/`automobile` reached 0.910, and the `bank` pair stayed at 0.335.",
    "The quoted 0.85 did not reproduce — `all-MiniLM-L6-v2` gives 0.5336. Encoder scores are not comparable across models.",
    "Exhaustive search is linear: 3.8e9 multiply-adds per query at 10M documents and 384 dimensions.",
    "ANN indexes trade a little recall for sublinear search — measure that recall rather than assuming it.",
    "Retrieve with a bi-encoder, rerank the top candidates with a cross-encoder."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "TF-IDF scored an unrelated pair higher than three paraphrase pairs. Why?",
      options: ["The vectoriser was misconfigured", "It measures overlap; those words matched", "The corpus was too small to fit", "Cosine is the wrong metric for TF-IDF"],
      answer: 1,
      why: "`the bank raised rates` and `the river bank was muddy` share `bank` and `the`, scoring 0.311, while `I need a car` and `I need an automobile` share almost nothing and scored 0.247. Lexical overlap is neither necessary nor sufficient for similarity — no tuning fixes a representation that encodes presence rather than meaning." },
    { stem: "Why can't a cross-encoder be used for search over a large corpus?",
      options: ["It is less accurate than a bi-encoder", "No reusable vector: one pass per pair", "It cannot handle long documents", "It requires labelled training data"],
      answer: 1,
      why: "A cross-encoder encodes the pair jointly, which is what makes it accurate — the texts attend to each other — but means nothing can be precomputed. Over ten million documents that is ten million forward passes per query. The standard fix is to retrieve with a bi-encoder and rerank the top 50–100." },
    { stem: "You measured a similarity of 0.53 where a tutorial quotes 0.85. What should you conclude?",
      options: ["Your code must be wrong", "Scores are specific to each model", "The tutorial used more data", "Cosine was computed wrongly"],
      answer: 1,
      why: "Different encoders produce different absolute scales even when their rankings agree. What matters is that the ordering is right — every paraphrase pair scored above the ambiguous pair. A threshold tuned for one encoder is meaningless for another, which is why thresholds must be calibrated on your own data and model." },
    { stem: "What does an approximate nearest-neighbour index trade away?",
      options: ["Embedding quality", "Some recall, for speed", "Cosine similarity support", "Ability to update"],
      answer: 1,
      why: "HNSW and IVF avoid examining every vector, so they occasionally miss a true nearest neighbour. That loss is tunable and usually small against the benefit — exhaustive search at ten million documents is 3.8 billion multiply-adds per query. Measure the recall against exhaustive on a sample rather than trusting the defaults." }
  ] },

  interview: { title: "Interview", sub: "Similarity and search", questions: [
    { level: "Core", q: "How would you build semantic search?",
      strong: "Bi-encoder for retrieval into an ANN index, cross-encoder to rerank the top candidates.",
      answer: [{ t: "p", text: "Encode the corpus once with a bi-encoder — a sentence transformer producing one vector per document — and put those vectors in an approximate nearest-neighbour index. At query time, encode the query and retrieve the top hundred or so by cosine. Then rerank those with a cross-encoder, which encodes the query and document together so they can attend to each other and is much more accurate, but produces no reusable vector and so cannot be run over the whole corpus. You pay a hundred forward passes instead of ten million. I would also consider hybrid retrieval, combining the semantic score with BM25 or TF-IDF, because lexical matching is genuinely strong when the query uses the right terms — exact product codes, names, technical vocabulary — and the two methods fail on different queries. And I would measure the index's recall against exhaustive search on a sample, since the default ANN parameters are not always right for your dimensionality." }] },
    { level: "Core", q: "When does lexical similarity beat semantic similarity?",
      strong: "When the exact terms matter — codes, names, rare technical vocabulary.",
      answer: [{ t: "p", text: "When the query contains terms that must match exactly. Product codes, part numbers, person names, error codes, rare technical vocabulary — an embedding model may not have seen them often enough to place them meaningfully, and it will happily return something semantically adjacent when the user wanted that exact string. Lexical search is also interpretable, since you can show which terms matched, which matters when someone asks why a result appeared. Where it fails badly is paraphrase: I measured `I need a car` against `I need an automobile` at 0.247 lexically and 0.910 semantically, and an unrelated pair sharing the word `bank` outscoring all three paraphrases at 0.311. So the honest answer is that they fail on different queries and production systems usually run both and fuse the scores, rather than choosing." }] },
    { level: "Senior", q: "A semantic search system returns plausible but wrong results. How do you debug it?",
      strong: "Separate retrieval failures from ranking failures, and check the embedding matches the domain.",
      answer: [{ t: "p", text: "First I would establish whether the right document was retrieved at all. If it is not in the top hundred, that is a retrieval problem and reranking cannot fix it; if it is present but ranked badly, that is a ranking problem. The fixes are different and conflating them wastes a lot of time. For retrieval failures I would check the embedding model against the domain, because general-purpose sentence encoders can be poor on specialised vocabulary that was rare in their training data, and a domain-adapted or fine-tuned encoder often helps more than anything else. I would also check chunking, since a document split badly can leave the answer straddling two chunks with neither scoring well. For ranking failures, a cross-encoder reranker is the usual answer. Throughout I would be careful with thresholds: encoder similarity scores are model-specific — I measured 0.53 where a tutorial quoted 0.85 for the same sentence pair with a different model — so any cutoff has to be calibrated on your own data rather than carried over." }] }
  ] }
});
