EC.receiveLesson({
  id: "6.5",
  lede: "Reciprocal rank fusion dissolves 6.4's calibration problem by never reading a score: `RRF(d) = \u03a3 w\u1d63 / (k + rank\u1d63(d))`. Five lines, no normalisation, no tuning. It is also where this module's largest finding lives. Fusing dense and BM25 one-to-one on natural queries gives **MRR 0.393 against dense's 0.964** \u2014 the hybrid lands near its *worse* input. RRF treats every retriever as equally credible, so the rank-1 document BM25 produced by sorting 41 tied zeros (6.4) receives exactly the same `1/61` as the document dense ranked first correctly. No weight recovers both classes \u2014 and the conventional `k=60` turns out to be the **worst** setting here: `k=1` scores 0.717.",
  objectives: [
    "Implement RRF and trace the contributions for one query",
    "Explain why reading no scores removes the calibration problem",
    "Say what the k constant controls and measure its effect",
    "Demonstrate that naive fusion is worse than its best input",
    "Show that weighting trades monotonically rather than fixing it"
  ],
  prerequisites: ["6.4"],
  blocks: [
    { t: "h2", n: "01", id: "formula", text: "The formula", sub: "And what is absent from it" },
    { t: "math", tex: "\\mathrm{RRF}(d) = \\sum_{r \\in \\text{retrievers}} \\frac{w_r}{k + \\mathrm{rank}_r(d)}" },
    { t: "code", lang: "python", title: "The whole implementation",
      code: 'def rrf(ranklists, k=60, weights=None):\n    if weights is None:\n        weights = [1.0] * len(ranklists)\n    sc = {}\n    for w, rl in zip(weights, ranklists):\n        for pos, did in enumerate(rl):\n            sc[did] = sc.get(did, 0.0) + w / (k + pos + 1)\n    return sorted(sc, key=lambda d: -sc[d])',
      out: "  query: 'Idempotency-Key header'\n    dense ranks: ['api-idempotency', 'api-auth', 'auth-sso', ...]\n    bm25 ranks : ['api-idempotency', 'api-versioning', 'api-auth', ...]\n\n  contributions with k=60:\n    api-idempotency      0.032787   (dense 1/61, bm25 1/61)\n    api-auth             0.032002   (dense 1/62, bm25 1/63)\n    api-versioning       0.031514   (dense 1/65, bm25 1/62)\n    auth-sso             0.015873   (dense 1/63, bm25 -)",
      caption: "No score appears anywhere in this function. Only positions." },
    { t: "callout", kind: "insight", title: "That absence is the whole point", body: [
      { t: "p", text: "6.4's problem was that cosine and BM25 live on different, query-dependent scales. RRF cannot have that problem, because it never reads a magnitude \u2014 rank 1 contributes `1/(k+1)` whether the retriever scored it 0.47 or 5.15." },
      { t: "p", text: "Notice also what the contribution table shows: a document found by **both** retrievers at middling ranks (`api-auth`, 0.032002) nearly ties the document both ranked first (0.032787), while a document found by one retriever alone (`auth-sso`, 0.015873) scores about half. Agreement is what RRF rewards, which is its real mechanism." }
    ] },
    { t: "h2", n: "02", id: "k", text: "What the k constant does", sub: "And the default is wrong here" },
    { t: "code", lang: "text", title: "The ratio between rank 1 and rank 2",
      code: "k      1/(k+1)   1/(k+2)   ratio   meaning\n0      1.000000  0.500000  2.000   rank 1 dominates\n1      0.500000  0.333333  1.500   rank 1 dominates\n10     0.090909  0.083333  1.091   balanced\n60     0.016393  0.016129  1.016   balanced\n600    0.001664  0.001661  1.002   ranks nearly equal",
      caption: "Small k makes one retriever's top pick decisive; large k flattens toward a vote count." },
    { t: "code", lang: "text", title: "And measured on this corpus",
      code: "k       natural MRR   exact MRR\n1       0.717         1.000\n10      0.475         1.000\n60      0.393         1.000\n600     0.393         1.000",
      caption: "`k=1` nearly doubles natural MRR against the conventional `k=60`, at no cost to the exact class." },
    { t: "callout", kind: "trap", title: "The default is a default, not a result", body: [
      { t: "p", text: "`k=60` comes from the original RRF paper and is repeated nearly everywhere, and on this corpus it is the **worst** usable setting \u2014 0.393 against `k=1`'s 0.717, with the exact-term class unchanged at 1.000." },
      { t: "p", text: "The mechanism is that a large `k` flattens the difference between ranks, so a document's score becomes mostly a count of how many retrievers listed it at all. That is exactly the wrong aggregation when one retriever's list is noise. A small `k` lets a decisive rank-1 outweigh an agreement between two middling ranks." }
    ] },
    { t: "h2", n: "03", id: "worse", text: "The finding: fusion made it worse", sub: "Substantially, on the class that matters most" },
    { t: "code", lang: "text", title: "Natural queries, MRR",
      code: "dense only     0.964\nbm25 only      0.286\nRRF 1:1        0.393",
      caption: "The fusion lands near its **worse** input, not between them." },
    { t: "callout", kind: "warn", title: "Equal credibility is the bug", body: [
      { t: "p", text: "6.4 measured `I forgot my password` keeping no query tokens, so all 41 documents tied at 0.0000 and BM25's returned top three was a sort artefact. RRF cannot tell. It awards that tie-break document the same `1/61` as the document dense ranked first correctly." },
      { t: "p", text: "With two retrievers, one credible and one producing noise, that is enough to displace the right answer. Fusion is not averaging two opinions \u2014 it is letting a retriever that has no information vote at full weight." }
    ] },
    { t: "h2", n: "04", id: "weights", text: "And no weight fixes it", sub: "The trade is monotonic" },
    { t: "table", head: ["dense:sparse", "natural MRR", "exact MRR"], rows: [
      ["1:1", "0.393", "**1.000**"],
      ["2:1", "0.446", "0.938"],
      ["3:1", "0.464", "0.938"],
      ["5:1", "0.496", "0.875"],
      ["10:1", "0.642", "0.844"],
      ["1:0 (dense only)", "**0.964**", "0.781"]
    ] },
    { t: "callout", kind: "tradeoff", title: "So the answer is not a weight", body: [
      { t: "p", text: "Every row trades one class against the other, monotonically, with no interior optimum. Even at 10:1 \u2014 sparse contributing a tenth as much \u2014 natural MRR is 0.642 against dense's 0.964, while the exact class has already fallen to 0.844. There is no setting that recovers both." },
      { t: "p", text: "That is structural rather than a tuning failure. A single weight pair asserts that the two retrievers' relative usefulness is constant across queries, and it depends entirely on whether the query contains rare literal terms. So the fix is **routing** by query type, or 6.4's gate \u2014 fuse only when both retrievers actually have signal. Both require deciding something about the query first." }
    ] },
    { t: "diagram", kind: "steps", title: "RRF dissolves the calibration problem by never reading a score",
      caption: "`RRF(d) = Σ wᵣ / (k + rankᵣ(d))`. Five lines, no normalisation, no tuning — because a rank is already on a common scale and a score is not. This is also where the module's largest finding lives.",
      items: [
        { label: "run each retriever independently", desc: "dense and BM25, each producing its own ranked list", tone: "accent", code: "two lists" },
        { label: "throw the scores away", desc: "keep only the RANK — which is why no normalisation is needed", tone: "good", code: "the trick" },
        { label: "sum 1 / (k + rank) across lists", desc: "k dampens the top; a document ranked well by both wins", tone: "good", code: "5 lines" },
        { label: "and fusion is not free", desc: "it cannot promote what neither member retrieved — recall is still the ceiling (5.1)", tone: "warn", code: "the limit" }
      ] },
    { t: "exercise", kind: "build", title: "Implement RRF, then find where it fails",
      difficulty: "advanced", minutes: 30,
      body: "Implement reciprocal rank fusion and trace each retriever's contribution for one query, including a document found by only one of them. Tabulate the effect of the k constant on the ratio between adjacent ranks and measure it on both query classes. Then compare fused retrieval against each retriever alone on natural queries. Finally sweep the weights and report both classes at each setting.",
      requirements: ["Implement RRF and show per-retriever contributions for one query",
        "Include a document found by only one retriever and compare its score",
        "Explain why reading no scores removes the calibration problem",
        "Tabulate the rank-1 to rank-2 ratio for several values of k and measure both classes",
        "Measure fusion against each retriever alone on natural queries",
        "State which input the fusion lands near and why",
        "Sweep at least five weight ratios reporting both query classes"],
      hint: "Measure fusion against dense alone before assuming it helps, and do not accept k=60 because it is the default. Both results are the lesson.",
      solution: { lang: "python", title: "x0605.py \u2014 0.393 against 0.964, and k=60 is the worst",
        code: 'def fuse(q, kk=5, k=60, w=None):\n    d = dense(q, 20)\n    b = [x[0] for x in bm.rank(q, 20)]\n    return rrf([d, b], k=k, weights=w)[:kk]\n\nfor name, fn in (("dense only", dense),\n                 ("bm25 only", lambda q, kk=5: [x[0] for x in bm.rank(q, kk)]),\n                 ("RRF 1:1",   lambda q, kk=5: fuse(q, kk))):\n    _, (r, p, m, n) = evaluate(fn, QUERIES, k=5)\n    print("%-14s %.3f" % (name, m))\n\nfor k in (1, 10, 60, 600):\n    _, (_, _, m1, _) = evaluate(lambda q, kk=5, _k=k: fuse(q, kk, k=_k), QUERIES)\n    _, (_, _, m2, _) = evaluate(lambda q, kk=5, _k=k: fuse(q, kk, k=_k), KEYWORD_QUERIES)\n    print("k=%-5d %.3f  %.3f" % (k, m1, m2))',
        out: "==============================================================================\nPART 1 -- the formula, and what it ignores\n==============================================================================\n  RRF(d) = sum over retrievers r of  w_r / (k + rank_r(d))\n\n  query: 'Idempotency-Key header'\n    dense ranks: ['api-idempotency', 'api-auth', 'auth-sso', 'intg-webhook-out', 'api-versioning']\n    bm25 ranks : ['api-idempotency', 'api-versioning', 'api-auth', 'api-limits', 'ops-backup']\n\n  contributions with k=60:\n    api-idempotency      0.032787   (dense 1/61, bm25 1/61)\n    api-auth             0.032002   (dense 1/62, bm25 1/63)\n    api-versioning       0.031514   (dense 1/65, bm25 1/62)\n    auth-sso             0.015873   (dense 1/63, bm25 -)\n\n  no score appears anywhere in that calculation. that is the point:\n  the calibration problem from 6.4 cannot arise if magnitudes are\n  never read.\n==============================================================================\nPART 2 -- what the k constant does\n==============================================================================\n  k damps the difference between adjacent ranks.\n\n  k      1/(k+1)   1/(k+2)   ratio   meaning\n  0      1.000000  0.500000  2.000   rank 1 dominates\n  1      0.500000  0.333333  1.500   rank 1 dominates\n  10     0.090909  0.083333  1.091   balanced\n  60     0.016393  0.016129  1.016   balanced\n  600    0.001664  0.001661  1.002   ranks nearly equal\n\n  measured effect on this corpus:\n  k       natural MRR   exact MRR\n  1       0.717         1.000\n  10      0.475         1.000\n  60      0.393         1.000\n  600     0.393         1.000\n==============================================================================\nPART 3 -- the finding: naive fusion is WORSE than dense alone\n==============================================================================\n  natural queries, MRR:\n    dense only     0.964\n    bm25 only      0.286\n    RRF 1:1        0.393\n\n  RRF 1:1 is 0.393 against dense's 0.964. fusing made it WORSE.\n\n  the reason is that RRF treats both retrievers as equally credible.\n  on a natural query BM25 is near-useless, and its rank-1 document --\n  which is arbitrary -- gets the same 1/(k+1) as dense's correct one.\n==============================================================================\nPART 4 -- weights trade monotonically and never recover both\n==============================================================================\n  dense:sparse   natural MRR   exact MRR\n  1:1            0.393         1.000\n  2:1            0.446         0.938\n  3:1            0.464         0.938\n  5:1            0.496         0.875\n  10:1           0.642         0.844\n  1:0 (dense)    0.964         0.781\n\n  every row trades one against the other. there is no weight that\n  recovers dense's natural MRR and BM25's exact MRR at once, so the\n  answer is not a weight -- it is routing by query type, or fusing\n  only when both retrievers have signal.",
        notes: [
          { t: "p", text: "**No score appears anywhere in the RRF function** \u2014 only positions. That removes 6.4's calibration problem entirely, for the cost of a dictionary and a sort." },
          { t: "p", text: "**What RRF actually rewards is agreement.** A document both retrievers ranked middling (0.032002) nearly ties the document both ranked first (0.032787), while one found by a single retriever (0.015873) scores about half." },
          { t: "p", text: "**k damps the gap between adjacent ranks.** At k=0 rank 1 is worth twice rank 2; at k=600 all ranks are near-equal and RRF degenerates into counting how many retrievers listed a document." },
          { t: "p", text: "**The conventional k=60 is the worst usable setting here**: natural MRR 0.393, against 0.717 at k=1, with the exact class unchanged at 1.000. A large k is the wrong aggregation when one retriever's list is noise." },
          { t: "p", text: "**The headline: RRF 1:1 scores 0.393 on natural queries against dense's 0.964.** The fusion lands near its WORSE input rather than between the two." },
          { t: "p", text: "**Because every retriever is treated as equally credible.** 6.4 showed BM25's top-3 on one natural query was a tie-break over 41 zeros \u2014 and RRF gives it the same 1/61 as dense's correct rank 1." },
          { t: "p", text: "**No weight fixes it.** The sweep is monotonic: 1:1 gives 0.393/1.000, 10:1 gives 0.642/0.844, dense alone 0.964/0.781. Every setting trades one class against the other." },
          { t: "p", text: "**So the answer is routing by query type, or gating on whether both retrievers have signal** \u2014 both of which require deciding something about the query first." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the hybrid search that was never measured against its baseline", body: [
      { t: "p", text: "A team adds hybrid retrieval because it is the recognised best practice, measures the hybrid system at MRR 0.39, and treats that as the baseline to improve from. Nobody measures dense alone on the same set." },
      { t: "p", text: "Dense alone was 0.96. The hybrid was a large regression that looked like a starting point, and months of tuning went into recovering ground lost by adding a component." },
      { t: "p", text: "The protection is cheap and rarely done: every time you add a retrieval component, measure the system with and without it, per query class. A pooled number would not have caught this, because fusion genuinely fixed the exact-term class \u2014 to a perfect 1.000 \u2014 while wrecking the natural one, so an aggregate shows a modest change and hides both effects." }
    ] }
  ],
  takeaways: [
    "**RRF(d) = \u03a3 w\u1d63 / (k + rank\u1d63(d))** \u2014 a dictionary and a sort.",
    "**No score appears in it**, which removes 6.4's calibration problem entirely.",
    "**What RRF rewards is agreement**: a document both retrievers ranked middling nearly ties one both ranked first.",
    "**k damps the gap between adjacent ranks**; at k=600 RRF degenerates into counting retrievers.",
    "**The conventional k=60 is the worst usable setting here** \u2014 0.393 against k=1's 0.717.",
    "**Because a large k is the wrong aggregation when one retriever's list is noise.**",
    "**RRF 1:1 scores 0.393 on natural queries against dense's 0.964** \u2014 worse than its better input.",
    "**It lands near its worse input**, because every retriever is treated as equally credible.",
    "**BM25's tie-break rank 1 over 41 tied zeros gets the same 1/61 as dense's correct rank 1.**",
    "**Fusion is not averaging two opinions** \u2014 it lets a retriever with no information vote at full weight.",
    "**The weight sweep is monotonic**: 1:1 → 0.393/1.000, 10:1 → 0.642/0.844, dense → 0.964/0.781.",
    "**No weight recovers both query classes**, so the answer is routing or gating, not a weight.",
    "**Measure every new retrieval component against the system without it, per query class.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does RRF not suffer from the calibration problem that weighted score fusion does?",
      options: ["It normalises each retriever's scores first",
        "It never reads a score \u2014 only positions, so rank 1 contributes the same amount on any scale",
        "It uses the geometric rather than arithmetic mean",
        "The k constant absorbs scale differences"],
      answer: 1,
      why: "The formula sums w/(k + rank) over retrievers, and rank is an integer position. Whether a retriever scored its top document 0.47 or 5.15 is never consulted, so no scale mismatch can arise and no per-query normalisation is needed. What RRF rewards instead is agreement between retrievers, which is a different and usually sensible aggregation." },
    { stem: "On this corpus k=1 gave natural MRR 0.717 and k=60 gave 0.393. Why?",
      options: ["k=1 happens to overfit this query set",
        "A large k flattens rank differences into a vote count, which is the wrong aggregation when one retriever's list is noise",
        "k=60 requires more candidates than were fetched",
        "Small k values increase recall"],
      answer: 1,
      why: "At k=60 the gap between rank 1 and rank 2 is a factor of 1.016, so a document's score is essentially how many retrievers listed it at all. When one retriever is producing a tie-break ordering over documents that all scored zero, counting its votes equally is actively harmful. A small k lets a decisive rank 1 outweigh agreement between two middling ranks." },
    { stem: "RRF 1:1 scored 0.393 on natural queries where dense alone scored 0.964. What is the mechanism?",
      options: ["The k constant was set too low",
        "RRF treats both retrievers as equally credible, so BM25's tie-break rank 1 gets the same weight as dense's correct one",
        "The candidate depth was too shallow for fusion to work",
        "BM25 returned documents dense had not indexed"],
      answer: 1,
      why: "On one natural query not a single term survived tokenisation, so all 41 documents scored exactly zero and BM25's top-3 was purely a sort artefact. RRF awards that document the same 1/(k+1) as the one dense correctly ranked first, and with two retrievers that is enough to displace the right answer. Fusion lets an uninformed retriever vote at full strength." },
    { stem: "The weight sweep gives 0.393/1.000 at 1:1 and 0.642/0.844 at 10:1. What does that pattern mean?",
      options: ["The optimum is between 10:1 and 20:1",
        "The trade is monotonic \u2014 no weight recovers both classes, so the fix is routing or gating rather than weighting",
        "The sweep needs finer granularity to find the peak",
        "Exact-term queries should be removed from the evaluation set"],
      answer: 1,
      why: "Each step toward dense improves natural queries and degrades exact-term ones, with no interior maximum anywhere in the sweep. That is structural: a fixed weight asserts the retrievers' relative usefulness is constant across queries, when it depends on whether the query contains rare literal terms. So the decision has to be made per query." }
  ] },
  interview: { title: "Interview practice", sub: "Rank fusion", questions: [
    { level: "core", q: "Explain reciprocal rank fusion and why it is popular.",
      strong: "A strong answer gives the formula, the problem it dissolves, and what it rewards.",
      answer: [
        { t: "p", text: "For each document you sum, over retrievers, a weight divided by k plus that retriever's rank for the document, then sort by the total. About five lines." },
        { t: "p", text: "It is popular because of what is missing: no score appears anywhere. Weighting raw scores fails because cosine is bounded and BM25 is not, and because BM25's scale varies per query. RRF cannot have that problem, since rank 1 contributes the same amount whatever the retriever scored it." },
        { t: "p", text: "What it actually rewards is agreement. In a trace I looked at, a document both retrievers ranked middling scored almost exactly as high as the document both ranked first, while a document only one retriever found scored about half. So it is closer to a consensus vote than to a ranking average, which is usually the behaviour you want." },
        { t: "p", text: "The k constant controls how much a top rank dominates. At k=0, rank 1 is worth twice rank 2 and one retriever can decide alone; at k=600 all ranks are nearly equal and it degenerates into counting how many retrievers listed the document. I would not take the conventional 60 on faith \u2014 on a corpus I measured, k=1 gave natural-query MRR of 0.717 against 0.393 at k=60, with no cost to the other query class." }
      ] },
    { level: "advanced", q: "Have you seen rank fusion make a system worse?",
      strong: "A strong answer has the measurement and the structural explanation.",
      answer: [
        { t: "p", text: "Yes, and substantially. Fusing dense and BM25 one-to-one on natural-language queries gave MRR 0.393 where dense alone gave 0.964. The hybrid landed near its worse input rather than between the two." },
        { t: "p", text: "The mechanism is that RRF treats every retriever as equally credible, and on one of those queries BM25 had literally nothing. Not one query term survived tokenisation, so all 41 documents scored exactly zero and the top three it returned was the sort's tie-break order. RRF gave that document the same one-over-sixty-one as the document dense had correctly ranked first. Fusion is not averaging two opinions, it is letting an uninformed retriever vote at full weight." },
        { t: "p", text: "And weighting does not rescue it. Sweeping from one-to-one to ten-to-one, natural MRR climbed from 0.393 to 0.642 while exact-term MRR fell from 1.000 to 0.844, and dense alone was still 0.964. Monotonic, no interior optimum \u2014 because a fixed weight asserts the retrievers' relative usefulness is constant across queries, and it is not." },
        { t: "p", text: "So I treat hybrid search as a routing problem disguised as a weighting problem. The cheap version is a gate: check whether the sparse retriever matched anything at all and whether a surviving term is actually rare, and skip the fusion when it did not. And generally, measure every retrieval component against the system without it, per query class \u2014 a pooled number hides this, because the two effects partly cancel." }
      ] },
    { level: "core", q: "Would you use the default k=60 in reciprocal rank fusion?",
      strong: "A strong answer treats the default as untested.",
      answer: [
        { t: "p", text: "Not without measuring it. On the corpus I worked with, 60 was the worst usable setting \u2014 natural-query MRR of 0.393, against 0.717 at k=1, with the exact-term class unchanged at a perfect 1.000 either way. Nearly double the score, for a one-character change." },
        { t: "p", text: "The mechanism is straightforward once you look at the arithmetic. k damps the gap between adjacent ranks: at k=60 the ratio between rank 1 and rank 2 is 1.016, so a document's fused score is essentially a count of how many retrievers listed it anywhere. At k=1 that ratio is 1.5 and a decisive rank 1 actually wins." },
        { t: "p", text: "Which aggregation you want depends on whether your retrievers are independently credible. If they are, counting votes is reasonable. If one of them is producing noise for a query class \u2014 and mine was, returning a tie-break ordering over documents that all scored zero \u2014 then weighting its vote equally is the thing causing the damage, and a large k maximises that effect." },
        { t: "p", text: "So I treat k=60 as a value from a paper on a different corpus with different retrievers, not as a tuned result. It is one line to sweep, and it was the cheapest improvement available to me in that module." }
      ] }
  ] }
});
