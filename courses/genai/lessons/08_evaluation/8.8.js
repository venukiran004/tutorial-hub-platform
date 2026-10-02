EC.receiveLesson({
  id: "8.8",

  lede: "Score retrieval and generation separately, because a single number cannot say which one failed \u2014 and the reference\u2019s soundbite is the one to internalise: **most RAG failures are retrieval failures**, so a combined score sends you to tune the prompt forever. 6.1 measured the retrieval half of this on a real corpus and found something sharper: BM25 and dense retrieval **rank the same systems in opposite orders** depending on the metric, with dense winning on MAP and nDCG while BM25 won on MRR.",

  objectives: [
    "Compute recall@k, precision@k, hit rate, MRR and nDCG",
    "Explain which retrieval metric answers which question",
    "Name the RAGAS quartet and which members need a reference",
    "Decompose faithfulness into claims and say what the denominator depends on",
    "Diagnose whether a failure is retrieval or generation"
  ],

  prerequisites: ["8.7", "6.1"],

  blocks: [

    { t: "h2", n: "01", id: "retrieval", text: "Stage one \u2014 is the right context fetched?",
      sub: "Five metrics, each answering a different question" },

    { t: "table",
      head: ["Metric", "Meaning", "The question it answers"],
      rows: [
        ["Recall@k", "relevant retrieved in top-k / all relevant", "**Did we get them?**"],
        ["Precision@k", "relevant in top-k / k", "**How much noise?**"],
        ["Hit rate@k", "fraction of queries with \u22651 relevant in top-k", "Did we get *anything*?"],
        ["MRR", "mean of 1/rank of the first relevant result", "**How high?**"],
        ["nDCG@k", "rank-weighted gain normalised by the ideal ordering", "How good is the whole ordering?"]
      ] },

    { t: "code", lang: "python", title: "two of them, from the definition", code: `def recall_at_k(retrieved_ids, relevant_ids, k):
    top = set(retrieved_ids[:k])
    return len(top & set(relevant_ids)) / max(len(relevant_ids), 1)

def mrr(retrieved_ids, relevant_ids):
    for i, rid in enumerate(retrieved_ids, 1):
        if rid in relevant_ids:
            return 1.0 / i
    return 0.0`,
      caption: "MRR stops at the first hit, so it is indifferent to everything below it \u2014 which is the property that matters next." },

    { t: "callout", kind: "insight", title: "6.1 measured these ranking systems in opposite orders",
      body: [
        { t: "p", text: "On 20 golden queries over 1,187 chunks, dense retrieval scored MAP **0.50** and nDCG **0.63** against BM25\u2019s 0.48 and 0.60 \u2014 dense wins. On MRR, BM25 scored **0.85** against dense\u2019s **0.84** \u2014 BM25 wins." },
        { t: "p", text: "The mechanism is in the definitions. MRR only looks at the first relevant result, so a retriever that puts one good chunk at rank 1 and nothing else useful beats one that puts five good chunks at ranks 2 to 6. MAP and nDCG see the whole ordering." },
        { t: "p", text: "So \u201cwhich retriever is better\u201d has no answer independent of the metric, and the metric encodes a product decision: if the generator needs one good chunk, optimise MRR; if it needs coverage, optimise recall and nDCG. Choosing the metric is choosing what you mean." }
      ] },

    { t: "callout", kind: "trap", title: "And precision@k falls as k rises, which is arithmetic rather than degradation",
      body: [
        { t: "p", text: "6.1 measured precision@k dropping from 0.75 at k=1 to 0.26 at k=20 while recall@k rose from 0.14 to 0.63. That is not the retriever getting worse \u2014 with a median of 6 relevant chunks per query, precision@20 **cannot exceed 0.30** however perfect the ranking." },
        { t: "p", text: "Which makes precision@k only comparable at a fixed k, and a poor headline metric. Quoting \u201cprecision 0.26\u201d without k is as incomplete as a perplexity without its corpus or a \u03ba without its class balance \u2014 the same pattern recurring for the third time." },
        { t: "p", text: "nDCG handles this properly by normalising against the ideal ordering, which is why it is the right default for a graded-relevance judgement. The cost is that it needs graded labels rather than binary ones, which is more annotation." }
      ] },

    { t: "math", tex: "\\text{DCG@}k = \\sum_{i=1}^{k} \\frac{2^{rel_i} - 1}{\\log_2(i+1)}, \\qquad \\text{nDCG@}k = \\frac{\\text{DCG@}k}{\\text{IDCG@}k}" },

    { t: "h2", n: "02", id: "generation", text: "Stage two \u2014 is the answer good, given the context?",
      sub: "The RAGAS quartet" },

    { t: "table",
      head: ["Metric", "Question it answers", "Reference needed?"],
      rows: [
        ["**Faithfulness / Groundedness**", "Are the answer's claims supported by the retrieved context?", "**No**"],
        ["Answer Relevancy", "Does the answer actually address the question?", "**No**"],
        ["Context Precision", "Are the retrieved chunks relevant, and ranked well?", "**No**"],
        ["Context Recall", "Did retrieval get everything needed to answer?", "Yes \u2014 a gold answer"],
        ["Answer Correctness", "Is the final answer factually right against gold?", "Yes"]
      ] },

    { t: "callout", kind: "good", title: "Three of five are reference-free, which is what makes this affordable",
      body: [
        { t: "p", text: "8.1 argued that reference-free evaluation is what lifts the ceiling on eval-set size, because a gold answer per case bounds you by annotation effort. Faithfulness, answer relevancy and context precision all score the output against inputs the system already produced." },
        { t: "p", text: "So you can run those three over sampled production traffic at whatever volume you like, and reserve the two reference-based metrics for a smaller curated set. That split is the practical shape of a RAG eval suite." },
        { t: "p", text: "The reference\u2019s emphasis is right: **faithfulness is the most important RAG metric**, because it directly measures hallucination and a faithful-but-incomplete answer is usually safer than a fluent fabrication. 7.11 catalogued confident hallucination as the hack that fluency rewards." }
      ] },

    { t: "math", tex: "\\text{Faithfulness} \\approx \\frac{\\#\\,\\text{claims in the answer supported by the context}}{\\#\\,\\text{claims in the answer}}" },

    { t: "callout", kind: "warn", title: "The denominator is a judgement, so it has to be reported",
      body: [
        { t: "p", text: "Computing faithfulness means having a judge decompose the answer into atomic claims and check each one. How aggressively it splits changes the score: one sentence treated as a single claim and judged unsupported scores 0, while the same sentence split into four claims with three supported scores 0.75." },
        { t: "p", text: "So a faithfulness figure depends on the claim-extraction policy as much as on the answer. 8.7 made the same point and it recurs here because this is where it bites \u2014 two teams using \u201cRAGAS faithfulness\u201d can be computing different things." },
        { t: "p", text: "8.12 works a single answer through every metric and finds a sharper version of this problem in the reference\u2019s own example, where one claim is derived by arithmetic rather than stated." }
      ] },

    { t: "h2", n: "03", id: "diagnosis", text: "Which stage failed",
      sub: "The reason to split at all" },

    { t: "callout", kind: "insight", title: "6.8 measured the diagnosis procedure",
      body: [
        { t: "p", text: "The branch point is one check: **is the gold chunk in the top-k at all?** Absent means retrieval; present but ignored means generation. The two branches share no fixes, which is why guessing is expensive." },
        { t: "p", text: "The retrieval branch wants hybrid search, query rewriting, better chunking or a re-ranker \u2014 and M5 measured one query sitting at rank 15 through every chunking strategy, reaching rank 10 under BM25 and rank 1 under HyDE. Three interventions to find the one that worked, and no prompt change would have touched it." },
        { t: "p", text: "The generation branch wants chunk reordering \u2014 most relevant last, to beat lost-in-the-middle \u2014 and a groundedness gate. If the chunk was in context and the answer ignored it, that is the whole problem." }
      ] },

    { t: "callout", kind: "good", title: "And the split is what stops you tuning the prompt forever",
      body: [
        { t: "p", text: "A combined score going down tells you something broke and not where, so the natural response is to edit the prompt, which is the cheapest thing to change. If the real failure is retrieval, every prompt iteration will fail and you will conclude the model is bad." },
        { t: "p", text: "6.8 measured a case that makes this concrete from the other direction: adding 20,000 off-topic chunks to an index changed recall@5 by **nothing**, while near-duplicates at a third that index size dropped it to 55%. A combined end-to-end score would have shown \u201cquality dropped after an ingest\u201d and sent you looking in the wrong place." },
        { t: "p", text: "So the component split is not thoroughness, it is the thing that makes the number actionable. That is the general argument for per-stage evaluation and it is the reference\u2019s strongest claim in this section." }
      ] },

    { t: "viz", title: "Two stages, two sets of metrics, one branch point", caption: "Is the gold chunk in the top-k? That single check decides which half of the pipeline to fix.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="RAG evaluation split into retrieval and generation">
  <rect x="26" y="34" width="320" height="120" rx="6" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.8"/>
  <text x="186" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">STAGE 1 \u2014 RETRIEVAL</text>
  <text x="42" y="80" class="s-mono" style="font-size:9px">recall@k \u00b7 precision@k \u00b7 hit rate</text>
  <text x="42" y="96" class="s-mono" style="font-size:9px">MRR \u00b7 nDCG@k</text>
  <text x="42" y="118" class="s-sub" style="font-size:9px">needs labelled relevant chunks</text>
  <text x="42" y="134" class="s-mono" style="font-size:9px;fill:var(--warn)">6.1: dense wins nDCG, BM25 wins MRR</text>

  <rect x="394" y="34" width="340" height="120" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="564" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">STAGE 2 \u2014 GENERATION</text>
  <text x="410" y="80" class="s-mono" style="font-size:9px">faithfulness \u00b7 answer relevancy</text>
  <text x="410" y="96" class="s-mono" style="font-size:9px">context precision (reference-FREE)</text>
  <text x="410" y="118" class="s-sub" style="font-size:9px">context recall + answer correctness</text>
  <text x="410" y="134" class="s-sub" style="font-size:9px">need a gold answer</text>

  <line x1="16" y1="178" x2="744" y2="178" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="202" class="s-label">THE BRANCH POINT</text>
  <rect x="200" y="214" width="360" height="30" rx="5" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="380" y="234" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">is the gold chunk in the top-k?</text>
  <text x="120" y="268" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">absent -&gt; RETRIEVAL</text>
  <text x="120" y="282" text-anchor="middle" class="s-sub" style="font-size:9px">hybrid, rewrite, chunk, rerank</text>
  <text x="640" y="268" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">present -&gt; GENERATION</text>
  <text x="640" y="282" text-anchor="middle" class="s-sub" style="font-size:9px">reorder, groundedness gate</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Split your own RAG evaluation in two", difficulty: "advanced", minutes: 40,
      body: "Build a two-stage evaluation for your own system: retrieval metrics against labelled relevant chunks, and the reference-free RAGAS metrics on the generated answers. Then run the branch-point check on every failing case and report how the failures divide.",
      requirements: [
        "Label relevant chunks for at least 20 queries",
        "Report recall@k, precision@k, MRR and nDCG at a stated k",
        "Compute faithfulness with the claim-extraction policy written down",
        "For every failure, record whether the gold chunk was in the top-k",
        "Report the retrieval-versus-generation split of failures"
      ],
      hint: "Record the k with every precision figure. Precision@k falls as k rises by arithmetic, so a precision number without its k is uninterpretable.",
      solution: { lang: "python", title: "the two stages and the branch point", code: `import math

def recall_at_k(retrieved, relevant, k):
    return len(set(retrieved[:k]) & set(relevant)) / max(len(relevant), 1)

def precision_at_k(retrieved, relevant, k):
    return len(set(retrieved[:k]) & set(relevant)) / k

def mrr(retrieved, relevant):
    for i, r in enumerate(retrieved, 1):
        if r in relevant:
            return 1.0 / i
    return 0.0

def ndcg_at_k(retrieved, relevant, k):
    dcg  = sum(1.0 / math.log2(i + 1)
               for i, r in enumerate(retrieved[:k], 1) if r in relevant)
    idcg = sum(1.0 / math.log2(i + 1)
               for i in range(1, min(len(relevant), k) + 1))
    return dcg / idcg if idcg else 0.0

def diagnose(case, k=5):
    """The branch point -- absent means retrieval, present means generation."""
    retrieved = retrieve(case["q"])
    in_topk = bool(set(retrieved[:k]) & set(case["relevant"]))
    answer  = generate(case["q"], retrieved[:k])
    faithful = judge_faithfulness(answer, retrieved[:k])   # claims supported / claims
    ok = judge_correct(answer, case["gold"])
    if ok:
        return "pass"
    return "generation" if in_topk else "retrieval"

K = 5
rows = [diagnose(c, K) for c in EVAL]
print("retrieval failures : %d" % rows.count("retrieval"))
print("generation failures: %d" % rows.count("generation"))
print("passes             : %d" % rows.count("pass"))`,
        out: `  [shape -- the retrieval column uses 6.1's measured figures]

  recall@5 0.39   precision@5 0.53   MRR 0.84   nDCG@5 0.63   (dense)
  recall@5 0.36   precision@5 0.48   MRR 0.85   nDCG@5 0.60   (BM25)
  recall@5 0.47   precision@5 0.59   MRR 0.88   nDCG@5 0.71   (RRF)

  retrieval failures : 11
  generation failures: 4
  passes             : 45`,
        notes: [
          { t: "p", text: "**The first two rows disagree about which retriever is better**, and that is a real measured result rather than noise: dense wins nDCG at 0.63 against 0.60 while BM25 wins MRR at 0.85 against 0.84. MRR stops at the first relevant hit, so it rewards a different thing than nDCG does." },
          { t: "p", text: "**So choosing the metric is choosing what you mean.** If the generator needs one good chunk, MRR is the objective; if it needs coverage across several chunks, recall and nDCG are. Reporting both and noting the disagreement is more honest than picking the one that favours your change." },
          { t: "p", text: "**The failure split is the output that directs work.** Eleven retrieval failures against four generation failures says to spend the week on hybrid search or chunking, not on the prompt \u2014 which is exactly the trap a combined end-to-end score sets." },
          { t: "p", text: "**Record k with every precision figure.** Precision@k falls as k rises by arithmetic: with a median of six relevant chunks per query, precision@20 cannot exceed 0.30 no matter how good the ranking. A bare precision number is uninterpretable." },
          { t: "p", text: "One honest note on the branch point: it classifies a failure as generation whenever the gold chunk was present, which lumps together genuine lost-in-the-middle problems and cases where the chunk was present but insufficient. Splitting those needs a judge on the context itself \u2014 context recall \u2014 which is the reference-based metric in the quartet." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Score the two stages separately, because a combined number tells you something broke and not where \u2014 and the cheapest thing to change is the prompt, so a combined score sends you there regardless of the truth. Most RAG failures are retrieval failures." },
        { t: "p", text: "Within retrieval, the metric is a product decision: MRR cares only about the first hit and ranked BM25 above dense, while nDCG sees the whole ordering and ranked dense above BM25 on the same data. Within generation, faithfulness is the metric that matters, and its denominator is a claim-extraction policy you must state." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG system gives bad answers. Where do you start?\u201d**" },
        { t: "p", text: "With one check per failing case: is the gold chunk in the top-k at all? Absent means retrieval, present means generation, and the two branches share no fixes \u2014 so guessing is expensive." },
        { t: "p", text: "I would expect most failures to be retrieval, which is the single most useful prior in this area. A combined end-to-end score cannot distinguish the two, and the cheapest thing to change is the prompt, so teams tune prompts for weeks against a retrieval problem and conclude the model is bad." },
        { t: "p", text: "On the retrieval side I would report recall@k, MRR and nDCG at a stated k \u2014 and expect them to disagree. On my own corpus, dense retrieval beat BM25 on nDCG at 0.63 against 0.60 while BM25 beat dense on MRR at 0.85 against 0.84. MRR stops at the first relevant result, so it rewards a different thing. Which metric you optimise is a product decision: one good chunk, or coverage." },
        { t: "p", text: "I would also insist on recording k with every precision figure, because precision@k falls as k rises by arithmetic \u2014 with a median of six relevant chunks per query, precision@20 cannot exceed 0.30 however perfect the ranking." },
        { t: "p", text: "On the generation side, faithfulness is the metric I would lead with, since it measures hallucination directly and is reference-free, so it runs over sampled production traffic at any volume. The caveat is that its denominator is a claim-extraction judgement \u2014 split one sentence into four claims with three supported and you score 0.75 where treating it whole scores 0 \u2014 so the extraction policy has to be written down or two teams are computing different numbers." },
        { t: "p", text: "And the fixes differ sharply. Retrieval failures want hybrid search, query rewriting, better chunking or a re-ranker \u2014 I have had a query sit at rank 15 through every chunking strategy, move to rank 10 under BM25 and rank 1 under HyDE. Generation failures want chunk reordering, most relevant last, and a groundedness gate." }
      ] }
  ],

  takeaways: [
    "**Score retrieval and generation separately**, because a combined number says something broke and not where \u2014 and the prompt is the cheapest thing to change, so it gets changed regardless.",
    "**Most RAG failures are retrieval failures**, which is the most useful prior in this area.",
    "**The branch point is one check**: is the gold chunk in the top-k? Absent means retrieval, present means generation, and the branches share no fixes.",
    "**The retrieval metrics disagree with each other**, measured: dense beat BM25 on nDCG (0.63 vs 0.60) while BM25 beat dense on MRR (0.85 vs 0.84).",
    "**MRR only sees the first relevant result**, so it rewards one well-placed chunk where nDCG rewards the whole ordering.",
    "**So choosing the metric is choosing what you mean** \u2014 one good chunk, or coverage across several.",
    "**Precision@k falls as k rises by arithmetic**: with a median of 6 relevant chunks, precision@20 cannot exceed 0.30 however perfect the ranking.",
    "**Record k with every precision figure**, the third instance of a metric needing its denominator stated after perplexity's corpus and \u03ba's class balance.",
    "**Three of the five RAGAS metrics are reference-free**, which lifts the ceiling on eval-set size and lets them run over production traffic.",
    "**Faithfulness is the most important RAG metric**, because a faithful-but-incomplete answer is safer than a fluent fabrication.",
    "**Its denominator is a claim-extraction policy** \u2014 one sentence as one unsupported claim scores 0, split into four with three supported scores 0.75.",
    "**A combined score misdirects after an ingest regression**: 20,000 off-topic chunks changed recall by nothing while near-duplicates at a third the size dropped it to 55%."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "On the same corpus and queries, dense retrieval scored nDCG 0.63 against BM25's 0.60, while BM25 scored MRR 0.85 against dense's 0.84. What explains the disagreement?",
        options: [
          "Measurement noise \u2014 the differences are within the confidence interval",
          "MRR only considers the rank of the first relevant result, so it rewards one well-placed chunk, while nDCG evaluates the whole ordering",
          "BM25 retrieves fewer chunks, inflating its rank-based scores",
          "nDCG requires graded relevance labels, which were unavailable for BM25"
        ],
        answer: 1,
        why: "The definitions differ in what they can see: MRR stops at the first hit and is indifferent to everything below it, so a retriever placing one good chunk at rank 1 beats one placing five good chunks at ranks 2 to 6. nDCG and MAP account for the full ranking. This means \"which retriever is better\" has no metric-independent answer, and the choice of metric encodes whether the generator needs one good chunk or broad coverage." },

      { stem: "Precision@k on a corpus falls from 0.75 at k=1 to 0.26 at k=20. What does this indicate?",
        options: [
          "The ranking degrades sharply beyond the top few results",
          "Arithmetic \u2014 with a median of about 6 relevant chunks per query, precision@20 cannot exceed 0.30 regardless of ranking quality",
          "The relevance labels are incomplete beyond the top-ranked chunks",
          "The index contains near-duplicates that dilute precision at higher k"
        ],
        answer: 1,
        why: "Precision's denominator is k, so once k exceeds the number of relevant items available the metric is capped below 1 by construction \u2014 at a median of 6 relevant chunks, 6/20 is the ceiling at k=20. The ranking may be perfect and precision will still fall. This makes precision@k comparable only at a fixed k and a poor headline, and it is why nDCG, which normalises against the ideal ordering, is the better default." },

      { stem: "Why does a faithfulness score need its claim-extraction policy reported?",
        options: [
          "Because different judges disagree about whether claims are supported",
          "Because the denominator is the number of claims, so how aggressively an answer is split changes the score \u2014 one unsupported sentence scores 0, while the same sentence split into four claims with three supported scores 0.75",
          "Because atomic claims must be extracted before the context can be retrieved",
          "Because the policy determines whether the metric is reference-free"
        ],
        answer: 1,
        why: "Faithfulness is supported claims over total claims, and both numerator and denominator depend on the decomposition step. Two teams both reporting \"RAGAS faithfulness\" can therefore be computing materially different quantities. Judge disagreement on support is a separate real source of noise. This is the same pattern as perplexity needing its corpus and \u03ba needing its class balance \u2014 a ratio whose denominator is a judgement must have that judgement stated." },

      { stem: "A combined end-to-end RAG score drops after a large document ingest. Why is that score insufficient to act on?",
        options: [
          "Because end-to-end scores are judge-based and therefore noisy",
          "Because it cannot say whether retrieval or generation degraded, and the prompt is the cheapest thing to change \u2014 so the team tunes prompts against what is usually a retrieval problem",
          "Because ingest affects only latency, not quality",
          "Because the golden set becomes stale after the corpus changes"
        ],
        answer: 1,
        why: "A single number localises nothing, and the natural response is to edit the most editable component. Measured, the causes behave very differently: adding 20,000 off-topic chunks changed recall@5 by nothing, while near-duplicates at a third that index size dropped it to 55% \u2014 so the diagnosis matters and an end-to-end score does not supply it. Separating the stages is what makes the number actionable rather than merely thorough." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Two stages, because the fixes differ",
    questions: [
      { level: "advanced",
        q: "How do you evaluate a RAG system?",
        strong: "A strong answer splits the stages and names the branch point.",
        answer: [
          { t: "p", text: "In two stages, because a combined number cannot tell you which half failed. Retrieval against labelled relevant chunks \u2014 recall@k, precision@k at a stated k, MRR and nDCG. Generation against the retrieved context \u2014 faithfulness, answer relevancy and context precision, which are reference-free, plus context recall and answer correctness, which need a gold answer." },
          { t: "p", text: "The reason to split is diagnostic. Most RAG failures are retrieval failures, and the check that separates them is whether the gold chunk was in the top-k at all. Absent means retrieval and present means generation, and the two branches share no fixes \u2014 so without the split you tune the prompt forever because it is the cheapest thing to change." },
          { t: "p", text: "On the retrieval side I would expect the metrics to disagree and would report several. On my own corpus dense beat BM25 on nDCG, 0.63 against 0.60, while BM25 beat dense on MRR, 0.85 against 0.84 \u2014 because MRR stops at the first relevant result. Which one you optimise depends on whether the generator needs one good chunk or coverage." },
          { t: "p", text: "On the generation side faithfulness is the one I would lead with. It measures hallucination directly, it is reference-free so it can run over sampled production traffic at volume, and a faithful-but-incomplete answer is safer than a fluent fabrication." }
        ] },

      { level: "core",
        q: "Why is \u201cmost RAG failures are retrieval failures\u201d such an important heuristic?",
        strong: "A strong answer explains the asymmetry in what is easy to change.",
        answer: [
          { t: "p", text: "Because the easiest component to change is the prompt, and the most likely broken component is the retriever. That mismatch produces weeks of prompt iteration against a problem no prompt can touch \u2014 if the relevant chunk never entered the context, no instruction makes the model ground an answer in it." },
          { t: "p", text: "I have seen the shape of this directly. One query sat at rank 15 through every chunking strategy I tried, moved to rank 10 when I added BM25, and reached rank 1 under HyDE. Three different interventions before one worked, and all of them were retrieval-side." },
          { t: "p", text: "The diagnostic is cheap enough that there is no excuse for guessing: for each failing query, check whether the gold chunk appears in the top-k. That takes minutes with a labelled set and it partitions your work for the week." },
          { t: "p", text: "It also changes what you measure after an incident. When quality drops following an ingest, a combined score says only that something broke \u2014 and the causes behave very differently. Adding twenty thousand unrelated chunks changed my recall by nothing, while near-duplicates at a third that index size dropped recall@5 to 55%." }
        ] },

      { level: "core",
        q: "What makes faithfulness the most important RAG metric?",
        strong: "A strong answer notes it is reference-free and names its weakness.",
        answer: [
          { t: "p", text: "It measures the failure that actually costs you \u2014 a confident fabrication \u2014 and it is reference-free, so it needs no gold answer and can run over sampled production traffic at whatever volume you want. That combination is rare." },
          { t: "p", text: "It also isolates the generator from the retriever, which matters given that most failures are retrieval-side. Faithfulness asks whether the claims are supported by what the system was given, so a low score points at the generator specifically." },
          { t: "p", text: "The weakness worth stating is that it passes a faithfully-quoted falsehood. I measured a case where a query about refund policy retrieved a document titled \u2018Scenario 1: The Invented Policy\u2019 \u2014 genuinely on-topic, quotable, and not an answer. A grounded summary of that scores well and is useless." },
          { t: "p", text: "And its denominator is a judgement. Faithfulness is supported claims over total claims, so the claim-extraction policy changes the number \u2014 one sentence judged unsupported scores 0, the same sentence split into four claims with three supported scores 0.75. Two teams quoting \u2018RAGAS faithfulness\u2019 can be computing different things unless they state the policy." }
        ] }
    ]
  }
});
