EC.receiveLesson({
  id: "6.7",
  lede: "Reranking does exactly what it promises on the case it exists for: `Retry-After`'s relevant document sat at candidate rank **11** \u2014 outside the top five entirely \u2014 and the cross-encoder moved it to **rank 1**. It is not a free accuracy upgrade, though, and the measurement is blunt about it. On natural queries the same reranker took MRR from **0.964 down to 0.845**, demoting three relevant documents, one from rank 1 to rank **11**. More candidates did not help: `auth-reset` was demoted to third at fetch 5, 20 *and* 41. A cross-encoder is also a surface-similarity model, and being confident, it overrules a dense ranking that happened to be right.",
  objectives: [
    "Rerank a candidate set and show a promotion that only reranking could achieve",
    "Measure reranking on both query classes rather than in aggregate",
    "Identify and explain the queries it makes worse",
    "State the three things reranking can and cannot do",
    "Choose a candidate count against accuracy and latency"
  ],
  prerequisites: ["6.1", "6.2"],
  blocks: [
    { t: "h2", n: "01", id: "promote", text: "The case it exists for", sub: "Rank 11 to rank 1" },
    { t: "code", lang: "text", title: "Reranking 20 candidates",
      code: "query   : 'Retry-After'\nrelevant: api-limits\n\ndense top 5 of its 20 candidates : ['api-idempotency', 'api-webhooks', 'bill-refund',\n                                    'bill-cancel-order', 'auth-reset']\nafter cross-encoder rerank       : ['api-limits', 'api-idempotency', 'api-webhooks',\n                                    'auth-signin-fail', 'ops-backup']",
      caption: "The relevant document was at candidate rank **11** and is now first." },
    { t: "p", text: "This is the two-stage design working as 5.1 described. Stage one had to fetch 20 for the document to be present at all, and nothing could have promoted it if `fetch_k` had been 5 \u2014 which is the `fetch_k > k` rule from 6.6 arriving for the third time." },
    { t: "h2", n: "02", id: "measured", text: "Measured on both classes", sub: "And it is not an improvement" },
    { t: "table", head: ["config", "nat MRR", "nat R@5", "exact MRR", "exact R@5"], rows: [
      ["dense k=5", "**0.964**", "**1.000**", "0.781", "0.875"],
      ["dense 20 \u2192 rerank 5", "0.845", "0.929", "**1.000**", "**1.000**"]
    ] },
    { t: "callout", kind: "tradeoff", title: "It fixed one class and damaged the other", body: [
      { t: "p", text: "The exact-term class went to a perfect 1.000 on both metrics \u2014 exactly what was bought. The natural class fell from 0.964 to 0.845 on MRR and lost recall outright, from 1.000 to 0.929." },
      { t: "p", text: "An aggregate across both classes would show a small net change and hide two large opposite effects. This is 5.8's stratification rule doing real work: reporting one pooled number here would make a significant regression invisible." }
    ] },
    { t: "h2", n: "03", id: "demote", text: "Where it goes wrong", sub: "Per query, which is the only way to see it" },
    { t: "code", lang: "text", title: "Natural queries whose rank changed",
      code: "query                                   rel  dense  reranked\n'I forgot my password'                  auth 1      3     <- demoted\n'how long before I get signed out'      auth 1      11    <- demoted\n'how long do you keep my information'   data 2      5     <- demoted",
      caption: "Three demotions, none promoted. One went from rank 1 to rank 11." },
    { t: "code", lang: "text", title: "And more candidates do not help",
      code: "query   : 'I forgot my password'\nrelevant: auth-reset\n\ndense top 5      : ['auth-reset', 'auth-signin-fail', ...]   -> auth-reset at rank 1\nreranked from 5  : ['api-idempotency', 'auth-signin-fail', 'auth-reset', ...]  -> rank 3\nreranked from 20 : ['api-idempotency', 'auth-signin-fail', 'auth-reset', ...]  -> rank 3\nreranked from 41 : ['api-idempotency', 'auth-signin-fail', 'auth-reset', ...]  -> rank 3",
      caption: "Identical at every candidate depth, including the entire corpus." },
    { t: "callout", kind: "insight", title: "A cross-encoder reads the same mismatch dense did", body: [
      { t: "p", text: "Dense ranked `auth-reset` **first** and the cross-encoder pushed it to third \u2014 at fetch 5, 20 and 41 alike. More candidates changed nothing, because the candidate set was never the problem." },
      { t: "p", text: "The reason is that a cross-encoder is also a surface-similarity model, just a better-calibrated one. The relevant document says *\u201cCredential recovery \u2026 signed recovery link\u201d* and the query says *\u201cforgot my password\u201d* \u2014 5.4's vocabulary mismatch. The cross-encoder reads that mismatch too, and because it is **confident** it overrules a dense ranking that happened to be right. Better calibration is not the same as better judgement." }
    ] },
    { t: "h2", n: "04", id: "summary", text: "What reranking can and cannot do", sub: "Three statements" },
    { t: "dl", items: [
      ["it can **promote** a document stage one misranked", "`Retry-After`: candidate rank 11 \u2192 1. This is why you buy it."],
      ["it can **demote** a document stage one got right", "`auth-reset`: rank 1 \u2192 3, at every depth. This is why you measure it per query class."],
      ["it can **never retrieve** one stage one missed", "Not in the candidate set means not in the output. 5.1's asymmetry, which no reranker repeals."]
    ] },
    { t: "h2", n: "05", id: "dial", text: "The candidate count is the dial", sub: "Accuracy and latency both scale with it" },
    { t: "code", lang: "text", title: "Varying fetch",
      code: "fetch   exact MRR   nat MRR   latency per query\n5       0.875       0.857     0.421 s\n10      0.875       0.845     0.727 s\n20      1.000       0.845     1.479 s\n41      1.000       0.845     2.308 s",
      caption: "Exact-term accuracy rises to a point; latency keeps rising. Natural MRR never recovers." },
    { t: "p", text: "Latency grows roughly linearly with the candidate count, because the cross-encoder scores every pair \u2014 6.1's per-document cost, now with a knob on it. The accuracy gain stops at 20 here, so 41 is pure cost." },
    { t: "callout", kind: "warn", title: "The natural column does not recover at any depth", body: [
      { t: "p", text: "Every fetch value leaves natural MRR below the 0.964 that dense alone achieved. So the fix for that regression is **not** a bigger candidate set \u2014 it is not reranking those queries at all." },
      { t: "p", text: "Which makes reranking a routing decision rather than a pipeline stage, the same conclusion 6.5 reached about fusion from a different direction. Both techniques help one query class and harm another, and in both cases the remedy is to decide per query rather than to tune a parameter." }
    ] },
    { t: "exercise", kind: "build", title: "Rerank, then find what it broke",
      difficulty: "core", minutes: 32,
      body: "Rerank a candidate set with a real cross-encoder and show a query where the relevant document was promoted from outside the top five. Measure reranking against the baseline on both query classes separately. Then, per query, find every natural query whose relevant document changed rank and identify the demotions. For the clearest demotion, vary the candidate depth and explain the result. Finally sweep the candidate count against accuracy and latency.",
      requirements: ["Show a promotion from outside the top five and give the original candidate rank",
        "Measure MRR and R@5 on both query classes separately",
        "List every natural query whose relevant document changed rank",
        "For one demotion, vary fetch depth and report the rank each time",
        "Explain why more candidates do not help that case",
        "State the three things reranking can and cannot do",
        "Sweep the candidate count reporting accuracy and latency"],
      hint: "Report per query, not in aggregate. The demotions are invisible in a pooled number and they are the interesting half of the result.",
      solution: { lang: "python", title: "x0607.py \u2014 11 to 1, and 1 to 11",
        code: 'ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")\n\ndef rerank(q, kk=5, fetch=20):\n    cand = dense(q, fetch)\n    sc = ce.predict([(q, BY_ID[c].page_content) for c in cand])\n    return [cand[i] for i in np.argsort(-sc)[:kk]]\n\nfor qq, rel in QUERIES:\n    d = dense(qq, 20)\n    r = rerank(qq, 20, 20)\n    t = sorted(rel)[0]\n    a = d.index(t) + 1 if t in d else 0\n    b = r.index(t) + 1 if t in r else 0\n    if a != b:\n        print("%-39s %-6d %-4d %s" % (repr(qq)[:39], a, b,\n                                      "<- demoted" if b > a else ""))',
        out: "==============================================================================\nPART 1 -- reranking a candidate set -- the case it exists for\n==============================================================================\n  query   : 'Retry-After'\n  relevant: api-limits\n\n  dense top 5 of its 20 candidates : ['api-idempotency', 'api-webhooks', 'bill-refund', 'bill-cancel-order', 'auth-reset']\n  after cross-encoder rerank       : ['api-limits', 'api-idempotency', 'api-webhooks', 'auth-signin-fail', 'ops-backup']\n\n  the relevant document sat at rank 11 in the candidate set -- outside\n  the top 5 entirely -- and the reranker moved it to rank 1.\n\n  this is the two-stage design working exactly as 5.1 described: stage\n  one had to fetch 20 to include it, and nothing could have promoted it\n  if fetch had been 5.\n==============================================================================\nPART 2 -- measured on both query classes -- and it is not an improvement\n==============================================================================\n  config                 nat MRR  nat R@5   exact MRR  exact R@5\n  dense k=5              0.964    1.000     0.781      0.875\n  dense 20 -> rerank 5   0.845    0.929     1.000      1.000\n\n  it fixed the exact-term class completely (0.781 -> 1.000) and made the\n  natural class WORSE (0.964 -> 0.845). reranking is not a free\n  accuracy upgrade.\n==============================================================================\nPART 3 -- where it goes wrong, per query\n==============================================================================\n  natural queries whose rank CHANGED after reranking:\n\n  query                                   rel  dense  reranked\n  'I forgot my password'                  auth 1      3     <- demoted\n  'how long before I get signed out'      auth 1      11    <- demoted\n  'how long do you keep my information'   data 2      5     <- demoted\n\n  3 natural queries had their relevant document DEMOTED by the\n  reranker. the clearest case:\n\n    query   : 'I forgot my password'\n    relevant: auth-reset\n    dense top 5      : ['auth-reset', 'auth-signin-fail', 'bill-cancel-trial', 'api-idempotency', 'bill-cancel-sub']\n      -> auth-reset is at rank 1\n    reranked from 5  : ['api-idempotency', 'auth-signin-fail', 'auth-reset', 'bill-cancel-sub', 'bill-cancel-trial']\n      -> auth-reset is at rank 3\n    reranked from 20 : ['api-idempotency', 'auth-signin-fail', 'auth-reset', 'auth-session', 'bill-cancel-sub']\n      -> auth-reset is at rank 3\n    reranked from 41 : ['api-idempotency', 'auth-signin-fail', 'auth-reset', 'auth-session', 'bill-cancel-sub']\n      -> auth-reset is at rank 3\n\n  dense ranked it FIRST and the cross-encoder pushed it to third, at\n  every candidate depth including the whole corpus. more candidates did\n  not help, because the candidate set was never the problem.\n\n  the reason is that a cross-encoder is also a surface-similarity model,\n  just a better-calibrated one. the relevant document says 'Credential\n  recovery ... signed recovery link' and the query says 'forgot my\n  password' -- 5.4's vocabulary mismatch. the cross-encoder reads the\n  mismatch too, and because it is confident it OVERRULES a dense\n  ranking that happened to be right.\n==============================================================================\nPART 4 -- so the honest summary of what reranking does\n==============================================================================\n  it can PROMOTE a document stage one misranked  -- Retry-After, 11 -> 1\n  it can DEMOTE a document stage one got right   -- auth-reset, 1 -> 3\n  it can NEVER retrieve one stage one missed     -- not in the set\n\n  the first is why you buy it; the second is why you measure it per\n  query class instead of trusting an aggregate; the third is 5.1's\n  asymmetry, which no reranker repeals.\n==============================================================================\nPART 5 -- the candidate count is the dial\n==============================================================================\n  fetch   exact MRR   nat MRR   latency per query\n  5       0.875       0.895     0.078 s\n  10      0.875       0.845     0.130 s\n  20      1.000       0.845     0.523 s\n  41      1.000       0.845     2.243 s\n\n  exact-term accuracy rises with the candidate count and latency rises\n  roughly linearly with it, because the cross-encoder scores every pair\n  -- 6.1's per-document cost, now with a knob on it.\n\n  note that the natural-query column does not recover at any depth. the\n  fix for that is not a bigger candidate set; it is not reranking those\n  queries at all, which is a routing decision (6.8).",
        notes: [
          { t: "p", text: "**The case reranking exists for**: `Retry-After`'s relevant document sat at candidate rank 11, outside the top five entirely, and the cross-encoder moved it to rank 1." },
          { t: "p", text: "**Which required fetching 20.** Nothing could have promoted it if fetch had been 5 \u2014 the fetch_k > k rule again." },
          { t: "p", text: "**It fixed the exact-term class to a perfect 1.000 and damaged the natural class**: MRR 0.964 to 0.845, and recall 1.000 to 0.929." },
          { t: "p", text: "**Three natural queries had their relevant document demoted**, none promoted \u2014 including one from rank 1 to rank 11. A pooled metric would have hidden all of it." },
          { t: "p", text: "**More candidates do not help a demotion.** `auth-reset` went from dense rank 1 to reranked rank 3 at fetch 5, 20 AND 41 \u2014 the candidate set was never the problem." },
          { t: "p", text: "**Because a cross-encoder is also a surface-similarity model**, just better calibrated. It reads the same vocabulary mismatch dense did, and being confident it overrules a dense ranking that happened to be right." },
          { t: "p", text: "**So: it can promote a misranked document, it can demote a correctly ranked one, and it can never retrieve one stage one missed.**" },
          { t: "p", text: "**Latency scales roughly linearly with the candidate count** and accuracy stops improving at 20, so 41 is pure cost. The natural-query regression does not recover at any depth, which makes reranking a routing decision rather than a stage." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the reranker that improved the benchmark and broke production", body: [
      { t: "p", text: "A team adds a cross-encoder reranker, sees their benchmark MRR rise, and ships. Support quality on common questions gets worse while the team's dashboard shows an improvement." },
      { t: "p", text: "Their benchmark over-represented precise, technical queries \u2014 the class where reranking gave a perfect 1.000 here. Real users mostly ask vaguely worded questions, which is the class where the same reranker cost 0.12 of MRR and pushed one relevant document from rank 1 to rank 11." },
      { t: "p", text: "What makes this specific failure hard to catch is that the reranker is not malfunctioning on those queries \u2014 it is confidently disagreeing. There is no error, no low score, no flag; the ordering is simply worse. The only detection is measuring per query class and comparing against the pipeline without the stage, which is also the only way to discover that the right answer is to route rather than to tune." }
    ] }
  ],
  takeaways: [
    "**Reranking promoted `Retry-After`'s relevant document from candidate rank 11 to rank 1.**",
    "**Which required fetching 20** \u2014 nothing could promote it from a candidate set of 5.",
    "**It fixed the exact-term class to 1.000 and damaged the natural class**: MRR 0.964 to 0.845.",
    "**And lost recall outright on natural queries**, 1.000 to 0.929.",
    "**Three natural queries were demoted and none promoted**, one from rank 1 to rank 11.",
    "**An aggregate across both classes hides two large opposite effects.**",
    "**More candidates do not fix a demotion** \u2014 `auth-reset` was third at fetch 5, 20 and 41 alike.",
    "**Because a cross-encoder is also a surface-similarity model**, just better calibrated.",
    "**It reads the same vocabulary mismatch dense did, and confidently overrules a correct ranking.**",
    "**Better calibration is not better judgement.**",
    "**It can promote a misranked document, demote a correct one, and never retrieve a missing one.**",
    "**Latency scales roughly linearly with candidate count**; accuracy stopped improving at 20, so 41 is pure cost.",
    "**The natural-query regression does not recover at any depth**, so reranking is a routing decision."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Reranking took exact-term MRR from 0.781 to 1.000 and natural MRR from 0.964 to 0.845. What should be reported?",
      options: ["The aggregate, since it reflects overall system quality",
        "Both classes separately \u2014 a pooled figure shows a small net change and hides two large opposite effects",
        "Only the improvement, since the regression is within noise",
        "The average weighted by query frequency"],
      answer: 1,
      why: "Two large effects in opposite directions partly cancel when pooled, so an aggregate would suggest a modest improvement while concealing both a perfect fix and a real regression. Each is a decision someone needs to make knowingly, and in this case the right response is to route queries rather than accept either effect \u2014 a conclusion no pooled number would suggest." },
    { stem: "A relevant document ranked first by dense is demoted to third by the reranker at fetch 5, 20 and 41. What does the depth-independence tell you?",
      options: ["The candidate set is too small and should be the whole corpus",
        "The candidate set was never the problem \u2014 the cross-encoder genuinely scores that document lower",
        "The reranker is non-deterministic",
        "The document is a near-duplicate of a higher-scoring one"],
      answer: 1,
      why: "If a bigger pool does not change the outcome, the missing-candidate explanation is ruled out: the model has seen the document at every depth and ranked it third each time. The cause is that a cross-encoder is also a surface-similarity model, so it reads the same vocabulary mismatch dense did \u2014 and being confident, it overrules a dense ranking that happened to be right." },
    { stem: "Which statement about reranking is false?",
      options: ["It can promote a document stage one misranked",
        "It can retrieve a relevant document stage one missed, given enough candidates",
        "It can demote a document stage one ranked correctly",
        "Its latency scales with the candidate count"],
      answer: 1,
      why: "A reranker only reorders the candidate set it is given, so a document absent from that set cannot appear in the output \u2014 5.1's asymmetry, which no reranker repeals. Raising the candidate count toward the corpus size blurs this in practice, but that is precisely the configuration the cost structure forbids: at 68 ms per pair, scoring a corpus is not available." },
    { stem: "Natural MRR stayed at 0.845 at every candidate depth, below dense's 0.964. What follows?",
      options: ["The candidate count should be raised further",
        "The fix is not a bigger candidate set \u2014 it is not reranking those queries at all",
        "The reranker model should be replaced with a larger one",
        "Dense retrieval should be replaced by the reranker entirely"],
      answer: 1,
      why: "A parameter that has no effect on a regression cannot be the remedy for it. Since the reranker helps one query class decisively and harms another at every setting, the decision has to be made per query rather than per pipeline \u2014 making reranking a routing decision. That is the same conclusion rank fusion reached in 6.5 from a different direction." }
  ] },
  interview: { title: "Interview practice", sub: "Cross-encoder reranking", questions: [
    { level: "core", q: "What does a reranker buy you?",
      strong: "A strong answer names the promotion case and the cost honestly.",
      answer: [
        { t: "p", text: "It reorders a candidate set with a much more accurate model than the one that fetched it, so it can rescue documents stage one ranked badly." },
        { t: "p", text: "The clearest case I measured: a query for an HTTP header name had its relevant document sitting at candidate rank 11, well outside the top five, and the cross-encoder moved it to rank 1. That is impossible without reranking, and it is also impossible if you fetch only five candidates \u2014 so fetch_k greater than k is a precondition, not a tuning choice." },
        { t: "p", text: "The cost is per query and scales with the candidate count, because the cross-encoder scores every query-document pair and has nothing to precompute. I measured roughly 68 ms per pair, so the candidate count is the dial that prices the stage." },
        { t: "p", text: "And I would not describe it as a free accuracy upgrade, because in my measurements it was not one. It fixed one query class perfectly and cost about 0.12 of MRR on another." }
      ] },
    { level: "advanced", q: "Can a reranker make retrieval worse?",
      strong: "A strong answer has a measured demotion and the reason.",
      answer: [
        { t: "p", text: "Yes, and I think this is underappreciated. On natural-language queries a cross-encoder took my MRR from 0.964 down to 0.845, and it cost recall outright \u2014 1.000 to 0.929." },
        { t: "p", text: "Looking per query, three relevant documents were demoted and none promoted. One went from dense rank 1 to reranked rank 11." },
        { t: "p", text: "The informative part is that more candidates did not help. For the clearest case, dense had the relevant document at rank 1 and the reranker put it third at fetch 5, at fetch 20, and at the entire corpus. So the candidate set was never the problem \u2014 the model has seen that document at every depth and scored it lower every time." },
        { t: "p", text: "The reason is that a cross-encoder is also a surface-similarity model, just a better-calibrated one. The query said 'forgot my password' and the document said 'credential recovery, signed recovery link' \u2014 a vocabulary mismatch. Dense happened to bridge it; the cross-encoder read the same mismatch and, being confident, overruled a ranking that was right. Better calibration is not better judgement." },
        { t: "p", text: "So I treat reranking as a routing decision rather than a pipeline stage, measure it per query class against the pipeline without it, and never report a pooled number \u2014 because two large opposite effects partly cancel and the regression disappears." }
      ] },
    { level: "core", q: "How would you choose the candidate count for a reranker?",
      strong: "A strong answer measures both accuracy and latency, and knows where each stops.",
      answer: [
        { t: "p", text: "By sweeping it and watching two curves \u2014 accuracy, which plateaus, and latency, which does not." },
        { t: "p", text: "On my measurements exact-term MRR went 0.875 at fetch 5 and 10, then 1.000 at 20 and stayed there at 41. Latency went 0.42, 0.73, 1.48 and 2.31 seconds, roughly linear, because the cross-encoder scores every pair. So 20 was the answer and 41 was a second of extra latency per query for no accuracy at all." },
        { t: "p", text: "The reason to sweep rather than reason about it is that the plateau depends on how badly stage one misranks things. My best case was a document at candidate rank 11 being promoted to rank 1 \u2014 so fetch had to exceed 11 for that query to work, and there is no way to know that number in advance." },
        { t: "p", text: "One thing the sweep will not fix: the natural-query regression stayed at 0.845 at every depth, below the 0.964 dense achieved alone. A parameter that has no effect on a regression is not the remedy for it, so that part is a routing decision \u2014 do not rerank those queries." },
        { t: "p", text: "And if latency is tight, the cheaper lever is a narrowing stage in front of the reranker rather than a smaller fetch. Cutting 20 candidates to 8 with a few dot products saved me about 0.8 seconds without giving up the wide initial fetch." }
      ] }
  ] }
});
