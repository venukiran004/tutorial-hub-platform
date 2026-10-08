EC.receiveLesson({
  id: "6.6",
  lede: "Four documents about cancelling things fill the top five for *\u201cstop my plan renewing\u201d*, and their pairwise similarity to **each other** runs as high as 0.59. The right one ranks first; the model still receives four cancellation procedures for four different situations and has to choose. MMR trades relevance against redundancy to fix that \u2014 and the measurement is that on this corpus it **does not improve any metric**, and never could: with 13 of 14 queries having exactly one relevant document, a metric that scores ranking cannot reward removing redundant *non-relevant* results. That is the lesson. A technique can be correct and unmeasurable by the metrics you have.",
  objectives: [
    "Show redundancy inside a result set with a similarity matrix",
    "Implement MMR from the formula and read the lambda sweep",
    "Explain why lambda=0 still returns the most relevant document first",
    "Measure MMR and explain why the metrics cannot show its benefit",
    "Say why fetch_k is what makes MMR possible at all"
  ],
  prerequisites: ["6.2", "5.8"],
  blocks: [
    { t: "h2", n: "01", id: "problem", text: "The problem it exists for", sub: "Measured inside the result set" },
    { t: "code", lang: "text", title: "Pairwise similarity among the top 5",
      code: "query: 'stop my plan renewing'\nplain top 5: ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage',\n              'ops-cancel-report', 'bill-cancel-order']\n\n  bill-cancel-sub      1.00 0.59 0.32 0.43 0.53\n  bill-cancel-trial    0.59 1.00 0.32 0.32 0.47\n  bill-overage         0.32 0.32 1.00 0.11 0.10\n  ops-cancel-report    0.43 0.32 0.11 1.00 0.48\n  bill-cancel-order    0.53 0.47 0.10 0.48 1.00",
      caption: "The slots are filled with documents similar to **each other**, not just to the query." },
    { t: "p", text: "Plain top-k optimises each slot independently, so it has no way to notice that slot 2 is nearly a duplicate of slot 1. The result is a context window containing four plausible cancellation procedures \u2014 for a subscription, a trial, an order and a scheduled report \u2014 and a model that must pick one." },
    { t: "h2", n: "02", id: "formula", text: "The formula", sub: "Relevance minus redundancy" },
    { t: "math", tex: "\\mathrm{MMR} = \\arg\\max_{d \\notin S} \\left[ \\lambda \\cdot \\mathrm{sim}(d, q) - (1-\\lambda) \\cdot \\max_{s \\in S} \\mathrm{sim}(d, s) \\right]" },
    { t: "code", lang: "python", title: "Greedy selection",
      code: 'def mmr(qv, cand_idx, lam=0.5, k=5):\n    sel, rest = [], list(cand_idx)\n    sim_q = {i: float(EMB[i] @ qv) for i in rest}\n    while rest and len(sel) < k:\n        best, best_v = None, -1e9\n        for i in rest:\n            red = max([float(EMB[i] @ EMB[j]) for j in sel]) if sel else 0.0\n            v = lam * sim_q[i] - (1 - lam) * red\n            if v > best_v:\n                best, best_v = i, v\n        sel.append(best)\n        rest.remove(best)\n    return sel',
      caption: "Greedy and quadratic in the candidate count \u2014 fine over 20, not over a corpus." },
    { t: "code", lang: "text", title: "fetch_k=20, selecting 5",
      code: "lambda   selection\n1.0      ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage', 'ops-cancel-report', 'bill-cancel-order']\n0.7      ['bill-cancel-sub', 'bill-overage', 'bill-cancel-trial', 'ops-cancel-report', 'api-versioning']\n0.5      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\n0.3      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\n0.0      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'auth-signin-fail', 'ops-maintenance']",
      caption: "`lambda=1.0` is plain relevance. By 0.5 the list has left the topic entirely." },
    { t: "callout", kind: "insight", title: "At lambda=0 the first pick is still the most relevant", body: [
      { t: "p", text: "Every row starts with `bill-cancel-sub`, including `lambda=0.0`. On the first iteration the selected set is empty, so the redundancy term is zero and the formula reduces to pure relevance no matter what lambda is." },
      { t: "p", text: "Everything after that is chosen to be unlike what came before, with the query's weight at zero \u2014 which is why low lambda degrades so fast. By `lambda=0.5` the list is `api-pagination` and `api-versioning`: maximally diverse, and no longer about cancelling anything." }
    ] },
    { t: "h2", n: "03", id: "measured", text: "Measured \u2014 and the metrics cannot see it", sub: "Which is the actual lesson" },
    { t: "code", lang: "text", title: "MMR against the baseline",
      code: "lambda   natural MRR   natural R@5\n1.0      0.964         1.000\n0.7      0.964         1.000\n0.5      0.929         0.893\n0.3      0.929         0.893",
      caption: "No improvement at any lambda, and a real cost below 0.7." },
    { t: "callout", kind: "warn", title: "A technique can be correct and unmeasurable", body: [
      { t: "p", text: "MMR was never going to improve these numbers. 13 of the 14 queries have exactly **one** relevant document, so every metric here scores where that single document ranks \u2014 and removing redundant *non-relevant* results cannot change that. The best MMR can do is leave the number alone, which at `lambda=0.7` is exactly what it does." },
      { t: "p", text: "What MMR improves is the **context**: fewer near-duplicate distractors in the window, which shows up in answer quality, not in R@5. So the honest conclusion is not \u201cMMR does not work\u201d \u2014 it is that this evaluation cannot answer the question, and measuring it would require labels about answer quality rather than about ranking." }
    ] },
    { t: "p", text: "That is worth separating from 5.8's ceiling problem, which it resembles. There, P@5 could not move because of the label counts. Here the metric *can* move \u2014 it moves downward at low lambda \u2014 but it cannot move in the direction of the benefit, because the benefit is not a ranking property. Both are failures of the metric to represent the goal." },
    { t: "h2", n: "04", id: "fetchk", text: "fetch_k is what makes it possible", sub: "5.1's point, arriving a second time" },
    { t: "code", lang: "text", title: "Varying the candidate pool at lambda=0.5",
      code: "fetch_k=5   -> ['bill-cancel-sub', 'bill-overage', 'ops-cancel-report', 'bill-cancel-trial', 'bill-cancel-order']\nfetch_k=10  -> ['bill-cancel-sub', 'api-versioning', 'bill-overage', 'ops-cancel-report', 'bill-seats']\nfetch_k=20  -> ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\nfetch_k=41  -> ['bill-cancel-sub', 'api-errors', 'api-versioning', 'bill-overage', 'data-residency']",
      caption: "At `fetch_k=5`, MMR selects 5 from 5 \u2014 it can only reorder them." },
    { t: "callout", kind: "mental", title: "A selection stage needs more candidates than it returns", body: [
      { t: "p", text: "At `fetch_k=5` MMR returns the same five documents in a different order, so the set reaching the model is unchanged and the diversity it was added for cannot happen. This is 5.1's `fetch_k > k` rule in its second instance \u2014 the first was reranking." },
      { t: "p", text: "The rule generalises to every stage that **selects** rather than ranks: the gap between what it fetches and what it returns is the amount of work it is permitted to do. If they are equal, the stage is a sort." }
    ] },
    { t: "exercise", kind: "build", title: "Implement MMR and measure it honestly",
      difficulty: "core", minutes: 30,
      body: "Show redundancy inside a plain top-5 result set by printing the pairwise similarity matrix among the results. Implement MMR from the formula and sweep lambda, explaining why every setting returns the same first document. Then measure MMR against the baseline on the labelled query set and explain what the numbers can and cannot show. Finally vary fetch_k and say what happens when it equals k.",
      requirements: ["Print pairwise similarity among a plain top-5 and identify the redundancy",
        "Implement MMR from the formula",
        "Sweep lambda over at least four values and show the selections",
        "Explain why lambda=0 still returns the most relevant document first",
        "Measure MRR and R@5 against the baseline and report the result",
        "Explain why the metrics cannot show MMR's benefit on this label set",
        "Vary fetch_k and explain what happens when fetch_k equals k"],
      hint: "Measure it even though you expect it to help. The result \u2014 and why the result was inevitable \u2014 is more useful than the technique.",
      solution: { lang: "python", title: "x0606.py \u2014 correct and unmeasurable",
        code: 'q = "stop my plan renewing"\nv = ENC.encode([q], normalize_embeddings=True)[0]\ntop = list(np.argsort(-(EMB @ v))[:5])\nfor a in range(len(top)):\n    print("%-20s %s" % (IDS[top[a]],\n          " ".join("%.2f" % float(EMB[top[a]] @ EMB[top[b]])\n                   for b in range(len(top)))))\n\ncand = list(np.argsort(-(EMB @ v))[:20])\nfor lam in (1.0, 0.7, 0.5, 0.3, 0.0):\n    print(lam, [IDS[i] for i in mmr(v, cand, lam=lam, k=5)])',
        out: "==============================================================================\nPART 1 -- the problem it exists for\n==============================================================================\n  query: 'stop my plan renewing'\n  plain top 5: ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage', 'ops-cancel-report', 'bill-cancel-order']\n\n  pairwise similarity AMONG those results:\n    bill-cancel-sub      1.00 0.59 0.32 0.43 0.53\n    bill-cancel-trial    0.59 1.00 0.32 0.32 0.47\n    bill-overage         0.32 0.32 1.00 0.11 0.10\n    ops-cancel-report    0.43 0.32 0.11 1.00 0.48\n    bill-cancel-order    0.53 0.47 0.10 0.48 1.00\n\n  the slots are filled with documents that are similar to EACH OTHER.\n  the model receives four cancellation procedures for four different\n  situations and has to pick.\n==============================================================================\nPART 2 -- the formula\n==============================================================================\n  MMR = argmax over unselected d of\n      lambda * sim(d, query)  -  (1-lambda) * max sim(d, already selected)\n\n  lambda=1 is plain relevance. lambda=0 is pure diversity, ignoring\n  the query entirely after the first pick.\n\n  fetch_k=20 candidates, selecting 5:\n\n  lambda   selection\n  1.0      ['bill-cancel-sub', 'bill-cancel-trial', 'bill-overage', 'ops-cancel-report', 'bill-cancel-order']\n  0.7      ['bill-cancel-sub', 'bill-overage', 'bill-cancel-trial', 'ops-cancel-report', 'api-versioning']\n  0.5      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\n  0.3      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\n  0.0      ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'auth-signin-fail', 'ops-maintenance']\n\n  at lambda=0 the first pick is still the most relevant document --\n  there is nothing selected to be diverse from yet -- and everything\n  after it is chosen to be unlike what came before, regardless of the\n  query. that is why low lambda degrades fast.\n==============================================================================\nPART 3 -- measured: diversity costs ranking on this corpus\n==============================================================================\n  lambda   natural MRR   natural R@5\n  1.0      0.964         1.000\n  0.7      0.964         1.000\n  0.5      0.929         0.893\n  0.3      0.929         0.893\n\n  MMR does not improve the metrics here, and it was never going to:\n  13 of 14 queries have ONE relevant document, so a metric that scores\n  the ranking cannot reward removing redundant non-relevant results.\n\n  what MMR improves is the CONTEXT -- fewer near-duplicate distractors\n  in the window -- and that shows up in answer quality, not in R@5.\n  a technique can be correct and unmeasurable by your current metrics.\n==============================================================================\nPART 4 -- fetch_k is the parameter that makes it possible\n==============================================================================\n  fetch_k=5   -> ['bill-cancel-sub', 'bill-overage', 'ops-cancel-report', 'bill-cancel-trial', 'bill-cancel-order']\n  fetch_k=10  -> ['bill-cancel-sub', 'api-versioning', 'bill-overage', 'ops-cancel-report', 'bill-seats']\n  fetch_k=20  -> ['bill-cancel-sub', 'api-pagination', 'api-versioning', 'bill-overage', 'api-idempotency']\n  fetch_k=41  -> ['bill-cancel-sub', 'api-errors', 'api-versioning', 'bill-overage', 'data-residency']\n\n  at fetch_k=5 MMR selects 5 from 5 and changes only the order, which\n  is 5.1's point in a second place: a reordering stage needs more\n  candidates than it returns or it has no work to do.",
        notes: [
          { t: "p", text: "**The top-5 results are similar to each other**, up to 0.59 \u2014 plain top-k optimises each slot independently and cannot notice that slot 2 nearly duplicates slot 1." },
          { t: "p", text: "**Every lambda returns the same first document**, including lambda=0. On the first iteration the selected set is empty, so the redundancy term is zero and the formula reduces to pure relevance." },
          { t: "p", text: "**Low lambda degrades fast.** By lambda=0.5 the selection is `api-pagination` and `api-versioning` \u2014 maximally diverse and no longer about cancelling anything." },
          { t: "p", text: "**MMR improved no metric at any lambda**, and cost recall below 0.7 (R@5 1.000 to 0.893)." },
          { t: "p", text: "**It was never going to.** 13 of 14 queries have exactly one relevant document, so every metric scores where that document ranks \u2014 and removing redundant NON-relevant results cannot change that." },
          { t: "p", text: "**So a technique can be correct and unmeasurable by the metrics you have.** MMR improves the context, which shows up in answer quality rather than in R@5; measuring it needs labels about answers, not about ranking." },
          { t: "p", text: "**And fetch_k is what makes MMR possible**: at fetch_k=5 it selects 5 from 5 and can only reorder. Every stage that selects rather than ranks needs fetch_k > k, which is 5.1's rule in its second instance." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the diversity setting that quietly broke retrieval", body: [
      { t: "p", text: "A team enables MMR with `lambda_mult=0.3` because diversity sounds desirable, and does not re-measure. Answer quality drops on specific questions and nobody connects it to the change." },
      { t: "p", text: "At that lambda the query contributes 30% of the selection criterion and dissimilarity contributes 70%, so after the first document the selection is driven mostly by being unlike what came before. On this corpus `lambda=0.3` cost 0.11 of recall outright \u2014 relevant documents were pushed out of the top 5 by documents chosen for being different." },
      { t: "p", text: "The defensible default is `lambda` near 0.7, where diversity has some effect and recall was unchanged here, plus `fetch_k` comfortably above `k` so the stage has candidates to choose between. But the transferable point is that diversity is a **cost** paid for a benefit your ranking metrics cannot see \u2014 so it has to be set from an understanding of the corpus, not from a sweep that will always prefer `lambda=1.0`." }
    ] }
  ],
  takeaways: [
    "**Plain top-k optimises each slot independently**, so it cannot notice slot 2 nearly duplicates slot 1.",
    "**Measured redundancy inside one top-5 ran to 0.59** between two of the returned documents.",
    "**MMR = lambda x sim(d, query) - (1-lambda) x max sim(d, selected)**, selected greedily.",
    "**Every lambda returns the same first document**, because the redundancy term is zero on the first iteration.",
    "**Low lambda degrades fast** \u2014 by 0.5 the selection had left the topic entirely.",
    "**MMR improved no metric at any lambda**, and cost recall below 0.7.",
    "**It was never going to**: 13 of 14 queries have one relevant document, so ranking metrics cannot reward removing non-relevant duplicates.",
    "**A technique can be correct and unmeasurable by the metrics you have.**",
    "**MMR improves the context, not the ranking** \u2014 measuring it needs answer-quality labels.",
    "**That is distinct from a ceilinged metric**: this one can move, just not in the direction of the benefit.",
    "**fetch_k is what makes MMR possible** \u2014 at fetch_k=5 it selects 5 from 5 and only reorders.",
    "**Every stage that selects rather than ranks needs fetch_k > k.**",
    "**Diversity is a cost paid for an invisible benefit**, so set lambda from the corpus, not from a sweep."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does MMR return the same first document at every value of lambda, including zero?",
      options: ["The first document is always pinned by the implementation",
        "On the first iteration the selected set is empty, so the redundancy term is zero and the formula reduces to pure relevance",
        "lambda is clamped to a minimum internally",
        "Cosine similarity to an empty set is defined as 1.0"],
      answer: 1,
      why: "The redundancy term is the maximum similarity to already-selected documents, and with nothing selected there is no maximum to take, so it contributes zero whatever weight it carries. Only from the second pick onward does lambda matter \u2014 which is also why low lambda degrades so fast, since every subsequent choice is made almost entirely on dissimilarity." },
    { stem: "MMR improved no metric on a query set where 13 of 14 queries have one relevant document. Why was that inevitable?",
      options: ["MMR requires at least three relevant documents to function",
        "Ranking metrics score where the relevant document sits, and removing redundant non-relevant results cannot change that",
        "The lambda sweep did not include low enough values",
        "MMR only helps when recall is below 1.0"],
      answer: 1,
      why: "With a single relevant document per query, R@5, MRR and NDCG all depend only on that document's position. MMR's benefit is replacing near-duplicate non-relevant results with varied ones, which leaves that position unchanged at best. The benefit is a property of the context, so measuring it requires answer-quality labels rather than ranking labels." },
    { stem: "How does this differ from 5.8's ceilinged P@5?",
      options: ["It does not \u2014 both are the same problem",
        "A ceilinged metric cannot move at all; this metric can move, just not in the direction of the benefit",
        "The ceiling was a labelling error and this is a model limitation",
        "P@5 measures context quality and MRR does not"],
      answer: 1,
      why: "P@5 was at its arithmetic maximum given the label counts, so no improvement was expressible. Here MRR and R@5 both moved \u2014 downward, at low lambda \u2014 so the metric is live; it simply has no channel for representing fewer redundant distractors. Both are failures of the metric to represent the goal, but they call for different responses." },
    { stem: "What happens when MMR is configured with fetch_k equal to k?",
      options: ["It raises an error, since diversity requires a larger pool",
        "It selects k from k, so the set reaching the model is unchanged and only the order differs",
        "It silently increases fetch_k to twice k",
        "It falls back to plain similarity search"],
      answer: 1,
      why: "MMR chooses a subset of the candidate pool, and when the pool is the same size as the output there is no subset to choose \u2014 every candidate is returned regardless of redundancy. The diversity it was enabled for cannot occur. This is the same fetch_k > k rule that governs reranking: the gap between fetched and returned is the work the stage is allowed to do." }
  ] },
  interview: { title: "Interview practice", sub: "Diversity in retrieval", questions: [
    { level: "core", q: "What problem does MMR solve?",
      strong: "A strong answer shows the redundancy is between results, not with the query.",
      answer: [
        { t: "p", text: "Redundancy inside the result set. Plain top-k optimises each slot independently against the query, so nothing stops slot 2 from being a near-duplicate of slot 1." },
        { t: "p", text: "I measured a case on a support corpus: a query about stopping a subscription returned four documents about cancelling things \u2014 a subscription, a trial, an order, a scheduled report \u2014 with pairwise similarity between the results running up to 0.59. The right one ranked first, and the model still received four plausible cancellation procedures for four different situations and had to pick between them." },
        { t: "p", text: "MMR fixes that by scoring each candidate as lambda times its similarity to the query minus one minus lambda times its maximum similarity to what has already been selected, chosen greedily." },
        { t: "p", text: "Two practical notes. The first pick is always the most relevant document regardless of lambda, because there is nothing selected to be redundant with yet. And it needs fetch_k greater than k \u2014 if the candidate pool is the same size as the output there is no subset to select and it just reorders." }
      ] },
    { level: "advanced", q: "How would you decide whether MMR is helping?",
      strong: "A strong answer recognises the ranking metrics cannot answer it.",
      answer: [
        { t: "p", text: "Not from ranking metrics, and working out why taught me more than the technique did." },
        { t: "p", text: "I measured MMR against a labelled set and it improved nothing at any lambda, and cost recall below about 0.7. But it was never going to improve anything: thirteen of my fourteen queries had exactly one relevant document, so R@5, MRR and NDCG all reduce to where that one document ranks. MMR's benefit is replacing redundant non-relevant results with varied ones, which leaves that position untouched at best." },
        { t: "p", text: "So the conclusion is not that MMR does not work. It is that the evaluation could not answer the question. A technique can be correct and unmeasurable by the metrics you happen to have." }
        ,{ t: "p", text: "To actually evaluate it I would need labels about answers rather than about ranking \u2014 give the same question to the model with and without diversity selection and compare answer quality, ideally on questions where the corpus contains several near-duplicate procedures, since that is the case MMR exists for." },
        { t: "p", text: "And in the meantime I would set lambda conservatively, around 0.7, where diversity has some effect and recall was unchanged. Because the asymmetry is that the cost is measurable and the benefit is not, any sweep will always prefer lambda=1.0 \u2014 so the setting has to come from understanding the corpus, not from optimising a number." }
      ] },
    { level: "core", q: "What would you set fetch_k to, and why does it matter?",
      strong: "A strong answer ties it to what the stage is allowed to do.",
      answer: [
        { t: "p", text: "Comfortably above k \u2014 something like three to four times \u2014 because the gap between what a stage fetches and what it returns is the amount of work it is permitted to do." },
        { t: "p", text: "The degenerate case makes it concrete. With fetch_k equal to k, MMR selects five from five, so every candidate is returned regardless of redundancy and only the order changes. The diversity it was enabled for cannot happen. The same is true of a reranker: fetch five, rerank, return five, and you have sorted a list and then returned all of it." },
        { t: "p", text: "So I think of it as the one parameter that decides whether a selection stage exists at all, rather than as a tuning knob. Setting fetch_k equal to k is how a reranker or a diversity pass becomes a pure cost increase, and it is a common configuration because the two numbers look like they should match." },
        { t: "p", text: "The upper bound comes from cost, and it depends on what follows. If the next stage is MMR, candidates are cheap \u2014 dot products. If it is a cross-encoder at roughly 68 ms per pair, every extra candidate is real latency, so I would measure where accuracy stops improving. In my case that was 20, and going to the full corpus added a second per query for nothing." }
      ] }
  ] }
});
