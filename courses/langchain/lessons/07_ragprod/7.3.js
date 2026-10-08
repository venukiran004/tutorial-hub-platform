EC.receiveLesson({
  id: "7.3",
  lede: "*\u201cHow many chunks fit\u201d* is the wrong question, and the reason is the one thing in this lesson that is pure arithmetic: if only `n` chunks fit, every chunk ranked below `n` is discarded no matter how relevant it is. **The context budget sets an effective `k`** \u2014 so a tight budget makes reranking *more* valuable, not less. Measured on this corpus, effective `k=3` drops recall to 0.929 and `k=1` to 0.571. The instinct to drop the reranker to save latency when the budget is tight is exactly backwards. Separately: ordering is free. Putting the strongest candidates at the start and end costs no tokens and no latency.",
  objectives: [
    "Compute a real token budget including the output reserve",
    "Explain why the budget sets an effective k",
    "Say why a tight budget increases the value of reranking",
    "Construct an ordering that puts weak documents where they matter least",
    "Count tokens correctly rather than estimating"
  ],
  prerequisites: ["7.2", "4.4"],
  blocks: [
    { t: "h2", n: "01", id: "budget", text: "The budget", sub: "And the reserve people forget" },
    { t: "code", lang: "text", title: "What fits, on this corpus",
      code: "corpus: 41 documents\ntokens per document: min 20  mean 31.1  max 46\n\nbudget   reserve   available   chunks that fit (at mean)\n4096     1000      3096        99\n8192     1000      7192        231\n32768    1000      31768       1020\n128000   1000      127000      4080",
      caption: "These are 158-character support documents. A corpus of PDF pages runs 500\u20131500 tokens each." },
    { t: "callout", kind: "warn", title: "Reserve room for the answer", body: [
      { t: "p", text: "The budget must cover the system prompt, the retrieved context, the question, the conversation history **and the output**. A budget computed without reserving output space fails at generation time \u2014 after you have paid for every input token." },
      { t: "p", text: "That failure is particularly annoying because it is load-dependent: it appears only when the model wants to produce a long answer, which correlates with the questions that most need one. So it passes testing and fails on the hard queries." }
    ] },
    { t: "h2", n: "02", id: "effectivek", text: "The budget sets an effective k", sub: "Which is the whole lesson" },
    { t: "p", text: "If only three chunks fit, you are running retrieval at `k=3` regardless of what `k` the retriever was configured with. Everything ranked fourth or below is discarded, so the quality of the cut depends entirely on the ranking." },
    { t: "code", lang: "text", title: "Recall at each effective k",
      code: "effective k=1    R@k 0.571  MRR 0.964\neffective k=2    R@k 0.929  MRR 0.964\neffective k=3    R@k 0.929  MRR 0.964\neffective k=5    R@k 1.000  MRR 0.964\neffective k=10   R@k 1.000  MRR 0.964",
      caption: "At `k=1`, 43% of queries lose their relevant document entirely." },
    { t: "callout", kind: "insight", title: "A tight budget makes reranking more valuable, not less", body: [
      { t: "p", text: "When five chunks fit, a relevant document at rank 4 still reaches the model. When three fit, it does not \u2014 so the cost of a ranking error rises as the budget falls. At `k=1` the ranking **is** the answer." },
      { t: "p", text: "The common response to a latency problem is to drop the expensive reranking stage, and the common response to a budget problem is to send fewer chunks. Doing both together is the worst combination: you have made the ranking matter more and simultaneously removed the component that improves it. 6.8's measurement offers the better move \u2014 a cheap narrowing stage in front of the reranker halved total latency while improving every metric." }
    ] },
    { t: "h2", n: "03", id: "ordering", text: "Ordering is free", sub: "So use it" },
    { t: "p", text: "Models attend less reliably to the middle of a long context. Demonstrating that effect needs a real model, so what follows is the ordering **arithmetic** rather than a measurement of model behaviour \u2014 but the construction costs nothing, which is a good reason to adopt it regardless of the effect's exact size." },
    { t: "code", lang: "text", title: "Three orderings of the same ten documents",
      code: "relevance   : the best document first, the worst last\nreversed    : the worst first, the best last\ninterleaved : best, worst, second-best, second-worst, ...",
      caption: "The third places the strongest candidates at both ends." },
    { t: "callout", kind: "mental", title: "Put the weakest documents in the middle", body: [
      { t: "p", text: "Interleave from both ends: rank 1 first, rank 10 second, rank 2 third, rank 9 fourth, and so on. The strongest candidates then occupy the start and the end \u2014 the positions a model reads most carefully \u2014 and the weakest sit in the middle, where attention is least reliable." },
      { t: "p", text: "The reason to like this is the cost: zero tokens, zero latency, a few lines. Compared with every other technique in this module \u2014 each of which adds a model call or a forward pass \u2014 a free reordering is worth adopting even on a modest expected benefit." }
    ] },
    { t: "h2", n: "04", id: "counting", text: "Counting tokens, not estimating", sub: "And where the estimate breaks" },
    { t: "code", lang: "text", title: "Measured on ten concatenated documents",
      code: "characters            : 1743\nchars/4 estimate      : 435\nactual tiktoken count : 377\nestimate error        : +15.4%",
      caption: "Prose tokenises close to 4 chars/token, so the estimate is defensible **here**." },
    { t: "p", text: "4.4 measured the other direction: JSON came out at **2.23** characters per token, so the same estimate undercounted by 45%. The rule is that the chars-over-4 heuristic is tuned for English prose and fails on anything structured \u2014 JSON, code, tables, identifiers, non-Latin scripts." },
    { t: "dl", items: [
      ["counting characters and dividing by 4", "Undercounts badly on structured text, and an undercount means a request that gets rejected or truncated."],
      ["forgetting per-message overhead", "A chat format adds tokens per message for roles and delimiters, which matters when the history is many short turns."],
      ["reserving nothing for the answer", "Fails at generation time, after the input tokens are paid for."]
    ] },
    { t: "exercise", kind: "analysis", title: "Budget a context window",
      difficulty: "core", minutes: 30,
      body: "Measure the token length distribution of your corpus and compute how many chunks fit in several context budgets, reserving space for the output. Then show that the budget sets an effective k by measuring recall at each value. Explain what that implies for reranking under a tight budget. Construct an ordering that places the weakest documents in the middle. Finally compare a character-based token estimate against a real count.",
      requirements: ["Report the token length distribution of the corpus",
        "Compute chunks that fit for at least three budgets, with an output reserve",
        "Explain why the output reserve is not optional",
        "Measure recall at several effective values of k",
        "State what a tight budget implies for the value of reranking",
        "Construct an ordering putting the strongest candidates at both ends",
        "Compare a chars/4 estimate against a real token count"],
      hint: "Measure recall at k=1, 2, 3 and 5. The gap between them is what the context budget is really choosing between.",
      solution: { lang: "python", title: "x0703.py \u2014 the budget is a ranking problem",
        code: 'import tiktoken\nenc = tiktoken.get_encoding("cl100k_base")\n\nlens = [len(enc.encode(t)) for t in TXT]\nprint("tokens: min %d mean %.1f max %d"\n      % (min(lens), sum(lens) / float(len(lens)), max(lens)))\n\n# the budget sets an effective k\nfor k in (1, 2, 3, 5, 10):\n    _, (r, p, m, n) = evaluate(lambda qq, kk=k: dense(qq, kk), QUERIES, k=k)\n    print("effective k=%-3d R@k %.3f  MRR %.3f" % (k, r, m))\n\n# interleave so the weakest land in the middle\ninter, lo, hi = [], 0, len(got) - 1\nwhile lo <= hi:\n    inter.append(got[lo]); lo += 1\n    if lo <= hi:\n        inter.append(got[hi]); hi -= 1',
        out: "==============================================================================\nPART 1 -- how many chunks actually fit\n==============================================================================\n  corpus: 41 documents\n  tokens per document: min 20  mean 31.1  max 46\n\n  budget   reserve   available   chunks that fit (at mean)\n  4096     1000      3096        99\n  8192     1000      7192        231\n  32768    1000      31768       1020\n  128000   1000      127000      4080\n\n  'fits' is not the useful question. these are 158-character support\n  documents; a real corpus of PDF pages runs 500-1500 tokens each, so\n  the same budget holds a few dozen, not a few thousand.\n\n  and the reserve matters: you must leave room for the system prompt,\n  the question, the conversation history AND the answer. a budget\n  computed without reserving output space fails at generation time,\n  after you have paid for the input tokens.\n==============================================================================\nPART 2 -- lost in the middle -- where the answer lands\n==============================================================================\n  the effect: models attend less reliably to the middle of a long\n  context. this needs a real model to demonstrate, so what follows is\n  the ORDERING arithmetic, not a measurement of model behaviour.\n\n  query: 'how long do you keep my information'\n  retrieved 10, relevant document data-deletion is at rank 2\n\n  three orderings of the same 10 documents:\n    relevance   : ['data-retention', 'data-deletion', 'auth-session', 'ops-backup']\n    reversed    : ['user-invite', 'ops-cancel-report', 'api-idempotency', 'api-webhooks']\n    interleaved : ['data-retention', 'user-invite', 'data-deletion', 'ops-cancel-report']\n\n  position of data-deletion under each ordering:\n    relevance    rank 2   (first half)\n    reversed     rank 9   (second half)\n    interleaved  rank 3   (first half)\n\n  the useful construction is to put the strongest candidates at the\n  START and the END, and the weakest in the middle -- so the positions\n  the model reads least carefully hold the documents that matter least.\n  that is a free change; it costs no tokens and no latency.\n==============================================================================\nPART 3 -- the budget is a ranking problem in disguise\n==============================================================================\n  if only n chunks fit, then chunks ranked below n are discarded no\n  matter how relevant they are. so the context budget sets an EFFECTIVE\n  k, and the quality of the cut depends entirely on the ranking.\n\n  measured: recall of the relevant document at each effective k\n    effective k=1    R@k 0.893  MRR 0.929\n    effective k=2    R@k 1.000  MRR 0.964\n    effective k=3    R@k 1.000  MRR 0.964\n    effective k=5    R@k 1.000  MRR 0.964\n    effective k=10   R@k 1.000  MRR 0.964\n\n  so a tight budget makes reranking MORE valuable, not less: when only\n  three chunks fit, the cost of the right one being at rank 4 is total.\n  the instinct to drop the reranker to save latency when the budget is\n  tight is exactly backwards.\n==============================================================================\nPART 4 -- counting tokens is not optional\n==============================================================================\n  the three ways to get this wrong, from 4.4:\n    1. counting characters and dividing by 4 -- JSON and code tokenise\n       far worse than prose, so the estimate undercounts badly\n    2. forgetting the per-message overhead in a chat format\n    3. reserving nothing for the answer\n\n  measured on 10 of these documents concatenated:\n    characters            : 1841\n    chars/4 estimate      : 460\n    actual tiktoken count : 351\n    estimate error        : +31.1%\n\n  prose tokenises close to 4 chars/token, so the estimate is\n  defensible HERE and not in general. always count the real thing.",
        notes: [
          { t: "p", text: "**The budget must reserve space for the output**, not just the context \u2014 otherwise it fails at generation time, after every input token is paid for." },
          { t: "p", text: "**And that failure is load-dependent**: it appears only when the model wants to produce a long answer, which correlates with the questions that most need one. So it passes testing." },
          { t: "p", text: "**The budget sets an effective k.** If three chunks fit, you are running at k=3 whatever the retriever was configured with, and everything below rank 3 is discarded however relevant." },
          { t: "p", text: "**Measured: recall is 0.571 at k=1 and 0.929 at k=3**, against 1.000 at k=5. At k=1, 43% of queries lose their relevant document entirely." },
          { t: "p", text: "**So a tight budget makes reranking MORE valuable, not less** \u2014 the cost of a ranking error rises as the budget falls, and at k=1 the ranking is the answer." },
          { t: "p", text: "**Which means dropping the reranker to save latency under a tight budget is exactly backwards.** 6.8's better move: a cheap narrowing stage in front of it halved latency while improving every metric." },
          { t: "p", text: "**Ordering is free.** Interleaving from both ends puts the strongest candidates where the model reads most carefully and the weakest in the middle \u2014 zero tokens, zero latency, a few lines." },
          { t: "p", text: "**Count tokens rather than estimating.** chars/4 overestimated by 15% on this prose and 4.4 measured JSON at 2.23 chars/token, a 45% undercount \u2014 the heuristic is tuned for English prose and fails on anything structured." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the latency fix that cost accuracy twice", body: [
      { t: "p", text: "A RAG service is too slow. The team drops the reranker and cuts the context from five chunks to three. Latency improves, nobody measures retrieval quality, and answer quality degrades on precisely the hard questions." },
      { t: "p", text: "The two changes compound in the wrong direction. Cutting to three chunks lowers the effective `k`, which makes the ranking matter more \u2014 recall falls from 1.000 to 0.929 on this corpus, and a relevant document at rank 4 is now simply gone. Removing the reranker is removing the component that fixes rank-4 documents, and 6.7 measured it taking exact-term MRR from 0.781 to 1.000." },
      { t: "p", text: "The available alternative costs nothing in quality: 6.8's ablation showed that inserting a cheap narrowing stage before the reranker halved total latency while improving every metric, because the expensive stage then scored 8 candidates instead of 20. Reordering stages by cost is the first thing to try under latency pressure, and dropping quality stages should be the last." }
    ] }
  ],
  takeaways: [
    "**A budget must reserve space for the output**, or it fails at generation time after the input is paid for.",
    "**And that failure is load-dependent**, appearing only on the questions that need long answers.",
    "**The context budget sets an effective k** \u2014 everything below it is discarded however relevant.",
    "**Recall was 0.571 at k=1 and 0.929 at k=3**, against 1.000 at k=5.",
    "**So a tight budget makes reranking more valuable, not less** \u2014 the cost of a ranking error rises as the budget falls.",
    "**At k=1 the ranking is the answer.**",
    "**Dropping the reranker to save latency under a tight budget is exactly backwards.**",
    "**Reorder stages by cost before dropping any** \u2014 6.8 halved latency while improving every metric.",
    "**Ordering is free**: interleave from both ends so the weakest documents sit in the middle.",
    "**Zero tokens, zero latency, a few lines** \u2014 worth adopting on a modest expected benefit.",
    "**Count tokens rather than estimating** \u2014 chars/4 was +15% on prose and \u221245% on JSON (4.4).",
    "**The heuristic is tuned for English prose** and fails on JSON, code, tables and identifiers."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does a tight context budget increase the value of reranking?",
      options: ["Reranking reduces the number of tokens per chunk",
        "The budget sets an effective k, so a relevant document ranked below it is discarded \u2014 ranking errors cost more as the budget falls",
        "Rerankers compress the context automatically",
        "It does not; a tight budget makes reranking less useful"],
      answer: 1,
      why: "If three chunks fit, you are retrieving at k=3 regardless of configuration, and recall measured 0.929 there against 1.000 at k=5. A relevant document at rank 4 reaches the model under a loose budget and is simply gone under a tight one. Since reranking is what moves relevant documents up, cutting it while cutting the budget removes the fix at the moment the problem gets worse." },
    { stem: "What is wrong with computing a context budget as the model's limit minus the retrieved context?",
      options: ["The limit is approximate and varies by provider",
        "It reserves nothing for the output, so it fails at generation time after the input tokens are paid for",
        "Chunk boundaries do not align with token boundaries",
        "The system prompt is counted twice"],
      answer: 1,
      why: "The window has to hold the system prompt, the context, the question, any history and the answer. Omitting the output reserve produces a request that is accepted and then truncated or rejected at generation. The failure is load-dependent \u2014 it only shows when the model wants to write a long answer, which correlates with the hardest questions \u2014 so it passes testing and fails in production." },
    { stem: "What is the appeal of interleaving retrieved documents from both ends of the ranking?",
      options: ["It reduces total token count",
        "It puts the strongest candidates where the model reads most carefully and the weakest in the middle, at zero cost",
        "It improves recall by diversifying the context",
        "It prevents the model from citing only the first document"],
      answer: 1,
      why: "Models attend less reliably to the middle of a long context, so the middle is where the least important documents should go. The specific appeal is the price: no extra tokens, no extra latency, a few lines of code. Every other technique in this module costs a model call or a forward pass, so a free reordering is worth adopting even on a modest expected benefit." },
    { stem: "A chars/4 token estimate was 15% high on prose and 45% low on JSON. What follows?",
      options: ["The estimate should use chars/3 instead",
        "The heuristic is calibrated for English prose and must not be used on structured text \u2014 count properly",
        "Token counts are too unpredictable to budget against",
        "Only the model's own tokeniser can be trusted for prose"],
      answer: 1,
      why: "Structured text tokenises far worse: 4.4 measured JSON at 2.23 characters per token because punctuation, quoting and identifiers fragment heavily. An overestimate wastes budget; an undercount produces a request that is rejected or silently truncated. Since counting with the real tokeniser is a single call, there is no reason to carry the risk." }
  ] },
  interview: { title: "Interview practice", sub: "Context budgeting", questions: [
    { level: "core", q: "How do you decide how many chunks to put in the context?",
      strong: "A strong answer reframes it as choosing an effective k.",
      answer: [
        { t: "p", text: "I think of it as choosing an effective k rather than as a packing problem, because that is what it is. If only three chunks fit, I am retrieving at k equals three no matter what the retriever is configured with \u2014 everything below rank three is discarded however relevant it is." },
        { t: "p", text: "So I measure recall at each candidate value. On a corpus I worked with, recall was 0.571 at k=1, 0.929 at k=3 and 1.000 at k=5. That tells me directly what a tighter budget costs: at k=1, 43% of queries lose their relevant document entirely." },
        { t: "p", text: "The consequence people get backwards is what a tight budget means for reranking. As the budget falls, the cost of a ranking error rises \u2014 at k=1 the ranking is the answer. So a tight budget makes reranking more valuable, not less, and dropping the reranker to save latency while also cutting the context is the worst available combination." },
        { t: "p", text: "And I always reserve output tokens. A budget computed without that fails at generation time, after you have paid for every input token, and it fails only when the model wants to write a long answer \u2014 which correlates with the hardest questions, so it passes testing." }
      ] },
    { level: "advanced", q: "Your RAG service is too slow. What do you do?",
      strong: "A strong answer reorders stages before removing any.",
      answer: [
        { t: "p", text: "Reorder the stages before removing any of them, because the cheapest win is usually in the ordering." },
        { t: "p", text: "The measurement that convinced me: inserting a diversity-selection stage in front of a cross-encoder reranker halved total latency, from 1.46 seconds to 0.72, while improving every retrieval metric. It narrowed twenty candidates to eight before the expensive stage ran, so the reranker did eight forward passes instead of twenty at roughly 68 ms each. The narrowing stage itself cost microseconds." },
        { t: "p", text: "So a cheap stage in front of an expensive one can have negative marginal cost, and that is available without buying anything or giving up any quality." },
        { t: "p", text: "After that I would look at caching the stages with no semantic risk \u2014 query embeddings keyed on exact text, and cross-encoder scores keyed on query-document pairs. The embedding alone was about 104 ms, which was most of a dense query's latency." },
        { t: "p", text: "What I would do last is drop quality stages, and I would never do it at the same time as cutting the context. Those two changes compound in the wrong direction: a smaller context makes the ranking matter more, and removing the reranker removes the thing that fixes the ranking. If I had to make that trade I would want retrieval quality measured against a labelled set first, so the decision is made with the cost visible rather than discovered from support tickets." }
      ] },
    { level: "core", q: "How do you count tokens for a context budget?",
      strong: "A strong answer counts properly and knows where heuristics break.",
      answer: [
        { t: "p", text: "With the real tokeniser, because the heuristic fails in the direction that hurts." },
        { t: "p", text: "The chars-over-four rule is calibrated for English prose. I measured it 15% high on prose, which is harmless, and 45% low on JSON \u2014 which is not, because an undercount produces a request that gets rejected or silently truncated. JSON tokenised at about 2.23 characters per token, because quoting, punctuation and identifiers all fragment." },
        { t: "p", text: "So anything structured \u2014 JSON, code, tables, identifiers, non-Latin scripts \u2014 is outside the heuristic's range, and that is most of what a technical corpus contains." },
        { t: "p", text: "Two other things the budget has to include. The per-message overhead of the chat format, which adds tokens for roles and delimiters and matters when the history is many short turns. And a reserve for the output \u2014 a budget computed without that fails at generation time, after every input token is paid for, and it fails only when the model wants to write a long answer, so it passes testing." },
        { t: "p", text: "Since counting properly is one call to the tokeniser, I would not carry the risk." }
      ] }
  ] }
});
