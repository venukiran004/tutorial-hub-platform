EC.receiveLesson({
  id: "5.6",
  lede: "A retriever is one method \u2014 query in, `List[Document]` out \u2014 and that narrowness is the point. Because it is a `Runnable`, it composes with everything from module 2, which is what lets 5.7 write a whole RAG pipeline as one expression instead of a function calling things in order. The design question this lesson settles is which knobs belong on the **retriever** and which on the **store**, and there is a clean rule: anything that can differ between two concurrent queries belongs on the retriever; anything that would require rebuilding the index belongs on the store.",
  objectives: [
    "State the retriever interface and what it abstracts",
    "Show that a retriever is a Runnable and compose it",
    "Separate per-query configuration from index-level configuration",
    "Apply the rule that decides which is which",
    "Explain why this makes a one-expression RAG pipeline possible"
  ],
  prerequisites: ["5.5", "2.2"],
  blocks: [
    { t: "h2", n: "01", id: "interface", text: "One method", sub: "Query in, documents out" },
    { t: "code", lang: "python", title: "The whole interface",
      code: 'r = store.as_retriever(search_kwargs={"k": 3})\ndocs = r.invoke("how do I stop duplicate charges")',
      out: "  invoke() ->\n    api-idempotency    Supply an Idempotency-Key header on write requ\n    auth-signin-fail   Authentication failures. Repeated invalid cred\n    data-deletion      Erasure requests complete within 30 days in pr",
      caption: "A string goes in; documents come out. Nothing about vectors appears in the signature." },
    { t: "p", text: "That signature is what makes a retriever substitutable. A BM25 retriever (6.3), a hybrid retriever (6.5), a reranking retriever (6.7) and a web search all satisfy it, so the pipeline that consumes them does not change when you swap one for another \u2014 which is the whole reason module 6 can iterate on retrieval without touching module 7's generation code." },
    { t: "h2", n: "02", id: "runnable", text: "And it is a Runnable", sub: "So it composes" },
    { t: "code", lang: "python", title: "A retriever in a pipe",
      code: 'def format_docs(docs):\n    return "\\n\\n".join("[%s] %s" % (d.metadata["id"], d.page_content) for d in docs)\n\n(r | format_docs).invoke("what happens if I exceed the rate limit")',
      out: "  has invoke/batch/stream: True\n\n  r | format_docs ->\n    [api-limits] Throughput is capped at 600 requests per minute per key. Exceeding the cap returns HTTP 429 together with a",
      caption: "`invoke`, `batch` and `stream` all present \u2014 so a retriever is a pipeline step like any other." },
    { t: "callout", kind: "insight", title: "This is why 5.7 is one expression", body: [
      { t: "p", text: "Because the retriever is a `Runnable` and 2.2's dict literal becomes a `RunnableParallel`, a RAG pipeline can be written as `{\"context\": retriever | format_docs, \"question\": RunnablePassthrough()} | prompt | model | parser` \u2014 one expression, with the retrieval and the question travelling in parallel." },
      { t: "p", text: "The alternative is a function that calls the retriever, formats the result, builds a prompt and calls the model. It works identically and loses what module 2 built: streaming, batching, per-step configuration and a trace that names each stage. The composability is not an aesthetic preference." }
    ] },
    { t: "h2", n: "03", id: "where", text: "Retriever or store?", sub: "And the rule that decides" },
    { t: "table", head: ["Setting", "Belongs to", "Why"], rows: [
      ["`k`", "retriever", "a per-query decision \u2014 5.1's `fetch_k` against `k`"],
      ["a metadata filter", "retriever", "it varies by caller (5.5)"],
      ["the index type", "store", "a property of the data at rest"],
      ["the embedding model", "store", "changing it means reindexing everything"],
      ["a score threshold", "retriever", "7.1 makes it a guard"]
    ] },
    { t: "callout", kind: "mental", title: "The rule", body: [
      { t: "p", text: "**Anything that can differ between two concurrent queries belongs on the retriever. Anything that would require rebuilding the index belongs on the store.**" },
      { t: "p", text: "Two users searching at the same moment need different filters and may want different values of `k`; neither can want a different embedding model, because the vectors are already written. That is the same separation 2.9 drew between configuration and construction, arriving from a different direction." }
    ] },
    { t: "p", text: "The practical consequence is that a per-request filter must be a retriever-level argument, not a store-level one. A store built per request to carry a tenant filter rebuilds or re-wraps the index on every call, which is the structural mistake behind a surprising number of slow RAG systems." },
    { t: "exercise", kind: "build", title: "Compose a retriever",
      difficulty: "core", minutes: 22,
      body: "Build a retriever from a vector store and call it. Confirm it is a Runnable by checking for the standard methods, then compose it with a formatting function in a pipe and show the result. Finally, classify five configuration settings as retriever-level or store-level and state the rule that decides.",
      requirements: ["Call invoke() and show the returned documents",
        "Explain what the signature abstracts and why that enables substitution",
        "Confirm invoke, batch and stream are all present",
        "Compose the retriever with a formatter and show the piped output",
        "Classify at least five settings as retriever-level or store-level",
        "State the rule in one sentence"],
      hint: "Ask of each setting: could two simultaneous queries need different values? That answers it.",
      solution: { lang: "python", title: "x0506.py \u2014 one method, and it composes",
        code: 'r = store.as_retriever(search_kwargs={"k": 3})\nfor d in r.invoke("how do I stop duplicate charges"):\n    print("   ", d.metadata["id"], d.page_content[:48])\n\nprint("has invoke/batch/stream:",\n      all(hasattr(r, m) for m in ("invoke", "batch", "stream")))\n\ndef format_docs(docs):\n    return "\\n\\n".join("[%s] %s" % (d.metadata["id"], d.page_content) for d in docs)\n\nprint((r | format_docs).invoke("what happens if I exceed the rate limit")[:110])',
        out: "==============================================================================\nPART 1 -- the retriever interface\n==============================================================================\n  invoke() ->\n    api-idempotency    Supply an Idempotency-Key header on write requ\n    auth-signin-fail   Authentication failures. Repeated invalid cred\n    data-deletion      Erasure requests complete within 30 days in pr\n\n  one method. query in, List[Document] out.\n\n==============================================================================\nPART 2 -- and it is a Runnable, so it composes\n==============================================================================\n  has invoke/batch/stream: True\n\n  r | format_docs ->\n    [api-limits] Throughput is capped at 600 requests per minute per key. Exceeding the cap returns HTTP 429 together with a\n\n  that composability is the whole reason 5.7 can write a RAG pipeline\n  as one expression rather than as a function calling things in order.\n\n==============================================================================\nPART 3 -- what belongs on the retriever and what belongs on the store\n==============================================================================\n  k                    retriever -- it is a per-query decision\n  a metadata filter    retriever -- it varies by caller (5.5)\n  the index type       store -- a property of the data at rest\n  the embedding model  store -- changing it means reindexing\n  score threshold      retriever -- 7.1 makes it a guard\n\n  the rule: anything that can differ between two concurrent queries\n  belongs on the retriever. anything that would require rebuilding\n  the index belongs on the store. (2.9's config rule, again.)",
        notes: [
          { t: "p", text: "**One method: query in, `List[Document]` out.** Nothing about vectors, indexes or embeddings appears in the signature." },
          { t: "p", text: "**Which is what makes retrievers substitutable.** BM25, hybrid, reranking and web search all satisfy it, so module 6 can iterate on retrieval without touching module 7's generation code." },
          { t: "p", text: "**`invoke`, `batch` and `stream` are all present**, so a retriever is a pipeline step like any other \u2014 and composes with a formatter in a single pipe." },
          { t: "p", text: "**That is why 5.7 can write a RAG pipeline as one expression** rather than a function calling things in order. The hand-written version works identically and loses streaming, batching, per-step configuration and a named trace." },
          { t: "p", text: "**The rule: anything that can differ between two concurrent queries belongs on the retriever; anything that would require rebuilding the index belongs on the store.**" },
          { t: "p", text: "**So `k`, filters and score thresholds are retriever-level; the index type and embedding model are store-level.** Two users searching simultaneously need different filters and cannot need different embedding models." },
          { t: "p", text: "**The practical consequence is that a per-request filter is a retriever argument.** Building a store per request to carry a tenant filter re-wraps the index on every call \u2014 a structural mistake behind many slow RAG systems." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the RAG system that got slower with every tenant", body: [
      { t: "p", text: "A team adds per-tenant filtering by constructing a vector store inside the request handler with the tenant's documents. Correct, and latency grows with the number of tenants onboarded. Profiling shows most of the request in store construction." },
      { t: "p", text: "The filter was expressed at the wrong level. Tenant scoping is exactly the thing that differs between two concurrent queries, so it belongs in `search_kwargs` on the retriever, over one store built once at startup. Expressed there, the index is shared and the filter is a per-call argument." },
      { t: "p", text: "The diagnostic that generalises is to ask what is being constructed per request. A store, an index or an embedding model appearing inside a request handler is almost always a setting that was put at construction level when it belonged at configuration level \u2014 2.9's distinction, with a latency bill attached." }
    ] }
  ],
  takeaways: [
    "**A retriever is one method**: query in, `List[Document]` out.",
    "**Nothing about vectors appears in the signature**, which is what makes retrievers substitutable.",
    "**BM25, hybrid, reranking and web search all satisfy it**, so module 6 iterates without touching generation code.",
    "**A retriever is a `Runnable`** \u2014 `invoke`, `batch` and `stream` are all present.",
    "**So it composes in a pipe**, which is why 5.7's RAG pipeline is one expression.",
    "**The hand-written alternative works and loses streaming, batching, per-step config and a named trace.**",
    "**The rule: what can differ between two concurrent queries belongs on the retriever.**",
    "**What would require rebuilding the index belongs on the store.**",
    "**`k`, metadata filters and score thresholds are retriever-level.**",
    "**The index type and the embedding model are store-level**, because the vectors are already written.",
    "**So a per-request filter is a retriever argument**, not a store built per request.",
    "**Anything constructed inside a request handler is usually a setting at the wrong level** \u2014 2.9, with a latency bill."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What does the retriever interface abstract away, and what does that buy?",
      options: ["Document formatting, so prompts stay simple",
        "Everything about how retrieval happens \u2014 so BM25, hybrid and reranking retrievers are substitutable without changing the pipeline",
        "Embedding caching, so repeated queries are fast",
        "Metadata filtering, which moves to the store"],
      answer: 1,
      why: "The signature is a string in and a list of documents out, mentioning no vectors, indexes or scores. That means a keyword retriever, a fused hybrid retriever, a reranking wrapper and a web search all satisfy the same contract, so the generation half of the pipeline is untouched while the retrieval half is rebuilt \u2014 which is exactly how modules 6 and 7 are separable." },
    { stem: "Which rule decides whether a setting belongs on the retriever or the store?",
      options: ["Mutable settings on the retriever, immutable ones on the store",
        "Anything that can differ between two concurrent queries belongs on the retriever; anything requiring an index rebuild belongs on the store",
        "Performance settings on the store, correctness settings on the retriever",
        "Anything the user controls on the retriever"],
      answer: 1,
      why: "Two users searching at the same instant may need different filters and different values of k, so those are per-query and belong on the retriever. Neither can need a different embedding model, because the vectors are already written \u2014 changing it means re-embedding the corpus. That is 2.9's configuration-against-construction distinction reached from the retrieval side." },
    { stem: "A team implements per-tenant filtering by building a vector store inside the request handler. What is wrong?",
      options: ["Vector stores are not thread-safe",
        "Tenant scoping differs between concurrent queries, so it is a retriever argument over one shared store \u2014 building a store per request re-wraps the index every call",
        "The filter should be applied after retrieval instead",
        "Nothing \u2014 this is the correct pattern for isolation"],
      answer: 1,
      why: "The filter was expressed at construction level when it is a per-call configuration value. Passed in search_kwargs against a single store built at startup, the index is shared and the filter costs nothing; constructed per request, the store build appears in every request's latency and grows with the corpus. Anything constructed inside a request handler is worth questioning for exactly this reason." },
    { stem: "Why does writing a RAG pipeline as a plain function rather than an LCEL expression cost something?",
      options: ["Functions cannot call retrievers",
        "It loses streaming, batching, per-step configuration and a trace that names each stage",
        "It prevents metadata filtering",
        "LCEL expressions are faster at runtime"],
      answer: 1,
      why: "The function produces identical output, so the loss is invisible in a test. What disappears is everything module 2's protocol provided for free: token streaming to the user, batched execution across inputs, configurable fields per step, and an execution trace where each stage is individually named and timed. Those become things you would have to build rather than things you have." }
  ] },
  interview: { title: "Interview practice", sub: "The retriever abstraction", questions: [
    { level: "core", q: "Why is the retriever interface as narrow as it is?",
      strong: "A strong answer connects narrowness to substitutability.",
      answer: [
        { t: "p", text: "Because the narrowness is what makes retrievers interchangeable. The signature is a string in, a list of documents out \u2014 nothing about vectors, indexes, scores or embedding models." },
        { t: "p", text: "So a dense retriever, a BM25 keyword retriever, a hybrid retriever that fuses both, a reranking wrapper and a web search all satisfy the same contract. The code that consumes retrieval does not change when you swap one for another, which means you can rebuild the retrieval half of a system without touching the generation half." },
        { t: "p", text: "The second thing it buys is composition. A retriever is a Runnable \u2014 it has invoke, batch and stream \u2014 so it is a pipeline step like any other and goes straight into a pipe with a formatter." },
        { t: "p", text: "That is what lets a whole RAG pipeline be one expression: a parallel dict putting the retriever on one branch and the question on a passthrough, then prompt, model, parser. You can write the same thing as a function calling four things in order and it produces identical output \u2014 what you lose is streaming, batching, per-step configuration and a trace that names each stage. Which is invisible until you need to debug it." }
      ] },
    { level: "advanced", q: "How do you decide whether a retrieval setting is retriever-level or store-level?",
      strong: "A strong answer gives the concurrency test and a failure it prevents.",
      answer: [
        { t: "p", text: "I ask one question: could two queries running at the same instant need different values? If yes it belongs on the retriever; if changing it would mean rebuilding the index it belongs on the store." },
        { t: "p", text: "So k is retriever-level, metadata filters are retriever-level, score thresholds are retriever-level. The index type and the embedding model are store-level, because the vectors are already written \u2014 nobody can want a different embedding model for their particular query without re-embedding the corpus." },
        { t: "p", text: "It is the same separation between configuration and construction that LCEL draws, just arriving from the retrieval side, and getting it wrong has a specific and common symptom." },
        { t: "p", text: "The case I would watch for is per-tenant filtering implemented by building a vector store inside the request handler. It is correct, and it puts store construction into every request's latency, growing with the corpus and the tenant count. Tenant scoping is precisely the thing that differs between concurrent queries, so it belongs in search_kwargs over one store built at startup. More generally: anything being constructed inside a request handler is usually a setting that landed at the wrong level." }
      ] },
    { level: "core", q: "What would make you write a custom retriever rather than configure an existing one?",
      strong: "A strong answer stays inside the interface and names concrete cases.",
      answer: [
        { t: "p", text: "When the logic I need is not a parameter of a search \u2014 when deciding what to retrieve requires more than one call, or a decision between sources." },
        { t: "p", text: "The concrete cases I would reach for it are: fusing two retrievers whose scores are on incomparable scales, so the combination has to happen at the rank level; routing a query to a different source depending on what kind of question it is; and wrapping a retriever with a reranking pass, where you fetch twenty and return five. All three are logic above a single search call, which is exactly what a parameter cannot express." },
        { t: "p", text: "What makes this cheap is that the interface is one method \u2014 a string in, a list of documents out. So a custom retriever is substitutable with a built-in one, and nothing consuming it changes. That is the whole reason you can rebuild the retrieval half of a system without touching generation." },
        { t: "p", text: "What I would not write a custom retriever for is anything that is really a per-query setting: k, a metadata filter, a score threshold. Those are configuration, and putting them into a custom class usually ends up constructing something per request \u2014 which is how you get a system whose latency grows with the corpus for no reason anyone can find." }
      ] }
  ] }
});
