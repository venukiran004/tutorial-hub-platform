EC.receiveLesson({
  id: "9.8",

  lede: "Seven retrieval metrics on one five-query dataset, every figure verified \u2014 and the scoreboard says something a single number cannot. The retriever reaches **recall@10 = 0.9500** with **MRR = 0.6222**, which is not a retrieval problem but a **ranking** problem: it finds the right chunks and puts them too low. The fix is a reranker, not a new embedding model. And NDCG turns out to have two standard definitions giving **0.9724** and **0.9575** on identical data.",

  objectives: [
    "Compute precision@k and recall@k rank by rank and describe their shapes",
    "Compute MRR, average precision, MAP and R-precision",
    "Compute NDCG and identify which gain convention you are using",
    "Read a scoreboard to distinguish a retrieval problem from a ranking problem",
    "Choose which metric to report as the headline"
  ],

  prerequisites: ["9.1", "8.8"],

  blocks: [

    { t: "h2", n: "01", id: "dataset", text: "The dataset",
      sub: "Five labelled queries over twelve chunks" },

    { t: "code", lang: "text", title: "ground truth and what the retriever returned, rank 1 to 10", code: `Q1  relevant D03 D07 D09   ->  D05 [D03] D11 [D07] D02 D08 [D09] D01 D12 D04
Q2  relevant D02 D06       ->  [D02] [D06] D04 D10 D01 D03 D05 D08 D11 D12
Q3  relevant D12           ->  D04 D01 D08 D02 D06 D10 D03 D05 [D12] D11
Q4  relevant D01 D04 D08 D10 -> [D01] D05 [D04] D02 D11 [D08] D03 D06 D12 D07
Q5  relevant D05 D11       ->  D03 [D11] D02 D08 [D05] D01 D06 D10 D12 D04`,
      hl: [4],
      caption: "Brackets are hits. Note Q4: four chunks are relevant and only three appear in the top 10, so D10 is a miss no reranking can forgive." },

    { t: "h2", n: "02", id: "pk-rk", text: "Precision@k and recall@k, rank by rank",
      sub: "The shapes are the lesson" },

    { t: "code", lang: "text", title: "Q1 walked down the ranking \u2014 recall denominator fixed at 3", code: `rank  chunk  rel?  hits  precision@k      recall@k
 1    D05    no     0    0/1 = 0.0000     0/3 = 0.0000
 2   [D03]   YES    1    1/2 = 0.5000     1/3 = 0.3333
 3    D11    no     1    1/3 = 0.3333     1/3 = 0.3333
 4   [D07]   YES    2    2/4 = 0.5000     2/3 = 0.6667
 5    D02    no     2    2/5 = 0.4000     2/3 = 0.6667
 6    D08    no     2    2/6 = 0.3333     2/3 = 0.6667
 7   [D09]   YES    3    3/7 = 0.4286     3/3 = 1.0000
 8    D01    no     3    3/8 = 0.3750     3/3 = 1.0000
 9    D12    no     3    3/9 = 0.3333     3/3 = 1.0000
10    D04    no     3    3/10 = 0.3000    3/3 = 1.0000`,
      hl: [3, 5, 8],
      caption: "Every value verified. Watch the two columns move differently." },

    { t: "callout", kind: "insight", title: "Precision saws; recall only climbs",
      body: [
        { t: "p", text: "**Precision is not monotonic.** It jumps at every hit and decays at every miss \u2014 0.5000, 0.3333, 0.5000, 0.4000, 0.3333, 0.4286. So precision@5 and precision@10 can disagree about which retriever is better, and quoting one without its k is meaningless." },
        { t: "p", text: "**Recall only ever climbs** and flattens permanently once the last relevant chunk is found. It is 1.0000 from k = 7 onwards and stays there at k = 50, which makes it a hard bound rather than a curve." },
        { t: "p", text: "That asymmetry is why recall@k is the right **retrieval health** number: it tells you what the generator could possibly see. Precision@k is only meaningful next to the k you actually feed the model." }
      ] },

    { t: "code", lang: "text", title: "the four values anyone reports for Q1, with F1", code: `k=1    P 0.0000   R 0.0000   F1 0.0000
k=3    P 0.3333   R 0.3333   F1 0.3333
k=5    P 0.4000   R 0.6667   F1 0.5000
k=10   P 0.3000   R 1.0000   F1 0.4615

F1@5 = 2 x 0.4000 x 0.6667 / (0.4000 + 0.6667) = 0.5333 / 1.0667 = 0.5000`,
      hl: [4, 5],
      caption: "k=5 to k=10 bought 0.3333 of recall and cost 0.1000 of precision \u2014 the trade in one line." },

    { t: "callout", kind: "tradeoff", title: "In RAG that trade is not abstract",
      body: [
        { t: "p", text: "The five extra chunks between k=5 and k=10 are tokens in the prompt, money on the bill, and distractors the generator can be led astray by. 6.2 priced the token side; 6.8 measured the distractor side." },
        { t: "p", text: "6.8\u2019s result is the surprising one and worth recalling here: adding **20,000** off-topic chunks to an index changed recall@5 by nothing, because unrelated content never enters a top-k. So the distractor risk is about near-duplicates and plausible-but-wrong chunks, not about volume." },
        { t: "p", text: "Which means the k decision is mostly about tokens and latency rather than about confusion \u2014 unless your corpus contains near-duplicates, in which case 6.8 measured recall@5 collapsing to 55% at 5\u00d7 duplication." }
      ] },

    { t: "h2", n: "03", id: "order", text: "The order-aware metrics",
      sub: "MRR, AP, MAP and R-precision, all verified" },

    { t: "code", lang: "text", title: "g91.py \u00a7E \u2014 MRR: first hits at ranks 2, 1, 9, 1, 2", code: `Q1 1/2 = 0.5000   Q2 1/1 = 1.0000   Q3 1/9 = 0.1111
Q4 1/1 = 1.0000   Q5 1/2 = 0.5000

MRR = 3.1111 / 5 = 0.6222`,
      hl: [4],
      caption: "MRR punishes Q3's rank-9 rescue hard \u2014 0.1111 against Q2's 1.0000, a distinction P@5 threw away entirely." },

    { t: "code", lang: "text", title: "g91.py \u00a7E \u2014 average precision, and the denominator that matters", code: `AP(Q1): hits at ranks 2, 4, 7
  (1/2 + 2/4 + 3/7) / 3 = 1.4286 / 3 = 0.4762     (exactly 10/21)
                          ^^^ divide by ALL relevant chunks, not by hits

AP(Q4): hits at 1, 3, 6 with FOUR relevant chunks
  (1/1 + 2/3 + 3/6) / 4 = 2.1667 / 4 = 0.5417
                       ^ D10 never retrieved: adds 0 to the numerator
                         and still adds 1 to the denominator

MAP = (0.4762 + 1.0000 + 0.1111 + 0.5417 + 0.4500) / 5 = 0.5158`,
      hl: [3, 7, 8],
      caption: "Dividing by all relevant chunks is how a permanent miss gets punished. Every figure verified." },

    { t: "callout", kind: "good", title: "AP is the metric that repairs precision's order-blindness",
      body: [
        { t: "p", text: "It evaluates precision *at every rank where a relevant chunk appears*, then divides by the total number of relevant chunks \u2014 including any never retrieved. So it rewards putting hits early and punishes missing them entirely, which neither precision@k nor recall@k does alone." },
        { t: "p", text: "Q2 scores a clean **1.0000** \u2014 every relevant chunk at the top with nothing in between \u2014 while its P@5 was 0.4000, because P@5 divides by 5 regardless of there being only 2 relevant chunks. The gap between those two numbers is the whole argument for reporting MAP." },
        { t: "p", text: "R-precision addresses the same ceiling differently, setting k to the number of relevant chunks for that query: Q1 gets 1/3, Q2 gets 2/2, Q3 gets 0/1, Q4 gets 2/4, Q5 gets 1/2, for a mean of **0.4667**. Every query is then scored against a k it could actually saturate." }
      ] },

    { t: "h2", n: "04", id: "ndcg", text: "NDCG, and the convention nobody states",
      sub: "The one genuinely new finding in this module" },

    { t: "code", lang: "text", title: "g91.py \u00a7F \u2014 graded relevance [3, 2, 3, 0, 1]", code: `LINEAR gain  rel / log2(rank+1)
  3/1.0000 + 2/1.5850 + 3/2.0000 + 0/2.3219 + 1/2.5850
  = 3.0000 + 1.2619 + 1.5000 + 0 + 0.3869      DCG  = 6.1487
  ideal [3,3,2,1,0]                            IDCG = 6.3235
                                               NDCG = 0.9724`,
      hl: [4, 5],
      caption: "Verified against the reference exactly. Now compute it the other standard way." },

    { t: "code", lang: "text", title: "g91.py \u00a7F \u2014 the same data, exponential gain", code: `EXPONENTIAL gain  (2^rel - 1) / log2(rank+1)
  DCG  = 12.7796
  IDCG = 13.3472
  NDCG = 0.9575

SAME ranking, SAME labels, two standard conventions: 0.9724 vs 0.9575`,
      hl: [4, 6],
      caption: "A 1.5-point gap from the gain function alone \u2014 and both forms appear in textbooks and libraries." },

    { t: "callout", kind: "trap", title: "This course's own two reference files disagree",
      body: [
        { t: "p", text: "This module\u2019s reference uses **linear** gain and 05_RAG_and_Vector_Stores uses **exponential** gain. Neither is wrong; they are both standard. But their NDCG figures are not comparable with each other, and nothing in either document says so." },
        { t: "p", text: "The gap widens with the relevance scale. At binary relevance the two coincide, since 2\u00b9\u22121 = 1 and 2\u2070\u22121 = 0. At a 0\u20133 scale it is 1.5 points here, and on a 0\u20135 scale the exponential form heavily emphasises the top grades \u2014 which is the reason it exists." },
        { t: "p", text: "9.1 argued for computing metrics by hand precisely because of this class of problem: `ndcg_score(...)` returns a number with the convention buried in a default argument. This is the concrete instance, found in material that is otherwise arithmetically impeccable." }
      ] },

    { t: "h2", n: "05", id: "scoreboard", text: "The scoreboard, and the diagnosis",
      sub: "What a retrieval eval report should look like" },

    { t: "table",
      head: ["Query", "Rel", "P@5", "R@5", "P@10", "R@10", "AP", "RR", "R-prec"],
      rows: [
        ["Q1", "3", "0.4000", "0.6667", "0.3000", "1.0000", "0.4762", "0.5000", "0.3333"],
        ["Q2", "2", "0.4000", "1.0000", "0.2000", "1.0000", "**1.0000**", "1.0000", "1.0000"],
        ["Q3", "1", "0.0000", "0.0000", "0.1000", "1.0000", "0.1111", "**0.1111**", "0.0000"],
        ["Q4", "4", "0.4000", "0.5000", "0.3000", "0.7500", "0.5417", "1.0000", "0.5000"],
        ["Q5", "2", "0.4000", "1.0000", "0.2000", "1.0000", "0.4500", "0.5000", "0.5000"],
        ["**Mean**", "\u2014", "**0.3200**", "**0.6333**", "**0.2200**", "**0.9500**", "MAP **0.5158**", "MRR **0.6222**", "**0.4667**"]
      ] },

    { t: "callout", kind: "insight", title: "recall@10 = 0.9500 with MRR = 0.6222 is a ranking problem",
      body: [
        { t: "p", text: "High recall means the retriever **finds** the right chunks. Low MRR means it puts them **too low**. That combination is not a retrieval failure \u2014 it is a ranking failure, and the fix is a reranker rather than a new embedding model." },
        { t: "p", text: "Q3 is the case driving it: D12 arrives at rank 9, so recall@10 is 1.0000 and reciprocal rank is 0.1111. P@5 recorded 0.0000 and threw the distinction away \u2014 it cannot tell \u201cnever found\u201d from \u201cfound at rank 9\u201d." },
        { t: "p", text: "That is a concrete, actionable diagnosis from a scoreboard, and it is why the reference recommends recall@k as the health number, MRR or NDCG as the ranking number, and precision@k only beside the k you actually use." }
      ] },

    { t: "callout", kind: "good", title: "And Q4 shows the miss no reranking can forgive",
      body: [
        { t: "p", text: "Q4 has four relevant chunks and only three in the top 10, so recall@10 is 0.7500 and D10 is simply absent. No reordering of the returned list can produce a chunk that was never returned." },
        { t: "p", text: "That is the distinction between a ranking fix and a retrieval fix, visible in one row. A reranker helps Q3 and does nothing for Q4; better embeddings, chunking or hybrid search help Q4." },
        { t: "p", text: "6.1 measured the hybrid version of that fix: adding BM25 and reciprocal rank fusion took recall@5 from 95% to 100%, which is exactly the Q4-shaped problem being solved by changing what gets retrieved rather than how it is ordered." }
      ] },

    { t: "exercise", kind: "build", title: "Build the scoreboard for your own retriever", difficulty: "advanced", minutes: 40,
      body: "Compute all seven metrics per query for your own labelled set, produce the scoreboard, and write the diagnosis. State explicitly which NDCG gain convention you used.",
      requirements: [
        "Per-query rows plus means, for P@k, R@k, AP, RR and R-precision",
        "NDCG with the gain convention stated explicitly",
        "Identify any query with relevant chunks outside the retrieved window",
        "Write the diagnosis: retrieval problem, ranking problem, or neither",
        "State which single metric you would put on a dashboard and why"
      ],
      hint: "Compare recall@10 against MRR. High recall with low MRR is a ranking problem and a reranker fixes it; low recall is a retrieval problem and no reranking can.",
      solution: { lang: "python", title: "all seven metrics, and both NDCG conventions", code: `import math

def p_at(run, rel, k):  return sum(d in rel for d in run[:k]) / k
def r_at(run, rel, k):  return sum(d in rel for d in run[:k]) / len(rel)
def rr(run, rel):
    for i, d in enumerate(run, 1):
        if d in rel: return 1.0 / i
    return 0.0
def ap(run, rel):
    hits, s = 0, 0.0
    for i, d in enumerate(run, 1):
        if d in rel:
            hits += 1; s += hits / i
    return s / len(rel)                 # ALL relevant, not just the hits
def rprec(run, rel):
    return sum(d in rel for d in run[:len(rel)]) / len(rel)

def ndcg(grades, k=None, gain="linear"):
    """gain='linear' -> rel/log2(r+1);  gain='exp' -> (2^rel-1)/log2(r+1).
    STATE WHICH -- they differ by ~1.5 points on a 0-3 scale."""
    g = grades[:k] if k else grades
    f = (lambda r: r) if gain == "linear" else (lambda r: 2 ** r - 1)
    dcg  = sum(f(r) / math.log2(i + 1) for i, r in enumerate(g, 1))
    ideal = sorted(grades, reverse=True)[:len(g)]
    idcg = sum(f(r) / math.log2(i + 1) for i, r in enumerate(ideal, 1))
    return dcg / idcg if idcg else 0.0

print("%-5s %7s %7s %7s %7s %7s %7s %7s" %
      ("query", "P@5", "R@5", "P@10", "R@10", "AP", "RR", "Rprec"))
cols = {k: [] for k in range(7)}
for q in sorted(GT):
    run, rel = RUNS[q], GT[q]
    v = (p_at(run,rel,5), r_at(run,rel,5), p_at(run,rel,10),
         r_at(run,rel,10), ap(run,rel), rr(run,rel), rprec(run,rel))
    for i, x in enumerate(v): cols[i].append(x)
    print("%-5s %7.4f %7.4f %7.4f %7.4f %7.4f %7.4f %7.4f" % ((q,) + v))
m = [sum(c)/len(c) for c in cols.values()]
print("%-5s %7.4f %7.4f %7.4f %7.4f %7.4f %7.4f %7.4f" % (("mean",) + tuple(m)))

print()
print("NDCG linear %.4f   NDCG exponential %.4f"
      % (ndcg([3,2,3,0,1], gain="linear"), ndcg([3,2,3,0,1], gain="exp")))
print()
recall10, mrr = m[3], m[5]
print("diagnosis: recall@10 %.4f, MRR %.4f -> %s"
      % (recall10, mrr,
         "RANKING problem -- add a reranker" if recall10 > 0.85 and mrr < 0.75
         else "RETRIEVAL problem -- fix chunking/embeddings/hybrid"))`,
        out: `  query     P@5     R@5    P@10    R@10      AP      RR   Rprec
  Q1     0.4000  0.6667  0.3000  1.0000  0.4762  0.5000  0.3333
  Q2     0.4000  1.0000  0.2000  1.0000  1.0000  1.0000  1.0000
  Q3     0.0000  0.0000  0.1000  1.0000  0.1111  0.1111  0.0000
  Q4     0.4000  0.5000  0.3000  0.7500  0.5417  1.0000  0.5000
  Q5     0.4000  1.0000  0.2000  1.0000  0.4500  0.5000  0.5000
  mean   0.3200  0.6333  0.2200  0.9500  0.5158  0.6222  0.4667

  NDCG linear 0.9724   NDCG exponential 0.9575

  diagnosis: recall@10 0.9500, MRR 0.6222 -> RANKING problem -- add a reranker`,
        notes: [
          { t: "p", text: "**The diagnosis line is the output that directs work**, and it is derivable from two numbers. High recall with low MRR means the chunks are found and ranked too low, which a reranker fixes; low recall means they are not found, which reranking cannot touch." },
          { t: "p", text: "**`ap` divides by all relevant chunks rather than by the hits**, which is how a permanent miss is punished \u2014 Q4's D10 contributes 0 to the numerator and still 1 to the denominator, giving 0.5417 rather than 0.7222." },
          { t: "p", text: "**Q3 is why MRR earns its place.** P@5 scores it 0.0000 and cannot distinguish \u2018never found\u2019 from \u2018found at rank 9\u2019; reciprocal rank scores it 0.1111, which is a different and more useful kind of bad." },
          { t: "p", text: "**The `gain` parameter is not a convenience.** Linear gives 0.9724 and exponential 0.9575 on identical data, so a function that defaults silently is a function that makes your NDCG incomparable with someone else's. State it in the output, as the code does." },
          { t: "p", text: "One limit on the diagnosis thresholds: 0.85 and 0.75 are judgement calls rather than derived values, so they encode a view about how much ranking slack your generator tolerates. Worth writing down as a team decision rather than letting a helper function imply they are principled." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Precision saws up and down and is meaningless without its k; recall only climbs and is the hard bound on what the generator can see. AP repairs precision\u2019s order-blindness by dividing at every hit by *all* relevant chunks, so a permanent miss is punished." },
        { t: "p", text: "Read recall@k against MRR to get a free diagnosis: high recall with low MRR is a ranking problem a reranker fixes, low recall is a retrieval problem it cannot. And always state your NDCG gain convention, because linear and exponential differ by 1.5 points on the same data." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur retrieval metrics look mediocre. Which one should we act on?\u201d**" },
        { t: "p", text: "Two of them together, because the pair gives a diagnosis that neither gives alone. Recall@k tells you whether the right chunks are being found; MRR or NDCG tells you whether they are ranked highly." },
        { t: "p", text: "On the dataset I worked through, recall@10 was 0.9500 and MRR was 0.6222. That is not a retrieval problem \u2014 the retriever finds almost everything \u2014 it is a ranking problem, so the fix is a reranker rather than a new embedding model. That saves you from the expensive intervention." },
        { t: "p", text: "The query driving it had its relevant chunk at rank 9: recall@10 of 1.0000 and reciprocal rank of 0.1111. Precision@5 scored that query 0.0000 and could not distinguish \u2018never found\u2019 from \u2018found at rank 9\u2019, which is exactly why precision@k is a poor headline." },
        { t: "p", text: "The contrasting case in the same set had four relevant chunks with only three in the top 10 \u2014 recall@10 of 0.7500. No reordering produces a chunk that was never returned, so that one needs better chunking, embeddings or hybrid search. I have measured that fix working: adding BM25 and rank fusion took recall@5 from 95% to 100%." },
        { t: "p", text: "I would also be careful about precision@k generally. It is not monotonic \u2014 it jumps at hits and decays at misses \u2014 so precision@5 and precision@10 can disagree about which retriever is better, and a precision figure without its k is uninterpretable. Report it only beside the k you actually feed the model." },
        { t: "p", text: "And if NDCG is in the report, I would ask which gain convention. Linear relevance over the log discount and two-to-the-relevance minus one are both standard, and on the same ranking with the same labels I measured 0.9724 against 0.9575. I found two documents in the same body of material using different ones with neither saying so." }
      ] }
  ],

  takeaways: [
    "**Precision@k is not monotonic** \u2014 it jumps at hits and decays at misses, so precision@5 and precision@10 can disagree about which retriever is better.",
    "**Recall@k only climbs and then flattens**, which makes it the retrieval health number: a hard bound on what the generator could possibly see.",
    "**So a precision figure without its k is uninterpretable**, and should only be reported beside the k you actually use.",
    "**k=5 to k=10 bought 0.3333 of recall and cost 0.1000 of precision** \u2014 and those five chunks are tokens, money and potential distractors.",
    "**MRR punishes a late rescue hard**: a hit at rank 9 scores 0.1111 where P@5 recorded 0.0000 and threw the distinction away.",
    "**AP divides by all relevant chunks, not by the hits**, which is how a never-retrieved chunk is punished \u2014 Q4's missing D10 gives 0.5417 rather than 0.7222.",
    "**AP exposes what P@5 hides**: Q2 scored AP 1.0000 with P@5 of 0.4000, because P@5 divides by 5 when only 2 chunks are relevant.",
    "**R-precision sets k to the number of relevant chunks**, so every query is scored against a k it could actually saturate.",
    "**NDCG has two standard gain conventions** giving 0.9724 and 0.9575 on identical data \u2014 and this course's two reference files use different ones.",
    "**They coincide at binary relevance** and diverge as the grade scale widens, which is why the exponential form exists.",
    "**recall@10 = 0.9500 with MRR = 0.6222 is a ranking problem**, and the fix is a reranker rather than a new embedding model.",
    "**A relevant chunk outside the retrieved window is a retrieval problem no reranking can forgive** \u2014 that needs chunking, embeddings or hybrid search."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A retriever shows recall@10 of 0.9500 and MRR of 0.6222. What does this combination diagnose?",
        options: [
          "A retrieval problem \u2014 the embedding model is failing to find relevant chunks",
          "A ranking problem \u2014 the right chunks are being found but placed too low, so a reranker is the fix rather than a new embedding model",
          "A labelling problem \u2014 the ground truth sets are too large",
          "Nothing \u2014 the two metrics are not comparable"
        ],
        answer: 1,
        why: "High recall means the relevant chunks are present in the returned window; low reciprocal rank means the first one appears late. Reordering what was returned is exactly what a reranker does, so this is the cheap fix rather than the expensive one. The contrasting signature is low recall, where a chunk never appears in the window at all \u2014 no reordering can produce it, and that needs better chunking, embeddings or hybrid search." },

      { stem: "Average precision for a query with four relevant chunks and hits at ranks 1, 3 and 6 is (1/1 + 2/3 + 3/6)/4 = 0.5417. Why divide by 4 rather than 3?",
        options: [
          "Because the fourth hit would have been at rank 8 by extrapolation",
          "Because dividing by all relevant chunks is how a never-retrieved chunk is punished \u2014 it adds 0 to the numerator and still 1 to the denominator",
          "Because average precision is normalised by the retrieval window size",
          "Because precision must be averaged over the full ranking, not just the hits"
        ],
        answer: 1,
        why: "The fourth relevant chunk was never returned, so it contributes no precision term while still enlarging the divisor \u2014 which drops the score from 0.7222 to 0.5417. That design is what makes AP sensitive to a permanent miss, unlike precision@k, which simply does not know the chunk exists. It is also what distinguishes AP from averaging precision only at the ranks where hits occurred." },

      { stem: "NDCG on the same ranking and labels computes to 0.9724 one way and 0.9575 another. What differs?",
        options: [
          "The discount function \u2014 log base 2 against natural log",
          "The gain function \u2014 linear relevance against 2^relevance minus 1, both standard and both widely implemented",
          "Whether the ideal ordering includes the zero-relevance item",
          "Whether the metric was truncated at k"
        ],
        answer: 1,
        why: "Linear gain uses the relevance grade directly while exponential gain uses 2^rel \u2212 1, which emphasises top grades more heavily. Both appear in textbooks and libraries, so neither is incorrect \u2014 but the figures are not comparable, and the convention is typically a default argument rather than something reported. They coincide at binary relevance, since 2\u00b9\u22121 = 1 and 2\u2070\u22121 = 0, and diverge as the grade scale widens." },

      { stem: "Why is precision@k described as a poor headline metric for retrieval?",
        options: [
          "Because it requires graded relevance labels",
          "Because it is not monotonic in k and is bounded by the relevant-set size \u2014 one query scored P@5 of 0.4000 while its average precision was 1.0000",
          "Because it ignores the total number of relevant chunks",
          "Because it cannot be computed when no relevant chunks are retrieved"
        ],
        answer: 1,
        why: "Precision jumps at hits and decays at misses, so precision@5 and precision@10 can rank two retrievers differently \u2014 and with only 2 relevant chunks, precision@5 cannot exceed 0.4 however perfect the ordering. The measured case had a query with every relevant chunk at the top scoring AP of 1.0000 and P@5 of 0.4000, which is the gap that argues for reporting MAP. It needs only binary labels and is well-defined at zero." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Seven metrics, and the diagnosis two of them give",
    questions: [
      { level: "advanced",
        q: "Walk me through the retrieval metrics.",
        strong: "A strong answer groups them by what they can see.",
        answer: [
          { t: "p", text: "Two that ignore order and several that do not. Precision@k is hits over k \u2014 how much noise did I return. Recall@k is hits over all relevant \u2014 did I find them. Those two move very differently: precision saws up and down as you walk the ranking while recall only ever climbs and then flattens." },
          { t: "p", text: "Then the order-aware ones. Reciprocal rank is one over the rank of the first hit, averaged into MRR \u2014 right when the user needs one answer, wrong when they need a set. Average precision evaluates precision at every rank where a hit appears and divides by *all* relevant chunks, including ones never retrieved, which is how it punishes a permanent miss." },
          { t: "p", text: "R-precision sets k to the number of relevant chunks for that query, which removes precision\u2019s ceiling problem \u2014 with two relevant chunks, precision@5 cannot exceed 0.4 however good the ordering. And NDCG handles graded relevance with a positional discount." },
          { t: "p", text: "What I would report is recall@k as the health number, MRR or NDCG as the ranking number, and precision@k only beside the k I actually feed the model \u2014 because a precision figure without its k is uninterpretable." }
        ] },

      { level: "advanced",
        q: "How do you tell a retrieval problem from a ranking problem?",
        strong: "A strong answer reads two metrics against each other.",
        answer: [
          { t: "p", text: "Recall@k against MRR. High recall with low MRR means the right chunks are being found and placed too low, which is a ranking problem and a reranker fixes it. Low recall means they are not being found at all, which no reordering can repair." },
          { t: "p", text: "On a dataset I worked through, recall@10 was 0.9500 with MRR of 0.6222 \u2014 clearly a ranking problem, which matters because it points at the cheap intervention rather than replacing the embedding model." },
          { t: "p", text: "The query driving that had its relevant chunk at rank 9: recall@10 of 1.0000, reciprocal rank of 0.1111. And precision@5 scored it 0.0000, unable to distinguish \u2018never found\u2019 from \u2018found at rank 9\u2019 \u2014 which is a good illustration of why precision@k is a weak diagnostic." },
          { t: "p", text: "The opposite case in the same set had four relevant chunks with three in the top 10, so recall@10 of 0.7500 and a chunk simply absent. That one needs better chunking, embeddings or hybrid search \u2014 and I have measured that fix, where adding BM25 and reciprocal rank fusion took recall@5 from 95% to 100%." }
        ] },

      { level: "core",
        q: "What would you ask about a reported NDCG figure?",
        strong: "A strong answer asks for the gain convention.",
        answer: [
          { t: "p", text: "Which gain function, because there are two standard ones and they give different numbers. Linear uses the relevance grade directly; exponential uses two to the power of the grade, minus one. On the same ranking with the same labels I measured 0.9724 and 0.9575." },
          { t: "p", text: "That is a 1.5-point gap from the convention alone, which is larger than many of the differences people report as improvements. And it is invisible from a library call, because the choice lives in a default argument." },
          { t: "p", text: "It is not a hypothetical. I found two reference documents in the same body of material using different conventions, with neither stating which \u2014 so anyone comparing their NDCG figures would have been comparing nothing." },
          { t: "p", text: "The two coincide at binary relevance, since 2\u00b9\u22121 is 1 and 2\u2070\u22121 is 0, and they diverge as the grade scale widens \u2014 the exponential form exists precisely to weight the top grades more heavily. So I would also ask what the grade scale is, since that determines how much the convention matters." }
        ] }
    ]
  }
});
