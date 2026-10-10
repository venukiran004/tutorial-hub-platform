EC.receiveLesson({
  id: "5.11",

  lede: "Agentic RAG lets the model decide whether to retrieve, where to retrieve from, and whether to try again. The worked example gives an agent three tools and a sentence of guidance, and the appeal is obvious \u2014 one system that handles vector search, SQL and the web. The measurement in this lesson is of the cheapest and most common agentic step, routing a query to one source before searching it, and it went badly: picking the right document first succeeded **60% of the time**, and routing before searching took recall@5 from **95% down to 60%**. The failure mode is the thing worth understanding, because it is structural rather than a tuning problem.",

  objectives: [
    "Describe the agentic loop and what each decision point adds",
    "Measure a router's accuracy before trusting it to narrow the search",
    "Explain why routing failures are total rather than graceful",
    "Choose between routing, filtering and searching everything",
    "Say when multi-step retrieval is genuinely required"
  ],

  prerequisites: ["5.7", "5.10"],

  blocks: [

    { t: "h2", n: "01", id: "loop", text: "What \u201cagentic\u201d adds",
      sub: "Three decisions a static pipeline makes in advance" },

    { t: "p", text: "The pipeline in 5.7 makes every decision at build time: always retrieve, always from the one index, always `k=5`, always once. An agentic system turns each of those into a runtime decision the model makes." },

    { t: "dl", items: [
      { k: "Whether to retrieve", v: "A question the model can answer from general knowledge does not need the index. Skipping it saves the tokens and the latency \u2014 this is the one agentic decision that *reduces* cost, which is why 5.10 called adaptive RAG the one to reach for soonest." },
      { k: "Where to retrieve from", v: "Routing: a vector store for documentation, SQL for figures (5.12), a web search for current events. This is the decision measured below, and the one with the worst failure mode." },
      { k: "Whether to retrieve again", v: "Multi-hop: the first retrieval answers part of the question and reveals what to ask next. This is the case that genuinely requires an agent, because the second query cannot be written before the first result arrives." }
    ] },

    { t: "callout", kind: "insight", title: "Only the third one needs an agent",
      body: [
        { t: "p", text: "\u201cWhether to retrieve\u201d is a classification, and a small classifier does it for a millisecond rather than a model call. \u201cWhere to retrieve from\u201d is also a classification \u2014 and section 02 measures how badly it can go." },
        { t: "p", text: "Multi-hop is different in kind. *\u201cWhich quantization method should I use for the model we fine-tuned in Q3?\u201d* cannot be turned into one search: you need the first retrieval to learn which model that was before the second query exists. No amount of query rewriting collapses that into a single step, which is why this is the case that earns the loop." },
        { t: "p", text: "So \u201cshould we use agentic RAG\u201d usually decomposes into three questions with different answers, and the honest one is: use a classifier for the first two and an agent only for the third." }
      ] },

    { t: "h2", n: "02", id: "routing", text: "Routing, measured",
      sub: "And it went badly enough to be the lesson" },

    { t: "p", text: "The simplest router: embed a description of each document, embed the query, and send the query to the nearest one. Then search only inside that document. The appeal is that it narrows 1,187 chunks to about 87, which is faster and should be more precise." },

    { t: "code", lang: "python", title: "g510.py \u2014 route first, then search inside", code: `doc_summaries = [title + ". " + text[:600] for name, text in corpus]
DV = enc.encode(doc_summaries, normalize_embeddings=True)
DROUTE = np.argsort(-(QV @ DV.T), axis=1)

# search only the chunks of the chosen document
target = doc_names[DROUTE[i][0]]
idxs = [j for j in range(len(flat)) if fmeta[j] == target]
order = np.argsort(-(QV[i] @ FE[idxs].T))`,
      out: `  route@n    correct document
  1                       60%
  2                       80%
  3                       85%

                                     chunks searched            r@5
  search everything                            1187            95%
  route to 1 document, then search               87            60%`,
      hl: [2, 7],
      caption: "The router picks the right document 60% of the time, and recall lands exactly there." },

    { t: "callout", kind: "trap", title: "A routing failure is total, not graceful",
      body: [
        { t: "p", text: "Recall@5 after routing is **60%** \u2014 the same as the router\u2019s accuracy, and that is not a coincidence. Once the query is routed to the wrong document, the answer is **not in the search space at all**. No value of k recovers it; k=50 inside the wrong document is still 0% for that question." },
        { t: "p", text: "Compare that with searching everything, where a bad ranking is recoverable \u2014 the answer sits at rank 15 and a larger k, a re-ranker or a fused retriever can reach it. 5.1\u2019s stuck question was at rank 15 for the whole module and was *always* retrievable." },
        { t: "p", text: "That is the structural point: **routing converts a soft failure into a hard one.** Ranking degrades; filtering truncates. A system that retrieves badly can be improved by every technique in this module; a system that routed wrongly cannot be improved at all on that query." },
        { t: "p", text: "And the router\u2019s 60% is not obviously fixable by a better router. Several of my questions are genuinely ambiguous about their source \u2014 5.1 already found that \u201ccatastrophic forgetting\u201d is correctly covered in two documents. A router must pick one; the index does not have to." }
      ] },

    { t: "viz", title: "Why routing fails differently", caption: "A bad ranking leaves the answer reachable. A bad route removes it from the search space.",
      svg: `<svg viewBox="0 0 760 286" width="100%" role="img" aria-label="Routing failure compared with ranking failure">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">SEARCH EVERYTHING \u2014 a bad ranking is recoverable</text>
  <rect x="16" y="34" width="700" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="30" y="52" class="s-sub">1,187 chunks \u2014 the answer is in here somewhere</text>
  <rect x="560" y="38" width="16" height="18" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="586" y="52" class="s-mono" style="fill:var(--violet)">rank 15</text>
  <text x="16" y="80" class="s-sub">larger k, a re-ranker (5.9) or a rewritten query (5.8) can all reach it \u2014 measured 95% at k=5</text>

  <line x1="16" y1="100" x2="744" y2="100" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="126" class="s-label" style="fill:var(--crit)">ROUTE FIRST \u2014 60% of the time this is the right box</text>
  <rect x="16" y="138" width="110" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="71" y="156" text-anchor="middle" class="s-sub">doc A</text>
  <rect x="134" y="138" width="110" height="26" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="189" y="156" text-anchor="middle" class="s-sub">doc B</text>
  <rect x="252" y="138" width="110" height="26" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="307" y="156" text-anchor="middle" class="s-sub">doc C</text>
  <rect x="370" y="138" width="110" height="26" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="425" y="156" text-anchor="middle" class="s-sub" style="fill:var(--crit)">the answer</text>
  <text x="496" y="156" class="s-mono" style="fill:var(--crit)">\u2190 not searched</text>

  <text x="16" y="190" class="s-sub">87 chunks searched instead of 1,187 \u2014 and for 40% of queries the answer is not among them</text>
  <text x="16" y="212" class="s-mono" style="fill:var(--crit)">no value of k recovers it. k=50 inside the wrong document is still zero.</text>

  <line x1="16" y1="234" x2="744" y2="234" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="258" class="s-mono" style="fill:var(--accent)">measured: 95% recall@5 searching everything \u2192 60% after routing to one document</text>
  <text x="16" y="278" class="s-sub">route@2 was 80% and route@3 85% \u2014 searching a few candidate sources is the safer compromise</text>
</svg>` },

    { t: "callout", kind: "good", title: "What to do instead",
      body: [
        { t: "p", text: "**Route to several sources, not one.** The router was 60% right at the top choice and **85% within its top three** \u2014 so searching the top two or three documents keeps most of the narrowing and most of the recall. The cost is a few more chunks scanned, which 5.5 showed is nearly free." },
        { t: "p", text: "**Prefer metadata filtering over routing where the predicate is exact.** \u201cOnly documents from 2024\u201d or \u201conly this customer\u2019s contracts\u201d is a *known* constraint, not a guess \u2014 it cannot be wrong in the way a semantic route can. Most vector stores support it directly (5.5)." },
        { t: "p", text: "**And at this corpus size, do not route at all.** Searching all 1,187 chunks took 11 ms. The router was solving a performance problem that did not exist, and paying 35 points of recall for it." },
        { t: "p", text: "Routing earns its place when the *sources are genuinely different systems* \u2014 a vector index, a SQL database, a web search \u2014 because then there is no single search space to fall back on. That is a different decision from narrowing one index." }
      ] },

    { t: "h2", n: "03", id: "tools", text: "Routing between kinds of source",
      sub: "Where the decision is unavoidable" },

    { t: "p", text: "The agent has three tools: a knowledge base, a web search and a SQL database. That routing decision cannot be avoided by searching everything, because the sources answer different kinds of question and one of them (5.12) cannot be searched by similarity at all." },

    { t: "table",
      head: ["Question shape", "Source", "Why not the others"],
      rows: [
        ["\u201cHow does our retry policy work?\u201d", "Vector index", "It is in the documentation; SQL has no prose and the web does not know your policy"],
        ["\u201cWhat was Q4 revenue?\u201d", "SQL", "5.12 measures this \u2014 retrieval returns a *sample* of rows and cannot aggregate"],
        ["\u201cWhat changed in the API last week?\u201d", "Web or changelog", "The index is as fresh as its last build; a changelog is authoritative"],
        ["\u201cWhich model did we fine-tune in Q3, and what quantization suits it?\u201d", "**Both, in sequence**", "The second query cannot be written until the first returns \u2014 this is the multi-hop case"]
      ] },

    { t: "callout", kind: "warn", title: "The agent's failure modes are the agent's, not retrieval's",
      body: [
        { t: "p", text: "Wrapping retrieval in a loop adds failure modes that have nothing to do with retrieval quality: choosing no tool when one was needed, looping until a step limit, calling SQL with invalid syntax, or deciding the first result was good enough when it was not." },
        { t: "p", text: "Each of those needs its own instrumentation \u2014 tool-choice accuracy, loop length distribution, tool error rate \u2014 and none of them appears in recall@k. A system that is 95% on retrieval and routes correctly 60% of the time is a 60% system, and only one of those numbers is usually being watched." },
        { t: "p", text: "I have not measured the loop itself here, because it needs an instruct model this environment does not have. What the routing measurement does establish is the shape: the agentic decisions are classifications, classifications have accuracies, and those accuracies multiply through the pipeline." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure your router before you trust it", difficulty: "core", minutes: 30,
      body: "Build a router that selects a source for each query \u2014 by embedding a description of each source and taking the nearest. Measure its top-1, top-2 and top-3 accuracy against the known correct source. Then measure end-to-end recall two ways: searching everything, and routing to the top source and searching only there. Report the chunks scanned in each case.",
      requirements: [
        "Report router accuracy at several n, not just top-1",
        "Measure end-to-end recall after routing, not just the router's own accuracy",
        "Report the number of chunks searched in each configuration",
        "Test routing to the top 2 or 3 sources as well as the top 1",
        "Identify any questions whose correct source is genuinely ambiguous"
      ],
      hint: "Compare the end-to-end recall after routing against the router's own top-1 accuracy. If they are close, routing is the binding constraint and no amount of retrieval tuning inside the chosen source will help.",
      solution: { lang: "python", title: "g510.py \u2014 the router and what it costs", code: `doc_summaries = []
for name, text in corpus:
    head = re.sub(r"[_\-]+", " ", name.replace(".md", ""))
    doc_summaries.append(re.sub(r"^\d+\s*", "", head) + ". " + text[:600])

DV = enc.encode(doc_summaries, normalize_embeddings=True)
DROUTE = np.argsort(-(QV @ DV.T), axis=1)

for n in (1, 2, 3):
    acc = np.mean([any(doc_names[j] in H._docs(QS[i][1]) for j in DROUTE[i][:n])
                   for i in range(len(QS))])
    print(n, acc)

# end to end: route to one document, then search only its chunks
routed = []
for i in range(len(QS)):
    target = doc_names[DROUTE[i][0]]
    idxs = [j for j in range(len(flat)) if fmeta[j] == target]
    order = np.argsort(-(QV[i] @ FE[idxs].T))
    routed.append([idxs[j] for j in order])

print(np.mean([H.recall_at_k(routed[i], flat, fmeta, *QS[i], 5)
               for i in range(len(QS))]))`,
        out: `  route@n    correct document
  1                       60%
  2                       80%
  3                       85%

                                     chunks searched            r@5
  search everything                            1187            95%
  route to 1 document, then search               87            60%`,
        notes: [
          { t: "p", text: "**End-to-end recall lands exactly on the router's accuracy, 60%, and that is the whole finding.** When the route is wrong the answer is not in the search space, so retrieval inside the chosen document is irrelevant \u2014 no k, no re-ranker and no query rewrite recovers it." },
          { t: "p", text: "**Routing converts a soft failure into a hard one.** Searching everything leaves a badly-ranked answer at rank 15 and reachable by every technique in this module; routing wrongly removes it entirely. Ranking degrades, filtering truncates." },
          { t: "p", text: "**Top-3 accuracy was 85% against top-1's 60%**, so searching two or three candidate sources keeps most of the narrowing and most of the recall. That is the compromise I would ship if narrowing were necessary." },
          { t: "p", text: "**At this corpus size it was not necessary.** Searching all 1,187 chunks took 11 ms (5.1), so the router was solving a performance problem that did not exist and paying 35 recall points for it. Routing earns its place between genuinely different *systems*, where there is no common search space to fall back on." },
          { t: "p", text: "**Some questions have no single right source.** 5.1 already found \u2018catastrophic forgetting\u2019 correctly covered in two documents \u2014 a router must choose one, while an index over everything does not have to. That part of the 40% is not a router bug to be fixed." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Ranking is a suggestion and routing is a commitment. A suggestion that is wrong can be overruled by looking further down the list; a commitment that is wrong cannot be overruled at all, because the alternatives were never considered." },
        { t: "p", text: "So prefer searching more and ranking better over searching less and choosing earlier \u2014 unless the sources are genuinely different systems, in which case the choice is unavoidable and should be measured like any other classifier." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe built an agentic RAG system that routes queries to one of eight document collections. Accuracy is worse than our old single-index version. Why?\u201d**" },
        { t: "p", text: "Almost certainly the router, and the diagnostic is quick: measure the router\u2019s top-1 accuracy on its own and compare it with the end-to-end recall. If they are close, the router is the binding constraint and nothing happening inside the chosen collection matters." },
        { t: "p", text: "I measured exactly this shape on a twelve-document corpus: the router picked the right document 60% of the time, and end-to-end recall@5 came out at 60% against 95% for searching everything. The two numbers matching is the signature." },
        { t: "p", text: "The structural reason is that routing turns a soft failure into a hard one. With a single index, a badly-ranked answer still sits at rank 15 and every technique in the module can reach it \u2014 a larger k, a re-ranker, a rewritten query. Once you have routed wrongly, the answer is not in the search space and none of those apply." },
        { t: "p", text: "Two fixes, in order. Route to the top two or three collections rather than one \u2014 my router was 85% accurate within its top three against 60% at top one, and scanning a few thousand extra chunks costs milliseconds. And check whether the narrowing was ever needed: searching 1,187 chunks took 11 ms, so if their collections are of similar size the router is solving a performance problem they do not have." },
        { t: "p", text: "The other thing I would check is whether some queries have no single correct collection. Mine did \u2014 one topic was genuinely covered in two documents \u2014 and that fraction of the router\u2019s error is not a bug to be fixed, it is an argument against routing at all. A single index never has to choose." }
      ] }
  ],

  takeaways: [
    "**Agentic RAG turns three build-time decisions into runtime ones**: whether to retrieve, where from, and whether to retrieve again.",
    "**Only the third genuinely needs an agent.** Multi-hop questions cannot be collapsed into one search, because the second query depends on the first result.",
    "**The first two are classifications**, so a small classifier does them for a millisecond instead of a model call \u2014 and \u201cwhether to retrieve\u201d is the one agentic decision that *saves* cost.",
    "**Routing to one document scored 60% correct**, and end-to-end recall@5 landed on exactly that \u2014 60%, against 95% for searching everything.",
    "**Routing converts a soft failure into a hard one.** A badly-ranked answer is reachable by larger k, a re-ranker or a rewritten query; a wrongly-routed answer is not in the search space at all.",
    "**Route to several sources instead of one**: top-3 accuracy was 85% against top-1's 60%, and scanning a few hundred more chunks costs milliseconds.",
    "**Prefer metadata filtering where the predicate is exact** \u2014 a date range or a customer id is a known constraint rather than a semantic guess, so it cannot be wrong in the same way.",
    "**At small corpus sizes, do not route.** Searching all 1,187 chunks took 11 ms, so the router was paying 35 recall points to solve a performance problem that did not exist.",
    "**Some questions have no single correct source** \u2014 one topic here was genuinely covered in two documents \u2014 and that part of a router's error is an argument against routing rather than a bug.",
    "**An agent's failure modes are its own**: wrong tool, infinite loop, invalid SQL, stopping early \u2014 none of which appear in recall@k, and all of which need separate instrumentation."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A router picks the correct document 60% of the time, and end-to-end recall@5 after routing is also 60%. What does the match indicate?",
        options: [
          "A coincidence \u2014 the two measure unrelated things",
          "The router is the binding constraint: when it routes wrongly the answer is outside the search space, so retrieval quality inside the chosen document is irrelevant",
          "The chunk size inside each document needs tuning",
          "The evaluation set is too small to separate the two effects"
        ],
        answer: 1,
        why: "Routing restricts the search space before ranking happens, so a wrong route makes the answer unreachable at any k. End-to-end recall is therefore capped by router accuracy, and the two numbers converging is the signature of that cap binding. Searching everything scored 95% on the same questions, so nothing about chunking or ranking explains the gap \u2014 the fix is to route to more sources or not at all." },

      { stem: "Why is a routing failure described as \u201ctotal\u201d where a ranking failure is \u201cgraceful\u201d?",
        options: [
          "Because routers are less accurate than rankers in general",
          "Because a badly-ranked answer remains reachable by larger k, re-ranking or query rewriting, while a wrongly-routed answer is not in the search space at all",
          "Because routing happens before embedding",
          "Because routers cannot be retrained without rebuilding the index"
        ],
        answer: 1,
        why: "The module's running example sat at rank 15 for several lessons and was always retrievable \u2014 hybrid search moved it to 10 and HyDE to 1. None of those techniques can help if the document containing it was never searched. Ranking degrades and filtering truncates, which is why the safer compromise is routing to the top two or three sources: measured, top-3 accuracy was 85% against top-1's 60%." },

      { stem: "Which of the three agentic decisions genuinely requires an agent rather than a classifier?",
        options: [
          "Whether to retrieve at all",
          "Whether to retrieve again, because the second query depends on what the first retrieval returned",
          "Which source to retrieve from",
          "How many chunks to retrieve"
        ],
        answer: 1,
        why: "Whether and where to retrieve are both classifications of the incoming query, which a small fast classifier handles without a model call. Multi-hop is different in kind: a question like \u201cwhich model did we fine-tune in Q3, and what quantization suits it\u201d cannot be turned into a single search, because the second query cannot be written until the first result arrives. That sequential dependency is what the loop is for." },

      { stem: "When does routing between sources earn its place despite the measured risk?",
        options: [
          "When the corpus exceeds a million chunks",
          "When the sources are genuinely different systems \u2014 a vector index, a SQL database, a web search \u2014 so there is no common search space to fall back on",
          "When the router's top-1 accuracy exceeds 90%",
          "When metadata filtering is unavailable in the vector store"
        ],
        answer: 1,
        why: "Narrowing one index is optional \u2014 searching everything took 11 ms and scored 35 points higher. Choosing between a document index, a database and the web is not optional, because they answer different kinds of question and one of them cannot be searched by similarity at all (5.12). High router accuracy helps in either case but does not make narrowing a single index worthwhile; metadata filtering is preferable to routing wherever the predicate is exact rather than semantic." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the architecture sounds smarter and measures worse",
    questions: [
      { level: "core",
        q: "What is agentic RAG and when would you use it?",
        strong: "A strong answer decomposes it into three decisions with different answers.",
        answer: [
          { t: "p", text: "It turns decisions a static pipeline makes in advance into runtime ones: whether to retrieve, where to retrieve from, and whether to retrieve again. Those are three different questions and I would answer them differently." },
          { t: "p", text: "Whether to retrieve is a classification, and the only one of the three that saves money \u2014 skipping the index for questions that do not need it removes tokens and latency. A small classifier does it without a model call." },
          { t: "p", text: "Where to retrieve from is also a classification, and the one I would be most careful with. I measured a router picking the right document 60% of the time, and end-to-end recall landing on exactly that \u2014 60% against 95% for searching everything. Routing converts a soft failure into a hard one: a badly-ranked answer is still reachable, a wrongly-routed one is not in the search space." },
          { t: "p", text: "Whether to retrieve again is the one that genuinely needs an agent, because a multi-hop question cannot be written as a single search \u2014 the second query depends on what the first returned. That is where I would spend the complexity." }
        ] },

      { level: "advanced",
        q: "Why might routing make a RAG system worse?",
        strong: "A strong answer explains the failure asymmetry and gives the mitigation.",
        answer: [
          { t: "p", text: "Because it commits before it has evidence. Ranking produces an ordering you can look further down; routing removes alternatives from consideration entirely, so a wrong route cannot be recovered by any downstream technique." },
          { t: "p", text: "I measured the size of that: 95% recall@5 searching everything, 60% after routing to the top document \u2014 and the 60% matched the router's own accuracy exactly, which is the signature of the route being the binding constraint." },
          { t: "p", text: "Part of the router's error was not fixable either. Some questions have no single correct source \u2014 in my corpus one topic was genuinely explained in two documents \u2014 and a router has to choose while an index does not." },
          { t: "p", text: "The mitigation is to route to the top two or three rather than one: my router was 85% accurate within its top three against 60% at top one, and the extra chunks cost milliseconds. And where the constraint is exact rather than semantic \u2014 a date range, a customer id \u2014 metadata filtering is strictly better, because a known predicate cannot be wrong the way a guess can." },
          { t: "p", text: "The prior question is whether narrowing is needed at all. Searching 1,187 chunks took 11 ms, so at that scale the router was solving a performance problem that did not exist." }
        ] },

      { level: "core",
        q: "What would you instrument in an agentic system?",
        strong: "A strong answer measures the agent's decisions separately from retrieval.",
        answer: [
          { t: "p", text: "The agent's decisions as their own metrics, because none of them show up in recall@k. Tool-choice accuracy against known-correct routes, the distribution of loop lengths, the tool error rate \u2014 invalid SQL, failed web calls \u2014 and how often the agent stops after one retrieval when a second would have helped." },
          { t: "p", text: "The reason to separate them is that the accuracies multiply. A system with 95% retrieval and a 60% router is a 60% system, and if the only dashboard is retrieval recall it looks healthy." },
          { t: "p", text: "I would also log the full decision trace per query \u2014 which tool, which query, which results, what it concluded \u2014 because an agentic failure is a sequence rather than a single bad output, and you cannot reconstruct it after the fact from the answer alone." },
          { t: "p", text: "And a step-limit counter with an alert. A loop that hits its ceiling is a different failure from a loop that terminates with a bad answer, and conflating them in the metrics hides whichever is rarer." }
        ] }
    ]
  }
});
