EC.receiveLesson({
  id: "5.4",
  lede: "An embedding measures **similarity**, and retrieval needs **relevance** \u2014 they correlate, and they are not the same thing, which this lesson demonstrates with an uncomfortable number. Against the query *\u201chow do I reset my password\u201d*, the genuinely relevant document's language (*\u201ccredential recovery signed link\u201d*) scores **0.3449**, and the completely irrelevant *\u201chow do I reset my router\u201d* scores **0.5330**. The irrelevant one is closer. That gap is what the rest of Phase 2 exists to close, and it is also why the normalisation detail matters: once vectors are unit length, cosine **is** the dot product, so forgetting to normalise silently changes every score you compute.",
  objectives: [
    "Describe what a sentence embedding produces",
    "Compute cosine by hand and show it equals the dot product when normalised",
    "Demonstrate that similarity and relevance are different",
    "Explain why an asymmetric model needs two embedding methods",
    "Say what forgetting to normalise does, and why nothing reports it"
  ],
  prerequisites: ["5.3", "1.6"],
  blocks: [
    { t: "h2", n: "01", id: "what", text: "What an embedding is", sub: "A fixed-length vector, and nothing more" },
    { t: "code", lang: "text", title: "One query, encoded",
      code: "model      : all-MiniLM-L6-v2\ndimensions : 384\nnormalised : |v| = 1.000000\nfirst 6    : [-0.0353, 0.0199, -0.0066, 0.0255, -0.0506, -0.0304]",
      caption: "384 numbers. Nothing about them is interpretable individually." },
    { t: "h2", n: "02", id: "cosine", text: "Cosine, by hand", sub: "And why normalisation collapses it to a dot product" },
    { t: "code", lang: "python", title: "Two ways to compute the same number",
      code: 'def cos(x, y):\n    return float(np.dot(x, y) / (np.linalg.norm(x) * np.linalg.norm(y)))\n\ncos(a, b)        # 0.7139\nfloat(a @ b)     # 0.7139  -- identical, because both are unit length',
      out: "cos(subscription cancel, stop plan renewing) = 0.7139\ncos(subscription cancel, API rate limit)     = 0.0699\ndot product, since both are normalised       = 0.7139\nidentical to the cosine: True",
      caption: "With unit vectors the denominator is 1, so cosine reduces to the dot product." },
    { t: "callout", kind: "warn", title: "Forgetting to normalise changes every score, silently", body: [
      { t: "p", text: "Vector stores use inner product because it is cheap, and inner product equals cosine **only for unit vectors**. If you index un-normalised embeddings, the search still runs, still returns results and still ranks them \u2014 by direction *and magnitude*, where you intended direction alone." },
      { t: "p", text: "Longer documents tend to produce larger-magnitude vectors in some models, so the practical effect is a quiet bias toward long documents. There is no error, and the symptom is retrieval quality that is slightly and inexplicably worse." }
    ] },
    { t: "h2", n: "03", id: "notrelevance", text: "Similarity is not relevance", sub: "Demonstrated, and the number is uncomfortable" },
    { t: "code", lang: "text", title: "Four pairs against the same query",
      code: 'pair                                           cosine\nhow do I reset my pass / credential recovery   0.3449\nhow do I reset my pass / how do I change my p  0.8768\nhow do I reset my pass / how do I reset my ro  0.5330\nhow do I reset my pass / the weather in Berli  -0.0018',
      caption: "Row 3 \u2014 \u201creset my router\u201d \u2014 outscores row 1, which is the genuinely relevant text." },
    { t: "callout", kind: "insight", title: "The irrelevant one scored higher", body: [
      { t: "p", text: "*\u201cHow do I reset my router\u201d* shares four words with the query and is about a completely different thing. *\u201cCredential recovery signed link\u201d* shares none and is the document that answers it. The embedding scores the first at 0.5330 and the second at 0.3449." },
      { t: "p", text: "That is not a defect in the model \u2014 it is doing what it was trained to do, which is measure semantic similarity of surface meaning. Relevance is a different question: *does this text answer that question*. The two correlate well enough for dense retrieval to work, and the gap between them is exactly what rerankers (6.1, 6.7) and query transformation (7.2) exist to address." }
    ] },
    { t: "p", text: "It is also why the corpus in this phase was built with vocabulary mismatch on purpose. A query phrased the way a user phrases it and a document written the way a technical writer writes it have genuinely low surface similarity, and a system that only works when the user uses the document's vocabulary is a search box with extra steps." },
    { t: "h2", n: "04", id: "asymmetric", text: "Two methods, not one", sub: "And the mistake that produces no error" },
    { t: "p", text: "1.6 noted that `Embeddings` has `embed_documents` and `embed_query` as separate methods. Some widely used models are **asymmetric**: they prepend something like `query:` to a search string and `passage:` to a stored document, because a question and the text that answers it are different kinds of object." },
    { t: "callout", kind: "trap", title: "all-MiniLM is symmetric, which is why this is worth knowing now", body: [
      { t: "p", text: "The model used throughout this course is symmetric, so calling the wrong method changes nothing here. That is precisely why it is worth stating before you swap models \u2014 the bug is invisible in development on a symmetric model and appears as unexplained quality loss after a migration." },
      { t: "p", text: "The guard is one assertion: the query path and the index path must use the matching methods of the same model instance. It rules out a failure that is otherwise only findable by suspecting it." }
    ] },
    { t: "diagram", kind: "steps", title: "Similarity is not relevance",
      caption: "They correlate and they are not the same thing. Against *“how do I reset my password”* an embedding ranks by surface resemblance — which is why a document that merely **talks about** passwords can outscore the one that tells you how to reset yours.",
      items: [
        { label: "the query is embedded", desc: "one vector, ~104 ms — a fixed cost per query (7.9)", tone: "accent", code: "bi-encoder" },
        { label: "cosine against every document", desc: "no cleverness inside it — 6.2 reproduces the ranking by hand", tone: "good", code: "a dot product" },
        { label: "the top k come back", desc: "always k of them, however irrelevant — which is why 7.1 exists", tone: "warn", code: "no “no”" },
        { label: "and the order is by RESEMBLANCE", desc: "so vocabulary mismatch and topical drift both rank high", tone: "crit", code: "the gap" }
      ] },
    { t: "exercise", kind: "analysis", title: "Show that similarity is not relevance",
      difficulty: "core", minutes: 24,
      body: "Encode a query and report the vector's dimension and norm. Compute cosine similarity by hand and confirm it equals the dot product for normalised vectors. Then score four pairs against one query, including a genuinely relevant text with no shared vocabulary and an irrelevant text with high lexical overlap, and report what that shows. Finally, explain the two-method embedding interface and the failure it prevents.",
      requirements: ["Report the embedding dimension and confirm the vectors are unit length",
        "Compute cosine explicitly and compare against the dot product",
        "Explain what forgetting to normalise does and why nothing reports it",
        "Score at least four pairs including a relevant-but-dissimilar and an irrelevant-but-similar case",
        "State which scored higher and what that demonstrates",
        "Explain why Embeddings has separate document and query methods"],
      hint: "The interesting pair is an irrelevant text that shares most of the query's words. Compare it against the relevant text that shares none.",
      solution: { lang: "python", title: "x0504.py \u2014 0.5330 against 0.3449",
        code: 'v = ENC.encode(["how do I reset my password"], normalize_embeddings=True)[0]\nprint("dimensions:", len(v), "norm:", float(np.linalg.norm(v)))\n\ndef cos(x, y):\n    return float(np.dot(x, y) / (np.linalg.norm(x) * np.linalg.norm(y)))\n\npairs = [("how do I reset my password", "credential recovery signed link"),\n         ("how do I reset my password", "how do I change my password"),\n         ("how do I reset my password", "how do I reset my router"),\n         ("how do I reset my password", "the weather in Berlin")]\nfor x, y in pairs:\n    e = ENC.encode([x, y], normalize_embeddings=True)\n    print("%.4f" % float(e[0] @ e[1]), x[:24], "/", y[:24])',
        out: "==============================================================================\nPART 1 -- what an embedding is\n==============================================================================\n  model      : all-MiniLM-L6-v2\n  dimensions : 384\n  normalised : |v| = 1.000000\n  first 6    : [0.007699999958276749, -0.052299998700618744, -0.06239999830722809, -0.03310000151395798, -0.042399998754262924, 0.07840000092983246]\n\n==============================================================================\nPART 2 -- cosine, by hand and by library\n==============================================================================\n  cos(subscription cancel, stop plan renewing) = 0.4545\n  cos(subscription cancel, API rate limit)     = 0.0992\n  dot product, since both are normalised       = 0.4545\n  identical to the cosine: True\n\n  THE NORMALISATION DETAIL: once vectors are unit length, cosine IS\n  the dot product. that is why vector stores use inner product and\n  why forgetting to normalise silently changes your scores -- the\n  search still runs and ranks by magnitude as well as direction.\n\n==============================================================================\nPART 3 -- what the numbers do and do not mean\n==============================================================================\n  pair                                           cosine\n  how do I reset my pass / credential recovery   0.3449\n  how do I reset my pass / how do I change my p  0.8768\n  how do I reset my pass / how do I reset my ro  0.5330\n  how do I reset my pass / the weather in Berli  -0.0018\n\n  note the third: 'reset my router' is lexically closer to the query\n  than 'credential recovery' and should be much less relevant. an\n  embedding measures similarity, not relevance -- they correlate,\n  and they are not the same thing. 6.1 is about the difference.\n\n==============================================================================\nPART 4 -- asymmetric models, and the silent mistake\n==============================================================================\n  the Embeddings interface has TWO methods (1.6):\n    embed_documents(texts) -> many vectors\n    embed_query(text)      -> one vector\n\n  some models prepend 'query:' to one and 'passage:' to the other,\n  because a question and the text answering it are different objects.\n  calling the wrong one gives a correctly shaped vector, a search that\n  runs, and results that are quietly worse. there is no error.\n\n  all-MiniLM-L6-v2 is symmetric, so it does not matter here -- which\n  is exactly why this is worth knowing before you swap the model.",
        notes: [
          { t: "p", text: "**384 dimensions, unit length.** None of the individual numbers means anything; only the geometry between vectors does." },
          { t: "p", text: "**With unit vectors, cosine reduces to the dot product** \u2014 the denominator is 1. That is why vector stores use inner product, and why indexing un-normalised embeddings silently ranks by direction *and magnitude* where you intended direction alone." },
          { t: "p", text: "**That failure produces no error.** The search runs, returns results and ranks them; the quality is just slightly worse, with a quiet bias toward whichever documents produce larger-magnitude vectors." },
          { t: "p", text: "**The uncomfortable result: \u2018how do I reset my router\u2019 scored 0.5330 against the query, and \u2018credential recovery signed link\u2019 \u2014 the language of the document that actually answers it \u2014 scored 0.3449.** The irrelevant text is closer." },
          { t: "p", text: "**That is not a model defect.** It measures semantic similarity of surface meaning, which is what it was trained for. Relevance \u2014 does this text answer that question \u2014 is a different question, and the gap between the two is what rerankers and query transformation exist to close." },
          { t: "p", text: "**`embed_documents` and `embed_query` are separate because some models are asymmetric**, prefixing queries and passages differently. all-MiniLM is symmetric, so the mistake is invisible here \u2014 which is exactly why it is worth knowing before a model swap, when it appears as unexplained quality loss." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: retrieval that got worse after a model upgrade", body: [
      { t: "p", text: "A team upgrades from one embedding model to a newer, better-benchmarked one. They re-index the corpus and retrieval quality drops. The new model scores higher on every public benchmark." },
      { t: "p", text: "Two candidates, and both are from this lesson. The new model may be asymmetric where the old one was symmetric, so a code path that called `embed_documents` for queries was harmless before and is now wrong \u2014 producing correctly shaped vectors and quietly worse results. Or the new model may not normalise by default, so an index built on inner product is now ranking by magnitude as well as direction." },
      { t: "p", text: "Both produce the same symptom, both are invisible, and both are ruled out by one assertion each: that the query and index paths use matching methods of the same instance, and that indexed vectors have unit norm. Benchmarks measure the model; neither of these is a property of the model, which is why a better model can make a worse system." }
    ] }
  ],
  takeaways: [
    "**An embedding is a fixed-length vector** \u2014 384 dimensions here, none individually meaningful.",
    "**With unit vectors, cosine equals the dot product**, which is why stores use inner product.",
    "**Indexing un-normalised vectors ranks by direction and magnitude**, biasing toward larger-magnitude documents.",
    "**And nothing reports it** \u2014 the search runs and the results are quietly worse.",
    "**Similarity is not relevance.** \u201cReset my router\u201d scored 0.5330 against the query; the genuinely relevant text scored 0.3449.",
    "**The irrelevant text was closer**, because it shares four words and the relevant one shares none.",
    "**That is not a model defect** \u2014 it measures surface semantic similarity, which is what it was trained for.",
    "**The gap between similarity and relevance is what rerankers and query transformation exist to close.**",
    "**`Embeddings` has two methods because some models are asymmetric**, prefixing queries and passages differently.",
    "**all-MiniLM is symmetric, so the mistake is invisible here** \u2014 and appears as unexplained loss after a model swap.",
    "**Two assertions rule out both silent failures**: matching methods from one instance, and unit-norm indexed vectors.",
    "**A better-benchmarked model can make a worse system**, because neither failure is a property of the model."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Against \u201chow do I reset my password\u201d, \u201chow do I reset my router\u201d scored 0.5330 and \u201ccredential recovery signed link\u201d scored 0.3449. What does that show?",
      options: ["The embedding model is poorly trained",
        "Similarity and relevance are different things \u2014 the model measures surface semantic similarity, not whether the text answers the question",
        "The query should have been longer",
        "The scores are too close to be meaningful"],
      answer: 1,
      why: "The model is doing exactly what it was trained for: \u201creset my router\u201d shares four words and a sentence shape, so it is genuinely similar. Whether a text *answers* a question is a different judgement, and the two only correlate. That gap is what cross-encoder reranking and query transformation exist to close, and it is why dense retrieval alone has a ceiling." },
    { stem: "Why does forgetting to normalise embeddings produce no error?",
      options: ["LangChain normalises automatically at index time",
        "Inner product still returns a number and still ranks results \u2014 just by direction and magnitude rather than direction alone",
        "Un-normalised vectors are rejected by faiss",
        "The dimension mismatch surfaces at query time"],
      answer: 1,
      why: "Cosine equals the dot product only for unit vectors; with un-normalised ones the inner product still computes, still orders results and still looks healthy. The ranking is now influenced by vector magnitude, which in some models correlates with document length \u2014 so the effect is a quiet bias and slightly worse quality, with nothing anywhere indicating a problem." },
    { stem: "Why does the Embeddings interface have separate document and query methods?",
      options: ["Documents are batched and queries are not",
        "Some models are asymmetric, prefixing a query and a passage differently because they are different kinds of object",
        "Queries require a different vector dimension",
        "It allows caching of document embeddings"],
      answer: 1,
      why: "A question and the text that answers it are not the same kind of object, and several widely used models encode them differently \u2014 typically by prepending a marker. Calling the wrong method yields a correctly shaped vector and a working search with quietly worse results. The model used in this course is symmetric, which is why the bug is invisible in development and appears after a migration." },
    { stem: "A team upgrades to a better-benchmarked embedding model and retrieval gets worse. What are the likely causes?",
      options: ["The new model needs a larger k",
        "An asymmetric model being called with the wrong method, or vectors no longer normalised by default",
        "The index was not rebuilt",
        "The new model has fewer dimensions"],
      answer: 1,
      why: "Both are invisible failures that a benchmark cannot capture, because neither is a property of the model \u2014 they are properties of how it is used. A symmetric-to-asymmetric change makes a previously harmless code path wrong, and a default normalisation change turns an inner-product index into one that ranks by magnitude too. One assertion each rules them out." }
  ] },
  interview: { title: "Interview practice", sub: "Embeddings", questions: [
    { level: "core", q: "What does an embedding actually measure?",
      strong: "A strong answer distinguishes similarity from relevance with a number.",
      answer: [
        { t: "p", text: "Semantic similarity of surface meaning \u2014 which is not the same as relevance, and the gap is bigger than people expect." },
        { t: "p", text: "I measured this. Against the query 'how do I reset my password', the text 'how do I reset my router' scored 0.533, and 'credential recovery signed link' \u2014 which is the language of the document that actually answers the question \u2014 scored 0.345. The irrelevant one is closer, because it shares four words and a sentence shape while the relevant one shares none." },
        { t: "p", text: "That is not a defect. The model is doing what it was trained to do. Relevance is a different question: does this text answer that question. The two correlate well enough that dense retrieval works, and the residual gap is exactly what cross-encoder reranking and query transformation exist to close." },
        { t: "p", text: "It is also why I would be wary of a retrieval system evaluated only on queries phrased in the documents' own vocabulary. A system that works when the user says what the technical writer said is a search box with extra steps." }
      ] },
    { level: "advanced", q: "What silent failures would you guard against in an embedding setup?",
      strong: "A strong answer gives two, with the assertion for each.",
      answer: [
        { t: "p", text: "Two, and both produce correctly shaped vectors, a working search and quietly worse results." },
        { t: "p", text: "The first is normalisation. Cosine equals the dot product only for unit vectors, and vector stores use inner product because it is cheap. Index un-normalised embeddings and the search still runs, still ranks, and is now ranking by direction and magnitude \u2014 which in some models correlates with document length, so you get a quiet bias toward long documents. The assertion is that indexed vectors have unit norm." },
        { t: "p", text: "The second is asymmetry. Some models prepend a marker to queries and a different one to passages, which is why the interface has embed_query and embed_documents as separate methods. Calling the wrong one costs accuracy with no error. The assertion is that the query path and the index path use matching methods of the same model instance." },
        { t: "p", text: "The reason I would put both in as assertions rather than rely on care is that neither is visible in development if your current model happens to be symmetric and normalise by default \u2014 which the common small models do. They appear after a model upgrade, as unexplained quality loss on a model that benchmarks better, which is a very confusing place to start debugging." }
      ] },
    { level: "core", q: "Why does cosine similarity reduce to a dot product in most retrieval code?",
      strong: "A strong answer gives the condition and what breaks without it.",
      answer: [
        { t: "p", text: "Because the vectors are unit length. Cosine is the dot product divided by the product of the two norms, and if both norms are one the denominator vanishes \u2014 so cosine and inner product are literally the same number." },
        { t: "p", text: "That is why vector stores offer an inner-product index and why that is the correct choice for normalised embeddings: you get cosine ordering for the cost of a dot product, which is a single fused multiply-add per dimension." },
        { t: "p", text: "What breaks without the condition is subtle, which is the part worth being careful about. If you index un-normalised vectors against an inner-product index, nothing fails. The search runs, returns results, and ranks them \u2014 by direction and magnitude, where you intended direction alone. In some models magnitude correlates with input length, so the practical effect is a quiet bias toward longer documents and retrieval quality that is slightly and inexplicably worse." },
        { t: "p", text: "There is no error and no warning anywhere, so I would assert it rather than rely on remembering: check that indexed vectors have unit norm at build time. It costs one line and rules out a failure that is otherwise only findable by suspecting it \u2014 typically after a model upgrade changes a default you did not know you depended on." }
      ] }
  ] }
});
