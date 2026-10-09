EC.receiveLesson({
  id: "5.5",
  lede: "A vector store does two jobs, and almost all the attention goes to the wrong one. The index \u2014 exact or approximate, flat or IVF or HNSW \u2014 is a performance decision that does not matter at all below a few hundred thousand vectors. The **metadata filter** is a correctness decision that matters from the first document, and this lesson has the demonstration: against *\u201cwhat are the engineering salary bands\u201d*, the restricted internal document is the **top unfiltered result**. It is there because it is genuinely the most relevant text in the corpus. Relevance and permission are different questions, and only one of them is a retrieval problem.",
  objectives: [
    "Build an exact index and read what it returns",
    "Compare exact against approximate indexes and say what each trades",
    "Explain why an approximate index trades the permanent kind of failure",
    "Demonstrate that relevance and permission are different questions",
    "Say why a metadata filter and a prompt instruction are not substitutes"
  ],
  prerequisites: ["5.4", "1.6"],
  blocks: [
    { t: "h2", n: "01", id: "exact", text: "Exact search first", sub: "Because it is correct and usually enough" },

    { t: "code", lang: "python", title: "An exact index over the corpus",
      code: 'import faiss\n\nindex = faiss.IndexFlatIP(EMB.shape[1])   # inner product; vectors are normalised\nindex.add(EMB)\n\nD, I = index.search(v.reshape(1, -1), 5)',
      out: "  IndexFlatIP over 41 vectors of dim 384\n    1. data-retention     0.4429\n    2. data-deletion      0.4111\n    3. auth-session       0.3701\n    4. ops-backup         0.3654\n    5. data-audit         0.3571",
      caption: "`Flat` means exact \u2014 every vector is compared. Correct, and linear in corpus size." },
    { t: "p", text: "`IndexFlatIP` uses inner product, which equals cosine because 5.4 normalised the vectors. Getting that pairing wrong is the silent failure from the previous lesson: an inner-product index over un-normalised vectors ranks by magnitude as well as direction and never complains." },
    { t: "h2", n: "02", id: "approx", text: "Exact against approximate", sub: "And what the trade actually costs" },
    { t: "table", head: ["Index", "Build", "Query", "Recall against exact"], rows: [
      ["`IndexFlatIP`", "instant", "O(n)", "**1.000 by definition**"],
      ["IVF", "a clustering pass", "O(n/nlist)", "depends on `nprobe`"],
      ["HNSW", "graph build, slow", "O(log n)", "typically 0.95\u20130.99"]
    ] },
    { t: "callout", kind: "tradeoff", title: "An approximate index trades the permanent kind of failure", body: [
      { t: "p", text: "HNSW at 0.97 recall means roughly three queries in a hundred miss a document that exact search would have found. 5.1's asymmetry applies directly: that is a **recall** failure, so nothing downstream can recover it \u2014 the reranker never sees the document, and the model answers from whatever else was returned." },
      { t: "p", text: "It is still often the right trade, because at ten million vectors exact search is not available at any price. The point is to make it knowingly, and to notice that at 41 documents \u2014 or 41,000 \u2014 you are accepting a correctness cost to solve a performance problem you do not have." }
    ] },
    { t: "h2", n: "03", id: "filter", text: "The filter that matters more than the index", sub: "Measured, and the result is a leak" },

    {"kind": "compare", "title": "A vector store does two jobs, and the attention goes to the wrong one", "caption": "The index is a performance decision that does not matter below a few hundred thousand vectors. The metadata filter is a **correctness** decision that matters from the first document — and 7.5 measures what it costs to get the order wrong.", "columns": [{"title": "the index — over-discussed", "tone": "warn", "items": ["exact or approximate; flat, IVF or HNSW", "a latency and memory trade", "irrelevant below a few hundred thousand vectors", "easy to change later: re-index and measure"]}, {"title": "the metadata filter — under-discussed", "tone": "crit", "items": ["which documents this user may see at all", "a correctness and security decision", "matters from the very first document", "must run BEFORE similarity, not after (7.5)"]}], "t": "diagram", "id": "dg-5_5-03-0"},


    { t: "code", lang: "text", title: "One query, with and without a filter",
      code: "the corpus contains 3 restricted documents:\n  int-salary     Internal only. Engineering salary bands for the\n  int-incident   Internal only. Post-incident review for the Apri\n  int-roadmap    Internal only. Unannounced roadmap items for the\n\nquery: 'what are the engineering salary bands'\n  unfiltered search returns : ['int-salary', 'ops-sla', 'data-export']\n  filtered to public        : ['ops-sla', 'data-export', 'auth-mfa']",
      caption: "`int-salary` is the top unfiltered result \u2014 because it is genuinely the best answer." },
    { t: "callout", kind: "insight", title: "Relevance and permission are different questions", body: [
      { t: "p", text: "The restricted document ranks first because retrieval is working perfectly. It *is* the most relevant text in the corpus for that query. There is nothing a better embedding model, a reranker or a tuned index would do about it, because none of them is being asked the right question." },
      { t: "p", text: "A metadata filter answers the permission question **before retrieval runs**, so the document never enters the candidate set. A prompt instruction answers it after the text is already in the context window \u2014 which is 1.6's distinction between a structural guarantee and a polite request, and 7.6 shows what an injection does to the request." }
    ] },
    { t: "p", text: "The filter is also the only place this can live. The embedding knows nothing about permissions; the index knows nothing about who is asking. The metadata captured in 5.2 is the entire mechanism, which is why that lesson insisted on capturing visibility even before anyone had a filter in mind." },
    { t: "exercise", kind: "build", title: "Index, then filter",
      difficulty: "core", minutes: 26,
      body: "Build an exact FAISS index over the corpus embeddings and show what it returns for a query. Tabulate exact against approximate index types with what each trades. Then query for something only a restricted document answers, with and without a metadata filter, and report what the unfiltered search returns.",
      requirements: ["Build an exact index and show the top five results with scores",
        "Explain what 'Flat' means and why inner product is correct here",
        "Compare at least three index types on build cost, query cost and recall",
        "State which kind of failure an approximate index trades, citing 5.1",
        "Run one query with and without a public-only filter",
        "Explain why a prompt instruction is not a substitute for the filter"],
      hint: "Choose a query whose best answer is a restricted document. The result is more pointed than a leak you have to hunt for.",
      solution: { lang: "python", title: "x0505.py \u2014 the restricted document ranks first",
        code: 'import faiss\nindex = faiss.IndexFlatIP(EMB.shape[1])\nindex.add(EMB)\n\nq = "what are the engineering salary bands"\nv = ENC.encode([q], normalize_embeddings=True)[0].reshape(1, -1)\n\n_, I = index.search(v, 3)\nprint("unfiltered :", [ALL_IDS[i] for i in I[0]])\n\n# the filter: restrict the candidate set BEFORE scoring\nok = [i for i, d in enumerate(ALL_DOCS) if d.metadata["public"]]\nsub = faiss.IndexFlatIP(EMB.shape[1])\nsub.add(EMB[ok])\n_, J = sub.search(v, 3)\nprint("filtered   :", [ALL_IDS[ok[j]] for j in J[0]])',
        out: "==============================================================================\nPART 1 -- exact search, built on what 5.4 measured\n==============================================================================\n  IndexFlatIP over 41 vectors of dim 384\n    1. data-retention     0.4429\n    2. data-deletion      0.4111\n    3. auth-session       0.3701\n    4. ops-backup         0.3654\n    5. data-audit         0.3571\n\n  'Flat' means exact: every vector is compared. correct, and linear\n  in corpus size.\n\n==============================================================================\nPART 2 -- exact against approximate\n==============================================================================\n  index            build          query          recall vs exact\n  IndexFlatIP      instant        O(n)           1.000 by definition\n  IVF              clustering pass O(n/nlist)     depends on nprobe\n  HNSW             graph build, slow O(log n)       typically 0.95-0.99\n\n  at 41 documents exact search is obviously right. the crossover is\n  usually in the hundreds of thousands, and the thing to notice is\n  that approximate indexes trade RECALL -- which 5.1 called the\n  permanent kind of failure.\n\n==============================================================================\nPART 3 -- the filter that matters more than the index\n==============================================================================\n  the corpus contains 3 restricted documents:\n    int-salary     Internal only. Engineering salary bands for the \n    int-incident   Internal only. Post-incident review for the Apri\n    int-roadmap    Internal only. Unannounced roadmap items for the\n\n  query: 'what are the engineering salary bands'\n    unfiltered search returns : ['int-salary', 'ops-sla', 'data-export']\n    filtered to public        : ['ops-sla', 'data-export', 'auth-mfa']\n\n  the restricted document is the TOP result unfiltered, because it is\n  genuinely the most relevant. relevance and permission are different\n  questions, and only one of them is a retrieval problem.\n\n  a metadata filter answers the permission question before retrieval\n  runs. an instruction in the prompt answers it after the text is\n  already in the context window (1.6).",
        notes: [
          { t: "p", text: "**`Flat` means exact** \u2014 every vector is compared, so recall against exact search is 1.000 by definition. It is linear in corpus size and perfectly adequate below a few hundred thousand vectors." },
          { t: "p", text: "**Inner product is correct here only because the vectors are normalised** (5.4). An inner-product index over un-normalised vectors ranks by magnitude too, and never complains." },
          { t: "p", text: "**An approximate index trades recall**, which 5.1 identified as the permanent kind of failure \u2014 HNSW at 0.97 means three queries in a hundred miss a document that no downstream component can recover." },
          { t: "p", text: "**That is often the right trade at scale and never the right trade at this scale**, where you would be accepting a correctness cost to solve a performance problem you do not have." },
          { t: "p", text: "**The restricted document is the TOP unfiltered result**, because it is genuinely the most relevant text in the corpus for that query. Retrieval is working perfectly." },
          { t: "p", text: "**So relevance and permission are different questions**, and no embedding model, reranker or index tuning addresses the second one \u2014 none of them is being asked it." },
          { t: "p", text: "**A metadata filter answers it before retrieval runs**; a prompt instruction answers it after the text is in the context window. That is 1.6's guarantee-against-request distinction, and 7.6 shows what an injection does to the request." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the tenant who saw another tenant's data", body: [
      { t: "p", text: "A multi-tenant RAG product filters by `tenant_id`. A customer reports seeing a competitor's document in an answer. The filter is present in the code and correct." },
      { t: "p", text: "The filter was applied to the vector search but not to a second retriever added later for keyword matching \u2014 the hybrid path from module 6. One of two retrievers enforced the boundary and the fusion step combined their outputs faithfully, so the unfiltered candidates flowed straight through." },
      { t: "p", text: "The general shape is that a filter is only a guarantee if **every** path into the candidate set enforces it, and a retrieval pipeline grows paths over time. The structural fix is to apply the filter once, at the point where candidate sets merge, rather than in each retriever \u2014 so adding a retriever cannot create an unfiltered route by omission." }
    ] }
  ],
  takeaways: [
    "**A vector store does two jobs**: indexing, which is performance, and filtering, which is correctness.",
    "**`IndexFlatIP` is exact** \u2014 recall 1.000 by definition, linear in corpus size, fine below a few hundred thousand vectors.",
    "**Inner product equals cosine only because the vectors are normalised**, which is 5.4's silent failure waiting to happen.",
    "**An approximate index trades recall**, which 5.1 called the permanent kind of failure.",
    "**HNSW at 0.97 means three queries in a hundred miss a document nothing downstream can recover.**",
    "**Right at ten million vectors, wrong at forty thousand** \u2014 a correctness cost for a performance problem you do not have.",
    "**The restricted document was the top unfiltered result**, because it is genuinely the most relevant text.",
    "**Relevance and permission are different questions**, and only one of them is a retrieval problem.",
    "**No embedding model, reranker or index tuning fixes the second one** \u2014 none is being asked it.",
    "**A metadata filter acts before retrieval; a prompt instruction acts after the text is in the context.**",
    "**The filter is the only place this can live**, which is why 5.2 insisted on capturing visibility at load time.",
    "**A filter is a guarantee only if every path into the candidate set enforces it** \u2014 so apply it where candidates merge."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "An unfiltered search for \u201cengineering salary bands\u201d returns the restricted internal document first. What does that indicate?",
      options: ["The embedding model is mis-ranking documents",
        "Retrieval is working correctly \u2014 that document genuinely is the most relevant, and permission is a separate question",
        "The restricted document was indexed by mistake",
        "The query needs to be rewritten to avoid sensitive topics"],
      answer: 1,
      why: "The document ranks first precisely because it answers the query better than anything else in the corpus. Nothing about retrieval is broken, and no better model or reranker would change it \u2014 they are all answering 'what is most similar', which is the question that was asked. Permission is a different question, answerable only by a filter over metadata." },
    { stem: "Why is an approximate index a more serious trade than its recall number suggests?",
      options: ["Approximate indexes are slower to build",
        "It trades recall, and a recall failure cannot be recovered by anything downstream",
        "Approximate recall degrades over time as the index grows",
        "It makes scores incomparable between queries"],
      answer: 1,
      why: "HNSW at 0.97 recall means a few queries in a hundred never retrieve a document exact search would have found. Per 5.1, that document is then absent from the candidate set, so the reranker cannot promote it and the prompt cannot cite it \u2014 the loss is permanent. It is frequently still the right trade at scale; the point is that it costs correctness, not just approximation." },
    { stem: "Why is a prompt instruction not a substitute for a metadata filter?",
      options: ["Models ignore instructions about data access",
        "The filter acts before retrieval so the text never enters the context; an instruction acts after it is already there",
        "Instructions cannot reference metadata fields",
        "Filters are faster"],
      answer: 1,
      why: "Once restricted text is in the context window, every mechanism that could keep it out of the answer is a request to the model rather than a property of the system \u2014 and 7.6 shows an injection in a neighbouring document defeating exactly that. A filter removes the document from the candidate set, which is a structural guarantee: the model cannot reveal what it never received." },
    { stem: "A multi-tenant system has a correct tenant filter and still leaks. What is the likely cause?",
      options: ["The filter was applied after reranking",
        "A second retriever was added later without the filter, and fusion combined its unfiltered candidates faithfully",
        "The vector store caches results across tenants",
        "The embedding leaked tenant information"],
      answer: 1,
      why: "A filter is only a guarantee when every path into the candidate set enforces it, and retrieval pipelines accumulate paths \u2014 a keyword retriever, a hybrid branch, a cache. Enforcing it per retriever means each new one is an opportunity for omission. Applying it once where candidate sets merge makes an unfiltered route impossible to create by forgetting." }
  ] },
  interview: { title: "Interview practice", sub: "Vector stores", questions: [
    { level: "core", q: "How would you choose a vector index?",
      strong: "A strong answer starts exact and redirects to the filter.",
      answer: [
        { t: "p", text: "I would start exact and probably stay there. A flat index compares every vector, so its recall against exact search is 1.0 by definition, and it is linear in corpus size \u2014 which is entirely fine below a few hundred thousand vectors." },
        { t: "p", text: "The reason I am reluctant to reach for approximate earlier is what it trades. HNSW at 0.97 recall means around three queries in a hundred never retrieve a document exact search would have found, and that is a recall failure \u2014 the permanent kind. The reranker never sees the document and the model answers from whatever else came back. At ten million vectors that is a trade you have to make. At forty thousand you would be paying correctness to fix a performance problem you do not have." },
        { t: "p", text: "But honestly I think the index gets more attention than it deserves, and the filter gets less. The index is a performance decision that is irrelevant at most real corpus sizes; the metadata filter is a correctness decision that matters from the first document." },
        { t: "p", text: "I measured a case that makes the point: querying a corpus for engineering salary bands, the restricted internal document was the top result. Not a mis-ranking \u2014 it is genuinely the most relevant text there. Relevance and permission are different questions, and only one of them is a retrieval problem." }
      ] },
    { level: "advanced", q: "Where do you enforce document-level access control in a RAG system?",
      strong: "A strong answer puts it before retrieval and at the merge point.",
      answer: [
        { t: "p", text: "In the retrieval filter, before scoring, so the document never enters the candidate set. Not in the prompt." },
        { t: "p", text: "The distinction is between a structural guarantee and a request. If restricted text is in the context window, the only thing stopping it reaching the user is the model choosing to comply with an instruction \u2014 which is defeatable by an injection in a neighbouring document, and which you cannot audit. If the document was never retrieved, the model cannot reveal what it never received." },
        { t: "p", text: "That also means the metadata has to exist, which is a load-time decision. You cannot infer from a retrieved paragraph whether it was public, so visibility has to be captured during ingestion even before anyone has designed a filter." },
        { t: "p", text: "The failure mode I would specifically design against is a filter that is correct but incomplete. A pipeline grows retrievers \u2014 a keyword branch, a hybrid path, a cache \u2014 and enforcing the filter in each one means every addition is a chance to omit it. I have seen that exact leak: tenant filtering on the vector path, nothing on a keyword retriever added later, and fusion faithfully combining the two. So I apply it once at the point where candidate sets merge, where you cannot create an unfiltered route by forgetting." }
      ] },
    { level: "core", q: "When would you move from an exact index to an approximate one?",
      strong: "A strong answer names a scale and what is being bought and sold.",
      answer: [
        { t: "p", text: "When exact search stops fitting the latency budget, which in practice is somewhere in the hundreds of thousands to millions of vectors \u2014 and not before, because the trade is not free." },
        { t: "p", text: "Exact search is linear in corpus size and has recall 1.0 against itself by definition. An approximate index buys you logarithmic or sublinear query time and pays for it in recall: HNSW typically lands at 0.95 to 0.99, meaning somewhere between one and five queries in a hundred never retrieve a document exact search would have found." },
        { t: "p", text: "The reason I treat that as more serious than the number sounds is that recall is the failure nothing downstream recovers. The reranker never sees the missing document and the model answers from whatever else came back \u2014 confidently, because nothing signals the gap. So I am trading a permanent correctness failure for latency." },
        { t: "p", text: "At ten million vectors that is a trade you simply have to make, and it is the right one. At forty thousand it is paying correctness to solve a performance problem you do not have, which is the version of this decision I see made most often \u2014 usually because the approximate index is what the tutorial used." }
      ] }
  ] }
});
