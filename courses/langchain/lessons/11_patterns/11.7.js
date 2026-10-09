EC.receiveLesson({
  id: "11.7",
  lede: "Module 5's baseline retrieves once and generates. Agentic RAG makes retrieval a **decision** with four outcomes, and run against the real corpus the three paths are all visible. *\u201chow long do you keep my information\u201d* graded **0.443 \u2192 good** and went straight to generate, so the machinery cost nothing on a query the baseline already handled. *\u201cI want out\u201d* graded **0.139 \u2192 weak**, rewrote, and retrieved again at **0.709** \u2014 7.2's measured case. And the nonsense query graded 0.128, rewrote to itself, and **gave up**. The grader is the whole pattern and also its ceiling: corrective RAG corrects what the grader can see.",
  objectives: [
    "Turn retrieval into a decision with several outcomes",
    "Build a grader from a measured threshold",
    "Trace the good, the rewrite and the give-up paths",
    "Say which grader to use and what each inherits",
    "Gate the expensive grading so it does not run on every query"
  ],
  prerequisites: ["7.1", "7.2", "11.2"],
  blocks: [
    { t: "h2", n: "01", id: "decision", text: "Retrieval as a decision", sub: "Four outcomes" },
    { t: "dl", items: [
      ["the documents are good", "\u2192 generate"],
      ["the documents are off-topic", "\u2192 rewrite the query, retrieve again (7.2)"],
      ["retrieval found nothing", "\u2192 give up and say so (7.1)"],
      ["the question needs no lookup", "\u2192 answer directly"]
    ] },
    { t: "p", text: "Which is 7.1's guard and 7.2's rewrite assembled **as a graph** rather than bolted onto a pipeline \u2014 the difference being that a graph can loop back to retrieve, which 8.1 showed a chain cannot." },
    { t: "h2", n: "02", id: "three", text: "Three queries, three paths", sub: "On the real corpus" },
    { t: "code", lang: "text", title: "The good path",
      code: "'how long do you keep my information'\n  retrieve -> [('data-retention', 0.443), ('data-deletion', 0.411), ...]\n  grade: top score 0.4429 -> good\n  generate from ['data-retention', 'data-deletion']",
      caption: "One retrieval, no rewrite \u2014 the machinery cost nothing here." },
    { t: "code", lang: "text", title: "The rewrite path",
      code: "'I want out'\n  retrieve -> [('bill-cancel-order', 0.139), ('user-remove', 0.12), ...]\n  grade: top score 0.1389 -> weak\n  rewrite -> 'cancel my subscription auto-renewal'\n  retrieve -> [('bill-cancel-sub', 0.709), ('bill-cancel-trial', 0.524), ...]\n  grade: top score 0.7087 -> good",
      caption: "**0.139 \u2192 0.709**, and the right document replaced the wrong one." },
    { t: "callout", kind: "insight", title: "That is 7.2's measured case, in a graph", body: [
      { t: "p", text: "`I want out` scores 0.139 and retrieves the **order** cancellation document; the rewrite into the corpus's vocabulary takes it to 0.709 and `bill-cancel-sub`. 7.2 measured both halves of that; here the graph decides to do it." },
      { t: "p", text: "And 7.2's caveat still applies in full: the rewrite was written knowing the corpus. A blind rewriter landed 2 of 5 attempts on one query and **0 of 5** on another, so the rewrite path's success rate is bounded by how well the rewriter can guess vocabulary it has not seen." }
    ] },
    { t: "code", lang: "text", title: "The give-up path",
      code: "'what is the airspeed velocity of an unladen swallow'\n  grade: top score 0.1279 -> weak\n  rewrite -> (unchanged)\n  grade: top score 0.1279 -> weak\n  give up after 1 rewrite(s)",
      caption: "The outcome 7.1 said must exist and 6.2 showed a plain retriever cannot produce." },
    { t: "h2", n: "03", id: "grader", text: "The grader is the whole pattern", sub: "And it is the weak point" },
    { t: "table", head: ["grader", "cost", "what it inherits"], rows: [
      ["a score threshold", "free", "7.1's **AUC 0.943** \u2014 and the populations overlap, so it is a chosen trade, not a classifier"],
      ["a cross-encoder", "~68 ms per pair", "7.1 measured it **refusing** the vocabulary-mismatch queries dense answers correctly \u2014 a second opinion, not a better one"],
      ["an LLM grader", "a model call per document", "7.4 measured a model scoring a **contradiction** at +5.293 \u2014 relevance is not correctness"]
    ] },
    { t: "callout", kind: "warn", title: "Corrective RAG corrects what the grader can see", body: [
      { t: "p", text: "Everything hinges on whether *\u201care these documents good enough\u201d* can be answered, and every available answer carries a limitation measured in module 7. The pattern cannot be better than its grader." },
      { t: "p", text: "The cross-encoder case is the sharpest: using it as a grader would refuse precisely the queries dense retrieval handles correctly, so it would send working retrievals down the rewrite path. Two models failing on the same query class are not an ensemble (7.1)." }
    ] },
    { t: "h2", n: "04", id: "cost", text: "The cost, and the gate that pays for it", sub: "7.2's conclusion as a graph" },
    { t: "p", text: "Worst case per query: retrieve, grade, rewrite, retrieve, grade, generate. With an **LLM grader** that is three model calls before generation, on **every** query \u2014 including the ones 7.2 measured the baseline answering at MRR 0.964." },
    { t: "callout", kind: "good", title: "Grade cheaply first, spend a model call only on failure", body: [
      { t: "p", text: "Use the score threshold as the first grader \u2014 it is free and 7.1 measured it at AUC 0.943 \u2014 and escalate to a model call only when the cheap grader says the retrieval was weak." },
      { t: "p", text: "That is 7.2's conclusion \u2014 retrieve first, transform only on failure \u2014 expressed as a graph, and it is what makes the pattern affordable. A corrective loop that grades expensively on every query has spent its budget on the queries that did not need it." }
    ] },
    { t: "diagram", kind: "tree", title: "Retrieval as a decision with four outcomes",
      caption: "Module 5's baseline retrieves once and generates. Run against the real corpus, **all three interesting paths are visible** — which is what makes this pattern worth its extra calls, and also what makes it hard to evaluate.",
      root: { label: "the question arrives", sub: "retrieve at all?", tone: "accent", children: [
        { label: "answer directly", sub: "no retrieval needed", tone: "good", edge: "no" },
        { label: "retrieve, then answer", sub: "the baseline path", tone: "good", edge: "yes" },
        { label: "retrieve, reject, re-query", sub: "the grading loop", tone: "warn", edge: "not relevant" },
        { label: "say I do not know", sub: "the 7.1 guard, as a decision", tone: "crit", edge: "nothing found" }
      ] } },
    { t: "exercise", kind: "build", title: "Build corrective RAG",
      difficulty: "advanced", minutes: 34,
      body: "Build a graph where retrieval is followed by a grading node that routes to generate, rewrite-and-retry, or give up. Use a score threshold as the grader and a real corpus. Run it on a query the baseline handles, a query that needs a rewrite, and a query the corpus cannot answer, and trace all three. Then compare the three kinds of grader and what each inherits from module 7. Finally say how to gate the expensive grading.",
      requirements: ["Build the graph with grade, rewrite, generate and give-up nodes",
        "Run a query the baseline handles and show it going straight to generate",
        "Run a query needing a rewrite and report both retrieval scores",
        "Run an unanswerable query and show it giving up",
        "Compare at least three graders and what each inherits",
        "Explain why a cross-encoder grader would refuse working retrievals",
        "Count the worst-case cost and give the gate that reduces it"],
      hint: "Run a query the plain baseline already answers well. If the pattern costs nothing there, the gate is working.",
      solution: { lang: "python", title: "x1107.py \u2014 0.139 to 0.709, and a give-up",
        code: 'THRESHOLD = 0.30\n\ndef grade(state):\n    q = state["query"] or state["question"]\n    top = dense_scored(q, 1)[0]\n    verdict = "good" if top[1] >= THRESHOLD else "weak"\n    return {"grade": verdict, ...}\n\ndef decide(state):\n    if state["grade"] == "good":\n        return "generate"\n    if state["rewrites"] >= 1:\n        return "give_up"\n    return "rewrite"\n\ng.add_conditional_edges("grade", decide,\n                        {"generate": "generate", "rewrite": "rewrite",\n                         "give_up": "give_up"})\ng.add_edge("rewrite", "retrieve")      # <- the cycle',
        out: "==============================================================================\nPART 1 -- retrieval as a decision, not a step\n==============================================================================\n  module 5's baseline retrieves once and generates. agentic RAG\n  makes retrieval a decision with four outcomes:\n\n    the documents are good        -> generate\n    the documents are off-topic   -> rewrite the query, retrieve again\n    retrieval found nothing       -> give up and say so (7.1)\n    the question needs no lookup  -> answer directly\n\n  which is 7.1's guard and 7.2's rewrite, assembled as a graph\n  rather than bolted onto a pipeline.\n==============================================================================\nPART 2 -- the grader, built on what 7.1 measured\n==============================================================================\n  'how long do you keep my information'\n      retrieve 'how long do you keep my informatio' -> [('data-retention', 0.443), ('data-deletion', 0.411), ('auth-session', 0.37)]\n      grade: top score 0.4429 -> good\n      generate from ['data-retention', 'data-deletion']\n\n  'I want out'\n      retrieve 'I want out' -> [('bill-cancel-order', 0.139), ('user-remove', 0.12), ('intg-oauth', 0.09)]\n      grade: top score 0.1389 -> weak\n      rewrite -> 'cancel my subscription auto-renewal'\n      retrieve 'cancel my subscription auto-renewa' -> [('bill-cancel-sub', 0.709), ('bill-cancel-trial', 0.524), ('bill-cancel-order', 0.444)]\n      grade: top score 0.7087 -> good\n      generate from ['bill-cancel-sub', 'bill-cancel-trial']\n\n  'what is the airspeed velocity of an unladen swallow'\n      retrieve 'what is the airspeed velocity of a' -> [('api-limits', 0.128), ('data-export', 0.089), ('api-webhooks', 0.075)]\n      grade: top score 0.1279 -> weak\n      rewrite -> 'what is the airspeed velocity of an unladen swallow'\n      retrieve 'what is the airspeed velocity of a' -> [('api-limits', 0.128), ('data-export', 0.089), ('api-webhooks', 0.075)]\n      grade: top score 0.1279 -> weak\n      give up after 1 rewrite(s)\n\n==============================================================================\nPART 3 -- reading those three runs\n==============================================================================\n  the first retrieved well and went straight to generate -- one\n  retrieval, no rewrite. so the agentic machinery cost nothing on a\n  query the baseline already handled.\n\n  the second graded weak, rewrote, retrieved again and succeeded.\n  that is 7.2's measured case: 'I want out' scores poorly and the\n  rewrite into the corpus's vocabulary fixes it.\n\n  the third graded weak, rewrote (to itself, since no rewrite\n  exists), and gave up -- which is the outcome 7.1 said has to be\n  available and 6.2 showed a plain retriever cannot produce.\n==============================================================================\nPART 4 -- the grader is the whole pattern, and it is the weak point\n==============================================================================\n  everything hinges on whether 'are these documents good enough' can\n  be answered. three ways, in increasing cost:\n\n    a score threshold   what 7.1 measured at AUC 0.943. cheap, and\n                        the populations overlap, so it is a chosen\n                        trade rather than a classifier.\n    a cross-encoder     7.1 measured this REFUSING the vocabulary-\n                        mismatch queries dense answers correctly, so\n                        it is a second opinion and not a better one.\n    an LLM grader       a model call per document, and 7.4 showed a\n                        model judging relevance scores a\n                        CONTRADICTION highly -- relevance is not\n                        correctness.\n\n  so the grader inherits every limitation from module 7, and the\n  pattern cannot be better than it. which is the honest ceiling:\n  corrective RAG corrects what the grader can see.\n==============================================================================\nPART 5 -- the cost, and the gate that pays for it\n==============================================================================\n  per query, worst case: retrieve + grade + rewrite + retrieve +\n  grade + generate. with an LLM grader that is 3 model calls before\n  generation, on EVERY query -- including the ones the baseline\n  answered correctly at MRR 0.964 (7.2).\n\n  so the gate matters more than the pattern: grade cheaply with a\n  score first, and spend a model call only when the cheap grader\n  says the retrieval was weak. that is 7.2's conclusion -- retrieve\n  first, transform only on failure -- expressed as a graph.",
        notes: [
          { t: "p", text: "**Retrieval becomes a decision with four outcomes** \u2014 generate, rewrite and retry, give up, or answer directly." },
          { t: "p", text: "**Which is 7.1's guard and 7.2's rewrite as a graph**, and a graph can loop back to retrieve where a chain cannot (8.1)." },
          { t: "p", text: "**The good path cost nothing extra**: 0.443 graded good and went straight to generate, with one retrieval and no rewrite." },
          { t: "p", text: "**The rewrite path took 0.139 to 0.709** and replaced the order-cancellation document with the subscription one \u2014 7.2's measured case." },
          { t: "p", text: "**With 7.2's caveat intact**: a blind rewriter landed 2 of 5 on one query and 0 of 5 on another, so the rewrite path is bounded by the rewriter's guessing." },
          { t: "p", text: "**The unanswerable query gave up**, which is the outcome 7.1 required and 6.2 showed a plain retriever cannot produce." },
          { t: "p", text: "**The grader is the whole pattern and its ceiling.** A threshold is free at AUC 0.943; a cross-encoder would refuse the queries dense answers correctly; an LLM grader scores contradictions highly (7.4)." },
          { t: "p", text: "**So grade cheaply first and escalate on failure** \u2014 7.2's conclusion as a graph, and what makes the pattern affordable." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the corrective loop that doubled the cost of working queries", body: [
      { t: "p", text: "A team adds corrective RAG with an LLM grader that scores each retrieved document for relevance. Quality improves slightly on hard queries and the per-request cost roughly triples, because the grader runs five model calls on every request including the ones the baseline answered perfectly." },
      { t: "p", text: "The expensive grader is being spent uniformly on a query population where, by their own measurements, most retrievals were already good. The pattern's benefit is concentrated in the minority of queries that fail, and so is the pattern's cost \u2014 if you gate it." },
      { t: "p", text: "The fix is a two-stage grader: the retrieval score first, free and measured at AUC 0.943 at separating answerable from unanswerable, and the LLM grader only on the queries the cheap one flags. That is the same two-stage structure as retrieval itself \u2014 cast wide cheaply, narrow expensively \u2014 applied to grading, and it is the move that turns a pattern that improves quality into one that improves quality affordably." }
    ] }
  ],
  takeaways: [
    "**Agentic RAG makes retrieval a decision**: generate, rewrite and retry, give up, or skip the lookup.",
    "**Which is 7.1's guard and 7.2's rewrite as a graph**, with a cycle a chain cannot express.",
    "**The good path cost nothing extra** \u2014 0.443 graded good and went straight to generate.",
    "**The rewrite path took 0.139 to 0.709**, replacing the wrong cancellation document with the right one.",
    "**And 7.2's caveat holds**: a blind rewriter landed 2 of 5 on one query and 0 of 5 on another.",
    "**The unanswerable query gave up**, which a plain retriever cannot do (6.2).",
    "**The grader is the whole pattern and also its ceiling.**",
    "**A score threshold is free, at AUC 0.943** \u2014 a chosen trade, not a classifier (7.1).",
    "**A cross-encoder grader would refuse the queries dense answers correctly** (7.1).",
    "**An LLM grader scores a contradiction highly** \u2014 relevance is not correctness (7.4).",
    "**So corrective RAG corrects what the grader can see.**",
    "**Worst case is three model calls before generation with an LLM grader**, on every query.",
    "**Grade cheaply first and escalate only on failure** \u2014 7.2's conclusion as a graph.",
    "**Which is retrieval's own two-stage structure applied to grading.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A query graded 0.139, was rewritten, and then graded 0.709. What happened?",
      options: ["The threshold was lowered on the second attempt",
        "The rewrite replaced the user's vague phrasing with the corpus's vocabulary, so a different and correct document became the top hit",
        "The second retrieval used a different index",
        "The grader became more lenient after a failure"],
      answer: 1,
      why: "'I want out' retrieved the order-cancellation document at 0.139; rewritten to 'cancel my subscription auto-renewal' it retrieved the subscription document at 0.709. The rewrite added no information \u2014 it substituted the document's words for the user's. Which is why the rewrite path's success depends on the rewriter being able to guess vocabulary it has not seen." },
    { stem: "Why would a cross-encoder be a poor grader for corrective RAG?",
      options: ["It is too slow to run per query",
        "It was measured refusing the vocabulary-mismatch queries that dense retrieval answers correctly \u2014 so it would send working retrievals down the rewrite path",
        "Its scores are logits rather than probabilities",
        "It cannot score more than one document at a time"],
      answer: 1,
      why: "Used as a guard it scored a correctly answered query below every unanswerable one, because it reads the same vocabulary mismatch dense did. So as a grader it would judge successful retrievals as weak and trigger unnecessary rewrites. Two models that fail on the same query class do not form a useful ensemble." },
    { stem: "What is the ceiling on corrective RAG's effectiveness?",
      options: ["The number of rewrite attempts allowed",
        "The grader \u2014 the pattern corrects only what the grader can detect, and every available grader has a measured limitation",
        "The corpus's coverage of the query distribution",
        "The rewriter's model size"],
      answer: 1,
      why: "A threshold's populations overlap, so it is a chosen trade rather than a classifier. A cross-encoder refuses queries dense answers well. An LLM grader rates a claim its source contradicts strongly positive, since it measures relevance rather than correctness. The loop can only act on signals the grader produces, so its limitations become the pattern's." },
    { stem: "How do you keep corrective RAG from tripling the cost of queries that were already fine?",
      options: ["Cache the grading decisions by query embedding",
        "Grade with the free retrieval score first and escalate to a model call only when that flags a weak retrieval",
        "Reduce the number of retrieved documents",
        "Run the grader only on a sample of traffic"],
      answer: 1,
      why: "The benefit is concentrated in the minority of queries that fail, so the cost should be too. A two-stage grader \u2014 cheap and universal, then expensive and selective \u2014 is retrieval's own cast-wide-cheaply-then-narrow-expensively structure applied to grading. Sampling would reduce cost and also skip correcting the queries that needed it." }
  ] },
  interview: { title: "Interview practice", sub: "Agentic RAG", questions: [
    { level: "core", q: "What does agentic RAG add over a baseline RAG pipeline?",
      strong: "A strong answer names the four outcomes and the cycle.",
      answer: [
        { t: "p", text: "It turns retrieval from a step into a decision, with four outcomes: the documents are good so generate, they are off-topic so rewrite and retrieve again, retrieval found nothing so give up and say so, or the question needs no lookup at all." },
        { t: "p", text: "The retry outcome is why it has to be a graph rather than a chain \u2014 looping back to retrieve is the thing a pipeline cannot express." },
        { t: "p", text: "Built against a real corpus, all three paths showed up. A query the baseline handled graded well and went straight to generate, so the machinery cost nothing there. A vague query graded 0.14, got rewritten into the corpus's vocabulary, and retrieved at 0.71 \u2014 with a different and correct document at the top. And a question the corpus could not answer graded weak twice and gave up." }
        ,{ t: "p", text: "That last outcome is the one worth emphasising, because a plain similarity search always returns k results and has no way to express 'nothing matched'. Abstention has to be added, and this pattern is where it fits naturally." }
      ] },
    { level: "advanced", q: "What limits agentic RAG?",
      strong: "A strong answer identifies the grader and prices it.",
      answer: [
        { t: "p", text: "The grader, in both directions \u2014 it is the whole pattern and it is the ceiling." },
        { t: "p", text: "Everything hinges on whether 'are these documents good enough' can be answered, and each option carries a measured limitation. A score threshold is free and I measured it at AUC 0.943 separating answerable from unanswerable \u2014 but the populations overlap, so it is a chosen trade rather than a classifier." },
        { t: "p", text: "A cross-encoder is worse as a grader than it sounds: I measured it scoring a correctly answered vocabulary-mismatch query below every unanswerable one. So it would judge working retrievals as weak and trigger pointless rewrites. Two models failing on the same query class are not an ensemble." },
        { t: "p", text: "An LLM grader is the expensive option and it measures relevance rather than correctness \u2014 I measured a model rating a claim its own source contradicted at strongly positive. So it detects off-topic documents and not wrong ones." },
        { t: "p", text: "The cost consequence is what I would design around. With an LLM grader the worst case is three model calls before generation, on every query \u2014 including the majority the baseline already answered at 0.96 MRR. So I would grade with the free score first and escalate only on a flag, which is the same two-stage structure as retrieval itself." }
      ] },
    { level: "core", q: "How would you evaluate whether corrective RAG is actually helping?",
      strong: "A strong answer measures per path, not in aggregate.",
      answer: [
        { t: "p", text: "Per path, because the pattern's whole point is doing different things to different queries, and an aggregate number averages the effect away." },
        { t: "p", text: "So I would instrument which path each query took \u2014 straight to generate, rewrote and succeeded, rewrote and still failed, gave up \u2014 and report the four counts. That distribution is the first thing I would want, because it tells me whether the machinery is ever used." },
        { t: "p", text: "If almost everything goes straight to generate, the pattern is costing grading on every query to help a handful. If almost everything rewrites, the grader's threshold is wrong or the retrieval is genuinely bad and the rewrite is masking it." },
        { t: "p", text: "Then the thing that actually matters: of the queries that rewrote, how many ended up with the right document? I measured one going from 0.14 to 0.71 with the right document replacing the wrong one \u2014 that is the win, and it needs labels to count." },
        { t: "p", text: "And the give-up rate against a labelled set of answerable and unanswerable queries, because a give-up on an answerable query is a failure the user sees as unhelpfulness, and a give-up on an unanswerable one is the feature working." },
        { t: "p", text: "The baseline comparison throughout, per query class \u2014 since the pattern can only help the classes that were failing." }
      ] }
  ] }
});
