EC.receiveLesson({
  id: "6.7",

  lede: "The reference\u2019s guardrail chain contains one magic number: `rel_threshold=0.35`, the floor below which the system refuses to answer. Tested against 20 answerable and 10 deliberately unanswerable questions, **0.35 lets 4 of the 10 unanswerable queries straight through** \u2014 and no threshold separates the two populations, because they overlap from 0.3589 to 0.5174 with 7 answerable and 4 unanswerable queries inside that band. The relevance gate is real and useful and it is **not** a correctness boundary.",

  objectives: [
    "Scale a RAG pipeline by identifying which stage is actually the bottleneck",
    "Enforce a token budget as a hard cost cap rather than a hope",
    "Fuse multiple retrievers and resolve the conflicts fusion creates",
    "Chain the guardrails in the right order, and treat retrieved text as untrusted",
    "Calibrate a relevance gate from data and know what it cannot do"
  ],

  prerequisites: ["5.13", "6.2"],

  blocks: [

    { t: "h2", n: "01", id: "traffic", text: "Scaling the bottleneck, not \u201cthe system\u201d",
      sub: "6.2 measured which stage that is" },

    { t: "p", text: "The reference\u2019s framing is right: a RAG query is a pipeline and each stage scales differently, so you scale the bottleneck. 6.2 already measured where the bottleneck is, which turns the reference\u2019s list from advice into a priority order." },

    { t: "table",
      head: ["Stage", "Measured", "The reference's fix", "Worth doing?"],
      rows: [
        ["Cache", "Hit costs nothing (5.13)", "Exact match, then semantic", "**First** \u2014 the cheapest request is one that never runs"],
        ["Embed query", "Inside the 11 ms (5.1)", "Smaller model, batch, cache", "Rarely \u2014 it is ~1% of the request"],
        ["Vector search", "11 ms; 9.2 ms at 200k HNSW (5.5)", "Replicas, shard, tune `ef`/`nprobe`, quantize", "For **memory**, not latency \u2014 6.2's finding"],
        ["Re-rank", "**2,405 ms** for 20 candidates on CPU (5.9)", "Shallower shortlist, smaller model, skip under load", "**This is the lever** \u2014 75% of the request"],
        ["LLM generate", "Hundreds of ms (3.1)", "Route simple queries to a smaller model, stream, compress context", "**Yes** \u2014 and streaming changes perceived latency most"],
        ["Boundary", "\u2014", "Per-tenant rate limit, backpressure with 429", "**Yes** \u2014 it is what makes a spike degrade instead of collapse"]
      ] },

    { t: "callout", kind: "insight", title: "\u201cSkip reranking under load\u201d is the most useful item on the list",
      body: [
        { t: "p", text: "It is also the one that sounds like giving up, so it is worth stating what it costs. 6.1 measured re-ranking on a dense first stage improving nDCG by 0.11 and MRR by only 0.03 \u2014 and on an RRF first stage it *lowered* Hit@5 by 0.10 while raising MAP by 0.06." },
        { t: "p", text: "So on a strong first stage the re-ranker is a modest, ambiguous gain costing 75% of the request. Dropping it under load is not degradation to a broken system, it is degradation to a slightly differently ordered one \u2014 which is the best kind of load-shedding available." },
        { t: "p", text: "Shortlist depth is the continuous version of the same dial, and 5.9 measured it as linear: 524 ms at depth 5 against 3,961 ms at depth 50, with recall flat from 20 to 50. So there is usually a large cut available before you reach the binary choice." }
      ] },

    { t: "callout", kind: "good", title: "Separate the ingestion path from the query path",
      body: [
        { t: "p", text: "The reference lists this under the vector database and it deserves more prominence, because it is an architectural decision rather than a tuning one: make indexing async and queued so that re-indexing never blocks reads." },
        { t: "p", text: "6.2 reached the same conclusion from the correctness side \u2014 build a second index and swap a pointer, because a mutating index serves arbitrary results. The two arguments converge: the ingestion path should not be able to affect the query path at all, in latency or in content." },
        { t: "p", text: "And it is the precondition for everything in 6.6 about code. If re-indexing blocked reads, a commit hook that re-indexes on every push would make the assistant unusable exactly when people are working." }
      ] },

    { t: "h2", n: "02", id: "budget", text: "The cost cap",
      sub: "Context is the dominant cost and the one you control exactly" },

    { t: "p", text: "The reference locates the cost correctly: generation dominates, and generation cost scales with how much retrieved context you put in the prompt. That makes the context budget the main cost lever, and unlike most cost levers it is enforceable by arithmetic rather than by estimation." },

    { t: "code", lang: "python", title: "pack until the budget is spent, then stop", code: `def assemble_context(chunks, count_tokens, max_context_tokens=3000):
    """Pack highest-ranked chunks until the token budget is spent."""
    context, used = [], 0
    for ch in chunks:                      # already sorted by relevance
        t = count_tokens(ch.text)
        if used + t > max_context_tokens:
            break                          # budget reached -> stop adding
        context.append(ch.text); used += t
    return "\n\n".join(context), used`,
      hl: [6, 7],
      caption: "A hard cap, not a target. `break` rather than `continue` \u2014 which matters, and see the caveat below." },

    { t: "code", lang: "python", title: "g67.py \u00a7D \u2014 the cap against four budgets", code: `for budget in (500, 1000, 2000, 3000, 8000):
    ctx, used = assemble_context(ranked_example, budget)`,
      out: `  budget      chunks in  tokens used    % of budget
  500                13          484            97%
  1000               17          839            84%
  2000               31         1928            96%
  3000               47         2962            99%
  8000               64         4114            51%

  median chunk is 99 tokens, so a 3000-token budget holds about 30 chunks.`,
      hl: [6],
      caption: "Token totals are exact and always under budget. The chunk counts in column two are not \u2014 see below." },

    { t: "callout", kind: "trap", title: "Two reporting bugs in my own §D, and one of them is informative",
      body: [
        { t: "p", text: "The \u201cchunks in\u201d column is wrong. I computed it as `len(ctx.split(\"\\n\\n\"))`, which counts blank-line-separated *segments* of the assembled string \u2014 and chunks contain internal blank lines. With a median chunk of 99 tokens, a 484-token context holds about five chunks, not thirteen. The token column is correct; the count beside it is an artefact of how I measured it." },
        { t: "p", text: "The 8,000 row is the informative one. It used 4,114 tokens \u2014 51% of budget \u2014 not because the cap misbehaved but because my candidate list was only 40 chunks long and ran out. That is correct behaviour and a useful reminder: a budget is an upper bound, and the binding constraint is often `top_k`, not the budget." },
        { t: "p", text: "Which has a real consequence. If you raise the context budget to buy quality and your retriever still returns 5 chunks, nothing changes and the budget was not the limit. Check which one you are actually hitting before tuning either." }
      ] },

    { t: "callout", kind: "tradeoff", title: "`break` or `continue` is a real decision",
      body: [
        { t: "p", text: "`break` stops at the first chunk that does not fit. `continue` would skip it and keep trying smaller ones, filling the budget more completely \u2014 at the cost of reordering by size rather than by relevance, so a less relevant short chunk displaces a more relevant long one." },
        { t: "p", text: "The reference uses `break` and that is the right default, because relevance order is the thing the whole pipeline worked to produce and 6.1 measured how much ranking matters. Packing efficiency is not worth reordering." },
        { t: "p", text: "The case for `continue` is when chunk sizes are wildly uneven \u2014 6.6 measured code definitions from 43 to 12,365 characters \u2014 where one oversized chunk can waste most of the budget by being skipped. Even then the better fix is a size cap at chunking time, not a packer that reorders." }
      ] },

    { t: "p", text: "The second scope the reference names is iteration count, and it matters because of what 5.10 and 5.11 introduced. Self-RAG, corrective RAG and agentic loops can retrieve repeatedly, so cost is unbounded unless something bounds it." },

    { t: "ul", items: [
      "**Cap retrieval rounds**, and when the cap is hit, answer with what you have and flag `low_confidence` \u2014 never loop silently",
      "**Two scopes, not one**: a per-query token budget *and* a per-tenant monthly quota enforced at the API boundary",
      "**Tier the models** \u2014 cheap first, escalate only when a groundedness check is low",
      "**Degrade visibly**: return a grounded best effort with an `insufficient_context` flag rather than a runaway bill"
    ] },

    { t: "h2", n: "03", id: "coordination", text: "Coordinating retrievers",
      sub: "Five problems, and fusion only solves the first" },

    { t: "p", text: "5.9 established RRF as the answer to incomparable scores, and 6.5 showed the same property rescuing cross-modal retrieval. That is genuinely solved. The reference lists four further problems that fusion does not touch." },

    { t: "dl", items: [
      { k: "Incomparable scores", v: "**Solved.** RRF uses rank position only, so BM25 and vector results combine cleanly \u2014 and deduplication is automatic because it is keyed by document id." },
      { k: "Source conflicts", v: "Two sources disagree on a fact. Fusion ranks them both highly and says nothing about which is true. Needs explicit authority and recency rules, which is a policy decision rather than a retrieval one." },
      { k: "Redundant retrieval", v: "Multiple retrievers re-fetch overlapping chunks, and agentic loops can re-retrieve indefinitely. Deduplication handles the overlap; only an iteration cap handles the loop." },
      { k: "Context contention", v: "N sources overflow the window, so you must dedupe, re-rank and compress \u2014 not append. The token budget above is the enforcement mechanism." },
      { k: "Routing", v: "Which retriever for which query. A misroute poisons the context, and 5.11 measured routing as strictly worse than pre-filtering when the predicate is exactly expressible." }
    ] },

    { t: "callout", kind: "warn", title: "Source conflict is the one with no technical fix",
      body: [
        { t: "p", text: "Everything else on that list is engineering. \u201cWhich of these two contradictory documents is right\u201d is not \u2014 the retriever has no notion of truth, and a cross-encoder scores relevance rather than correctness. A deprecated policy page and its replacement are both highly relevant to a question about the policy." },
        { t: "p", text: "So this is resolved with metadata you must have put there at ingestion: an authority rank per source, an effective date, a deprecation flag. 6.3\u2019s point again \u2014 the hard part of metadata filtering is populating it, and this is a case where nothing downstream can compensate for not having done so." },
        { t: "p", text: "And where conflicts are genuine rather than stale, surface both with citations rather than silently picking. 5.13\u2019s citations exist precisely so a reader can adjudicate what the system cannot." }
      ] },

    { t: "h2", n: "04", id: "guardrails", text: "The guardrail chain",
      sub: "Deterministic checks around a probabilistic component" },

    { t: "p", text: "The reference\u2019s formulation is the clearest statement of what RAG promises: the answer is grounded in retrieved context, safe, and drawn only from sources the user may see. Guardrails are what make that a guarantee rather than a tendency." },

    { t: "code", lang: "python", title: "the chain, in order", code: `def guarded_rag(query, retriever, llm, rel_threshold=0.35):
    if injection_detector(query):
        return block("input rejected")

    hits = retriever.search(query, top_k=5, user=current_user)   # ACL-filtered
    if not hits or hits[0].score < rel_threshold:                # relevance gate
        return "I don't have enough information to answer that."

    context = "\n\n".join(f"[doc {h.id}] {h.text}" for h in hits)  # delimited = untrusted
    answer = llm.generate(grounded_prompt(query, context))

    if not is_faithful(answer, context):     # output groundedness guardrail
        log_for_review(query, answer); return "I couldn't find a grounded answer."
    return redact_pii(answer)`,
      hl: [5, 6, 9, 13],
      caption: "Order matters: ACL before retrieval, relevance before generation, faithfulness before returning." },

    { t: "callout", kind: "warn", title: "Prompt injection via retrieved documents is the RAG-specific risk",
      body: [
        { t: "p", text: "A retrieved chunk can contain \u201cignore previous instructions\u201d, and the system put it in the prompt itself. Unlike a user-supplied injection, nothing in the request looks suspicious \u2014 the attack arrives through the corpus, which is the one input the pipeline trusts by construction." },
        { t: "p", text: "The mitigations are structural. Delimit retrieved content explicitly, as `[doc N] ...` does, and instruct the model that delimited content is data to be reported on rather than instructions to follow. Then assume that is imperfect and remove the capability: 6.4 argued for a read-only database role precisely so an injection has nothing to escalate to." },
        { t: "p", text: "It also raises the stakes on who can write to the corpus. In a system where users contribute documents, the ingestion path is an attack surface on every other user\u2019s queries \u2014 which makes the ACL filter at retrieval a containment boundary as well as a privacy one." }
      ] },

    { t: "callout", kind: "insight", title: "ACL filtering must be a pre-filter, and that is settled",
      body: [
        { t: "p", text: "6.8 measured the two orderings on a simulated two-tenant corpus: both reached 95% recall@5, and post-filtering put **19 other-tenant chunks** into the top 5 before discarding them." },
        { t: "p", text: "Nineteen rows that were read, scored and plausibly logged. The recall equivalence is what makes this unambiguous \u2014 there is no performance argument for post-filtering, so the only thing it buys is exposure." },
        { t: "p", text: "Which is why it belongs inside `retriever.search(..., user=current_user)` rather than in a filter applied to its results. The signature is the guardrail." }
      ] },

    { t: "h2", n: "05", id: "gate", text: "Calibrating the relevance gate",
      sub: "Where the reference's one magic number does not survive contact" },

    { t: "p", text: "The chain contains a single tunable constant, `rel_threshold=0.35`, carrying a lot of weight: below it the system refuses to answer. 5.7 identified the no-context case as where hallucination lives, so this is the guardrail that governs it. It is testable, so I tested it." },

    { t: "code", lang: "python", title: "g67.py \u2014 20 answerable and 10 deliberately unanswerable queries", code: `UNANSWERABLE = [            # same register and domain, genuinely not in the corpus
    "What is the capital of Portugal?",
    "How many employees does our Dublin office have?",
    "What is the refund policy for enterprise contracts?",
    "What is my current account balance?",
    "How do I reset my VPN password?",
    # ... 5 more
]
SA = (QA @ E.T).max(axis=1)   # top-1 similarity, answerable
SU = (QU @ E.T).max(axis=1)   # top-1 similarity, unanswerable`,
      caption: "Deliberately in the same register as real queries \u2014 an unanswerable question that reads like nonsense tests nothing." },

    { t: "code", lang: "python", title: "g67.py \u00a7A \u2014 the two distributions", code: `SA, SU = (QA @ E.T).max(axis=1), (QU @ E.T).max(axis=1)`,
      out: `  population            n      min     mean      max      p10
  answerable           20   0.3589   0.5698   0.7814   0.4529
  UNanswerable         10   0.2575   0.3388   0.5174   0.2623

  the reference's threshold: 0.35
  answerable queries BELOW 0.35 (would be wrongly refused): 0 of 20
  unanswerable queries ABOVE 0.35 (would be wrongly answered): 4 of 10`,
      hl: [5, 6],
      caption: "The means are well separated \u2014 0.5698 against 0.3388 \u2014 and the ranges are not." },

    { t: "code", lang: "python", title: "g67.py \u00a7B \u2014 the threshold sweep", code: `for t in (0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55):
    keep = (SA >= t).sum(); leak = (SU >= t).sum()`,
      out: `  threshold  answerable kept unanswerable let in   accuracy
  0.20               20/20            10/10         67%
  0.25               20/20            10/10         67%
  0.30               20/20             6/10         80%
  0.35               20/20             4/10         87%
  0.40               18/20             1/10         90%
  0.45               18/20             1/10         90%
  0.50               15/20             1/10         80%
  0.55               12/20             0/10         73%

  best threshold on this data: 0.40 at 90% accuracy

  overlap region: 0.3589 to 0.5174
  answerable queries inside it   : 7
  unanswerable queries inside it : 4`,
      hl: [5, 6, 12, 13, 14],
      caption: "At the reference's 0.35, four of ten unanswerable queries pass. And the populations overlap across a wide band." },

    { t: "callout", kind: "trap", title: "No threshold separates the two populations",
      body: [
        { t: "p", text: "That is the finding, and it is stronger than \u201c0.35 is a bit low\u201d. The overlap region runs from **0.3589 to 0.5174** and contains 7 of 20 answerable queries and 4 of 10 unanswerable ones. Any threshold inside it misclassifies members of both populations, and the best available accuracy is 90% \u2014 which still refuses 2 answerable queries and admits 1 unanswerable one." },
        { t: "p", text: "Raising the threshold to eliminate false answers costs real queries fast: 0.55 finally blocks all ten unanswerable queries and refuses **8 of 20 answerable** ones. That is not a usable operating point, and the curve between is a straight trade rather than a sweet spot." },
        { t: "p", text: "So the relevance gate is a useful filter and not a correctness boundary. It cheaply removes the clearly-irrelevant tail \u2014 at 0.35 it still blocks 6 of 10 \u2014 and it cannot be tuned into a decision about whether the corpus can answer a question." }
      ] },

    { t: "code", lang: "python", title: "g67.py \u00a7C \u2014 the unanswerable queries that scored highest", code: `order = np.argsort(-SU)
for i in order[:5]:
    j = int((QU[i] @ E.T).argmax())`,
      out: `  0.5174  What is the refund policy for enterprise con
          -> 20_LLM_Hallucination_and_Fai :: Real Production Scenarios
             Scenario 1: The Invented Policy \`\`\` Customer
  0.3768  Which vendor did we sign the data processing
          -> 01_LLM_Parameters.md ::  Gemini Flash / GPT-4o-mini  Lowest latency
  0.3693  What is my current account balance?
          -> 02_LLM_Inference_Optimizatio :: 3.1 70B | $0.50 | $0.70`,
      hl: [2, 3],
      caption: "Read the top match. The query about a refund policy retrieved a document about inventing a refund policy." },

    { t: "callout", kind: "insight", title: "The retriever was not wrong, and that is the whole point",
      body: [
        { t: "p", text: "\u201cWhat is the refund policy for enterprise contracts?\u201d scored **0.5174** \u2014 above 7 of my 20 genuinely answerable queries \u2014 against a chunk from the hallucination document headed \u201cScenario 1: The Invented Policy\u201d. The chunk really is about refund policies. The similarity is correct." },
        { t: "p", text: "What the score cannot encode is that the document *discusses* refund policies as an example of a model inventing one, rather than *stating* this organisation\u2019s policy. Relevance and answerability are different properties, and cosine measures the first." },
        { t: "p", text: "Which is also exactly the failure mode that document was written about. A system gated at 0.35 would pass this query through with a highly-ranked chunk about invented policies and ask a model to answer from it \u2014 and 5.7 measured that as the condition under which models fill gaps themselves." }
      ] },

    { t: "callout", kind: "good", title: "So the gate is a cheap first stage, and the faithfulness check is the real boundary",
      body: [
        { t: "p", text: "This is why the reference\u2019s chain has a guardrail *after* generation as well as before. The relevance gate cannot determine answerability, but a faithfulness check can ask a different and more tractable question: is every claim in this answer supported by the retrieved text?" },
        { t: "p", text: "On the refund-policy query that check should fail, because no retrieved chunk states a policy \u2014 so the answer either hedges or asserts something unsupported, and the second is detectable. That is 6.1\u2019s faithfulness metric used as an online gate rather than an offline score." },
        { t: "p", text: "It is also why \u201cblock and escalate, and log every block\u201d is the right operational posture. Each block is a labelled example, and a corpus of them is precisely the data needed to calibrate the threshold against your own query distribution rather than against a default." }
      ] },

    { t: "viz", title: "The relevance gate cannot separate the populations", caption: "Overlap from 0.3589 to 0.5174, holding queries of both kinds. Any threshold inside it is a trade.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Answerable and unanswerable top-1 similarity distributions overlap">
  <text x="16" y="22" class="s-label">TOP-1 SIMILARITY, 20 ANSWERABLE vs 10 UNANSWERABLE QUERIES</text>
  <line x1="60" y1="210" x2="710" y2="210" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60"  y="230" text-anchor="middle" class="s-mono" style="font-size:10px">0.20</text>
  <text x="222" y="230" text-anchor="middle" class="s-mono" style="font-size:10px">0.35</text>
  <text x="385" y="230" text-anchor="middle" class="s-mono" style="font-size:10px">0.50</text>
  <text x="547" y="230" text-anchor="middle" class="s-mono" style="font-size:10px">0.65</text>
  <text x="710" y="230" text-anchor="middle" class="s-mono" style="font-size:10px">0.80</text>

  <rect x="229" y="130" width="330" height="26" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="16" y="148" class="s-sub">answerable</text>
  <text x="394" y="147" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">0.359 \u2013 0.781</text>

  <rect x="120" y="76" width="340" height="26" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="16" y="94" class="s-sub">unanswerable</text>
  <text x="290" y="93" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">0.258 \u2013 0.517</text>

  <rect x="229" y="66" width="231" height="100" rx="3" fill="none" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="344" y="60" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">OVERLAP \u2014 7 answerable, 4 unanswerable</text>

  <line x1="222" y1="176" x2="222" y2="210" stroke="var(--crit)" stroke-width="1.6"/>
  <text x="222" y="192" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.35</text>
  <text x="222" y="204" text-anchor="middle" class="s-sub" style="font-size:9px">4/10 leak</text>
  <line x1="276" y1="176" x2="276" y2="210" stroke="var(--good)" stroke-width="1.6"/>
  <text x="290" y="192" class="s-mono" style="font-size:9px;fill:var(--good)">0.40 \u2014 best, 90%</text>
  <text x="290" y="204" class="s-sub" style="font-size:9px">still refuses 2 real queries</text>

  <text x="16" y="266" class="s-mono" style="fill:var(--crit)">the highest unanswerable scorer, 0.5174: "refund policy for enterprise contracts"</text>
  <text x="16" y="282" class="s-sub">which matched a chunk headed "Scenario 1: The Invented Policy" \u2014 relevant, and not an answer</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Calibrate your own relevance gate", difficulty: "core", minutes: 35,
      body: "Build a set of questions your corpus genuinely cannot answer — in the same register as real user queries — alongside your existing answerable golden set. Compute the top-1 retrieval score for both populations, sweep the threshold, and report the accuracy curve and the overlap region. Then decide your operating point and what handles the queries the gate cannot classify.",
      requirements: [
        "Write unanswerable questions in the same register as real ones \u2014 nonsense tests nothing",
        "Report min, mean and max top-1 score for both populations",
        "Sweep the threshold and report answerable-kept and unanswerable-admitted at each point",
        "Identify the overlap region and how many queries of each kind fall inside it",
        "Inspect the highest-scoring unanswerable queries and say why they scored high",
        "State your operating point and the downstream check that covers the residual"
      ],
      hint: "Look at the top-scoring unanswerable queries individually. If the retriever found genuinely on-topic text that simply does not answer the question, no threshold will fix that case.",
      solution: { lang: "python", title: "the sweep", code: `SA = (QA @ E.T).max(axis=1)        # answerable, top-1 similarity
SU = (QU @ E.T).max(axis=1)        # unanswerable, top-1 similarity

for t in (0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55):
    keep, leak = int((SA >= t).sum()), int((SU >= t).sum())
    acc = (keep + (len(SU) - leak)) / (len(SA) + len(SU))
    print("%-6.2f kept %2d/%-2d  admitted %2d/%-2d  acc %.0f%%"
          % (t, keep, len(SA), leak, len(SU), 100 * acc))

lo, hi = max(SA.min(), SU.min()), min(SA.max(), SU.max())
print("overlap %.4f-%.4f : %d answerable, %d unanswerable inside"
      % (lo, hi, ((SA >= lo) & (SA <= hi)).sum(), ((SU >= lo) & (SU <= hi)).sum()))

for i in np.argsort(-SU)[:5]:      # WHY did these score high?
    j = int((QU[i] @ E.T).argmax())
    print("%.4f  %-44s -> %s" % (SU[i], UNANSWERABLE[i][:42], meta[j]))`,
        out: `  0.20   kept 20/20  admitted 10/10  acc 67%
  0.30   kept 20/20  admitted  6/10  acc 80%
  0.35   kept 20/20  admitted  4/10  acc 87%
  0.40   kept 18/20  admitted  1/10  acc 90%
  0.50   kept 15/20  admitted  1/10  acc 80%
  0.55   kept 12/20  admitted  0/10  acc 73%

  overlap 0.3589-0.5174 : 7 answerable, 4 unanswerable inside`,
        notes: [
          { t: "p", text: "**The overlap line is the result, not the accuracy column.** A 90% best accuracy sounds tunable; an overlap band containing 7 answerable and 4 unanswerable queries says the two populations are not separable by this statistic at all. Reporting only the best threshold would hide that." },
          { t: "p", text: "**The trade is monotone, with no sweet spot.** Going from 0.35 to 0.55 blocks the remaining four unanswerable queries and costs 8 of 20 answerable ones. There is no setting that is simply better \u2014 only settings that move the error from one population to the other." },
          { t: "p", text: "**The last loop matters more than the sweep.** My top false positive scored 0.5174 \u2014 above 7 genuinely answerable queries \u2014 because a question about refund policies matched a chunk headed \u201cScenario 1: The Invented Policy\u201d. The retrieval was correct; the chunk discusses such policies without stating one. Relevance is not answerability, and cosine only measures the first." },
          { t: "p", text: "**So set the gate low and rely on the faithfulness check.** 0.35 to 0.40 removes the clearly-irrelevant tail cheaply, and the post-generation check asks the tractable question instead: is every claim supported by retrieved text? On the refund query that should fail, because nothing retrieved states a policy." },
          { t: "p", text: "One limit on my own numbers: 20 answerable and 10 unanswerable queries is a small sample, so the exact boundaries move with more data. The overlap itself will not disappear \u2014 it is caused by on-topic-but-unanswering text, which any real corpus contains \u2014 but treat 0.3589 and 0.5174 as this corpus's figures rather than as constants." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Scale the stage that is actually expensive, which measurement says is the optional model calls rather than the index. Cap cost by arithmetic \u2014 a token budget and an iteration limit \u2014 because anything unbounded in a loop is a bill. And degrade visibly: a flagged best-effort answer beats a runaway, and a 429 beats a collapse." },
        { t: "p", text: "On guardrails, the ordering is the design: ACL inside the search call, relevance before generation, faithfulness before returning. And treat the gate as a cheap filter rather than a boundary, because relevance and answerability are different properties and only the first is a cosine." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat guardrails did you put around your RAG system, and how did you set the thresholds?\u201d**" },
        { t: "p", text: "As a chain in a specific order: injection check on the query, ACL-filtered retrieval, a relevance gate, grounded generation, a faithfulness check, then citation enforcement and PII redaction. Anything ungrounded was blocked and escalated rather than returned, and every block logged." },
        { t: "p", text: "The ACL filter has to be a pre-filter and that one is settled by measurement. I compared both orderings on a two-tenant split: identical 95% recall@5, and post-filtering put 19 other-tenant chunks into the top 5 before discarding them. Equal recall means there is no performance argument for post-filtering, so the only thing it buys is exposure." },
        { t: "p", text: "The relevance threshold is where I would push back on the usual default. I tested 0.35 against 20 answerable and 10 deliberately unanswerable questions in the same register: it let 4 of the 10 through. And no threshold separates them \u2014 the populations overlap from 0.359 to 0.517, with 7 answerable and 4 unanswerable queries inside that band. Best achievable was 90%, still refusing 2 real queries." },
        { t: "p", text: "Looking at the worst false positive explained why. \u201cWhat is the refund policy for enterprise contracts?\u201d scored 0.5174 \u2014 higher than 7 genuinely answerable queries \u2014 because it matched a chunk headed \u201cScenario 1: The Invented Policy\u201d. The retriever was right; the text is about refund policies. It just does not state one. Relevance and answerability are different properties and cosine measures relevance." },
        { t: "p", text: "So I set the gate low, around 0.35 to 0.40, to strip the clearly-irrelevant tail cheaply, and put the real boundary after generation: a faithfulness check asking whether every claim is supported by retrieved text. That question is tractable where answerability is not." },
        { t: "p", text: "And the RAG-specific risk I would call out unprompted is injection through retrieved documents. A chunk can say \u201cignore previous instructions\u201d and the system put it in the prompt itself, so nothing in the request looks suspicious. Delimiting retrieved content as untrusted data helps; removing the capability helps more, which is why anything generating queries runs with a read-only role." }
      ] }
  ],

  takeaways: [
    "**Scale the bottleneck, and measurement says it is the optional model calls** \u2014 search is 11 ms, the cross-encoder was 2,405 ms on CPU.",
    "**\u201cSkip reranking under load\u201d is cheap because re-ranking's gain is modest on a strong first stage** \u2014 nDCG +0.11 but MRR only +0.03 on dense, and Hit@5 \u22120.10 on RRF.",
    "**Separate the ingestion path from the query path** so re-indexing can affect neither latency nor content \u2014 the precondition for commit-hook indexing in 6.6.",
    "**A token budget is a hard cap enforced by arithmetic**, and `break` rather than `continue` preserves the relevance order the pipeline worked to produce.",
    "**Check which limit you are actually hitting**: my 8,000-token run used 4,114 because the candidate list ran out \u2014 `top_k` was binding, not the budget.",
    "**Cap iterations as well as tokens**, because Self-RAG and agentic loops are unbounded by default; a hit cap should answer with a `low_confidence` flag, never loop silently.",
    "**RRF solves incomparable scores and nothing else** \u2014 source conflicts, redundancy, context contention and routing all remain.",
    "**Source conflict has no technical fix** \u2014 a cross-encoder scores relevance, not truth, so it needs authority rank, effective dates and deprecation flags set at ingestion.",
    "**Injection via retrieved documents is the RAG-specific attack**: the corpus is the one input the pipeline trusts, so delimit retrieved text and remove capability with a read-only role.",
    "**At the reference's 0.35 relevance threshold, 4 of 10 unanswerable queries passed** \u2014 and no threshold separates the populations, which overlap 0.3589 to 0.5174.",
    "**Relevance is not answerability.** The top false positive scored 0.5174 by matching a chunk headed \u201cScenario 1: The Invented Policy\u201d \u2014 correctly relevant, and not an answer.",
    "**So set the gate low and make the faithfulness check the real boundary**, since \u201cis every claim supported by retrieved text\u201d is tractable where answerability is not."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Tested against 20 answerable and 10 unanswerable queries, a 0.35 relevance threshold admitted 4 of the 10 unanswerable ones, and the populations overlapped from 0.3589 to 0.5174. What is the right response?",
        options: [
          "Raise the threshold to 0.55, which blocked all ten unanswerable queries",
          "Keep the gate low to strip the clearly-irrelevant tail, and make the post-generation faithfulness check the real boundary",
          "Replace cosine similarity with a cross-encoder score, which separates the populations",
          "Increase top_k so more chunks are available to clear the threshold"
        ],
        answer: 1,
        why: "No threshold separates the populations \u2014 the overlap band holds 7 answerable and 4 unanswerable queries, so every setting inside it misclassifies both. Raising to 0.55 does block all ten but refuses 8 of 20 genuine queries, which is not a usable operating point. The gate is a cheap filter; the tractable question is asked after generation, namely whether every claim is supported by retrieved text." },

      { stem: "An unanswerable query, \"What is the refund policy for enterprise contracts?\", scored 0.5174 \u2014 higher than 7 genuinely answerable queries \u2014 by matching a chunk headed \"Scenario 1: The Invented Policy\". What does this show?",
        options: [
          "The embedding model is poorly calibrated for policy-related language",
          "Relevance and answerability are different properties, and cosine measures only the first \u2014 the chunk genuinely discusses refund policies without stating one",
          "The chunk should have been excluded from the index as a meta-document",
          "The query needed rewriting before retrieval to disambiguate it"
        ],
        answer: 1,
        why: "The retrieval was correct: the text really is about refund policies. What a similarity score cannot encode is the difference between discussing a kind of thing and stating this organisation's instance of it. That is why the case is unfixable by threshold tuning and why a post-generation groundedness check is needed \u2014 no retrieved chunk states a policy, so an answer asserting one is unsupported and detectable. It is also precisely the failure the matched document was written about." },

      { stem: "Why is \"skip reranking under load\" a cheap form of load shedding rather than a serious degradation?",
        options: [
          "Because the cross-encoder results are cached, so skipping it rarely changes the output",
          "On a strong first stage the re-ranker's measured gain is modest and ambiguous \u2014 nDCG +0.11 but MRR only +0.03, and Hit@5 actually fell 0.10 on an RRF first stage \u2014 while costing about 75% of the request",
          "Because recall is unaffected by reranking, which only reorders results",
          "Because under load the queries are simpler and need less precise ranking"
        ],
        answer: 1,
        why: "Re-ranking was measured at 2,405 ms for 20 candidates on CPU against 11 ms for the search, so it dominates the request, while its benefit on an already-strong first stage was small and mixed in sign. Dropping it degrades to a slightly differently ordered result set rather than a broken one. Shortlist depth is the continuous version of the same dial \u2014 524 ms at depth 5 against 3,961 ms at depth 50, with recall flat from 20 to 50 \u2014 so a large cut is usually available before the binary choice." },

      { stem: "A context packer with an 8,000-token budget used only 4,114 tokens. What is the most likely explanation?",
        options: [
          "The packer broke early on a chunk that did not fit, leaving the budget unspent",
          "The candidate list was exhausted \u2014 top_k was the binding constraint, not the budget",
          "Token counting was approximate and undercounted the assembled context",
          "Deduplication removed chunks after the budget was computed"
        ],
        answer: 1,
        why: "A budget is an upper bound, so under-use means the retriever ran out of candidates first \u2014 in this case a 40-chunk list against a budget that could hold far more. The consequence is practical: raising the context budget to buy quality changes nothing if the retriever still returns five chunks, so you should establish which limit is binding before tuning either. Breaking early on an oversized chunk is possible in principle, but it would leave a gap rather than halve the usage." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The four operational questions, with numbers behind them",
    questions: [
      { level: "core",
        q: "Your RAG system is getting heavy traffic. How do you scale it?",
        strong: "A strong answer scales the measured bottleneck and shows what load-shedding costs.",
        answer: [
          { t: "p", text: "By timing the stages separately first, because a RAG query is a pipeline and the stage people reach for is usually the smallest. On my own measurements vector search was 11 ms and the cross-encoder over twenty candidates was 2,405 ms on CPU \u2014 so retrieval is about 1% of the request and the optional model calls are the rest." },
          { t: "p", text: "So: cache first, since the cheapest request never runs. Then the re-ranker decision \u2014 shortlist depth is a linear dial, 524 ms at depth 5 against 3,961 ms at depth 50 with recall flat from 20 to 50, so there is usually a large free cut. Then the generator: route simple queries to a smaller model, stream, and compress context." },
          { t: "p", text: "Skipping the re-ranker entirely is a legitimate shed, and I can say what it costs: on a strong first stage its gain was nDCG plus 0.11 but MRR only plus 0.03, and on an RRF first stage it actually lowered Hit@5 by 0.10. So it degrades to a differently ordered result set, not a broken one." },
          { t: "p", text: "Two structural things alongside. Separate the ingestion path from the query path so re-indexing never blocks reads. And rate-limit per tenant with backpressure, so a spike returns 429s and degrades cleanly instead of collapsing \u2014 and tune the vector index for memory rather than latency, since memory binds an order of magnitude earlier." }
        ] },

      { level: "core",
        q: "What happens when the token or cost budget is exceeded?",
        strong: "A strong answer caps by arithmetic in two scopes and degrades visibly.",
        answer: [
          { t: "p", text: "It should never be exceeded, because the dominant cost is generation and generation cost scales with assembled context \u2014 which is something you control exactly. Pack chunks by relevance until a token budget is spent and then stop, which is a hard cap rather than an estimate." },
          { t: "p", text: "I would use `break` rather than skipping oversized chunks, because relevance order is what the whole pipeline worked to produce and packing efficiency is not worth reordering it. And I would check which limit actually binds \u2014 in one of my own runs an 8,000-token budget used 4,114 because the candidate list ran out, so `top_k` was the constraint and raising the budget would have changed nothing." },
          { t: "p", text: "Then cap iterations too, which is the part people miss. Self-RAG, corrective RAG and agentic loops retrieve repeatedly, so cost is unbounded by default. On hitting the cap, answer with what you have and flag it low-confidence \u2014 never loop silently." },
          { t: "p", text: "Two scopes: a per-query token budget and a per-tenant monthly quota enforced at the API boundary with a 429. And degrade visibly \u2014 a best-effort grounded answer with an `insufficient_context` flag, or an honest \u201cI don't have enough information\u201d, rather than a runaway bill." }
        ] },

      { level: "advanced",
        q: "What are the challenges in coordinating multiple retrievers?",
        strong: "A strong answer notes that fusion solves one of five problems.",
        answer: [
          { t: "p", text: "Incomparable scores is the solved one. BM25 and vector scores are not on a shared scale, and RRF fixes it by using rank position only \u2014 nine lines, and deduplication comes free because it is keyed by document id. The same property made it the right tool for cross-modal retrieval, where I measured text-text and text-image cosines in completely non-overlapping ranges." },
          { t: "p", text: "The four it does not solve matter more. Redundant retrieval across retrievers and unbounded re-retrieval in agentic loops \u2014 dedup handles the first, only an iteration cap handles the second. Context contention, where merging N sources overflows the window, which the token budget enforces. And routing, where a misroute poisons the context entirely." },
          { t: "p", text: "Source conflict is the one with no technical fix. The retriever has no notion of truth and a cross-encoder scores relevance rather than correctness, so a deprecated policy page and its replacement are both highly relevant. That needs authority ranks, effective dates and deprecation flags set at ingestion \u2014 and nothing downstream compensates for not having them." },
          { t: "p", text: "Where a conflict is genuine rather than stale, I would surface both with citations rather than silently pick. Citations exist so a reader can adjudicate what the system cannot." }
        ] },

      { level: "advanced",
        q: "How would you defend a RAG system against prompt injection?",
        strong: "A strong answer identifies the corpus as the attack surface.",
        answer: [
          { t: "p", text: "The RAG-specific case is injection through retrieved documents rather than through the query. A chunk can contain \u201cignore previous instructions\u201d, and the system put it into the prompt itself \u2014 so nothing in the request looks suspicious, and the corpus is the one input the pipeline trusts by construction." },
          { t: "p", text: "Structurally: delimit retrieved content explicitly, something like `[doc N] ...`, and instruct the model that delimited content is data to report on rather than instructions to follow. Then assume that is imperfect, because it is." },
          { t: "p", text: "So remove the capability rather than relying on the instruction. If anything in the pipeline generates queries against a database \u2014 text-to-SQL, or Cypher for a graph \u2014 it runs under a read-only role, so an injection has nothing to escalate to. Caps on traversal depth and result size for the same reason." },
          { t: "p", text: "And I would look hard at who can write to the corpus. In a system where users contribute documents, the ingestion path is an attack surface on every other user's queries \u2014 which makes the ACL pre-filter at retrieval a containment boundary as well as a privacy one. I measured post-filtering putting 19 other-tenant chunks into the top 5 before discarding them, at identical recall, so there is no reason to accept that exposure." }
        ] }
    ]
  }
});
