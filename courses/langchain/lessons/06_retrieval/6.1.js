EC.receiveLesson({
  id: "6.1",
  lede: "A bi-encoder embeds each document once and reuses it forever; a cross-encoder scores a **query-document pair** jointly and has nothing to precompute. That single architectural difference decides everything about where each one can run, and the honest way to measure it is to separate three costs: the one-off index build, the fixed per-query cost, and the part that scales with documents scored. Do that and the ratio is **37,088\u00d7 per document**. Time the two end-to-end instead and you get 29\u00d7 \u2014 a figure that is almost meaningless, because the dense query is dominated by the 104 ms of encoding the query, a fixed cost the cross-encoder pays too.",
  objectives: [
    "Describe the architectural difference and what follows from it",
    "Separate one-off, fixed-per-query and per-document costs",
    "Explain why an end-to-end timing understates the ratio",
    "Read a cross-encoder's scores correctly, including the cliff",
    "Say why a cross-encoder score is not a cross-query confidence"
  ],
  prerequisites: ["5.4", "5.1"],
  blocks: [
    { t: "h2", n: "01", id: "arch", text: "The architectural difference", sub: "And what follows from it" },
    { t: "table", head: ["", "Bi-encoder", "Cross-encoder"], rows: [
      ["computes", "`embed(doc)`, `embed(query)` separately", "`score(query, doc)` jointly"],
      ["precomputable", "yes \u2014 documents embedded once", "**no** \u2014 nothing to cache"],
      ["per-query work", "compare vectors", "a forward pass per pair"],
      ["accuracy", "lower \u2014 the two never meet", "higher \u2014 full cross-attention"]
    ] },
    { t: "p", text: "The accuracy difference has the same cause as the cost difference. A bi-encoder must compress a document into a vector *without knowing the query*, so the comparison happens between two summaries. A cross-encoder reads both together and can attend from one to the other \u2014 which is why it is better, and why there is nothing to store." },
    { t: "h2", n: "02", id: "cost", text: "Three costs, not one", sub: "Separating them is the whole measurement" },
    { t: "code", lang: "text", title: "Measured on this machine, 41 documents",
      code: "ONE-OFF, reused by every query afterwards\n  embedding all 41  documents            2915.8 ms\n\nPER QUERY, fixed -- paid once whatever the corpus size\n  encoding the query                     104.5 ms\n\nPER QUERY, scales with documents scored\n  vector search over 41  precomputed     0.082 ms   (0.00200 ms/doc)\n  cross-encoding 20  candidates         1362.1 ms   (68.10 ms/doc)\n  cross-encoding all 41  documents      3036.8 ms   (74.07 ms/doc)",
      caption: "CPU timings, illustrative in absolute terms. The **ratio** is the durable result." },
    { t: "callout", kind: "insight", title: "Compare the parts that scale", body: [
      { t: "p", text: "Per document scored, the cross-encoder costs **37,088\u00d7** more than a vector comparison. That is the number the two-stage design is built on." },
      { t: "p", text: "Timing a whole dense query against a whole cross-encoder pass gives only **29\u00d7**, which badly understates it \u2014 because 104 of the dense query's milliseconds are spent encoding the query, a fixed cost that the cross-encoder also pays and that does not grow with the corpus. Comparing totals mixes a constant with a coefficient." }
    ] },
    { t: "code", lang: "text", title: "Extrapolating the per-document cost",
      code: "41         docs   vector search     0.08 ms   cross-encoder          3.0 s\n1000       docs   vector search     2.00 ms   cross-encoder         74.1 s\n100000     docs   vector search   199.71 ms   cross-encoder       7406.9 s\n10000000   docs   vector search 19970.90 ms   cross-encoder     740689.4 s",
      caption: "Twenty seconds against eight and a half days, per query." },
    { t: "p", text: "Which is why *\u201cjust score everything with the better model\u201d* is not a budget question. It is a different complexity class, and no amount of hardware moves a per-query cost of eight days into a request handler." },
    { t: "h2", n: "03", id: "scores", text: "Reading a cross-encoder's scores", sub: "The cliff is the signal" },
    { t: "code", lang: "text", title: "One query, scored against the whole corpus",
      code: "query: 'how do I make retrying a write safe'\n  dense top 5        : ['api-idempotency', 'auth-signin-fail', 'data-deletion', ...]\n  cross-encoder top 5: ['api-idempotency', 'api-limits', 'user-remove', ...]\n\n  api-idempotency        +5.905\n  api-limits             -8.875\n  user-remove           -11.034\n  ops-backup            -11.165\n  ...\n  auth-mfa              -11.457",
      caption: "A cliff of **14.8 points** between rank 1 and rank 2." },
    { t: "callout", kind: "trap", title: "It is not ranking five documents \u2014 it is identifying one", body: [
      { t: "p", text: "At a glance the cross-encoder's top 5 looks no better than dense's; both put the right document first. The scores are what is informative: rank 1 is at +5.9 and everything after it is below \u22128.9, clustered within 2.6 points of each other." },
      { t: "p", text: "So the ordering below the cliff is noise between documents the model considers equally irrelevant. Reading a cross-encoder's lower ranks as a preference order is a mistake \u2014 and it is the mistake you make if you look only at the returned list and never at the scores." }
    ] },
    { t: "p", text: "Compare the dense distribution for the same query: ranks 1 to 5 span just **0.3466** (0.6328 down to 0.2863). Dense genuinely cannot separate those five documents, and the cross-encoder separates them decisively. That is the accuracy you are buying, stated as score separation rather than as a metric." },
    { t: "h2", n: "04", id: "notconf", text: "Logits, not probabilities", sub: "And not comparable across queries" },
    { t: "code", lang: "text", title: "Two questions the corpus answers equally well",
      code: "range over the corpus: -11.457 to +5.905\n\n'how do I make retrying a write safe'  top score +5.905\n'how long do you keep my information'  top score -1.782",
      caption: "**7.7 points apart**, and both questions have a good answer in the corpus." },
    { t: "callout", kind: "warn", title: "So you cannot threshold it", body: [
      { t: "p", text: "Nothing here is bounded to [0, 1], most values are strongly negative, and the top score for one well-answered question sits 7.7 points below the top score for another. A cross-encoder score is a **within-query ranking signal**, not a cross-query confidence." },
      { t: "p", text: "Any threshold picked from these numbers \u2014 \u201creject anything below zero\u201d \u2014 would discard a correct answer for the second question while accepting the first. 7.1 needs either per-query calibration or a relative signal such as the gap between rank 1 and rank 2, which this lesson shows is the more informative quantity anyway." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure the cost ratio honestly",
      difficulty: "core", minutes: 30,
      body: "Time the bi-encoder index build, the per-query query encoding, the vector search and cross-encoder scoring at two candidate counts. Separate the one-off, fixed-per-query and per-document costs, and compute the ratio that matters. Then score one query against the whole corpus with the cross-encoder, report the score distribution, and compare the top score against a second well-answered query.",
      requirements: ["Separate one-off, fixed-per-query and per-document costs with timings",
        "Compute the per-document ratio between cross-encoder and vector search",
        "Show why an end-to-end comparison gives a much smaller number",
        "Extrapolate the per-document cost to at least three corpus sizes",
        "Report the cross-encoder score distribution and the rank-1 to rank-2 gap",
        "Compare top scores across two queries and state what that rules out"],
      hint: "Time the query encoding separately. It is a fixed cost both approaches pay, and leaving it in the comparison hides the real ratio.",
      solution: { lang: "python", title: "x0601.py \u2014 37,088\u00d7 per document, not 29\u00d7",
        code: 'ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")\nq = "how do I make retrying a write safe"\n\nt0 = time.time()\nfor _ in range(20):\n    ENC.encode([q], normalize_embeddings=True)\nt_qenc = (time.time() - t0) / 20.0          # FIXED per query\n\nt0 = time.time()\nfor _ in range(2000):\n    np.argsort(-(EMB @ v))[:5]\nt_search = (time.time() - t0) / 2000.0      # scales with docs\n\nt0 = time.time()\nfor _ in range(3):\n    ce.predict([(q, t) for t in TXT])\nt_ce_all = (time.time() - t0) / 3.0         # scales with docs\n\nprint("per doc: %.0fx" % ((t_ce_all / len(TXT)) / (t_search / len(TXT))))\nprint("end to end: %.0fx" % (t_ce_all / (t_qenc + t_search)))',
        out: "==============================================================================\nPART 1 -- the architectural difference\n==============================================================================\n  bi-encoder   : embed(doc) once, embed(query) once, compare vectors\n  cross-encoder: score(query, doc) jointly -- nothing to precompute\n\n  the consequence is WHERE the cost sits, so the honest comparison has\n  to separate three different things.\n\n  ONE-OFF, reused by every query afterwards\n    embedding all 41  documents            2915.8 ms\n\n  PER QUERY, fixed -- paid once whatever the corpus size\n    encoding the query                     104.5 ms\n\n  PER QUERY, scales with documents scored\n    vector search over 41  precomputed     0.082 ms   (0.00200 ms/doc)\n    cross-encoding 20  candidates         1362.1 ms   (68.10 ms/doc)\n    cross-encoding all 41  documents      3036.8 ms   (74.07 ms/doc)\n\n  the ratio that matters is PER DOCUMENT SCORED: 37088x\n\n  that is the number the two-stage design is built on, and it is much\n  larger than a naive end-to-end comparison suggests. timing a whole\n  dense query against a whole cross-encoder pass gives only 29x,\n  because the dense query is dominated by the 104 ms of encoding the\n  query -- a FIXED cost that the cross-encoder pays too, and that does\n  not grow with the corpus. compare the parts that scale.\n\n  extrapolating the per-document cost:\n    41         docs   vector search     0.08 ms   cross-encoder          3.0 s\n    1000       docs   vector search     2.00 ms   cross-encoder         74.1 s\n    100000     docs   vector search   199.71 ms   cross-encoder       7406.9 s\n    10000000   docs   vector search 19970.90 ms   cross-encoder     740689.4 s\n  which is why 'just score everything with the better model' is not a\n  budget question, it is a different complexity class.\n==============================================================================\nPART 2 -- what the cross-encoder buys, and how to read its scores\n==============================================================================\n  query: 'how do I make retrying a write safe'\n    dense top 5        : ['api-idempotency', 'auth-signin-fail', 'data-deletion', 'api-errors', 'ops-maintenance']\n    cross-encoder top 5: ['api-idempotency', 'api-limits', 'user-remove', 'ops-backup', 'bill-cancel-order']\n\n  at a glance the cross-encoder's list looks no better -- both put the\n  right document first. the scores are what is informative:\n\n    api-idempotency        +5.905\n    api-limits             -8.875\n    user-remove           -11.034\n    ops-backup            -11.165\n    bill-cancel-order     -11.180\n    ...                          \n    ops-status            -11.456\n    auth-mfa              -11.457\n\n  there is a cliff of 14.8 points between rank 1 and rank 2, and every\n  document after the first scores below -8.9.\n\n  so the cross-encoder is not ranking five plausible documents -- it is\n  identifying one and rejecting the rest. its 'top 5' ordering below the\n  cliff is noise between things it considers equally irrelevant, which\n  is why reading a cross-encoder's lower ranks as a preference order is\n  a mistake.\n\n  compare the dense score distribution for the same query:\n    api-idempotency       +0.6328\n    auth-signin-fail      +0.3218\n    data-deletion         +0.3193\n    api-errors            +0.2864\n    ops-maintenance       +0.2863\n  dense scores are bunched -- rank 1 to rank 5 spans 0.3466 -- so dense\n  genuinely cannot tell these apart, and the cross-encoder can.\n==============================================================================\nPART 3 -- the scores are logits, not probabilities\n==============================================================================\n  range over the corpus: -11.457 to +5.905\n  most are strongly negative, and nothing is bounded to [0,1].\n\n  a second query, for comparison:\n    'how do I make retrying a write safe'  top score +5.905\n    'how long do you keep my information'  top score -1.782\n\n  the two top scores differ by 7.7 points for two questions the corpus\n  answers equally well. so a cross-encoder score is a within-query\n  ranking signal and NOT a cross-query confidence -- you cannot pick one\n  threshold and call anything below it 'no good answer' without\n  calibrating per query first (7.1).\n==============================================================================\nPART 4 -- the division of labour\n==============================================================================\n  stage      model          runs over         cost\n  recall     bi-encoder     the whole corpus  cheap, precomputed once\n  precision  cross-encoder  the candidates    expensive, every query\n\n  neither model can do the other's job. the bi-encoder bunches its\n  scores and cannot separate close candidates; the cross-encoder\n  separates them cleanly and costs 37088x more per document.\n  that is 5.1's two stages with the models named.",
        notes: [
          { t: "p", text: "**Per document scored, the cross-encoder costs 37,088x more** than a vector comparison. That is the figure the two-stage design rests on." },
          { t: "p", text: "**An end-to-end timing gives only 29x**, which badly understates it \u2014 104 of the dense query's milliseconds are encoding the query, a fixed cost the cross-encoder pays too. Comparing totals mixes a constant with a coefficient." },
          { t: "p", text: "**Extrapolated, the per-document cost is a complexity class, not a budget**: at ten million documents, 20 seconds of vector search against eight and a half days of cross-encoding, per query." },
          { t: "p", text: "**The cross-encoder's top 5 looks no better than dense's**, and the scores are the informative part: +5.905 at rank 1, then a cliff of 14.8 points, with everything below -8.9 clustered inside 2.6 points." },
          { t: "p", text: "**So it is not ranking five documents, it is identifying one and rejecting the rest.** The ordering below the cliff is noise between things it considers equally irrelevant." },
          { t: "p", text: "**Dense ranks 1 to 5 span only 0.3466**, so dense genuinely cannot separate those documents and the cross-encoder separates them decisively \u2014 that is the accuracy being bought." },
          { t: "p", text: "**The scores are logits and not comparable across queries**: two equally well-answered questions had top scores of +5.905 and -1.782, 7.7 points apart. So no fixed threshold works, and 7.1 needs calibration or a relative signal like the rank-1 to rank-2 gap." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the reranker that was dropped for being too slow", body: [
      { t: "p", text: "A team prototypes a cross-encoder reranker, measures it against their dense retriever end-to-end, sees roughly a 30\u00d7 slowdown, and concludes reranking is unaffordable. They remove it." },
      { t: "p", text: "The 30\u00d7 was measured over the whole corpus. Reranking is not meant to run over a corpus \u2014 over 20 candidates the same model costs about 1.4 seconds here against 3.0 for all 41, and the cost scales with the candidate count, which is a number they choose. The measurement answered a question nobody was asking." },
      { t: "p", text: "The useful habit is to measure the per-document coefficient rather than a total, because the coefficient is what lets you price a configuration you have not tried yet. With 68 ms per pair in hand you can decide between 10, 20 and 50 candidates on paper, and the end-to-end number tells you nothing about any of them." }
    ] }
  ],
  takeaways: [
    "**A bi-encoder embeds documents once and reuses them; a cross-encoder scores pairs and precomputes nothing.**",
    "**Same cause for both differences**: the bi-encoder compresses without seeing the query, which is cheaper and less accurate.",
    "**Separate three costs**: one-off index build, fixed per query, and the part that scales with documents scored.",
    "**Per document, the cross-encoder costs 37,088x more** than a vector comparison.",
    "**An end-to-end timing gives 29x** because the 104 ms query encoding is a fixed cost both pay.",
    "**Comparing totals mixes a constant with a coefficient** \u2014 and the coefficient is what prices untried configurations.",
    "**At ten million documents it is 20 seconds against eight and a half days per query** \u2014 a complexity class, not a budget.",
    "**A cross-encoder identifies one document and rejects the rest**: +5.905, then a 14.8-point cliff.",
    "**The ordering below the cliff is noise** between documents it considers equally irrelevant.",
    "**Dense ranks 1 to 5 spanned only 0.3466**, which is the separation the cross-encoder is being bought for.",
    "**The scores are logits, not probabilities**, and not comparable across queries \u2014 +5.905 against -1.782 for two good answers.",
    "**So no fixed threshold works**; use per-query calibration or the rank-1 to rank-2 gap."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does timing a dense query against a full cross-encoder pass understate the real ratio?",
      options: ["Dense queries benefit from CPU cache effects",
        "The dense query is dominated by a fixed query-encoding cost that the cross-encoder also pays and that does not scale with the corpus",
        "Cross-encoders batch more efficiently at larger sizes",
        "The vector search is not warmed up on the first call"],
      answer: 1,
      why: "Encoding the query took 104 ms while the vector search over 41 documents took 0.082 ms, so an end-to-end dense timing is almost entirely a constant that the cross-encoder pays too. Dividing total by total gives 29x; comparing only the parts that scale with documents scored gives 37,088x. Mixing a constant with a coefficient produces a number that cannot price any other configuration." },
    { stem: "A cross-encoder returns rank 1 at +5.9 and ranks 2 to 41 between \u22128.9 and \u221211.5. How should the top 5 be read?",
      options: ["As the five best documents in preference order",
        "As one identified document plus four it considers equally irrelevant \u2014 the ordering below the cliff is noise",
        "As evidence the model is poorly calibrated",
        "As five documents all worth including in the context"],
      answer: 1,
      why: "The 14.8-point cliff separates one document from a cluster spanning only 2.6 points. Within that cluster the model is expressing no meaningful preference, so treating positions 2 through 5 as a ranking reads structure into noise. This is only visible if you look at the scores rather than the returned list, which is why the list alone is a misleading interface." },
    { stem: "Two well-answered questions produce cross-encoder top scores of +5.905 and \u22121.782. What does that rule out?",
      options: ["Using the cross-encoder for reranking at all",
        "Any fixed threshold for abstention \u2014 the scores are a within-query ranking signal, not a cross-query confidence",
        "Comparing the two queries' retrieval quality",
        "Using logits without a softmax"],
      answer: 1,
      why: "A threshold of zero would accept the first question's answer and reject the second's, although both are correct. The scores order documents within one query and carry no consistent meaning across queries, so a no-context guard needs either per-query calibration or a relative quantity such as the gap between rank 1 and rank 2 \u2014 which this lesson shows is more informative anyway." },
    { stem: "Why is scoring an entire corpus with a cross-encoder not merely expensive?",
      options: ["Cross-encoders have a hard input limit on corpus size",
        "The cost is per query-document pair with nothing precomputable, so it scales as corpus size times query volume",
        "Accuracy degrades as the candidate set grows",
        "The scores become incomparable over large corpora"],
      answer: 1,
      why: "An embedding is computed once per document and reused for every query thereafter; a cross-encoder has nothing to store because it reads query and document together. At 68 ms per pair, ten million documents is over eight days of compute for a single query. No hardware budget converts that into a request handler, which is why the two-stage split is forced rather than chosen." }
  ] },
  interview: { title: "Interview practice", sub: "Bi-encoders and cross-encoders", questions: [
    { level: "core", q: "What is the difference between a bi-encoder and a cross-encoder?",
      strong: "A strong answer links the cost difference and the accuracy difference to one cause.",
      answer: [
        { t: "p", text: "A bi-encoder embeds the document and the query separately and compares the two vectors. A cross-encoder takes the pair together and produces a score directly." },
        { t: "p", text: "The useful thing is that both the cost difference and the accuracy difference come from the same fact. Because the bi-encoder processes the document without knowing the query, it can do that work once and reuse it for every query forever \u2014 but it is comparing two summaries, each compressed without reference to the other. The cross-encoder reads both together and can attend across them, which is why it is more accurate and also why there is nothing to precompute." },
        { t: "p", text: "So the cost lands in different places. For the bi-encoder it is a one-off index build; for the cross-encoder it is per query, every query, scaling with how many documents you score." },
        { t: "p", text: "I measured about 68 ms per query-document pair against roughly two microseconds for a vector comparison \u2014 a factor of tens of thousands per document. Which is why a pipeline wants both: the cheap one to reduce a corpus to twenty candidates, the accurate one to order those." }
      ] },
    { level: "advanced", q: "How would you measure whether a reranker is affordable?",
      strong: "A strong answer measures a per-document coefficient, not a total.",
      answer: [
        { t: "p", text: "By measuring the per-document coefficient, and separating out the costs that do not scale." },
        { t: "p", text: "There are three different things in a retrieval timing: the one-off index build, a fixed per-query cost like encoding the query, and the part that grows with documents scored. Only the third one is what a reranking decision depends on, and it is the smallest part of a naive end-to-end measurement." },
        { t: "p", text: "Concretely, I timed a dense query at about 105 ms of which 104 was encoding the query and 0.08 was the actual search. Comparing that total against a full cross-encoder pass gave 29x, which looks survivable and is meaningless. The per-document ratio was 37,000x." },
        { t: "p", text: "The reason the coefficient matters is that it prices configurations you have not run. Knowing it is 68 ms per pair, I can say immediately what 10, 20 or 50 candidates cost and choose against a latency budget. An end-to-end slowdown figure tells me nothing about any of those." },
        { t: "p", text: "I have seen a team drop reranking after measuring a 30x slowdown over their whole corpus \u2014 which is not how a reranker is ever deployed. The measurement answered a question nobody was asking." }
      ] },
    { level: "core", q: "Why can a cross-encoder not be used as the only retriever?",
      strong: "A strong answer is about precomputation, not raw speed.",
      answer: [
        { t: "p", text: "Because there is nothing to precompute, so its cost is paid per query and scales with the number of documents scored." },
        { t: "p", text: "A bi-encoder embeds each document once, stores the vector, and reuses it for every query forever. The per-query work is then a dot product per document \u2014 I measured about two microseconds per document. A cross-encoder reads the query and the document together, which is what makes it accurate, and means the work cannot be done in advance." },
        { t: "p", text: "At roughly 68 ms per query-document pair, that is about three seconds to score 41 documents and over eight days to score ten million. Per query. So it is not an expensive option, it is an unavailable one past a very small corpus." },
        { t: "p", text: "Which is why the architecture is forced rather than chosen. You cannot afford the accurate model over everything and you should not trust the cheap one's final ordering \u2014 I measured dense scores for its top five spanning only 0.35, so it genuinely cannot separate close candidates. So the cheap model reduces a corpus to twenty candidates and the accurate one orders those." }
      ] }
  ] }
});
