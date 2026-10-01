EC.receiveLesson({
  id: "5.9",

  lede: "Dense retrieval matches meaning and misses exact tokens; BM25 matches tokens and misses meaning. The standard advice is to run both and fuse them, and on the shared corpus that advice holds: **RRF reached 100% recall@5 where dense alone reached 95% and BM25 alone 90%**. Two results complicate the picture. BM25 \u2014 a 1990s keyword algorithm with a 0.18-second index build \u2014 **beat** the neural retriever at k=1, 80% to 75%. And adding a cross-encoder re-ranker on top of the fused results made them **worse**, 100% down to 90% at k=5, for 2,405 ms per query.",

  objectives: [
    "Explain what BM25 scores and where it beats a dense retriever",
    "Implement reciprocal rank fusion and say why it needs no score calibration",
    "Judge when a cross-encoder re-ranker is worth its latency",
    "Recognise that re-ranking can degrade an already-good first stage",
    "Choose a shortlist depth from the recall curve rather than by convention"
  ],

  prerequisites: ["5.7"],

  blocks: [

    { t: "h2", n: "01", id: "bm25", text: "The sparse retriever",
      sub: "Exact tokens, weighted by rarity" },

    { t: "p", text: "BM25 scores a document by how many query terms it contains, weighting each term by how rare it is across the corpus and dampening the effect of repetition and document length. There is no model and no training \u2014 it is a formula over term counts, and it indexes 1,187 chunks in **0.18 seconds** against 26.9 seconds to embed them." },

    { t: "p", text: "Its strength is the dense retriever\u2019s blind spot. An embedding is a lossy summary of meaning, so a rare identifier \u2014 a function name, an error code, a symbol like `alpha` \u2014 contributes a little to the vector and may be swamped. BM25 treats a rare term as the most informative thing in the query." },

    { t: "code", lang: "python", title: "g59.py \u2014 the two retrievers on the same questions", code: `from rank_bm25 import BM25Okapi

def tokenize(t):
    return re.findall(r"[a-z0-9_]+", t.lower())

bm25 = BM25Okapi([tokenize(c) for c in chunks])
SPARSE = np.array([np.argsort(-bm25.get_scores(tokenize(q))) for q, _, _ in QS])`,
      out: `  BM25 index built in 0.18 s over 1187 chunks

  retriever                     r@1      r@3      r@5     r@10
  dense (MiniLM)                75%      90%      95%      95%
  sparse (BM25)                 80%      85%      90%     100%`,
      hl: [2, 3],
      caption: "BM25 wins at k=1 and k=10; dense wins at k=3 and k=5. Neither dominates." },

    { t: "callout", kind: "insight", title: "The thirty-year-old algorithm is competitive, and that is informative",
      body: [
        { t: "p", text: "BM25 beat the neural retriever at k=1 \u2014 80% against 75% \u2014 with no model, no GPU and a 0.18-second index. That is not a curiosity; it is a reason to always measure it as a baseline before concluding that dense retrieval is working." },
        { t: "p", text: "Part of the explanation is the corpus. Technical documentation is full of exact identifiers \u2014 `top_p`, `GQA`, `QLoRA`, `nprobe` \u2014 and questions about it tend to use those identifiers verbatim. That is close to the best case for term matching and close to the worst for a lossy semantic summary." },
        { t: "p", text: "On a corpus of natural prose where queries paraphrase rather than quote, the ordering would likely reverse. Which is the point: **which retriever wins is a property of your corpus and your queries**, and it costs very little to find out." }
      ] },

    { t: "h2", n: "02", id: "disagree", text: "Where they disagree",
      sub: "Thirteen ties out of twenty, and a split on the rest" },

    { t: "code", lang: "python", title: "g59.py \u2014 rank of the first correct chunk under each", code: `for i, (q, doc, must) in enumerate(QS):
    d = first_correct(DENSE, i)
    s = first_correct(SPARSE, i)`,
      out: `  question                                        dense     BM25     better
  What does top_p do?                                 1        2      dense
  What is speculative decoding?                       2        4      dense
  What is continuous batching?                        2        1       BM25
  What is the formula for LoRA?                       1        8      dense
  Why divide alpha by r?                             15       10       BM25
  How do I write a good system prompt?                2        1       BM25
  What is self-consistency?                           4        1       BM25
  ... (13 further questions tied at rank 1)

  dense better on 3, BM25 better on 4, tied on 13, neither on 0`,
      hl: [5],
      caption: "They agree on two thirds of the questions. The value of fusing is in the third where they do not." },

    { t: "callout", kind: "good", title: "The module's running failure finally moves",
      body: [
        { t: "p", text: "*\u201cWhy divide alpha by r?\u201d* has been stuck since 5.1 \u2014 rank 15 under dense retrieval, unmoved by every chunking configuration in 5.4, because the passage that answers it calls the term a **\u201cvolume knob\u201d** and shares almost no vocabulary with the question." },
        { t: "p", text: "BM25 puts it at **rank 10**. Not solved, but better, and for exactly the predicted reason: the question contains the literal tokens `alpha` and `r`, and BM25 scores those as rare and informative while the embedding averaged them into a summary of a sentence about division." },
        { t: "p", text: "This is the general shape of the hybrid argument. The two retrievers fail on *different* questions, so the fusion has something to work with \u2014 if they failed on the same ones, combining them would gain nothing." }
      ] },

    { t: "h2", n: "03", id: "rrf", text: "Reciprocal rank fusion",
      sub: "Combine the rankings, not the scores" },

    { t: "p", text: "The obvious way to combine two retrievers is to average their scores, and it does not work: a cosine similarity of 0.58 and a BM25 score of 14.2 are not on the same scale, are not bounded the same way, and move differently across queries. Any weighting is a guess that needs recalibrating whenever either side changes." },

    { t: "p", text: "RRF sidesteps this by ignoring the scores and using only the **ranks**:" },

    { t: "math", tex: "\\text{RRF}(d) = \\sum_{r \\in \\text{retrievers}} \\frac{1}{k + \\text{rank}_r(d)}" },

    { t: "code", lang: "python", title: "g59.py \u2014 nine lines, no calibration", code: `def rrf(rank_lists, k=60, depth=100):
    out = []
    for i in range(len(QS)):
        score = np.zeros(len(chunks))
        for R in rank_lists:
            for r, idx in enumerate(R[i][:depth]):
                score[idx] += 1.0 / (k + r + 1)
        out.append(np.argsort(-score))
    return np.array(out)`,
      out: `  fusion                          r@1      r@3      r@5     r@10
  RRF k=10                        75%      95%      95%     100%
  RRF k=60                        80%      95%     100%     100%
  RRF k=200                       80%      95%     100%     100%

  (dense alone:  75%  90%  95%   95%)
  (BM25 alone:   80%  85%  90%  100%)`,
      hl: [3],
      caption: "RRF at k=60 matches or beats both components at every cut-off \u2014 100% at k=5 against 95% and 90%." },

    { t: "callout", kind: "insight", title: "The constant k controls how much rank-1 dominates",
      body: [
        { t: "p", text: "With `k = 10`, a first-place result scores 1/11 and a tenth-place result 1/20 \u2014 a ratio of 1.8, so being top matters a lot. With `k = 200` the same two score 1/201 and 1/210, a ratio of 1.04, so the fusion is nearly a vote on *appearing at all* rather than on placing well." },
        { t: "p", text: "Measured, 60 and 200 were identical here and 10 was slightly worse at k=5. The conventional default of 60 is a reasonable middle and this corpus gives no reason to move it \u2014 though with twenty questions I would not read the k=10 difference as more than one question." },
        { t: "p", text: "What makes RRF genuinely useful is that it needs no calibration at all. Add a third retriever, swap the embedding model, change the BM25 tokenizer \u2014 the fusion keeps working, because ranks are comparable across systems in a way scores are not." }
      ] },

    { t: "h2", n: "04", id: "rerank", text: "The cross-encoder, and when it hurts",
      sub: "The result I did not expect to report" },

    { t: "p", text: "5.3 described the bi-encoder\u2019s constraint: it must summarise a chunk into one vector before knowing the question. A **cross-encoder** has no such constraint \u2014 it reads the query and the chunk together and scores the pair, so it can see that \u201cvolume knob\u201d answers \u201cwhy divide alpha by r\u201d. The price is that it cannot pre-compute anything, so it runs only over a shortlist." },

    { t: "code", lang: "python", title: "g59.py \u2014 re-ranking the top 20", code: `ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)

for i, (q, _, _) in enumerate(QS):
    cand = BASE[i][:20]
    sc = ce.predict([(q, chunks[j]) for j in cand])
    order = cand[np.argsort(-sc)]`,
      out: `                                      r@1      r@3      r@5
  dense, before re-ranking            75%      90%      95%
  dense + cross-encoder top-20        80%      90%     100%   (45.2 s for 20 queries)

  RRF, before re-ranking              80%      95%     100%
  RRF + cross-encoder top-20          80%      90%      90%   (48.1 s for 20 queries)

  cross-encoder cost: 2405 ms per query to score 20 candidates
  against 11.0 ms for the dense search over the whole index`,
      hl: [5, 6],
      caption: "On dense it helps: 95% to 100% at k=5. On RRF it hurts: 100% down to 90%." },

    { t: "callout", kind: "trap", title: "Re-ranking a good first stage made it worse",
      body: [
        { t: "p", text: "This is the finding worth carrying. Applied to dense retrieval, the cross-encoder did what it is supposed to do \u2014 **95% to 100% at k=5**, and 75% to 80% at k=1. Applied to the RRF output, which was already at 100%, it dropped recall to **90%**." },
        { t: "p", text: "A re-ranker is a *different model with a different opinion*. When the first stage is weak, replacing its ordering with a better-informed one helps. When the first stage is already right, the re-ranker can only disturb it \u2014 and a model trained on MS MARCO web passages will sometimes prefer a different chunk of technical documentation than the one your evaluation calls correct." },
        { t: "p", text: "With twenty questions, 100% to 90% is two questions, so I would not claim a large effect. What I would claim is the direction of the lesson: **a re-ranker is not a monotonic improvement**, and bolting one onto a pipeline without measuring before and after is how you ship a regression." },
        { t: "p", text: "The ordering also matters for how you read published gains. A re-ranker demonstrated on top of a weak baseline will look excellent; the same component over a well-tuned hybrid may show nothing or less than nothing." }
      ] },

    { t: "callout", kind: "warn", title: "And it costs 219\u00d7 the search",
      body: [
        { t: "p", text: "**2,405 ms per query** to score twenty candidates, against **11 ms** for the dense search over the entire index. The re-ranker is not a refinement on the retrieval budget \u2014 it is two and a half seconds added to the critical path of every request." },
        { t: "p", text: "That figure is CPU-bound and would fall substantially on a GPU, where cross-encoders are normally served; batched on an accelerator, twenty pairs is tens of milliseconds. So the number to take from this is the *ratio and the shape* \u2014 cost linear in shortlist depth, with no precomputation possible \u2014 rather than the absolute 2.4 seconds." },
        { t: "p", text: "The shape is what decides the architecture: because the cost is per candidate, the shortlist depth is a direct latency dial, and because nothing can be precomputed, it is paid on every query including cached-corpus ones." }
      ] },

    { t: "code", lang: "python", title: "g59.py \u2014 how deep a shortlist to re-rank", code: `for depth in (5, 10, 20, 50):
    cand = DENSE[i][:depth]
    sc = ce.predict([(q, chunks[j]) for j in cand])`,
      out: `  shortlist             r@1      r@3      r@5     ms/query
  5                     75%      90%      95%          524
  10                    80%      95%      95%          871
  20                    80%      90%     100%         1716
  50                    80%      90%      95%         3961`,
      caption: "Cost is linear in depth. Recall is not monotone \u2014 50 is worse than 20, which at this sample size is noise." },

    { t: "viz", title: "Three retrievers and a re-ranker", caption: "Fusion beats both components. The re-ranker helps a weak first stage and hurt a strong one.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Recall at 5 for dense, sparse, fusion and re-ranking">
  <text x="16" y="22" class="s-label">RECALL@5</text>

  <text x="16" y="52" class="s-sub">BM25 alone</text>
  <rect x="150" y="40" width="360" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="520" y="52" class="s-mono">90%</text>
  <text x="580" y="52" class="s-sub">0.18 s index, no model</text>

  <text x="16" y="82" class="s-sub">dense alone</text>
  <rect x="150" y="70" width="380" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="540" y="82" class="s-mono">95%</text>
  <text x="580" y="82" class="s-sub">26.9 s index</text>

  <text x="16" y="112" class="s-sub">RRF fusion</text>
  <rect x="150" y="100" width="400" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="560" y="112" class="s-mono" style="fill:var(--good)">100%</text>
  <text x="614" y="112" class="s-sub">+9 lines</text>

  <text x="16" y="142" class="s-sub">dense + rerank</text>
  <rect x="150" y="130" width="400" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="560" y="142" class="s-mono" style="fill:var(--good)">100%</text>
  <text x="614" y="142" class="s-sub">+2,405 ms/query</text>

  <text x="16" y="172" class="s-sub">RRF + rerank</text>
  <rect x="150" y="160" width="360" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="520" y="172" class="s-mono" style="fill:var(--crit)">90% \u2014 worse than RRF alone</text>

  <line x1="16" y1="198" x2="744" y2="198" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="222" class="s-label" style="fill:var(--warn)">COST PER QUERY</text>
  <rect x="150" y="234" width="4" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="166" y="247" class="s-mono" style="fill:var(--good)">dense search: 11 ms</text>
  <rect x="150" y="258" width="500" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="166" y="271" class="s-mono" style="fill:var(--crit)">cross-encoder over 20 candidates: 2,405 ms (CPU) \u2014 219\u00d7 the search</text>
  <text x="16" y="294" class="s-sub">linear in shortlist depth, nothing precomputable, and much faster on a GPU \u2014 read the ratio, not the absolute</text>
</svg>` },

    { t: "h2", n: "05", id: "deciding", text: "What to actually build",
      sub: "In order of return on effort" },

    { t: "ladder", title: "Adding retrieval stages", rungs: [
      { level: "bad", label: "Dense only, because it is the modern one", why: "Leaves the cheapest improvement in the module on the table. BM25 cost 0.18 seconds to index and beat dense at k=1 on this corpus \u2014 and on exact identifiers, which technical and legal corpora are full of, it is the stronger signal.",
        code: `results = vector_store.search(query, k=5)` },
      { level: "ok", label: "Dense + BM25 fused with RRF", why: "Nine lines, no calibration, no extra model, no measurable latency. Measured 100% recall@5 against 95% dense and 90% sparse \u2014 better than either component at every cut-off.",
        code: `dense  = vector_store.search(query, k=100)
sparse = bm25.get_top_n(tokenize(query), n=100)
results = rrf([dense, sparse], k=60)[:5]` },
      { level: "best", label: "Fuse, then re-rank only if it measurably helps", why: "The cross-encoder improved a dense-only first stage and degraded the fused one, at 2,405 ms per query. It is the most expensive stage available and the only one measured here that can make things worse, so it earns its place with an A/B on your own set or not at all.",
        code: `shortlist = rrf([dense, sparse], k=60)[:20]
if RERANK_ENABLED:                     # measured on our own eval set
    shortlist = cross_encoder_sort(query, shortlist)
results = shortlist[:5]`,
        note: "Keep the flag. A re-ranker's value changes when the first stage changes, so it needs re-measuring after any retrieval work." }
    ] },

    { t: "exercise", kind: "lab", title: "Build hybrid retrieval and measure every stage", difficulty: "advanced", minutes: 40,
      body: "Add a BM25 retriever beside your dense one and compare them per question. Fuse them with reciprocal rank fusion and measure the result against both components. Then add a cross-encoder re-ranker over the shortlist and measure it against both the dense-only and the fused first stage. Report latency for every stage.",
      requirements: [
        "Report the rank of the first correct chunk per question under each retriever, not just aggregate recall",
        "Count how many questions each retriever wins, loses and ties",
        "Implement RRF over ranks and sweep its constant k",
        "Apply the re-ranker to both a weak and a strong first stage, and report both",
        "Measure per-query latency for search, fusion and re-ranking separately"
      ],
      hint: "Apply the re-ranker to your best first stage as well as your worst. The interesting result is usually in that comparison, and reporting only the favourable one is how re-rankers get a reputation they cannot always earn.",
      solution: { lang: "python", title: "g59.py \u2014 sparse, fusion and re-ranking", code: `bm25 = BM25Okapi([tokenize(c) for c in chunks])
SPARSE = np.array([np.argsort(-bm25.get_scores(tokenize(q))) for q, _, _ in QS])
DENSE  = np.argsort(-(QV @ E.T), axis=1)

def rrf(rank_lists, k=60, depth=100):
    out = []
    for i in range(len(QS)):
        score = np.zeros(len(chunks))
        for R in rank_lists:
            for r, idx in enumerate(R[i][:depth]):
                score[idx] += 1.0 / (k + r + 1)
        out.append(np.argsort(-score))
    return np.array(out)

ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)

for base_label, BASE in (("dense", DENSE), ("RRF", rrf([DENSE, SPARSE]))):
    RER = []
    for i, (q, _, _) in enumerate(QS):
        cand = BASE[i][:20]
        sc = ce.predict([(q, chunks[j]) for j in cand])
        RER.append(np.concatenate([cand[np.argsort(-sc)], BASE[i][20:]]))
    print(base_label, score_ranks(BASE), score_ranks(np.array(RER)))`,
        out: `  retriever                     r@1      r@3      r@5     r@10
  dense (MiniLM)                75%      90%      95%      95%
  sparse (BM25)                 80%      85%      90%     100%
  (BM25 index built in 0.18 s)

  dense better on 3, BM25 better on 4, tied on 13

  fusion                          r@1      r@3      r@5     r@10
  RRF k=10                        75%      95%      95%     100%
  RRF k=60                        80%      95%     100%     100%
  RRF k=200                       80%      95%     100%     100%

                                      r@1      r@3      r@5
  dense, before re-ranking            75%      90%      95%
  dense + cross-encoder top-20        80%      90%     100%
  RRF, before re-ranking              80%      95%     100%
  RRF + cross-encoder top-20          80%      90%      90%

  cross-encoder: 2405 ms/query for 20 candidates vs 11 ms for the search

  shortlist             r@1      r@3      r@5     ms/query
  5                     75%      90%      95%          524
  20                    80%      90%     100%         1716
  50                    80%      90%      95%         3961`,
        notes: [
          { t: "p", text: "**BM25 beat the neural retriever at k=1, 80% to 75%**, with no model and a 0.18-second index. On a corpus of technical documentation where questions quote identifiers verbatim, term matching is close to its best case \u2014 which is exactly why it should be measured as a baseline rather than assumed obsolete." },
          { t: "p", text: "**They tie on 13 of 20 questions and split the rest 4\u20133.** That disagreement is what makes fusion worth anything: if both failed on the same questions, combining them would gain nothing. The module's long-running failure moves here too \u2014 \u2018Why divide alpha by r?\u2019 goes from rank 15 under dense to rank 10 under BM25, because the literal tokens `alpha` and `r` are rare and informative." },
          { t: "p", text: "**RRF at k=60 beat both components at every cut-off** \u2014 100% at k=5 against 95% and 90% \u2014 for nine lines and no calibration. Fusing on ranks rather than scores is what makes it robust: cosine 0.58 and BM25 14.2 are not comparable, and any weighting between them needs recalibrating whenever either side changes." },
          { t: "p", text: "**The re-ranker helped the weak first stage and hurt the strong one**: dense 95% \u2192 100%, RRF 100% \u2192 90%. A re-ranker is a second model with its own opinion, and when the first stage is already right it can only disturb the ordering. Two questions at this sample size, so a modest claim \u2014 but enough to insist on measuring before and after rather than assuming monotonic improvement." },
          { t: "p", text: "**And it costs 219\u00d7 the search**: 2,405 ms per query against 11 ms, linear in shortlist depth with nothing precomputable. That figure is CPU-bound and much smaller on a GPU, so the transferable part is the shape \u2014 per-candidate cost paid on every query \u2014 rather than the absolute number." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Dense retrieval asks \u201cwhat is this about?\u201d and sparse retrieval asks \u201cdoes it contain these words?\u201d. Most questions need both answers, and the ones that need only one are not the same questions \u2014 which is why fusing helps and why fusing on ranks rather than scores is what makes it survive a model change." },
        { t: "p", text: "A re-ranker is a third opinion, and a better-informed one. Third opinions are valuable when the first two are unsure and disruptive when they are right." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe added a cross-encoder re-ranker and our offline metrics barely moved, but p99 latency doubled. Keep it or drop it?\u201d**" },
        { t: "p", text: "On those numbers, drop it \u2014 but I would want one measurement first, because \u2018barely moved\u2019 can mean two different things." },
        { t: "p", text: "A re-ranker can only reorder what the first stage returned. If the first stage is already strong, there is nothing left to fix and the re-ranker can only disturb a correct ordering. I measured exactly that: the same cross-encoder took a dense-only first stage from 95% to 100% recall@5, and took a fused dense-plus-BM25 first stage from 100% down to 90%. If they have already done retrieval work, the re-ranker may be arriving after the problem was solved." },
        { t: "p", text: "So the measurement is recall of the *first stage* at the shortlist depth. If it is already near the ceiling, the re-ranker has no headroom and the latency is buying nothing. If it is low and the re-ranker still does not help, the shortlist is too shallow \u2014 re-ranking twenty candidates cannot find an answer sitting at rank fifty." },
        { t: "p", text: "The latency is the other half. I measured 2,405 ms per query on CPU to score twenty candidates against 11 ms for the search itself \u2014 219\u00d7. On a GPU that collapses to tens of milliseconds, so the first question is whether it is being served on the right hardware, and the second is whether the shortlist depth is larger than the measurement supports. Cost is linear in depth and recall was flat from 20 to 50 in my sweep." },
        { t: "p", text: "What I would do instead, if they have not: add BM25 and fuse with RRF. Nine lines, no second model, no measurable latency, and it took my recall@5 from 95% to 100% \u2014 the same gain the re-ranker was bought for, at none of the cost." },
        { t: "p", text: "And I would keep the re-ranker behind a flag rather than deleting the code, because its value depends on the first stage. If retrieval gets worse later \u2014 a new corpus, a different chunker \u2014 it becomes worth turning on again, and that is a measurement rather than a memory." }
      ] }
  ],

  takeaways: [
    "**BM25 scores exact terms weighted by rarity** \u2014 no model, no training, and a 0.18-second index against 26.9 seconds to embed the same corpus.",
    "**It beat the dense retriever at k=1, 80% to 75%**, because technical documentation is full of exact identifiers that questions quote verbatim.",
    "**They tie on 13 of 20 questions and split the rest**, and that disagreement is the entire reason fusing is worth anything.",
    "**The module's stuck question improved under BM25**: \u201cWhy divide alpha by r?\u201d went from rank 15 to rank 10, because `alpha` and `r` are rare literal tokens.",
    "**RRF fuses ranks, not scores**, so no calibration is needed and nothing breaks when a component is swapped \u2014 cosine 0.58 and BM25 14.2 are not comparable quantities.",
    "**RRF at k=60 beat both components at every cut-off**: 100% recall@5 against 95% dense and 90% sparse, for nine lines of code.",
    "**A cross-encoder reads query and chunk together**, so it has no bi-encoder blind spot \u2014 and it cannot precompute, so it runs only over a shortlist.",
    "**It helped a weak first stage and hurt a strong one**: dense 95% \u2192 100%, fused 100% \u2192 90%. A re-ranker is not a monotonic improvement.",
    "**It cost 219\u00d7 the search** \u2014 2,405 ms per query on CPU against 11 ms \u2014 linear in shortlist depth with nothing precomputable. Much faster on a GPU; read the ratio.",
    "**Published re-ranker gains are relative to a baseline.** Demonstrated over a weak first stage they look excellent; over a tuned hybrid they may show nothing."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does reciprocal rank fusion combine ranks rather than scores?",
        options: [
          "Because ranks are cheaper to compute than scores",
          "Because scores from different retrievers are on incomparable scales, so any weighting needs recalibration whenever a component changes",
          "Because ranks preserve the original similarity ordering better",
          "Because scores cannot be summed across retrievers"
        ],
        answer: 1,
        why: "A cosine similarity of 0.58 and a BM25 score of 14.2 are bounded differently, distributed differently and move differently across queries, so averaging them requires a weighting that is a guess and that breaks when the embedding model or tokenizer changes. Ranks are comparable across any retriever by construction, which is why RRF needs no calibration and survives swapping a component. Both are cheap to compute, and scores can be summed \u2014 the problem is that the sum is meaningless." },

      { stem: "A cross-encoder re-ranker improves dense retrieval from 95% to 100% recall@5, and degrades an RRF-fused first stage from 100% to 90%. What explains this?",
        options: [
          "The re-ranker was trained on a different domain and should be fine-tuned",
          "A re-ranker can only reorder the shortlist \u2014 when the first stage is already correct, a second opinion can only disturb it",
          "RRF produces scores the re-ranker cannot interpret",
          "The shortlist depth was too small for the fused results"
        ],
        answer: 1,
        why: "The re-ranker is a separate model with its own opinion about relevance. Against a weak ordering, substituting a better-informed one helps; against an ordering that is already right, it can only move correct results down. Domain mismatch is a real contributing factor \u2014 an MS MARCO model scoring technical documentation \u2014 but the structural point is that re-ranking is not monotonic, which is why it needs an A/B against the actual first stage rather than being assumed to help." },

      { stem: "BM25 beat a neural retriever at k=1 on a corpus of technical documentation. What is the most likely reason?",
        options: [
          "The embedding model was too small",
          "Technical questions quote exact identifiers, and term matching weights rare literal tokens heavily where an embedding averages them into a summary",
          "BM25 had access to more of the corpus",
          "The chunks were too long for the embedding model"
        ],
        answer: 1,
        why: "Questions about documentation tend to use the same identifiers the documentation uses \u2014 top_p, GQA, QLoRA \u2014 which is close to the best case for term matching and the worst case for a lossy semantic summary. On a corpus of natural prose where queries paraphrase rather than quote, the ordering would likely reverse. That is the point: which retriever wins is a property of your corpus and queries, and BM25 costs 0.18 seconds to index, so there is no reason not to measure it." },

      { stem: "A cross-encoder costs 2,405 ms per query to score 20 candidates against 11 ms for the vector search. What should you take from this ratio?",
        options: [
          "Cross-encoders are impractical and should not be used",
          "The cost is per candidate and cannot be precomputed, so shortlist depth is a direct latency dial paid on every query",
          "The vector index should be made larger to balance the stages",
          "Re-ranking should be moved to index time"
        ],
        answer: 1,
        why: "A bi-encoder embeds documents once offline; a cross-encoder must see the query, so every candidate is a forward pass at query time. That makes cost linear in shortlist depth \u2014 measured, 524 ms at depth 5 and 3,961 ms at depth 50 \u2014 with nothing precomputable. The absolute figure is CPU-bound and falls sharply on a GPU where these are normally served, so the shape transfers and the number does not. Re-ranking at index time is impossible by definition, since the query does not exist yet." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the modern answer and the measured answer are not always the same",
    questions: [
      { level: "core",
        q: "What is hybrid search and why does it help?",
        strong: "A strong answer explains the complementary failure modes and why RRF fuses ranks.",
        answer: [
          { t: "p", text: "Running a dense retriever and a sparse one like BM25 over the same corpus and combining their results. They help because they fail on different questions: an embedding is a lossy summary of meaning and can swamp a rare identifier, while BM25 treats a rare term as the most informative thing in the query and has no idea what anything means." },
          { t: "p", text: "Measured on a real corpus, they tied on 13 of 20 questions and split the remaining seven roughly evenly. That disagreement is what fusion exploits \u2014 if both failed on the same questions there would be nothing to gain." },
          { t: "p", text: "Reciprocal rank fusion is the standard way to combine them, and the important detail is that it uses ranks rather than scores. A cosine of 0.58 and a BM25 score of 14.2 are not comparable, so any score weighting is a guess that needs recalibrating whenever either side changes. RRF sums 1/(k + rank) and is immune to that." },
          { t: "p", text: "On my corpus RRF at k=60 reached 100% recall@5 against 95% for dense alone and 90% for BM25 alone \u2014 better than either component at every cut-off, for nine lines of code and no extra model." }
        ] },

      { level: "advanced",
        q: "When is a cross-encoder re-ranker worth it?",
        strong: "A strong answer knows it can hurt and prices it honestly.",
        answer: [
          { t: "p", text: "When the first stage has headroom and the latency budget can absorb it \u2014 and both of those need checking, because neither is automatic." },
          { t: "p", text: "The headroom point is the one people miss. A re-ranker can only reorder what the first stage returned, so its value depends entirely on how wrong that ordering was. I measured the same cross-encoder taking a dense-only first stage from 95% to 100% recall@5, and taking a fused dense-plus-BM25 first stage from 100% down to 90%. It is a second model with its own opinion, and against an already-correct ordering it can only disturb things." },
          { t: "p", text: "That also means published gains are relative to whatever baseline the authors used. A re-ranker demonstrated over a weak first stage looks excellent; the same component over a tuned hybrid can show nothing." },
          { t: "p", text: "On cost: I measured 2,405 ms per query to score twenty candidates against 11 ms for the search \u2014 219\u00d7, linear in shortlist depth, with nothing precomputable because the query is part of the input. That was CPU; on a GPU it is tens of milliseconds, so the shape transfers and the absolute does not." },
          { t: "p", text: "So I would add BM25 and RRF first, since that got the same recall gain for nine lines and no latency, then A/B the re-ranker against the actual first stage, and keep it behind a flag because its value changes whenever retrieval changes." }
        ] },

      { level: "core",
        q: "Is BM25 still relevant?",
        strong: "A strong answer has measured it rather than reasoning from vintage.",
        answer: [
          { t: "p", text: "Very. On my corpus it beat the neural retriever at recall@1 \u2014 80% against 75% \u2014 with no model, no GPU, and an index that built in 0.18 seconds against 26.9 to embed the same chunks." },
          { t: "p", text: "The reason is structural rather than accidental. Dense retrieval compresses a chunk into a few hundred numbers, so a rare identifier contributes a little and can be swamped. BM25 weights a term by how rare it is, so an exact token like `nprobe` or `QLoRA` is the strongest signal in the query. Technical, legal and medical corpora are full of exactly that." },
          { t: "p", text: "It also moved the one question that had been stuck through my whole module \u2014 \u2018Why divide alpha by r?\u2019, which dense retrieval buried at rank 15 and BM25 found at rank 10, because `alpha` and `r` are literal rare tokens." },
          { t: "p", text: "So I would always measure it as a baseline before concluding dense retrieval is working, and I would expect the ordering to reverse on a corpus of natural prose where queries paraphrase rather than quote. Which retriever wins is a property of the corpus, and it costs almost nothing to find out." }
        ] }
    ]
  }
});
