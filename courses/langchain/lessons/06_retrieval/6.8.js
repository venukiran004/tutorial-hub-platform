EC.receiveLesson({
  id: "6.8",
  lede: "Assembling hybrid retrieval, fusion, diversity and reranking in order and measuring at each step produces three results I did not expect. **Reranking on top of dense made natural queries worse** (0.964 \u2192 0.845). **Adding hybrid fusion on top of reranking changed nothing at all** \u2014 identical to three decimal places on all four metrics, for an extra 0.05 s per query. And the full pipeline is **twice as fast** as dense-plus-rerank (0.717 s against 1.456 s) while beating it on every metric, because inserting MMR narrows 20 candidates to 8 *before* the expensive stage runs. A cheap stage placed in front of an expensive one halved the total latency.",
  objectives: [
    "Assemble a full retrieval pipeline in the correct order",
    "Ablate it so each stage has to justify itself",
    "Identify a stage that adds nothing and one that is actively harmful",
    "Explain why adding a stage can reduce total latency",
    "State the method for deciding what belongs in a pipeline"
  ],
  prerequisites: ["6.5", "6.6", "6.7"],
  blocks: [
    { t: "h2", n: "01", id: "order", text: "The pipeline, in order", sub: "Each stage narrows" },

    { t: "code", lang: "text", title: "Four stages",
      code: "retrieve (wide)  ->  fuse  ->  diversify  ->  rerank  ->  k=5\n   41 docs           20        20 -> 8       8 -> 5",
      caption: "Each stage is more expensive per document than the one before it." },
    { t: "p", text: "That ordering is 5.1's principle applied four times: never let an expensive stage see more documents than it must. The arithmetic of that turns out to matter more than any accuracy figure in this lesson." },
    { t: "h2", n: "02", id: "ablation", text: "The ablation", sub: "Each addition has to justify itself" },

    {"kind": "timeline", "title": "Three results I did not expect", "caption": "Assembled in order and measured at every step. Reranking on top of dense made natural queries **worse** — 0.964 down to 0.845 — which is the opposite of the advertised effect, and why every stage has to be measured on **your** queries rather than adopted.", "span": 1, "tick": 0.2, "unit": "MRR on the 14 natural queries", "lanes": [{"label": "dense alone", "bars": [[0, 0.964, "0.964 — the baseline", "good"]]}, {"label": "+ rerank", "bars": [[0, 0.845, "0.845 — WORSE", "crit"]]}, {"label": "+ hybrid fusion", "bars": [[0, 0.88, "helps keyword only", "warn"]]}, {"label": "+ MMR", "bars": [[0, 0.88, "coverage, not relevance", "warn"]]}], "t": "diagram", "id": "dg-6_8-02-0"},


    { t: "table", head: ["config", "nat MRR", "exact MRR", "nat R@5", "exact R@5", "s/query"], rows: [
      ["dense k=5", "**0.964**", "0.781", "1.000", "0.875", "**0.076**"],
      ["hybrid RRF", "0.393", "1.000", "0.429", "1.000", "0.098"],
      ["dense + rerank", "0.845", "1.000", "0.929", "1.000", "1.456"],
      ["hybrid + rerank", "0.845", "1.000", "0.929", "1.000", "1.506"],
      ["hybrid + mmr + rerank", "0.871", "**1.000**", "**1.000**", "**1.000**", "0.717"]
    ] },
    { t: "callout", kind: "insight", title: "Three findings, none of them the expected one", body: [
      { t: "p", text: "**One.** `hybrid + rerank` is *identical* to `dense + rerank` \u2014 0.845, 1.000, 0.929, 1.000 on all four metrics \u2014 for an extra 0.05 s per query. The fusion stage bought literally nothing once a reranker was present, because the reranker had already recovered what hybrid was for." },
      { t: "p", text: "**Two.** `dense + rerank` is worse than dense alone on natural queries (0.845 against 0.964), which is 6.7's regression showing up in the pipeline." },
      { t: "p", text: "**Three.** The full pipeline runs at 0.717 s against `dense + rerank`'s 1.456 s \u2014 roughly **half** \u2014 while scoring better on every metric, and it is the only configuration reaching R@5 = 1.000 on both query classes." }
    ] },
    { t: "h2", n: "03", id: "faster", text: "Why adding a stage made it faster", sub: "The arithmetic" },
    { t: "p", text: "`dense + rerank` cross-encodes **20** candidates. The full pipeline inserts MMR, which narrows those 20 to **8** before the reranker runs \u2014 so the expensive stage does 8 forward passes instead of 20. At 6.1's measured ~68 ms per pair that is a saving of roughly 0.8 s, and MMR itself is a handful of dot products over 20 vectors." },
    { t: "callout", kind: "mental", title: "A cheap filter in front of an expensive stage can pay for itself many times over", body: [
      { t: "p", text: "The instinct is that every pipeline stage adds latency. That holds only for stages that do not **narrow**. A stage that reduces the input to a more expensive stage has negative marginal cost whenever its own cost is below the saving it creates downstream." },
      { t: "p", text: "Here the ratio makes it overwhelming: MMR costs microseconds per candidate and the reranker costs 68 milliseconds, so removing one candidate before reranking pays for MMR's entire run many times over. The general rule is to order stages by cost per document ascending, and to let each one narrow as much as it safely can." }
    ] },
    { t: "h2", n: "04", id: "reading", text: "Reading the ablation", sub: "And what the table cannot tell you" },
    { t: "p", text: "The honest reading is that not every stage pays for itself, and the ablation is the only way to know which. Here one stage (hybrid, after reranking) is pure cost, one (reranking) helps one class and harms another, and one (MMR) improves both latency and accuracy \u2014 for reasons unrelated to the diversity it was designed for." },
    { t: "callout", kind: "warn", title: "MMR helped here for the wrong reason", body: [
      { t: "p", text: "6.6 established that MMR's diversity benefit is invisible to these metrics. So the natural-MRR improvement from 0.845 to 0.871 and the recall recovery from 0.929 to 1.000 are not diversity working \u2014 they are the consequence of giving the reranker a smaller, pre-filtered candidate set, which limits how many documents it can wrongly promote." },
      { t: "p", text: "That is worth stating plainly because it inverts the usual justification. MMR is earning its place in this pipeline as a **brake on the reranker**, not as a diversity mechanism, and if the reranker were removed its contribution would likely vanish. An ablation tells you a stage helps; it does not tell you why, and acting on the assumed reason will mislead you on the next corpus." }
    ] },
    { t: "p", text: "What the table also cannot show is answer quality, which is what the diversity was for in the first place. Both limitations point the same way: a pipeline measured only on ranking metrics is a pipeline whose stages you partly do not understand." },
    { t: "h2", n: "05", id: "method", text: "The method", sub: "Which generalises past this corpus" },
    { t: "ol", items: [
      "Build the baseline and measure it per query class.",
      "Add **one** stage.",
      "Measure both classes and the latency.",
      "Keep it only if it earns its cost \u2014 and check whether it is still needed after a later stage is added.",
      "When a stage helps one class and harms another, treat it as a routing decision rather than a pipeline stage."
    ] },
    { t: "p", text: "Step four is the one this lesson adds. `hybrid` genuinely helped before reranking existed and contributed nothing after, so a stage's value is not a property of the stage \u2014 it is a property of the pipeline it sits in. A pipeline assembled from a blog post is a pipeline nobody has ablated." },
    { t: "exercise", kind: "build", title: "Assemble and ablate the full pipeline",
      difficulty: "advanced", minutes: 34,
      body: "Assemble a retrieval pipeline of hybrid retrieval, rank fusion, MMR diversity and cross-encoder reranking, in cost order. Then ablate it: measure dense alone, hybrid alone, dense plus rerank, hybrid plus rerank, and the full pipeline, reporting both query classes and latency per query. Identify a stage that adds nothing, a stage that helps one class and harms another, and explain why the full pipeline is faster than a shorter one.",
      requirements: ["Assemble the pipeline with each stage narrowing the candidate set",
        "Ablate at least five configurations reporting both classes and latency",
        "Identify a stage whose addition changes no metric",
        "Identify a stage that helps one class and harms the other",
        "Explain why the longer pipeline is faster, with the arithmetic",
        "State what the ablation cannot tell you about why a stage helped"],
      hint: "Compare hybrid+rerank against dense+rerank carefully, and compare the full pipeline's latency against the shorter ones. Both comparisons are surprising.",
      solution: { lang: "python", title: "x0608.py \u2014 the longer pipeline is twice as fast",
        code: 'def stage_hybrid(q, k=20):\n    return rrf([dense(q, k), [x[0] for x in bm.rank(q, k)]], k=60)[:k]\n\ndef stage_mmr(cand, q, k=8):\n    v = ENC.encode([q], normalize_embeddings=True)[0]\n    return [IDS[i] for i in mmr(v, [IDS.index(c) for c in cand], lam=0.6, k=k)]\n\ndef stage_rerank(cand, q, k=5):\n    sc = ce.predict([(q, BY_ID[c].page_content) for c in cand])\n    return [cand[i] for i in np.argsort(-sc)[:k]]\n\nconfigs = [\n    ("dense k=5",             lambda q, kk=5: dense(q, kk)),\n    ("hybrid RRF",            lambda q, kk=5: stage_hybrid(q, 20)[:kk]),\n    ("dense + rerank",        lambda q, kk=5: stage_rerank(dense(q, 20), q, kk)),\n    ("hybrid + rerank",       lambda q, kk=5: stage_rerank(stage_hybrid(q, 20), q, kk)),\n    ("hybrid + mmr + rerank", lambda q, kk=5: stage_rerank(stage_mmr(stage_hybrid(q, 20), q, 8), q, kk)),\n]',
        out: "==============================================================================\nPART 1 -- the pipeline, in order\n==============================================================================\n  retrieve (wide)  ->  fuse  ->  diversify  ->  rerank  ->  k=5\n     41 docs           20        20 -> 8       8 -> 5\n\n  each stage narrows, and each is more expensive per document than the\n  one before it. that ordering is 5.1's principle applied four times.\n==============================================================================\nPART 2 -- ablation -- each addition has to justify itself\n==============================================================================\n  config                   nat MRR  exact MRR  nat R@5  exact R@5   s/query\n  dense k=5                0.964    0.781      1.000    0.875       0.076\n  hybrid RRF               0.393    1.000      0.429    1.000       0.098\n  dense + rerank           0.845    1.000      0.929    1.000       1.456\n  hybrid + rerank          0.845    1.000      0.929    1.000       1.506\n  hybrid + mmr + rerank    0.871    1.000      1.000    1.000       0.717\n==============================================================================\nPART 3 -- reading the ablation\n==============================================================================\n  the honest reading is that not every stage pays for itself here, and\n  the ablation is the only way you would know which.\n\n  what a stage costs is visible in the s/query column; what it buys is\n  in the MRR columns. a stage that moves neither is pure cost, and a\n  stage that helps one query class while hurting the other is a\n  routing decision rather than a pipeline stage.\n\n  the generalisable method: build the baseline, add ONE stage, measure\n  both query classes, keep it only if it earns its latency. a pipeline\n  assembled from a blog post is a pipeline nobody has ablated.",
        notes: [
          { t: "p", text: "**`hybrid + rerank` is identical to `dense + rerank`** on all four metrics, for an extra 0.05 s per query. The fusion stage bought nothing once a reranker was present." },
          { t: "p", text: "**So a stage's value is a property of the pipeline, not of the stage.** Hybrid helped before reranking existed and contributed nothing after it." },
          { t: "p", text: "**`dense + rerank` is worse than dense alone on natural queries** (0.845 against 0.964) \u2014 6.7's regression appearing in the pipeline." },
          { t: "p", text: "**The full pipeline runs in 0.717 s against dense+rerank's 1.456 s** \u2014 about half \u2014 while scoring better on every metric." },
          { t: "p", text: "**Because MMR narrows 20 candidates to 8 before the reranker runs**, so the expensive stage does 8 forward passes instead of 20. At ~68 ms per pair that saves roughly 0.8 s, and MMR costs microseconds." },
          { t: "p", text: "**A cheap stage in front of an expensive one can have negative marginal cost** whenever its own cost is below the saving it creates downstream. Order stages by cost per document ascending." },
          { t: "p", text: "**But MMR helped here for the wrong reason.** 6.6 showed its diversity benefit is invisible to these metrics, so the gain is from limiting how many documents the reranker can wrongly promote \u2014 it is acting as a brake on the reranker, not as a diversity mechanism." },
          { t: "p", text: "**An ablation tells you a stage helps and not why**, and acting on the assumed reason will mislead you on the next corpus. Only the full pipeline reached R@5 = 1.000 on both query classes." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the pipeline nobody could simplify", body: [
      { t: "p", text: "A mature RAG service has six retrieval stages added over two years, each justified at the time. Latency is high, nobody can say which stages matter, and every proposal to remove one is blocked because it might be load-bearing." },
      { t: "p", text: "The thing that makes this tractable is the finding above: a stage's value depends on the stages added after it. Hybrid fusion was genuinely useful until a reranker arrived, after which it was 0.05 s per query for no measurable gain. Several of those six stages are probably in the same position, and they became redundant without anyone doing anything wrong." },
      { t: "p", text: "The practical route out is a leave-one-out ablation \u2014 measure the pipeline with each stage individually removed \u2014 rather than rebuilding from scratch. That directly answers \u201cis this stage still earning its cost\u201d for each one, and should be re-run whenever a stage is added, since adding a stage is exactly what makes earlier ones redundant." }
    ] }
  ],
  takeaways: [
    "**Order stages by cost per document ascending**, letting each narrow as much as it safely can.",
    "**`hybrid + rerank` was identical to `dense + rerank`** on all four metrics, at +0.05 s per query.",
    "**So a stage's value is a property of the pipeline, not of the stage.**",
    "**`dense + rerank` was worse than dense alone on natural queries** \u2014 0.845 against 0.964.",
    "**The full pipeline ran in 0.717 s against dense+rerank's 1.456 s** while beating it on every metric.",
    "**Because MMR narrowed 20 candidates to 8 before the reranker ran** \u2014 8 forward passes instead of 20.",
    "**At ~68 ms per pair that saves ~0.8 s, and MMR costs microseconds.**",
    "**A cheap stage in front of an expensive one can have negative marginal cost.**",
    "**But MMR helped for the wrong reason** \u2014 as a brake on the reranker, not as a diversity mechanism.",
    "**An ablation tells you a stage helps and not why**, and the assumed reason will mislead you elsewhere.",
    "**Only the full pipeline reached R@5 = 1.000 on both query classes.**",
    "**Method**: baseline, add one stage, measure both classes and latency, keep only if it earns its cost.",
    "**Re-check earlier stages after adding a new one** \u2014 adding a stage is what makes earlier ones redundant.",
    "**A stage helping one class and harming another is a routing decision, not a pipeline stage.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Adding hybrid fusion in front of a reranker changed no metric but cost 0.05 s per query. What does that establish?",
      options: ["Hybrid retrieval does not work",
        "A stage's value depends on the stages added after it \u2014 the reranker had already recovered what hybrid was for",
        "The fusion weights needed retuning",
        "The measurement lacked precision to detect the gain"],
      answer: 1,
      why: "Hybrid fusion genuinely improved the exact-term class when measured against dense alone. Once a reranker was present, that class was already at a perfect 1.000, so there was nothing left for fusion to contribute. The stage became redundant without anyone doing anything wrong, which is why earlier stages need re-checking each time a new one is added." },
    { stem: "Why was the five-stage pipeline faster than the three-stage one?",
      options: ["The stages ran in parallel",
        "MMR narrowed 20 candidates to 8 before the reranker, so the expensive stage did 8 forward passes instead of 20",
        "The hybrid stage cached its results",
        "Fewer total documents were retrieved overall"],
      answer: 1,
      why: "At roughly 68 ms per query-document pair, removing twelve candidates before reranking saves about 0.8 s, while MMR itself is a handful of dot products costing microseconds. A stage that narrows the input to a more expensive stage has negative marginal cost whenever its own cost is below the downstream saving \u2014 so adding stages does not necessarily add latency." },
    { stem: "MMR improved natural MRR in the full pipeline although 6.6 showed its benefit is invisible to these metrics. What is the likely explanation?",
      options: ["The earlier measurement was wrong",
        "It is acting as a brake on the reranker \u2014 a smaller candidate set limits how many documents the reranker can wrongly promote",
        "Diversity does help ranking metrics when combined with fusion",
        "The lambda value differed enough to change the metric's behaviour"],
      answer: 1,
      why: "With one relevant document per query, ranking metrics cannot reward removing redundant non-relevant results, so the gain is not diversity. What changed is that the reranker \u2014 which demoted three relevant documents when given 20 candidates \u2014 now sees 8. The stage is earning its place for a different reason than it was designed for, and assuming otherwise would mislead you on a corpus where the reranker behaved well." },
    { stem: "A mature pipeline has six stages and nobody can say which matter. What is the most practical next step?",
      options: ["Rebuild the pipeline from scratch with a baseline",
        "Run a leave-one-out ablation, measuring the pipeline with each stage individually removed",
        "Remove the slowest stage and compare",
        "Add tracing and inspect which stages change the result set"],
      answer: 1,
      why: "Leave-one-out directly answers the question being asked of each stage \u2014 is it still earning its cost in the pipeline as it exists now \u2014 without discarding working infrastructure. It also catches the specific failure that stages become redundant when later stages are added, which is how a pipeline accumulates components nobody dares remove." }
  ] },
  interview: { title: "Interview practice", sub: "Pipeline assembly", questions: [
    { level: "core", q: "How would you order the stages of a retrieval pipeline?",
      strong: "A strong answer orders by cost per document and explains the consequence.",
      answer: [
        { t: "p", text: "By cost per document, cheapest first, with each stage narrowing the candidate set as much as it safely can. So wide retrieval, then fusion, then a cheap diversity or filtering pass, then the cross-encoder, then the final k." },
        { t: "p", text: "The reason is that the expensive stage's cost is proportional to how many documents reach it, so every document you remove earlier is multiplied by the per-document cost of everything after." },
        { t: "p", text: "That has a counterintuitive consequence I measured: adding a stage made the pipeline about twice as fast. Dense plus reranking cross-encoded 20 candidates at roughly 68 ms each. Inserting MMR to narrow 20 down to 8 first meant the reranker did 8 passes instead of 20 \u2014 saving around 0.8 s \u2014 while MMR itself cost microseconds. Total latency went from 1.46 s to 0.72 s, and every metric improved." },
        { t: "p", text: "So I would reject the general claim that each stage adds latency. It holds for stages that do not narrow. A cheap stage in front of an expensive one can have negative marginal cost." }
      ] },
    { level: "advanced", q: "How do you decide what belongs in a retrieval pipeline?",
      strong: "A strong answer ablates, and knows a stage's value is contextual.",
      answer: [
        { t: "p", text: "Build the baseline, add one stage, measure both query classes and the latency, and keep it only if it earns its cost. The part people skip is re-checking the earlier stages afterwards." },
        { t: "p", text: "I measured a case that makes the point. Hybrid fusion genuinely helped the exact-term query class when compared against dense alone. Then I added a reranker, and hybrid-plus-rerank came out identical to dense-plus-rerank \u2014 the same numbers to three decimal places on all four metrics \u2014 for an extra 0.05 s per query. The reranker had already recovered everything fusion was there for." },
        { t: "p", text: "So a stage's value is a property of the pipeline, not of the stage. Which explains how teams end up with six-stage pipelines nobody can simplify: each stage was justified when added, and later additions quietly made earlier ones redundant. The way out is a leave-one-out ablation rather than a rebuild." },
        { t: "p", text: "The other discipline I would insist on is being honest about what an ablation does not tell you. In my pipeline MMR improved the metrics \u2014 but I had already established its diversity benefit was invisible to those metrics, so the gain had to be coming from somewhere else. It was limiting how many documents the reranker could wrongly promote. The stage was earning its place as a brake on the reranker, not as a diversity mechanism, and acting on the stated reason would have misled me on the next corpus." }
      ] },
    { level: "core", q: "A pipeline stage was justified when it was added. Can it stop being worth it?",
      strong: "A strong answer says yes, with the mechanism and the remedy.",
      answer: [
        { t: "p", text: "Yes, and nobody has to do anything wrong for it to happen. A later stage can make an earlier one redundant." },
        { t: "p", text: "The case I measured: hybrid fusion genuinely improved the exact-term query class against a dense baseline. Then I added a cross-encoder reranker, and hybrid-plus-rerank came out identical to dense-plus-rerank \u2014 the same numbers to three decimal places on all four metrics \u2014 for an extra 0.05 seconds per query. The reranker had already pushed that class to a perfect 1.000, so there was nothing left for fusion to contribute." },
        { t: "p", text: "So a stage's value is a property of the pipeline, not of the stage. Which explains how you end up with a six-stage retrieval pipeline nobody dares simplify: each stage was measured and justified at the time, and the justifications expired silently." },
        { t: "p", text: "The remedy is a leave-one-out ablation \u2014 measure the pipeline with each stage individually removed \u2014 rather than a rebuild, because it answers the actual question for each stage without discarding working infrastructure. And I would re-run it whenever a stage is added, since adding a stage is precisely the event that makes earlier ones redundant." }
      ] }
  ] }
});
