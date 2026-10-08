EC.receiveLesson({
  id: "6.9",
  lede: "Four metrics computed by hand on one result set, and then the question that matters more than any of their values: **can this metric move, and does what it measures matter to the user?** On this label set P@5 is **at its arithmetic ceiling** \u2014 the maximum achievable is 0.214 and the measured value is 0.214, which is 100.0% of what is possible. Reported as \u201c0.214, needs work\u201d it generates work that cannot succeed. And MRR is **identical** for two rankings that differ in whether a second relevant document was found at all, because MRR stops looking after the first hit.",
  objectives: [
    "Compute Recall@k, Precision@k, MRR and NDCG@k from their definitions",
    "Say what each metric is blind to",
    "Compute a metric's achievable ceiling against your labels",
    "Map a measured symptom to the fix it implies",
    "Explain why no retriever in this module dominates"
  ],
  prerequisites: ["6.8", "5.8"],
  blocks: [
    { t: "h2", n: "01", id: "scratch", text: "The four metrics, by hand", sub: "On one result set" },
    { t: "code", lang: "text", title: "One query, worked through",
      code: "query    : 'how long do you keep my information'\nrelevant : ['data-deletion', 'data-retention']\nretrieved: ['data-retention', 'data-deletion', 'auth-session', 'ops-backup', 'data-audit']\nhit pattern: [1, 1, 0, 0, 0]\n\nRecall@5    = |relevant retrieved| / |relevant|  = 2/2 = 1.000\nPrecision@5 = |relevant retrieved| / k           = 2/5 = 0.400\nRR          = 1 / rank of first relevant         = 1/1 = 1.000\nDCG@5       = sum h_i / log2(i+2)                = 1.6309\nIDCG@5      = the same with a perfect ranking    = 1.6309\nNDCG@5      = DCG / IDCG                         = 1.000",
      caption: "NDCG is 1.000 because both relevant documents are already in the best possible positions." },
    { t: "math", tex: "\\mathrm{DCG}@k = \\sum_{i=1}^{k} \\frac{h_i}{\\log_2(i+2)} \\qquad \\mathrm{NDCG}@k = \\frac{\\mathrm{DCG}@k}{\\mathrm{IDCG}@k}" },
    { t: "h2", n: "02", id: "blind", text: "What each metric is blind to", sub: "Which decides when to use it" },
    { t: "table", head: ["Metric", "Answers", "Blind to"], rows: [
      ["Recall@k", "did we fetch it at all", "where it ranked"],
      ["Precision@k", "how much of k was useful", "**ceilinged by |relevant|**"],
      ["MRR", "how high was the **first** hit", "every hit after the first"],
      ["NDCG@k", "how good is the whole order", "needs graded labels to shine"]
    ] },
    { t: "code", lang: "text", title: "Two rankings, two relevant documents",
      code: "A first, B fifth     R@5 1.00  P@5 0.40  RR 1.00  NDCG 0.850\nA first, B absent    R@5 0.50  P@5 0.20  RR 1.00  NDCG 0.613",
      caption: "**MRR is identical** for both. Only recall and NDCG saw the difference." },
    { t: "callout", kind: "trap", title: "MRR stops looking after the first hit", body: [
      { t: "p", text: "One ranking found both relevant documents; the other found one and missed the second entirely. MRR scores them the same, because the first relevant document is at rank 1 in both cases and MRR is defined as the reciprocal of that one position." },
      { t: "p", text: "That makes MRR a good fit for *\u201cis there one right answer and did we surface it\u201d* and a poor fit for anything where completeness matters \u2014 a question whose answer spans several documents, or a search results page. Choosing MRR there means choosing not to measure the thing you care about." }
    ] },
    { t: "h2", n: "03", id: "ceiling", text: "The ceiling, quantified", sub: "Before reporting any metric as a weakness" },
    { t: "code", lang: "text", title: "Computing what is achievable",
      code: "relevant documents per query: {1: 13, 2: 1}\n\nfor a query with 1 relevant document and k=5, max P@5 = 1/5 = 0.200\n13 of 14 queries have exactly 1 relevant document\nso the maximum achievable mean P@5 on this set = 0.214\nmeasured P@5                                   = 0.214\nfraction of the achievable ceiling reached     = 100.0%",
      caption: "The measured value **is** the ceiling, to three decimal places." },
    { t: "callout", kind: "insight", title: "Always compute the ceiling first", body: [
      { t: "p", text: "P@5 of 0.214 reads like a failure and is a perfect score. With one relevant document and `k=5`, four of the five slots are *necessarily* non-relevant, so 0.2 is the arithmetic maximum for those queries." },
      { t: "p", text: "Reporting it as a weak spot generates work that cannot succeed, and someone will be assigned that work. The ceiling is three lines to compute from the labels you already have, and it should be computed before any metric is described as low. A metric's range is a property of the labelled data, not only of the system." }
    ] },
    { t: "p", text: "The remedy, if precision genuinely matters, is to change the measurement rather than chase the number: evaluate at `k=1`, where the ceiling is 1.0, or build a label set with graded relevance so several documents per query can be partially correct. Both are label-side changes, which is the tell that the problem was never in the retriever." },
    { t: "h2", n: "04", id: "guide", text: "Symptom to fix", sub: "What each measurement implies" },
    { t: "table", head: ["Symptom", "Likely fix"], rows: [
      ["R@k low", "retrieval is missing it \u2014 wider `k`, hybrid (6.4), query rewrite (7.2)"],
      ["R@k high, MRR low", "fetched and misranked \u2014 reranking (6.7)"],
      ["MRR high, answers still poor", "context quality, not ranking \u2014 diversity (6.6), budgeting (7.3)"],
      ["P@k low with few relevant docs", "probably at ceiling \u2014 **check before acting**"],
      ["good on your set, bad in the wild", "unrepresentative queries \u2014 stratify by style (5.8)"]
    ] },
    { t: "p", text: "The third row is the one that is easiest to miss, because every number looks healthy. 6.6's near-duplicate case is exactly that: perfect MRR with a context window full of four cancellation procedures for four different situations. Ranking metrics score the ranking, not the context." },
    { t: "h2", n: "05", id: "nodominance", text: "No retriever dominates", sub: "The module's result in one table" },
    { t: "table", head: ["retriever", "nat R@5", "nat MRR", "nat NDCG", "exact R@5", "exact MRR"], rows: [
      ["dense", "**1.000**", "**0.964**", "**0.974**", "0.875", "0.781"],
      ["bm25", "0.357", "0.286", "0.304", "**1.000**", "**1.000**"],
      ["RRF 1:1", "0.429", "0.393", "0.402", "**1.000**", "**1.000**"]
    ] },
    { t: "callout", kind: "tradeoff", title: "There is no best retriever, only a best retriever per query class", body: [
      { t: "p", text: "No row dominates. Dense wins every natural-query column and loses both exact-term columns; BM25 is the exact mirror; and the fusion inherits BM25's exact-term perfection while sitting far below dense on natural queries." },
      { t: "p", text: "That is why 7.2 routes rather than tuning a weight, and it is the result the whole module was assembling. A single configuration cannot be optimal when the query population is a mixture, and the only remaining lever is to decide which retriever a query goes to." }
    ] },
    { t: "exercise", kind: "build", title: "Compute the metrics, then compute their ceilings",
      difficulty: "advanced", minutes: 34,
      body: "Compute Recall@k, Precision@k, reciprocal rank and NDCG@k from their definitions on one result set, showing the intermediate DCG and IDCG. Tabulate what each metric is blind to, and construct two rankings that MRR scores identically but recall distinguishes. Then compute the maximum achievable mean P@5 against your label counts and compare it to the measured value. Finally build a symptom-to-fix table and measure every retriever in the module on both query classes.",
      requirements: ["Compute all four metrics by hand on one result set, showing DCG and IDCG",
        "Tabulate what each metric answers and what it is blind to",
        "Construct two rankings MRR cannot distinguish and say which metrics can",
        "Compute the maximum achievable mean P@5 from the label counts",
        "Compare it to the measured value and state the fraction of ceiling reached",
        "Produce a symptom-to-fix table",
        "Measure every retriever on both query classes in one table"],
      hint: "Count relevant documents per query before interpreting any precision figure. If most queries have one, the ceiling is 1/k.",
      solution: { lang: "python", title: "x0609.py \u2014 0.214 is 100% of achievable",
        code: 'hits = [1 if d in rel else 0 for d in got]\nprint("Recall@5    = %d/%d = %.3f" % (sum(hits), len(rel), sum(hits) / float(len(rel))))\nprint("Precision@5 = %d/5 = %.3f" % (sum(hits), sum(hits) / 5.0))\n\ndcg = sum(h / math.log2(i + 2) for i, h in enumerate(hits))\nidcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(rel), 5)))\nprint("NDCG@5      = %.3f" % (dcg / idcg))\n\n# the ceiling, from the labels alone\nceil = sum(min(len(r), 5) / 5.0 for _, r in QUERIES) / len(QUERIES)\n_, (r, p, m, n) = evaluate(dense, QUERIES, k=5)\nprint("max achievable P@5 = %.3f, measured = %.3f (%.1f%%)"\n      % (ceil, p, 100 * p / ceil))',
        out: "==============================================================================\nPART 1 -- the four metrics, from scratch, on one result set\n==============================================================================\n  query    : 'how long do you keep my information'\n  relevant : ['data-deletion', 'data-retention']\n  retrieved: ['data-retention', 'data-deletion', 'auth-session', 'ops-backup', 'data-audit']\n\n  hit pattern: [1, 1, 0, 0, 0]\n\n  Recall@5    = |relevant retrieved| / |relevant|   = 2/2 = 1.000\n  Precision@5 = |relevant retrieved| / k            = 2/5 = 0.400\n  RR          = 1 / rank of first relevant          = 1/1 = 1.000\n  DCG@5       = sum h_i / log2(i+2)                 = 1.6309\n  IDCG@5      = the same with a perfect ranking      = 1.6309\n  NDCG@5      = DCG / IDCG                           = 1.000\n==============================================================================\nPART 2 -- what each metric is blind to\n==============================================================================\n  metric       answers                        blind to\n  Recall@k     did we fetch it at all         where it ranked\n  Precision@k  how much of k was useful       ceilinged by |relevant|\n  MRR          how high was the FIRST hit     every hit after the first\n  NDCG@k       how good is the whole order    needs graded labels to shine\n\n  constructed example -- two rankings, one relevant document at rank 1\n  and 5, with a second relevant document in one of them:\n    A first, B fifth     R@5 1.00  P@5 0.40  RR 1.00  NDCG 0.850\n    A first, B absent    R@5 0.50  P@5 0.20  RR 1.00  NDCG 0.613\n\n  MRR is IDENTICAL for both -- it stopped looking after rank 1. only\n  recall and NDCG saw the difference.\n==============================================================================\nPART 3 -- the ceiling problem, quantified\n==============================================================================\n  relevant documents per query: {1: 13, 2: 1}\n\n  for a query with 1 relevant document and k=5, max P@5 = 1/5 = 0.200\n  13 of 14 queries have exactly 1 relevant document\n  so the maximum achievable mean P@5 on this set = 0.214\n  measured P@5                                   = 0.214\n  fraction of the achievable ceiling reached     = 100.0%\n\n  reported as '0.214, needs work' it generates work that CANNOT\n  succeed. always compute a metric's ceiling against your labels\n  before reporting it as a weakness.\n==============================================================================\nPART 4 -- the metric-to-fix guide\n==============================================================================\n  symptom                           likely fix\n  R@k low                           retrieval is missing it: wider k,\n                                    hybrid (6.4), query rewrite (7.2)\n  R@k high, MRR low                 it is fetched and misranked:\n                                    reranking (6.7)\n  MRR high, answers still poor      context quality, not ranking:\n                                    diversity (6.6), budgeting (7.3)\n  P@k low with |relevant| small     probably at ceiling -- check first\n  good on your set, bad in the wild unrepresentative queries:\n                                    stratify by query style (5.8)\n\n  the first question for any metric is not 'is it high' but 'can it\n  move, and does the thing it measures matter to the user'.\n==============================================================================\nPART 5 -- one table, every retriever in this module\n==============================================================================\n  retriever      nat R@5  nat MRR  nat NDCG  exact R@5  exact MRR\n  dense          1.000    0.964    0.974     0.875      0.781\n  bm25           0.357    0.286    0.304     1.000      1.000\n  RRF 1:1        0.429    0.393    0.402     1.000      1.000\n\n  no row dominates. that is the module's result: there is no single\n  best retriever on this corpus, only a best retriever per query class,\n  which is why 7.2 routes instead of tuning a weight.",
        notes: [
          { t: "p", text: "**NDCG@5 was 1.000** on the worked example, because both relevant documents were already in the best possible positions \u2014 DCG equalled IDCG exactly." },
          { t: "p", text: "**MRR is identical for two rankings that differ in whether a second relevant document was found at all**, because it is the reciprocal of the first hit's position and stops looking there." },
          { t: "p", text: "**So MRR fits \u2018is there one right answer and did we surface it\u2019** and is a poor choice wherever completeness matters \u2014 only recall and NDCG saw the difference (1.00/0.850 against 0.50/0.613)." },
          { t: "p", text: "**P@5 of 0.214 is 100.0% of the achievable ceiling**, which is also 0.214: with one relevant document and k=5, four slots are necessarily non-relevant so 0.2 is the arithmetic maximum." },
          { t: "p", text: "**Reported as a weakness it generates work that cannot succeed**, and the ceiling is three lines to compute from the labels you already have." },
          { t: "p", text: "**The remedy is a label-side change** \u2014 evaluate at k=1, or build graded relevance labels \u2014 which is the tell that the problem was never in the retriever." },
          { t: "p", text: "**The symptom-to-fix mapping**: low recall means retrieval missed it; high recall with low MRR means reranking; high MRR with poor answers means context quality, which no ranking metric can see." },
          { t: "p", text: "**No retriever dominates.** Dense wins every natural column and loses both exact columns, BM25 is the exact mirror, and fusion sits far below dense on natural queries \u2014 which is why 7.2 routes instead of tuning a weight." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the quarter spent optimising a constant", body: [
      { t: "p", text: "A dashboard shows Recall@5 at 0.98, MRR at 0.95 and Precision@5 at 0.21. Precision is the obvious outlier, so it becomes the quarter's objective. Three engineers try reranking, filtering, threshold tuning and a larger embedding model. The number does not move." },
      { t: "p", text: "It could not. Almost every query in the evaluation set has exactly one relevant document, so with `k=5` the arithmetic maximum for P@5 is 0.2 and the system was already at it. The number was not an outlier, it was a different scale being read on the same axis." },
      { t: "p", text: "One line of analysis would have prevented it: compute each metric's achievable maximum from the label counts and display it beside the measured value. A dashboard showing \u201c0.214 of 0.214 achievable\u201d makes the situation obvious, and a dashboard showing a bare 0.21 next to two numbers near 1.0 actively invites the mistake." }
    ] }
  ],
  takeaways: [
    "**Recall@k, Precision@k, MRR and NDCG@k are all a few lines from their definitions.**",
    "**NDCG compares DCG against the best possible ordering**, so it is 1.000 when the ranking is already optimal.",
    "**MRR stops looking after the first hit** \u2014 identical for two rankings differing in whether a second relevant doc was found.",
    "**So MRR fits \u2018one right answer\u2019 and is wrong wherever completeness matters.**",
    "**P@5 of 0.214 was 100.0% of the achievable ceiling**, which is also 0.214.",
    "**With one relevant document and k=5, four slots are necessarily non-relevant** \u2014 0.2 is the arithmetic maximum.",
    "**Compute the ceiling before describing any metric as low** \u2014 three lines from the labels you already have.",
    "**A metric's range is a property of the labelled data, not only of the system.**",
    "**The remedy for a ceilinged metric is label-side**: evaluate at k=1, or use graded relevance.",
    "**Symptom to fix**: low recall → retrieval; high recall and low MRR → reranking; high MRR and poor answers → context.",
    "**Ranking metrics score the ranking, not the context** \u2014 perfect MRR is compatible with four near-duplicate distractors.",
    "**No retriever dominates**: dense wins every natural column, BM25 is its exact mirror.",
    "**Which is why the answer is routing per query class, not a single configuration.**",
    "**Display each metric's achievable maximum beside its measured value.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Two rankings both place a relevant document first; one also finds a second relevant document at rank 5, the other misses it. Which metrics distinguish them?",
      options: ["All four",
        "Recall and NDCG \u2014 MRR is identical because it stops at the first hit",
        "MRR and Precision only",
        "None, since the first relevant document is at rank 1 in both"],
      answer: 1,
      why: "MRR is the reciprocal of the first relevant document's position, which is 1 in both cases, so it reports 1.00 for each. Recall drops from 1.00 to 0.50 and NDCG from 0.850 to 0.613. That makes MRR unsuitable whenever completeness matters \u2014 a multi-document answer, or a results page \u2014 because choosing it there means choosing not to measure what you care about." },
    { stem: "A system measures P@5 = 0.214 where the achievable maximum is also 0.214. What should be done?",
      options: ["Prioritise precision work, since it is the lowest metric",
        "Nothing on the retriever \u2014 it is at ceiling; if precision matters, change the measurement or the labels",
        "Lower k until precision improves",
        "Add a reranking stage to improve ordering"],
      answer: 1,
      why: "With one relevant document per query and k=5, four slots are necessarily non-relevant, so 0.2 is the arithmetic maximum and the system has reached 100% of it. No retrieval change can move the number. If precision genuinely matters, evaluate at k=1 where the ceiling is 1.0, or build graded relevance labels \u2014 both label-side changes, which shows the problem was never the retriever." },
    { stem: "Recall and MRR are both high but answers are poor. What does that point at?",
      options: ["The labels are wrong",
        "Context quality rather than ranking \u2014 diversity and context budgeting, which ranking metrics cannot see",
        "The embedding model needs upgrading",
        "The evaluation set is too small"],
      answer: 1,
      why: "High recall means the relevant document was fetched and high MRR means it ranked first, so retrieval has done its job by every available measure. What those metrics cannot see is what else is in the window \u2014 four near-duplicate procedures answering different questions, as measured in 6.6, or a context so long the answer sits where the model reads least carefully. Ranking metrics score the ranking." },
    { stem: "Why does no retriever dominate the final comparison table?",
      options: ["The evaluation set is too small to separate them",
        "Dense wins every natural-query column and loses both exact-term columns, and BM25 is the exact mirror",
        "The metrics are inconsistent with each other",
        "Fusion dominates both, which the table under-reports"],
      answer: 1,
      why: "Dense scores 1.000 recall and 0.964 MRR on natural queries against BM25's 0.357 and 0.286, and the ordering reverses completely on rare exact terms where BM25 is perfect. A single configuration cannot be optimal when the query population is a mixture, so the remaining lever is deciding which retriever a given query goes to \u2014 which is routing, not weighting." }
  ] },
  interview: { title: "Interview practice", sub: "Retrieval evaluation", questions: [
    { level: "core", q: "Which retrieval metric would you choose?",
      strong: "A strong answer chooses from what the metric is blind to.",
      answer: [
        { t: "p", text: "It depends on the shape of the answer, and I would pick from what each metric cannot see rather than from what it measures." },
        { t: "p", text: "Recall tells you whether the document was fetched and nothing about where it ranked \u2014 which is the right first metric, because a recall failure is the one nothing downstream can fix. MRR tells you how high the first hit was and is blind to every hit after it. I measured two rankings where one found both relevant documents and the other missed the second entirely, and MRR reported exactly the same number for both." },
        { t: "p", text: "So MRR suits questions with one right answer, and is the wrong choice for anything where completeness matters \u2014 a question whose answer spans several documents, or a search results page." },
        { t: "p", text: "NDCG is the one I would reach for when the whole ordering matters, and it only really earns its complexity with graded relevance labels rather than binary ones. Precision I would be most careful with, because its ceiling depends on how many relevant documents each query has." }
      ] },
    { level: "advanced", q: "A dashboard shows Recall 0.98, MRR 0.95 and Precision@5 0.21. Where would you invest?",
      strong: "A strong answer computes the ceiling before treating precision as the problem.",
      answer: [
        { t: "p", text: "I would not treat precision as the problem until I had computed its ceiling, because that pattern is the classic signature of a metric that cannot move." },
        { t: "p", text: "If most queries have exactly one relevant document, then at k=5 four of the five slots are necessarily non-relevant and the arithmetic maximum for P@5 is 0.2. I measured precisely this: a maximum achievable mean of 0.214 and a measured value of 0.214, which is 100% of what was possible. It reads like the outlier on the dashboard and it is a perfect score." },
        { t: "p", text: "I have seen that mistake cost a quarter \u2014 reranking, filtering, threshold tuning, a bigger embedding model, and the number does not budge, because it cannot." },
        { t: "p", text: "So the first action is to display each metric's achievable maximum beside its measured value. '0.214 of 0.214 achievable' makes the situation obvious, where a bare 0.21 next to two numbers near 1.0 actively invites the error." },
        { t: "p", text: "With that resolved, high recall and high MRR mean retrieval is doing its job, so I would look at what the ranking metrics cannot see \u2014 the context. Near-duplicate results filling the window, or ordering effects in a long context. Those need answer-quality labels rather than ranking labels, which is a different evaluation to build." }
      ] },
    { level: "core", q: "How would you build an evaluation set for retrieval, and what would you report?",
      strong: "A strong answer stratifies, and reports ceilings alongside values.",
      answer: [
        { t: "p", text: "Stratified by query style, with each stratum reported separately, and every metric shown next to its achievable maximum." },
        { t: "p", text: "The strata matter because a single configuration is rarely optimal across query types. On my corpus dense retrieval scored 0.964 MRR on natural questions and 0.781 on rare exact terms, and BM25 was the exact mirror \u2014 0.286 and 1.000. A pooled number would have hidden both, and worse, it would have hidden the fact that adding hybrid fusion improved one class to perfection while cutting the other by more than half." },
        { t: "p", text: "The queries themselves I would not write from the documentation, because then they share the documentation's vocabulary, which is the easy case. I want natural phrasings, exact terms a user already knows, vocabulary-mismatch cases, and near-duplicate cases where several documents are plausible." },
        { t: "p", text: "And the ceilings, because a metric that cannot move generates work that cannot succeed. My P@5 was 0.214, which reads as the weak spot on a dashboard beside recall at 1.0 \u2014 and it was 100% of the arithmetic maximum, because thirteen of fourteen queries had exactly one relevant document. Showing '0.214 of 0.214 achievable' makes that obvious; showing a bare 0.21 invites a quarter of wasted work." },
        { t: "p", text: "The one thing none of this covers is context quality \u2014 whether the window is full of near-duplicate distractors. That needs answer-level labels, and it is worth being explicit that the ranking evaluation cannot speak to it." }
      ] }
  ] }
});
