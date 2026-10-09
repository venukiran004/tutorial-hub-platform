EC.receiveLesson({
  id: "7.2",
  lede: "The first thing the measurement says about query transformation is where it is *not* needed: the 14 natural queries from module 5 are already answered at MRR 0.964. Dense retrieval handles ordinary phrasing. The real failures are **vague, colloquial** queries \u2014 `I want out`, `the robot keeps emailing me`, `make it stop` \u2014 which sit at MRR 0.250. Rewriting fixes all eight, to a perfect 1.000. Then the honest part: **I wrote those rewrites while looking at the corpus.** Rewrites a model would produce blind land 2 times in 5 on one query and **0 times in 5** on the other. And the multi-query union that is supposed to rescue that is *worse than its own best member* \u2014 1.00 down to 0.50.",
  objectives: [
    "Identify which query classes actually need transformation",
    "Measure rewriting and state precisely what it changes",
    "Quantify the circularity in evaluating your own rewrites",
    "Show that a multi-query union can degrade precision",
    "Place the transformation decision where it costs least"
  ],
  prerequisites: ["7.1", "6.2"],
  blocks: [
    { t: "h2", n: "01", id: "whichfail", text: "Which queries actually fail", sub: "Not the ones you would guess" },
    { t: "code", lang: "text", title: "The eight genuine failures",
      code: "rr    query                          top 3\n0.00  'I want out'                   ['bill-cancel-order', 'user-remove', 'intg-oauth']\n0.00  'the robot keeps emailing me'  ['bill-cancel-order', 'auth-email', 'bill-cancel-sub']\n0.00  'Retry-After'                  ['api-idempotency', 'api-webhooks', 'bill-refund']\n0.25  'where is my money'            ['bill-overage', 'bill-payment-method', 'bill-tax']\n0.25  'WebAuthn'                     ['intg-webhook-out', 'api-auth', 'intg-oauth']\n0.50  \"I can't get in\"               ['auth-reset', 'auth-signin-fail', 'user-invite']\n0.50  'make it stop'                 ['bill-cancel-sub', 'ops-cancel-report', ...]\n0.50  'who can see my data'          ['user-roles', 'data-residency', 'ops-status']\n\nMRR over these 8: 0.250",
      caption: "Vague and colloquial queries, plus 6.2's exact terms. Not ordinary questions." },
    { t: "callout", kind: "insight", title: "Measure whether you need it before adding it", body: [
      { t: "p", text: "The 14 natural queries \u2014 *\u201chow long do you keep my information\u201d*, *\u201cwhen do I get my money back\u201d* \u2014 score MRR 0.964 untransformed. Query rewriting has nothing to contribute there, and it would add a model call to every one of them." },
      { t: "p", text: "`I want out` is the instructive failure: it wants the **subscription** cancellation document and gets the **order** cancellation document. That is 5.8's near-duplicate problem reached from a query too vague to distinguish them \u2014 so the transformation is doing disambiguation, not translation." }
    ] },
    { t: "h2", n: "02", id: "rewrite", text: "Rewriting", sub: "And what it actually changes" },
    { t: "code", lang: "text", title: "All eight fixed",
      code: "rr before -> after    rewritten to\n0.00 -> 1.00           'I want out'          cancel my subscription auto-renewal\n0.00 -> 1.00           'the robot keeps...'  disable outgoing webhook notifications\n0.00 -> 1.00           'Retry-After'         Retry-After header rate limit 429\n0.25 -> 1.00           'where is my money'   refund processing time\n...\nMRR: 0.250 -> 1.000",
      caption: "A rewrite is a model call, so the rewritten text is scripted here." },
    { t: "p", text: "The mechanism matters more than the number. The rewrite added **no information** \u2014 it replaced the user's words with the *document's* words. `the robot keeps emailing me` became `disable outgoing webhook notifications`, which works because `intg-webhook-out` uses the word *webhook*." },
    { t: "callout", kind: "warn", title: "And I wrote those rewrites while looking at the corpus", body: [
      { t: "p", text: "Which makes the 1.000 an upper bound rather than a result. Replacing a query with the document's own vocabulary is only possible if you know that vocabulary, and I did." },
      { t: "p", text: "This is worth being blunt about because it is the standard way query-transformation demos mislead. The rewrite is evaluated by the person who chose it, against the corpus they chose it for." }
    ] },
    { t: "h2", n: "03", id: "circular", text: "The circularity, measured", sub: "What a blind rewriter produces" },
    { t: "code", lang: "text", title: "Rewrites made without seeing the corpus",
      code: "'I want out'  (baseline 0.00, informed rewrite 1.00)\n   rr=0.50  cancel my account         top1=bill-cancel-trial\n   rr=0.50  how do I leave            top1=bill-cancel-order\n   rr=1.00  unsubscribe me            top1=bill-cancel-sub\n   rr=1.00  close my account          top1=bill-cancel-sub\n   rr=0.50  I want to quit            top1=bill-cancel-trial\n   -> 2 of 5 blind variants landed on rank 1\n\n'the robot keeps emailing me'  (baseline 0.00, informed rewrite 1.00)\n   rr=0.00  stop automated emails     top1=bill-cancel-order\n   rr=0.00  turn off notifications    top1=ops-status\n   rr=0.00  unsubscribe from alerts   top1=intg-slack\n   rr=0.00  too many automated...     top1=auth-signin-fail\n   rr=0.00  disable email alerts      top1=ops-status\n   -> 0 of 5 blind variants landed on rank 1",
      caption: "**Zero of five** on the second query." },
    { t: "callout", kind: "trap", title: "A rewriter that knows the corpus is doing retrieval's job", body: [
      { t: "p", text: "No plausible paraphrase of *\u201cthe robot keeps emailing me\u201d* contains the word *webhook*. A user who does not know the term cannot produce it, and neither can a model that has not seen the corpus \u2014 so every blind variant retrieved something else." },
      { t: "p", text: "So the gain from rewriting is real and bounded by how well the rewriter can guess vocabulary it has not seen. And you cannot tell in advance which guesses land, which is the honest argument for multi-query: issue several and hope one is right." }
    ] },
    { t: "h2", n: "04", id: "multiquery", text: "Multi-query", sub: "And the union is not free" },
    { t: "code", lang: "text", title: "Union of five variants",
      code: "'I want out'\n   best single variant : rr=1.00\n   union of 5 variants : 7 docs, rr=0.50\n   recall of the union : 1.00",
      caption: "The union is **worse** than one of its own members." },
    { t: "callout", kind: "insight", title: "A union has no ranking", body: [
      { t: "p", text: "Pooling preserves insertion order, so the five results of variant 1 occupy the top of the list regardless of quality \u2014 and the relevant document that variant 3 found at rank 1 lands behind them. Recall went to 1.00 and reciprocal rank **halved**." },
      { t: "p", text: "So multi-query improves recall and can degrade precision. It does not solve the problem; it **converts a recall failure into a ranking problem**, which is a good trade only because 5.1's asymmetry says ranking problems are recoverable. It therefore *requires* a reranker downstream (6.7), and without one it can leave you worse off than a single lucky rewrite." }
    ] },
    { t: "p", text: "In practice the fix is to fuse rather than concatenate: 6.5's reciprocal rank fusion over the variants' result lists gives the union an ordering, and each variant's rank-1 document competes properly. Which is the same machinery, applied to query variants instead of to retrievers." },
    { t: "h2", n: "05", id: "hyde", text: "HyDE", sub: "Embed a hypothetical answer instead of the question" },
    { t: "p", text: "The idea rests on 5.4's asymmetry: a question and its answer are different kinds of text, so generate a plausible answer and embed **that**, because an answer looks more like a document than a question does. Measured here, it fixes both test queries \u2014 and I wrote the hypothetical documents too, so the same caveat applies in full." },
    { t: "callout", kind: "trap", title: "The failure mode is in the name", body: [
      { t: "p", text: "The hypothesis is *hypothetical*. The model invents an answer, which may be wrong, and you then retrieve documents similar to the invented answer \u2014 so a confidently wrong hypothesis retrieves confidently wrong documents." },
      { t: "p", text: "The error is amplified rather than detected, because HyDE has no mechanism for noticing its hypothesis was false. It is the one technique in this lesson that can make retrieval worse in a way the retrieval metrics will reward, since the retrieved documents genuinely do match the (wrong) hypothesis." }
    ] },
    { t: "h2", n: "06", id: "cost", text: "The cost, and where to put the decision", sub: "7.1 supplies the mechanism" },
    { t: "table", head: ["technique", "extra model calls", "extra retrievals", "latency shape"], rows: [
      ["rewrite", "1", "0 (replaces)", "+1 round trip"],
      ["multi-query", "1", "n\u22121", "+1 round trip, n searches"],
      ["decomposition", "1 + 1 per sub-question", "n", "**serial** if dependent"],
      ["HyDE", "1 (longer output)", "0 (replaces)", "+1 round trip, more tokens"]
    ] },
    { t: "callout", kind: "mental", title: "Retrieve first, transform only on failure", body: [
      { t: "p", text: "Every one of these adds at least one model call **before** retrieval, so it sits on the critical path for every query \u2014 including the 14 natural queries already answered at MRR 0.964 that needed no help at all." },
      { t: "p", text: "7.1's guard is what makes the better pattern possible: retrieve, check the signal, and transform only when the guard says retrieval failed. The guard measured AUC 0.943, so this is a decision that can actually be made \u2014 which is exactly why the guard comes before this lesson rather than after it." }
    ] },
    { t: "diagram", kind: "matrix", title: "Where query transformation is NOT needed",
      caption: "Dense retrieval already handles ordinary phrasing at MRR 0.964, so rewriting those queries is cost without benefit. The real failures are vague and colloquial — and a **blind** rewrite, done without seeing the corpus, scored **0/5** on one of them.",
      cols: ["baseline", "after rewriting"],
      rows: ["14 natural queries", "a vague colloquial query", "a blind rewrite", "the union of variants"],
      cells: [
        [{ text: "MRR 0.964", tone: "good" }, { text: "no gain — pure cost", tone: "warn" }],
        [{ text: "fails", tone: "crit" }, { text: "this is the real case", tone: "good" }],
        [{ text: "—", tone: "warn" }, { text: "0 of 5 — worse", tone: "crit" }],
        [{ text: "—", tone: "warn" }, { text: "worse than its best member", tone: "crit" }]
      ] },
    { t: "exercise", kind: "build", title: "Measure query transformation honestly",
      difficulty: "core", minutes: 32,
      body: "Find the queries your retriever genuinely fails, and note which classes they belong to. Rewrite them into the corpus's vocabulary and measure the gain. Then quantify the circularity: produce rewrites a model would generate without having seen the corpus, and measure how many land. Union several variants and compare the union against its best member. Finally tabulate what each technique costs and say where the decision belongs.",
      requirements: ["Identify genuinely failing queries and report the baseline MRR",
        "Note which query classes fail and which do not",
        "Rewrite into the corpus's vocabulary and report the gain",
        "State explicitly that the rewrites were written with knowledge of the corpus",
        "Produce corpus-blind rewrites and report how many land on rank 1",
        "Union several variants and compare against the best single variant",
        "Tabulate the cost of each technique and place the decision"],
      hint: "After measuring your own rewrites, write the rewrites a model would produce blind and measure those too. The difference between the two numbers is the honest result.",
      solution: { lang: "python", title: "x0702.py \u2014 0 of 5 blind variants landed",
        code: '# corpus-informed rewrites -- the upper bound\nfor q, rw, rel in FAIL:\n    print("%.2f -> %.2f  %s" % (rr(dense(q, 5), rel), rr(dense(rw, 5), rel), q))\n\n# corpus-BLIND rewrites -- what a model would actually produce\nblind = {"the robot keeps emailing me":\n         ["stop automated emails", "turn off notifications",\n          "unsubscribe from alerts", "too many automated messages",\n          "disable email alerts"]}\nfor q, vs in blind.items():\n    union = []\n    for v in vs:\n        g = dense(v, 5)\n        print("   rr=%.2f  %-30s top1=%s" % (rr(g, {"intg-webhook-out"}), v, g[0]))\n        for d in g:\n            if d not in union:\n                union.append(d)\n    print("   union: %d docs, rr=%.2f" % (len(union), rr(union, {"intg-webhook-out"})))',
        out: "==============================================================================\nPART 1 -- the queries a plain retriever actually fails\n==============================================================================\n  note which queries these are. the 14 natural queries from module 5\n  are all answered at MRR 0.964 -- dense retrieval handles ordinary\n  phrasing well. the failures are VAGUE and COLLOQUIAL queries, plus\n  the exact terms from 6.2.\n\n  rr    query                          top 3\n  0.00  'I want out'                   ['bill-cancel-order', 'user-remove', 'intg-oauth']\n  0.25  'where is my money'            ['bill-overage', 'bill-payment-method', 'bill-tax']\n  0.00  'the robot keeps emailing me'  ['bill-cancel-order', 'auth-email', 'bill-cancel-sub']\n  0.50  \"I can't get in\"               ['auth-reset', 'auth-signin-fail', 'user-invite']\n  0.50  'make it stop'                 ['bill-cancel-order', 'bill-cancel-sub', 'ops-cancel-report']\n  0.50  'who can see my data'          ['user-roles', 'data-residency', 'ops-status']\n  0.00  'Retry-After'                  ['api-idempotency', 'api-webhooks', 'bill-refund']\n  0.25  'WebAuthn'                     ['intg-webhook-out', 'api-auth', 'intg-oauth']\n\n  MRR over these 8: 0.250\n\n  'I want out' wants the subscription cancellation document and gets\n  the ORDER cancellation document -- 5.8's near-duplicates, reached\n  from a query too vague to distinguish them.\n==============================================================================\nPART 2 -- rewriting into the corpus's vocabulary\n==============================================================================\n  a rewrite is a MODEL CALL, so the rewritten text here is scripted\n  (the course's execution model: real machinery, scripted tokens).\n\n  rr before -> after    rewritten to\n  0.00 -> 1.00           'I want out'                   cancel my subscription auto-renewa\n  0.25 -> 1.00           'where is my money'            refund processing time when will I\n  0.00 -> 1.00           'the robot keeps emailing me'  disable outgoing webhook notificat\n  0.50 -> 1.00           \"I can't get in\"               sign-in failure account locked rep\n  0.50 -> 1.00           'make it stop'                 cancel subscription stop auto-rene\n  0.50 -> 1.00           'who can see my data'          data residency where data is store\n  0.00 -> 1.00           'Retry-After'                  Retry-After header rate limit 429 \n  0.25 -> 1.00           'WebAuthn'                     WebAuthn security key multi-factor\n\n  MRR: 0.250 -> 1.000\n\n  all eight fixed. and the mechanism matters more than the number: the\n  rewrite added no information, it replaced the user's words with the\n  DOCUMENT'S words.\n\n  which is only possible if you know them -- and I wrote these\n  rewrites while looking at the corpus. that is not a demonstration\n  of query rewriting, it is a demonstration of the upper bound.\n==============================================================================\nPART 3 -- the circularity, measured\n==============================================================================\n  a rewriter that knows the corpus's vocabulary is doing retrieval's\n  job. a rewriter that does not know it is guessing. so here are\n  rewrites a general-purpose model would plausibly produce WITHOUT\n  having seen the corpus.\n\n  'I want out'  (baseline rr=0.00, informed rewrite rr=1.00)\n     rr=0.50  cancel my account              top1=bill-cancel-trial\n     rr=0.50  how do I leave                 top1=bill-cancel-order\n     rr=1.00  unsubscribe me                 top1=bill-cancel-sub\n     rr=1.00  close my account               top1=bill-cancel-sub\n     rr=0.50  I want to quit                 top1=bill-cancel-trial\n     -> 2 of 5 blind variants landed on rank 1\n\n  'the robot keeps emailing me'  (baseline rr=0.00, informed rewrite rr=1.00)\n     rr=0.00  stop automated emails          top1=bill-cancel-order\n     rr=0.00  turn off notifications         top1=ops-status\n     rr=0.00  unsubscribe from alerts        top1=intg-slack\n     rr=0.00  too many automated messages    top1=auth-signin-fail\n     rr=0.00  disable email alerts           top1=ops-status\n     -> 0 of 5 blind variants landed on rank 1\n\n  the first query: 2 of 5 guesses land. the second: ZERO of 5 -- every\n  variant retrieves something else, because no plausible paraphrase of\n  'the robot keeps emailing me' contains the word 'webhook'.\n\n  so the gain from rewriting is real and it is bounded by how well the\n  rewriter can guess vocabulary it has not seen. you cannot tell in\n  advance which guesses land, which is the honest argument for\n  multi-query: issue several and hope one is right.\n==============================================================================\nPART 4 -- multi-query -- and the union is not free\n==============================================================================\n  union the results of several variants, so one good guess suffices.\n\n  'I want out'\n     best single variant : rr=1.00\n     union of 5 variants : 7 docs, rr=0.50\n     recall of the union : 1.00\n\n  'the robot keeps emailing me'\n     best single variant : rr=0.00\n     union of 5 variants : 10 docs, rr=0.00\n     recall of the union : 0.00\n\n  the first query is the instructive one. the best single variant\n  scored 1.00 and the UNION scores 0.50 -- the union is worse than\n  one of its own members.\n\n  the reason is that a union has no ranking. pooling preserves\n  insertion order, so documents from the first variant occupy the top\n  regardless of quality, and the relevant document found at rank 1 by\n  variant 3 lands behind variant 1's five results.\n\n  so multi-query improves RECALL and can degrade PRECISION. it does\n  not solve the problem, it converts a recall failure into a ranking\n  problem -- which is a good trade only because 5.1's asymmetry says\n  ranking problems are recoverable. it REQUIRES a reranker downstream\n  (6.7), and without one it can leave you worse off than a single\n  lucky rewrite.\n==============================================================================\nPART 5 -- HyDE -- embed a hypothetical answer instead of the question\n==============================================================================\n  the idea rests on 5.4's asymmetry: a question and its answer are\n  different kinds of text. so generate a fake answer and embed THAT,\n  because an answer looks more like a document than a question does.\n\n  rr before -> after   query\n  0.00 -> 1.00          'I want out'\n  0.00 -> 1.00          'the robot keeps emailing me'\n\n  both fixed -- and note what I did again: I wrote a hypothetical\n  document containing the corpus's vocabulary. a real model writing\n  blind would produce the same guesses measured in part 3.\n\n  and the failure mode is in the name. the model invents an answer,\n  which may be wrong, and you then retrieve documents similar to the\n  invented answer -- so a confidently wrong hypothesis retrieves\n  confidently wrong documents, and the error is amplified rather than\n  detected. HyDE has no way to notice that its hypothesis was false.\n==============================================================================\nPART 6 -- the cost, and where to put the decision\n==============================================================================\n  technique       extra model calls   extra retrievals   latency shape\n  rewrite         1                   0 (replaces)       +1 round trip\n  multi-query     1                   n-1                +1 round trip, n searches\n  decomposition   1 + 1 per sub-q     n                  SERIAL if dependent\n  HyDE            1 (longer output)   0 (replaces)       +1 round trip, more tokens\n\n  every one adds at least one model call BEFORE retrieval, so it is on\n  the critical path for every query -- including the 14 natural queries\n  that were already answered at MRR 0.964 and needed no help at all.\n\n  which is the design conclusion, and 7.1 supplies the mechanism:\n  retrieve first, check the guard, and transform ONLY when the guard\n  says retrieval failed. that pays the latency on the queries that\n  need it and not on the ones that do not.\n\n  7.1 measured the guard signal at AUC 0.943, so this is a decision\n  that can actually be made -- which is the whole reason the guard\n  comes before this lesson rather than after it.",
        notes: [
          { t: "p", text: "**The 14 natural queries are already at MRR 0.964** \u2014 dense handles ordinary phrasing, so transformation has nothing to contribute there and would cost a model call on each." },
          { t: "p", text: "**The real failures are vague and colloquial queries plus exact terms**, at MRR 0.250. `I want out` wants the subscription cancellation and gets the order cancellation \u2014 disambiguation, not translation." },
          { t: "p", text: "**Corpus-informed rewrites fixed all eight, to MRR 1.000** \u2014 and the rewrite added no information, it replaced the user's words with the document's words." },
          { t: "p", text: "**Which I could only do because I was looking at the corpus.** That makes 1.000 an upper bound, and it is the standard way these demos mislead." },
          { t: "p", text: "**Blind rewrites: 2 of 5 land on one query and 0 of 5 on the other.** No plausible paraphrase of \u2018the robot keeps emailing me\u2019 contains the word \u2018webhook\u2019." },
          { t: "p", text: "**The multi-query union scored 0.50 where its best member scored 1.00.** A union has no ranking \u2014 pooling preserves insertion order, so variant 1's results occupy the top and variant 3's correct rank-1 lands behind them." },
          { t: "p", text: "**So multi-query improves recall and degrades precision**, converting a recall failure into a ranking problem. It requires a reranker downstream, or RRF over the variants to give the union an ordering." },
          { t: "p", text: "**Every technique adds a model call before retrieval**, on the critical path for queries that needed no help \u2014 so gate it behind 7.1's guard and transform only on failure." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the rewriter that was evaluated by its author", body: [
      { t: "p", text: "A team adds query rewriting, demonstrates it on a handful of queries they wrote rewrites for, and reports a large improvement. In production the gain is a fraction of what the demo showed, and latency is up on every query." },
      { t: "p", text: "Their demo rewrites were written by someone who knew the corpus, so they measured the ceiling rather than the technique. Measured blind, rewrites landed on two of five attempts for one query and none of five for another \u2014 because the decisive term was a word no user or general model would produce." },
      { t: "p", text: "Two corrections follow. Generate the rewrites the way production will \u2014 from a model, with the prompt you will ship, and never hand-written. And gate the transformation behind a retrieval-quality check, so the latency lands on the queries that need it instead of on all of them. The second change is what makes the first affordable, since a technique that helps a tenth of queries is worth having only if it costs nothing on the other nine." }
    ] }
  ],
  takeaways: [
    "**Measure which queries fail before adding transformation** \u2014 the 14 natural queries were already at MRR 0.964.",
    "**The real failures are vague, colloquial queries plus exact terms**, at MRR 0.250.",
    "**`I want out` retrieves the order cancellation instead of the subscription one** \u2014 disambiguation, not translation.",
    "**Corpus-informed rewrites fixed all eight to MRR 1.000.**",
    "**A rewrite adds no information** \u2014 it replaces the user's words with the document's words.",
    "**Which is only possible if you know them, and I did** \u2014 so 1.000 is an upper bound, not a result.",
    "**Blind rewrites landed 2 of 5 on one query and 0 of 5 on the other.**",
    "**Because no plausible paraphrase of \u2018the robot keeps emailing me\u2019 contains \u2018webhook\u2019.**",
    "**The multi-query union scored 0.50 where its best member scored 1.00** \u2014 a union has no ranking.",
    "**So multi-query improves recall and degrades precision**, converting a recall failure into a ranking problem.",
    "**It requires a reranker downstream**, or RRF over the variants to give the union an ordering.",
    "**HyDE's failure is in its name** \u2014 a wrong hypothesis retrieves documents that genuinely match it.",
    "**Every technique adds a model call before retrieval**, on the critical path for every query.",
    "**So gate transformation behind 7.1's guard** and pay the latency only on the queries that need it."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Which query class most needed transformation in these measurements?",
      options: ["Ordinary natural-language questions",
        "Vague, colloquial queries and rare exact terms \u2014 ordinary phrasing was already at MRR 0.964",
        "Long multi-part questions",
        "Queries containing negation"],
      answer: 1,
      why: "Dense retrieval handled the 14 natural questions well, so transformation would add a model call for no gain there. The failures were queries like 'I want out' and 'the robot keeps emailing me' \u2014 too vague to distinguish near-duplicate documents \u2014 plus the exact terms from 6.2. Knowing which class fails is what decides whether the technique is worth its latency at all." },
    { stem: "Why is evaluating your own hand-written rewrites misleading?",
      options: ["Hand-written rewrites are shorter than generated ones",
        "You write them knowing the corpus's vocabulary, so you measure the ceiling rather than what a blind rewriter achieves",
        "They cannot be reproduced in production code",
        "They introduce selection bias in the query set"],
      answer: 1,
      why: "A rewrite works by replacing the user's words with the document's words, which requires knowing those words. Measured blind, rewrites landed on 2 of 5 attempts for one query and 0 of 5 for another, because the decisive term was one no user or general model would produce. The honest evaluation generates rewrites from the model and prompt you will actually ship." },
    { stem: "A multi-query union scored rr=0.50 where its best single variant scored 1.00. Why?",
      options: ["The union contained a duplicate that displaced the relevant document",
        "A union has no ranking \u2014 pooling preserves insertion order, so the first variant's results occupy the top",
        "Recall and reciprocal rank cannot both improve",
        "The variants retrieved disjoint document sets"],
      answer: 1,
      why: "Recall went to 1.00, so the relevant document was present; what changed is its position. Concatenating result lists puts variant 1's five documents ahead of everything else regardless of quality, so a correct rank-1 from variant 3 lands sixth. The remedy is rank fusion over the variants rather than concatenation, or a reranker downstream." },
    { stem: "Where should the decision to transform a query be made?",
      options: ["Always, before retrieval, since it only helps",
        "After a retrieval-quality check, so the extra model call lands only on queries that failed",
        "In the prompt, by asking the model to rephrase if needed",
        "At index time, by expanding documents instead"],
      answer: 1,
      why: "Every transformation technique adds at least one model call before retrieval, placing it on the critical path for every query \u2014 including the majority already answered well. 7.1's guard measured AUC 0.943 at separating answerable from unanswerable retrieval, which is good enough to route on, so you can retrieve first and transform only when the guard says retrieval failed." }
  ] },
  interview: { title: "Interview practice", sub: "Query transformation", questions: [
    { level: "core", q: "When would you add query rewriting to a RAG system?",
      strong: "A strong answer measures which queries fail first.",
      answer: [
        { t: "p", text: "After measuring which queries actually fail, because in my case it was not the ones I expected." },
        { t: "p", text: "The ordinary natural-language questions were already at MRR 0.964 \u2014 dense retrieval handles normal phrasing fine. The failures were vague, colloquial queries like 'I want out' and 'the robot keeps emailing me', sitting at 0.250, plus rare exact terms." },
        { t: "p", text: "That matters because transformation adds a model call before retrieval, so it is on the critical path for every query including the large majority that needed no help. If it only rescues a tenth of traffic, it is worth having only if it costs nothing on the other nine tenths." },
        { t: "p", text: "So I would gate it behind a retrieval-quality check: retrieve, look at the guard signal, and transform only on failure. I measured that guard at AUC 0.943 separating answerable from unanswerable retrieval, which is good enough to route on." }
      ] },
    { level: "advanced", q: "What is the catch with query rewriting?",
      strong: "A strong answer names the circularity and has measured it.",
      answer: [
        { t: "p", text: "It is circular, and the circularity is easy to hide from yourself. A rewrite works by replacing the user's words with the document's words \u2014 which requires knowing the document's words." },
        { t: "p", text: "When I measured it, hand-written rewrites fixed all eight failing queries, taking MRR from 0.250 to a perfect 1.000. But I wrote those rewrites while looking at the corpus, so what I had measured was the ceiling, not the technique." },
        { t: "p", text: "So I wrote the rewrites a general model would plausibly produce blind. For one query, two of five variants landed on the right document. For the other, zero of five \u2014 because the decisive term was 'webhook', and no plausible paraphrase of 'the robot keeps emailing me' contains it. Neither a user nor a model that has not seen the corpus can produce that word." },
        { t: "p", text: "The usual answer is multi-query \u2014 issue several variants and union them, so one good guess suffices. That has its own catch, which I also measured: the union scored 0.50 where its best single variant scored 1.00, because concatenation has no ranking and the first variant's results occupy the top. So multi-query converts a recall failure into a ranking problem. That is a reasonable trade since ranking problems are recoverable, but it requires fusing the variants properly or putting a reranker after it." }
      ] },
    { level: "core", q: "How would you decide between rewriting, multi-query and HyDE?",
      strong: "A strong answer prices each and notes they share a failure.",
      answer: [
        { t: "p", text: "They all have the same underlying limit, so I would choose mostly on cost and on how much ranking damage I can absorb." },
        { t: "p", text: "A single rewrite is the cheapest: one model call, and it replaces the query rather than adding retrievals. It is also the most brittle, because it is one guess at vocabulary the rewriter may not know \u2014 measured blind, mine landed two times in five on one query and zero in five on another." },
        { t: "p", text: "Multi-query buys robustness with that brittleness in mind: several variants, so one good guess suffices. It costs n searches and it degrades precision \u2014 I measured a union scoring 0.50 where its best member scored 1.00, because concatenation has no ranking. So I would only use it with rank fusion over the variants or a reranker after it." },
        { t: "p", text: "HyDE is the one I would be most cautious about, because its failure is silent and self-reinforcing. It invents an answer and retrieves documents similar to the invention, so a wrong hypothesis retrieves documents that genuinely match it \u2014 and the retrieval metrics reward that." },
        { t: "p", text: "Decomposition is the expensive one and the only one that addresses a different problem: a question with several parts. If the sub-questions are dependent it is serial, so the latency is additive rather than parallel." }
      ] }
  ] }
});
