/* ============================================================================
   LESSON 2.4 — Text Similarity and Semantic Search
   Mirrors 01_NLP_Notes.md · §12. Lexical and semantic similarity are measured
   on the same four pairs with a real sentence encoder; the reference's quoted
   similarity does not reproduce (scratchpad/nlp/n24.py).
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

    { t: "out", text: `  documents: ['I love machine learning', 'I enjoy deep learning', 'The weather is sunny']
  cosine matrix:
    [1.0, 0.151, 0.0]
    [0.151, 1.0, 0.0]
    [0.0, 0.0, 1.0]` },

    { t: "p", text: "The reference quotes roughly `[[1, .4, 0], [.4, 1, 0], [0, 0, 1]]`. Run with scikit-learn's defaults the middle value is **0.151**, not 0.4 — the difference is that `TfidfVectorizer` drops single-character tokens by default, so `I` is not a feature, and the two documents share only `learning`. The shape of the result is what the reference is illustrating and that holds: documents 0 and 1 are related, document 2 is unrelated." },

    { t: "table", head: ["Measure", "What it compares", "Range"],
      rows: [
        ["**Cosine on TF-IDF**", "Weighted word-vector angle", "0 to 1 for non-negative vectors"],
        ["**Jaccard**", "Set overlap: `|A∩B| / |A∪B|`", "0 to 1"],
        ["**Levenshtein**", "Character edits to turn one into the other", "0 to max length"]
      ] },

    { t: "out", text: `  Levenshtein('kitten','sitting') = 3   (reference says 3)
  a simple normalised ratio = 1 - 3/7 = 0.571
  (python-Levenshtein's .ratio() uses a different normalisation and gives 0.615)` },

    { t: "callout", kind: "note", title: "There is more than one way to normalise an edit distance",
      body: [{ t: "p", text: "The raw distance of 3 is unambiguous and matches the reference. The *ratio* is not: dividing by the longer string gives 0.571, while `python-Levenshtein`'s `.ratio()` computes `(total_length − distance) / total_length` using a slightly different alignment cost and returns 0.615. Neither is wrong; they are different conventions. If you are comparing similarity scores across systems or setting a threshold, check which one you are getting — a threshold tuned on one is not valid for the other. Lesson 8.1 works the edit-distance table out in full." }] },

    { t: "h2", n: "02", text: "Where lexical similarity breaks", id: "failure" },

    { t: "out", text: `  text A                                 text B                                 tf-idf cos
  How to learn machine learning?         What is the best way to study ML?      0.000
  The film was excellent                 The movie was superb                   0.155
  I need a car                           I need an automobile                   0.247
  the bank raised rates                  the river bank was muddy               0.311` },

    { t: "callout", kind: "crit", title: "The ranking is exactly backwards",
      body: [{ t: "p", text: "The first three pairs are paraphrases — they mean the same thing — and they score **0.000, 0.155 and 0.247**. The fourth pair means two completely different things and scores **0.311**, the highest of the four, because both sentences contain `bank` and `the`. A retrieval system built on TF-IDF would rank the unrelated pair above every genuine paraphrase. This is not a tuning problem; it is what happens when the representation encodes which words are present and nothing about what they mean." }] },

    { t: "h2", n: "03", text: "Semantic similarity", id: "semantic" },

    { t: "out", text: `  embedding shape (3, 384)
  ML question vs ML question : 0.5336
  ML question vs weather     : 0.0593
  reference says ~0.85 and ~0.10

  the same four pairs, now semantically:
    0.534   'How to learn machine learning?' / 'What is the best way to study ML?'
    0.737   'The film was excellent' / 'The movie was superb'
    0.910   'I need a car' / 'I need an automobile'
    0.335   'the bank raised rates' / 'the river bank was muddy'` },

    { t: "callout", kind: "insight", title: "The ordering is now right, even though one number is not what was quoted",
      body: [{ t: "p", text: "Every paraphrase pair now scores above the ambiguous pair, which is the behaviour a search system needs — `car`/`automobile` reaches **0.910** on a pair TF-IDF scored 0.247. The `bank` pair stays at 0.335 despite sharing a word. What does not reproduce is the reference's quoted 0.85 for the two ML questions; with `all-MiniLM-L6-v2` the value is **0.5336**. Sentence-encoder scores are model-specific and not comparable across models, so a threshold tuned for one encoder is meaningless for another — which is the practical lesson rather than the discrepancy itself." }] },

    { t: "p", text: "The encoder maps a whole sentence to one 384-dimensional vector, and the cosine between two such vectors is the similarity. This is a **bi-encoder**: each text is encoded independently, so the corpus can be encoded once and cached, which is what makes search possible at all." },

    { t: "h2", n: "04", text: "Scale", id: "scale" },

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

    { t: "exercise", kind: "practice", title: "Build and measure a search system", difficulty: "core", minutes: 40,
      prompt: "Build semantic search over a document collection with a bi-encoder, and compare its top-10 results against TF-IDF on the same queries. Construct ten queries that are paraphrases of document content using different vocabulary, and measure recall at 10 for both. Then add a cross-encoder reranker over the top 50 and measure the improvement. Finally, build an approximate index and measure its recall against exhaustive search.",
      hints: [
        "The paraphrase queries are where the two approaches separate — on keyword queries TF-IDF is competitive.",
        "Cross-encoder reranking usually helps most when the bi-encoder's top-10 is nearly right but mis-ordered.",
        "For ANN recall, compute exhaustive results on a sample and measure overlap."
      ],
      solution: {
        notes: [
          { t: "p", text: "The paraphrase queries are the whole experiment. On queries that share vocabulary with the documents, TF-IDF is genuinely competitive and sometimes better, because exact term matching is a strong signal when the terms are right. The gap appears when the query uses different words for the same thing — I measured `car` against `automobile` at 0.247 lexically and 0.910 semantically. Hybrid retrieval, combining both scores, is common for exactly this reason." },
          { t: "p", text: "Cross-encoder reranking tends to give a large improvement in the top few positions and little change in recall at 50, which makes sense: it reorders what the bi-encoder found and cannot recover anything the bi-encoder missed. That is the argument for retrieving generously — 100 or 200 candidates — before reranking, since the reranker's ceiling is set by the retrieval." },
          { t: "p", text: "Measuring ANN recall against exhaustive search is a step people skip, and the default index parameters are not always right for your dimensionality and corpus size. A recall of 0.95 at ten times the speed is usually an excellent trade; a recall of 0.7 discovered in production is not. It takes a few minutes on a sample and turns an assumption into a number." }
        ]
      } }

  ],

  takeaways: [
    "The reference's TF-IDF cosine of ~0.4 comes out at 0.151 — `TfidfVectorizer` drops single-character tokens by default.",
    "Levenshtein('kitten','sitting') = 3, but normalised *ratios* differ by convention (0.571 against 0.615).",
    "Measured: three paraphrase pairs scored 0.000–0.247 lexically while an ambiguous pair scored 0.311 — the ranking is backwards.",
    "A sentence encoder fixed the ordering: `car`/`automobile` reached 0.910, and the `bank` pair stayed at 0.335.",
    "The reference's quoted 0.85 did not reproduce — `all-MiniLM-L6-v2` gives 0.5336. Encoder scores are not comparable across models.",
    "Exhaustive search is linear: 3.8e9 multiply-adds per query at 10M documents and 384 dimensions.",
    "ANN indexes trade a little recall for sublinear search — measure that recall rather than assuming it.",
    "Retrieve with a bi-encoder, rerank the top candidates with a cross-encoder."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "TF-IDF scored an unrelated pair higher than three paraphrase pairs. Why?",
      options: ["The vectoriser was misconfigured", "It measures word overlap, and the unrelated pair happened to share words", "The corpus was too small", "Cosine is the wrong metric"],
      answer: 1,
      why: "`the bank raised rates` and `the river bank was muddy` share `bank` and `the`, scoring 0.311, while `I need a car` and `I need an automobile` share almost nothing and scored 0.247. Lexical overlap is neither necessary nor sufficient for similarity — no tuning fixes a representation that encodes presence rather than meaning." },
    { stem: "Why can't a cross-encoder be used for search over a large corpus?",
      options: ["It is less accurate", "It produces no reusable vector, so every query-document pair needs a forward pass", "It cannot handle long text", "It requires labelled data"],
      answer: 1,
      why: "A cross-encoder encodes the pair jointly, which is what makes it accurate — the texts attend to each other — but means nothing can be precomputed. Over ten million documents that is ten million forward passes per query. The standard fix is to retrieve with a bi-encoder and rerank the top 50–100." },
    { stem: "You measured a similarity of 0.53 where a tutorial quotes 0.85. What should you conclude?",
      options: ["Your code is wrong", "Sentence-encoder scores are model-specific and not comparable across models", "The tutorial used more data", "Cosine was computed incorrectly"],
      answer: 1,
      why: "Different encoders produce different absolute scales even when their rankings agree. What matters is that the ordering is right — every paraphrase pair scored above the ambiguous pair. A threshold tuned for one encoder is meaningless for another, which is why thresholds must be calibrated on your own data and model." },
    { stem: "What does an approximate nearest-neighbour index trade away?",
      options: ["Embedding quality", "A small amount of recall, in exchange for sublinear search", "Support for cosine similarity", "The ability to update the index"],
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
