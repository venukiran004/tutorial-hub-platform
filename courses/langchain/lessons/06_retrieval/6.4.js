EC.receiveLesson({
  id: "6.4",
  lede: "Dense and sparse retrieval fail on different query classes, so combining them should help. The measurement says the obvious way of doing it is wrong three times over \u2014 and the third reason is the one nobody mentions. Cosine is bounded and BM25 is not; BM25's scale moves between queries; and **BM25's magnitude is anti-correlated with its usefulness here**. *\u201chow long do you keep my information\u201d* scores **3.8583** on nothing but the stopwords *do* and *you*, higher than `Retry-After`'s 2.9871 earned on the one term that matters. Meanwhile *\u201cI forgot my password\u201d* keeps **no tokens at all**, so all 41 documents tie at 0.0000 \u2014 and BM25 still returns a confident-looking top three.",
  objectives: [
    "Show that dense and sparse retrieval fail on different query classes",
    "Measure how much of each query survives tokenisation",
    "Explain the three separate reasons a weighted sum fails",
    "Show why per-query normalisation makes it worse",
    "Describe what EnsembleRetriever fixes and what it does not"
  ],
  prerequisites: ["6.2", "6.3"],
  blocks: [
    { t: "h2", n: "01", id: "disagree", text: "They disagree by design", sub: "And one of these lists is not a ranking" },
    { t: "code", lang: "text", title: "Two retrievers, two query classes",
      code: "query: 'Retry-After'\n  dense: ['api-idempotency', 'api-webhooks', 'bill-refund']\n  bm25 : ['api-limits', 'ops-backup', 'ops-sla']\n\nquery: 'I forgot my password'\n  dense: ['auth-reset', 'auth-signin-fail', 'bill-cancel-trial']\n  bm25 : ['ops-backup', 'ops-sla', 'ops-status']",
      caption: "`api-limits` is relevant for the first; `auth-reset` for the second. Each retriever gets one right." },
    { t: "h2", n: "02", id: "survives", text: "How much of each query survives", sub: "The column that explains everything else" },
    { t: "code", lang: "text", title: "Surviving terms, per query",
      code: "query                                  max     docs>0  surviving terms\n'Idempotency-Key header'               5.1527  4       ['idempotency-key', 'header']\n'mTLS'                                 3.3009  1       ['mtls']\n'Retry-After'                          2.9871  1       ['retry-after']\n'stop my plan renewing'                2.8963  2       ['plan']\n'how long do you keep my information'  3.8583  5       ['do', 'you']\n'I forgot my password'                 0.0000  0       []",
      caption: "Two rows deserve attention, and both are fatal to weighted fusion." },
    { t: "callout", kind: "trap", title: "A confident ranking over 41 tied zeros", body: [
      { t: "p", text: "`I forgot my password` keeps **nothing** \u2014 not one query token appears in any document. So all 41 documents score exactly 0.0000, and BM25 still returns `['ops-backup', 'ops-sla', 'ops-status']`." },
      { t: "p", text: "That list is not a ranking. It is 6.3's tied tail: 41 documents at zero, ordered by whatever the sort did. BM25 has produced a confident-looking top three containing **no information whatsoever**, and nothing in its output distinguishes this from a real result." }
    ] },
    { t: "callout", kind: "insight", title: "And the magnitude points the wrong way", body: [
      { t: "p", text: "`how long do you keep my information` scores **3.8583** \u2014 higher than `Retry-After` at 2.9871 \u2014 and the only surviving terms are `do` and `you`. The score is produced entirely by stopwords matching whichever documents happen to contain them." },
      { t: "p", text: "So BM25's magnitude is not monotone in usefulness on this corpus. Its highest-scoring natural query is its least useful one, and its lowest-scoring exact query is one it answers perfectly. That is worse than an uncalibrated scale \u2014 it is an **anti-correlated** one, and no monotone transform fixes a sign error." }
    ] },
    { t: "h2", n: "03", id: "three", text: "Three reasons a weighted sum fails", sub: "Any one of them is sufficient" },
    { t: "code", lang: "text", title: "Both distributions, one query",
      code: "query: 'Idempotency-Key header'\n  dense scores: [0.4672, 0.308, 0.2663]\n  bm25 scores : [5.1527, 2.2929, 2.0678]\n\nover the whole corpus, for this one query:\n  dense: min -0.1085  max +0.4672  range 0.5757\n  bm25 : min +0.0000  max +5.1527  range 5.1527",
      caption: "An order of magnitude apart, and only one of them is bounded." },
    { t: "ol", items: [
      "**Different bounds.** Cosine is bounded in [\u22121, 1] by construction; BM25 is an unbounded sum over query terms. So `0.5*dense + 0.5*bm25` is dominated by BM25 whenever BM25 fires \u2014 the weights are not expressing a preference, they are being overwhelmed by a scale difference.",
      "**The scale moves between queries.** 2.99 to 5.15 across the rows above, so a weight tuned on one query is wrong on the next.",
      "**And it moves in the wrong direction.** A high BM25 score can mean \u201cmatched two stopwords\u201d and a low one can mean \u201cmatched the single rare term that answers the question\u201d."
    ] },
    { t: "h2", n: "04", id: "norm", text: "Why normalising is worse, not better", sub: "The obvious repair" },
    { t: "callout", kind: "warn", title: "On the degenerate query it is not even reachable", body: [
      { t: "p", text: "Min-max normalising each retriever per query is the obvious fix. Applied to `I forgot my password`: all 41 documents are at 0.0000, so `max - min` is **0.0000** and the normalisation is a division by zero." },
      { t: "p", text: "The usual guard is to emit zeros, or to emit 1.0 for the arbitrary top document \u2014 and the second choice manufactures a *maximally confident* signal out of 41 tied zeros. You have taken the worst possible input and given it the highest possible score." }
    ] },
    { t: "p", text: "On a query where something matched but nothing relevant did, normalisation is reachable and still wrong: it maps the best irrelevant document to exactly 1.0, the same value a perfect match would receive. Normalisation destroys the one piece of information that said this result was weak, which is the opposite of what a fusion step needs." },
    { t: "h2", n: "05", id: "ensemble", text: "What EnsembleRetriever does", sub: "It refuses to read the scores" },
    { t: "code", lang: "python", title: "The hybrid retriever",
      code: 'from langchain.retrievers import EnsembleRetriever\n\nhybrid = EnsembleRetriever(\n    retrievers=[dense_retriever, bm25_retriever],\n    weights=[0.5, 0.5])',
      caption: "Those weights apply to reciprocal-rank contributions, not to the raw scores." },
    { t: "p", text: "`EnsembleRetriever` applies reciprocal rank fusion (6.5), reading each retriever's **ordering** and never its scores. That sidesteps reasons 1 and 2 entirely: rank 1 means the same thing whatever scale a retriever's scores are on, with no normalisation and no per-query calibration." },
    { t: "callout", kind: "tradeoff", title: "It does not fix reason 3, and that is the key to 6.5", body: [
      { t: "p", text: "A rank over 41 tied zeros is still a rank. `I forgot my password` hands the fusion a rank-1 document chosen by a sort tie-break, and RRF awards it **exactly the same** `1/(k+1)` as the document dense ranked first correctly." },
      { t: "p", text: "The other cost is that rank fusion discards magnitude: *\u201cscored far above everything else\u201d* and *\u201cbarely won\u201d* both become rank 1, which is precisely what a confidence threshold needs (7.1). So fusing by rank trades a calibration problem for a credibility problem." }
    ] },
    { t: "diagram", kind: "matrix", title: "BM25’s magnitude is anti-correlated with its usefulness",
      caption: "The obvious way to combine dense and sparse is wrong three times over, and the third reason is the one nobody mentions: cosine is bounded and BM25 is not, so a weighted sum is **uncalibrated**. Worse, a high BM25 score can mean the query was all stopwords.",
      cols: ["BM25 score", "tokens kept", "what it means"],
      rows: ["“I forgot my password”", "“how long do you keep…”"],
      cells: [
        [{ text: "a 41-way tie at 0.0000", tone: "crit" }, { text: "ZERO", tone: "crit" }, { text: "still returns a top-3", tone: "crit" }],
        [{ text: "3.8583 — confident", tone: "crit" }, { text: "stopwords only", tone: "crit" }, { text: "high score, no signal", tone: "crit" }]
      ] },
    { t: "exercise", kind: "analysis", title: "Find out why the scores cannot be added",
      difficulty: "core", minutes: 30,
      body: "Run dense and sparse retrieval on queries from both classes. Then, for several queries, report the BM25 maximum, how many documents score above zero, and which query terms survived tokenisation. Identify the query that keeps no terms and say what its returned ranking actually is. Identify the query whose score comes entirely from stopwords. Then give the three reasons a weighted sum fails, show what per-query normalisation does to the degenerate query, and state what EnsembleRetriever fixes and what it does not.",
      requirements: ["Show both retrievers on at least two queries from different classes",
        "Report max score, documents above zero, and surviving terms for at least five queries",
        "Identify the query keeping no terms and explain what its top-3 really is",
        "Identify the query scoring highest on stopwords alone and say what that implies",
        "Give three separate reasons a weighted sum fails",
        "Show what min-max normalisation does when all scores are equal",
        "State what rank fusion fixes and what it leaves untouched"],
      hint: "Print the surviving query terms, not just the scores. One query keeps none of them and still returns a ranking.",
      solution: { lang: "python", title: "x0604.py \u2014 3.8583 from two stopwords",
        code: 'for q in ["Idempotency-Key header", "mTLS", "Retry-After",\n          "stop my plan renewing", "how long do you keep my information",\n          "I forgot my password"]:\n    s = [bm.score(q, j) for j in range(bm.N)]\n    kept = [t for t in tok(q) if bm.df.get(t, 0) > 0]\n    print("%-38s %-7.4f %-7d %s" % (repr(q)[:38], max(s),\n                                    sum(1 for x in s if x > 0), kept))\n\n# the degenerate case\nbad = "I forgot my password"\ns = np.array([bm.score(bad, j) for j in range(bm.N)])\nprint("max - min:", s.max() - s.min())      # 0.0 -> normalisation divides by zero\nprint("and bm25 still returns:", [x[0] for x in bm.rank(bad, 3)])',
        out: "==============================================================================\nPART 1 -- the two retrievers disagree by design\n==============================================================================\n  query: 'Retry-After'\n    dense: ['api-idempotency', 'api-webhooks', 'bill-refund']\n    bm25 : ['api-limits', 'ops-backup', 'ops-sla']\n  query: 'I forgot my password'\n    dense: ['auth-reset', 'auth-signin-fail', 'bill-cancel-trial']\n    bm25 : ['ops-backup', 'ops-sla', 'ops-status']\n\n  so there is something to gain -- and one of those bm25 lists is not\n  what it appears to be.\n==============================================================================\nPART 2 -- how much of each query actually survives tokenisation\n==============================================================================\n  query                                  max     docs>0  surviving terms\n  'Idempotency-Key header'               5.1527  4       ['idempotency-key', 'header']\n  'mTLS'                                 3.3009  1       ['mtls']\n  'Retry-After'                          2.9871  1       ['retry-after']\n  'stop my plan renewing'                2.8963  2       ['plan']\n  'how long do you keep my information'  3.8583  5       ['do', 'you']\n  'I forgot my password'                 0.0000  0       []\n\n  two rows deserve attention.\n\n  'I forgot my password' keeps NOTHING. not one query token appears in\n  any document, so all 41 documents score exactly 0.0000 -- and bm25\n  still returns ['ops-backup', 'ops-sla', 'ops-status'].\n\n  that list is not a ranking. it is 6.3's tied tail: 41 documents at\n  0.0000, ordered by whatever the sort did. BM25 has produced a\n  confident-looking top-3 containing no information whatsoever, and\n  nothing in its output distinguishes this from a real result.\n\n  'how long do you keep my information' scores 3.8583 -- HIGHER than\n  'Retry-After' at 2.9871 -- and the only terms that survived are\n  'do' and 'you'. the score is produced entirely by stopwords.\n\n  so BM25's magnitude is not monotone in usefulness. its highest-\n  scoring natural query here is its least useful one, and its lowest-\n  scoring exact query is one it answers perfectly. that is worse than\n  an uncalibrated scale: it is an anti-correlated one.\n==============================================================================\nPART 3 -- which is why a weighted sum cannot work\n==============================================================================\n  query: 'Idempotency-Key header'\n    dense scores: [0.4672, 0.308, 0.2663]\n    bm25 scores : [5.1527, 2.2929, 2.0678]\n\n  over the whole corpus, for this one query:\n    dense: min -0.1085  max +0.4672  range 0.5757\n    bm25 : min +0.0000  max +5.1527  range 5.1527\n\n  three separate problems, any one of which sinks weighted fusion:\n\n  1. cosine is bounded in [-1,1] by construction; BM25 is an unbounded\n     sum over query terms. 0.5*dense + 0.5*bm25 is dominated by bm25\n     whenever bm25 fires at all -- the weights are not expressing a\n     preference, they are being overwhelmed by a scale difference.\n\n  2. BM25's scale moves between queries -- 2.99 to 5.15 across the rows\n     above -- so a weight tuned on one query is wrong on the next.\n\n  3. and it moves in the WRONG DIRECTION, as part 2 showed. a high\n     BM25 score can mean 'matched two stopwords' and a low one can\n     mean 'matched the single rare term that answers the question'.\n==============================================================================\nPART 4 -- and why per-query normalisation is worse, not better\n==============================================================================\n  min-max normalising each retriever per query is the obvious repair.\n  applied to 'I forgot my password':\n    raw bm25 scores      : all 41 documents at 0.0000\n    max - min            : 0.0000\n    min-max normalisation: DIVISION BY ZERO\n\n    the degenerate case is not even reachable -- there is no scale to\n    normalise. the usual guard is to emit zeros or to emit 1.0 for\n    the arbitrary top document, and the second choice manufactures a\n    maximally confident signal out of 41 tied zeros.\n\n  on a query where SOMETHING matched but nothing relevant did,\n  normalisation is reachable and still wrong: it maps the best\n  irrelevant document to exactly 1.0, which is the same value a\n  perfect match would get. normalisation destroys the one piece of\n  information that said this result was weak.\n==============================================================================\nPART 5 -- EnsembleRetriever's answer: do not read the scores\n==============================================================================\n  LangChain's EnsembleRetriever fuses by RANK, applying reciprocal rank\n  fusion (6.5). the weights it takes are weights on the reciprocal-rank\n  contributions, not on the raw scores.\n\n  that sidesteps problems 1 and 2 entirely: rank 1 means the same thing\n  whatever scale a retriever's scores are on, with no normalisation and\n  no per-query calibration.\n\n  it does NOT fix problem 3, and this is the key to 6.5. a rank over 41\n  tied zeros is still a rank. 'I forgot my password' hands RRF a rank-1\n  document chosen by a sort tie-break, and RRF awards it exactly the\n  same 1/(k+1) as the document dense ranked first correctly.\n\n  the cost of rank fusion is also that it discards magnitude: 'scored\n  far above everything else' and 'barely won' both become rank 1, which\n  is precisely what a confidence threshold needs (7.1).",
        notes: [
          { t: "p", text: "**`I forgot my password` keeps no tokens at all** \u2014 not one query term appears in any document, so all 41 score exactly 0.0000." },
          { t: "p", text: "**And BM25 still returns a top three.** That list is 6.3's tied tail ordered by a sort artefact: a confident-looking ranking containing no information, with nothing in the output to distinguish it from a real result." },
          { t: "p", text: "**`how long do you keep my information` scores 3.8583 on the stopwords `do` and `you` alone** \u2014 higher than `Retry-After`'s 2.9871, which was earned on the one term that mattered." },
          { t: "p", text: "**So BM25's magnitude is anti-correlated with usefulness here**, not merely uncalibrated. Its highest-scoring natural query is its least useful; no monotone transform fixes a sign error." },
          { t: "p", text: "**Three reasons a weighted sum fails**: cosine is bounded and BM25 is not (range 0.58 against 5.15); the BM25 scale moves between queries (2.99 to 5.15); and it moves in the wrong direction." },
          { t: "p", text: "**Min-max normalisation is not even reachable on the degenerate query** \u2014 max minus min is 0.0000, so it divides by zero, and the usual guard of emitting 1.0 for the top document gives 41 tied zeros a maximally confident score." },
          { t: "p", text: "**`EnsembleRetriever` fuses by rank, fixing reasons 1 and 2** \u2014 rank 1 means the same thing on any scale, with no calibration." },
          { t: "p", text: "**It does not fix reason 3**: a rank over 41 tied zeros is still a rank, and RRF awards it the same 1/(k+1) as a correct rank 1. That is the key to 6.5." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the hybrid weights that were tuned on the wrong thing", body: [
      { t: "p", text: "A team tunes hybrid weights by grid search against their evaluation set, finds 0.3 dense / 0.7 sparse optimal, and ships it. Production quality is worse than dense alone was." },
      { t: "p", text: "Their evaluation set was heavy on product names and error codes \u2014 the class where sparse retrieval is strong and its scores are large. Real traffic is mostly natural questions, where this lesson's measurements show sparse scores either collapsing to zero or being driven entirely by stopwords, so the 0.7 weight is multiplying noise." },
      { t: "p", text: "The deeper issue is that one weight pair assumes the retrievers' relative usefulness is constant across queries, and it is not. A defensive version of the same idea is to gate on whether the sparse retriever has signal at all \u2014 how many documents scored above zero, and whether any surviving term is rare \u2014 and fuse only when it does. That is cheap, and it is information the retriever already has and throws away." }
    ] }
  ],
  takeaways: [
    "**Dense and sparse retrieval fail on different query classes**, so combining them should help.",
    "**`I forgot my password` keeps no query tokens at all** \u2014 all 41 documents tie at 0.0000.",
    "**And BM25 still returns a confident-looking top three**, which is a sort artefact, not a ranking.",
    "**`how long do you keep my information` scores 3.8583 on the stopwords `do` and `you` alone.**",
    "**Higher than `Retry-After`'s 2.9871**, which was earned on the one term that mattered.",
    "**So BM25's magnitude is anti-correlated with usefulness here**, not merely uncalibrated.",
    "**Three reasons a weighted sum fails**: different bounds, a query-dependent scale, and the wrong direction.",
    "**Cosine's range was 0.58 and BM25's was 5.15 on the same query** \u2014 the weights are overwhelmed by scale.",
    "**Min-max normalisation divides by zero on the degenerate query**, and the usual guard scores 41 tied zeros at 1.0.",
    "**Normalisation destroys the information that said the result was weak.**",
    "**`EnsembleRetriever` fuses by rank, fixing the bounds and the scale problem.**",
    "**It does not fix credibility** \u2014 a rank over 41 tied zeros gets the same weight as a correct rank 1.",
    "**Gate on whether the sparse retriever has signal** before fusing: documents above zero, and whether a surviving term is rare."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "BM25 returns a top-3 for a query whose terms appear in no document. What is that list?",
      options: ["The three documents with the closest fuzzy matches",
        "An arbitrary sort order over 41 documents all tied at 0.0000 \u2014 a ranking containing no information",
        "The three shortest documents, since length normalisation dominates",
        "An error condition the library signals by returning defaults"],
      answer: 1,
      why: "With no surviving query terms, every document's score is exactly zero, so the returned order comes entirely from how the sort broke ties. Nothing in the output distinguishes this from a genuine result, which matters because a fusion step will treat that tie-break rank 1 as a real preference and weight it accordingly." },
    { stem: "A natural query scores 3.8583 on stopwords alone while an exact-term query scores 2.9871 on the one decisive term. What does that show?",
      options: ["The stopwords should be removed from the index",
        "BM25's magnitude is anti-correlated with usefulness here, so no monotone rescaling can fix the fusion",
        "The IDF weights need recomputing",
        "The natural query is genuinely better answered"],
      answer: 1,
      why: "Normalisation, weighting and calibration are all monotone transforms: they can rescale a score but cannot reverse its ordering. If a higher score means a less useful result, every one of those repairs preserves the error. The fix has to come from a different signal \u2014 how many documents matched, and whether any surviving term is rare \u2014 rather than from the score." },
    { stem: "Why does per-query min-max normalisation make the degenerate query worse?",
      options: ["It is too slow to run per query",
        "All scores are equal so max minus min is zero \u2014 and the usual guard assigns 1.0 to an arbitrary document from 41 tied zeros",
        "It changes the ranking within the retriever",
        "Negative cosine scores break the scaling"],
      answer: 1,
      why: "The normalisation is undefined when the range is zero, so an implementation must choose a fallback. Emitting 1.0 for the top document takes the least informative possible input and assigns it the highest possible confidence, which then enters the fusion at full weight. Even in the non-degenerate case, mapping the best irrelevant document to 1.0 discards the evidence that the result was weak." },
    { stem: "What does EnsembleRetriever's rank-based fusion fix, and what does it leave?",
      options: ["It fixes everything, which is why it is the default",
        "It fixes the bounds and scale problems, and leaves credibility \u2014 a tie-break rank 1 gets the same weight as a correct one",
        "It fixes credibility but requires calibrated scores",
        "It fixes nothing; the weights still multiply raw scores"],
      answer: 1,
      why: "Reading only positions makes scale differences irrelevant, so no normalisation or per-query calibration is needed. But a rank is a rank regardless of what produced it: the document a tie-break happened to put first over 41 zeros receives exactly the same reciprocal-rank contribution as the document dense ranked first correctly. That is the mechanism behind 6.5's result that fusion can be worse than its better input." }
  ] },
  interview: { title: "Interview practice", sub: "Hybrid search", questions: [
    { level: "core", q: "How would you combine a dense and a keyword retriever?",
      strong: "A strong answer rules out score addition with more than one reason.",
      answer: [
        { t: "p", text: "By rank, not by score. Adding the scores fails for three separate reasons, and weights only address the first one." },
        { t: "p", text: "First, cosine is bounded in minus one to one and BM25 is an unbounded sum over query terms. On one query I measured, the dense range was 0.58 and the BM25 range was 5.15, so a weighted sum is really just BM25 wherever BM25 fires \u2014 the weights are being overwhelmed by a scale difference rather than expressing a preference." },
        { t: "p", text: "Second, the BM25 scale moves between queries, from about 2.99 to 5.15 across the queries I looked at, so a weight tuned on one is wrong on the next." },
        { t: "p", text: "Third, and this is the one that convinced me, the magnitude pointed the wrong way. A natural-language query scored 3.86 on nothing but the stopwords 'do' and 'you', higher than an exact-term query that scored 2.99 on the single rare term that actually answered it. If a higher score means a less useful result, then normalisation, weighting and calibration are all monotone transforms that preserve the error. Rank fusion at least removes the first two problems, because rank 1 means the same thing on any scale." }
      ] },
    { level: "advanced", q: "When should a hybrid retriever not fuse?",
      strong: "A strong answer gates on whether each retriever has signal.",
      answer: [
        { t: "p", text: "When one of the retrievers has no signal for that query \u2014 and you can detect that cheaply, from information the retriever already computes and discards." },
        { t: "p", text: "The case that made this concrete: a query where not one term survived tokenisation, so all 41 documents scored exactly 0.0000 \u2014 and BM25 still returned a top three. That list was the sort's tie-break order over 41 zeros. It contained no information at all, and nothing in the output distinguished it from a real result." },
        { t: "p", text: "Rank fusion then does the worst possible thing with it. A rank over 41 tied zeros is still a rank, so reciprocal rank fusion awards that tie-break document the same one-over-sixty-one as the document dense ranked first correctly. That is how a hybrid ends up worse than dense alone." },
        { t: "p", text: "So the gate I would build is: how many documents scored above zero, and is any surviving query term actually rare. If a sparse retriever matched nothing, or matched only on stopwords, it contributes nothing to the fusion and should be excluded for that query. It is a couple of lines, it needs no new model, and it converts a fixed weight into a per-query decision \u2014 which is what the data says the problem actually needs." }
      ] },
    { level: "core", q: "How would you tell whether a retriever found anything at all?",
      strong: "A strong answer uses signals the retriever already computes.",
      answer: [
        { t: "p", text: "For a lexical retriever it is nearly free, and almost nobody looks. Count how many documents scored above zero, and check whether any surviving query term is actually rare." },
        { t: "p", text: "I measured a query where not a single term survived tokenisation \u2014 so all 41 documents scored exactly 0.0000, and BM25 still returned a top three. That list was the sort's tie-break order. It contained no information at all and nothing in the output distinguished it from a real result." },
        { t: "p", text: "The companion case is a query that scored 3.86, higher than a query that was answered perfectly at 2.99, where the only surviving terms were 'do' and 'you'. So the score alone is not just uncalibrated, it pointed the wrong way \u2014 and that means no normalisation or weighting can fix it, because those are monotone transforms." },
        { t: "p", text: "For a dense retriever there is no zero-match case, since it always returns k. The usable signal there is the separation between the top result and the next few, rather than the absolute score \u2014 I had a failed retrieval scoring 0.44 and a correct non-answer scoring 0.13, so absolute values are not comparable across queries." },
        { t: "p", text: "Both of those are cheap, and both convert a fixed fusion weight into a per-query decision, which is what the measurements say the problem actually needs." }
      ] }
  ] }
});
