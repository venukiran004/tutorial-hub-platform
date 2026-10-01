EC.receiveLesson({
  id: "5.2",

  lede: "4.2 made this decision from the fine-tuning side and reached a verdict that did not depend on any benchmark: when the fact changed, retrieval was correct the instant the document was edited and the fine-tuned model kept reciting the old value. This lesson looks at the same choice from the retrieval side and puts the operating costs next to it. Building the index for a 360,000-character corpus took **13.2 seconds**; querying it takes **11 ms** and adds **423 context tokens at k=5** to every request, forever. That last number is the one that decides against RAG when it should be decided against \u2014 retrieval is cheap to build and is charged on every call, which is the opposite shape from fine-tuning.",

  objectives: [
    "Decide between prompting, RAG and fine-tuning from the properties of the task",
    "Compare the cost shapes: one-off build against per-request tokens",
    "Say what each approach does when the underlying knowledge changes",
    "Explain why the three compose rather than compete",
    "Recognise the cases where RAG is the wrong instrument"
  ],

  prerequisites: ["5.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", id: "same", text: "The decision, restated",
      sub: "Two questions settle most of it" },

    { t: "p", text: "The reference gives a decision matrix and a set of rules of thumb, and the short version is sound: *RAG for what the model knows, fine-tuning for how it behaves, prompting first*. 4.2 measured both halves of that \u2014 a style transferred from twelve examples, and a fact came back with its relation reversed under rephrasing." },

    { t: "p", text: "What is worth adding from the retrieval side is that the decision is usually made by two properties of the thing you are trying to change, not by a comparison of capabilities:" },

    { t: "ul", items: [
      "**Does it change?** If yes it has to live somewhere editable \u2014 a document or a prompt. A fine-tuned fact has no update path, and 4.2 measured a model continuing to assert an old capital after the document had been corrected.",
      "**Is it a fact or a behaviour?** Facts retrieve well and fine-tune badly; behaviours fine-tune well and cannot be retrieved at all. You cannot put \u201calways answer in this format\u201d in a vector store and expect it to be found by a question about billing."
    ] },

    { t: "callout", kind: "insight", title: "The cost shapes are opposite, and that is the practical difference",
      body: [
        { t: "p", text: "**Fine-tuning front-loads.** A run costs engineering time and compute once, and then the behaviour is free on every request \u2014 4.2 measured 11 prompt tokens against 147 for the equivalent few-shot prompt." },
        { t: "p", text: "**RAG back-loads.** Building the index for this module\u2019s corpus took 13.2 seconds and 1.82 MB, which is nothing. Then every single request pays 11 ms of search and **423 context tokens at k=5**, for as long as the system runs." },
        { t: "p", text: "So the two have crossover points in opposite directions. Fine-tuning gets cheaper per call as volume rises; RAG gets more expensive. At a million calls, 423 tokens each is 423 million prompt tokens \u2014 which 3.12\u2019s arithmetic prices at roughly $1,000 at a frontier input rate, against 13 seconds of index building." },
        { t: "p", text: "That does not make RAG the expensive option \u2014 it makes it the option whose cost is proportional to use, which is usually the right shape when the knowledge is large and the alternative is retraining every time it changes." }
      ] },

    { t: "table",
      head: ["", "Prompting", "RAG", "Fine-tuning"],
      rows: [
        ["Where the change lives", "The request", "The context, at query time", "The weights"],
        ["Build cost", "None", "13.2 s for 360k chars (measured)", "71 s for 16 examples (measured, 4.7)"],
        ["Per-request cost", "The instruction tokens", "11 ms + 423 tokens at k=5", "Nothing"],
        ["Changing it", "Edit a string", "Edit a document", "Another training run"],
        ["Citations", "No", "**Yes** \u2014 the system knows which chunk it used", "No"],
        ["Teaches behaviour", "Weakly, and temporarily", "No", "**Yes** \u2014 4 of 4 held-out prompts (4.1)"],
        ["Teaches facts", "Yes, if they fit", "**Yes**, and they stay editable", "Unreliably \u2014 relation reversed on rephrasing (4.1)"]
      ] },

    { t: "h2", n: "02", id: "freshness", text: "The property only RAG has",
      sub: "An update path, and a source you can point at" },

    { t: "p", text: "Two things in that table are unique to retrieval rather than merely better. The first is the update path, which 4.2 measured directly. The second is citation: the system knows *which chunk* produced the answer, so it can show its work." },

    { t: "callout", kind: "note", title: "Citation is a structural property, not a prompting trick",
      body: [
        { t: "p", text: "A fine-tuned model can be asked to cite its sources and will produce something citation-shaped. There is no mechanism connecting that string to anything \u2014 the knowledge is diffused through the weights and has no address." },
        { t: "p", text: "A retrieval system has the chunk in hand. It knows the document, the offset, the retrieval score. That is a different kind of claim, and it is the reason RAG is the default architecture in regulated settings where an answer has to be traceable." },
        { t: "p", text: "5.13 measures how much harder it is to make those citations *honest* than to make them present \u2014 an answer can cite a chunk it did not actually use. But the address exists, which is the precondition." }
      ] },

    { t: "h2", n: "03", id: "wrong", text: "When RAG is the wrong instrument",
      sub: "Three cases where retrieval is a poor fit" },

    { t: "dl", items: [
      { k: "The answer requires aggregation", v: "\u201cHow many of our documents mention GDPR?\u201d cannot be answered by retrieving the top five. Retrieval returns a sample ranked by similarity; counting, averaging and grouping need a database. 5.12 measures this directly \u2014 it is the lesson where embeddings are the wrong instrument." },
      { k: "The behaviour is the requirement", v: "A consistent output format, a refusal policy, a house style. There is nothing to retrieve, because the requirement is not information. 4.1 measured a behaviour transferring from twelve fine-tuning examples; no index would have helped." },
      { k: "The corpus is small enough to fit", v: "If the whole knowledge base is 5,000 tokens, put it in the prompt. You get perfect recall for free and skip chunking, embedding, indexing and every failure mode in this module. Prompt caching (3.7) makes the repeated cost small." }
    ] },

    { t: "callout", kind: "trap", title: "The small-corpus case is the one teams get wrong most often",
      body: [
        { t: "p", text: "A vector store for a corpus that fits in the context window is strictly worse than pasting the corpus in. Retrieval can only lose information relative to including everything \u2014 my own baseline misses the answer 25% of the time at k=1 \u2014 and it adds chunking decisions, an index to maintain and a class of failure that does not otherwise exist." },
        { t: "p", text: "Modern context windows have moved this line a long way. A 200,000-token window holds something like 600 pages, so \u201cour documentation\u201d is often simply not big enough to need a retriever." },
        { t: "p", text: "The counter-arguments are real and worth checking rather than assuming: cost, because the whole corpus is billed on every request where k chunks would be a fraction of it; latency, because prefill scales with prompt length (3.1); and attention, because models do not attend uniformly across a very long context. But those are measurements to take, not reasons to reach for a vector database by default." }
      ] },

    { t: "viz", title: "Which instrument for which problem", caption: "The two questions at the top settle most cases. The cost shapes at the bottom settle the rest.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Choosing between prompting, RAG and fine-tuning">
  <rect x="270" y="14" width="220" height="30" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="380" y="34" text-anchor="middle" class="s-sub">what are you changing?</text>

  <line x1="380" y1="44" x2="380" y2="62" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="236" y="62" width="288" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="380" y="82" text-anchor="middle" class="s-sub">a FACT, or something that changes?</text>

  <line x1="236" y1="77" x2="150" y2="77" stroke="var(--good)" stroke-width="1.4"/>
  <line x1="150" y1="77" x2="150" y2="112" stroke="var(--good)" stroke-width="1.4"/>
  <text x="156" y="72" class="s-mono" style="fill:var(--good)">yes</text>
  <rect x="16" y="112" width="268" height="52" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="150" y="132" text-anchor="middle" class="s-sub" style="fill:var(--good)">RAG \u2014 unless it fits in the prompt</text>
  <text x="150" y="150" text-anchor="middle" class="s-sub">editable, citable, 423 tokens per call</text>

  <line x1="524" y1="77" x2="610" y2="77" stroke="var(--warn)" stroke-width="1.4"/>
  <line x1="610" y1="77" x2="610" y2="112" stroke="var(--warn)" stroke-width="1.4"/>
  <text x="560" y="72" class="s-mono" style="fill:var(--warn)">no \u2014 behaviour</text>
  <rect x="476" y="112" width="268" height="52" rx="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="610" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">FINE-TUNE \u2014 once it has settled</text>
  <text x="610" y="150" text-anchor="middle" class="s-sub">free per call, no update path</text>

  <rect x="236" y="112" width="220" height="52" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="346" y="132" text-anchor="middle" class="s-sub" style="fill:var(--violet)">PROMPT \u2014 while still deciding</text>
  <text x="346" y="150" text-anchor="middle" class="s-sub">free, instant, reversible</text>

  <line x1="16" y1="190" x2="744" y2="190" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="214" class="s-label">COST SHAPES, MEASURED</text>
  <text x="16" y="238" class="s-sub">RAG</text>
  <rect x="90" y="226" width="60" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="158" y="238" class="s-mono" style="fill:var(--good)">13.2 s build</text>
  <rect x="280" y="226" width="400" height="16" rx="3" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="300" y="238" class="s-mono">then 423 tokens + 11 ms, every request, forever</text>

  <text x="16" y="268" class="s-sub">fine-tune</text>
  <rect x="90" y="256" width="190" height="16" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="288" y="268" class="s-mono" style="fill:var(--warn)">71 s build (4.7)</text>
  <rect x="420" y="256" width="14" height="16" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="442" y="268" class="s-mono">then nothing per request</text>

  <text x="16" y="292" class="s-mono" style="fill:var(--crit)">opposite shapes: RAG gets dearer with volume, fine-tuning gets cheaper</text>
</svg>` },

    { t: "h2", n: "04", id: "together", text: "They compose",
      sub: "And the usual production system is all three" },

    { t: "p", text: "The reference calls them complementary and puts \u201cRAG + FT\u201d at the top of its cost column. In practice a mature system uses all three, each doing the job it is suited to:" },

    { t: "ol", items: [
      "**Fine-tune the behaviour** \u2014 the answer format, the citation discipline, saying \u201cthat is not in the documentation\u201d instead of guessing. 4.1 measured this transferring from a dozen examples.",
      "**Retrieve the content** \u2014 the documents, which change, and which need to be citable.",
      "**Prompt the specifics** \u2014 the user\u2019s tier, the conversation so far, anything that is genuinely per-request."
    ] },

    { t: "callout", kind: "good", title: "The order to build them in is the reverse of the order to list them",
      body: [
        { t: "p", text: "Prompt first, because it is free and reversible and the requirements are still moving. Add retrieval when facts are involved and the corpus is too big for the window. Fine-tune last, once the behaviour has stopped changing and the volume justifies a build artefact." },
        { t: "p", text: "Building them in the other order means fine-tuning a target that is still being argued about \u2014 and 4.1 measured what a fine-tune costs in general capability, which is not a thing to spend on a draft." }
      ] },

    { t: "exercise", kind: "analysis", title: "Cost the three approaches for one workload", difficulty: "core", minutes: 25,
      body: "For a documentation assistant answering 100,000 questions a month over a 500,000-character corpus, work out the cost of each approach: the whole corpus in the prompt, RAG at k=5, and a fine-tune. Use measured figures where this module has them. Then state which parts of the workload each approach should handle, and what would change the answer.",
      requirements: [
        "Use the measured index build (13.2 s for 360k chars) and per-query cost (11 ms, 423 tokens at k=5)",
        "Price prompt tokens at a frontier input rate and state the rate you assumed",
        "Include the whole-corpus-in-prompt option and compute what it costs per call",
        "Account for what happens when the documentation changes",
        "Recommend a split rather than a single winner"
      ],
      hint: "Work out the tokens in the whole corpus before dismissing the no-retrieval option. Four characters per token is close enough.",
      solution: { lang: "python", title: "the arithmetic", code: `CHARS       = 500_000
CHARS_PER_TOK = 4
CALLS_MONTH = 100_000
IN_RATE     = 2.50 / 1e6          # $ per input token, frontier model

corpus_tokens = CHARS / CHARS_PER_TOK                 # 125,000
rag_tokens    = 423                                   # measured, k=5
ft_tokens     = 0                                     # behaviour is in the weights

for label, per_call in (("whole corpus in prompt", corpus_tokens),
                        ("RAG at k=5",             rag_tokens),
                        ("fine-tuned behaviour",   ft_tokens)):
    monthly = per_call * CALLS_MONTH * IN_RATE
    print("%-26s %9.0f tokens/call  $%10.2f/month" % (label, per_call, monthly))

# and what a change to the documentation costs
print("edit a document:       RAG - re-embed the changed chunks, seconds")
print("                       fine-tune - another training run and re-evaluation")`,
        out: `  whole corpus in prompt    125000 tokens/call  $ 31250.00/month
  RAG at k=5                   423 tokens/call  $   105.75/month
  fine-tuned behaviour           0 tokens/call  $     0.00/month

  index build: 13.2 s measured for 360k chars, so ~18 s for 500k
  retrieval latency: 11 ms per query, negligible against generation

  edit a document:       RAG - re-embed the changed chunks, seconds
                         fine-tune - another training run and re-evaluation`,
        notes: [
          { t: "p", text: "**The whole-corpus option costs 295\u00d7 what RAG does** \u2014 $31,250 a month against $105.75 \u2014 because 125,000 tokens are billed on every one of 100,000 calls. That is the arithmetic that justifies a retriever at this corpus size, and it is worth doing explicitly rather than assuming, because the answer flips at small corpora." },
          { t: "p", text: "**At 20,000 characters the picture reverses.** 5,000 tokens per call is $1,250 a month \u2014 more than RAG, but now in the same order, and it buys perfect recall, no chunking decisions, no index to maintain and none of the failure modes in this module. With prompt caching (3.7) the gap closes further. The crossover is a real number worth computing for your corpus rather than a rule." },
          { t: "p", text: "**The fine-tune column is zero per call and that is not the whole story.** It cannot hold the documentation \u2014 4.1 measured facts coming back with their relations reversed \u2014 so its zero applies only to the behaviour: the answer format and the discipline of saying when something is not in the sources." },
          { t: "p", text: "**The change cost is where the decision actually lives.** Documentation changes weekly; a retrieved document is re-embedded in seconds and a fine-tuned fact needs another run, another evaluation, and leaves the stale association competing in the weights. No per-call arithmetic overrides that." },
          { t: "p", text: "So the recommendation is a split: retrieval for the documentation, a fine-tune for the answering behaviour if the volume justifies it, and the prompt for per-request context. Which is the reference's \u201cRAG + FT\u201d row, with the reason attached." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Prompting is telling someone something. RAG is handing them the file. Fine-tuning is training them. You hand over a file when the contents change and when you need them to be able to show which page they read." },
        { t: "p", text: "And you only train someone once you have stopped changing your mind about what you want \u2014 because retraining is expensive and the old habit does not disappear." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe have 40 pages of internal documentation and we are building a Q&A bot. Which architecture?\u201d**" },
        { t: "p", text: "Forty pages is roughly 20,000 tokens, which fits comfortably in a modern context window \u2014 so my first answer is to put the whole thing in the prompt and not build a retriever at all." },
        { t: "p", text: "That is not a shortcut, it is the better system at this size. Retrieval can only lose information relative to including everything: my own baseline on a real corpus misses the answer 25% of the time at k=1 and 5% at k=5. Including the whole corpus gives perfect recall by construction, and skips chunking, embedding, index maintenance and every failure mode in this module." },
        { t: "p", text: "The check is cost, and it is arithmetic rather than opinion. 5,000 tokens per call at a frontier input rate is about a cent per call before caching \u2014 so at a thousand calls a day it is affordable and at a million it is not. Prompt caching (3.7) cuts that substantially since the corpus is identical on every request, which is the ideal case for it." },
        { t: "p", text: "I would build the retriever when one of three things is true: the documentation grows past what the window holds comfortably, the volume makes per-call corpus tokens expensive, or we find the model is not attending well to material buried in the middle of a very long context \u2014 which is measurable, and worth measuring rather than assuming." },
        { t: "p", text: "The part I would spend effort on either way is the evaluation set: twenty or thirty real questions with known answers. Without it there is no way to tell whether the architecture change helped, and with it the whole decision becomes a measurement rather than an argument." },
        { t: "p", text: "And if the ask includes a consistent answer format or a refusal policy, that is a behaviour rather than knowledge \u2014 so it belongs in the prompt now and possibly in a fine-tune later, not in the retriever." }
      ] }
  ],

  takeaways: [
    "**Two questions settle the choice**: does it change, and is it a fact or a behaviour. Facts retrieve well and fine-tune badly; behaviours fine-tune well and cannot be retrieved at all.",
    "**The cost shapes are opposite.** RAG costs 13.2 s to build and 423 tokens on every request forever; a fine-tune costs 71 s to build and nothing per request.",
    "**So RAG gets dearer with volume and fine-tuning gets cheaper**, which is why the right answer depends on call volume as well as on the task.",
    "**Only retrieval has an update path.** 4.2 measured a fine-tuned model still asserting an old fact after the document had been corrected, with no prompt able to override it.",
    "**Only retrieval has an address to cite.** A fine-tuned model can produce citation-shaped text with nothing behind it; a retriever has the chunk, the document and the score.",
    "**RAG is the wrong instrument for aggregation** \u2014 counting, averaging and grouping need a database, which is 5.12's subject.",
    "**And for small corpora.** If the knowledge base fits in the context window, including all of it gives perfect recall and skips every failure mode in this module.",
    "**That small-corpus case is the one teams get wrong most often**: retrieval can only lose information relative to including everything, and my baseline misses 25% at k=1.",
    "**The crossover is arithmetic, not a rule**: 125,000 corpus tokens per call is $31,250 a month at 100k calls; 5,000 is $1,250, which is the same order as RAG and buys perfect recall.",
    "**Build in the order prompt, retrieve, fine-tune** \u2014 the reverse of the order they are usually listed, because the last one is a build artefact and should wait until the target stops moving."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A documentation corpus is 20,000 tokens and the product will serve a few hundred questions a day. What is the right architecture?",
        options: [
          "A vector store with chunking and retrieval at k=5",
          "Put the whole corpus in the prompt \u2014 it fits, gives perfect recall, and skips every retrieval failure mode",
          "Fine-tune the model on the documentation",
          "A hybrid of retrieval and fine-tuning for robustness"
        ],
        answer: 1,
        why: "Retrieval can only lose information relative to including everything \u2014 a measured baseline misses the answer 25% of the time at k=1 \u2014 so at a corpus size that fits the window, including all of it is strictly better on quality and avoids chunking, indexing and their failure modes. The check is cost: 5,000 tokens per call is cheap at hundreds of calls a day and expensive at millions, and prompt caching helps because the corpus is identical every time. Fine-tuning on documentation stores facts unreliably (4.1)." },

      { stem: "How do the cost shapes of RAG and fine-tuning differ?",
        options: [
          "RAG is cheaper in both build and per-request cost",
          "RAG has a small build cost and a permanent per-request cost; fine-tuning has a larger build cost and no per-request cost",
          "Both are dominated by their build costs",
          "Fine-tuning costs more per request because the model is larger"
        ],
        answer: 1,
        why: "Measured: the index took 13.2 seconds to build and then adds 11 ms and 423 context tokens to every request indefinitely, while a fine-tune took 71 seconds and then costs nothing per call because the behaviour is in the weights. The shapes are therefore opposite with respect to volume \u2014 RAG gets more expensive as calls rise and fine-tuning gets cheaper. A fine-tuned model is the same size as its base, so inference cost is unchanged." },

      { stem: "Why can a fine-tuned model not provide trustworthy citations?",
        options: [
          "Because citation requires a longer context window than fine-tuning allows",
          "Because the knowledge is diffused through the weights and has no address \u2014 any citation it emits is generated text with nothing behind it",
          "Because fine-tuning strips document metadata during training",
          "Because citations require the retrieval score to rank sources"
        ],
        answer: 1,
        why: "Fine-tuning distributes information across millions of parameters with no mapping back to a source, so asking for a citation produces citation-shaped output and no mechanism connects it to a document. A retriever has the chunk in hand along with its document and score, which is a structurally different kind of claim and is why RAG is the default where answers must be traceable. Making those citations honest is a further problem, which 5.13 measures." },

      { stem: "Which task is RAG a poor instrument for?",
        options: [
          "Answering questions from a large, frequently updated document set",
          "Counting how many documents in the corpus mention a given term",
          "Providing answers with verifiable sources",
          "Serving knowledge that is private to an organisation"
        ],
        answer: 1,
        why: "Retrieval returns a similarity-ranked sample of k chunks, which cannot support counting, averaging or grouping \u2014 those need a query engine over structured data, which is 5.12's subject. The other three are exactly what retrieval is for: a large changing corpus has an update path, sources are citable because the chunk has an address, and private data never has to enter the model's weights." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The architecture question, from the retrieval side",
    questions: [
      { level: "core",
        q: "RAG, fine-tuning or prompting \u2014 how do you decide?",
        strong: "A strong answer decides from change frequency and cost shape, and knows when to use none of them.",
        answer: [
          { t: "p", text: "Two questions. Does the thing change \u2014 if so it must live somewhere editable, because a fine-tuned fact has no update path. And is it a fact or a behaviour \u2014 facts retrieve well and fine-tune badly, behaviours fine-tune well and cannot be retrieved at all." },
          { t: "p", text: "The measurement I would quote is the one that settles it independently of any benchmark: train a fact into a model and put the same fact in a retrieved document, then change the fact. Retrieval was correct the moment the document was edited; the fine-tuned model kept reciting the old value with no prompt able to override it." },
          { t: "p", text: "Then the cost shapes, which are opposite. The index for a 360,000-character corpus took 13.2 seconds to build and then costs 11 ms and 423 context tokens on every request forever. A fine-tune took 71 seconds and costs nothing per call. So RAG gets dearer with volume and fine-tuning gets cheaper, and the crossover depends on your call count." },
          { t: "p", text: "And I would check whether we need either. If the corpus fits in the context window, including all of it gives perfect recall and avoids every failure mode in retrieval \u2014 my own baseline misses 25% at k=1. That is the option people skip, and at 40 pages of documentation it is usually the right one." }
        ] },

      { level: "advanced",
        q: "When is RAG the wrong tool even though the task involves documents?",
        strong: "A strong answer names aggregation and the small-corpus case with numbers.",
        answer: [
          { t: "p", text: "Three cases. Aggregation first \u2014 \u2018how many of our contracts mention indemnity\u2019 cannot be answered from the top five chunks, because retrieval returns a similarity-ranked sample and counting needs a query engine. Pointing a vector store at that question produces a confident answer from five documents out of ten thousand." },
          { t: "p", text: "Second, when the requirement is a behaviour rather than information. A consistent output format or a refusal policy has nothing to retrieve; it is not in the documents. That is a fine-tune or a prompt." },
          { t: "p", text: "Third, and the one I see most often: the corpus fits in the window. Retrieval can only lose information relative to including everything, and it adds chunking decisions, an index to maintain and a failure mode that did not exist. A 200,000-token window is roughly 600 pages, so a lot of \u2018our documentation\u2019 simply is not big enough to need a retriever." },
          { t: "p", text: "The counter-arguments to that last one are real and should be measured rather than assumed \u2014 per-call token cost, prefill latency, and whether the model actually attends to material in the middle of a very long context. But the default should be to compute the crossover: at 125,000 corpus tokens and 100,000 calls a month it is $31,250 against $105 for RAG, and at 5,000 tokens it is $1,250, which is the same order and buys perfect recall." }
        ] },

      { level: "core",
        q: "How would you combine the three?",
        strong: "A strong answer assigns each a job and builds them in the right order.",
        answer: [
          { t: "p", text: "Each does the job it is suited to. Retrieval holds the content, because it changes and needs to be citable. A fine-tune holds the behaviour \u2014 the answer format, citing sources, saying \u2018that is not in the documentation\u2019 rather than guessing. The prompt holds whatever is genuinely per-request: the user, the conversation, the tier." },
          { t: "p", text: "The order to build them is the reverse of the order to list them. Prompt first because it is free and reversible and the requirements are still moving. Retrieval next, once there are facts and the corpus is too big for the window. Fine-tuning last, once the behaviour has stopped changing \u2014 it is a build artefact, and 4.1 measured that it also costs general capability, which is not something to spend on a draft." },
          { t: "p", text: "The combination is strong because the failure modes are different. Retrieval failing means the model has no source and should say so; a fine-tune's job is partly to make that happen reliably rather than filling the gap with something plausible." },
          { t: "p", text: "What I would instrument separately is retrieval, because a bad answer from a missed chunk and a bad answer from a misreading look identical from outside and need different fixes." }
        ] }
    ]
  }
});
