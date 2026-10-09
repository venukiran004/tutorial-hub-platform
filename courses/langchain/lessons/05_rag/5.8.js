EC.receiveLesson({
  id: "5.8",
  lede: "Measured on natural questions the baseline looks finished: **Recall@5 = 1.000, MRR = 0.964, NDCG@5 = 0.974**. Two things are wrong with that conclusion. First, the P@5 of 0.214 is **at ceiling**, not failing \u2014 13 of the 14 queries have exactly one relevant document, so 0.2 is the maximum achievable and the metric cannot move. Second, change the query style and it collapses: on rare exact terms, `Retry-After` is **not found at all** in the top five and `WebAuthn` ranks fourth. These are not obscure queries \u2014 they are what an engineer types when they already know the term. That gap, plus four near-duplicate cancellation documents filling the slots, is the entire problem list for module 6.",
  objectives: [
    "Measure a baseline across four metrics and read them honestly",
    "Recognise a metric at ceiling and say why it cannot show improvement",
    "Demonstrate that the baseline collapses on a different query style",
    "Show how near-duplicates consume the candidate slots",
    "Derive the module 6 problem list from measurements rather than from a list of techniques"
  ],
  prerequisites: ["5.7", "5.1"],
  blocks: [
    { t: "h2", n: "01", id: "baseline", text: "The baseline, measured", sub: "And one of the numbers is lying" },
    { t: "code", lang: "text", title: "14 natural queries, k=5",
      code: "Recall@5 = 1.000   P@5 = 0.214   MRR = 0.964   NDCG@5 = 0.974",
      caption: "Three of these are genuinely good. One is at ceiling." },
    { t: "callout", kind: "trap", title: "P@5 = 0.214 is at ceiling, not failing", body: [
      { t: "p", text: "13 of the 14 queries have exactly **one** relevant document. With k=5, a perfect retriever puts that document in the top five and the other four slots are necessarily non-relevant \u2014 so the maximum possible P@5 for those queries is 0.2. The measured 0.214 is essentially perfect." },
      { t: "p", text: "Reporting it as a weak spot would send you optimising a number that physically cannot improve. The general lesson is that a metric's range depends on the labelled data, not just on the system, and a metric that cannot move is worse than no metric \u2014 it generates work. 6.9 is about choosing metrics that can." }
    ] },
    { t: "h2", n: "02", id: "collapse", text: "The same retriever, different query style", sub: "And it does not hold up" },
    { t: "code", lang: "text", title: "8 rare exact terms, each in exactly one document",
      code: "Recall@5 = 0.875   MRR = 0.781\n\nquery                rr     top 3\nmTLS                 1.00   ['api-mtls', 'user-groups', 'api-limits']\nSAML 2.0             1.00   ['auth-sso', 'auth-mfa', 'api-mtls']\nWebAuthn             0.25   ['intg-webhook-out', 'api-auth', 'intg-oauth']\nRetry-After          0.00   ['api-idempotency', 'api-webhooks', 'bill-refund']\ndead-letter queue    1.00   ['api-webhooks', 'api-idempotency', 'ops-maintenance']\nIdempotency-Key      1.00   ['api-idempotency', 'auth-sso', 'intg-webhook-out']\nreverse charge       1.00   ['bill-tax', 'bill-seats', 'bill-cancel-trial']\nAPI-Version          1.00   ['api-versioning', 'api-auth', 'intg-oauth']",
      caption: "`Retry-After` scores 0.00 \u2014 the document containing it is nowhere in the top five." },
    { t: "p", text: "A dense embedding has **no notion of an exact match**. `Retry-After` is semantically close to a great deal of API documentation, so the relevant document has no particular advantage over its neighbours, and the one signal that would settle it \u2014 *this document literally contains that string* \u2014 is not available to a similarity score. That is the argument for BM25 in 6.3, derived rather than asserted." },
    { t: "h2", n: "03", id: "dupes", text: "Near-duplicates fill the slots", sub: "A precision problem, not a recall one" },
    { t: "code", lang: "text", title: "Four documents about cancelling things",
      code: "'I ordered the wrong thing and want to stop it'\n  top 4: ['bill-cancel-order', 'bill-cancel-sub', 'ops-cancel-report', 'bill-cancel-trial']\n'stop my plan renewing'\n  top 4: ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage', 'ops-cancel-report']",
      caption: "The right document ranks first both times, and the rest of the slots are near-duplicates." },
    { t: "callout", kind: "insight", title: "The ranking is right and the context is bad", body: [
      { t: "p", text: "Both queries put the correct document first, so recall and MRR are perfect and nothing in the metrics suggests a problem. What reaches the model is four plausible cancellation procedures that answer **different** questions, and it has to pick." },
      { t: "p", text: "That is a precision problem \u2014 specifically a diversity problem, which is what MMR (6.6) and reranking (6.7) address. It is also a reminder that retrieval metrics score the ranking, not the context: a perfect MRR is compatible with a context window full of near-identical distractors." }
    ] },
    { t: "h2", n: "04", id: "list", text: "The problem list for module 6", sub: "Every item measured, not assumed" },
    { t: "table", head: ["Problem", "Why the baseline has it", "Where it is addressed"], rows: [
      ["rare exact terms are missed", "dense similarity has no notion of an exact match", "BM25 (6.3)"],
      ["different scales cannot be mixed", "dense and sparse scores are incomparable", "RRF (6.5)"],
      ["near-duplicates fill the slots", "no diversity in the ranking", "MMR (6.6)"],
      ["the cheap ranker is approximate", "order within the candidates is unreliable", "reranking (6.7)"],
      ["no answer is still an answer", "nothing abstains", "a score threshold (7.1)"],
      ["P@5 is at ceiling", "the metric cannot show improvement", "metric choice (6.9)"]
    ] },
    { t: "p", text: "Each row came from a measurement in this module rather than from a list of techniques to cover. That ordering matters: module 6 is not a tour of retrieval methods, it is six specific repairs to a baseline whose failures you have now seen." },
    { t: "diagram", kind: "matrix", title: "The baseline looks finished, and two things are wrong with that",
      caption: "Recall@5 of 1.000 and MRR of 0.964 on natural questions. But **P@5 of 0.214 is at its arithmetic ceiling**, not failing — 13 of 14 queries have exactly one relevant document, so 1/5 is the maximum achievable. A metric that cannot move is not evidence.",
      cols: ["measured", "what it actually tells you"],
      rows: ["Recall@5", "MRR", "NDCG@5", "P@5"],
      cells: [
        [{ text: "1.000", tone: "good" }, "the relevant doc is always in the top 5"],
        [{ text: "0.964", tone: "good" }, "and nearly always first"],
        [{ text: "0.974", tone: "good" }, "the ranking is good"],
        [{ text: "0.214", tone: "crit" }, { text: "AT CEILING — cannot move", tone: "crit" }]
      ] },
    { t: "exercise", kind: "analysis", title: "Measure the baseline and derive the problem list",
      difficulty: "advanced", minutes: 32,
      body: "Evaluate the baseline retriever on natural queries across recall, precision, MRR and NDCG. Identify which metric is at ceiling and explain why. Then evaluate the same retriever on rare exact terms and report per-query reciprocal rank. Show how near-duplicate documents consume the candidate slots even when ranking is perfect. Finally, derive a problem list from what you measured.",
      requirements: ["Report four metrics on the natural query set",
        "Identify the metric at ceiling and compute its maximum achievable value",
        "Explain why optimising a ceilinged metric is harmful",
        "Evaluate on rare exact terms with per-query reciprocal rank",
        "Identify the worst case and explain why dense retrieval fails it",
        "Show near-duplicates filling slots while MRR stays perfect",
        "Produce a problem list in which every item traces to a measurement"],
      hint: "Count the relevant documents per query before interpreting P@5. If most queries have one, the metric's ceiling is 1/k.",
      solution: { lang: "python", title: "x0508.py \u2014 Retry-After at 0.00",
        code: 'from corpus import QUERIES, KEYWORD_QUERIES, evaluate, rr\n\n_, (r, p, m, n) = evaluate(dense, QUERIES, k=5)\nprint("Recall@5 = %.3f   P@5 = %.3f   MRR = %.3f   NDCG@5 = %.3f" % (r, p, m, n))\n\n_, (r2, p2, m2, n2) = evaluate(dense, KEYWORD_QUERIES, k=5)\nprint("Recall@5 = %.3f   MRR = %.3f" % (r2, m2))\nfor q, rel in KEYWORD_QUERIES:\n    got = dense(q, 5)\n    print("%-20s %.2f   %s" % (q, rr(got, rel), got[:3]))',
        out: "==============================================================================\nPART 1 -- the baseline, measured on natural queries\n==============================================================================\n  14 queries, k=5\n  Recall@5 = 1.000   P@5 = 0.214   MRR = 0.964   NDCG@5 = 0.974\n\n  that looks excellent, and the P@5 figure is misleading: 13 of the\n  14 queries have exactly ONE relevant document, so the maximum\n  possible P@5 is 0.2 for those. it is at ceiling, not failing.\n  (6.9 is about choosing metrics that can move.)\n\n==============================================================================\nPART 2 -- the same retriever on rare exact terms\n==============================================================================\n  8 queries, each term appearing in exactly one document\n  Recall@5 = 0.875   MRR = 0.781\n\n  query                rr     top 3\n  mTLS                 1.00   ['api-mtls', 'user-groups', 'api-limits']\n  SAML 2.0             1.00   ['auth-sso', 'auth-mfa', 'api-mtls']\n  WebAuthn             0.25   ['intg-webhook-out', 'api-auth', 'intg-oauth']\n  Retry-After          0.00   ['api-idempotency', 'api-webhooks', 'bill-refund']\n  dead-letter queue    1.00   ['api-webhooks', 'api-idempotency', 'ops-maintenance']\n  Idempotency-Key      1.00   ['api-idempotency', 'auth-sso', 'intg-webhook-out']\n  reverse charge       1.00   ['bill-tax', 'bill-seats', 'bill-cancel-trial']\n  API-Version          1.00   ['api-versioning', 'api-auth', 'intg-oauth']\n\n  'Retry-After' is not found at all in the top 5, and 'WebAuthn' is\n  fourth. these are not obscure queries -- they are what an engineer\n  types when they know the term they are looking for.\n\n==============================================================================\nPART 3 -- near-duplicate context\n==============================================================================\n  the corpus has four documents about cancelling things:\n    bill-cancel-sub    Cancelling a subscription. Open Account Settings and\n    bill-cancel-order  Cancelling an order. Open the order from the Orders \n    ops-cancel-report  Cancelling a scheduled report. Open Reports, select \n    bill-cancel-trial  Cancelling during a trial. If you cancel before the \n\n  'I ordered the wrong thing and want to stop it'\n    top 4: ['bill-cancel-order', 'bill-cancel-sub', 'ops-cancel-report', 'bill-cancel-trial']\n  'stop my plan renewing'\n    top 4: ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage', 'ops-cancel-report']\n\n  the right one ranks first both times, and three of the four slots\n  go to near-duplicates that answer a DIFFERENT question. the model\n  now has four plausible cancellation procedures in its context and\n  must pick -- which is a precision problem (6.6, 6.7), not recall.\n\n==============================================================================\nPART 4 -- the problem list for module 6\n==============================================================================\n  rare exact terms are missed        dense similarity has no notion of an exact match -> BM25 (6.3)\n  different scales cannot be mixed   dense and sparse scores are incomparable -> RRF (6.5)\n  near-duplicates fill the slots     no diversity in the ranking -> MMR (6.6)\n  the cheap ranker is approximate    order within the candidates is unreliable -> rerank (6.7)\n  no answer is still an answer       nothing abstains -> a score threshold (7.1)\n  P@5 is at ceiling                  the metric cannot show improvement -> 6.9",
        notes: [
          { t: "p", text: "**Recall@5 = 1.000, MRR = 0.964, NDCG@5 = 0.974** on natural queries. Three of those are genuinely good." },
          { t: "p", text: "**P@5 = 0.214 is at ceiling, not failing.** 13 of 14 queries have exactly one relevant document, so with k=5 the maximum achievable P@5 is 0.2 \u2014 the measured value is essentially perfect." },
          { t: "p", text: "**Reporting it as a weakness would generate work on a number that cannot move.** A metric's range depends on the labelled data, not only on the system, and a ceilinged metric is worse than no metric." },
          { t: "p", text: "**On rare exact terms the baseline collapses**: Recall@5 drops to 0.875 and MRR to 0.781, with `Retry-After` scoring 0.00 \u2014 not in the top five at all \u2014 and `WebAuthn` fourth." },
          { t: "p", text: "**A dense embedding has no notion of an exact match.** The one signal that would settle `Retry-After` \u2014 this document literally contains that string \u2014 is unavailable to a similarity score. That is the argument for BM25, derived rather than asserted." },
          { t: "p", text: "**Near-duplicates fill the slots while the ranking stays perfect.** Both cancellation queries put the right document first, and three of four slots go to documents answering different questions." },
          { t: "p", text: "**So retrieval metrics score the ranking, not the context**: a perfect MRR is compatible with a context window full of near-identical distractors, which is a diversity problem for MMR and reranking." },
          { t: "p", text: "**Every item on module 6's problem list traces to a measurement here**, which is why that module is six specific repairs rather than a tour of retrieval techniques." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the retrieval system that scored 0.96 and frustrated its users", body: [
      { t: "p", text: "A team reports MRR 0.96 on their evaluation set and ships. Support tickets arrive saying search \u201cdoesn't work\u201d. The evaluation set was written by the team, from the documentation, in the documentation's vocabulary." },
      { t: "p", text: "Users are typing product names, error codes and header names \u2014 the rare-exact-term class, where this lesson measured the same retriever dropping to MRR 0.781 with one query finding nothing at all in the top five. The evaluation was not wrong, it was unrepresentative, and it measured the one query style the system handles well." },
      { t: "p", text: "The fix to the process rather than the system is to stratify the evaluation set by query style and report each stratum separately, never pooled. An aggregate number hides a collapse in one class, and the classes that collapse are usually the ones real users produce \u2014 because users do not know the documentation's vocabulary. 6.9 makes this an explicit design rule for evaluation sets." }
    ] }
  ],
  takeaways: [
    "**Baseline on natural queries: Recall@5 = 1.000, MRR = 0.964, NDCG@5 = 0.974.**",
    "**P@5 = 0.214 is at ceiling** \u2014 13 of 14 queries have one relevant document, so 0.2 is the maximum.",
    "**A metric that cannot move is worse than no metric**, because it generates work.",
    "**A metric's range depends on the labelled data, not only on the system.**",
    "**On rare exact terms the same retriever collapses**: Recall@5 = 0.875, MRR = 0.781.",
    "**`Retry-After` scores 0.00** \u2014 not in the top five at all \u2014 and `WebAuthn` ranks fourth.",
    "**A dense embedding has no notion of an exact match**, so \u2018contains this string\u2019 is a signal it cannot use.",
    "**Which is the argument for BM25, derived rather than asserted.**",
    "**Near-duplicates fill the slots while MRR stays perfect** \u2014 four cancellation procedures for one question.",
    "**Retrieval metrics score the ranking, not the context.**",
    "**Stratify evaluation sets by query style and report each stratum separately** \u2014 an aggregate hides a collapse.",
    "**Every item on module 6's problem list came from a measurement here**, not from a list of techniques."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A baseline reports P@5 = 0.214 where 13 of 14 queries have exactly one relevant document. How should that be read?",
      options: ["Precision is the weak spot and should be optimised first",
        "It is at ceiling \u2014 the maximum achievable P@5 is 0.2 for those queries, so the metric cannot improve",
        "The labelled set is incomplete and more relevance judgements are needed",
        "k should be reduced to 1 to raise precision"],
      answer: 1,
      why: "With one relevant document and k=5, a perfect retriever still fills four slots with non-relevant documents, so 0.2 is the arithmetic maximum. Treating 0.214 as a failure sends you optimising a number that physically cannot move, which is worse than having no metric because it generates work. A metric's range is a property of the labelled data as much as of the system." },
    { stem: "Why does dense retrieval fail on a query like \u201cRetry-After\u201d?",
      options: ["The term is too short to embed meaningfully",
        "A similarity score has no notion of an exact match, so 'this document literally contains that string' is not a signal it can use",
        "Header names are stripped during tokenisation",
        "The document containing it was not indexed"],
      answer: 1,
      why: "The term is semantically close to a lot of API documentation, so the one document that actually contains it has no particular advantage over its neighbours on a similarity measure. The decisive signal \u2014 literal presence of a rare string \u2014 is exactly what an embedding discards and what a lexical scorer like BM25 is built on. That is why hybrid retrieval exists." },
    { stem: "Two queries each rank the correct document first, and the remaining slots are near-duplicates answering different questions. What kind of problem is this?",
      options: ["A recall problem, since the other relevant documents are missing",
        "A precision and diversity problem \u2014 retrieval metrics score the ranking, not the quality of the context",
        "A chunking problem caused by over-splitting",
        "Not a problem, since MRR is perfect"],
      answer: 1,
      why: "Recall and MRR are both perfect because the right document is first, and nothing in the metrics indicates trouble. But the model receives four plausible cancellation procedures for different situations and must choose between them, which is a diversity failure in the candidate set. MMR and reranking address it; the metrics as configured cannot see it." },
    { stem: "A team evaluates retrieval at MRR 0.96 and users complain search is broken. What went wrong with the evaluation?",
      options: ["MRR is the wrong metric and NDCG should have been used",
        "The evaluation set was written in the documentation's vocabulary, so it measured only the query style the system handles well",
        "The evaluation set was too small",
        "Retrieval degraded after deployment"],
      answer: 1,
      why: "Queries written by the team from the docs share the docs' vocabulary, which is the easy case for dense retrieval. Real users type product names, error codes and header names \u2014 the class where the same retriever here dropped to MRR 0.781 with one query returning nothing relevant at all. The remedy is stratifying by query style and reporting strata separately, since an aggregate conceals a collapse in one class." }
  ] },
  interview: { title: "Interview practice", sub: "Baselines and honest measurement", questions: [
    { level: "core", q: "You measure retrieval at Recall 1.0 and MRR 0.96. Are you done?",
      strong: "A strong answer questions the query set before believing the number.",
      answer: [
        { t: "p", text: "No, and the first thing I would question is the query set rather than the number." },
        { t: "p", text: "I measured exactly that on a small corpus \u2014 Recall@5 of 1.0, MRR 0.964, NDCG 0.974 on natural questions. Then I ran the same retriever on rare exact terms, the kind of thing an engineer types when they already know what they are looking for: header names, protocol names, error codes. Recall dropped to 0.875 and MRR to 0.781, and one query, 'Retry-After', did not retrieve the relevant document anywhere in the top five." },
        { t: "p", text: "So the aggregate was hiding a collapse in a whole query class. That is a very common failure, because evaluation sets tend to get written by the team from the documentation, in the documentation's vocabulary \u2014 which is the easy case. The fix is to stratify by query style and report each stratum separately, never pooled." },
        { t: "p", text: "I would also check whether any of my metrics is at ceiling. My P@5 was 0.214, which looks poor and is actually near-perfect: thirteen of fourteen queries had exactly one relevant document, so with k=5 the maximum possible is 0.2. Reporting that as a weakness would have sent someone optimising a number that physically cannot move." }
      ] },
    { level: "advanced", q: "How do you decide which retrieval improvements to invest in?",
      strong: "A strong answer derives the list from measurements of its own baseline.",
      answer: [
        { t: "p", text: "I build a baseline, measure it against a stratified query set, and let the failures tell me what to fix. Not from a list of techniques, because then you end up implementing hybrid search and reranking because they are the known moves rather than because they address something you observed." },
        { t: "p", text: "On the baseline I measured, that produced a specific list. Rare exact terms were missed, because a dense embedding has no notion of a literal match \u2014 that is the argument for a lexical retriever. Dense and sparse scores are on incomparable scales, so combining them needs rank fusion rather than score addition. Near-duplicates filled the candidate slots, which needs diversity selection." },
        { t: "p", text: "The near-duplicate one is the most instructive, because the metrics were perfect. Two cancellation queries each ranked the right document first, so recall and MRR said everything was fine, and the model still received four plausible cancellation procedures for four different situations and had to pick. Retrieval metrics score the ranking, not the quality of the context." },
        { t: "p", text: "And one item on the list was about the measurement rather than the system: a metric at ceiling that could not show improvement, which needed replacing before any of the other work could be evaluated. I would sequence that first, because otherwise you cannot tell whether the rest of it helped." }
      ] },
    { level: "core", q: "How would you build an evaluation set for a retrieval system?",
      strong: "A strong answer stratifies by query style and explains the trap.",
      answer: [
        { t: "p", text: "Stratified by query style, with each stratum reported separately and never pooled into one number." },
        { t: "p", text: "The trap is that evaluation sets get written by the team, from the documentation, and therefore in the documentation's vocabulary \u2014 which is the single easiest case for dense retrieval. I measured a baseline at MRR 0.964 on queries like that, and the same retriever at 0.781 on rare exact terms, with one query failing to retrieve the relevant document anywhere in the top five. An aggregate across both would have hidden that completely." },
        { t: "p", text: "So the strata I would want are: natural questions phrased the way a user would phrase them, exact terms where the user already knows the name, queries whose relevant document uses entirely different vocabulary, and near-duplicate cases where several documents are plausible and one is right." },
        { t: "p", text: "I would also check each metric's achievable range against the labels before reporting it. My P@5 was 0.214, which reads as poor and was near-perfect \u2014 thirteen of fourteen queries had exactly one relevant document, so 0.2 was the arithmetic maximum. A metric that cannot move is worse than no metric, because it generates work that cannot succeed, and someone will be assigned that work." }
      ] }
  ] }
});
