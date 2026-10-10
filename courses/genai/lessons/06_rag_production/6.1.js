EC.receiveLesson({
  id: "6.1",

  lede: "M5 measured one number \u2014 recall \u2014 and that number is the blunt one. The common list has six IR metrics with their formulas, and computing all of them over the retrievers built in M5 shows why more than one is needed: **BM25 has a lower Hit@5 than dense retrieval (0.90 against 0.95) and a higher MRR (0.85 against 0.84)**, so which retriever is \u201cbetter\u201d depends entirely on which metric you quote. It also tests the claim that re-ranking is what moves MRR and nDCG. Measured, a cross-encoder moved nDCG by **+0.11** and MRR by **+0.03** on dense \u2014 and on an already-fused first stage it moved MAP **+0.06** while dropping Hit@5 by **\u22120.10**.",

  objectives: [
    "Compute Hit@K, Precision@K, Recall@K, MRR, MAP and nDCG from their definitions",
    "Say what question each metric answers and which failure it is blind to",
    "Recognise when two metrics rank two systems in opposite orders",
    "Choose a headline metric that matches the stage you are optimising",
    "Separate the retrieval metrics from the generation metrics RAGAS provides"
  ],

  prerequisites: ["5.9", "5.13"],

  blocks: [

    { t: "h2", n: "01", id: "golden", text: "The golden set gets harder",
      sub: "M5 asked whether any chunk qualified; these metrics ask how many and how high" },

    { t: "p", text: "Every measurement in M5 used a binary rule: did *any* chunk in the top k come from the right document and contain the answer. That is **Hit@K**, and it is one of six metrics the common list has. The others need the full set of relevant chunks, not just the first one." },

    { t: "code", lang: "python", title: "g61.py \u2014 the relevant set for each query", code: `RELEVANT = []
for q, doc, must in QS:
    rel = {i for i in range(len(chunks))
           if meta[i] in H._docs(doc) and H.hits(chunks[i], must)}
    RELEVANT.append(rel)`,
      out: `  20 queries over 1187 chunks
  relevant chunks per query: min 1, median 6, max 39, mean 9.9`,
      caption: "A median of six relevant chunks per query, and one query with 39. Hit@K ignores all but the first." },

    { t: "callout", kind: "insight", title: "The spread in relevant-set size is why precision is awkward",
      body: [
        { t: "p", text: "One query has a single relevant chunk; another has 39. **Precision@5 cannot exceed 1/5 for the first query and can reach 1.0 for the second**, so averaging precision across them is averaging two quantities with different ceilings." },
        { t: "p", text: "This is not a flaw in my golden set \u2014 it is what real corpora look like. A narrow question has one answer-bearing passage; a broad one is covered in dozens. Any metric that divides by k rather than by the relevant count inherits that." },
        { t: "p", text: "It is the first reason to read several metrics rather than one, and the reason the usual treatment pairs binary metrics with graded ones." }
      ] },

    { t: "h2", n: "02", id: "six", text: "Six metrics, three retrievers",
      sub: "And they do not agree" },

    { t: "code", lang: "python", title: "g61.py \u2014 the definitions, worth stating plainly", code: `def precision_at_k(ranked, rel, k):
    return sum(d in rel for d in ranked[:k]) / k

def recall_at_k(ranked, rel, k):
    return sum(d in rel for d in ranked[:k]) / len(rel) if rel else 0.0

def hit_at_k(ranked, rel, k):
    return 1.0 if any(d in rel for d in ranked[:k]) else 0.0

def reciprocal_rank(ranked, rel):
    for i, d in enumerate(ranked, start=1):
        if d in rel:
            return 1.0 / i
    return 0.0

def average_precision(ranked, rel):
    hits, score = 0, 0.0
    for i, d in enumerate(ranked, start=1):
        if d in rel:
            hits += 1
            score += hits / i            # precision@i at each relevant hit
    return score / len(rel) if rel else 0.0

def ndcg_at_k(ranked, rel, k):
    dcg  = sum((1.0 if d in rel else 0.0) / math.log2(i + 1)
               for i, d in enumerate(ranked[:k], start=1))
    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(rel), k) + 1))
    return dcg / idcg if idcg else 0.0`,
      caption: "No model and no LLM judge \u2014 these are arithmetic over a ranked list and a label set, cheap enough to run in CI on every ingest." },

    { t: "code", lang: "python", title: "g61.py \u2014 all six, on M5's retrievers", code: `for label, R in (("dense", DENSE), ("BM25", SPARSE), ("RRF fusion", FUSED)):
    print(label, evaluate(R, k=5))`,
      out: `  retriever                Hit@5     P@5     R@5     MRR     MAP  nDCG@5
  dense                    0.95    0.53    0.39    0.84    0.50    0.63
  BM25                     0.90    0.48    0.36    0.85    0.48    0.60
  RRF fusion               1.00    0.59    0.47    0.88    0.54    0.71`,
      hl: [2, 3],
      caption: "Read the first two rows carefully: dense wins on Hit@5 and BM25 wins on MRR." },

    { t: "callout", kind: "trap", title: "Two metrics, two different winners",
      body: [
        { t: "p", text: "**Dense has the higher Hit@5 (0.95 against 0.90). BM25 has the higher MRR (0.85 against 0.84).** Both are correct, and they are answering different questions." },
        { t: "p", text: "Hit@5 asks *did a relevant chunk make the cut at all*. Dense wins because it misses fewer questions entirely. MRR asks *how high is the first relevant chunk*, averaged over queries \u2014 and BM25, when it does find the answer, tends to put it at rank 1, because an exact term match is an unambiguous signal." },
        { t: "p", text: "So a team optimising Hit@5 ships dense and a team optimising MRR ships BM25, from the same data. Neither is wrong; they have different products. A system where the user reads the top answer cares about MRR; a system that feeds five chunks to a model cares about Hit@5." },
        { t: "p", text: "The honest reading at twenty queries is that a 0.05 Hit@5 gap is one question and a 0.01 MRR gap is noise. What survives is the *structure* \u2014 these metrics can and do disagree \u2014 not the specific ordering here." }
      ] },

    { t: "p", text: "RRF fusion wins on all six, which is consistent with 5.9 and is the clean case. When one system dominates every metric the choice is easy; the interesting situations are the ones above it." },

    { t: "viz", title: "What each metric asks", caption: "Six questions about the same ranked list. A system can be best at one and worst at another.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="What each IR metric measures">
  <text x="16" y="22" class="s-label">ONE RANKED LIST, SIX QUESTIONS</text>

  <text x="16" y="52" class="s-mono">Hit@5</text>
  <rect x="110" y="40" width="26" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="148" y="53" class="s-sub">did ANY relevant chunk make the top 5? \u2014 binary, saturates early</text>

  <text x="16" y="82" class="s-mono">P@5</text>
  <rect x="110" y="70" width="26" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="148" y="83" class="s-sub">of the 5 I showed, how many were good? \u2014 ceiling depends on the relevant count</text>

  <text x="16" y="112" class="s-mono">R@5</text>
  <rect x="110" y="100" width="26" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="148" y="113" class="s-sub">of everything relevant, how much did I find? \u2014 falls when a query has 39 answers</text>

  <text x="16" y="142" class="s-mono">MRR</text>
  <rect x="110" y="130" width="26" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="148" y="143" class="s-sub">how high is the FIRST relevant one? \u2014 ignores everything after it</text>

  <text x="16" y="172" class="s-mono">MAP</text>
  <rect x="110" y="160" width="26" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="148" y="173" class="s-sub">are ALL the relevant ones high? \u2014 the strictest of the six</text>

  <text x="16" y="202" class="s-mono">nDCG@5</text>
  <rect x="110" y="190" width="26" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="148" y="203" class="s-sub">rank-weighted, normalised by the best possible \u2014 the graded dashboard metric</text>

  <line x1="16" y1="226" x2="744" y2="226" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="252" class="s-mono" style="fill:var(--crit)">measured: dense wins Hit@5 (0.95 vs 0.90) and BM25 wins MRR (0.85 vs 0.84)</text>
  <text x="16" y="274" class="s-sub">a system where the user reads the top answer cares about MRR; one that feeds five chunks</text>
  <text x="16" y="292" class="s-sub">to a model cares about Hit@5 \u2014 so the headline metric follows the product, not the fashion</text>
</svg>` },

    { t: "h2", n: "03", id: "rerank", text: "Testing the claim about re-ranking",
      sub: "\u201cThis is exactly what reranking moves\u201d" },

    { t: "p", text: "The reference is specific: optimise recall first, then *\u201cMRR / nDCG next \u2014 once it\u2019s in the set, are you ranking it to the top? This is exactly what **reranking** moves.\u201d* That is a falsifiable claim about which metrics a cross-encoder improves." },

    { t: "code", lang: "python", title: "g61.py \u2014 the same re-ranker on two first stages", code: `ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)

def rerank(BASE, depth=20):
    out = []
    for i, (q, _, _) in enumerate(QS):
        cand = BASE[i][:depth]
        sc = ce.predict([(q, chunks[j]) for j in cand])
        out.append(np.concatenate([cand[np.argsort(-sc)], BASE[i][depth:]]))
    return np.array(out)`,
      out: `                                   Hit@5     P@5     R@5     MRR     MAP  nDCG@5
  dense, before                    0.95    0.53    0.39    0.84    0.50    0.63
  dense + cross-encoder            1.00    0.63    0.50    0.88    0.55    0.74
     delta                        +0.05   +0.10   +0.11   +0.03   +0.06   +0.11

  RRF fusion, before               1.00    0.59    0.47    0.88    0.54    0.71
  RRF fusion + cross-encoder       0.90    0.63    0.47    0.87    0.60    0.73
     delta                        -0.10   +0.04   -0.00   -0.01   +0.06   +0.03`,
      hl: [4, 8],
      caption: "On dense, nDCG moves most (+0.11) and MRR least (+0.03). On the fused stage, Hit@5 goes backwards." },

    { t: "callout", kind: "insight", title: "The claim is half right, and the half it gets wrong is informative",
      body: [
        { t: "p", text: "On the dense first stage the re-ranker helped everything \u2014 but **nDCG moved +0.11 and MRR only +0.03**. The usual treatment pairs those two as if they move together; they did not. Precision@5 and Recall@5 each moved +0.10 and +0.11, more than MRR did." },
        { t: "p", text: "The reason is that MRR only looks at the *first* relevant result, and dense retrieval was already putting one near the top \u2014 MRR 0.84 means the first hit averages about rank 1.2. There was little room to improve it. What the re-ranker actually did was pull the *other* relevant chunks up, which is what nDCG, precision and recall at 5 reward." },
        { t: "p", text: "So the sharper statement is: **a re-ranker moves the metrics that count all the relevant results, not the one that counts only the first.** If your first stage already lands one good chunk at rank 1, MRR cannot show you what re-ranking bought." }
      ] },

    { t: "callout", kind: "trap", title: "On the fused stage, Hit@5 went down and MAP went up",
      body: [
        { t: "p", text: "5.9 found the cross-encoder degrading an already-good first stage, and the six metrics show what that actually means. **Hit@5 fell 1.00 \u2192 0.90** and **MAP rose 0.54 \u2192 0.60** \u2014 in the same run, from the same reordering." },
        { t: "p", text: "Those are not contradictory. The re-ranker promoted several relevant chunks for the queries it understood, which lifts MAP, and for two queries it pushed the only relevant chunk out of the top five entirely, which costs Hit@5. It made good answers better and a couple of answers unreachable." },
        { t: "p", text: "**Which of those two you care about is a product question.** A system that feeds five chunks to a model and needs at least one to be right should watch Hit@5 and reject this change. A system presenting a ranked list of sources to a human should watch MAP and accept it." },
        { t: "p", text: "A single headline metric would have reported this change as a clear win or a clear loss depending on which one was chosen, and both reports would have been true." }
      ] },

    { t: "h2", n: "04", id: "k", text: "Precision and recall move in opposite directions",
      sub: "Which makes precision@k a poor headline" },

    { t: "code", lang: "python", title: "g61.py \u2014 the same retriever at five cut-offs", code: `for k in (1, 3, 5, 10, 20):
    print(k, evaluate(DENSE, k))`,
      out: `  k             Hit@k        P@k        R@k     nDCG@k
  1              0.75       0.75       0.14       0.75
  3              0.90       0.62       0.30       0.65
  5              0.95       0.53       0.39       0.63
  10             0.95       0.39       0.52       0.63
  20             1.00       0.26       0.63       0.62`,
      hl: [1, 5],
      caption: "Precision falls from 0.75 to 0.26 while recall rises from 0.14 to 0.63. Both describe the same retriever." },

    { t: "callout", kind: "note", title: "Precision@k is only comparable at a fixed k",
      body: [
        { t: "p", text: "P@k falls as k grows because the denominator is k while the numerator is bounded by the relevant set. With a median of six relevant chunks, **P@20 cannot exceed 0.30 however perfect the ranking** \u2014 the metric is measuring the cut-off as much as the retriever." },
        { t: "p", text: "That makes a quoted \u201cprecision of 0.53\u201d meaningless without its k, and makes comparisons across systems using different k values invalid. nDCG is better behaved here because it normalises by the best achievable ranking at that k \u2014 which is why it is the usual dashboard choice." },
        { t: "p", text: "And note Hit@k rising to 1.00 at k=20 while nDCG sits flat at 0.62. The blunt metric saturates and stops carrying information; the graded one keeps measuring." }
      ] },

    { t: "h2", n: "05", id: "ragas", text: "Where RAGAS fits",
      sub: "Two layers that fail for different reasons" },

    { t: "p", text: "The metrics above grade *retrieval* and need no model. RAGAS grades the *generation* on top of it, and its four scores are LLM-judged \u2014 which makes them more expensive, non-deterministic, and measuring something the IR metrics cannot see." },

    { t: "table",
      head: ["RAGAS score", "Question", "Layer"],
      rows: [
        ["**Context precision**", "Are the retrieved chunks relevant, and ranked well?", "Retrieval \u2014 overlaps with P@K and nDCG above"],
        ["**Context recall**", "Did retrieval find everything the answer needed?", "Retrieval \u2014 overlaps with R@K above"],
        ["**Faithfulness**", "Is every claim in the answer supported by the context?", "**Generation** \u2014 no IR metric sees this"],
        ["**Answer relevancy**", "Does the answer actually address the question?", "**Generation** \u2014 no IR metric sees this"]
      ] },

    { t: "callout", kind: "insight", title: "The two layers fail independently, which is the reason to keep both",
      body: [
        { t: "p", text: "Perfect retrieval with unfaithful generation produces a confident answer that contradicts the sources it cites. Perfect faithfulness with poor retrieval produces an honest answer grounded in the wrong passage \u2014 or a refusal. **Neither layer\u2019s metrics detect the other\u2019s failure.**" },
        { t: "p", text: "The practical split follows the cost. The IR metrics are arithmetic over a label set: deterministic, free, and fast enough to gate every ingest in CI \u2014 which is exactly what 21.2\u2019s incident prescribes. The RAGAS generation scores need a judge model per sample, so they belong in a scheduled evaluation rather than on every commit." },
        { t: "p", text: "I have not run RAGAS here, because faithfulness and answer relevancy require an LLM judge this environment does not have. The retrieval-side scores are the ones computed above under different names, and M9 takes up LLM-as-judge properly \u2014 including how much to trust it." }
      ] },

    { t: "exercise", kind: "lab", title: "Compute all six metrics and find a disagreement", difficulty: "advanced", minutes: 35,
      body: "Build a golden set that records every relevant chunk per query, not just one. Implement Hit@K, Precision@K, Recall@K, MRR, MAP and nDCG from their definitions, and evaluate at least two retrievers. Find a pair of systems that the metrics rank in opposite orders, and explain which product each ordering is correct for. Then apply a re-ranker and report which metrics move.",
      requirements: [
        "Record the full relevant set per query, and report its size distribution",
        "Implement all six metrics from the formulas rather than importing them",
        "Evaluate at least two retrievers that differ in character \u2014 dense and sparse, say",
        "Apply the same re-ranker to a weak and a strong first stage and report every metric",
        "Report at several k and comment on how precision and recall move"
      ],
      hint: "Check whether your retrievers disagree before concluding they agree. Hit@K saturates quickly, so two systems can look identical on it while MRR separates them clearly.",
      solution: { lang: "python", title: "g61.py \u2014 the six metrics and the re-rank test", code: `def evaluate(RANKS, k=5):
    return dict(
        hit  = np.mean([hit_at_k(RANKS[i], RELEVANT[i], k) for i in range(len(QS))]),
        prec = np.mean([precision_at_k(RANKS[i], RELEVANT[i], k) for i in range(len(QS))]),
        rec  = np.mean([recall_at_k(RANKS[i], RELEVANT[i], k) for i in range(len(QS))]),
        mrr  = np.mean([reciprocal_rank(RANKS[i], RELEVANT[i]) for i in range(len(QS))]),
        mapv = np.mean([average_precision(RANKS[i], RELEVANT[i]) for i in range(len(QS))]),
        ndcg = np.mean([ndcg_at_k(RANKS[i], RELEVANT[i], k) for i in range(len(QS))]),
    )

for label, R in (("dense", DENSE), ("BM25", SPARSE), ("RRF fusion", FUSED)):
    print(label, evaluate(R))

for label, BASE in (("dense", DENSE), ("RRF fusion", FUSED)):
    print(label, evaluate(BASE), evaluate(rerank(BASE)))`,
        out: `  20 queries over 1187 chunks
  relevant chunks per query: min 1, median 6, max 39, mean 9.9

  retriever                Hit@5     P@5     R@5     MRR     MAP  nDCG@5
  dense                    0.95    0.53    0.39    0.84    0.50    0.63
  BM25                     0.90    0.48    0.36    0.85    0.48    0.60
  RRF fusion               1.00    0.59    0.47    0.88    0.54    0.71

                                   Hit@5     P@5     R@5     MRR     MAP  nDCG@5
  dense + cross-encoder            1.00    0.63    0.50    0.88    0.55    0.74
     delta                        +0.05   +0.10   +0.11   +0.03   +0.06   +0.11
  RRF fusion + cross-encoder       0.90    0.63    0.47    0.87    0.60    0.73
     delta                        -0.10   +0.04   -0.00   -0.01   +0.06   +0.03

  k             Hit@k        P@k        R@k     nDCG@k
  1              0.75       0.75       0.14       0.75
  5              0.95       0.53       0.39       0.63
  20             1.00       0.26       0.63       0.62`,
        notes: [
          { t: "p", text: "**Dense and BM25 rank in opposite orders depending on the metric**: dense wins Hit@5 (0.95 vs 0.90), BM25 wins MRR (0.85 vs 0.84). Hit@5 asks whether anything relevant made the cut; MRR asks how high the first one was. BM25 finds the answer less often and places it higher when it does, because an exact term match is an unambiguous signal." },
          { t: "p", text: "**The re-ranker moved nDCG (+0.11) far more than MRR (+0.03)** on dense, which qualifies the pairing of those two. MRR only sees the first relevant result, and dense was already landing one near rank 1 \u2014 there was no room. What re-ranking actually did was lift the *other* relevant chunks, which nDCG, precision and recall all reward." },
          { t: "p", text: "**On the fused first stage, Hit@5 fell 0.10 while MAP rose 0.06** \u2014 from the same reordering. The re-ranker promoted several relevant chunks where it understood the query and pushed the only relevant chunk out of the top five on two others. Which of those matters is a product question, and a single headline metric would have called this change a clear win or a clear loss depending on which one was chosen." },
          { t: "p", text: "**Precision falls from 0.75 to 0.26 as k goes 1 to 20 while recall rises 0.14 to 0.63.** With a median of six relevant chunks, P@20 cannot exceed 0.30 regardless of ranking quality \u2014 so precision@k measures the cut-off as much as the retriever and is only comparable at a fixed k." },
          { t: "p", text: "At twenty queries a 0.05 gap is one question, so I would not defend the specific ordering of dense against BM25. What survives the sample size is the structural point: these metrics can and do disagree, and which one you promote to the dashboard decides which system you ship." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Hit@K asks \u201cdid we have a chance\u201d. MRR asks \u201chow good was the first answer\u201d. MAP and nDCG ask \u201chow good was the whole list\u201d. A system that feeds chunks to a model wants the first question answered; a system showing a ranked list to a person wants the third." },
        { t: "p", text: "Choose the headline before running the experiment, because afterwards there is always a metric that says the change was good." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe added re-ranking. Our dashboard metric improved 6% and users say answers got worse. How is that possible?\u201d**" },
        { t: "p", text: "Easily, if the dashboard metric is not the one their product depends on. I measured a cross-encoder that raised MAP by 0.06 and simultaneously dropped Hit@5 by 0.10 on the same reordering \u2014 both real, from one change." },
        { t: "p", text: "The mechanism is that a re-ranker promotes several relevant chunks for the queries it understands, which lifts any metric that rewards getting all of them high \u2014 MAP, nDCG, precision. For the queries it misjudges it can push the *only* relevant chunk out of the top k entirely, which costs Hit@K and is invisible to the others." },
        { t: "p", text: "So if their system feeds the top five chunks to a model and needs at least one to be right, Hit@5 is the metric that matches the product, and MAP improving while Hit@5 falls is precisely a worse system with a better dashboard." },
        { t: "p", text: "What I would do: compute all six metrics before and after rather than one, and specifically check the queries that regressed \u2014 whether the answer left the top k entirely or merely moved down. The first is a real loss; the second is cosmetic." },
        { t: "p", text: "And I would ask how many queries the evaluation set has. At twenty, a 0.10 change in Hit@5 is two questions, which is enough to notice and not enough to be confident about. If the decision matters, the sample size has to come up before the metric argument is worth having." }
      ] }
  ],

  takeaways: [
    "**M5's recall is Hit@K**, the bluntest of the six metrics \u2014 it asks only whether any relevant chunk made the cut.",
    "**Relevant-set sizes vary enormously** (median 6, max 39 here), so precision@k has a different ceiling per query and averaging it mixes incomparable quantities.",
    "**Two metrics can rank two systems in opposite orders**: dense won Hit@5 (0.95 vs 0.90) and BM25 won MRR (0.85 vs 0.84) on the same data.",
    "**MRR rewards placing the first relevant chunk high**; Hit@K rewards finding one at all. BM25 finds fewer and ranks them higher, because exact term matches are unambiguous.",
    "**The usual treatment pairs MRR and nDCG as what re-ranking moves** \u2014 measured, a cross-encoder moved nDCG +0.11 and MRR only +0.03 on dense retrieval.",
    "**Because MRR sees only the first relevant result**, and the first stage already put one near rank 1. Re-ranking lifted the *other* relevant chunks, which nDCG and precision reward.",
    "**On a fused first stage the same re-ranker raised MAP +0.06 and dropped Hit@5 \u22120.10** \u2014 better lists for some queries, unreachable answers for others.",
    "**Which of those matters is a product question**: feeding chunks to a model wants Hit@K, showing a ranked list to a person wants MAP or nDCG.",
    "**Precision@k falls as k rises while recall climbs** \u2014 0.75 to 0.26 against 0.14 to 0.63 here \u2014 so a precision figure without its k is meaningless.",
    "**The IR metrics are free and deterministic** and belong in CI on every ingest; RAGAS's faithfulness and answer relevancy need an LLM judge and belong in a scheduled run."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Dense retrieval scores Hit@5 0.95 and MRR 0.84; BM25 scores Hit@5 0.90 and MRR 0.85. Which is better?",
        options: [
          "Dense, since Hit@5 is the more fundamental metric",
          "It depends on the product \u2014 Hit@K asks whether anything relevant made the cut, MRR asks how high the first one was",
          "BM25, since MRR is rank-aware and therefore more informative",
          "Neither \u2014 the difference is within noise so the metrics are unusable"
        ],
        answer: 1,
        why: "The two metrics answer different questions and genuinely disagree here. A system that feeds five chunks to a model needs at least one to be relevant, which is Hit@5; a system presenting a top answer to a person cares where the first relevant result lands, which is MRR. BM25 finds the answer less often and places it higher when it does, because an exact term match is an unambiguous signal. At twenty queries these specific gaps are one question and noise respectively, but the structural disagreement is the point." },

      { stem: "A cross-encoder re-ranker improves nDCG by 0.11 and MRR by only 0.03. Why the difference?",
        options: [
          "nDCG is computed at k=5 and MRR over the full ranking",
          "MRR only considers the first relevant result, which the first stage was already ranking near the top \u2014 re-ranking lifted the other relevant chunks instead",
          "The re-ranker was trained on a graded relevance objective",
          "MRR saturates at 1.0 more quickly than nDCG"
        ],
        answer: 1,
        why: "An MRR of 0.84 means the first relevant result averages about rank 1.2, so there is almost no headroom. What the re-ranker changed was the position of the *remaining* relevant chunks, which nDCG, precision@5 and recall@5 all reward \u2014 those moved +0.11, +0.10 and +0.11 respectively. This qualifies the common pairing of MRR and nDCG as the metrics re-ranking moves: they measure different things and moved by very different amounts." },

      { stem: "The same re-ranker raises MAP from 0.54 to 0.60 and drops Hit@5 from 1.00 to 0.90. What happened?",
        options: [
          "A bug \u2014 the two metrics cannot move in opposite directions",
          "It promoted several relevant chunks on queries it understood, and pushed the only relevant chunk out of the top five on others",
          "MAP is computed over the full ranking and Hit@5 only over the top five",
          "The first stage was already optimal so any change is a regression"
        ],
        answer: 1,
        why: "Both effects are real and come from one reordering. Lifting multiple relevant chunks raises MAP, which rewards getting all of them high; losing the sole relevant chunk from the top five costs Hit@5 entirely and is invisible to MAP's averaging. Which outcome matters depends on the product \u2014 and a single headline metric would report this change as a clear win or clear loss depending on which was chosen, both truthfully." },

      { stem: "Why is precision@k a poor headline metric?",
        options: [
          "Because it is expensive to compute at large k",
          "Because its denominator is k while its numerator is bounded by the relevant set, so it falls as k rises regardless of ranking quality",
          "Because it ignores the order of results within the top k",
          "Because it requires graded rather than binary relevance labels"
        ],
        answer: 1,
        why: "Measured, precision fell from 0.75 at k=1 to 0.26 at k=20 on an unchanged retriever, while recall rose from 0.14 to 0.63. With a median of six relevant chunks, P@20 cannot exceed 0.30 however perfect the ranking \u2014 so the figure is measuring the cut-off as much as the system, and is only comparable at a fixed k. nDCG is better behaved because it normalises by the best achievable ranking at that k. Precision does ignore within-k order, which is a separate limitation." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where \u201cour recall is 95%\u201d is the start of the conversation",
    questions: [
      { level: "core",
        q: "Which metrics would you use to evaluate retrieval?",
        strong: "A strong answer names several, says what each is blind to, and ties the headline to the product.",
        answer: [
          { t: "p", text: "Several, because they disagree. Hit@K for whether anything relevant made the cut, MRR for how high the first relevant result lands, and nDCG or MAP for how good the whole list is. All of them are arithmetic over a label set \u2014 no model, deterministic, cheap enough to run in CI on every ingest." },
          { t: "p", text: "The reason for more than one is that they can rank systems in opposite orders. I measured dense retrieval winning Hit@5 at 0.95 against BM25's 0.90, and BM25 winning MRR at 0.85 against dense's 0.84 \u2014 same data, opposite conclusions, both correct." },
          { t: "p", text: "Which to promote to the dashboard follows the product. A pipeline that feeds five chunks to a model needs at least one to be relevant, so Hit@5 is the metric that matches. A search page showing a ranked list to a person cares where everything lands, so nDCG." },
          { t: "p", text: "And I would choose the headline before running the experiment, because afterwards there is always a metric that says the change helped." }
        ] },

      { level: "advanced",
        q: "How would you tell whether a re-ranker is helping?",
        strong: "A strong answer measures several metrics and knows they can move in opposite directions.",
        answer: [
          { t: "p", text: "By measuring all of them before and after, because a re-ranker does not move them together. I measured one raising MAP by 0.06 while dropping Hit@5 by 0.10 on the same first stage \u2014 one reordering, two opposite verdicts." },
          { t: "p", text: "The mechanism is that it promotes several relevant chunks for queries it understands, which lifts anything rewarding a good overall list, and for queries it misjudges it can push the only relevant chunk out of the top k, which only Hit@K sees." },
          { t: "p", text: "I would also check where the gains are. On a dense first stage the same re-ranker moved nDCG +0.11 and MRR only +0.03, because MRR looks at the first relevant result and dense was already placing one near rank 1. So a team watching MRR would have concluded the re-ranker did almost nothing, when it had substantially improved the rest of the list." },
          { t: "p", text: "And I would look at the regressed queries individually \u2014 whether the answer left the top k or merely moved down. The first is a real loss and the second is cosmetic, and the aggregate cannot distinguish them." }
        ] },

      { level: "core",
        q: "How do RAGAS metrics relate to the IR metrics?",
        strong: "A strong answer separates the two layers and places each in a different part of the pipeline.",
        answer: [
          { t: "p", text: "They grade different layers that fail for different reasons. The IR metrics \u2014 Hit@K, MRR, nDCG \u2014 grade retrieval: did the right text reach the context. RAGAS's faithfulness and answer relevancy grade generation: was the answer supported by that text, and did it address the question." },
          { t: "p", text: "Its other two scores, context precision and context recall, are retrieval metrics under different names and overlap with precision@K and recall@K." },
          { t: "p", text: "Keeping both matters because neither detects the other's failure. Perfect retrieval with unfaithful generation gives a confident answer contradicting its own citations; perfect faithfulness with poor retrieval gives an honest answer from the wrong passage, or a refusal." },
          { t: "p", text: "The practical split is cost. The IR metrics are deterministic arithmetic and belong in CI on every ingest \u2014 which is exactly how you catch a quality regression after a large document load. The generation scores need a judge model per sample, so they belong in a scheduled evaluation, with the usual caution about how much to trust an LLM judge." }
        ] }
    ]
  }
});
