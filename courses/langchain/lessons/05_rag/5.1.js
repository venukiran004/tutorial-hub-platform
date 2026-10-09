EC.receiveLesson({
  id: "5.1",
  lede: "Every retrieval decision in the next three modules is an instance of one idea: **cast wide cheaply, then narrow expensively**. The order is not a preference. A document that stage one did not return cannot be recovered by stage two \u2014 precision can only reorder what recall handed it \u2014 so **a recall failure is permanent and a precision failure is recoverable**. That asymmetry is why you fetch twenty candidates to show five, why a reranker exists at all, and why the expensive model is never allowed to see the whole corpus.",
  objectives: [
    "State the two stages and why their order is fixed",
    "Explain why a recall failure is permanent",
    "Read a recall-against-k curve and say where it stops improving",
    "Justify fetching more candidates than you intend to show",
    "Name the cost ratio that forces the design"
  ],
  prerequisites: ["1.6"],
  blocks: [
    { t: "h2", n: "01", id: "two", text: "Two stages", sub: "And the order is forced" },

    {"kind": "flow", "title": "Cast wide cheaply, then narrow expensively", "cols": 4, "caption": "The order is not a preference. **Precision can only remove**, so a document stage one did not return cannot be recovered by stage two — which makes recall at the first stage the ceiling on everything after it.", "nodes": [{"id": "a", "label": "the corpus", "sub": "41 documents", "tone": "accent"}, {"id": "b", "label": "cast wide", "sub": "fetch 20 — cheap, high recall", "tone": "good"}, {"id": "c", "label": "narrow", "sub": "rerank — expensive, high precision", "tone": "warn"}, {"id": "d", "label": "the context", "sub": "top 5 — what the model sees", "tone": "violet"}], "edges": [["a", "b", "recall"], ["b", "c", "precision"], ["c", "d"]], "t": "diagram", "id": "dg-5_1-01-0"},




    { t: "table", head: ["Stage", "Goal", "Cost"], rows: [
      ["recall", "cast wide; miss nothing you need", "cheap, over everything"],
      ["precision", "narrow and order what you kept", "expensive, over few"]
    ] },
    { t: "callout", kind: "insight", title: "A recall failure is permanent", body: [
      { t: "p", text: "Stage two can only reorder the candidates stage one produced. If the document that answers the question is not in the candidate set, no reranker, no cross-encoder and no amount of prompt engineering recovers it \u2014 the information is simply absent." },
      { t: "p", text: "A precision failure is different: the right document is present and badly ranked, which is a problem you can fix later in the pipeline. That asymmetry is the single most useful thing to hold on to across modules 6 and 7, because it tells you which failures to care about most." }
    ] },
    { t: "h2", n: "02", id: "curve", text: "Recall against k", sub: "Measured on the course corpus" },
    { t: "code", lang: "text", title: "Fetching more candidates",
      code: 'fetch k    recall@k     can rerank to\n1          0.571        top-1 of 1      <- no room to rerank at all\n3          0.929        top-3 of 3\n5          1.000        top-5 of 5\n10         1.000        top-5 of 10\n20         1.000        top-5 of 20\n41         1.000        top-5 of 41     <- the whole corpus',
      caption: "Recall rises with k and then stops. Everything after that point is candidates for stage two." },
    { t: "p", text: "At k=1 there is nothing to rerank, so stage one's ordering is the final answer and any mistake it makes is the system's mistake. By k=5 recall is complete on this corpus, and k=10 or k=20 adds no recall \u2014 it adds **room for stage two to work**, which is a different and equally real benefit." },
    { t: "callout", kind: "mental", title: "Mental model: fetch_k and k are different numbers", body: [
      { t: "p", text: "The number you fetch and the number you show are separate decisions, and conflating them is the most common structural mistake in a retrieval pipeline. Fetching five to show five means your reranker has nothing to do; fetching twenty to show five is what makes it worth having." },
      { t: "p", text: "6.6's `fetch_k` and 6.7's candidate count are both this parameter under different names, which is why it is worth naming once here." }
    ] },
    { t: "h2", n: "03", id: "cost", text: "The cost ratio", sub: "Which is what forces the split" },
    { t: "p", text: "Dense retrieval over the whole corpus took a few milliseconds per query. A cross-encoder scores a **query-document pair** rather than embedding documents once, so it costs roughly a hundred times more per document scored \u2014 6.1 measures it." },
    { t: "p", text: "That ratio is the entire argument. You cannot afford the expensive model over every document, and you cannot trust the cheap model's ordering. So: cheap over everything to build a candidate set, expensive over the candidates to order them." },
    { t: "exercise", kind: "analysis", title: "Measure the recall curve",
      difficulty: "core", minutes: 22,
      body: "Run dense retrieval over the corpus at several values of k and record recall at each. Identify where recall stops improving and explain what the extra candidates are for beyond that point. Then time stage one per query and state why the two-stage design is forced.",
      requirements: ["Report recall at k of 1, 3, 5, 10, 20 and the full corpus size",
        "Identify the k at which recall stops improving",
        "Explain what fetching beyond that k buys",
        "State why k=1 is a special case",
        "Time dense retrieval per query",
        "State the asymmetry between a recall failure and a precision failure"],
      hint: "The interesting row is k=1, where there is nothing to rerank. Ask what that means for the quality of the answer.",
      solution: { lang: "python", title: "x0501.py \u2014 recall rises, then stops",
        code: 'from corpus import PUBLIC_DOCS, QUERIES, evaluate\nfrom sentence_transformers import SentenceTransformer\nimport numpy as np\n\nENC = SentenceTransformer("all-MiniLM-L6-v2")\nIDS = [d.metadata["id"] for d in PUBLIC_DOCS]\nEMB = ENC.encode([d.page_content for d in PUBLIC_DOCS], normalize_embeddings=True)\n\ndef dense(q, k=5):\n    v = ENC.encode([q], normalize_embeddings=True)[0]\n    return [IDS[i] for i in np.argsort(-(EMB @ v))[:k]]\n\nfor k in (1, 3, 5, 10, 20, 41):\n    _, (r, p, m, n) = evaluate(lambda q, kk=k: dense(q, kk), QUERIES, k=k)\n    print(k, round(r, 3))',
        out: "==============================================================================\nPART 1 -- the two stages, and why the order is fixed\n==============================================================================\n  stage 1, RECALL:    cast wide, cheaply.  miss nothing you need.\n  stage 2, PRECISION: narrow, expensively. order what you kept.\n\n  the order is not a preference. a document stage 1 did not return\n  cannot be recovered by stage 2 -- precision can only reorder what\n  recall handed it. so a recall failure is PERMANENT and a precision\n  failure is RECOVERABLE.\n\n==============================================================================\nPART 2 -- what that asymmetry costs, measured\n==============================================================================\n  retrieving k documents and keeping the top n after reranking:\n\n  fetch k    recall@k     can rerank to  note\n  1          0.893        top-1 of 1     <- no room to rerank at all\n  3          1.000        top-3 of 3     \n  5          1.000        top-5 of 5     \n  10         1.000        top-5 of 10    \n  20         1.000        top-5 of 20    \n  41         1.000        top-5 of 41    <- the whole corpus\n\n  recall rises with k and then stops improving, because the relevant\n  document was already in. everything after that point is candidates\n  for stage 2 to sort -- which is the whole design.\n\n==============================================================================\nPART 3 -- the cost of each stage\n==============================================================================\n  stage 1 (dense over 41 docs): 91.4 ms per query\n  stage 2 (cross-encoder)     : 6.1 covers it -- roughly 100x more\n                                per document scored\n\n  that ratio is why the stages exist. you cannot afford to score every\n  document with the expensive model, and you cannot afford to trust the\n  cheap one's ordering. so: cheap over everything, expensive over few.",
        notes: [
          { t: "p", text: "**Recall rises with k and then stops.** On this corpus it is complete by k=5, so k=10 and k=20 add no recall at all \u2014 what they add is room for stage two to reorder, which is a different benefit and a real one." },
          { t: "p", text: "**At k=1 there is nothing to rerank**, so stage one's ordering *is* the answer and any mistake it makes is the system's mistake. That is the degenerate case the two-stage design exists to avoid." },
          { t: "p", text: "**`fetch_k` and `k` are different numbers**, and conflating them is the commonest structural mistake in a retrieval pipeline \u2014 fetching five to show five leaves the reranker with nothing to do." },
          { t: "p", text: "**A recall failure is permanent and a precision failure is recoverable.** Stage two can only reorder what stage one returned, so a document that was never fetched cannot be recovered by any downstream component." },
          { t: "p", text: "**The cost ratio forces the split**: a cross-encoder scores query-document pairs rather than embedding documents once, so it is roughly a hundred times more expensive per document. Cheap over everything, expensive over few." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the reranker that changed nothing", body: [
      { t: "p", text: "A team adds a cross-encoder reranker to improve answer quality. Latency rises, cost rises, and the measured retrieval metrics are unchanged to three decimal places." },
      { t: "p", text: "The retriever was configured with `k=5` and the reranker reorders the top 5 to produce 5. It is sorting a list and then returning all of it, so the set handed to the model is identical and only the order within it changed \u2014 which affects nothing if the prompt concatenates all five anyway." },
      { t: "p", text: "The fix is to separate the two numbers: fetch twenty, rerank, keep five. The general check is that a reranker only has value when `fetch_k > k`, and the gap between them is the amount of work it is allowed to do. That is a one-line configuration change that turns a pure cost increase into the thing it was bought for." }
    ] }
  ],
  takeaways: [
    "**Two stages: cast wide cheaply, then narrow expensively.**",
    "**A recall failure is permanent** \u2014 stage two can only reorder what stage one returned.",
    "**A precision failure is recoverable**, because the right document is present and merely misranked.",
    "**Recall rises with k and then stops** \u2014 complete by k=5 on this corpus.",
    "**Fetching beyond that k adds no recall and adds room for stage two to work.**",
    "**At k=1 there is nothing to rerank**, so stage one's ordering is the final answer.",
    "**`fetch_k` and `k` are different numbers**, and conflating them is the commonest structural mistake.",
    "**A reranker only has value when `fetch_k > k`**, and the gap is the work it is allowed to do.",
    "**A cross-encoder costs roughly 100x more per document** than an embedding lookup.",
    "**Which is the whole argument for the split**: cheap over everything, expensive over few."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is a recall failure worse than a precision failure?",
      options: ["Recall is harder to measure",
        "Stage two can only reorder what stage one returned, so a document never fetched cannot be recovered",
        "Recall failures are more common",
        "Precision failures are caught by the model's own judgement"],
      answer: 1,
      why: "Reranking, diversity selection and prompt engineering all operate on the candidate set, so a document that is absent from it is absent from the answer \u2014 permanently. A misranked document is still present and can be reordered later in the pipeline. That asymmetry is what tells you which failures to prioritise across the whole of modules 6 and 7." },
    { stem: "Recall is complete at k=5. What does fetching k=20 buy?",
      options: ["Nothing \u2014 it is wasted work",
        "Room for stage two to reorder, which is a different benefit from recall",
        "Higher recall on queries not in the test set",
        "Lower latency, because the index is warmed"],
      answer: 1,
      why: "Recall measures whether the relevant document is in the set, and that is already satisfied. The extra fifteen candidates give a reranker something to work with \u2014 without them it is sorting a list and returning all of it. That is why fetch_k and k are separate decisions, and why setting them equal makes a reranker a pure cost." },
    { stem: "A team adds a reranker with k=5 and sees no metric change. Why?",
      options: ["The reranker model is too small",
        "fetch_k equals k, so it reorders five and returns five \u2014 the set handed to the model is unchanged",
        "Rerankers only help on queries with multiple relevant documents",
        "The retrieval metrics do not capture reranking benefits"],
      answer: 1,
      why: "With fetch_k = k the reranker sorts the candidate list and then returns all of it, so the set is identical and only the internal order differs \u2014 which affects nothing if the prompt concatenates every chunk anyway. Fetching twenty to keep five gives the reranker fifteen documents' worth of work to do, and that gap is where its value lives." },
    { stem: "What forces the two-stage design rather than scoring everything with the best model?",
      options: ["Vector stores do not expose cross-encoder scoring",
        "A cross-encoder scores query-document pairs, costing roughly 100x more per document than an embedding lookup",
        "Cross-encoders cannot be batched",
        "Embedding models are more accurate on long documents"],
      answer: 1,
      why: "An embedding is computed once per document and reused for every query; a cross-encoder must run per query-document pair, so its cost scales with corpus size times query volume. That makes it unaffordable over a whole corpus and affordable over twenty candidates \u2014 which is exactly the shape the two stages encode." }
  ] },
  interview: { title: "Interview practice", sub: "The retrieval mental model", questions: [
    { level: "core", q: "How do you think about designing a retrieval pipeline?",
      strong: "A strong answer is two stages and the asymmetry between them.",
      answer: [
        { t: "p", text: "Two stages: cast wide cheaply, then narrow expensively. Stage one's job is to miss nothing you need; stage two's job is to order what stage one kept." },
        { t: "p", text: "The property that organises everything else is that those two failures are not symmetric. Stage two can only reorder the candidates stage one produced, so a document that was never retrieved cannot be recovered by a reranker, by diversity selection or by anything in the prompt. A recall failure is permanent; a precision failure is recoverable." },
        { t: "p", text: "So when I am tuning, I treat recall as the thing to protect and precision as the thing to improve. If recall is incomplete, nothing downstream matters yet." },
        { t: "p", text: "The practical form of that is keeping fetch_k and k as separate numbers. I measured recall on a small corpus reaching 1.0 by k equals five \u2014 so fetching twenty adds no recall at all, and what it adds is fifteen documents' worth of work for the reranker. Setting them equal is the commonest structural mistake, and it turns a reranker into a pure cost increase." }
      ] },
    { level: "advanced", q: "Why not score every document with the best available model?",
      strong: "A strong answer gives the cost structure, not just 'it is slow'.",
      answer: [
        { t: "p", text: "Because of how the costs scale differently. An embedding is computed once per document, stored, and reused for every query forever \u2014 so the per-query cost is a vector comparison, which is microseconds." },
        { t: "p", text: "A cross-encoder cannot do that. It scores a query-document pair jointly, which is what makes it more accurate, and it means there is nothing to precompute. The cost is corpus size times query volume, every time, which is roughly a hundred times more per document scored." },
        { t: "p", text: "So scoring everything with the accurate model is not slightly expensive, it is a different complexity class. Over a corpus of any size it is simply not available." },
        { t: "p", text: "Which is why the design is forced rather than chosen. You cannot afford the expensive model over everything and you cannot trust the cheap one's ordering, so you use the cheap one to reduce the problem from a corpus to twenty candidates and then spend the accurate model there. Every retrieval architecture I have seen is a variation on that." }
      ] },
    { level: "core", q: "What is the first thing you would measure on a new retrieval system?",
      strong: "A strong answer is the recall curve, with a reason.",
      answer: [
        { t: "p", text: "Recall against k, over a labelled query set. Before anything about reranking, chunk sizes or prompts." },
        { t: "p", text: "The reason is that recall is the thing nothing downstream can fix. Every other component in the pipeline operates on the candidate set stage one produced, so if the relevant document is not in it, no reranker promotes it and no prompt cites it. I want to know where that failure sits before I spend effort anywhere else." },
        { t: "p", text: "The curve itself is informative beyond the single number. On the corpus I measured, recall went 0.571 at k=1, 0.929 at k=3, and 1.0 from k=5 onward. So k=10 and k=20 add no recall at all \u2014 what they add is candidates for a second stage to reorder." },
        { t: "p", text: "Which tells me two actionable things. One, where to set fetch_k: somewhere past the point recall flattens. Two, whether a reranker is worth buying yet \u2014 if recall is still climbing at my current k, raising k is the cheaper improvement and I should do that first." }
      ] }
  ] }
});
