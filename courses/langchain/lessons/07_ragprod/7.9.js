EC.receiveLesson({
  id: "7.9",
  lede: "Assembled from module 6's measurements, the per-query budget says something unexpected about where to start. The cross-encoder at **~1362 ms** for 20 candidates dominates everything except generation \u2014 and the **query embedding at ~104 ms** is a *fixed* cost, scaling with nothing, that is larger than the entire retrieval stack beneath it (a vector search over 41 documents is 0.08 ms). So the first optimisation is not sharding the index. It is not embedding the same query twice. And the honest answer to what degrades first under load is **quality**, because the usual response to latency is to cut the expensive stages \u2014 none of which appears on a latency dashboard.",
  objectives: [
    "Assemble a per-query latency budget and identify what scales with what",
    "Order caching decisions by value against risk",
    "Separate what can be precomputed from what cannot",
    "Name what degrades first under load and why it is invisible",
    "Apply the stage-ordering result before adding capacity"
  ],
  prerequisites: ["6.8", "7.7", "7.3"],
  blocks: [
    { t: "h2", n: "01", id: "budget", text: "Where the latency goes", sub: "Module 6's measurements, assembled" },
    { t: "table", head: ["stage", "cost", "scales with"], rows: [
      ["embed the query", "~104 ms", "**nothing** (fixed)"],
      ["vector search (41 docs)", "~0.08 ms", "corpus size"],
      ["BM25 scoring", "~1 ms", "corpus size"],
      ["rank fusion", "microseconds", "candidates"],
      ["MMR over 20 candidates", "~2 ms", "candidates squared"],
      ["cross-encode 20 candidates", "**~1362 ms**", "candidates"],
      ["generation", "provider", "output tokens"]
    ] },
    { t: "callout", kind: "insight", title: "Two things stand out", body: [
      { t: "p", text: "The cross-encoder is three orders of magnitude above everything except generation. That is where the latency is, and 6.1's per-document figure (~68 ms per pair) is what prices any change to it." },
      { t: "p", text: "And the query embedding \u2014 a **fixed** cost that scales with nothing \u2014 is larger than the entire retrieval stack below it. A vector search over the whole corpus is 0.08 ms against 104 ms to embed the query string. So the first optimisation is not sharding the index; it is not embedding the same query twice." }
    ] },
    { t: "h2", n: "02", id: "caching", text: "What to cache", sub: "Ordered by value over risk" },
    { t: "table", head: ["cache", "key", "saves", "risk"], rows: [
      ["query embedding", "exact text", "~104 ms", "none \u2014 deterministic"],
      ["retrieval result", "exact text", "~105 ms", "stale documents"],
      ["reranker scores", "**(query, doc)**", "**~1362 ms**", "stale documents"],
      ["final answer", "query embedding", "everything", "**a wrong answer** (7.7)"]
    ] },
    { t: "p", text: "The reranker-score cache is the underused one. It is keyed on a `(query, document)` pair \u2014 exactly what a cross-encoder scores \u2014 so the score cannot change unless the document does, making it as safe as an embedding cache while protecting the most expensive stage. A popular query hitting a warm pair cache skips 1.4 seconds of a 1.5-second pipeline." },
    { t: "h2", n: "03", id: "precompute", text: "What to precompute", sub: "6.1's argument, generalised" },
    { t: "dl", items: [
      ["precomputable", "document embeddings, BM25 statistics, chunk summaries (7.8), extracted metadata, and **document-document similarity** for MMR"],
      ["not precomputable", "the query embedding, fusion, cross-encoder scores, generation"]
    ] },
    { t: "callout", kind: "mental", title: "Anything that does not depend on the query belongs before the query arrives", body: [
      { t: "p", text: "That is the bi-encoder lesson stated generally, and the document-document similarity case is worth noticing: 6.6's MMR recomputes pairwise similarities on every query, and on a fixed corpus those values are **constant**." },
      { t: "p", text: "So the quadratic part of MMR is a lookup rather than a computation. That matters precisely because 6.8 found MMR paying for itself as a narrowing stage in front of the reranker \u2014 making it cheaper makes that trade better still." }
    ] },
    { t: "h2", n: "04", id: "degrades", text: "What degrades first under load", sub: "And the honest answer is quality" },
    { t: "code", lang: "text", title: "What teams actually do under pressure, in order",
      code: "1. lower fetch_k      -> 6.7 measured exact-term MRR falling\n                         from 1.000 to 0.875 at fetch 10\n2. drop the reranker  -> that class returns to 0.781\n3. loosen the cache   -> 7.7's wrong-answer rate rises\n4. shorten context    -> 7.3's effective k falls, recall 1.000 -> 0.929",
      caption: "Every one is a quality decision taken for a latency reason." },
    { t: "callout", kind: "warn", title: "None of these appears on a latency dashboard", body: [
      { t: "p", text: "Each change does what it was intended to do \u2014 latency improves \u2014 and the cost lands somewhere nothing is watching. The system gets faster and quietly worse, and the regression surfaces weeks later as support tickets rather than as a metric." },
      { t: "p", text: "The cheapest protection is to measure retrieval quality **continuously** against a labelled set, so a capacity decision that costs accuracy shows up as an accuracy change. That also means per query class (5.8), since these cuts do not affect all classes equally \u2014 dropping the reranker cost the exact-term class 0.22 of MRR and *improved* the natural class." }
    ] },
    { t: "h2", n: "05", id: "free", text: "The one that is free", sub: "6.8's finding is the scaling lesson too" },
    { t: "code", lang: "text", title: "Reordering, not reducing",
      code: "dense + rerank          1.456 s/query\nhybrid + mmr + rerank   0.717 s/query   <- more stages, half the latency",
      caption: "MMR narrows 20 candidates to 8 before the 68 ms/pair stage runs." },
    { t: "p", text: "The longer pipeline is twice as fast **and** better on every metric. A cheap stage in front of an expensive one has negative marginal cost whenever its own cost is below the saving it creates downstream, and here the ratio is overwhelming: microseconds against 68 milliseconds per candidate removed." },
    { t: "callout", kind: "good", title: "Check the ordering before buying capacity", body: [
      { t: "p", text: "This is available without spending anything and without giving up any quality, which makes it the first thing to try rather than the last. The general rule is to order stages by cost per document ascending and let each narrow as much as it safely can." },
      { t: "p", text: "And it inverts the instinct that every stage adds latency. That holds only for stages that do not **narrow** \u2014 a selection stage can pay for itself many times over." }
    ] },
    { t: "exercise", kind: "analysis", title: "Build a latency budget and decide where to spend",
      difficulty: "advanced", minutes: 32,
      body: "Assemble a per-query latency budget from measured stage costs, noting what each scales with. Identify the dominant stage and the largest fixed cost. Order the available caches by what they save against what they risk. Separate precomputable work from work that must happen per query. Then list what degrades under load, in the order teams actually cut things, and say why none of it is visible on a latency dashboard.",
      requirements: ["Tabulate stage costs and what each scales with",
        "Identify the dominant stage and the largest fixed cost",
        "Note that a fixed cost exceeded the whole retrieval stack",
        "Order caches by saving against risk, naming the keys",
        "Separate precomputable from per-query work",
        "List what degrades under load with the measured quality cost of each",
        "Explain why the longer pipeline was faster"],
      hint: "Separate costs that scale with the corpus from costs that are fixed per query. The largest fixed cost is usually not where people look.",
      solution: { lang: "python", title: "x0709.py \u2014 the first optimisation is not sharding",
        code: '# the budget, from 6.1\'s measurements\nBUDGET = [\n    ("embed the query",            104.0,   "nothing (fixed)"),\n    ("vector search (41 docs)",       0.08,  "corpus size"),\n    ("BM25 scoring",                  1.0,   "corpus size"),\n    ("rank fusion",                   0.001, "candidates"),\n    ("MMR over 20 candidates",        2.0,   "candidates squared"),\n    ("cross-encode 20 candidates", 1362.0,   "candidates"),\n]\nfor name, ms, scales in BUDGET:\n    print("%-28s %9.2f ms   %s" % (name, ms, scales))\n\nfixed = 104.0\nretrieval = sum(ms for n, ms, s in BUDGET if "corpus size" in s)\nprint("fixed query encoding %.1f ms vs whole retrieval stack %.2f ms"\n      % (fixed, retrieval))',
        out: "==============================================================================\nPART 1 -- where the latency actually goes\n==============================================================================\n  6.1's measurements, assembled into a per-query budget:\n\n  stage                        cost          scales with\n  embed the query              ~104 ms       nothing (fixed)\n  vector search (41 docs)      ~0.08 ms      corpus size\n  BM25 scoring                 ~1 ms         corpus size\n  rank fusion                  microseconds  candidates\n  MMR over 20 candidates       ~2 ms         candidates squared\n  cross-encode 20 candidates   ~1362 ms      candidates\n  generation                   provider      output tokens\n\n  two things stand out. the cross-encoder is three orders of magnitude\n  above everything except generation. and the query embedding -- a\n  FIXED cost that does not scale with anything -- is larger than the\n  entire retrieval stack below it.\n\n  so the first optimisation is not sharding the index. it is not\n  embedding the same query twice.\n==============================================================================\nPART 2 -- what to cache, in order of value over risk\n==============================================================================\n  7.7's layering, priced with these numbers:\n\n  cache                 saves          risk\n  query embedding       ~104 ms        none (keyed on exact text)\n  retrieval result      ~105 ms        stale documents\n  reranker scores       ~1362 ms       stale, keyed on (query, doc)\n  final answer          everything     a WRONG answer to the user\n\n  the reranker-score cache is the underused one: it is keyed on a\n  (query, document) pair, which is exactly what a cross-encoder scores,\n  so it is safe in the same way an embedding cache is -- the score of\n  a given pair does not change unless the document does.\n\n  and it protects the most expensive stage. a popular query hitting a\n  warm pair cache skips 1.4 seconds of the 1.5-second pipeline.\n==============================================================================\nPART 3 -- what to precompute\n==============================================================================\n  the bi-encoder lesson generalises: anything that does not depend on\n  the query can be done at ingest.\n\n  precomputable : document embeddings, BM25 statistics, chunk\n                  summaries (7.8), extracted metadata, doc-doc\n                  similarity for MMR\n  not           : query embedding, fusion, cross-encoder scores,\n                  generation\n\n  the doc-doc similarity one is worth noting because MMR recomputes\n  it per query: with a fixed corpus those pairwise similarities are\n  constant, so the quadratic part of 6.6's MMR is a lookup, not a\n  computation.\n==============================================================================\nPART 4 -- what degrades first under load\n==============================================================================\n  the honest answer is that quality degrades before latency does,\n  because the usual response to load is to cut the expensive stages.\n\n  under pressure, in the order teams actually do it:\n    1. lower fetch_k      -> 6.7 measured exact-term MRR dropping\n                             from 1.000 to 0.875 at fetch 10\n    2. drop the reranker  -> that class returns to 0.781\n    3. loosen the cache   -> 7.7's wrong-answer rate rises\n    4. shorten context    -> 7.3's effective k falls\n\n  every one of those is a quality decision taken for a latency reason,\n  and none of them appears on a latency dashboard. the cheapest\n  protection is to measure retrieval quality CONTINUOUSLY against a\n  labelled set, so a capacity decision that costs accuracy is visible\n  as an accuracy change rather than discovered from support tickets.\n==============================================================================\nPART 5 -- the one that is free\n==============================================================================\n  6.8's finding is the scaling lesson too: inserting MMR in front of\n  the cross-encoder narrowed 20 candidates to 8 and HALVED total\n  latency (1.456 s -> 0.717 s) while improving every metric.\n\n  so before adding capacity, check the stage ordering. a cheap stage\n  in front of an expensive one has negative marginal cost, and that is\n  available without buying anything or giving up any quality.",
        notes: [
          { t: "p", text: "**The cross-encoder dominates everything except generation** at ~1362 ms for 20 candidates \u2014 three orders of magnitude above the rest of retrieval." },
          { t: "p", text: "**And the query embedding is a FIXED cost larger than the whole retrieval stack**: 104 ms to embed the query against 0.08 ms to search 41 documents. It scales with nothing." },
          { t: "p", text: "**So the first optimisation is not sharding the index** \u2014 it is not embedding the same query twice." },
          { t: "p", text: "**The reranker-score cache is the underused one.** Keyed on a (query, document) pair, it cannot go stale unless the document changes, so it is as safe as an embedding cache while protecting the most expensive stage." },
          { t: "p", text: "**Anything not depending on the query belongs before the query arrives** \u2014 including MMR's document-document similarities, which are constant on a fixed corpus, making its quadratic part a lookup." },
          { t: "p", text: "**Quality degrades before latency does**, because the usual response to load is cutting expensive stages: lower fetch_k (exact-term MRR 1.000 to 0.875), drop the reranker (back to 0.781), loosen the cache, shorten the context (recall 1.000 to 0.929)." },
          { t: "p", text: "**None of those appears on a latency dashboard** \u2014 each does exactly what it was meant to do, and the cost lands where nothing is watching. Measure retrieval quality continuously, per query class." },
          { t: "p", text: "**The free win is reordering**: 6.8's full pipeline ran in 0.717 s against dense+rerank's 1.456 s while beating it on every metric, because MMR narrowed 20 candidates to 8 before the 68 ms/pair stage. Check the ordering before buying capacity." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the capacity increase that did not help", body: [
      { t: "p", text: "A RAG service is slow at peak. The team triples its replicas. Throughput improves and the p95 latency per request is unchanged, because it was never a queuing problem." },
      { t: "p", text: "The per-query budget was dominated by two things: the cross-encoder at over a second for twenty candidates, and the query embedding at ~104 ms. Neither gets faster with more replicas \u2014 both are compute per request. Capacity fixes a queue, and this was an arithmetic problem." },
      { t: "p", text: "The available moves were all cheaper than tripling the fleet. Reordering the stages so a cheap narrowing pass runs before the cross-encoder halved total latency in measurement, while improving every retrieval metric. Caching query embeddings on exact text removes a fixed 104 ms with no semantic risk. And caching cross-encoder scores on `(query, document)` pairs protects the dominant stage, also with no semantic risk. The lesson that generalises is to build the per-query budget before buying anything, and to separate costs that scale with load from costs that are simply per request." }
    ] }
  ],
  takeaways: [
    "**The cross-encoder dominates at ~1362 ms for 20 candidates** \u2014 three orders of magnitude above the rest of retrieval.",
    "**The query embedding is a fixed ~104 ms**, larger than the entire retrieval stack beneath it.",
    "**A vector search over 41 documents is 0.08 ms** \u2014 so the index is not where the latency is.",
    "**The first optimisation is not sharding** \u2014 it is not embedding the same query twice.",
    "**The reranker-score cache is underused**: keyed on (query, doc), as safe as an embedding cache, saves ~1362 ms.",
    "**Anything not depending on the query belongs before the query arrives.**",
    "**Including MMR's document-document similarities**, which are constant on a fixed corpus.",
    "**Quality degrades before latency does**, because the response to load is cutting expensive stages.",
    "**Lower fetch_k cost exact-term MRR 1.000 to 0.875; dropping the reranker returned it to 0.781.**",
    "**Shortening the context cost recall 1.000 to 0.929** (7.3's effective k).",
    "**None of those appears on a latency dashboard** \u2014 the cost lands where nothing is watching.",
    "**Measure retrieval quality continuously and per query class**, since the cuts affect classes unequally.",
    "**The free win is reordering**: 0.717 s against 1.456 s, with better metrics.",
    "**Capacity fixes a queue; a per-query budget is arithmetic** \u2014 build the budget before buying anything."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A vector search over the corpus takes 0.08 ms and embedding the query takes 104 ms. What does that imply?",
      options: ["The corpus is too small for the measurement to be meaningful",
        "The index is not where the latency is \u2014 the first optimisation is caching query embeddings, not sharding",
        "The embedding model should be replaced with a smaller one",
        "Query encoding should be moved off the critical path with async"],
      answer: 1,
      why: "The fixed per-query cost exceeds the entire corpus-scaling part of retrieval by three orders of magnitude, and it does not shrink as the index is partitioned. Caching the embedding keyed on exact query text removes it entirely with no semantic risk, since the same string always embeds to the same vector. Sharding addresses a cost that was never significant." },
    { stem: "Which cache protects the most expensive stage while carrying no semantic risk?",
      options: ["The final answer, keyed on query embedding",
        "Cross-encoder scores, keyed on the exact (query, document) pair",
        "The retrieval result, keyed on query embedding",
        "Document embeddings, which are already precomputed"],
      answer: 1,
      why: "A cross-encoder score is a deterministic function of an exact query-document pair, so it cannot be wrong unless the document changes \u2014 the same safety property an embedding cache has. It also protects the stage measured at ~1362 ms for twenty candidates, so a warm pair cache skips most of the pipeline. The answer cache saves more and is the only layer that can serve a false statement." },
    { stem: "What degrades first when a RAG system comes under load?",
      options: ["Latency, which is what the dashboards show",
        "Quality \u2014 because the usual response is cutting expensive stages, and none of those cuts appears on a latency dashboard",
        "Throughput, until capacity is added",
        "Index freshness, as update jobs are deferred"],
      answer: 1,
      why: "Lowering fetch_k, dropping the reranker, loosening the cache threshold and shortening the context all reduce latency as intended, and each has a measured accuracy cost \u2014 exact-term MRR from 1.000 to 0.875 at fetch 10, back to 0.781 without the reranker, recall 1.000 to 0.929 on a shorter context. The regression surfaces as support tickets weeks later unless retrieval quality is measured continuously." },
    { stem: "A team triples replicas and p95 per-request latency does not change. Why?",
      options: ["The replicas were not load-balanced correctly",
        "The budget was dominated by compute per request \u2014 a cross-encoder and a query embedding \u2014 which capacity does not accelerate",
        "The index needed resharding alongside the replicas",
        "The cache was cold on the new replicas"],
      answer: 1,
      why: "Capacity resolves queuing, and over a second of cross-encoder inference plus 104 ms of query encoding happen inside each request regardless of how many replicas exist. The cheaper moves were reordering stages so a narrowing pass precedes the cross-encoder, which halved measured latency while improving every metric, and caching the two deterministic stages." }
  ] },
  interview: { title: "Interview practice", sub: "Scaling retrieval", questions: [
    { level: "core", q: "Where does the latency go in a RAG query?",
      strong: "A strong answer separates fixed from scaling costs.",
      answer: [
        { t: "p", text: "Two places, and neither is the one people expect. A cross-encoder reranker over twenty candidates was over a second in my measurements \u2014 about 68 ms per query-document pair \u2014 which dominates everything except generation." },
        { t: "p", text: "The second is the query embedding, at roughly 104 ms. What makes that interesting is that it is a fixed cost: it scales with nothing. And it is larger than the entire retrieval stack beneath it \u2014 a vector search over the whole corpus was 0.08 ms." },
        { t: "p", text: "So I separate costs that scale with the corpus from costs that are simply per request. The index was never the problem at that scale, which means the first optimisation is not sharding, it is not embedding the same query string twice." },
        { t: "p", text: "That also tells me what to cache first: query embeddings keyed on exact text, and cross-encoder scores keyed on an exact query-document pair. Both are deterministic given the document, so they carry no semantic risk, and the second one protects the dominant stage." }
      ] },
    { level: "advanced", q: "What degrades first when a RAG system is under load?",
      strong: "A strong answer says quality, and explains why it is invisible.",
      answer: [
        { t: "p", text: "Quality, and it degrades invisibly, because the usual response to a latency problem is to cut the expensive stages." },
        { t: "p", text: "In the order teams actually do it: lower fetch_k, drop the reranker, loosen the cache threshold, shorten the context. I have measured the cost of each. Fetch at ten instead of twenty took exact-term MRR from 1.000 to 0.875. Removing the reranker returned that class to 0.781. A shorter context lowers the effective k, which took recall from 1.000 to 0.929. A looser cache threshold raises the rate at which it serves a confident answer to a different question." },
        { t: "p", text: "Every one of those does exactly what it was intended to do \u2014 latency improves \u2014 and none of them appears on a latency dashboard. So the system gets faster and quietly worse, and it surfaces weeks later as support tickets." },
        { t: "p", text: "The protection is to measure retrieval quality continuously against a labelled set, and per query class, because these cuts do not affect classes equally \u2014 dropping the reranker cost the exact-term class a lot and actually improved the vague-query class." },
        { t: "p", text: "And before cutting anything I would check the stage ordering, because that was free in my measurements. Inserting a cheap narrowing pass in front of the cross-encoder halved total latency, from 1.46 seconds to 0.72, while improving every metric \u2014 more stages, less time. That is available without spending anything or giving up quality, so it should be the first thing tried rather than the last." }
      ] },
    { level: "core", q: "You have one week to improve a slow RAG system. What do you do?",
      strong: "A strong answer orders by cost and measures quality throughout.",
      answer: [
        { t: "p", text: "Build the per-query latency budget first, because the answer is usually not where people look, and because capacity fixes a queue rather than arithmetic." },
        { t: "p", text: "Then in order of cost. Check the stage ordering: inserting a cheap narrowing pass before the cross-encoder halved my total latency, from 1.46 seconds to 0.72, while improving every retrieval metric. That is free and it should be first." },
        { t: "p", text: "Then the two caches with no semantic risk: query embeddings keyed on exact text, which was a fixed 104 ms, and cross-encoder scores keyed on query-document pairs, which protects the dominant stage at over a second. Neither can serve a wrong answer." },
        { t: "p", text: "Then precompute anything that does not depend on the query \u2014 including the document-document similarities that a diversity stage otherwise recomputes every time, which are constant on a fixed corpus." },
        { t: "p", text: "What I would leave until last, and do with instrumentation in place, is cutting quality stages. Lowering fetch_k took my exact-term MRR from 1.000 to 0.875; removing the reranker returned it to 0.781; a shorter context took recall from 1.000 to 0.929. Every one of those improves the latency dashboard and the cost lands where nothing is watching, so I would want retrieval quality measured continuously and per query class before touching any of them." }
      ] }
  ] }
});
